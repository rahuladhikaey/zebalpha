-- ==============================================================================
-- ZEBALPHA ENTERPRISE SETTLEMENT METHODS & ON-DEMAND WITHDRAWAL ENGINE
-- Multi-rail settlement architecture supporting instant verified UPI & Bank Accounts
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. SELLER SETTLEMENT METHODS (Generic multi-rail: UPI / BANK)
CREATE TABLE IF NOT EXISTS public.seller_settlement_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
    method_type VARCHAR(20) NOT NULL CHECK (method_type IN ('UPI', 'BANK')),
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

CREATE INDEX IF NOT EXISTS idx_settlement_methods_seller ON public.seller_settlement_methods(seller_id);
CREATE INDEX IF NOT EXISTS idx_settlement_methods_type ON public.seller_settlement_methods(method_type);
CREATE INDEX IF NOT EXISTS idx_settlement_methods_default ON public.seller_settlement_methods(seller_id, is_default);

-- 2. SELLER PAYOUT REQUESTS (On-demand & Automated Withdrawals)
CREATE TABLE IF NOT EXISTS public.seller_payout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payout_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. SET-XXXXXX or PAY-XXXXXX
    seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
    settlement_method_id UUID REFERENCES public.seller_settlement_methods(id) ON DELETE SET NULL,
    method_type VARCHAR(20) DEFAULT 'UPI' NOT NULL,
    destination_masked VARCHAR(100) NOT NULL,
    beneficiary_name VARCHAR(255),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(10) DEFAULT 'INR' NOT NULL,
    status VARCHAR(50) DEFAULT 'PROCESSING' NOT NULL CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REVERSED')),
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

CREATE INDEX IF NOT EXISTS idx_payout_requests_seller ON public.seller_payout_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON public.seller_payout_requests(status);
CREATE INDEX IF NOT EXISTS idx_payout_requests_date ON public.seller_payout_requests(created_at DESC);

-- 3. SELLER BANK ACCOUNTS SYNC / PRESERVATION
-- Preserve any existing bank accounts into seller_settlement_methods without data loss
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'seller_bank_accounts') THEN
        INSERT INTO public.seller_settlement_methods (
            seller_id,
            method_type,
            destination_raw,
            masked_destination,
            encrypted_destination,
            verified_name,
            provider,
            is_verified,
            is_default,
            status,
            created_at,
            updated_at
        )
        SELECT 
            sba.seller_id,
            'BANK',
            sba.bank_name || ' (' || sba.masked_account_number || ')',
            sba.masked_account_number,
            sba.encrypted_account_number,
            sba.account_holder_name,
            'MANUAL',
            sba.is_verified,
            FALSE,
            sba.status,
            sba.created_at,
            sba.updated_at
        FROM public.seller_bank_accounts sba
        WHERE NOT EXISTS (
            SELECT 1 FROM public.seller_settlement_methods ssm 
            WHERE ssm.seller_id = sba.seller_id AND ssm.method_type = 'BANK'
        );
    END IF;
END $$;

-- 4. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.seller_settlement_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_payout_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sellers view own settlement methods" ON public.seller_settlement_methods;
CREATE POLICY "Sellers view own settlement methods"
ON public.seller_settlement_methods
FOR SELECT
TO authenticated
USING (
    seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

DROP POLICY IF EXISTS "Sellers insert own settlement methods" ON public.seller_settlement_methods;
CREATE POLICY "Sellers insert own settlement methods"
ON public.seller_settlement_methods
FOR INSERT
TO authenticated
WITH CHECK (
    seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Sellers update own settlement methods" ON public.seller_settlement_methods;
CREATE POLICY "Sellers update own settlement methods"
ON public.seller_settlement_methods
FOR UPDATE
TO authenticated
USING (
    seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

DROP POLICY IF EXISTS "Sellers view own payout requests" ON public.seller_payout_requests;
CREATE POLICY "Sellers view own payout requests"
ON public.seller_payout_requests
FOR SELECT
TO authenticated
USING (
    seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

DROP POLICY IF EXISTS "Sellers insert own payout requests" ON public.seller_payout_requests;
CREATE POLICY "Sellers insert own payout requests"
ON public.seller_payout_requests
FOR INSERT
TO authenticated
WITH CHECK (
    seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid())
);
