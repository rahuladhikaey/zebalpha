import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { GO_ALPHA_DELIVERY_FEE, GO_ALPHA_FREE_DELIVERY_MIN } from "@shared/constants/goAlpha";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      user_id,
      customer_name,
      phone,
      delivery_address,
      delivery_pincode,
      payment_method = "COD",
      items,
    } = body;

    const cleanPin = String(delivery_pincode || "").replace(/\D/g, "").slice(0, 6);
    if (cleanPin.length !== 6) {
      return NextResponse.json({ success: false, error: "Valid 6-digit delivery pincode is required" }, { status: 400 });
    }
    if (!customer_name || !phone || !delivery_address) {
      return NextResponse.json({ success: false, error: "Name, phone, and address are required" }, { status: 400 });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "ZebQuick cart is empty" }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    const db = supabase.schema("go_alpha");

    // 1. Verify pincode is serviceable for 5-6 Hr delivery
    const { data: pinRow } = await db
      .from("serviceable_pincodes")
      .select("pincode, area_name")
      .eq("pincode", cleanPin)
      .eq("is_active", true)
      .maybeSingle();

    if (!pinRow) {
      return NextResponse.json(
        { success: false, error: `Pincode ${cleanPin} is outside the active ZebQuick 5–6 Hr delivery corridor.` },
        { status: 400 }
      );
    }

    // 2. Verify all products from go_alpha.products
    const productIds = Array.from(new Set(items.map((i: any) => String(i.id))));
    const { data: dbProducts, error: prodErr } = await db
      .from("products")
      .select("id, source_product_id, seller_id, title, image_url, go_alpha_price, go_alpha_stock, is_active")
      .in("id", productIds);

    if (prodErr || !dbProducts || dbProducts.length === 0) {
      return NextResponse.json({ success: false, error: "Selected ZebQuick products are no longer available" }, { status: 400 });
    }

    const prodMap = new Map(dbProducts.map((p: any) => [String(p.id), p]));
    let subtotal = 0;
    const verifiedItems: any[] = [];

    for (const item of items) {
      const dbP = prodMap.get(String(item.id));
      if (!dbP || !dbP.is_active) {
        return NextResponse.json({ success: false, error: `"${item.title || "Item"}" is currently unavailable on ZebQuick` }, { status: 400 });
      }
      const qty = Math.max(1, Number(item.quantity || 1));
      if (Number(dbP.go_alpha_stock || 0) < qty) {
        return NextResponse.json({ success: false, error: `Insufficient express stock for "${dbP.title}"` }, { status: 400 });
      }
      const unitPrice = Number(dbP.go_alpha_price);
      const lineTotal = unitPrice * qty;
      const commission = Math.round(lineTotal * 0.1 * 100) / 100; // 10% platform commission
      const sellerEarning = Math.round((lineTotal - commission) * 100) / 100;

      subtotal += lineTotal;
      verifiedItems.push({
        go_alpha_product_id: dbP.id,
        source_product_id: dbP.source_product_id,
        seller_id: dbP.seller_id,
        title: dbP.title,
        size: item.size || null,
        color: item.color || null,
        image_url: dbP.image_url || item.image_url || null,
        quantity: qty,
        unit_price: unitPrice,
        commission_amount: commission,
        seller_earning: sellerEarning,
      });
    }

    const deliveryFee = subtotal >= GO_ALPHA_FREE_DELIVERY_MIN ? 0 : GO_ALPHA_DELIVERY_FEE;
    const totalCommission = verifiedItems.reduce((s, i) => s + i.commission_amount, 0);
    const totalAmount = subtotal + deliveryFee;
    const orderNumber = `GOA-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const promisedDeliveryAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();

    // 3. Insert into go_alpha.orders (completely isolated from public.orders)
    const { data: createdOrder, error: orderErr } = await db
      .from("orders")
      .insert({
        order_number: orderNumber,
        user_id: user_id || null,
        customer_name: String(customer_name).trim(),
        phone: String(phone).trim(),
        delivery_address: String(delivery_address).trim(),
        delivery_pincode: cleanPin,
        subtotal,
        delivery_fee: deliveryFee,
        platform_fee: 0,
        commission_amount: totalCommission,
        total_amount: totalAmount,
        payment_method: String(payment_method).toUpperCase(),
        payment_status: String(payment_method).toUpperCase() === "COD" ? "PENDING" : "PAID",
        order_status: "PLACED",
        promised_delivery_at: promisedDeliveryAt,
      })
      .select()
      .single();

    if (orderErr || !createdOrder) {
      return NextResponse.json({ success: false, error: orderErr?.message || "Failed to place ZebQuick order" }, { status: 500 });
    }

    // 4. Insert order_items + payout ledger + decrement go_alpha_stock
    await db.from("order_items").insert(
      verifiedItems.map((vi) => ({
        order_id: createdOrder.id,
        ...vi,
        item_status: "PLACED",
      }))
    );

    // Group seller ledger entries per seller
    const sellerBuckets = new Map<string, { gross: number; commission: number; net: number }>();
    for (const vi of verifiedItems) {
      const prev = sellerBuckets.get(vi.seller_id) || { gross: 0, commission: 0, net: 0 };
      sellerBuckets.set(vi.seller_id, {
        gross: prev.gross + vi.unit_price * vi.quantity,
        commission: prev.commission + vi.commission_amount,
        net: prev.net + vi.seller_earning,
      });
    }

    await db.from("seller_payout_ledger").insert(
      Array.from(sellerBuckets.entries()).map(([sellerId, sums]) => ({
        seller_id: sellerId,
        order_id: createdOrder.id,
        gross_amount: sums.gross,
        commission_amount: sums.commission,
        net_earning: sums.net,
        payout_status: "PENDING",
      }))
    );

    for (const vi of verifiedItems) {
      const dbP = prodMap.get(String(vi.go_alpha_product_id));
      if (dbP) {
        await db
          .from("products")
          .update({ go_alpha_stock: Math.max(0, Number(dbP.go_alpha_stock) - vi.quantity) })
          .eq("id", vi.go_alpha_product_id);
      }
    }

    return NextResponse.json({
      success: true,
      order: createdOrder,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Checkout failed" }, { status: 500 });
  }
}
