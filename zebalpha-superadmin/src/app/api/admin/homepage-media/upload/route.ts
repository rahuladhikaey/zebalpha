import { NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";

export const dynamic = "force-dynamic";

const MAX_IMAGE_SIZE_BYTES = 120 * 1024; // Strictly 120 KB PER IMAGE
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
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const section = (formData.get("section") as string) || "woven"; // 'curated-collections' or 'woven'

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No image file provided." },
        { status: 400 }
      );
    }

    // 1. Independent Server-Side File Size Verification (Never trust client value)
    const actualSizeBytes = file.size;
    if (actualSizeBytes > MAX_IMAGE_SIZE_BYTES) {
      const sizeKb = (actualSizeBytes / 1024).toFixed(1);
      return NextResponse.json(
        {
          success: false,
          message: `Image must be 120 KB or smaller. Uploaded file is ${sizeKb} KB. Please compress or optimize before uploading.`,
          actualSize: actualSizeBytes,
          maxAllowed: MAX_IMAGE_SIZE_BYTES,
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

    const folderPrefix =
      section === "curated-collections"
        ? "homepage/curated-collections"
        : "homepage/woven";

    const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const filePath = `${folderPrefix}/${section === "curated-collections" ? "coll" : "woven"}_${uniqueId}.${ext}`;

    // 5. Upload to Supabase Storage Bucket ('editorial-images' with fallback to 'product-images')
    let targetBucket = "editorial-images";
    let { error: uploadError } = await supabaseServer.storage
      .from(targetBucket)
      .upload(filePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError && uploadError.message?.toLowerCase().includes("bucket not found")) {
      targetBucket = "product-images";
      const fallbackUpload = await supabaseServer.storage
        .from(targetBucket)
        .upload(filePath, buffer, {
          contentType: mimeType,
          upsert: true,
        });
      uploadError = fallbackUpload.error;
    }

    if (uploadError) {
      console.error("[Storage Upload Error]:", uploadError);
      return NextResponse.json(
        { success: false, message: `Storage upload failed: ${uploadError.message}` },
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
