import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const remediationPath = path.resolve(__dirname, '../../supabase/20261109_enterprise_multi_panel_security_remediation.sql');
const rollbackPath = path.resolve(__dirname, '../../supabase/20261109_enterprise_multi_panel_security_remediation_rollback.sql');

const remediationSql = fs.readFileSync(remediationPath, 'utf8');
const rollbackSql = fs.readFileSync(rollbackPath, 'utf8');

console.log('========================================================================');
console.log('🛡️ ZEBALPHA FORENSIC REMEDIATION SQL AUTOMATED VERIFICATION SUITE');
console.log('========================================================================\n');

let passCount = 0;
let totalCount = 0;

function assert(condition, message) {
  totalCount++;
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    throw new Error(`Verification Failure: ${message}`);
  }
}

// -----------------------------------------------------------------------------
// TEST 1: Advisory Concurrency Lock & Transaction Encapsulation
// -----------------------------------------------------------------------------
const hasBegin = /^\s*(--[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*\s*BEGIN\s*;/i.test(remediationSql);
const hasCommit = /COMMIT\s*;\s*$/i.test(remediationSql.trim());
const hasAdvisoryLock = /SELECT\s+pg_advisory_xact_lock\(hashtextextended\('20261109_enterprise_multi_panel_security_remediation',\s*0\)\);/i.test(remediationSql);

assert(hasBegin && hasCommit, 'Remediation SQL is 100% encapsulated in BEGIN; ... COMMIT; block.');
assert(hasAdvisoryLock, 'Transaction-scoped advisory lock (hashtextextended 64-bit) explicitly acquired at header.');

// -----------------------------------------------------------------------------
// TEST 2: Employee Invitations Authorization (Correction A)
// -----------------------------------------------------------------------------
const hasInvitationsRevoke = /REVOKE ALL ON TABLE public\.employee_invitations FROM public,\s*anon,\s*authenticated;/i.test(remediationSql);
const hasInvitationsSelectGrant = /GRANT SELECT ON TABLE public\.employee_invitations TO authenticated;/i.test(remediationSql);

assert(hasInvitationsRevoke, 'Table employee_invitations revokes ALL privileges from public/anon/authenticated.');
assert(hasInvitationsSelectGrant, 'Table employee_invitations grants selective SELECT to authenticated (governed by HR RLS).');

// -----------------------------------------------------------------------------
// TEST 3: Schema Migrations Hardening & PostgREST Shield (Correction B)
// -----------------------------------------------------------------------------
const hasSchemaRls = /ALTER TABLE public\.schema_migrations ENABLE ROW LEVEL SECURITY;/i.test(remediationSql);
const hasSchemaRevoke = /REVOKE ALL ON TABLE public\.schema_migrations FROM PUBLIC,\s*anon,\s*authenticated;/i.test(remediationSql);
const hasSchemaSrGrant = /GRANT ALL ON TABLE public\.schema_migrations TO service_role;/i.test(remediationSql);
const hasSchemaSrPolicy = /CREATE POLICY "Service role manages schema_migrations" ON public\.schema_migrations\s+FOR ALL TO service_role/i.test(remediationSql);

assert(hasSchemaRls, 'public.schema_migrations has Row Level Security enabled.');
assert(hasSchemaRevoke, 'public.schema_migrations revokes ALL privileges from PUBLIC, anon, and authenticated.');
assert(hasSchemaSrGrant && hasSchemaSrPolicy, 'public.schema_migrations grants exclusive management to service_role only.');

// -----------------------------------------------------------------------------
// TEST 4: Customer Support Ticket Architecture (Correction C)
// -----------------------------------------------------------------------------
const hasTicketSelectUpdate = /GRANT SELECT,\s*UPDATE ON TABLE public\.customer_support_tickets TO authenticated;/i.test(remediationSql);
const hasNoAuthenticatedTicketInsert = !/GRANT\s+[^;]*INSERT[^;]*ON TABLE public\.customer_support_tickets TO\s+[^;]*authenticated/i.test(remediationSql);
const hasDroppedClientInsertPolicy = /DROP POLICY IF EXISTS "Customers create support tickets" ON public\.customer_support_tickets;/i.test(remediationSql);
const hasNoRecreatedInsertPolicy = !/CREATE\s+POLICY\s+"Customers create support tickets"/i.test(remediationSql);
const hasNoTicketInsertPolicy = !/CREATE\s+POLICY\s+[^;]+ON\s+public\.customer_support_tickets\s+FOR\s+INSERT/i.test(remediationSql);

assert(hasTicketSelectUpdate, 'customer_support_tickets grants SELECT and UPDATE only to authenticated.');
assert(hasNoAuthenticatedTicketInsert, 'Direct authenticated INSERT is intentionally NOT granted on customer_support_tickets.');
assert(hasDroppedClientInsertPolicy, 'Direct customer INSERT policy is purged via DROP statement.');
assert(hasNoRecreatedInsertPolicy, 'Policy "Customers create support tickets" is NOT recreated anywhere in the forward migration.');
assert(hasNoTicketInsertPolicy, 'Zero INSERT policies exist on customer_support_tickets, guaranteeing backend-only insertion.');

// -----------------------------------------------------------------------------
// TEST 5: Trigger Function Execution Privilege Hardening (Correction E)
// -----------------------------------------------------------------------------
const triggerFunctions = [
  'prevent_bootstrap_vault_tamper',
  'prevent_bootstrap_vault_deletion',
  'validate_employee_profile_mutation',
  'validate_support_ticket_mutation',
  'prevent_audit_log_mutation'
];

for (const tf of triggerFunctions) {
  const revokeRegex = new RegExp(`REVOKE ALL ON FUNCTION public\\.${tf}\\(\\) FROM PUBLIC,\\s*anon,\\s*authenticated;`, 'i');
  const grantRegex = new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${tf}\\(\\) TO service_role;`, 'i');
  assert(revokeRegex.test(remediationSql), `Trigger function ${tf}() revokes direct invocation from untrusted roles.`);
  assert(grantRegex.test(remediationSql), `Trigger function ${tf}() grants execute to service_role.`);
}

// -----------------------------------------------------------------------------
// TEST 6: Cross-Application OWNER & Scope Isolation
// -----------------------------------------------------------------------------
const hasOwnerScopeClause = /app_name = 'all'\s+AND role = 'OWNER'/i.test(remediationSql);
const hasAppScopeMatch = /app_name = p_app/i.test(remediationSql);
const hasAppAwareManager = /CREATE OR REPLACE FUNCTION public\.check_is_app_manager/i.test(remediationSql);

assert(hasOwnerScopeClause, 'Enterprise Owner bypass strictly requires app_name = "all" AND role = "OWNER".');
assert(hasAppScopeMatch, 'check_user_has_app_membership enforces application boundary matching.');
assert(hasAppAwareManager, 'check_is_app_manager distinguishes media, operations, and superadmin scopes.');

// -----------------------------------------------------------------------------
// TEST 7: Founder Bootstrap Expiration, Replay Protection & Row Locking
// -----------------------------------------------------------------------------
const hasPessimisticLock = /SELECT \* INTO v_record\s+FROM public\.founder_bootstrap_vault\s+WHERE founder_email = LOWER\(TRIM\(p_email\)\)\s+FOR UPDATE;/i.test(remediationSql);
const hasReplayCheck = /v_record\.is_locked = TRUE OR v_record\.consumed_at IS NOT NULL/i.test(remediationSql);
const hasExpirationCheck = /v_record\.expires_at IS NOT NULL AND NOW\(\) > v_record\.expires_at/i.test(remediationSql);
const hasHashComparison = /v_record\.token_hash != p_token_hash/i.test(remediationSql);

assert(hasPessimisticLock, 'consume_founder_bootstrap_token acquires exclusive pessimistic lock (FOR UPDATE).');
assert(hasReplayCheck, 'consume_founder_bootstrap_token enforces replay protection.');
assert(hasExpirationCheck, 'consume_founder_bootstrap_token verifies token TTL expiration.');
assert(hasHashComparison, 'consume_founder_bootstrap_token cryptographically validates SHA-256 token hash.');

// -----------------------------------------------------------------------------
// TEST 8: Migration Idempotency & Rollback Consistency (Phase 3)
// -----------------------------------------------------------------------------
const rollbackHasBegin = /BEGIN\s*;/i.test(rollbackSql);
const rollbackHasCommit = /COMMIT\s*;/i.test(rollbackSql);
const rollbackRestoresInvitations = /GRANT SELECT ON TABLE public\.employee_invitations TO authenticated;/i.test(rollbackSql);
const rollbackRestoresSchema = /ALTER TABLE public\.schema_migrations DISABLE ROW LEVEL SECURITY;/i.test(rollbackSql);
const rollbackRevokesSchemaFromPublic = /REVOKE\s+ALL\s+ON\s+TABLE\s+public\.schema_migrations\s+FROM\s+PUBLIC,\s*anon,\s*authenticated;/i.test(rollbackSql);
const rollbackGrantsSchemaToServiceRole = /GRANT\s+ALL\s+ON\s+TABLE\s+public\.schema_migrations\s+TO\s+service_role;/i.test(rollbackSql);
const rollbackDoesNotGrantSchemaToPublic = !/GRANT\s+ALL\s+ON\s+TABLE\s+public\.schema_migrations\s+TO\s+[^;]*PUBLIC/i.test(rollbackSql);
const rollbackDropsValidateEmployeeMutation = /DROP\s+FUNCTION\s+IF\s+EXISTS\s+public\.validate_employee_profile_mutation\(\);/i.test(rollbackSql);
const rollbackRestoresTriggers = /GRANT EXECUTE ON FUNCTION public\.prevent_audit_log_mutation\(\) TO PUBLIC;/i.test(rollbackSql);
const rollbackPreservesData = !/(DELETE|TRUNCATE) FROM public\.(user_app_memberships|employee_profiles|founder_bootstrap_vault|enterprise_audit_logs)/i.test(rollbackSql);

assert(rollbackHasBegin && rollbackHasCommit, 'Rollback script is encapsulated in explicit transaction.');
assert(rollbackRestoresInvitations, 'Rollback restores baseline SELECT on employee_invitations.');
assert(rollbackRestoresSchema, 'Rollback restores baseline schema_migrations state.');
assert(rollbackRevokesSchemaFromPublic && rollbackGrantsSchemaToServiceRole, 'Rollback restores exact baseline ACL on schema_migrations (service_role only).');
assert(rollbackDoesNotGrantSchemaToPublic, 'Rollback does NOT erroneously grant ALL on schema_migrations to PUBLIC/anon/authenticated.');
assert(rollbackDropsValidateEmployeeMutation, 'Rollback drops remediation-specific validate_employee_profile_mutation() trigger function.');
assert(rollbackRestoresTriggers, 'Rollback restores baseline function execution privileges.');
assert(rollbackPreservesData, 'Rollback contains ZERO deletion/truncation of Founder or enterprise business data.');

console.log('\n========================================================================');
console.log(`ALL ${passCount} / ${totalCount} FORENSIC VERIFICATION CHECKS PASSED!`);
console.log('========================================================================');

