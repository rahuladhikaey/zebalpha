import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, createSupabaseServerClient } from "@shared/utils/supabaseServer";
import { computeLedgerBalances } from "@shared/services/financialLedgerService";
import { LedgerTransaction } from "@shared/types/ledger";
import { createProviderPayout } from "@/shared/services/razorpayPayoutService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
 * On-demand seller withdrawal / settlement request
 * Validates eligibility, available balance, reserves funds in ledger,
 * calls Razorpay Payouts API, and updates real-time status.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
    }

    const { data: seller } = await supabaseServer
      .from("sellers")
      .select("id, business_name, phonepay_number, phonepay_no")
      .eq("user_id", user.id)
      .maybeSingle();

    const sellerId = seller?.id || user.id;

    // 1. Fetch live ledger transactions to compute exact available balance
    const { data: ledgerRows } = await supabaseServer
      .from("seller_financial_ledger")
      .select("*")
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false });

    const transactions = (ledgerRows || []) as LedgerTransaction[];
    const balances = computeLedgerBalances(transactions);

    const body = await req.json().catch(() => ({}));
    const requestedAmount = Number(body.amount) || balances.available_balance;

    if (requestedAmount <= 0) {
      return NextResponse.json({
        success: false,
        error: "Withdrawal amount must be greater than zero."
      }, { status: 400 });
    }

    if (requestedAmount > balances.available_balance) {
      return NextResponse.json({
        success: false,
        error: `Insufficient available balance. You have ₹${balances.available_balance.toFixed(2)} eligible for settlement.`
      }, { status: 400 });
    }

    // 2. Fetch and confirm verified settlement method
    let settlementMethod: any = null;
    const { data: methods } = await supabaseServer
      .from("seller_settlement_methods")
      .select("*")
      .eq("seller_id", sellerId)
      .eq("is_verified", true)
      .order("is_default", { ascending: false })
      .limit(1);

    if (methods && methods.length > 0) {
      settlementMethod = methods[0];
    } else if (seller?.phonepay_number || seller?.phonepay_no) {
      // Fallback if verified UPI is present on seller profile
      const upi = seller.phonepay_number || seller.phonepay_no;
      settlementMethod = {
        id: "profile-upi",
        method_type: "UPI",
        destination_raw: upi,
        masked_destination: upi,
        verified_name: seller.business_name || "Merchant",
        is_verified: true
      };
    }

    if (!settlementMethod || !settlementMethod.is_verified) {
      return NextResponse.json({
        success: false,
        error: "No verified settlement method found. Please verify and save your UPI ID before withdrawing."
      }, { status: 400 });
    }

    // 3. Generate unique settlement ID and idempotency key
    const uniqueSuffix = `${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const payoutNumber = `SET-${uniqueSuffix}`;
    const idempotencyKey = req.headers.get("x-idempotency-key") || `withdraw_${sellerId}_${uniqueSuffix}`;

    // 4. Reserve amount by recording debit transaction in immutable financial ledger
    const { error: ledgerDebitErr } = await supabaseServer
      .from("seller_financial_ledger")
      .insert([{
        seller_id: sellerId,
        transaction_type: "PAYOUT",
        amount: requestedAmount,
        currency: "INR",
        reference_type: "PAYOUT_REQUEST",
        reference_id: payoutNumber,
        status: "PROCESSING",
        description: `Disbursement to ${settlementMethod.method_type} (${settlementMethod.masked_destination}) - ID: ${payoutNumber}`,
        metadata: {
          settlementMethodId: settlementMethod.id,
          methodType: settlementMethod.method_type,
          payoutNumber
        }
      }]);

    if (ledgerDebitErr) {
      console.error("[Ledger Debit Error]:", ledgerDebitErr);
      return NextResponse.json({ success: false, error: "Failed to reserve settlement balance." }, { status: 500 });
    }

    // 5. Initiate Payout with Provider (Razorpay)
    const providerResult = await createProviderPayout({
      sellerId,
      amount: requestedAmount,
      vpa: settlementMethod.destination_raw || settlementMethod.metadata?.vpa || settlementMethod.masked_destination,
      beneficiaryName: settlementMethod.verified_name || seller?.business_name || "Seller Settlement",
      payoutNumber,
      idempotencyKey
    });

    const finalStatus = providerResult.status || (providerResult.success ? "COMPLETED" : "FAILED");

    // 6. Record Payout Request
    const { data: payoutRecord, error: payoutInsertErr } = await supabaseServer
      .from("seller_payout_requests")
      .insert([{
        payout_number: payoutNumber,
        seller_id: sellerId,
        settlement_method_id: settlementMethod.id === "profile-upi" ? null : settlementMethod.id,
        method_type: settlementMethod.method_type,
        destination_masked: settlementMethod.masked_destination,
        beneficiary_name: settlementMethod.verified_name,
        amount: requestedAmount,
        status: finalStatus,
        provider: "RAZORPAY",
        provider_payout_id: providerResult.providerPayoutId || null,
        utr_number: providerResult.utrNumber || null,
        failure_reason: providerResult.failureReason || null,
        idempotency_key: idempotencyKey,
        notes: `Payout via ${settlementMethod.method_type}`
      }])
      .select()
      .single();

    // Also mirror to legacy seller_settlements table for complete history compatibility
    try {
      await supabaseServer.from("seller_settlements").insert([{
        seller_id: sellerId,
        settlement_number: payoutNumber,
        week_number: Math.ceil(new Date().getDate() / 7),
        start_date: new Date(Date.now() - 7 * 86400000).toISOString(),
        end_date: new Date().toISOString(),
        total_orders: 1,
        gross_sales: requestedAmount,
        commission_deducted: 0,
        platform_fees: 0,
        taxes: 0,
        net_amount: requestedAmount,
        status: finalStatus === "COMPLETED" ? "PAID" : finalStatus === "FAILED" ? "FAILED" : "PROCESSING",
        transaction_id: providerResult.utrNumber || payoutNumber,
        utr_number: providerResult.utrNumber || null,
        notes: providerResult.failureReason || `Disbursement to ${settlementMethod.masked_destination}`
      }]);
    } catch (_) {}

    // 7. If payout completely failed, reverse the ledger debit
    if (finalStatus === "FAILED") {
      await supabaseServer.from("seller_financial_ledger").insert([{
        seller_id: sellerId,
        transaction_type: "ADJUSTMENT",
        amount: requestedAmount,
        currency: "INR",
        reference_type: "PAYOUT_REVERSAL",
        reference_id: payoutNumber,
        status: "COMPLETED",
        description: `Reversal of failed settlement ${payoutNumber}: ${providerResult.failureReason || "Provider error"}`
      }]);

      return NextResponse.json({
        success: false,
        status: "FAILED",
        payoutNumber,
        error: providerResult.failureReason || "Payout could not be processed by the banking network.",
        failureReason: providerResult.failureReason
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      status: finalStatus,
      message: finalStatus === "COMPLETED"
        ? `Settlement of ₹${requestedAmount.toFixed(2)} completed successfully!`
        : `Settlement request ${payoutNumber} submitted and is currently processing.`,
      payout: {
        id: payoutRecord?.id || payoutNumber,
        payout_number: payoutNumber,
        amount: requestedAmount,
        status: finalStatus,
        method: settlementMethod.method_type,
        destination_masked: settlementMethod.masked_destination,
        utr_number: providerResult.utrNumber || null,
        created_at: new Date().toISOString()
      }
    });
  } catch (err: any) {
    console.error("[Withdrawal Route Exception]:", err);
    return NextResponse.json({ success: false, error: err?.message || "Internal server error" }, { status: 500 });
  }
}
