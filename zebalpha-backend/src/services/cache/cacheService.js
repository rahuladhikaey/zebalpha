/**
 * ZEBALPHA Centralized Cache Service
 * 
 * Production-Grade Multi-Layer Caching Engine:
 * - L2 Redis Cache with In-Memory Resilient Fallback
 * - Concurrency Stampede Protection via Single-Flight Promise Deduping
 * - Normalized Deterministic Key Management
 * - Targeted Event-Driven Invalidation
 * - Comprehensive Observability & Telemetry
 */

import { redisClient } from './redisClient.js';
import { cacheKeys } from './cacheKeys.js';
import { CACHE_TTL } from './cacheTTL.js';
import { cacheLock } from './cacheLock.js';
import { cacheInvalidation } from './cacheInvalidation.js';

export class CacheService {
  constructor() {
    this.client = redisClient;
    this.keys = cacheKeys;
    this.ttl = CACHE_TTL;
    this.lock = cacheLock;
    this.invalidator = cacheInvalidation;

    // Backward-compatibility properties
    this.defaultTtl = CACHE_TTL.DEFAULT;
    this.categoriesTtl = CACHE_TTL.CATEGORIES;
    this.productDetailTtl = CACHE_TTL.PRODUCT_DETAIL;
  }

  get isUpstashEnabled() {
    return this.client.isUpstashConfigured && this.client.isOnline;
  }

  /**
   * Generates a deterministic cache key from parameters
   */
  generateKey(prefix, params = {}) {
    return this.keys.deterministicKey(prefix, params);
  }

  /**
   * Retrieves item from cache
   * Returns parsed value or null if miss
   */
  async get(key) {
    try {
      const data = await this.client.get(key);
      if (data !== null && data !== undefined) {
        console.log(`[CACHE HIT] ${key}`);
        return data;
      }
      console.log(`[CACHE MISS] ${key}`);
      return null;
    } catch (err) {
      console.warn(`[CACHE ERROR] get(${key}):`, err.message);
      return null;
    }
  }

  /**
   * Stores item in cache with TTL
   */
  async set(key, value, ttlSeconds = this.ttl.DEFAULT) {
    if (value === undefined || value === null) return false;
    try {
      const safeTtl = Math.max(1, Number(ttlSeconds) || this.ttl.DEFAULT);
      await this.client.set(key, value, safeTtl);
      console.log(`[CACHE SET] ${key} TTL=${safeTtl}s`);
      return true;
    } catch (err) {
      console.warn(`[CACHE ERROR] set(${key}):`, err.message);
      return false;
    }
  }

  /**
   * Delete a single key
   */
  async delete(key) {
    try {
      console.log(`[CACHE INVALIDATE] ${key}`);
      return await this.client.del(key);
    } catch (err) {
      console.warn(`[CACHE ERROR] delete(${key}):`, err.message);
      return false;
    }
  }

  /**
   * Alias for delete
   */
  async del(key) {
    return this.delete(key);
  }

  /**
   * Delete multiple keys
   */
  async deleteMany(keys = []) {
    try {
      return await this.client.delMany(keys);
    } catch (err) {
      console.warn(`[CACHE ERROR] deleteMany:`, err.message);
      return 0;
    }
  }

  /**
   * Check if a key exists
   */
  async exists(key) {
    try {
      return await this.client.exists(key);
    } catch (err) {
      return false;
    }
  }

  /**
   * Cache-Aside core method: getOrSet with stampede protection
   * Checks cache. If hit, returns cached data.
   * If miss, executes fetchFn via single-flight deduplicator and caches the result.
   * 
   * @param {string} key - Cache key
   * @param {Function} fetchFn - Database fetch callback
   * @param {number} [ttlSeconds] - TTL in seconds
   * @returns {Promise<{ data: any, source: 'cache' | 'database' | 'cache_stampede_lock' }>}
   */
  async getOrSet(key, fetchFn, ttlSeconds = this.ttl.DEFAULT) {
    // 1. Check L2/Memory cache
    const cached = await this.get(key);
    if (cached !== null && cached !== undefined) {
      return { data: cached, source: 'cache' };
    }

    // 2. Cache miss -> Single-flight concurrency protection against stampedes
    console.log(`[DB QUERY REQUIRED] ${key}`);
    const { data: freshData, deduplicated } = await this.lock.executeSingleFlight(key, async () => {
      // Fetch fresh data from Supabase/PostgreSQL
      const result = await fetchFn();
      if (result !== undefined && result !== null) {
        await this.set(key, result, ttlSeconds);
      }
      return result;
    });

    return {
      data: freshData,
      source: deduplicated ? 'cache_stampede_lock' : 'database'
    };
  }

  /**
   * Backward-compatible alias for getOrSet
   */
  async fetchOrCache(key, fetchFn, ttlSeconds = this.ttl.DEFAULT) {
    return this.getOrSet(key, fetchFn, ttlSeconds);
  }

  /**
   * Invalidate by exact key or pattern
   */
  async invalidate(patternOrKey) {
    if (patternOrKey.includes('*')) {
      return await this.invalidator.purgePattern(patternOrKey);
    }
    return await this.delete(patternOrKey);
  }

  /**
   * Invalidate all keys matching pattern
   */
  async invalidatePattern(pattern) {
    return await this.invalidator.purgePattern(pattern);
  }

  /**
   * Invalidate product caches on price/stock/content mutations
   */
  async invalidateProductCache(productId = null, categoryId = null) {
    return await this.invalidator.onProductMutation(productId, categoryId);
  }

  /**
   * Invalidate category caches on category mutations
   */
  async invalidateCategoryCache(categoryId = null) {
    return await this.invalidator.onCategoryMutation(categoryId);
  }

  /**
   * Observability & Health telemetry
   */
  getMetrics() {
    return this.client.getMetrics();
  }
}

// Global Singleton Export
export const cacheService = new CacheService();
export default cacheService;
