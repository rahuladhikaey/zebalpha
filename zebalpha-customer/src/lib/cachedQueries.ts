import { getCachedOrFetch, invalidateCacheKey, invalidateCachePattern } from './cacheHelper';
import { supabaseServer } from './supabaseServer';
import { Product, Category } from './types';

/**
 * Cached fetcher for Active Categories
 * Cache TTL: 12 hours (43200s)
 */
export async function getCachedCategories() {
  return getCachedOrFetch<Category[]>(
    'categories:all',
    async () => {
      const { data, error } = await supabaseServer
        .from('categories')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('[Database Error] Failed to fetch categories:', error);
        return [];
      }
      return (data || []) as Category[];
    },
    43200 // 12 hours TTL
  );
}

/**
 * Cached fetcher for Homepage Curated Categories Section (Section 9)
 * Cache TTL: 20 minutes (1200s)
 */
export async function getCachedHomeCategories(limit: number = 16): Promise<Category[]> {
  return getCachedOrFetch<Category[]>(
    `homepage:section:categories:limit:${limit}`,
    async () => {
      const { data, error } = await supabaseServer
        .from('categories')
        .select('id, name, slug, image_url, icon, main_category, description, is_active')
        .or('is_active.is.null,is_active.eq.true')
        .order('name', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('[Database Error] Failed to fetch home categories:', error);
        return [];
      }
      return (data || []) as Category[];
    },
    1200 // 20 mins TTL
  );
}

/**
 * Cached fetcher for Homepage Featured Drops Grid Section (Section 9)
 * Cache TTL: 20 minutes (1200s)
 */
const SLIM_PRODUCT_FIELDS = '*';

export async function getCachedHomeProducts(brandFilter?: string, limit: number = 12): Promise<Product[]> {
  const brandKey = brandFilter ? brandFilter.toLowerCase().trim() : 'all';
  const cacheKey = `homepage:section:featured:v3:brand:${brandKey}:limit:${limit}`;
  return getCachedOrFetch<Product[]>(
    cacheKey,
    async () => {
      let query = supabaseServer
        .from('products')
        .select(SLIM_PRODUCT_FIELDS)
        .or('is_active.is.null,is_active.eq.true')
        .or('is_approved.is.null,is_approved.eq.true')
        .neq('approval_status', 'rejected')
        .order('created_at', { ascending: false });

      if (brandFilter) {
        query = query.ilike('brand', `%${brandFilter}%`);
      }

      query = query.limit(limit);

      const { data, error } = await query;
      if (error) {
        console.error('[Database Error] Failed to fetch home products:', error);
        return [];
      }
      return (data || []) as unknown as Product[];
    },
    1200 // 20 mins TTL
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
