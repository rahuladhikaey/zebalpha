# ZEBALPHA — PRODUCTION ROLLBACK READINESS SPECIFICATION & DR PROTOCOL

**Document Version:** 1.0.0 (Forensic & Architectural Audit)  
**File Under Review:** `supabase/20261109_enterprise_multi_panel_security_remediation_rollback.sql`  
**Git Baseline Commit:** `b604e9e9d352bdf0d7328055eb5216c020ab991c`  
**Target Environment:** Production Supabase Database  
**Author:** Senior Enterprise Security Architect & Database Security Engineer  
**Classification:** HIGH-SECURITY DISASTER RECOVERY PROTOCOL  
**Status:** COMPLETE / OPERATIONAL DR ARTIFACT  

---

## 1. Executive Summary & Rollback Objectives

This document establishes the verified disaster recovery rollback protocol for the ZebAlpha enterprise database in the event that the security remediation migration (`supabase/20261109_enterprise_multi_panel_security_remediation.sql`) encounters unforeseen, business-halting issues during production execution.

### Fundamental Rollback Principles:
1. **Emergency Disaster Recovery Only:** Rollback is an emergency recovery tool to restore system availability; it is NOT a secure permanent operating state.
2. **Zero Business Data Deletion:** The rollback script does NOT delete, truncate, or overwrite application business records, customer orders, seller inventory, audit trails, or employee memberships.
3. **Verified Asymmetric Schema Retention:** Certain low-risk structural additions (`expires_at` column and `uq_founder_bootstrap_single_row` index) are intentionally retained to avoid heavy `ACCESS EXCLUSIVE` table-lock disruption.
4. **Founder/DBA Gated Execution:** Rollback may ONLY be initiated with explicit written authorization from the Founder and lead DBA.

---

## 2. Comprehensive Inventory of Rollback Operations

### 2.1 Restored Objects & Baseline Definitions
The rollback script reverts database functions and configurations to their verified pre-remediation baseline (`supabase/20261109_enterprise_multi_panel_ecosystem_migration.sql`):

| Object Name | Type | Baseline State Restored |
| :--- | :--- | :--- |
| `check_is_enterprise_owner()` | Function | Restores baseline logic checking `role = 'OWNER'` without requiring `app_name = 'all'`. Pinned search path maintained (`public, auth`). |
| `check_user_has_app_membership(text, text[])` | Function | Restores baseline logic permitting `app_name = 'all'` or `role = 'OWNER'` globally. Pinned search path maintained. |
| `check_is_app_manager(text)` | Function | Restores baseline role resolution across media, operations, and superadmin domains. Pinned search path maintained. |
| `consume_founder_bootstrap_token(VARCHAR, VARCHAR, VARCHAR)` | Function | Restores baseline 3-argument signature (`p_email`, `p_token_hash`, `p_ip`) without inline user provisioning. |
| `validate_support_ticket_mutation()` | Trigger Function | Restores baseline trigger logic checking `check_is_app_manager('operations')`. |
| Table Privileges (`enterprise_audit_logs`) | ACL | Restores baseline `GRANT SELECT ON TABLE public.enterprise_audit_logs TO authenticated;`. |
| Table Privileges (`employee_invitations`) | ACL | Restores baseline `GRANT SELECT ON TABLE public.employee_invitations TO authenticated;`. |
| `schema_migrations` Table State | Table / ACL / RLS | Drops policy `"Service role manages schema_migrations"`, **disables RLS**, revokes all privileges from untrusted roles, and grants `ALL` to `service_role`. Matches verified pre-remediation baseline. |
| Baseline Function ACLs | Execution Grants | Restores `GRANT EXECUTE ... TO PUBLIC` on baseline trigger functions (`prevent_bootstrap_vault_tamper`, `prevent_bootstrap_vault_deletion`, `validate_support_ticket_mutation`, `prevent_audit_log_mutation`). |

---

### 2.2 Dropped Remediation Objects & Policies
Remediation-specific additions that did not exist in the baseline are cleanly removed:

| Object Name | Type | Action Taken | Rationale |
| :--- | :--- | :--- | :--- |
| `consume_founder_bootstrap_token(VARCHAR, VARCHAR, VARCHAR, UUID)` | Function | `DROP FUNCTION IF EXISTS` | Cleans up the 4-argument signature introduced in the remediation patch. |
| `trg_validate_employee_profile_mutation` | Trigger | `DROP TRIGGER IF EXISTS` | Removes the trigger guarding employee profile mutations. |
| `validate_employee_profile_mutation()` | Function | `DROP FUNCTION IF EXISTS` | Drops the trigger function itself (did not exist in baseline). |
| `trg_prevent_audit_log_truncate` | Trigger | `DROP TRIGGER IF EXISTS` | Drops remediation truncate trigger on `enterprise_audit_logs`. |
| `trg_prevent_delivery_log_truncate` | Trigger | `DROP TRIGGER IF EXISTS` | Drops remediation truncate trigger on `notification_delivery_audit_logs`. |
| `"Customers create support tickets"` | RLS Policy | `DROP POLICY IF EXISTS` | Ensures direct client insert remains purged (support tickets remain backend-only). |
| `"Employee updates own profile contact"` | RLS Policy | `DROP POLICY IF EXISTS` | Reverts to baseline policy set. |
| Migration Registry Row | Data | `DELETE FROM public.schema_migrations WHERE version = '20261109_enterprise_multi_panel_security_remediation'` | Reverts migration version history so the patch can be reapplied later. |

---

