-- ==============================================================================
-- ZEBALPHA ENTERPRISE ECOSYSTEM — PRODUCTION SECURITY REMEDIATION MIGRATION
-- File: supabase/20261109_enterprise_multi_panel_security_remediation.sql
-- Status: REVIEWABLE ARTIFACT ONLY — DO NOT EXECUTE WITHOUT FOUNDER APPROVAL
-- Classification: Enterprise Security & Forensic Remediation Patch
-- Target Tables: 16 Enterprise Multi-Panel Tables
-- Scope: Least-Privilege Grants, Function Hardening, Anti-Tamper Triggers,
--        RLS Policy Deduplication, Strict Application Boundary Isolation,
--        Atomic Founder Bootstrap with Expiration & Transactional Provisioning
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 0. SCHEMA MIGRATION TRACKING
-- ------------------------------------------------------------------------------
INSERT INTO public.schema_migrations (version, description)
VALUES (
    '20261109_enterprise_multi_panel_security_remediation',
    'Hardened forensic security patch: least privilege, app isolation, policy deduplication, atomic bootstrap'
)
ON CONFLICT (version) DO UPDATE SET applied_at = NOW();

-- ------------------------------------------------------------------------------
-- 1. HARDEN SECURITY DEFINER FUNCTIONS & REMOVE UNBOUNDED OWNER BYPASS
-- ------------------------------------------------------------------------------

-- 1.1 Enterprise Owner: Must strictly have app_name = 'all' AND role = 'OWNER'
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
        AND app_name = 'all'
        AND role = 'OWNER'
    );
END;
$$;

-- 1.2 Application Scope Verification: OWNER must be scoped to 'all' or specific app
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
        AND (
            -- Application match
            (app_name = p_app)
            -- Enterprise Owner / Global Admin across all apps
            OR (app_name = 'all' AND role = 'OWNER')
        )
        AND (
            p_allowed_roles IS NULL 
            OR role = ANY(p_allowed_roles) 
            OR (app_name = 'all' AND role = 'OWNER')
        )
    );
END;
$$;

-- 1.3 Deprecate Unscoped Management Function & Enforce App-Aware Manager Checks
CREATE OR REPLACE FUNCTION public.check_is_management_role()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
    -- Strict Enterprise Owner only for unscoped call; application-specific checks must use check_is_app_manager(p_app)
    RETURN public.check_is_enterprise_owner();
END;
$$;

-- 1.4 Application-Aware Manager Function
CREATE OR REPLACE FUNCTION public.check_is_app_manager(p_app text)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
    -- Enterprise Owner across all apps
    IF public.check_is_enterprise_owner() THEN
        RETURN TRUE;
    END IF;

    IF p_app = 'media' THEN
        RETURN EXISTS (
            SELECT 1 FROM public.user_app_memberships
            WHERE user_id = auth.uid()
            AND is_active = TRUE
            AND app_name = 'media'
            AND role IN ('Media Admin', 'OWNER')
        );
    ELSIF p_app = 'operations' THEN
        RETURN EXISTS (
            SELECT 1 FROM public.user_app_memberships
            WHERE user_id = auth.uid()
            AND is_active = TRUE
            AND app_name = 'operations'
            AND role IN ('Operations Manager', 'HR Manager', 'Customer Support Manager', 'Seller Support Manager', 'OWNER')
        );
    ELSIF p_app = 'superadmin' THEN
        RETURN EXISTS (
            SELECT 1 FROM public.user_app_memberships
            WHERE user_id = auth.uid()
            AND is_active = TRUE
            AND app_name = 'superadmin'
            AND role IN ('SUPER_ADMIN', 'OWNER')
        );
    END IF;

    RETURN FALSE;
END;
$$;

-- 1.5 Active Employee Helper
CREATE OR REPLACE FUNCTION public.is_active_employee()
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.employee_profiles
        WHERE user_id = auth.uid()
        AND employment_status = 'active'
    ) OR public.check_is_enterprise_owner();
END;
$$;

-- 1.6 Department Resolver Helper
CREATE OR REPLACE FUNCTION public.get_auth_employee_dept_id()
RETURNS UUID
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
    v_dept_id UUID;
