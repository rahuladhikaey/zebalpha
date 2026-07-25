-- ====================================================================
-- MIGRATION: Merchant Settings & FSSAI License Verification System
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
