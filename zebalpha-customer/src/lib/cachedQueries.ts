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
    1 // 1 sec TTL for real-time responsiveness
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
          .select('id, name, slug, image_url, description, sort_order, is_active')
          .or('is_active.is.null,is_active.eq.true')
          .order('sort_order', { ascending: true })
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
    1 // 1 sec TTL for real-time responsiveness
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
    5 // 5 sec TTL for real-time responsiveness when sellers add products
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

