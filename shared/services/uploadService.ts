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
    const fileName = customFileName || `product_${uniqueId}.${ext}`;
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
    }

    const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    return publicUrlData?.publicUrl || `${process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qjpahzstldiatfbutvfc.supabase.co"}/storage/v1/object/public/${bucketName}/${filePath}`;
  } catch (err: any) {
    console.error("Supabase Storage upload error:", err);
    if (typeof fileOrBase64 === "string") return fileOrBase64;
    throw err;
  }
}

/**
 * Upload image (Directly saves to Supabase Storage 'product-images' bucket under 100KB)
 */
export async function uploadToCloudinary(
  fileOrBase64: File | Blob | string
): Promise<string> {
  return await uploadToSupabaseBucket("product-images", fileOrBase64);
}
