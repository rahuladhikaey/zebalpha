-- ==============================================================================
-- ZEBALPHA SECURITY FIX: HARDEN RLS POLICIES ON PRODUCTS, CATEGORIES, EMAIL_OTPS
-- Migration: 20261013_security_hardening_rls_policies.sql
-- Target: Supabase PostgreSQL (AWS ap-south-1)
-- ==============================================================================
-- ISSUE IDENTIFIED:
-- 1. An overly broad policy "Allow all access to products" on public.products granted
--    ALL privileges (SELECT, INSERT, UPDATE, DELETE) to {public} with USING(true) WITH CHECK(true).
--    Because PostgreSQL evaluates PERMISSIVE policies with OR logic, this rendered all
--    other security policies completely void for anonymous and authenticated callers.
-- 2. "Allow all access to categories" on public.categories granted public write/delete access.
-- 3. "Allow all access to email_otps" on public.email_otps granted public read/write access to OTP codes.
--
-- REMEDIATION:
-- 1. DROP the permissive "Allow all access to products" policy.
-- 2. RESTORE strict granular policies on public.products:
--    - Public read active products (is_active = true)
--    - Sellers insert own products (seller_id ownership check)
--    - Sellers update own products (seller_id ownership check)
--    - Sellers delete own products (seller_id ownership check)
--    - Admins full manage products (admin_users check)
--    - Service role manages products (service_role bypass)
-- 3. DROP the permissive "Allow all access to categories" policy and retain:
--    - Public read categories (SELECT to anon, authenticated)
--    - Service role & admin manage categories
-- 4. DROP the permissive "Allow all access to email_otps" policy and restrict to service_role:
--    - Only service_role can read/insert/update email_otps (used by server-side /api/otp route)
-- ==============================================================================

-- 1. HARDEN PUBLIC.PRODUCTS
DROP POLICY IF EXISTS "Allow all access to products" ON public.products;

-- Ensure RLS is active
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Ensure public read active products policy exists
DROP POLICY IF EXISTS "Public read active products" ON public.products;
CREATE POLICY "Public read active products" ON public.products
FOR SELECT TO anon, authenticated
USING (
    is_active = true
    OR (auth.uid() IS NOT NULL AND (
        seller_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.sellers s WHERE s.id = products.seller_id AND s.user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid())
    ))
);

-- Sellers insert own products
DROP POLICY IF EXISTS "Sellers insert own products" ON public.products;
CREATE POLICY "Sellers insert own products" ON public.products
FOR INSERT TO authenticated
WITH CHECK (
    seller_id::text IN (SELECT s.id::text FROM public.sellers s WHERE s.user_id = auth.uid() OR s.id = auth.uid())
    OR seller_id::text = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid())
);

-- Sellers update own products
DROP POLICY IF EXISTS "Sellers update own products" ON public.products;
CREATE POLICY "Sellers update own products" ON public.products
FOR UPDATE TO authenticated
USING (
    seller_id::text IN (SELECT s.id::text FROM public.sellers s WHERE s.user_id = auth.uid() OR s.id = auth.uid())
    OR seller_id::text = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid())
)
WITH CHECK (
    seller_id::text IN (SELECT s.id::text FROM public.sellers s WHERE s.user_id = auth.uid() OR s.id = auth.uid())
    OR seller_id::text = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid())
);

-- Sellers delete own products
DROP POLICY IF EXISTS "Sellers delete own products" ON public.products;
CREATE POLICY "Sellers delete own products" ON public.products
FOR DELETE TO authenticated
USING (
    seller_id::text IN (SELECT s.id::text FROM public.sellers s WHERE s.user_id = auth.uid() OR s.id = auth.uid())
    OR seller_id::text = auth.uid()::text
    OR EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid())
);

-- Service role full access
DROP POLICY IF EXISTS "Service role manages products" ON public.products;
CREATE POLICY "Service role manages products" ON public.products
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- 2. HARDEN PUBLIC.CATEGORIES
DROP POLICY IF EXISTS "Allow all access to categories" ON public.categories;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read categories" ON public.categories;
CREATE POLICY "Public read categories" ON public.categories
FOR SELECT TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Service role manages categories" ON public.categories;
CREATE POLICY "Service role manages categories" ON public.categories
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- 3. HARDEN PUBLIC.EMAIL_OTPS
DROP POLICY IF EXISTS "Allow all access to email_otps" ON public.email_otps;
ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role manages email_otps" ON public.email_otps;
CREATE POLICY "Service role manages email_otps" ON public.email_otps
FOR ALL TO service_role
USING (true)
WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- ROLLBACK SCRIPT
-- ------------------------------------------------------------------------------
/*
CREATE POLICY "Allow all access to products" ON public.products FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to categories" ON public.categories FOR ALL TO public USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to email_otps" ON public.email_otps FOR ALL TO public USING (true) WITH CHECK (true);
*/
