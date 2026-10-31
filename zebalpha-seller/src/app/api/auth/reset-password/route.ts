import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/shared/utils/supabaseServer";
import {
  verifyPasswordResetToken,
  consumePasswordResetToken,
  checkRateLimit,
} from "@/shared/services/securityTokenService";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, newPassword, resetToken } = body;

    if (!email || !newPassword) {
      return NextResponse.json(
        { error: "Email and new password are required" },
        { status: 400 }
      );
    }

    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown-ip";

    // Rate Limiting: max 5 reset attempts per 15 minutes per IP/email
    if (!checkRateLimit(`pwd_reset_${normalizedEmail}_${clientIp}`, 5, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many password reset requests. Please wait a few minutes before trying again." },
        { status: 429 }
      );
    }

    // MANDATORY CRYPTOGRAPHIC ATTESTATION CHECK:
    // Reject any request lacking a cryptographically signed reset token
    if (!resetToken || typeof resetToken !== "string") {
      return NextResponse.json(
        { error: "Authorization required: A verified password reset token is required. Please verify your OTP first." },
        { status: 401 }
      );
    }

    // Verify token cryptographic signature, expiry, purpose, email binding, and single-use status
    const tokenVerification = verifyPasswordResetToken(normalizedEmail, resetToken);
    if (!tokenVerification.valid) {
      return NextResponse.json(
        { error: `Invalid or expired password reset token: ${tokenVerification.reason || "Verification failed"}` },
        { status: 403 }
      );
    }

    // Single-use: Consume token immediately to prevent replay attacks
    consumePasswordResetToken(resetToken);

    // Fetch user in auth.users
    const { data: listData, error: listError } = await supabaseServer.auth.admin.listUsers();
    if (listError) {
      console.error("[Reset Password] Error listing users:", listError);
      return NextResponse.json({ error: "Failed to process password update" }, { status: 500 });
    }

    const existingUser = listData?.users?.find((u: any) => u.email?.toLowerCase() === normalizedEmail);

    // Prevent account enumeration: If user doesn't exist, return standardized success message
    if (!existingUser) {
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, the password has been updated successfully.",
      });
    }

    // Update password via Admin API
    const { error: updateError } = await supabaseServer.auth.admin.updateUserById(
      existingUser.id,
      {
        password: newPassword,
        email_confirm: true,
      }
    );

    if (updateError) {
      console.error("[Reset Password] Failed to update user password:", updateError);
      return NextResponse.json(
        { error: "Failed to update password. Please ensure password requirements are met." },
        { status: 500 }
      );
    }

    // Invalidate existing sessions across devices for security
    try {
      await supabaseServer.auth.admin.signOut(existingUser.id, "global");
    } catch (signOutErr) {
      console.warn("[Reset Password] Global sign-out notice:", signOutErr);
    }

    return NextResponse.json({
      success: true,
      message: "Password updated successfully! All active sessions have been invalidated. Please sign in with your new password.",
    });

  } catch (error: any) {
    console.error("Reset Password API Error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
