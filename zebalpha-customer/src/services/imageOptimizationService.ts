/**
 * ZebAlpha Enterprise Image Optimization & CDN Delivery Service
 * Flipkart & Meesho-grade responsive image transformations, multi-tier caching & network awareness.
 */

// Memory Cache: LRU-style map to prevent repeated network requests for already-decoded images
const IMAGE_MEMORY_CACHE = new Set<string>();
const FAILED_IMAGES_CACHE = new Map<string, number>(); // url -> failure timestamp
const MAX_FAILED_RETRIES = 2;
const RETRY_BACKOFF_MS = 30000; // retry failed images after 30 seconds

export interface ImageVariantOptions {
  width?: number;
  height?: number;
  quality?: "auto" | number;
  format?: "auto" | "webp" | "avif";
  crop?: "limit" | "fill" | "thumb" | "fit";
  blur?: number; // for LQIP (Low Quality Image Placeholder)
  dpr?: "auto" | number;
}

/**
 * Generates an optimized Cloudinary delivery URL with dynamic WebP, responsive resizing,
 * and high compression transforms.
 */
export function getOptimizedImageUrl(
  rawUrl: string | undefined | null,
  options: ImageVariantOptions = {}
): string {
  if (!rawUrl || typeof rawUrl !== "string") {
    return "/placeholder.jpg";
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return "/placeholder.jpg";
  }

  // Local assets or SVGs don't need Cloudinary transforms
  if (trimmed.startsWith("/") || trimmed.startsWith("data:") || trimmed.endsWith(".svg")) {
    return trimmed;
  }

  // Cloudinary URL Optimization: res.cloudinary.com
  if (trimmed.includes("res.cloudinary.com")) {
    const {
      width,
      height,
      quality = "auto",
      format = "auto",
      crop = "limit",
      blur,
    } = options;

    const transformParts: string[] = [];

    // Format & Quality (lossy WebP/AVIF auto-negotiation)
    transformParts.push(`f_${format}`);
    transformParts.push(`q_${quality}`);
    transformParts.push(`dpr_${options.dpr || "auto"}`);

    // Dimensions
    if (width) transformParts.push(`w_${width}`);
    if (height) transformParts.push(`h_${height}`);
    if (width || height) transformParts.push(`c_${crop}`);

    // LQIP Blur placeholder
    if (blur) transformParts.push(`e_blur:${blur}`);

    const transformStr = transformParts.join(",");

    // Inject before version or folder in Cloudinary URL
    // e.g. https://res.cloudinary.com/vtweyirx/image/upload/v12345/products/xyz.webp
    // -> https://res.cloudinary.com/vtweyirx/image/upload/f_auto,q_auto,w_400/v12345/products/xyz.webp
    const uploadIndex = trimmed.indexOf("/upload/");
    if (uploadIndex !== -1) {
      const prefix = trimmed.substring(0, uploadIndex + 8);
      let suffix = trimmed.substring(uploadIndex + 8);

      // Strip any existing transforms so we don't chain duplicate transform blocks
      if (suffix.startsWith("f_auto") || suffix.includes(",q_auto")) {
        const nextSlash = suffix.indexOf("/");
        if (nextSlash !== -1) {
          suffix = suffix.substring(nextSlash + 1);
        }
      }

      return `${prefix}${transformStr}/${suffix}`;
    }
  }

  // Supabase Storage URL optimization (Render image resizing if available)
  if (trimmed.includes("supabase.co/storage/v1/object/public/")) {
    if (options.width || options.height) {
      const { width, height } = options;
      // Convert to Supabase transform endpoint if supported: /render/image/public/
      const renderUrl = trimmed.replace(
        "/storage/v1/object/public/",
        "/storage/v1/render/image/public/"
      );
      const params = new URLSearchParams();
      if (width) params.set("width", String(width));
      if (height) params.set("height", String(height));
      params.set("resize", "contain");
      return `${renderUrl}?${params.toString()}`;
    }
  }

  return trimmed;
}

/**
 * Predefined Responsive Breakpoints matching ZebAlpha's Product Cards & Carousels
 */
export const IMAGE_VARIANTS = {
  // Ultra-light blur thumbnail for progressive shimmer (LQIP)
  blurPlaceholder: (url: string) =>
    getOptimizedImageUrl(url, { width: 40, height: 50, quality: 30, blur: 300 }),

  // Mobile 2-column product grid card (~200px - 300px display)
  productGridCard: (url: string) =>
    getOptimizedImageUrl(url, { width: 480, height: 640, crop: "limit", quality: "auto" }),

  // Desktop 4-5 column product card
  productGridCardLg: (url: string) =>
    getOptimizedImageUrl(url, { width: 600, height: 800, crop: "limit", quality: "auto" }),

  // Product Detail Page main viewer (high-res with 1200px max)
  productDetailMain: (url: string) =>
    getOptimizedImageUrl(url, { width: 1080, height: 1440, crop: "limit", quality: "auto" }),

  // Product Detail thumbnail strip
  productDetailThumb: (url: string) =>
    getOptimizedImageUrl(url, { width: 140, height: 180, crop: "fill", quality: "auto" }),

  // Editorial Curved Carousel Card
  editorialCard: (url: string) =>
    getOptimizedImageUrl(url, { width: 640, height: 960, crop: "limit", quality: "auto" }),

  // Hero Banner (Wide display)
  heroBanner: (url: string) =>
    getOptimizedImageUrl(url, { width: 1400, quality: "auto", crop: "limit" }),

  // Category navigation circular/rounded icon
  categoryIcon: (url: string) =>
    getOptimizedImageUrl(url, { width: 120, height: 120, crop: "fill", quality: "auto" }),
};

/**
 * Checks if an image has already been successfully loaded in the current session
 */
export function isImageCached(url: string): boolean {
  return IMAGE_MEMORY_CACHE.has(url);
}

/**
 * Marks an image as cached
 */
export function markImageCached(url: string): void {
  IMAGE_MEMORY_CACHE.add(url);
}

/**
 * Records an image failure and checks if retry is allowed
 */
export function recordImageFailure(url: string): boolean {
  const now = Date.now();
  const lastFailed = FAILED_IMAGES_CACHE.get(url);

  if (lastFailed && now - lastFailed < RETRY_BACKOFF_MS) {
    return false; // In backoff period, do not retry immediately
  }

  FAILED_IMAGES_CACHE.set(url, now);
  return true;
}

/**
 * Intelligent Image Prefetcher:
 * Downloads image in background when browser is idle without blocking user interaction
 */
export function prefetchImage(url: string, priority: "high" | "low" = "low"): void {
  if (!url || typeof window === "undefined" || IMAGE_MEMORY_CACHE.has(url)) return;

  const runPrefetch = () => {
    const img = new window.Image();
    img.src = url;
    img.onload = () => markImageCached(url);
    img.onerror = () => recordImageFailure(url);
  };

  if (priority === "high") {
    runPrefetch();
  } else if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(runPrefetch, { timeout: 2000 });
  } else {
    setTimeout(runPrefetch, 250);
  }
}

