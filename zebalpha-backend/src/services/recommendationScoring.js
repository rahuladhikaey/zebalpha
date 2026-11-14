const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SESSION_ID_REGEX = /^[a-zA-Z0-9_\-\.]{8,128}$/;

export const INACTIVE_STATUSES = new Set([
  'BLOCKED',
  'DELETED',
  'ARCHIVED',
  'OUT_OF_STOCK',
  'COMING_SOON',
  'INACTIVE',
  'SUSPENDED',
  'DRAFT',
  'REJECTED'
]);

export const DISALLOWED_APPROVALS = new Set([
  'rejected',
  'pending',
  'suspended',
  'suspended_by_merchant_admin',
  'blocked',
  'deleted',
  'draft'
]);

export const COMPLEMENTARY_FAMILIES = {
  hoodie: ['jogger', 'cargo', 'tshirt', 'shoes'],
  tshirt: ['jogger', 'cargo', 'hoodie', 'shoes', 'bag'],
  shirt: ['trouser', 'jogger', 'shoes', 'belt'],
  polo: ['trouser', 'jogger', 'shoes'],
  kurti: ['saree', 'lehenga', 'dress', 'footwear', 'bag'],
  saree: ['kurti', 'lehenga', 'footwear', 'bag'],
  lehenga: ['saree', 'kurti', 'footwear', 'bag'],
  jogger: ['tshirt', 'hoodie', 'shoes'],
  cargo: ['tshirt', 'hoodie', 'shoes'],
  shoes: ['jogger', 'cargo', 'tshirt', 'hoodie']
};

export function sanitizeUuid(val) {
  if (!val || typeof val !== 'string') return null;
  const t = val.trim();
  return UUID_REGEX.test(t) ? t : null;
}

export function sanitizeSessionId(val) {
  if (!val || typeof val !== 'string') return null;
  const t = val.trim();
  return SESSION_ID_REGEX.test(t) ? t : null;
}

export function normalizePlatform(val) {
  return String(val || '').toLowerCase() === 'android' ? 'android' : 'website';
}

export function detectFamily(product) {
  const txt = `${product.name || ''} ${product.collection || ''} ${product.category_name || ''} ${JSON.stringify(product.specifications || {})}`.toLowerCase();
  if (/\b(hoodie|sweatshirt|pullover)\b/i.test(txt)) return 'hoodie';
  if (/\b(t-shirt|tshirt|tee|oversized)\b/i.test(txt)) return 'tshirt';
  if (/\b(polo)\b/i.test(txt)) return 'polo';
  if (/\b(shirt|formal shirt)\b/i.test(txt)) return 'shirt';
  if (/\b(kurti|kurta|anarkali)\b/i.test(txt)) return 'kurti';
  if (/\b(saree|sari)\b/i.test(txt)) return 'saree';
  if (/\b(lehenga)\b/i.test(txt)) return 'lehenga';
  if (/\b(jogger|trackpant|pyjama)\b/i.test(txt)) return 'jogger';
  if (/\b(cargo|jeans|trouser|pant)\b/i.test(txt)) return 'cargo';
  if (/\b(shoe|sneaker|footwear|sandal|clog|croc|loafer|boot)\b/i.test(txt)) return 'shoes';
  if (/\b(bag|tote|backpack|handbag)\b/i.test(txt)) return 'bag';
  return 'other';
}

export function resolveImage(product) {
  if (typeof product.image_url === 'string' && product.image_url.trim()) return product.image_url.trim();
  if (Array.isArray(product.images)) {
    const first = product.images.find((u) => typeof u === 'string' && u.trim());
    if (first) return first.trim();
  }
  return '';
}

export function getEffectiveStock(product) {
  if (Array.isArray(product.packages) && product.packages.length > 0) {
    let total = 0;
    let hasPkgStock = false;
    for (const pkg of product.packages) {
      if (pkg && pkg.stock !== undefined && pkg.stock !== null && !isNaN(Number(pkg.stock))) {
        hasPkgStock = true;
        total += Math.max(0, Number(pkg.stock));
      }
    }
    if (hasPkgStock) return Math.max(total, Number(product.stock || 0));
  }
  return Math.max(0, Number(product.stock ?? product.stock_count ?? 0));
}

export function isEligibleProduct(product, sellerMap) {
  if (!product || !product.id || !String(product.name || '').trim()) return false;
  if (!(Number(product.price) > 0)) return false;
  if (!resolveImage(product)) return false;
  if (product.is_active === false || product.is_approved === false) return false;

  const approval = String(product.approval_status || '').trim().toLowerCase();
  if (approval && (DISALLOWED_APPROVALS.has(approval) || approval !== 'approved')) return false;

  const statusUpper = String(product.status || '').trim().toUpperCase();
  if (statusUpper && INACTIVE_STATUSES.has(statusUpper)) return false;

  if (product.tier === 'DROP' || product.status === 'COMING_SOON') {
    const rawDropDate = product.target_drop_date || product.specifications?.target_drop_date;
    const dt = rawDropDate ? new Date(rawDropDate) : null;
    if (!dt || Number.isNaN(dt.getTime()) || dt.getTime() > Date.now()) return false;
  }

  if (getEffectiveStock(product) <= 0) return false;

  if (sellerMap && product.seller_id) {
    const seller = sellerMap.get(String(product.seller_id));
    if (seller) {
      if (seller.is_suspended === true || seller.is_deleted === true) return false;
      const st = String(seller.status || '').toLowerCase();
      const ast = String(seller.account_status || '').toLowerCase();
      if (['suspended', 'rejected', 'deleted', 'blocked', 'inactive'].includes(st)) return false;
      if (['suspended', 'deleted', 'blocked', 'inactive'].includes(ast)) return false;
    }
  }
  return true;
}

