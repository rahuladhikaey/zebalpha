/**
 * Upstash Redis Invalidation Helper for SuperAdmin
 * Purges customer storefront caches on mutations so changes reflect instantly.
 */
export async function invalidateCuratedCollectionsCache(): Promise<void> {
  const url = process.env.UPSTASH_REDIS_REST_URL || "https://resolved-falcon-225201.upstash.io";
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || "gQAAAAAAA2-xAAIgcDIxN2RjZjJlZTM0ZTk0ZTZlOWI2MGJlYWRlNzE1MmE3ZQ";

  try {
    await fetch(`${url}/del/homepage:section:curated_collections`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
  } catch (err) {
    console.warn("[Redis Cache Invalidation Error]:", err);
  }
}
