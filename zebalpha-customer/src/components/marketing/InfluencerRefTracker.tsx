"use client";

import { useEffect } from "react";

const STORAGE_KEY = "zebalpha_marketing_attr_v1";
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7-day attribution window

export interface MarketingAttribution {
  influencerRef?: string | null;
  brandingCampaignId?: string | null;
  capturedAt: number;
}

export function getActiveMarketingAttribution(): {
  influencerRef: string | null;
  brandingCampaignId: string | null;
} {
  if (typeof window === "undefined") {
    return { influencerRef: null, brandingCampaignId: null };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { influencerRef: null, brandingCampaignId: null };
    const parsed = JSON.parse(raw) as MarketingAttribution;
    if (!parsed.capturedAt || Date.now() - parsed.capturedAt > TTL_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return { influencerRef: null, brandingCampaignId: null };
    }
    return {
      influencerRef: parsed.influencerRef || null,
      brandingCampaignId: parsed.brandingCampaignId || null,
    };
  } catch {
    return { influencerRef: null, brandingCampaignId: null };
  }
}

export function recordBrandingClickLocal(campaignId: string) {
  if (typeof window === "undefined" || !campaignId) return;
  try {
    const prev = getActiveMarketingAttribution();
    const next: MarketingAttribution = {
      influencerRef: prev.influencerRef,
      brandingCampaignId: campaignId,
      capturedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Non-fatal
  }
}

export function InfluencerRefTracker() {
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = (params.get("ref") || params.get("inf") || "").trim();
      const brandCamp = (params.get("brand_campaign") || "").trim();

      if (!ref && !brandCamp) return;

      const prev = getActiveMarketingAttribution();
      const updated: MarketingAttribution = {
        influencerRef: ref || prev.influencerRef,
        brandingCampaignId: brandCamp || prev.brandingCampaignId,
        capturedAt: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

      const sessionKey = `zeb_mkt_tracked_${ref || brandCamp}`;
      if (sessionStorage.getItem(sessionKey)) return;
      sessionStorage.setItem(sessionKey, "1");

      if (ref) {
        fetch("/api/marketing/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventType: "influencer_click",
            refCode: ref,
            sessionId: sessionKey,
          }),
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // Non-fatal
    }
  }, []);

  return null;
}
