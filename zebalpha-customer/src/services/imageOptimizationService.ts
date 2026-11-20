/**
 * ZebAlpha Enterprise Image Optimization & Cloudinary CDN Delivery Service
 * Flipkart & Meesho-grade responsive AVIF/WebP transforms, strict egress control, & zero wasted bytes.
 */

const IMAGE_MEMORY_CACHE = new Set<string>();
const FAILED_IMAGES_CACHE = new Map<string, number>();
const MAX_FAILED_RETRIES = 2;
const RETRY_BACKOFF_MS = 30000;

export interface ImageVariantOptions {
  width?: number;
  height?: number;
  quality?: "auto" | "auto:eco" | "auto:good" | "auto:best" | number;
  format?: "auto" | "webp" | "avif";
  crop?: "limit" | "fill" | "thumb" | "fit";
  gravity?: "auto" | "face" | "center";
  blur?: number;
  dpr?: "auto" | number;
}

const CLOUDINARY_TRANSFORM_SEGMENT_RE =
  /^(?:[a-z]{1,3}_[^/,]+)(?:,[a-z]{1,3}_[^/,]+)*$/i;

/**
 * Generates an optimized Cloudinary CDN delivery URL with dynamic AVIF/WebP,
 * exact responsive resizing, and bandwidth-saving compression.
 *
 * NOTE: Deliberately does NOT rewrite Supabase Storage URLs to `/render/image/public/`
 * because Supabase Image Transformations are Pro-only (returns HTTP 400 on Free Plan).
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

  // Local assets, data URIs, or SVGs do not need external CDN transforms
  if (trimmed.startsWith("/") || trimmed.startsWith("data:") || trimmed.endsWith(".svg")) {
    return trimmed;
  }

  // Cloudinary CDN Optimization: res.cloudinary.com
  if (trimmed.includes("res.cloudinary.com")) {
    const uploadMarker = "/image/upload/";
    const uploadIndex = trimmed.indexOf(uploadMarker);
    if (uploadIndex !== -1) {
      const {
        width,
        height,
        quality = "auto:eco",
        format = "auto",
        crop = "limit",
        gravity,
        blur,
        dpr = "auto",
      } = options;

      const transformParts: string[] = [
        `f_${format}`,
        `q_${quality}`,
        `dpr_${dpr}`,
      ];

      if (width) transformParts.push(`w_${width}`);
      if (height) transformParts.push(`h_${height}`);
      if (width || height) transformParts.push(`c_${crop}`);
      if (gravity && (crop === "fill" || crop === "thumb")) {
        transformParts.push(`g_${gravity}`);
      }
      if (blur) transformParts.push(`e_blur:${blur}`);

      const transformStr = transformParts.join(",");
      const prefix = trimmed.substring(0, uploadIndex + uploadMarker.length);
      let suffix = trimmed.substring(uploadIndex + uploadMarker.length);

      // Strip any existing Cloudinary transform segments before version (v12345) or folder path
      // so we never chain duplicate transforms and always emit a single canonical CDN cache key
      while (suffix.includes("/")) {
        const slashIdx = suffix.indexOf("/");
        const seg = suffix.substring(0, slashIdx);
        if (CLOUDINARY_TRANSFORM_SEGMENT_RE.test(seg) && !/^v\d+$/.test(seg)) {
          suffix = suffix.substring(slashIdx + 1);
        } else {
          break;
        }
      }

      return `${prefix}${transformStr}/${suffix}`;
    }
  }

  // Return non-Cloudinary URLs cleanly as-is (never break Free-tier Supabase URLs with Pro-only /render/image/)
  return trimmed;
}

/**
 * Canonical Responsive Cloudinary CDN Breakpoints
 * Fixed width buckets maximize Cloudinary & Browser CDN cache-hit ratios across 500+ concurrent users.
 */
export const IMAGE_VARIANTS = {
  // Ultra-light blur thumbnail for progressive shimmer (LQIP)
  blurPlaceholder: (url: string) =>
    getOptimizedImageUrl(url, { width: 40, height: 50, quality: 30, blur: 300 }),

  // Mobile 2-column product grid card (~15-28 KB AVIF/WebP)
  productGridCard: (url: string) =>
    getOptimizedImageUrl(url, { width: 400, height: 540, crop: "limit", quality: "auto:eco" }),

  // Desktop 4-5 column product card (~22-36 KB AVIF/WebP)
  productGridCardLg: (url: string) =>
    getOptimizedImageUrl(url, { width: 560, height: 740, crop: "limit", quality: "auto:eco" }),

  // Curated Collections square tile (~10-16 KB AVIF/WebP)
  curatedCollection: (url: string) =>
    getOptimizedImageUrl(url, { width: 280, height: 280, crop: "fill", gravity: "auto", quality: "auto:eco" }),

  // Editorial Curved Carousel Card (~25-40 KB AVIF/WebP)
  editorialCard: (url: string) =>
    getOptimizedImageUrl(url, { width: 520, height: 700, crop: "limit", quality: "auto:good" }),

  // Product Detail Page main viewer (~45-80 KB AVIF/WebP)
  productDetailMain: (url: string) =>
    getOptimizedImageUrl(url, { width: 960, height: 1280, crop: "limit", quality: "auto:good" }),

  // Product Detail thumbnail strip (~4 KB AVIF/WebP)
  productDetailThumb: (url: string) =>
    getOptimizedImageUrl(url, { width: 140, height: 180, crop: "fill", gravity: "auto", quality: "auto:eco" }),

  // Hero Banner (Wide display, sharp yet lightweight)
  heroBanner: (url: string) =>
    getOptimizedImageUrl(url, { width: 1200, quality: "auto:good", crop: "limit" }),

  // Category navigation circular/rounded icon (~3 KB AVIF/WebP)
  categoryIcon: (url: string) =>
    getOptimizedImageUrl(url, { width: 120, height: 120, crop: "fill", gravity: "auto", quality: "auto:eco" }),
};

export function isImageCachedInMemory(url: string): boolean {
  return IMAGE_MEMORY_CACHE.has(url);
}

export function markImageLoadedInMemory(url: string): void {
  if (IMAGE_MEMORY_CACHE.size > 400) {
    const first = IMAGE_MEMORY_CACHE.values().next().value;
    if (first) IMAGE_MEMORY_CACHE.delete(first);
  }
  IMAGE_MEMORY_CACHE.add(url);
  FAILED_IMAGES_CACHE.delete(url);
}

export function shouldRetryFailedImage(url: string): boolean {
  const failTime = FAILED_IMAGES_CACHE.get(url);
  if (!failTime) return true;
  if (Date.now() - failTime > RETRY_BACKOFF_MS) {
    FAILED_IMAGES_CACHE.delete(url);
    return true;
  }
  return false;
}

export function markImageFailed(url: string): void {
  FAILED_IMAGES_CACHE.set(url, Date.now());
}

export function preloadImage(url: string): Promise<boolean> {
  if (typeof window === "undefined" || !url) return Promise.resolve(false);
  if (IMAGE_MEMORY_CACHE.has(url)) return Promise.resolve(true);

  return new Promise((resolve) => {
    const img = new window.Image();
    img.decoding = "async";
    img.onload = () => {
      markImageLoadedInMemory(url);
      resolve(true);
    };
    img.onerror = () => {
      markImageFailed(url);
      resolve(false);
    };
    img.src = url;
  });
}

export { MAX_FAILED_RETRIES };
