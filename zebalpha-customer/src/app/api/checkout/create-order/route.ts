import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { verifyCheckoutPricingServer } from "@/lib/firstOrderOfferServer";

export async function POST(req: Request) {
  try {
    const keyId = (process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "").trim();
    const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();

    const body = await req.json().catch(() => ({}));
    const rawAmount = body.amount ?? body.total ?? 296;
    let numAmount = parseFloat(String(rawAmount).replace(/[^0-9.]/g, "")) || 296;

    // Authoritative server-side recalculation whenever cart items are supplied
    if (Array.isArray(body.items) && body.items.length > 0) {
      const items = body.items;
      const productIds = items
        .map((item: any) => item.product_id || item.id || item.productId)
        .filter(Boolean);
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const validProductIds = Array.from(
        new Set(productIds.filter((id: any) => typeof id === "string" && uuidRegex.test(id)))
      );

      const dbProductsMap = new Map<string, any>();
      if (validProductIds.length > 0) {
        const { data: dbProducts } = await supabaseServer
          .from("products")
          .select("id, price, packages")
          .in("id", validProductIds);

        (dbProducts || []).forEach((p: any) => {
          dbProductsMap.set(String(p.id).toLowerCase(), p);
        });
      }

      const computedSubtotal = items.reduce((sum: number, item: any) => {
        const pId = String(item.product_id || item.id || item.productId || "").toLowerCase();
        const dbProduct = dbProductsMap.get(pId);
        let unitPrice = Number(item.price) || 0;
        if (dbProduct) {
          let matchedPrice = dbProduct.price;
          if (Array.isArray(dbProduct.packages) && dbProduct.packages.length > 0) {
            const matchedPkg = dbProduct.packages.find(
              (p: any) =>
                (item.variant_id && String(p.id) === String(item.variant_id)) ||
                (item.package_name && p.name === item.package_name) ||
                (item.selected_sku && p.sku === item.selected_sku) ||
                (item.name && item.name.includes(p.name))
            );
            if (matchedPkg && matchedPkg.price) {
              matchedPrice = matchedPkg.price;
            }
          }
          unitPrice = Number(matchedPrice ?? unitPrice);
        }
        const qty = Math.max(1, Number(item.quantity) || 1);
        return sum + unitPrice * qty;
      }, 0);

      if (computedSubtotal > 0) {
        const verified = await verifyCheckoutPricingServer({
          userId: body.user_id || null,
          phone: body.phone || null,
          computedSubtotal,
          paymentMethod: "ONLINE",
          couponCode: body.couponCode || null,
          fallbackDeliveryFee: Number(body.delivery_fee ?? body.shipping_charge ?? 0),
          fallbackPlatformFee: Number(body.platform_fee ?? body.handling_fee ?? 0),
          fallbackTax: Number(body.tax ?? 0),
        });
        if (verified.authoritativeTotal > 0) {
          numAmount = verified.authoritativeTotal;
        }
      }
    }

    const amountInPaise = Math.max(100, Math.round(numAmount * 100));

    if (!keyId || !keySecret) {
      console.error("[Razorpay Security] RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is not configured.");
      return NextResponse.json(
        { success: false, error: "Payment gateway is not properly configured on server." },
        { status: 500 }
      );
    }

    // Using basic auth header for Razorpay API
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${auth}`,
      },
      body: JSON.stringify({
        amount: amountInPaise,
        currency: "INR",
        receipt: `receipt_${Date.now()}`.slice(0, 40),
      }),
    });

    const responseData = await response.text();
    let order: any = null;
    try {
      order = JSON.parse(responseData);
    } catch (e) {
      console.warn("Non-JSON response from Razorpay:", responseData);
    }

    if (response.ok && order && order.id) {
      return NextResponse.json({
        ...order,
        success: true,
        id: order.id,
        orderId: order.id,
        key: keyId,
        keyId: keyId,
      });
    }

    const errDesc = order?.error?.description || "Failed to create Razorpay order session";
    console.error("[Razorpay Error] Order creation rejected:", errDesc);
    return NextResponse.json(
      {
        success: false,
        error: errDesc,
      },
      { status: response.status || 502 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Create Order Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: `Payment initialization error: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}
