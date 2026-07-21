import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

async function verifySignature(orderId: string, paymentId: string, signature: string, secret: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(orderId + "|" + paymentId);
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const hmac = await crypto.subtle.sign("HMAC", key, data);
  const digest = Array.from(new Uint8Array(hmac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return digest === signature;
}

export async function POST(req: Request) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      customer_name,
      phone,
      address,
      product_id,
      product_name,
      quantity,
      total_price,
      booking_amount,
      user_id,
    } = await req.json();

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      console.error("RAZORPAY_KEY_SECRET is missing.");
      return NextResponse.json({ success: false, message: "Payment verification misconfigured" }, { status: 500 });
    }

    // 1. Verify Signature
    const isAuthentic = await verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      secret
    );

    if (!isAuthentic) {
      return NextResponse.json({ success: false, message: "Invalid signature" }, { status: 400 });
    }

    const items = [
        {
            id: product_id,
            name: product_name,
            quantity: quantity,
            price: total_price / quantity,
            isPreOrder: true,
            bookingAmount: booking_amount,
        }
    ];

    // 2. Save Pre-Order to Supabase orders table with PRE_ORDER status
    const { data, error } = await supabaseServer.from("orders").insert([
      {
        customer_name,
        phone,
        address,
        product_details: JSON.stringify(items),
        total_amount: total_price, // full price
        payment_method: "ONLINE",
        payment_status: "BOOKED", // specific to pre-orders
        order_status: "PRE_ORDER",
        razorpay_order_id,
        razorpay_payment_id,
        user_id: user_id,
      },
    ]).select().single();

    if (error) {
      console.error("Supabase Order Creation Error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, bookingId: data.id });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Verification Error:", error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
