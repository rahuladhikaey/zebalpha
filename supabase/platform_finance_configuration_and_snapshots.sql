-- ==============================================================================
-- ZEBALPHA — ADMIN-CONFIGURABLE PLATFORM FINANCE ENGINE & SNAPSHOTS
-- Versioned platform finance configs, event-based fee structures, and order snapshots
-- ==============================================================================

-- 1. PLATFORM FINANCE CONFIGURATIONS (VERSIONED)
CREATE TABLE IF NOT EXISTS public.platform_finance_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version INT NOT NULL UNIQUE,
    commission_percentage NUMERIC(5,2) NOT NULL DEFAULT 5.0,
    fixed_fee_per_order NUMERIC(10,2) NOT NULL DEFAULT 15.0,
    payment_collection_fee_pct NUMERIC(5,2) NOT NULL DEFAULT 2.0,
    cod_handling_fee NUMERIC(10,2) NOT NULL DEFAULT 25.0,
    standard_shipping_fee NUMERIC(10,2) NOT NULL DEFAULT 60.0,
    reverse_shipping_fee NUMERIC(10,2) NOT NULL DEFAULT 70.0,
    rto_charge NUMERIC(10,2) NOT NULL DEFAULT 50.0,
    gst_on_platform_fees_pct NUMERIC(5,2) NOT NULL DEFAULT 18.0,
    settlement_delay_days INT NOT NULL DEFAULT 7,
    shipping_paid_by VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER' 
        CHECK (shipping_paid_by IN ('CUSTOMER', 'SELLER', 'ZEBALPHA', 'SHARED')),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' 
        CHECK (status IN ('DRAFT', 'VALIDATED', 'SCHEDULED', 'ACTIVE', 'EXPIRED')),
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_to TIMESTAMPTZ,
    change_reason TEXT,
    created_by VARCHAR(100),
    published_by VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_finance_status 
    ON public.platform_finance_configs(status, effective_from, effective_to);

-- Seed initial Version 1 default active configuration if empty
INSERT INTO public.platform_finance_configs (
    version,
    commission_percentage,
    fixed_fee_per_order,
    payment_collection_fee_pct,
    cod_handling_fee,
    standard_shipping_fee,
    reverse_shipping_fee,
    rto_charge,
    gst_on_platform_fees_pct,
    settlement_delay_days,
    shipping_paid_by,
    status,
    effective_from,
    change_reason,
    created_by
)
SELECT 
    1,
    5.0,
    15.0,
    2.0,
    25.0,
    60.0,
    70.0,
    50.0,
    18.0,
    7,
    'CUSTOMER',
    'ACTIVE',
    NOW(),
    'Initial default platform marketplace finance configuration',
    'SYSTEM'
WHERE NOT EXISTS (SELECT 1 FROM public.platform_finance_configs WHERE version = 1);

-- ------------------------------------------------------------------------------
-- 2. ORDER FINANCIAL SNAPSHOT (IMMUTABLE PER ORDER-SELLER AT COMMIT TIME)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_financial_snapshot (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES public.sellers(id),
    order_number VARCHAR(100),
    finance_config_version INT NOT NULL,
    finance_config_id UUID REFERENCES public.platform_finance_configs(id),
    payment_method VARCHAR(50) DEFAULT 'PREPAID',
    gross_amount_minor BIGINT NOT NULL,
    commission_minor BIGINT NOT NULL,
    fixed_fee_minor BIGINT NOT NULL,
    payment_collection_fee_minor BIGINT NOT NULL DEFAULT 0,
    cod_handling_fee_minor BIGINT NOT NULL DEFAULT 0,
    shipping_fee_minor BIGINT NOT NULL DEFAULT 0,
    shipping_paid_by VARCHAR(20) NOT NULL DEFAULT 'CUSTOMER',
    reverse_shipping_fee_minor BIGINT NOT NULL DEFAULT 0,
    rto_charge_minor BIGINT NOT NULL DEFAULT 0,
    tax_on_fees_minor BIGINT NOT NULL DEFAULT 0,
    total_platform_fees_minor BIGINT NOT NULL,
    net_seller_payable_minor BIGINT NOT NULL,
    settlement_delay_days INT NOT NULL DEFAULT 7,
    currency VARCHAR(10) DEFAULT 'INR',
    snapshot_breakdown JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_order_financial_snapshot UNIQUE (order_id, seller_id)
);

