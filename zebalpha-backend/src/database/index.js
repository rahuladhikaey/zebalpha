import { supabase } from '../lib/supabase.js';
import pg from 'pg';
import { config } from '../config/index.js';

const { Pool } = pg;

// Direct PostgreSQL Connection Pool (configured for Supabase Pooler)
export const pool = new Pool({
  connectionString: config.databaseUrl,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

// Helper function to execute parameterized SQL queries directly on PostgreSQL
export const query = (text, params) => pool.query(text, params);

// Health check function to verify PostgreSQL connection
export const testDatabaseConnection = async () => {
  try {
    const res = await pool.query('SELECT current_database(), current_user, version()');
    console.log(`✅ PostgreSQL database connected successfully: ${res.rows[0].current_database} as ${res.rows[0].current_user}`);
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL connection error:', error.message);
    return false;
  }
};

// Supabase client instance for ORM/Storage/Auth operations
export const db = supabase;
export default db;
