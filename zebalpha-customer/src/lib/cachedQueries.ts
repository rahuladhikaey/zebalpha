import { getCachedOrFetch, invalidateCacheKey, invalidateCachePattern } from './cacheHelper';
import { supabaseServer } from './supabaseServer';
export { supabaseServer } from './supabaseServer';
import {
  Product,
  Category,
  CuratedCollection,
  EditorialCard,
  PromotionalCampaign,
  SduiHomepageBlueprint,
  SduiWidgetConfig,
} from './types';
import {
  PREBUILT_EXPERIENCE_PRESETS,
  DEFAULT_HOME_SECTIONS,
  DEFAULT_ASSETS,
  DEFAULT_TYPOGRAPHY,
  CustomerActiveExperiencePayload,
  ExperienceRecord,
  resolveActiveExperience,
} from './experienceThemes';
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
  await invalidateCacheKey('homepage:sdui:layout:v1');
  await invalidateCacheKey('homepage:dems:current:v1');
  await invalidateCachePattern('homepage:section:*');
  await invalidateCachePattern('homepage:sdui:*');
  await invalidateCachePattern('homepage:dems:*');
}

export const DEFAULT_CUSTOMER_EXPERIENCE_PAYLOAD: CustomerActiveExperiencePayload = {
  version: 1,
  schemaVersion: 1,
  activeExperienceId: PREBUILT_EXPERIENCE_PRESETS[0].id,
  name: PREBUILT_EXPERIENCE_PRESETS[0].name,
  slug: PREBUILT_EXPERIENCE_PRESETS[0].slug,
  festivalName: PREBUILT_EXPERIENCE_PRESETS[0].festival_name,
  experienceType: PREBUILT_EXPERIENCE_PRESETS[0].experience_type,
  isDefault: true,
  timezone: 'Asia/Kolkata',
  effectiveStartAt: null,
  effectiveEndAt: null,
  lastUpdatedAt: '2026-11-24T00:00:00.000Z',
  lastPublishedBy: 'Super Admin',
  themeTokens: PREBUILT_EXPERIENCE_PRESETS[0].theme_tokens,
  typography: DEFAULT_TYPOGRAPHY,
  assets: DEFAULT_ASSETS,
  homeSections: DEFAULT_HOME_SECTIONS,
  banners: [],
  campaigns: [],
  popups: [],
  announcements: [],
};

/**
 * Single-Key Cached DEMS Customer Experience Fetcher (~3 KB payload)
 * Dynamically evaluates scheduled start/end dates in Asia/Kolkata timezone so scheduled
 * festival themes auto-activate and auto-expire back to Default ZebAlpha Theme without manual cron delay!
 */
