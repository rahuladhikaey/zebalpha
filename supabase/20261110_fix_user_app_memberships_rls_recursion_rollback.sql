-- ==============================================================================
-- ZEBALPHA ENTERPRISE ECOSYSTEM — RLS RECURSION REMEDIATION ROLLBACK (REFERENCE ONLY)
-- Rollback Migration: 20261110_fix_user_app_memberships_rls_recursion_rollback.sql
-- Target: Supabase PostgreSQL
-- WARNING:
--   Do NOT execute this rollback in Production unless replacing the authorization
--   model simultaneously. The legacy "Employees view own memberships" policy is
--   intentionally NOT restored here because its direct EXISTS subquery against
--   public.user_app_memberships unconditionally triggers SQLSTATE 42P17.
-- ==============================================================================

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '10s';

DROP POLICY IF EXISTS "Employees view own memberships" ON public.user_app_memberships;
DROP POLICY IF EXISTS "User views own memberships" ON public.user_app_memberships;

CREATE POLICY "User views own memberships"
    ON public.user_app_memberships
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR public.check_is_enterprise_owner()
    );

DELETE FROM public.schema_migrations
WHERE version = '20261110_fix_user_app_memberships_rls_recursion';

COMMIT;
