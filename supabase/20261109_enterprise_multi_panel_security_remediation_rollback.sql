-- ==============================================================================
-- ZEBALPHA ENTERPRISE ECOSYSTEM — SECURITY REMEDIATION COMPLETE ROLLBACK SCRIPT
-- File: supabase/20261109_enterprise_multi_panel_security_remediation_rollback.sql
-- Status: REVIEWABLE ARTIFACT ONLY — DO NOT EXECUTE WITHOUT FOUNDER APPROVAL
-- Classification: Symmetrical Inverse State Restoration
-- Target: Restores exact pre-remediation baseline (Migration 20261109_enterprise_multi_panel_ecosystem)
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. RESTORE BASELINE HELPER FUNCTIONS
-- ------------------------------------------------------------------------------

-- 1.1 Restore Baseline check_is_enterprise_owner()
CREATE OR REPLACE FUNCTION public.check_is_enterprise_owner()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_app_memberships
        WHERE user_id = auth.uid()
        AND is_active = TRUE
        AND role = 'OWNER'
    );
END;
$$;

-- 1.2 Restore Baseline check_user_has_app_membership()
CREATE OR REPLACE FUNCTION public.check_user_has_app_membership(p_app text, p_allowed_roles text[] DEFAULT NULL)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_app_memberships
        WHERE user_id = auth.uid()
        AND is_active = TRUE
        AND (app_name = p_app OR app_name = 'all' OR role = 'OWNER')
        AND (p_allowed_roles IS NULL OR role = ANY(p_allowed_roles) OR role = 'OWNER')
    );
END;
$$;

-- 1.3 Restore Baseline check_is_app_manager()
CREATE OR REPLACE FUNCTION public.check_is_app_manager(p_app text)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
    IF public.check_is_enterprise_owner() THEN
        RETURN TRUE;
    END IF;

    IF p_app = 'media' THEN
        RETURN EXISTS (
            SELECT 1 FROM public.user_app_memberships
            WHERE user_id = auth.uid()
            AND is_active = TRUE
            AND app_name IN ('media', 'all')
            AND role = 'Media Admin'
        );
    ELSIF p_app = 'operations' THEN
        RETURN EXISTS (
            SELECT 1 FROM public.user_app_memberships
            WHERE user_id = auth.uid()
            AND is_active = TRUE
            AND app_name IN ('operations', 'all')
            AND role IN ('Operations Manager', 'HR Manager', 'Customer Support Manager', 'Seller Support Manager')
        );
    ELSIF p_app = 'superadmin' THEN
        RETURN EXISTS (
            SELECT 1 FROM public.user_app_memberships
            WHERE user_id = auth.uid()
            AND is_active = TRUE
            AND app_name IN ('superadmin', 'all')
            AND role = 'SUPER_ADMIN'
        );
    END IF;

    RETURN FALSE;
END;
$$;

-- 1.4 Restore Baseline consume_founder_bootstrap_token (3-argument signature)
CREATE OR REPLACE FUNCTION public.consume_founder_bootstrap_token(
    p_email VARCHAR(255),
    p_token_hash VARCHAR(255),
    p_ip VARCHAR(100)
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_record RECORD;
BEGIN
    SELECT * INTO v_record
    FROM public.founder_bootstrap_vault
    WHERE founder_email = LOWER(TRIM(p_email))
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Security Violation: Unauthorized founder email identity.';
    END IF;

    IF v_record.is_locked = TRUE OR v_record.consumed_at IS NOT NULL THEN
        RAISE EXCEPTION 'Security Violation: Founder account is already established and sealed.';
    END IF;

    IF v_record.token_hash != p_token_hash THEN
        RAISE EXCEPTION 'Security Violation: Invalid or unverified bootstrap token.';
    END IF;

    UPDATE public.founder_bootstrap_vault
    SET is_locked = TRUE,
        consumed_at = NOW(),
        consumed_ip = p_ip,
        updated_at = NOW()
    WHERE id = v_record.id;

    RETURN TRUE;
END;
$$;

-- Drop 4-argument signature introduced in remediation
DROP FUNCTION IF EXISTS public.consume_founder_bootstrap_token(VARCHAR, VARCHAR, VARCHAR, UUID);

-- ------------------------------------------------------------------------------
-- 2. REMOVE REMEDIATION-SPECIFIC TRIGGERS & FUNCTIONS
-- ------------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_validate_employee_profile_mutation ON public.employee_profiles;
DROP FUNCTION IF EXISTS public.validate_employee_profile_mutation();

DROP TRIGGER IF EXISTS trg_prevent_audit_log_truncate ON public.enterprise_audit_logs;
DROP TRIGGER IF EXISTS trg_prevent_delivery_log_truncate ON public.notification_delivery_audit_logs;

-- Restore Baseline validate_support_ticket_mutation()
CREATE OR REPLACE FUNCTION public.validate_support_ticket_mutation()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT public.check_is_app_manager('operations') THEN
        IF OLD.assigned_to != NEW.assigned_to OR OLD.customer_id != NEW.customer_id
           OR OLD.customer_email != NEW.customer_email OR OLD.order_id != NEW.order_id
           OR OLD.ticket_number != NEW.ticket_number OR OLD.category != NEW.category THEN
            RAISE EXCEPTION 'Security Violation: Support executives cannot reassign tickets or mutate customer metadata.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. RESTORE BASELINE TABLE PRIVILEGES
-- ------------------------------------------------------------------------------
GRANT SELECT ON TABLE public.enterprise_audit_logs TO authenticated;
GRANT SELECT ON TABLE public.employee_invitations TO authenticated;

-- ------------------------------------------------------------------------------
-- 4. RESTORE BASELINE RLS POLICIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Customers create support tickets" ON public.customer_support_tickets;
DROP POLICY IF EXISTS "Employee updates own profile contact" ON public.employee_profiles;

-- ------------------------------------------------------------------------------
-- 5. REVERT MIGRATION REGISTRY
-- ------------------------------------------------------------------------------
DELETE FROM public.schema_migrations 
WHERE version = '20261109_enterprise_multi_panel_security_remediation';

COMMIT;
