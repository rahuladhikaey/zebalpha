/**
 * Centralized Client & Server Cache Invalidation Helper
 * Invoked after committed database mutations in Seller, Superadmin, or Backend APIs.
 */

export interface InvalidationParams {
  target: 'product' | 'category' | 'seller' | 'seller_lifecycle' | 'order' | 'all';
  id?: string | number;
  categoryId?: string | number;
  sellerId?: string;
}

export async function triggerCacheInvalidation(params: InvalidationParams): Promise<boolean> {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.API_BASE_URL || 'https://api.zebalpha.shop';
    const endpoint = `${backendUrl}/api/cache/invalidate`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const json = await res.json();
    if (json.success) {
      console.log(`[Cache Invalidator] Successfully invalidated target=${params.target}`);
      return true;
    }
    console.warn(`[Cache Invalidator Notice] ${json.error || 'Non-critical invalidation notice'}`);
    return false;
  } catch (err: any) {
    // Non-blocking catch to ensure UI operations succeed even if network to backend cache endpoint is degraded
    console.warn('[Cache Invalidator Error]:', err?.message || err);
    return false;
  }
}
