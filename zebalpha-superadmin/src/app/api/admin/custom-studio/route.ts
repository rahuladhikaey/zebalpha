import { NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";
import { requireSuperAdmin, authErrorResponse } from "@/lib/authGuard";

export const dynamic = "force-dynamic";

export interface ApparelBaseConfig {
  id: string;
  name: string;
  gsm: string;
  basePrice: number;
  badge?: string;
  description?: string;
  availableSizes?: string[];
  isActive: boolean;
}

export interface PresetDesignConfig {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
  fileSizeKb?: number;
  recommendedGarmentColor: string;
  placement: string;
  description: string;
  tags?: string[];
  isActive: boolean;
}

export const DEFAULT_APPAREL_BASES: ApparelBaseConfig[] = [
  {
    id: "oversized_tee",
    name: "Oversized Heavy Tee",
    gsm: "240 GSM",
    basePrice: 799,
    badge: "POPULAR",
    description: "100% Combed Heavy Cotton with dense 240 GSM structured drop-shoulder drape.",
    availableSizes: ["S", "M", "L", "XL", "XXL"],
    isActive: true,
  },
  {
    id: "hoodie",
    name: "Streetwear Fleece Hoodie",
    gsm: "380 GSM",
    basePrice: 1499,
    badge: "WINTER",
    description: "380 GSM ultra-heavy brushed cotton fleece with double-lined thermal hood.",
    availableSizes: ["M", "L", "XL", "XXL"],
    isActive: true,
  },
  {
    id: "standard_tee",
    name: "Classic Combed Cotton Tee",
    gsm: "190 GSM",
    basePrice: 499,
    badge: "DAILY",
    description: "190 GSM breathable ring-spun combed cotton for lightweight daily comfort.",
    availableSizes: ["XS", "S", "M", "L", "XL", "XXL"],
    isActive: true,
  },
  {
    id: "tote_bag",
    name: "Heavy Canvas Tote Bag",
    gsm: "340 GSM",
    basePrice: 399,
    badge: "ECO",
    description: "340 GSM premium organic raw canvas with cross-stitched durable shoulder straps.",
    availableSizes: ["Standard"],
    isActive: true,
  },
];

export const DEFAULT_PRESET_DESIGNS: PresetDesignConfig[] = [];

// Helper to fetch setting from store_settings or marketplace_settings
async function getStoredSetting(key: string): Promise<any> {
  try {
    // 1. Primary check: store_settings table (exists in current production database)
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
    // 2. Fallback check: marketplace_settings table
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

// Helper to reliably save setting to store_settings or marketplace_settings
async function persistSetting(key: string, value: any): Promise<boolean> {
  const now = new Date().toISOString();

  // 1. Try store_settings table
  try {
    const { data: existing } = await supabaseServer
      .from("store_settings")
      .select("id")
      .eq("key", key)
      .maybeSingle();

    if (existing?.id) {
      const { error: updErr } = await supabaseServer
        .from("store_settings")
        .update({ value, updated_at: now })
        .eq("id", existing.id);
      if (!updErr) return true;
    } else {
      const { error: insErr } = await supabaseServer
        .from("store_settings")
        .insert([{ key, value, updated_at: now }]);
      if (!insErr) return true;
    }
  } catch (err) {
    console.warn("[StoreSettings Notice]:", err);
  }

  // 2. Fallback try marketplace_settings table
  try {
    await supabaseServer
      .from("marketplace_settings")
      .upsert(
        {
          setting_key: key,
          setting_value: typeof value === "string" ? value : JSON.stringify(value),
          updated_at: now,
        },
        { onConflict: "setting_key" }
      );
    return true;
  } catch (_) {}

  return false;
}

// GET /api/admin/custom-studio
export async function GET(req: Request) {
  try {
    await requireSuperAdmin(req);

    const [rawPresets, rawBases] = await Promise.all([
      getStoredSetting("custom_design_presets"),
      getStoredSetting("custom_design_apparel_bases"),
    ]);

    let presets: PresetDesignConfig[] = [];
    let apparelBases: ApparelBaseConfig[] = DEFAULT_APPAREL_BASES;

    if (rawPresets !== null && rawPresets !== undefined) {
      try {
        const parsed = typeof rawPresets === "string" ? JSON.parse(rawPresets) : rawPresets;
        if (Array.isArray(parsed)) presets = parsed;
      } catch (_) {}
    }

    if (rawBases !== null && rawBases !== undefined) {
      try {
        const parsed = typeof rawBases === "string" ? JSON.parse(rawBases) : rawBases;
        if (Array.isArray(parsed) && parsed.length > 0) apparelBases = parsed;
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      data: {
        presets,
        apparelBases,
      },
    });
  } catch (error: any) {
    if (error.name === "AuthError") return authErrorResponse(error);
    console.error("[Custom Studio Admin GET Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load custom studio config" },
      { status: 500 }
    );
  }
}

// POST /api/admin/custom-studio
export async function POST(req: Request) {
  try {
    await requireSuperAdmin(req);

    const body = await req.json();
    const { action, presets, apparelBases } = body;

    if (action === "update_presets" || presets !== undefined) {
      if (!Array.isArray(presets)) {
        return NextResponse.json({ success: false, message: "Presets must be an array." }, { status: 400 });
      }
      await persistSetting("custom_design_presets", presets);
    }

    if (action === "update_bases" || apparelBases !== undefined) {
      if (!Array.isArray(apparelBases)) {
        return NextResponse.json({ success: false, message: "Apparel bases must be an array." }, { status: 400 });
      }
      await persistSetting("custom_design_apparel_bases", apparelBases);
    }

    return NextResponse.json({
      success: true,
      message: "Custom Studio configurations successfully updated in production database.",
    });
  } catch (error: any) {
    if (error.name === "AuthError") return authErrorResponse(error);
    console.error("[Custom Studio Admin POST Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to save custom studio config" },
      { status: 500 }
    );
  }
}
