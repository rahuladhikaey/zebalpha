import { supabase } from '../lib/supabase.js';
import { cacheService } from './cache/cacheService.js';
import {
  sanitizeUuid,
  sanitizeSessionId,
  normalizePlatform,
  detectFamily,
  isEligibleProduct,
  formatCard,
  rankBackendRecommendations
} from './recommendationScoring.js';

export {
  sanitizeUuid,
  sanitizeSessionId,
  normalizePlatform,
  detectFamily,
  isEligibleProduct,
  formatCard,
  rankBackendRecommendations
};

const CATALOG_FIELDS =
  'id, seller_id, category_id, name, slug, description, price, mrp, image_url, images, brand, stock, stock_count, low_stock_limit, is_active, status, is_approved, approval_status, specifications, packages, is_premium, is_new_drop, collection, target_drop_date, tier, created_at';

const VALID_EVENT_TYPES = new Set([
  'product_viewed',
  'product_searched',
  'category_viewed',
  'wishlist_added',
  'cart_added',
  'cart_removed',
  'product_purchased',
  'recommendation_clicked'
]);

const VALID_SURFACES = new Set([
  'suggested_for_you',
  'recently_viewed',
  'similar_products',
  'trending',
  'recommended_page'
]);

async function loadCatalogSnapshot() {
  const { data } = await cacheService.getOrSet(
    'rec:catalog-snapshot:v1',
    async () => {
      const since30d = new Date(Date.now() - 30 * 86400000).toISOString();
      const [prodRes, sellerRes, catRes, revRes, ordRes, evRes] = await Promise.all([
        supabase
          .from('products')
          .select(CATALOG_FIELDS)
          .or('is_active.is.null,is_active.eq.true')
          .order('created_at', { ascending: false })
          .limit(500),
        supabase.from('sellers').select('id, status, account_status, is_suspended, is_deleted').limit(1000),
        supabase.from('categories').select('id, name').limit(300),
        supabase.from('reviews').select('product_id, rating, is_approved').eq('is_approved', true).limit(3000),
        supabase.from('orders').select('items, product_details, order_status').gte('created_at', since30d).limit(500),
        supabase
          .from('customer_product_events')
          .select('product_id, event_type')
          .gte('created_at', since30d)
          .in('event_type', ['product_viewed', 'cart_added', 'wishlist_added', 'product_purchased', 'recommendation_clicked'])
          .limit(2000)
      ]);

      const sellerMap = new Map((sellerRes.data || []).map((s) => [String(s.id), s]));
      const catMap = new Map((catRes.data || []).map((c) => [String(c.id), c.name]));

      const products = (prodRes.data || [])
        .map((p) => ({
          ...p,
          category_name: p.category_id ? catMap.get(String(p.category_id)) || p.category_name : p.category_name
        }))
        .filter((p) => isEligibleProduct(p, sellerMap));

      const revAcc = new Map();
      for (const r of revRes.data || []) {
        const pid = r.product_id ? String(r.product_id) : '';
        const rating = Number(r.rating);
        if (!pid || !(rating > 0)) continue;
        const curr = revAcc.get(pid) || { sum: 0, count: 0 };
        curr.sum += rating;
        curr.count += 1;
        revAcc.set(pid, curr);
      }
      const reviews = {};
      for (const [pid, acc] of revAcc.entries()) {
        reviews[pid] = { avg: Number((acc.sum / acc.count).toFixed(1)), count: acc.count };
      }

      const popAcc = {};
      const bump = (pid, ordersDelta, eventsDelta) => {
        if (!pid) return;
        if (!popAcc[pid]) popAcc[pid] = { orderCount: 0, eventScore: 0 };
        popAcc[pid].orderCount += ordersDelta;
        popAcc[pid].eventScore += eventsDelta;
      };

      for (const ord of ordRes.data || []) {
        if (String(ord.order_status || '').toLowerCase() === 'cancelled') continue;
        const lines = Array.isArray(ord.items) && ord.items.length ? ord.items : ord.product_details;
        if (!Array.isArray(lines)) continue;
        for (const it of lines) {
          const pid = it?.product_id || it?.id;
          if (pid) bump(String(pid), Math.max(1, Number(it?.quantity || 1)), 0);
        }
      }

      if (!evRes.error) {
        const pts = { product_viewed: 1, recommendation_clicked: 2, wishlist_added: 3, cart_added: 4, product_purchased: 6 };
        for (const ev of evRes.data || []) {
          if (ev.product_id) bump(String(ev.product_id), 0, pts[ev.event_type] || 1);
        }
      }

      return { products, reviews, popularity: popAcc };
    },
    120
  );

  return {
    products: data?.products || [],
    reviewMap: new Map(Object.entries(data?.reviews || {})),
    popularityMap: new Map(Object.entries(data?.popularity || {}))
  };
}

