import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_ShRpqbs6hVT6Ie";
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "5LUjZ94LMDnjwlLyB9cUU5cb";

    const body = await req.json().catch(() => ({}));
    const { amount } = body;

    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "Valid amount is required" }, { status: 400 });
    }

    const amountInPaise = Math.round(Number(amount) * 100);

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
        receipt: `receipt_${Date.now()}`,
      }),
    });

    const responseData = await response.text();
    
    let order: any;
    try {
      order = JSON.parse(responseData);
    } catch (e) {
      console.error("Non-JSON response from Razorpay:", responseData);
      return NextResponse.json(
        { error: `Razorpay returned a non-JSON response: ${responseData.substring(0, 50)}...` },
        { status: 500 }
      );
    }

    if (!response.ok) {
      console.error("Razorpay create-order API error:", order);
      return NextResponse.json(
        { error: order.error?.description || "Failed to create Razorpay order" },
        { status: response.status }
      );
    }

    // Return complete payload with key and order identifiers
    return NextResponse.json({
      ...order,
      success: true,
      id: order.id,
      orderId: order.id,
      key: keyId,
      keyId: keyId,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Create Order Server Error:", error);
    return NextResponse.json({ error: `Server Error: ${errorMessage}` }, { status: 500 });
  }
}
