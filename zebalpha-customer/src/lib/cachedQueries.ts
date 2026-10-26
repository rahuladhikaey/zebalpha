import { getCachedOrFetch, invalidateCacheKey, invalidateCachePattern } from './cacheHelper';
import { supabaseServer } from './supabaseServer';
import { Product, Category, CuratedCollection, EditorialCard } from './types';

/**
 * Slim query fields for Curated Collections & Editorial Cards
 */
const SLIM_CURATED_COLLECTION_FIELDS = 'id, title, slug, short_description, link_url, image_url, display_order';
const SLIM_EDITORIAL_CARD_FIELDS = 'id, title, category, price, badge, href, image_url, display_order';

/**
 * Cached fetcher for Homepage Curated Collections Section
 * Cache TTL: 1 sec for real-time responsiveness with L2 Redis/memory cache
 */
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
    300 // 5 min TTL
  );
}

import { resolveCategoryIcon } from '../../../shared/constants/categoryIcons';

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
 * Cache TTL: 60s
 */
export async function getCachedNavigationCategories(): Promise<NavigationCategoryItem[]> {
  return getCachedOrFetch<NavigationCategoryItem[]>(
    'navigation:main_categories:active',
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
    60 // 60s cache
  );
}

/**
 * Cached fetcher for Homepage Categories (Fallback / Supporting)
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

/**
 * Cached fetcher for Homepage Curved Editorial Cards Section (Woven to Be Remembered)
 * Cache TTL: 1 sec for real-time responsiveness with L2 Redis/memory cache
 */
export async function getCachedEditorialCards(): Promise<EditorialCard[]> {
  return getCachedOrFetch<EditorialCard[]>(
    'homepage:section:editorial_cards',
    async () => {
      try {
        // Slim query: active records only, ordered by display_order
        const { data, error } = await supabaseServer
          .from('editorial_cards')
          .select(SLIM_EDITORIAL_CARD_FIELDS)
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .limit(16);

        if (!error && data && data.length > 0) {
          return data as EditorialCard[];
        }

        // Fallback: Query marketplace_settings key 'editorial_cards' safely
        const { data: settingData } = await supabaseServer
          .from('marketplace_settings')
          .select('setting_value')
          .eq('setting_key', 'editorial_cards')
          .maybeSingle();

        if (settingData?.setting_value) {
          const parsed = JSON.parse(settingData.setting_value);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed
              .filter((c: any) => c.is_active !== false)
              .map((c: any) => ({
                id: c.id,
                title: c.title,
                category: c.category,
                price: c.price,
                badge: c.badge,
                href: c.href,
                image_url: c.image_url,
                display_order: c.display_order ?? c.sort_order ?? 0,
                is_active: c.is_active ?? true,
              })) as EditorialCard[];
          }
        }
      } catch (e) {
        console.error('[Database Error] Failed to fetch editorial cards:', e);
      }
      return [];
    },
    10 // 10s TTL for real-time admin sync
  );
}

/**
/**
 * Resilient query fields for Homepage Featured Drops Grid Section
 * Omits non-existent columns (thumbnail_url, category) to prevent PostgREST 400 errors
 */
const SLIM_PRODUCT_FIELDS = 'id, name, brand, price, mrp, image_url, images, category_id, stock, low_stock_limit, status, is_active, is_approved, approval_status, created_at, specifications, seller_id';

