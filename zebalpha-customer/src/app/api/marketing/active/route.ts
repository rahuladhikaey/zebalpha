import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { isSellerStorePassActive } from "@/lib/smartStoreSearch";

export const revalidate = 60;

export async function GET() {
  try {
    const nowIso = new Date().toISOString();
    let campaigns: Array<Record<string, unknown>> = [];

    const primaryRes = await supabaseServer
      .from("seller_branding_campaigns")
      .select(
        "id, seller_id, store_name, package_key, placement_type, product_ids, headline, tagline, offer_badge, banner_image_url, cta_url, starts_at, ends_at"
      )
      .in("approval_status", ["approved", "live"])
      .order("created_at", { ascending: false })
      .limit(24);

    if (!primaryRes.error && Array.isArray(primaryRes.data)) {
      campaigns = primaryRes.data as Array<Record<string, unknown>>;
    } else {
      // Fallback if offer_badge column hasn't been added yet
      const fallbackRes = await supabaseServer
        .from("seller_branding_campaigns")
        .select(
          "id, seller_id, store_name, package_key, placement_type, product_ids, headline, tagline, banner_image_url, cta_url, starts_at, ends_at"
        )
        .in("approval_status", ["approved", "live"])
        .order("created_at", { ascending: false })
        .limit(24);
      if (!fallbackRes.error && Array.isArray(fallbackRes.data)) {
        campaigns = fallbackRes.data as Array<Record<string, unknown>>;
      }
    }

    if (campaigns.length === 0) {
      return NextResponse.json({
        success: true,
        spotlights: [],
        boostedProductIds: [],
      });
    }

    // Filter strictly to active schedule window and exclude Store Search Pass records
    const activeCampaigns = campaigns
      .filter((c) => {
        if (String(c.placement_type || "") === "store_search") return false;
        if (c.starts_at && String(c.starts_at) > nowIso) return false;
        if (c.ends_at && String(c.ends_at) < nowIso) return false;
        return true;
      })
      .sort((a, b) => {
        // Priority order: Festival Mega Takeover (₹139/45d) > Offer Ad (₹99/28d) > Legacy
        const rank = (k: unknown) =>
          k === "festival_mega_139_45d" || k === "brand_takeover"
            ? 3
            : k === "app_offer_99_28d" || k === "homepage_spotlight"
              ? 2
              : 1;
        return rank(b.package_key) - rank(a.package_key);
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

    const sellerIds = Array.from(
      new Set(activeCampaigns.map((c) => String(c.seller_id || "")).filter(Boolean))
    );

    const activeStoreSlugBySeller = new Map<string, string>();
    if (sellerIds.length > 0) {
      try {
        const { data: sellerRows } = await supabaseServer
          .from("sellers")
          .select("id, store_slug, store_pass_status, store_pass_expires_at, store_slug_blocked")
          .in("id", sellerIds);

        if (Array.isArray(sellerRows)) {
          for (const s of sellerRows as Array<Record<string, unknown>>) {
            if (
              typeof s.store_slug === "string" &&
              s.store_slug.trim() &&
              isSellerStorePassActive({
                store_pass_status: String(s.store_pass_status || "inactive"),
                store_pass_expires_at: s.store_pass_expires_at
                  ? String(s.store_pass_expires_at)
                  : null,
                store_slug_blocked: Boolean(s.store_slug_blocked),
              })
            ) {
              activeStoreSlugBySeller.set(String(s.id), s.store_slug.trim().toLowerCase());
            }
          }
        }
      } catch {
        // Safe if sellers migration hasn't run yet
      }
    }

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
      .filter(
        (c) => c.placement_type === "homepage_spotlight" || c.placement_type === "brand_takeover"
      )
      .map((c) => ({
        ...c,
        active_store_slug: activeStoreSlugBySeller.get(String(c.seller_id || "")) || null,
        products: (Array.isArray(c.product_ids) ? c.product_ids : [])
          .map((id: unknown) => productMap.get(String(id)))
          .filter(Boolean)
          .slice(0, 4),
      }))
      .filter((c) => c.products.length > 0);

    const boostedProductIds = Array.from(
      new Set(
        activeCampaigns
          .filter(
            (c) =>
              c.placement_type === "top_search" ||
              c.placement_type === "homepage_spotlight" ||
              c.placement_type === "brand_takeover"
          )
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
