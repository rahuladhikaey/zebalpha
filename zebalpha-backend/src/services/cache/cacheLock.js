/**
 * ZEBALPHA Cache Stampede & Concurrency Protection
 * 
 * Implements Single-Flight Request Deduplication and Distributed Mutex Locks:
 * 1. Single-Flight In-Memory Coalescing: If 100 concurrent requests arrive for
 *    the exact same uncached key, only ONE execution calls Supabase/PostgreSQL.
 *    The other 99 requests await the same in-flight Promise.
 * 2. Distributed Mutex Lock: Ensures multi-instance cluster processes don't
 *    overwhelm PostgreSQL during cold-cache surges.
 * 3. Auto-release safety: Short lock TTL guarantees that deadlocks never occur.
 */

import { redisClient } from './redisClient.js';
import { CACHE_TTL } from './cacheTTL.js';

export class CacheLock {
  constructor() {
    this.inFlightRequests = new Map();
    this.activeDistributedLocks = new Set();
  }

  /**
   * Single-Flight Request Deduplication
   * Runs the given fetchFn only once for concurrent callers of the same key.
   */
  async executeSingleFlight(key, fetchFn) {
    if (this.inFlightRequests.has(key)) {
      try {
        const sharedPromise = this.inFlightRequests.get(key);
        const result = await sharedPromise;
        return { data: result, deduplicated: true };
      } catch (err) {
        // If the in-flight promise errored out, proceed to retry directly
      }
    }

    const taskPromise = (async () => {
      try {
        return await fetchFn();
      } finally {
        this.inFlightRequests.delete(key);
      }
    })();

    this.inFlightRequests.set(key, taskPromise);

    try {
      const data = await taskPromise;
      return { data, deduplicated: false };
    } finally {
      this.inFlightRequests.delete(key);
    }
  }

  /**
   * Acquires a distributed lock using Redis SETNX with automatic expiration
   * 
   * @param {string} lockKey - Unique resource identifier
   * @param {number} ttlSeconds - Max duration lock is held before auto-expiring
   * @returns {Promise<boolean>} True if lock acquired, false otherwise
   */
  async acquireLock(lockKey, ttlSeconds = CACHE_TTL.LOCK_TTL) {
    const formattedKey = `lock:${lockKey}`;
    try {
      if (redisClient.isUpstashConfigured) {
        // SET key value NX EX seconds
        const res = await redisClient._executeCommand('set', formattedKey, 'LOCKED', 'nx', 'ex', ttlSeconds);
        const acquired = res === 'OK' || res === true;
        if (acquired) this.activeDistributedLocks.add(formattedKey);
        return acquired;
      }

      // Memory fallback lock
      if (this.activeDistributedLocks.has(formattedKey)) {
        return false;
      }
      this.activeDistributedLocks.add(formattedKey);
      setTimeout(() => this.activeDistributedLocks.delete(formattedKey), ttlSeconds * 1000);
      return true;
    } catch (_) {
      return true; // Graceful degrade: allow execution on lock failure
    }
  }

  /**
   * Releases distributed lock
   */
  async releaseLock(lockKey) {
    const formattedKey = `lock:${lockKey}`;
    this.activeDistributedLocks.delete(formattedKey);
    try {
      if (redisClient.isUpstashConfigured) {
        await redisClient.del(formattedKey);
      }
    } catch (_) {}
  }
}

export const cacheLock = new CacheLock();
