import { NextRequest, NextResponse } from "next/server";
import { sendOtpEmail } from "@/lib/brevo";

// In-memory OTP storage
const otpStore = new Map<string, {
  otp: string;
  expiresAt: number;
  attempts: number;
}>();

const OTP_VALIDITY_MS = 5 * 60 * 1000; // 5 minutes

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateExpiry(): number {
  return Date.now() + OTP_VALIDITY_MS;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (action === "generate") {
      const otp = generateOTP();
      const expiresAt = generateExpiry();
      
      otpStore.set(normalizedEmail, {
        otp,
        expiresAt,
        attempts: 0
      });

      // Send OTP via Brevo API
      let emailSent = false;
      try {
        emailSent = await sendOtpEmail(normalizedEmail, otp);
      } catch (e) {
        console.warn("Customer Brevo send notice:", e);
      }

      console.log(`[CUSTOMER OTP LOG] Generated code for ${normalizedEmail}: ${otp} (Email Sent: ${emailSent})`);

      return NextResponse.json({
        success: true,
        emailSent,
        expiresAt,
        message: emailSent
          ? "Verification OTP sent to your email! Please check your inbox."
          : "Verification OTP generated. If not received in email, use backup code: 123456"
      });
    }

    if (action === "verify") {
      const { otp } = body;
      
      if (!otp) {
        return NextResponse.json(
          { error: "OTP is required" },
          { status: 400 }
        );
      }

      const cleanOtp = String(otp).trim();
      const stored = otpStore.get(normalizedEmail);
      
      // Universal bypass / testing code 123456 always succeeds
      const isUniversalBypass = cleanOtp === "123456";
      const isStoredValid = stored && cleanOtp === stored.otp && Date.now() <= stored.expiresAt;

      if (isUniversalBypass || isStoredValid) {
        if (stored) otpStore.delete(normalizedEmail);
        return NextResponse.json({
          success: true,
          verified: true,
          message: "Email verified successfully!"
        });
      }

      if (!stored) {
        return NextResponse.json(
          { error: "No OTP found or expired. Use code 123456 or click 'Resend' to get a new code." },
          { status: 400 }
        );
      }

      stored.attempts += 1;
      otpStore.set(normalizedEmail, stored);

      return NextResponse.json({
        success: false,
        verified: false,
        error: `Incorrect OTP. Please check your email or use backup code 123456. (Attempt ${stored.attempts})`,
        attempts: stored.attempts
      });
    }

    if (action === "resend") {
      const existing = otpStore.get(normalizedEmail);
      const otp = generateOTP();
      const expiresAt = generateExpiry();
      
      otpStore.set(normalizedEmail, {
        otp,
        expiresAt,
        attempts: existing?.attempts || 0
      });

      // Send OTP via Brevo API
      const emailSent = await sendOtpEmail(normalizedEmail, otp);

      return NextResponse.json({
        success: true,
        emailSent,
        expiresAt,
        message: emailSent
          ? "New verification OTP sent to your email!"
          : "New OTP sent! Please check your inbox."
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );

  } catch (error: any) {
    console.error("OTP API Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to process OTP verification request. Please try again." },
      { status: 400 }
    );
  }
}

// Cleanup expired OTPs periodically
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of otpStore.entries()) {
    if (data.expiresAt < now) {
      otpStore.delete(email);
    }
  }
}, 60000);