export async function getForYouRecommendations({ userId, sessionId, page = 1, limit = 12, excludeProductIds = [] }) {
  const safeUserId = sanitizeUuid(userId);
  const safeSessionId = sanitizeSessionId(sessionId);
  const safePage = Math.max(1, Math.min(20, Number(page) || 1));
  const safeLimit = Math.max(1, Math.min(40, Number(limit) || 12));

  const [{ products, reviewMap, popularityMap }, actorRes] = await Promise.all([
    loadCatalogSnapshot(),
    (async () => {
      if (!safeUserId && !safeSessionId) return { events: [], purchasedIds: new Set(), purchasedCats: new Set() };
      const q = supabase
        .from('customer_product_events')
        .select('product_id, category_id, event_type, search_query, created_at')
        .order('created_at', { ascending: false })
        .limit(150);
      const evQuery =
        safeUserId && safeSessionId
          ? q.or(`user_id.eq.${safeUserId},session_id.eq.${safeSessionId}`)
          : safeUserId
            ? q.eq('user_id', safeUserId)
            : q.eq('session_id', safeSessionId);
      const ordQuery = safeUserId
        ? supabase.from('orders').select('items, product_details, order_status').eq('user_id', safeUserId).limit(30)
        : Promise.resolve({ data: [] });

      const [evRes, ordRes] = await Promise.all([evQuery, ordQuery]);
      const purchasedIds = new Set();
      const purchasedCats = new Set();
      for (const ord of ordRes.data || []) {
        if (String(ord.order_status || '').toLowerCase() === 'cancelled') continue;
        const lines = Array.isArray(ord.items) && ord.items.length ? ord.items : ord.product_details;
        if (!Array.isArray(lines)) continue;
        for (const it of lines) {
          if (it?.product_id || it?.id) purchasedIds.add(String(it.product_id || it.id));
          if (it?.category_id) purchasedCats.add(String(it.category_id));
        }
      }
      return { events: evRes.error ? [] : evRes.data || [], purchasedIds, purchasedCats };
    })()
  ]);

  return rankBackendRecommendations({
    products,
    events: actorRes.events,
    purchasedIds: actorRes.purchasedIds,
    reviewMap,
    popularityMap,
    excludeProductIds,
    page: safePage,
    limit: safeLimit
  });
}

export async function getTrendingProducts({ page = 1, limit = 12 }) {
  return getForYouRecommendations({ userId: null, sessionId: null, page, limit });
}

