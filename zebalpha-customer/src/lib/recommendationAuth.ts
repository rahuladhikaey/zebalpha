import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { createSupabaseServerClient } from "@shared/utils/supabaseServer";
import { checkRateLimit, extractClientIp } from "@/lib/rateLimit";
import { normalizePlatform, sanitizeSessionId } from "@/lib/recommendationEngine";

export interface ResolvedActorContext {
  userId: string | null;
  sessionId: string | null;
  platform: "android" | "website";
  clientIp: string;
}

/**
 * Verifies user identity from Authorization Bearer JWT or Supabase SSR cookies.
 * Never accepts unverified client-supplied userId overrides for privilege/history isolation.
 */
export async function resolveVerifiedActor(
  req: NextRequest,
  bodySessionId?: string | null,
  bodyPlatform?: string | null
): Promise<ResolvedActorContext> {
  const clientIp = extractClientIp(req.headers);
  let verifiedUserId: string | null = null;

  // 1. Check Bearer JWT if supplied (mobile/API clients)
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    if (token && token.split(".").length === 3) {
      try {
        const { data } = await supabaseServer.auth.getUser(token);
        if (data?.user?.id) verifiedUserId = data.user.id;
      } catch {
        // Ignore invalid token and fall back to session cookie check
      }
    }
  }

  // 2. Check Supabase SSR cookies (website & Capacitor WebView)
  if (!verifiedUserId) {
    try {
      const supabaseCookieClient = await createSupabaseServerClient();
      const { data } = await supabaseCookieClient.auth.getUser();
      if (data?.user?.id) verifiedUserId = data.user.id;
    } catch {
      // Cookie client may not exist during static/test invocation
    }
  }

  const url = new URL(req.url);
  const rawSession =
    bodySessionId ||
    url.searchParams.get("sessionId") ||
    req.headers.get("x-zebalpha-session-id") ||
    req.cookies.get("zba_visitor_id")?.value ||
    null;

  const sessionId = sanitizeSessionId(rawSession);
  const rawPlatform =
    bodyPlatform ||
    url.searchParams.get("platform") ||
    req.headers.get("x-zebalpha-platform") ||
    (req.headers.get("user-agent")?.includes("ZEBALPHA_ANDROID_APP") ? "android" : "website");

  return {
    userId: verifiedUserId,
    sessionId,
    platform: normalizePlatform(rawPlatform),
    clientIp,
  };
}

/**
 * Shared rate-limit check wrapper returning a 429 NextResponse when exceeded.
 */
export async function enforceRecommendationRateLimit(
  bucketPrefix: string,
  actor: ResolvedActorContext,
  maxRequests = 120,
  windowSeconds = 60
): Promise<NextResponse | null> {
  const key = `${bucketPrefix}:${actor.userId || actor.sessionId || actor.clientIp}`;
  const rl = await checkRateLimit(key, maxRequests, windowSeconds);
  if (rl.allowed) return null;

  return NextResponse.json(
    { success: false, error: "Rate limit exceeded. Please slow down." },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit": String(rl.limit),
        "X-RateLimit-Remaining": "0",
        "Retry-After": String(Math.max(1, Math.ceil((rl.resetAt - Date.now()) / 1000))),
      },
    }
  );
}
