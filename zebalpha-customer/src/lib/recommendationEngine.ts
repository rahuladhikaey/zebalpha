import { supabaseServer } from "@/lib/supabaseServer";
import { getCachedOrFetch, invalidateCachePattern } from "@/lib/cacheHelper";
import { Product } from "@/lib/types";
import { getSimilarProducts } from "@/lib/similarProducts";
import {
  BehavioralEventRecord,
  PopularitySignal,
  ProductReviewSummary,
  RecommendationEventType,
  RecommendationPlatform,
  RecommendationStrategy,
  RecommendationSurface,
  RecommendedProductCard,
  SellerStatusRecord,
  formatRecommendedProduct,
  isProductEligibleForRecommendation,
  scoreAndRankRecommendations,
} from "@/lib/recommendationScoring";

const CATALOG_FIELDS =
  "id, seller_id, category_id, name, slug, description, price, mrp, image_url, images, brand, stock, stock_count, low_stock_limit, is_active, status, is_approved, approval_status, specifications, packages, is_premium, is_new_drop, collection, target_drop_date, tier, created_at";

const VALID_EVENT_TYPES = new Set<RecommendationEventType>([
  "product_viewed",
  "product_searched",
  "category_viewed",
  "wishlist_added",
  "cart_added",
  "cart_removed",
  "product_purchased",
  "recommendation_clicked",
]);

const VALID_SURFACES = new Set<RecommendationSurface>([
  "suggested_for_you",
  "recently_viewed",
  "similar_products",
  "trending",
  "recommended_page",
]);

export const SESSION_ID_REGEX = /^[a-zA-Z0-9_\-\.]{8,128}$/;
export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function normalizePlatform(raw?: string | null): RecommendationPlatform {
  return String(raw || "").toLowerCase() === "android" ? "android" : "website";
}

