import { getCachedOrFetch, invalidateCacheKey, invalidateCachePattern } from './cacheHelper';
import { supabaseServer } from './supabaseServer';
export { supabaseServer } from './supabaseServer';
import { Product, Category, CuratedCollection, EditorialCard, PromotionalCampaign } from './types';
import { fetchProductRatingSummaries, attachRatingsToProducts } from './productRatings';
import { resolveCategoryIcon } from '../../../shared/constants/categoryIcons';

const SLIM_CURATED_COLLECTION_FIELDS = 'id, title, slug, short_description, link_url, image_url, display_order';
const SLIM_EDITORIAL_CARD_FIELDS = 'id, title, category, price, badge, href, image_url, display_order';

/**
 * Minimal card fields for Homepage & Catalog grids (omits heavy description & full packages JSON
 * to cut Supabase egress & Upstash Redis bandwidth by ~75% while preserving variant sheet trigger).
 */
const SLIM_PRODUCT_FIELDS =
  'id, name, brand, price, mrp, image_url, images, category_id, stock, low_stock_limit, status, is_active, is_approved, approval_status, created_at, specifications, seller_id';

/**
 * Strips non-essential nested blobs from specifications and trims images array for lightweight card payloads.
 */
function slimSpecsForCard(rawSpecs: any): Record<string, any> | undefined {
  if (!rawSpecs || typeof rawSpecs !== 'object') return undefined;
  const out: Record<string, any> = {};
  if (rawSpecs.tier) out.tier = rawSpecs.tier;
  if (rawSpecs.is_premium !== undefined) out.is_premium = rawSpecs.is_premium;
  if (rawSpecs.is_new_drop !== undefined) out.is_new_drop = rawSpecs.is_new_drop;
  if (rawSpecs.collection) out.collection = rawSpecs.collection;
  if (rawSpecs.category) out.category = rawSpecs.category;
  if (rawSpecs.target_drop_date) out.target_drop_date = rawSpecs.target_drop_date;
  if (rawSpecs.size_chart) out.size_chart = true;
  return Object.keys(out).length > 0 ? out : undefined;
}

export async function getCachedCuratedCollections(): Promise<CuratedCollection[]> {
  return getCachedOrFetch<CuratedCollection[]>(
    'homepage:section:curated_collections',
    async () => {
      try {
        const { data, error } = await supabaseServer
          .from('curated_collections')
          .select(SLIM_CURATED_COLLECTION_FIELDS)
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .limit(24);

        if (!error && data && data.length > 0) {
          return data as CuratedCollection[];
        }
        if (error) {
          console.error('[Database Error] Failed to fetch curated collections:', error.message);
        }
      } catch (e) {
        console.error('[Database Error] Failed to fetch curated collections:', e);
      }
      return [];
    },
    600 // 10 min TTL in L1 RAM + Upstash Redis
  );
}

export interface NavigationCategoryItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon_key?: string | null;
  icon_url?: string | null;
  icon_source?: string | null;
  image_url?: string | null;
  display_order: number;
  is_active: boolean;
  show_in_navigation: boolean;
  parent_id?: string | null;
}

/**
 * Cached fetcher for Dynamic Main Category Navigation Bar
 * Cache TTL: 5 minutes (300s)
 */
