import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const keyId = (process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "").trim();
    const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();

    const body = await req.json().catch(() => ({}));
    const rawAmount = body.amount ?? body.total ?? 296;
    const numAmount = parseFloat(String(rawAmount).replace(/[^0-9.]/g, "")) || 296;

    const amountInPaise = Math.round(numAmount * 100);

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
