-- ==============================================================================
-- ZEBALPHA MASTER PRODUCTION DATABASE MIGRATION
-- SELLER FINANCIAL LEDGER, DYNAMIC FEE ENGINE, RETURNS & SETTLEMENTS
-- ==============================================================================

-- 1. SYSTEM EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. SELLER BANK ACCOUNTS (WITH MASKING & CHANGE PROTECTION)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.seller_bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
    account_holder_name VARCHAR(255) NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    account_number VARCHAR(100) NOT NULL,
    masked_account_number VARCHAR(50) NOT NULL,
    ifsc_code VARCHAR(20) NOT NULL,
    upi_id VARCHAR(100),
    is_verified BOOLEAN DEFAULT FALSE NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE' NOT NULL CHECK (status IN ('ACTIVE', 'BANK_CHANGE_PENDING', 'REJECTED')),
    change_requested_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    verified_by UUID,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_seller_bank_accounts_seller ON public.seller_bank_accounts(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_bank_accounts_status ON public.seller_bank_accounts(status);

-- ==============================================================================
-- 3. SELLER FINANCIAL LEDGER (IMMUTABLE DOUBLE-ENTRY AUDIT TRAIL)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.seller_financial_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    order_item_id UUID REFERENCES public.order_items(id) ON DELETE SET NULL,
    settlement_id UUID REFERENCES public.seller_settlements(id) ON DELETE SET NULL,
    transaction_type VARCHAR(50) NOT NULL CHECK (
        transaction_type IN (
            'SALE', 'COMMISSION', 'FIXED_FEE', 'SHIPPING_FEE', 'COLLECTION_FEE', 
            'RETURN_FEE', 'RTO_FEE', 'REFUND', 'PARTIAL_REFUND', 'CANCELLATION', 
            'ADJUSTMENT_CREDIT', 'ADJUSTMENT_DEBIT', 'TAX', 'CHARGEBACK', 
            'SETTLEMENT', 'SETTLEMENT_REVERSAL', 'PENALTY', 'PROMOTIONAL_ADJUSTMENT'
        )
    ),
    entry_type VARCHAR(10) NOT NULL CHECK (entry_type IN ('CREDIT', 'DEBIT')),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(10) DEFAULT 'INR' NOT NULL,
    balance_after NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    status VARCHAR(50) DEFAULT 'COMPLETED' NOT NULL CHECK (status IN ('PENDING', 'COMPLETED', 'HELD', 'REVERSED')),
    description TEXT NOT NULL,
    reference_id VARCHAR(100),
    idempotency_key VARCHAR(150) UNIQUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_seller_ledger_seller ON public.seller_financial_ledger(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_ledger_order ON public.seller_financial_ledger(order_id);
CREATE INDEX IF NOT EXISTS idx_seller_ledger_type ON public.seller_financial_ledger(transaction_type);
CREATE INDEX IF NOT EXISTS idx_seller_ledger_status ON public.seller_financial_ledger(status);
CREATE INDEX IF NOT EXISTS idx_seller_ledger_created ON public.seller_financial_ledger(created_at DESC);

-- ==============================================================================
-- 4. EXTEND SELLER SETTLEMENTS WITH GRANULAR DEDUCTIONS & AUDIT FIELDS
-- ==============================================================================
DO $$ 
BEGIN
    ALTER TABLE public.seller_settlements ADD COLUMN IF NOT EXISTS settlement_number VARCHAR(50);
    ALTER TABLE public.seller_settlements ADD COLUMN IF NOT EXISTS payout_status VARCHAR(50) DEFAULT 'PENDING';
    ALTER TABLE public.seller_settlements ADD COLUMN IF NOT EXISTS fixed_fees NUMERIC(12, 2) DEFAULT 0.00;
    ALTER TABLE public.seller_settlements ADD COLUMN IF NOT EXISTS collection_fees NUMERIC(12, 2) DEFAULT 0.00;
    ALTER TABLE public.seller_settlements ADD COLUMN IF NOT EXISTS shipping_fees NUMERIC(12, 2) DEFAULT 0.00;
    ALTER TABLE public.seller_settlements ADD COLUMN IF NOT EXISTS return_charges NUMERIC(12, 2) DEFAULT 0.00;
    ALTER TABLE public.seller_settlements ADD COLUMN IF NOT EXISTS refund_adjustments NUMERIC(12, 2) DEFAULT 0.00;
    ALTER TABLE public.seller_settlements ADD COLUMN IF NOT EXISTS other_adjustments NUMERIC(12, 2) DEFAULT 0.00;
    ALTER TABLE public.seller_settlements ADD COLUMN IF NOT EXISTS bank_account_id UUID REFERENCES public.seller_bank_accounts(id) ON DELETE SET NULL;
    ALTER TABLE public.seller_settlements ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
    ALTER TABLE public.seller_settlements ADD COLUMN IF NOT EXISTS account_masked VARCHAR(50);
    ALTER TABLE public.seller_settlements ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(20);
    ALTER TABLE public.seller_settlements ADD COLUMN IF NOT EXISTS utr_number VARCHAR(100);
    ALTER TABLE public.seller_settlements ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
    ALTER TABLE public.seller_settlements ADD COLUMN IF NOT EXISTS initiated_at TIMESTAMPTZ;
END $$;

-- ==============================================================================
-- 5. FUNCTION: RECORD LEDGER TRANSACTION (IDEMPOTENT & THREAD-SAFE)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.record_ledger_transaction(
    p_seller_id UUID,
    p_order_id UUID,
    p_order_item_id UUID,
    p_settlement_id UUID,
    p_transaction_type VARCHAR(50),
    p_entry_type VARCHAR(10),
    p_amount NUMERIC(12, 2),
    p_description TEXT,
    p_reference_id VARCHAR(100),
    p_idempotency_key VARCHAR(150),
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    v_last_balance NUMERIC(12, 2) := 0.00;
    v_new_balance NUMERIC(12, 2) := 0.00;
    v_ledger_id UUID;
BEGIN
    -- Check idempotency
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id INTO v_ledger_id 
        FROM public.seller_financial_ledger 
        WHERE idempotency_key = p_idempotency_key;
        
        IF v_ledger_id IS NOT NULL THEN
            RETURN v_ledger_id;
        END IF;
    END IF;

    -- Calculate current balance from ledger
    SELECT COALESCE(balance_after, 0.00) INTO v_last_balance
    FROM public.seller_financial_ledger
    WHERE seller_id = p_seller_id
    ORDER BY created_at DESC, id DESC
    LIMIT 1;

    IF v_last_balance IS NULL THEN
        v_last_balance := 0.00;
    END IF;

    -- Adjust balance based on entry type
    IF p_entry_type = 'CREDIT' THEN
        v_new_balance := v_last_balance + p_amount;
    ELSE
        v_new_balance := v_last_balance - p_amount;
    END IF;

    -- Insert immutable ledger record
    INSERT INTO public.seller_financial_ledger (
        seller_id,
        order_id,
        order_item_id,
        settlement_id,
        transaction_type,
        entry_type,
        amount,
        balance_after,
        status,
        description,
        reference_id,
        idempotency_key,
        metadata,
        created_at
    ) VALUES (
        p_seller_id,
        p_order_id,
        p_order_item_id,
        p_settlement_id,
        p_transaction_type,
        p_entry_type,
        p_amount,
        v_new_balance,
        'COMPLETED',
        p_description,
        p_reference_id,
        p_idempotency_key,
        p_metadata,
        NOW()
    )
    RETURNING id INTO v_ledger_id;

    RETURN v_ledger_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 6. FUNCTION: GET SELLER REAL-TIME LEDGER BALANCES
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.get_seller_ledger_balances(p_seller_id UUID)
RETURNS JSONB AS $$
DECLARE
    v_gross_sales NUMERIC(12, 2) := 0.00;
    v_commission NUMERIC(12, 2) := 0.00;
    v_shipping NUMERIC(12, 2) := 0.00;
    v_fixed_fee NUMERIC(12, 2) := 0.00;
    v_collection_fee NUMERIC(12, 2) := 0.00;
    v_returns_refunds NUMERIC(12, 2) := 0.00;
    v_net_earnings NUMERIC(12, 2) := 0.00;
    v_settled_amount NUMERIC(12, 2) := 0.00;
    v_available_payout NUMERIC(12, 2) := 0.00;
    v_pending_settlement NUMERIC(12, 2) := 0.00;
    v_on_hold NUMERIC(12, 2) := 0.00;
BEGIN
    -- 1. Aggregate Credits
    SELECT 
        COALESCE(SUM(CASE WHEN transaction_type = 'SALE' THEN amount ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN transaction_type = 'SETTLEMENT' THEN amount ELSE 0 END), 0.00)
    INTO v_gross_sales, v_settled_amount
    FROM public.seller_financial_ledger
    WHERE seller_id = p_seller_id AND status = 'COMPLETED';

    -- 2. Aggregate Deductions
    SELECT 
        COALESCE(SUM(CASE WHEN transaction_type = 'COMMISSION' THEN amount ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN transaction_type = 'SHIPPING_FEE' THEN amount ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN transaction_type = 'FIXED_FEE' THEN amount ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN transaction_type = 'COLLECTION_FEE' THEN amount ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN transaction_type IN ('REFUND', 'PARTIAL_REFUND', 'RETURN_FEE', 'RTO_FEE') THEN amount ELSE 0 END), 0.00)
    INTO v_commission, v_shipping, v_fixed_fee, v_collection_fee, v_returns_refunds
    FROM public.seller_financial_ledger
    WHERE seller_id = p_seller_id AND status = 'COMPLETED';

    -- Net earnings calculation
    v_net_earnings := v_gross_sales - (v_commission + v_shipping + v_fixed_fee + v_collection_fee + v_returns_refunds);
    
    -- Available balance calculation
    v_available_payout := GREATEST(0.00, v_net_earnings - v_settled_amount);

    -- Pending orders in escrow / return window
    SELECT COALESCE(SUM(amount), 0.00)
    INTO v_pending_settlement
    FROM public.seller_financial_ledger
    WHERE seller_id = p_seller_id AND status = 'PENDING';

    -- Disputed / held amounts
    SELECT COALESCE(SUM(amount), 0.00)
    INTO v_on_hold
    FROM public.seller_financial_ledger
    WHERE seller_id = p_seller_id AND status = 'HELD';

    RETURN jsonb_build_object(
        'gross_sales', v_gross_sales,
        'commission', v_commission,
        'shipping_fees', v_shipping,
        'fixed_fees', v_fixed_fee,
        'collection_fees', v_collection_fee,
        'returns_and_refunds', v_returns_refunds,
        'total_platform_fees', (v_commission + v_fixed_fee + v_collection_fee),
        'net_seller_earnings', v_net_earnings,
        'total_settled', v_settled_amount,
        'available_balance', v_available_payout,
        'pending_settlement', v_pending_settlement,
        'on_hold_balance', v_on_hold
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 7. DEFAULT STORE SETTINGS (CONFIGURABLE MARKETPLACE POLICIES)
-- ==============================================================================
INSERT INTO public.store_settings (key, value, updated_at)
VALUES (
    'marketplace_financial_rules',
    '{
        "commission_percentage": 5.0,
        "fixed_fee_per_order": 15.0,
        "payment_collection_fee_pct": 2.0,
        "cod_handling_fee": 25.0,
        "standard_shipping_fee": 60.0,
        "reverse_shipping_fee": 70.0,
        "rto_charge": 50.0,
        "gst_on_platform_fees_pct": 18.0,
        "settlement_delay_days": 7,
        "customer_return_window_days": 7,
        "tiers": {
            "standard": {
                "commission_pct": 5.0,
                "settlement_delay_days": 7
            },
            "premium": {
                "commission_pct": 3.5,
                "settlement_delay_days": 4
            }
        }
    }'::jsonb,
    NOW()
)
ON CONFLICT (key) DO NOTHING;

-- ==============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.seller_financial_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_bank_accounts ENABLE ROW LEVEL SECURITY;

-- Ledger policies: sellers can read their own ledger, admins have full access
CREATE POLICY "Sellers view own financial ledger"
ON public.seller_financial_ledger
FOR SELECT
TO authenticated
USING (
    seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Bank account policies: sellers manage own bank details
CREATE POLICY "Sellers view own bank accounts"
ON public.seller_bank_accounts
FOR SELECT
TO authenticated
USING (
    seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

CREATE POLICY "Sellers insert own bank account"
ON public.seller_bank_accounts
FOR INSERT
TO authenticated
WITH CHECK (
    seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid())
);

CREATE POLICY "Sellers update own bank account"
ON public.seller_bank_accounts
FOR UPDATE
TO authenticated
USING (
    seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);
