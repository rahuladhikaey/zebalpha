import { NextRequest, NextResponse } from "next/server";
import { recordCustomerEvent } from "@/lib/recommendationEngine";
import { enforceRecommendationRateLimit, resolveVerifiedActor } from "@/lib/recommendationAuth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const actor = await resolveVerifiedActor(req, body.sessionId, body.platform);
    const rateLimited = await enforceRecommendationRateLimit("rec:events", actor, 180, 60);
    if (rateLimited) return rateLimited;

    if (!actor.sessionId) {
      return NextResponse.json({ success: false, error: "Valid sessionId is required" }, { status: 400 });
    }

    const res = await recordCustomerEvent({
      userId: actor.userId,
      sessionId: actor.sessionId,
      eventType: body.eventType,
      productId: body.productId,
      categoryId: body.categoryId,
      platform: actor.platform,
      searchQuery: body.searchQuery,
      recommendationSurface: body.recommendationSurface,
      recommendationStrategy: body.recommendationStrategy,
      metadata: body.metadata,
    });

    if (!res.recorded && res.warning === "Unsupported eventType") {
      return NextResponse.json({ success: false, error: res.warning }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      recorded: res.recorded,
      ...(res.warning ? { warning: res.warning } : {}),
    });
  } catch (err: unknown) {
    console.error("[POST /api/recommendations/events Error]:", err);
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
