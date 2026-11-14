import { NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";
import { requireSuperAdmin, authErrorResponse } from "@/lib/authGuard";

export const dynamic = "force-dynamic";

interface DbProductRow {
  id: string;
  name?: string | null;
  price?: number | null;
  image_url?: string | null;
  images?: string[] | null;
  category_id?: string | null;
}

interface DbCategoryRow {
  id: string;
  name: string;
  slug?: string | null;
}

interface DbImpressionRow {
  product_id?: string | null;
  surface?: string | null;
  strategy?: string | null;
  platform?: string | null;
}

interface DbClickRow {
  product_id?: string | null;
  added_to_cart?: boolean | null;
  added_to_wishlist?: boolean | null;
  purchased?: boolean | null;
  attributed_revenue?: number | null;
  surface?: string | null;
  strategy?: string | null;
  platform?: string | null;
}

interface DbEventRow {
  category_id?: string | null;
  event_type?: string | null;
  search_query?: string | null;
}

function isMissingRelation(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null | undefined;
  const code = String(e?.code || "");
  const msg = String(e?.message || "").toLowerCase();
  return code === "42P01" || msg.includes("does not exist") || msg.includes("relation");
}

export async function GET(req: Request) {
  try {
    await requireSuperAdmin(req);
    const url = new URL(req.url);

    const daysRaw = parseInt(url.searchParams.get("days") || "30", 10);
    const days = [7, 30, 90].includes(daysRaw) ? daysRaw : 30;
    const platformFilter = url.searchParams.get("platform") || "all";
    const sinceIso = new Date(Date.now() - days * 86_400_000).toISOString();

    let impQuery = supabaseServer
      .from("product_recommendation_impressions")
      .select("id, product_id, category_id, surface, strategy, platform, created_at")
      .gte("created_at", sinceIso)
      .limit(10000);

    let clickQuery = supabaseServer
      .from("recommendation_click_events")
      .select(
        "id, product_id, category_id, surface, strategy, platform, added_to_cart, added_to_wishlist, purchased, attributed_revenue, created_at"
      )
      .gte("created_at", sinceIso)
      .limit(10000);

    let evQuery = supabaseServer
      .from("customer_product_events")
      .select("id, product_id, category_id, event_type, platform, search_query, created_at")
      .gte("created_at", sinceIso)
      .limit(10000);

    if (platformFilter === "android" || platformFilter === "website") {
      impQuery = impQuery.eq("platform", platformFilter);
      clickQuery = clickQuery.eq("platform", platformFilter);
      evQuery = evQuery.eq("platform", platformFilter);
    }

    const [impRes, clickRes, evRes, prodRes, catRes] = await Promise.all([
      impQuery,
      clickQuery,
      evQuery,
      supabaseServer.from("products").select("id, name, price, image_url, images, category_id").limit(1000),
      supabaseServer.from("categories").select("id, name, slug").limit(500),
    ]);

    const migrationPending =
      isMissingRelation(impRes.error) ||
      isMissingRelation(clickRes.error) ||
      isMissingRelation(evRes.error);

    if (migrationPending) {
      return NextResponse.json({
        success: true,
        migrationPending: true,
        days,
        platform: platformFilter,
        kpis: {
          impressions: 0,
          clicks: 0,
          ctrPercent: 0,
          cartAdds: 0,
          wishlistAdds: 0,
          purchases: 0,
          attributedRevenue: 0,
          totalEvents: 0,
        },
        topProducts: [],
        topCategories: [],
        surfaceBreakdown: [],
        strategyBreakdown: [],
        platformBreakdown: { website: { impressions: 0, clicks: 0, purchases: 0 }, android: { impressions: 0, clicks: 0, purchases: 0 } },
        topSearches: [],
      });
    }

    const impressions = Array.isArray(impRes.data) ? (impRes.data as DbImpressionRow[]) : [];
    const clicks = Array.isArray(clickRes.data) ? (clickRes.data as DbClickRow[]) : [];
    const events = Array.isArray(evRes.data) ? (evRes.data as DbEventRow[]) : [];
    const products = Array.isArray(prodRes.data) ? (prodRes.data as DbProductRow[]) : [];
    const categories = Array.isArray(catRes.data) ? (catRes.data as DbCategoryRow[]) : [];

    const prodMap = new Map<string, DbProductRow>(products.map((p) => [String(p.id), p]));
    const catMap = new Map<string, string>(categories.map((c) => [String(c.id), c.name]));

    let cartAdds = 0;
    let wishlistAdds = 0;
    let purchases = 0;
    let attributedRevenue = 0;

    const productStats = new Map<
      string,
      {
        productId: string;
        name: string;
        imageUrl: string;
        price: number;
        impressions: number;
        clicks: number;
        cartAdds: number;
        purchases: number;
        attributedRevenue: number;
      }
    >();

    const ensureProdStat = (pid: string) => {
      if (!productStats.has(pid)) {
        const prod = prodMap.get(pid);
        const img =
          prod?.image_url ||
          (Array.isArray(prod?.images) && prod.images[0]) ||
          "";
        productStats.set(pid, {
          productId: pid,
          name: prod?.name || `Product ${pid.slice(0, 8)}`,
          imageUrl: img,
          price: Number(prod?.price || 0),
          impressions: 0,
          clicks: 0,
          cartAdds: 0,
          purchases: 0,
          attributedRevenue: 0,
        });
      }
      return productStats.get(pid)!;
    };

    const surfaceMap = new Map<string, { surface: string; impressions: number; clicks: number; purchases: number }>();
    const strategyMap = new Map<string, { strategy: string; impressions: number; clicks: number; purchases: number }>();
    const platformBreakdown = {
      website: { impressions: 0, clicks: 0, purchases: 0 },
      android: { impressions: 0, clicks: 0, purchases: 0 },
    };

    for (const imp of impressions) {
      const pid = imp.product_id ? String(imp.product_id) : "";
      if (pid) ensureProdStat(pid).impressions += 1;

      const surf = String(imp.surface || "suggested_for_you");
      const sRow = surfaceMap.get(surf) || { surface: surf, impressions: 0, clicks: 0, purchases: 0 };
      sRow.impressions += 1;
      surfaceMap.set(surf, sRow);

      const strat = String(imp.strategy || "hybrid");
      const stRow = strategyMap.get(strat) || { strategy: strat, impressions: 0, clicks: 0, purchases: 0 };
      stRow.impressions += 1;
      strategyMap.set(strat, stRow);

      if (imp.platform === "android") platformBreakdown.android.impressions += 1;
      else platformBreakdown.website.impressions += 1;
    }

    for (const clk of clicks) {
      const pid = clk.product_id ? String(clk.product_id) : "";
      const pStat = pid ? ensureProdStat(pid) : null;
      if (pStat) pStat.clicks += 1;

      if (clk.added_to_cart) {
        cartAdds += 1;
        if (pStat) pStat.cartAdds += 1;
      }
      if (clk.added_to_wishlist) wishlistAdds += 1;
      if (clk.purchased) {
        purchases += 1;
        const rev = Number(clk.attributed_revenue || 0);
        attributedRevenue += rev;
        if (pStat) {
          pStat.purchases += 1;
          pStat.attributedRevenue += rev;
        }
      }

      const surf = String(clk.surface || "suggested_for_you");
      const sRow = surfaceMap.get(surf) || { surface: surf, impressions: 0, clicks: 0, purchases: 0 };
      sRow.clicks += 1;
      if (clk.purchased) sRow.purchases += 1;
      surfaceMap.set(surf, sRow);

      const strat = String(clk.strategy || "hybrid");
      const stRow = strategyMap.get(strat) || { strategy: strat, impressions: 0, clicks: 0, purchases: 0 };
      stRow.clicks += 1;
      if (clk.purchased) stRow.purchases += 1;
      strategyMap.set(strat, stRow);

      if (clk.platform === "android") {
        platformBreakdown.android.clicks += 1;
        if (clk.purchased) platformBreakdown.android.purchases += 1;
      } else {
        platformBreakdown.website.clicks += 1;
        if (clk.purchased) platformBreakdown.website.purchases += 1;
      }
    }

    const catEngagement = new Map<
      string,
      { categoryId: string; name: string; totalEvents: number; views: number; cartAdds: number; clicks: number }
    >();
    const searchCounts = new Map<string, number>();

    for (const ev of events) {
      const catId = ev.category_id ? String(ev.category_id) : "";
      if (catId) {
        if (!catEngagement.has(catId)) {
          catEngagement.set(catId, {
            categoryId: catId,
            name: catMap.get(catId) || "Category",
            totalEvents: 0,
            views: 0,
            cartAdds: 0,
            clicks: 0,
          });
        }
        const ce = catEngagement.get(catId)!;
        ce.totalEvents += 1;
        if (ev.event_type === "product_viewed" || ev.event_type === "category_viewed") ce.views += 1;
        if (ev.event_type === "cart_added") ce.cartAdds += 1;
        if (ev.event_type === "recommendation_clicked") ce.clicks += 1;
      }

      if (ev.event_type === "product_searched" && ev.search_query) {
        const term = String(ev.search_query).trim().toLowerCase();
        if (term) searchCounts.set(term, (searchCounts.get(term) || 0) + 1);
      }
    }

    const totalImpressions = impressions.length;
    const totalClicks = clicks.length;
    const ctrPercent =
      totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;

    const topProducts = Array.from(productStats.values())
      .map((row) => ({
        ...row,
        ctrPercent: row.impressions > 0 ? Number(((row.clicks / row.impressions) * 100).toFixed(1)) : 0,
        attributedRevenue: Number(row.attributedRevenue.toFixed(2)),
      }))
      .sort((a, b) => b.clicks * 4 + b.impressions - (a.clicks * 4 + a.impressions))
      .slice(0, 15);

    const topCategories = Array.from(catEngagement.values())
      .sort((a, b) => b.totalEvents - a.totalEvents)
      .slice(0, 12);

    const surfaceBreakdown = Array.from(surfaceMap.values()).map((row) => ({
      ...row,
      ctrPercent: row.impressions > 0 ? Number(((row.clicks / row.impressions) * 100).toFixed(1)) : 0,
    }));

    const strategyBreakdown = Array.from(strategyMap.values()).map((row) => ({
      ...row,
      ctrPercent: row.impressions > 0 ? Number(((row.clicks / row.impressions) * 100).toFixed(1)) : 0,
    }));

    const topSearches = Array.from(searchCounts.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);

    return NextResponse.json({
      success: true,
      migrationPending: false,
      days,
      platform: platformFilter,
      kpis: {
        impressions: totalImpressions,
        clicks: totalClicks,
        ctrPercent,
        cartAdds,
        wishlistAdds,
        purchases,
        attributedRevenue: Number(attributedRevenue.toFixed(2)),
        totalEvents: events.length,
      },
      topProducts,
      topCategories,
      surfaceBreakdown,
      strategyBreakdown,
      platformBreakdown,
      topSearches,
    });
  } catch (err: unknown) {
    return authErrorResponse(err);
  }
}