export async function getCachedNavigationCategories(): Promise<NavigationCategoryItem[]> {
  return getCachedOrFetch<NavigationCategoryItem[]>(
    'navigation:main_categories:active:v2',
    async () => {
      try {
        const { data, error } = await supabaseServer
          .from('categories')
          .select('id, name, slug, description, icon_key, icon_url, icon_source, image_url, display_order, is_active, show_in_navigation, parent_id')
          .is('parent_id', null)
          .or('is_active.is.null,is_active.eq.true')
          .or('show_in_navigation.is.null,show_in_navigation.eq.true')
          .order('display_order', { ascending: true })
          .order('name', { ascending: true });

        if (error) {
          console.error('[Database Error] Failed to fetch navigation categories:', error.message);
          return [];
        }

        if (data && data.length > 0) {
          return data.map((cat: any) => {
            const resolved = resolveCategoryIcon(cat.name, cat.icon_key, cat.icon_source);
            return {
              id: cat.id,
              name: cat.name,
              slug: cat.slug || cat.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              description: cat.description || null,
              icon_key: cat.icon_key && cat.icon_source === 'ADMIN' ? cat.icon_key : resolved.icon_key,
              icon_url: cat.icon_url || null,
              icon_source: cat.icon_source || resolved.icon_source,
              image_url: cat.image_url || null,
              display_order: cat.display_order ?? 0,
              is_active: cat.is_active !== false,
              show_in_navigation: cat.show_in_navigation !== false,
              parent_id: cat.parent_id || null,
            };
          });
        }
      } catch (e) {
        console.error('[Database Error] Failed to fetch navigation categories:', e);
      }
      return [];
    },
    300 // 5 min TTL
  );
}

/**
 * Cached fetcher for Homepage Categories
 * Cache TTL: 20 minutes (1200s)
 */
export async function getCachedHomeCategories(limit: number = 16): Promise<Category[]> {
  const cacheKey = `homepage:section:categories:limit:${limit}`;
  return getCachedOrFetch<Category[]>(
    cacheKey,
    async () => {
      try {
        const { data, error } = await supabaseServer
          .from('categories')
          .select('id, name, slug, image_url, description, display_order, is_active, icon_key, icon_url, icon_source')
          .is('parent_id', null)
          .or('is_active.is.null,is_active.eq.true')
          .order('display_order', { ascending: true })
          .limit(limit);

        if (!error && data && data.length > 0) {
          return data as Category[];
        }
        if (error) {
          console.error('[Database Error] Failed to fetch home categories:', error.message);
        }
      } catch (e) {
        console.error('[Database Error] Failed to fetch home categories:', e);
      }
      return [];
    },
    1200 // 20 mins TTL
  );
}

function isLegacyDeadSupabaseUrl(url: string): boolean {
  const lower = url.toLowerCase();
  return (
    lower.includes('.supabase.co/storage/v1/object/public/product-images/') ||
    lower.includes('.supabase.co/storage/v1/object/public/editorial/')
  );
}

/**
 * Unified Custom Studio & Homepage Design Showcase Fetcher (Single Source of Truth)
 * Reads directly from `store_settings -> custom_design_presets` (Cloudinary CDN),
 * deduplicates image URLs, and deep-links every card directly to `/customize?design=<id>`.
 * Cache TTL: 5 minutes (300s Redis / 30s L1 RAM) — purged instantaneously on Admin save.
 */
