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

async function testMigrationDryRun() {
  console.log("=== ZEBALPHA DATABASE SECURITY MIGRATION DRY-RUN TEST ===");
  const migrationPath = path.resolve(__dirname, '../../supabase/20261014_production_security_hardening.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error("Migration file not found at:", migrationPath);
    process.exit(1);
  }

  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  console.log(`Loaded migration SQL (${migrationSql.length} bytes).`);

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000
  });

  try {
    await client.connect();
    console.log("✓ Connected to PostgreSQL staging/dev instance.");

    // Start transaction for atomic dry run
    await client.query("BEGIN;");
    console.log("✓ Started dry-run transaction (BEGIN).");

    // Execute the full migration script
    await client.query(migrationSql);
    console.log("✓ Migration executed successfully without syntax or schema errors.");

    // Rollback so no unintended mutations occur during dry-run
    await client.query("ROLLBACK;");
    console.log("✓ Transaction rolled back (ROLLBACK). Zero permanent mutations occurred during test.");
    console.log("=== MIGRATION DRY-RUN TEST: 100% SUCCESS ===");
  } catch (err) {
    try {
      await client.query("ROLLBACK;");
    } catch {}
    console.error("✗ Migration Dry-Run Failed:", err.message);
    if (err.position) {
      console.error(`Error position: char ${err.position}`);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

testMigrationDryRun();
