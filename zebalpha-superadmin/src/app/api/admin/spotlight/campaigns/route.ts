import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

// GET /api/admin/spotlight/campaigns
export async function GET() {
  try {
    const { data: campaigns, error } = await supabaseServer
      .from("spotlight_campaigns")
      .select(`
        *,
        spotlight_campaign_items (
          id,
          card_type,
          product_id,
          editorial_card_id,
          display_order
        )
      `)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Spotlight Campaigns GET Error]:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    const formatted = (campaigns || []).map((c: any) => ({
      ...c,
      itemCount: c.spotlight_campaign_items?.length || 0,
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error("[Spotlight Campaigns Error]:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// POST /api/admin/spotlight/campaigns
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      name,
      description,
      header_image_url,
      theme = "default",
      status = "draft",
      selection_mode = "manual",
      category_scope = "all",
      max_cards = 16,
      required_cards = 16,
      default_sort = "popular",
      display_order = 0,
      starts_at,
      ends_at,
      website_enabled = true,
      android_enabled = true,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, message: "Campaign Name is required." }, { status: 400 });
    }

    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const newCampaign = {
      name: name.trim(),
      slug: `${slug}-${Date.now().toString().slice(-4)}`,
      description: description ? description.trim() : null,
      header_image_url: header_image_url ? header_image_url.trim() : null,
      theme,
      status: status || "draft",
      selection_mode,
      category_scope,
      max_cards: Number(max_cards) || 16,
      required_cards: Number(required_cards) || 16,
      default_sort,
      display_order: Number(display_order) || 0,
      starts_at: starts_at ? new Date(starts_at).toISOString() : null,
      ends_at: ends_at ? new Date(ends_at).toISOString() : null,
      website_enabled: Boolean(website_enabled),
      android_enabled: Boolean(android_enabled),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseServer
      .from("spotlight_campaigns")
      .insert([newCampaign])
      .select("*")
      .single();

    if (error) {
      console.error("[Spotlight Campaign Insert Error]:", error);
      return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("[Spotlight Campaign POST Error]:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
