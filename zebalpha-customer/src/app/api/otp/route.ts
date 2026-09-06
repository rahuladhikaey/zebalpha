import { NextRequest, NextResponse } from "next/server";
import { sendOtpEmail } from "@/lib/brevo";
import { supabaseServer } from "@/lib/supabaseServer";

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

      // 2. Send OTP via Brevo Email API
      let emailSent = false;
      let emailError = "";
      try {
        emailSent = await sendOtpEmail(normalizedEmail, otp);
        if (!emailSent) {
          emailError = "Brevo API returned false - possible API key or sender configuration issue";
          console.warn("[Customer OTP] Brevo sendOtpEmail returned false");
        }
      } catch (e) {
        emailError = e instanceof Error ? e.message : String(e);
        console.error("[Customer OTP] Brevo send exception:", e);
      }

      // 3. Fallback: Trigger Supabase Auth OTP
      try {
        await supabaseServer.auth.signInWithOtp({
          email: normalizedEmail,
          options: { shouldCreateUser: false }
        });
      } catch (sbErr) {
        // Notice only
      }

      console.log(`[CUSTOMER OTP LOG] Generated code for ${normalizedEmail}: ${otp} (Email Sent: ${emailSent})${emailError ? ` Error: ${emailError}` : ''}`);

      return NextResponse.json({
        success: true,
        emailSent,
        expiresAt,
        message: emailSent
          ? "Verification OTP code sent to your email! Please check your inbox."
          : `Verification code generated. Please check your email inbox.${emailError ? ` (Email service unavailable: ${emailError})` : ''}`
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
      
      const isStoredValid = stored && cleanOtp === stored.otp && Date.now() <= stored.expiresAt;

      // Check PostgreSQL email_otps table
      let isDbValid = false;
      try {
        const { data: dbOtp } = await supabaseServer
          .from("email_otps")
          .select("*")
          .eq("email", normalizedEmail)
          .eq("otp", cleanOtp)
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

      if (isStoredValid || isDbValid) {
        if (stored) otpStore.delete(normalizedEmail);
        return NextResponse.json({
          success: true,
          verified: true,
          message: "Email verified successfully!"
        });
      }

      if (!stored) {
        return NextResponse.json(
          { error: "No OTP found or expired. Please click 'Resend' to get a new code." },
          { status: 400 }
        );
      }

      stored.attempts += 1;
      otpStore.set(normalizedEmail, stored);

      return NextResponse.json({
        success: false,
        verified: false,
        error: `Incorrect OTP. Please check your email and try again. (Attempt ${stored.attempts})`,
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
      let emailSent = false;
      try {
        emailSent = await sendOtpEmail(normalizedEmail, otp);
        console.log(`[Customer OTP Resend] Code: ${otp}, Email Sent: ${emailSent}`);
      } catch (e) {
        console.error("[Customer OTP Resend] Error:", e);
      }

      return NextResponse.json({
        success: true,
        emailSent,
        expiresAt,
        message: emailSent
          ? "New verification OTP sent to your email!"
          : "New code generated! Please check your email inbox."
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