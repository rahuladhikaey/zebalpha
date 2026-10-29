import { NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";
import { requireSuperAdmin, authErrorResponse } from "@/lib/authGuard";

export const dynamic = "force-dynamic";

// GET /api/admin/promotions?slug=top-deals
export async function GET(req: Request) {
  try {
    await requireSuperAdmin(req);

    const { searchParams } = new URL(req.url);
    const slug = searchParams.get("slug") || "top-deals";

    // 1. Fetch Campaign
    const { data: campaign, error: campaignError } = await supabaseServer
      .from("promotional_campaigns")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    if (campaignError) {
      console.error("[Promotions Admin GET Campaign Error]:", campaignError);
      return NextResponse.json({ success: false, message: campaignError.message }, { status: 500 });
    }

    if (!campaign) {
      return NextResponse.json({ success: false, message: `Campaign '${slug}' not found` }, { status: 404 });
    }

    // 2. Fetch all 16 slots
    const { data: slots, error: slotsError } = await supabaseServer
      .from("promotional_campaign_slots")
      .select("*")
      .eq("campaign_id", campaign.id)
      .order("slot_number", { ascending: true });

    if (slotsError) {
      console.error("[Promotions Admin GET Slots Error]:", slotsError);
      return NextResponse.json({ success: false, message: slotsError.message }, { status: 500 });
    }

    // 3. Fetch store categories for easy destination dropdown in Admin Studio
    const { data: categories } = await supabaseServer
      .from("categories")
      .select("id, name, slug, image_url")
      .order("name", { ascending: true });

    return NextResponse.json({
      success: true,
      data: {
        campaign,
        slots: slots || [],
        categories: categories || []
      }
    });
  } catch (error: any) {
    if (error.name === "AuthError") return authErrorResponse(error);
    console.error("[Promotions Admin GET Exception]:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}

// PUT /api/admin/promotions - Update Campaign Settings or Publish Status
export async function PUT(req: Request) {
  try {
    await requireSuperAdmin(req);

    const body = await req.json();
    const { id, title, subtitle, theme_preset, status, website_enabled, android_enabled } = body;

    if (!id) {
      return NextResponse.json({ success: false, message: "Campaign ID is required" }, { status: 400 });
    }

    // Strict 16-slot validation when attempting to publish
    if (status === "published") {
      const { data: slots, error: slotCheckErr } = await supabaseServer
        .from("promotional_campaign_slots")
        .select("slot_number, title, price_label, image_url, destination_url")
        .eq("campaign_id", id);

      if (slotCheckErr) {
        return NextResponse.json({ success: false, message: slotCheckErr.message }, { status: 500 });
      }

      if (!slots || slots.length !== 16) {
        return NextResponse.json(
          {
            success: false,
            message: `Cannot publish: Campaign has ${slots?.length || 0}/16 slots. Exactly 16 slots are required.`
          },
          { status: 400 }
        );
      }

      const invalidSlots = slots.filter(
        (s: any) =>
          !s.title?.trim() ||
          !s.price_label?.trim() ||
          !s.image_url?.trim() ||
          !s.destination_url?.trim()
      );

      if (invalidSlots.length > 0) {
        const slotNumbers = invalidSlots.map((s: any) => `#${s.slot_number}`).join(", ");
        return NextResponse.json(
          {
            success: false,
            message: `Cannot publish: Slot(s) ${slotNumbers} have incomplete data (title, price label, image, or link missing).`
          },
          { status: 400 }
        );
      }
    }

    const updates: any = { updated_at: new Date().toISOString() };
    if (title !== undefined) updates.title = title.trim();
    if (subtitle !== undefined) updates.subtitle = subtitle.trim();
    if (theme_preset !== undefined) updates.theme_preset = theme_preset;
    if (status !== undefined) updates.status = status;
    if (website_enabled !== undefined) updates.website_enabled = Boolean(website_enabled);
    if (android_enabled !== undefined) updates.android_enabled = Boolean(android_enabled);

    const { data: updatedCampaign, error: updateErr } = await supabaseServer
      .from("promotional_campaigns")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (updateErr) {
      return NextResponse.json({ success: false, message: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: updatedCampaign });
  } catch (error: any) {
    if (error.name === "AuthError") return authErrorResponse(error);
    console.error("[Promotions Admin PUT Exception]:", error);
    return NextResponse.json({ success: false, message: error.message || "Server error" }, { status: 500 });
  }
}
