import { NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET /api/admin/orders
export async function GET() {
  try {
    const { data: orders, error } = await supabaseServer
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Superadmin fetch orders error:", error);
      return NextResponse.json({ success: false, message: error.message, data: [] }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: orders || [] });
  } catch (error: any) {
    console.error("Superadmin fetch orders exception:", error);
    return NextResponse.json({ success: false, message: error?.message || "Failed to fetch orders", data: [] }, { status: 500 });
  }
}

// PATCH /api/admin/orders
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ success: false, message: "Order ID is required" }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from("orders")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Superadmin update order error:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Superadmin update order exception:", error);
    return NextResponse.json({ success: false, message: error?.message || "Failed to update order" }, { status: 500 });
  }
}

// DELETE /api/admin/orders
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, message: "Order ID is required" }, { status: 400 });
    }

    // 1. Fetch order details first to get order_number and id
    const { data: targetOrder } = await supabaseServer
      .from("orders")
      .select("id, order_number")
      .or(`id.eq.${id},order_number.eq.${id}`)
      .maybeSingle();

    const targetId = targetOrder?.id || id;
    const targetOrderNum = targetOrder?.order_number || id;

    // 2. Cascade delete dependent child records to prevent foreign key errors
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

    try {
      await supabaseServer
        .from("seller_claims")
        .delete()
        .or(`suborder_id.eq.${targetId},claim_id.eq.${targetId}`);
    } catch (_) {}

    // 3. Delete master container and sub-order records from orders table
    const { error: deleteErr } = await supabaseServer
      .from("orders")
      .delete()
      .or(`id.eq.${targetId},order_number.eq.${targetOrderNum},order_number.like.${targetOrderNum}-S%`);

    if (deleteErr) {
      console.error("Superadmin delete order error:", deleteErr);
      return NextResponse.json({ success: false, message: deleteErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Order and linked sub-orders deleted successfully" });
  } catch (error: any) {
    console.error("Superadmin delete order exception:", error);
    return NextResponse.json({ success: false, message: error?.message || "Failed to delete order" }, { status: 500 });
  }
}
