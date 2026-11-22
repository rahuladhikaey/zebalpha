import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const revalidate = 60;

export async function GET() {
  try {
    const nowIso = new Date().toISOString();
    const { data: campaigns, error } = await supabaseServer
      .from("seller_branding_campaigns")
      .select(
        "id, seller_id, store_name, package_key, placement_type, product_ids, headline, tagline, banner_image_url, cta_url, starts_at, ends_at"
      )
      .in("approval_status", ["approved", "live"])
      .order("created_at", { ascending: false })
      .limit(20);

    if (error || !Array.isArray(campaigns) || campaigns.length === 0) {
      return NextResponse.json({
        success: true,
        spotlights: [],
        boostedProductIds: [],
      });
    }

    // Filter to active schedule window
    const activeCampaigns = campaigns.filter((c) => {
      if (c.starts_at && c.starts_at > nowIso) return false;
      if (c.ends_at && c.ends_at < nowIso) return false;
      return true;
    });

    if (activeCampaigns.length === 0) {
      return NextResponse.json({
        success: true,
        spotlights: [],
        boostedProductIds: [],
      });
    }

    const allProductIds = Array.from(
      new Set(
        activeCampaigns.flatMap((c) =>
          Array.isArray(c.product_ids) ? c.product_ids.map(String) : []
        )
      )
    );

    const productMap = new Map<
      string,
      { id: string; name: string; price: number; mrp?: number; image_url: string }
    >();

    if (allProductIds.length > 0) {
      const { data: prods } = await supabaseServer
        .from("products")
        .select("id, name, price, mrp, image_url, images, is_active, status")
        .in("id", allProductIds);

      if (Array.isArray(prods)) {
        for (const p of prods as Array<Record<string, unknown>>) {
          if (p.is_active === false || String(p.status || "").toUpperCase() === "DELETED") continue;
          const img =
            (typeof p.image_url === "string" && p.image_url.trim()) ||
            (Array.isArray(p.images) && typeof p.images[0] === "string" ? p.images[0] : "") ||
            "";
          productMap.set(String(p.id), {
            id: String(p.id),
            name: String(p.name || "ZebAlpha Piece"),
            price: Number(p.price || 0),
            mrp: typeof p.mrp === "number" ? p.mrp : undefined,
            image_url: img,
          });
        }
      }
    }

    const spotlights = activeCampaigns
      .filter((c) => c.placement_type === "homepage_spotlight" || c.placement_type === "brand_takeover")
      .map((c) => ({
        ...c,
        products: (Array.isArray(c.product_ids) ? c.product_ids : [])
          .map((id: string) => productMap.get(String(id)))
          .filter(Boolean)
          .slice(0, 4),
      }))
      .filter((c) => c.products.length > 0);

    const boostedProductIds = Array.from(
      new Set(
        activeCampaigns
          .filter((c) => c.placement_type === "top_search" || c.placement_type === "brand_takeover")
          .flatMap((c) => (Array.isArray(c.product_ids) ? c.product_ids.map(String) : []))
      )
    );

    return NextResponse.json({
      success: true,
      spotlights,
      boostedProductIds,
    });
  } catch (err) {
    console.warn("[API /marketing/active] Notice:", err);
    return NextResponse.json({
      success: true,
      spotlights: [],
      boostedProductIds: [],
    });
  }
}
