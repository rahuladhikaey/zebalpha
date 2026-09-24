import { NextResponse } from "next/server";
import { supabaseServer } from "@/shared/utils/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, id, order_number, reason, comment, cancelled_by = "customer" } = body;
    const targetId = orderId || id || order_number;

    if (!targetId) {
      return NextResponse.json({ success: false, message: "Order ID is required." }, { status: 400 });
    }

    // 1. Fetch order
    let query = supabaseServer.from("orders").select("*");
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(String(targetId));
    if (isUuid) {
      query = query.eq("id", targetId);
    } else {
      query = query.eq("order_number", targetId);
    }

    const { data: orderData, error: fetchErr } = await query.maybeSingle();

    if (fetchErr || !orderData) {
      return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 });
    }

    const currentStatus = String(orderData.order_status || "").toLowerCase();
    if (currentStatus === "cancelled") {
      return NextResponse.json({ success: false, message: "This order is already cancelled." }, { status: 400 });
    }

    if (currentStatus === "delivered") {
      return NextResponse.json({
        success: false,
        message: "This order has already been delivered. Please request a Return or Exchange instead of cancellation."
      }, { status: 400 });
    }

    // 2-Hour Cancellation Window Check (Meesho / Flipkart Standard)
    if (cancelled_by === "customer" && orderData.created_at) {
      const orderCreatedAt = new Date(orderData.created_at).getTime();
      const diffHours = (Date.now() - orderCreatedAt) / (1000 * 60 * 60);

      if (diffHours > 2) {
        return NextResponse.json({
          success: false,
          message: "Orders can only be cancelled within 2 hours of placement. As your order has passed this window and is in processing, cancellation is disabled. You may request a Return or Exchange after delivery."
        }, { status: 400 });
      }
    }

    const nowIso = new Date().toISOString();
    const isPrepaid = String(orderData.payment_method || "").toUpperCase() !== "COD" && 
                      String(orderData.payment_status || "").toUpperCase() === "PAID";

    const updates: Record<string, any> = {
      order_status: "cancelled",
      cancellation_reason: reason || "Customer requested cancellation",
      cancellation_comment: comment || "",
      cancelled_at: nowIso,
      cancelled_by: cancelled_by,
      updated_at: nowIso,
    };

    if (isPrepaid) {
      updates.refund_status = "INITIATED";
      updates.refund_amount = orderData.total_amount || 0;
      updates.refund_initiated_at = nowIso;
      updates.refund_notes = `Refund initiated for cancellation of Order #${orderData.order_number}`;
    }

    // Update orders table
    const { error: updateErr } = await supabaseServer
      .from("orders")
      .update(updates)
      .eq("id", orderData.id);

    if (updateErr) {
      console.error("Failed to update order status to cancelled:", updateErr);
      return NextResponse.json({ success: false, message: updateErr.message }, { status: 500 });
    }

    // Also update any split seller orders matching order_number
    if (orderData.order_number) {
      try {
        await supabaseServer
          .from("seller_orders")
          .update({ order_status: "cancelled", updated_at: nowIso })
          .eq("parent_order_id", orderData.id);
      } catch (_) {}
    }

    // 2. Restock product quantities in inventory
    let items = orderData.items || orderData.product_details || [];
    if (typeof items === "string") {
      try { items = JSON.parse(items); } catch (_) { items = []; }
    }
    if (!Array.isArray(items) && items && typeof items === "object") {
      items = [items];
    }

    if (Array.isArray(items) && items.length > 0) {
      for (const item of items) {
        const pId = item.product_id || item.id;
        const qty = Number(item.quantity) || 1;
        if (!pId) continue;

        try {
          const { data: prod } = await supabaseServer
            .from("products")
            .select("id, stock, seller_id")
            .eq("id", pId)
            .maybeSingle();

          if (prod) {
            const currentStock = Number(prod.stock) || 0;
            const newStock = currentStock + qty;

            await supabaseServer
              .from("products")
              .update({ stock: newStock, updated_at: nowIso })
              .eq("id", pId);

            // Log stock history
            try {
              await supabaseServer.from("seller_stock_history").insert([{
                seller_id: prod.seller_id || orderData.seller_id,
                product_id: pId,
                previous_stock: currentStock,
                new_stock: newStock,
                change_reason: `Restocked +${qty} units from customer cancellation of Order #${orderData.order_number}`
              }]);
            } catch (_) {}
          }
        } catch (stockErr) {
          console.warn("Inventory restock warning:", stockErr);
        }
      }
    }

    // 3. Notify seller if seller_id present
    if (orderData.seller_id) {
      try {
        await supabaseServer.from("seller_notifications").insert([{
          seller_id: orderData.seller_id,
          message: `🚫 Order #${orderData.order_number} was cancelled by customer. Reason: "${reason || "No reason specified"}". Items have been restocked to your inventory.`,
          read_status: false
        }]);
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      message: isPrepaid 
        ? "Order cancelled successfully! Your prepaid refund has been initiated and will reflect in 3-5 business days."
        : "Order cancelled successfully.",
      data: {
        ...orderData,
        ...updates
      }
    });
  } catch (error: any) {
    console.error("Cancel order route error:", error);
    return NextResponse.json({
      success: false,
      message: error?.message || "Failed to cancel order"
    }, { status: 500 });
  }
}