CREATE INDEX IF NOT EXISTS idx_order_financial_snapshot_seller 
    ON public.order_financial_snapshot(seller_id, created_at);
CREATE INDEX IF NOT EXISTS idx_order_financial_snapshot_order 
    ON public.order_financial_snapshot(order_id);
CREATE INDEX IF NOT EXISTS idx_order_financial_snapshot_version 
    ON public.order_financial_snapshot(finance_config_version);

-- ------------------------------------------------------------------------------
-- 3. STORED PROCEDURE: GET ACTIVE FINANCE CONFIG
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_active_finance_config()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_config RECORD;
BEGIN
    SELECT * INTO v_config 
    FROM public.platform_finance_configs
    WHERE status = 'ACTIVE' 
      AND effective_from <= NOW() 
      AND (effective_to IS NULL OR effective_to > NOW())
    ORDER BY version DESC 
    LIMIT 1;

    IF NOT FOUND THEN
        -- Fallback to latest row if no active interval matches exactly
        SELECT * INTO v_config 
        FROM public.platform_finance_configs
        ORDER BY version DESC 
        LIMIT 1;
    END IF;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'version', 1,
            'commission_percentage', 5.0,
            'fixed_fee_per_order', 15.0,
            'payment_collection_fee_pct', 2.0,
            'cod_handling_fee', 25.0,
            'standard_shipping_fee', 60.0,
            'reverse_shipping_fee', 70.0,
            'rto_charge', 50.0,
            'gst_on_platform_fees_pct', 18.0,
            'settlement_delay_days', 7,
            'shipping_paid_by', 'CUSTOMER',
            'status', 'ACTIVE'
        );
    END IF;

    RETURN to_jsonb(v_config);
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. STORED PROCEDURE: RECORD ORDER FINANCIAL SNAPSHOT & PAYABLES ATOMICALLY
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_order_financial_snapshot_and_payable(
    p_order_id UUID,
    p_seller_id UUID,
    p_order_number TEXT,
    p_config_version INT,
    p_config_id UUID,
    p_payment_method TEXT,
    p_gross_amount_minor BIGINT,
    p_commission_minor BIGINT,
    p_fixed_fee_minor BIGINT,
    p_payment_collection_fee_minor BIGINT,
    p_cod_handling_fee_minor BIGINT,
    p_shipping_fee_minor BIGINT,
    p_shipping_paid_by TEXT,
    p_tax_on_fees_minor BIGINT,
    p_net_payable_minor BIGINT,
    p_settlement_delay_days INT,
    p_currency TEXT DEFAULT 'INR',
    p_items_breakdown JSONB DEFAULT '[]'::jsonb
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_seller RECORD;
    v_total_platform_fees BIGINT;
    v_existing RECORD;
    v_eligible_at TIMESTAMPTZ;
BEGIN
    SELECT * INTO v_seller FROM public.sellers WHERE id = p_seller_id;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'SELLER_NOT_FOUND');
    END IF;

    v_total_platform_fees := p_commission_minor + p_fixed_fee_minor + p_payment_collection_fee_minor + p_cod_handling_fee_minor + p_tax_on_fees_minor;

    -- Store or update snapshot
    INSERT INTO public.order_financial_snapshot (
        order_id, seller_id, order_number, finance_config_version, finance_config_id,
        payment_method, gross_amount_minor, commission_minor, fixed_fee_minor,
        payment_collection_fee_minor, cod_handling_fee_minor, shipping_fee_minor,
        shipping_paid_by, tax_on_fees_minor, total_platform_fees_minor,
        net_seller_payable_minor, settlement_delay_days, currency, snapshot_breakdown
    ) VALUES (
        p_order_id, p_seller_id, p_order_number, p_config_version, p_config_id,
        p_payment_method, p_gross_amount_minor, p_commission_minor, p_fixed_fee_minor,
        p_payment_collection_fee_minor, p_cod_handling_fee_minor, p_shipping_fee_minor,
        p_shipping_paid_by, p_tax_on_fees_minor, v_total_platform_fees,
        p_net_payable_minor, p_settlement_delay_days, p_currency, p_items_breakdown
    ) ON CONFLICT (order_id, seller_id) DO UPDATE SET
        updated_at = NOW();

    -- Check if ledger already recorded for this order + seller
    SELECT * INTO v_existing FROM public.seller_financial_ledger 
    WHERE order_id = p_order_id AND seller_id = p_seller_id AND transaction_type = 'SELLER_PAYABLE';

    IF FOUND THEN
        RETURN jsonb_build_object('success', true, 'already_recorded', true, 'ledger_id', v_existing.id);
    END IF;

    -- Scheduled eligibility date based on snapshot delay days
    v_eligible_at := NOW() + (p_settlement_delay_days || ' days')::INTERVAL;

    -- 1. SALE entry (Gross)
    INSERT INTO public.seller_financial_ledger (
        seller_id, order_id, transaction_type, entry_type, amount, amount_minor, currency,
        status, description, reference_id, reference_type, idempotency_key, metadata
    ) VALUES (
        p_seller_id, p_order_id, 'SALE', 'CREDIT', ROUND(p_gross_amount_minor / 100.0, 2), p_gross_amount_minor, p_currency,
        'COMPLETED', 'Customer order payment captured (' || p_order_number || ')',
        p_order_number, 'ORDER_SALE', 'SALE_' || p_order_id || '_' || p_seller_id,
        jsonb_build_object('order_id', p_order_id, 'order_number', p_order_number, 'items', p_items_breakdown)
    );

    -- 2. COMMISSION entry
    IF p_commission_minor > 0 THEN
        INSERT INTO public.seller_financial_ledger (
            seller_id, order_id, transaction_type, entry_type, amount, amount_minor, currency,
            status, description, reference_id, reference_type, idempotency_key
        ) VALUES (
            p_seller_id, p_order_id, 'COMMISSION', 'DEBIT', ROUND(p_commission_minor / 100.0, 2), p_commission_minor, p_currency,
            'COMPLETED', 'Marketplace platform commission (' || p_order_number || ')',
            p_order_number, 'PLATFORM_COMMISSION', 'COMM_' || p_order_id || '_' || p_seller_id
        );
    END IF;

    -- 3. FIXED_FEE entry
    IF p_fixed_fee_minor > 0 THEN
        INSERT INTO public.seller_financial_ledger (
            seller_id, order_id, transaction_type, entry_type, amount, amount_minor, currency,
            status, description, reference_id, reference_type, idempotency_key
        ) VALUES (
            p_seller_id, p_order_id, 'FIXED_FEE', 'DEBIT', ROUND(p_fixed_fee_minor / 100.0, 2), p_fixed_fee_minor, p_currency,
            'COMPLETED', 'Order processing fee (' || p_order_number || ')',
            p_order_number, 'FIXED_ORDER_FEE', 'FIXED_' || p_order_id || '_' || p_seller_id
        );
    END IF;

    -- 4. PAYMENT COLLECTION FEE or COD HANDLING FEE entry
    IF p_payment_collection_fee_minor > 0 THEN
        INSERT INTO public.seller_financial_ledger (
            seller_id, order_id, transaction_type, entry_type, amount, amount_minor, currency,
            status, description, reference_id, reference_type, idempotency_key
        ) VALUES (
            p_seller_id, p_order_id, 'COLLECTION_FEE', 'DEBIT', ROUND(p_payment_collection_fee_minor / 100.0, 2), p_payment_collection_fee_minor, p_currency,
            'COMPLETED', 'Online payment gateway collection fee (' || p_order_number || ')',
            p_order_number, 'PAYMENT_COLLECTION_FEE', 'PG_' || p_order_id || '_' || p_seller_id
        );
    END IF;

    IF p_cod_handling_fee_minor > 0 THEN
        INSERT INTO public.seller_financial_ledger (
            seller_id, order_id, transaction_type, entry_type, amount, amount_minor, currency,
            status, description, reference_id, reference_type, idempotency_key
        ) VALUES (
            p_seller_id, p_order_id, 'COLLECTION_FEE', 'DEBIT', ROUND(p_cod_handling_fee_minor / 100.0, 2), p_cod_handling_fee_minor, p_currency,
            'COMPLETED', 'Cash on delivery handling fee (' || p_order_number || ')',
            p_order_number, 'COD_HANDLING_FEE', 'COD_' || p_order_id || '_' || p_seller_id
        );
    END IF;

    -- 5. SHIPPING FEE entry (only if seller is responsible for paying shipping)
    IF p_shipping_fee_minor > 0 AND p_shipping_paid_by IN ('SELLER', 'SHARED') THEN
        INSERT INTO public.seller_financial_ledger (
            seller_id, order_id, transaction_type, entry_type, amount, amount_minor, currency,
            status, description, reference_id, reference_type, idempotency_key
        ) VALUES (
            p_seller_id, p_order_id, 'SHIPPING_FEE', 'DEBIT', ROUND(p_shipping_fee_minor / 100.0, 2), p_shipping_fee_minor, p_currency,
            'COMPLETED', 'Logistics delivery fee (' || p_order_number || ')',
            p_order_number, 'SHIPPING_CHARGE', 'SHIP_' || p_order_id || '_' || p_seller_id
        );
    END IF;

    -- 6. SELLER_PAYABLE entry (PENDING delivery and return hold window)
    INSERT INTO public.seller_financial_ledger (
        seller_id, order_id, transaction_type, entry_type, amount, amount_minor, currency,
        status, description, reference_id, reference_type, idempotency_key, eligible_at, metadata
    ) VALUES (
        p_seller_id, p_order_id, 'SELLER_PAYABLE', 'CREDIT', ROUND(p_net_payable_minor / 100.0, 2), p_net_payable_minor, p_currency,
        'PENDING', 'Net seller payable for order ' || p_order_number,
        p_order_number, 'SELLER_PAYABLE', 'PAYABLE_' || p_order_id || '_' || p_seller_id,
        v_eligible_at,
        jsonb_build_object(
            'config_version', p_config_version,
            'hold_days', p_settlement_delay_days,
            'gross_minor', p_gross_amount_minor,
            'deductions_minor', v_total_platform_fees,
            'net_payable_minor', p_net_payable_minor
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'seller_id', p_seller_id,
        'net_payable_minor', p_net_payable_minor,
        'config_version', p_config_version,
        'eligible_at', v_eligible_at
    );
END;
$$;

-- ------------------------------------------------------------------------------
-- 5. STORED PROCEDURE: RECORD EVENT-BASED REVERSE SHIPPING (RETURN CONFIRMED)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_return_shipping_event(
    p_order_id UUID,
    p_seller_id UUID,
    p_return_id UUID,
    p_amount_minor BIGINT,
    p_reason TEXT DEFAULT 'Approved customer return reverse logistics charge'
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_idempotency_key TEXT;
    v_existing RECORD;
BEGIN
    v_idempotency_key := 'REV_SHIP_' || p_order_id || '_' || COALESCE(p_return_id::text, 'GEN');

    SELECT * INTO v_existing FROM public.seller_financial_ledger
    WHERE idempotency_key = v_idempotency_key;

    IF FOUND THEN
        RETURN jsonb_build_object('success', true, 'already_recorded', true, 'ledger_id', v_existing.id);
    END IF;

    -- Insert RETURN_FEE debit
    INSERT INTO public.seller_financial_ledger (
        seller_id, order_id, transaction_type, entry_type, amount, amount_minor, currency,
        status, description, reference_id, reference_type, idempotency_key, metadata
    ) VALUES (
        p_seller_id, p_order_id, 'RETURN_FEE', 'DEBIT', ROUND(p_amount_minor / 100.0, 2), p_amount_minor, 'INR',
        'COMPLETED', COALESCE(p_reason, 'Reverse shipping charge on approved return'),
        p_return_id::text, 'REVERSE_SHIPPING', v_idempotency_key,
        jsonb_build_object('return_id', p_return_id, 'amount_minor', p_amount_minor)
    );

    -- Update snapshot if exists
    UPDATE public.order_financial_snapshot
    SET reverse_shipping_fee_minor = reverse_shipping_fee_minor + p_amount_minor,
        updated_at = NOW()
    WHERE order_id = p_order_id AND seller_id = p_seller_id;

    RETURN jsonb_build_object('success', true, 'amount_minor', p_amount_minor);
END;
$$;

-- ------------------------------------------------------------------------------
-- 6. STORED PROCEDURE: RECORD EVENT-BASED RTO CHARGE (RTO CONFIRMED)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_rto_charge_event(
    p_order_id UUID,
    p_seller_id UUID,
    p_shipment_id TEXT,
    p_amount_minor BIGINT,
    p_reason TEXT DEFAULT 'Courier Return-to-Origin (RTO) confirmed charge'
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_idempotency_key TEXT;
    v_existing RECORD;
BEGIN
    v_idempotency_key := 'RTO_CHG_' || p_order_id || '_' || COALESCE(p_shipment_id, 'GEN');

    SELECT * INTO v_existing FROM public.seller_financial_ledger
    WHERE idempotency_key = v_idempotency_key;

    IF FOUND THEN
        RETURN jsonb_build_object('success', true, 'already_recorded', true, 'ledger_id', v_existing.id);
    END IF;

    -- Insert RTO_FEE debit
    INSERT INTO public.seller_financial_ledger (
        seller_id, order_id, transaction_type, entry_type, amount, amount_minor, currency,
        status, description, reference_id, reference_type, idempotency_key, metadata
    ) VALUES (
        p_seller_id, p_order_id, 'RTO_FEE', 'DEBIT', ROUND(p_amount_minor / 100.0, 2), p_amount_minor, 'INR',
        'COMPLETED', COALESCE(p_reason, 'Courier Return-to-Origin (RTO) confirmed charge'),
        p_shipment_id, 'RTO_CHARGE', v_idempotency_key,
        jsonb_build_object('shipment_id', p_shipment_id, 'amount_minor', p_amount_minor)
    );

    -- Update snapshot if exists
    UPDATE public.order_financial_snapshot
    SET rto_charge_minor = rto_charge_minor + p_amount_minor,
        updated_at = NOW()
    WHERE order_id = p_order_id AND seller_id = p_seller_id;

    RETURN jsonb_build_object('success', true, 'amount_minor', p_amount_minor);
END;
$$;

-- ------------------------------------------------------------------------------
-- 7. RLS SECURITY POLICIES FOR PLATFORM FINANCE CONFIGS & SNAPSHOTS
-- ------------------------------------------------------------------------------
ALTER TABLE public.platform_finance_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_financial_snapshot ENABLE ROW LEVEL SECURITY;

-- Service role full access
DROP POLICY IF EXISTS "service_role_platform_finance_configs" ON public.platform_finance_configs;
CREATE POLICY "service_role_platform_finance_configs" ON public.platform_finance_configs
    FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_order_financial_snapshot" ON public.order_financial_snapshot;
CREATE POLICY "service_role_order_financial_snapshot" ON public.order_financial_snapshot
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated super_admin can read configs
DROP POLICY IF EXISTS "super_admin_read_platform_finance_configs" ON public.platform_finance_configs;
CREATE POLICY "super_admin_read_platform_finance_configs" ON public.platform_finance_configs
    FOR SELECT TO authenticated
    USING (COALESCE(auth.jwt()->>'role', '') = 'super_admin');

-- Authenticated sellers can read their own order financial snapshots
DROP POLICY IF EXISTS "seller_read_own_order_financial_snapshot" ON public.order_financial_snapshot;
CREATE POLICY "seller_read_own_order_financial_snapshot" ON public.order_financial_snapshot
    FOR SELECT TO authenticated
    USING (
        seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid() OR id = auth.uid())
        OR COALESCE(auth.jwt()->>'role', '') = 'super_admin'
    );
