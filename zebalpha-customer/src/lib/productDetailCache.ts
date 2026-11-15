import type { QueryClient } from "@tanstack/react-query";
import type { Product } from "@/lib/types";
import type { PublicReview } from "@/lib/productRatings";
import { normalizeProductImages } from "@/lib/productImageUtils";

export const PRODUCT_DETAIL_CACHE_TTL_MS = 10 * 60 * 1000;
export const MAX_HYDRATED_CACHE_SIZE = 50;
export const PRODUCT_IMAGE_PRELOAD_DEADLINE_MS = 380;
export const PRODUCT_NAVIGATION_TIMEOUT_MS = 12_000;

export interface CachedProductDetailEntry {
  product: Product;
  reviews: PublicReview[];
  hydratedAt: number;
}

export type ProductNavStatus = "idle" | "loading" | "error";
export type ProductNavErrorReason = "offline" | "timeout" | "failed" | null;

export interface ProductNavigationState {
  status: ProductNavStatus;
  isFadingOut: boolean;
  productId: string | null;
  targetHref: string | null;
  errorReason: ProductNavErrorReason;
  startedAt: number;
  requestSeq: number;
}

export type QueryClientCacheReader = Pick<QueryClient, "getQueryData" | "getQueriesData">;

const hydratedProductCache = new Map<string, CachedProductDetailEntry>();
const preloadedImageCache = new Set<string>();
const inFlightImagePreloads = new Map<string, Promise<void>>();

const IDLE_STATE: ProductNavigationState = {
  status: "idle",
  isFadingOut: false,
  productId: null,
  targetHref: null,
  errorReason: null,
  startedAt: 0,
  requestSeq: 0,
};

let currentNavState: ProductNavigationState = { ...IDLE_STATE };
let monotonicSeq = 0;
let fadeOutTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

function clearFadeOutTimer(): void {
  if (fadeOutTimer !== null) {
    clearTimeout(fadeOutTimer);
    fadeOutTimer = null;
  }
}

function notifyListeners(): void {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // Protect store notifications from subscriber UI errors
    }
  });
}

/**
 * Extracts `<productId>` when `href` points to a same-origin Product Details route
 * (`/products/<id>`). Returns `null` for listing routes (`/products`, `/products?search=...`),
 * external domains, or non-HTTP schemes.
 */
