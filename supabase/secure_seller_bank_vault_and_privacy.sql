-- ==============================================================================
-- ZEBALPHA ENTERPRISE FINANCIAL SECURITY: BANK VAULT & ANTI-FRAUD ENGINE
-- Protects seller banking credentials against data breaches, SQL dumps,
-- unauthorized modifications, and account takeover attacks.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Upgrade seller_bank_accounts table with cryptographic zero-plaintext fields
ALTER TABLE public.seller_bank_accounts 
    ADD COLUMN IF NOT EXISTS encrypted_account_number TEXT,
    ADD COLUMN IF NOT EXISTS account_number_hash VARCHAR(64),
    ADD COLUMN IF NOT EXISTS last_payout_hold_until TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS change_ip_address VARCHAR(100),
    ADD COLUMN IF NOT EXISTS change_user_agent TEXT;

-- Index for blind lookups (HMAC-SHA256 hash without revealing plaintext account number)
CREATE INDEX IF NOT EXISTS idx_seller_bank_hash ON public.seller_bank_accounts(account_number_hash);
CREATE INDEX IF NOT EXISTS idx_seller_bank_hold ON public.seller_bank_accounts(last_payout_hold_until);

-- Scrub legacy plaintext account numbers: replace with masked account number
UPDATE public.seller_bank_accounts
SET account_number = masked_account_number
WHERE account_number IS NOT NULL AND account_number NOT LIKE '%•%';

-- 2. Audit Trail Table: Immutable audit logging for all bank detail modifications
CREATE TABLE IF NOT EXISTS public.seller_bank_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES public.sellers(id) ON DELETE CASCADE,
    actor_id UUID,
    action VARCHAR(50) NOT NULL, -- 'REGISTERED', 'MODIFIED', 'VERIFIED', 'REJECTED'
    masked_account_number VARCHAR(50) NOT NULL,
    ifsc_code VARCHAR(20) NOT NULL,
    bank_name VARCHAR(255),
    account_holder_name VARCHAR(255),
    ip_address VARCHAR(100),
    user_agent TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bank_audit_seller ON public.seller_bank_audit_logs(seller_id);
CREATE INDEX IF NOT EXISTS idx_bank_audit_date ON public.seller_bank_audit_logs(created_at DESC);

-- 3. Row Level Security (RLS) Policies
ALTER TABLE public.seller_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_bank_audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop obsolete or permissive policies if any
DROP POLICY IF EXISTS "Sellers view own bank accounts" ON public.seller_bank_accounts;
DROP POLICY IF EXISTS "Sellers insert own bank account" ON public.seller_bank_accounts;
DROP POLICY IF EXISTS "Sellers update own bank account" ON public.seller_bank_accounts;

-- Bank accounts: Strict seller view policy (Only authenticated owner or system admins)
CREATE POLICY "Sellers view own bank accounts"
ON public.seller_bank_accounts
FOR SELECT
TO authenticated
USING (
    seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Insert policy: Only authenticated seller for their own seller_id
CREATE POLICY "Sellers insert own bank account"
ON public.seller_bank_accounts
FOR INSERT
TO authenticated
WITH CHECK (
    seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid())
);

-- Update policy: Only authenticated seller for their own seller_id or admin
CREATE POLICY "Sellers update own bank account"
ON public.seller_bank_accounts
FOR UPDATE
TO authenticated
USING (
    seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Audit logs: Read-only for sellers, append-only
DROP POLICY IF EXISTS "Sellers view own bank audit logs" ON public.seller_bank_audit_logs;
CREATE POLICY "Sellers view own bank audit logs"
ON public.seller_bank_audit_logs
FOR SELECT
TO authenticated
USING (
    seller_id IN (SELECT id FROM public.sellers WHERE user_id = auth.uid())
    OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
);

-- Prevent unauthorized deletion or modification of audit logs (Immutability guarantee)
REVOKE UPDATE, DELETE ON public.seller_bank_audit_logs FROM authenticated, anon, public;
