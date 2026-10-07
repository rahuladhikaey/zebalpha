import { NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";

export const dynamic = "force-dynamic";

// GET /api/admin/editorial-cards
export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from("editorial_cards")
      .select("id, title, category, price, badge, href, image_url, display_order, is_active, created_at, updated_at")
      .order("display_order", { ascending: true });

    if (error) {
      console.warn("Table editorial_cards fetch note:", error.message);
      // Fallback check in marketplace_settings
      const { data: settingData } = await supabaseServer
        .from("marketplace_settings")
        .select("setting_value")
        .eq("setting_key", "editorial_cards")
        .maybeSingle();

      if (settingData?.setting_value) {
        const parsed = JSON.parse(settingData.setting_value);
        if (Array.isArray(parsed)) {
          return NextResponse.json({ success: true, data: parsed });
        }
      }
      return NextResponse.json({ success: true, data: [] });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error("[Editorial Cards GET Error]:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}

// POST /api/admin/editorial-cards (Create)
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, image_url, category, price, badge, href, display_order = 0, is_active = true } = body;

    if (!title || !title.trim() || !image_url || !image_url.trim()) {
      return NextResponse.json(
        { success: false, message: "Title and Image URL are required." },
        { status: 400 }
      );
    }

    const newRecord = {
      title: title.trim().toUpperCase(),
      category: category ? category.trim().toUpperCase() : "ZEBALPHA EDIT",
      price: price !== undefined && price !== "" ? Number(price) : null,
      badge: badge ? badge.trim().toUpperCase() : "EDITORIAL DROP",
      href: href ? href.trim() : "/products",
      image_url: image_url.trim(),
      display_order: Number(display_order) || 0,
      is_active: Boolean(is_active),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseServer
      .from("editorial_cards")
      .insert([newRecord])
      .select("id, title, category, price, badge, href, image_url, display_order, is_active, created_at, updated_at");

    if (error) {
      console.warn("Notice inserting to editorial_cards table:", error.message);
      // Fallback: sync into marketplace_settings key 'editorial_cards'
      const { data: settingData } = await supabaseServer
        .from("marketplace_settings")
        .select("setting_value")
        .eq("setting_key", "editorial_cards")
        .maybeSingle();

      const existingList = settingData?.setting_value ? JSON.parse(settingData.setting_value) : [];
      const itemWithId = { id: `card-${Date.now()}`, ...newRecord };
      const updatedList = [...existingList, itemWithId].sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0));

      await supabaseServer
        .from("marketplace_settings")
        .upsert(
          {
            setting_key: "editorial_cards",
            setting_value: JSON.stringify(updatedList),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "setting_key" }
        );

      return NextResponse.json({ success: true, data: itemWithId });
    }

    return NextResponse.json({ success: true, data: data?.[0] });
  } catch (error: any) {
    console.error("[Editorial Cards POST Error]:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}

// PUT /api/admin/editorial-cards (Update / Reorder)
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
      .from("editorial_cards")
      .update(sanitizedUpdates)
      .eq("id", id)
      .select("id, title, category, price, badge, href, image_url, display_order, is_active, created_at, updated_at");

    if (error) {
      console.warn("Notice updating editorial_cards table:", error.message);
      const { data: settingData } = await supabaseServer
        .from("marketplace_settings")
        .select("setting_value")
        .eq("setting_key", "editorial_cards")
        .maybeSingle();

      const existingList = settingData?.setting_value ? JSON.parse(settingData.setting_value) : [];
      const updatedList = existingList.map((item: any) =>
        String(item.id) === String(id) ? { ...item, ...sanitizedUpdates } : item
      );

      await supabaseServer
        .from("marketplace_settings")
        .upsert(
          {
            setting_key: "editorial_cards",
            setting_value: JSON.stringify(updatedList),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "setting_key" }
        );

      const updatedItem = updatedList.find((item: any) => String(item.id) === String(id));
      return NextResponse.json({ success: true, data: updatedItem });
    }

    return NextResponse.json({ success: true, data: data?.[0] });
  } catch (error: any) {
    console.error("[Editorial Cards PUT Error]:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}

// DELETE /api/admin/editorial-cards (Delete)
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, message: "Missing editorial card id." }, { status: 400 });
    }

    const { error } = await supabaseServer
      .from("editorial_cards")
      .delete()
      .eq("id", id);

    if (error) {
      console.warn("Notice deleting from editorial_cards table:", error.message);
      const { data: settingData } = await supabaseServer
        .from("marketplace_settings")
        .select("setting_value")
        .eq("setting_key", "editorial_cards")
        .maybeSingle();

      const existingList = settingData?.setting_value ? JSON.parse(settingData.setting_value) : [];
      const filteredList = existingList.filter((item: any) => String(item.id) !== String(id));

      await supabaseServer
        .from("marketplace_settings")
        .upsert(
          {
            setting_key: "editorial_cards",
            setting_value: JSON.stringify(filteredList),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "setting_key" }
        );
    }

    return NextResponse.json({ success: true, message: "Editorial card removed successfully." });
  } catch (error: any) {
    console.error("[Editorial Cards DELETE Error]:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
