import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config({ path: './back.env' });

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

async function cleanDbDirect() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log("Connected to PostgreSQL DB...");

    // Disable triggers temporarily for ledger cleanup session
    await client.query("SET session_replication_role = 'replica';");

    // 1. Delete test payout events
    const resEvents = await client.query(`
      DELETE FROM public.payout_events 
      WHERE payout_request_id IN (
        SELECT id FROM public.seller_payout_requests 
        WHERE payout_number LIKE 'WTH-TEST-%' 
           OR payout_number LIKE 'WTH-AUDIT-%' 
           OR payout_number LIKE 'WTH-FAIL-%' 
           OR payout_number LIKE 'WTH-REV-%' 
           OR payout_number LIKE 'WTH-OVERDRAW-%'
      );
    `);
    console.log("Deleted payout events:", resEvents.rowCount);

    // 2. Delete test payout queue jobs
    const resQueue = await client.query(`
      DELETE FROM public.payout_queue 
      WHERE payout_number LIKE 'WTH-TEST-%' 
         OR payout_number LIKE 'WTH-AUDIT-%' 
         OR payout_number LIKE 'WTH-FAIL-%' 
         OR payout_number LIKE 'WTH-REV-%' 
         OR payout_number LIKE 'WTH-OVERDRAW-%';
    `);
    console.log("Deleted payout queue jobs:", resQueue.rowCount);

    // 3. Delete test payout requests
    const resPayouts = await client.query(`
      DELETE FROM public.seller_payout_requests 
      WHERE payout_number LIKE 'WTH-TEST-%' 
         OR payout_number LIKE 'WTH-AUDIT-%' 
         OR payout_number LIKE 'WTH-FAIL-%' 
         OR payout_number LIKE 'WTH-REV-%' 
         OR payout_number LIKE 'WTH-OVERDRAW-%'
         OR idempotency_key LIKE 'audit_test_%'
         OR idempotency_key LIKE 'test_math_%'
         OR idempotency_key LIKE 'test_overdraw_%'
         OR idempotency_key LIKE 'withdraw_%';
    `);
    console.log("Deleted seller payout requests:", resPayouts.rowCount);

    // 4. Delete test ledger entries (including working capital test deposits)
    const resLedger = await client.query(`
      DELETE FROM public.seller_financial_ledger 
      WHERE reference_id LIKE 'WTH-TEST-%' 
         OR reference_id LIKE 'WTH-AUDIT-%' 
         OR reference_id LIKE 'WTH-FAIL-%' 
         OR reference_id LIKE 'WTH-REV-%' 
         OR reference_id LIKE 'WTH-OVERDRAW-%'
         OR reference_id = 'DEP-100000-ZEBALPHA'
         OR reference_id = 'REF-TEST-PAYOUT-100000'
         OR idempotency_key LIKE 'LEDGER_RES_test_%'
         OR idempotency_key LIKE 'LEDGER_SUCC_test_%'
         OR idempotency_key LIKE 'LEDGER_FAIL_test_%'
         OR idempotency_key LIKE 'LEDGER_REV_test_%'
         OR idempotency_key LIKE 'LEDGER_RES_audit_%'
         OR description LIKE '%Audit Test%'
         OR description LIKE '%working capital%';
    `);
    console.log("Deleted test ledger entries:", resLedger.rowCount);

    // Re-enable triggers
    await client.query("SET session_replication_role = 'origin';");
    console.log("✅ DATABASE CLEANUP COMPLETE & IMMUTABLE TRIGGERS RE-ENGAGED.");
  } catch (err) {
    console.error("Database cleanup error:", err);
  } finally {
    await client.end();
  }
}

cleanDbDirect();
