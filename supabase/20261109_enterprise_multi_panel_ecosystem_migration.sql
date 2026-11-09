-- ==============================================================================
-- ZEBALPHA ENTERPRISE MULTI-PANEL ECOSYSTEM EXPANSION (HARDENED REVISION 2)
-- Migration: 20261109_enterprise_multi_panel_ecosystem_migration.sql
-- Security Level: Founder-Approved Enterprise Grade
-- Architecture: Zero-Disruption, Non-Recursive RLS, Immutable Auditing, Strict RBAC
-- Target: Media Panel (media.zebalpha.shop) & Operations Panel (ops.zebalpha.shop)
-- ==============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 0. MIGRATION REGISTRY & COLLISION DETECTION
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.schema_migrations (
    version VARCHAR(100) PRIMARY KEY,
    applied_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    applied_by VARCHAR(100) DEFAULT CURRENT_USER NOT NULL,
    description TEXT
);

INSERT INTO public.schema_migrations (version, description)
VALUES ('20261109_enterprise_multi_panel_ecosystem', 'ZebAlpha Media and Operations enterprise panels schema expansion')
ON CONFLICT (version) DO UPDATE SET applied_at = NOW();

-- ==============================================================================
-- 1. DEPARTMENTS TABLE (Internal Company Organization)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Seed Standard ZebAlpha Operational Departments
INSERT INTO public.departments (name, code, description) VALUES
    ('Executive Management', 'EXEC', 'Company leadership, Founder, and core executive direction'),
    ('Operations & Logistics', 'OPS', 'Day-to-day operations, order fulfillment, and logistics tracking'),
    ('Human Resources', 'HR', 'Employee management, onboarding, compliance, and internal HR'),
    ('Customer Support', 'CS', 'Customer queries, returns coordination, and satisfaction tracking'),
    ('Seller Support', 'SS', 'Merchant onboarding assistance, listing support, and seller helpdesk'),
    ('Media & Creative Marketing', 'MEDIA', 'Brand campaigns, social media, graphic design, and video production'),
    ('Quality Assurance', 'QA', 'Product inspection, marketplace compliance, and listing accuracy'),
    ('Finance Operations', 'FIN_OPS', 'Internal reconciliations, financial auditing, and ledger oversight')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- ==============================================================================
-- 2. EMPLOYEE PROFILES (Extends central auth.users & public.profiles)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.employee_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    employee_code VARCHAR(50) UNIQUE,
    designation VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20),
    joining_date DATE DEFAULT CURRENT_DATE NOT NULL,
    employment_status VARCHAR(30) DEFAULT 'active' NOT NULL CHECK (employment_status IN ('active', 'on_leave', 'suspended', 'terminated')),
    emergency_contact JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==============================================================================
-- 3. APPLICATION MEMBERSHIPS & RBAC (Cross-Panel Permission Mapping)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.user_app_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    app_name VARCHAR(50) NOT NULL CHECK (app_name IN ('media', 'operations', 'superadmin', 'all')),
    role VARCHAR(50) NOT NULL,
    custom_permissions JSONB DEFAULT '[]'::jsonb NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    granted_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_user_app UNIQUE (user_id, app_name)
);

-- ==============================================================================
-- 4. HARDENED APPLICATION-AWARE SECURITY DEFINER HELPERS
-- Non-recursive, search_path hardened, strictly isolated by application scope.
-- ==============================================================================

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

CREATE OR REPLACE FUNCTION public.check_user_has_app_membership(p_app text, p_allowed_roles text[] DEFAULT NULL)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
    -- Explicitly verify application scope
    RETURN EXISTS (
        SELECT 1 FROM public.user_app_memberships
        WHERE user_id = auth.uid()
        AND is_active = TRUE
        AND (app_name = p_app OR app_name = 'all' OR role = 'OWNER')
        AND (p_allowed_roles IS NULL OR role = ANY(p_allowed_roles) OR role = 'OWNER')
    );
END;
$$;

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

