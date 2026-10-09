import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/Full Folder 77/zebalpha-backend/back.env' });

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qjpahzstldiatfbutvfc.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase configuration");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function scanAndCleanTestEntries() {
  console.log("==========================================================");
  console.log("SCANNING & CLEANING HARDCODED / TEST SETTLEMENT DATA");
  console.log("==========================================================");

  // 1. Scan seller_payout_requests for test patterns
  const { data: testPayouts, error: pErr } = await supabase
    .from('seller_payout_requests')
    .select('id, payout_number, seller_id, amount, status, created_at')
    .or('payout_number.ilike.WTH-TEST-%,payout_number.ilike.WTH-AUDIT-%,payout_number.ilike.WTH-FAIL-%,payout_number.ilike.WTH-REV-%,payout_number.ilike.WTH-OVERDRAW-%,idempotency_key.ilike.audit_test_%,idempotency_key.ilike.test_math_%,idempotency_key.ilike.test_overdraw_%,idempotency_key.ilike.withdraw_%');

  console.log(`[Scan]: Found ${testPayouts?.length || 0} test payout requests to clean.`);

  if (testPayouts && testPayouts.length > 0) {
    const payoutIds = testPayouts.map(p => p.id);

    // Delete payout queue jobs linked to test payouts
    const { error: qErr } = await supabase
      .from('payout_queue')
      .delete()
      .in('payout_request_id', payoutIds);

    console.log("Deleted payout queue test jobs:", qErr ? qErr.message : "Success");

    // Delete test payout requests
    const { error: delPErr } = await supabase
      .from('seller_payout_requests')
      .delete()
      .in('id', payoutIds);

    console.log("Deleted test seller_payout_requests:", delPErr ? delPErr.message : "Success");
  }

  // 2. Scan seller_financial_ledger for test entries
  const { data: testLedgerRows } = await supabase
    .from('seller_financial_ledger')
    .select('id, reference_id, idempotency_key, description')
    .or('reference_id.ilike.WTH-TEST-%,reference_id.ilike.WTH-AUDIT-%,reference_id.ilike.WTH-FAIL-%,reference_id.ilike.WTH-REV-%,reference_id.ilike.WTH-OVERDRAW-%,reference_id.ilike.DEP-100000-ZEBALPHA,reference_id.ilike.REF-TEST-PAYOUT-100000,idempotency_key.ilike.LEDGER_RES_test_%,idempotency_key.ilike.LEDGER_SUCC_test_%,idempotency_key.ilike.LEDGER_FAIL_test_%,idempotency_key.ilike.LEDGER_REV_test_%,idempotency_key.ilike.LEDGER_RES_audit_%,description.ilike.%Audit Test%');

  console.log(`[Scan]: Found ${testLedgerRows?.length || 0} test ledger entries to clean.`);

  if (testLedgerRows && testLedgerRows.length > 0) {
    const ledgerIds = testLedgerRows.map(l => l.id);
    const { error: delLErr } = await supabase
      .from('seller_financial_ledger')
      .delete()
      .in('id', ledgerIds);

    console.log("Deleted test ledger entries:", delLErr ? delLErr.message : "Success");
  }

  // 3. Scan webhook_events for test events
  const { data: testWebhooks } = await supabase
    .from('webhook_events')
    .select('id, event_id')
    .or('event_id.ilike.evt_123%,entity_id.ilike.rzp_test_%');

  if (testWebhooks && testWebhooks.length > 0) {
    const whIds = testWebhooks.map(w => w.id);
    await supabase.from('webhook_events').delete().in('id', whIds);
    console.log(`Deleted ${testWebhooks.length} test webhook events.`);
  }

  console.log("==========================================================");
  console.log("TEST DATA CLEANUP COMPLETED SUCCESSFULLY");
  console.log("==========================================================");
}

scanAndCleanTestEntries();
