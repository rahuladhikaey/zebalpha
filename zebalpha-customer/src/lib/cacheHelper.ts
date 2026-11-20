import { redis } from './redis'

// Enterprise L1 In-Memory Cache (RAM-based, 0ms latency, $0 bandwidth, $0 Upstash commands)
const L1_MAX_ENTRIES = 250
const inMemoryCache = new Map<string, { data: unknown; expiresAt: number }>()

// Singleflight map: coalesces concurrent cache misses (e.g. 500 users on cold start -> 1 DB read + 1 Redis write)
const inflightFetches = new Map<string, Promise<unknown>>()

// Maximum payload size allowed for remote Redis (300 KB)
// Protects Upstash 10 GB monthly bandwidth & 250 MB storage while caching slimmed catalog pages cleanly.
const MAX_REDIS_PAYLOAD_BYTES = 300 * 1024

function setL1(key: string, data: unknown, ttlSeconds: number) {
  if (inMemoryCache.has(key)) {
    inMemoryCache.delete(key)
  } else if (inMemoryCache.size >= L1_MAX_ENTRIES) {
    // Evict oldest entry (Map preserves insertion order)
    const oldestKey = inMemoryCache.keys().next().value
    if (oldestKey !== undefined) {
      inMemoryCache.delete(oldestKey)
    }
  }
  inMemoryCache.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  })
}

/**
 * Enterprise Multi-Tier Cache Helper (L1 In-Memory RAM + Singleflight + L2 Upstash Redis)
 * Flipkart & Meesho production architecture:
 * - L1 RAM is checked first (0ms latency, 0 Supabase egress, 0 Upstash bandwidth).
 * - Singleflight coalesces concurrent cold misses so 500 simultaneous users trigger only 1 DB read.
 * - L2 Upstash Redis synchronizes across serverless instances without exhausting 10 GB/mo free tier.
 * - Graceful degradation: If Redis is throttled or unconfigured, L1 RAM continues uninterrupted.
 */
export async function getCachedOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttlSeconds: number = 300
): Promise<T> {
  const now = Date.now()

  // 1. Tier 1 (L1 In-Memory Cache) — Instant, 0 DB egress, 0 Redis bandwidth
  const memItem = inMemoryCache.get(key)
  if (memItem && memItem.expiresAt > now) {
    return memItem.data as T
  }

  // 2. Singleflight Coalescing — Share in-flight read across concurrent requests
  const existingInflight = inflightFetches.get(key)
  if (existingInflight) {
    return (await existingInflight) as T
  }

  const work = (async (): Promise<T> => {
    // 3. Tier 2 (L2 Remote Upstash Redis) — Checked only on L1 miss
    if (redis) {
      try {
        const cached = await redis.get<T>(key)
        if (cached !== null && cached !== undefined) {
          setL1(key, cached, ttlSeconds)
          return cached
        }
      } catch (err) {
        console.warn(`[Cache Notice] Redis read bypassed for key "${key}":`, (err as Error)?.message || err)
      }
    }

    // 4. Authoritative L3 Fetch (Supabase DB)
    const freshData = await fetchFn()

    // 5. Hydrate L1 RAM & Guarded write to L2 Redis
    if (freshData !== undefined && freshData !== null) {
      setL1(key, freshData, ttlSeconds)

      if (redis) {
        try {
          const payloadStr = JSON.stringify(freshData)
          if (payloadStr.length <= MAX_REDIS_PAYLOAD_BYTES) {
            await redis.set(key, freshData, { ex: ttlSeconds })
          }
        } catch (err) {
          console.warn(`[Cache Notice] Redis write bypassed for key "${key}":`, (err as Error)?.message || err)
        }
      }
    }

    return freshData
  })()

  inflightFetches.set(key, work)
  try {
    return await work
  } finally {
    inflightFetches.delete(key)
  }
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
      console.warn(`[Cache Notice] Redis delete bypassed for key "${key}":`, (err as Error)?.message || err)
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
      console.warn(`[Cache Notice] Redis pattern delete bypassed for "${pattern}":`, (err as Error)?.message || err)
    }
  }
}