export async function getRecentlyViewedProducts({ userId, sessionId, page = 1, limit = 12, excludeProductId = null }) {
  const safeUserId = sanitizeUuid(userId);
  const safeSessionId = sanitizeSessionId(sessionId);
  const safePage = Math.max(1, Math.min(10, Number(page) || 1));
  const safeLimit = Math.max(1, Math.min(30, Number(limit) || 12));
  if (!safeUserId && !safeSessionId) {
    return { items: [], total: 0, page: safePage, limit: safeLimit, hasMore: false, strategy: 'browsing_affinity', personalized: false };
  }

  const [{ products, reviewMap, popularityMap }, evRes] = await Promise.all([
    loadCatalogSnapshot(),
    (() => {
      const q = supabase
        .from('customer_product_events')
        .select('product_id, created_at')
        .eq('event_type', 'product_viewed')
        .not('product_id', 'is', null)
        .order('created_at', { ascending: false })
        .limit(80);
      if (safeUserId && safeSessionId) return q.or(`user_id.eq.${safeUserId},session_id.eq.${safeSessionId}`);
      if (safeUserId) return q.eq('user_id', safeUserId);
      return q.eq('session_id', safeSessionId);
    })()
  ]);

  if (evRes.error || !evRes.data?.length) {
    return { items: [], total: 0, page: safePage, limit: safeLimit, hasMore: false, strategy: 'browsing_affinity', personalized: false };
  }

  const catalogById = new Map(products.map((p) => [String(p.id), p]));
  const seen = new Set();
  const ordered = [];
  for (const row of evRes.data) {
    const pid = String(row.product_id || '');
    if (!pid || seen.has(pid) || (excludeProductId && pid === excludeProductId)) continue;
    const p = catalogById.get(pid);
    if (!p) continue;
    seen.add(pid);
    ordered.push(formatCard(p, 'browsing_affinity', 100 - ordered.length, reviewMap, popularityMap));
  }

  const offset = (safePage - 1) * safeLimit;
  return {
    items: ordered.slice(offset, offset + safeLimit),
    total: ordered.length,
    page: safePage,
    limit: safeLimit,
    hasMore: offset + safeLimit < ordered.length,
    strategy: 'browsing_affinity',
    personalized: ordered.length > 0
  };
}

export async function getSimilarProductsForId(productId, limit = 12) {
  const safeId = sanitizeUuid(productId);
  if (!safeId) return [];
  const { products, reviewMap, popularityMap } = await loadCatalogSnapshot();
  const current = products.find((p) => String(p.id) === safeId);
  if (!current) return [];

  const currFam = detectFamily(current);
  const scored = [];
  for (const p of products) {
    if (String(p.id) === safeId) continue;
    let score = 0;
    if (currFam !== 'other' && detectFamily(p) === currFam) score += 200;
    if (current.category_id && p.category_id === current.category_id) score += 80;
    if (current.price > 0 && p.price > 0 && Math.abs(p.price - current.price) / current.price <= 0.35) score += 20;
    if (score > 0) scored.push(formatCard(p, 'product_similarity', score, reviewMap, popularityMap));
  }
  scored.sort((a, b) => b.recommendation_score - a.recommendation_score);
  return scored.slice(0, Math.min(30, Math.max(1, Number(limit) || 12)));
}

export async function recordEvent(payload) {
  const sessionId = sanitizeSessionId(payload.sessionId);
  const eventType = String(payload.eventType || '').trim();
  if (!sessionId || !VALID_EVENT_TYPES.has(eventType)) {
    return { recorded: false, error: 'Invalid sessionId or eventType' };
  }

  const userId = sanitizeUuid(payload.userId);
  const productId = sanitizeUuid(payload.productId);
  const categoryId = sanitizeUuid(payload.categoryId);
  const platform = normalizePlatform(payload.platform);
  const searchQuery = typeof payload.searchQuery === 'string' ? payload.searchQuery.trim().slice(0, 160) || null : null;
  const windowSec = eventType === 'product_viewed' || eventType === 'product_searched' ? 120 : 20;
  const bucket = Math.floor(Date.now() / (windowSec * 1000));
  const actor = userId || sessionId;
  const target = productId || categoryId || (searchQuery ? searchQuery.toLowerCase().slice(0, 40) : 'none');
  const dedupKey = eventType === 'product_purchased' ? null : `${actor}:${eventType}:${target}:${bucket}`.slice(0, 175);

  const row = {
    user_id: userId,
    session_id: sessionId,
    product_id: productId,
    category_id: categoryId,
    event_type: eventType,
    platform,
    search_query: searchQuery,
    recommendation_surface: VALID_SURFACES.has(payload.recommendationSurface) ? payload.recommendationSurface : null,
    recommendation_strategy: payload.recommendationStrategy ? String(payload.recommendationStrategy).slice(0, 64) : null,
    metadata: payload.metadata && typeof payload.metadata === 'object' ? payload.metadata : {},
    dedup_key: dedupKey
  };

  const { error } = dedupKey
    ? await supabase.from('customer_product_events').upsert(row, { onConflict: 'dedup_key', ignoreDuplicates: true })
    : await supabase.from('customer_product_events').insert(row);

  if (error) return { recorded: false, warning: error.message };
  return { recorded: true };
}

