import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { sendWhatsAppOrderConfirmation } from "@/lib/whatsapp";
import { createMasterOrder } from "@/lib/orderRouter";
import crypto from "crypto";

function verifySignature(orderId: string, paymentId: string, signature: string, secret: string): boolean {
  try {
    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
    return generatedSignature === signature;
  } catch (err) {
    console.error("Signature verification error:", err);
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
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
    } = body;

    const secret = process.env.RAZORPAY_KEY_SECRET || "5LUjZ94LMDnjwlLyB9cUU5cb";

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ success: false, message: "Missing required Razorpay parameters" }, { status: 400 });
    }

    // 1. Cryptographic HMAC verification
    const isAuthentic = verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      secret
    );

    if (!isAuthentic) {
      console.warn("Invalid Razorpay signature for order:", razorpay_order_id);
      return NextResponse.json({ success: false, message: "Invalid payment signature" }, { status: 400 });
    }

    // 2. Create Master Order (splits per seller, decrements stock, creates notifications)
    let createdOrder: any = null;
    try {
      createdOrder = await createMasterOrder({
        user_id,
        customer_name,
        phone,
        address,
        items,
        total,
        payment_method: "ONLINE",
      });
    } catch (orderErr: any) {
      console.warn("createMasterOrder warning, applying direct order fallback:", orderErr?.message);
      const fallbackOrderNumber = `AS${Date.now().toString().slice(-8)}${Math.floor(1000 + Math.random() * 9000)}`;
      const { data: fallbackOrder, error: fallbackErr } = await supabaseServer
        .from("orders")
        .insert([{
          order_number: fallbackOrderNumber,
          user_id: user_id || null,
          customer_name: customer_name || "Customer",
          phone: phone || "",
          address: typeof address === "string" ? address : JSON.stringify(address),
          items: items || [],
          product_details: items || [],
          total_amount: Number(total) || 0,
          payment_method: "ONLINE",
          payment_status: "COMPLETE",
          order_status: "placed",
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          created_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (fallbackErr) {
        console.error("Critical fallback order insert error:", fallbackErr);
      } else {
        createdOrder = fallbackOrder;
      }
    }

    const orderIdToReturn = createdOrder?.id || createdOrder?.order_number || `ORD-${Date.now()}`;

    // 3. Mark payment as COMPLETE and attach Razorpay reference numbers
    try {
      await supabaseServer.from("payments").insert([{
        parent_order_id: createdOrder?.id || null,
        amount: total,
        method: "ONLINE",
        status: "COMPLETE",
        transaction_reference: razorpay_payment_id,
      }]);

      if (createdOrder?.id) {
        await supabaseServer
          .from("orders")
          .update({
            payment_status: "COMPLETE",
            order_status: "placed",
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
          })
          .eq("id", createdOrder.id);
      }
    } catch (pErr) {
      console.error("Payment status finalize error:", pErr);
    }

    // 4. Send WhatsApp confirmation if configured
    try {
      if (phone && sendWhatsAppOrderConfirmation) {
        await sendWhatsAppOrderConfirmation({
          phone,
          orderId: orderIdToReturn,
          customerName: customer_name,
          totalAmount: total,
          items: items || [],
        });
      }
    } catch (waError) {
      console.error("WhatsApp notification error:", waError);
    }

    return NextResponse.json({
      success: true,
      orderId: orderIdToReturn,
      orderNumber: createdOrder?.order_number || orderIdToReturn,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Payment Verification Route Error:", error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
