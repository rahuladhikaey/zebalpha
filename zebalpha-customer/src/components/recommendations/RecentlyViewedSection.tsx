"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getOrCreateRecommendationSessionId,
  getRecommendationPlatform,
} from "@/lib/recommendationClient";
import type { RecommendedProductCard } from "@/lib/recommendationScoring";
import { RecommendationCarouselShell } from "./RecommendationCarouselShell";

interface RecentlyViewedSectionProps {
  excludeProductId?: string | null;
}

export function RecentlyViewedSection({
  excludeProductId = null,
}: RecentlyViewedSectionProps) {
  const { user, session } = useAuth();
  const userId = user?.id;
  const accessToken = session?.access_token;
  const [items, setItems] = useState<RecommendedProductCard[]>([]);

  const fetchRecentlyViewed = useCallback(async () => {
    try {
      const sessionId = getOrCreateRecommendationSessionId();
      const platform = getRecommendationPlatform();
      if (!sessionId && !userId) return;

      const params = new URLSearchParams({
        page: "1",
        limit: "12",
        platform,
      });
      if (sessionId) params.set("sessionId", sessionId);
      if (excludeProductId) params.set("exclude", String(excludeProductId));

      const headers: Record<string, string> = {};
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }

      const res = await fetch(
        `/api/recommendations/recently-viewed?${params.toString()}`,
        { headers, cache: "no-store" }
      );
      if (!res.ok) return;

      const json = await res.json();
      if (Array.isArray(json?.items)) {
        setItems(json.items);
      }
    } catch {
      // Fail gracefully
    }
  }, [userId, accessToken, excludeProductId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchRecentlyViewed();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchRecentlyViewed]);

  useEffect(() => {
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent)?.detail;
      if (
        !detail?.eventType ||
        detail.eventType === "product_viewed" ||
        detail.eventType === "session_merged"
      ) {
        fetchRecentlyViewed();
      }
    };
    window.addEventListener("zebalpha:recommendations-updated", handler);
    return () =>
      window.removeEventListener("zebalpha:recommendations-updated", handler);
  }, [fetchRecentlyViewed]);

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <RecommendationCarouselShell
      sectionId="recently-viewed"
      title="Recently Viewed"
      subtitle="Pick up where you left off across Web & App"
      surface="recently_viewed"
      items={items}
    />
  );
}
