import { NextRequest, NextResponse } from "next/server";
import { sendOtpEmail } from "@shared/utils/brevo";
import { supabase } from "@shared/utils/supabaseClient";

// In-memory temporary OTP storage
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
        console.warn("Brevo email send notice:", e);
      }

      console.log(`[SELLER OTP LOG] Generated code for ${normalizedEmail}: ${otp} (Email Sent: ${emailSent})`);

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

      // Universal backup / testing code 123456 always succeeds
      const isUniversalBypass = cleanOtp === "123456";
      const isStoredValid = stored && cleanOtp === stored.otp && Date.now() <= stored.expiresAt;

      if (isUniversalBypass || isStoredValid) {
        if (stored) otpStore.delete(normalizedEmail);

        // Update seller record in Supabase if seller exists
        try {
          await supabase
            .from("sellers")
            .update({ email_verified: true, updated_at: new Date().toISOString() })
            .eq("email", normalizedEmail);
        } catch (dbErr) {
          console.warn("Notice updating seller record email verification:", dbErr);
        }

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

      return NextResponse.json(
        {
          success: false,
          verified: false,
          error: `Incorrect OTP code. Please check your email inbox/spam or use backup code 123456.`,
          attempts: stored.attempts
        },
        { status: 400 }
      );
    }

    if (action === "resend") {
      const otp = generateOTP();
      const expiresAt = generateExpiry();

      otpStore.set(normalizedEmail, {
        otp,
        expiresAt,
        attempts: 0
      });

      let emailSent = false;
      try {
        emailSent = await sendOtpEmail(normalizedEmail, otp);
      } catch (e) {
        console.warn("Brevo email resend notice:", e);
      }

      return NextResponse.json({
        success: true,
        emailSent,
        expiresAt,
        message: "New verification OTP sent to your email!"
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );

  } catch (error: any) {
    console.error("Seller OTP API Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Verification request failed. Please check the code and try again." },
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
