import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

interface StoredTokenEntry {
  token: string;
  platform: string;
  user_id: string | null;
  topics: string[];
  device_info: string;
  updated_at: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, platform, user_id, topics, device_info } = body;

    if (!token || typeof token !== "string" || token.trim().length < 20) {
      return NextResponse.json({ error: "Missing or invalid token" }, { status: 400 });
    }

    const cleanToken = token.trim();
    const nowIso = new Date().toISOString();

    const payload: StoredTokenEntry = {
      token: cleanToken,
      platform: platform || "android",
      user_id: user_id || null,
      topics: Array.isArray(topics) ? topics : ["all", "new_drops", "orders"],
      device_info: String(device_info || "Mobile Device").slice(0, 220),
      updated_at: nowIso,
    };

    let savedPrimary = false;
    const { error: primaryErr } = await supabaseServer
      .from("device_push_tokens")
      .upsert({ ...payload, is_active: true }, { onConflict: "token" });

    if (!primaryErr) {
      savedPrimary = true;
    } else {
      console.warn("[Push Token Notice] device_push_tokens upsert fallback:", primaryErr.message);
    }

    // Always also persist into store_settings.fcm_device_tokens as resilient zero-migration fallback
    let savedFallback = false;
    try {
      const { data: existingRow } = await supabaseServer
        .from("store_settings")
        .select("value")
        .eq("key", "fcm_device_tokens")
        .maybeSingle();

      const currentList: StoredTokenEntry[] = Array.isArray(existingRow?.value)
        ? (existingRow.value as StoredTokenEntry[])
        : [];

      const filtered = currentList.filter((entry) => entry?.token && entry.token !== cleanToken);
      const nextList = [payload, ...filtered].slice(0, 500);

      const { error: fallbackErr } = await supabaseServer
        .from("store_settings")
        .upsert(
          {
            key: "fcm_device_tokens",
            value: nextList,
            updated_at: nowIso,
          },
          { onConflict: "key" }
        );

      if (!fallbackErr) {
        savedFallback = true;
      }
    } catch (fallbackCatch) {
      console.warn("[Push Token Fallback Notice]:", fallbackCatch);
    }

    return NextResponse.json({
      success: savedPrimary || savedFallback,
      savedPrimary,
      savedFallback,
      message: "Device push token registered successfully",
    });
  } catch (err: any) {
    console.error("[Push Token Error]:", err);
    return NextResponse.json({ error: err.message || "Failed to register token" }, { status: 500 });
  }
}