export function extractProductIdFromHref(href: string, currentOrigin?: string): string | null {
  const raw = typeof href === "string" ? href.trim() : "";
  if (!raw || raw.startsWith("#")) return null;
  if (/^(mailto:|tel:|javascript:|data:|blob:)/i.test(raw)) return null;

  let pathname = raw;
  const originBase =
    currentOrigin ||
    (typeof window !== "undefined" && window.location?.origin ? window.location.origin : "https://zebalpha.local");

  try {
    const parsed = new URL(raw, originBase);
    if (
      /^https?:/i.test(raw) &&
      currentOrigin &&
      parsed.origin.toLowerCase() !== currentOrigin.toLowerCase()
    ) {
      return null;
    }
    if (
      /^https?:/i.test(raw) &&
      !currentOrigin &&
      typeof window !== "undefined" &&
      window.location?.origin &&
      parsed.origin.toLowerCase() !== window.location.origin.toLowerCase()
    ) {
      return null;
    }
    pathname = parsed.pathname;
  } catch {
    pathname = raw.split(/[?#]/)[0] || "";
  }

  const normalized = pathname.replace(/\/+$/, "");
  const match = /^\/products\/([^/]+)$/i.exec(normalized);
  if (!match || !match[1]) return null;

  try {
    const decoded = decodeURIComponent(match[1]).trim();
    return decoded || null;
  } catch {
    return match[1].trim() || null;
  }
}

/**
 * Normalizes any href to a relative path + query/hash string for Next.js navigation.
 */
export function toRelativeHref(href: string): string {
  try {
    const base =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "https://zebalpha.local";
    const parsed = new URL(href, base);
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return href;
  }
}

function normalizeProductCacheKey(productId: string | number | null | undefined): string {
  if (productId === undefined || productId === null) return "";
  return String(productId).trim().toLowerCase();
}

/**
 * Stores a server-hydrated product record in the bounded LRU memory cache so
 * subsequent visits open immediately without showing a loading spinner.
 */
export function setCachedProductDetail(
  product: Product | null | undefined,
  reviews: PublicReview[] = [],
  now = Date.now()
): void {
  if (!product || product.id === undefined || product.id === null) return;
  const id = normalizeProductCacheKey(product.id);
  if (!id) return;

  if (hydratedProductCache.has(id)) {
    hydratedProductCache.delete(id);
  }
  hydratedProductCache.set(id, {
    product,
    reviews: Array.isArray(reviews) ? reviews : [],
    hydratedAt: now,
  });

  while (hydratedProductCache.size > MAX_HYDRATED_CACHE_SIZE) {
    const oldestKey = hydratedProductCache.keys().next().value;
    if (oldestKey === undefined) break;
    hydratedProductCache.delete(oldestKey);
  }
}

/**
 * Returns a valid (non-expired) hydrated product detail entry from memory,
 * or `null` if missing or expired.
 */
export function getCachedProductDetail(
  productId: string | null | undefined,
  now = Date.now()
): CachedProductDetailEntry | null {
  const id = normalizeProductCacheKey(productId);
  if (!id) return null;

  const entry = hydratedProductCache.get(id);
  if (!entry) return null;

  if (now - entry.hydratedAt > PRODUCT_DETAIL_CACHE_TTL_MS) {
    hydratedProductCache.delete(id);
    return null;
  }

  // Promote key on read to maintain LRU order
  hydratedProductCache.delete(id);
  hydratedProductCache.set(id, entry);
  return entry;
}

export function hasFreshCachedProductDetail(
  productId: string | null | undefined,
  now = Date.now()
): boolean {
  const id = normalizeProductCacheKey(productId);
  if (!id) return false;
  const entry = hydratedProductCache.get(id);
  if (!entry) return false;
  if (now - entry.hydratedAt > PRODUCT_DETAIL_CACHE_TTL_MS) {
    hydratedProductCache.delete(id);
    return false;
  }
  return true;
}

export function clearProductDetailCache(): void {
  hydratedProductCache.clear();
}

function collectProductsFromCacheContainer(container: unknown, targetList: Product[]): void {
  if (!container) return;
  if (Array.isArray(container)) {
    for (const item of container) {
      if (item && typeof item === "object" && "id" in item) {
        targetList.push(item as Product);
      }
    }
    return;
  }
  if (typeof container !== "object") return;

  const record = container as Record<string, unknown>;
  if (Array.isArray(record.pages)) {
    for (const page of record.pages) {
      collectProductsFromCacheContainer(page, targetList);
    }
  }
  if (Array.isArray(record.items)) collectProductsFromCacheContainer(record.items, targetList);
  if (Array.isArray(record.products)) collectProductsFromCacheContainer(record.products, targetList);
  if (Array.isArray(record.data)) collectProductsFromCacheContainer(record.data, targetList);
}

/**
 * Inspects React Query caches (`['product', id]`, `['products']`, `['cursorProducts']`,
 * `['search']`) to locate a product's primary image URL for background preloading.
 */
export function findPreloadImageUrlFromQueryClient(
  queryClient: QueryClientCacheReader | null | undefined,
  productId: string
): string | null {
  const targetId = normalizeProductCacheKey(productId);
  if (!queryClient || !targetId) return null;

  try {
    const direct = queryClient.getQueryData<Product | undefined>(["product", String(productId).trim()]);
    if (direct) {
      const imgs = normalizeProductImages(direct);
      if (imgs[0]) return imgs[0];
    }

    const candidateBuckets: Product[] = [];
    for (const prefix of ["products", "cursorProducts", "search"] as const) {
      const queries = queryClient.getQueriesData({ queryKey: [prefix] });
      for (const [, data] of queries) {
        collectProductsFromCacheContainer(data, candidateBuckets);
      }
    }

    const match = candidateBuckets.find((p) => normalizeProductCacheKey(p.id) === targetId);
    if (match) {
      const imgs = normalizeProductImages(match);
      if (imgs[0]) return imgs[0];
    }
  } catch {
    // Non-fatal: cache structure variations must never block navigation
  }

  return null;
}

/**
 * Begins loading the hero product image in browser memory cleanly, bounded by `timeoutMs`
 * so slow or failed CDN responses never delay or hang Product Details rendering.
 */
export function preloadProductImage(
  imageUrl: string | null | undefined,
  timeoutMs = PRODUCT_IMAGE_PRELOAD_DEADLINE_MS
): Promise<void> {
  if (typeof window === "undefined" || !imageUrl || typeof imageUrl !== "string") {
    return Promise.resolve();
  }

  const trimmed = imageUrl.trim();
  if (!trimmed || preloadedImageCache.has(trimmed)) {
    return Promise.resolve();
  }

  const existing = inFlightImagePreloads.get(trimmed);
  if (existing) {
    return existing;
  }

  const promise = new Promise<void>((resolve) => {
    let settled = false;
    const img = new window.Image();

    const finish = (markLoaded: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      img.onload = null;
      img.onerror = null;
      inFlightImagePreloads.delete(trimmed);

      if (markLoaded) {
        if (preloadedImageCache.size >= 120) {
          const oldest = preloadedImageCache.values().next().value;
          if (oldest) preloadedImageCache.delete(oldest);
        }
        preloadedImageCache.add(trimmed);
      }
      resolve();
    };

    const timer = window.setTimeout(() => finish(false), Math.max(50, timeoutMs));
    img.onload = () => finish(true);
    img.onerror = () => finish(false);
    img.decoding = "async";
    img.src = trimmed;

    if (img.complete && img.naturalWidth > 0) {
      finish(true);
    }
  });

  inFlightImagePreloads.set(trimmed, promise);
  return promise;
}

export function getProductNavigationState(): ProductNavigationState {
  return currentNavState;
}

export function subscribeProductNavigation(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Starts a full-screen Product Details transition with deduplication against rapid double taps.
 */
export function startProductNavigation(
  productId: string,
  options?: { targetHref?: string; isOffline?: boolean; now?: number }
): ProductNavigationState {
  const id = String(productId || "").trim();
  const normalizedId = normalizeProductCacheKey(id);
  if (!normalizedId) return currentNavState;

  const now = options?.now ?? Date.now();
  if (
    currentNavState.status === "loading" &&
    normalizeProductCacheKey(currentNavState.productId) === normalizedId &&
    !options?.isOffline &&
    now - currentNavState.startedAt < 1500
  ) {
    return currentNavState;
  }

  monotonicSeq += 1;
  clearFadeOutTimer();
  const href = options?.targetHref || `/products/${encodeURIComponent(id)}`;

  currentNavState = {
    status: options?.isOffline ? "error" : "loading",
    isFadingOut: false,
    productId: id,
    targetHref: href,
    errorReason: options?.isOffline ? "offline" : null,
    startedAt: now,
    requestSeq: monotonicSeq,
  };

  notifyListeners();
  return currentNavState;
}

/**
 * Completes an active Product Details loading transition once target product content is ready.
 * Ignores stale completions belonging to an earlier superseded request.
 */
export function completeProductNavigation(productId?: string | null): ProductNavigationState {
  if (currentNavState.status === "idle") return currentNavState;

  const normalizedId = normalizeProductCacheKey(productId);
  if (
    normalizedId &&
    currentNavState.productId &&
    normalizedId !== normalizeProductCacheKey(currentNavState.productId)
  ) {
    return currentNavState;
  }

  const shouldFadeOut = typeof window !== "undefined" && currentNavState.status === "loading";
  clearFadeOutTimer();

  currentNavState = {
    ...IDLE_STATE,
    isFadingOut: shouldFadeOut,
    requestSeq: currentNavState.requestSeq,
  };
  notifyListeners();

  if (shouldFadeOut) {
    const seqAtComplete = currentNavState.requestSeq;
    fadeOutTimer = setTimeout(() => {
      fadeOutTimer = null;
      if (currentNavState.status === "idle" && currentNavState.isFadingOut && currentNavState.requestSeq === seqAtComplete) {
        currentNavState = { ...currentNavState, isFadingOut: false };
        notifyListeners();
      }
    }, 170);
  }

  return currentNavState;
}

/**
 * Transitions an active loading request to a recoverable retry state (e.g., timeout, offline, error).
 */
export function failProductNavigation(
  reason: Exclude<ProductNavErrorReason, null>,
  expectedSeq?: number
): ProductNavigationState {
  if (
    expectedSeq !== undefined &&
    currentNavState.requestSeq !== expectedSeq
  ) {
    return currentNavState;
  }
  if (currentNavState.status === "idle") {
    return currentNavState;
  }

  clearFadeOutTimer();
  currentNavState = {
    ...currentNavState,
    status: "error",
    isFadingOut: false,
    errorReason: reason,
  };
  notifyListeners();
  return currentNavState;
}

/**
 * Immediately clears any loading or error overlay (e.g., on hardware Back or leaving product routes).
 */
export function cancelProductNavigation(): ProductNavigationState {
  if (currentNavState.status === "idle" && !currentNavState.isFadingOut) return currentNavState;
  clearFadeOutTimer();
  currentNavState = {
    ...IDLE_STATE,
    isFadingOut: false,
    requestSeq: currentNavState.requestSeq,
  };
  notifyListeners();
  return currentNavState;
}
