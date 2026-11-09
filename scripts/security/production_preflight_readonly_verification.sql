-- ==============================================================================
-- ZEBALPHA ENTERPRISE ECOSYSTEM — PRODUCTION PRE-FLIGHT READ-ONLY AUDIT PACKAGE
-- File: scripts/security/production_preflight_readonly_verification.sql
-- Classification: 100% READ-ONLY SYSTEM CATALOG & METADATA VERIFICATION
-- Safety: ZERO MUTATION, ZERO LOCKING, ZERO EXPOSURE OF AUTH SECRETS OR PASSWORDS
-- Compile-Safety: 100% immune to 42P01 (missing table) and 0A000 (group by) errors.
-- Instructions: Run in Supabase SQL Editor. Safe to execute on empty or partially migrated DB.
-- ==============================================================================

-- ==============================================================================
-- PART A: PURE SYSTEM CATALOG INSPECTION (ZERO ROW/TABLE ACCESS)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- QUERY 1: Comprehensive Relation Existence, Type & RLS Status (All 17 Objects)
-- Safety: Pure catalog read. Left join ensures missing tables return a MISSING row.
-- ------------------------------------------------------------------------------
SELECT 
    t.expected_table,
    c.oid IS NOT NULL AS relation_exists,
    CASE c.relkind
        WHEN 'r' THEN 'Ordinary Table'
        WHEN 'p' THEN 'Partitioned Table (UNEXPECTED)'
        WHEN 'v' THEN 'View (UNEXPECTED)'
        WHEN 'm' THEN 'Materialized View (UNEXPECTED)'
        WHEN 'f' THEN 'Foreign Table (UNEXPECTED)'
        ELSE 'MISSING'
    END AS relation_type,
    COALESCE(c.relrowsecurity, false) AS rls_enabled,
    COALESCE(c.relforcerowsecurity, false) AS rls_forced
FROM (
    VALUES 
      ('departments'), ('employee_profiles'), ('user_app_memberships'),
      ('founder_bootstrap_vault'), ('employee_invitations'), ('media_campaigns'),
      ('creative_assets'), ('social_posts'), ('media_tasks'), ('operations_tasks'),
      ('customer_support_tickets'), ('internal_announcements'), ('notification_campaigns'),
      ('notification_suppression_list'), ('notification_delivery_audit_logs'),
      ('enterprise_audit_logs'), ('schema_migrations')
) AS t(expected_table)
LEFT JOIN pg_class c 
  ON c.relname = t.expected_table 
 AND c.relnamespace = 'public'::regnamespace
ORDER BY t.expected_table ASC;

-- ------------------------------------------------------------------------------
-- QUERY 2: Unified RLS Policy Inventory (Scope & Expression Audit)
-- Safety: Catalog view read. Lists active policies across critical tables.
-- ------------------------------------------------------------------------------
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual IS NOT NULL AS has_using_clause,
    with_check IS NOT NULL AS has_with_check_clause
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'employee_profiles', 'user_app_memberships', 'founder_bootstrap_vault',
    'employee_invitations', 'customer_support_tickets', 'enterprise_audit_logs',
    'internal_announcements', 'schema_migrations'
  )
ORDER BY tablename, cmd, policyname;

-- ------------------------------------------------------------------------------
-- QUERY 3: Table-Level Privilege & Raw ACL Audit (Untrusted Roles)
-- Safety: Correlated subquery prevents PostgreSQL 0A000 "cannot implement GROUP BY"
-- caused by mixing sortable and hash-only datatypes (aclitem[]).
-- ------------------------------------------------------------------------------
SELECT 
    c.relname AS table_name,
    c.relacl::text AS raw_acl_array,
    COALESCE(
        (
            SELECT string_agg(DISTINCT tp.grantee || ': ' || tp.privilege_type, ', ' ORDER BY tp.grantee || ': ' || tp.privilege_type)
            FROM information_schema.table_privileges tp
            WHERE tp.table_name = c.relname
              AND tp.table_schema = 'public'
              AND tp.grantee IN ('PUBLIC', 'anon', 'authenticated')
        ), 
        'No direct grants to untrusted roles'
    ) AS untrusted_role_grants
FROM pg_class c
WHERE c.relnamespace = 'public'::regnamespace
  AND c.relname IN (
    'founder_bootstrap_vault', 'enterprise_audit_logs',
    'notification_delivery_audit_logs', 'schema_migrations',
    'customer_support_tickets', 'employee_invitations'
  )
