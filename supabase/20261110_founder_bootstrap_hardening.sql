-- ==============================================================================
-- ZEBALPHA ENTERPRISE ECOSYSTEM — FOUNDER BOOTSTRAP HARDENING MIGRATION
-- Migration: 20261110_founder_bootstrap_hardening.sql
-- Target: Supabase PostgreSQL
-- Purpose:
--   1. Enforce strict NOT NULL constraint on founder_bootstrap_vault.expires_at.
--   2. Remediate stored procedure: reject NULL expires_at tokens with SQLSTATE P0001.
--   3. Remediate stored procedure: reconcile pre-existing employee profiles to EXEC dept.
--   4. Lock down RPC execute privileges strictly to service_role.
-- ==============================================================================

BEGIN;

-- 1. ENFORCE NOT NULL CONSTRAINT ON expires_at
-- Guard against existing NULL rows before altering column definition
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM public.founder_bootstrap_vault 
        WHERE expires_at IS NULL
    ) THEN
        RAISE EXCEPTION 'Cannot enforce NOT NULL on expires_at: founder_bootstrap_vault contains NULL records.'
            USING ERRCODE = '23502';
    END IF;

    ALTER TABLE public.founder_bootstrap_vault 
        ALTER COLUMN expires_at SET NOT NULL;
END $$;

-- 2. HARDEN ATOMIC STORED PROCEDURE
-- Signature: consume_founder_bootstrap_token(VARCHAR, VARCHAR, VARCHAR, UUID)
-- Matches exact call in zebalpha-backend/src/controllers/founderBootstrapController.js
CREATE OR REPLACE FUNCTION public.consume_founder_bootstrap_token(
    p_email VARCHAR(255),
    p_token_hash VARCHAR(255),
    p_ip VARCHAR(100),
    p_user_id UUID
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, auth, pg_temp
LANGUAGE plpgsql
AS $$
DECLARE
    v_record RECORD;
    v_exec_dept_id UUID;
BEGIN
    -- Input sanitization
    IF p_email IS NULL OR p_token_hash IS NULL OR p_user_id IS NULL THEN
        RAISE EXCEPTION 'Invalid parameters: email, token_hash, and user_id are required.'
            USING ERRCODE = 'P0001';
    END IF;

    -- 1. Acquire exclusive pessimistic row lock on vault record
    SELECT * INTO v_record
    FROM public.founder_bootstrap_vault
    WHERE founder_email = LOWER(TRIM(p_email))
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Security Violation: Unauthorized founder email identity.'
            USING ERRCODE = 'P0001';
    END IF;

    -- 2. Verify not already consumed or sealed
    IF v_record.is_locked = TRUE OR v_record.consumed_at IS NOT NULL THEN
        RAISE EXCEPTION 'Security Violation: Founder bootstrap token has already been consumed and locked.'
            USING ERRCODE = 'P0001';
    END IF;

    -- 3. Strict TTL enforcement (NULL TTL strictly prohibited; expired rejected)
    IF v_record.expires_at IS NULL THEN
        RAISE EXCEPTION 'Security Violation: Founder bootstrap token lacks a valid expiration timestamp (NULL TTL prohibited).'
            USING ERRCODE = 'P0001';
    END IF;

    IF NOW() > v_record.expires_at THEN
        RAISE EXCEPTION 'Security Violation: Founder bootstrap token has expired.'
            USING ERRCODE = 'P0001';
    END IF;

    -- 4. Verify cryptographic token hash match (Constant-time string comparison)
    IF v_record.token_hash != p_token_hash THEN
        RAISE EXCEPTION 'Security Violation: Invalid or unverified bootstrap token.'
            USING ERRCODE = 'P0001';
    END IF;

    -- 5. Lock vault atomically
    UPDATE public.founder_bootstrap_vault
    SET is_locked = TRUE,
        consumed_at = NOW(),
        consumed_ip = p_ip,
        updated_at = NOW()
    WHERE id = v_record.id;

    -- 6. Atomically provision Enterprise Global OWNER membership
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

    -- 7. Atomically provision / reconcile Founder Executive Profile
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
            department_id = v_exec_dept_id,
            designation = 'Founder & Managing Director',
            employment_status = 'active',
            updated_at = NOW();
    END IF;

    -- 8. Write immutable audit entry (Raw token and hash omitted from metadata)
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

-- 3. PERMISSION HARDENING: RESTRICT EXECUTION TO SERVICE_ROLE ONLY
REVOKE ALL ON FUNCTION public.consume_founder_bootstrap_token(VARCHAR, VARCHAR, VARCHAR, UUID) 
    FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.consume_founder_bootstrap_token(VARCHAR, VARCHAR, VARCHAR, UUID) 
    TO service_role;

COMMIT;

