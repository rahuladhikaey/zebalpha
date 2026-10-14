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
  console.log("No direct PostgreSQL connection string (DATABASE_URL) found in environment.");
  process.exit(0);
}

async function verifyMigration() {
  console.log("=== DRY RUN: VERIFYING RAZORPAYX UPI MIGRATION ===");
  const migrationPath = path.resolve(__dirname, '../../supabase/20261014_razorpayx_upi_verification_and_payouts.sql');
  const migrationSql = fs.readFileSync(migrationPath, 'utf8');

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });

  try {
    await client.connect();
    console.log("✓ Connected to PostgreSQL.");

    await client.query("BEGIN;");
    console.log("✓ Started transaction (BEGIN).");

    await client.query(migrationSql);
    console.log("✓ Migration executed with zero errors.");

    await client.query("ROLLBACK;");
    console.log("✓ Transaction rolled back (ROLLBACK). Dry run passed!");
  } catch (err) {
    try { await client.query("ROLLBACK;"); } catch {}
    console.error("✗ Migration dry run failed:", err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

verifyMigration();
