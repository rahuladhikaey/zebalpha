import { NextRequest, NextResponse } from "next/server";
import { recordRecommendationClick } from "@/lib/recommendationEngine";
import { enforceRecommendationRateLimit, resolveVerifiedActor } from "@/lib/recommendationAuth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const actor = await resolveVerifiedActor(req, body.sessionId, body.platform);
    const rateLimited = await enforceRecommendationRateLimit("rec:click", actor, 180, 60);
    if (rateLimited) return rateLimited;

    if (!actor.sessionId || !body.productId) {
      return NextResponse.json({ success: false, error: "sessionId and productId are required" }, { status: 400 });
    }

    const res = await recordRecommendationClick({
      userId: actor.userId,
      sessionId: actor.sessionId,
      productId: String(body.productId),
      categoryId: body.categoryId ? String(body.categoryId) : null,
      surface: String(body.surface || "suggested_for_you"),
      strategy: body.strategy ? String(body.strategy) : null,
      positionIndex: typeof body.positionIndex === "number" ? body.positionIndex : 0,
      platform: actor.platform,
    });

    if (!res.recorded && res.warning === "Invalid sessionId or productId") {
      return NextResponse.json({ success: false, error: res.warning }, { status: 400 });
    }

    return NextResponse.json({ success: true, ...res });
  } catch (err: unknown) {
    console.error("[POST /api/recommendations/click Error]:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Click logging error" },
      { status: 500 }
    );
  }
}
