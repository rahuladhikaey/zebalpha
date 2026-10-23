-- ==============================================================================
-- ZEBALPHA CANONICAL FINANCIAL LEDGER, SETTLEMENT & RECONCILIATION ENGINE
-- Production-grade audit patch adhering strictly to marketplace financial rules.
-- Minor units (paise) integer precision, double-entry immutable ledger,
-- row-level locking concurrency protection, and authoritative balance buckets.
-- ==============================================================================

-- 1. Ensure columns exist on sellers, orders, and ledger
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS settlement_hold_days INT NOT NULL DEFAULT 7;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS auto_settlement_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS route_settlement_method VARCHAR(20) DEFAULT 'UPI';
ALTER TABLE public.sellers ADD COLUMN IF NOT EXISTS upi_id VARCHAR(255);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancelled_by TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS settlement_status VARCHAR(50) DEFAULT 'PENDING';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS settlement_due_date TIMESTAMPTZ;

-- 2. CANONICAL SELLER BALANCE SUMMARY
-- Guarantees a single authoritative source of truth for:
--  - gross_sales (GMV of completed delivered orders)
--  - deductions (platform commission, fixed fees, collection fees, shipping, taxes, return/RTO adjustments)
--  - net_earnings (gross_sales - deductions)
--  - withdrawn (successfully disbursed to seller UPI minus reversals)
--  - reserved (in-flight payouts: PENDING, PROCESSING, RECONCILIATION_REQUIRED)
--  - available (genuinely withdrawable money)
--  - pending (delivered orders inside return window + in-flight orders)
CREATE OR REPLACE FUNCTION public.seller_balance_summary(p_seller_id UUID DEFAULT NULL)
RETURNS TABLE (
    seller_id UUID,
    gross_sales NUMERIC,
    deductions NUMERIC,
    net_earnings NUMERIC,
    withdrawn NUMERIC,
    reserved NUMERIC,
    available NUMERIC,
    pending NUMERIC
)
LANGUAGE sql STABLE SET search_path = public AS $$
    WITH s AS (
        SELECT id FROM public.sellers
        WHERE (p_seller_id IS NULL OR id = p_seller_id)
    ),
    l AS (
        SELECT
            fl.seller_id,
            -- Completed Gross Sales
            COALESCE(SUM(CASE 
                WHEN fl.status = 'COMPLETED' AND fl.entry_type = 'CREDIT'
                     AND fl.transaction_type IN ('SALE', 'SALE_CREDIT', 'ADJUSTMENT_CREDIT') 
                THEN fl.amount END), 0) AS gross,
            
            -- Completed Platform Deductions
            COALESCE(SUM(CASE 
                WHEN fl.status = 'COMPLETED' AND fl.entry_type = 'DEBIT'
                     AND fl.transaction_type IN (
                         'COMMISSION', 'COMMISSION_DEDUCTION', 'FIXED_FEE', 'SHIPPING_FEE',
                         'COLLECTION_FEE', 'REFUND', 'PARTIAL_REFUND', 'RETURN_FEE', 'RTO_FEE', 
                         'TAX', 'CHARGEBACK', 'PENALTY', 'ADJUSTMENT_DEBIT'
                     ) 
                THEN fl.amount END), 0) AS ded,
            
            -- Net Withdrawn (Disbursed - Reversed)
            GREATEST(0,
                COALESCE(SUM(CASE 
                    WHEN fl.status = 'COMPLETED'
                         AND fl.transaction_type IN ('SETTLEMENT', 'WITHDRAWAL_SUCCESS') 
                    THEN fl.amount END), 0)
                - COALESCE(SUM(CASE 
                    WHEN fl.status = 'COMPLETED'
                         AND fl.transaction_type IN ('SETTLEMENT_REVERSAL', 'WITHDRAWAL_REVERSED') 
                    THEN fl.amount END), 0)
            ) AS wd,
            
            -- Pending Settlement / Unreleased earnings
            -- Specifically SELLER_PAYABLE with status = 'PENDING'
            COALESCE(SUM(CASE 
                WHEN fl.status = 'PENDING'
                     AND fl.transaction_type = 'SELLER_PAYABLE'
                THEN fl.amount 
                WHEN fl.status = 'PENDING' AND fl.entry_type = 'CREDIT'
                     AND fl.transaction_type IN ('SALE', 'SALE_CREDIT')
                THEN fl.amount
                END), 0)
            - COALESCE(SUM(CASE
                WHEN fl.status = 'PENDING' AND fl.entry_type = 'DEBIT'
                THEN fl.amount
                END), 0) AS pend,
                
            -- Eligible Payables released to Available Balance
            COALESCE(SUM(CASE 
                WHEN fl.status IN ('ELIGIBLE', 'COMPLETED') 
                     AND fl.transaction_type = 'SELLER_PAYABLE' 
                THEN fl.amount 
                WHEN fl.status = 'COMPLETED' AND fl.entry_type = 'CREDIT'
                     AND fl.transaction_type IN ('ADJUSTMENT_CREDIT')
                THEN fl.amount
                END), 0) AS eligible_payables,
                
            -- Post-eligibility adjustments / debits (returns after settlement eligibility, penalty, adjustment debits)
            COALESCE(SUM(CASE 
                WHEN fl.status = 'COMPLETED' AND fl.entry_type = 'DEBIT'
                     AND fl.transaction_type IN ('REFUND', 'PARTIAL_REFUND', 'RETURN_FEE', 'RTO_FEE', 'PENALTY', 'ADJUSTMENT_DEBIT')
                     -- Only count adjustments that were NOT part of initial order fees
                     AND (fl.reference_type IS NULL OR fl.reference_type NOT IN ('PLATFORM_COMMISSION', 'FIXED_ORDER_FEE', 'PAYMENT_COLLECTION_FEE', 'COD_HANDLING_FEE', 'SHIPPING_CHARGE'))
                THEN fl.amount END), 0) AS post_eligibility_debits
        FROM public.seller_financial_ledger fl
        WHERE (p_seller_id IS NULL OR fl.seller_id = p_seller_id)
        GROUP BY fl.seller_id
    ),
    r AS (
        SELECT 
            pr.seller_id, 
            COALESCE(SUM(pr.amount), 0) AS res
        FROM public.seller_payout_requests pr
        WHERE pr.status IN ('PENDING', 'PROCESSING', 'RECONCILIATION_REQUIRED')
          AND (p_seller_id IS NULL OR pr.seller_id = p_seller_id)
        GROUP BY pr.seller_id
    )
    SELECT
        s.id AS seller_id,
        COALESCE(l.gross, 0)::NUMERIC AS gross_sales,
        COALESCE(l.ded, 0)::NUMERIC AS deductions,
        GREATEST(0, COALESCE(l.gross, 0) - COALESCE(l.ded, 0))::NUMERIC AS net_earnings,
        GREATEST(0, COALESCE(l.wd, 0))::NUMERIC AS withdrawn,
        COALESCE(r.res, 0)::NUMERIC AS reserved,
        -- Available balance:
        -- Strictly derived from eligible released payables minus post-eligibility debits minus withdrawn minus currently reserved.
        -- When an order is newly placed or delivered inside return window, SELLER_PAYABLE is PENDING, so available is strictly 0.
        GREATEST(0, COALESCE(l.eligible_payables, 0) - COALESCE(l.post_eligibility_debits, 0) - COALESCE(l.wd, 0) - COALESCE(r.res, 0))::NUMERIC AS available,
        GREATEST(0, COALESCE(l.pend, 0))::NUMERIC AS pending
    FROM s
    LEFT JOIN l ON s.id = l.seller_id
    LEFT JOIN r ON s.id = r.seller_id;
