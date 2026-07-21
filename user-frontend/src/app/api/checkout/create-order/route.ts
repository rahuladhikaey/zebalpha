import { NextResponse } from "next/server";


export async function POST(req: Request) {
  try {
    const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: "Razorpay keys are not configured. Please check your environment variables." }, 
        { status: 500 }
      );
    }

    const { amount } = await req.json();
    if (!amount) {
      return NextResponse.json({ error: "Amount is required" }, { status: 400 });
    }

    const amountInPaise = Math.round(amount * 100);

    // Using basic auth header
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');

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
    
    let order;
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
      return NextResponse.json(
        { error: order.error?.description || "Failed to create Razorpay order" },
        { status: response.status }
      );
    }

    return NextResponse.json(order);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Create Order Error:", error);
    return NextResponse.json({ error: `Server Error: ${errorMessage}` }, { status: 500 });
  }
}