export function sanitizeUuid(val?: string | null): string | null {
  if (!val || typeof val !== "string") return null;
  const trimmed = val.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

export function sanitizeSessionId(val?: string | null): string | null {
  if (!val || typeof val !== "string") return null;
  const trimmed = val.trim();
  return SESSION_ID_REGEX.test(trimmed) ? trimmed : null;
}

function isMissingRelationError(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null | undefined;
  const code = String(e?.code || "");
  const msg = String(e?.message || "").toLowerCase();
  return code === "42P01" || msg.includes("does not exist") || msg.includes("relation");
}

interface CachedCatalogSnapshot {
  products: Product[];
  reviews: Record<string, ProductReviewSummary>;
  popularity: Record<string, PopularitySignal>;
}

/**
 * Loads the eligible catalog snapshot + real review ratings + real popularity metrics.
 * Cached across Web + Android API instances for 120 seconds.
 */
async function getCatalogSnapshot(): Promise<{
  products: Product[];
  reviewMap: Map<string, ProductReviewSummary>;
  popularityMap: Map<string, PopularitySignal>;
}> {
  const snapshot = await getCachedOrFetch<CachedCatalogSnapshot>(
    "rec:catalog-snapshot:v1",
    async () => {
      const since30d = new Date(Date.now() - 30 * 86_400_000).toISOString();

      const [prodRes, sellerRes, catRes, revRes, ordersRes, eventsRes] = await Promise.all([
        supabaseServer
          .from("products")
          .select(CATALOG_FIELDS)
          .or("is_active.is.null,is_active.eq.true")
          .order("created_at", { ascending: false })
          .limit(500),
        supabaseServer
          .from("sellers")
          .select("id, status, account_status, is_suspended, is_deleted")
          .limit(1000),
        supabaseServer
          .from("categories")
          .select("id, name, slug")
          .limit(300),
        supabaseServer
          .from("reviews")
          .select("product_id, rating, is_approved")
          .eq("is_approved", true)
          .limit(3000),
        supabaseServer
          .from("orders")
          .select("items, product_details, order_status")
          .gte("created_at", since30d)
          .limit(500),
        supabaseServer
          .from("customer_product_events")
          .select("product_id, event_type")
          .gte("created_at", since30d)
          .in("event_type", ["product_viewed", "cart_added", "wishlist_added", "product_purchased", "recommendation_clicked"])
          .limit(2000),
      ]);

      const sellerMap = new Map<string, SellerStatusRecord>();
      if (Array.isArray(sellerRes.data)) {
        for (const s of sellerRes.data as SellerStatusRecord[]) {
          sellerMap.set(String(s.id), s);
        }
      }

      const catNameMap = new Map<string, string>();
      if (Array.isArray(catRes.data)) {
        for (const c of catRes.data as Array<{ id: string; name?: string | null }>) {
          if (c.id && c.name) catNameMap.set(String(c.id), String(c.name));
        }
      }

      const rawProducts = Array.isArray(prodRes.data) ? (prodRes.data as Product[]) : [];
      const eligibleProducts = rawProducts
        .map((p) => ({
          ...p,
          category_name: p.category_id ? catNameMap.get(String(p.category_id)) || p.category_name : p.category_name,
        }))
        .filter((p) => isProductEligibleForRecommendation(p, sellerMap));

      // Aggregate real approved reviews
      const revAcc = new Map<string, { sum: number; count: number }>();
      if (Array.isArray(revRes.data)) {
        for (const r of revRes.data as Array<{ product_id?: string | null; rating?: number | null }>) {
          const pid = r.product_id ? String(r.product_id) : "";
          const rating = Number(r.rating);
          if (!pid || !Number.isFinite(rating) || rating <= 0) continue;
          const prev = revAcc.get(pid) || { sum: 0, count: 0 };
          prev.sum += rating;
          prev.count += 1;
          revAcc.set(pid, prev);
        }
      }
      const reviews: Record<string, ProductReviewSummary> = {};
      for (const [pid, acc] of revAcc.entries()) {
        reviews[pid] = {
          avg: Number((acc.sum / acc.count).toFixed(1)),
          count: acc.count,
        };
      }

      // Aggregate real order volume & interaction signals
      const popAcc = new Map<string, PopularitySignal>();
      const bumpPop = (pid: string, ordersDelta: number, eventsDelta: number) => {
        if (!pid) return;
        const curr = popAcc.get(pid) || { orderCount: 0, eventScore: 0 };
        curr.orderCount += ordersDelta;
        curr.eventScore += eventsDelta;
        popAcc.set(pid, curr);
      };

      if (Array.isArray(ordersRes.data)) {
        type OrderLineRow = { product_id?: string; id?: string; quantity?: number };
        type OrderRow = { order_status?: string | null; items?: OrderLineRow[] | null; product_details?: OrderLineRow[] | null };
        for (const ord of ordersRes.data as OrderRow[]) {
          if (String(ord.order_status || "").toLowerCase() === "cancelled") continue;
          const lineItems = Array.isArray(ord.items) && ord.items.length > 0 ? ord.items : ord.product_details;
          if (!Array.isArray(lineItems)) continue;
          for (const it of lineItems) {
            const pid = it?.product_id || it?.id;
            const qty = Math.max(1, Number(it?.quantity || 1));
            if (pid) bumpPop(String(pid), qty, 0);
          }
        }
      }

      if (!eventsRes.error && Array.isArray(eventsRes.data)) {
        const EVENT_POP_POINTS: Record<string, number> = {
          product_viewed: 1,
          recommendation_clicked: 2,
          wishlist_added: 3,
          cart_added: 4,
          product_purchased: 6,
        };
        for (const ev of eventsRes.data as Array<{ product_id?: string | null; event_type: string }>) {
          if (ev.product_id) {
            bumpPop(String(ev.product_id), 0, EVENT_POP_POINTS[ev.event_type] ?? 1);
          }
        }
      }

      const popularity: Record<string, PopularitySignal> = {};
      for (const [pid, val] of popAcc.entries()) {
        popularity[pid] = val;
      }

      return {
        products: eligibleProducts,
        reviews,
        popularity,
      };
    },
    120
  );

  return {
    products: snapshot.products,
    reviewMap: new Map(Object.entries(snapshot.reviews)),
    popularityMap: new Map(Object.entries(snapshot.popularity)),
  };
}

/**
 * Fetches personalized user/session signals (events, orders, wishlist, cart).
 */
async function loadActorSignals(userId: string | null, sessionId: string | null) {
  const events: BehavioralEventRecord[] = [];
  const purchasedProductIds = new Set<string>();
  const purchasedCategoryIds = new Set<string>();
  const wishlistProductIds = new Set<string>();
  const cartProductIds = new Set<string>();

  if (!userId && !sessionId) {
    return {
      events,
      purchasedProductIds,
      purchasedCategoryIds,
      wishlistProductIds,
      cartProductIds,
    };
  }

  const eventQuery = (() => {
    const q = supabaseServer
      .from("customer_product_events")
      .select("user_id, session_id, product_id, category_id, event_type, platform, search_query, metadata, created_at")
      .order("created_at", { ascending: false })
      .limit(150);
    if (userId && sessionId) {
      return q.or(`user_id.eq.${userId},session_id.eq.${sessionId}`);
    }
    if (userId) return q.eq("user_id", userId);
    return q.eq("session_id", sessionId!);
  })();

  const ordersQuery = userId
    ? supabaseServer
        .from("orders")
        .select("items, product_details, order_status")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30)
    : Promise.resolve({ data: [], error: null });

  const wishlistQuery = userId
    ? supabaseServer.from("wishlists").select("product_id").eq("user_id", userId).limit(50)
    : Promise.resolve({ data: [], error: null });

  const cartQuery = userId
    ? supabaseServer.from("cart_items").select("product_id").eq("user_id", userId).limit(50)
    : Promise.resolve({ data: [], error: null });

  const [evRes, ordRes, wishRes, cartRes] = await Promise.all([
    eventQuery,
    ordersQuery,
    wishlistQuery,
    cartQuery,
  ]);

  if (!evRes.error && Array.isArray(evRes.data)) {
    for (const row of evRes.data as BehavioralEventRecord[]) {
      events.push(row);
      if (row.event_type === "product_purchased" && row.product_id) {
        purchasedProductIds.add(String(row.product_id));
        if (row.category_id) purchasedCategoryIds.add(String(row.category_id));
      }
    }
  } else if (evRes.error && !isMissingRelationError(evRes.error)) {
    console.warn("[RecEngine Events Query Warning]:", evRes.error.message);
  }

  if (Array.isArray(ordRes.data)) {
    type ActorOrderLine = { product_id?: string; id?: string; category_id?: string };
    type ActorOrderRow = { order_status?: string | null; items?: ActorOrderLine[] | null; product_details?: ActorOrderLine[] | null };
    for (const ord of ordRes.data as ActorOrderRow[]) {
      if (String(ord.order_status || "").toLowerCase() === "cancelled") continue;
      const lineItems = Array.isArray(ord.items) && ord.items.length > 0 ? ord.items : ord.product_details;
      if (!Array.isArray(lineItems)) continue;
      for (const it of lineItems) {
        const pid = it?.product_id || it?.id;
        if (pid) purchasedProductIds.add(String(pid));
        if (it?.category_id) purchasedCategoryIds.add(String(it.category_id));
      }
    }
  }

  if (Array.isArray(wishRes.data)) {
    for (const w of wishRes.data as Array<{ product_id?: string | null }>) {
      if (w.product_id) wishlistProductIds.add(String(w.product_id));
    }
  }

  if (Array.isArray(cartRes.data)) {
    for (const c of cartRes.data as Array<{ product_id?: string | null }>) {
      if (c.product_id) cartProductIds.add(String(c.product_id));
    }
  }

  return {
    events,
    purchasedProductIds,
    purchasedCategoryIds,
    wishlistProductIds,
    cartProductIds,
  };
}

