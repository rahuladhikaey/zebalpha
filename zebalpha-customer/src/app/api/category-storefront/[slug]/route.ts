import { NextRequest, NextResponse } from "next/server";
import { loadCategoryStorefrontData } from "@/lib/categoryStorefrontLoader";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params;
    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") || 1);
    const pageSize = Number(searchParams.get("pageSize") || 24);

    const payload = await loadCategoryStorefrontData(slug, page, pageSize);
    if (!payload) {
      return NextResponse.json(
        { success: false, message: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: payload },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      }
    );
  } catch (error: any) {
    console.error("[Category Storefront API Error]:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to load category storefront" },
      { status: 500 }
    );
  }
}
