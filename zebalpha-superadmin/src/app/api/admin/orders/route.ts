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

    const { error } = await supabaseServer
      .from("orders")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Superadmin delete order error:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Order deleted successfully" });
  } catch (error: any) {
    console.error("Superadmin delete order exception:", error);
    return NextResponse.json({ success: false, message: error?.message || "Failed to delete order" }, { status: 500 });
  }
}
