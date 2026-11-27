import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";

const CANCEL_WINDOW_MS = 20 * 60 * 1000; // 20 minutes
const CANCELLABLE_STATUSES = new Set(["PLACED", "CONFIRMED", "PACKED"]);

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const orderId = String(body.order_id || "").trim();
    const userId = String(body.user_id || "").trim();
    const reason = String(body.reason || "").trim();

    if (!orderId || !userId) {
      return NextResponse.json({ success: false, error: "Order ID and user ID are required." }, { status: 400 });
    }
    if (!reason || reason.length < 3) {
      return NextResponse.json({ success: false, error: "Please select or enter a cancellation reason." }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    const db = supabase.schema("zeb_quick");

    const { data: order, error: fetchErr } = await db
      .from("orders")
      .select("id, user_id, order_status, created_at")
      .eq("id", orderId)
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchErr || !order) {
      return NextResponse.json({ success: false, error: "Order not found." }, { status: 404 });
    }

    const currentStatus = String(order.order_status || "").toUpperCase();
    if (currentStatus === "CANCELLED") {
      return NextResponse.json({ success: false, error: "This order is already cancelled." }, { status: 400 });
    }
    if (!CANCELLABLE_STATUSES.has(currentStatus)) {
      return NextResponse.json(
        { success: false, error: `Order cannot be cancelled once it is ${currentStatus}.` },
        { status: 400 }
      );
    }

    const createdMs = new Date(order.created_at).getTime();
    if (!Number.isFinite(createdMs) || Date.now() - createdMs > CANCEL_WINDOW_MS) {
      return NextResponse.json(
        { success: false, error: "20-minute cancellation window has expired for this express order." },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();

    // Try updating with cancel_reason & cancelled_at; gracefully fall back if SQL column not yet added
    const { error: updateErr } = await db
      .from("orders")
      .update({
        order_status: "CANCELLED",
        cancel_reason: reason,
        cancelled_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", order.id);

    if (updateErr) {
      const { error: fallbackErr } = await db
        .from("orders")
        .update({
          order_status: "CANCELLED",
          updated_at: nowIso,
        })
        .eq("id", order.id);

      if (fallbackErr) {
        return NextResponse.json({ success: false, error: fallbackErr.message }, { status: 500 });
      }
    }

    // Mark order_items cancelled and restore ZebQuick stock
    const { data: orderItems } = await db
      .from("order_items")
      .select("id, zeb_quick_product_id, quantity")
      .eq("order_id", order.id);

    await db.from("order_items").update({ item_status: "CANCELLED" }).eq("order_id", order.id);

    for (const it of orderItems || []) {
      if (!it.zeb_quick_product_id) continue;
      const { data: prod } = await db
        .from("products")
        .select("zeb_quick_stock")
        .eq("id", it.zeb_quick_product_id)
        .maybeSingle();
      if (prod) {
        await db
          .from("products")
          .update({
            zeb_quick_stock: Number(prod.zeb_quick_stock || 0) + Math.max(1, Number(it.quantity || 1)),
            updated_at: nowIso,
          })
          .eq("id", it.zeb_quick_product_id);
      }
    }

    return NextResponse.json({
      success: true,
      order_status: "CANCELLED",
      cancel_reason: reason,
      cancelled_at: nowIso,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Failed to cancel order" }, { status: 500 });
  }
}
