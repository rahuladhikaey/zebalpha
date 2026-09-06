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
    } = await req.json();

    // Verify product prices against database before creating order
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Cart is empty' }, { status: 400 });
    }

    const productIds = items.map((item: any) => item.product_id || item.id).filter(Boolean);
    const { data: dbProducts, error: dbError } = await supabaseServer
      .from('products')
      .select('id, name, price, mrp, is_active, stock')
      .in('id', productIds);

    if (dbError) {
      console.error('[COD Error] Failed to fetch product catalog prices:', dbError.message);
      return NextResponse.json({ success: false, error: 'Failed to verify product prices against database.' }, { status: 500 });
    }

    if (!dbProducts || dbProducts.length === 0) {
      return NextResponse.json({ success: false, error: 'Products not found in database' }, { status: 404 });
    }

    // Create a map of database products for quick lookup
    const dbProductsMap = new Map();
    dbProducts.forEach(p => dbProductsMap.set(String(p.id), p));

    // Verify each item exists in database and is active
    for (const item of items) {
      const pId = String(item.product_id || item.id || '');
      const dbProduct = dbProductsMap.get(pId);

      if (!dbProduct) {
        return NextResponse.json({ success: false, error: `Product ${item.name || pId} not found in database` }, { status: 404 });
      }

      if (dbProduct.is_active === false) {
        return NextResponse.json({ success: false, error: `Product ${dbProduct.name} is currently unavailable` }, { status: 400 });
      }

      // Update item with verified database price
      item.price = dbProduct.price;
      item.id = dbProduct.id;
      item.product_id = dbProduct.id;
    }

    // Delegate to master order creation which handles splitting, reservation and notifications
    const parentOrder = await createMasterOrder({ user_id, customer_name, phone, address, items, total, payment_method: 'COD' });

    // Send WhatsApp Order Confirmation (keep for backward compatibility)
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
    console.error("COD Error:", error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
