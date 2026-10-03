import { redisClient } from '../cache/redisClient.js';

/**
 * ZEBALPHA Resilient Distributed Rate Limit Store
 * 
 * Reliability Features:
 * 1. Distributed Multi-Instance Synchronization: Leverages Upstash Redis across all Render backend instances.
 * 2. Fail-Safe In-Memory Fallback: If Redis fails, times out, or credentials are absent, falls back instantly to local memory.
 * 3. Non-Blocking: Rate limiter errors will NEVER throw 500 or break customer requests.
 */
export class ResilientRedisRateLimitStore {
  constructor(options = {}) {
    this.windowMs = options.windowMs || 15 * 60 * 1000;
    this.prefix = options.prefix || 'rl:';
    this.localHits = new Map();
  }

  init(options) {
    this.windowMs = options.windowMs || this.windowMs;
  }

  async increment(key) {
    const prefixedKey = `${this.prefix}${key}`;
    const now = Date.now();
    const resetTime = new Date(now + this.windowMs);

    // 1. Try Upstash Redis if configured
    if (redisClient && redisClient.isUpstashConfigured) {
      try {
        const hits = await redisClient._executeCommand('incr', prefixedKey);
        if (hits !== null && hits !== undefined) {
          const hitCount = Number(hits) || 1;
          if (hitCount === 1) {
            // Set expiration on first hit
            await redisClient._executeCommand('pexpire', prefixedKey, this.windowMs);
          }
          return {
            totalHits: hitCount,
            resetTime
          };
        }
      } catch (err) {
        console.warn(`[RateLimit Warning] Redis increment fallback to memory for key ${key}:`, err.message);
      }
    }

    // 2. Resilient In-Memory Fallback
    let entry = this.localHits.get(prefixedKey);
    if (!entry || now > entry.resetAt) {
      entry = { totalHits: 1, resetAt: now + this.windowMs };
      this.localHits.set(prefixedKey, entry);
    } else {
      entry.totalHits += 1;
    }

    // Prune stale local keys periodically if map exceeds 5000 items
    if (this.localHits.size > 5000) {
      for (const [k, v] of this.localHits.entries()) {
        if (now > v.resetAt) this.localHits.delete(k);
      }
    }

    return {
      totalHits: entry.totalHits,
      resetTime: new Date(entry.resetAt)
    };
  }

  async decrement(key) {
    const prefixedKey = `${this.prefix}${key}`;
    if (redisClient && redisClient.isUpstashConfigured) {
      try {
        await redisClient._executeCommand('decr', prefixedKey);
      } catch (_) {}
    }

    const entry = this.localHits.get(prefixedKey);
    if (entry && entry.totalHits > 0) {
      entry.totalHits -= 1;
    }
  }

  async resetKey(key) {
    const prefixedKey = `${this.prefix}${key}`;
    if (redisClient && redisClient.isUpstashConfigured) {
      try {
        await redisClient.del(prefixedKey);
      } catch (_) {}
    }
    this.localHits.delete(prefixedKey);
  }
}

export function createResilientRateLimitStore(options = {}) {
  return new ResilientRedisRateLimitStore(options);
}
