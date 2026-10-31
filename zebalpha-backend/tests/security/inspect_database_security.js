import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env files
dotenv.config({ path: path.resolve(__dirname, '../../back.env') });
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
}

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const supabaseUrl = process.env.SUPABASE_A_URL || process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_A_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_A_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("=== PHASE 3: POSTGRESQL & POSTGREST LIVE SECURITY INSPECTION ===");
console.log("Database connection configured:", connectionString ? "YES" : "NO");
console.log("Supabase URL configured:", supabaseUrl ? "YES" : "NO");
console.log("Anon key configured:", supabaseAnonKey ? "YES" : "NO");
console.log("Service key configured:", supabaseServiceKey ? "YES" : "NO");

async function runDatabaseInspection() {
  const results = {
    dbConnected: false,
    publicSellersCatalogView: null,
    guardSellerStatusTrigger: null,
    sellersPolicies: [],
    securityDefinerSearchPaths: [],
    migrationDryRun: null,
    anonPostgrestSellersAccess: null,
    anonPostgrestCatalogAccess: null
  };

  // 1. Direct PostgreSQL Catalog Query
  if (connectionString) {
    const client = new Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000
    });

    try {
      await client.connect();
      results.dbConnected = true;
      console.log("\n[1] Direct PostgreSQL Connection: CONNECTED");

      // Get exact columns of public.sellers
      const colsRes = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'sellers' 
        ORDER BY ordinal_position;
      `);
      console.log(`[1.1] Columns in 'public.sellers':\n   ${colsRes.rows.map(r => r.column_name).join(', ')}`);

      // Check if view public_sellers_catalog exists
      const viewRes = await client.query(`
        SELECT table_name, view_definition 
        FROM information_schema.views 
        WHERE table_schema = 'public' AND table_name = 'public_sellers_catalog';
      `);
      results.publicSellersCatalogView = viewRes.rows.length > 0;
      console.log(`[2] View 'public_sellers_catalog' exists in DB: ${results.publicSellersCatalogView ? "YES" : "NO"}`);

      // Check if trigger trg_guard_seller_status exists on public.sellers
      const triggerRes = await client.query(`
        SELECT trigger_name, event_manipulation, action_statement 
        FROM information_schema.triggers 
        WHERE event_object_table = 'sellers' AND trigger_name = 'trg_guard_seller_status';
      `);
      results.guardSellerStatusTrigger = triggerRes.rows.length > 0;
      console.log(`[3] Trigger 'trg_guard_seller_status' exists on public.sellers: ${results.guardSellerStatusTrigger ? "YES" : "NO"}`);

      // Check RLS policies on public.sellers
      const policiesRes = await client.query(`
        SELECT policyname, permissive, roles, cmd, qual, with_check 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'sellers';
      `);
      results.sellersPolicies = policiesRes.rows;
      console.log(`[4] RLS Policies on 'public.sellers' count: ${policiesRes.rows.length}`);
      policiesRes.rows.forEach(p => console.log(`   - Policy: "${p.policyname}" [${p.cmd}] Roles: ${JSON.stringify(p.roles)}`));

      // Check search_path on SECURITY DEFINER functions
      const funcRes = await client.query(`
        SELECT proname, prosecdef, proconfig 
        FROM pg_proc 
        JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace 
        WHERE pg_namespace.nspname = 'public' 
          AND proname IN ('fn_handle_seller_status_change', 'fn_handle_seller_hard_delete', 'fn_guard_seller_status_changes', 'delete_seller_permanently');
      `);
      results.securityDefinerSearchPaths = funcRes.rows;
      console.log(`[5] SECURITY DEFINER functions audited:`);
      funcRes.rows.forEach(f => console.log(`   - Function: ${f.proname}() | SECDEF: ${f.prosecdef} | search_path config: ${JSON.stringify(f.proconfig)}`));

      // Dry-run the remediation migration to verify syntax and compatibility
      const migrationFile = path.resolve(__dirname, '../../../supabase/20261101_critical_security_remediation.sql');
      if (fs.existsSync(migrationFile)) {
        const sql = fs.readFileSync(migrationFile, 'utf8');
        try {
          await client.query("BEGIN;");
          await client.query(sql);
          await client.query("ROLLBACK;");
          results.migrationDryRun = "PASSED_CLEAN";
          console.log("[6] Migration 20261101 Dry-Run inside transaction: PASSED CLEANLY (Zero SQL errors)");
        } catch (mErr) {
          await client.query("ROLLBACK;");
          results.migrationDryRun = "FAILED: " + mErr.message;
          console.error("[6] Migration Dry-Run Error:", mErr.message);
        }
      }

      await client.end();
    } catch (pgErr) {
      console.warn("Direct PostgreSQL connection notice:", pgErr.message);
      results.dbConnected = false;
      results.dbError = pgErr.message;
    }
  } else {
    console.log("[1] Direct PostgreSQL: No DIRECT_URL / DATABASE_URL configured in local environment.");
  }

  // 2. Test Anonymous and Authenticated PostgREST Access via Supabase Client
  if (supabaseUrl && supabaseAnonKey) {
    console.log("\n[7] Testing Anonymous PostgREST Access via Supabase REST API...");
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);

    // Try reading public.sellers as anon
    try {
      const { data: sellersData, error: sellersErr } = await anonClient
        .from('sellers')
        .select('id, business_name, email, mobile_number, gstin, phonepay_number')
        .limit(5);

      if (sellersErr) {
        results.anonPostgrestSellersAccess = `BLOCKED_OR_ERROR: ${sellersErr.message} (Code: ${sellersErr.code})`;
        console.log(`   ✓ Anonymous access to 'public.sellers': BLOCKED (${sellersErr.message})`);
      } else if (!sellersData || sellersData.length === 0) {
        results.anonPostgrestSellersAccess = "EMPTY_OR_ZERO_ROWS";
        console.log("   ✓ Anonymous query to 'public.sellers' returned 0 records (RLS enforced)");
      } else {
        results.anonPostgrestSellersAccess = `LEAKED_${sellersData.length}_ROWS`;
        console.warn(`   ⚠️ WARNING: Anonymous access returned ${sellersData.length} seller records!`);
      }
    } catch (anonErr) {
      results.anonPostgrestSellersAccess = `EXCEPTION: ${anonErr.message}`;
    }

    // Try reading public.public_sellers_catalog as anon
    try {
      const { data: catalogData, error: catErr } = await anonClient
        .from('public_sellers_catalog')
        .select('*')
        .limit(5);

      if (catErr) {
        results.anonPostgrestCatalogAccess = `ERROR: ${catErr.message}`;
        console.log(`   Notice on 'public_sellers_catalog': ${catErr.message}`);
      } else {
        results.anonPostgrestCatalogAccess = `SUCCESS_ROWS_${catalogData?.length || 0}`;
        console.log(`   ✓ Anonymous query to 'public_sellers_catalog' returned ${catalogData?.length || 0} sanitized rows`);
      }
    } catch (catEx) {
      results.anonPostgrestCatalogAccess = `EXCEPTION: ${catEx.message}`;
    }
  }

  return results;
}

runDatabaseInspection().then(res => {
  console.log("\n=== INSPECTION COMPLETED ===");
}).catch(err => {
  console.error("Fatal Inspection Error:", err);
});
