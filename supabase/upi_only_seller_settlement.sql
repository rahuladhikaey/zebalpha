-- ==============================================================================
-- ZEBALPHA — UPI-ONLY SELLER SETTLEMENT ENGINE
-- ZebAlpha does NOT collect or store seller bank account details.
-- The ONLY settlement method is verified UPI ID via Razorpay banking rails.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. SELLER TABLE UPI SYNC
ALTER TABLE public.sellers 
    ADD COLUMN IF NOT EXISTS upi_id VARCHAR(255);

-- 2. SELLER SETTLEMENT METHODS (UPI ONLY)
CREATE TABLE IF NOT EXISTS public.seller_settlement_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
    method_type VARCHAR(20) DEFAULT 'UPI' NOT NULL,
    upi_id VARCHAR(255),
    destination_raw VARCHAR(255),
    masked_destination VARCHAR(100) NOT NULL,
    encrypted_destination TEXT,
    destination_hash VARCHAR(64),
    verified_name VARCHAR(255),
    provider VARCHAR(50) DEFAULT 'RAZORPAY',
    provider_reference VARCHAR(100),
    is_verified BOOLEAN DEFAULT FALSE NOT NULL,
    is_default BOOLEAN DEFAULT TRUE NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING' NOT NULL CHECK (status IN ('PENDING', 'VERIFIED', 'FAILED', 'REJECTED')),
    failure_reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Ensure upi_id column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'seller_settlement_methods' 
        AND column_name = 'upi_id'
    ) THEN
        ALTER TABLE public.seller_settlement_methods ADD COLUMN upi_id VARCHAR(255);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_settlement_methods_seller ON public.seller_settlement_methods(seller_id);
CREATE INDEX IF NOT EXISTS idx_settlement_methods_upi ON public.seller_settlement_methods(seller_id, is_default, is_verified);

-- 3. SELLER PAYOUT REQUESTS (UPI WITHDRAWALS)
CREATE TABLE IF NOT EXISTS public.seller_payout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. WTH-XXXXXXXX
    seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
    settlement_method_id UUID REFERENCES public.seller_settlement_methods(id) ON DELETE SET NULL,
    method_type VARCHAR(20) DEFAULT 'UPI' NOT NULL,
    destination_masked VARCHAR(100) NOT NULL,
    destination_upi VARCHAR(255),
    beneficiary_name VARCHAR(255),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) DEFAULT 'INR' NOT NULL,
    status VARCHAR(50) DEFAULT 'PROCESSING' NOT NULL CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'SUCCESS', 'FAILED', 'CANCELLED', 'REVERSED')),
    provider VARCHAR(50) DEFAULT 'RAZORPAY',
    provider_payout_id VARCHAR(100),
    provider_status VARCHAR(50),
    utr_number VARCHAR(100),
    failure_reason TEXT,
    idempotency_key VARCHAR(100) UNIQUE,
    notes TEXT,
    initiated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Ensure destination_upi column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'seller_payout_requests' 
        AND column_name = 'destination_upi'
    ) THEN
        ALTER TABLE public.seller_payout_requests ADD COLUMN destination_upi VARCHAR(255);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payout_requests_seller ON public.seller_payout_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON public.seller_payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_payout_requests_date ON public.seller_payout_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payout_requests_idempotency ON public.seller_payout_requests(idempotency_key);

-- 4. UPDATE LEDGER TABLE TO SUPPORT UPI WITHDRAWAL TRANSACTIONS
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'seller_financial_ledger') THEN
        -- Drop restrictive CHECK constraint if present so new transaction types are supported
        ALTER TABLE public.seller_financial_ledger 
            DROP CONSTRAINT IF EXISTS seller_financial_ledger_transaction_type_check;
            
        -- Add reference_type column if not present
        ALTER TABLE public.seller_financial_ledger 
            ADD COLUMN IF NOT EXISTS reference_type VARCHAR(50);
    END IF;
END $$;

-- 5. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.seller_settlement_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_payout_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sellers view own settlement methods" ON public.seller_settlement_methods;
CREATE POLICY "Sellers view own settlement methods"
    ON public.seller_settlement_methods FOR SELECT
    TO authenticated
    USING (seller_id = auth.uid());

DROP POLICY IF EXISTS "Sellers manage own settlement methods" ON public.seller_settlement_methods;
CREATE POLICY "Sellers manage own settlement methods"
    ON public.seller_settlement_methods FOR ALL
    TO authenticated
    USING (seller_id = auth.uid());

DROP POLICY IF EXISTS "Sellers view own payout requests" ON public.seller_payout_requests;
CREATE POLICY "Sellers view own payout requests"
    ON public.seller_payout_requests FOR SELECT
    TO authenticated
    USING (seller_id = auth.uid());

DROP POLICY IF EXISTS "Sellers create own payout requests" ON public.seller_payout_requests;
CREATE POLICY "Sellers create own payout requests"
    ON public.seller_payout_requests FOR INSERT
    TO authenticated
    WITH CHECK (seller_id = auth.uid());

-- Service role bypass policies for server-side API execution
DROP POLICY IF EXISTS "Service role manages settlement methods" ON public.seller_settlement_methods;
CREATE POLICY "Service role manages settlement methods"
    ON public.seller_settlement_methods FOR ALL
    TO service_role
    USING (true);

DROP POLICY IF EXISTS "Service role manages payout requests" ON public.seller_payout_requests;
CREATE POLICY "Service role manages payout requests"
    ON public.seller_payout_requests FOR ALL
    TO service_role
    USING (true);
