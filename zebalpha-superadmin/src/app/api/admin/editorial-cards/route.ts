import { NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";
import { requireSuperAdmin, authErrorResponse } from "@/lib/authGuard";

export const dynamic = "force-dynamic";

// GET /api/admin/editorial-cards
export async function GET(req: Request) {
  try {
    await requireSuperAdmin(req);

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
    if (error.name === "AuthError") return authErrorResponse(error);
    console.error("[Editorial Cards GET Error]:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}

// POST /api/admin/editorial-cards (Create)
export async function POST(req: Request) {
  try {
    await requireSuperAdmin(req);

    const body = await req.json();
    const { title, image_url, category, price, badge, href, display_order = 0, is_active = true } = body;

    if (!image_url || !image_url.trim()) {
      return NextResponse.json(
        { success: false, message: "A verified Image URL is required." },
        { status: 400 }
      );
    }

    const payload = {
      title: (title || "").trim() || "Exclusive Collection",
      image_url: image_url.trim(),
      category: (category || "").trim() || "Editorial Spotlight",
      price: (price || "").trim() || "Starting ₹499",
      badge: (badge || "").trim() || "FEATURED",
      href: (href || "").trim() || "/categories",
      display_order: parseInt(display_order, 10) || 0,
      is_active: Boolean(is_active),
    };

    const { data, error } = await supabaseServer
      .from("editorial_cards")
      .insert([payload])
      .select("id, title, category, price, badge, href, image_url, display_order, is_active, created_at, updated_at");

    if (error) {
      console.warn("Notice inserting into editorial_cards table, fallback to marketplace_settings:", error.message);
      const { data: settingData } = await supabaseServer
        .from("marketplace_settings")
        .select("setting_value")
        .eq("setting_key", "editorial_cards")
        .maybeSingle();

      const existingList = settingData?.setting_value ? JSON.parse(settingData.setting_value) : [];
      const newCard = {
        ...payload,
        id: `ed-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      existingList.push(newCard);

      await supabaseServer
        .from("marketplace_settings")
        .upsert(
          {
            setting_key: "editorial_cards",
            setting_value: JSON.stringify(existingList),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "setting_key" }
        );

      return NextResponse.json({ success: true, data: newCard });
    }

    return NextResponse.json({ success: true, data: data?.[0] });
  } catch (error: any) {
    if (error.name === "AuthError") return authErrorResponse(error);
    console.error("[Editorial Cards POST Error]:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}

// PUT /api/admin/editorial-cards (Update / Reorder)
export async function PUT(req: Request) {
  try {
    await requireSuperAdmin(req);

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
    if (error.name === "AuthError") return authErrorResponse(error);
    console.error("[Editorial Cards PUT Error]:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}

// DELETE /api/admin/editorial-cards (Delete)
export async function DELETE(req: Request) {
  try {
    await requireSuperAdmin(req);

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
    if (error.name === "AuthError") return authErrorResponse(error);
    console.error("[Editorial Cards DELETE Error]:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