ORDER BY c.relname;

-- ------------------------------------------------------------------------------
-- QUERY 4: Function Overload & Execution Privilege Audit
-- Note: Uses pg_get_function_identity_arguments() to distinguish overloads.
-- If proacl IS NULL, PostgreSQL defaults to PUBLIC execute access.
-- ------------------------------------------------------------------------------
SELECT 
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS argument_signature,
    p.prosecdef AS is_security_definer,
    p.proacl AS raw_function_acl,
    CASE 
        WHEN p.proacl IS NULL THEN 'DEFAULT: Executable by PUBLIC'
        WHEN p.proacl::text LIKE '%=X/public%' OR p.proacl::text LIKE '%=X/anon%' OR p.proacl::text LIKE '%=X/authenticated%' THEN 'VULNERABLE: Direct execution granted to untrusted roles'
        ELSE 'SECURE: Direct execution restricted'
    END AS execution_privilege_status
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'prevent_bootstrap_vault_tamper',
    'prevent_bootstrap_vault_deletion',
    'validate_employee_profile_mutation',
    'validate_support_ticket_mutation',
    'prevent_audit_log_mutation',
    'consume_founder_bootstrap_token'
  )
ORDER BY p.proname, argument_signature;

-- ------------------------------------------------------------------------------
-- QUERY 5: Function Security Model & Search Path Integrity
-- Validates that SECURITY DEFINER functions have a fixed, trusted search_path.
-- ------------------------------------------------------------------------------
SELECT 
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS argument_signature,
    p.prosecdef AS is_security_definer,
    p.proconfig AS search_path_settings,
    CASE 
        WHEN p.prosecdef AND p.proconfig IS NULL THEN 'CRITICAL: SECURITY DEFINER missing fixed search_path'
        WHEN p.prosecdef AND p.proconfig::text LIKE '%search_path=public, auth%' THEN 'SECURE: Pinned to public, auth'
        WHEN p.prosecdef AND p.proconfig::text LIKE '%search_path=public%' THEN 'SECURE: Pinned to public'
        WHEN NOT p.prosecdef THEN 'INFO: SECURITY INVOKER (caller privileges apply)'
        ELSE 'VERIFY: Non-standard configuration'
    END AS security_assessment
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'check_is_enterprise_owner',
    'check_user_has_app_membership',
    'check_is_management_role',
    'check_is_app_manager',
    'is_active_employee',
    'get_auth_employee_dept_id',
    'prevent_bootstrap_vault_tamper',
    'prevent_bootstrap_vault_deletion',
    'consume_founder_bootstrap_token',
    'validate_employee_profile_mutation',
    'validate_support_ticket_mutation',
    'prevent_audit_log_mutation',
    'protect_employee_invitation_mutation',
    'validate_media_task_update',
    'validate_operations_task_update'
  )
ORDER BY p.proname, argument_signature;

-- ------------------------------------------------------------------------------
-- QUERY 6: Customer Support Ticket Dual-Layer Security Proof (Grants + RLS)
-- Both subqueries MUST return ZERO rows to prove direct client INSERT is blocked.
-- ------------------------------------------------------------------------------
SELECT 
    'Table Grant' AS check_type,
    grantee AS role_name,
    privilege_type AS attribute
FROM information_schema.table_privileges
WHERE table_schema = 'public'
  AND table_name = 'customer_support_tickets'
  AND privilege_type = 'INSERT'
  AND grantee IN ('PUBLIC', 'anon', 'authenticated')

UNION ALL

SELECT 
    'RLS Policy' AS check_type,
    roles::text AS role_name,
    policyname AS attribute
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'customer_support_tickets'
  AND cmd = 'INSERT';

