import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, message, targetGroup = "all" } = body;

    if (!title || !message) {
      return NextResponse.json(
        { success: false, message: "Title and message are required." },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    const newBroadcastItem = {
      id: `bc-${Date.now()}`,
      title: title.trim(),
      message: message.trim(),
      target_group: targetGroup,
      is_active: true,
      created_at: nowIso,
    };

    // 1. Authoritative write to store_settings with service role
    const { data: existing } = await supabaseServer
      .from("store_settings")
      .select("value")
      .eq("key", "broadcast_messages")
      .maybeSingle();

    const messages = Array.isArray(existing?.value) ? existing.value : [];
    const updated = [newBroadcastItem, ...messages].slice(0, 50);

    const { error: upsertError } = await supabaseServer
      .from("store_settings")
      .upsert(
        {
          key: "broadcast_messages",
          value: updated,
          updated_at: nowIso,
        },
        { onConflict: "key" }
      );

    if (upsertError) {
      console.error("[Broadcast API Error]: store_settings upsert failed:", upsertError);
      return NextResponse.json(
        { success: false, message: "Database write error: " + upsertError.message },
        { status: 500 }
      );
    }

    // 2. Also try writing to notifications table
    try {
      await supabaseServer.from("notifications").insert({
        title: title.trim(),
        message: message.trim(),
        target_group: targetGroup,
        is_active: true,
        created_at: nowIso,
      });
    } catch (_) {}

    return NextResponse.json({
      success: true,
      broadcast: newBroadcastItem,
      message: "Broadcast notification dispatched successfully",
    });
  } catch (err: any) {
    console.error("[Broadcast API Exception]:", err);
    return NextResponse.json(
      { success: false, message: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
