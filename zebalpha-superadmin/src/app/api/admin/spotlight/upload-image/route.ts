import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

// Strict 50 KB = 51,200 bytes limit for Spotlight Editorial Card Images
const MAX_IMAGE_SIZE_BYTES = 50 * 1024; // 51,200 bytes
const ALLOWED_MIME_TYPES = ["image/webp", "image/jpeg", "image/png"];

// Tamper detection: verify magic byte signatures
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
    const campaignId = (formData.get("campaignId") as string) || "general";
    const cardId = (formData.get("cardId") as string) || `card_${Date.now()}`;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "No image file provided." },
        { status: 400 }
      );
    }

    // 1. Strict Server-Side File Size Verification (Must be <= 50 KB = 51,200 bytes)
    const actualSizeBytes = file.size;
    if (actualSizeBytes > MAX_IMAGE_SIZE_BYTES) {
      const sizeKb = (actualSizeBytes / 1024).toFixed(1);
      return NextResponse.json(
        {
          success: false,
          message: `Editorial image must be 50 KB or smaller. Uploaded file is ${sizeKb} KB (${actualSizeBytes} bytes). Maximum allowed: 50 KB (51,200 bytes).`,
          actualSize: actualSizeBytes,
          maxAllowed: MAX_IMAGE_SIZE_BYTES,
        },
        { status: 400 }
      );
    }

    // 2. MIME Type Verification
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

    // 3. Inspect actual file content bytes for forgery/tampering
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

    // 4. File extension and object path in bucket 'editorial'
    let ext = "webp";
    if (mimeType === "image/jpeg") ext = "jpg";
    else if (mimeType === "image/png") ext = "png";

    const uniqueImageId = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    // Format required: spotlights/{campaign_id}/{card_id}/{unique_image_id}.webp
    const objectKey = `spotlights/${campaignId}/${cardId}/${uniqueImageId}.${ext}`;
    const targetBucket = "editorial";

    // 5. Upload to Supabase Storage Bucket 'editorial'
    const { error: uploadError } = await supabaseServer.storage
      .from(targetBucket)
      .upload(objectKey, buffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error("[Spotlight Storage Upload Error]:", uploadError);
      return NextResponse.json(
        { success: false, message: `Storage upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // 6. Retrieve Public Media URL
    const { data: publicUrlData } = supabaseServer.storage
      .from(targetBucket)
      .getPublicUrl(objectKey);

    const publicUrl = publicUrlData?.publicUrl;
    if (!publicUrl) {
      return NextResponse.json(
        { success: false, message: "Failed to generate public URL for stored editorial image." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      publicUrl,
      bucket: targetBucket,
      objectKey,
      fileSize: actualSizeBytes,
      formattedSize: `${(actualSizeBytes / 1024).toFixed(1)} KB`,
    });
  } catch (error: any) {
    console.error("[Spotlight Image Upload Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error during image upload." },
      { status: 500 }
    );
  }
}
