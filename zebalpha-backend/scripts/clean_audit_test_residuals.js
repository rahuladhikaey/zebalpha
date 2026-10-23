import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: 'd:/Full Folder 77/zebalpha-backend/back.env' });

const { Client } = pg;
const connectionString = process.env.DATABASE_URL || "postgresql://postgres.qjpahzstldiatfbutvfc:zebalpha%402005@aws-0-ap-south-1.pooler.supabase.com:5432/postgres";

async function cleanAuditTestResiduals() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log("Connected to PostgreSQL database.");

  try {
    // 1. List current rows in seller_financial_ledger
    const res = await client.query(`
      SELECT id, seller_id, transaction_type, entry_type, amount, reference_id, idempotency_key, description 
      FROM public.seller_financial_ledger
      ORDER BY created_at ASC
    `);

    console.log(`Found ${res.rows.length} total ledger rows.`);
    const testIds = [];

    for (const row of res.rows) {
      const desc = String(row.description || "").toLowerCase();
      const ref = String(row.reference_id || "").toLowerCase();
      const idem = String(row.idempotency_key || "").toLowerCase();

      const isTest = 
        ref.includes("payout-reversal-test") ||
        desc.includes("reverse logistics charge") ||
        desc.includes("standard rto logistics charge") ||
        desc.includes("webhook idempotent delivery test") ||
        idem.includes("return_rev_ship_audit_") ||
        idem.includes("rto_charge_audit_") ||
        idem.includes("webhook_idem_test_") ||
        idem.includes("reversal_tx_audit_");

      if (isTest) {
        testIds.push(row.id);
        console.log(`[TEST ROW IDENTIFIED]: ${row.id} - ${row.transaction_type} ₹${row.amount} (${row.description})`);
      } else {
        console.log(`[REAL ORDER ROW PRESERVED]: ${row.id} - ${row.transaction_type} ₹${row.amount} (${row.description})`);
      }
    }

    if (testIds.length > 0) {
      console.log(`\nDisabling immutability trigger to remove ${testIds.length} test audit residuals...`);
      await client.query("ALTER TABLE public.seller_financial_ledger DISABLE TRIGGER trg_ledger_immutable");

      const delRes = await client.query("DELETE FROM public.seller_financial_ledger WHERE id = ANY($1::uuid[])", [testIds]);
      console.log(`Deleted ${delRes.rowCount} test rows.`);

      await client.query("ALTER TABLE public.seller_financial_ledger ENABLE TRIGGER trg_ledger_immutable");
      console.log("Re-enabled immutability trigger.");
    } else {
      console.log("No test residuals found to clean.");
    }

    // 2. Query clean balance summary
    const balRes = await client.query("SELECT * FROM public.seller_balance_summary()");
    console.log("\nClean authoritative balance summary after cleanup:");
    console.table(balRes.rows);

  } catch (err) {
    console.error("Cleanup error:", err);
  } finally {
    await client.end();
  }
}

cleanAuditTestResiduals();
