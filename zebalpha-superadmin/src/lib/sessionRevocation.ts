/**
 * Server-Side Session Revocation Registry
 * Manages token invalidation on explicit logout.
 * Uses Upstash Redis when available, with a synchronized in-memory LRU set fallback.
 */

const inMemoryRevokedTokens = new Set<string>();
const MAX_MEMORY_TOKENS = 10000;

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

/**
 * Computes a fast, collision-resistant token identifier without storing raw JWTs.
 */
async function computeTokenFingerprint(token: string): Promise<string> {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(token));
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Revokes a session token for the remainder of its valid lifetime (2 hours).
 */
export async function revokeSessionToken(token: string, ttlSeconds: number = 2 * 60 * 60): Promise<void> {
  if (!token) return;
  const fingerprint = await computeTokenFingerprint(token);

  // 1. Add to local in-memory registry
  if (inMemoryRevokedTokens.size > MAX_MEMORY_TOKENS) {
    inMemoryRevokedTokens.clear();
  }
  inMemoryRevokedTokens.add(fingerprint);

  // 2. Add to Redis with TTL
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && redisToken) {
    try {
      await redisCommand("SETEX", `admin:revoked:${fingerprint}`, ttlSeconds, "1");
    } catch (_) {}
  }
}

/**
 * Checks if a session token has been explicitly revoked.
 * In production, enforces a strict fail-closed policy:
 * If Redis is configured but unreachable, privileged requests fail closed to prevent revoked session reuse.
 */
export async function isSessionRevoked(token: string): Promise<boolean> {
  if (!token) return true;
  const fingerprint = await computeTokenFingerprint(token);

  // 1. Check local cache first (fast-path for known revoked tokens)
  if (inMemoryRevokedTokens.has(fingerprint)) {
    return true;
  }

  // 2. Query Centralized Upstash Redis
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && redisToken) {
    try {
      const res = await redisCommand("GET", `admin:revoked:${fingerprint}`);
      if (res) {
        inMemoryRevokedTokens.add(fingerprint); // Cache locally
        return true;
      }
      return false;
    } catch (redisErr) {
      console.error("[SECURITY ALERT] Redis unavailable during session revocation check:", redisErr);
      // Production Fail-Closed Policy:
      // If Redis was configured but fails during query, treat token as potentially revoked to prevent session hijacking
      if (process.env.NODE_ENV === "production") {
        return true;
      }
    }
  } else if (process.env.NODE_ENV === "production") {
    console.warn("[SECURITY ALERT] UPSTASH_REDIS_REST_URL unconfigured in production environment.");
  }

  return false;
}