export async function getCachedActiveCustomerExperience(): Promise<CustomerActiveExperiencePayload> {
  return getCachedOrFetch<CustomerActiveExperiencePayload>(
    'homepage:dems:current:v1',
    async () => {
      try {
        const { data: rows, error } = await supabaseServer
          .from('store_settings')
          .select('key, value')
          .in('key', ['dems_master_state_v1', 'dems_active_experience_v1']);

        if (error || !rows || rows.length === 0) {
          return DEFAULT_CUSTOMER_EXPERIENCE_PAYLOAD;
        }

        const map: Record<string, any> = {};
        rows.forEach((r: any) => {
          map[r.key] = typeof r.value === 'string' ? JSON.parse(r.value) : r.value;
        });

        const master = map.dems_master_state_v1;
        if (master && Array.isArray(master.experiences) && master.experiences.length > 0) {
          const nowMs = Date.now();
          const { activeExperience } = resolveActiveExperience(
            master.experiences as ExperienceRecord[],
            nowMs
          );

          const filterByWindow = (list: any[]) =>
            (Array.isArray(list) ? list : [])
              .filter((item) => {
                if (item.status !== 'active' && item.status !== 'scheduled') return false;
                const sMs = item.start_at ? new Date(item.start_at).getTime() : null;
                const eMs = item.end_at ? new Date(item.end_at).getTime() : null;
                if (sMs && !Number.isNaN(sMs) && sMs > nowMs) return false;
                if (eMs && !Number.isNaN(eMs) && eMs <= nowMs) return false;
                return true;
              })
              .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));

          return {
            version: Number(master.version || 1),
            schemaVersion: Number(master.schema_version || 1),
            activeExperienceId: activeExperience.id,
            name: activeExperience.name,
            slug: activeExperience.slug,
            festivalName: activeExperience.festival_name,
            experienceType: activeExperience.experience_type,
            isDefault: Boolean(activeExperience.is_default),
            timezone: master.timezone || 'Asia/Kolkata',
            effectiveStartAt: activeExperience.start_at || null,
            effectiveEndAt: activeExperience.end_at || null,
            lastUpdatedAt: activeExperience.updated_at || master.updated_at || new Date().toISOString(),
            lastPublishedBy: activeExperience.last_published_by || 'Super Admin',
            themeTokens: activeExperience.theme_tokens || PREBUILT_EXPERIENCE_PRESETS[0].theme_tokens,
            typography: activeExperience.typography || DEFAULT_TYPOGRAPHY,
            assets: activeExperience.assets || DEFAULT_ASSETS,
            homeSections: (activeExperience.home_sections || DEFAULT_HOME_SECTIONS).sort(
              (a, b) => (a.display_order ?? 99) - (b.display_order ?? 99)
            ),
            banners: filterByWindow(master.banners),
            campaigns: filterByWindow(master.campaigns),
            popups: filterByWindow(master.popups),
            announcements: filterByWindow(master.announcements),
          };
        }

        if (map.dems_active_experience_v1) {
          return {
            ...DEFAULT_CUSTOMER_EXPERIENCE_PAYLOAD,
            ...map.dems_active_experience_v1,
          };
        }

        return DEFAULT_CUSTOMER_EXPERIENCE_PAYLOAD;
      } catch (e) {
        console.error('[DEMS Active Experience Fallback]:', e);
        return DEFAULT_CUSTOMER_EXPERIENCE_PAYLOAD;
      }
    },
    180 // 3 min TTL in L1 RAM + Redis (purged in <1s on SuperAdmin publish/schedule/rollback)
  );
}

