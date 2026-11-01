import { NextResponse } from "next/server";
import { supabaseServer } from "@shared/utils/supabaseServer";
import { requireSuperAdmin, authErrorResponse } from "@/lib/authGuard";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await requireSuperAdmin(req);
  } catch (authErr: any) {
    if (authErr.name === "AuthError") return authErrorResponse(authErr);
    return NextResponse.json({ success: false, message: authErr.message || "Unauthorized" }, { status: 401 });
  }

  try {
    const { filePath, bucket } = await req.json();

    if (!filePath || typeof filePath !== "string") {
      return NextResponse.json(
        { success: false, message: "Valid filePath is required." },
        { status: 400 }
      );
    }

    // Safety constraint: only allow deleting files within homepage dedicated directories
    if (
      !filePath.startsWith("homepage/curated-collections/") &&
      !filePath.startsWith("homepage/woven/") &&
      !filePath.startsWith("homepage/banner/")
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Forbidden: Deletion restricted to homepage media folders only.",
        },
        { status: 403 }
      );
    }

    const candidateBuckets = bucket ? [bucket] : ["editorial", "editorial-images", "product-images"];
    for (const b of candidateBuckets) {
      try {
        await supabaseServer.storage.from(b).remove([filePath]);
      } catch (_) {}
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
