import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@shared/utils/supabaseClient";

// In-memory temporary OTP storage cache
const otpStore = new Map<string, {
  otp: string;
  expiresAt: number;
  attempts: number;
  lastRequestedAt: number;
}>();

const OTP_VALIDITY_MS = 15 * 60 * 1000; // 15 minutes validity
const MIN_REQUEST_INTERVAL_MS = 30 * 1000; // Rate limit: 30 seconds minimum between OTP requests

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateExpiry(): number {
  return Date.now() + OTP_VALIDITY_MS;
}

async function sendEmailJsOtp(email: string, otp: string): Promise<boolean> {
  try {
    const serviceId = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "service_5apvm6b";
    const templateId = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || "template_hhuloji";
    const userId = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || "ZR5LIJWz_4EsCSc_a";

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
    const body = await request.json();
    const { action, email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Valid email address is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    if (action === "generate" || action === "resend") {
      const existing = otpStore.get(normalizedEmail);
      if (existing && Date.now() - existing.lastRequestedAt < MIN_REQUEST_INTERVAL_MS) {
        const waitSeconds = Math.ceil((MIN_REQUEST_INTERVAL_MS - (Date.now() - existing.lastRequestedAt)) / 1000);
        return NextResponse.json(
          { success: false, error: `Please wait ${waitSeconds} seconds before requesting a new OTP.` },
          { status: 429 }
        );
      }

      const otp = generateOTP();
      const expiresAt = generateExpiry();

      otpStore.set(normalizedEmail, {
        otp,
        expiresAt,
        attempts: 0,
        lastRequestedAt: Date.now(),
      });

      // 1. Store persistent OTP in PostgreSQL email_otps table
      try {
        await supabase.from("email_otps").insert([{
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

      console.log(`[SELLER OTP SECURE] Verification dispatched for ${normalizedEmail} (Delivered: ${emailSent})`);

      return NextResponse.json({
        success: true,
        emailSent,
        expiresAt,
        message: "Verification OTP code sent to your email! Please check your inbox and spam folder.",
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

      // 1. Check in-memory store
      const isStoredValid = Boolean(stored && cleanOtp === stored.otp && Date.now() <= stored.expiresAt);

      // 2. Check PostgreSQL email_otps table
      let isDbValid = false;
      try {
        const { data: dbOtp } = await supabase
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
          await supabase.from("email_otps").update({ is_verified: true }).eq("id", dbOtp.id);
        }
      } catch (dbVerifyErr) {
        console.warn("Seller DB OTP verify notice:", dbVerifyErr);
      }

      if (isStoredValid || isDbValid) {
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
          message: "Email verified successfully!",
        });
      }

      // Diagnostic check: Did the seller submit an older/previous code?
      try {
        const { data: oldOtp } = await supabase
          .from("email_otps")
          .select("id, created_at, is_verified")
          .eq("email", normalizedEmail)
          .eq("otp", cleanOtp)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (oldOtp) {
          return NextResponse.json({
            success: false,
            verified: false,
            error: "This is an older verification code. Please check your inbox for the latest email with the newest 6-digit code.",
          }, { status: 400 });
        }
      } catch (_) {}

      if (stored) {
        stored.attempts += 1;
        otpStore.set(normalizedEmail, stored);
      }

      return NextResponse.json(
        {
          success: false,
          verified: false,
          error: "Incorrect OTP code. Please enter the 6-digit code received in your latest email.",
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
