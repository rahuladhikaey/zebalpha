import { NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { sessionId, userId, platform = "website", deviceType = "mobile", deviceModel, appVersion, action = "ping" } = body;

    if (!sessionId || typeof sessionId !== "string") {
      return NextResponse.json({ success: false, message: "Valid sessionId is required" }, { status: 400 });
    }

    const isEnding = action === "end";
    const now = new Date().toISOString();

    const sessionPayload: Record<string, any> = {
      session_id: sessionId,
      platform: platform === "android" ? "android" : "website",
      device_type: deviceType,
      is_active: !isEnding,
      last_heartbeat: now,
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
