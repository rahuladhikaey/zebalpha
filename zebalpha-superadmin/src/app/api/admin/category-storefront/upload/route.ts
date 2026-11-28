import { NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";
import { requireSuperAdmin, authErrorResponse } from "@/lib/authGuard";

export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 150 * 1024; // Strictly 150 KB max — high-size banners/icons are blocked!
const ALLOWED_MIME_TYPES = ["image/webp", "image/jpeg", "image/png"];

function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 12) return false;
  if (mimeType === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }
  if (mimeType === "image/webp") {
    return (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    );
  }
  return false;
}

export async function POST(req: Request) {
  try {
    await requireSuperAdmin(req);
  } catch (authErr: any) {
    if (authErr.name === "AuthError") return authErrorResponse(authErr);
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const folder = String(formData.get("folder") || "category-storefront").replace(/[^a-z0-9/_-]/gi, "");

    if (!file) {
      return NextResponse.json({ success: false, message: "No image file provided." }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        {
          success: false,
          message: `High-size image blocked: banners, icons & cards must be 150 KB or smaller (got ${(file.size / 1024).toFixed(0)} KB).`,
        },
        { status: 400 }
      );
    }

    const mimeType = (file.type || "").toLowerCase();
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return NextResponse.json(
        { success: false, message: "Only WebP, JPG, or PNG images are supported." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!validateMagicBytes(buffer, mimeType)) {
      return NextResponse.json({ success: false, message: "Invalid image file signature." }, { status: 400 });
    }

    const ext = mimeType === "image/jpeg" ? "jpg" : mimeType === "image/png" ? "png" : "webp";
    const filePath = `${folder}/cs_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

    // 1. Primary: Cloudinary Global CDN (f_auto,q_auto -> zero Supabase egress!)
    const cloudName = (process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "vtweyirx").trim();
    const uploadPreset = (process.env.CLOUDINARY_UPLOAD_PRESET || process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "zebalpha_preset").trim();

    try {
      const dataUri = `data:${mimeType};base64,${buffer.toString("base64")}`;
      const cloudForm = new URLSearchParams();
      cloudForm.append("file", dataUri);
      cloudForm.append("upload_preset", uploadPreset);
      cloudForm.append("folder", folder);

      const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: cloudForm,
      });

      if (cloudRes.ok) {
        const cloudData = await cloudRes.json();
        if (cloudData?.secure_url) {
          const cdnUrl = String(cloudData.secure_url).replace("/image/upload/", "/image/upload/f_auto,q_auto/");
          return NextResponse.json({
            success: true,
            publicUrl: cdnUrl,
            storageProvider: "CLOUDINARY_CDN",
          });
        }
      }
    } catch (cloudErr: any) {
      console.warn("[Category Storefront Upload] Cloudinary fallback:", cloudErr?.message);
    }

    // 2. Fallback: Supabase Storage Public Bucket
    const buckets = ["editorial", "editorial-images", "product-images"];
    for (const bucket of buckets) {
      const { error } = await supabaseServer.storage.from(bucket).upload(filePath, buffer, {
        contentType: mimeType,
        upsert: true,
      });
      if (!error) {
        const { data: pub } = supabaseServer.storage.from(bucket).getPublicUrl(filePath);
        return NextResponse.json({
          success: true,
          publicUrl: pub.publicUrl,
          storageProvider: `SUPABASE:${bucket}`,
        });
      }
    }

    return NextResponse.json({ success: false, message: "Image upload failed across storage providers." }, { status: 500 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err?.message || "Upload error" }, { status: 500 });
  }
}
