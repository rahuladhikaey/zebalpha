import { redis } from './redis'

// Simple in-memory fallback cache for dev environment when Redis is not available
const inMemoryCache = new Map<string, { data: any; expiresAt: number }>()

/**
 * Cache-Aside Helper Function
 * Checks Redis (or in-memory fallback) first. On cache miss, executes fetchFn, stores result, and returns data.
 *
 * @param key Unique cache key (e.g. 'products:featured', 'user:profile:123')
 * @param fetchFn Asynchronous data fetching callback (e.g., Supabase query)
 * @param ttlSeconds Time To Live in seconds (default: 300 seconds / 5 minutes)
 */
export async function getCachedOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  // 1. Try Redis if configured
  if (redis) {
    try {
      const cached = await redis.get<T>(key)
      if (cached !== null && cached !== undefined) {
        return cached
      }
    } catch (err) {
      console.error(`[Redis Error] Failed to read key "${key}":`, err)
    }
  } else {
    // Fallback: Check in-memory Map
    const item = inMemoryCache.get(key)
    if (item && item.expiresAt > Date.now()) {
      return item.data as T
    }
  }

  // 2. Cache miss: Fetch fresh data from database
  const freshData = await fetchFn()

  // 3. Save fresh data to Redis (or fallback)
  if (freshData !== undefined && freshData !== null) {
    if (redis) {
      try {
        await redis.set(key, freshData, { ex: ttlSeconds })
      } catch (err) {
        console.error(`[Redis Error] Failed to set key "${key}":`, err)
      }
    } else {
      inMemoryCache.set(key, {
        data: freshData,
        expiresAt: Date.now() + ttlSeconds * 1000,
      })
    }
  }

  return freshData
}

/**
 * Delete a specific key from cache
 */
export async function invalidateCacheKey(key: string): Promise<void> {
  if (redis) {
    try {
      await redis.del(key)
    } catch (err) {
      console.error(`[Redis Error] Failed to delete key "${key}":`, err)
    }
  } else {
    inMemoryCache.delete(key)
  }
}

/**
 * Delete keys matching a pattern (e.g. 'products:*')
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  if (redis) {
    try {
      const keys = await redis.keys(pattern)
      if (keys && keys.length > 0) {
        await redis.del(...keys)
      }
    } catch (err) {
      console.error(`[Redis Error] Failed to delete pattern "${pattern}":`, err)
    }
  } else {
    for (const key of inMemoryCache.keys()) {
      if (key.startsWith(pattern.replace('*', ''))) {
        inMemoryCache.delete(key)
      }
    }
  }
}
