import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config({ path: './back.env' });

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qjpahzstldiatfbutvfc.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing Supabase configuration in back.env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function formatRow(testName, openAvail, amt, fee, resAmt, providerPaise, closeAvail, closeRes, debit, credit, expBal, actBal, pass) {
  return `| ${testName.padEnd(28)} | ₹${openAvail.toFixed(2).padStart(9)} | ₹${amt.toFixed(2).padStart(9)} | ₹${fee.toFixed(2).padStart(5)} | ₹${resAmt.toFixed(2).padStart(8)} | ${String(providerPaise).padStart(8)}p | ₹${closeAvail.toFixed(2).padStart(9)} | ₹${closeRes.toFixed(2).padStart(8)} | ₹${debit.toFixed(2).padStart(8)} | ₹${credit.toFixed(2).padStart(8)} | ₹${expBal.toFixed(2).padStart(9)} | ₹${actBal.toFixed(2).padStart(8)} | ${pass ? '✅ PASS' : '❌ FAIL'} |`;
}

async function runMathematicalReconciliationAudit() {
  console.log("=================================================================================================================================================================================");
  console.log("ZEBALPHA END-TO-END MATHEMATICAL WITHDRAWAL RECONCILIATION AUDIT SUITE");
  console.log("=================================================================================================================================================================================");
  console.log("| Test Scenario                | Opening Avail | Withdrawal  | Fee    | Reserved | Provider   | Closing Avail | Closing Res | Ledger Db | Ledger Cr | Expected  | Actual   | Status  |");
  console.log("=================================================================================================================================================================================");

  const testSellerId = '0a49cb22-07ea-40bc-856a-3f64f8826db6';
  let passedCount = 0;
  let failedCount = 0;

  // Helper to fetch live ledger balances directly from backend RPC/Ledger
  async function fetchLiveBalance() {
    const { data: rows } = await supabase
      .from('seller_financial_ledger')
      .select('*')
      .eq('seller_id', testSellerId)
      .eq('status', 'COMPLETED');

    let grossSales = 0;
    let totalDeductions = 0;
    let totalSettled = 0;
    let reversedSettled = 0;

    (rows || []).forEach(r => {
      const a = Number(r.amount) || 0;
      if (r.entry_type === 'CREDIT' && ['SALE', 'SALE_CREDIT', 'ADJUSTMENT_CREDIT'].includes(r.transaction_type)) grossSales += a;
      if (r.entry_type === 'DEBIT' && ['COMMISSION', 'FIXED_FEE', 'SHIPPING_FEE', 'COLLECTION_FEE', 'REFUND', 'PARTIAL_REFUND', 'RETURN_FEE', 'RTO_FEE', 'TAX', 'PENALTY'].includes(r.transaction_type)) totalDeductions += a;
      if (r.transaction_type === 'WITHDRAWAL_SUCCESS' || r.transaction_type === 'SETTLEMENT') totalSettled += a;
      if (r.transaction_type === 'WITHDRAWAL_REVERSED' || r.transaction_type === 'SETTLEMENT_REVERSAL') reversedSettled += a;
    });

    const netEarnings = Math.max(0, grossSales - totalDeductions);
    const netSettled = Math.max(0, totalSettled - reversedSettled);

    const { data: activeRequests } = await supabase
      .from('seller_payout_requests')
      .select('amount')
      .eq('seller_id', testSellerId)
      .in('status', ['PENDING', 'PROCESSING']);

    const reserved = (activeRequests || []).reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const available = Math.max(0, netEarnings - netSettled - reserved);

    return { available, reserved, netEarnings, netSettled };
  }

  // TEST SCENARIOS LIST
  const amountsToTest = [1, 10, 100, 999, 1000, 10000];

  for (const amt of amountsToTest) {
    const fee = 0.00; // Zero withdrawal fee configured
    const initial = await fetchLiveBalance();
    const openAvail = initial.available;

    if (openAvail < amt) {
      // Test overdraw rejection invariant
      const key = `test_overdraw_${amt}_${Date.now()}`;
      const { data: res } = await supabase.rpc('reserve_seller_balance_for_withdrawal', {
        p_seller_id: testSellerId,
        p_amount: amt,
        p_idempotency_key: key,
        p_payout_number: `WTH-TEST-OVERDRAW-${amt}`,
        p_destination_masked: '9*****40@axl',
        p_destination_upi: 'rahul@axl',
        p_beneficiary_name: 'Audit'
      });

      const after = await fetchLiveBalance();
      const isPass = res?.success === false && res?.error === 'INSUFFICIENT_BALANCE' && after.available === openAvail;
      if (isPass) passedCount++; else failedCount++;

      console.log(formatRow(`Withdrawal ₹${amt} (Insufficient)`, openAvail, amt, fee, 0, Math.round(amt * 100), after.available, after.reserved, 0, 0, openAvail, after.available, isPass));
      continue;
    }

    // Perform balance reservation
    const uniqueKey = `test_math_${amt}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const payoutNo = `WTH-TEST-${amt}-${Date.now().toString(36).toUpperCase()}`;

    const { data: res } = await supabase.rpc('reserve_seller_balance_for_withdrawal', {
      p_seller_id: testSellerId,
      p_amount: amt,
      p_idempotency_key: uniqueKey,
      p_payout_number: payoutNo,
      p_destination_masked: '9*****40@axl',
      p_destination_upi: 'rahul@axl',
      p_beneficiary_name: 'Audit Test'
    });

    const afterRes = await fetchLiveBalance();
    const expectedAvail = openAvail - amt - fee;
    const providerPaise = Math.round(amt * 100);
    const payoutId = res?.payout_id;

    const resPass = res?.success === true && Math.abs(afterRes.available - expectedAvail) < 0.01 && Math.abs(afterRes.reserved - (initial.reserved + amt)) < 0.01;
    if (resPass) passedCount++; else failedCount++;

    console.log(formatRow(`Withdrawal ₹${amt} Reserved`, openAvail, amt, fee, amt, providerPaise, afterRes.available, afterRes.reserved, amt, 0, expectedAvail, afterRes.available, resPass));

    // TEST SUCCESS FLOW FOR THIS PAYOUT
    if (payoutId) {
      const openSuccAvail = afterRes.available;
      const { data: succRes } = await supabase.rpc('finalize_payout_success', {
        p_payout_id: payoutId,
        p_provider_payout_id: `rzp_test_pout_${Date.now()}`,
        p_utr_number: `UTR-TEST-${Date.now()}`
      });

      const afterSucc = await fetchLiveBalance();
      // Available balance should remain constant at openSuccAvail (was already deducted when reserved), reserved drops by amt
      const succPass = succRes?.success === true && Math.abs(afterSucc.available - openSuccAvail) < 0.01 && Math.abs(afterSucc.reserved - (afterRes.reserved - amt)) < 0.01;
      if (succPass) passedCount++; else failedCount++;

      console.log(formatRow(`Withdrawal ₹${amt} Completed`, openSuccAvail, amt, fee, 0, providerPaise, afterSucc.available, afterSucc.reserved, amt, 0, openSuccAvail, afterSucc.available, succPass));
    }
  }

  // TEST OVERDRAW ATTEMPT: AVAILABLE BALANCE + ₹1
  {
    const curr = await fetchLiveBalance();
    const overdrawAmt = curr.available + 1.00;
    const { data: res } = await supabase.rpc('reserve_seller_balance_for_withdrawal', {
      p_seller_id: testSellerId,
      p_amount: overdrawAmt,
      p_idempotency_key: `test_overdraw_plus1_${Date.now()}`,
      p_payout_number: `WTH-OVERDRAW-PLUS1`,
      p_destination_masked: '9*****40@axl',
      p_destination_upi: 'rahul@axl',
      p_beneficiary_name: 'Audit'
    });

    const after = await fetchLiveBalance();
    const isPass = res?.success === false && res?.error === 'INSUFFICIENT_BALANCE' && after.available === curr.available;
    if (isPass) passedCount++; else failedCount++;

    console.log(formatRow(`Avail + ₹1 Overdraw Reject`, curr.available, overdrawAmt, 0, 0, Math.round(overdrawAmt * 100), after.available, after.reserved, 0, 0, curr.available, after.available, isPass));
  }

  // TEST FAILED PAYOUT ROLLBACK (FUNDS RELEASED EXACTLY ONCE TO AVAILABLE)
  {
    const curr = await fetchLiveBalance();
    const amt = 50.00;
    if (curr.available >= amt) {
      const key = `test_failed_flow_${Date.now()}`;
      const payoutNo = `WTH-FAIL-${Date.now().toString(36).toUpperCase()}`;

      const { data: res } = await supabase.rpc('reserve_seller_balance_for_withdrawal', {
        p_seller_id: testSellerId,
        p_amount: amt,
        p_idempotency_key: key,
        p_payout_number: payoutNo,
        p_destination_masked: '9*****40@axl',
        p_destination_upi: 'rahul@axl',
        p_beneficiary_name: 'Audit Fail Test'
      });

      const afterRes = await fetchLiveBalance();
      const payoutId = res?.payout_id;

      if (payoutId) {
        // Finalize payout failure
        const { data: failRes } = await supabase.rpc('finalize_payout_failure', {
          p_payout_id: payoutId,
          p_failure_reason: 'Account closed by beneficiary bank'
        });

        const afterFail = await fetchLiveBalance();
        const failPass = failRes?.success === true && Math.abs(afterFail.available - curr.available) < 0.01 && Math.abs(afterFail.reserved - curr.reserved) < 0.01;
        if (failPass) passedCount++; else failedCount++;

        console.log(formatRow(`Withdrawal ₹50 Failed Release`, afterRes.available, amt, 0, 0, 5000, afterFail.available, afterFail.reserved, 0, amt, curr.available, afterFail.available, failPass));
      }
    }
  }

  // TEST REVERSED PAYOUT FLOW
  {
    const curr = await fetchLiveBalance();
    const amt = 25.00;
    if (curr.available >= amt) {
      const key = `test_rev_flow_${Date.now()}`;
      const payoutNo = `WTH-REV-${Date.now().toString(36).toUpperCase()}`;

      const { data: res } = await supabase.rpc('reserve_seller_balance_for_withdrawal', {
        p_seller_id: testSellerId,
        p_amount: amt,
        p_idempotency_key: key,
        p_payout_number: payoutNo,
        p_destination_masked: '9*****40@axl',
        p_destination_upi: 'rahul@axl',
        p_beneficiary_name: 'Audit Rev Test'
      });

      const payoutId = res?.payout_id;
      if (payoutId) {
        // 1. Mark success
        await supabase.rpc('finalize_payout_success', {
          p_payout_id: payoutId,
          p_provider_payout_id: `rzp_rev_${Date.now()}`,
          p_utr_number: `UTR-REV-${Date.now()}`
        });

        const afterSucc = await fetchLiveBalance();

        // 2. Mark reversed
        const { data: revRes } = await supabase.rpc('finalize_payout_reversal', {
          p_payout_id: payoutId,
          p_reason: 'NPCI bank settlement reversal'
        });

        const afterRev = await fetchLiveBalance();
        const revPass = revRes?.success === true && Math.abs(afterRev.available - curr.available) < 0.01;
        if (revPass) passedCount++; else failedCount++;

        console.log(formatRow(`Withdrawal ₹25 Reversal Release`, afterSucc.available, amt, 0, 0, 2500, afterRev.available, afterRev.reserved, 0, amt, curr.available, afterRev.available, revPass));
      }
    }
  }

  console.log("=================================================================================================================================================================" );
  console.log(`MATHEMATICAL AUDIT SUMMARY: ${passedCount} PASSED / ${failedCount} FAILED`);
  console.log("=================================================================================================================================================================");
}

runMathematicalReconciliationAudit();
