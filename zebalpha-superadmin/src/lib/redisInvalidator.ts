/**
 * Upstash Redis Invalidation Helper for SuperAdmin
 * Purges customer storefront caches on mutations so changes reflect instantly.
 * All credentials are strictly read from environment variables.
 */
export async function invalidateCuratedCollectionsCache(): Promise<void> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return;
  }

  try {
    await fetch(`${url}/del/homepage:section:curated_collections`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
  } catch (err) {
    console.warn("[Redis Cache Invalidation Error - Curated Collections]:", err);
  }
}

export async function invalidateCategoriesCache(): Promise<void> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    return;
  }

  try {
    await fetch(`${url}/del/navigation:main_categories:active`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });
  } catch (err) {
    console.warn("[Redis Cache Invalidation Error - Categories]:", err);
  }
}
