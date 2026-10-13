import { NextResponse } from "next/server";
import { supabaseServer } from "@/shared/utils/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { imageBase64, fileName, mimeType = "image/jpeg" } = body;

    if (!imageBase64) {
      return NextResponse.json({ success: false, message: "No image data provided" }, { status: 400 });
    }

    // Strict 155 KB (158,720 bytes) Maximum Image Size Policy Enforcement
    const MAX_ALLOWED_BYTES = 158720;
    const base64Data = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");
    const estimatedSizeBytes = Math.floor((base64Data.length * 3) / 4);
    if (estimatedSizeBytes > MAX_ALLOWED_BYTES) {
      return NextResponse.json(
        {
          success: false,
          message: `Image exceeds the platform maximum allowed size of 155 KB (158,720 bytes). Uploaded size: ${Math.round(estimatedSizeBytes / 1024)} KB. Please choose or compress a smaller image.`,
        },
        { status: 413 }
      );
    }

    // Try Cloudinary CDN if configured
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || "p1ish280";
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET || "zebalpha_products";

    try {
      const formData = new URLSearchParams();
      formData.append("file", imageBase64);
      formData.append("upload_preset", uploadPreset);

      const cloudRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      });

      if (cloudRes.ok) {
        const cloudData = await cloudRes.json();
        return NextResponse.json({
          success: true,
          url: cloudData.secure_url || cloudData.url,
        });
      }
    } catch (cdnErr) {
      console.warn("Cloudinary upload fallback:", cdnErr);
    }

    // Fallback directly returns the Base64 data URL if CDN is unavailable
    const dataUrl = imageBase64.startsWith("data:") ? imageBase64 : `data:${mimeType};base64,${imageBase64}`;
    return NextResponse.json({
      success: true,
      url: dataUrl
    });
  } catch (error: any) {
    console.error("Return proof upload error:", error);
    return NextResponse.json({ success: false, message: error?.message || "Upload failed" }, { status: 500 });
  }
}
