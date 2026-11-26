import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import {
  resolveStoreMatches,
  type StoreSearchCandidate,
} from "@/lib/smartStoreSearch";
import {
  applyMultilingualSearchConstraints,
  parseMultilingualSearchQuery,
  rankProductsByQueryConcepts,
} from "@/lib/multilingualSearch";
import { attachRatingsToProducts, fetchProductRatingSummaries } from "@/lib/productRatings";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

const SLIM_PRODUCT_FIELDS =
  "id, name, brand, price, mrp, image_url, images, category_id, subcategory_id, collection, stock, low_stock_limit, status, is_active, is_approved, approval_status, created_at, specifications, seller_id";

// Lightweight 45-second in-memory directory cache to keep keystroke autocomplete near-zero latency
let sellerDirectoryCache: {
  loadedAt: number;
  sellers: StoreSearchCandidate[];
  migrationReady: boolean;
} | null = null;

const DIRECTORY_TTL_MS = 45_000;

function isMissingSchemaError(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message || "").toLowerCase();
  const code = String((err as { code?: string })?.code || "");
  return (
    code === "42P01" ||
    code === "42703" ||
    code === "PGRST204" ||
    code === "PGRST205" ||
    msg.includes("does not exist") ||
    msg.includes("could not find the")
  );
}

async function loadSellerDirectory(): Promise<{
  sellers: StoreSearchCandidate[];
  migrationReady: boolean;
}> {
  const now = Date.now();
  if (sellerDirectoryCache && now - sellerDirectoryCache.loadedAt < DIRECTORY_TTL_MS) {
    return {
      sellers: sellerDirectoryCache.sellers,
      migrationReady: sellerDirectoryCache.migrationReady,
    };
  }

  const { data, error } = await supabaseServer
    .from("sellers")
    .select(
      "id, business_name, store_slug, city, state, business_logo_url, store_banner_url, store_tagline, store_pass_plan, store_pass_status, store_pass_expires_at, store_slug_blocked"
    )
    .not("business_name", "is", null)
    .limit(2000);

  if (error) {
    if (isMissingSchemaError(error)) {
      sellerDirectoryCache = { loadedAt: now, sellers: [], migrationReady: false };
      return { sellers: [], migrationReady: false };
    }
    return { sellers: sellerDirectoryCache?.sellers || [], migrationReady: true };
  }

  const sellers: StoreSearchCandidate[] = (Array.isArray(data) ? data : [])
    .filter((row: Record<string, unknown>) => Boolean(row.business_name || row.store_slug))
    .map((row: Record<string, unknown>) => ({
      id: String(row.id),
      business_name: String(row.business_name || ""),
      store_slug: String(row.store_slug || "").trim().toLowerCase(),
      city: typeof row.city === "string" ? row.city : null,
      state: typeof row.state === "string" ? row.state : null,
      business_logo_url: typeof row.business_logo_url === "string" ? row.business_logo_url : null,
      store_banner_url: typeof row.store_banner_url === "string" ? row.store_banner_url : null,
      store_tagline: typeof row.store_tagline === "string" ? row.store_tagline : null,
      store_pass_plan: typeof row.store_pass_plan === "string" ? row.store_pass_plan : null,
      store_pass_status: typeof row.store_pass_status === "string" ? row.store_pass_status : "inactive",
      store_pass_expires_at: row.store_pass_expires_at ? String(row.store_pass_expires_at) : null,
      store_slug_blocked: Boolean(row.store_slug_blocked),
    }));

  sellerDirectoryCache = { loadedAt: now, sellers, migrationReady: true };
  return { sellers, migrationReady: true };
}

async function incrementStoreMetric(
  sellerId: string,
  metric: "store_search" | "missed_search"
): Promise<void> {
  try {
    const { error } = await supabaseServer.rpc("increment_seller_store_metric", {
      p_seller_id: sellerId,
      p_metric: metric,
    });
    if (error) {
      // Fallback direct read-and-increment if RPC not installed yet
      const col = metric === "store_search" ? "store_search_count" : "missed_store_searches";
      const { data: row } = await supabaseServer
        .from("sellers")
        .select(col)
        .eq("id", sellerId)
        .maybeSingle();
      const current = Number((row as Record<string, unknown> | null)?.[col] || 0);
      await supabaseServer
        .from("sellers")
        .update({ [col]: current + 1 })
        .eq("id", sellerId);
    }
  } catch {
    // Never block search UX on analytics increment
  }
}

