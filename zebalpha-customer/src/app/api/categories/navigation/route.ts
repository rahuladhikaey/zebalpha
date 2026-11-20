import { NextResponse } from "next/server";
import { getCachedNavigationCategories } from "@/lib/cachedQueries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const categories = await getCachedNavigationCategories();

    return NextResponse.json(
      {
        success: true,
        data: categories,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
        },
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[API /api/categories/navigation Exception]:", err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
