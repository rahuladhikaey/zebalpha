import { NextRequest, NextResponse } from "next/server";
import { getForYouRecommendations } from "@/lib/recommendationEngine";
import { enforceRecommendationRateLimit, resolveVerifiedActor } from "@/lib/recommendationAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const actor = await resolveVerifiedActor(req);
    const rateLimited = await enforceRecommendationRateLimit("rec:for-you", actor, 120, 60);
    if (rateLimited) return rateLimited;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "12", 10);
    const excludeRaw = searchParams.get("exclude") || "";
    const excludeProductIds = excludeRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const result = await getForYouRecommendations({
      userId: actor.userId,
      sessionId: actor.sessionId,
      page: Number.isFinite(page) ? page : 1,
      limit: Number.isFinite(limit) ? limit : 12,
      excludeProductIds,
    });

    return NextResponse.json(
      {
        success: true,
        ...result,
      },
      {
        headers: {
          "Cache-Control": actor.userId || actor.sessionId
            ? "private, max-age=15, stale-while-revalidate=30"
            : "public, s-maxage=60, stale-while-revalidate=120",
        },
      }
    );
  } catch (err: unknown) {
    console.error("[GET /api/recommendations/for-you Error]:", err);
    return NextResponse.json(
      {
        success: false,
        items: [],
        total: 0,
        page: 1,
        limit: 12,
        hasMore: false,
        strategy: "trending_fallback",
        personalized: false,
      },
      { status: 500 }
    );
  }
}
