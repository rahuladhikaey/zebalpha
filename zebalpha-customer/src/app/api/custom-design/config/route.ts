import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import {
  DEFAULT_APPAREL_BASES,
  ADMIN_PRESET_DESIGNS,
  ApparelBaseConfig,
  PresetDesign,
} from "@/lib/customDesignPresets";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { data: settings, error } = await supabaseServer
      .from("marketplace_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["custom_design_presets", "custom_design_apparel_bases"]);

    let presets: PresetDesign[] = ADMIN_PRESET_DESIGNS;
    let apparelBases: ApparelBaseConfig[] = DEFAULT_APPAREL_BASES;

    if (!error && settings && Array.isArray(settings)) {
      for (const row of settings) {
        if (row.setting_key === "custom_design_presets" && row.setting_value) {
          try {
            const parsed = typeof row.setting_value === "string" ? JSON.parse(row.setting_value) : row.setting_value;
            if (Array.isArray(parsed) && parsed.length > 0) {
              presets = parsed.filter((p: any) => p.isActive !== false);
            }
          } catch (_) {}
        }
        if (row.setting_key === "custom_design_apparel_bases" && row.setting_value) {
          try {
            const parsed = typeof row.setting_value === "string" ? JSON.parse(row.setting_value) : row.setting_value;
            if (Array.isArray(parsed) && parsed.length > 0) {
              apparelBases = parsed.filter((b: any) => b.isActive !== false);
            }
          } catch (_) {}
        }
      }
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
        presets: ADMIN_PRESET_DESIGNS,
        apparelBases: DEFAULT_APPAREL_BASES,
      },
    });
  }
}
