import { supabase } from "../utils/supabaseClient";

/**
 * Helper to convert Base64/DataURL to Blob
 */
function dataURLtoBlob(dataurl: string): Blob {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const bstr = atob(arr[1] || arr[0]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Automatically compress any image to ~100KB size using client-side Canvas
 */
export async function compressImageTo100KB(
  fileOrBase64: File | Blob | string,
  targetMaxBytes: number = 100 * 1024
): Promise<{ blob: Blob; contentType: string; ext: string }> {
  if (typeof window === "undefined") {
    if (typeof fileOrBase64 === "string") {
      const blob = dataURLtoBlob(fileOrBase64);
      return { blob, contentType: blob.type || "image/webp", ext: "webp" };
    }
    return { blob: fileOrBase64 as Blob, contentType: (fileOrBase64 as Blob).type || "image/webp", ext: "webp" };
  }

  return new Promise((resolve) => {
    let src = "";
    if (typeof fileOrBase64 === "string") {
      src = fileOrBase64;
    } else {
      src = URL.createObjectURL(fileOrBase64);
    }

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      if (typeof fileOrBase64 !== "string") {
        URL.revokeObjectURL(src);
      }

      const maxDim = 1200;
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { alpha: true });

      const attemptCompression = (q: number, scaleFactor: number = 1.0) => {
        const curW = Math.max(300, Math.round(width * scaleFactor));
        const curH = Math.max(300, Math.round(height * scaleFactor));
        canvas.width = curW;
        canvas.height = curH;

        if (ctx) {
          ctx.clearRect(0, 0, curW, curH);
          ctx.drawImage(img, 0, 0, curW, curH);
        }

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              const fallback = typeof fileOrBase64 === "string" ? dataURLtoBlob(fileOrBase64) : (fileOrBase64 as Blob);
              resolve({ blob: fallback, contentType: "image/webp", ext: "webp" });
              return;
            }

            if (blob.size <= targetMaxBytes || (q <= 0.4 && scaleFactor <= 0.5)) {
              resolve({ blob, contentType: "image/webp", ext: "webp" });
            } else if (q > 0.5) {
              attemptCompression(q - 0.15, scaleFactor);
            } else {
              attemptCompression(0.75, scaleFactor * 0.8);
            }
          },
          "image/webp",
          q
        );
      };

      attemptCompression(0.85, 1.0);
    };

    img.onerror = () => {
      const fallback = typeof fileOrBase64 === "string" ? dataURLtoBlob(fileOrBase64) : (fileOrBase64 as Blob);
      resolve({ blob: fallback, contentType: "image/webp", ext: "webp" });
    };

    img.src = src;
  });
}

/**
 * Upload file or base64 string directly to Supabase Storage Bucket in ~100KB size
 */
export async function uploadToSupabaseBucket(
  bucketName: string = "product-images",
  fileOrBase64: File | Blob | string,
  customFileName?: string
): Promise<string> {
  try {
    if (typeof fileOrBase64 === "string" && (fileOrBase64.startsWith("http://") || fileOrBase64.startsWith("https://"))) {
      return fileOrBase64;
    }

    // Automatically compress to ~100KB size WebP
    const { blob, contentType, ext } = await compressImageTo100KB(fileOrBase64, 100 * 1024);

    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const fileName = customFileName || `catalog/product_${uniqueId}.${ext}`;
    const filePath = fileName;

    // Upload directly to Supabase Storage Bucket
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, blob, {
        contentType,
        upsert: true
      });

    if (error) {
      console.warn(`Notice uploading to Supabase bucket "${bucketName}":`, error.message);
      const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
      if (publicUrlData?.publicUrl) return publicUrlData.publicUrl;
      if (typeof fileOrBase64 === "string") return fileOrBase64;
      return "/banner-premium-polo.png";
    }

    const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    const baseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_A_URL || "").trim();
    return publicUrlData?.publicUrl || (baseUrl ? `${baseUrl}/storage/v1/object/public/${bucketName}/${filePath}` : "");
  } catch (err: any) {
    console.error("Supabase Storage upload error:", err);
    if (typeof fileOrBase64 === "string") return fileOrBase64;
    return "/banner-premium-polo.png";
  }
}

/**
 * Cloudinary Direct Upload Integration
 * Cloud Name: vtweyirx
 */
const CLOUDINARY_CLOUD_NAME = "vtweyirx";
const CLOUDINARY_UPLOAD_PRESET = "zebalpha_preset"; // Optional or unsigned preset
const CLOUDINARY_API_KEY = "317122266961536";

