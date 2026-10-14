import { NextResponse } from "next/server";
import crypto from "crypto";

function verifySignature(orderId: string, paymentId: string, signature: string, secret: string): boolean {
  if (!orderId || !paymentId || !signature || !secret) return false;
  try {
    const generated = crypto.createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
    const genBuf = Buffer.from(generated, "utf-8");
    const sigBuf = Buffer.from(signature, "utf-8");
    if (genBuf.length !== sigBuf.length) return false;
    return crypto.timingSafeEqual(genBuf, sigBuf);
  } catch (err) {
    console.error("Renewal payment signature verification error:", err);
    return false;
  }
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
