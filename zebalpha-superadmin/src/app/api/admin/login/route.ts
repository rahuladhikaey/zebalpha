import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { verifyPassword } from "@/lib/crypto";
import { supabaseServer } from "@shared/utils/supabaseServer";

// In-Memory Rate Limiting & Lockout Store for Admin Authentication
interface FailedAttemptInfo {
  count: number;
  firstAttempt: number;
  lockedUntil: number | null;
}

const loginAttempts = new Map<string, FailedAttemptInfo>();
const MAX_FAILED_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes window
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes lockout

function cleanExpiredAttempts() {
  const now = Date.now();
  for (const [key, info] of loginAttempts.entries()) {
    if (info.lockedUntil && info.lockedUntil < now) {
      loginAttempts.delete(key);
    } else if (!info.lockedUntil && now - info.firstAttempt > ATTEMPT_WINDOW_MS) {
      loginAttempts.delete(key);
    }
  }
}

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
  cleanExpiredAttempts();

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
             req.headers.get("x-real-ip") || 
             "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "unknown";
  const rateLimitKey = `admin_login_${ip}`;

  // Check Lockout
  const attemptInfo = loginAttempts.get(rateLimitKey);
  const now = Date.now();
  if (attemptInfo && attemptInfo.lockedUntil && attemptInfo.lockedUntil > now) {
    const remainingSecs = Math.ceil((attemptInfo.lockedUntil - now) / 1000);
    recordAuditLog("SUPER_ADMIN", ip, userAgent, "LOGIN_LOCKED_OUT", `Attempt while locked out (${remainingSecs}s remaining)`);
    return NextResponse.json(
      {
        success: false,
        message: `Too many failed attempts. Temporary lockout active. Please wait ${Math.ceil(remainingSecs / 60)} minutes.`,
        retryAfter: remainingSecs
      },
      { 
        status: 429, 
        headers: { "Retry-After": String(remainingSecs) } 
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
      loginAttempts.delete(rateLimitKey);

      const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);
      const sessionExpirySeconds = 2 * 60 * 60; // 2 hours strict absolute expiry

      // Sign JWT with role, username, issuedAt, expiresAt and idle timeout reference
      const token = await new SignJWT({
        role: "SUPER_ADMIN",
        user: "SUPER_ADMIN",
        lastActive: Date.now()
      })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("2h")
        .sign(SECRET_KEY);

      await recordAuditLog("SUPER_ADMIN", ip, userAgent, "LOGIN_SUCCESS", "Two-Factor Authentication Succeeded");

      const response = NextResponse.json({
        success: true,
        message: "Two-Factor Authentication successful. Authorized as SUPER_ADMIN."
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

    // Failed Attempt Handling
    const currentInfo = loginAttempts.get(rateLimitKey) || {
      count: 0,
      firstAttempt: now,
      lockedUntil: null
    };

    currentInfo.count += 1;
    if (currentInfo.count >= MAX_FAILED_ATTEMPTS) {
      currentInfo.lockedUntil = now + LOCKOUT_DURATION_MS;
      loginAttempts.set(rateLimitKey, currentInfo);
      await recordAuditLog("SUPER_ADMIN", ip, userAgent, "LOGIN_LOCKED_OUT", `Account locked after ${currentInfo.count} failed attempts`);
      return NextResponse.json(
        {
          success: false,
          message: "Maximum login attempts exceeded. Temporary lockout initiated for 15 minutes."
        },
        { status: 429 }
      );
    } else {
      loginAttempts.set(rateLimitKey, currentInfo);
      await recordAuditLog("SUPER_ADMIN", ip, userAgent, "LOGIN_FAILED", `Failed attempt ${currentInfo.count}/${MAX_FAILED_ATTEMPTS}`);
      return NextResponse.json(
        {
          success: false,
          message: `Invalid security factor credentials. (${MAX_FAILED_ATTEMPTS - currentInfo.count} attempts remaining)`
        },
        { status: 401 }
      );
    }

  } catch (error: any) {
    console.error("[Login Error]:", error);
    return NextResponse.json(
      { success: false, message: "Internal server authentication error." },
      { status: 500 }
    );
  }
}
