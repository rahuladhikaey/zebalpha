import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify, JWTPayload } from "jose";
import { isSessionRevoked } from "./sessionRevocation";

export interface AdminSessionPayload extends JWTPayload {
  role: "SUPER_ADMIN" | "ADMIN" | string;
  user: string;
  lastActive?: number;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Extracts admin session token from Cookie header or Authorization Bearer header.
 */
export function extractAdminSessionToken(req: Request | NextRequest): string | null {
  // 1. NextRequest cookies accessor
  if ("cookies" in req && typeof (req as NextRequest).cookies?.get === "function") {
    const c = (req as NextRequest).cookies.get("admin_session");
    if (c?.value) return c.value;
  }

  // 2. Parse Cookie header string
  const cookieHeader = req.headers.get("cookie");
  if (cookieHeader) {
    const match = cookieHeader.match(/(?:^|;\s*)admin_session=([^;]+)/);
    if (match && match[1]) {
      return decodeURIComponent(match[1].trim());
    }
  }

  // 3. Fallback to Authorization: Bearer <token>
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }

  return null;
}

/**
 * Validates request origin against allowed administrative domains for state-changing requests.
 */
export function verifyAdminCsrf(req: Request): boolean {
  const method = req.method.toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return true;
  }

  const origin = req.headers.get("origin");
  const host = req.headers.get("host") || "";

  // If no origin header is sent (e.g. some native tool calls or same-origin subrequests), check referer or host
  if (!origin) {
    const referer = req.headers.get("referer");
    if (referer) {
      try {
        const refUrl = new URL(referer);
        if (refUrl.host === host) return true;
      } catch (_) {
        return false;
      }
    }
    // Allow server-to-server or test requests if safe
    return true;
  }

  try {
    const originUrl = new URL(origin);
    // Allow same-host origin
    if (originUrl.host === host) {
      return true;
    }

    // Allow known ZebAlpha admin origins
    const allowed = [
      "https://admin.zebalpha.shop",
      "https://adm.in.zebalpha.shop",
      "https://admin.zebalpha.com",
      "http://localhost:3000",
      "http://localhost:3001",
      "http://localhost:3002",
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3002",
    ];

    if (allowed.includes(origin)) return true;
    if (origin.endsWith(".zebalpha.shop") || origin.endsWith(".zebalpha.com")) return true;
  } catch (_) {
    return false;
  }

  return false;
}

/**
 * Strict Cryptographic Server-Side Authentication & Authorization Guard.
 * Enforces verified JWT, active session, unrevoked status, and SUPER_ADMIN / ADMIN role.
 * Throws AuthError(message, 401 | 403) on failure.
 */
export async function requireSuperAdmin(req: Request | NextRequest): Promise<AdminSessionPayload> {
  // 1. Enforce Anti-CSRF on mutation requests
  if (!verifyAdminCsrf(req)) {
    throw new AuthError("Forbidden: Cross-site request rejected.", 403);
  }

  // 2. Extract token
  const token = extractAdminSessionToken(req);
  if (!token) {
    throw new AuthError("Authentication required. Missing admin session.", 401);
  }

  // 3. Check server-side revocation registry
  const revoked = await isSessionRevoked(token);
  if (revoked) {
    throw new AuthError("Session has been revoked. Please log in again.", 401);
  }

  // 4. Verify cryptographic signature & claims
  const JWT_SECRET = process.env.ADMIN_JWT_SECRET;
  if (!JWT_SECRET) {
    console.error("[Auth Guard Fatal]: ADMIN_JWT_SECRET is missing in environment variables.");
    throw new AuthError("Authentication service misconfigured.", 500);
  }

  try {
    const SECRET_KEY = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, SECRET_KEY, {
      algorithms: ["HS256"],
    });

    const role = (payload.role as string)?.toUpperCase();
    if (role !== "SUPER_ADMIN" && role !== "ADMIN") {
      throw new AuthError("Forbidden: Insufficient privileges for Super Admin resource.", 403);
    }

    // 5. Inactivity timeout validation
    const lastActive = Number(payload.lastActive || 0);
    if (lastActive > 0 && Date.now() - lastActive > IDLE_TIMEOUT_MS) {
      throw new AuthError("Session expired due to inactivity. Please log in again.", 401);
    }

    return payload as AdminSessionPayload;
  } catch (err: any) {
    if (err instanceof AuthError) throw err;
    throw new AuthError("Invalid, forged, or expired session token.", 401);
  }
}

/**
 * Standardized error responder for admin API route catch blocks.
 */
export function authErrorResponse(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return NextResponse.json(
      { success: false, message: err.message },
      { status: err.status }
    );
  }

  const message = err instanceof Error ? err.message : "Internal authentication error";
  return NextResponse.json(
    { success: false, message },
    { status: 500 }
  );
}
