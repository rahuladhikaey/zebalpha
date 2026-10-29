import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { verifyPassword } from "@/lib/crypto";
import { supabaseServer } from "@shared/utils/supabaseServer";
import { checkLoginRateLimit, recordLoginFailure, clearLoginRateLimit, extractClientIp } from "@/lib/rateLimit";

async function recordAuditLog(
  actor: string,
  ip: string,
  userAgent: string,
  action: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'LOGIN_LOCKED_OUT',
  details?: string
) {
  try {
    await supabaseServer.from("admin_audit_logs").insert({
      username: actor || "SUPER_ADMIN",
      ip_address: ip,
      user_agent: userAgent,
      action: action,
      details: details || "",
    });
  } catch (err) {
    console.error("[Audit Log Error]:", err);
  }
}

export async function POST(req: Request) {
  const ip = extractClientIp(req);
  const userAgent = req.headers.get("user-agent") || "unknown";

  // 1. Persistent Distributed Rate Limit & Lockout Check
  const rateLimitStatus = await checkLoginRateLimit(req);
  if (!rateLimitStatus.allowed) {
    await recordAuditLog("SUPER_ADMIN", ip, userAgent, "LOGIN_LOCKED_OUT", `Attempt while locked out (${rateLimitStatus.retryAfterSeconds}s remaining)`);
    return NextResponse.json(
      {
        success: false,
        message: `Too many failed attempts. Temporary lockout active. Please wait ${Math.ceil(rateLimitStatus.retryAfterSeconds / 60)} minutes.`,
        retryAfter: rateLimitStatus.retryAfterSeconds,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimitStatus.retryAfterSeconds) },
      }
    );
  }

  try {
    const body = await req.json();
    // Accept Key 1 and Key 2 from the request
    const factor1 = (body.adminKey1 ?? body.key1 ?? body.username ?? "").trim();
    const factor2 = (body.adminKey2 ?? body.key2 ?? body.password ?? "").trim();

    if (!factor1 || !factor2) {
      return NextResponse.json(
        { success: false, message: "Both Admin Security Factor 1 and Factor 2 are required." },
        { status: 400 }
      );
    }

    const ADMIN_ACCESS_KEY_1 = process.env.ADMIN_ACCESS_KEY_1;
    const ADMIN_ACCESS_KEY_2 = process.env.ADMIN_ACCESS_KEY_2;
    const JWT_SECRET = process.env.ADMIN_JWT_SECRET;

    if (!ADMIN_ACCESS_KEY_1 || !ADMIN_ACCESS_KEY_2 || !JWT_SECRET) {
      console.error("[Admin Security Error] Critical: Admin security keys or JWT secret missing in environment variables.");
      return NextResponse.json(
        { success: false, message: "Authentication service misconfigured. Contact system administrator." },
        { status: 500 }
      );
    }

    // Two-Factor Server-Side Verification using constant-time checks
    const isFactor1Valid = await verifyPassword(factor1, ADMIN_ACCESS_KEY_1);
    const isFactor2Valid = await verifyPassword(factor2, ADMIN_ACCESS_KEY_2);

    // Both independent factors MUST be valid. No single-factor or password-only fallback allowed.
    const isTwoFactorVerified = isFactor1Valid && isFactor2Valid;

    if (isTwoFactorVerified) {
      // Clear rate-limiting on success
      await clearLoginRateLimit(req, "founder_super_admin");

      const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);
      const sessionExpirySeconds = 2 * 60 * 60; // 2 hours strict absolute expiry

      // Sign JWT with role, username, jti, issuedAt, expiresAt and idle timeout reference
      const token = await new SignJWT({
        role: "SUPER_ADMIN",
        user: "SUPER_ADMIN",
        jti: crypto.randomUUID(),
        lastActive: Date.now(),
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("2h")
        .sign(SECRET_KEY);

      await recordAuditLog("SUPER_ADMIN", ip, userAgent, "LOGIN_SUCCESS", "Two-Factor Authentication Succeeded");

      // SEC-01: Session token is delivered EXCLUSIVELY via HttpOnly cookie (never exposed in JSON response)
      const response = NextResponse.json({
        success: true,
        message: "Two-Factor Authentication successful. Authorized as SUPER_ADMIN.",
      });

      response.cookies.set("admin_session", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: sessionExpirySeconds,
      });

      return response;
    }

    // Failed Attempt Handling via Persistent Rate Limiter (Both IP and Target Administrator identity)
    const failureResult = await recordLoginFailure(req, "founder_super_admin");
    await recordAuditLog("SUPER_ADMIN", ip, userAgent, "LOGIN_FAILED", `Failed attempt (remaining: ${failureResult.remainingAttempts})`);

    if (!failureResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: "Maximum login attempts exceeded. Temporary lockout initiated for 15 minutes.",
          retryAfter: failureResult.retryAfterSeconds,
        },
        { status: 429, headers: { "Retry-After": String(failureResult.retryAfterSeconds) } }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: `Invalid security factor credentials. (${failureResult.remainingAttempts} attempts remaining)`,
      },
      { status: 401 }
    );

  } catch (error: any) {
    console.error("[Login Error]:", error);
    return NextResponse.json(
      { success: false, message: "Internal server authentication error." },
      { status: 500 }
    );
  }
}
