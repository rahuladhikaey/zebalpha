import { NextRequest, NextResponse } from "next/server";


// In-memory OTP storage (not persisted - resets on server restart)
// Format: { email: { otp: string, expiresAt: number, attempts: number } }
const otpStore = new Map<string, {
  otp: string;
  expiresAt: number;
  attempts: number;
}>();

const OTP_LENGTH = 6;
const OTP_VALIDITY_MS = 60 * 1000; // 60 seconds
// No attempt limit - unlimited retries allowed

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
      // Generate new OTP
      const otp = generateOTP();
      const expiresAt = generateExpiry();
      
      otpStore.set(normalizedEmail, {
        otp,
        expiresAt,
        attempts: 0
      });

      // Return OTP to display on screen (as requested)
      return NextResponse.json({
        success: true,
        otp, // This will be shown on screen
        expiresAt,
        message: "OTP generated! Please verify."
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

      const stored = otpStore.get(normalizedEmail);
      
      if (!stored) {
        return NextResponse.json(
          { error: "No OTP found. Please request a new OTP." },
          { status: 400 }
        );
      }

      // Check if OTP expired
      if (Date.now() > stored.expiresAt) {
        // Clear expired OTP
        otpStore.delete(normalizedEmail);
        return NextResponse.json(
          { 
            error: "OTP has expired. Please request a new one.",
            expired: true
          },
          { status: 400 }
        );
      }

      // Verify OTP
      if (otp === stored.otp) {
        // Success - clear OTP
        otpStore.delete(normalizedEmail);
        return NextResponse.json({
          success: true,
          verified: true,
          message: "Email verified successfully!"
        });
      }

      // Incorrect OTP - increment attempts (for tracking only, no blocking)
      stored.attempts += 1;
      otpStore.set(normalizedEmail, stored);

      return NextResponse.json({
        success: false,
        verified: false,
        error: `Incorrect OTP. Please try again. (Attempt ${stored.attempts})`,
        attempts: stored.attempts
      });
    }

    if (action === "resend") {
      // Generate new OTP
      const existing = otpStore.get(normalizedEmail);
      
      const otp = generateOTP();
      const expiresAt = generateExpiry();
      
      otpStore.set(normalizedEmail, {
        otp,
        expiresAt,
        attempts: existing?.attempts || 0
      });

      return NextResponse.json({
        success: true,
        otp,
        expiresAt,
        message: "New OTP generated!"
      });
    }

    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 }
    );

  } catch (error) {
    console.error("OTP API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Cleanup expired OTPs periodically (optional optimization)
setInterval(() => {
  const now = Date.now();
  for (const [email, data] of otpStore.entries()) {
    if (data.expiresAt < now) {
      otpStore.delete(email);
    }
  }
}, 60000); // Clean every minute