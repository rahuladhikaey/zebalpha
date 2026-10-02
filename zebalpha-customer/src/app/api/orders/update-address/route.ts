import { NextResponse } from "next/server";
import { supabaseServer } from "@/shared/utils/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, address, phone, customer_name } = body;

    if (!orderId || !address) {
      return NextResponse.json({ success: false, message: "Order ID and address are required." }, { status: 400 });
    }

    // 1. Fetch order
    const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(String(orderId));
    let query = supabaseServer.from("orders").select("*");
    if (isUuid) {
      query = query.eq("id", orderId);
    } else {
      query = query.eq("order_number", orderId);
    }

    const { data: order, error } = await query.maybeSingle();

    if (error || !order) {
      return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 });
    }

    const currentStatus = String(order.order_status || "").toLowerCase();
    if (["shipped", "out_for_delivery", "delivered", "cancelled", "rto"].includes(currentStatus)) {
      return NextResponse.json({
        success: false,
        message: `Address modification is disabled because your order status is already ${currentStatus.toUpperCase().replace(/_/g, " ")}.`
      }, { status: 400 });
    }

    const formattedAddress = typeof address === "object" ? JSON.stringify(address) : address;

    const { error: updateErr } = await supabaseServer
      .from("orders")
      .update({
        address: formattedAddress,
        phone: phone || order.phone,
        customer_name: customer_name || order.customer_name,
        updated_at: new Date().toISOString()
      })
      .eq("id", order.id);

    if (updateErr) {
      return NextResponse.json({ success: false, message: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "Delivery address updated successfully."
    });
  } catch (err: any) {
    console.error("Update address route error:", err);
    return NextResponse.json({
      success: false,
      message: err?.message || "Failed to update address."
    }, { status: 500 });
  }
}