export interface PaginatedRecommendationsResponse {
  items: RecommendedProductCard[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  strategy: RecommendationStrategy;
  personalized: boolean;
}

/**
 * Generates paginated personalized "Suggested for You" recommendations
 * unified across Web & Android using identical signals and active catalog eligibility.
 */
export async function getForYouRecommendations(params: {
  userId?: string | null;
  sessionId?: string | null;
  page?: number;
  limit?: number;
  excludeProductIds?: string[];
}): Promise<PaginatedRecommendationsResponse> {
  const userId = sanitizeUuid(params.userId);
  const sessionId = sanitizeSessionId(params.sessionId);
  const page = Math.max(1, Math.min(20, Number(params.page) || 1));
  const limit = Math.max(1, Math.min(40, Number(params.limit) || 12));
  const actorKey = userId ? `u:${userId}` : sessionId ? `s:${sessionId}` : "anon";
  const excludeKey = (params.excludeProductIds || []).slice(0, 10).join(",");

  return getCachedOrFetch<PaginatedRecommendationsResponse>(
    `rec:for-you:${actorKey}:p${page}:l${limit}:ex${excludeKey}`,
    async () => {
      try {
        const [{ products, reviewMap, popularityMap }, actorSignals] = await Promise.all([
          getCatalogSnapshot(),
          loadActorSignals(userId, sessionId),
        ]);

        if (products.length === 0) {
          return {
            items: [],
            total: 0,
            page,
            limit,
            hasMore: false,
            strategy: "trending_fallback",
            personalized: false,
          };
        }

        const excludeSet = new Set(
          (params.excludeProductIds || []).map((id) => String(id).trim()).filter(Boolean)
        );

        const ranked = scoreAndRankRecommendations({
          catalog: products,
          events: actorSignals.events,
          purchasedProductIds: actorSignals.purchasedProductIds,
          purchasedCategoryIds: actorSignals.purchasedCategoryIds,
          wishlistProductIds: actorSignals.wishlistProductIds,
          cartProductIds: actorSignals.cartProductIds,
          reviewMap,
          popularityMap,
          excludeProductIds: excludeSet,
        });

        const offset = (page - 1) * limit;
        const pageItems = ranked.items.slice(offset, offset + limit);

        return {
          items: pageItems,
          total: ranked.totalEligible,
          page,
          limit,
          hasMore: offset + pageItems.length < ranked.totalEligible,
          strategy: ranked.dominantStrategy,
          personalized: ranked.hasPersonalizationSignals,
        };
      } catch (err) {
        console.error("[RecEngine getForYouRecommendations Error]:", err);
        return {
          items: [],
          total: 0,
          page,
          limit,
          hasMore: false,
          strategy: "trending_fallback",
          personalized: false,
        };
      }
    },
    userId || sessionId ? 45 : 120
  );
}

/**
 * Fetches trending / popular / bestselling eligible products.
 */
export async function getTrendingProducts(params: {
  page?: number;
  limit?: number;
}): Promise<PaginatedRecommendationsResponse> {
  const page = Math.max(1, Math.min(20, Number(params.page) || 1));
  const limit = Math.max(1, Math.min(40, Number(params.limit) || 12));

  return getCachedOrFetch<PaginatedRecommendationsResponse>(
    `rec:trending:p${page}:l${limit}`,
    async () => {
      try {
        const { products, reviewMap, popularityMap } = await getCatalogSnapshot();
        if (products.length === 0) {
          return {
            items: [],
            total: 0,
            page,
            limit,
            hasMore: false,
            strategy: "trending_fallback",
            personalized: false,
          };
        }

        const ranked = scoreAndRankRecommendations({
          catalog: products,
          events: [],
          purchasedProductIds: new Set(),
          purchasedCategoryIds: new Set(),
          wishlistProductIds: new Set(),
          cartProductIds: new Set(),
          reviewMap,
          popularityMap,
        });

        const offset = (page - 1) * limit;
        const pageItems = ranked.items.slice(offset, offset + limit);
        return {
          items: pageItems,
          total: ranked.totalEligible,
          page,
          limit,
          hasMore: offset + pageItems.length < ranked.totalEligible,
          strategy: "trending_fallback",
          personalized: false,
        };
      } catch (err) {
        console.error("[RecEngine getTrendingProducts Error]:", err);
        return {
          items: [],
          total: 0,
          page,
          limit,
          hasMore: false,
          strategy: "trending_fallback",
          personalized: false,
        };
      }
    },
    120
  );
}

/**
 * Fetches recently viewed eligible products for the customer or anonymous session.
 * Kept strictly separate from Suggested for You.
 */
export async function getRecentlyViewedProducts(params: {
  userId?: string | null;
  sessionId?: string | null;
  page?: number;
  limit?: number;
  excludeProductId?: string | null;
}): Promise<PaginatedRecommendationsResponse> {
  const userId = sanitizeUuid(params.userId);
  const sessionId = sanitizeSessionId(params.sessionId);
  const excludeId = sanitizeUuid(params.excludeProductId);
  const page = Math.max(1, Math.min(10, Number(params.page) || 1));
  const limit = Math.max(1, Math.min(30, Number(params.limit) || 12));

  if (!userId && !sessionId) {
    return {
      items: [],
      total: 0,
      page,
      limit,
      hasMore: false,
      strategy: "browsing_affinity",
      personalized: false,
    };
  }

  try {
    const [evRes, { products, reviewMap, popularityMap }] = await Promise.all([
      (() => {
        const q = supabaseServer
          .from("customer_product_events")
          .select("product_id, created_at")
          .eq("event_type", "product_viewed")
          .not("product_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(80);
        if (userId && sessionId) return q.or(`user_id.eq.${userId},session_id.eq.${sessionId}`);
        if (userId) return q.eq("user_id", userId);
        return q.eq("session_id", sessionId!);
      })(),
      getCatalogSnapshot(),
    ]);

    if (evRes.error || !Array.isArray(evRes.data) || evRes.data.length === 0) {
      return {
        items: [],
        total: 0,
        page,
        limit,
        hasMore: false,
        strategy: "browsing_affinity",
        personalized: false,
      };
    }

    const catalogById = new Map(products.map((p) => [String(p.id), p]));
    const orderedUnique: RecommendedProductCard[] = [];
    const seen = new Set<string>();

    for (const row of evRes.data as Array<{ product_id?: string | null }>) {
      const pid = row.product_id ? String(row.product_id) : "";
      if (!pid || seen.has(pid) || (excludeId && pid === excludeId)) continue;
      const prod = catalogById.get(pid);
      if (!prod) continue;
      seen.add(pid);
      orderedUnique.push(
        formatRecommendedProduct(prod, "browsing_affinity", 100 - orderedUnique.length, reviewMap, popularityMap)
      );
    }

    const offset = (page - 1) * limit;
    const pageItems = orderedUnique.slice(offset, offset + limit);

    return {
      items: pageItems,
      total: orderedUnique.length,
      page,
      limit,
      hasMore: offset + pageItems.length < orderedUnique.length,
      strategy: "browsing_affinity",
      personalized: orderedUnique.length > 0,
    };
  } catch (err) {
    console.error("[RecEngine getRecentlyViewedProducts Error]:", err);
    return {
      items: [],
      total: 0,
      page,
      limit,
      hasMore: false,
      strategy: "browsing_affinity",
      personalized: false,
    };
  }
}

/**
 * Fetches similar products for a given productId reusing the taxonomy similarity engine
 * plus seller/approval/availability filtering.
 */
export async function getSimilarRecommendations(productId: string, limit = 12): Promise<RecommendedProductCard[]> {
  const safeId = sanitizeUuid(productId);
  if (!safeId) return [];

  try {
    const [{ products, reviewMap, popularityMap }] = await Promise.all([getCatalogSnapshot()]);
    const currentProduct = products.find((p) => String(p.id) === safeId);
    let targetProduct = currentProduct;

    if (!targetProduct) {
      const { data } = await supabaseServer
        .from("products")
        .select(CATALOG_FIELDS)
        .eq("id", safeId)
        .maybeSingle();
      if (!data) return [];
      targetProduct = data as Product;
    }

    const similarRaw = await getSimilarProducts(targetProduct, Math.max(limit * 2, 16));
    const eligibleIds = new Set(products.map((p) => String(p.id)));
    const catalogById = new Map(products.map((p) => [String(p.id), p]));

    const filtered: RecommendedProductCard[] = [];
    for (const item of similarRaw) {
      const id = String(item.id);
      if (!eligibleIds.has(id) || id === safeId) continue;
      const freshProd = catalogById.get(id) || item;
      filtered.push(
        formatRecommendedProduct(
          freshProd,
          "product_similarity",
          100 - filtered.length,
          reviewMap,
          popularityMap
        )
      );
      if (filtered.length >= limit) break;
    }
    return filtered;
  } catch (err) {
    console.error("[RecEngine getSimilarRecommendations Error]:", err);
    return [];
  }
}

export async function invalidateActorRecommendationCache(userId?: string | null, sessionId?: string | null) {
  const tasks: Promise<void>[] = [];
  if (userId) tasks.push(invalidateCachePattern(`rec:for-you:u:${userId}:*`));
  if (sessionId) tasks.push(invalidateCachePattern(`rec:for-you:s:${sessionId}:*`));
  await Promise.allSettled(tasks);
}

/**
 * Validates & records a customer behavioral event with duplicate-window protection
 * and cross-funnel attribution updates for recommendation clicks.
 */
export async function recordCustomerEvent(params: {
  userId?: string | null;
  sessionId: string;
  eventType: string;
  productId?: string | null;
  categoryId?: string | null;
  platform?: string | null;
  searchQuery?: string | null;
  recommendationSurface?: string | null;
  recommendationStrategy?: string | null;
  metadata?: Record<string, unknown> | null;
}): Promise<{ recorded: boolean; warning?: string }> {
  const sessionId = sanitizeSessionId(params.sessionId);
  if (!sessionId) {
    return { recorded: false, warning: "Invalid sessionId" };
  }

  const eventType = String(params.eventType || "").trim() as RecommendationEventType;
  if (!VALID_EVENT_TYPES.has(eventType)) {
    return { recorded: false, warning: "Unsupported eventType" };
  }

  const userId = sanitizeUuid(params.userId);
  const productId = sanitizeUuid(params.productId);
  let categoryId = sanitizeUuid(params.categoryId);
  const platform = normalizePlatform(params.platform);
  const searchQuery =
    typeof params.searchQuery === "string"
      ? params.searchQuery.trim().slice(0, 160) || null
      : null;

  if (productId && !categoryId) {
    const { data: prodRow } = await supabaseServer
      .from("products")
      .select("category_id")
      .eq("id", productId)
      .maybeSingle();
    if (prodRow?.category_id) categoryId = String(prodRow.category_id);
  }

  // Deduplicate rapid repeated events within short windows (120s for view/search, 30s for cart/wishlist)
  const windowSec = eventType === "product_viewed" || eventType === "product_searched" ? 120 : 20;
  const timeBucket = Math.floor(Date.now() / (windowSec * 1000));
  const actorToken = userId || sessionId;
  const targetToken = productId || categoryId || (searchQuery ? searchQuery.toLowerCase().slice(0, 40) : "none");
  const dedupKey =
    eventType === "product_purchased"
      ? null
      : `${actorToken}:${eventType}:${targetToken}:${timeBucket}`.slice(0, 175);

  const safeSurface =
    params.recommendationSurface && VALID_SURFACES.has(params.recommendationSurface as RecommendationSurface)
      ? params.recommendationSurface
      : null;

  const insertPayload = {
    user_id: userId,
    session_id: sessionId,
    product_id: productId,
    category_id: categoryId,
    event_type: eventType,
    platform,
    search_query: searchQuery,
    recommendation_surface: safeSurface,
    recommendation_strategy:
      typeof params.recommendationStrategy === "string"
        ? params.recommendationStrategy.slice(0, 64)
        : null,
    metadata: params.metadata && typeof params.metadata === "object" ? params.metadata : {},
    dedup_key: dedupKey,
  };

  try {
    const { error } = dedupKey
      ? await supabaseServer
          .from("customer_product_events")
          .upsert(insertPayload, { onConflict: "dedup_key", ignoreDuplicates: true })
      : await supabaseServer.from("customer_product_events").insert(insertPayload);

    if (error && !isMissingRelationError(error)) {
      return { recorded: false, warning: error.message };
    }

    // Attribution: mark recent recommendation click for this product as cart/wishlist converted
    if (productId && (eventType === "cart_added" || eventType === "wishlist_added")) {
      const lookbackIso = new Date(Date.now() - 48 * 3_600_000).toISOString();
      const updateField = eventType === "cart_added" ? { added_to_cart: true } : { added_to_wishlist: true };
      const clickQuery = supabaseServer
        .from("recommendation_click_events")
        .update(updateField)
        .eq("product_id", productId)
        .gte("created_at", lookbackIso);
      if (userId) await clickQuery.eq("user_id", userId);
      else await clickQuery.eq("session_id", sessionId);
    }

    await invalidateActorRecommendationCache(userId, sessionId);
    return { recorded: true };
  } catch (err: unknown) {
    return { recorded: false, warning: err instanceof Error ? err.message : "Event logging error" };
  }
}

/**
 * Records deduplicated recommendation card impressions in batches.
 */
export async function recordRecommendationImpressions(params: {
  userId?: string | null;
  sessionId: string;
  platform?: string | null;
  surface: string;
  items: Array<{ productId: string; categoryId?: string | null; strategy?: string; positionIndex?: number }>;
}): Promise<{ count: number; warning?: string }> {
  const sessionId = sanitizeSessionId(params.sessionId);
  if (!sessionId) return { count: 0, warning: "Invalid sessionId" };
  if (!VALID_SURFACES.has(params.surface as RecommendationSurface)) {
    return { count: 0, warning: "Invalid surface" };
  }

  const userId = sanitizeUuid(params.userId);
  const platform = normalizePlatform(params.platform);
  const hourBucket = Math.floor(Date.now() / (30 * 60 * 1000)); // 30-min impression dedup window
  const actorToken = userId || sessionId;

  const rows = (params.items || [])
    .slice(0, 25)
    .map((item, idx) => {
      const pid = sanitizeUuid(item.productId);
      if (!pid) return null;
      return {
        user_id: userId,
        session_id: sessionId,
        product_id: pid,
        category_id: sanitizeUuid(item.categoryId),
        surface: params.surface,
        strategy: String(item.strategy || "hybrid").slice(0, 64),
        position_index: Number.isFinite(Number(item.positionIndex)) ? Math.max(0, Number(item.positionIndex)) : idx,
        platform,
        impression_token: `${actorToken}:${params.surface}:${pid}:${hourBucket}`.slice(0, 175),
      };
    })
    .filter(Boolean) as Array<Record<string, unknown>>;

  if (rows.length === 0) return { count: 0 };

  try {
    const { error } = await supabaseServer
      .from("product_recommendation_impressions")
      .upsert(rows, { onConflict: "impression_token", ignoreDuplicates: true });
    if (error && !isMissingRelationError(error)) {
      return { count: 0, warning: error.message };
    }
    return { count: rows.length };
  } catch (err: unknown) {
    return { count: 0, warning: err instanceof Error ? err.message : "Impression error" };
  }
}

/**
 * Records a recommendation click event for CTR and conversion attribution.
 */
export async function recordRecommendationClick(params: {
  userId?: string | null;
  sessionId: string;
  productId: string;
  categoryId?: string | null;
  surface: string;
  strategy?: string | null;
  positionIndex?: number;
  platform?: string | null;
}): Promise<{ recorded: boolean; warning?: string }> {
  const sessionId = sanitizeSessionId(params.sessionId);
  const productId = sanitizeUuid(params.productId);
  if (!sessionId || !productId) return { recorded: false, warning: "Invalid sessionId or productId" };

  const surface = VALID_SURFACES.has(params.surface as RecommendationSurface)
    ? params.surface
    : "suggested_for_you";
  const userId = sanitizeUuid(params.userId);
  const platform = normalizePlatform(params.platform);
  const strategy = String(params.strategy || "hybrid").slice(0, 64);

  let categoryId = sanitizeUuid(params.categoryId);
  if (!categoryId) {
    const { data: prod } = await supabaseServer
      .from("products")
      .select("category_id")
      .eq("id", productId)
      .maybeSingle();
    if (prod?.category_id) categoryId = String(prod.category_id);
  }

  try {
    const { error } = await supabaseServer.from("recommendation_click_events").insert({
      user_id: userId,
      session_id: sessionId,
      product_id: productId,
      category_id: categoryId,
      surface,
      strategy,
      position_index: Number.isFinite(Number(params.positionIndex)) ? Math.max(0, Number(params.positionIndex)) : 0,
      platform,
    });

    if (error && !isMissingRelationError(error)) {
      return { recorded: false, warning: error.message };
    }

    await recordCustomerEvent({
      userId,
      sessionId,
      eventType: "recommendation_clicked",
      productId,
      categoryId,
      platform,
      recommendationSurface: surface,
      recommendationStrategy: strategy,
    });

    return { recorded: true };
  } catch (err: unknown) {
    return { recorded: false, warning: err instanceof Error ? err.message : "Click logging error" };
  }
}

/**
 * Server-side order purchase tracker and recommendation purchase attribution updater.
 * Executed cleanly upon COD and online payment order creation.
 */
export async function recordOrderPurchaseEvents(params: {
  userId?: string | null;
  sessionId?: string | null;
  orderId: string;
  items: Array<{
    product_id?: string;
    id?: string;
    productId?: string;
    category_id?: string | null;
    quantity?: number;
    price?: number;
  }>;
  platform?: string | null;
}): Promise<void> {
  const userId = sanitizeUuid(params.userId);
  const sessionId = sanitizeSessionId(params.sessionId) || (userId ? `order_${userId}` : `order_${params.orderId.slice(0, 24)}`);
  const orderUuid = sanitizeUuid(params.orderId);
  const platform = normalizePlatform(params.platform);
  const lookbackIso = new Date(Date.now() - 7 * 86_400_000).toISOString();

  for (const item of params.items || []) {
    const pid = sanitizeUuid(item?.product_id || item?.id || item?.productId);
    if (!pid) continue;
    const catId = sanitizeUuid(item?.category_id);
    const qty = Math.max(1, Number(item?.quantity || 1));
    const unitPrice = Math.max(0, Number(item?.price || 0));

    await recordCustomerEvent({
      userId,
      sessionId,
      eventType: "product_purchased",
      productId: pid,
      categoryId: catId,
      platform,
      metadata: {
        order_id: orderUuid || params.orderId,
        quantity: qty,
        revenue: unitPrice * qty,
      },
    });

    // Attribute purchase back to latest matching recommendation click within 7 days
    try {
      let query = supabaseServer
        .from("recommendation_click_events")
        .select("id")
        .eq("product_id", pid)
        .eq("purchased", false)
        .gte("created_at", lookbackIso)
        .order("created_at", { ascending: false })
        .limit(1);

      if (userId) query = query.eq("user_id", userId);
      else query = query.eq("session_id", sessionId);

      const { data: clickMatch } = await query.maybeSingle();
      if (clickMatch?.id) {
        await supabaseServer
          .from("recommendation_click_events")
          .update({
            purchased: true,
            attributed_order_id: orderUuid,
            attributed_revenue: Number((unitPrice * qty).toFixed(2)),
            attributed_at: new Date().toISOString(),
          })
          .eq("id", clickMatch.id);
      }
    } catch {
      // Non-critical attribution should never break order completion
    }
  }
}

/**
 * Securely merges an anonymous visitor session's recent recommendation activity into an authenticated user.
 */
export async function mergeAnonymousSessionToUser(params: {
  sessionId: string;
  userId: string;
}): Promise<{ mergedEvents: number; mergedImpressions: number; mergedClicks: number }> {
  const sessionId = sanitizeSessionId(params.sessionId);
  const userId = sanitizeUuid(params.userId);
  if (!sessionId || !userId) {
    return { mergedEvents: 0, mergedImpressions: 0, mergedClicks: 0 };
  }

  try {
    const { data, error } = await supabaseServer.rpc("merge_anonymous_recommendation_events", {
      p_session_id: sessionId,
      p_user_id: userId,
    });

    await invalidateActorRecommendationCache(userId, sessionId);

    if (!error && data && typeof data === "object") {
      const payload = data as Record<string, number>;
      return {
        mergedEvents: Number(payload.merged_events || 0),
        mergedImpressions: Number(payload.merged_impressions || 0),
        mergedClicks: Number(payload.merged_clicks || 0),
      };
    }

    // Fallback SQL updates if RPC hasn't been deployed yet
    const cutoffIso = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const [evRes, impRes, clkRes] = await Promise.all([
      supabaseServer
        .from("customer_product_events")
        .update({ user_id: userId })
        .eq("session_id", sessionId)
        .is("user_id", null)
        .gte("created_at", cutoffIso),
      supabaseServer
        .from("product_recommendation_impressions")
        .update({ user_id: userId })
        .eq("session_id", sessionId)
        .is("user_id", null)
        .gte("created_at", cutoffIso),
      supabaseServer
        .from("recommendation_click_events")
        .update({ user_id: userId })
        .eq("session_id", sessionId)
        .is("user_id", null)
        .gte("created_at", cutoffIso),
    ]);

    return {
      mergedEvents: evRes.error ? 0 : 1,
      mergedImpressions: impRes.error ? 0 : 1,
      mergedClicks: clkRes.error ? 0 : 1,
    };
  } catch {
    return { mergedEvents: 0, mergedImpressions: 0, mergedClicks: 0 };
  }
}
