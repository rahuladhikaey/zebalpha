import { NextResponse } from "next/server";
import { getCachedHeroBanners } from "@/lib/cachedQueries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const banners = await getCachedHeroBanners();
    return NextResponse.json(
      {
        success: true,
        data: banners,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, data: [], error: err?.message || "Failed to fetch banners" },
      { status: 500 }
    );
  }
}
