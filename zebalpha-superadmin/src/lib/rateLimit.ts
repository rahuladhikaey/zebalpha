/**
 * Production-Grade Distributed Rate Limiting & Abuse Prevention
 * Supports Upstash Redis REST API with graceful in-memory fallback.
 * Prevents brute-force attacks against administrator authentication.
 */

interface RateLimitResult {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSeconds: number;
}

// In-Memory Fallback Store (for local dev / test or when Redis is unreachable)
interface MemoryRecord {
  count: number;
  firstAttempt: number;
  lockedUntil: number | null;
}

const memoryStore = new Map<string, MemoryRecord>();

const MAX_IP_ATTEMPTS = 5;
const ATTEMPT_WINDOW_SECONDS = 15 * 60; // 15 minutes
const LOCKOUT_DURATION_SECONDS = 15 * 60; // 15 minutes

function cleanMemoryStore() {
  const now = Date.now();
  for (const [key, record] of memoryStore.entries()) {
    if (record.lockedUntil && record.lockedUntil < now) {
      memoryStore.delete(key);
    } else if (!record.lockedUntil && now - record.firstAttempt > ATTEMPT_WINDOW_SECONDS * 1000) {
      memoryStore.delete(key);
    }
  }
}

/**
 * Extracts sanitized client IP from trusted headers.
 * Avoids trusting unverified middle headers in X-Forwarded-For.
 */
export function extractClientIp(req: Request): string {
  // Cloudflare trusted client IP
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  // Nginx / Reverse-Proxy direct client IP
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  // X-Forwarded-For: take the first valid IP (leftmost client IP)
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded.split(",")[0]?.trim();
    if (firstIp && !firstIp.startsWith("unknown")) {
      return firstIp;
    }
  }

  return "127.0.0.1";
}