-- Grant execution privileges only to authenticated and service_role
REVOKE EXECUTE ON FUNCTION public.check_is_enterprise_owner() FROM public;
GRANT EXECUTE ON FUNCTION public.check_is_enterprise_owner() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.check_user_has_app_membership(text, text[]) FROM public;
GRANT EXECUTE ON FUNCTION public.check_user_has_app_membership(text, text[]) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.check_is_app_manager(text) FROM public;
GRANT EXECUTE ON FUNCTION public.check_is_app_manager(text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_auth_employee_dept_id() FROM public;
GRANT EXECUTE ON FUNCTION public.get_auth_employee_dept_id() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_active_employee() FROM public;
GRANT EXECUTE ON FUNCTION public.is_active_employee() TO authenticated, service_role;

-- ==============================================================================
-- 5. FOUNDER BOOTSTRAP VAULT (Strict Single-Row, Permanent-Lock, Atomic Procedure)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.founder_bootstrap_vault (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    founder_email VARCHAR(255) NOT NULL UNIQUE,
    token_hash VARCHAR(255) NOT NULL,
    is_locked BOOLEAN DEFAULT FALSE NOT NULL,
    consumed_at TIMESTAMPTZ,
    consumed_ip VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Guarantee exactly one single Founder bootstrap record can ever exist
CREATE UNIQUE INDEX IF NOT EXISTS uq_founder_bootstrap_single_row ON public.founder_bootstrap_vault ((TRUE));

-- Permanent server-side lock trigger
CREATE OR REPLACE FUNCTION public.prevent_bootstrap_vault_tamper()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Block modifications to email and token hash
    IF OLD.founder_email != NEW.founder_email OR OLD.token_hash != NEW.token_hash THEN
        RAISE EXCEPTION 'Security Violation: Founder identity and token hash are immutable.';
    END IF;

    -- Block unlock once locked
    IF OLD.is_locked = TRUE AND NEW.is_locked = FALSE THEN
        RAISE EXCEPTION 'Security Violation: The Founder Bootstrap Vault is permanently locked and cannot be unlocked.';
    END IF;

    -- Block mutation of consumed attributes once consumed
    IF OLD.consumed_at IS NOT NULL AND (NEW.consumed_at != OLD.consumed_at OR NEW.consumed_ip != OLD.consumed_ip) THEN
        RAISE EXCEPTION 'Security Violation: Consumption timestamp and IP are immutable.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_bootstrap_tamper ON public.founder_bootstrap_vault;
CREATE TRIGGER trg_prevent_bootstrap_tamper
BEFORE UPDATE ON public.founder_bootstrap_vault
FOR EACH ROW EXECUTE FUNCTION public.prevent_bootstrap_vault_tamper();

-- Prevent deletion or truncation of the Founder Bootstrap Vault
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

-- Atomic Stored Procedure for Single-Use Founder Bootstrap Token Consumption
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
    -- Acquire exclusive pessimistic row lock to serialize concurrent requests
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

    -- Atomically lock the vault record
    UPDATE public.founder_bootstrap_vault
    SET is_locked = TRUE,
        consumed_at = NOW(),
        consumed_ip = p_ip,
        updated_at = NOW()
    WHERE id = v_record.id;

    RETURN TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.consume_founder_bootstrap_token(VARCHAR, VARCHAR, VARCHAR) FROM public;
GRANT EXECUTE ON FUNCTION public.consume_founder_bootstrap_token(VARCHAR, VARCHAR, VARCHAR) TO service_role;

-- ==============================================================================
-- 6. EMPLOYEE INVITATIONS (Email-Bound, Single-Use, Protected Metadata)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.employee_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    assigned_role VARCHAR(50) NOT NULL,
    app_scope VARCHAR(50) NOT NULL CHECK (app_scope IN ('media', 'operations', 'all')),
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    invited_by UUID NOT NULL REFERENCES auth.users(id),
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    accepted_user_id UUID REFERENCES auth.users(id),
    is_revoked BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Trigger to prevent altering accepted invitations or protected fields
CREATE OR REPLACE FUNCTION public.protect_employee_invitation_mutation()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    IF OLD.accepted_at IS NOT NULL THEN
        RAISE EXCEPTION 'Security Violation: Accepted invitations are immutable.';
    END IF;

    -- Token hash, email, and role cannot be altered on existing invitations
    IF OLD.token_hash != NEW.token_hash OR OLD.email != NEW.email OR OLD.assigned_role != NEW.assigned_role THEN
        RAISE EXCEPTION 'Security Violation: Protected invitation parameters cannot be modified.';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_invitation_mutation ON public.employee_invitations;
CREATE TRIGGER trg_protect_invitation_mutation
BEFORE UPDATE ON public.employee_invitations
FOR EACH ROW EXECUTE FUNCTION public.protect_employee_invitation_mutation();

-- ==============================================================================
-- 7. MEDIA CAMPAIGNS (Marketing & Creative Operations)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.media_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    objective VARCHAR(255) NOT NULL,
    description TEXT,
    budget NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    spent_budget NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    target_audience TEXT,
    status VARCHAR(50) DEFAULT 'draft' NOT NULL CHECK (status IN ('draft', 'pending_approval', 'approved', 'scheduled', 'active', 'paused', 'completed', 'rejected')),
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==============================================================================
-- 8. CREATIVE ASSET LIBRARY (Banners, Videos, Graphics, Lookbooks)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.creative_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES public.media_campaigns(id) ON DELETE SET NULL,
    asset_name VARCHAR(255) NOT NULL,
    asset_type VARCHAR(50) NOT NULL CHECK (asset_type IN ('image', 'video', 'banner', 'logo', 'lookbook', 'document')),
    file_url TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    version INT DEFAULT 1 NOT NULL,
    tags JSONB DEFAULT '[]'::jsonb,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==============================================================================
-- 9. SOCIAL POSTS (Instagram, YouTube, Meta Content Calendar)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.social_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES public.media_campaigns(id) ON DELETE SET NULL,
    platform VARCHAR(50) NOT NULL CHECK (platform IN ('instagram', 'facebook', 'youtube', 'twitter', 'linkedin', 'other')),
    caption TEXT NOT NULL,
    hashtags TEXT,
    media_asset_ids JSONB DEFAULT '[]'::jsonb,
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'draft' NOT NULL CHECK (status IN ('draft', 'under_review', 'approved', 'scheduled', 'published', 'failed')),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    performance_metrics JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==============================================================================
-- 10. MEDIA TASKS (Creative & Marketing Workflows)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.media_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES public.media_campaigns(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES auth.users(id),
    priority VARCHAR(30) DEFAULT 'medium' NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(50) DEFAULT 'todo' NOT NULL CHECK (status IN ('todo', 'in_progress', 'review', 'revision_required', 'approved', 'completed')),
    deadline TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Task field-level protection trigger for non-managers
CREATE OR REPLACE FUNCTION public.validate_media_task_update()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT public.check_is_app_manager('media') THEN
        -- Ordinary assigned employees can ONLY change status
        IF OLD.title != NEW.title OR OLD.description != NEW.description OR OLD.assigned_to != NEW.assigned_to
           OR OLD.created_by != NEW.created_by OR OLD.priority != NEW.priority OR OLD.deadline != NEW.deadline THEN
            RAISE EXCEPTION 'Security Violation: Task assignees are permitted to modify task status only.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_media_task_update ON public.media_tasks;
CREATE TRIGGER trg_validate_media_task_update
BEFORE UPDATE ON public.media_tasks
FOR EACH ROW EXECUTE FUNCTION public.validate_media_task_update();

-- ==============================================================================
-- 11. OPERATIONS TASKS (Department Workflows & Operations Tracking)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.operations_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES auth.users(id),
    priority VARCHAR(30) DEFAULT 'medium' NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(50) DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'assigned', 'in_progress', 'under_review', 'revision_required', 'approved', 'completed', 'cancelled')),
    deadline TIMESTAMPTZ,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Operations task field-level protection trigger for non-managers
CREATE OR REPLACE FUNCTION public.validate_operations_task_update()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    IF NOT public.check_is_app_manager('operations') THEN
        -- Ordinary assigned employees can ONLY change status
        IF OLD.title != NEW.title OR OLD.description != NEW.description OR OLD.assigned_to != NEW.assigned_to
           OR OLD.department_id != NEW.department_id OR OLD.created_by != NEW.created_by
           OR OLD.priority != NEW.priority OR OLD.deadline != NEW.deadline THEN
            RAISE EXCEPTION 'Security Violation: Task assignees are permitted to modify task status only.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_operations_task_update ON public.operations_tasks;
CREATE TRIGGER trg_validate_operations_task_update
BEFORE UPDATE ON public.operations_tasks
FOR EACH ROW EXECUTE FUNCTION public.validate_operations_task_update();

-- ==============================================================================
-- 12. CUSTOMER SUPPORT TICKETS (Internal Support Queue)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.customer_support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_number VARCHAR(50) NOT NULL UNIQUE,
    customer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20),
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('order_status', 'return_refund', 'product_quality', 'payment_issue', 'delivery_delay', 'general')),
    priority VARCHAR(30) DEFAULT 'medium' NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(50) DEFAULT 'open' NOT NULL CHECK (status IN ('open', 'assigned', 'in_progress', 'waiting_customer', 'resolved', 'closed')),
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    assigned_to UUID REFERENCES auth.users(id),
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Customer support ticket field protection trigger
CREATE OR REPLACE FUNCTION public.validate_support_ticket_mutation()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    -- Support executives can only update resolution_notes and status
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