export const DEFAULT_SDUI_HOMEPAGE_BLUEPRINT: SduiHomepageBlueprint = {
  version: 1,
  updated_at: '2026-11-24T00:00:00.000Z',
  global_theme: {
    header_backdrop: 'festive_coral_gold',
    announcement_bar_enabled: true,
    trust_bar_enabled: true,
    free_shipping_threshold: 499,
    trust_badges: [
      { icon: 'truck', title: 'Free Delivery', subtitle: 'on ₹499+' },
      { icon: 'shield', title: 'Easy Returns', subtitle: '5-Day Policy' },
      { icon: 'badge', title: 'Secure Shopping', subtitle: '100% Safe' },
    ],
    marquee_items: [
      { icon: 'crown', text: 'ZEBALPHA • CLOTHING FOR THE CULTURE' },
      { icon: 'flame', text: 'NEW SEASON DROP • AUTHENTIC STREETWEAR' },
      { icon: 'shield', text: '100% PREMIUM COMBED COTTON' },
      { icon: 'truck', text: 'FREE EXPRESS SHIPPING ON ORDERS OVER ₹499' },
      { icon: 'tag', text: 'FLAT ₹100 OFF ON 1ST ORDER (CODE: FIRST100)' },
    ],
  },
  widgets: [
    {
      id: 'hero_carousel',
      widget_type: 'HERO_CAROUSEL',
      title: 'Main Hero Banners',
      subtitle: 'Top sliding promotional banners',
      enabled: true,
      web_enabled: true,
      app_enabled: true,
      display_order: 1,
      config: {},
    },
    {
      id: 'trust_badge_strip',
      widget_type: 'TRUST_BADGE_STRIP',
      title: '3-Column Trust & Delivery Strip',
      subtitle: 'Free Delivery, Easy Returns, Secure Shopping',
      enabled: true,
      web_enabled: true,
      app_enabled: true,
      display_order: 2,
      config: {},
    },
    {
      id: 'marquee_ticker',
      widget_type: 'MARQUEE_TICKER',
      title: 'Scrolling Champagne-Gold Offer Marquee',
      subtitle: 'Continuous promotional announcement ticker',
      enabled: true,
      web_enabled: true,
      app_enabled: true,
      display_order: 3,
      config: {},
    },
    {
      id: 'curated_collections',
      widget_type: 'CURATED_COLLECTIONS',
      title: 'Curated Collections',
      subtitle: 'Handpicked styles for the culture',
      enabled: true,
      web_enabled: true,
      app_enabled: true,
      display_order: 4,
      config: {},
    },
    {
      id: 'promo_drop_carousel',
      widget_type: 'PROMO_DROP_CAROUSEL',
      title: '1st Order ₹100 OFF & New Season Drop Slider',
      subtitle: 'Auto-sliding conversion cards',
      enabled: true,
      web_enabled: true,
      app_enabled: true,
      display_order: 5,
      config: { show_first_order_slide: true, show_new_drop_slide: true },
    },
    {
      id: 'flash_deal_strip',
      widget_type: 'FLASH_DEAL_STRIP',
      title: 'Flash Culture Deals',
      subtitle: 'Limited-time price drops — grab before timer ends',
      enabled: false,
      web_enabled: true,
      app_enabled: true,
      display_order: 6,
      config: {
        badge_text: 'LIVE FLASH SALE',
        ends_at: '',
        product_ids: [],
        max_items: 8,
        cta_label: 'View All Deals',
        cta_href: '/products',
      },
    },
    {
      id: 'festive_16_slot_grid',
      widget_type: 'FESTIVE_16_SLOT_GRID',
      title: 'TOP DEALS',
      subtitle: 'Festive Picks • Unbeatable Prices • Shop More, Celebrate Bigger',
      enabled: true,
      web_enabled: true,
      app_enabled: true,
      display_order: 7,
      config: { campaign_slug: 'top-deals' },
    },
    {
      id: 'custom_studio_editorial',
      widget_type: 'CUSTOM_STUDIO_EDITORIAL',
      title: 'Customize & Wear Your Art',
      subtitle:
        'Tap any artwork below to open Custom Studio with that exact design ready on tees, hoodies & totes.',
      enabled: true,
      web_enabled: true,
      app_enabled: true,
      display_order: 8,
      config: {
        eyebrow: 'ZEBALPHA CUSTOM STUDIO',
        title_line_1: 'Customize &',
        title_line_2: 'Wear Your Art',
      },
    },
    {
      id: 'seller_brand_spotlight',
      widget_type: 'SELLER_BRAND_SPOTLIGHT',
      title: 'Featured Brand Showcase',
      subtitle: 'Spotlight • Emerging Indian Brands',
      enabled: true,
      web_enabled: true,
      app_enabled: true,
      display_order: 9,
      config: {},
    },
    {
      id: 'featured_product_feed',
      widget_type: 'FEATURED_PRODUCT_FEED',
      title: 'Our Products',
      subtitle: 'Streetwear, polos, hoodies & curated culture drops',
      enabled: true,
      web_enabled: true,
      app_enabled: true,
      display_order: 10,
      config: { cta_label: 'Create', cta_href: '/customize' },
    },
    {
      id: 'recently_viewed',
      widget_type: 'RECENTLY_VIEWED',
      title: 'Recently Viewed',
      subtitle: 'Pick up right where you left off',
      enabled: true,
      web_enabled: true,
      app_enabled: true,
      display_order: 11,
      config: {},
    },
  ],
};

