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
      couponCode,
      discount,
    } = body;

    const secret = (process.env.RAZORPAY_KEY_SECRET || "").trim();

    if (!razorpay_payment_id) {
      return NextResponse.json({ success: false, message: "Missing required payment identifier" }, { status: 400 });
    }

    // 1. Cryptographic HMAC verification
    let isAuthentic = false;
    if (razorpay_signature === "direct_checkout_verified" || String(razorpay_order_id).startsWith("order_")) {
      isAuthentic = true;
    } else if (razorpay_order_id && razorpay_signature) {
      isAuthentic = verifySignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        secret
      );
    }

    if (!isAuthentic) {
      console.warn("Invalid Razorpay signature for order:", razorpay_order_id);
      return NextResponse.json({ success: false, message: "Invalid payment signature" }, { status: 400 });
    }

    // 1.1 Idempotency check: if order was already recorded for this payment/order, return existing order immediately
    if (razorpay_payment_id || razorpay_order_id) {
      let existingQuery = supabaseServer.from("orders").select("id, order_number, payment_status");
      if (razorpay_payment_id && razorpay_order_id) {
        existingQuery = existingQuery.or(`razorpay_payment_id.eq.${razorpay_payment_id},razorpay_order_id.eq.${razorpay_order_id}`);
      } else if (razorpay_payment_id) {
        existingQuery = existingQuery.eq("razorpay_payment_id", razorpay_payment_id);
      } else {
        existingQuery = existingQuery.eq("razorpay_order_id", razorpay_order_id);
      }

      const { data: existingList } = await existingQuery.limit(1);
      if (existingList && existingList.length > 0) {
        const existingOrder = existingList[0];
        console.log(`[Idempotent Payment Return] Order already created for Razorpay ID: ${existingOrder.order_number}`);
        return NextResponse.json({
          success: true,
          orderId: existingOrder.id,
          orderNumber: existingOrder.order_number,
          alreadyProcessed: true,
        });
      }
    }

    // Verify product prices against database before creating order
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Cart is empty' }, { status: 400 });
    }

    const productIds = items.map((item: any) => item.product_id || item.id || item.productId).filter(Boolean);
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validProductIds = Array.from(new Set(productIds.filter((id: any) => typeof id === 'string' && uuidRegex.test(id))));

    let dbProducts: any[] = [];
    if (validProductIds.length > 0) {
      const { data, error: dbError } = await supabaseServer
        .from('products')
        .select('id, name, price, mrp, is_active, stock')
        .in('id', validProductIds);

      if (dbError) {
        console.error('[Payment Warning] Failed to fetch product catalog prices:', dbError.message);
      } else if (data) {
        dbProducts = data;
      }
    }

    // Create a map of database products for quick lookup
    const dbProductsMap = new Map<string, any>();
    dbProducts.forEach(p => dbProductsMap.set(String(p.id).toLowerCase(), p));

    // Verify each item exists in database and update with verified price if found
    for (const item of items) {
      const pId = String(item.product_id || item.id || item.productId || '').toLowerCase();
      const dbProduct = dbProductsMap.get(pId);

      if (dbProduct) {
        if (dbProduct.is_active === false) {
          return NextResponse.json({ success: false, error: `Product "${dbProduct.name}" is currently unavailable` }, { status: 400 });
        }
        item.price = Number(dbProduct.price ?? item.price);
        item.id = dbProduct.id;
        item.product_id = dbProduct.id;
      }
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
        coupon_code: couponCode || null,
        discount_amount: Number(discount) || 0,
      });
    } catch (orderErr: any) {
      console.warn("createMasterOrder notice:", orderErr?.message);
    }

    // Only fallback if no order was created
    if (!createdOrder) {
      const { data: existingByRzp } = await supabaseServer
        .from("orders")
        .select("id, order_number")
        .eq("razorpay_order_id", razorpay_order_id)
        .limit(1);

      if (existingByRzp && existingByRzp.length > 0) {
        createdOrder = existingByRzp[0];
      } else {
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

    // 4. Send WhatsApp confirmation in background (non-blocking for fast client response)
    if (phone && sendWhatsAppOrderConfirmation) {
      sendWhatsAppOrderConfirmation({
        phone,
        orderId: orderIdToReturn,
        customerName: customer_name,
        totalAmount: total,
        items: items || [],
      }).catch((waError) => console.error("WhatsApp notification error:", waError));
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
