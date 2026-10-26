/**
 * Client-Side Image Compression & Strict 50 KB Enforcement Helper
 * Maximum file size: 50 KB = 51,200 bytes
 */
export const MAX_EDITORIAL_IMAGE_BYTES = 50 * 1024; // 51,200 bytes

export interface OptimizedImageResult {
  blob: Blob;
  dataUrl: string;
  sizeBytes: number;
  sizeKbFormatted: string;
  width: number;
  height: number;
}

export async function optimizeEditorialImage(file: File): Promise<OptimizedImageResult> {
  const allowedTypes = ['image/webp', 'image/jpeg', 'image/png'];
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    throw new Error(`Unsupported format (${file.type}). Only WebP, JPEG, and PNG are accepted.`);
  }

  // Load image into HTMLImageElement
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Corrupted or invalid image file.'));
      image.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });

  const origWidth = img.naturalWidth || img.width;
  const origHeight = img.naturalHeight || img.height;

  if (origWidth < 100 || origHeight < 100) {
    throw new Error('Image dimensions too small. Minimum 100x100 required.');
  }

  // Start with target dimensions (standard 3:4 or 1:1, max width 600px is crisp for 50KB mobile/desktop cards)
  let currentWidth = Math.min(origWidth, 720);
  let currentHeight = Math.round((currentWidth / origWidth) * origHeight);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not available.');
  }

  // Iteratively test WebP quality from 0.85 down to 0.40, then downscale if needed
  let bestBlob: Blob | null = null;
  let attempts = 0;

  while (attempts < 10) {
    attempts++;
    canvas.width = currentWidth;
    canvas.height = currentHeight;
    ctx.clearRect(0, 0, currentWidth, currentHeight);
    ctx.drawImage(img, 0, 0, currentWidth, currentHeight);

    // Try WebP first
    for (const quality of [0.85, 0.78, 0.70, 0.60, 0.50, 0.42]) {
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/webp', quality));
      if (blob && blob.size <= MAX_EDITORIAL_IMAGE_BYTES) {
        bestBlob = blob;
        break;
      }
    }

    if (bestBlob && bestBlob.size <= MAX_EDITORIAL_IMAGE_BYTES) {
      break;
    }

    // If still > 50KB, downscale by 15% and retry
    currentWidth = Math.round(currentWidth * 0.85);
    currentHeight = Math.round((currentWidth / origWidth) * origHeight);
    if (currentWidth < 200) {
      break; // Cannot downscale further without severe blur
    }
  }

  if (!bestBlob || bestBlob.size > MAX_EDITORIAL_IMAGE_BYTES) {
    throw new Error(
      `Image cannot be compressed below 50 KB without unacceptable degradation. Please select an image with less complexity or pre-compress.`
    );
  }

  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(bestBlob!);
  });

  return {
    blob: bestBlob,
    dataUrl,
    sizeBytes: bestBlob.size,
    sizeKbFormatted: `${(bestBlob.size / 1024).toFixed(1)} KB`,
    width: currentWidth,
    height: currentHeight,
  };
}
