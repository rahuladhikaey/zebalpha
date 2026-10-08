-- ==============================================================================
-- ZEBALPHA — FIX SELLER SUPPORT TICKETS TABLE & RLS POLICIES
-- Resolves: "new row violates row-level security policy for table 'seller_support_tickets'"
-- Ensures seamless ticket creation and management across Seller and Super Admin apps.
-- ==============================================================================

-- 1. Create table if not exists with all required columns and constraints
CREATE TABLE IF NOT EXISTS public.seller_support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL,
    subject VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'general' NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'open' NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved', 'closed', 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
    priority VARCHAR(50) DEFAULT 'medium' NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent', 'LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    response TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Ensure response column exists if table was previously created without it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'seller_support_tickets' 
          AND column_name = 'response'
    ) THEN
        ALTER TABLE public.seller_support_tickets ADD COLUMN response TEXT;
    END IF;
END $$;

-- 2. Ensure indexes exist for fast querying
CREATE INDEX IF NOT EXISTS idx_seller_support_tickets_seller ON public.seller_support_tickets(seller_id);
CREATE INDEX IF NOT EXISTS idx_seller_support_tickets_status ON public.seller_support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_seller_support_tickets_created_at ON public.seller_support_tickets(created_at DESC);

-- 3. Enable Row-Level Security
ALTER TABLE public.seller_support_tickets ENABLE ROW LEVEL SECURITY;

-- 4. Clean up any existing policies on seller_support_tickets to avoid collisions
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'seller_support_tickets'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.seller_support_tickets', r.policyname);
    END LOOP;
END $$;

-- 5. Create hardened, resilient RLS policies

-- (A) SELECT Policy for Sellers
-- Sellers can view tickets if seller_id matches their seller record ID, their auth.uid(), or user_id
CREATE POLICY "Sellers view own support tickets"
ON public.seller_support_tickets
FOR SELECT
TO authenticated
USING (
    seller_id::text IN (
        SELECT s.id::text 
        FROM public.sellers s 
        WHERE s.user_id = auth.uid() OR s.id = auth.uid()
    )
    OR seller_id::text = auth.uid()::text
    OR EXISTS (
        SELECT 1 FROM public.admin_users WHERE id = auth.uid()
    )
    OR (SELECT coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role', '') = 'service_role')
);

-- (B) INSERT Policy for Sellers
-- Sellers can create tickets for their seller profile or user ID
CREATE POLICY "Sellers create own support tickets"
ON public.seller_support_tickets
FOR INSERT
TO authenticated
WITH CHECK (
    seller_id::text IN (
        SELECT s.id::text 
        FROM public.sellers s 
        WHERE s.user_id = auth.uid() OR s.id = auth.uid()
    )
    OR seller_id::text = auth.uid()::text
    OR EXISTS (
        SELECT 1 FROM public.admin_users WHERE id = auth.uid()
    )
    OR (SELECT coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role', '') = 'service_role')
);

-- (C) UPDATE Policy for Sellers
-- Sellers can update their own tickets (e.g., re-opening or adding info)
CREATE POLICY "Sellers update own support tickets"
ON public.seller_support_tickets
FOR UPDATE
TO authenticated
USING (
    seller_id::text IN (
        SELECT s.id::text 
        FROM public.sellers s 
        WHERE s.user_id = auth.uid() OR s.id = auth.uid()
    )
    OR seller_id::text = auth.uid()::text
    OR EXISTS (
        SELECT 1 FROM public.admin_users WHERE id = auth.uid()
    )
)
WITH CHECK (
    seller_id::text IN (
        SELECT s.id::text 
        FROM public.sellers s 
        WHERE s.user_id = auth.uid() OR s.id = auth.uid()
    )
    OR seller_id::text = auth.uid()::text
    OR EXISTS (
        SELECT 1 FROM public.admin_users WHERE id = auth.uid()
    )
);

-- (D) Super Admin Full Access Policy
CREATE POLICY "Admins full manage support tickets"
ON public.seller_support_tickets
FOR ALL
TO authenticated
USING (
    EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid())
    OR (SELECT coalesce(current_setting('request.jwt.claims', true)::jsonb->>'role', '') = 'service_role')
    OR (SELECT coalesce(current_setting('request.jwt.claims', true)::jsonb->'user_metadata'->>'role', '') = 'admin')
    OR (SELECT coalesce(current_setting('request.jwt.claims', true)::jsonb->'user_metadata'->>'role', '') = 'super_admin')
);

-- (E) Grant database role permissions
GRANT ALL ON public.seller_support_tickets TO postgres;
GRANT ALL ON public.seller_support_tickets TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.seller_support_tickets TO authenticated;
GRANT SELECT ON public.seller_support_tickets TO anon;

-- Ensure sellers table user_id is populated from id if user_id is null
UPDATE public.sellers 
SET user_id = id 
WHERE user_id IS NULL;
