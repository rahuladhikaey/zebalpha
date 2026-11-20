/**
 * Centralized Client & Server Cache Invalidation Helper
 * Invoked after committed database mutations in Seller, Superadmin, or Backend APIs.
 * Purges BOTH the live customer storefront (L1 RAM + Upstash Redis + Next.js ISR)
 * AND the backend cache invalidation service in parallel.
 */

export interface InvalidationParams {
  target: 'product' | 'category' | 'homepage' | 'seller' | 'seller_lifecycle' | 'order' | 'all';
  id?: string | number;
  categoryId?: string | number;
  sellerId?: string;
}

export async function triggerCacheInvalidation(params: InvalidationParams): Promise<boolean> {
  const storefrontUrl = (
    process.env.NEXT_PUBLIC_STOREFRONT_URL ||
    process.env.STOREFRONT_URL ||
    'https://zebalpha.shop'
  ).replace(/\/+$/, '');
  const backendUrl = (
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.API_BASE_URL ||
    'https://api.zebalpha.shop'
  ).replace(/\/+$/, '');

  const results = await Promise.allSettled([
    fetch(`${storefrontUrl}/api/cache/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.CACHE_REVALIDATE_SECRET
          ? { 'x-revalidate-secret': process.env.CACHE_REVALIDATE_SECRET }
          : {}),
      },
      body: JSON.stringify(params),
    }).then((r) => r.ok),
    fetch(`${backendUrl}/api/cache/invalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    }).then((r) => r.ok),
  ]);

  return results.some((r) => r.status === 'fulfilled' && r.value === true);
}
