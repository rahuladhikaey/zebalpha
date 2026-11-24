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
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
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
