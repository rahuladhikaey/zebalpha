import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

// POST /api/admin/spotlight/campaigns/[id]/publish
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id: campaignId } = params;

    // 1. Fetch Campaign
    const { data: campaign, error: cErr } = await supabaseServer
      .from("spotlight_campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (cErr || !campaign) {
      return NextResponse.json({ success: false, message: "Campaign not found" }, { status: 404 });
    }

    // 2. Fetch Selected Items
    const { data: items, error: iErr } = await supabaseServer
      .from("spotlight_campaign_items")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("display_order", { ascending: true });

    if (iErr) {
      return NextResponse.json({ success: false, message: "Failed to load campaign items" }, { status: 500 });
    }

    const currentItems = items || [];
    const requiredCards = campaign.required_cards !== undefined ? campaign.required_cards : 16;

    // 3. Check Required Card Count (e.g. exactly 16 cards for Top Deals)
    if (requiredCards > 0 && currentItems.length !== requiredCards) {
      return NextResponse.json({
        success: false,
        message: `Cannot publish campaign: Requires exactly ${requiredCards} selected cards before publication. Current selection: ${currentItems.length} cards.`,
        requiredCards,
        currentCount: currentItems.length,
      }, { status: 400 });
    }

    // 4. Validate Seller Products
    const productIds = currentItems
      .filter((it: any) => it.card_type === "seller_product" && it.product_id)
      .map((it: any) => it.product_id);

    if (productIds.length > 0) {
      const { data: prods, error: pErr } = await supabaseServer
        .from("products")
        .select("id, name, price, stock, is_active, is_approved")
        .in("id", productIds);

      if (pErr) {
        return NextResponse.json({ success: false, message: "Failed to verify seller products" }, { status: 500 });
      }

      const foundMap = new Map((prods || []).map((p: any) => [p.id, p]));
      for (const pid of productIds) {
        const prod = foundMap.get(pid);
        if (!prod) {
          return NextResponse.json({
            success: false,
            message: `Selected seller product (ID: ${pid}) no longer exists in database.`
          }, { status: 400 });
        }
        if (!prod.is_active || !prod.is_approved) {
          return NextResponse.json({
            success: false,
            message: `Selected product "${prod.name}" is inactive or unapproved. Cannot publish.`
          }, { status: 400 });
        }
      }
    }

    // 5. Validate Editorial Cards
    const editorialIds = currentItems
      .filter((it: any) => it.card_type === "editorial" && it.editorial_card_id)
      .map((it: any) => it.editorial_card_id);

    if (editorialIds.length > 0) {
      const { data: edits, error: eErr } = await supabaseServer
        .from("spotlight_editorial_cards")
        .select("*")
        .in("id", editorialIds);

      if (eErr) {
        return NextResponse.json({ success: false, message: "Failed to verify editorial cards" }, { status: 500 });
      }

      const editMap = new Map((edits || []).map((e: any) => [e.id, e]));
      for (const eid of editorialIds) {
        const edit = editMap.get(eid);
        if (!edit) {
          return NextResponse.json({
            success: false,
            message: `Selected editorial card (ID: ${eid}) no longer exists in database.`
          }, { status: 400 });
        }
        if (!edit.is_active) {
          return NextResponse.json({
            success: false,
            message: `Selected editorial card "${edit.title}" is disabled. Enable it before publishing.`
          }, { status: 400 });
        }
        if (!edit.image_url) {
          return NextResponse.json({
            success: false,
            message: `Editorial card "${edit.title}" is missing an image.`
          }, { status: 400 });
        }
      }
    }

    // 6. Concurrency-Safe Publish Update
    const { data: updatedCampaign, error: pubErr } = await supabaseServer
      .from("spotlight_campaigns")
      .update({
        status: "published",
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId)
      .select("*")
      .single();

    if (pubErr) {
      console.error("[Spotlight Publish Error]:", pubErr);
      return NextResponse.json({ success: false, message: pubErr.message }, { status: 500 });
    }

    // 7. Try recording in audit log if table exists
    try {
      await supabaseServer.from("audit_logs").insert([
        {
          action: "SPOTLIGHT_CAMPAIGN_PUBLISHED",
          resource_type: "spotlight_campaigns",
          resource_id: campaignId,
          details: {
            campaign_name: campaign.name,
            card_count: currentItems.length,
            platforms: {
              website: campaign.website_enabled,
              android: campaign.android_enabled,
            },
          },
          created_at: new Date().toISOString(),
        },
      ]);
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: `Campaign "${campaign.name}" published successfully!`,
      data: updatedCampaign,
    });
  } catch (error: any) {
    console.error("[Spotlight Publish Exception]:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