export async function uploadDirectToCloudinary(
  fileOrBase64: File | Blob | string,
  folder: string = "products"
): Promise<string> {
  try {
    let base64Data = "";
    if (typeof fileOrBase64 === "string") {
      base64Data = fileOrBase64;
    } else {
      base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(fileOrBase64);
      });
    }

    // Call Cloudinary Upload API directly
    const formData = new FormData();
    formData.append("file", base64Data);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append("folder", folder);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      if (data.secure_url) {
        // Automatically inject Cloudinary's dynamic WebP and auto quality transforms
        // e.g. https://res.cloudinary.com/vtweyirx/image/upload/f_auto,q_auto/v...
        return data.secure_url.replace("/upload/", "/upload/f_auto,q_auto/");
      }
    }
  } catch (err) {
    console.warn("Direct Cloudinary upload fallback:", err);
  }

  // Graceful fallback to Supabase Storage if Cloudinary unsigned preset is not yet created
  return await uploadToSupabaseBucket("product-images", fileOrBase64);
}

/**
 * Upload image (Directly saves to Cloudinary CDN with fallback to Supabase Storage)
 */
export async function uploadToCloudinary(
  fileOrBase64: File | Blob | string
): Promise<string> {
  return await uploadDirectToCloudinary(fileOrBase64, "products");
}

/**
 * Validates that an image file does not exceed maxKb limit (Strictly 120 KB for Homepage Editorial)
 */
export function validateHomepageImageSize(
  fileOrBlob: File | Blob,
  maxKbLimit: number = 120
): { isValid: boolean; message?: string; sizeKb: number } {
  const sizeBytes = fileOrBlob.size;
  const sizeKb = Number((sizeBytes / 1024).toFixed(1));
  const maxBytes = maxKbLimit * 1024;

  if (sizeBytes > maxBytes) {
    return {
      isValid: false,
      message: `Image must be 120 KB or smaller. (Selected: ${sizeKb} KB).`,
      sizeKb,
    };
  }

  return { isValid: true, sizeKb };
}

/**
 * Validate against max KB limit (Strict <= 120 KB limit)
 */
export async function compressAndValidateWebPImage(
  fileOrBase64: File | Blob | string,
  maxKbLimit: number = 120
): Promise<{
  blob: Blob;
  contentType: string;
  ext: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  isWithinLimit: boolean;
  sizeFormatted: string;
}> {
  const maxBytes = maxKbLimit * 1024;
  let originalSize = 0;
  if (typeof fileOrBase64 !== "string") {
    originalSize = (fileOrBase64 as Blob).size;
  }
  const { blob, contentType, ext } = await compressImageTo100KB(fileOrBase64, maxBytes);
  const compressedSize = blob.size;
  const isWithinLimit = compressedSize <= maxBytes;
  const sizeFormatted = `${(compressedSize / 1024).toFixed(1)} KB`;

  return {
    blob,
    contentType,
    ext,
    originalSizeBytes: originalSize,
    compressedSizeBytes: compressedSize,
    isWithinLimit,
    sizeFormatted,
  };
}

/**
 * Validates that a banner image file does not exceed 80 KB limit
 */
export function validateBannerImageSize(
  fileOrBlob: File | Blob,
  maxKbLimit: number = 80
): { isValid: boolean; message?: string; sizeKb: number } {
  const sizeBytes = fileOrBlob.size;
  const sizeKb = Number((sizeBytes / 1024).toFixed(1));
  const maxBytes = maxKbLimit * 1024;

  if (sizeBytes > maxBytes) {
    return {
      isValid: false,
      message: `Banner image must be ${maxKbLimit} KB or smaller. (Selected: ${sizeKb} KB).`,
      sizeKb,
    };
  }

  return { isValid: true, sizeKb };
}

/**
 * Automatically compress any banner image to strictly <= 80 KB WebP while preserving exact aspect ratio
 */
