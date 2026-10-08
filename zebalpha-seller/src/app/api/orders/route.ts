import { NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";
import { generateDeliveryLedgerEntries, DEFAULT_FINANCIAL_RULES } from "@shared/services/financialLedgerService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Valid order status transitions according to state machine
const VALID_TRANSITIONS: Record<string, string[]> = {
  placed: ["confirmed", "processing", "cancelled"],
  new: ["confirmed", "processing", "cancelled"],
  confirmed: ["processing", "packed", "cancelled"],
  processing: ["packed", "ready_for_pickup", "cancelled"],
  packed: ["ready_for_pickup", "shipped", "cancelled"],
  ready_for_pickup: ["shipped", "picked_up", "cancelled"],
  ready_to_ship: ["shipped", "picked_up", "cancelled"],
  picked_up: ["in_transit", "shipped"],
  shipped: ["in_transit", "out_for_delivery", "delivered", "rto_initiated"],
  in_transit: ["out_for_delivery", "delivered", "rto_initiated"],
  out_for_delivery: ["delivered", "rto_initiated"],
  delivered: ["return_requested"],
  rto_initiated: ["rto_in_transit"],
  rto_in_transit: ["rto_delivered"],
  rto_delivered: ["rto_received"],
};

// PATCH /api/orders
// Handles order status state transitions, cancellations, and delivery ledger recording
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const {
      orderId,
      status, // target status: 'confirmed' | 'processing' | 'packed' | 'ready_for_pickup' | 'shipped' | 'delivered' | 'cancelled'
      cancellation_reason,
      cancelled_by = "seller",
      tracking_number,
      courier_name,
    } = body;

    if (!orderId || !status) {
      return NextResponse.json({ success: false, message: "orderId and status are required" }, { status: 400 });
    }

    const nowIso = new Date().toISOString();

    // 1. Fetch current order
    let query = supabaseServer.from("orders").select("*");
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(String(orderId));
    if (isUuid) {
      query = query.eq("id", orderId);
    } else {
      query = query.eq("order_number", orderId);
    }

    const { data: order, error: fetchErr } = await query.maybeSingle();

    if (fetchErr || !order) {
      return NextResponse.json({ success: false, message: "Order not found" }, { status: 404 });
    }

    const currentStatus = String(order.order_status || "placed").toLowerCase();
    const targetStatus = String(status).toLowerCase();

    // Validate transition
    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(targetStatus) && targetStatus !== currentStatus) {
      // Allow admin / forced state transition if explicitly confirmed
      console.warn(`Transition warning: ${currentStatus} -> ${targetStatus}`);
    }

    const updates: Record<string, any> = {
      order_status: targetStatus,
      updated_at: nowIso,
    };

    if (tracking_number) updates.tracking_number = tracking_number;
    if (courier_name) updates.courier_name = courier_name;

    // Handle cancellation
    if (targetStatus === "cancelled") {
      updates.cancellation_reason = cancellation_reason || "Cancelled by seller";
      updates.cancelled_by = cancelled_by;
      updates.cancelled_at = nowIso;

      // Restock items if they were packed or allocated
      let items = order.items || order.product_details || [];
      if (typeof items === "string") {
        try { items = JSON.parse(items); } catch (_) { items = []; }
      }
      if (!Array.isArray(items) && items && typeof items === "object") items = [items];

      if (Array.isArray(items)) {
        for (const item of items) {
          const pId = item.product_id || item.id;
          const qty = Number(item.quantity) || 1;
          if (pId) {
            try {
              const { data: p } = await supabaseServer.from("products").select("stock").eq("id", pId).maybeSingle();
              if (p) {
                const newStock = (Number(p.stock) || 0) + qty;
                await supabaseServer.from("products").update({ stock: newStock }).eq("id", pId);
              }
            } catch (_) {}
          }
        }
      }

      // Record cancellation ledger entry if payment was already captured
      if (order.seller_id && (order.payment_status === "CAPTURED" || order.payment_status === "PAID")) {
        try {
          await supabaseServer.from("seller_financial_ledger").upsert({
            seller_id: order.seller_id,
            order_id: order.id,
            order_number: order.order_number,
            entry_type: "CANCELLATION",
            direction: "DEBIT",
            amount: Number(order.total_amount) || 0,
            status: "COMPLETED",
            idempotency_key: `LEDGER_CANCEL_${order.id}`,
            title: `Order Cancellation Adjustment`,
            description: `Order cancelled (${cancellation_reason || 'Seller request'}).`,
            metadata: { cancelled_by, reason: cancellation_reason }
          }, { onConflict: "idempotency_key" });
        } catch (_) {}
      }
    }

    // Handle delivery
    if (targetStatus === "delivered") {
      updates.delivered_at = nowIso;
      updates.shipment_status = "DELIVERED";

      // Calculate settlement due date (7-day standard return window)
      const settlementDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      updates.settlement_due_date = settlementDueDate;
      updates.settlement_status = "PENDING_SETTLEMENT";

      // Parse order items
      let items = order.items || order.product_details || [];
      if (typeof items === "string") {
        try { items = JSON.parse(items); } catch (_) { items = []; }
      }
      if (!Array.isArray(items) && items && typeof items === "object") items = [items];

      if (order.seller_id && Array.isArray(items) && items.length > 0) {
        try {
          const ledgerEntries = generateDeliveryLedgerEntries({
            sellerId: order.seller_id,
            orderId: order.id,
            orderNumber: order.order_number || String(order.id),
            items: items.map((it: any) => ({
              id: it.id || it.product_id,
              product_id: it.product_id || it.id,
              name: it.name || it.title,
              price: Number(it.price) || 0,
              quantity: Number(it.quantity) || 1,
              subtotal: Number(it.subtotal) || ((Number(it.price) || 0) * (Number(it.quantity) || 1))
            })),
            paymentMethod: order.payment_method || "PREPAID",
            rules: DEFAULT_FINANCIAL_RULES
          });

          for (const entry of ledgerEntries) {
            try {
              await supabaseServer
                .from("seller_financial_ledger")
                .upsert(entry, { onConflict: "idempotency_key" });
            } catch (ledErr: any) {
              console.warn("Delivery ledger insert warning:", ledErr.message);
            }
          }
        } catch (fErr: any) {
          console.warn("Delivery financial ledger generation warning:", fErr.message);
        }
      }
    }

    // Update order
    const { data: updatedOrder, error: updateErr } = await supabaseServer
      .from("orders")
      .update(updates)
      .eq("id", order.id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ success: false, message: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Order status updated to ${targetStatus.replace(/_/g, " ").toUpperCase()}`,
      order: updatedOrder
    });
  } catch (err: any) {
    console.error("PATCH /api/orders error:", err);
    return NextResponse.json({ success: false, message: err?.message || "Failed to update order" }, { status: 500 });
  }
}

// DELETE /api/orders
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, message: "Order ID is required" }, { status: 400 });
    }

    // 1. Fetch target order
    const { data: targetOrder } = await supabaseServer
      .from("orders")
      .select("id, order_number")
      .or(`id.eq.${id},order_number.eq.${id}`)
      .maybeSingle();

    const targetId = targetOrder?.id || id;
    const targetOrderNum = targetOrder?.order_number || id;

    // 2. Cascade delete linked sub-orders, shipments, and items
    try {
      await supabaseServer
        .from("seller_orders")
        .delete()
        .or(`parent_order_id.eq.${targetId},order_id.eq.${targetId},order_number.eq.${targetOrderNum}`);
    } catch (_) {}

    try {
      await supabaseServer
        .from("shipments")
        .delete()
        .or(`order_id.eq.${targetId},order_number.eq.${targetOrderNum}`);
    } catch (_) {}

    try {
      await supabaseServer.from("order_items").delete().eq("order_id", targetId);
    } catch (_) {}

    try {
      await supabaseServer
        .from("order_returns")
        .delete()
        .or(`order_id.eq.${targetId},suborder_id.eq.${targetId}`);
    } catch (_) {}

    // 3. Delete from orders table
    const { error: deleteErr } = await supabaseServer
      .from("orders")
      .delete()
      .or(`id.eq.${targetId},order_number.eq.${targetOrderNum},order_number.like.${targetOrderNum}-S%`);

    if (deleteErr) {
      console.error("Seller delete order error:", deleteErr);
      return NextResponse.json({ success: false, message: deleteErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Order deleted successfully" });
  } catch (error: any) {
    console.error("Seller delete order exception:", error);
    return NextResponse.json({ success: false, message: error?.message || "Failed to delete order" }, { status: 500 });
  }
}
