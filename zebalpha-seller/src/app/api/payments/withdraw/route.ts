import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, createSupabaseServerClient } from "@/shared/utils/supabaseServer";
import { computeLedgerBalances } from "@/shared/services/financialLedgerService";
import { LedgerTransaction } from "@/shared/types/ledger";
import { createProviderPayout } from "@/shared/services/razorpayPayoutService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MIN_WITHDRAWAL_AMOUNT = 100; // Minimum ₹100 withdrawal

async function getAuthenticatedUser(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return user;
  } catch (_) {}

  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    const { data: tokenUser } = await supabaseServer.auth.getUser(token);
    if (tokenUser?.user) return tokenUser.user;
  }

  return null;
}

/**
 * POST /api/payments/withdraw
 * ZebAlpha UPI-Only On-Demand Seller Withdrawal API.
 * Validates:
 * - seller authentication & active status
 * - verified UPI ID existence
 * - available balance & minimum threshold
 * - duplicate click / existing processing withdrawal locks
 * - Razorpay UPI payout execution
 * - immutable ledger transaction tracking
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
    }

    // 1. Seller Account Status & Eligibility
    const { data: seller, error: sellerErr } = await supabaseServer
      .from("sellers")
      .select("id, status, business_name, phonepay_number, phonepay_no")
      .eq("user_id", user.id)
      .maybeSingle();

    if (sellerErr || !seller) {
      return NextResponse.json({ success: false, error: "Seller account not found." }, { status: 404 });
    }

    if (seller.status && ['suspended', 'banned', 'frozen', 'blocked'].includes(seller.status.toLowerCase())) {
      return NextResponse.json({
        success: false,
        error: "Your seller account is currently not eligible for withdrawals. Please contact seller support."
      }, { status: 403 });
    }

    const sellerId = seller.id;

    // 2. Fetch and confirm verified UPI settlement method
    let settlementMethod: any = null;
    const { data: methods } = await supabaseServer
      .from("seller_settlement_methods")
      .select("*")
      .eq("seller_id", sellerId)
      .eq("method_type", "UPI")
      .eq("is_verified", true)
      .eq("status", "VERIFIED")
      .order("is_default", { ascending: false })
      .limit(1);

    if (methods && methods.length > 0) {
      settlementMethod = methods[0];
    } else if (seller.phonepay_number || seller.phonepay_no) {
      const upi = seller.phonepay_number || seller.phonepay_no;
      if (upi.includes("@")) {
        settlementMethod = {
          id: "profile-upi",
          method_type: "UPI",
          upi_id: upi,
          destination_raw: upi,
          masked_destination: upi,
          verified_name: seller.business_name || "Verified Merchant",
          is_verified: true,
          status: "VERIFIED"
        };
      }
    }

    if (!settlementMethod || !settlementMethod.is_verified) {
      return NextResponse.json({
        success: false,
        error: "No verified UPI ID found. Please add and verify your UPI ID before requesting a withdrawal."
      }, { status: 400 });
    }

    // 3. Prevent duplicate requests: Check for existing PROCESSING withdrawals
    const { data: activePayouts } = await supabaseServer
      .from("seller_payout_requests")
      .select("id, payout_number, status, created_at")
      .eq("seller_id", sellerId)
      .in("status", ["PENDING", "PROCESSING"])
      .order("created_at", { ascending: false })
      .limit(1);

    if (activePayouts && activePayouts.length > 0) {
      return NextResponse.json({
        success: false,
        error: "A withdrawal request is currently processing. Please wait for it to complete before initiating another payout."
      }, { status: 409 });
    }

    // 4. Fetch live ledger transactions to compute exact available balance
    const { data: ledgerRows } = await supabaseServer
      .from("seller_financial_ledger")
      .select("*")
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false });

    const transactions = (ledgerRows || []) as LedgerTransaction[];
    const balances = computeLedgerBalances(transactions);

    const body = await req.json().catch(() => ({}));
    const requestedAmount = Number(body.amount);

    if (isNaN(requestedAmount) || requestedAmount <= 0) {
      return NextResponse.json({
        success: false,
        error: "Please enter a valid withdrawal amount."
      }, { status: 400 });
    }

    if (requestedAmount < MIN_WITHDRAWAL_AMOUNT) {
      return NextResponse.json({
        success: false,
        error: `Minimum withdrawal amount is ₹${MIN_WITHDRAWAL_AMOUNT}.`
      }, { status: 400 });
    }

    if (requestedAmount > balances.available_balance) {
      return NextResponse.json({
        success: false,
        error: `Insufficient available balance. You have ₹${balances.available_balance.toFixed(2)} available to withdraw.`
      }, { status: 400 });
    }

    // 5. Generate unique settlement ID and idempotency key
    const uniqueSuffix = `${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const payoutNumber = `WTH-${uniqueSuffix}`;
    const idempotencyKey = String(body.idempotencyKey || req.headers.get("x-idempotency-key") || `withdraw_${sellerId}_${uniqueSuffix}`);

    // Check if idempotency key already exists to prevent duplicate clicks
    const { data: existingKey } = await supabaseServer
      .from("seller_payout_requests")
      .select("id, payout_number, status")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (existingKey) {
      return NextResponse.json({
        success: true,
        message: "Withdrawal request already received and processing.",
        payout: existingKey
      });
    }

    const destinationUpi = settlementMethod.upi_id || settlementMethod.destination_raw || settlementMethod.metadata?.vpa;

    // 6. Reserve amount in immutable financial ledger (WITHDRAWAL_REQUESTED)
    const { error: ledgerDebitErr } = await supabaseServer
      .from("seller_financial_ledger")
      .insert([{
        seller_id: sellerId,
        transaction_type: "WITHDRAWAL_REQUESTED",
        entry_type: "DEBIT",
        amount: requestedAmount,
        currency: "INR",
        balance_after: Math.max(0, balances.available_balance - requestedAmount),
        status: "PENDING",
        description: `UPI Withdrawal Request to ${settlementMethod.masked_destination} (${payoutNumber})`,
        reference_id: payoutNumber,
        idempotency_key: idempotencyKey,
        metadata: {
          settlementMethodId: settlementMethod.id,
          methodType: "UPI",
          destinationUpi,
          payoutNumber
        }
      }]);

    if (ledgerDebitErr) {
      console.error("[Ledger Reservation Error]:", ledgerDebitErr);
      return NextResponse.json({ success: false, error: "Failed to reserve settlement balance." }, { status: 500 });
    }

    // 7. Initiate Razorpay UPI Payout
    const providerResult = await createProviderPayout({
      sellerId,
      amount: requestedAmount,
      vpa: destinationUpi,
      beneficiaryName: settlementMethod.verified_name || seller.business_name || "Seller Settlement",
      payoutNumber,
      idempotencyKey
    });

    const isImmediateSuccess = providerResult.status === "COMPLETED";
    const isImmediateFailed = providerResult.status === "FAILED";
    const payoutStatus = isImmediateSuccess ? "SUCCESS" : isImmediateFailed ? "FAILED" : "PROCESSING";

    // 8. Record Payout Request in database
    const { data: payoutRecord, error: payoutInsertErr } = await supabaseServer
      .from("seller_payout_requests")
      .insert([{
        payout_number: payoutNumber,
        seller_id: sellerId,
        settlement_method_id: settlementMethod.id === "profile-upi" ? null : settlementMethod.id,
        method_type: "UPI",
        destination_masked: settlementMethod.masked_destination,
        destination_upi: destinationUpi,
        beneficiary_name: settlementMethod.verified_name,
        amount: requestedAmount,
        status: payoutStatus,
        provider: "RAZORPAY",
        provider_payout_id: providerResult.providerPayoutId || null,
        provider_status: providerResult.status,
        utr_number: providerResult.utrNumber || null,
        failure_reason: providerResult.failureReason || null,
        idempotency_key: idempotencyKey,
        notes: `UPI Payout to ${settlementMethod.masked_destination}`,
        processed_at: isImmediateSuccess ? new Date().toISOString() : null
      }])
      .select()
      .single();

    if (payoutInsertErr) {
      console.error("[Payout Record Insert Warning]:", payoutInsertErr);
    }

    // 9. Update Ledger based on immediate result
    if (isImmediateSuccess) {
      // Completed payout: record WITHDRAWAL_SUCCESS
      await supabaseServer.from("seller_financial_ledger").insert([{
        seller_id: sellerId,
        transaction_type: "WITHDRAWAL_SUCCESS",
        entry_type: "DEBIT",
        amount: requestedAmount,
        currency: "INR",
        balance_after: Math.max(0, balances.available_balance - requestedAmount),
        status: "COMPLETED",
        description: `UPI Payout Completed (${payoutNumber}). UTR: ${providerResult.utrNumber || "N/A"}`,
        reference_id: payoutNumber,
        metadata: {
          utrNumber: providerResult.utrNumber,
          providerPayoutId: providerResult.providerPayoutId
        }
      }]);
    } else if (isImmediateFailed) {
      // Failed payout: automatically rollback reservation so seller balance is fully restored
      await supabaseServer.from("seller_financial_ledger").insert([{
        seller_id: sellerId,
        transaction_type: "WITHDRAWAL_FAILED",
        entry_type: "CREDIT",
        amount: requestedAmount,
        currency: "INR",
        balance_after: balances.available_balance,
        status: "COMPLETED",
        description: `Rollback of failed withdrawal ${payoutNumber}: ${providerResult.failureReason || "Provider rejection"}`,
        reference_id: payoutNumber,
        metadata: {
          failureReason: providerResult.failureReason
        }
      }]);

      return NextResponse.json({
        success: false,
        status: "FAILED",
        payoutNumber,
        error: providerResult.failureReason || "UPI payout could not be processed by the banking network.",
        failureReason: providerResult.failureReason
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      status: payoutStatus,
      message: isImmediateSuccess
        ? `₹${requestedAmount.toFixed(2)} successfully sent to ${settlementMethod.masked_destination}!`
        : `Withdrawal request ${payoutNumber} is processing. Funds will reach ${settlementMethod.masked_destination} shortly.`,
      payout: {
        id: payoutRecord?.id || payoutNumber,
        payout_number: payoutNumber,
        amount: requestedAmount,
        status: payoutStatus,
        destination_masked: settlementMethod.masked_destination,
        beneficiary_name: settlementMethod.verified_name,
        utr_number: providerResult.utrNumber || null,
        created_at: new Date().toISOString()
      }
    });
  } catch (err: any) {
    console.error("[Withdrawal Route Exception]:", err);
    return NextResponse.json({
      success: false,
      error: err?.message || "Internal server error during withdrawal"
    }, { status: 500 });
  }
}