export async function compressBannerTo50KB(
  file: File | Blob,
  maxBytes: number = 80 * 1024
): Promise<{ file: File; actualKb: number; blob: Blob; width: number; height: number; aspectRatio: number }> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      const b = file as Blob;
      return resolve({
        file: file instanceof File ? file : new File([b], "banner.webp", { type: "image/webp" }),
        actualKb: Number((b.size / 1024).toFixed(1)),
        blob: b,
        width: 1400,
        height: 600,
        aspectRatio: 2.333,
      });
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to decode image."));
      img.onload = async () => {
        try {
          const naturalW = img.naturalWidth || img.width;
          const naturalH = img.naturalHeight || img.height;
          const originalAspect = naturalW / naturalH;

          // Limit maximum width for wide banner while keeping exact proportional height
          let targetW = naturalW;
          let targetH = naturalH;
          const MAX_WIDTH = 1600;
          if (targetW > MAX_WIDTH) {
            targetW = MAX_WIDTH;
            targetH = Math.round(targetW / originalAspect);
          }

          const canvas = document.createElement("canvas");
          let currentW = targetW;
          let currentH = targetH;
          let blob: Blob | null = null;
          let quality = 0.88;

          while (quality >= 0.2) {
            canvas.width = currentW;
            canvas.height = currentH;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Could not initialize 2D canvas context.");
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.clearRect(0, 0, currentW, currentH);
            ctx.drawImage(img, 0, 0, currentW, currentH);

            blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", quality));
            if (blob && blob.size <= maxBytes) {
              break;
            }
            quality -= 0.12;
            if (quality < 0.35 && blob && blob.size > maxBytes) {
              currentW = Math.max(320, Math.round(currentW * 0.88));
              currentH = Math.round(currentW / originalAspect);
              quality = 0.75;
            }
          }

          if (!blob) {
            throw new Error("Banner image compression failed.");
          }

          if (blob.size > maxBytes) {
            currentW = Math.max(300, Math.round(currentW * 0.8));
            currentH = Math.round(currentW / originalAspect);
            canvas.width = currentW;
            canvas.height = currentH;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = "medium";
              ctx.drawImage(img, 0, 0, currentW, currentH);
              blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", 0.45));
            }
          }

          if (!blob || blob.size > maxBytes) {
            throw new Error(
              `Could not compress banner under 50 KB (Achieved: ${(blob ? blob.size / 1024 : 0).toFixed(1)} KB). Please choose a lighter image.`
            );
          }

          const rawName = file instanceof File ? file.name : "banner";
          const baseName = rawName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_");
          const processedFile = new File([blob], `${baseName}-banner.webp`, { type: "image/webp" });
          const actualKb = Number((blob.size / 1024).toFixed(1));

          resolve({
            file: processedFile,
            actualKb,
            blob,
            width: currentW,
            height: currentH,
            aspectRatio: Number(originalAspect.toFixed(3)),
          });
        } catch (err) {
          reject(err);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Alias for compressBannerTo50KB supporting 80KB banner limit
 */
export const compressBannerTo80KB = compressBannerTo50KB;

/**
 * Strict product image max bytes allowed: exactly 50,883 bytes (~49.69 KiB)
 */
export const STRICT_PRODUCT_IMAGE_MAX_BYTES = 50883;

/**
 * Validates binary WebP signature:
 * Byte 0..3: RIFF (0x52, 0x49, 0x46, 0x46)
 * Byte 8..11: WEBP (0x57, 0x45, 0x42, 0x50)
 */
export function verifyWebPBuffer(buffer: ArrayBuffer | Uint8Array): boolean {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.length < 12) return false;
  const isRiff = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
  const isWebp = bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  return isRiff && isWebp;
}

export interface WebPCompressionResult {
  blob: Blob;
  dataUrl: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  compressionRatioPercent: number;
  isWithinLimit: boolean;
  isValidWebP: boolean;
  width: number;
  height: number;
  qualityUsed: number;
}

/**
 * Adaptive WebP Compression Engine for ZebAlpha Seller Products
 * Automatically converts any input (JPEG, PNG, WebP up to 25MB+) to WebP
 * and adaptively optimizes quality and dimensions until output size <= 50,883 bytes.
 */
