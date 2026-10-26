import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

// GET /api/admin/spotlight/editorial-cards
export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from("spotlight_editorial_cards")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Spotlight Editorial Cards GET Error]:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (error: any) {
    console.error("[Spotlight Editorial Cards Error]:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST /api/admin/spotlight/editorial-cards
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      title,
      subtitle,
      image_bucket = "editorial",
      image_object_path,
      image_url,
      category_id,
      subcategory_id,
      destination_type = "category",
      destination_id,
      destination_url,
      price_mode = "auto",
      manual_from_price,
      calculated_from_price,
      is_active = true,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ success: false, message: "Card Title is required." }, { status: 400 });
    }

    if (!image_url || !image_url.trim()) {
      return NextResponse.json({ success: false, message: "A verified Image is required." }, { status: 400 });
    }

    if (!destination_id || !destination_url) {
      return NextResponse.json({ success: false, message: "A valid destination is required." }, { status: 400 });
    }

    // Server-side validation of Manual From Price
    if (price_mode === "manual" && manual_from_price !== null && manual_from_price !== undefined) {
      const numManual = Number(manual_from_price);
      if (numManual <= 0) {
        return NextResponse.json({ success: false, message: "Manual From Price must be greater than zero." }, { status: 400 });
      }
      if (calculated_from_price && numManual < Number(calculated_from_price)) {
        return NextResponse.json({
          success: false,
          message: `Manual From Price (₹${numManual}) cannot be lower than the lowest available product (₹${calculated_from_price}). Misleading price claims are strictly prohibited.`
        }, { status: 400 });
      }
    }

    const newCard = {
      title: title.trim().toUpperCase(),
      subtitle: subtitle ? subtitle.trim() : null,
      image_bucket,
      image_object_path: image_object_path || image_url,
      image_url: image_url.trim(),
      category_id: category_id || null,
      subcategory_id: subcategory_id || null,
      destination_type,
      destination_id: String(destination_id),
      destination_url: destination_url.trim(),
      price_mode,
      manual_from_price: manual_from_price !== undefined && manual_from_price !== "" ? Number(manual_from_price) : null,
      calculated_from_price: calculated_from_price ? Number(calculated_from_price) : null,
      is_active: Boolean(is_active),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseServer
      .from("spotlight_editorial_cards")
      .insert([newCard])
      .select("*")
      .single();

    if (error) {
      console.error("[Spotlight Editorial Card Insert Error]:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("[Spotlight Editorial Card POST Error]:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PUT /api/admin/spotlight/editorial-cards
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, updates } = body;

    if (!id || !updates) {
      return NextResponse.json({ success: false, message: "Card ID and updates are required." }, { status: 400 });
    }

    const sanitizedUpdates = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseServer
      .from("spotlight_editorial_cards")
      .update(sanitizedUpdates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("[Spotlight Editorial Card Update Error]:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("[Spotlight Editorial Card PUT Error]:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/spotlight/editorial-cards
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, message: "Card ID is required." }, { status: 400 });
    }

    // Clean delete from spotlight_editorial_cards
    const { error } = await supabaseServer
      .from("spotlight_editorial_cards")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[Spotlight Editorial Card Delete Error]:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Editorial card deleted successfully." });
  } catch (error: any) {
    console.error("[Spotlight Editorial Card DELETE Error]:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
