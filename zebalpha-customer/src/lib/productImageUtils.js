export function isDeadLegacySupabaseImage(url) {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  return trimmed.includes('.supabase.co/storage/v1/object/public/product-images/');
}

export function normalizeProductImages(product) {
  const candidates = [];

  const pushValue = (value) => {
    if (typeof value !== 'string') return;
    const normalized = value.trim();
    if (!normalized) return;
    if (!candidates.includes(normalized)) {
      candidates.push(normalized);
    }
  };

  pushValue(product?.image_url);
  pushValue(product?.thumbnail_url);
  pushValue(product?.main_image);

  const rawImages = product?.images;
  if (Array.isArray(rawImages)) {
    rawImages.forEach((item) => {
      if (typeof item === 'string') {
        pushValue(item);
      } else if (item && typeof item === 'object' && 'url' in item && typeof item.url === 'string') {
        pushValue(item.url);
      }
    });
  } else if (typeof rawImages === 'string') {
    try {
      const parsed = JSON.parse(rawImages);
      if (Array.isArray(parsed)) {
        parsed.forEach((item) => {
          if (typeof item === 'string') {
            pushValue(item);
          } else if (item && typeof item === 'object' && 'url' in item && typeof item.url === 'string') {
            pushValue(item.url);
          }
        });
      } else {
        pushValue(rawImages);
      }
    } catch {
      pushValue(rawImages);
    }
  }

  // Prefer live Cloudinary/working CDN images over dead legacy Supabase product-images links
  const liveCandidates = candidates.filter((u) => !isDeadLegacySupabaseImage(u));
  return liveCandidates.length > 0 ? liveCandidates : candidates;
}

/**
 * Sanitizes product.packages so legacy dead Supabase Storage URLs inside variant galleries
 * automatically fall back to the product's working Cloudinary images.
 */
export function sanitizeProductMedia(product) {
  if (!product || typeof product !== 'object') return product;

  const parentImages = normalizeProductImages(product);
  const liveParentImages = parentImages.filter((u) => !isDeadLegacySupabaseImage(u));
  const fallbackGallery = liveParentImages.length > 0 ? liveParentImages : parentImages;
  const fallbackCover = fallbackGallery[0] || product.image_url || '';

  const sanitizedPackages = Array.isArray(product.packages)
    ? product.packages.map((pkg) => {
        if (!pkg || typeof pkg !== 'object') return pkg;
        const rawGal = Array.isArray(pkg.gallery)
          ? pkg.gallery.filter((u) => typeof u === 'string' && u.trim())
          : [];
        const cleanGal = rawGal.filter((u) => !isDeadLegacySupabaseImage(u));
        const nextGallery = cleanGal.length > 0 ? cleanGal : fallbackGallery;

        const rawImg = typeof pkg.image_url === 'string' ? pkg.image_url.trim() : '';
        const nextImg =
          rawImg && !isDeadLegacySupabaseImage(rawImg)
            ? rawImg
            : nextGallery[0] || fallbackCover;

        return {
          ...pkg,
          image_url: nextImg,
          gallery: nextGallery,
        };
      })
    : product.packages;

  return {
    ...product,
    image_url:
      product.image_url && !isDeadLegacySupabaseImage(product.image_url)
        ? product.image_url
        : fallbackCover,
    images: fallbackGallery.length > 0 ? fallbackGallery : product.images,
    thumbnail_url:
      product.thumbnail_url && !isDeadLegacySupabaseImage(product.thumbnail_url)
        ? product.thumbnail_url
        : fallbackCover,
    packages: sanitizedPackages,
  };
}
