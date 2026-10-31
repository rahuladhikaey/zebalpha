-- ==============================================================================
-- ZEBALPHA — ENTERPRISE PRODUCTION DATABASE SECURITY REMEDIATION
-- Migration Date: 2026-11-01
-- Scope: 
--   1. FINDING-09: Revoke anonymous seller PII exposure; create sanitized public catalog view.
--   2. FINDING-10: Restrict seller self-promotion, self-approval, and self-unsuspension via BEFORE UPDATE trigger.
--   3. FINDING-18: Enforce immutable search_path on all SECURITY DEFINER functions.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SECURE public.sellers RLS & REVOKE ANONYMOUS PII EXPOSURE (FINDING-09)
-- ------------------------------------------------------------------------------

-- Ensure Row Level Security is active
ALTER TABLE public.sellers ENABLE ROW LEVEL SECURITY;

-- Drop insecure wildcard and public SELECT policies that exposed GSTIN, phone, and banking coordinates
DROP POLICY IF EXISTS "Public read approved sellers" ON public.sellers;
DROP POLICY IF EXISTS "allow_all_policy_sellers" ON public.sellers;
DROP POLICY IF EXISTS "Sellers manage own profile" ON public.sellers;
DROP POLICY IF EXISTS "Sellers can view own profile" ON public.sellers;
DROP POLICY IF EXISTS "Sellers can update own profile" ON public.sellers;
DROP POLICY IF EXISTS "Service role manages sellers" ON public.sellers;

-- Policy A: Service role maintains full access for trusted server-side execution
CREATE POLICY "Service role manages sellers" ON public.sellers
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Policy B: Authenticated sellers can ONLY view their own private merchant record
CREATE POLICY "Sellers can view own profile" ON public.sellers
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR auth.uid()::text = user_id::text);

-- Policy C: Authenticated sellers can ONLY update their own merchant record
CREATE POLICY "Sellers can update own profile" ON public.sellers
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id OR auth.uid()::text = user_id::text)
    WITH CHECK (auth.uid() = user_id OR auth.uid()::text = user_id::text);

-- Revoke direct table privileges from anon to prevent PostgREST wildcard column dumps
REVOKE ALL ON TABLE public.sellers FROM anon;

-- Grant column-level SELECT on non-sensitive public metadata to anon
GRANT SELECT (id, business_name, category, business_category, business_logo_url, profile_photo_url, business_description, city, state, status, is_suspended, created_at) 
    ON TABLE public.sellers TO anon;

-- Policy D: Allow public read of approved and active seller metadata
DROP POLICY IF EXISTS "Allow read approved sellers catalog" ON public.sellers;
CREATE POLICY "Allow read approved sellers catalog" ON public.sellers
    FOR SELECT TO anon, authenticated
    USING (status = 'approved' AND (is_suspended IS NULL OR is_suspended = false));

-- ------------------------------------------------------------------------------
-- 2. CREATE SANITIZED PUBLIC VIEW FOR CUSTOMER STOREFRONT (FINDING-09)
-- ------------------------------------------------------------------------------

-- Drop existing view if present
DROP VIEW IF EXISTS public.public_sellers_catalog CASCADE;

-- Create minimal sanitized view with security_invoker = true to satisfy Supabase security linter
CREATE VIEW public.public_sellers_catalog 
WITH (security_invoker = true) AS
SELECT
    id,
    business_name,
    category,
    business_category,
    business_logo_url,
    profile_photo_url,
    business_description,
    city,
    state,
    status,
    created_at
FROM public.sellers
WHERE status = 'approved' AND (is_suspended IS NULL OR is_suspended = false);

-- Grant read privileges on the sanitized view to public storefront visitors
GRANT SELECT ON public.public_sellers_catalog TO anon;
GRANT SELECT ON public.public_sellers_catalog TO authenticated;

-- ------------------------------------------------------------------------------
-- 3. BEFORE UPDATE TRIGGER: PREVENT PRIVILEGE ESCALATION & SELF-UNSUSPENSION (FINDING-10)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_guard_seller_status_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_jwt_role TEXT := COALESCE(auth.jwt() ->> 'role', '');
    v_is_admin BOOLEAN := FALSE;
BEGIN
    -- Allow service_role to execute administrative transitions
    IF v_jwt_role = 'service_role' OR current_user = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- Check if authenticated user holds admin or super_admin role in profiles
    IF auth.uid() IS NOT NULL THEN
        SELECT EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND (role = 'super_admin' OR role = 'admin')
        ) INTO v_is_admin;
    END IF;

    -- If caller is NOT a verified platform admin, reject administrative column tampering
    IF NOT v_is_admin THEN
        IF (OLD.status IS DISTINCT FROM NEW.status) OR
           (OLD.account_status IS DISTINCT FROM NEW.account_status) OR
           (OLD.is_suspended IS DISTINCT FROM NEW.is_suspended) OR
           (OLD.is_approved IS DISTINCT FROM NEW.is_approved) OR
           (OLD.seller_id IS DISTINCT FROM NEW.seller_id) THEN
            RAISE EXCEPTION 'Access Denied: Modifications to seller status, approval, or suspension are restricted to platform administrators.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_seller_status ON public.sellers;
CREATE TRIGGER trg_guard_seller_status
BEFORE UPDATE ON public.sellers
FOR EACH ROW
EXECUTE FUNCTION public.fn_guard_seller_status_changes();

-- ------------------------------------------------------------------------------
-- 4. BIND search_path ON ALL SECURITY DEFINER FUNCTIONS (FINDING-18)
-- ------------------------------------------------------------------------------

-- Update lifecycle trigger functions
CREATE OR REPLACE FUNCTION public.fn_handle_seller_status_change()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_temp
AS $$
BEGIN
    -- If seller is suspended, rejected, or inactive
    IF (NEW.status = 'suspended' OR NEW.status = 'rejected' OR NEW.is_active = false) THEN
        UPDATE public.products
        SET 
            is_active = false,
            is_approved = false,
            approval_status = 'suspended_by_merchant_action'
        WHERE seller_id = NEW.id::text OR seller_id = NEW.user_id::text;
    
    -- If seller is reactivated / approved
    ELSIF (NEW.status = 'approved' AND (NEW.is_active = true OR NEW.is_active IS NULL) AND (OLD.status = 'suspended' OR OLD.is_active = false)) THEN
        UPDATE public.products
        SET 
            is_active = true,
            is_approved = true,
            approval_status = 'approved'
        WHERE seller_id = NEW.id::text OR seller_id = NEW.user_id::text;
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_handle_seller_hard_delete()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_temp
AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cart') THEN
        DELETE FROM public.cart 
        WHERE product_id IN (
            SELECT id FROM public.products 
            WHERE seller_id = OLD.id::text OR seller_id = OLD.user_id::text
        );
    END IF;

    DELETE FROM public.products WHERE seller_id = OLD.id::text OR seller_id = OLD.user_id::text;
    DELETE FROM public.seller_pickup_locations WHERE seller_id = OLD.id::text;
    DELETE FROM public.seller_settlement_methods WHERE seller_id = OLD.id;
    DELETE FROM public.seller_payout_accounts WHERE seller_id = OLD.id;

    RETURN OLD;
END;
$$;
