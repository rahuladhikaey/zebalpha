export interface StoreSearchCandidate {
  id: string;
  business_name: string;
  store_slug: string;
  city?: string | null;
  state?: string | null;
  business_logo_url?: string | null;
  store_banner_url?: string | null;
  store_tagline?: string | null;
  store_pass_plan?: string | null;
  store_pass_status?: string | null;
  store_pass_expires_at?: string | null;
  store_slug_blocked?: boolean | null;
  product_count?: number;
}

export interface StoreMatchResult {
  seller: StoreSearchCandidate;
  isActivePass: boolean;
  matchType: "store_only" | "store_plus_product";
  productQuery: string;
  score: number;
}

const GENERIC_SHOP_STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "shop",
  "store",
  "stores",
  "fashion",
  "fashions",
  "collection",
  "collections",
  "clothing",
  "cloths",
  "clothes",
  "wear",
  "apparel",
  "studio",
  "house",
  "hub",
  "mart",
  "bazaar",
  "bazar",
  "world",
  "india",
  "official",
  "brand",
  "brands",
  "style",
  "styles",
  "trend",
  "trends",
  "creation",
  "creations",
  "enterprise",
  "enterprises",
  "traders",
  "trading",
  "textile",
  "textiles",
  "garment",
  "garments",
  "boutique",
  "online",
  "new",
  "best",
  "men",
  "mens",
  "women",
  "womens",
  "kids",
  "girls",
  "boys",
  "kurti",
  "kurtis",
  "kurta",
  "saree",
  "sarees",
  "shirt",
  "shirts",
  "tshirt",
  "tshirts",
  "tee",
  "tees",
  "hoodie",
  "hoodies",
  "jeans",
  "pants",
  "dress",
  "dresses",
  "shoes",
  "bag",
  "bags",
]);