export async function compressToTargetWebP(
  fileOrBase64: File | Blob | string,
  targetMaxBytes: number = STRICT_PRODUCT_IMAGE_MAX_BYTES
): Promise<WebPCompressionResult> {
  // Determine original size
  let originalSizeBytes = 0;
  if (typeof fileOrBase64 === "string") {
    const base64Str = fileOrBase64.split(",")[1] || fileOrBase64;
    originalSizeBytes = Math.round((base64Str.length * 3) / 4);
  } else {
    originalSizeBytes = fileOrBase64.size;
  }

  if (typeof window === "undefined") {
    // SSR / Node fallback
    const blob = typeof fileOrBase64 === "string" ? dataURLtoBlob(fileOrBase64) : (fileOrBase64 as Blob);
    const dataUrl = typeof fileOrBase64 === "string" ? fileOrBase64 : "";
    return {
      blob,
      dataUrl,
      originalSizeBytes,
      compressedSizeBytes: blob.size,
      compressionRatioPercent: 0,
      isWithinLimit: blob.size <= targetMaxBytes,
      isValidWebP: true,
      width: 800,
      height: 800,
      qualityUsed: 0.8,
    };
  }

  return new Promise((resolve, reject) => {
    let src = "";
    if (typeof fileOrBase64 === "string") {
      src = fileOrBase64;
    } else {
      src = URL.createObjectURL(fileOrBase64);
    }

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = async () => {
      if (typeof fileOrBase64 !== "string") {
        URL.revokeObjectURL(src);
      }

      try {
        const naturalW = img.naturalWidth || img.width;
        const naturalH = img.naturalHeight || img.height;
        const originalAspect = naturalW / naturalH;

        // Bounding maximum dimension for sharp product images: 1200px
        const MAX_DIMENSION = 1200;
        let baseW = naturalW;
        let baseH = naturalH;
        if (baseW > MAX_DIMENSION || baseH > MAX_DIMENSION) {
          if (baseW >= baseH) {
            baseW = MAX_DIMENSION;
            baseH = Math.max(1, Math.round(baseW / originalAspect));
          } else {
            baseH = MAX_DIMENSION;
            baseW = Math.max(1, Math.round(baseH * originalAspect));
          }
        }

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { alpha: true });
        if (!ctx) {
          throw new Error("Could not initialize 2D canvas context.");
        }

        // Adaptive search loop
        let currentW = baseW;
        let currentH = baseH;
        let bestBlob: Blob | null = null;
        let bestQuality = 0.82;
        let quality = 0.82;
        const MIN_DIMENSION = 380;
        const MIN_QUALITY = 0.35;

        let attempts = 0;
        const maxAttempts = 24;

        while (attempts < maxAttempts) {
          attempts++;
          canvas.width = currentW;
          canvas.height = currentH;
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.clearRect(0, 0, currentW, currentH);
          ctx.drawImage(img, 0, 0, currentW, currentH);

          const currentBlob = await new Promise<Blob | null>((res) =>
            canvas.toBlob(res, "image/webp", quality)
          );

          if (!currentBlob) {
            break;
          }

          bestBlob = currentBlob;
          bestQuality = quality;

          if (currentBlob.size <= targetMaxBytes) {
            // Target satisfied!
            break;
          }

          // Need further reduction:
          if (quality > 0.42) {
            quality = Math.max(0.38, Number((quality - 0.08).toFixed(2)));
          } else if (Math.min(currentW, currentH) > 320) {
            // Scale dimensions down by 12%
            const nextW = Math.max(320, Math.round(currentW * 0.88));
            currentH = Math.max(1, Math.round(nextW / originalAspect));
            currentW = nextW;
            // Bounce quality slightly to maintain crisp edges at lower resolution
            quality = Math.min(0.72, quality + 0.15);
          } else if (quality > MIN_QUALITY) {
            quality = Math.max(MIN_QUALITY, Number((quality - 0.05).toFixed(2)));
          } else {
            // Reached minimum safety thresholds
            break;
          }
        }

        if (!bestBlob) {
          throw new Error("Failed to produce WebP blob from canvas.");
        }

        // Convert blob to ArrayBuffer to strictly verify WebP signature
        const arrayBuf = await bestBlob.arrayBuffer();
        const isValidWebP = verifyWebPBuffer(arrayBuf);

        // Convert to dataUrl for immediate reactive seller preview
        const dataUrl = await new Promise<string>((res) => {
          const reader = new FileReader();
          reader.onload = () => res((reader.result as string) || "");
          reader.onerror = () => res("");
          reader.readAsDataURL(bestBlob);
        });

        const compressedSizeBytes = bestBlob.size;
        const isWithinLimit = compressedSizeBytes <= targetMaxBytes;
        const compressionRatioPercent =
          originalSizeBytes > 0
            ? Math.max(0, Math.round(((originalSizeBytes - compressedSizeBytes) / originalSizeBytes) * 100))
            : 0;

        resolve({
          blob: bestBlob,
          dataUrl,
          originalSizeBytes,
          compressedSizeBytes,
          compressionRatioPercent,
          isWithinLimit,
          isValidWebP,
          width: currentW,
          height: currentH,
          qualityUsed: bestQuality,
        });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      reject(new Error("Failed to decode image for WebP compression."));
    };

    img.src = src;
  });
}


