"use client";

import { checkIsNativeApp } from "@/lib/platform";
import type {
  RecommendationEventType,
  RecommendationPlatform,
  RecommendationSurface,
} from "@/lib/recommendationScoring";

const VISITOR_STORAGE_KEY = "zebalpha_visitor_id";
const LEGACY_SESSION_KEY = "zebalpha_client_session_id";
const VISITOR_COOKIE_NAME = "zba_visitor_id";
const SESSION_REGEX = /^[a-zA-Z0-9_\-\.]{8,128}$/;

function generateVisitorId(): string {
  const rand =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().replace(/-/g, "")
      : `${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
  return `zba_v_${Date.now().toString(36)}_${rand}`.slice(0, 64);
}

function writeVisitorCookie(id: string) {
  if (typeof document === "undefined") return;
  try {
    const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
    document.cookie = `${VISITOR_COOKIE_NAME}=${encodeURIComponent(id)}; Path=/; Max-Age=2592000; SameSite=Lax${isHttps ? "; Secure" : ""}`;
  } catch {
    // Ignore cookie errors in restricted webviews
  }
}

/**
 * Returns a persistent cross-session visitor ID stored across localStorage,
 * sessionStorage, and first-party cookie so both Web tabs and Android WebView share continuity.
 */
export function getOrCreateRecommendationSessionId(): string {
  if (typeof window === "undefined") return "";

  try {
    const existingLocal = window.localStorage.getItem(VISITOR_STORAGE_KEY);
    if (existingLocal && SESSION_REGEX.test(existingLocal)) {
      window.sessionStorage.setItem(LEGACY_SESSION_KEY, existingLocal);
      writeVisitorCookie(existingLocal);
      return existingLocal;
    }

    const existingSession = window.sessionStorage.getItem(LEGACY_SESSION_KEY);
    if (existingSession && SESSION_REGEX.test(existingSession)) {
      window.localStorage.setItem(VISITOR_STORAGE_KEY, existingSession);
      writeVisitorCookie(existingSession);
      return existingSession;
    }

    const created = generateVisitorId();
    window.localStorage.setItem(VISITOR_STORAGE_KEY, created);
    window.sessionStorage.setItem(LEGACY_SESSION_KEY, created);
    writeVisitorCookie(created);
    return created;
  } catch {
    return generateVisitorId();
  }
}

export function getRecommendationPlatform(): RecommendationPlatform {
  return checkIsNativeApp() ? "android" : "website";
}

function notifyRecommendationListeners(eventType: string) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(
      new CustomEvent("zebalpha:recommendations-updated", { detail: { eventType } })
    );
  } catch {
    // Ignore DOM event errors
  }
}

export interface TrackEventInput {
  eventType: RecommendationEventType;
  productId?: string | number | null;
  categoryId?: string | number | null;
  searchQuery?: string | null;
  recommendationSurface?: RecommendationSurface | null;
  recommendationStrategy?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Non-blocking behavioral event reporter shared by Website and Capacitor Android App.
 */
export async function trackRecommendationEvent(input: TrackEventInput): Promise<void> {
  if (typeof window === "undefined") return;
  const sessionId = getOrCreateRecommendationSessionId();
  if (!sessionId) return;

  try {
    await fetch("/api/recommendations/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        sessionId,
        platform: getRecommendationPlatform(),
        eventType: input.eventType,
        productId: input.productId != null ? String(input.productId) : null,
        categoryId: input.categoryId != null ? String(input.categoryId) : null,
        searchQuery: input.searchQuery || null,
        recommendationSurface: input.recommendationSurface || null,
        recommendationStrategy: input.recommendationStrategy || null,
        metadata: input.metadata || {},
      }),
    });
    notifyRecommendationListeners(input.eventType);
  } catch {
    // Telemetry failures never affect storefront UX
  }
}

/**
 * Non-blocking impression batch tracker.
 */
export async function trackRecommendationImpressions(
  surface: RecommendationSurface,
  items: Array<{ productId: string; categoryId?: string | null; strategy?: string; positionIndex?: number }>
): Promise<void> {
  if (typeof window === "undefined" || !items || items.length === 0) return;
  const sessionId = getOrCreateRecommendationSessionId();
  if (!sessionId) return;

  try {
    await fetch("/api/recommendations/impressions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        sessionId,
        platform: getRecommendationPlatform(),
        surface,
        items,
      }),
    });
  } catch {
    // Telemetry failures never affect storefront UX
  }
}

/**
 * Records a recommendation card click before navigation.
 */
export async function trackRecommendationClick(params: {
  productId: string | number;
  categoryId?: string | number | null;
  surface: RecommendationSurface;
  strategy?: string | null;
  positionIndex?: number;
}): Promise<void> {
  if (typeof window === "undefined") return;
  const sessionId = getOrCreateRecommendationSessionId();
  if (!sessionId) return;

  try {
    await fetch("/api/recommendations/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        sessionId,
        platform: getRecommendationPlatform(),
        productId: String(params.productId),
        categoryId: params.categoryId != null ? String(params.categoryId) : null,
        surface: params.surface,
        strategy: params.strategy || "hybrid",
        positionIndex: params.positionIndex ?? 0,
      }),
    });
  } catch {
    // Ignore telemetry errors
  }
}

/**
 * Merges the current visitor session activity into the newly logged-in customer account.
 */
export async function mergeAnonymousRecommendationSession(accessToken?: string | null): Promise<void> {
  if (typeof window === "undefined") return;
  const sessionId = getOrCreateRecommendationSessionId();
  if (!sessionId) return;

  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    await fetch("/api/recommendations/merge-session", {
      method: "POST",
      headers,
      body: JSON.stringify({
        sessionId,
        platform: getRecommendationPlatform(),
      }),
    });
    notifyRecommendationListeners("session_merged");
  } catch {
    // Non-blocking login sync
  }
}
