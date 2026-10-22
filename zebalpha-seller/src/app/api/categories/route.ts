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
            main_category: cat.main_category || "GENERAL",
            image_url: cat.image_url || null,
            description: cat.description || null,
            sort_order: typeof cat.sort_order === "number" ? cat.sort_order : 99,
            is_active: cat.is_active !== false,
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
  try {
    const body = await request.json();
    const { name, main_category, image_url, description, sort_order, is_active } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ success: false, error: "Category / Collection name is required" }, { status: 400 });
    }

    const cleanName = name.trim();
    const baseSlug = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const uniqueSlug = `${baseSlug || "collection"}-${Date.now().toString(36)}`;

    const payload = {
      name: cleanName,
      slug: uniqueSlug,
      main_category: (main_category || "ALL").trim().toUpperCase(),
      image_url: image_url || null,
      description: description || null,
      sort_order: typeof sort_order === "number" ? sort_order : 0,
      is_active: is_active !== false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseServer
      .from("categories")
      .insert([payload])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, category: data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to create category" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name, main_category, image_url, description, sort_order, is_active } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "Category ID is required" }, { status: 400 });
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (name) updatePayload.name = name.trim();
    if (main_category) updatePayload.main_category = main_category.trim().toUpperCase();
    if (image_url !== undefined) updatePayload.image_url = image_url;
    if (description !== undefined) updatePayload.description = description;
    if (sort_order !== undefined) updatePayload.sort_order = sort_order;
    if (is_active !== undefined) updatePayload.is_active = is_active;

    const { data, error } = await supabaseServer
      .from("categories")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, category: data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to update category" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "Category ID is required" }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from("categories")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Category deleted successfully" });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "Failed to delete category" }, { status: 500 });
  }
}
