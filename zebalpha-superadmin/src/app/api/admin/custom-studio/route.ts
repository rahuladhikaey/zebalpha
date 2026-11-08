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

export const DEFAULT_PRESET_DESIGNS: PresetDesignConfig[] = [
  {
    id: "genz-01",
    title: "NEO TOKYO 2099",
    category: "genz",
    imageUrl: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80",
    fileSizeKb: 18.5,
    recommendedGarmentColor: "Jet Black",
    placement: "front_chest",
    description: "Cyberpunk dystopian glowing aesthetic typography with glitch accents.",
    tags: ["Cyberpunk", "Neon", "Glitch", "Streetwear"],
    isActive: true,
  },
  {
    id: "bengali-01",
    title: "কলকাতা মেলোডি (Kolkata Melody)",
    category: "bengali",
    imageUrl: "https://images.unsplash.com/photo-1582560475093-ba66accbc424?w=800&auto=format&fit=crop&q=80",
    fileSizeKb: 19.2,
    recommendedGarmentColor: "Vintage Beige",
    placement: "front_chest",
    description: "Traditional Bengali calligraphy blended with vintage yellow taxi and street art.",
    tags: ["Bangla", "Kolkata", "Art", "Culture"],
    isActive: true,
  },
  {
    id: "anime-01",
    title: "DEMON SLAYER BLADE",
    category: "anime",
    imageUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80",
    fileSizeKb: 17.8,
    recommendedGarmentColor: "Jet Black",
    placement: "front_chest",
    description: "High-contrast Japanese manga flame warrior katana illustration.",
    tags: ["Anime", "Manga", "Japanese", "Warrior"],
    isActive: true,
  },
  {
    id: "streetwear-01",
    title: "OVERTHINKING CLUB",
    category: "streetwear",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
    fileSizeKb: 16.4,
    recommendedGarmentColor: "Off-White",
    placement: "front_chest",
    description: "Modern raw acid-wash typography design with distressed grunge texturing.",
    tags: ["Streetwear", "Minimal", "Acid Wash"],
    isActive: true,
  },
  {
    id: "bengali-02",
    title: "একলা চলো রে (Ekla Cholo Re)",
    category: "bengali",
    imageUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80",
    fileSizeKb: 18.9,
    recommendedGarmentColor: "Forest Green",
    placement: "front_chest",
    description: "Iconic Rabindranath Tagore inspired lyrical calligraphy in gold & white.",
    tags: ["Bangla", "Poetry", "Tagore", "Calligraphy"],
    isActive: true,
  },
  {
    id: "anime-02",
    title: "CYBER MECHA EVANGELION",
    category: "anime",
    imageUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80",
    fileSizeKb: 19.5,
    recommendedGarmentColor: "Royal Navy",
    placement: "full_front",
    description: "Futuristic mecha robot portrait with purple & green neon vector accents.",
    tags: ["Mecha", "Anime", "Sci-Fi", "Vector"],
    isActive: true,
  },
];

// GET /api/admin/custom-studio
export async function GET(req: Request) {
  try {
    await requireSuperAdmin(req);

    // Fetch apparel bases and design presets from marketplace_settings
    const { data: settings } = await supabaseServer
      .from("marketplace_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["custom_design_presets", "custom_design_apparel_bases"]);

    let presets: PresetDesignConfig[] = DEFAULT_PRESET_DESIGNS;
    let apparelBases: ApparelBaseConfig[] = DEFAULT_APPAREL_BASES;

    if (settings && Array.isArray(settings)) {
      for (const row of settings) {
        if (row.setting_key === "custom_design_presets" && row.setting_value) {
          try {
            const parsed = typeof row.setting_value === "string" ? JSON.parse(row.setting_value) : row.setting_value;
            if (Array.isArray(parsed) && parsed.length > 0) presets = parsed;
          } catch (_) {}
        }
        if (row.setting_key === "custom_design_apparel_bases" && row.setting_value) {
          try {
            const parsed = typeof row.setting_value === "string" ? JSON.parse(row.setting_value) : row.setting_value;
            if (Array.isArray(parsed) && parsed.length > 0) apparelBases = parsed;
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

    const now = new Date().toISOString();
    const upserts: any[] = [];

    if (action === "update_presets" || presets) {
      if (!Array.isArray(presets)) {
        return NextResponse.json({ success: false, message: "Presets must be an array." }, { status: 400 });
      }
      upserts.push({
        setting_key: "custom_design_presets",
        setting_value: JSON.stringify(presets),
        updated_at: now,
      });
    }

    if (action === "update_bases" || apparelBases) {
      if (!Array.isArray(apparelBases)) {
        return NextResponse.json({ success: false, message: "Apparel bases must be an array." }, { status: 400 });
      }
      upserts.push({
        setting_key: "custom_design_apparel_bases",
        setting_value: JSON.stringify(apparelBases),
        updated_at: now,
      });
    }

    if (upserts.length === 0) {
      return NextResponse.json({ success: false, message: "No changes provided to update." }, { status: 400 });
    }

    for (const item of upserts) {
      const { error } = await supabaseServer
        .from("marketplace_settings")
        .upsert(item, { onConflict: "setting_key" });

      if (error) {
        console.error(`Error saving ${item.setting_key}:`, error);
        throw new Error(error.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: "Custom Studio configurations successfully updated in production vault.",
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
