import { NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
