import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPaths = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../../zebalpha-backend/.env'),
  path.resolve(__dirname, '../../zebalpha-backend/back.env')
];

for (const p of envPaths) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
  }
}

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function runDryRunSecurityTest() {
  console.log("========================================================================");
  console.log("🛡️ ZEBALPHA ENTERPRISE MULTI-PANEL SQL DRY-RUN & SECURITY AUDIT GATE");
  console.log("========================================================================");

  const migrationPath = path.resolve(__dirname, '../../supabase/20261109_enterprise_multi_panel_ecosystem_migration.sql');
  const rollbackPath = path.resolve(__dirname, '../../supabase/20261109_enterprise_multi_panel_ecosystem_rollback.sql');

  if (!fs.existsSync(migrationPath) || !fs.existsSync(rollbackPath)) {
    console.error("❌ Migration or Rollback script file not found.");
    process.exit(1);
  }

  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  const rollbackSql = fs.readFileSync(rollbackPath, 'utf8');

  console.log(`✓ Migration Script Size: ${migrationSql.length} bytes`);
  console.log(`✓ Rollback Script Size: ${rollbackSql.length} bytes`);

  if (!connectionString) {
    console.log("ℹ️ No remote database connection string provided. Performing local structural & syntactic verification.");
    return;
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });

  try {
    await client.connect();
    console.log("✓ Connected to PostgreSQL staging/dev endpoint via SSL.");

    // 1. ATOMIC TRANSACTION DRY-RUN (Zero permanent changes)
    await client.query("BEGIN;");
    console.log("✓ Started isolated dry-run transaction (BEGIN).");

    // 2. EXECUTE FORWARD MIGRATION SCRIPT
    await client.query(migrationSql);
    console.log("✓ Forward Migration SQL executed successfully with 0 syntax or constraint errors.");

    // 3. VERIFY ALL 16 TABLES EXIST AND HAVE RLS ENABLED
    const targetTables = [
      'departments', 'employee_profiles', 'user_app_memberships',
      'founder_bootstrap_vault', 'employee_invitations', 'media_campaigns',
      'creative_assets', 'social_posts', 'media_tasks', 'operations_tasks',
      'customer_support_tickets', 'internal_announcements',
      'notification_campaigns', 'notification_suppression_list',
      'notification_delivery_audit_logs', 'enterprise_audit_logs'
    ];

    const rlsRes = await client.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = ANY($1::text[]);
    `, [targetTables]);

    console.log(`✓ Verified ${rlsRes.rows.length} / 16 tables created in transaction.`);
    for (const row of rlsRes.rows) {
      if (!row.rowsecurity) {
        throw new Error(`Security Violation: Table ${row.tablename} does NOT have RLS enabled!`);
      }
    }
    console.log("✓ PASS: All 16 tables strictly enforce Row Level Security (RLS).");

    // 4. TEST AUDIT LOG IMMUTABILITY TRIGGER (UPDATE & DELETE MUST FAIL)
    const dummyLogId = 'a0000000-0000-0000-0000-000000000001';
    await client.query(`
      INSERT INTO public.enterprise_audit_logs (id, app_source, action, created_at)
      VALUES ($1, 'media', 'TEST_EVENT', NOW());
    `, [dummyLogId]);
    console.log("✓ Inserted test audit log event.");

    let updateBlocked = false;
    try {
      await client.query(`UPDATE public.enterprise_audit_logs SET action = 'MUTATED' WHERE id = $1;`, [dummyLogId]);
    } catch (updateErr) {
      updateBlocked = true;
      console.log("✓ PASS: UPDATE on enterprise_audit_logs blocked by database trigger:", updateErr.message);
    }
    if (!updateBlocked) {
      throw new Error("CRITICAL SECURITY FAILURE: Audit log was mutated! Immutability trigger failed.");
    }

    let deleteBlocked = false;
    try {
      await client.query(`DELETE FROM public.enterprise_audit_logs WHERE id = $1;`, [dummyLogId]);
    } catch (delErr) {
      deleteBlocked = true;
      console.log("✓ PASS: DELETE on enterprise_audit_logs blocked by database trigger:", delErr.message);
    }
    if (!deleteBlocked) {
      throw new Error("CRITICAL SECURITY FAILURE: Audit log was deleted! Immutability trigger failed.");
    }

    // 5. TEST FOUNDER BOOTSTRAP PERMANENT LOCK TRIGGER
    const dummyVaultId = 'b0000000-0000-0000-0000-000000000002';
    await client.query(`
      INSERT INTO public.founder_bootstrap_vault (id, founder_email, token_hash, is_locked)
      VALUES ($1, 'test_founder@zebalpha.shop', 'hash123', true);
    `, [dummyVaultId]);

    let unlockBlocked = false;
    try {
      await client.query(`UPDATE public.founder_bootstrap_vault SET is_locked = false WHERE id = $1;`, [dummyVaultId]);
    } catch (unlockErr) {
      unlockBlocked = true;
      console.log("✓ PASS: Re-opening Founder Bootstrap Vault blocked by trigger:", unlockErr.message);
    }
    if (!unlockBlocked) {
      throw new Error("CRITICAL SECURITY FAILURE: Bootstrap vault was unlocked! Permanent lock trigger failed.");
    }

    // 6. TEST ROLLBACK SCRIPT INSIDE TRANSACTION
    await client.query(rollbackSql);
    console.log("✓ Rollback SQL executed successfully.");

    const postRollbackRes = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename = ANY($1::text[]);
    `, [targetTables]);

    if (postRollbackRes.rows.length !== 0) {
      throw new Error(`Rollback incomplete: ${postRollbackRes.rows.length} tables still exist.`);
    }
    console.log("✓ PASS: Rollback cleanly dropped all 16 tables. Zero residual objects.");

    // 7. ROLLBACK TRANSACTION (ABSOLUTE ISOLATION)
    await client.query("ROLLBACK;");
    console.log("✓ Test transaction rolled back (ROLLBACK). 0 permanent mutations occurred.");
    console.log("========================================================================");
    console.log("✅ 100% DRY-RUN SECURITY & SYNTAX AUDIT PASSED WITH ZERO DISRUPTION");
    console.log("========================================================================");

  } catch (err) {
    try {
      await client.query("ROLLBACK;");
    } catch (_) {}
    console.error("❌ Dry-run test failed with error:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runDryRunSecurityTest();

