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

    const rawAddressObj = typeof order.shipping_address === "object" ? (order.shipping_address || {}) : {};
    const addressStr = order.address || (typeof order.shipping_address === "string" ? order.shipping_address : rawAddressObj.address || "");

    let extractedPin = order.pincode || rawAddressObj.pincode;
    if (!extractedPin && addressStr) {
      const pincodeMatch = addressStr.match(/(?:Pin|Pincode|PIN)?\s*[:\-]?\s*(\d{6})\b/i) || addressStr.match(/\b(\d{6})\b/);
      if (pincodeMatch) extractedPin = pincodeMatch[1];
    }
    const pincode = String(extractedPin || "700001").replace(/\D/g, "").slice(0, 6);

    let extractedCity = order.city || rawAddressObj.city;
    if (!extractedCity && addressStr) {
      const cityMatch = addressStr.match(/(?:Vill|Village|City|Town)\s*[:\-]\s*([^,]+)/i);
      if (cityMatch) extractedCity = cityMatch[1].trim();
    }
    const city = extractedCity || "Kolkata";

    let extractedState = order.state || rawAddressObj.state;
    if (!extractedState && addressStr) {
      const stateMatch = addressStr.match(/(?:P\.O|PO|State)\s*[:\-]\s*([^,]+)/i);
      if (stateMatch) extractedState = stateMatch[1].trim();
    }
    const state = extractedState || "West Bengal";

    const shiprocketPayload = {
      order_id: `AS-ORD-${order.id}`,
      order_date: new Date(order.created_at).toISOString().split('T')[0],
      pickup_location: "Primary",
      billing_customer_name: order.customer_name || rawAddressObj.name || "Customer",
      billing_last_name: ".",
      billing_address: addressStr || "Kolkata",
      billing_city: city,
      billing_pincode: pincode,
      billing_state: state,
      billing_country: "India",
      billing_email: order.email || "customer@example.com",
      billing_phone: String(order.phone || rawAddressObj.phone || "0000000000").replace(/\D/g, "").slice(0, 10),
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
