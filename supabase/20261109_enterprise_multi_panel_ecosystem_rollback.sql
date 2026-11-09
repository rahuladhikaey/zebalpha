-- ==============================================================================
-- ZEBALPHA ENTERPRISE MULTI-PANEL ECOSYSTEM ROLLBACK (HARDENED REVISION)
-- Script: 20261109_enterprise_multi_panel_ecosystem_rollback.sql
-- Execution: Explicit Transaction Block (BEGIN ... COMMIT)
-- Safety: Removes ONLY objects created in 20261109 expansion. Zero marketplace impact.
-- ==============================================================================

BEGIN;

-- 1. DROP AUDIT & TAMPER TRIGGERS
DROP TRIGGER IF EXISTS trg_prevent_audit_log_mutation ON public.enterprise_audit_logs;
DROP TRIGGER IF EXISTS trg_prevent_audit_log_truncate ON public.enterprise_audit_logs;
DROP TRIGGER IF EXISTS trg_prevent_delivery_log_mutation ON public.notification_delivery_audit_logs;
DROP TRIGGER IF EXISTS trg_prevent_delivery_log_truncate ON public.notification_delivery_audit_logs;
DROP TRIGGER IF EXISTS trg_prevent_bootstrap_unlock ON public.founder_bootstrap_vault;
DROP TRIGGER IF EXISTS trg_prevent_bootstrap_delete ON public.founder_bootstrap_vault;

-- 2. DROP DEDICATED AUDIT & SECURITY FUNCTIONS
DROP FUNCTION IF EXISTS public.prevent_audit_log_mutation();
DROP FUNCTION IF EXISTS public.prevent_bootstrap_vault_unlock();
DROP FUNCTION IF EXISTS public.prevent_bootstrap_vault_deletion();
DROP FUNCTION IF EXISTS public.check_is_enterprise_owner();
DROP FUNCTION IF EXISTS public.check_user_has_app_membership(text, text[]);
DROP FUNCTION IF EXISTS public.get_auth_employee_dept_id();
DROP FUNCTION IF EXISTS public.check_is_management_role();

-- 3. DROP NEWLY CREATED TABLES IN REVERSE DEPENDENCY ORDER
DROP TABLE IF EXISTS public.enterprise_audit_logs;
DROP TABLE IF EXISTS public.notification_delivery_audit_logs;
DROP TABLE IF EXISTS public.notification_suppression_list;
DROP TABLE IF EXISTS public.notification_campaigns;
DROP TABLE IF EXISTS public.internal_announcements;
DROP TABLE IF EXISTS public.customer_support_tickets;
DROP TABLE IF EXISTS public.operations_tasks;
DROP TABLE IF EXISTS public.media_tasks;
DROP TABLE IF EXISTS public.social_posts;
DROP TABLE IF EXISTS public.creative_assets;
DROP TABLE IF EXISTS public.media_campaigns;
DROP TABLE IF EXISTS public.employee_invitations;
DROP TABLE IF EXISTS public.founder_bootstrap_vault;
DROP TABLE IF EXISTS public.user_app_memberships;
DROP TABLE IF EXISTS public.employee_profiles;
DROP TABLE IF EXISTS public.departments;

COMMIT;
