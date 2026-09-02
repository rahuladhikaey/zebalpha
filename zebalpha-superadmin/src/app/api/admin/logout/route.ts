import { NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "127.0.0.1";
  const userAgent = req.headers.get("user-agent") || "unknown";

  try {
    await supabaseServer.from("admin_audit_logs").insert({
      username: "SUPER_ADMIN",
      ip_address: ip,
      user_agent: userAgent,
      action: "LOGOUT",
      details: "Session logged out",
    });
  } catch (e) {
    console.error("[Logout Audit Error]:", e);
  }

  const response = NextResponse.json({ success: true, message: "Logged out successfully" });
  
  // Clear cookie completely
  response.cookies.set("admin_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: new Date(0),
  });

  return response;
}
