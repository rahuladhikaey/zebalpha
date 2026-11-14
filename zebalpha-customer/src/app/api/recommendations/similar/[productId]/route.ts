import { NextRequest, NextResponse } from "next/server";
import { getSimilarRecommendations } from "@/lib/recommendationEngine";
import { enforceRecommendationRateLimit, resolveVerifiedActor } from "@/lib/recommendationAuth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ productId: string }> }
) {
  try {
    const actor = await resolveVerifiedActor(req);
    const rateLimited = await enforceRecommendationRateLimit("rec:similar", actor, 120, 60);
    if (rateLimited) return rateLimited;

    const { productId } = await context.params;
    const { searchParams } = new URL(req.url);
    const limitParam = parseInt(searchParams.get("limit") || "12", 10);
    const limit = Math.min(Math.max(1, Number.isFinite(limitParam) ? limitParam : 12), 30);

    const items = await getSimilarRecommendations(productId, limit);

    return NextResponse.json(
      {
        success: true,
        items,
        count: items.length,
        strategy: "product_similarity",
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
        },
      }
    );
  } catch (err: unknown) {
    console.error("[GET /api/recommendations/similar Error]:", err);
    return NextResponse.json({ success: false, items: [], count: 0 }, { status: 500 });
  }
}
