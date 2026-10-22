import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { sendWhatsAppOrderConfirmation } from "@/lib/whatsapp";
import { createMasterOrder } from "@/lib/orderRouter";


// In-memory concurrency lock to prevent millisecond-level duplicate submissions
const inFlightSubmissions = new Map<string, number>();

export async function POST(req: Request) {
  let activeLockKey: string | null = null;
  try {
    const {
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
    } = await req.json();

    // Verify product prices against database before creating order
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Cart is empty' }, { status: 400 });
    }

    const cleanPhone = String(phone || "").replace(/\D/g, "").slice(-10);

    // Active in-flight lock to eliminate exact-millisecond race conditions
    const itemIds = (items || []).map((i: any) => String(i.id || i.product_id || "")).sort().join(",");
    activeLockKey = `${user_id || cleanPhone || "guest"}_${itemIds}`;
    const now = Date.now();
    const activeLock = inFlightSubmissions.get(activeLockKey);
    if (activeLock && (now - activeLock) < 10000) {
      console.warn(`[Duplicate COD Protection] Concurrent request blocked for lockKey: ${activeLockKey}`);
      return NextResponse.json({
        success: false,
        error: "Your order is already being processed. Please do not submit again.",
      }, { status: 429 });
    }
    inFlightSubmissions.set(activeLockKey, now);

    // Clean up expired locks
    if (inFlightSubmissions.size > 200) {
      for (const [k, t] of inFlightSubmissions.entries()) {
        if (now - t > 60000) inFlightSubmissions.delete(k);
      }
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
        console.error('[COD Warning] Failed to fetch product catalog prices:', dbError.message);
      } else if (data) {
        dbProducts = data;
      }
    }

    // Create a map of database products for quick lookup
    const dbProductsMap = new Map<string, any>();
    dbProducts.forEach(p => {
      dbProductsMap.set(String(p.id).toLowerCase(), p);
    });

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

    // Idempotency guard: Throttle duplicate rapid COD submissions (within 30 seconds)
    if (user_id || cleanPhone) {
      const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString();
      let dupQuery = supabaseServer
        .from("orders")
        .select("id, order_number, created_at")
        .eq("payment_method", "COD")
        .gte("created_at", thirtySecondsAgo);

      if (user_id) {
        dupQuery = dupQuery.eq("user_id", user_id);
      } else if (cleanPhone) {
        dupQuery = dupQuery.or(`phone.eq.${cleanPhone},phone.ilike.%${cleanPhone}`);
      }

      const { data: recentOrders } = await dupQuery.order("created_at", { ascending: false }).limit(1);
      if (recentOrders && recentOrders.length > 0) {
        const recentOrder = recentOrders[0];
        console.warn(`[Duplicate COD Protection] Throttling rapid double submission. Returning existing order: ${recentOrder.order_number}`);
        return NextResponse.json({
          success: true,
          orderId: recentOrder.id,
          orderNumber: recentOrder.order_number,
          isDuplicateSubmission: true,
        });
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
      console.warn("Notice loading store settings in COD route:", e);
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

    // Delegate to master order creation which handles splitting, reservation and notifications
    const parentOrder = await createMasterOrder({
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
      payment_method: 'COD',
      coupon_code: couponCode || null,
      discount_amount: verifiedDiscount,
      notes: breakdownNotes,
      verifiedProductsMap: dbProductsMap,
    });

    // Send WhatsApp Order Confirmation asynchronously in background (non-blocking for fast COD confirmation)
    if (phone && sendWhatsAppOrderConfirmation) {
      sendWhatsAppOrderConfirmation({
        phone,
        orderId: parentOrder.id,
        customerName: customer_name,
        totalAmount: authoritativeTotal,
        items: items || [],
      }).catch((waError) => console.error("WhatsApp notification error:", waError));
    }

    return NextResponse.json({ success: true, orderId: parentOrder.id, orderNumber: parentOrder.order_number });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("COD Error:", error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
