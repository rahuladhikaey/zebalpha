import { Product } from "@/lib/types";
import { getProductDisplayPricing } from "@/lib/productPricing";
import { isProductNewDrop, isDropLive } from "@/lib/dropUtils";
import { detectProductFamily } from "@/lib/similarProducts";

export type RecommendationEventType =
  | "product_viewed"
  | "product_searched"
  | "category_viewed"
  | "wishlist_added"
  | "cart_added"
  | "cart_removed"
  | "product_purchased"
  | "recommendation_clicked";

export type RecommendationPlatform = "android" | "website";

export type RecommendationSurface =
  | "suggested_for_you"
  | "recently_viewed"
  | "similar_products"
  | "trending"
  | "recommended_page";

export type RecommendationStrategy =
  | "search_intent"
  | "browsing_affinity"
  | "purchase_cross_sell"
  | "category_affinity"
  | "wishlist_cart"
  | "product_similarity"
  | "trending_fallback";

export interface SellerStatusRecord {
  id: string;
  status?: string | null;
  account_status?: string | null;
  is_suspended?: boolean | null;
  is_deleted?: boolean | null;
}

export interface ProductReviewSummary {
  avg: number;
  count: number;
}

export interface PopularitySignal {
  orderCount: number;
  eventScore: number;
}