async function fetchSellerMatchingProducts(
  sellerId: string,
  productQuery: string
): Promise<{ products: Product[]; totalSellerProducts: number }> {
  const { count: totalCount } = await supabaseServer
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("seller_id", sellerId)
    .or("is_active.is.null,is_active.eq.true");

  const parsed = productQuery.trim() ? parseMultilingualSearchQuery(productQuery.trim()) : null;

  const runQuery = async (mode: "and" | "or") => {
    let q = supabaseServer
      .from("products")
      .select(SLIM_PRODUCT_FIELDS)
      .eq("seller_id", sellerId)
      .or("is_active.is.null,is_active.eq.true");

    if (parsed) {
      q = applyMultilingualSearchConstraints(q, parsed, mode);
    }
    return q.order("created_at", { ascending: false }).limit(parsed ? 40 : 48);
  };

  let { data, error } = await runQuery("and");
  if (!error && parsed && parsed.concepts.length > 1 && (!data || data.length === 0)) {
    const broadened = await runQuery("or");
    if (!broadened.error && broadened.data && broadened.data.length > 0) {
      data = broadened.data;
    }
  }

  // If seller matched by shop name + product word had 0 strict matches, show seller's top live products cleanly
  if (!error && (!data || data.length === 0) && productQuery.trim()) {
    const fallbackAll = await supabaseServer
      .from("products")
      .select(SLIM_PRODUCT_FIELDS)
      .eq("seller_id", sellerId)
      .or("is_active.is.null,is_active.eq.true")
      .order("created_at", { ascending: false })
      .limit(24);
    if (!fallbackAll.error && fallbackAll.data) {
      data = fallbackAll.data;
    }
  }

  const normalized: Product[] = (Array.isArray(data) ? data : [])
    .filter((p: Record<string, unknown>) => {
      if (p.is_active === false) return false;
      const st = String(p.status || "").toUpperCase();
      if (["DELETED", "COMING_SOON", "BLOCKED", "DRAFT"].includes(st)) return false;
      if (String(p.approval_status || "").toLowerCase() === "rejected") return false;
      return true;
    })
    .map((p: Record<string, unknown>) => {
      const specs = (p.specifications as Record<string, unknown>) || {};
      const img =
        (typeof p.image_url === "string" && p.image_url) ||
        (Array.isArray(p.images) && typeof p.images[0] === "string" ? p.images[0] : "") ||
        "";
      return {
        ...(p as unknown as Product),
        thumbnail_url: img,
        category: String(p.category || specs.category || "Apparel"),
      };
    });

  const ratingsMap = await fetchProductRatingSummaries(
    supabaseServer,
    normalized.map((p) => p.id)
  );
  const rated = attachRatingsToProducts(normalized, ratingsMap);
  const finalProducts = parsed ? rankProductsByQueryConcepts(rated, parsed) : rated;

  return {
    products: finalProducts,
    totalSellerProducts: Number(totalCount || finalProducts.length),
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const rawQuery = (searchParams.get("q") || "").trim();
    const includeProducts = searchParams.get("includeProducts") === "1";
    const logSearch = searchParams.get("logSearch") === "1";

    if (rawQuery.length < 2) {
      return NextResponse.json({
        success: true,
        matchedStores: [],
        primaryMatch: null,
      });
    }

    const { sellers, migrationReady } = await loadSellerDirectory();
    if (!migrationReady || sellers.length === 0) {
      return NextResponse.json({
        success: true,
        matchedStores: [],
        primaryMatch: null,
      });
    }

    const { activeMatches, inactiveMatches } = resolveStoreMatches(rawQuery, sellers);

    // STRICT REVENUE GATE:
    // If customer searched an INACTIVE/EXPIRED seller's shop name on committed search,
    // silently log missed_store_searches for FOMO alert & return ZERO store cards!
    if (activeMatches.length === 0) {
      if (logSearch && inactiveMatches.length > 0 && inactiveMatches[0].score >= 700) {
        void incrementStoreMetric(inactiveMatches[0].seller.id, "missed_search");
      }
      return NextResponse.json({
        success: true,
        matchedStores: [],
        primaryMatch: null,
      });
    }

    const topStores = activeMatches.slice(0, 3).map((m) => ({
      id: m.seller.id,
      business_name: m.seller.business_name,
      store_slug: m.seller.store_slug,
      business_logo_url: m.seller.business_logo_url,
      store_banner_url: m.seller.store_banner_url,
      store_tagline: m.seller.store_tagline,
      is_pro_pass: m.seller.store_pass_plan === "store_search_59_28d",
      match_type: m.matchType,
      product_query: m.productQuery,
    }));

    let primaryMatch: {
      store: (typeof topStores)[0];
      matchType: "store_only" | "store_plus_product";
      productQuery: string;
      totalSellerProducts: number;
      products: Product[];
    } | null = null;

    if (includeProducts && activeMatches[0]) {
      const lead = activeMatches[0];
      if (logSearch) {
        void incrementStoreMetric(lead.seller.id, "store_search");
      }
      const { products, totalSellerProducts } = await fetchSellerMatchingProducts(
        lead.seller.id,
        lead.productQuery
      );

      primaryMatch = {
        store: topStores[0],
        matchType: lead.matchType,
        productQuery: lead.productQuery,
        totalSellerProducts,
        products,
      };
    }

    return NextResponse.json({
      success: true,
      matchedStores: topStores,
      primaryMatch,
    });
  } catch (err) {
    console.error("[API /search/stores GET] Error:", err);
    return NextResponse.json({
      success: true,
      matchedStores: [],
      primaryMatch: null,
    });
  }
}
