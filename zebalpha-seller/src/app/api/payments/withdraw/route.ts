import { NextRequest, NextResponse } from "next/server";
import { supabaseServer, createSupabaseServerClient } from "@/shared/utils/supabaseServer";
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
 * ZebAlpha UPI-Only Production Seller Withdrawal API.
 * Protected with:
 * 1. Balance Reservation (Available Balance -> Reserved Balance -> Withdrawn)
 * 2. Database Row-Level Locking (Guaranteed Zero Concurrent Overdraws)
 * 3. Idempotency Protection (Idempotency Key & Unique Withdrawal Number)
 * 4. Payout Queue & Razorpay Banking Rails
 * 5. Immutable Ledger Tracking (WITHDRAWAL_REQUESTED, WITHDRAWAL_SUCCESS, WITHDRAWAL_FAILED)
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized access" }, { status: 401 });
    }

    // 1. Fetch Seller Record
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
          id: null,
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

    // 3. Generate unique payout number and idempotency key
    const uniqueSuffix = `${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const payoutNumber = `WTH-${uniqueSuffix}`;
    const idempotencyKey = String(body.idempotencyKey || req.headers.get("x-idempotency-key") || `withdraw_${sellerId}_${uniqueSuffix}`);
    const destinationUpi = settlementMethod.upi_id || settlementMethod.destination_raw || settlementMethod.metadata?.vpa;

    // 4. ATOMIC CONCURRENCY-SAFE BALANCE RESERVATION (RPC with Row-Level Locking)
    const { data: reserveResult, error: reserveErr } = await supabaseServer.rpc('reserve_seller_balance_for_withdrawal', {
      p_seller_id: sellerId,
      p_amount: requestedAmount,
      p_idempotency_key: idempotencyKey,
      p_payout_number: payoutNumber,
      p_destination_masked: settlementMethod.masked_destination,
      p_destination_upi: destinationUpi,
      p_beneficiary_name: settlementMethod.verified_name || seller.business_name || "Seller Settlement",
      p_settlement_method_id: settlementMethod.id || null
    });

    if (reserveErr) {
      console.error("[Balance Reservation RPC Error]:", reserveErr);
      return NextResponse.json({
        success: false,
        error: reserveErr.message || "Failed to reserve balance for withdrawal."
      }, { status: 500 });
    }

    if (!reserveResult || reserveResult.success === false) {
      if (reserveResult?.error === 'INSUFFICIENT_BALANCE') {
        return NextResponse.json({
          success: false,
          error: `Insufficient available balance. You have ₹${Number(reserveResult.available_balance || 0).toFixed(2)} available to withdraw (₹${Number(reserveResult.reserved_balance || 0).toFixed(2)} is currently reserved).`,
          available_balance: reserveResult.available_balance,
          reserved_balance: reserveResult.reserved_balance
        }, { status: 400 });
      }

      return NextResponse.json({
        success: false,
        error: reserveResult?.message || reserveResult?.error || "Withdrawal request failed."
      }, { status: 400 });
    }

    // If request was already processed idempotently
    if (reserveResult.idempotent) {
      return NextResponse.json({
        success: true,
        message: "Withdrawal request already received and processing.",
        payout: {
          id: reserveResult.payout_id,
          payout_number: reserveResult.payout_number,
          status: reserveResult.status,
          amount: reserveResult.amount
        }
      });
    }

    const payoutRequestId = reserveResult.payout_id;

    // 5. Asynchronously dispatch / process with Razorpay Provider
    // The background queue is also watching `payout_queue`, but we attempt direct dispatch for lowest latency
    createProviderPayout({
      sellerId,
      amount: requestedAmount,
      vpa: destinationUpi,
      beneficiaryName: settlementMethod.verified_name || seller.business_name || "Seller Settlement",
      payoutNumber,
      idempotencyKey
    }).then(async (providerResult) => {
      if (providerResult.status === "COMPLETED") {
        await supabaseServer.rpc('finalize_payout_success', {
          p_payout_id: payoutRequestId,
          p_provider_payout_id: providerResult.providerPayoutId || null,
          p_utr_number: providerResult.utrNumber || null
        });
      } else if (providerResult.status === "FAILED") {
        await supabaseServer.rpc('finalize_payout_failure', {
          p_payout_id: payoutRequestId,
          p_failure_reason: providerResult.failureReason || "Provider rejection"
        });
      }
    }).catch(e => {
      console.warn("[Background Payout Dispatch Notice]:", e.message);
    });

    return NextResponse.json({
      success: true,
      status: "PROCESSING",
      message: `Withdrawal request ${payoutNumber} accepted. ₹${requestedAmount.toFixed(2)} reserved and queued for UPI disbursement.`,
      payout: {
        id: payoutRequestId,
        payout_number: payoutNumber,
        amount: requestedAmount,
        status: "PROCESSING",
        destination_masked: settlementMethod.masked_destination,
        beneficiary_name: settlementMethod.verified_name,
        created_at: new Date().toISOString()
      },
      balances: {
        available_balance: reserveResult.balance_after,
        reserved_balance: reserveResult.reserved_amount
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