export function formatCard(product, strategy, score, reviewMap, popularityMap) {
  const price = Number(product.price) || 0;
  const rawMrp = Number(product.mrp) || 0;
  const hasDiscount = rawMrp > price && rawMrp > 0;
  const discountPct = hasDiscount ? Math.round(((rawMrp - price) / rawMrp) * 100) : undefined;
  const rev = reviewMap?.get(String(product.id));
  const pop = popularityMap?.get(String(product.id));
  const hasReview = Boolean(rev && rev.count > 0 && rev.avg > 0);
  const isBestseller = (pop?.orderCount || 0) >= 3 || Boolean(hasReview && rev.avg >= 4.2 && rev.count >= 3);

  return {
    ...product,
    price,
    mrp: hasDiscount ? rawMrp : undefined,
    discount_percentage: discountPct,
    rating: hasReview ? rev.avg : undefined,
    review_count: hasReview ? rev.count : undefined,
    is_bestseller: isBestseller,
    badge_label: isBestseller ? 'Bestseller' : product.is_premium || product.tier === 'PREMIUM' ? 'Premium' : undefined,
    thumbnail_url: resolveImage(product),
    recommendation_strategy: strategy,
    recommendation_score: Number(score.toFixed(2))
  };
}

/**
 * Pure multi-strategy ranking used by Express backend & tested without DB side effects.
 */
export function rankBackendRecommendations({
  products = [],
  events = [],
  purchasedIds = new Set(),
  reviewMap = new Map(),
  popularityMap = new Map(),
  excludeProductIds = [],
  page = 1,
  limit = 12
}) {
  const safePage = Math.max(1, Math.min(20, Number(page) || 1));
  const safeLimit = Math.max(1, Math.min(40, Number(limit) || 12));

  if (!products.length) {
    return { items: [], total: 0, page: safePage, limit: safeLimit, hasMore: false, strategy: 'trending_fallback', personalized: false };
  }

  const prodMap = new Map(products.map((p) => [String(p.id), p]));
  const catWeights = new Map();
  const famWeights = new Map();
  const searches = [];
  const cartRemoved = new Set();

  for (const ev of events) {
    if (ev.event_type === 'product_searched' && ev.search_query) {
      searches.push(String(ev.search_query).toLowerCase());
      continue;
    }
    if (ev.event_type === 'cart_removed' && ev.product_id) {
      cartRemoved.add(String(ev.product_id));
      continue;
    }
    const p = ev.product_id ? prodMap.get(String(ev.product_id)) : null;
    const cat = ev.category_id || p?.category_id;
    const w = ev.event_type === 'cart_added' ? 30 : ev.event_type === 'wishlist_added' ? 25 : 14;
    if (cat) catWeights.set(String(cat), (catWeights.get(String(cat)) || 0) + w);
    if (p) {
      const fam = detectFamily(p);
      if (fam !== 'other') famWeights.set(fam, (famWeights.get(fam) || 0) + w);
    }
  }

  const excludeSet = new Set(excludeProductIds.map((x) => String(x).trim()));
  const seenNames = new Set();
  const ranked = [];

  for (const p of products) {
    const id = String(p.id);
    if (excludeSet.has(id)) continue;
    const nameKey = `${String(p.name).trim().toLowerCase()}::${(p.brand || '').trim().toLowerCase()}`;
    if (seenNames.has(nameKey)) continue;
    seenNames.add(nameKey);

    const txt = `${p.name} ${p.brand || ''} ${p.category_name || ''} ${p.collection || ''} ${p.description || ''}`.toLowerCase();
    const fam = detectFamily(p);

    let searchScore = 0;
    for (const q of searches) {
      if (txt.includes(q)) searchScore += 45;
      else if (q.split(/\s+/).some((tok) => tok.length >= 3 && txt.includes(tok))) searchScore += 25;
    }

    const browsingScore = famWeights.get(fam) || 0;
    const categoryScore = p.category_id ? catWeights.get(String(p.category_id)) || 0 : 0;
    const purchasePenalty = purchasedIds.has(id) ? -500 : 0;
    const removedPenalty = cartRemoved.has(id) ? -25 : 0;
    const pop = popularityMap.get(id);
    const rev = reviewMap.get(id);
    const popScore = (pop?.orderCount || 0) * 8 + (pop?.eventScore || 0) * 0.6 + (rev ? rev.avg * 4 : 0);

    let compScore = 0;
    for (const pId of purchasedIds) {
      const bought = prodMap.get(pId);
      if (bought) {
        const boughtFam = detectFamily(bought);
        if (COMPLEMENTARY_FAMILIES[boughtFam]?.includes(fam)) compScore += 30;
      }
    }

    const totalScore = searchScore + browsingScore + categoryScore + compScore + purchasePenalty + removedPenalty + popScore;
    const strat =
      searchScore >= 25
        ? 'search_intent'
        : compScore >= 20
          ? 'purchase_cross_sell'
          : browsingScore >= 15
            ? 'browsing_affinity'
            : categoryScore >= 15
              ? 'category_affinity'
              : 'trending_fallback';

    ranked.push(formatCard(p, strat, totalScore, reviewMap, popularityMap));
  }

  ranked.sort((a, b) => b.recommendation_score - a.recommendation_score);
  const offset = (safePage - 1) * safeLimit;
  const pageItems = ranked.slice(offset, offset + safeLimit);
  const personalized = events.length > 0 || purchasedIds.size > 0;

  return {
    items: pageItems,
    total: ranked.length,
    page: safePage,
    limit: safeLimit,
    hasMore: offset + pageItems.length < ranked.length,
    strategy: pageItems[0]?.recommendation_strategy || 'trending_fallback',
    personalized
  };
}
