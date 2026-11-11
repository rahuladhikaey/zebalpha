import { redis } from './redis'

// Enterprise L1 In-Memory Cache (RAM-based, 0ms latency, $0 bandwidth)
const inMemoryCache = new Map<string, { data: any; expiresAt: number }>()

// Maximum payload size allowed for remote Redis (15 KB)
// Anything larger stays in ultra-fast L1 In-Memory Cache to guarantee Upstash bandwidth is never exhausted.
const MAX_REDIS_PAYLOAD_BYTES = 15 * 1024

/**
 * Enterprise Two-Tier Cache Helper (L1 In-Memory + L2 Redis)
 * Follows Flipkart & Meesho architecture:
 * - L1 In-Memory Cache is checked first (0ms latency, 0 external network transfer).
 * - L2 Redis is checked on L1 miss for cross-instance synchronization.
 * - Guarded writes prevent multi-megabyte payloads from bloating remote Redis bandwidth.
 * - Graceful degradation: If Redis is throttled or offline, L1 in-memory continues uninterrupted.
 *
 * @param key Unique cache key (e.g. 'categories:tree', 'products:similar:123')
 * @param fetchFn Asynchronous data fetching callback (e.g., Supabase query)
 * @param ttlSeconds Time To Live in seconds (default: 300 seconds / 5 minutes)
 */
export async function getCachedOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  // 1. Tier 1 (L1 In-Memory Cache) — Instant & 0 bandwidth
  const memItem = inMemoryCache.get(key)
  if (memItem && memItem.expiresAt > Date.now()) {
    return memItem.data as T
  }

  // 2. Tier 2 (L2 Remote Redis) — Optional check if L1 missed
  if (redis) {
    try {
      const cached = await redis.get<T>(key)
      if (cached !== null && cached !== undefined) {
        // Hydrate L1 cache so subsequent requests don't hit Redis repeatedly
        inMemoryCache.set(key, {
          data: cached,
          expiresAt: Date.now() + ttlSeconds * 1000,
        })
        return cached
      }
    } catch (err) {
      // Graceful fallback on Redis throttling or quota exhaustion
      console.warn(`[Cache Notice] Redis read bypassed for key "${key}":`, (err as any)?.message || err)
    }
  }

  // 3. Cache Miss: Fetch fresh authoritative data
  const freshData = await fetchFn()

  // 4. Save to L1 Cache & Guarded write to L2 Remote Redis
  if (freshData !== undefined && freshData !== null) {
    // Always store in local RAM (0 bandwidth)
    inMemoryCache.set(key, {
      data: freshData,
      expiresAt: Date.now() + ttlSeconds * 1000,
    })

    // Only write to remote Redis if payload is lightweight (< 15 KB)
    if (redis) {
      try {
        const payloadStr = JSON.stringify(freshData)
        if (payloadStr.length <= MAX_REDIS_PAYLOAD_BYTES) {
          await redis.set(key, freshData, { ex: ttlSeconds })
        }
      } catch (err) {
        console.warn(`[Cache Notice] Redis write bypassed for key "${key}":`, (err as any)?.message || err)
      }
    }
  }

  return freshData
}

/**
 * Delete a specific key from both L1 In-Memory and L2 Redis
 */
export async function invalidateCacheKey(key: string): Promise<void> {
  inMemoryCache.delete(key)
  if (redis) {
    try {
      await redis.del(key)
    } catch (err) {
      console.warn(`[Cache Notice] Redis delete bypassed for key "${key}":`, (err as any)?.message || err)
    }
  }
}

/**
 * Delete keys matching a pattern (e.g. 'products:*') from both tiers
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  const prefix = pattern.replace('*', '')
  for (const key of inMemoryCache.keys()) {
    if (key.startsWith(prefix)) {
      inMemoryCache.delete(key)
    }
  }
  if (redis) {
    try {
      const keys = await redis.keys(pattern)
      if (keys && keys.length > 0) {
        await redis.del(...keys)
      }
    } catch (err) {
      console.warn(`[Cache Notice] Redis pattern delete bypassed for "${pattern}":`, (err as any)?.message || err)
    }
  }
}
