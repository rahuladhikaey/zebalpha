import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getShiprocketToken, createShiprocketOrder } from "@/lib/shiprocket";


export async function POST(req: Request) {
  try {
    const { orderId } = await req.json();

    // 1. Fetch order details from Supabase
    const { data: order, error: orderError } = await supabaseServer
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // 2. Authenticate with Shiprocket
    let token;
    try {
      token = await getShiprocketToken();
    } catch (err: any) {
      return NextResponse.json({ error: "Shiprocket Auth Failed: " + err.message }, { status: 500 });
    }

    // 3. Prepare Shiprocket Payload
    // Note: We attempt to extract pincode and city from the address string
    // A more robust way would be to have separate columns in the database
    const items = JSON.parse(order.product_details);
    const orderItems = items.map((item: any) => ({
      name: item.name,
      sku: `SKU-${item.id || 'SPICE'}`,
      units: item.quantity,
      selling_price: item.price,
    }));

    // Basic extraction logic for demonstration
    // Expecting address format: "Vill: ..., P.O: ..., Pin: 123456, Info: ..."
    const pincodeMatch = order.address.match(/Pin:\s*(\d{6})/i);
    const pincode = pincodeMatch ? pincodeMatch[1] : "000000";

    const shiprocketPayload = {
      order_id: `AS-ORD-${order.id}`,
      order_date: new Date(order.created_at).toISOString().split('T')[0],
      pickup_location: "Primary",
      billing_customer_name: order.customer_name,
      billing_last_name: ".",
      billing_address: order.address,
      billing_city: "Kolkata", // Default fallback, should be extracted
      billing_pincode: pincode,
      billing_state: "West Bengal", // Default fallback
      billing_country: "India",
      billing_email: "customer@example.com", // Placeholder
      billing_phone: order.phone,
      shipping_is_billing: true,
      order_items: orderItems,
      payment_method: order.payment_method === "COD" ? "COD" : "Prepaid",
      sub_total: order.total_amount,
      length: 10,
      breadth: 10,
      height: 10,
      weight: 0.5,
    };

    // 4. Create Order in Shiprocket
    const result = await createShiprocketOrder(token, shiprocketPayload);

    // 5. Update local order with shipment details
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
