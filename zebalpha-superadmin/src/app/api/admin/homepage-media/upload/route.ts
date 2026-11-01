import { NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";
import { requireSuperAdmin, authErrorResponse } from "@/lib/authGuard";

export const dynamic = "force-dynamic";

const MAX_IMAGE_SIZE_BYTES = 95 * 1024; // Strictly 95 KB PER IMAGE FOR EDITORIAL & COLLECTIONS
const MAX_BANNER_SIZE_BYTES = 50 * 1024; // Strictly 50 KB PER IMAGE FOR HERO BANNERS
const ALLOWED_MIME_TYPES = ["image/webp", "image/jpeg", "image/png"];

// Inspect file magic bytes for tamper detection
function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 12) return false;

  // JPEG: FF D8 FF
  if (mimeType === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (mimeType === "image/png") {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    );
  }

  // WebP: RIFF .... WEBP
  if (mimeType === "image/webp") {
    const isRiff =
      buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
    const isWebp =
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
    return isRiff && isWebp;
  }

  return false;
}

export async function POST(req: Request) {
  try {
    await requireSuperAdmin(req);
  } catch (authErr: any) {
    if (authErr.name === "AuthError") return authErrorResponse(authErr);
    return NextResponse.json({ success: false, message: authErr.message || "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const section = (formData.get("section") as string) || "woven"; // 'curated-collections', 'woven', or 'banner'
    const isBanner = section === "banner";
    const maxAllowedBytes = isBanner ? MAX_BANNER_SIZE_BYTES : MAX_IMAGE_SIZE_BYTES;
    const maxKbLabel = isBanner ? "50 KB" : "95 KB";

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No image file provided." },
        { status: 400 }
      );
    }

    // 1. Independent Server-Side File Size Verification (Never trust client value)
    const actualSizeBytes = file.size;
    if (actualSizeBytes > maxAllowedBytes) {
      const sizeKb = (actualSizeBytes / 1024).toFixed(1);
      return NextResponse.json(
        {
          success: false,
          message: `Image must be ${maxKbLabel} or smaller. Uploaded file is ${sizeKb} KB. Please compress or optimize before uploading.`,
          actualSize: actualSizeBytes,
          maxAllowed: maxAllowedBytes,
        },
        { status: 400 }
      );
    }

    // 2. MIME Type Validation
    const mimeType = (file.type || "").toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json(
        {
          success: false,
          message: `Unsupported image format (${mimeType || "unknown"}). Accepted formats: WebP, JPEG, PNG.`,
        },
        { status: 400 }
      );
    }

    // 3. Inspect actual file content bytes
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!validateMagicBytes(buffer, mimeType)) {
      return NextResponse.json(
        {
          success: false,
          message: "File signature does not match declared image format. Upload rejected.",
        },
        { status: 400 }
      );
    }

    // 4. Determine file extension and dedicated storage namespace
    let ext = "webp";
    if (mimeType === "image/jpeg") ext = "jpg";
    else if (mimeType === "image/png") ext = "png";

    let folderPrefix = "homepage/woven";
    let filePrefix = "woven";
    if (section === "curated-collections") {
      folderPrefix = "homepage/curated-collections";
      filePrefix = "coll";
    } else if (section === "banner") {
      folderPrefix = "homepage/banner";
      filePrefix = "banner";
    }

    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const filePath = `${folderPrefix}/${filePrefix}_${uniqueId}.${ext}`;

    // 5. Upload to Supabase Storage Bucket ('editorial' primary, fallback to 'editorial-images' or 'product-images')
    const candidateBuckets = ["editorial", "editorial-images", "product-images"];
    let targetBucket = "editorial";
    let uploadSuccess = false;
    let lastUploadError: any = null;

    // For banner section: ensure homepage/banner folder marker exists in editorial bucket
    if (section === "banner") {
      try {
        await supabaseServer.storage
          .from("editorial")
          .upload("homepage/banner/.emptyFolderPlaceholder", Buffer.from(""), {
            contentType: "application/x-empty",
            upsert: false,
          });
      } catch (_) {
        // Safe to ignore if already exists
      }
    }

    for (const b of candidateBuckets) {
      const { error } = await supabaseServer.storage
        .from(b)
        .upload(filePath, buffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (!error) {
        targetBucket = b;
        uploadSuccess = true;
        break;
      } else {
        lastUploadError = error;
        if (error.message?.toLowerCase().includes("bucket not found")) {
          continue;
        }
      }
    }

    if (!uploadSuccess) {
      console.error("[Storage Upload Error]:", lastUploadError);
      return NextResponse.json(
        { success: false, message: `Storage upload failed: ${lastUploadError?.message || "Storage bucket not accessible"}` },
        { status: 500 }
      );
    }

    // 6. Retrieve Public Media URL
    const { data: publicUrlData } = supabaseServer.storage
      .from(targetBucket)
      .getPublicUrl(filePath);

    const publicUrl = publicUrlData?.publicUrl;
    if (!publicUrl) {
      return NextResponse.json(
        { success: false, message: "Failed to generate public URL for stored image." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      publicUrl,
      filePath,
      bucket: targetBucket,
      fileSize: actualSizeBytes,
      formattedSize: `${(actualSizeBytes / 1024).toFixed(1)} KB`,
    });
  } catch (error: any) {
    console.error("[Admin Media Upload API Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error during media upload." },
      { status: 500 }
    );
  }
}
