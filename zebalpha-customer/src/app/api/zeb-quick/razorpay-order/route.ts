import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabaseServer";
import { ZEB_QUICK_DELIVERY_FEE, ZEB_QUICK_FREE_DELIVERY_MIN } from "@shared/constants/zebQuick";

export async function POST(req: Request) {
  try {
    const keyId = (process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "").trim();
    const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: "Razorpay keys are not configured on server." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const items = Array.isArray(body.items) ? body.items : [];
    if (items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const db = getSupabaseServer().schema("zeb_quick");
    const productIds = Array.from(new Set(items.map((i: any) => String(i.id))));
    const { data: dbProducts, error } = await db
      .from("products")
      .select("id, zeb_quick_price, is_active")
      .in("id", productIds);

    if (error || !dbProducts || dbProducts.length === 0) {
      return NextResponse.json({ error: "Selected products are unavailable" }, { status: 400 });
    }

    const prodMap = new Map(dbProducts.map((p: any) => [String(p.id), p]));
    let subtotal = 0;
    for (const item of items) {
      const p = prodMap.get(String(item.id));
      if (!p || !p.is_active) {
        return NextResponse.json({ error: "One or more items are unavailable" }, { status: 400 });
      }
      subtotal += Number(p.zeb_quick_price) * Math.max(1, Number(item.quantity || 1));
    }

    const deliveryFee = subtotal >= ZEB_QUICK_FREE_DELIVERY_MIN ? 0 : ZEB_QUICK_DELIVERY_FEE;
    const totalAmount = subtotal + deliveryFee;
    const amountPaise = Math.round(totalAmount * 100);

    const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const rzpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: "INR",
        receipt: `zbq_${Date.now()}`,
        notes: { channel: "ZEB_QUICK" },
      }),
    });

    const rzpData = await rzpRes.json();
    if (!rzpRes.ok || !rzpData.id) {
      return NextResponse.json(
        { error: rzpData?.error?.description || "Failed to initialize Razorpay order" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      orderId: rzpData.id,
      amount: totalAmount,
      amountPaise,
      currency: "INR",
      keyId,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
  }
}
