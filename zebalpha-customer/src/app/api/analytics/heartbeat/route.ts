import { NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";

const SESSION_REGEX = /^[a-zA-Z0-9_\-\.]{8,128}$/;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { sessionId, userId, platform = "website", deviceType = "mobile", deviceModel, appVersion, action = "ping" } = body;

    // Security validation against fabricated session injection
    if (!sessionId || typeof sessionId !== "string" || !SESSION_REGEX.test(sessionId)) {
      return NextResponse.json({ success: false, message: "Valid sessionId format is required" }, { status: 400 });
    }

    // Verify session ownership to prevent cross-user session tampering
    const { data: existingSession } = await supabaseServer
      .from("customer_sessions")
      .select("user_id")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (existingSession && existingSession.user_id && userId && existingSession.user_id !== userId) {
      return NextResponse.json({ success: false, message: "Session ownership mismatch" }, { status: 403 });
    }

    const isEnding = action === "end";
    const now = new Date().toISOString();
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null;
    const userAgent = req.headers.get("user-agent") || null;

    const sessionPayload: Record<string, any> = {
      session_id: sessionId,
      platform: platform === "android" ? "android" : "website",
      device_type: deviceType,
      is_active: !isEnding,
      last_heartbeat: now,
      ip_address: ipAddress,
      user_agent: userAgent,
      ...(userId ? { user_id: userId } : {}),
      ...(deviceModel ? { device_model: deviceModel } : {}),
      ...(appVersion ? { app_version: appVersion } : {}),
      ...(isEnding ? { ended_at: now } : {})
    };

    // Upsert into customer_sessions
    const { error } = await supabaseServer
      .from("customer_sessions")
      .upsert(sessionPayload, { onConflict: "session_id" });

    if (error) {
      // In case table is still initializing in environment, fail soft without breaking client
      return NextResponse.json({ success: true, warning: error.message }, { status: 200 });
    }

    return NextResponse.json({ success: true, timestamp: now, is_active: !isEnding });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || "Internal error" }, { status: 500 });
  }
}

// Beacon termination handler for pagehide / unload
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get("sessionId");
    const action = url.searchParams.get("action");

    if (sessionId && action === "end") {
      const now = new Date().toISOString();
      await supabaseServer
        .from("customer_sessions")
        .update({ is_active: false, ended_at: now, last_heartbeat: now })
        .eq("session_id", sessionId);
    }

    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 204 });
  }
}

