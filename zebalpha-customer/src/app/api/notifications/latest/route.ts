import { NextResponse } from "next/server";
import { getCachedLatestBroadcast } from "@/lib/cachedQueries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { latest, total } = await getCachedLatestBroadcast();

    return NextResponse.json(
      {
        success: true,
        latest,
        total,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=180",
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch latest notification" },
      { status: 500 }
    );
  }
}