### 2.3 Intentionally Retained Asymmetric Objects (Safe Delta)
The rollback script intentionally avoids dropping two structural items:

1. **`founder_bootstrap_vault.expires_at` Column:**
   - *Why Retained:* Dropping an existing column (`ALTER TABLE ... DROP COLUMN`) acquires a heavy `ACCESS EXCLUSIVE` table lock in PostgreSQL. Since `expires_at` is nullable and harmless to baseline queries, leaving it in place avoids blocking application traffic.
2. **`uq_founder_bootstrap_single_row` Unique Index:**
   - *Why Retained:* Enforcing that `founder_bootstrap_vault` has at most one single row is a positive structural invariant that prevents multi-tenant vault corruption, even under baseline operations.

---

### 2.4 Data Preservation Scope & Technical Boundaries

#### What the Script Itself Guarantees (Zero DML Deletion on Business Tables):
- **Audit Logs:** The script executes zero `DELETE` or `TRUNCATE` statements against `enterprise_audit_logs` or `notification_delivery_audit_logs`.
- **User Memberships & Profiles:** Zero rows deleted from `user_app_memberships` or `employee_profiles`.
- **Customer Support Tickets:** Zero rows deleted from `customer_support_tickets`.
- **Founder Vault Data:** Zero rows deleted from `founder_bootstrap_vault`.
- **Only Deleted Row:** Exactly one metadata row is removed from `public.schema_migrations` (`version = '20261109_enterprise_multi_panel_security_remediation'`).

#### Critical Technical Boundaries (What DDL Rollback Cannot Do):
> [!IMPORTANT]
> **A DDL Rollback is NOT a Database Backup Restore (PITR).**
> - *No Reversion of Application-Level Data Mutations:* If application transactions, rogue processes, or erroneous queries modified, corrupted, or deleted application business rows during the remediation window, executing this DDL rollback script will **NOT** restore that lost data. Only **Point-In-Time Recovery (PITR)** or a physical backup restore can recover mutated application data.
> - *Retention of Data Created Under Remediation:* Any new employee profiles, user app memberships, or audit logs inserted while the remediation was active will remain in the database after rollback.
> - *Non-Retroactive Constraints:* Dropping triggers (such as `trg_validate_employee_profile_mutation`) means future updates are no longer validated by that trigger, but does not revert profile modifications made prior to rollback.

---

## 3. Critical Security Degradation Warnings

> [!CAUTION]
> **OPERATIONAL WARNING: ROLLBACK RESTORES VULNERABLE BASELINE BEHAVIOR**
> Executing the rollback script will intentionally reintroduce known baseline architectural weaknesses:
> 
> 1. **Migration Registry Exposed to Untrusted Inspection:** `public.schema_migrations` has Row Level Security disabled.
> 2. **Trigger Functions Executable by PUBLIC:** Baseline trigger functions (`prevent_bootstrap_vault_tamper`, `validate_support_ticket_mutation`, etc.) have direct execution rights restored to `PUBLIC`.
> 3. **Employee Profile Mutation Protection Removed:** Employees can update sensitive career fields (department, designation, employment status) because `validate_employee_profile_mutation` is dropped.
> 4. **Audit Log Truncate Protection Removed:** Database owners/roles can truncate audit logs without trigger blocking.
> 
> **Decision Guideline:** Rollback should only be performed if the production service is down or completely broken by the remediation. If a minor, isolated issue occurs, prioritize a hotfix forward rather than a full rollback.

---

## 4. Rollback Decision & Execution Protocol

### 4.1 Decision Matrix: Rollback vs. Fix-Forward

| Incident Scenario | Recommended Action | Justification |
| :--- | :--- | :--- |
| **Complete Panel Authentication Outage:** Multiple panels cannot authenticate due to function mismatch. | **ROLLBACK** | Critical service outage. Restore baseline immediately while investigating in staging. |
| **PostgREST Stale Schema Cache Error:** REST endpoints return `schema cache stale` or column missing. | **DO NOT ROLLBACK** | Execute `NOTIFY pgrst, 'reload schema';`. Cache reload resolves the issue without rollback. |
| **Single RLS Policy Misconfiguration:** One query is blocked by an over-restrictive RLS rule. | **FIX FORWARD** | Adjust the specific policy in a hotfix rather than downgrading the entire database security posture. |
| **Transaction Abort During Migration:** Migration failed midway due to a syntax or lock error. | **AUTOMATIC** | PostgreSQL automatically rolls back uncommitted transactions. No manual rollback script required. |

### 4.2 Step-by-Step Rollback Execution Procedure

1. **Obtain Written Founder & DBA Authorization:** Record explicit confirmation that rollback is necessary.
2. **Open Supabase Dashboard:** Navigate to the Production project SQL Editor.
3. **Check for Active Blocking Transactions:**
   ```sql
   SELECT pid, usename, state, now() - xact_start AS xact_age 
   FROM pg_stat_activity 
   WHERE state IN ('active', 'idle in transaction') AND pid <> pg_backend_pid();
   ```
4. **Execute Rollback SQL:** Paste and run `supabase/20261109_enterprise_multi_panel_security_remediation_rollback.sql`.
5. **Reload PostgREST Schema Cache:**
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```
6. **Execute Post-Rollback Verification Query Set:** Run Queries 1, 4, and 8 from the Pre-Flight Plan to confirm the baseline state is restored.
7. **Document Incident:** Record the root cause, timestamps, and error logs in `docs/security/ZEBALPHA_PRODUCTION_INCIDENT_REPORT.md`.

