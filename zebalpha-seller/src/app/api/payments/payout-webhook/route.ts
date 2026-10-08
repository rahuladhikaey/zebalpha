import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";
import { verifyRazorpayWebhookSignature } from "@/shared/services/razorpayPayoutService";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/payout-webhook
 * Cryptographically verified Razorpay Webhook Handler
 * Synchronizes real-time status of asynchronous bank & UPI transfers.
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
    const eventType = event.event; // e.g. payout.processed, payout.failed, payout.reversed
    const payoutEntity = event.payload?.payout?.entity;

    if (!payoutEntity) {
      return NextResponse.json({ received: true });
    }

    const referenceId = payoutEntity.reference_id; // Maps to payout_number
    const utr = payoutEntity.utr;
    const failureReason = payoutEntity.failure_reason;

    if (!referenceId) {
      return NextResponse.json({ received: true });
    }

    // 1. Payout Processed (Success)
    if (eventType === "payout.processed") {
      await supabaseServer
        .from("seller_payout_requests")
        .update({
          status: "COMPLETED",
          utr_number: utr,
          processed_at: new Date().toISOString()
        })
        .eq("payout_number", referenceId);

      await supabaseServer
        .from("seller_settlements")
        .update({
          status: "PAID",
          utr_number: utr
        })
        .eq("settlement_number", referenceId);

      await supabaseServer
        .from("seller_financial_ledger")
        .update({ status: "COMPLETED" })
        .eq("reference_id", referenceId);
    }

    // 2. Payout Failed or Reversed
    if (eventType === "payout.failed" || eventType === "payout.reversed") {
      const newStatus = eventType === "payout.reversed" ? "REVERSED" : "FAILED";

      const { data: payoutRow } = await supabaseServer
        .from("seller_payout_requests")
        .update({
          status: newStatus,
          failure_reason: failureReason || "Transaction declined by banking network",
          processed_at: new Date().toISOString()
        })
        .eq("payout_number", referenceId)
        .select()
        .single();

      await supabaseServer
        .from("seller_settlements")
        .update({
          status: newStatus,
          notes: failureReason
        })
        .eq("settlement_number", referenceId);

      // Restore seller's balance by inserting reversal adjustment
      if (payoutRow && payoutRow.seller_id) {
        await supabaseServer.from("seller_financial_ledger").insert([{
          seller_id: payoutRow.seller_id,
          transaction_type: "ADJUSTMENT",
          amount: payoutRow.amount,
          currency: "INR",
          reference_type: "PAYOUT_REVERSAL",
          reference_id: referenceId,
          status: "COMPLETED",
          description: `Refund of ${newStatus.toLowerCase()} payout ${referenceId}: ${failureReason || "Provider reversal"}`
        }]);
      }
    }

    return NextResponse.json({ success: true, received: true });
  } catch (err: any) {
    console.error("[Payout Webhook Exception]:", err);
    return NextResponse.json({ error: err?.message || "Webhook processing error" }, { status: 500 });
  }
}
