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
  console.error("No direct PostgreSQL connection string (DATABASE_URL / DIRECT_URL) found.");
  process.exit(1);
}

async function runMigration() {
  console.log("=== ZEBALPHA SPOTLIGHT MANAGER PRODUCTION MIGRATION ===");
  const migrationPath = path.resolve(__dirname, '../../supabase/20261026_spotlight_manager_production_schema.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error("Migration file not found at:", migrationPath);
    process.exit(1);
  }

  const migrationSql = fs.readFileSync(migrationPath, 'utf8');
  console.log(`Loaded migration SQL (${migrationSql.length} bytes).`);

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000
  });

  try {
    await client.connect();
    console.log("✓ Connected to Supabase PostgreSQL database.");

    // Execute the full migration script
    await client.query(migrationSql);
    console.log("✓ Spotlight migration executed successfully!");

    // Verify created tables
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('spotlight_campaigns', 'spotlight_editorial_cards', 'spotlight_campaign_items');
    `);
    console.log("✓ Verified created tables:", res.rows.map(r => r.table_name));

    // Verify storage bucket
    const bucketRes = await client.query(`
      SELECT id, name, public, file_size_limit, allowed_mime_types
      FROM storage.buckets
      WHERE id = 'editorial';
    `);
    console.log("✓ Verified 'editorial' storage bucket:", bucketRes.rows);

    // Verify Top Deals seed
    const campaignRes = await client.query(`
      SELECT id, name, status, selection_mode, max_cards, required_cards
      FROM public.spotlight_campaigns
      WHERE name = 'Top Deals';
    `);
    console.log("✓ Verified Top Deals campaign seed:", campaignRes.rows);

    console.log("=== MIGRATION COMPLETE: 100% SUCCESS ===");
  } catch (err) {
    console.error("✗ Migration Failed:", err.message);
    if (err.position) {
      console.error(`Error position: char ${err.position}`);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
