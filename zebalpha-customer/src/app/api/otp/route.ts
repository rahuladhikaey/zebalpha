import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

// In-memory OTP storage cache
const otpStore = new Map<string, {
  otp: string;
  expiresAt: number;
  attempts: number;
}>();

const OTP_VALIDITY_MS = 15 * 60 * 1000; // 15 minutes validity

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
    console.error("[EmailJS Send Error]:", res.status, errText);
    return false;
  } catch (err) {
    console.error("[EmailJS Send Exception]:", err);
    return false;
  }
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

      // 1. Store persistent OTP in PostgreSQL email_otps table
      try {
        await supabaseServer.from("email_otps").insert([{
          email: normalizedEmail,
          otp,
          expires_at: new Date(expiresAt).toISOString(),
          is_verified: false
        }]);
      } catch (dbErr) {
        console.warn("Customer DB OTP store notice:", dbErr);
      }

      // 2. Send OTP via EmailJS
      const emailSent = await sendEmailJsOtp(normalizedEmail, otp);

      console.log(`[CUSTOMER OTP LOG] Generated code for ${normalizedEmail}: ${otp} (Email Sent: ${emailSent})`);

      return NextResponse.json({
        success: true,
        otp,
        emailSent,
        expiresAt,
        message: "Verification OTP code sent to your email! Please check your inbox.",
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
      
      // 1. Check in-memory store
      const isStoredValid = Boolean(stored && cleanOtp === stored.otp && Date.now() <= stored.expiresAt);

      // 2. Check PostgreSQL email_otps table for active unverified OTP
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
        console.warn("Customer DB OTP verify notice:", dbVerifyErr);
      }

      // If valid, accept verification
      if (isStoredValid || isDbValid) {
        if (stored) otpStore.delete(normalizedEmail);
        return NextResponse.json({
          success: true,
          verified: true,
          message: "Email verified successfully!"
        });
      }

      // Diagnostic check: Did the user submit an older/previous code?
      try {
        const { data: oldOtp } = await supabaseServer
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
      } catch (checkOldErr) {
        // ignore
      }

      if (stored) {
        stored.attempts += 1;
        otpStore.set(normalizedEmail, stored);
      }

      return NextResponse.json({
        success: false,
        verified: false,
        error: "Incorrect OTP code. Please enter the 6-digit code received in your latest email.",
      }, { status: 400 });
    }

    if (action === "resend") {
      const otp = generateOTP();
      const expiresAt = generateExpiry();
      
      otpStore.set(normalizedEmail, {
        otp,
        expiresAt,
        attempts: 0
      });

      // 1. Store persistent OTP in PostgreSQL email_otps table
      try {
        await supabaseServer.from("email_otps").insert([{
          email: normalizedEmail,
          otp,
          expires_at: new Date(expiresAt).toISOString(),
          is_verified: false
        }]);
      } catch (dbErr) {
        console.warn("Customer DB OTP store notice:", dbErr);
      }

      // 2. Send OTP via EmailJS
      const emailSent = await sendEmailJsOtp(normalizedEmail, otp);

      console.log(`[Customer OTP Resend] Code: ${otp}, Email Sent: ${emailSent}`);

      return NextResponse.json({
        success: true,
        otp,
        emailSent,
        expiresAt,
        message: emailSent
          ? "New verification OTP sent to your email!"
          : "Verification OTP generated. Please check your email.",
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