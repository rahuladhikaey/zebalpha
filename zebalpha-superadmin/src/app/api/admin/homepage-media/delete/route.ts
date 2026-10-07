import { NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { filePath, bucket = "editorial-images" } = await req.json();

    if (!filePath || typeof filePath !== "string") {
      return NextResponse.json(
        { success: false, message: "Valid filePath is required." },
        { status: 400 }
      );
    }

    // Safety constraint: only allow deleting files within homepage dedicated directories
    if (
      !filePath.startsWith("homepage/curated-collections/") &&
      !filePath.startsWith("homepage/woven/")
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Deletion restricted to homepage media folders only.",
        },
        { status: 403 }
      );
    }

    const { error } = await supabaseServer.storage.from(bucket).remove([filePath]);

    if (error) {
      console.warn("[Storage Delete Warning]:", error.message);
      // Try fallback bucket if primary wasn't matching
      if (bucket === "editorial-images") {
        await supabaseServer.storage.from("product-images").remove([filePath]);
      }
    }

    return NextResponse.json({ success: true, message: "Storage media cleaned safely." });
  } catch (error: any) {
    console.error("[Storage Delete Error]:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to remove storage media." },
      { status: 500 }
    );
  }
}