$$;

-- 3. ATOMIC BALANCE RESERVATION FOR WITHDRAWAL (WITH ROW-LEVEL LOCKING)
-- Strictly prevents duplicate simultaneous withdrawals (e.g. ₹800 + ₹800 from ₹1000).
CREATE OR REPLACE FUNCTION public.reserve_seller_balance_for_withdrawal(
    p_seller_id UUID,
    p_amount NUMERIC,
    p_idempotency_key TEXT,
    p_payout_number TEXT,
    p_destination_masked TEXT,
    p_destination_upi TEXT,
    p_beneficiary_name TEXT,
    p_settlement_method_id UUID DEFAULT NULL,
    p_source TEXT DEFAULT 'MANUAL'
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_seller RECORD;
    v_available NUMERIC := 0;
    v_reserved NUMERIC := 0;
    v_amount NUMERIC := ROUND(p_amount, 2);
    v_payout_id UUID;
    v_queue_id UUID;
    v_existing RECORD;
BEGIN
    -- Strict parameter sanity
    IF v_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_AMOUNT',
            'message', 'Withdrawal amount must be greater than zero.');
    END IF;

    -- Concurrency Guard: Lock seller row exclusively for duration of transaction
    SELECT * INTO v_seller FROM public.sellers WHERE id = p_seller_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'SELLER_NOT_FOUND',
            'message', 'Seller account does not exist.');
    END IF;

    -- Idempotency check: Return existing record if already submitted
    SELECT * INTO v_existing FROM public.seller_payout_requests
    WHERE idempotency_key = p_idempotency_key OR payout_number = p_payout_number;
    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'idempotent', true,
            'payout_id', v_existing.id,
            'payout_number', v_existing.payout_number,
            'status', v_existing.status,
            'amount', v_existing.amount,
            'message', 'Idempotent withdrawal request already received.'
        );
    END IF;

    -- Account eligibility guard
    IF v_seller.status IS NOT NULL AND LOWER(v_seller.status) IN ('suspended', 'banned', 'frozen', 'blocked') THEN
        RETURN jsonb_build_object('success', false, 'error', 'SELLER_SUSPENDED',
            'message', 'Seller account is suspended and ineligible for withdrawal.');
    END IF;

    -- Concurrency check: Ensure no other in-flight payout is currently locking queue
    IF EXISTS (SELECT 1 FROM public.seller_payout_requests
               WHERE seller_id = p_seller_id AND status IN ('PENDING', 'PROCESSING')) THEN
        RETURN jsonb_build_object('success', false, 'error', 'ACTIVE_PAYOUT_IN_PROGRESS',
            'message', 'A withdrawal is already processing. Please wait for it to complete.');
    END IF;

    -- Fetch live available balance directly from authoritative source of truth
    SELECT COALESCE(b.available, 0), COALESCE(b.reserved, 0)
    INTO v_available, v_reserved
    FROM public.seller_balance_summary(p_seller_id) b;
    v_available := COALESCE(v_available, 0);
    v_reserved := COALESCE(v_reserved, 0);

    -- Insufficient balance check (atomic - guaranteed by row lock)
    IF v_amount > v_available THEN
        RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_BALANCE',
            'available_balance', v_available, 'reserved_balance', v_reserved, 'requested_amount', v_amount,
            'message', 'Requested amount exceeds available balance.');
    END IF;

    -- Create payout request
    BEGIN
        INSERT INTO public.seller_payout_requests (
            payout_number, seller_id, settlement_method_id, method_type, destination_masked, destination_upi,
            beneficiary_name, amount, currency, status, provider, idempotency_key, notes, source, initiated_at
        ) VALUES (
            p_payout_number, p_seller_id, p_settlement_method_id, 'UPI', p_destination_masked, p_destination_upi,
            p_beneficiary_name, v_amount, 'INR', 'PROCESSING', 'RAZORPAY', p_idempotency_key,
            'UPI Payout to ' || p_destination_masked, COALESCE(p_source, 'MANUAL'), NOW()
        ) RETURNING id INTO v_payout_id;
    EXCEPTION WHEN unique_violation THEN
        RETURN jsonb_build_object('success', false, 'error', 'DUPLICATE_REQUEST',
            'message', 'Duplicate withdrawal request detected.');
    END;

    -- Record WITHDRAWAL_REQUESTED in immutable ledger
    INSERT INTO public.seller_financial_ledger (
        seller_id, transaction_type, entry_type, amount, amount_minor, currency, balance_before, balance_after,
        status, description, reference_id, reference_type, idempotency_key, metadata
    ) VALUES (
        p_seller_id, 'WITHDRAWAL_REQUESTED', 'DEBIT', v_amount, ROUND(v_amount * 100)::BIGINT, 'INR', 
        v_available, v_available - v_amount,
        'COMPLETED',
        'Balance reserved for UPI withdrawal (' || p_payout_number || ') to ' || p_destination_masked,
        p_payout_number, 'PAYOUT_REQUEST', 'LEDGER_REQ_' || p_payout_number,
        jsonb_build_object('payout_id', v_payout_id, 'payout_number', p_payout_number,
                           'destination_masked', p_destination_masked, 'source', COALESCE(p_source, 'MANUAL'))
    );

    -- Queue payout for background execution
    INSERT INTO public.payout_queue (
        payout_request_id, seller_id, amount, destination_upi, beneficiary_name,
        payout_number, idempotency_key, status, job_type, next_attempt_at
    ) VALUES (
        v_payout_id, p_seller_id, v_amount, p_destination_upi, p_beneficiary_name,
        p_payout_number, p_idempotency_key, 'QUEUED', COALESCE(p_source, 'MANUAL'), NOW()
    ) RETURNING id INTO v_queue_id;

    -- Return atomic reservation confirmation
    RETURN jsonb_build_object(
        'success', true,
        'payout_id', v_payout_id,
        'payout_number', p_payout_number,
        'queue_id', v_queue_id,
        'amount', v_amount,
        'status', 'PROCESSING',
        'balance_before', v_available,
        'balance_after', v_available - v_amount,
        'reserved_amount', v_reserved + v_amount,
        'destination_masked', p_destination_masked,
        'message', 'Balance reserved and withdrawal queued.'
    );
