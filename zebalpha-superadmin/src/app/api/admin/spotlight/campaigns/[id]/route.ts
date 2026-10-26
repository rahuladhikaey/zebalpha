import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

// GET /api/admin/spotlight/campaigns/[id]
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // 1. Fetch Campaign
    const { data: campaign, error: campErr } = await supabaseServer
      .from("spotlight_campaigns")
      .select("*")
      .eq("id", id)
      .single();

    if (campErr || !campaign) {
      return NextResponse.json({ success: false, message: "Campaign not found" }, { status: 404 });
    }

    // 2. Fetch Items ordered by display_order
    const { data: items, error: itemsErr } = await supabaseServer
      .from("spotlight_campaign_items")
      .select(`
        id,
        campaign_id,
        card_type,
        product_id,
        editorial_card_id,
        display_order,
        created_at
      `)
      .eq("campaign_id", id)
      .order("display_order", { ascending: true });

    if (itemsErr) {
      console.error("[Spotlight Items GET Error]:", itemsErr);
    }

    const rawItems = items || [];

    // 3. Populate seller products and editorial cards
    const productIds = rawItems
      .filter((it: any) => it.card_type === "seller_product" && it.product_id)
      .map((it: any) => it.product_id);

    const editorialIds = rawItems
      .filter((it: any) => it.card_type === "editorial" && it.editorial_card_id)
      .map((it: any) => it.editorial_card_id);

    let productsMap: Record<string, any> = {};
    if (productIds.length > 0) {
      const { data: prods } = await supabaseServer
        .from("products")
        .select(`
          id,
          name,
          brand,
          price,
          mrp,
          stock,
          image_url,
          images,
          is_active,
          is_approved,
          approval_status,
          category_id,
          seller_id,
          sellers (
            id,
            store_name,
            business_name
          ),
          categories (
            id,
            name
          )
        `)
        .in("id", productIds);

      (prods || []).forEach((p: any) => {
        productsMap[p.id] = {
          ...p,
          seller_name: p.sellers?.store_name || p.sellers?.business_name || "Official Seller",
          category_name: p.categories?.name || "Apparel",
          image: p.image_url || (Array.isArray(p.images) && p.images[0]) || "",
        };
      });
    }

    let editorialMap: Record<string, any> = {};
    if (editorialIds.length > 0) {
      const { data: edits } = await supabaseServer
        .from("spotlight_editorial_cards")
        .select("*")
        .in("id", editorialIds);

      (edits || []).forEach((e: any) => {
        editorialMap[e.id] = e;
      });
    }

    // Attach resolved item details
    const populatedItems = rawItems.map((it: any) => {
      if (it.card_type === "seller_product") {
        return {
          ...it,
          product: productsMap[it.product_id] || null,
        };
      } else {
        return {
          ...it,
          editorial_card: editorialMap[it.editorial_card_id] || null,
        };
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        ...campaign,
        items: populatedItems,
      },
    });
  } catch (error: any) {
    console.error("[Spotlight Campaign Detail Error]:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// PUT /api/admin/spotlight/campaigns/[id]
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();

    const allowedFields = [
      "name",
      "description",
      "header_image_url",
      "theme",
      "status",
      "selection_mode",
      "category_scope",
      "max_cards",
      "required_cards",
      "default_sort",
      "display_order",
      "starts_at",
      "ends_at",
      "website_enabled",
      "android_enabled",
    ];

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        if (key === "starts_at" || key === "ends_at") {
          updates[key] = body[key] ? new Date(body[key]).toISOString() : null;
        } else if (key === "max_cards" || key === "required_cards" || key === "display_order") {
          updates[key] = Number(body[key]);
        } else if (key === "website_enabled" || key === "android_enabled") {
          updates[key] = Boolean(body[key]);
        } else {
          updates[key] = body[key];
        }
      }
    }

    const { data, error } = await supabaseServer
      .from("spotlight_campaigns")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("[Spotlight Campaign Update Error]:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("[Spotlight Campaign PUT Error]:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// DELETE /api/admin/spotlight/campaigns/[id]
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { error } = await supabaseServer
      .from("spotlight_campaigns")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("[Spotlight Campaign Delete Error]:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: "Campaign deleted successfully." });
  } catch (error: any) {
    console.error("[Spotlight Campaign DELETE Error]:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
