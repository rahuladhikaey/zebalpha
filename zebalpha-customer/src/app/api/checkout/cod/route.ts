import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { sendWhatsAppOrderConfirmation } from "@/lib/whatsapp";
import { createMasterOrder } from "@/lib/orderRouter";


export async function POST(req: Request) {
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
    } = await req.json();

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
        item.price = Number(dbProduct.price ?? item.price);
        item.id = dbProduct.id;
        item.product_id = dbProduct.id;
      }
    }

    // Idempotency guard: Throttle duplicate rapid COD submissions (within 30 seconds)
    if (user_id || phone) {
      const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString();
      let dupQuery = supabaseServer
        .from("orders")
        .select("id, order_number, created_at")
        .eq("payment_method", "COD")
        .gte("created_at", thirtySecondsAgo);

      if (user_id) {
        dupQuery = dupQuery.eq("user_id", user_id);
      } else if (phone) {
        dupQuery = dupQuery.eq("phone", phone);
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

    // Delegate to master order creation which handles splitting, reservation and notifications
    const parentOrder = await createMasterOrder({
      user_id,
      customer_name,
      phone,
      address,
      items,
      total,
      payment_method: 'COD',
      coupon_code: couponCode || null,
      discount_amount: Number(discount) || 0,
      verifiedProductsMap: dbProductsMap,
    });

    // Send WhatsApp Order Confirmation asynchronously in background (non-blocking for fast COD confirmation)
    if (phone && sendWhatsAppOrderConfirmation) {
      sendWhatsAppOrderConfirmation({
        phone,
        orderId: parentOrder.id,
        customerName: customer_name,
        totalAmount: total,
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
