-- ==============================================================================
-- ZEBALPHA RAZORPAY ROUTE AUTOMATED MARKETPLACE SETTLEMENT ENGINE
-- Minor Units (paise), Double-Entry Ledger, Linked Account Onboarding,
-- Eligibility Evaluation, Batch Transfers, Idempotency, and Audit Logs
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. SELLER TABLE ENHANCEMENTS FOR RAZORPAY ROUTE
-- ------------------------------------------------------------------------------
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS razorpay_account_id VARCHAR(50);
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS route_onboarding_status VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED';
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS route_verification_status VARCHAR(50) NOT NULL DEFAULT 'UNVERIFIED';
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS route_settlement_method VARCHAR(20) DEFAULT 'UPI';
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS route_upi_id VARCHAR(255);
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS route_bank_account JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS route_onboarded_at TIMESTAMPTZ;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS settlement_hold_days INT NOT NULL DEFAULT 7;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS auto_settlement_enabled BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_sellers_razorpay_acc ON public.sellers(razorpay_account_id) WHERE razorpay_account_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sellers_route_status ON public.sellers(route_onboarding_status);

-- ------------------------------------------------------------------------------
-- 2. FINANCIAL LEDGER UPGRADE (Minor Units / Integer Arithmetic & Double-Entry)
-- ------------------------------------------------------------------------------
ALTER TABLE public.seller_financial_ledger ADD COLUMN IF NOT EXISTS amount_minor BIGINT;
ALTER TABLE public.seller_financial_ledger ADD COLUMN IF NOT EXISTS balance_before_minor BIGINT;
ALTER TABLE public.seller_financial_ledger ADD COLUMN IF NOT EXISTS balance_after_minor BIGINT;
ALTER TABLE public.seller_financial_ledger ADD COLUMN IF NOT EXISTS order_id UUID;
ALTER TABLE public.seller_financial_ledger ADD COLUMN IF NOT EXISTS order_item_id UUID;
ALTER TABLE public.seller_financial_ledger ADD COLUMN IF NOT EXISTS settlement_id UUID;
ALTER TABLE public.seller_financial_ledger ADD COLUMN IF NOT EXISTS settlement_batch_id VARCHAR(100);
ALTER TABLE public.seller_financial_ledger ADD COLUMN IF NOT EXISTS eligible_at TIMESTAMPTZ;
ALTER TABLE public.seller_financial_ledger ADD COLUMN IF NOT EXISTS hold_reason TEXT;

-- Backfill amount_minor from amount if missing
UPDATE public.seller_financial_ledger
SET amount_minor = ROUND(amount * 100)::BIGINT
WHERE amount_minor IS NULL AND amount IS NOT NULL;

UPDATE public.seller_financial_ledger
SET balance_before_minor = ROUND(COALESCE(balance_before, 0) * 100)::BIGINT
WHERE balance_before_minor IS NULL;

UPDATE public.seller_financial_ledger
SET balance_after_minor = ROUND(COALESCE(balance_after, 0) * 100)::BIGINT
WHERE balance_after_minor IS NULL;