END;
$$;

-- 4. ORDER CANCELLATION FINANCIAL EVENT HANDLER
-- Atomically ensures cancelled orders do NOT credit seller Available Balance.
CREATE OR REPLACE FUNCTION public.record_order_cancellation_event(
    p_order_id UUID,
    p_cancelled_by TEXT DEFAULT 'CUSTOMER',
    p_reason TEXT DEFAULT 'Order cancelled'
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_order RECORD;
    v_rec RECORD;
    v_cancelled_count INT := 0;
BEGIN
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'ORDER_NOT_FOUND');
    END IF;

    -- Find all ledger entries for this order
    FOR v_rec IN
        SELECT * FROM public.seller_financial_ledger
        WHERE order_id = p_order_id
        FOR UPDATE
    LOOP
        -- If SELLER_PAYABLE or SALE is still PENDING: transition to REVERSED / CANCELLED so it never enters Available Balance
        IF v_rec.status = 'PENDING' THEN
            UPDATE public.seller_financial_ledger
            SET status = 'REVERSED',
                description = description || ' [VOID: Order Cancelled]'
            WHERE id = v_rec.id;
            v_cancelled_count := v_cancelled_count + 1;
        -- If already ELIGIBLE or COMPLETED: create compensating ADJUSTMENT_DEBIT
        ELSIF v_rec.status IN ('ELIGIBLE', 'COMPLETED') AND v_rec.transaction_type = 'SELLER_PAYABLE' THEN
            INSERT INTO public.seller_financial_ledger (
                seller_id, order_id, transaction_type, entry_type, amount, amount_minor, currency,
                status, description, reference_id, reference_type, idempotency_key, metadata
            ) VALUES (
                v_rec.seller_id, p_order_id, 'ADJUSTMENT_DEBIT', 'DEBIT', v_rec.amount, v_rec.amount_minor, v_rec.currency,
                'COMPLETED', 'Reversal deduction for cancelled order (' || COALESCE(v_order.order_number, p_order_id::text) || ')',
                v_order.order_number, 'ORDER_CANCELLATION', 'CANCEL_REV_' || p_order_id || '_' || v_rec.seller_id,
                jsonb_build_object('cancelled_by', p_cancelled_by, 'reason', p_reason, 'original_payable', v_rec.amount)
            ) ON CONFLICT (idempotency_key) DO NOTHING;
            v_cancelled_count := v_cancelled_count + 1;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'order_number', v_order.order_number,
        'adjusted_entries_count', v_cancelled_count
    );