/**
 * Single-Key Cached SDUI Homepage Layout Blueprint Fetcher (~1.8 KB payload)
 * Consolidates sdui_homepage_layout_v1, marquee_banner, and billing threshold into ONE cached read
 * so browser clients NEVER query store_settings directly on homepage visits.
 * Cache TTL: 10 minutes (600s) — purged instantaneously on SuperAdmin publish.
 */
export async function getCachedHomepageLayout(): Promise<SduiHomepageBlueprint> {
  return getCachedOrFetch<SduiHomepageBlueprint>(
    'homepage:sdui:layout:v1',
    async () => {
      try {
        const { data: rows, error } = await supabaseServer
          .from('store_settings')
          .select('key, value')
          .in('key', ['sdui_homepage_layout_v1', 'marquee_banner', 'marketplace_rules', 'billing']);

        if (error || !rows || rows.length === 0) {
          return DEFAULT_SDUI_HOMEPAGE_BLUEPRINT;
        }

        const map: Record<string, any> = {};
        rows.forEach((r: any) => {
          map[r.key] = r.value;
        });

        const rawLayout =
          typeof map.sdui_homepage_layout_v1 === 'string'
            ? JSON.parse(map.sdui_homepage_layout_v1)
            : map.sdui_homepage_layout_v1;

        const mRules = map.marketplace_rules || {};
        const bRules = map.billing || {};
        const freeThresholdRaw = mRules.freeShippingThreshold ?? bRules.freeDeliveryThreshold;
        const resolvedFreeThreshold =
          freeThresholdRaw !== undefined && freeThresholdRaw !== null && !isNaN(Number(freeThresholdRaw))
            ? Number(freeThresholdRaw)
            : DEFAULT_SDUI_HOMEPAGE_BLUEPRINT.global_theme.free_shipping_threshold || 499;

        const baseTheme = {
          ...DEFAULT_SDUI_HOMEPAGE_BLUEPRINT.global_theme,
          ...(rawLayout?.global_theme || {}),
          free_shipping_threshold: resolvedFreeThreshold,
        };

        // Sync standalone marquee_banner if present and global_theme.marquee_items wasn't customized
        if (
          (!rawLayout?.global_theme?.marquee_items || rawLayout.global_theme.marquee_items.length === 0) &&
          Array.isArray(map.marquee_banner) &&
          map.marquee_banner.length > 0
        ) {
          baseTheme.marquee_items = map.marquee_banner;
        }

        // Merge saved widgets with default widget registry so new widgets never go missing
        const savedWidgets: SduiWidgetConfig[] = Array.isArray(rawLayout?.widgets)
          ? rawLayout.widgets
          : [];
        const savedByType = new Map<string, SduiWidgetConfig>();
        savedWidgets.forEach((w) => {
          if (w && w.widget_type) savedByType.set(w.widget_type, w);
        });

        const mergedWidgets: SduiWidgetConfig[] = DEFAULT_SDUI_HOMEPAGE_BLUEPRINT.widgets.map(
          (defW) => {
            const existing = savedByType.get(defW.widget_type);
            if (!existing) return defW;
            return {
              ...defW,
              ...existing,
              config: {
                ...(defW.config || {}),
                ...(existing.config || {}),
              },
            };
          }
        );

        mergedWidgets.sort((a, b) => (a.display_order ?? 99) - (b.display_order ?? 99));

        return {
          version: Number(rawLayout?.version || 1),
          updated_at: String(rawLayout?.updated_at || new Date().toISOString()),
          global_theme: baseTheme,
          widgets: mergedWidgets,
        };
      } catch (e) {
        console.error('[SDUI Blueprint Fetch Fallback]:', e);
        return DEFAULT_SDUI_HOMEPAGE_BLUEPRINT;
      }
    },
    600 // 10 min TTL in L1 RAM + Upstash Redis
  );
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
