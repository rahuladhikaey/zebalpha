import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/utils/supabaseServer";
import crypto from "crypto";
import {
  generatePasswordResetToken,
  generateSignupProofToken,
  checkRateLimit,
} from "@/shared/services/securityTokenService";

// In-memory temporary OTP storage cache
const otpStore = new Map<string, {
  otp: string;
  expiresAt: number;
  attempts: number;
}>();

const OTP_VALIDITY_MS = 15 * 60 * 1000; // 15 minutes validity
const MAX_VERIFICATION_ATTEMPTS = 5;

/**
 * Cryptographically secure 6-digit OTP generator
 */
function generateOTP(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

function generateExpiry(): number {
  return Date.now() + OTP_VALIDITY_MS;
}

async function sendEmailJsOtp(email: string, otp: string): Promise<boolean> {
  try {
    const serviceId = (process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || process.env.EMAILJS_SERVICE_ID || "").trim();
    const templateId = (process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || process.env.EMAILJS_TEMPLATE_ID || "").trim();
    const userId = (process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || process.env.EMAILJS_PUBLIC_KEY || "").trim();

    if (!serviceId || !templateId || !userId) {
      console.warn("[EmailJS Notice] EmailJS credentials not configured on server.");
      return false;
    }

    const timeStr = new Date().toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });

    const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Origin": "https://dashboard.emailjs.com",
      },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: userId,
        template_params: {
          email: email,
          to_email: email,
          passcode: otp,
          otp: otp,
          code: otp,
          to_name: "Merchant",
          time: `${timeStr} IST`,
        },
      }),
    });

    if (res.ok) {
      return true;
    }
    const errText = await res.text();
    console.error("[Seller EmailJS Send Error]:", res.status, errText);
    return false;
  } catch (err) {
    console.error("[Seller EmailJS Exception]:", err);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { action, email, purpose } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Valid email address is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown-ip";

    // Rate Limiting: max 5 OTP requests per 10 minutes per email
    const rateLimitKey = `otp_gen_${normalizedEmail}_${clientIp}`;
    if ((action === "generate" || action === "resend") && !checkRateLimit(rateLimitKey, 5, 10 * 60 * 1000)) {
      return NextResponse.json(
        { success: false, error: "Too many OTP requests. Please wait a few minutes before trying again." },
        { status: 429 }
      );
    }

    if (action === "generate" || action === "resend") {
      const otp = generateOTP();
      const expiresAt = generateExpiry();

      otpStore.set(normalizedEmail, {
        otp,
        expiresAt,
        attempts: 0,
      });

      // 1. Store persistent OTP in PostgreSQL email_otps table
      try {
        await supabaseServer.from("email_otps").insert([{
          email: normalizedEmail,
          otp,
          expires_at: new Date(expiresAt).toISOString(),
          is_verified: false,
        }]);
      } catch (dbErr) {
        console.warn("Seller DB OTP store notice:", dbErr);
      }

      // 2. Send OTP via EmailJS
      const emailSent = await sendEmailJsOtp(normalizedEmail, otp);

      console.log(`[SELLER OTP] Dispatched verification code for ${normalizedEmail} (Server Email Sent: ${emailSent})`);

      return NextResponse.json({
        success: true,
        expiresAt,
        message: "Verification OTP code sent to your email! Please check your inbox.",
      });
    }

    if (action === "verify") {
      const { otp } = body;

      if (!otp) {
        return NextResponse.json(
          { success: false, error: "OTP is required" },
          { status: 400 }
        );
      }

      const cleanOtp = String(otp).trim();
      const stored = otpStore.get(normalizedEmail);

      // Check brute-force attempt lockout
      if (stored && stored.attempts >= MAX_VERIFICATION_ATTEMPTS) {
        otpStore.delete(normalizedEmail);
        return NextResponse.json(
          {
            success: false,
            verified: false,
            error: "Maximum verification attempts exceeded. For your security, this OTP has been invalidated. Please request a new code.",
          },
          { status: 429 }
        );
      }

      // 1. Check in-memory store
      const isStoredValid = Boolean(stored && cleanOtp === stored.otp && Date.now() <= stored.expiresAt);

      // 2. Check PostgreSQL email_otps table
      let isDbValid = false;
      try {
        const { data: dbOtp } = await supabaseServer
          .from("email_otps")
          .select("*")
          .eq("email", normalizedEmail)
          .eq("otp", cleanOtp)
          .eq("is_verified", false)
          .gte("expires_at", new Date().toISOString())
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (dbOtp) {
          isDbValid = true;
          await supabaseServer.from("email_otps").update({ is_verified: true }).eq("id", dbOtp.id);
        }
      } catch (dbVerifyErr) {
        console.warn("Seller DB OTP verify notice:", dbVerifyErr);
      }

      if (isStoredValid || isDbValid) {
        if (stored) otpStore.delete(normalizedEmail);

        // Update seller record in Supabase if seller exists
        try {
          await supabaseServer
            .from("sellers")
            .update({ email_verified: true, updated_at: new Date().toISOString() })
            .eq("email", normalizedEmail);
        } catch (dbErr) {
          console.warn("Notice updating seller record email verification:", dbErr);
        }

        // Generate cryptographically signed verification tokens
        const resetToken = generatePasswordResetToken(normalizedEmail);
        const signupToken = generateSignupProofToken(normalizedEmail);

        return NextResponse.json({
          success: true,
          verified: true,
          resetToken,
          signupToken,
          message: "Email verified successfully!",
        });
      }

      // Increment attempt counter on failed verification
      if (stored) {
        stored.attempts += 1;
        if (stored.attempts >= MAX_VERIFICATION_ATTEMPTS) {
          otpStore.delete(normalizedEmail);
          return NextResponse.json(
            {
              success: false,
              verified: false,
              error: "Maximum verification attempts exceeded. This OTP has been invalidated. Please request a new code.",
            },
            { status: 429 }
          );
        }
        otpStore.set(normalizedEmail, stored);
      }

      return NextResponse.json(
        {
          success: false,
          verified: false,
          error: "Incorrect OTP code. Please enter the 6-digit code received in your email.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Invalid action specified." },
      { status: 400 }
    );

  } catch (error: any) {
    console.error("Seller OTP API Error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Verification request failed. Please try again." },
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