export async function getCachedEditorialCards(): Promise<EditorialCard[]> {
  return getCachedOrFetch<EditorialCard[]>(
    'homepage:section:custom_designs:v1',
    async () => {
      try {
        let rawPresets: any = null;

        const { data: storeRow, error: storeErr } = await supabaseServer
          .from('store_settings')
          .select('value')
          .eq('key', 'custom_design_presets')
          .maybeSingle();

        if (!storeErr && storeRow?.value !== undefined && storeRow?.value !== null) {
          rawPresets = storeRow.value;
        } else {
          const { data: mktRow, error: mktErr } = await supabaseServer
            .from('marketplace_settings')
            .select('setting_value')
            .eq('setting_key', 'custom_design_presets')
            .maybeSingle();

          if (!mktErr && mktRow?.setting_value !== undefined && mktRow?.setting_value !== null) {
            rawPresets = mktRow.setting_value;
          }
        }

        if (rawPresets !== null && rawPresets !== undefined) {
          const parsed = typeof rawPresets === 'string' ? JSON.parse(rawPresets) : rawPresets;
          if (Array.isArray(parsed) && parsed.length > 0) {
            const seenUrls = new Set<string>();
            const seenIds = new Set<string>();
            const cards: EditorialCard[] = [];

            for (let idx = 0; idx < parsed.length; idx++) {
              const p = parsed[idx];
              if (!p || p.isActive === false) continue;

              const imgUrl = typeof (p.imageUrl || p.image_url) === 'string'
                ? String(p.imageUrl || p.image_url).trim()
                : '';
              if (!imgUrl || isLegacyDeadSupabaseUrl(imgUrl)) continue;

              const urlKey = imgUrl.toLowerCase();
              const idStr = String(p.id || `design-${idx}`);
              if (seenUrls.has(urlKey) || seenIds.has(idStr)) continue;

              seenUrls.add(urlKey);
              seenIds.add(idStr);

              cards.push({
                id: idStr,
                title: String(p.title || 'Custom Design').trim(),
                category: String(p.category || 'CUSTOM STUDIO').replace(/[-_]+/g, ' ').toUpperCase(),
                image_url: imgUrl,
                href: `/customize?design=${encodeURIComponent(idStr)}`,
                badge: 'CUSTOMIZE NOW',
                display_order: idx,
                is_active: true,
              });
            }

            if (cards.length > 0) {
              return cards;
            }
          }
        }
      } catch (e) {
        console.error('[Database Error] Failed to fetch custom design showcase:', e);
      }
      return [];
    },
    300 // 5 min Redis TTL (30s L1 RAM), purged immediately by Superadmin on upload/edit/delete
  );
}

/**
 * Cached fetcher for Homepage Hero Banners (store_settings -> hero_banners)
 * Eliminates direct browser -> Supabase store_settings reads on every homepage visit.
 */
export async function getCachedHeroBanners(): Promise<any[]> {
  return getCachedOrFetch<any[]>(
    'homepage:section:hero_banners',
    async () => {
      try {
        const { data, error } = await supabaseServer
          .from('store_settings')
          .select('value')
          .eq('key', 'hero_banners')
          .maybeSingle();

        if (!error && data?.value && Array.isArray(data.value) && data.value.length > 0) {
          return data.value;
        }
      } catch (e) {
        console.error('[Database Error] Failed to fetch hero banners:', e);
      }
      return [];
    },
    600 // 10 min TTL
  );
}

/**
 * Cached fetcher for Latest Broadcast Notification
 * Prevents per-user polling from hitting Supabase directly.
 */
export async function getCachedLatestBroadcast(): Promise<{ latest: any | null; total: number }> {
  return getCachedOrFetch<{ latest: any | null; total: number }>(
    'notifications:broadcast:latest:v1',
    async () => {
      try {
        const { data: setting } = await supabaseServer
          .from('store_settings')
          .select('value')
          .eq('key', 'broadcast_messages')
          .maybeSingle();

        const messages = Array.isArray(setting?.value) ? setting.value : [];
        const latest = messages.length > 0 ? messages[0] : null;
        return { latest, total: messages.length };
      } catch (e) {
        console.error('[Database Error] Failed to fetch latest broadcast:', e);
        return { latest: null, total: 0 };
      }
    },
    120 // 2 min TTL in L1 RAM + Redis (paired with 60s Vercel Edge CDN s-maxage)
  );
}

