import { NextRequest, NextResponse } from "next/server";
import { recordRecommendationImpressions } from "@/lib/recommendationEngine";
import { enforceRecommendationRateLimit, resolveVerifiedActor } from "@/lib/recommendationAuth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || !Array.isArray(body.items)) {
      return NextResponse.json({ success: false, error: "Invalid impressions payload" }, { status: 400 });
    }

    const actor = await resolveVerifiedActor(req, body.sessionId, body.platform);
    const rateLimited = await enforceRecommendationRateLimit("rec:impressions", actor, 120, 60);
    if (rateLimited) return rateLimited;

    if (!actor.sessionId) {
      return NextResponse.json({ success: false, error: "Valid sessionId is required" }, { status: 400 });
    }

    const res = await recordRecommendationImpressions({
      userId: actor.userId,
      sessionId: actor.sessionId,
      platform: actor.platform,
      surface: String(body.surface || "suggested_for_you"),
      items: body.items,
    });

    return NextResponse.json({ success: true, ...res });
  } catch (err: unknown) {
    console.error("[POST /api/recommendations/impressions Error]:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Impression error" },
      { status: 500 }
    );
  }
}