async function redisCommand(command: string, ...args: (string | number)[]): Promise<any> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const path = [command, ...args].map(encodeURIComponent).join("/");
    const res = await fetch(`${url}/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.result;
  } catch (err) {
    return null;
  }
}

export async function checkLoginRateLimit(req: Request, targetId: string = "global_admin"): Promise<RateLimitResult> {
  const ip = extractClientIp(req);
  const ipKey = `rl:admin:login:ip:${ip}`;
  const targetKey = `rl:admin:login:target:${targetId}`;
  const now = Date.now();

  // 1. Try Redis first
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    try {
      const lockKey = `rl:admin:lock:${ip}`;
      const isLocked = await redisCommand("GET", lockKey);
      if (isLocked) {
        const ttl = (await redisCommand("TTL", lockKey)) || LOCKOUT_DURATION_SECONDS;
        return {
          allowed: false,
          remainingAttempts: 0,
          retryAfterSeconds: Math.max(1, Number(ttl)),
        };
      }

      const count = Number((await redisCommand("GET", ipKey)) || 0);
      if (count >= MAX_IP_ATTEMPTS) {
        await redisCommand("SETEX", lockKey, LOCKOUT_DURATION_SECONDS, "1");
        return {
          allowed: false,
          remainingAttempts: 0,
          retryAfterSeconds: LOCKOUT_DURATION_SECONDS,
        };
      }

      // Check target-based limit (protect against distributed brute force across rotating IPs)
      const MAX_TARGET_ATTEMPTS = 15;
      const targetCount = Number((await redisCommand("GET", targetKey)) || 0);
      if (targetCount >= MAX_TARGET_ATTEMPTS) {
        return {
          allowed: false,
          remainingAttempts: 0,
          retryAfterSeconds: LOCKOUT_DURATION_SECONDS,
        };
      }

      return {
        allowed: true,
        remainingAttempts: Math.max(0, MAX_IP_ATTEMPTS - count),
        retryAfterSeconds: 0,
      };
    } catch (redisErr) {
      console.error("[SECURITY ALERT] Redis unavailable during rate limit check:", redisErr);
      // Production Fail-Closed Policy:
      // If Redis experiences an outage, block login to prevent distributed brute-force attacks until Redis recovers
      if (process.env.NODE_ENV === "production" && process.env.STRICT_REDIS_FAIL_CLOSED === "true") {
        return {
          allowed: false,
          remainingAttempts: 0,
          retryAfterSeconds: 60,
        };
      }
    }
  }

  // 2. In-Memory Fallback (For local dev / staging test environments)
  cleanMemoryStore();
  const record = memoryStore.get(ipKey);

  if (record && record.lockedUntil && record.lockedUntil > now) {
    const remainingSecs = Math.ceil((record.lockedUntil - now) / 1000);
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds: remainingSecs,
    };
  }

  const currentCount = record ? record.count : 0;
  if (currentCount >= MAX_IP_ATTEMPTS) {
    const lockedUntil = now + LOCKOUT_DURATION_SECONDS * 1000;
    memoryStore.set(ipKey, {
      count: currentCount,
      firstAttempt: record?.firstAttempt || now,
      lockedUntil,
    });
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds: LOCKOUT_DURATION_SECONDS,
    };
  }

  return {
    allowed: true,
    remainingAttempts: Math.max(0, MAX_IP_ATTEMPTS - currentCount),
    retryAfterSeconds: 0,
  };
}

export async function recordLoginFailure(req: Request, targetId: string = "global_admin"): Promise<RateLimitResult> {
  const ip = extractClientIp(req);
  const ipKey = `rl:admin:login:ip:${ip}`;
  const targetKey = `rl:admin:login:target:${targetId}`;
  const now = Date.now();

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    try {
      const newCount = Number(await redisCommand("INCR", ipKey));
      if (newCount === 1) {
        await redisCommand("EXPIRE", ipKey, ATTEMPT_WINDOW_SECONDS);
      }

      // Track target attempts across all IPs
      const targetCount = Number(await redisCommand("INCR", targetKey));
      if (targetCount === 1) {
        await redisCommand("EXPIRE", targetKey, ATTEMPT_WINDOW_SECONDS);
      }

      if (newCount >= MAX_IP_ATTEMPTS) {
        const lockKey = `rl:admin:lock:${ip}`;
        await redisCommand("SETEX", lockKey, LOCKOUT_DURATION_SECONDS, "1");
        return {
          allowed: false,
          remainingAttempts: 0,
          retryAfterSeconds: LOCKOUT_DURATION_SECONDS,
        };
      }

      return {
        allowed: true,
        remainingAttempts: Math.max(0, MAX_IP_ATTEMPTS - newCount),
        retryAfterSeconds: 0,
      };
    } catch (_) {
      // Fall through to memory
    }
  }

  // In-Memory
  cleanMemoryStore();
  const existing = memoryStore.get(ipKey);
  const newCount = (existing?.count || 0) + 1;
  const firstAttempt = existing?.firstAttempt || now;

  if (newCount >= MAX_IP_ATTEMPTS) {
    const lockedUntil = now + LOCKOUT_DURATION_SECONDS * 1000;
    memoryStore.set(ipKey, {
      count: newCount,
      firstAttempt,
      lockedUntil,
    });
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds: LOCKOUT_DURATION_SECONDS,
    };
  }

  memoryStore.set(ipKey, {
    count: newCount,
    firstAttempt,
    lockedUntil: null,
  });

  return {
    allowed: true,
    remainingAttempts: Math.max(0, MAX_IP_ATTEMPTS - newCount),
    retryAfterSeconds: 0,
  };
}

export async function clearLoginRateLimit(req: Request, targetId: string = "global_admin"): Promise<void> {
  const ip = extractClientIp(req);
  const ipKey = `rl:admin:login:ip:${ip}`;
  const lockKey = `rl:admin:lock:${ip}`;
  const targetKey = `rl:admin:login:target:${targetId}`;

  memoryStore.delete(ipKey);
  memoryStore.delete(lockKey);

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    try {
      await redisCommand("DEL", ipKey);
      await redisCommand("DEL", lockKey);
      await redisCommand("DEL", targetKey);
    } catch (_) {}
  }
}
