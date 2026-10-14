-- ==============================================================================
-- ZEBALPHA — RAZORPAYX SELLER UPI VERIFICATION & AUTOMATED PAYOUT ENGINE
-- Migration Date: 2026-10-14
-- Scope: Seller Payout Accounts, Verifications, Earnings, Payouts, Webhook Events, Audit Logs & RLS
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. SELLER PAYOUT ACCOUNTS (Strict UPI Storage & Verification Status)
CREATE TABLE IF NOT EXISTS public.seller_payout_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
    account_type VARCHAR(20) DEFAULT 'upi' NOT NULL CHECK (account_type = 'upi'),
    upi_id_encrypted TEXT NOT NULL,
    upi_id_fingerprint VARCHAR(64) NOT NULL,
    masked_upi_id VARCHAR(100) NOT NULL,
    provider VARCHAR(50) DEFAULT 'razorpayx' NOT NULL,
    razorpay_contact_id VARCHAR(100),
    razorpay_fund_account_id VARCHAR(100),
    beneficiary_name VARCHAR(255),
    verification_status VARCHAR(50) DEFAULT 'not_added' NOT NULL 
        CHECK (verification_status IN ('not_added', 'pending', 'verified', 'name_mismatch', 'inactive', 'failed', 'manual_review')),
    verification_reason TEXT,
    verified_at TIMESTAMPTZ,
    last_validation_id VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_seller_active_payout_account UNIQUE (seller_id, is_active)
);