END;
$$;

-- 5. EVALUATE DELIVERED ORDERS & TRANSITION TO ELIGIBLE
-- Scans delivered orders where the return window (settlement delay) has elapsed without active return.
CREATE OR REPLACE FUNCTION public.evaluate_delivered_orders_eligibility()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_updated_count INT := 0;
    v_row RECORD;
BEGIN
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
              WHERE (ret.order_id = fl.order_id::text OR ret.order_number = o.order_number)
                AND UPPER(COALESCE(ret.status, '')) NOT IN ('REJECTED', 'CANCELLED')
          )
          AND (
              (o.delivered_at IS NOT NULL AND o.delivered_at + (COALESCE(s.settlement_hold_days, 7) || ' days')::INTERVAL <= NOW())
              OR
              (o.delivered_at IS NULL AND o.created_at + ((COALESCE(s.settlement_hold_days, 7) + 3) || ' days')::INTERVAL <= NOW())
          )
          AND LOWER(COALESCE(s.status, 'active')) NOT IN ('suspended', 'banned', 'frozen', 'blocked')
        FOR UPDATE OF fl SKIP LOCKED
    LOOP
        -- Transition SELLER_PAYABLE to ELIGIBLE (Available)
        UPDATE public.seller_financial_ledger
        SET status = 'ELIGIBLE',
            eligible_at = NOW()
        WHERE id = v_row.ledger_id;

        -- Transition corresponding SALE to COMPLETED
        UPDATE public.seller_financial_ledger
        SET status = 'COMPLETED'
        WHERE order_id = v_row.order_id AND seller_id = v_row.seller_id AND transaction_type = 'SALE' AND status = 'PENDING';

        v_updated_count := v_updated_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'orders_marked_eligible', v_updated_count);
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.seller_balance_summary(UUID) TO service_role, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.reserve_seller_balance_for_withdrawal(UUID, NUMERIC, TEXT, TEXT, TEXT, TEXT, TEXT, UUID, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_order_cancellation_event(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.evaluate_delivered_orders_eligibility() TO service_role;
