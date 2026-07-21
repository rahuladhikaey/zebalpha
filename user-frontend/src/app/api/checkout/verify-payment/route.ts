import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { sendWhatsAppOrderConfirmation } from "@/lib/whatsapp";


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

    // 2. Save Order to Supabase with "Payment Complete"
    const { data, error } = await supabaseServer.from("orders").insert([
      {
        customer_name,
        phone,
        address,
        product_details: JSON.stringify(items),
        total_amount: total,
        payment_method: "ONLINE",
        payment_status: "COMPLETE",
        order_status: "PENDING",
        razorpay_order_id,
        razorpay_payment_id,
        user_id: user_id,
      },
    ]).select().single();

    if (error) {
      console.error("Supabase Order Creation Error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Process Stock Update
    try {
      for (const item of items) {
        const { data: product } = await supabaseServer.from("products").select("stock").eq("id", item.id).single();
        if (product) {
          const newStock = Math.max(0, (product.stock || 0) - item.quantity);
          await supabaseServer.from("products").update({ 
            stock: newStock,
            status: newStock > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK'
          }).eq("id", item.id);
          
          await supabaseServer.from("stock_history").insert({
            product_id: item.id,
            change_amount: -item.quantity,
            reason: `Order Placed - ONLINE (Order ID: ${data.id})`,
            admin_user: 'System'
          });
        }
      }
    } catch (stockError) {
      console.error("Stock update error:", stockError);
    }

    // Send WhatsApp Order Confirmation
    try {
      if (phone) {
        await sendWhatsAppOrderConfirmation({
          phone,
          orderId: data.id,
          customerName: customer_name,
          totalAmount: total,
          items: items || [],
        });
      }
    } catch (waError) {
      console.error("WhatsApp notification error:", waError);
    }

    return NextResponse.json({ success: true, orderId: data.id });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Verification Error:", error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
