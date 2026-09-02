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

  pushValue(product?.image_url);

  return candidates;
}