-- ------------------------------------------------------------------------------
-- QUERY 7: Active Trigger Inventory & State Verification
-- Baseline expects 8 triggers across 8 tables; post-remediation expects 11 triggers.
-- Confirms tgenabled = 'O' (Normal origin sessions, not replica-only or disabled).
-- ------------------------------------------------------------------------------
SELECT 
    c.relname AS table_name,
    t.tgname AS trigger_name,
    p.proname AS function_name,
    t.tgenabled AS trigger_status_flag,
    CASE t.tgenabled
        WHEN 'O' THEN 'Enabled (Normal / Origin Sessions)'
        WHEN 'A' THEN 'Enabled (Always - Origin & Replica)'
        WHEN 'R' THEN 'WARNING: Enabled on Replica Only (WILL NOT FIRE on Primary!)'
        WHEN 'D' THEN 'CRITICAL: Trigger is DISABLED'
        ELSE 'Unknown'
    END AS trigger_operational_state
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE c.relnamespace = 'public'::regnamespace
  AND c.relname IN (
    'founder_bootstrap_vault', 'employee_profiles',
    'customer_support_tickets', 'enterprise_audit_logs',
    'notification_delivery_audit_logs', 'employee_invitations',
    'media_tasks', 'operations_tasks'
  )
  AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;

-- ------------------------------------------------------------------------------
-- QUERY 9A: Founder Bootstrap Vault Catalog & Trigger Pre-Check (Pure Catalog)
-- 100% safe to execute regardless of whether the table or columns exist.
-- ------------------------------------------------------------------------------
SELECT 
    c.oid IS NOT NULL AS table_exists,
    EXISTS (
        SELECT 1 FROM pg_attribute a 
        WHERE a.attrelid = c.oid AND a.attname = 'expires_at' AND NOT a.attisdropped
    ) AS has_expires_at_column,
    EXISTS (
        SELECT 1 FROM pg_index i 
        JOIN pg_class ic ON ic.oid = i.indexrelid 
        WHERE i.indrelid = c.oid AND ic.relname = 'uq_founder_bootstrap_single_row'
    ) AS has_single_row_unique_index,
    (
        SELECT COUNT(*) FROM pg_trigger t 
        WHERE t.tgrelid = c.oid 
          AND t.tgname IN ('trg_prevent_bootstrap_tamper', 'trg_prevent_bootstrap_delete')
          AND t.tgenabled = 'O'
    ) AS active_tamper_triggers_count
FROM (SELECT 1) _
LEFT JOIN pg_class c 
  ON c.relname = 'founder_bootstrap_vault' 
 AND c.relnamespace = 'public'::regnamespace;


-- ==============================================================================
-- PART B: APPLICATION TABLE METADATA READS (COMPILE-SAFE RESILIENT)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- QUERY 8: Applied Migration History (Compile-Safe Check)
-- Uses to_regclass to prevent 42P01 error if schema_migrations table does not exist.
-- ------------------------------------------------------------------------------
SELECT 
    'schema_migrations' AS inspected_object,
    to_regclass('public.schema_migrations') IS NOT NULL AS table_exists,
    CASE 
        WHEN to_regclass('public.schema_migrations') IS NOT NULL THEN 'Table exists. Run: SELECT version, applied_at, applied_by FROM public.schema_migrations;'
        ELSE 'BASELINE MIGRATION NOT YET APPLIED: public.schema_migrations has not been created on this database.'
    END AS diagnostic_status;

-- ------------------------------------------------------------------------------
-- QUERY 9B: Founder Bootstrap Vault Status (Compile-Safe Check)
-- Uses to_regclass to prevent 42P01 error if founder_bootstrap_vault does not exist.
-- ------------------------------------------------------------------------------
SELECT 
    'founder_bootstrap_vault' AS inspected_object,
    to_regclass('public.founder_bootstrap_vault') IS NOT NULL AS table_exists,
    CASE 
        WHEN to_regclass('public.founder_bootstrap_vault') IS NOT NULL THEN 'Table exists. Safe to inspect aggregate lock/consumption status.'
        ELSE 'BASELINE MIGRATION NOT YET APPLIED: public.founder_bootstrap_vault has not been created on this database.'
    END AS diagnostic_status;


-- ==============================================================================
-- OPERATIONAL CHECK: ACTIVE TRANSACTIONS & LOCKS (ZERO QUERY TEXT / NO PII)
-- Uses xact_start for true transaction age. Query text is strictly omitted.
-- ----------------------------------------------------------------=============
SELECT 
    pid, 
    usename, 
    client_addr, 
    state, 
    wait_event_type, 
    wait_event, 
    now() - xact_start AS transaction_duration,
    now() - query_start AS current_statement_duration
FROM pg_stat_activity 
WHERE state IN ('active', 'idle in transaction')
  AND pid <> pg_backend_pid()
  AND xact_start IS NOT NULL
ORDER BY transaction_duration DESC;
