-- ==============================================================================
-- ZEBALPHA ENTERPRISE ECOSYSTEM — FOUNDER BOOTSTRAP HARDENING ROLLBACK
-- Migration: 20261110_founder_bootstrap_hardening_rollback.sql
-- Target: Supabase PostgreSQL
-- Purpose:
--   Rolls back 20261110_founder_bootstrap_hardening.sql to 20261109 baseline state.
-- WARNING:
--   Dropping NOT NULL and rolling back stored procedure reintroduces NULL TTL acceptance.
-- ==============================================================================

BEGIN;

-- 1. DROP NOT NULL CONSTRAINT ON expires_at
ALTER TABLE public.founder_bootstrap_vault 
    ALTER COLUMN expires_at DROP NOT NULL;

-- 2. RESTORE 20261109 STORED PROCEDURE DEFINITION
CREATE OR REPLACE FUNCTION public.consume_founder_bootstrap_token(
    p_email VARCHAR(255),
    p_token_hash VARCHAR(255),
    p_ip VARCHAR(100),
    p_user_id UUID
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
    v_record RECORD;
    v_exec_dept_id UUID;
BEGIN
    SELECT * INTO v_record
    FROM public.founder_bootstrap_vault
    WHERE founder_email = LOWER(TRIM(p_email))
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Security Violation: Unauthorized founder email identity.';
    END IF;

    IF v_record.is_locked = TRUE OR v_record.consumed_at IS NOT NULL THEN
        RAISE EXCEPTION 'Security Violation: Founder bootstrap token has already been consumed and locked.';
    END IF;

    IF v_record.expires_at IS NOT NULL AND NOW() > v_record.expires_at THEN
        RAISE EXCEPTION 'Security Violation: Founder bootstrap token has expired.';
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

    INSERT INTO public.user_app_memberships (
        user_id,
        app_name,
        role,
        custom_permissions,
        is_active,
        granted_by
    ) VALUES (
        p_user_id,
        'all',
        'OWNER',
        '["*"]'::jsonb,
        TRUE,
        p_user_id
    )
    ON CONFLICT (user_id, app_name) 
    DO UPDATE SET 
        role = 'OWNER',
        is_active = TRUE,
        updated_at = NOW();

    SELECT id INTO v_exec_dept_id FROM public.departments WHERE code = 'EXEC' LIMIT 1;
    IF v_exec_dept_id IS NOT NULL THEN
        INSERT INTO public.employee_profiles (
            user_id,
            department_id,
            designation,
            employment_status
        ) VALUES (
            p_user_id,
            v_exec_dept_id,
            'Founder & Managing Director',
            'active'
        )
        ON CONFLICT (user_id) 
        DO UPDATE SET 
            employment_status = 'active',
            updated_at = NOW();
    END IF;

    INSERT INTO public.enterprise_audit_logs (
        actor_id,
        actor_email,
        app_source,
        action,
        entity_type,
        entity_id,
        ip_address,
        metadata
    ) VALUES (
        p_user_id,
        p_email,
        'api',
        'FOUNDER_BOOTSTRAP_INITIALIZED',
        'founder_bootstrap_vault',
        v_record.id::text,
        p_ip,
        jsonb_build_object('bootstrapped_at', NOW(), 'status', 'sealed')
    );

    RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_founder_bootstrap_token(VARCHAR, VARCHAR, VARCHAR, UUID) 
    FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.consume_founder_bootstrap_token(VARCHAR, VARCHAR, VARCHAR, UUID) 
    TO service_role;

-- 3. DEREGISTER MIGRATION FROM AUDIT REGISTRY
DELETE FROM public.schema_migrations 
WHERE version = '20261110_founder_bootstrap_hardening';

COMMIT;