export async function getCachedHomeProducts(brandFilter?: string, limit: number = 20): Promise<Product[]> {
  const brandKey = brandFilter ? brandFilter.toLowerCase().trim() : 'all';
  const cacheKey = `homepage:section:featured:v6:brand:${brandKey}:limit:${limit}`;
  return getCachedOrFetch<Product[]>(
    cacheKey,
    async () => {
      // Fetch active products safely (avoiding SQL `neq` on nullable approval_status/status/tier columns)
      const fetchLimit = Math.min(limit + 12, 60);
      let query = supabaseServer
        .from('products')
        .select(SLIM_PRODUCT_FIELDS)
        .or('is_active.is.null,is_active.eq.true')
        .order('created_at', { ascending: false });

      if (brandFilter) {
        query = query.ilike('brand', `%${brandFilter}%`);
      }

      query = query.limit(fetchLimit);

      let { data, error } = await query;

      // Only fallback to select(*) on an actual SQL schema error (NEVER on empty result)
      if (error) {
        console.warn('[Database Notice] Retrying home products with select(*):', error.message);
        const fallback = await supabaseServer
          .from('products')
          .select('*')
          .or('is_active.is.null,is_active.eq.true')
          .order('created_at', { ascending: false })
          .limit(fetchLimit);

        data = fallback.data;
        error = fallback.error;
      }

      if (error) {
        console.error('[Database Error] Failed to fetch home products:', error);
        return [];
      }

      const rawList = data || [];
      const normalized = rawList
        .filter((p: any) => {
          if (p.is_active === false) return false;
          const upperStatus = String(p.status || '').toUpperCase();
          if (upperStatus === 'DELETED' || upperStatus === 'COMING_SOON') return false;
          if (String(p.approval_status || '').toLowerCase() === 'rejected') return false;

          const specs = p.specifications || {};
          const isDrop =
            p.is_new_drop === true ||
            p.is_new_drop === 'true' ||
            specs.is_new_drop === true ||
            specs.is_new_drop === 'true' ||
            p.tier === 'DROP' ||
            specs.tier === 'DROP';
          return !isDrop;
        })
        .slice(0, limit)
        .map((p: any) => {
          const specs = p.specifications || {};
          const isPrem =
            p.is_premium === true ||
            p.tier === 'PREMIUM' ||
            specs.is_premium === true ||
            specs.is_premium === 'true' ||
            specs.tier === 'PREMIUM' ||
            (p.name || '').toLowerCase().includes('premium');
          const trimmedImages = Array.isArray(p.images) ? p.images.filter(Boolean).slice(0, 3) : [];
          return {
            id: p.id,
            name: p.name,
            brand: p.brand,
            price: p.price,
            mrp: p.mrp,
            image_url: p.image_url,
            images: trimmedImages,
            thumbnail_url: p.thumbnail_url || p.image_url || trimmedImages[0] || '',
            category_id: p.category_id,
            stock: p.stock,
            low_stock_limit: p.low_stock_limit,
            status: p.status,
            is_active: p.is_active,
            created_at: p.created_at,
            seller_id: p.seller_id,
            specifications: slimSpecsForCard(specs),
            is_premium: isPrem,
            tier: isPrem ? 'PREMIUM' : (p.tier || specs.tier || 'STANDARD'),
            is_new_drop: false,
            collection: p.collection || specs.collection || '',
            target_drop_date: p.target_drop_date || specs.target_drop_date || '',
            category: p.category || specs.category || 'Apparel',
          };
        }) as unknown as Product[];

      const ratingsMap = await fetchProductRatingSummaries(
        supabaseServer,
        normalized.map((p) => p.id)
      );
      return attachRatingsToProducts(normalized, ratingsMap);
    },
    600 // 10 min TTL in L1 RAM + Upstash Redis
  );
}

/**
 * Cached fetcher for Active Products by Category
 * Cache TTL: 10 minutes (600s)
 */
export async function getCachedProductsByCategory(categoryId: string, limit: number = 20): Promise<Product[]> {
  const cacheKey = `products:cat:${categoryId}:limit:${limit}`;
  return getCachedOrFetch<Product[]>(
    cacheKey,
    async () => {
      const { data, error } = await supabaseServer
        .from('products')
        .select('id, name, brand, price, mrp, image_url, images, is_active, stock, seller_id, created_at')
        .eq('category_id', categoryId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error(`[Database Error] Failed to fetch products for category ${categoryId}:`, error);
        return [];
      }
      return (data || []) as unknown as Product[];
    },
    600
  );
}

