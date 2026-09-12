import { getCachedOrFetch, invalidateCacheKey, invalidateCachePattern } from './cacheHelper'
import { supabaseServer } from './supabaseServer'

/**
 * Cached fetcher for Active Categories
 * Cache TTL: 15 minutes (900s)
 */
export async function getCachedCategories() {
  return getCachedOrFetch(
    'categories:all',
    async () => {
      const { data, error } = await supabaseServer
        .from('categories')
        .select('*')
        .order('name', { ascending: true })

      if (error) {
        console.error('[Database Error] Failed to fetch categories:', error)
        return []
      }
      return data || []
    },
    900 // 15 mins TTL
  )
}

/**
 * Cached fetcher for Active Products by Category
 * Cache TTL: 5 minutes (300s)
 */
export async function getCachedProductsByCategory(categoryId: string, limit: number = 20) {
  const cacheKey = `products:cat:${categoryId}:limit:${limit}`
  return getCachedOrFetch(
    cacheKey,
    async () => {
      const { data, error } = await supabaseServer
        .from('products')
        .select('id, name, price, main_image, is_active, stock, seller_id, created_at')
        .eq('category_id', categoryId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error(`[Database Error] Failed to fetch products for category ${categoryId}:`, error)
        return []
      }
      return data || []
    },
    300 // 5 mins TTL
  )
}

/**
 * Cached fetcher for Product Details by Product ID
 * Cache TTL: 10 minutes (600s)
 */
export async function getCachedProductById(productId: string) {
  const cacheKey = `product:id:${productId}`
  return getCachedOrFetch(
    cacheKey,
    async () => {
      const { data, error } = await supabaseServer
        .from('products')
        .select('*')
        .eq('id', productId)
        .maybeSingle()

      if (error) {
        console.error(`[Database Error] Failed to fetch product ${productId}:`, error)
        return null
      }
      return data
    },
    600 // 10 mins TTL
  )
}

/**
 * Invalidate Product cache whenever product is updated or inventory changes
 */
export async function invalidateProductCache(productId?: string, categoryId?: string) {
  if (productId) {
    await invalidateCacheKey(`product:id:${productId}`)
  }
  if (categoryId) {
    await invalidateCachePattern(`products:cat:${categoryId}:*`)
  } else {
    await invalidateCachePattern('products:*')
  }
}
