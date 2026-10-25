import { NextResponse } from "next/server";
import { supabaseServer, createSupabaseServerClient } from "@/shared/utils/supabaseServer";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Fetch Admin Curated Collections (primary source)
    const { data: curatedData } = await supabaseServer
      .from("curated_collections")
      .select("id, title, slug, short_description, link_url, image_url, display_order, is_active, created_at")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    // 2. Fetch standard categories
    const { data: catData } = await supabaseServer
      .from("categories")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    // 3. Fallback check in store_settings if curated_collections table is empty
    let settingsData: any[] = [];
    if (!curatedData || curatedData.length === 0) {
      const { data: ss } = await supabaseServer
        .from("store_settings")
        .select("value")
        .eq("key", "curated_collections")
        .maybeSingle();
      if (ss?.value && Array.isArray(ss.value)) {
        settingsData = ss.value;
      }
    }

    const merged: any[] = [];
    const seen = new Set<string>();

    if (curatedData && curatedData.length > 0) {
      for (const c of curatedData) {
        const title = c.title || c.name;
        if (title && !seen.has(title.toLowerCase().trim())) {
          seen.add(title.toLowerCase().trim());
          merged.push({
            id: c.id,
            name: title,
            title: title,
            slug: c.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            main_category: "CURATED",
            image_url: c.image_url || null,
            description: c.short_description || null,
            sort_order: typeof c.display_order === "number" ? c.display_order : 0,
            is_active: c.is_active !== false,
            created_at: c.created_at,
          });
        }
      }
    }

    if (settingsData && settingsData.length > 0) {
      for (const c of settingsData) {
        const title = c.title || c.name;
        if (title && !seen.has(title.toLowerCase().trim())) {
          seen.add(title.toLowerCase().trim());
          merged.push({
            id: c.id || `curated-${merged.length + 1}`,
            name: title,
            title: title,
            slug: c.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            main_category: "CURATED",
            image_url: c.image_url || null,
            description: c.short_description || null,
            sort_order: typeof c.display_order === "number" ? c.display_order : 0,
            is_active: c.is_active !== false,
            created_at: c.created_at || new Date().toISOString(),
          });
        }
      }
    }

    if (catData && catData.length > 0) {
      for (const cat of catData) {
        const title = cat.name || cat.title;
        if (title && !seen.has(title.toLowerCase().trim())) {
          seen.add(title.toLowerCase().trim());
          merged.push({
            id: cat.id,
            name: title,
            title: title,
            slug: cat.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
            parent_id: cat.parent_id || null,
            icon_key: cat.icon_key || null,
            icon_url: cat.icon_url || null,
            main_category: cat.parent_id ? "SUBCATEGORY" : (cat.main_category || "MAIN"),
            image_url: cat.image_url || null,
            description: cat.description || null,
            sort_order: typeof cat.display_order === "number" ? cat.display_order : (typeof cat.sort_order === "number" ? cat.sort_order : 99),
            display_order: typeof cat.display_order === "number" ? cat.display_order : 99,
            is_active: cat.is_active !== false,
            show_in_navigation: cat.show_in_navigation !== false,
            created_at: cat.created_at,
          });
        }
      }
    }

    return NextResponse.json({ success: true, categories: merged });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to fetch categories" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return NextResponse.json(
    {
      success: false,
      error: "Sellers cannot create global categories directly. Please use /api/seller/category-requests to propose new subcategories for Super Admin review."
    },
    { status: 403 }
  );
}

export async function PUT(request: Request) {
  return NextResponse.json(
    {
      success: false,
      error: "Sellers cannot modify global marketplace categories directly. Only Super Admin can edit categories."
    },
    { status: 403 }
  );
}

export async function DELETE(request: Request) {
  return NextResponse.json(
    {
      success: false,
      error: "Sellers cannot delete global marketplace categories directly. Only Super Admin can archive categories."
    },
    { status: 403 }
  );
}