export interface BehavioralEventRecord {
  user_id?: string | null;
  session_id?: string | null;
  product_id?: string | null;
  category_id?: string | null;
  event_type: RecommendationEventType | string;
  platform?: RecommendationPlatform | string | null;
  search_query?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface RecommendedProductCard extends Product {
  discount_percentage?: number;
  rating?: number;
  review_count?: number;
  is_bestseller: boolean;
  badge_label?: string;
  thumbnail_url: string;
  recommendation_strategy: RecommendationStrategy;
  recommendation_score: number;
}

export interface RecommendationRankingResult {
  items: RecommendedProductCard[];
  dominantStrategy: RecommendationStrategy;
  hasPersonalizationSignals: boolean;
  totalEligible: number;
}

const INACTIVE_PRODUCT_STATUSES = new Set([
  "BLOCKED",
  "DELETED",
  "ARCHIVED",
  "OUT_OF_STOCK",
  "COMING_SOON",
  "INACTIVE",
  "SUSPENDED",
  "DRAFT",
  "REJECTED",
]);

const DISALLOWED_APPROVAL_STATUSES = new Set([
  "rejected",
  "pending",
  "suspended",
  "suspended_by_merchant_admin",
  "blocked",
  "deleted",
  "draft",
]);

const COMPLEMENTARY_FAMILIES: Record<string, string[]> = {
  tshirts: ["footwear", "bags", "tshirts"],
  kurtis: ["sarees", "footwear", "bags", "kurtis"],
  sarees: ["kurtis", "footwear", "bags", "sarees"],
  footwear: ["tshirts", "bags", "kurtis"],
  bags: ["tshirts", "kurtis", "sarees", "footwear"],
};

/**
 * Resolves the best display image URL for a real catalog product.
 */
export function resolveProductImage(product: Partial<Product>): string {
  if (typeof product.image_url === "string" && product.image_url.trim().length > 0) {
    return product.image_url.trim();
  }
  if (Array.isArray(product.images)) {
    const first = product.images.find((u) => typeof u === "string" && u.trim().length > 0);
    if (first) return first.trim();
  }
  return "";
}

/**
 * Computes effective available inventory considering product variants when defined.
 */
export function getAvailableStock(product: Product): number {
  const pkgList = Array.isArray(product.packages) ? product.packages : [];
  if (pkgList.length > 0) {
    let totalPkgStock = 0;
    let hasExplicitPkgStock = false;
    for (const pkg of pkgList) {
      if (pkg && pkg.stock !== undefined && pkg.stock !== null && !isNaN(Number(pkg.stock))) {
        hasExplicitPkgStock = true;
        totalPkgStock += Math.max(0, Number(pkg.stock));
      }
    }
    if (hasExplicitPkgStock) {
      return Math.max(totalPkgStock, Number(product.stock ?? 0));
    }
  }
  const baseStock = product.stock ?? (product as Product & { stock_count?: number }).stock_count ?? 0;
  return Number.isFinite(Number(baseStock)) ? Math.max(0, Number(baseStock)) : 0;
}

/**
 * Enforces business rules: ONLY real, approved, active, in-stock products with active sellers
 * and valid images/prices may ever enter recommendations.
 */
export function isProductEligibleForRecommendation(
  product: Product | null | undefined,
  sellerMap?: Map<string, SellerStatusRecord>
): boolean {
  if (!product || !product.id || !product.name || !String(product.name).trim()) {
    return false;
  }

  // Must have real valid price and image
  const pricing = getProductDisplayPricing(product);
  if (!Number.isFinite(pricing.price) || pricing.price <= 0) {
    return false;
  }
  if (!resolveProductImage(product)) {
    return false;
  }

  // Listing lifecycle & approval checks
  if (product.is_active === false) return false;
  if (product.is_approved === false) return false;

  const approvalRaw = (product.approval_status || "").toString().trim().toLowerCase();
  if (approvalRaw && DISALLOWED_APPROVAL_STATUSES.has(approvalRaw)) {
    return false;
  }
  if (approvalRaw && approvalRaw !== "approved") {
    return false;
  }

  const statusUpper = (product.status || "").toString().trim().toUpperCase();
  if (statusUpper && INACTIVE_PRODUCT_STATUSES.has(statusUpper)) {
    return false;
  }

  // Upcoming drops remain hidden until live release
  if (isProductNewDrop(product) && !isDropLive(product)) {
    return false;
  }

  // Must have valid purchasable inventory
  if (getAvailableStock(product) <= 0) {
    return false;
  }

  // Verify seller listing health if seller table record exists
  if (sellerMap && product.seller_id) {
    const seller = sellerMap.get(String(product.seller_id));
    if (seller) {
      if (seller.is_suspended === true || seller.is_deleted === true) {
        return false;
      }
      const sellerStatus = (seller.status || "").toLowerCase();
      if (["suspended", "rejected", "deleted", "blocked", "inactive"].includes(sellerStatus)) {
        return false;
      }
      const accStatus = (seller.account_status || "").toLowerCase();
      if (["suspended", "deleted", "blocked", "inactive"].includes(accStatus)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Formats an eligible Product into a strict storefront recommendation card payload.
 * Never fabricates MRP, discount percentages, ratings, or review counts.
 */
export function formatRecommendedProduct(
  product: Product,
  strategy: RecommendationStrategy,
  score: number,
  reviewMap?: Map<string, ProductReviewSummary>,
  popularityMap?: Map<string, PopularitySignal>
): RecommendedProductCard {
  const pricing = getProductDisplayPricing(product);
  const reviewSummary = reviewMap?.get(String(product.id));
  const popularity = popularityMap?.get(String(product.id));

  const hasValidReview = Boolean(reviewSummary && reviewSummary.count > 0 && reviewSummary.avg > 0);
  const rating = hasValidReview ? reviewSummary!.avg : undefined;
  const reviewCount = hasValidReview ? reviewSummary!.count : undefined;

  const orderCount = popularity?.orderCount ?? 0;
  const isBestseller =
    orderCount >= 3 ||
    Boolean(rating && reviewCount && rating >= 4.2 && reviewCount >= 3);

  let badgeLabel: string | undefined;
  if (isBestseller) {
    badgeLabel = "Bestseller";
  } else if (product.is_premium || product.tier === "PREMIUM") {
    badgeLabel = "Premium";
  } else if (pricing.hasDiscount && pricing.discountPercent >= 40) {
    badgeLabel = "Hot Deal";
  }

  return {
    ...product,
    price: pricing.price,
    mrp: pricing.hasDiscount ? pricing.mrp : undefined,
    discount_percentage: pricing.hasDiscount ? pricing.discountPercent : undefined,
    rating,
    review_count: reviewCount,
    is_bestseller: isBestseller,
    badge_label: badgeLabel,
    thumbnail_url: resolveProductImage(product),
    recommendation_strategy: strategy,
    recommendation_score: Number(score.toFixed(2)),
  };
}

function buildSearchableText(product: Product): string {
  const specs = product.specifications ? JSON.stringify(product.specifications) : "";
  return [
    product.name,
    product.brand,
    product.category,
    product.category_name,
    product.collection,
    product.description,
    specs,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function extractTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2);
}

function recencyWeight(createdAt: string | undefined, nowMs: number, halfLifeHours = 72): number {
  if (!createdAt) return 0.5;
  const ts = new Date(createdAt).getTime();
  if (!Number.isFinite(ts)) return 0.5;
  const ageHours = Math.max(0, (nowMs - ts) / 3_600_000);
  return Math.max(0.15, Math.exp(-ageHours / halfLifeHours));
}

function getSpecValue(product: Product, key: string): string {
  const val = (product.specifications as Record<string, unknown> | undefined)?.[key];
  return typeof val === "string" ? val.trim().toLowerCase() : "";
}

/**
 * Deterministic multi-strategy personalized recommendation ranker.
 * Implements Search-based, Browsing-based, Purchase-based, Category-based,
 * Product Similarity, and Popularity fallback over real eligible products only.
 */
export function scoreAndRankRecommendations(params: {
  catalog: Product[];
  events: BehavioralEventRecord[];
  purchasedProductIds: Set<string>;
  purchasedCategoryIds: Set<string>;
  wishlistProductIds: Set<string>;
  cartProductIds: Set<string>;
  reviewMap?: Map<string, ProductReviewSummary>;
  popularityMap?: Map<string, PopularitySignal>;
  excludeProductIds?: Set<string>;
  nowMs?: number;
}): RecommendationRankingResult {
  const {
    catalog,
    events,
    purchasedProductIds,
    purchasedCategoryIds,
    wishlistProductIds,
    cartProductIds,
    reviewMap,
    popularityMap,
    excludeProductIds,
    nowMs = Date.now(),
  } = params;

  if (!catalog || catalog.length === 0) {
    return {
      items: [],
      dominantStrategy: "trending_fallback",
      hasPersonalizationSignals: false,
      totalEligible: 0,
    };
  }

  const productById = new Map<string, Product>();
  const taxonomyById = new Map<string, ReturnType<typeof detectProductFamily>>();
  const textById = new Map<string, string>();

  for (const prod of catalog) {
    const id = String(prod.id);
    productById.set(id, prod);
    taxonomyById.set(id, detectProductFamily(prod));
    textById.set(id, buildSearchableText(prod));
  }

  // Aggregate customer behavioral profile
  const searchTerms: Array<{ query: string; tokens: string[]; family: string; weight: number }> = [];
  const categoryAffinity = new Map<string, number>();
  const familyAffinity = new Map<string, number>();
  const brandAffinity = new Map<string, number>();
  const attributeTokens = new Map<string, number>();
  const viewCounts = new Map<string, number>();
  const cartRemovedIds = new Set<string>();
  const positiveSeedPrices: number[] = [];
  const seedProductIds = new Set<string>();

  const EVENT_WEIGHTS: Record<string, number> = {
    product_viewed: 12,
    recommendation_clicked: 14,
    category_viewed: 16,
    product_searched: 24,
    wishlist_added: 28,
    cart_added: 32,
    product_purchased: 22,
    cart_removed: -18,
  };

  let totalPersonalSignalWeight = 0;

  for (const ev of events) {
    const decay = recencyWeight(ev.created_at, nowMs);
    const baseWeight = EVENT_WEIGHTS[ev.event_type] ?? 8;
    const weight = baseWeight * decay;
    const pid = ev.product_id ? String(ev.product_id) : "";
    const prod = pid ? productById.get(pid) : undefined;

    if (ev.event_type === "product_searched" && ev.search_query) {
      const q = ev.search_query.trim().toLowerCase();
      if (q.length >= 2) {
        const pseudo = { id: "q", name: q, price: 0 } as Product;
        const tax = detectProductFamily(pseudo);
        searchTerms.push({
          query: q,
          tokens: extractTokens(q),
          family: tax.family,
          weight: Math.abs(weight),
        });
        if (tax.family && tax.family !== "general") {
          familyAffinity.set(tax.family, (familyAffinity.get(tax.family) || 0) + Math.abs(weight) * 0.9);
        }
        totalPersonalSignalWeight += Math.abs(weight);
      }
      continue;
    }

    if (ev.event_type === "cart_removed" && pid) {
      cartRemovedIds.add(pid);
      continue;
    }

    const catId = ev.category_id ? String(ev.category_id) : prod?.category_id ? String(prod.category_id) : "";
    if (catId && weight > 0) {
      categoryAffinity.set(catId, (categoryAffinity.get(catId) || 0) + weight);
      totalPersonalSignalWeight += weight;
    }

    if (prod) {
      seedProductIds.add(pid);
      if (ev.event_type === "product_viewed") {
        viewCounts.set(pid, (viewCounts.get(pid) || 0) + 1);
      }
      if (prod.price > 0) positiveSeedPrices.push(Number(prod.price));

      const tax = taxonomyById.get(pid);
      if (tax && tax.family !== "general" && weight > 0) {
        familyAffinity.set(tax.family, (familyAffinity.get(tax.family) || 0) + weight);
      }
      if (prod.brand && weight > 0) {
        const b = prod.brand.trim().toLowerCase();
        brandAffinity.set(b, (brandAffinity.get(b) || 0) + weight);
      }
      for (const specKey of ["fabric", "material", "fit", "fit_type", "pattern", "product_type", "sub_category", "tags"]) {
        const specVal = getSpecValue(prod, specKey);
        if (specVal && weight > 0) {
          for (const tok of extractTokens(specVal)) {
            attributeTokens.set(tok, (attributeTokens.get(tok) || 0) + weight * 0.35);
          }
        }
      }
      totalPersonalSignalWeight += Math.max(0, weight);
    }
  }

  // Fold persisted wishlist, active cart & historical orders into profile
  for (const wId of wishlistProductIds) {
    const p = productById.get(wId);
    if (!p) continue;
    seedProductIds.add(wId);
    if (p.price > 0) positiveSeedPrices.push(Number(p.price));
    if (p.category_id) {
      categoryAffinity.set(String(p.category_id), (categoryAffinity.get(String(p.category_id)) || 0) + 22);
    }
    const fam = taxonomyById.get(wId)?.family;
    if (fam && fam !== "general") familyAffinity.set(fam, (familyAffinity.get(fam) || 0) + 22);
    totalPersonalSignalWeight += 22;
  }

  for (const cId of cartProductIds) {
    const p = productById.get(cId);
    if (!p) continue;
    seedProductIds.add(cId);
    if (p.price > 0) positiveSeedPrices.push(Number(p.price));
    if (p.category_id) {
      categoryAffinity.set(String(p.category_id), (categoryAffinity.get(String(p.category_id)) || 0) + 26);
    }
    const fam = taxonomyById.get(cId)?.family;
    if (fam && fam !== "general") familyAffinity.set(fam, (familyAffinity.get(fam) || 0) + 26);
    totalPersonalSignalWeight += 26;
  }

  for (const pCatId of purchasedCategoryIds) {
    categoryAffinity.set(pCatId, (categoryAffinity.get(pCatId) || 0) + 18);
    totalPersonalSignalWeight += 18;
  }

  // Derive complementary families from purchased products
  const complementaryFamilyBoost = new Map<string, number>();
  for (const pId of purchasedProductIds) {
    const fam = taxonomyById.get(pId)?.family;
    if (fam && COMPLEMENTARY_FAMILIES[fam]) {
      for (const compFam of COMPLEMENTARY_FAMILIES[fam]) {
        complementaryFamilyBoost.set(compFam, (complementaryFamilyBoost.get(compFam) || 0) + 34);
      }
    }
  }

  // Median preferred price band
  let targetMedianPrice = 0;
  if (positiveSeedPrices.length > 0) {
    const sortedPrices = [...positiveSeedPrices].sort((a, b) => a - b);
    targetMedianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)];
  }

  const hasPersonalizationSignals = totalPersonalSignalWeight >= 10 || searchTerms.length > 0;
  const strategyTotals: Record<RecommendationStrategy, number> = {
    search_intent: 0,
    browsing_affinity: 0,
    purchase_cross_sell: 0,
    category_affinity: 0,
    wishlist_cart: 0,
    product_similarity: 0,
    trending_fallback: 0,
  };

  interface ScoredCandidate {
    product: Product;
    score: number;
    strategy: RecommendationStrategy;
  }

  const scored: ScoredCandidate[] = [];
  const seenNames = new Set<string>();

  for (const prod of catalog) {
    const id = String(prod.id);
    if (excludeProductIds?.has(id)) continue;

    // Avoid duplicate clone titles in same carousel
    const normalizedNameKey = `${prod.name.trim().toLowerCase()}::${(prod.brand || "").trim().toLowerCase()}`;
    if (seenNames.has(normalizedNameKey)) continue;
    seenNames.add(normalizedNameKey);

    const tax = taxonomyById.get(id)!;
    const text = textById.get(id)!;

    let searchScore = 0;
    let browsingScore = 0;
    let purchaseScore = 0;
    let categoryScore = 0;
    let wishlistCartScore = 0;
    let similarityScore = 0;

    // A. Search-Based Strategy
    const titleAndCategory = `${prod.name || ""} ${prod.category_name || ""} ${prod.category || ""}`.toLowerCase();
    for (const s of searchTerms) {
      if (text.includes(s.query)) {
        const titleBonus = titleAndCategory.includes(s.query) ? 18 : 0;
        searchScore += Math.min(90, s.weight * 2.6 + titleBonus);
      } else {
        let tokenMatches = 0;
        for (const tok of s.tokens) {
          if (text.includes(tok)) tokenMatches += 1;
        }
        if (tokenMatches > 0) {
          const titleTokenBonus = s.tokens.some((tok) => titleAndCategory.includes(tok)) ? 10 : 0;
          searchScore += Math.min(70, (tokenMatches / Math.max(1, s.tokens.length)) * s.weight * 2.0 + titleTokenBonus);
        }
      }
      if (s.family !== "general" && tax.family === s.family) {
        searchScore += Math.min(45, s.weight * 1.4);
      }
    }

    // B. Browsing & Engagement Affinity Strategy
    if (tax.family !== "general" && familyAffinity.has(tax.family)) {
      browsingScore += Math.min(55, (familyAffinity.get(tax.family) || 0) * 0.75);
    }
    const views = viewCounts.get(id) || 0;
    if (views >= 2) {
      // Slightly prefer fresh sibling items over hammering the exact same item over-viewed 4+ times
      browsingScore += views <= 3 ? 10 : -8;
    }

    // C. Purchase-Based Complementary Cross-Sell & Repeat Suppression
    const isAlreadyPurchased = purchasedProductIds.has(id);
    if (isAlreadyPurchased) {
      purchaseScore -= 500; // Suppress already-bought items so recommendations stay fresh
    } else {
      if (tax.family !== "general" && complementaryFamilyBoost.has(tax.family)) {
        purchaseScore += Math.min(52, complementaryFamilyBoost.get(tax.family) || 0);
      }
      if (prod.category_id && purchasedCategoryIds.has(String(prod.category_id))) {
        purchaseScore += 24;
      }
    }

    // D. Category Affinity Strategy
    if (prod.category_id && categoryAffinity.has(String(prod.category_id))) {
      categoryScore += Math.min(60, (categoryAffinity.get(String(prod.category_id)) || 0) * 0.7);
    }

    // Wishlist / Cart Intent (boost similar category/brand; mildly penalize exact item if removed from cart)
    if (cartRemovedIds.has(id)) {
      wishlistCartScore -= 28;
    } else if (cartProductIds.has(id)) {
      // Item already in cart: deprioritize exact duplicate, let complementary items shine
      wishlistCartScore -= 15;
    } else if (wishlistProductIds.has(id)) {
      wishlistCartScore += 18;
    }

    // F. Product Similarity (Attributes, Brand, Price Band)
    if (prod.brand) {
      const bKey = prod.brand.trim().toLowerCase();
      if (brandAffinity.has(bKey)) {
        similarityScore += Math.min(28, (brandAffinity.get(bKey) || 0) * 0.45);
      }
    }
    if (attributeTokens.size > 0) {
      let attrBoost = 0;
      for (const [tok, w] of attributeTokens.entries()) {
        if (text.includes(tok)) attrBoost += w;
      }
      similarityScore += Math.min(30, attrBoost);
    }
    if (targetMedianPrice > 0 && prod.price > 0) {
      const ratio = Math.abs(Number(prod.price) - targetMedianPrice) / targetMedianPrice;
      if (ratio <= 0.35) similarityScore += 16;
      else if (ratio <= 0.65) similarityScore += 7;
    }

    // E. Popularity / Quality Baseline (active for everyone, dominates cold-start)
    const pop = popularityMap?.get(id);
    const rev = reviewMap?.get(id);
    const pricing = getProductDisplayPricing(prod);
    const createdMs = prod.created_at ? new Date(prod.created_at).getTime() : NaN;
    const freshnessAgeDays = Number.isFinite(createdMs)
      ? Math.max(0, (nowMs - createdMs) / 86_400_000)
      : 999;
    const freshnessScore = Number.isFinite(freshnessAgeDays) ? Math.max(0, 12 - freshnessAgeDays * 0.25) : 0;

    const popularityScore =
      Math.min(45, (pop?.orderCount || 0) * 8) +
      Math.min(30, (pop?.eventScore || 0) * 0.6) +
      (rev && rev.count > 0 ? rev.avg * 4 + Math.min(10, Math.log2(rev.count + 1) * 4) : 0) +
      (pricing.hasDiscount ? Math.min(10, pricing.discountPercent * 0.2) : 0) +
      (prod.is_premium || prod.tier === "PREMIUM" ? 6 : 0) +
      freshnessScore;

    const totalScore =
      searchScore +
      browsingScore +
      purchaseScore +
      categoryScore +
      wishlistCartScore +
      similarityScore +
      popularityScore;

    // Identify winning explanation strategy for this card
    const candidateStrategies: Array<[RecommendationStrategy, number]> = [
      ["search_intent", searchScore],
      ["purchase_cross_sell", purchaseScore],
      ["browsing_affinity", browsingScore],
      ["category_affinity", categoryScore],
      ["product_similarity", similarityScore],
      ["wishlist_cart", wishlistCartScore],
      ["trending_fallback", popularityScore],
    ];
    candidateStrategies.sort((a, b) => b[1] - a[1]);
    const topStrat =
      candidateStrategies[0][1] > 12 && candidateStrategies[0][0] !== "trending_fallback"
        ? candidateStrategies[0][0]
        : "trending_fallback";

    strategyTotals[topStrat] += Math.max(0, totalScore);

    // Slight variety nudge so exact seed items don't crowd top slots when unrelated candidates exist
    const seedAdjustment = seedProductIds.has(id) && !wishlistProductIds.has(id) ? -4 : 0;

    scored.push({
      product: prod,
      score: totalScore + seedAdjustment,
      strategy: topStrat,
    });
  }

  scored.sort((a, b) => b.score - a.score);

  let dominantStrategy: RecommendationStrategy = "trending_fallback";
  let highestStrategyTotal = 0;
  for (const [strat, tot] of Object.entries(strategyTotals) as Array<[RecommendationStrategy, number]>) {
    if (strat !== "trending_fallback" && tot > highestStrategyTotal) {
      highestStrategyTotal = tot;
      dominantStrategy = strat;
    }
  }
  if (!hasPersonalizationSignals || highestStrategyTotal <= 0) {
    dominantStrategy = "trending_fallback";
  }

  return {
    items: scored.map((entry) =>
      formatRecommendedProduct(entry.product, entry.strategy, entry.score, reviewMap, popularityMap)
    ),
    dominantStrategy,
    hasPersonalizationSignals,
    totalEligible: scored.length,
  };
}
