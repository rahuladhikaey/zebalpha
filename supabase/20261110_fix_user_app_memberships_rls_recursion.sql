-- ==============================================================================
-- ZEBALPHA ENTERPRISE ECOSYSTEM — RLS RECURSION REMEDIATION (42P17)
-- Migration: 20261110_fix_user_app_memberships_rls_recursion.sql
-- Target: Supabase PostgreSQL
-- Purpose:
--   1. Enforce strict precondition verification on public.user_app_memberships policies:
--      abort safely if any unexpected policy exists or if the service_role policy is missing.
--   2. Fix PostgreSQL SQLSTATE 42P17 (infinite recursion detected in policy for relation "user_app_memberships")
--      by dropping both authenticated SELECT policies:
--        - "Employees view own memberships" (legacy recursive EXISTS subquery)
--        - "User views own memberships"
--   3. Create the single canonical self-scoped SELECT policy "User views own memberships":
--      FOR SELECT TO authenticated USING (user_id = auth.uid()).
--   4. Preserve "Service role manages user_app_memberships", RLS enabled status,
--      and all existing table-level grants and write restrictions.
--   5. Register migration with ON CONFLICT (version) DO NOTHING to preserve original applied_at.
-- ==============================================================================

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '10s';

-- 1. PRECONDITION CHECK: ABORT ON UNEXPECTED POLICIES OR MISSING SERVICE_ROLE POLICY
DO $$
DECLARE
    v_unexpected_policies TEXT;
    v_has_service_role_policy BOOLEAN;
BEGIN
    SELECT string_agg(policyname, ', ' ORDER BY policyname)
    INTO v_unexpected_policies
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_app_memberships'
      AND policyname NOT IN (
          'Employees view own memberships',
          'User views own memberships',
          'Service role manages user_app_memberships'
      );

    IF v_unexpected_policies IS NOT NULL THEN
        RAISE EXCEPTION 'Precondition failed: unexpected RLS policies found on public.user_app_memberships: %', v_unexpected_policies
            USING ERRCODE = 'P0001';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'user_app_memberships'
          AND policyname = 'Service role manages user_app_memberships'
          AND cmd = 'ALL'
    ) INTO v_has_service_role_policy;

    IF NOT v_has_service_role_policy THEN
        RAISE EXCEPTION 'Precondition failed: required policy "Service role manages user_app_memberships" is missing on public.user_app_memberships.'
            USING ERRCODE = 'P0001';
    END IF;
END $$;

-- 2. DROP BOTH AUTHENTICATED SELECT POLICIES (INCLUDING LEGACY RECURSIVE POLICY)
DROP POLICY IF EXISTS "Employees view own memberships" ON public.user_app_memberships;
DROP POLICY IF EXISTS "User views own memberships" ON public.user_app_memberships;

-- 3. CREATE SINGLE CANONICAL NON-RECURSIVE SELECT POLICY FOR AUTHENTICATED USERS
CREATE POLICY "User views own memberships"
    ON public.user_app_memberships
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- 4. ENSURE RLS REMAINS ENABLED (PRESERVING EXISTING SERVICE_ROLE POLICY & GRANTS)
ALTER TABLE public.user_app_memberships ENABLE ROW LEVEL SECURITY;

-- 5. POST-CONDITION CHECK: VERIFY EXACTLY TWO EXPECTED POLICIES REMAIN
DO $$
DECLARE
    v_policy_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO v_policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_app_memberships';

    IF v_policy_count <> 2 THEN
        RAISE EXCEPTION 'Postcondition failed: expected exactly 2 policies on public.user_app_memberships, found %', v_policy_count
            USING ERRCODE = 'P0001';
    END IF;
END $$;

-- 6. REGISTER MIGRATION IN AUDIT REGISTRY (PRESERVE ORIGINAL applied_at ON RETRY)
INSERT INTO public.schema_migrations (version, description)
VALUES (
    '20261110_fix_user_app_memberships_rls_recursion',
    'Drop recursive Employees view own memberships policy and enforce single canonical self-scoped User views own memberships SELECT policy on public.user_app_memberships'
)
ON CONFLICT (version) DO NOTHING;

COMMIT;
