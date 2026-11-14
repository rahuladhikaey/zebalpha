import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

const memoryBuckets = new Map<string, { count: number; resetAt: number }>();
const redisLimiters = new Map<string, Ratelimit>();

function getRedisLimiter(maxRequests: number, windowSeconds: number): Ratelimit | null {
  if (!redis) return null;
  const cacheKey = `${maxRequests}:${windowSeconds}`;
  let limiter = redisLimiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maxRequests, `${windowSeconds} s`),
      prefix: "zebalpha:rl",
    });
    redisLimiters.set(cacheKey, limiter);
  }
  return limiter;
}

/**
 * Checks sliding-window rate limits backed by Upstash Redis when configured,
 * falling back seamlessly to a bounded in-memory sliding counter.
 */
export async function checkRateLimit(
  identifier: string,
  maxRequests = 120,
  windowSeconds = 60
): Promise<RateLimitResult> {
  const safeId = (identifier || "anonymous").slice(0, 128);
  const limiter = getRedisLimiter(maxRequests, windowSeconds);

  if (limiter) {
    try {
      const res = await limiter.limit(safeId);
      return {
        allowed: res.success,
        limit: res.limit,
        remaining: res.remaining,
        resetAt: res.reset,
      };
    } catch {
      // Fail over to in-memory window if Redis experiences a transient hiccup
    }
  }

  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const key = `${safeId}:${maxRequests}:${windowSeconds}`;

  // Bound in-memory store size
  if (memoryBuckets.size > 4000) {
    for (const [k, v] of memoryBuckets.entries()) {
      if (v.resetAt <= now) memoryBuckets.delete(k);
    }
  }

  const entry = memoryBuckets.get(key);
  if (!entry || entry.resetAt <= now) {
    const resetAt = now + windowMs;
    memoryBuckets.set(key, { count: 1, resetAt });
    return { allowed: true, limit: maxRequests, remaining: maxRequests - 1, resetAt };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, limit: maxRequests, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return {
    allowed: true,
    limit: maxRequests,
    remaining: Math.max(0, maxRequests - entry.count),
    resetAt: entry.resetAt,
  };
}

/**
 * Extracts client IP safely from standard proxy headers for rate limiting.
 */
export function extractClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip") || "unknown";
}
