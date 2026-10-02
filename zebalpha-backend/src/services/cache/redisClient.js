/**
 * ZEBALPHA Resilient Redis Client (Upstash REST & In-Memory Resilient Fallback)
 * 
 * Reliability Guarantees:
 * 1. Non-Blocking Graceful Degradation: Redis failure NEVER throws 500 or breaks the app.
 * 2. Strict Command Timeout: 1500ms max timeout prevents slow networks from hanging API threads.
 * 3. Memory Fallback: Automatically retains an in-memory LRU store during Redis hiccups.
 * 4. Safe Deserialization: Handles corrupted/malformed JSON strings without unhandled exceptions.
 */

class MemoryCacheStore {
  constructor(maxSize = 2000) {
    this.maxSize = maxSize;
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    // Refresh LRU position
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key, value, ttlSeconds = 600) {
    if (this.store.size >= this.maxSize) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) this.store.delete(oldestKey);
    }
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds > 0 ? Date.now() + (ttlSeconds * 1000) : null
    });
  }

  del(key) {
    return this.store.delete(key);
  }

  deleteMany(keys) {
    let count = 0;
    for (const key of keys) {
      if (this.store.delete(key)) count++;
    }
    return count;
  }

  deletePattern(pattern) {
    let deletedCount = 0;
    const cleanPattern = pattern.replace(/\*/g, '');
    for (const key of Array.from(this.store.keys())) {
      if (key.includes(cleanPattern)) {
        this.store.delete(key);
        deletedCount++;
      }
    }
    return deletedCount;
  }

  has(key) {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  clear() {
    this.store.clear();
  }

  size() {
    return this.store.size;
  }
}

export class RedisClient {
  constructor() {
    this.memoryStore = new MemoryCacheStore(2000);
    this.upstashUrl = (process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
    this.upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN || '';
    this.isUpstashConfigured = !!(this.upstashUrl && this.upstashToken);
    this.isOnline = this.isUpstashConfigured;
    this.commandTimeoutMs = 1500;

    this.metrics = {
      hits: 0,
      misses: 0,
      writes: 0,
      deletes: 0,
      invalidations: 0,
      errors: 0,
      fallbacks: 0,
      totalLatencyMs: 0,
      commandCount: 0
    };

    if (this.isUpstashConfigured) {
      console.log('[RedisClient]: Upstash Redis REST interface configured.');
    } else {
      console.log('[RedisClient]: Operating in Resilient In-Memory LRU Mode (Redis credentials not provided).');
    }
  }

  /**
   * Execute REST command against Upstash Redis with timeout and circuit degradation
   */
  async _executeCommand(command, ...args) {
    if (!this.isUpstashConfigured) return null;

    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.commandTimeoutMs);

    try {
      const url = `${this.upstashUrl}/${command}/${args.map(a => encodeURIComponent(String(a))).join('/')}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${this.upstashToken}` },
        signal: controller.signal
      });

      clearTimeout(timeout);
      const latency = Date.now() - startTime;
      this.metrics.totalLatencyMs += latency;
      this.metrics.commandCount++;

      if (!res.ok) {
        throw new Error(`Upstash HTTP Error ${res.status}`);
      }

      const json = await res.json();
      this.isOnline = true;
      return json.result;
    } catch (err) {
      clearTimeout(timeout);
      this.metrics.errors++;
      this.metrics.fallbacks++;
      this.isOnline = false;
      console.warn(`[RedisClient Warning]: Command '${command}' fell back to in-memory:`, err.message);
      return null;
    }
  }

  /**
   * Get raw or parsed value
   */
  async get(key) {
    // 1. Try Upstash Redis
    if (this.isUpstashConfigured) {
      const result = await this._executeCommand('get', key);
      if (result !== null && result !== undefined) {
        this.metrics.hits++;
        if (typeof result === 'string') {
          try {
            return JSON.parse(result);
          } catch (_) {
            return result;
          }
        }
        return result;
      }
    }

    // 2. Fallback to In-Memory Cache
    const memVal = this.memoryStore.get(key);
    if (memVal !== null && memVal !== undefined) {
      this.metrics.hits++;
      return memVal;
    }

    this.metrics.misses++;
    return null;
  }

  /**
   * Set value with TTL in seconds
   */
  async set(key, value, ttlSeconds = 600) {
    if (value === undefined || value === null) return false;

    this.metrics.writes++;
    const safeTtl = Math.max(1, Number(ttlSeconds) || 600);

    // Save to memory store first for immediate local availability
    this.memoryStore.set(key, value, safeTtl);

    if (this.isUpstashConfigured) {
      try {
        const payload = typeof value === 'object' ? JSON.stringify(value) : String(value);
        await this._executeCommand('setex', key, safeTtl, payload);
      } catch (err) {
        console.warn(`[RedisClient Warning]: Failed to set Redis key ${key}:`, err.message);
      }
    }

    return true;
  }

  /**
   * Delete a single key
   */
  async del(key) {
    this.metrics.deletes++;
    this.metrics.invalidations++;
    this.memoryStore.del(key);

    if (this.isUpstashConfigured) {
      await this._executeCommand('del', key);
    }
    return true;
  }

  /**
   * Delete multiple keys in batch
   */
  async delMany(keys = []) {
    if (!keys || keys.length === 0) return 0;
    this.metrics.deletes += keys.length;
    this.metrics.invalidations += keys.length;
    this.memoryStore.deleteMany(keys);

    if (this.isUpstashConfigured) {
      for (const k of keys) {
        await this._executeCommand('del', k);
      }
    }
    return keys.length;
  }

  /**
   * Scan / match keys by pattern
   */
  async keys(pattern) {
    if (this.isUpstashConfigured) {
      const redisKeys = await this._executeCommand('keys', pattern);
      if (Array.isArray(redisKeys)) return redisKeys;
    }
    // Memory scan
    const cleanPattern = pattern.replace(/\*/g, '');
    return Array.from(this.memoryStore.store.keys()).filter(k => k.includes(cleanPattern));
  }

  /**
   * Check if key exists
   */
  async exists(key) {
    if (this.memoryStore.has(key)) return true;
    if (this.isUpstashConfigured) {
      const res = await this._executeCommand('exists', key);
      return res === 1 || res === '1';
    }
    return false;
  }

  /**
   * Ping Redis health
   */
  async ping() {
    if (!this.isUpstashConfigured) {
      return { status: 'healthy', engine: 'in_memory_lru', size: this.memoryStore.size() };
    }
    const pong = await this._executeCommand('ping');
    return {
      status: pong ? 'connected' : 'degraded_to_memory',
      engine: pong ? 'upstash_redis' : 'in_memory_fallback',
      memorySize: this.memoryStore.size()
    };
  }

  getMetrics() {
    const totalRequests = this.metrics.hits + this.metrics.misses;
    const hitRate = totalRequests > 0 ? ((this.metrics.hits / totalRequests) * 100).toFixed(2) + '%' : '0.00%';
    const avgLatencyMs = this.metrics.commandCount > 0 ? (this.metrics.totalLatencyMs / this.metrics.commandCount).toFixed(2) : '0.00';

    return {
      connected: this.isUpstashConfigured && this.isOnline,
      engine: this.isUpstashConfigured ? 'Upstash Redis (REST)' : 'In-Memory Resilient LRU',
      hitRate,
      averageLatencyMs: `${avgLatencyMs}ms`,
      memoryEntries: this.memoryStore.size(),
      ...this.metrics
    };
  }
}

export const redisClient = new RedisClient();
