import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

// PUT /api/admin/spotlight/campaigns/[id]/items (Save / Reorder Items)
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: campaignId } = params;
    const body = await req.json();
    const { items } = body; // Array of { card_type: 'seller_product' | 'editorial', product_id?: string, editorial_card_id?: string, display_order: number }

    if (!Array.isArray(items)) {
      return NextResponse.json({ success: false, message: "items must be an array." }, { status: 400 });
    }

    // 1. Check Campaign limits
    const { data: campaign, error: cErr } = await supabaseServer
      .from("spotlight_campaigns")
      .select("id, max_cards")
      .eq("id", campaignId)
      .single();

    if (cErr || !campaign) {
      return NextResponse.json({ success: false, message: "Campaign not found" }, { status: 404 });
    }

    const maxAllowed = campaign.max_cards || 16;
    if (items.length > maxAllowed) {
      return NextResponse.json(
        { success: false, message: `Cannot select more than ${maxAllowed} cards. Provided: ${items.length}.` },
        { status: 400 }
      );
    }

    // 2. Validate items integrity and prevent duplicates
    const seenProducts = new Set<string>();
    const seenEditorials = new Set<string>();

    const sanitizedItems: any[] = [];

    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const cardType = it.card_type;
      const order = it.display_order !== undefined ? Number(it.display_order) : i;

      if (cardType === "seller_product") {
        const prodId = it.product_id;
        if (!prodId) {
          return NextResponse.json(
            { success: false, message: `Item at index ${i} is missing product_id.` },
            { status: 400 }
          );
        }
        if (seenProducts.has(prodId)) {
          return NextResponse.json(
            { success: false, message: `Duplicate seller product (ID: ${prodId}) in selection.` },
            { status: 400 }
          );
        }
        seenProducts.add(prodId);
        sanitizedItems.push({
          campaign_id: campaignId,
          card_type: "seller_product",
          product_id: prodId,
          editorial_card_id: null,
          display_order: order,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else if (cardType === "editorial") {
        const editId = it.editorial_card_id;
        if (!editId) {
          return NextResponse.json(
            { success: false, message: `Item at index ${i} is missing editorial_card_id.` },
            { status: 400 }
          );
        }
        if (seenEditorials.has(editId)) {
          return NextResponse.json(
            { success: false, message: `Duplicate editorial card (ID: ${editId}) in selection.` },
            { status: 400 }
          );
        }
        seenEditorials.add(editId);
        sanitizedItems.push({
          campaign_id: campaignId,
          card_type: "editorial",
          product_id: null,
          editorial_card_id: editId,
          display_order: order,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else {
        return NextResponse.json(
          { success: false, message: `Invalid card_type at index ${i}: ${cardType}.` },
          { status: 400 }
        );
      }
    }

    // 3. Clear existing items and insert sanitized items
    const { error: delErr } = await supabaseServer
      .from("spotlight_campaign_items")
      .delete()
      .eq("campaign_id", campaignId);

    if (delErr) {
      console.error("[Spotlight Clear Items Error]:", delErr);
      return NextResponse.json({ success: false, message: delErr.message }, { status: 500 });
    }

    if (sanitizedItems.length > 0) {
      const { data: inserted, error: insErr } = await supabaseServer
        .from("spotlight_campaign_items")
        .insert(sanitizedItems)
        .select("*");

      if (insErr) {
        console.error("[Spotlight Insert Items Error]:", insErr);
        return NextResponse.json({ success: false, message: insErr.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, data: inserted, count: inserted?.length || 0 });
    }

    return NextResponse.json({ success: true, data: [], count: 0 });
  } catch (error: any) {
    console.error("[Spotlight Campaign Items Error]:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
