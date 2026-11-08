import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data: setting } = await supabaseServer
      .from("store_settings")
      .select("value")
      .eq("key", "broadcast_messages")
      .maybeSingle();

    const messages = Array.isArray(setting?.value) ? setting.value : [];
    const latest = messages.length > 0 ? messages[0] : null;

    return NextResponse.json(
      {
        success: true,
        latest,
        total: messages.length,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch latest notification" },
      { status: 500 }
    );
  }
}

