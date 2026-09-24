import { NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";

export const dynamic = "force-dynamic";

// GET /api/admin/returns - Fetch all return requests
export async function GET(req: Request) {
  try {
    const { data: returns, error } = await supabaseServer
      .from("order_returns")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Superadmin fetch returns error:", error);
      return NextResponse.json({ success: false, message: error.message, data: [] }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: returns || [] });
  } catch (error: any) {
    console.error("Superadmin fetch returns exception:", error);
    return NextResponse.json({ success: false, message: error?.message || "Failed to fetch returns", data: [] }, { status: 500 });
  }
}

// PATCH /api/admin/returns - Update return / refund status
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, orderId, status, rejection_reason, refund_status, refund_amount, refund_transaction_id, admin_notes } = body;

    const targetId = id || orderId;
    if (!targetId) {
      return NextResponse.json({ success: false, message: "Return or Order ID is required" }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const returnUpdates: Record<string, any> = { updated_at: nowIso };
    const orderUpdates: Record<string, any> = { updated_at: nowIso };

    if (status) {
      const upper = status.toUpperCase();
      returnUpdates.status = upper;

      if (upper === "APPROVED") {
        orderUpdates.order_status = "return_approved";
        orderUpdates.return_status = "approved";
        orderUpdates.return_approved_at = nowIso;
      } else if (upper === "REJECTED") {
        orderUpdates.order_status = "return_rejected";
        orderUpdates.return_status = "rejected";
        orderUpdates.return_rejected_at = nowIso;
        orderUpdates.return_rejection_reason = rejection_reason || "Rejected by administrator";
        returnUpdates.rejection_reason = rejection_reason || "Rejected by administrator";
      } else if (upper === "PICKED_UP") {
        orderUpdates.order_status = "return_picked_up";
        orderUpdates.return_status = "picked_up";
        orderUpdates.return_picked_up_at = nowIso;
      } else if (upper === "RECEIVED" || upper === "COMPLETED") {
        orderUpdates.order_status = "returned";
        orderUpdates.return_status = "completed";
        orderUpdates.return_completed_at = nowIso;
        orderUpdates.refund_status = "COMPLETED";
      }
    }

    if (refund_status) {
      returnUpdates.refund_status = refund_status.toUpperCase();
      orderUpdates.refund_status = refund_status.toUpperCase();
      if (refund_status.toUpperCase() === "COMPLETED") {
        orderUpdates.refund_completed_at = nowIso;
      }
    }
    if (refund_amount) {
      returnUpdates.refund_amount = Number(refund_amount);
      orderUpdates.refund_amount = Number(refund_amount);
    }
    if (refund_transaction_id) {
      returnUpdates.refund_transaction_id = refund_transaction_id;
      orderUpdates.refund_transaction_id = refund_transaction_id;
    }
    if (admin_notes) {
      returnUpdates.admin_notes = admin_notes;
    }

    // Update in order_returns table
    await supabaseServer
      .from("order_returns")
      .update(returnUpdates)
      .or(`id.eq.${targetId},order_id.eq.${targetId},order_number.eq.${targetId}`);

    // Update in orders table
    await supabaseServer
      .from("orders")
      .update(orderUpdates)
      .or(`id.eq.${targetId},order_number.eq.${targetId}`);

    return NextResponse.json({
      success: true,
      message: "Return & refund record updated successfully.",
      data: { ...returnUpdates, ...orderUpdates }
    });
  } catch (error: any) {
    console.error("Superadmin update returns exception:", error);
    return NextResponse.json({ success: false, message: error?.message || "Failed to update return", data: null }, { status: 500 });
  }
}
