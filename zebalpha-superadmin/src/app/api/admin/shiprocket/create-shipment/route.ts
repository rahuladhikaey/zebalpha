import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getShiprocketToken, createShiprocketOrder } from "@/lib/shiprocket";

export async function POST(req: Request) {
  try {
    const { orderId } = await req.json();

    const { data: order, error: orderError } = await supabaseServer
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    let token;
    try {
      token = await getShiprocketToken();
    } catch (err: any) {
      return NextResponse.json({ error: "Shiprocket Auth Failed: " + err.message }, { status: 500 });
    }

    let items = [];
    try {
      items = typeof order.product_details === "string" ? JSON.parse(order.product_details) : (order.product_details || []);
    } catch (e) {
      items = [];
    }

    const orderItems = items.map((item: any) => ({
      name: item.name || "Item",
      sku: `SKU-${item.id || 'SPICE'}`,
      units: item.quantity || 1,
      selling_price: item.price || 0,
    }));

    const pincodeMatch = order.address ? order.address.match(/Pin:\s*(\d{6})/i) : null;
    const pincode = pincodeMatch ? pincodeMatch[1] : "700001";

    const shiprocketPayload = {
      order_id: `AS-ORD-${order.id}`,
      order_date: new Date(order.created_at).toISOString().split('T')[0],
      pickup_location: "Primary",
      billing_customer_name: order.customer_name || "Customer",
      billing_last_name: ".",
      billing_address: order.address || "Kolkata",
      billing_city: "Kolkata",
      billing_pincode: pincode,
      billing_state: "West Bengal",
      billing_country: "India",
      billing_email: "customer@example.com",
      billing_phone: order.phone || "0000000000",
      shipping_is_billing: true,
      order_items: orderItems,
      payment_method: order.payment_method === "COD" ? "COD" : "Prepaid",
      sub_total: order.total_amount || 0,
      length: 10,
      breadth: 10,
      height: 10,
      weight: 0.5,
    };

    const result = await createShiprocketOrder(token, shiprocketPayload);

    await supabaseServer
      .from("orders")
      .update({ 
        shiprocket_order_id: result.order_id,
        shipment_id: result.shipment_id,
        order_status: "SHIPPED" 
      })
      .eq("id", orderId);

    return NextResponse.json({ 
      success: true, 
      shipment_id: result.shipment_id,
      message: "Shipment created successfully" 
    });

  } catch (err: any) {
    console.error("Shiprocket Error:", err);
    return NextResponse.json({ error: err.message || "Internal Server Error" }, { status: 500 });
  }
}