CREATE INDEX IF NOT EXISTS idx_seller_payout_accounts_seller ON public.seller_payout_accounts(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_payout_accounts_status ON public.seller_payout_accounts(verification_status);
CREATE INDEX IF NOT EXISTS idx_seller_payout_accounts_fingerprint ON public.seller_payout_accounts(upi_id_fingerprint);


-- 2. SELLER PAYOUT VERIFICATIONS (Audit History of all Verification Attempts)
CREATE TABLE IF NOT EXISTS public.seller_payout_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
    payout_account_id UUID NOT NULL REFERENCES public.seller_payout_accounts(id) ON DELETE CASCADE,
    provider_validation_id VARCHAR(100),
    status VARCHAR(50) NOT NULL,
    provider_account_status VARCHAR(50),
    beneficiary_match_result VARCHAR(50),
    failure_code VARCHAR(100),
    attempt_count INT DEFAULT 1 NOT NULL,
    requested_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    completed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payout_verifications_seller ON public.seller_payout_verifications(seller_id);
CREATE INDEX IF NOT EXISTS idx_payout_verifications_account ON public.seller_payout_verifications(payout_account_id);
CREATE INDEX IF NOT EXISTS idx_payout_verifications_val_id ON public.seller_payout_verifications(provider_validation_id);


-- 3. SELLER EARNINGS (Authoritative Item-Level & Order-Level Financial Eligibility in Paise)
CREATE TABLE IF NOT EXISTS public.seller_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    order_item_id UUID REFERENCES public.order_items(id) ON DELETE SET NULL,
    gross_amount_paise BIGINT NOT NULL CHECK (gross_amount_paise >= 0),
    commission_amount_paise BIGINT NOT NULL DEFAULT 0 CHECK (commission_amount_paise >= 0),
    refund_amount_paise BIGINT NOT NULL DEFAULT 0 CHECK (refund_amount_paise >= 0),
    adjustment_amount_paise BIGINT NOT NULL DEFAULT 0,
    net_eligible_amount_paise BIGINT NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR' NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' NOT NULL 
        CHECK (status IN ('pending', 'eligible', 'reserved', 'paid', 'cancelled')),
    eligible_at TIMESTAMPTZ,
    payout_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_seller_earnings_seller ON public.seller_earnings(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_earnings_status ON public.seller_earnings(status);
CREATE INDEX IF NOT EXISTS idx_seller_earnings_order ON public.seller_earnings(order_id);


-- 4. SELLER PAYOUTS (Controlled State Machine & Payout Transactions in Paise)
CREATE TABLE IF NOT EXISTS public.seller_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
    payout_account_id UUID REFERENCES public.seller_payout_accounts(id) ON DELETE SET NULL,
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    currency VARCHAR(10) DEFAULT 'INR' NOT NULL,
    status VARCHAR(50) DEFAULT 'queued' NOT NULL 
        CHECK (status IN ('pending_review', 'queued', 'initiated', 'processed', 'failed', 'reversed', 'cancelled')),
    razorpay_payout_id VARCHAR(100),
    reference_id VARCHAR(100) UNIQUE NOT NULL,
    idempotency_key VARCHAR(64) UNIQUE NOT NULL,
    utr VARCHAR(100),
    failure_reason TEXT,
    initiated_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    reversed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_seller_payouts_seller ON public.seller_payouts(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_payouts_status ON public.seller_payouts(status);
CREATE INDEX IF NOT EXISTS idx_seller_payouts_ref ON public.seller_payouts(reference_id);
CREATE INDEX IF NOT EXISTS idx_seller_payouts_rzp_id ON public.seller_payouts(razorpay_payout_id);


-- 5. RAZORPAYX WEBHOOK EVENTS (Strict Deduplication & Payload Store)
CREATE TABLE IF NOT EXISTS public.razorpayx_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_event_id VARCHAR(100) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    provider_entity_id VARCHAR(100),
    payload_hash VARCHAR(64) NOT NULL,
    processing_status VARCHAR(50) DEFAULT 'pending' NOT NULL 
        CHECK (processing_status IN ('pending', 'processed', 'failed', 'ignored')),
    failure_reason TEXT,
    received_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_rzpx_events_type ON public.razorpayx_webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_rzpx_events_status ON public.razorpayx_webhook_events(processing_status);


-- 6. SELLER PAYOUT AUDIT LOGS (Immutable Financial Security Ledger)
CREATE TABLE IF NOT EXISTS public.seller_payout_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
    actor_type VARCHAR(50) NOT NULL CHECK (actor_type IN ('SELLER', 'ADMIN', 'SYSTEM', 'WEBHOOK')),
    actor_id UUID,
    action VARCHAR(100) NOT NULL,
    reason_code VARCHAR(100),
    related_account_id UUID,
    related_payout_id UUID,
    metadata_redacted JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payout_audit_seller ON public.seller_payout_audit_logs(seller_id);
CREATE INDEX IF NOT EXISTS idx_payout_audit_action ON public.seller_payout_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_payout_audit_date ON public.seller_payout_audit_logs(created_at DESC);


-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- 1. seller_payout_accounts
ALTER TABLE public.seller_payout_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Sellers read own payout account" ON public.seller_payout_accounts;
CREATE POLICY "Sellers read own payout account" ON public.seller_payout_accounts
    FOR SELECT TO authenticated
    USING (
        seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

DROP POLICY IF EXISTS "Service role manages seller_payout_accounts" ON public.seller_payout_accounts;
CREATE POLICY "Service role manages seller_payout_accounts" ON public.seller_payout_accounts
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- 2. seller_payout_verifications
ALTER TABLE public.seller_payout_verifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Sellers read own payout verifications" ON public.seller_payout_verifications;
CREATE POLICY "Sellers read own payout verifications" ON public.seller_payout_verifications
    FOR SELECT TO authenticated
    USING (
        seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

DROP POLICY IF EXISTS "Service role manages seller_payout_verifications" ON public.seller_payout_verifications;
CREATE POLICY "Service role manages seller_payout_verifications" ON public.seller_payout_verifications
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- 3. seller_earnings
ALTER TABLE public.seller_earnings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Sellers read own earnings" ON public.seller_earnings;
CREATE POLICY "Sellers read own earnings" ON public.seller_earnings
    FOR SELECT TO authenticated
    USING (
        seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

DROP POLICY IF EXISTS "Service role manages seller_earnings" ON public.seller_earnings;
CREATE POLICY "Service role manages seller_earnings" ON public.seller_earnings
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- 4. seller_payouts
ALTER TABLE public.seller_payouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Sellers read own payouts" ON public.seller_payouts;
CREATE POLICY "Sellers read own payouts" ON public.seller_payouts
    FOR SELECT TO authenticated
    USING (
        seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

DROP POLICY IF EXISTS "Service role manages seller_payouts" ON public.seller_payouts;
CREATE POLICY "Service role manages seller_payouts" ON public.seller_payouts
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- 5. razorpayx_webhook_events (Service role only)
ALTER TABLE public.razorpayx_webhook_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Deny public access on razorpayx_webhook_events" ON public.razorpayx_webhook_events;
CREATE POLICY "Deny public access on razorpayx_webhook_events" ON public.razorpayx_webhook_events
    FOR ALL TO public USING (false);

DROP POLICY IF EXISTS "Service role manages razorpayx_webhook_events" ON public.razorpayx_webhook_events;
CREATE POLICY "Service role manages razorpayx_webhook_events" ON public.razorpayx_webhook_events
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 6. seller_payout_audit_logs (Admins and service role only)
ALTER TABLE public.seller_payout_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read seller_payout_audit_logs" ON public.seller_payout_audit_logs;
CREATE POLICY "Admins read seller_payout_audit_logs" ON public.seller_payout_audit_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

DROP POLICY IF EXISTS "Service role manages seller_payout_audit_logs" ON public.seller_payout_audit_logs;
CREATE POLICY "Service role manages seller_payout_audit_logs" ON public.seller_payout_audit_logs
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
