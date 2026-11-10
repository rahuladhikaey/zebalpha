import { default as EmbeddedPostgres } from 'embedded-postgres';
import pg from 'pg';
import path from 'path';
import fs from 'fs';

const { Client } = pg;

console.log("========================================================================");
console.log("🛡️ ZEBALPHA 42P17 RLS RECURSION FORENSIC VERIFICATION & REGRESSION SUITE");
console.log("========================================================================");

const TEST_PORT = 54400 + Math.floor(Math.random() * 500);
const TEST_DIR = path.resolve('./data/test_42p17_' + Date.now());
const MIGRATION_PATH = path.resolve('./supabase/20261110_fix_user_app_memberships_rls_recursion.sql');

async function runRegressionSuite() {
  const server = new EmbeddedPostgres({
    port: TEST_PORT,
    databaseDir: TEST_DIR
  });

  await server.initialise();
  await server.start();
  console.log(`✅ Native PostgreSQL daemon started on port ${TEST_PORT}.`);

  const adminClient = new Client({
    host: '127.0.0.1',
    port: TEST_PORT,
    user: 'postgres',
    password: 'password',
    database: 'postgres'
  });
  await adminClient.connect();

  // 1. Setup Auth, Schema Migrations, Tables, Roles, and Helper Functions
  await adminClient.query(`
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE TABLE auth.users (
      id UUID PRIMARY KEY,
      email TEXT UNIQUE NOT NULL
    );

    CREATE TABLE public.schema_migrations (
      version VARCHAR(100) PRIMARY KEY,
      applied_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      description TEXT
    );

    CREATE TABLE public.departments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      code VARCHAR(50) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      is_active BOOLEAN DEFAULT TRUE NOT NULL
    );

    INSERT INTO public.departments (code, name) VALUES
      ('EXEC', 'Executive Directorate'),
      ('OPS', 'Operations & Logistics'),
      ('MEDIA', 'Media & Marketing');

    CREATE TABLE public.employee_profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID UNIQUE REFERENCES auth.users(id),
      department_id UUID REFERENCES public.departments(id),
      designation VARCHAR(100) NOT NULL,
      employment_status VARCHAR(50) DEFAULT 'active' NOT NULL
    );

    CREATE TABLE public.user_app_memberships (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      app_name VARCHAR(50) NOT NULL CHECK (app_name IN ('media', 'operations', 'superadmin', 'all')),
      role VARCHAR(50) NOT NULL,
      custom_permissions JSONB DEFAULT '[]'::jsonb NOT NULL,
      is_active BOOLEAN DEFAULT TRUE NOT NULL,
      granted_by UUID REFERENCES auth.users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      CONSTRAINT uq_user_app UNIQUE (user_id, app_name)
    );

    CREATE TABLE public.enterprise_audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      actor_id UUID REFERENCES auth.users(id),
      action VARCHAR(100) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID AS $$
      SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
    $$ LANGUAGE sql STABLE;

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

    CREATE OR REPLACE FUNCTION public.check_user_has_app_membership(
        p_app_name VARCHAR(50),
        p_roles VARCHAR(50)[] DEFAULT NULL
    )
    RETURNS BOOLEAN
    SECURITY DEFINER
    SET search_path = public, auth
    LANGUAGE plpgsql
    AS $$
    BEGIN
        IF public.check_is_enterprise_owner() THEN
            RETURN TRUE;
        END IF;

        IF p_roles IS NULL THEN
            RETURN EXISTS (
                SELECT 1 FROM public.user_app_memberships
                WHERE user_id = auth.uid()
                AND app_name = p_app_name
                AND is_active = TRUE
            );
        ELSE
            RETURN EXISTS (
                SELECT 1 FROM public.user_app_memberships
                WHERE user_id = auth.uid()
                AND app_name = p_app_name
                AND role = ANY(p_roles)
                AND is_active = TRUE
            );
        END IF;
    END;
    $$;

    ALTER TABLE public.user_app_memberships ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.employee_profiles ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.enterprise_audit_logs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;

    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated NOLOGIN;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon NOLOGIN;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        CREATE ROLE service_role NOLOGIN;
      END IF;
    END $$;

    REVOKE ALL ON TABLE public.user_app_memberships FROM PUBLIC, anon, authenticated;
    GRANT ALL ON TABLE public.user_app_memberships TO service_role;
    GRANT SELECT ON TABLE public.user_app_memberships TO authenticated;

    REVOKE ALL ON TABLE public.schema_migrations FROM PUBLIC, anon, authenticated;
    GRANT ALL ON TABLE public.schema_migrations TO service_role;

    GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;
    GRANT USAGE ON SCHEMA auth TO authenticated, anon, service_role;
    GRANT SELECT ON public.departments TO authenticated, anon, service_role;
    GRANT SELECT ON public.employee_profiles TO authenticated, service_role;
    GRANT SELECT ON public.enterprise_audit_logs TO authenticated, service_role;
    GRANT EXECUTE ON FUNCTION auth.uid() TO authenticated, anon, service_role;
    GRANT EXECUTE ON FUNCTION public.check_is_enterprise_owner() TO authenticated, service_role;
    GRANT EXECUTE ON FUNCTION public.check_user_has_app_membership(VARCHAR, VARCHAR[]) TO authenticated, service_role;
  `);

  // Synthetic Test Users
  const uFounder = '00000000-0000-0000-0000-000000000001';
  const uNoMem = '11111111-1111-1111-1111-111111111111';
  const uOps = '22222222-2222-2222-2222-222222222222';
  const uMedia = '33333333-3333-3333-3333-333333333333';
  const uInactive = '44444444-4444-4444-4444-444444444444';
  const uOther = '55555555-5555-5555-5555-555555555555';

  await adminClient.query(`
    INSERT INTO auth.users (id, email) VALUES
      ('${uFounder}', 'founder@test.internal'),
      ('${uNoMem}', 'nomem@test.internal'),
      ('${uOps}', 'ops@test.internal'),
      ('${uMedia}', 'media@test.internal'),
      ('${uInactive}', 'inactive@test.internal'),
      ('${uOther}', 'other@test.internal')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.user_app_memberships (user_id, app_name, role, is_active) VALUES
      ('${uFounder}', 'all', 'OWNER', TRUE),
      ('${uOps}', 'operations', 'Logistics Coordinator', TRUE),
      ('${uMedia}', 'media', 'Content Creator', TRUE),
      ('${uInactive}', 'operations', 'Support Agent', FALSE),
      ('${uOther}', 'operations', 'Warehouse Staff', TRUE)
    ON CONFLICT DO NOTHING;
  `);

  console.log("✅ Schema, roles, seed data, and helper functions provisioned.");

  // -------------------------------------------------------------------------
  // STEP 1: REPRODUCE EXACT PRODUCTION 3-POLICY CONFIGURATION & 42P17 ERROR
  // -------------------------------------------------------------------------
  console.log("\n[Test 0A: Reproduce Exact Production 3-Policy State & SQLSTATE 42P17]");
  await adminClient.query(`
    -- Policy 1: Legacy recursive policy present in Production
    CREATE POLICY "Employees view own memberships"
    ON public.user_app_memberships
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.user_app_memberships m
            WHERE m.user_id = auth.uid()
              AND m.is_active = TRUE
              AND m.role = 'OWNER'
        )
    );

    -- Policy 2: Self-scoped policy present in Production alongside Policy 1
    CREATE POLICY "User views own memberships"
    ON public.user_app_memberships
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

    -- Policy 3: Service role policy present in Production
    CREATE POLICY "Service role manages user_app_memberships"
    ON public.user_app_memberships
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
  `);

  let reproduced42P17 = false;
  try {
    await adminClient.query(`SET ROLE authenticated; SET request.jwt.claim.sub = '${uFounder}';`);
    await adminClient.query(`SELECT app_name, role, is_active FROM public.user_app_memberships WHERE user_id = auth.uid() AND is_active = true;`);
    console.log("❌ UNEXPECTED: Production 3-policy configuration did not throw 42P17!");
  } catch (err) {
    reproduced42P17 = (err.code === '42P17');
    console.log(`🎯 REPRODUCED EXACT PRODUCTION DEFECT: SQLSTATE ${err.code} -> ${err.message} (${reproduced42P17 ? 'PASS ✅' : 'FAIL ❌'})`);
  } finally {
    await adminClient.query(`RESET ROLE; RESET request.jwt.claim.sub;`);
  }
  if (!reproduced42P17) throw new Error("Failed to reproduce 42P17 with Production policy state");

  // -------------------------------------------------------------------------
  // STEP 1B: VERIFY MIGRATION PRECONDITION CHECK ABORTS ON UNEXPECTED POLICY
  // -------------------------------------------------------------------------
  console.log("\n[Test 0B: Verify Migration Precondition Aborts on Unexpected Policy]");
  const migrationSql = fs.readFileSync(MIGRATION_PATH, 'utf8');

  await adminClient.query(`
    CREATE POLICY "Unexpected custom policy"
    ON public.user_app_memberships
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
  `);

  let preconditionAborted = false;
  try {
    await adminClient.query(migrationSql);
    console.log("❌ UNEXPECTED: Migration did not abort when unexpected policy was present!");
  } catch (err) {
    await adminClient.query('ROLLBACK;');
    preconditionAborted = (err.code === 'P0001' && err.message.includes('Unexpected custom policy'));
    console.log(`🛡️ PRECONDITION GUARD VERIFIED: SQLSTATE ${err.code} -> ${err.message} (${preconditionAborted ? 'PASS ✅' : 'FAIL ❌'})`);
  }
  if (!preconditionAborted) throw new Error("Migration precondition check failed to abort on unexpected policy");

  // Remove the synthetic unexpected policy to restore the exact 3-policy Production state
  await adminClient.query(`DROP POLICY "Unexpected custom policy" ON public.user_app_memberships;`);

  // -------------------------------------------------------------------------
  // STEP 2: APPLY REVISED FORWARD MIGRATION FILE DIRECTLY
  // -------------------------------------------------------------------------
  console.log("\n[Applying Revised Forward Migration: supabase/20261110_fix_user_app_memberships_rls_recursion.sql]");
  await adminClient.query(migrationSql);
  console.log("✅ Forward migration executed atomically.");

  // Helper to run queries as a specific role + JWT sub
  const execAs = async (role, userId, sql) => {
    if (userId) {
      await adminClient.query(`SET ROLE ${role}; SET request.jwt.claim.sub = '${userId}';`);
    } else {
      await adminClient.query(`SET ROLE ${role}; RESET request.jwt.claim.sub;`);
    }
    try {
      return await adminClient.query(sql);
    } finally {
      await adminClient.query(`RESET ROLE; RESET request.jwt.claim.sub;`);
    }
  };

  // Case 1: Verify exact post-migration policies in pg_policies
  const polRes = await adminClient.query(`
    SELECT policyname, permissive, roles::text, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_app_memberships'
    ORDER BY policyname;
  `);
  const polNames = polRes.rows.map(r => r.policyname);
  const c1 = (
    polNames.length === 2 &&
    !polNames.includes('Employees view own memberships') &&
    polNames.includes('Service role manages user_app_memberships') &&
    polNames.includes('User views own memberships')
  );
  console.log(`\nCase 1 (Exact Policy Inventory — Legacy Dropped, Canonical & Service Role Preserved): ${c1 ? 'PASS ✅' : 'FAIL ❌'} -> Policies: ${JSON.stringify(polNames)}`);
  if (!c1) throw new Error("Policy inventory mismatch");

  // Case 2: Authenticated user with no membership
  const r2 = await execAs('authenticated', uNoMem, `SELECT app_name, role, is_active FROM public.user_app_memberships WHERE user_id = auth.uid() AND is_active = true;`);
  const c2 = r2.rows.length === 0;
  console.log(`Case 2 (Authenticated User With No Membership): ${c2 ? 'PASS ✅' : 'FAIL ❌'} (Returned ${r2.rows.length} rows)`);

  // Case 3: Active Operations Member
  const r3 = await execAs('authenticated', uOps, `SELECT app_name, role, is_active FROM public.user_app_memberships WHERE user_id = auth.uid() AND is_active = true;`);
  const c3 = r3.rows.length === 1 && r3.rows[0].app_name === 'operations' && r3.rows[0].role === 'Logistics Coordinator';
  console.log(`Case 3 (Active Operations Membership Readable By Owner): ${c3 ? 'PASS ✅' : 'FAIL ❌'} -> ${JSON.stringify(r3.rows[0])}`);

  // Case 4: Active Media Member
  const r4 = await execAs('authenticated', uMedia, `SELECT app_name, role, is_active FROM public.user_app_memberships WHERE user_id = auth.uid() AND is_active = true;`);
  const c4 = r4.rows.length === 1 && r4.rows[0].app_name === 'media' && r4.rows[0].role === 'Content Creator';
  console.log(`Case 4 (Active Media Membership Readable By Owner): ${c4 ? 'PASS ✅' : 'FAIL ❌'} -> ${JSON.stringify(r4.rows[0])}`);

  // Case 5: Global OWNER Member
  const r5 = await execAs('authenticated', uFounder, `SELECT app_name, role, is_active FROM public.user_app_memberships WHERE user_id = auth.uid() AND is_active = true;`);
  const c5 = r5.rows.length === 1 && r5.rows[0].app_name === 'all' && r5.rows[0].role === 'OWNER';
  console.log(`Case 5 (Global OWNER Membership Readable By Owner): ${c5 ? 'PASS ✅' : 'FAIL ❌'} -> ${JSON.stringify(r5.rows[0])}`);

  // Case 6: Cross-User Membership Isolation
  const r6 = await execAs('authenticated', uOps, `SELECT * FROM public.user_app_memberships WHERE user_id = '${uOther}';`);
  const c6 = r6.rows.length === 0;
  console.log(`Case 6 (Cross-User Membership Access Denied): ${c6 ? 'PASS ✅' : 'FAIL ❌'} (Returned ${r6.rows.length} rows for other user)`);

  // Case 7: Inactive Membership Does Not Grant Panel Access
  const r7 = await execAs('authenticated', uInactive, `SELECT app_name, role, is_active FROM public.user_app_memberships WHERE user_id = auth.uid() AND is_active = true;`);
  const c7 = r7.rows.length === 0;
  console.log(`Case 7 (Inactive Membership Filtered Out): ${c7 ? 'PASS ✅' : 'FAIL ❌'} (Returned ${r7.rows.length} active rows)`);

  // Case 8: Anonymous Access Denied
  let c8 = false;
  try {
    await execAs('anon', null, `SELECT * FROM public.user_app_memberships;`);
  } catch (err) {
    c8 = (err.code === '42501');
  }
  console.log(`Case 8 (Anonymous Access Denied With 42501): ${c8 ? 'PASS ✅' : 'FAIL ❌'}`);

  // Case 9: service_role Policy Intact & Full Access Preserved
  const r9 = await execAs('service_role', null, `SELECT COUNT(*)::int AS cnt FROM public.user_app_memberships;`);
  const c9 = r9.rows[0].cnt === 5;
  console.log(`Case 9 (service_role Policy Intact & Reads All 5 Seeded Rows): ${c9 ? 'PASS ✅' : 'FAIL ❌'} (Count: ${r9.rows[0].cnt})`);

  // Case 10: Authenticated User Cannot Insert or Promote Themselves to OWNER
  let c10 = false;
  try {
    await execAs('authenticated', uOps, `INSERT INTO public.user_app_memberships (user_id, app_name, role) VALUES ('${uOps}', 'all', 'OWNER');`);
  } catch (err) {
    c10 = (err.code === '42501');
  }
  console.log(`Case 10 (Unauthorized OWNER Self-Promotion Blocked With 42501): ${c10 ? 'PASS ✅' : 'FAIL ❌'}`);

  // Case 11: check_is_enterprise_owner() Works Without Recursive Failure
  const r11Owner = await execAs('authenticated', uFounder, `SELECT public.check_is_enterprise_owner() AS is_owner;`);
  const r11NonOwner = await execAs('authenticated', uOps, `SELECT public.check_is_enterprise_owner() AS is_owner;`);
  const c11 = (r11Owner.rows[0].is_owner === true && r11NonOwner.rows[0].is_owner === false);
  console.log(`Case 11 (check_is_enterprise_owner() Non-Recursive Evaluation): ${c11 ? 'PASS ✅' : 'FAIL ❌'} (Founder: ${r11Owner.rows[0].is_owner}, Ops User: ${r11NonOwner.rows[0].is_owner})`);

  // Case 12: Safe Retry & schema_migrations.applied_at Preservation
  const regBefore = await adminClient.query(`
    SELECT version, applied_at::text AS applied_at_str
    FROM public.schema_migrations
    WHERE version = '20261110_fix_user_app_memberships_rls_recursion';
  `);
  await new Promise(r => setTimeout(r, 60));
  await adminClient.query(migrationSql);
  const regAfter = await adminClient.query(`
    SELECT version, applied_at::text AS applied_at_str
    FROM public.schema_migrations
    WHERE version = '20261110_fix_user_app_memberships_rls_recursion';
  `);
  const c12 = (
    regBefore.rows.length === 1 &&
    regAfter.rows.length === 1 &&
    regBefore.rows[0].applied_at_str === regAfter.rows[0].applied_at_str
  );
  console.log(`Case 12 (Idempotent Retry & Original applied_at Preserved): ${c12 ? 'PASS ✅' : 'FAIL ❌'} (Before: ${regBefore.rows[0]?.applied_at_str}, After: ${regAfter.rows[0]?.applied_at_str})`);

  const allPassed = c1 && c2 && c3 && c4 && c5 && c6 && c7 && c8 && c9 && c10 && c11 && c12;
  if (!allPassed) {
    throw new Error("One or more regression cases failed!");
  }

  console.log("\n========================================================================");
  console.log("🎉 ALL 12 REGRESSION CASES + PRECONDITION + 42P17 REPRO VERIFIED (100% PASS)");
  console.log("========================================================================");

  await adminClient.end();
  await server.stop();
  try {
    fs.rmSync(TEST_DIR, { recursive: true, force: true });
  } catch (e) {
    // Ignore Windows lock cleanup timing
  }
  process.exit(0);
}

runRegressionSuite().catch((err) => {
  console.error(err);
  process.exit(1);
});
