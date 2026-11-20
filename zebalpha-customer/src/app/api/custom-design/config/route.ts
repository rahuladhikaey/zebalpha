import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { getCachedOrFetch } from "@/lib/cacheHelper";
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

function deduplicatePresets(rawList: any[]): PresetDesign[] {
  const seenIds = new Set<string>();
  const seenUrls = new Set<string>();
  const clean: PresetDesign[] = [];

  for (const item of rawList) {
    if (!item || item.isActive === false) continue;
    const url = typeof item.imageUrl === "string" ? item.imageUrl.trim() : "";
    if (!url) continue;
    const id = String(item.id || "").trim();
    const urlKey = url.toLowerCase();
    if ((id && seenIds.has(id)) || seenUrls.has(urlKey)) continue;
    if (id) seenIds.add(id);
    seenUrls.add(urlKey);
    clean.push({ ...item, imageUrl: url });
  }

  return clean;
}

export async function GET() {
  try {
    const data = await getCachedOrFetch(
      "custom:studio:config:v1",
      async () => {
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
              presets = deduplicatePresets(parsed);
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

        return { presets, apparelBases };
      },
      300 // 5 min Redis TTL (30s L1 RAM), purged immediately by Superadmin webhook
    );

    return NextResponse.json(
      {
        success: true,
        data,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
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
