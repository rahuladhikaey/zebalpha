import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { sendWhatsAppOrderConfirmation } from "@/lib/whatsapp";
import { createMasterOrder } from '@/lib/orderRouter';


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
      items,
      total,
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

    // Delegate to master order creation which handles splitting, reservation and notifications
    const parentOrder = await createMasterOrder({ user_id, customer_name, phone, address, items, total, payment_method: 'ONLINE' });

    // Insert payment record as COMPLETE and attach Razorpay refs
    try {
      await supabaseServer.from('payments').insert([{ parent_order_id: parentOrder.id, amount: total, method: 'ONLINE', status: 'COMPLETE', transaction_reference: razorpay_payment_id }]);
      // update order with razorpay refs
      await supabaseServer.from('orders').update({ payment_status: 'COMPLETE', razorpay_order_id, razorpay_payment_id }).eq('id', parentOrder.id);
    } catch (pErr) { console.error('Payment finalize error', pErr); }

    // Send WhatsApp Order Confirmation
    try {
      if (phone) {
        await sendWhatsAppOrderConfirmation({
          phone,
          orderId: parentOrder.id,
          customerName: customer_name,
          totalAmount: total,
          items: items || [],
        });
      }
    } catch (waError) {
      console.error("WhatsApp notification error:", waError);
    }

    return NextResponse.json({ success: true, orderId: parentOrder.id });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Verification Error:", error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
