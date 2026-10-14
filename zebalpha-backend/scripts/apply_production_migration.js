/**
 * ZEBALPHA — APPLY PRODUCTION DATABASE SECURITY HARDENING MIGRATION
 * 
 * Applies supabase/20261014_production_security_hardening.sql atomically
 * to the production database and notifies PostgREST to reload the schema cache.
 */

import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../back.env') });
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Missing DIRECT_URL or DATABASE_URL in environment.");
  process.exit(1);
}

async function applyMigration() {
  console.log("=== APPLYING ZEBALPHA DATABASE SECURITY HARDENING TO PRODUCTION ===");
  const migrationPath = path.resolve(__dirname, '../../supabase/20261014_production_security_hardening.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error("Migration file not found at:", migrationPath);
    process.exit(1);
  }

  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000
  });

  try {
    await client.connect();
    console.log("✓ Connected to production PostgreSQL database.");

    await client.query("BEGIN;");
    console.log("✓ Transaction started (BEGIN).");

    await client.query(migrationSql);
    console.log("✓ All security migration statements executed successfully.");

    await client.query("NOTIFY pgrst, 'reload schema';");
    console.log("✓ Notified PostgREST to reload schema cache.");

    await client.query("COMMIT;");
    console.log("✓ Transaction committed (COMMIT).");

    console.log("=================================================================");
    console.log("  PRODUCTION DATABASE SECURITY HARDENING MIGRATION APPLIED!     ");
    console.log("=================================================================");
  } catch (err) {
    try {
      await client.query("ROLLBACK;");
      console.log("✓ Transaction rolled back safely.");
    } catch {}
    console.error("✗ Failed to apply migration:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