export function normalizeStoreText(input: string): string {
  return String(input || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isSellerStorePassActive(
  seller: Pick<
    StoreSearchCandidate,
    "store_pass_status" | "store_pass_expires_at" | "store_slug_blocked"
  >,
  nowMs: number = Date.now()
): boolean {
  if (seller.store_slug_blocked) return false;
  if (String(seller.store_pass_status || "").toLowerCase() !== "active") return false;
  if (!seller.store_pass_expires_at) return false;
  const expMs = new Date(seller.store_pass_expires_at).getTime();
  return Number.isFinite(expMs) && expMs > nowMs;
}

/**
 * Matches a customer search query against a list of sellers.
 * Supports:
 *   1. Exact / prefix Shop Name or Store Slug (e.g. "ananya creations", "ananya-creations", "ananya")
 *   2. Shop Name + Product Name (e.g. "Ananya Creations cotton kurti", "ananya red saree")
 *   3. Product Name + Shop Name (e.g. "cotton kurti by Ananya Creations")
 * Strictly avoids false positives on generic words ("fashion", "kurti", "store", "mens").
 */
export function resolveStoreMatches(
  rawQuery: string,
  sellers: StoreSearchCandidate[],
  nowMs: number = Date.now()
): {
  activeMatches: StoreMatchResult[];
  inactiveMatches: StoreMatchResult[];
} {
  const normalizedQuery = normalizeStoreText(rawQuery);
  if (normalizedQuery.length < 2) {
    return { activeMatches: [], inactiveMatches: [] };
  }

  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  const rawSlugQuery = rawQuery.trim().toLowerCase().replace(/\s+/g, "-");
  const activeMatches: StoreMatchResult[] = [];
  const inactiveMatches: StoreMatchResult[] = [];

  for (const seller of sellers) {
    const shopNameNorm = normalizeStoreText(seller.business_name);
    const slugNorm = normalizeStoreText(seller.store_slug);
    const rawSlug = String(seller.store_slug || "").trim().toLowerCase();

    if (!shopNameNorm && !slugNorm) continue;

    const shopTokens = shopNameNorm.split(" ").filter(Boolean);
    const distinctiveTokens = shopTokens.filter(
      (t) => t.length >= 3 && !GENERIC_SHOP_STOPWORDS.has(t)
    );
    const primaryBrandToken = distinctiveTokens[0] || "";

    let score = 0;
    let matchType: "store_only" | "store_plus_product" = "store_only";
    let productQuery = "";

    // Case 1: Exact shop name or exact slug
    if (
      normalizedQuery === shopNameNorm ||
      normalizedQuery === slugNorm ||
      (rawSlug && rawSlugQuery === rawSlug)
    ) {
      score = 1000;
      matchType = "store_only";
      productQuery = "";
    }
    // Case 2: Query starts with full shop name + product keywords (e.g. "ananya creations cotton kurti")
    else if (shopNameNorm.length >= 3 && normalizedQuery.startsWith(`${shopNameNorm} `)) {
      score = 920;
      matchType = "store_plus_product";
      productQuery = normalizedQuery.slice(shopNameNorm.length).trim();
    }
    // Case 3: Query starts with full slug + product keywords
    else if (slugNorm.length >= 3 && normalizedQuery.startsWith(`${slugNorm} `)) {
      score = 900;
      matchType = "store_plus_product";
      productQuery = normalizedQuery.slice(slugNorm.length).trim();
    }
    // Case 4: Query ends with full shop name (e.g. "cotton kurti ananya creations" or "kurti by ananya creations")
    else if (shopNameNorm.length >= 4 && normalizedQuery.endsWith(` ${shopNameNorm}`)) {
      score = 860;
      matchType = "store_plus_product";
      productQuery = normalizedQuery
        .slice(0, normalizedQuery.length - shopNameNorm.length)
        .replace(/\b(by|from|at|in|of)\s*$/i, "")
        .trim();
    }
    // Case 5: Typing prefix of full shop name or slug (for live autocomplete: "anan" -> "Ananya Creations")
    else if (
      normalizedQuery.length >= 3 &&
      !GENERIC_SHOP_STOPWORDS.has(normalizedQuery) &&
      (shopNameNorm.startsWith(normalizedQuery) || (rawSlug && rawSlug.startsWith(rawSlugQuery)))
    ) {
      score = 780 + Math.min(80, normalizedQuery.length * 6);
      matchType = "store_only";
      productQuery = "";
    }
    // Case 6: Distinctive first brand token + product keywords (e.g. "ananya kurti" -> Ananya Creations + "kurti")
    else if (
      primaryBrandToken.length >= 4 &&
      queryTokens.length >= 2 &&
      queryTokens[0] === primaryBrandToken
    ) {
      // Strip matching shop prefix tokens to isolate the pure product search query
      let consumed = 0;
      while (
        consumed < queryTokens.length &&
        consumed < shopTokens.length &&
        queryTokens[consumed] === shopTokens[consumed]
      ) {
        consumed++;
      }
      const remaining = queryTokens.slice(consumed).join(" ").trim();
      if (remaining.length >= 2) {
        score = 720 + consumed * 30;
        matchType = "store_plus_product";
        productQuery = remaining;
      } else {
        score = 740;
        matchType = "store_only";
        productQuery = "";
      }
    }
    // Case 7: Single distinctive brand token exact match (e.g. "ananya")
    else if (
      queryTokens.length === 1 &&
      primaryBrandToken.length >= 4 &&
      queryTokens[0] === primaryBrandToken
    ) {
      score = 700;
      matchType = "store_only";
      productQuery = "";
    }
    // Case 8: Multi-word query contains all distinctive shop tokens (min 2 distinctive tokens)
    else if (
      distinctiveTokens.length >= 2 &&
      distinctiveTokens.every((dt) => queryTokens.includes(dt))
    ) {
      const shopTokenSet = new Set(shopTokens);
      const remaining = queryTokens
        .filter((qt) => !shopTokenSet.has(qt) && !["by", "from", "at"].includes(qt))
        .join(" ")
        .trim();
      score = 680;
      matchType = remaining ? "store_plus_product" : "store_only";
      productQuery = remaining;
    }

    if (score === 0) continue;

    const active = isSellerStorePassActive(seller, nowMs);
    // Pro plan (₹59/28d) receives a priority tie-breaker boost in autocomplete
    const proBonus = active && seller.store_pass_plan === "store_search_59_28d" ? 25 : 0;

    const match: StoreMatchResult = {
      seller,
      isActivePass: active,
      matchType,
      productQuery,
      score: score + proBonus,
    };

    if (active) activeMatches.push(match);
    else inactiveMatches.push(match);
  }

  activeMatches.sort((a, b) => b.score - a.score);
  inactiveMatches.sort((a, b) => b.score - a.score);

  return { activeMatches, inactiveMatches };
}
