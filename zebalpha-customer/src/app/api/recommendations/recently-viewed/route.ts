import { NextRequest, NextResponse } from "next/server";
import { getRecentlyViewedProducts } from "@/lib/recommendationEngine";
import { enforceRecommendationRateLimit, resolveVerifiedActor } from "@/lib/recommendationAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const actor = await resolveVerifiedActor(req);
    const rateLimited = await enforceRecommendationRateLimit("rec:recently-viewed", actor, 120, 60);
    if (rateLimited) return rateLimited;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "12", 10);
    const excludeProductId = searchParams.get("exclude");

    const result = await getRecentlyViewedProducts({
      userId: actor.userId,
      sessionId: actor.sessionId,
      page: Number.isFinite(page) ? page : 1,
      limit: Number.isFinite(limit) ? limit : 12,
      excludeProductId,
    });

    return NextResponse.json(
      {
        success: true,
        ...result,
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (err: unknown) {
    console.error("[GET /api/recommendations/recently-viewed Error]:", err);
    return NextResponse.json({ success: false, items: [], total: 0, page: 1, limit: 12, hasMore: false }, { status: 500 });
  }
}
