import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { sendWhatsAppOrderConfirmation } from "@/lib/whatsapp";
import { createMasterOrder } from "@/lib/orderRouter";
import crypto from "crypto";

function verifySignature(orderId: string, paymentId: string, signature: string, secret: string): boolean {
  if (!orderId || !paymentId || !signature || !secret) {
    return false;
  }
  try {
    const generatedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    const genBuf = Buffer.from(generatedSignature, "utf-8");
    const sigBuf = Buffer.from(signature, "utf-8");
    if (genBuf.length !== sigBuf.length) {
      return false;
    }
    return crypto.timingSafeEqual(genBuf, sigBuf);
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
      delivery_fee,
      shipping_charge,
      platform_fee,
      handling_fee,
      tax: clientTax,
      subtotal,
    } = body;

    const secret = (process.env.RAZORPAY_KEY_SECRET || "").trim();

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { success: false, message: "Missing required payment verification parameters (order_id, payment_id, signature required)." },
        { status: 400 }
      );
    }

    if (!secret) {
      console.error("[Razorpay Security] RAZORPAY_KEY_SECRET is not configured on server.");
      return NextResponse.json(
        { success: false, message: "Payment verification service is not properly configured on server." },
        { status: 500 }
      );
    }

    // 1. Strict Cryptographic HMAC verification using constant-time comparison
    const isAuthentic = verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      secret
    );

    if (!isAuthentic) {
      console.warn("[Razorpay Security] Invalid payment signature for order:", razorpay_order_id);
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
        .select('id, name, price, mrp, is_active, stock, packages, seller_id')
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
        let matchedPrice = dbProduct.price;
        if (Array.isArray(dbProduct.packages) && dbProduct.packages.length > 0) {
          const matchedPkg = dbProduct.packages.find((p: any) =>
            (item.variant_id && String(p.id) === String(item.variant_id)) ||
            (item.package_name && p.name === item.package_name) ||
            (item.selected_sku && p.sku === item.selected_sku) ||
            (item.name && item.name.includes(p.name))
          );
          if (matchedPkg && matchedPkg.price) {
            matchedPrice = matchedPkg.price;
          }
        }
        item.price = Number(matchedPrice ?? item.price);
        item.id = dbProduct.id;
        item.product_id = dbProduct.id;
      }
    }

    // Calculate server-verified authoritative total amount
    const computedSubtotal = items.reduce((sum: number, it: any) => {
      const itemPrice = Number(it.price) || 0;
      const itemQty = Math.max(1, Number(it.quantity) || 1);
      return sum + itemPrice * itemQty;
    }, 0);
    const verifiedDiscount = Math.max(0, Math.min(Number(discount) || 0, computedSubtotal));
    const discountedSubtotal = Math.max(0, computedSubtotal - verifiedDiscount);

    // Fetch authoritative store settings for delivery & platform fees
    let deliveryCharge = 0;
    let freeShippingThreshold = 0;
    let platformFee = 0;
    let tax = 0;

    try {
      const { data: bData } = await supabaseServer
        .from('store_settings')
        .select('key, value')
        .in('key', ['billing', 'marketplace_rules']);

      const map: Record<string, any> = {};
      (bData || []).forEach((row: any) => { map[row.key] = row.value; });
      const b = map.billing || {};
      const m = map.marketplace_rules || {};

      const parseNum = (val: any, fallback = 0) => {
        if (val !== undefined && val !== null && val !== "" && !isNaN(Number(val))) {
          return Number(val);
        }
        return fallback;
      };

      deliveryCharge = parseNum(m.deliveryCharge ?? b.deliveryFee, Number(delivery_fee ?? shipping_charge ?? 0));
      freeShippingThreshold = parseNum(m.freeShippingThreshold ?? b.freeDeliveryThreshold, 0);
      platformFee = parseNum(m.appCharge ?? b.packagingFee, Number(platform_fee ?? handling_fee ?? 0));
      tax = parseNum(b.tax, Number(clientTax ?? 0));
    } catch (e) {
      console.warn("Notice loading store settings in verify-payment route:", e);
      deliveryCharge = Number(delivery_fee ?? shipping_charge ?? 0);
      platformFee = Number(platform_fee ?? handling_fee ?? 0);
      tax = Number(clientTax ?? 0);
    }

    const effectiveDeliveryFee = (freeShippingThreshold > 0 && discountedSubtotal >= freeShippingThreshold) ? 0 : deliveryCharge;
    const authoritativeTotal = discountedSubtotal + effectiveDeliveryFee + platformFee + tax;

    const breakdownNotes = JSON.stringify({
      subtotal: computedSubtotal,
      discount: verifiedDiscount,
      deliveryFee: effectiveDeliveryFee,
      shippingCharge: effectiveDeliveryFee,
      platformFee: platformFee,
      handlingFee: platformFee,
      tax: tax,
      grandTotal: authoritativeTotal,
      couponCode: couponCode || null,
    });

    // 2. Create Master Order (splits per seller, decrements stock, creates notifications)
    let createdOrder: any = null;
    let isMasterOrderCreated = false;
    try {
      createdOrder = await createMasterOrder({
        user_id,
        customer_name,
        phone,
        address,
        items,
        total: authoritativeTotal,
        subtotal: computedSubtotal,
        delivery_fee: effectiveDeliveryFee,
        shipping_charge: effectiveDeliveryFee,
        platform_fee: platformFee,
        handling_fee: platformFee,
        tax: tax,
        payment_method: "ONLINE",
        coupon_code: couponCode || null,
        discount_amount: verifiedDiscount,
        notes: breakdownNotes,
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        verifiedProductsMap: dbProductsMap,
      });
      if (createdOrder) {
        isMasterOrderCreated = true;
      }
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
            total_amount: authoritativeTotal,
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

      // If created by emergency fallback, ensure payment record exists
      if (createdOrder?.id) {
        try {
          await supabaseServer.from("payments").insert([{
            parent_order_id: createdOrder.id,
            amount: total,
            method: "ONLINE",
            status: "COMPLETE",
            transaction_reference: razorpay_payment_id,
          }]);
        } catch (_) {}
      }
    }

    const orderIdToReturn = createdOrder?.id || createdOrder?.order_number || `ORD-${Date.now()}`;

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
