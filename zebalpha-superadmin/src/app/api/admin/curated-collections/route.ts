import { NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";

export const dynamic = "force-dynamic";

// GET /api/admin/curated-collections
export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from("curated_collections")
      .select("id, title, slug, short_description, link_url, image_url, display_order, is_active, created_at, updated_at")
      .order("display_order", { ascending: true });

    if (error) {
      console.warn("Table curated_collections fetch note:", error.message);
      // Fallback check in store_settings if table migration is pending
      const { data: fallbackSetting } = await supabaseServer
        .from("store_settings")
        .select("value")
        .eq("key", "curated_collections")
        .maybeSingle();

      if (fallbackSetting?.value && Array.isArray(fallbackSetting.value)) {
        return NextResponse.json({ success: true, data: fallbackSetting.value });
      }
      return NextResponse.json({ success: true, data: [] });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error("[Curated Collections GET Error]:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}

// POST /api/admin/curated-collections (Create)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, image_url, link_url, short_description, display_order = 0, is_active = true } = body;

    if (!title || !title.trim() || !image_url || !image_url.trim()) {
      return NextResponse.json(
        { success: false, message: "Title and Image URL are required." },
        { status: 400 }
      );
    }

    const slug =
      body.slug ||
      title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");

    const newRecord = {
      title: title.trim(),
      slug: slug || "collection",
      short_description: short_description ? short_description.trim() : null,
      link_url: link_url ? link_url.trim() : null,
      image_url: image_url.trim(),
      display_order: Number(display_order) || 0,
      is_active: Boolean(is_active),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseServer
      .from("curated_collections")
      .insert([newRecord])
      .select("id, title, slug, short_description, link_url, image_url, display_order, is_active, created_at, updated_at");

    if (error) {
      console.warn("Notice inserting to curated_collections table:", error.message);
      // Fallback: sync into store_settings key 'curated_collections'
      const { data: existingSettings } = await supabaseServer
        .from("store_settings")
        .select("value")
        .eq("key", "curated_collections")
        .maybeSingle();

      const existingList = Array.isArray(existingSettings?.value) ? existingSettings.value : [];
      const itemWithId = { id: `coll-${Date.now()}`, ...newRecord };
      const updatedList = [...existingList, itemWithId].sort((a, b) => a.display_order - b.display_order);

      await supabaseServer
        .from("store_settings")
        .upsert(
          {
            key: "curated_collections",
            value: updatedList,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );

      return NextResponse.json({ success: true, data: itemWithId });
    }

    return NextResponse.json({ success: true, data: data?.[0] });
  } catch (error: any) {
    console.error("[Curated Collections POST Error]:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}

// PUT /api/admin/curated-collections (Update / Reorder)
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, updates } = body;

    if (!id || !updates) {
      return NextResponse.json({ success: false, message: "Missing id or updates payload." }, { status: 400 });
    }

    const sanitizedUpdates = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseServer
      .from("curated_collections")
      .update(sanitizedUpdates)
      .eq("id", id)
      .select("id, title, slug, short_description, link_url, image_url, display_order, is_active, created_at, updated_at");

    if (error) {
      console.warn("Notice updating curated_collections table:", error.message);
      // Fallback to store_settings
      const { data: existingSettings } = await supabaseServer
        .from("store_settings")
        .select("value")
        .eq("key", "curated_collections")
        .maybeSingle();

      const existingList = Array.isArray(existingSettings?.value) ? existingSettings.value : [];
      const updatedList = existingList.map((item: any) =>
        String(item.id) === String(id) ? { ...item, ...sanitizedUpdates } : item
      );

      await supabaseServer
        .from("store_settings")
        .upsert(
          {
            key: "curated_collections",
            value: updatedList,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );

      const updatedItem = updatedList.find((item: any) => String(item.id) === String(id));
      return NextResponse.json({ success: true, data: updatedItem });
    }

    return NextResponse.json({ success: true, data: data?.[0] });
  } catch (error: any) {
    console.error("[Curated Collections PUT Error]:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}

// DELETE /api/admin/curated-collections (Delete)
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, message: "Missing curated collection id." }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from("curated_collections")
      .delete()
      .eq("id", id);

    if (error) {
      console.warn("Notice deleting from curated_collections table:", error.message);
      const { data: existingSettings } = await supabaseServer
        .from("store_settings")
        .select("value")
        .eq("key", "curated_collections")
        .maybeSingle();

      const existingList = Array.isArray(existingSettings?.value) ? existingSettings.value : [];
      const filteredList = existingList.filter((item: any) => String(item.id) !== String(id));

      await supabaseServer
        .from("store_settings")
        .upsert(
          {
            key: "curated_collections",
            value: filteredList,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );
    }

    return NextResponse.json({ success: true, message: "Curated collection removed successfully." });
  } catch (error: any) {
    console.error("[Curated Collections DELETE Error]:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