export async function getCachedHomeProducts(brandFilter?: string, limit: number = 12): Promise<Product[]> {
  const brandKey = brandFilter ? brandFilter.toLowerCase().trim() : 'all';
  // Bumped to v4 to instantly invalidate any stale empty arrays in Redis
  const cacheKey = `homepage:section:featured:v4:brand:${brandKey}:limit:${limit}`;
  return getCachedOrFetch<Product[]>(
    cacheKey,
    async () => {
      let query = supabaseServer
        .from('products')
        .select(SLIM_PRODUCT_FIELDS)
        .or('is_active.is.null,is_active.eq.true')
        .neq('approval_status', 'rejected')
        .order('created_at', { ascending: false });

      if (brandFilter) {
        query = query.ilike('brand', `%${brandFilter}%`);
      }

      query = query.limit(limit);

      let { data, error } = await query;

      // Resilient fallback: If any slim column is missing in remote DB, fetch with select(*)
      if (error || !data) {
        console.warn('[Database Notice] Retrying home products with select(*):', error?.message);
        const fallback = await supabaseServer
          .from('products')
          .select('*')
          .or('is_active.is.null,is_active.eq.true')
          .neq('approval_status', 'rejected')
          .order('created_at', { ascending: false })
          .limit(limit);

        data = fallback.data;
        error = fallback.error;
      }

      if (error) {
        console.error('[Database Error] Failed to fetch home products:', error);
        return [];
      }

      const rawList = data || [];
      return rawList.map((p: any) => {
        const specs = p.specifications || {};
        const isPrem = p.is_premium === true || p.tier === 'PREMIUM' || specs.is_premium === true || specs.is_premium === 'true' || specs.tier === 'PREMIUM' || (p.name || '').toLowerCase().includes('premium');
        const isDrop = p.is_new_drop === true || specs.is_new_drop === true || specs.is_new_drop === 'true' || p.status === 'COMING_SOON';
        return {
          ...p,
          thumbnail_url: p.thumbnail_url || p.image_url || (Array.isArray(p.images) && p.images[0]) || '',
          is_premium: isPrem,
          tier: isPrem ? 'PREMIUM' : (p.tier || specs.tier || 'STANDARD'),
          is_new_drop: isDrop,
          collection: p.collection || specs.collection || '',
          target_drop_date: p.target_drop_date || specs.target_drop_date || '',
          category: p.category || specs.category || 'Apparel',
        };
      }) as unknown as Product[];
    },
    120 // 2 min TTL
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
        .select('id, name, price, main_image, is_active, stock, seller_id, created_at')
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
    600 // 10 mins TTL
  );
}

/**
 * Cached fetcher for Product Details by Product ID
 * Cache TTL: 40 minutes (2400s)
 */
export async function getCachedProductById(productId: string): Promise<Product | null> {
  const cacheKey = `product:detail:${productId}`;
  return getCachedOrFetch<Product | null>(
    cacheKey,
    async () => {
      const { data, error } = await supabaseServer
        .from('products')
        .select('*')
        .eq('id', productId)
        .maybeSingle();

      if (error) {
        console.error(`[Database Error] Failed to fetch product ${productId}:`, error);
        return null;
      }
      return data as Product | null;
    },
    2400 // 40 mins TTL
  );
}

/**
 * Invalidate Product cache whenever product is updated or inventory changes
 */
export async function invalidateProductCache(productId?: string, categoryId?: string) {
  if (productId) {
    await invalidateCacheKey(`product:detail:${productId}`);
    await invalidateCacheKey(`product:id:${productId}`);
  }
  // Invalidate homepage featured sections
  await invalidateCachePattern('homepage:section:featured:*');

  if (categoryId) {
    await invalidateCachePattern(`products:cat:${categoryId}:*`);
  } else {
    await invalidateCachePattern('products:*');
  }
}

/**
 * Invalidate Curated Collections and Woven Editorial Cards cache
 */
export async function invalidateHomepageEditorialCache() {
  await invalidateCacheKey('homepage:section:curated_collections');
  await invalidateCacheKey('homepage:section:editorial_cards');
  await invalidateCachePattern('homepage:section:*');
}

export interface CustomerSpotlightCard {
  cardType: 'seller_product' | 'editorial';
  id: string;
  title: string;
  subtitle?: string | null;
  price?: number;
  mrp?: number | null;
  fromPrice?: number | null;
  image: string;
  destinationUrl: string;
  displayOrder: number;
}

export interface CustomerSpotlightCampaign {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  theme: string;
  displayOrder: number;
  cards: CustomerSpotlightCard[];
}

/**
 * Cached fetcher for Published Spotlight Campaigns (Top Deals, Brand Spotlight, etc.)
 * Strictly filters by publication status, schedule, and platform visibility
 */