export async function recordImpressions(payload) {
  const sessionId = sanitizeSessionId(payload.sessionId);
  const surface = String(payload.surface || 'suggested_for_you');
  if (!sessionId || !VALID_SURFACES.has(surface)) return { count: 0 };

  const userId = sanitizeUuid(payload.userId);
  const platform = normalizePlatform(payload.platform);
  const hourBucket = Math.floor(Date.now() / (30 * 60 * 1000));
  const actor = userId || sessionId;

  const rows = (Array.isArray(payload.items) ? payload.items : [])
    .slice(0, 25)
    .map((item, idx) => {
      const pid = sanitizeUuid(item?.productId);
      if (!pid) return null;
      return {
        user_id: userId,
        session_id: sessionId,
        product_id: pid,
        category_id: sanitizeUuid(item?.categoryId),
        surface,
        strategy: String(item?.strategy || 'hybrid').slice(0, 64),
        position_index: Number.isFinite(Number(item?.positionIndex)) ? Math.max(0, Number(item.positionIndex)) : idx,
        platform,
        impression_token: `${actor}:${surface}:${pid}:${hourBucket}`.slice(0, 175)
      };
    })
    .filter(Boolean);

  if (!rows.length) return { count: 0 };
  const { error } = await supabase
    .from('product_recommendation_impressions')
    .upsert(rows, { onConflict: 'impression_token', ignoreDuplicates: true });
  return error ? { count: 0, warning: error.message } : { count: rows.length };
}

export async function recordClick(payload) {
  const sessionId = sanitizeSessionId(payload.sessionId);
  const productId = sanitizeUuid(payload.productId);
  if (!sessionId || !productId) return { recorded: false, error: 'Invalid sessionId or productId' };

  const surface = VALID_SURFACES.has(payload.surface) ? payload.surface : 'suggested_for_you';
  const userId = sanitizeUuid(payload.userId);
  const platform = normalizePlatform(payload.platform);

  const { error } = await supabase.from('recommendation_click_events').insert({
    user_id: userId,
    session_id: sessionId,
    product_id: productId,
    category_id: sanitizeUuid(payload.categoryId),
    surface,
    strategy: String(payload.strategy || 'hybrid').slice(0, 64),
    position_index: Number.isFinite(Number(payload.positionIndex)) ? Math.max(0, Number(payload.positionIndex)) : 0,
    platform
  });

  if (error) return { recorded: false, warning: error.message };
  await recordEvent({
    userId,
    sessionId,
    eventType: 'recommendation_clicked',
    productId,
    categoryId: payload.categoryId,
    platform,
    recommendationSurface: surface,
    recommendationStrategy: payload.strategy
  });
  return { recorded: true };
}

export async function mergeSession(sessionId, userId) {
  const safeSessionId = sanitizeSessionId(sessionId);
  const safeUserId = sanitizeUuid(userId);
  if (!safeSessionId || !safeUserId) return { mergedEvents: 0 };

  const { data, error } = await supabase.rpc('merge_anonymous_recommendation_events', {
    p_session_id: safeSessionId,
    p_user_id: safeUserId
  });
  if (error) return { mergedEvents: 0, warning: error.message };
  return data || { mergedEvents: 0 };
}
