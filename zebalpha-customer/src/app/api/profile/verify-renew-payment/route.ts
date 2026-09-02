import { NextResponse } from "next/server";

async function verifySignature(orderId: string, paymentId: string, signature: string, secret: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(orderId + "|" + paymentId);
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const hmac = await crypto.subtle.sign("HMAC", key, data);
  const digest = Array.from(new Uint8Array(hmac))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return digest === signature;
}

export async function POST(req: Request) {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = await req.json();

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      console.error("RAZORPAY_KEY_SECRET is missing.");
      return NextResponse.json({ success: false, message: "Payment verification misconfigured" }, { status: 500 });
    }

    // 1. Verify Signature
    const isAuthentic = await verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      secret
    );

    if (!isAuthentic) {
      return NextResponse.json({ success: false, message: "Invalid signature" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Verification Error:", error);
    return NextResponse.json({ success: false, error: errorMessage }, { status: 500 });
  }
}
