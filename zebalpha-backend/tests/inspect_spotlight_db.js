import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../back.env') });
if (!process.env.DATABASE_URL) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

async function inspect() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  
  const tables = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name LIKE '%spotlight%';
  `);
  console.log("Spotlight tables:", tables.rows.map(r => r.table_name));

  for (const t of tables.rows) {
    const cols = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `, [t.table_name]);
    console.log(`\nColumns for ${t.table_name}:`);
    console.table(cols.rows);
  }

  // Also check sample rows from spotlight_campaigns
  const rows = await client.query(`SELECT * FROM spotlight_campaigns LIMIT 5;`);
  console.log("\nExisting campaigns rows:", rows.rows);

  await client.end();
}

inspect().catch(console.error);
