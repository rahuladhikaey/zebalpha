-- ====================================================================
-- MIGRATION: Merchant Settings, FSSAI Verification & Security RLS
-- Date: 2026-07-25
-- ====================================================================

-- 1. ADD / UPDATE COLUMNS IN SELLERS TABLE
ALTER TABLE public.sellers 
    ADD COLUMN IF NOT EXISTS business_category VARCHAR(100) DEFAULT 'Grocery',
    ADD COLUMN IF NOT EXISTS phonepay_number VARCHAR(50),
    ADD COLUMN IF NOT EXISTS business_logo_url TEXT,
    ADD COLUMN IF NOT EXISTS profile_photo_url TEXT,
    ADD COLUMN IF NOT EXISTS business_description TEXT,
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE NOT NULL,
    ADD COLUMN IF NOT EXISTS fssai_license_number VARCHAR(14),
    ADD COLUMN IF NOT EXISTS fssai_certificate_url TEXT,
    ADD COLUMN IF NOT EXISTS fssai_status VARCHAR(50) DEFAULT 'Not Submitted' NOT NULL,
    ADD COLUMN IF NOT EXISTS fssai_expiry_date DATE,
    ADD COLUMN IF NOT EXISTS fssai_rejection_reason TEXT,
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS verified_by UUID,
    ADD COLUMN IF NOT EXISTS settings_completion_pct INT DEFAULT 0 NOT NULL;

-- 2. CREATE MERCHANT VERIFICATION LOGS TABLE (AUDIT TRAIL)
CREATE TABLE IF NOT EXISTS public.merchant_verification_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    performed_by UUID,
    performer_role VARCHAR(50) DEFAULT 'admin' NOT NULL,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for log lookups
CREATE INDEX IF NOT EXISTS idx_merchant_logs_seller_id ON public.merchant_verification_logs(seller_id);

-- ====================================================================
-- 3. ROW LEVEL SECURITY (RLS) & ACCESS CONTROL POLICIES
-- ====================================================================

-- Enable RLS
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.merchant_verification_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing overlapping policies if any
DROP POLICY IF EXISTS "Sellers view own profile" ON public.sellers;
DROP POLICY IF EXISTS "Sellers update own profile" ON public.sellers;
DROP POLICY IF EXISTS "Public view approved sellers" ON public.sellers;
DROP POLICY IF EXISTS "Admins manage all sellers" ON public.sellers;
DROP POLICY IF EXISTS "Service role manage sellers" ON public.sellers;

DROP POLICY IF EXISTS "Sellers view own verification logs" ON public.merchant_verification_logs;
DROP POLICY IF EXISTS "Sellers insert verification logs" ON public.merchant_verification_logs;
DROP POLICY IF EXISTS "Admins manage verification logs" ON public.merchant_verification_logs;
DROP POLICY IF EXISTS "Service role manage verification logs" ON public.merchant_verification_logs;

-- SELLERS TABLE POLICIES --
-- 1. Seller can view their own profile
CREATE POLICY "Sellers view own profile" ON public.sellers
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- 2. Seller can update their own merchant settings
CREATE POLICY "Sellers update own profile" ON public.sellers
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 3. Public can view basic approved seller profiles
CREATE POLICY "Public view approved sellers" ON public.sellers
    FOR SELECT TO public
    USING (status = 'approved' OR account_status = 'Active');

-- 4. Admins / Service role full access
CREATE POLICY "Service role manage sellers" ON public.sellers
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- MERCHANT VERIFICATION LOGS POLICIES --
-- 1. Seller can view audit history for their own store
CREATE POLICY "Sellers view own verification logs" ON public.merchant_verification_logs
    FOR SELECT TO authenticated
    USING (
        seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid())
    );

-- 2. Seller can insert audit log records for actions performed on their store
CREATE POLICY "Sellers insert verification logs" ON public.merchant_verification_logs
    FOR INSERT TO authenticated
    WITH CHECK (
        seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid())
    );

-- 3. Service role / Admin full control over logs
CREATE POLICY "Service role manage verification logs" ON public.merchant_verification_logs
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- GRANT PERMISSIONS
GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;
GRANT ALL ON public.sellers TO authenticated, service_role;
GRANT SELECT ON public.sellers TO anon;
GRANT ALL ON public.merchant_verification_logs TO authenticated, service_role;