/**
 * Cached fetcher for Product Details by Product ID
 * Cache TTL: 10 minutes (600s)
 */
export async function getCachedProductById(productId: string): Promise<Product | null> {
  const cacheKey = `product:detail:v2:${productId}`;
  return getCachedOrFetch<Product | null>(
    cacheKey,
    async () => {
      const { data, error } = await supabaseServer
        .from('products')
        .select('id, name, brand, price, mrp, stock, status, is_active, image_url, images, category_id, seller_id, description, packages, offers, specifications, created_at')
        .eq('id', productId)
        .maybeSingle();

      if (error) {
        console.error(`[Database Error] Failed to fetch product ${productId}:`, error);
        return null;
      }
      return data as Product | null;
    },
    600
  );
}

/**
 * Invalidate Product cache whenever product is updated or inventory changes
 */
export async function invalidateProductCache(productId?: string, categoryId?: string) {
  if (productId) {
    await invalidateCacheKey(`product:detail:v2:${productId}`);
    await invalidateCacheKey(`product:detail:${productId}`);
    await invalidateCacheKey(`product:variants:v1:${productId}`);
    await invalidateCacheKey(`product:variants:${productId}`);
    await invalidateCacheKey(`pdp:product:v2:${productId}`);
    await invalidateCacheKey(`pdp:reviews:v1:${productId}`);
  }
  await invalidateCachePattern('homepage:section:featured:*');
  await invalidateCachePattern('api:products:*');
  await invalidateCacheKey('rec:catalog-snapshot:v1');

  if (categoryId) {
    await invalidateCachePattern(`products:cat:${categoryId}:*`);
  } else {
    await invalidateCachePattern('products:*');
  }
}

/**
 * Invalidate Curated Collections, Hero Banners, and Woven Editorial Cards cache
 */
export async function invalidateHomepageEditorialCache() {
  await invalidateCacheKey('homepage:section:curated_collections');
  await invalidateCacheKey('homepage:section:editorial_cards');
  await invalidateCacheKey('homepage:section:hero_banners');
  await invalidateCacheKey('homepage:section:promotional_campaigns');
  await invalidateCachePattern('homepage:section:*');
}

/**
 * Cached fetcher for Homepage Promotional Showcases
 * Cache TTL: 5 minutes (300s)
 */
export async function getCachedPromotionalCampaigns(): Promise<PromotionalCampaign[]> {
  return getCachedOrFetch<PromotionalCampaign[]>(
    'homepage:section:promotional_campaigns',
    async () => {
      try {
        const { data: campaigns, error: campErr } = await supabaseServer
          .from('promotional_campaigns')
          .select('id, title, subtitle, slug, theme_preset, status, total_slots, grid_columns, website_enabled, android_enabled')
          .eq('status', 'published')
          .eq('website_enabled', true)
          .order('display_order', { ascending: true });

        if (campErr || !campaigns || campaigns.length === 0) {
          if (campErr) console.error('[Database Error] Failed to fetch promotional campaigns:', campErr.message);
          return [];
        }

        const campaignIds = campaigns.map((c: any) => c.id);
        const { data: slots, error: slotsErr } = await supabaseServer
          .from('promotional_campaign_slots')
          .select('id, campaign_id, slot_number, title, price_label, image_url, destination_type, destination_url')
          .in('campaign_id', campaignIds)
          .eq('is_active', true)
          .order('slot_number', { ascending: true });

        if (slotsErr) {
          console.error('[Database Error] Failed to fetch campaign slots:', slotsErr.message);
          return [];
        }

        return campaigns.map((camp: any) => ({
          ...camp,
          slots: (slots || []).filter((s: any) => s.campaign_id === camp.id),
        })) as PromotionalCampaign[];
      } catch (e) {
        console.error('[Database Exception] Error fetching promotional campaigns:', e);
        return [];
      }
    },
    300 // 5 min TTL
  );
}