export async function getCachedSpotlightCampaigns(isAndroid: boolean = false): Promise<CustomerSpotlightCampaign[]> {
  const platform = isAndroid ? 'android' : 'website';
  const cacheKey = `homepage:spotlight:v2:${platform}`;

  return getCachedOrFetch<CustomerSpotlightCampaign[]>(
    cacheKey,
    async () => {
      try {
        const now = new Date().toISOString();
        let query = supabaseServer
          .from('spotlight_campaigns')
          .select(`
            id,
            name,
            slug,
            description,
            theme,
            display_order,
            status,
            starts_at,
            ends_at,
            website_enabled,
            android_enabled,
            spotlight_campaign_items (
              id,
              card_type,
              product_id,
              editorial_card_id,
              display_order
            )
          `)
          .eq('status', 'published')
          .order('display_order', { ascending: true });

        if (isAndroid) {
          query = query.eq('android_enabled', true);
        } else {
          query = query.eq('website_enabled', true);
        }

        const { data: rawCampaigns, error } = await query;
        if (error || !rawCampaigns || rawCampaigns.length === 0) {
          return [];
        }

        // Filter valid schedules
        const activeCampaigns = rawCampaigns.filter((c: any) => {
          if (c.starts_at && new Date(c.starts_at) > new Date(now)) return false;
          if (c.ends_at && new Date(c.ends_at) < new Date(now)) return false;
          return true;
        });

        if (activeCampaigns.length === 0) return [];

        const allProductIds: string[] = [];
        const allEditorialIds: string[] = [];

        activeCampaigns.forEach((c: any) => {
          (c.spotlight_campaign_items || []).forEach((it: any) => {
            if (it.card_type === 'seller_product' && it.product_id) {
              allProductIds.push(it.product_id);
            } else if (it.card_type === 'editorial' && it.editorial_card_id) {
              allEditorialIds.push(it.editorial_card_id);
            }
          });
        });

        let productsMap: Record<string, any> = {};
        if (allProductIds.length > 0) {
          const { data: prods } = await supabaseServer
            .from('products')
            .select(`
              id,
              name,
              brand,
              price,
              mrp,
              stock,
              image_url,
              images,
              is_active,
              is_approved,
              sellers (
                store_name,
                business_name
              )
            `)
            .in('id', [...new Set(allProductIds)])
            .eq('is_active', true)
            .eq('is_approved', true);

          (prods || []).forEach((p: any) => {
            productsMap[p.id] = {
              id: p.id,
              name: p.name,
              brand: p.brand || 'ZEBALPHA',
              price: Number(p.price),
              mrp: p.mrp ? Number(p.mrp) : null,
              image: p.image_url || (Array.isArray(p.images) && p.images[0]) || '',
              sellerName: p.sellers?.store_name || p.sellers?.business_name || 'Official Seller',
              destinationUrl: `/products/${p.id}`,
            };
          });
        }

        let editorialMap: Record<string, any> = {};
        if (allEditorialIds.length > 0) {
          const { data: edits } = await supabaseServer
            .from('spotlight_editorial_cards')
            .select('*')
            .in('id', [...new Set(allEditorialIds)])
            .eq('is_active', true);

          (edits || []).forEach((e: any) => {
            editorialMap[e.id] = {
              id: e.id,
              title: e.title,
              subtitle: e.subtitle,
              image: e.image_url,
              destinationUrl: e.destination_url,
              fromPrice: e.price_mode === 'manual' ? e.manual_from_price : e.calculated_from_price,
            };
          });
        }

        const validCampaigns: CustomerSpotlightCampaign[] = [];

        for (const camp of activeCampaigns) {
          const sortedItems = (camp.spotlight_campaign_items || []).sort(
            (a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0)
          );

          const cards: CustomerSpotlightCard[] = [];
          for (const item of sortedItems) {
            if (item.card_type === 'seller_product') {
              const p = productsMap[item.product_id];
              if (p && p.image) {
                cards.push({
                  cardType: 'seller_product',
                  id: p.id,
                  title: p.name,
                  subtitle: p.sellerName,
                  price: p.price,
                  mrp: p.mrp,
                  image: p.image,
                  destinationUrl: p.destinationUrl,
                  displayOrder: item.display_order,
                });
              }
            } else if (item.card_type === 'editorial') {
              const e = editorialMap[item.editorial_card_id];
              if (e && e.image) {
                cards.push({
                  cardType: 'editorial',
                  id: e.id,
                  title: e.title,
                  subtitle: e.subtitle,
                  fromPrice: e.fromPrice,
                  image: e.image,
                  destinationUrl: e.destinationUrl,
                  displayOrder: item.display_order,
                });
              }
            }
          }

          if (cards.length > 0) {
            validCampaigns.push({
              id: camp.id,
              name: camp.name,
              slug: camp.slug || camp.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              description: camp.description,
              theme: camp.theme || 'default',
              displayOrder: camp.display_order ?? 0,
              cards,
            });
          }
        }

        return validCampaigns;
      } catch (err) {
        console.error('[Spotlight Fetch Error]:', err);
        return [];
      }
    },
    15 // 15s TTL for real-time responsiveness
  );
}

export async function invalidateSpotlightCache() {
  await invalidateCacheKey('homepage:spotlight:v2:website');
  await invalidateCacheKey('homepage:spotlight:v2:android');
  await invalidateCachePattern('homepage:spotlight:*');
}

