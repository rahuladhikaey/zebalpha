import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/utils/supabaseServer";
import { verifyRazorpayWebhookSignature } from "@/shared/services/razorpayPayoutService";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/payout-webhook
 * Cryptographically verified Razorpay Webhook Handler.
 * Synchronizes real-time status of asynchronous UPI payouts.
 * Flow:
 * Razorpay -> Webhook -> Verify HMAC-SHA256 signature -> Find withdrawal
 * -> Update payout status -> Update seller ledger -> Release funds on failure
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const isValid = verifyRazorpayWebhookSignature(rawBody, signature);
    if (!isValid) {
      console.warn("[Razorpay Webhook]: Cryptographic signature verification failed.");
      return NextResponse.json({ error: "Invalid cryptographic signature" }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event; // e.g. payout.processed, payout.success, payout.failed, payout.reversed
    const payoutEntity = event.payload?.payout?.entity;

    if (!payoutEntity) {
      return NextResponse.json({ received: true });
    }

    const referenceId = payoutEntity.reference_id; // Maps to payout_number (e.g. WTH-XXXXXX)
    const utr = payoutEntity.utr || null;
    const failureReason = payoutEntity.failure_reason || null;

    if (!referenceId) {
      return NextResponse.json({ received: true });
    }

    // Find the corresponding payout request
    const { data: existingPayout } = await supabaseServer
      .from("seller_payout_requests")
      .select("*")
      .eq("payout_number", referenceId)
      .maybeSingle();

    if (!existingPayout) {
      return NextResponse.json({ received: true, message: "Payout record not found" });
    }

    // Duplicate webhook protection: If already marked SUCCESS or REVERSED, do not re-process
    if (existingPayout.status === "SUCCESS" && (eventType === "payout.processed" || eventType === "payout.success")) {
      return NextResponse.json({ received: true, message: "Duplicate webhook ignored" });
    }

    // 1. Payout Processed / Success
    if (eventType === "payout.processed" || eventType === "payout.success") {
      await supabaseServer
        .from("seller_payout_requests")
        .update({
          status: "SUCCESS",
          utr_number: utr,
          processed_at: new Date().toISOString()
        })
        .eq("payout_number", referenceId);

      // Record WITHDRAWAL_SUCCESS in immutable ledger
      await supabaseServer.from("seller_financial_ledger").insert([{
        seller_id: existingPayout.seller_id,
        transaction_type: "WITHDRAWAL_SUCCESS",
        entry_type: "DEBIT",
        amount: existingPayout.amount,
        currency: "INR",
        status: "COMPLETED",
        description: `UPI Payout Completed (${referenceId}). UTR: ${utr || "N/A"}`,
        reference_id: referenceId,
        metadata: {
          utrNumber: utr,
          event: eventType
        }
      }]);
    }

    // 2. Payout Failed or Reversed
    if (eventType === "payout.failed" || eventType === "payout.reversed") {
      const isReversal = eventType === "payout.reversed";
      const newStatus = isReversal ? "REVERSED" : "FAILED";
      const transactionType = isReversal ? "WITHDRAWAL_REVERSED" : "WITHDRAWAL_FAILED";

      await supabaseServer
        .from("seller_payout_requests")
        .update({
          status: newStatus,
          failure_reason: failureReason || "Transaction declined or reversed by banking network",
          processed_at: new Date().toISOString()
        })
        .eq("payout_number", referenceId);

      // Release reserved funds back to seller available balance
      await supabaseServer.from("seller_financial_ledger").insert([{
        seller_id: existingPayout.seller_id,
        transaction_type: transactionType,
        entry_type: "CREDIT",
        amount: existingPayout.amount,
        currency: "INR",
        status: "COMPLETED",
        description: `Release of ${newStatus.toLowerCase()} withdrawal ${referenceId}: ${failureReason || "Provider update"}`,
        reference_id: referenceId,
        metadata: {
          failureReason,
          event: eventType
        }
      }]);
    }

    return NextResponse.json({ success: true, received: true });
  } catch (err: any) {
    console.error("[Payout Webhook Exception]:", err);
    return NextResponse.json({ error: err?.message || "Webhook processing error" }, { status: 500 });
  }
}
