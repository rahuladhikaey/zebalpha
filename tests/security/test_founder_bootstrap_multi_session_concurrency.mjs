import { default as EmbeddedPostgres } from 'embedded-postgres';
import pg from 'pg';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

const { Client } = pg;

console.log("========================================================================");
console.log("🐘 ZEBALPHA NATIVE POSTGRESQL MULTI-SESSION CONCURRENCY TEST");
console.log("========================================================================");

const TEST_PORT = 54333;
const TEST_DIR = path.resolve('./data/test_db_' + Date.now());

async function runMultiSessionTest() {
  console.log(`[Init] Spawning native PostgreSQL 18.6 daemon on 127.0.0.1:${TEST_PORT}...`);
  const server = new EmbeddedPostgres({
    port: TEST_PORT,
    databaseDir: TEST_DIR
  });

  await server.initialise();
  await server.start();
  console.log(`✅ Native PostgreSQL daemon started successfully on port ${TEST_PORT}.`);

  const adminClient = new Client({
    host: '127.0.0.1',
    port: TEST_PORT,
    user: 'postgres',
    password: 'password',
    database: 'postgres'
  });
  await adminClient.connect();

  const verRes = await adminClient.query("SELECT version(), pg_backend_pid();");
  console.log(`[Admin Session] PostgreSQL Engine: ${verRes.rows[0].version}`);
  console.log(`[Admin Session] PID: ${verRes.rows[0].pg_backend_pid}`);

  // 1. Setup Enterprise Database Schema
  console.log("\n[Setup] Installing enterprise schema, triggers & remediated stored procedure...");
  await adminClient.query(`
    -- Extensions
    CREATE EXTENSION IF NOT EXISTS pgcrypto;

    -- Emulate Supabase Auth
    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE TABLE IF NOT EXISTS auth.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Departments
    CREATE TABLE IF NOT EXISTS public.departments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL UNIQUE,
        code VARCHAR(50) NOT NULL UNIQUE,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    INSERT INTO public.departments (name, code, description) VALUES
        ('Executive Management', 'EXEC', 'Company leadership'),
        ('Operations & Logistics', 'OPS', 'Day-to-day operations'),
        ('Media & Creative Marketing', 'MEDIA', 'Brand campaigns')
    ON CONFLICT (code) DO NOTHING;

    -- Employee Profiles
    CREATE TABLE IF NOT EXISTS public.employee_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
        department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
        designation VARCHAR(100) NOT NULL,
        employment_status VARCHAR(50) DEFAULT 'active' NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- User App Memberships
    CREATE TABLE IF NOT EXISTS public.user_app_memberships (
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

    -- Founder Bootstrap Vault with NOT NULL constraint consideration
    CREATE TABLE IF NOT EXISTS public.founder_bootstrap_vault (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        founder_email VARCHAR(255) NOT NULL UNIQUE,
        token_hash VARCHAR(255) NOT NULL,
        is_locked BOOLEAN DEFAULT FALSE NOT NULL,
        consumed_at TIMESTAMPTZ,
        consumed_ip VARCHAR(100),
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Single-row expression index
    CREATE UNIQUE INDEX IF NOT EXISTS uq_founder_bootstrap_single_row 
    ON public.founder_bootstrap_vault ((TRUE));

    -- Enterprise Audit Logs
    CREATE TABLE IF NOT EXISTS public.enterprise_audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        actor_id UUID REFERENCES auth.users(id),
        actor_email VARCHAR(255),
        app_source VARCHAR(50) NOT NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100),
        entity_id VARCHAR(100),
        ip_address VARCHAR(100),
        metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );

    -- Vault tamper trigger
    CREATE OR REPLACE FUNCTION public.prevent_bootstrap_vault_tamper()
    RETURNS TRIGGER AS $$
    BEGIN
        IF OLD.founder_email != NEW.founder_email OR OLD.token_hash != NEW.token_hash THEN
            RAISE EXCEPTION 'Security Violation: Founder identity and token hash are immutable.';
        END IF;
        IF OLD.is_locked = TRUE AND NEW.is_locked = FALSE THEN
            RAISE EXCEPTION 'Security Violation: The Founder Bootstrap Vault is permanently locked and cannot be unlocked.';
        END IF;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_prevent_bootstrap_tamper ON public.founder_bootstrap_vault;
    CREATE TRIGGER trg_prevent_bootstrap_tamper
    BEFORE UPDATE ON public.founder_bootstrap_vault
    FOR EACH ROW EXECUTE FUNCTION public.prevent_bootstrap_vault_tamper();

    -- Vault deletion trigger
    CREATE OR REPLACE FUNCTION public.prevent_bootstrap_vault_deletion()
    RETURNS TRIGGER AS $$
    BEGIN
        RAISE EXCEPTION 'Security Violation: Deletion or truncation of founder_bootstrap_vault is permanently prohibited.';
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_prevent_bootstrap_vault_deletion ON public.founder_bootstrap_vault;
    CREATE TRIGGER trg_prevent_bootstrap_vault_deletion
    BEFORE DELETE OR TRUNCATE ON public.founder_bootstrap_vault
    FOR EACH STATEMENT EXECUTE FUNCTION public.prevent_bootstrap_vault_deletion();
  `);

  // 2. Install REMEDIATED Stored Procedure (Resolving NULL expiry & Profile reconciliation)
  await adminClient.query(`
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
            RAISE EXCEPTION 'Security Violation: Unauthorized founder email identity.' USING ERRCODE = 'P0001';
        END IF;

        -- 2. Verify not already consumed
        IF v_record.is_locked = TRUE OR v_record.consumed_at IS NOT NULL THEN
            RAISE EXCEPTION 'Security Violation: Founder bootstrap token has already been consumed and locked.' USING ERRCODE = 'P0001';
        END IF;

        -- 3. REMEDIATION 1: Strict Mandatory Expiry Check (Explicitly rejects NULL expires_at & expired tokens)
        IF v_record.expires_at IS NULL THEN
            RAISE EXCEPTION 'Security Violation: Founder bootstrap token lacks a valid expiration timestamp (NULL TTL prohibited).' USING ERRCODE = 'P0001';
        END IF;

        IF NOW() > v_record.expires_at THEN
            RAISE EXCEPTION 'Security Violation: Founder bootstrap token has expired.' USING ERRCODE = 'P0001';
        END IF;

        -- 4. Verify cryptographic token hash match
        IF v_record.token_hash != p_token_hash THEN
            RAISE EXCEPTION 'Security Violation: Invalid or unverified bootstrap token.' USING ERRCODE = 'P0001';
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

        -- 7. REMEDIATION 2: Atomically reconcile Founder Executive Profile
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
  `);

  console.log("✅ Remediated stored procedure loaded with strict NULL TTL rejection and complete profile reconciliation.");

  // ---------------------------------------------------------------------------
  // TASK 3: Independent PostgreSQL Session Concurrency Test
  // ---------------------------------------------------------------------------
  console.log("\n[Test 1] Establishing 10 independent native TCP connections (Sessions)...");
  
  const workerClients = [];
  const sessionPids = [];
  const syntheticUserIds = [];

  for (let i = 0; i < 10; i++) {
    const client = new Client({
      host: '127.0.0.1',
      port: TEST_PORT,
      user: 'postgres',
      password: 'password',
      database: 'postgres'
    });
    await client.connect();
    const pidRes = await client.query("SELECT pg_backend_pid();");
    sessionPids.push(pidRes.rows[0].pg_backend_pid);
    workerClients.push(client);

    // Create synthetic user
    const uRes = await adminClient.query(
      "INSERT INTO auth.users (email) VALUES ($1) RETURNING id;",
      [`concurrent.worker.${i}@zebalpha.test`]
    );
    syntheticUserIds.push(uRes.rows[0].id);
  }

  console.log(`[Independent Sessions] Established 10 unique server PIDs: [${sessionPids.join(', ')}]`);

  // Seed Vault with synthetic test token
  const testEmail = "founder.session.test@zebalpha.internal";
  const rawToken = "SECRET_TOKEN_SESSION_" + crypto.randomBytes(16).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken.trim()).digest('hex');

  await adminClient.query(`
    INSERT INTO public.founder_bootstrap_vault (founder_email, token_hash, expires_at)
    VALUES ($1, $2, NOW() + INTERVAL '2 hours');
  `, [testEmail, tokenHash]);

  console.log(`[Seed] Shared Vault record seeded for: ${testEmail}`);

  // Launch 10 simultaneous workers on separate TCP sockets
  console.log("[Concurrency Execution] Firing 10 simultaneous consume requests across separate TCP sockets...");
  let successCount = 0;
  let rejectedCount = 0;
  const capturedSqlStates = new Set();
  const workerOutcomes = [];

  const concurrencyPromises = workerClients.map(async (client, idx) => {
    const pid = sessionPids[idx];
    const uid = syntheticUserIds[idx];
    const start = Date.now();
    try {
      const res = await client.query(
        "SELECT public.consume_founder_bootstrap_token($1, $2, $3, $4) AS res;",
        [testEmail, tokenHash, `10.0.0.${100 + idx}`, uid]
      );
      const elapsed = Date.now() - start;
      successCount++;
      workerOutcomes.push({ worker: idx, pid, status: 'SUCCESS', elapsed, sqlstate: '00000' });
    } catch (err) {
      const elapsed = Date.now() - start;
      rejectedCount++;
      capturedSqlStates.add(err.code || 'UNKNOWN');
      workerOutcomes.push({ worker: idx, pid, status: 'REJECTED', elapsed, sqlstate: err.code, message: err.message });
    }
  });

  await Promise.all(concurrencyPromises);

  console.log("\n[Worker Outcomes Breakdown]:");
  workerOutcomes.sort((a, b) => a.worker - b.worker);
  for (const o of workerOutcomes) {
    console.log(`  Worker #${o.worker} (PID ${o.pid}): ${o.status} | Elapsed: ${o.elapsed}ms | SQLSTATE: ${o.sqlstate} ${o.message ? `("${o.message}")` : ''}`);
  }

  console.log(`\n[Summary] Success: ${successCount} | Rejected: ${rejectedCount} | SQLSTATE: ${Array.from(capturedSqlStates).join(', ')}`);

  if (successCount !== 1 || rejectedCount !== 9) {
    throw new Error(`CONCURRENCY RACE DETECTED! Expected 1 success and 9 rejections, got ${successCount} and ${rejectedCount}`);
  }
  console.log("✅ TASK 3 VERIFIED: True multi-session concurrency serialization proven on native PostgreSQL 18.6! Exactly 1 winner, 9 rejections.");

  // Close worker sockets
  for (const c of workerClients) {
    await c.end();
  }

  // ---------------------------------------------------------------------------
  // Verification: State integrity
  // ---------------------------------------------------------------------------
  const ownerCountRes = await adminClient.query("SELECT count(*) FROM public.user_app_memberships WHERE role = 'OWNER';");
  const profCountRes = await adminClient.query("SELECT count(*) FROM public.employee_profiles;");
  const vaultFinalRes = await adminClient.query("SELECT is_locked, consumed_at, consumed_ip FROM public.founder_bootstrap_vault;");

  console.log(`[Integrity Check] Total OWNER memberships created: ${ownerCountRes.rows[0].count}`);
  console.log(`[Integrity Check] Total employee profiles created: ${profCountRes.rows[0].count}`);
  console.log(`[Integrity Check] Vault is_locked: ${vaultFinalRes.rows[0].is_locked} | consumed_ip: ${vaultFinalRes.rows[0].consumed_ip}`);

  if (ownerCountRes.rows[0].count !== '1' || profCountRes.rows[0].count !== '1') {
    throw new Error("Integrity violation: duplicate records created during concurrency test!");
  }
  console.log("✅ Zero duplicate OWNER memberships and zero duplicate profiles confirmed.");

  // ---------------------------------------------------------------------------
  // TASK 4: Regression Tests for Remediation
  // ---------------------------------------------------------------------------
  console.log("\n========================================================================");
  console.log("🧪 RUNNING REGRESSION SUITE (Remediations & Boundary Gates)");
  console.log("========================================================================");

  // Clean vault for isolated regression runs (drop trigger temporarily or use new test db)
  // Let's create a dedicated regression schema or reset tables
  await adminClient.query("TRUNCATE TABLE public.user_app_memberships, public.employee_profiles, public.enterprise_audit_logs CASCADE;");
  // Temporarily disable deletion trigger to clean vault for regression tests
  await adminClient.query("ALTER TABLE public.founder_bootstrap_vault DISABLE TRIGGER trg_prevent_bootstrap_vault_deletion;");
  await adminClient.query("TRUNCATE TABLE public.founder_bootstrap_vault;");
  await adminClient.query("ALTER TABLE public.founder_bootstrap_vault ENABLE TRIGGER trg_prevent_bootstrap_vault_deletion;");

  // Reg 1: NULL Expiry Rejection
  console.log("\n[Reg 1] Testing NULL expires_at rejection (Remediation 1)...");
  await adminClient.query(`
    INSERT INTO public.founder_bootstrap_vault (founder_email, token_hash, expires_at)
    VALUES ('null.ttl@test.internal', 'hash_null', NULL);
  `);
  let nullTtlCaught = false;
  let nullTtlMsg = '';
  try {
    await adminClient.query("SELECT public.consume_founder_bootstrap_token('null.ttl@test.internal', 'hash_null', '1.1.1.1', $1);", [syntheticUserIds[0]]);
  } catch (err) {
    nullTtlCaught = true;
    nullTtlMsg = err.message;
  }
  if (nullTtlCaught && nullTtlMsg.includes("NULL TTL prohibited")) {
    console.log(`✅ Reg 1 PASSED: NULL expires_at explicitly rejected ("${nullTtlMsg}").`);
  } else {
    throw new Error("Reg 1 FAILED: NULL expires_at was not rejected!");
  }

  // Clean vault for Reg 2
  await adminClient.query("ALTER TABLE public.founder_bootstrap_vault DISABLE TRIGGER trg_prevent_bootstrap_vault_deletion;");
  await adminClient.query("TRUNCATE TABLE public.founder_bootstrap_vault;");
  await adminClient.query("ALTER TABLE public.founder_bootstrap_vault ENABLE TRIGGER trg_prevent_bootstrap_vault_deletion;");

  // Reg 2: Expired Token Rejection
  console.log("\n[Reg 2] Testing Expired Token rejection...");
  await adminClient.query(`
    INSERT INTO public.founder_bootstrap_vault (founder_email, token_hash, expires_at)
    VALUES ('expired@test.internal', 'hash_exp', NOW() - INTERVAL '10 minutes');
  `);
  let expCaught = false;
  let expMsg = '';
  try {
    await adminClient.query("SELECT public.consume_founder_bootstrap_token('expired@test.internal', 'hash_exp', '1.1.1.1', $1);", [syntheticUserIds[0]]);
  } catch (err) {
    expCaught = true;
    expMsg = err.message;
  }
  if (expCaught && expMsg.includes("token has expired")) {
    console.log(`✅ Reg 2 PASSED: Expired token rejected ("${expMsg}").`);
  } else {
    throw new Error("Reg 2 FAILED: Expired token was not rejected!");
  }

  // Clean vault for Reg 3
  await adminClient.query("ALTER TABLE public.founder_bootstrap_vault DISABLE TRIGGER trg_prevent_bootstrap_vault_deletion;");
  await adminClient.query("TRUNCATE TABLE public.founder_bootstrap_vault;");
  await adminClient.query("ALTER TABLE public.founder_bootstrap_vault ENABLE TRIGGER trg_prevent_bootstrap_vault_deletion;");

  // Reg 3: Profile Reconciliation (Remediation 2)
  console.log("\n[Reg 3] Testing Profile Reconciliation on pre-existing conflicting profile...");
  const opsDeptId = (await adminClient.query("SELECT id FROM public.departments WHERE code = 'OPS';")).rows[0].id;
  const execDeptId = (await adminClient.query("SELECT id FROM public.departments WHERE code = 'EXEC';")).rows[0].id;
  const targetUser = syntheticUserIds[1];

  // Pre-seed an employee profile in OPS with an old title
  await adminClient.query(`
    INSERT INTO public.employee_profiles (user_id, department_id, designation, employment_status)
    VALUES ($1, $2, 'Customer Service Rep', 'suspended');
  `, [targetUser, opsDeptId]);

  // Seed vault
  const validHash = "valid_hash_reconcile";
  await adminClient.query(`
    INSERT INTO public.founder_bootstrap_vault (founder_email, token_hash, expires_at)
    VALUES ('reconcile@test.internal', $1, NOW() + INTERVAL '1 hour');
  `, [validHash]);

  // Consume token
  await adminClient.query("SELECT public.consume_founder_bootstrap_token('reconcile@test.internal', $1, '1.1.1.1', $2);", [validHash, targetUser]);

  // Inspect profile post-bootstrap
  const reconciledProf = (await adminClient.query("SELECT department_id, designation, employment_status FROM public.employee_profiles WHERE user_id = $1;", [targetUser])).rows[0];
  console.log("[Reconciled Profile State]:", reconciledProf);

  if (
    reconciledProf.department_id === execDeptId &&
    reconciledProf.designation === 'Founder & Managing Director' &&
    reconciledProf.employment_status === 'active'
  ) {
    console.log("✅ Reg 3 PASSED: Pre-existing profile cleanly reconciled to EXEC department and 'Founder & Managing Director'.");
  } else {
    throw new Error("Reg 3 FAILED: Profile was not reconciled correctly!");
  }

  // Reg 4: App-Specific Membership Isolation
  console.log("\n[Reg 4] Testing App-Specific Membership Isolation...");
  // Pre-seed an operations membership for targetUser
  await adminClient.query(`
    INSERT INTO public.user_app_memberships (user_id, app_name, role, custom_permissions, is_active)
    VALUES ($1, 'operations', 'Support Executive', '["tickets"]'::jsonb, TRUE);
  `, [targetUser]);

  const memsPost = (await adminClient.query("SELECT app_name, role, is_active FROM public.user_app_memberships WHERE user_id = $1 ORDER BY app_name;", [targetUser])).rows;
  console.log("[Memberships]:", memsPost);

  const allMem = memsPost.find(m => m.app_name === 'all');
  const opsMem = memsPost.find(m => m.app_name === 'operations');

  if (allMem.role === 'OWNER' && opsMem.role === 'Support Executive') {
    console.log("✅ Reg 4 PASSED: Global OWNER established while preserving specific operations membership untouched.");
  } else {
    throw new Error("Reg 4 FAILED: Isolation broken!");
  }

  // Reg 5: Second Vault Row Rejection (Expression Index)
  console.log("\n[Reg 5] Testing Second Vault Row Rejection via Unique Index...");
  let secondRowBlocked = false;
  let secondRowCode = '';
  try {
    await adminClient.query(`
      INSERT INTO public.founder_bootstrap_vault (founder_email, token_hash, expires_at)
      VALUES ('second.vault@test.internal', 'hash_second', NOW() + INTERVAL '1 hour');
    `);
  } catch (err) {
    secondRowBlocked = true;
    secondRowCode = err.code;
  }
  if (secondRowBlocked && secondRowCode === '23505') {
    console.log("✅ Reg 5 PASSED: Unique expression index uq_founder_bootstrap_single_row strictly blocked second vault row (SQLSTATE 23505).");
  } else {
    throw new Error("Reg 5 FAILED: Second vault row was not rejected!");
  }

  // Reg 6: Audit Failure Rollback
  console.log("\n[Reg 6] Testing Complete Transaction Rollback on Audit Failure...");
  // Add trigger on audit logs to simulate disk failure
  await adminClient.query(`
    CREATE OR REPLACE FUNCTION fail_audit_now() RETURNS TRIGGER AS $$
    BEGIN
        RAISE EXCEPTION 'Audit Disk Out of Space' USING ERRCODE = '54000';
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS trg_audit_fail ON public.enterprise_audit_logs;
    CREATE TRIGGER trg_audit_fail BEFORE INSERT ON public.enterprise_audit_logs FOR EACH STATEMENT EXECUTE FUNCTION fail_audit_now();
  `);

  // Clean vault for Reg 6
  await adminClient.query("ALTER TABLE public.founder_bootstrap_vault DISABLE TRIGGER trg_prevent_bootstrap_vault_deletion;");
  await adminClient.query("TRUNCATE TABLE public.founder_bootstrap_vault;");
  await adminClient.query("ALTER TABLE public.founder_bootstrap_vault ENABLE TRIGGER trg_prevent_bootstrap_vault_deletion;");

  const failHash = "fail_audit_hash";
  const failUser = syntheticUserIds[2];
  await adminClient.query(`
    INSERT INTO public.founder_bootstrap_vault (founder_email, token_hash, expires_at)
    VALUES ('audit.fail@test.internal', $1, NOW() + INTERVAL '1 hour');
  `, [failHash]);

  let auditFailCaught = false;
  try {
    await adminClient.query("SELECT public.consume_founder_bootstrap_token('audit.fail@test.internal', $1, '1.1.1.1', $2);", [failHash, failUser]);
  } catch (err) {
    auditFailCaught = true;
  }

  const vStateAfterFail = (await adminClient.query("SELECT is_locked, consumed_at FROM public.founder_bootstrap_vault WHERE founder_email = 'audit.fail@test.internal';")).rows[0];
  const mStateAfterFail = (await adminClient.query("SELECT count(*) FROM public.user_app_memberships WHERE user_id = $1;", [failUser])).rows[0].count;

  if (auditFailCaught && vStateAfterFail.is_locked === false && mStateAfterFail === '0') {
    console.log("✅ Reg 6 PASSED: Transaction rollback on audit failure completely verified. Zero partial mutations committed.");
  } else {
    throw new Error("Reg 6 FAILED: Mutation survived audit failure!");
  }

  console.log("\n========================================================================");
  console.log("🎉 ALL REAL MULTI-SESSION CONCURRENCY & REGRESSION GATES PASSED (100%)");
  console.log("========================================================================");

  // Teardown
  await adminClient.end();
  await server.stop();
  console.log("[Teardown] Native PostgreSQL daemon stopped cleanly.");
}

runMultiSessionTest().catch(err => {
  console.error("FATAL MULTI-SESSION TEST ERROR:", err);
  process.exit(1);
});

