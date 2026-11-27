import { NextResponse } from "next/server";
import crypto from "crypto";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { ZEB_QUICK_DELIVERY_FEE, ZEB_QUICK_FREE_DELIVERY_MIN } from "@shared/constants/zebQuick";
import {
  extractRadiusKm,
  geocodeIndianPincode,
  haversineDistanceKm,
  parseValidCoord,
  resolvePincodeCoordFromRow,
  ZEB_QUICK_RADIUS_SETTING_KEY,
} from "@/lib/zebQuickGeo";

function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string, secret: string): boolean {
  if (!orderId || !paymentId || !signature || !secret) return false;
  try {
    const expected = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
    const a = Buffer.from(expected, "utf-8");
    const b = Buffer.from(signature, "utf-8");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

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
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
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

    const isOnline = String(payment_method).toUpperCase() === "ONLINE";
    if (isOnline) {
      const secret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
      if (!verifyRazorpaySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature, secret)) {
        return NextResponse.json({ success: false, error: "Invalid Razorpay payment signature" }, { status: 400 });
      }
    }

    const supabase = getSupabaseServer();
    const db = supabase.schema("zeb_quick");

    // 1. Verify pincode is serviceable for 5-6 Hr delivery & load radius config
    const [{ data: activePincodes }, { data: radiusSetting }] = await Promise.all([
      db
        .from("serviceable_pincodes")
        .select("pincode, area_name, city, lat, lng")
        .eq("is_active", true),
      supabase
        .from("store_settings")
        .select("value")
        .eq("key", ZEB_QUICK_RADIUS_SETTING_KEY)
        .maybeSingle(),
    ]);

    const pinMap = new Map<string, any>();
    (activePincodes || []).forEach((p: any) => {
      pinMap.set(String(p.pincode || "").replace(/\D/g, "").slice(0, 6), p);
    });

    const pinRow = pinMap.get(cleanPin);
    if (!pinRow) {
      return NextResponse.json(
        { success: false, error: `Pincode ${cleanPin} is outside the active ZebQuick 5–6 Hr delivery corridor.` },
        { status: 400 }
      );
    }

    const maxRadiusKm = extractRadiusKm(radiusSetting?.value);
    let customerCoord = resolvePincodeCoordFromRow(cleanPin, pinRow);
    if (!customerCoord) {
      customerCoord = await geocodeIndianPincode(cleanPin, pinRow.area_name, pinRow.city);
    }

    // 2. Verify all products from zeb_quick.products
    const productIds = Array.from(new Set(items.map((i: any) => String(i.id))));
    const { data: dbProducts, error: prodErr } = await db
      .from("products")
      .select("id, source_product_id, seller_id, pickup_pincode, title, image_url, zeb_quick_price, zeb_quick_stock, is_active")
      .in("id", productIds);

    if (prodErr || !dbProducts || dbProducts.length === 0) {
      return NextResponse.json({ success: false, error: "Selected ZebQuick products are no longer available" }, { status: 400 });
    }

    // 2.1 Verify every product's seller is within the active hyperlocal delivery radius (default 25 km)
    const itemSellerIds = Array.from(new Set(dbProducts.map((p: any) => String(p.seller_id)).filter(Boolean)));
    const { data: itemSellers } = await db
      .from("sellers")
      .select("seller_id, pickup_pincode, city, lat, lng, serviceable_pincodes")
      .in("seller_id", itemSellerIds);
    const sellerMap = new Map((itemSellers || []).map((s: any) => [String(s.seller_id), s]));

    for (const dbP of dbProducts as any[]) {
      const s = sellerMap.get(String(dbP.seller_id));
      const sPin = String(s?.pickup_pincode || dbP.pickup_pincode || "").replace(/\D/g, "").slice(0, 6);
      if (!sPin || sPin === cleanPin) continue;
      if (Array.isArray(s?.serviceable_pincodes) && s.serviceable_pincodes.includes(cleanPin)) continue;

      const sellerPinRow = pinMap.get(sPin);
      const sellerCoord =
        parseValidCoord(s?.lat, s?.lng) ||
        resolvePincodeCoordFromRow(sPin, sellerPinRow);

      if (customerCoord && sellerCoord) {
        const dist = haversineDistanceKm(customerCoord, sellerCoord);
        if (dist > maxRadiusKm) {
          return NextResponse.json(
            {
              success: false,
              error: `"${dbP.title}" is ${dist} km from pincode ${cleanPin}, outside our ${maxRadiusKm} km ZebQuick Express delivery radius. Please remove it or select a closer address.`,
            },
            { status: 400 }
          );
        }
      }
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
      if (Number(dbP.zeb_quick_stock || 0) < qty) {
        return NextResponse.json({ success: false, error: `Insufficient express stock for "${dbP.title}"` }, { status: 400 });
      }
      const unitPrice = Number(dbP.zeb_quick_price);
      const lineTotal = unitPrice * qty;
      const commission = Math.round(lineTotal * 0.1 * 100) / 100; // 10% platform commission
      const sellerEarning = Math.round((lineTotal - commission) * 100) / 100;

      subtotal += lineTotal;
      verifiedItems.push({
        zeb_quick_product_id: dbP.id,
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

    const deliveryFee = subtotal >= ZEB_QUICK_FREE_DELIVERY_MIN ? 0 : ZEB_QUICK_DELIVERY_FEE;
    const totalCommission = verifiedItems.reduce((s, i) => s + i.commission_amount, 0);
    const totalAmount = subtotal + deliveryFee;

    // 2.5 Server-side duplicate-order guard (prevents double-tap creating 2 identical orders within 45s)
    const fortyFiveSecondsAgo = new Date(Date.now() - 45 * 1000).toISOString();
    let dupQuery = db
      .from("orders")
      .select("id, order_number, total_amount, promised_delivery_at")
      .eq("delivery_pincode", cleanPin)
      .eq("total_amount", totalAmount)
      .eq("payment_method", String(payment_method).toUpperCase())
      .gte("created_at", fortyFiveSecondsAgo)
      .order("created_at", { ascending: false })
      .limit(1);
    if (user_id) {
      dupQuery = dupQuery.eq("user_id", user_id);
    } else {
      dupQuery = dupQuery.eq("phone", String(phone).trim());
    }
    const { data: existingRecent } = await dupQuery.maybeSingle();
    if (existingRecent) {
      return NextResponse.json({
        success: true,
        duplicate: true,
        order: existingRecent,
      });
    }

    const orderNumber = `ZBQ-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
    const promisedDeliveryAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();

    // 3. Insert into zeb_quick.orders (completely isolated from public.orders)
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

    // 4. Insert order_items + payout ledger + decrement zeb_quick_stock
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
      const dbP = prodMap.get(String(vi.zeb_quick_product_id));
      if (dbP) {
        await db
          .from("products")
          .update({ zeb_quick_stock: Math.max(0, Number(dbP.zeb_quick_stock) - vi.quantity) })
          .eq("id", vi.zeb_quick_product_id);
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