-- ------------------------------------------------------------------------------
-- 3. SELLER SETTLEMENTS (BATCHES) ENHANCEMENTS FOR RAZORPAY ROUTE
-- ------------------------------------------------------------------------------
ALTER TABLE public.seller_settlements ADD COLUMN IF NOT EXISTS settlement_number VARCHAR(50);
ALTER TABLE public.seller_settlements ADD COLUMN IF NOT EXISTS amount_minor BIGINT;
ALTER TABLE public.seller_settlements ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'INR';
ALTER TABLE public.seller_settlements ADD COLUMN IF NOT EXISTS razorpay_account_id VARCHAR(50);
ALTER TABLE public.seller_settlements ADD COLUMN IF NOT EXISTS razorpay_transfer_id VARCHAR(100);
ALTER TABLE public.seller_settlements ADD COLUMN IF NOT EXISTS provider_status VARCHAR(50);
ALTER TABLE public.seller_settlements ADD COLUMN IF NOT EXISTS utr_number VARCHAR(100);
ALTER TABLE public.seller_settlements ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(150);
ALTER TABLE public.seller_settlements ADD COLUMN IF NOT EXISTS hold_reason TEXT;
ALTER TABLE public.seller_settlements ADD COLUMN IF NOT EXISTS held_by VARCHAR(100);
ALTER TABLE public.seller_settlements ADD COLUMN IF NOT EXISTS held_at TIMESTAMPTZ;
ALTER TABLE public.seller_settlements ADD COLUMN IF NOT EXISTS released_by VARCHAR(100);
ALTER TABLE public.seller_settlements ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ;
ALTER TABLE public.seller_settlements ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE public.seller_settlements ADD COLUMN IF NOT EXISTS retry_count INT NOT NULL DEFAULT 0;
ALTER TABLE public.seller_settlements ADD COLUMN IF NOT EXISTS reconciliation_flag BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.seller_settlements ADD COLUMN IF NOT EXISTS reconciliation_notes TEXT;
ALTER TABLE public.seller_settlements ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS uq_seller_settlements_number 
    ON public.seller_settlements(settlement_number) WHERE settlement_number IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_seller_settlements_idempotency 
    ON public.seller_settlements(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_seller_settlements_seller ON public.seller_settlements(seller_id, status);
CREATE INDEX IF NOT EXISTS idx_seller_settlements_transfer ON public.seller_settlements(razorpay_transfer_id);

-- Update amount_minor for seller_settlements
UPDATE public.seller_settlements
SET amount_minor = ROUND(net_amount * 100)::BIGINT
WHERE amount_minor IS NULL AND net_amount IS NOT NULL;

-- ------------------------------------------------------------------------------
-- 4. SETTLEMENT ORDERS LINKING TABLE ENHANCEMENTS
-- ------------------------------------------------------------------------------
ALTER TABLE public.settlement_orders ADD COLUMN IF NOT EXISTS seller_id UUID;
ALTER TABLE public.settlement_orders ADD COLUMN IF NOT EXISTS payable_minor BIGINT;
ALTER TABLE public.settlement_orders ADD COLUMN IF NOT EXISTS commission_minor BIGINT;
ALTER TABLE public.settlement_orders ADD COLUMN IF NOT EXISTS order_number VARCHAR(100);

-- ------------------------------------------------------------------------------
-- 5. RPC: RECORD ORDER FINANCIAL PAYABLE (CALLED ON PAYMENT CAPTURE)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_order_financial_payable(
    p_order_id UUID,
    p_seller_id UUID,
    p_order_number TEXT,
    p_gross_amount_minor BIGINT,
    p_commission_minor BIGINT,
    p_platform_fee_minor BIGINT,
    p_shipping_fee_minor BIGINT,
    p_tax_on_fees_minor BIGINT,
    p_net_payable_minor BIGINT,
    p_currency TEXT DEFAULT 'INR',
    p_items_breakdown JSONB DEFAULT '[]'::jsonb
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_seller RECORD;
    v_hold_days INT := 7;
    v_eligible_at TIMESTAMPTZ;
    v_existing RECORD;
BEGIN
    SELECT * INTO v_seller FROM public.sellers WHERE id = p_seller_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'SELLER_NOT_FOUND');
    END IF;

    v_hold_days := COALESCE(v_seller.settlement_hold_days, 7);
    -- Eligibility scheduled for hold_days after delivery (initially tentative)
    v_eligible_at := NOW() + (v_hold_days || ' days')::INTERVAL;

    -- Check idempotency by order_id + seller_id
    SELECT * INTO v_existing FROM public.seller_financial_ledger 
    WHERE order_id = p_order_id AND seller_id = p_seller_id AND transaction_type = 'SELLER_PAYABLE';

    IF FOUND THEN
        RETURN jsonb_build_object('success', true, 'already_recorded', true, 'ledger_id', v_existing.id);
    END IF;

    -- 1. SALE entry (Gross)
    INSERT INTO public.seller_financial_ledger (
        seller_id, order_id, transaction_type, entry_type, amount, amount_minor, currency,
        status, description, reference_id, reference_type, idempotency_key, metadata
    ) VALUES (
        p_seller_id, p_order_id, 'SALE', 'CREDIT', ROUND(p_gross_amount_minor / 100.0, 2), p_gross_amount_minor, p_currency,
        'COMPLETED', 'Customer order payment captured (' || p_order_number || ')',
        p_order_number, 'ORDER_SALE', 'SALE_' || p_order_id || '_' || p_seller_id,
        jsonb_build_object('order_id', p_order_id, 'items', p_items_breakdown)
    ) ON CONFLICT (idempotency_key) DO NOTHING;

    -- 2. COMMISSION entry
    IF p_commission_minor > 0 THEN
        INSERT INTO public.seller_financial_ledger (
            seller_id, order_id, transaction_type, entry_type, amount, amount_minor, currency,
            status, description, reference_id, reference_type, idempotency_key, metadata
        ) VALUES (
            p_seller_id, p_order_id, 'COMMISSION', 'DEBIT', ROUND(p_commission_minor / 100.0, 2), p_commission_minor, p_currency,
            'COMPLETED', 'Platform marketplace commission for order (' || p_order_number || ')',
            p_order_number, 'PLATFORM_COMMISSION', 'COMM_' || p_order_id || '_' || p_seller_id,
            jsonb_build_object('order_id', p_order_id)
        ) ON CONFLICT (idempotency_key) DO NOTHING;
    END IF;

    -- 3. PLATFORM & SHIPPING FEES
    IF (p_platform_fee_minor + p_shipping_fee_minor + p_tax_on_fees_minor) > 0 THEN
        INSERT INTO public.seller_financial_ledger (
            seller_id, order_id, transaction_type, entry_type, amount, amount_minor, currency,
            status, description, reference_id, reference_type, idempotency_key, metadata
        ) VALUES (
            p_seller_id, p_order_id, 'FIXED_FEE', 'DEBIT', 
            ROUND((p_platform_fee_minor + p_shipping_fee_minor + p_tax_on_fees_minor) / 100.0, 2), 
            p_platform_fee_minor + p_shipping_fee_minor + p_tax_on_fees_minor, p_currency,
            'COMPLETED', 'Platform logistics, service & tax deductions (' || p_order_number || ')',
            p_order_number, 'SERVICE_FEES', 'FEE_' || p_order_id || '_' || p_seller_id,
            jsonb_build_object('platform_fee', p_platform_fee_minor, 'shipping_fee', p_shipping_fee_minor, 'tax_on_fees', p_tax_on_fees_minor)
        ) ON CONFLICT (idempotency_key) DO NOTHING;
    END IF;

    -- 4. SELLER_PAYABLE entry (Pending Delivery & Return Window)
    INSERT INTO public.seller_financial_ledger (
        seller_id, order_id, transaction_type, entry_type, amount, amount_minor, currency,
        status, description, reference_id, reference_type, idempotency_key, eligible_at, metadata
    ) VALUES (
        p_seller_id, p_order_id, 'SELLER_PAYABLE', 'CREDIT', 
        ROUND(p_net_payable_minor / 100.0, 2), p_net_payable_minor, p_currency,
        'PENDING', 'Net seller payable for order (' || p_order_number || ') - Hold pending delivery',
        p_order_number, 'SELLER_PAYABLE', 'PAYABLE_' || p_order_id || '_' || p_seller_id,
        v_eligible_at,
        jsonb_build_object('order_id', p_order_id, 'order_number', p_order_number, 'hold_days', v_hold_days)
    ) ON CONFLICT (idempotency_key) DO NOTHING;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'seller_id', p_seller_id,
        'net_payable_minor', p_net_payable_minor,
        'status', 'PENDING'
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. RPC: EVALUATE & TRANSITION ORDERS TO ELIGIBLE (AFTER SHIPROCKET DELIVERY)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.evaluate_delivered_orders_eligibility()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_updated_count INT := 0;
    v_row RECORD;
BEGIN
    -- Select all PENDING SELLER_PAYABLE entries where:
    --  1. Order is marked 'delivered' or 'completed'
    --  2. Delivery timestamp + hold days <= NOW() (or delivered_at is null fallback 7 days past order date)
    --  3. No active returns in order_returns table
    --  4. Seller is ACTIVE
    FOR v_row IN
        SELECT 
            fl.id AS ledger_id,
            fl.order_id,
            fl.seller_id,
            fl.amount_minor,
            s.settlement_hold_days,
            o.delivered_at,
            o.order_number
        FROM public.seller_financial_ledger fl
        JOIN public.orders o ON o.id = fl.order_id
        JOIN public.sellers s ON s.id = fl.seller_id
        WHERE fl.transaction_type = 'SELLER_PAYABLE'
          AND fl.status = 'PENDING'
          AND LOWER(COALESCE(o.order_status, '')) IN ('delivered', 'completed')
          AND NOT EXISTS (
              SELECT 1 FROM public.order_returns ret 
              WHERE ret.order_id = fl.order_id AND ret.status NOT IN ('REJECTED', 'CANCELLED')
          )
          AND (
              (o.delivered_at IS NOT NULL AND o.delivered_at + (COALESCE(s.settlement_hold_days, 7) || ' days')::INTERVAL <= NOW())
              OR
              (o.delivered_at IS NULL AND o.created_at + ((COALESCE(s.settlement_hold_days, 7) + 3) || ' days')::INTERVAL <= NOW())
          )
          AND LOWER(COALESCE(s.status, 'active')) NOT IN ('suspended', 'banned', 'frozen', 'blocked')
        FOR UPDATE OF fl SKIP LOCKED
    LOOP
        UPDATE public.seller_financial_ledger
        SET status = 'ELIGIBLE',
            eligible_at = NOW()
        WHERE id = v_row.ledger_id;

        v_updated_count := v_updated_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'orders_marked_eligible', v_updated_count);
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. RPC: CREATE SETTLEMENT BATCH FOR AN ELIGIBLE SELLER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_seller_settlement_batch(
    p_seller_id UUID,
    p_batch_number TEXT,
    p_idempotency_key TEXT,
    p_created_by TEXT DEFAULT 'SYSTEM'
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_seller RECORD;
    v_existing RECORD;
    v_total_minor BIGINT := 0;
    v_settlement_id UUID;
    v_order_count INT := 0;
    v_rec RECORD;
BEGIN
    SELECT * INTO v_seller FROM public.sellers WHERE id = p_seller_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'SELLER_NOT_FOUND');
    END IF;

    -- Check if seller is suspended
    IF LOWER(COALESCE(v_seller.status, 'active')) IN ('suspended', 'banned', 'frozen', 'blocked') 
       OR COALESCE(v_seller.is_suspended, false) = true THEN
        RETURN jsonb_build_object('success', false, 'error', 'SELLER_SUSPENDED', 'message', 'Seller account is suspended.');
    END IF;

    -- Check idempotency
    SELECT * INTO v_existing FROM public.seller_settlements WHERE idempotency_key = p_idempotency_key;
    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true, 'idempotent', true,
            'settlement_id', v_existing.id,
            'settlement_number', v_existing.settlement_number,
            'amount_minor', v_existing.amount_minor,
            'status', v_existing.status
        );
    END IF;

    -- Sum all ELIGIBLE payable entries for this seller
    SELECT 
        COALESCE(SUM(amount_minor), 0),
        COUNT(DISTINCT order_id)
    INTO v_total_minor, v_order_count
    FROM public.seller_financial_ledger
    WHERE seller_id = p_seller_id
      AND transaction_type = 'SELLER_PAYABLE'
      AND status = 'ELIGIBLE';

    IF v_total_minor <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'NO_ELIGIBLE_FUNDS', 'message', 'No eligible orders to settle.');
    END IF;

    -- Create settlement batch record
    INSERT INTO public.seller_settlements (
        seller_id, settlement_number, amount_minor, net_amount, currency,
        status, total_orders, idempotency_key, razorpay_account_id,
        created_at, updated_at
    ) VALUES (
        p_seller_id, p_batch_number, v_total_minor, ROUND(v_total_minor / 100.0, 2), 'INR',
        'QUEUED', v_order_count, p_idempotency_key, v_seller.razorpay_account_id,
        NOW(), NOW()
    ) RETURNING id INTO v_settlement_id;

    -- Link orders and lock payable ledger entries to QUEUED
    FOR v_rec IN 
        SELECT id, order_id, amount_minor, reference_id
        FROM public.seller_financial_ledger
        WHERE seller_id = p_seller_id
          AND transaction_type = 'SELLER_PAYABLE'
          AND status = 'ELIGIBLE'
        FOR UPDATE
    LOOP
        UPDATE public.seller_financial_ledger
        SET status = 'QUEUED',
            settlement_id = v_settlement_id,
            settlement_batch_id = p_batch_number
        WHERE id = v_rec.id;

        IF v_rec.order_id IS NOT NULL THEN
            INSERT INTO public.settlement_orders (
                settlement_id, order_id, seller_id, payable_minor, order_number, created_at
            ) VALUES (
                v_settlement_id, v_rec.order_id, p_seller_id, v_rec.amount_minor, v_rec.reference_id, NOW()
            ) ON CONFLICT DO NOTHING;
        END IF;
    END LOOP;

    -- Log admin audit entry
    INSERT INTO public.admin_audit_logs (
        admin_id, admin_email, action, target_seller_id,
        new_state, reason, created_at
    ) VALUES (
        COALESCE(p_created_by, 'SYSTEM'), 'system@zebalpha.shop', 'SETTLEMENT_BATCH_CREATED',
        p_seller_id,
        jsonb_build_object('settlement_id', v_settlement_id, 'settlement_number', p_batch_number, 'amount_minor', v_total_minor),
        'Automated settlement batch generated from eligible delivered orders', NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'settlement_id', v_settlement_id,
        'settlement_number', p_batch_number,
        'amount_minor', v_total_minor,
        'total_orders', v_order_count,
        'status', 'QUEUED'
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 8. RPC: FINALIZE ROUTE SETTLEMENT SUCCESS (UPON CONFIRMED WEBHOOK)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.finalize_route_settlement_success(
    p_settlement_id UUID,
    p_transfer_id TEXT,
    p_utr_number TEXT DEFAULT NULL,
    p_provider_status TEXT DEFAULT 'processed',
    p_source TEXT DEFAULT 'WEBHOOK'
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_settlement RECORD;
    v_ledger_id UUID;
    v_available NUMERIC := 0;
BEGIN
    SELECT * INTO v_settlement FROM public.seller_settlements WHERE id = p_settlement_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'SETTLEMENT_NOT_FOUND');
    END IF;

    -- Already completed guard
    IF v_settlement.status = 'SETTLED' THEN
        RETURN jsonb_build_object('success', true, 'already_settled', true, 'settlement_number', v_settlement.settlement_number);
    END IF;

    UPDATE public.seller_settlements
    SET status = 'SETTLED',
        razorpay_transfer_id = COALESCE(p_transfer_id, razorpay_transfer_id),
        provider_status = p_provider_status,
        utr_number = COALESCE(p_utr_number, utr_number),
        processed_at = NOW(),
        updated_at = NOW()
    WHERE id = p_settlement_id;

    -- Update linked payables to SETTLED
    UPDATE public.seller_financial_ledger
    SET status = 'SETTLED'
    WHERE settlement_id = p_settlement_id AND status IN ('QUEUED', 'PROCESSING', 'INITIATED');

    SELECT COALESCE(b.available, 0) INTO v_available FROM public.seller_balance_summary(v_settlement.seller_id) b;

    -- Write immutable ledger debit for SELLER_SETTLEMENT
    INSERT INTO public.seller_financial_ledger (
        seller_id, settlement_id, settlement_batch_id, transaction_type, entry_type,
        amount, amount_minor, currency, balance_before, balance_after,
        status, description, reference_id, reference_type, idempotency_key, metadata
    ) VALUES (
        v_settlement.seller_id, p_settlement_id, v_settlement.settlement_number, 'SELLER_SETTLEMENT', 'DEBIT',
        ROUND(v_settlement.amount_minor / 100.0, 2), v_settlement.amount_minor, v_settlement.currency,
        v_available, GREATEST(0, v_available - ROUND(v_settlement.amount_minor / 100.0, 2)),
        'COMPLETED',
        'Marketplace settlement transferred via Razorpay Route (' || v_settlement.settlement_number || '). Transfer ID: ' || COALESCE(p_transfer_id, 'N/A'),
        v_settlement.settlement_number, 'ROUTE_SETTLEMENT', 'LEDGER_SETTLED_' || v_settlement.settlement_number,
        jsonb_build_object('transfer_id', p_transfer_id, 'utr', p_utr_number, 'source', p_source)
    ) ON CONFLICT (idempotency_key) DO NOTHING;

    -- Send notification to seller
    INSERT INTO public.seller_notifications (
        seller_id, message, read_status, created_at
    ) VALUES (
        v_settlement.seller_id,
        'Your settlement ' || v_settlement.settlement_number || ' for ₹' || ROUND(v_settlement.amount_minor / 100.0, 2) || ' has been transferred via Razorpay Route. UTR: ' || COALESCE(p_utr_number, 'In Transit'),
        false, NOW()
    );

    RETURN jsonb_build_object(
        'success', true,
        'settlement_id', p_settlement_id,
        'settlement_number', v_settlement.settlement_number,
        'status', 'SETTLED',
        'transfer_id', p_transfer_id,
        'utr', p_utr_number
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 9. RPC: RECORD REFUND ADJUSTMENT / REVERSAL (REFUND-AFTER-SETTLEMENT)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_refund_reversal_adjustment(
    p_order_id UUID,
    p_seller_id UUID,
    p_refund_amount_minor BIGINT,
    p_reason TEXT DEFAULT 'Customer refund post-settlement'
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_payable RECORD;
    v_available NUMERIC := 0;
BEGIN
    SELECT * INTO v_payable FROM public.seller_financial_ledger 
    WHERE order_id = p_order_id AND seller_id = p_seller_id AND transaction_type = 'SELLER_PAYABLE';

    -- 1. If payable was NOT yet settled, simply reverse the payable
    IF FOUND AND v_payable.status IN ('PENDING', 'ELIGIBLE', 'QUEUED') THEN
        UPDATE public.seller_financial_ledger
        SET status = 'REVERSED',
            hold_reason = p_reason
        WHERE id = v_payable.id;

        INSERT INTO public.seller_financial_ledger (
            seller_id, order_id, transaction_type, entry_type, amount, amount_minor, currency,
            status, description, reference_id, reference_type, idempotency_key, metadata
        ) VALUES (
            p_seller_id, p_order_id, 'REVERSAL', 'DEBIT', 
            ROUND(p_refund_amount_minor / 100.0, 2), p_refund_amount_minor, 'INR',
            'COMPLETED', 'Pre-settlement payable cancellation due to customer return/refund',
            v_payable.reference_id, 'ORDER_RETURN', 'REV_PRE_' || p_order_id,
            jsonb_build_object('reason', p_reason)
        ) ON CONFLICT (idempotency_key) DO NOTHING;

        RETURN jsonb_build_object('success', true, 'type', 'PRE_SETTLEMENT_REVERSED');
    END IF;

    -- 2. If payable was ALREADY SETTLED: record an auditable RECOVERY ADJUSTMENT debit
    SELECT COALESCE(b.available, 0) INTO v_available FROM public.seller_balance_summary(p_seller_id) b;

    INSERT INTO public.seller_financial_ledger (
        seller_id, order_id, transaction_type, entry_type, amount, amount_minor, currency,
        balance_before, balance_after, status, description, reference_id, reference_type,
        idempotency_key, metadata
    ) VALUES (
        p_seller_id, p_order_id, 'ADJUSTMENT', 'DEBIT',
        ROUND(p_refund_amount_minor / 100.0, 2), p_refund_amount_minor, 'INR',
        v_available, v_available - ROUND(p_refund_amount_minor / 100.0, 2),
        'COMPLETED', 'Post-settlement refund recovery adjustment: ' || p_reason,
        COALESCE(v_payable.reference_id, 'REFUND_' || p_order_id), 'POST_SETTLEMENT_RECOVERY',
        'ADJ_POST_' || p_order_id || '_' || EXTRACT(EPOCH FROM NOW())::BIGINT,
        jsonb_build_object('refund_minor', p_refund_amount_minor, 'reason', p_reason)
    ) ON CONFLICT (idempotency_key) DO NOTHING;

    RETURN jsonb_build_object('success', true, 'type', 'POST_SETTLEMENT_ADJUSTMENT_RECORDED');
END;
$$;

-- ------------------------------------------------------------------------------
-- 10. COMPREHENSIVE SELLER ROUTE FINANCIAL SUMMARY VIEW
-- ------------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.seller_route_financial_overview AS
SELECT 
    s.id AS seller_id,
    s.business_name,
    s.owner_name,
    s.email,
    s.razorpay_account_id,
    s.route_onboarding_status,
    s.route_verification_status,
    s.route_settlement_method,
    s.route_upi_id,
    s.status AS seller_account_status,
    COALESCE(b.gross_sales, 0) AS gross_sales,
    COALESCE(b.deductions, 0) AS total_platform_fees,
    COALESCE(b.net_earnings, 0) AS net_earnings,
    COALESCE(b.withdrawn, 0) AS settled_amount,
    COALESCE(b.reserved, 0) AS processing_amount,
    COALESCE(b.available, 0) AS available_to_settle,
    COALESCE(b.pending, 0) AS pending_eligibility_amount,
    (
        SELECT COALESCE(SUM(amount_minor), 0)
        FROM public.seller_financial_ledger fl
        WHERE fl.seller_id = s.id AND fl.transaction_type = 'SELLER_PAYABLE' AND fl.status = 'ELIGIBLE'
    ) AS eligible_minor,
    (
        SELECT COUNT(*)
        FROM public.seller_settlements st
        WHERE st.seller_id = s.id
    ) AS total_settlement_batches_count,
    (
        SELECT COUNT(*)
        FROM public.seller_settlements st
        WHERE st.seller_id = s.id AND st.status = 'SETTLED'
    ) AS completed_batches_count
FROM public.sellers s
LEFT JOIN LATERAL (
    SELECT * FROM public.seller_balance_summary(s.id)
) b ON TRUE;

-- ------------------------------------------------------------------------------
-- 11. SECURITY & PERMISSIONS
-- ------------------------------------------------------------------------------
GRANT SELECT ON public.seller_route_financial_overview TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.record_order_financial_payable FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.evaluate_delivered_orders_eligibility FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_seller_settlement_batch FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.finalize_route_settlement_success FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.record_refund_reversal_adjustment FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.record_order_financial_payable TO service_role;
GRANT EXECUTE ON FUNCTION public.evaluate_delivered_orders_eligibility TO service_role;
GRANT EXECUTE ON FUNCTION public.create_seller_settlement_batch TO service_role;
GRANT EXECUTE ON FUNCTION public.finalize_route_settlement_success TO service_role;
GRANT EXECUTE ON FUNCTION public.record_refund_reversal_adjustment TO service_role;

-- Complete!