DROP TRIGGER IF EXISTS trg_validate_support_ticket_mutation ON public.customer_support_tickets;
CREATE TRIGGER trg_validate_support_ticket_mutation
BEFORE UPDATE ON public.customer_support_tickets
FOR EACH ROW EXECUTE FUNCTION public.validate_support_ticket_mutation();

-- ==============================================================================
-- 13. INTERNAL COMPANY ANNOUNCEMENTS (Operations Bulletin)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.internal_announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    target_scope VARCHAR(50) DEFAULT 'company_wide' NOT NULL CHECK (target_scope IN ('company_wide', 'department', 'management_only')),
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    priority VARCHAR(30) DEFAULT 'normal' NOT NULL CHECK (priority IN ('normal', 'important', 'urgent')),
    author_id UUID NOT NULL REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==============================================================================
-- 14. NOTIFICATION CAMPAIGN QUEUE & DELIVERY LOGS (Central Service)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notification_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES public.media_campaigns(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    action_url TEXT,
    target_audience VARCHAR(50) DEFAULT 'all' NOT NULL CHECK (target_audience IN ('all', 'customers', 'sellers')),
    status VARCHAR(50) DEFAULT 'draft' NOT NULL CHECK (status IN ('draft', 'pending_approval', 'approved', 'queued', 'dispatched', 'failed')),
    scheduled_at TIMESTAMPTZ,
    dispatched_at TIMESTAMPTZ,
    total_targeted INT DEFAULT 0,
    total_delivered INT DEFAULT 0,
    total_suppressed INT DEFAULT 0,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    approved_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.notification_suppression_list (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255),
    phone_number VARCHAR(20),
    suppression_type VARCHAR(50) DEFAULT 'marketing_opt_out' NOT NULL CHECK (suppression_type IN ('marketing_opt_out', 'bounce', 'complaint', 'dnd_statutory')),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enforce normalization and deduplication on suppression list
CREATE UNIQUE INDEX IF NOT EXISTS uq_suppression_normalized_email
ON public.notification_suppression_list (LOWER(TRIM(email)), suppression_type)
WHERE email IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_suppression_normalized_phone
ON public.notification_suppression_list (TRIM(phone_number), suppression_type)
WHERE phone_number IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.notification_delivery_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_campaign_id UUID REFERENCES public.notification_campaigns(id) ON DELETE SET NULL,
    recipient_identifier VARCHAR(255) NOT NULL,
    channel VARCHAR(50) NOT NULL CHECK (channel IN ('push', 'email', 'sms', 'in_app')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('delivered', 'failed', 'suppressed', 'retrying')),
    error_message TEXT,
    dispatched_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- ==============================================================================
-- 15. ENTERPRISE AUDIT LOGS (Cross-Panel Forensic Tracking)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.enterprise_audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_email VARCHAR(255),
    app_source VARCHAR(50) NOT NULL CHECK (app_source IN ('media', 'operations', 'superadmin', 'api')),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id VARCHAR(100),
    ip_address VARCHAR(100),
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Immutable Append-Only Enforcement Trigger
CREATE OR REPLACE FUNCTION public.prevent_audit_log_mutation()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Security Violation: Forensic audit logs and delivery logs are immutable append-only records. UPDATE, DELETE, and TRUNCATE are strictly prohibited.';
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

-- ==============================================================================
-- 16. PERFORMANCE & FOREIGN KEY INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_employee_profiles_user ON public.employee_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_profiles_dept ON public.employee_profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_user_app_memberships_user ON public.user_app_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_app_memberships_app ON public.user_app_memberships(app_name);
CREATE INDEX IF NOT EXISTS idx_employee_invitations_token ON public.employee_invitations(token_hash);
CREATE INDEX IF NOT EXISTS idx_media_campaigns_status ON public.media_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON public.social_posts(status);
CREATE INDEX IF NOT EXISTS idx_media_tasks_assigned ON public.media_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_operations_tasks_assigned ON public.operations_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_customer_support_tickets_status ON public.customer_support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_customer_support_tickets_customer ON public.customer_support_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_support_tickets_assigned ON public.customer_support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_notification_campaigns_status ON public.notification_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_enterprise_audit_actor ON public.enterprise_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_audit_created ON public.enterprise_audit_logs(created_at DESC);

-- ==============================================================================
-- 17. DATABASE PRIVILEGES (Least-Privilege Role Hardening)
-- ==============================================================================

-- Revoke default public/anon privileges
REVOKE ALL ON TABLE public.departments FROM public, anon;
REVOKE ALL ON TABLE public.employee_profiles FROM public, anon;
REVOKE ALL ON TABLE public.user_app_memberships FROM public, anon;
REVOKE ALL ON TABLE public.founder_bootstrap_vault FROM public, anon, authenticated;
REVOKE ALL ON TABLE public.employee_invitations FROM public, anon;
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
REVOKE ALL ON TABLE public.enterprise_audit_logs FROM public, anon;

-- Grant Service Role full management
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

-- Grant selective privileges to Authenticated users
GRANT SELECT ON TABLE public.departments TO authenticated, anon;
GRANT SELECT ON TABLE public.employee_profiles TO authenticated;
GRANT SELECT ON TABLE public.user_app_memberships TO authenticated;
GRANT SELECT ON TABLE public.employee_invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.media_campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.creative_assets TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.social_posts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.media_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.operations_tasks TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.customer_support_tickets TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.internal_announcements TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.notification_campaigns TO authenticated;
GRANT SELECT ON TABLE public.enterprise_audit_logs TO authenticated;

-- ==============================================================================
-- 18. ROW LEVEL SECURITY (RLS) POLICIES — NON-RECURSIVE & APPLICATION-AWARE
-- ==============================================================================
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_app_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.founder_bootstrap_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creative_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operations_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_suppression_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_delivery_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enterprise_audit_logs ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- A. Service Role Master Bypass Policies
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Service role manages departments" ON public.departments;
CREATE POLICY "Service role manages departments" ON public.departments FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages employee_profiles" ON public.employee_profiles;
CREATE POLICY "Service role manages employee_profiles" ON public.employee_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages user_app_memberships" ON public.user_app_memberships;
CREATE POLICY "Service role manages user_app_memberships" ON public.user_app_memberships FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages founder_bootstrap_vault" ON public.founder_bootstrap_vault;
CREATE POLICY "Service role manages founder_bootstrap_vault" ON public.founder_bootstrap_vault FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages employee_invitations" ON public.employee_invitations;
CREATE POLICY "Service role manages employee_invitations" ON public.employee_invitations FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages media_campaigns" ON public.media_campaigns;
CREATE POLICY "Service role manages media_campaigns" ON public.media_campaigns FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages creative_assets" ON public.creative_assets;
CREATE POLICY "Service role manages creative_assets" ON public.creative_assets FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages social_posts" ON public.social_posts;
CREATE POLICY "Service role manages social_posts" ON public.social_posts FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages media_tasks" ON public.media_tasks;
CREATE POLICY "Service role manages media_tasks" ON public.media_tasks FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages operations_tasks" ON public.operations_tasks;
CREATE POLICY "Service role manages operations_tasks" ON public.operations_tasks FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages customer_support_tickets" ON public.customer_support_tickets;
CREATE POLICY "Service role manages customer_support_tickets" ON public.customer_support_tickets FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages internal_announcements" ON public.internal_announcements;
CREATE POLICY "Service role manages internal_announcements" ON public.internal_announcements FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages notification_campaigns" ON public.notification_campaigns;
CREATE POLICY "Service role manages notification_campaigns" ON public.notification_campaigns FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages notification_suppression_list" ON public.notification_suppression_list;
CREATE POLICY "Service role manages notification_suppression_list" ON public.notification_suppression_list FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages notification_delivery_audit_logs" ON public.notification_delivery_audit_logs;
CREATE POLICY "Service role manages notification_delivery_audit_logs" ON public.notification_delivery_audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages enterprise_audit_logs" ON public.enterprise_audit_logs;
CREATE POLICY "Service role manages enterprise_audit_logs" ON public.enterprise_audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- B. Granular Role-Based Access Control Policies
-- ------------------------------------------------------------------------------

-- 1. Departments: Active departments viewable
DROP POLICY IF EXISTS "Public read active departments" ON public.departments;
CREATE POLICY "Public read active departments" ON public.departments
FOR SELECT TO authenticated, anon
USING (is_active = TRUE);

-- 2. Employee Profiles: Employee views own record; HR Manager & Owner view all
DROP POLICY IF EXISTS "Employee views own profile" ON public.employee_profiles;
CREATE POLICY "Employee views own profile" ON public.employee_profiles
FOR SELECT TO authenticated
USING (
    user_id = auth.uid()
    OR public.check_user_has_app_membership('operations', ARRAY['OWNER', 'HR Manager'])
);

-- 3. User App Memberships: Self views own memberships; Owner views all
DROP POLICY IF EXISTS "User views own memberships" ON public.user_app_memberships;
CREATE POLICY "User views own memberships" ON public.user_app_memberships
FOR SELECT TO authenticated
USING (
    user_id = auth.uid()
    OR public.check_is_enterprise_owner()
);

-- 4. Founder Bootstrap Vault: 0 CLIENT ACCESS
-- (Exclusively accessed by backend through service_role or consume_founder_bootstrap_token)

-- 5. Employee Invitations: Accessible only to HR Manager or Owner
DROP POLICY IF EXISTS "HR views invitations" ON public.employee_invitations;
CREATE POLICY "HR views invitations" ON public.employee_invitations
FOR SELECT TO authenticated
USING (
    public.check_user_has_app_membership('operations', ARRAY['OWNER', 'HR Manager'])
    OR public.check_is_enterprise_owner()
);

-- 6. Media Campaigns: Restricted strictly to Media team members
DROP POLICY IF EXISTS "Media members view campaigns" ON public.media_campaigns;
CREATE POLICY "Media members view campaigns" ON public.media_campaigns
FOR SELECT TO authenticated
USING (
    public.check_user_has_app_membership('media')
);

DROP POLICY IF EXISTS "Media managers create campaigns" ON public.media_campaigns;
CREATE POLICY "Media managers create campaigns" ON public.media_campaigns
FOR INSERT TO authenticated
WITH CHECK (
    created_by = auth.uid()
    AND public.check_user_has_app_membership('media', ARRAY['OWNER', 'Media Admin', 'Ads Manager'])
);

DROP POLICY IF EXISTS "Media admins update campaigns" ON public.media_campaigns;
CREATE POLICY "Media admins update campaigns" ON public.media_campaigns
FOR UPDATE TO authenticated
USING (
    public.check_user_has_app_membership('media', ARRAY['OWNER', 'Media Admin', 'Ads Manager'])
)
WITH CHECK (
    public.check_user_has_app_membership('media', ARRAY['OWNER', 'Media Admin', 'Ads Manager'])
);

-- 7. Creative Assets: Media team access only
DROP POLICY IF EXISTS "Media members view creative assets" ON public.creative_assets;
CREATE POLICY "Media members view creative assets" ON public.creative_assets
FOR SELECT TO authenticated
USING (
    public.check_user_has_app_membership('media')
);

DROP POLICY IF EXISTS "Media designers upload assets" ON public.creative_assets;
CREATE POLICY "Media designers upload assets" ON public.creative_assets
FOR INSERT TO authenticated
WITH CHECK (
    uploaded_by = auth.uid()
    AND public.check_user_has_app_membership('media', ARRAY['OWNER', 'Media Admin', 'Graphic Designer', 'Video Editor', 'Ads Manager'])
);

DROP POLICY IF EXISTS "Media designers update own assets" ON public.creative_assets;
CREATE POLICY "Media designers update own assets" ON public.creative_assets
FOR UPDATE TO authenticated
USING (
    uploaded_by = auth.uid()
    OR public.check_is_app_manager('media')
)
WITH CHECK (
    uploaded_by = auth.uid()
    OR public.check_is_app_manager('media')
);

-- 8. Social Posts: Content & Social Media Managers
DROP POLICY IF EXISTS "Media members view social posts" ON public.social_posts;
CREATE POLICY "Media members view social posts" ON public.social_posts
FOR SELECT TO authenticated
USING (
    public.check_user_has_app_membership('media')
);

DROP POLICY IF EXISTS "Social managers create posts" ON public.social_posts;
CREATE POLICY "Social managers create posts" ON public.social_posts
FOR INSERT TO authenticated
WITH CHECK (
    created_by = auth.uid()
    AND public.check_user_has_app_membership('media', ARRAY['OWNER', 'Media Admin', 'Social Media Manager', 'Content Writer'])
);

DROP POLICY IF EXISTS "Social managers update posts" ON public.social_posts;
CREATE POLICY "Social managers update posts" ON public.social_posts
FOR UPDATE TO authenticated
USING (
    created_by = auth.uid()
    OR public.check_is_app_manager('media')
)
WITH CHECK (
    created_by = auth.uid()
    OR public.check_is_app_manager('media')
);

-- 9. Media Tasks: Assigned employee or Media Admin
DROP POLICY IF EXISTS "Media staff view assigned tasks" ON public.media_tasks;
CREATE POLICY "Media staff view assigned tasks" ON public.media_tasks
FOR SELECT TO authenticated
USING (
    public.check_user_has_app_membership('media')
    AND (
        assigned_to = auth.uid()
        OR created_by = auth.uid()
        OR public.check_is_app_manager('media')
    )
);

DROP POLICY IF EXISTS "Media admins create tasks" ON public.media_tasks;
CREATE POLICY "Media admins create tasks" ON public.media_tasks
FOR INSERT TO authenticated
WITH CHECK (
    created_by = auth.uid()
    AND public.check_is_app_manager('media')
);

DROP POLICY IF EXISTS "Media staff update assigned tasks" ON public.media_tasks;
CREATE POLICY "Media staff update assigned tasks" ON public.media_tasks
FOR UPDATE TO authenticated
USING (
    public.check_user_has_app_membership('media')
    AND (
        assigned_to = auth.uid()
        OR public.check_is_app_manager('media')
    )
)
WITH CHECK (
    public.check_user_has_app_membership('media')
    AND (
        assigned_to = auth.uid()
        OR public.check_is_app_manager('media')
    )
);

-- 10. Operations Tasks: Department members or Operations Manager
DROP POLICY IF EXISTS "Ops staff view department tasks" ON public.operations_tasks;
CREATE POLICY "Ops staff view department tasks" ON public.operations_tasks
FOR SELECT TO authenticated
USING (
    public.check_user_has_app_membership('operations')
    AND (
        assigned_to = auth.uid()
        OR created_by = auth.uid()
        OR department_id = public.get_auth_employee_dept_id()
        OR public.check_is_app_manager('operations')
    )
);

DROP POLICY IF EXISTS "Ops managers create tasks" ON public.operations_tasks;
CREATE POLICY "Ops managers create tasks" ON public.operations_tasks
FOR INSERT TO authenticated
WITH CHECK (
    created_by = auth.uid()
    AND (
        public.check_is_app_manager('operations')
        OR department_id = public.get_auth_employee_dept_id()
    )
);

DROP POLICY IF EXISTS "Ops staff update assigned tasks" ON public.operations_tasks;
CREATE POLICY "Ops staff update assigned tasks" ON public.operations_tasks
FOR UPDATE TO authenticated
USING (
    public.check_user_has_app_membership('operations')
    AND (
        assigned_to = auth.uid()
        OR public.check_is_app_manager('operations')
    )
)
WITH CHECK (
    public.check_user_has_app_membership('operations')
    AND (
        assigned_to = auth.uid()
        OR public.check_is_app_manager('operations')
    )
);

-- 11. Customer Support Tickets: Customer self; Support exec assigned; Support Manager all
DROP POLICY IF EXISTS "Customer and support view tickets" ON public.customer_support_tickets;
CREATE POLICY "Customer and support view tickets" ON public.customer_support_tickets
FOR SELECT TO authenticated
USING (
    customer_id = auth.uid()
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
    public.check_user_has_app_membership('operations')
    AND (
        assigned_to = auth.uid()
        OR public.check_is_app_manager('operations')
    )
)
WITH CHECK (
    public.check_user_has_app_membership('operations')
    AND (
        assigned_to = auth.uid()
        OR public.check_is_app_manager('operations')
    )
);

-- 12. Internal Announcements: Precise scope evaluation
DROP POLICY IF EXISTS "Scoped announcements visibility" ON public.internal_announcements;
CREATE POLICY "Scoped announcements visibility" ON public.internal_announcements
FOR SELECT TO authenticated
USING (
    is_active = TRUE
    AND public.is_active_employee()
    AND (
        target_scope = 'company_wide'
        OR (target_scope = 'department' AND department_id = public.get_auth_employee_dept_id())
        OR (target_scope = 'management_only' AND public.check_is_app_manager('operations'))
    )
);

DROP POLICY IF EXISTS "Management creates announcements" ON public.internal_announcements;
CREATE POLICY "Management creates announcements" ON public.internal_announcements
FOR INSERT TO authenticated
WITH CHECK (
    author_id = auth.uid()
    AND public.check_is_app_manager('operations')
);

DROP POLICY IF EXISTS "Management updates announcements" ON public.internal_announcements;
CREATE POLICY "Management updates announcements" ON public.internal_announcements
FOR UPDATE TO authenticated
USING (
    author_id = auth.uid()
    OR public.check_is_enterprise_owner()
)
WITH CHECK (
    author_id = auth.uid()
    OR public.check_is_enterprise_owner()
);

-- 13. Notification Campaigns: Accessible only to Media Admin and Owner
DROP POLICY IF EXISTS "Media Admin views notification campaigns" ON public.notification_campaigns;
CREATE POLICY "Media Admin views notification campaigns" ON public.notification_campaigns
FOR SELECT TO authenticated
USING (
    public.check_is_app_manager('media')
);

DROP POLICY IF EXISTS "Media Admin creates notification campaigns" ON public.notification_campaigns;
CREATE POLICY "Media Admin creates notification campaigns" ON public.notification_campaigns
FOR INSERT TO authenticated
WITH CHECK (
    created_by = auth.uid()
    AND public.check_is_app_manager('media')
);

-- 14. Enterprise Audit Logs: Readable only by Owner (Zero Client Mutation)
DROP POLICY IF EXISTS "Owner reads enterprise audit logs" ON public.enterprise_audit_logs;
CREATE POLICY "Owner reads enterprise audit logs" ON public.enterprise_audit_logs
FOR SELECT TO authenticated
USING (
    public.check_is_enterprise_owner()
);

COMMIT;
