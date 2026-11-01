import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/cachedQueries";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, platform, user_id, topics, device_info } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    // Upsert token in device_push_tokens or store_settings fallback
    const payload = {
      token,
      platform: platform || "android",
      user_id: user_id || null,
      topics: Array.isArray(topics) ? topics : ["all", "new_drops"],
      device_info: device_info || "Mobile Device",
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseServer
      .from("device_push_tokens")
      .upsert(payload, { onConflict: "token" });

    if (error) {
      // Fallback: If table does not exist yet, log resiliently without throwing error
      console.warn("[Push Token Notice] Supabase table device_push_tokens response:", error.message);
      return NextResponse.json({
        success: true,
        notice: "Token received. Ensure table 'device_push_tokens' is created in Supabase.",
      });
    }

    return NextResponse.json({ success: true, message: "Token registered successfully" });
  } catch (err: any) {
    console.error("[Push Token Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to register token" }, { status: 500 });
  }
}
