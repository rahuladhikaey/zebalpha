import { NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";
import { extractAdminSessionToken } from "@/lib/authGuard";
import { revokeSessionToken } from "@/lib/sessionRevocation";
import { extractClientIp } from "@/lib/rateLimit";

export async function POST(req: Request) {
  const ip = extractClientIp(req);
  const userAgent = req.headers.get("user-agent") || "unknown";

  // 1. Extract and invalidate active session token in server revocation registry
  const token = extractAdminSessionToken(req);
  if (token) {
    try {
      await revokeSessionToken(token);
    } catch (err) {
      console.warn("[Logout Revocation Warning]:", err);
    }
  }

  // 2. Record audit log
  try {
    await supabaseServer.from("admin_audit_logs").insert({
      username: "SUPER_ADMIN",
      ip_address: ip,
      user_agent: userAgent,
      action: "LOGOUT",
      details: "Session logged out & token revoked in server registry",
    });
  } catch (e) {
    console.error("[Logout Audit Error]:", e);
  }

  const response = NextResponse.json({ success: true, message: "Logged out successfully" });

  // 3. Explicitly expire and delete the session cookie
  response.cookies.set("admin_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  });

  return response;
}
