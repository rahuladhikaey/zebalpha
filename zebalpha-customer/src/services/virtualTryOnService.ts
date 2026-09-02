/**
 * Virtual Try-On Client Service
 * Handles in-browser photo optimization, memory cleanup, and communication with backend
 */

export interface VirtualTryOnRequest {
  personImage: string; // Base64 data URL
  productId?: string | number;
  garmentImage?: string;
  category?: string;
}

export interface VirtualTryOnResponse {
  success: boolean;
  imageUrl?: string;
  productId?: string | number;
  processingTimeMs?: number;
  provider?: string;
  notice?: string;
  error?: string;
}

/**
 * Optimizes and compresses a photo in client RAM using an offscreen canvas.
 * Reduces 10MB-25MB camera uploads to ~300KB-600KB for lightning fast inference.
 */
export async function compressAndPrepareImage(
  fileOrBlob: File | Blob,
  maxDimension: number = 1280,
  quality: number = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio scaling
        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to create 2D canvas context'));
          return;
        }

        // Smooth image rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to optimized JPEG/WebP
        const format = 'image/jpeg';
        const compressedBase64 = canvas.toDataURL(format, quality);

        // Immediate cleanup of canvas context
        canvas.width = 0;
        canvas.height = 0;

        resolve(compressedBase64);
      };

      img.onerror = () => reject(new Error('Failed to decode image file'));
      img.src = readerEvent.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file buffer'));
    reader.readAsDataURL(fileOrBlob);
  });
}

/**
 * Dispatches Virtual Try-On request to the API
 */
export async function runVirtualTryOn(payload: VirtualTryOnRequest): Promise<VirtualTryOnResponse> {
  try {
    const res = await fetch('/api/virtual-try-on', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      return {
        success: false,
        error: data.error || data.message || 'Virtual Try-On is temporarily unavailable. Please try again.',
      };
    }

    return {
      success: true,
      imageUrl: data.imageUrl,
      productId: data.productId,
      processingTimeMs: data.processingTimeMs,
      provider: data.provider,
      notice: data.notice,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Network connection error during virtual try-on.',
    };
  }
}
