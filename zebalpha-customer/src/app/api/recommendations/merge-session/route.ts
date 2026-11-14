import { NextRequest, NextResponse } from "next/server";
import { mergeAnonymousSessionToUser } from "@/lib/recommendationEngine";
import { enforceRecommendationRateLimit, resolveVerifiedActor } from "@/lib/recommendationAuth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const actor = await resolveVerifiedActor(req, body?.sessionId, body?.platform);
    const rateLimited = await enforceRecommendationRateLimit("rec:merge", actor, 30, 60);
    if (rateLimited) return rateLimited;

    if (!actor.userId) {
      return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
    }
    if (!actor.sessionId) {
      return NextResponse.json({ success: false, error: "Valid sessionId is required" }, { status: 400 });
    }

    const result = await mergeAnonymousSessionToUser({
      sessionId: actor.sessionId,
      userId: actor.userId,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: unknown) {
    console.error("[POST /api/recommendations/merge-session Error]:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Merge failed" },
      { status: 500 }
    );
  }
}