BEGIN
    SELECT department_id INTO v_dept_id
    FROM public.employee_profiles
    WHERE user_id = auth.uid()
    AND employment_status = 'active';
    RETURN v_dept_id;
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. HARDEN FUNCTION EXECUTION PRIVILEGES (LEAST-PRIVILEGE GRANTS)
-- ------------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.check_is_enterprise_owner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_is_enterprise_owner() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.check_user_has_app_membership(text, text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_user_has_app_membership(text, text[]) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.check_is_management_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_is_management_role() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.check_is_app_manager(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_is_app_manager(text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_active_employee() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_employee() TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_auth_employee_dept_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_auth_employee_dept_id() TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 3. HARDEN FOUNDER BOOTSTRAP VAULT: SCHEMA, TRIGGER & ATOMIC PROCEDURE
-- ------------------------------------------------------------------------------

-- Ensure expires_at column exists for cryptographic TTL
ALTER TABLE public.founder_bootstrap_vault 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Ensure single-row constraint index exists
CREATE UNIQUE INDEX IF NOT EXISTS uq_founder_bootstrap_single_row 
ON public.founder_bootstrap_vault ((TRUE));

-- Comprehensive anti-tamper trigger protecting ALL sensitive fields
CREATE OR REPLACE FUNCTION public.prevent_bootstrap_vault_tamper()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Prevent changing founder identity, token hash, or expiration date
    IF OLD.founder_email != NEW.founder_email 
       OR OLD.token_hash != NEW.token_hash 
       OR OLD.expires_at IS DISTINCT FROM NEW.expires_at THEN
        RAISE EXCEPTION 'Security Violation: Founder identity, token hash, and expiration are immutable.';
    END IF;

    -- Prevent unlocking once locked
    IF OLD.is_locked = TRUE AND NEW.is_locked = FALSE THEN
        RAISE EXCEPTION 'Security Violation: The Founder Bootstrap Vault is permanently locked and cannot be unlocked.';
    END IF;

    -- Prevent altering consumption record once consumed
    IF OLD.consumed_at IS NOT NULL AND (NEW.consumed_at != OLD.consumed_at OR NEW.consumed_ip != OLD.consumed_ip) THEN
        RAISE EXCEPTION 'Security Violation: Consumption metadata is immutable.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_bootstrap_unlock ON public.founder_bootstrap_vault;
DROP TRIGGER IF EXISTS trg_prevent_bootstrap_tamper ON public.founder_bootstrap_vault;
CREATE TRIGGER trg_prevent_bootstrap_tamper
BEFORE UPDATE ON public.founder_bootstrap_vault
FOR EACH ROW EXECUTE FUNCTION public.prevent_bootstrap_vault_tamper();

-- Anti-Deletion Trigger
CREATE OR REPLACE FUNCTION public.prevent_bootstrap_vault_deletion()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Security Violation: Founder Bootstrap Vault records cannot be deleted or truncated.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_bootstrap_delete ON public.founder_bootstrap_vault;
CREATE TRIGGER trg_prevent_bootstrap_delete
BEFORE DELETE OR TRUNCATE ON public.founder_bootstrap_vault
FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_bootstrap_vault_deletion();

-- Atomic Token Consumption Procedure with Direct Identity & Profile Provisioning
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
    -- 1. Acquire exclusive pessimistic lock on vault record
    SELECT * INTO v_record
    FROM public.founder_bootstrap_vault
    WHERE founder_email = LOWER(TRIM(p_email))
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Security Violation: Unauthorized founder email identity.';
    END IF;

    -- 2. Verify not already consumed
    IF v_record.is_locked = TRUE OR v_record.consumed_at IS NOT NULL THEN
        RAISE EXCEPTION 'Security Violation: Founder bootstrap token has already been consumed and locked.';
    END IF;

    -- 3. Verify token expiration
    IF v_record.expires_at IS NOT NULL AND NOW() > v_record.expires_at THEN
        RAISE EXCEPTION 'Security Violation: Founder bootstrap token has expired.';
    END IF;

    -- 4. Verify cryptographic token hash match
    IF v_record.token_hash != p_token_hash THEN
        RAISE EXCEPTION 'Security Violation: Invalid or unverified bootstrap token.';
    END IF;

    -- 5. Lock vault atomically
    UPDATE public.founder_bootstrap_vault
    SET is_locked = TRUE,
        consumed_at = NOW(),
        consumed_ip = p_ip,
        updated_at = NOW()
    WHERE id = v_record.id;

    -- 6. Atomically provision Enterprise Owner membership
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

    -- 7. Atomically provision Founder Executive Profile
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

    -- 8. Write immutable audit entry
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

-- Drop obsolete 3-argument signature if present
DROP FUNCTION IF EXISTS public.consume_founder_bootstrap_token(VARCHAR, VARCHAR, VARCHAR);

-- Revoke all public access, grant strictly to service_role
REVOKE ALL ON FUNCTION public.consume_founder_bootstrap_token(VARCHAR, VARCHAR, VARCHAR, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_founder_bootstrap_token(VARCHAR, VARCHAR, VARCHAR, UUID) TO service_role;

-- ------------------------------------------------------------------------------
-- 4. HARDEN EMPLOYEE PROFILES (FIELD PROTECTION TRIGGER)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validate_employee_profile_mutation()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only HR Manager or Enterprise Owner can modify department, designation, employee_code, status
    IF NOT (public.check_is_enterprise_owner() OR public.check_user_has_app_membership('operations', ARRAY['HR Manager'])) THEN
        IF OLD.department_id != NEW.department_id 
           OR OLD.designation != NEW.designation 
           OR OLD.employee_code IS DISTINCT FROM NEW.employee_code
           OR OLD.employment_status != NEW.employment_status
           OR OLD.joining_date != NEW.joining_date THEN
            RAISE EXCEPTION 'Security Violation: Employees cannot modify their own department, designation, or employment status.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_employee_profile_mutation ON public.employee_profiles;
CREATE TRIGGER trg_validate_employee_profile_mutation
BEFORE UPDATE ON public.employee_profiles
FOR EACH ROW EXECUTE FUNCTION public.validate_employee_profile_mutation();

-- ------------------------------------------------------------------------------
-- 5. HARDEN CUSTOMER SUPPORT TICKETS (MUTATION TRIGGER & CREATION POLICY)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.validate_support_ticket_mutation()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Operations Manager / Customer Support Manager have full authority
    IF public.check_is_enterprise_owner() OR public.check_user_has_app_membership('operations', ARRAY['Customer Support Manager', 'Operations Manager']) THEN
        RETURN NEW;
    END IF;

    -- Support Executives can ONLY update status and resolution_notes
    IF public.check_user_has_app_membership('operations', ARRAY['Support Executive']) THEN
        IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to
           OR OLD.customer_id IS DISTINCT FROM NEW.customer_id
           OR OLD.customer_email != NEW.customer_email
           OR OLD.order_id IS DISTINCT FROM NEW.order_id
           OR OLD.ticket_number != NEW.ticket_number
           OR OLD.category != NEW.category
           OR OLD.priority != NEW.priority THEN
            RAISE EXCEPTION 'Security Violation: Support executives cannot reassign tickets or mutate customer metadata/priority.';
        END IF;
        RETURN NEW;
    END IF;

    -- Ordinary customers cannot update tickets at all
    RAISE EXCEPTION 'Security Violation: Direct customer update of support tickets is prohibited.';
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_support_ticket_mutation ON public.customer_support_tickets;
CREATE TRIGGER trg_validate_support_ticket_mutation
BEFORE UPDATE ON public.customer_support_tickets
FOR EACH ROW EXECUTE FUNCTION public.validate_support_ticket_mutation();

-- ------------------------------------------------------------------------------
-- 6. HARDEN AUDIT LOGS (APPEND-ONLY INTEGRITY & TRUNCATE PROTECTION)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Security Violation: Forensic audit logs are immutable append-only records. UPDATE, DELETE, and TRUNCATE are prohibited.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_audit_log_mutation ON public.enterprise_audit_logs;
CREATE TRIGGER trg_prevent_audit_log_mutation
BEFORE UPDATE OR DELETE ON public.enterprise_audit_logs
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();

DROP TRIGGER IF EXISTS trg_prevent_audit_log_truncate ON public.enterprise_audit_logs;
CREATE TRIGGER trg_prevent_audit_log_truncate
BEFORE TRUNCATE ON public.enterprise_audit_logs
FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_audit_log_mutation();

DROP TRIGGER IF EXISTS trg_prevent_delivery_log_mutation ON public.notification_delivery_audit_logs;
CREATE TRIGGER trg_prevent_delivery_log_mutation
BEFORE UPDATE OR DELETE ON public.notification_delivery_audit_logs
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_mutation();

DROP TRIGGER IF EXISTS trg_prevent_delivery_log_truncate ON public.notification_delivery_audit_logs;
CREATE TRIGGER trg_prevent_delivery_log_truncate
BEFORE TRUNCATE ON public.notification_delivery_audit_logs
FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_audit_log_mutation();

-- ------------------------------------------------------------------------------
-- 7. LEAST-PRIVILEGE DATABASE TABLE PRIVILEGES (REVOKE & SELECTIVE GRANT)
-- ------------------------------------------------------------------------------

-- 7.1 Revoke ALL from public and anon on all 16 tables
REVOKE ALL ON TABLE public.departments FROM public, anon;
REVOKE ALL ON TABLE public.employee_profiles FROM public, anon;
REVOKE ALL ON TABLE public.user_app_memberships FROM public, anon;
REVOKE ALL ON TABLE public.founder_bootstrap_vault FROM public, anon, authenticated;
REVOKE ALL ON TABLE public.employee_invitations FROM public, anon, authenticated;
REVOKE ALL ON TABLE public.media_campaigns FROM public, anon;
REVOKE ALL ON TABLE public.creative_assets FROM public, anon;
REVOKE ALL ON TABLE public.social_posts FROM public, anon;
REVOKE ALL ON TABLE public.media_tasks FROM public, anon;
REVOKE ALL ON TABLE public.operations_tasks FROM public, anon;
REVOKE ALL ON TABLE public.customer_support_tickets FROM public, anon;
REVOKE ALL ON TABLE public.internal_announcements FROM public, anon;
REVOKE ALL ON TABLE public.notification_campaigns FROM public, anon;
REVOKE ALL ON TABLE public.notification_suppression_list FROM public, anon, authenticated;
REVOKE ALL ON TABLE public.notification_delivery_audit_logs FROM public, anon, authenticated;
REVOKE ALL ON TABLE public.enterprise_audit_logs FROM public, anon, authenticated;

-- 7.2 Service Role possesses full management
GRANT ALL ON TABLE public.departments TO service_role;
GRANT ALL ON TABLE public.employee_profiles TO service_role;
GRANT ALL ON TABLE public.user_app_memberships TO service_role;
GRANT ALL ON TABLE public.founder_bootstrap_vault TO service_role;
GRANT ALL ON TABLE public.employee_invitations TO service_role;
GRANT ALL ON TABLE public.media_campaigns TO service_role;
GRANT ALL ON TABLE public.creative_assets TO service_role;
GRANT ALL ON TABLE public.social_posts TO service_role;
GRANT ALL ON TABLE public.media_tasks TO service_role;
GRANT ALL ON TABLE public.operations_tasks TO service_role;
GRANT ALL ON TABLE public.customer_support_tickets TO service_role;
GRANT ALL ON TABLE public.internal_announcements TO service_role;
GRANT ALL ON TABLE public.notification_campaigns TO service_role;
GRANT ALL ON TABLE public.notification_suppression_list TO service_role;
GRANT ALL ON TABLE public.notification_delivery_audit_logs TO service_role;
GRANT ALL ON TABLE public.enterprise_audit_logs TO service_role;

-- 7.3 Authenticated User Selective Grants (Least Privilege)
GRANT SELECT ON TABLE public.departments TO authenticated, anon;
GRANT SELECT, UPDATE ON TABLE public.employee_profiles TO authenticated;
GRANT SELECT ON TABLE public.user_app_memberships TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.media_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.creative_assets TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.social_posts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.media_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.operations_tasks TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.customer_support_tickets TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.internal_announcements TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.notification_campaigns TO authenticated;

-- ------------------------------------------------------------------------------
-- 8. PURGE DUPLICATE & OVERLAPPING RLS POLICIES (CLEAN DEDUPLICATION)
-- ------------------------------------------------------------------------------

-- Clean employee_profiles duplicate policies
DROP POLICY IF EXISTS "Public view profiles" ON public.employee_profiles;
DROP POLICY IF EXISTS "Employees view profiles" ON public.employee_profiles;
DROP POLICY IF EXISTS "Employees and HR view profiles" ON public.employee_profiles;
DROP POLICY IF EXISTS "Authenticated users view profiles" ON public.employee_profiles;
DROP POLICY IF EXISTS "Employee views own profile" ON public.employee_profiles;

CREATE POLICY "Employee views own profile" ON public.employee_profiles
FOR SELECT TO authenticated
USING (
    user_id = auth.uid()
    OR public.check_is_enterprise_owner()
    OR public.check_user_has_app_membership('operations', ARRAY['HR Manager'])
);

DROP POLICY IF EXISTS "Employee updates own profile contact" ON public.employee_profiles;
CREATE POLICY "Employee updates own profile contact" ON public.employee_profiles
FOR UPDATE TO authenticated
USING (
    user_id = auth.uid()
    OR public.check_is_enterprise_owner()
    OR public.check_user_has_app_membership('operations', ARRAY['HR Manager'])
)
WITH CHECK (
    user_id = auth.uid()
    OR public.check_is_enterprise_owner()
    OR public.check_user_has_app_membership('operations', ARRAY['HR Manager'])
);

-- Clean customer_support_tickets policies
DROP POLICY IF EXISTS "Customer and support view tickets" ON public.customer_support_tickets;
CREATE POLICY "Customer and support view tickets" ON public.customer_support_tickets
FOR SELECT TO authenticated
USING (
    customer_id = auth.uid()
    OR public.check_is_enterprise_owner()
    OR (
        public.check_user_has_app_membership('operations')
        AND (
            assigned_to = auth.uid()
            OR public.check_is_app_manager('operations')
        )
    )
);

DROP POLICY IF EXISTS "Support staff updates tickets" ON public.customer_support_tickets;
CREATE POLICY "Support staff updates tickets" ON public.customer_support_tickets
FOR UPDATE TO authenticated
USING (
    public.check_is_enterprise_owner()
    OR (
        public.check_user_has_app_membership('operations')
        AND (
            assigned_to = auth.uid()
            OR public.check_is_app_manager('operations')
        )
    )
)
WITH CHECK (
    public.check_is_enterprise_owner()
    OR (
        public.check_user_has_app_membership('operations')
        AND (
            assigned_to = auth.uid()
            OR public.check_is_app_manager('operations')
        )
    )
);

-- Customer client INSERT policy strictly guarded (if backend API is bypassed)
DROP POLICY IF EXISTS "Customers create support tickets" ON public.customer_support_tickets;
CREATE POLICY "Customers create support tickets" ON public.customer_support_tickets
FOR INSERT TO authenticated
WITH CHECK (
    customer_id = auth.uid()
    AND status = 'open'
    AND priority IN ('low', 'medium')
    AND assigned_to IS NULL
    AND resolution_notes IS NULL
);

-- Clean user_app_memberships policies
DROP POLICY IF EXISTS "User views own memberships" ON public.user_app_memberships;
CREATE POLICY "User views own memberships" ON public.user_app_memberships
FOR SELECT TO authenticated
USING (
    user_id = auth.uid()
    OR public.check_is_enterprise_owner()
);

-- Clean internal_announcements policies
DROP POLICY IF EXISTS "Scoped announcements visibility" ON public.internal_announcements;
CREATE POLICY "Scoped announcements visibility" ON public.internal_announcements
FOR SELECT TO authenticated
USING (
    is_active = TRUE
    AND public.is_active_employee()
    AND (
        target_scope = 'company_wide'
        OR (target_scope = 'department' AND department_id = public.get_auth_employee_dept_id())
        OR (target_scope = 'management_only' AND (public.check_is_enterprise_owner() OR public.check_is_app_manager('operations')))
    )
);

COMMIT;
