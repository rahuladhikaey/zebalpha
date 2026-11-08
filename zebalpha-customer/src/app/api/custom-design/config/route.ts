import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import {
  DEFAULT_APPAREL_BASES,
  ApparelBaseConfig,
  PresetDesign,
} from "@/lib/customDesignPresets";

export const dynamic = "force-dynamic";

async function getStoredSetting(key: string): Promise<any> {
  try {
    // 1. Primary: store_settings table
    const { data: storeRow, error: storeErr } = await supabaseServer
      .from("store_settings")
      .select("value")
      .eq("key", key)
      .maybeSingle();

    if (!storeErr && storeRow && storeRow.value !== undefined && storeRow.value !== null) {
      return storeRow.value;
    }
  } catch (_) {}

  try {
    // 2. Fallback: marketplace_settings table
    const { data: mktRow, error: mktErr } = await supabaseServer
      .from("marketplace_settings")
      .select("setting_value")
      .eq("setting_key", key)
      .maybeSingle();

    if (!mktErr && mktRow && mktRow.setting_value !== undefined && mktRow.setting_value !== null) {
      return mktRow.setting_value;
    }
  } catch (_) {}

  return null;
}

export async function GET() {
  try {
    const [rawPresets, rawBases] = await Promise.all([
      getStoredSetting("custom_design_presets"),
      getStoredSetting("custom_design_apparel_bases"),
    ]);

    let presets: PresetDesign[] = [];
    let apparelBases: ApparelBaseConfig[] = DEFAULT_APPAREL_BASES;

    if (rawPresets !== null && rawPresets !== undefined) {
      try {
        const parsed = typeof rawPresets === "string" ? JSON.parse(rawPresets) : rawPresets;
        if (Array.isArray(parsed)) {
          presets = parsed.filter((p: any) => p.isActive !== false);
        }
      } catch (_) {}
    }

    if (rawBases !== null && rawBases !== undefined) {
      try {
        const parsed = typeof rawBases === "string" ? JSON.parse(rawBases) : rawBases;
        if (Array.isArray(parsed) && parsed.length > 0) {
          apparelBases = parsed.filter((b: any) => b.isActive !== false);
        }
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      data: {
        presets,
        apparelBases,
      },
    });
  } catch (err: any) {
    console.warn("Notice fetching custom design config (using robust fallback):", err?.message);
    return NextResponse.json({
      success: true,
      data: {
        presets: [],
        apparelBases: DEFAULT_APPAREL_BASES,
      },
    });
  }
}
