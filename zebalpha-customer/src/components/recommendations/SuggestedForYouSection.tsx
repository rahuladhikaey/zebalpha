"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getOrCreateRecommendationSessionId,
  getRecommendationPlatform,
} from "@/lib/recommendationClient";
import type { RecommendedProductCard } from "@/lib/recommendationScoring";
import { RecommendationCarouselShell } from "./RecommendationCarouselShell";

interface SuggestedForYouSectionProps {
  initialItems?: RecommendedProductCard[];
}

export function SuggestedForYouSection({
  initialItems = [],
}: SuggestedForYouSectionProps) {
  const { user, session } = useAuth();
  const userId = user?.id;
  const accessToken = session?.access_token;
  const [items, setItems] = useState<RecommendedProductCard[]>(initialItems);
  const [loading, setLoading] = useState<boolean>(initialItems.length === 0);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  const fetchPersonalized = useCallback(
    async (targetPage = 1, append = false) => {
      try {
        if (append) setLoadingMore(true);
        const sessionId = getOrCreateRecommendationSessionId();
        const platform = getRecommendationPlatform();
        const params = new URLSearchParams({
          page: String(targetPage),
          limit: "15",
          platform,
        });
        if (sessionId) params.set("sessionId", sessionId);

        const headers: Record<string, string> = {};
        if (accessToken) {
          headers.Authorization = `Bearer ${accessToken}`;
        }

        const res = await fetch(`/api/recommendations/for-you?${params.toString()}`, {
          headers,
          cache: "no-store",
        });

        if (!res.ok) {
          setLoading(false);
          setLoadingMore(false);
          return;
        }

        const json = await res.json();
        const fetched: RecommendedProductCard[] = Array.isArray(json?.items)
          ? json.items
          : [];

        if (append) {
          setItems((prev) => {
            const seen = new Set(prev.map((p) => String(p.id)));
            const merged = [...prev];
            for (const candidate of fetched) {
              if (!seen.has(String(candidate.id))) {
                seen.add(String(candidate.id));
                merged.push(candidate);
              }
            }
            return merged;
          });
        } else {
          // Only overwrite initial SSR list when API confirms current eligible items (including explicit empty [])
          setItems(fetched);
        }

        setHasMore(Boolean(json?.hasMore));
        setPage(targetPage);
      } catch {
        // Non-blocking fallback: preserve SSR initialItems if any, never break homepage
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [accessToken]
  );

  useEffect(() => {
    // If SSR provided initialItems and user is unauthenticated, skip redundant initial API roundtrip
    if (initialItems.length > 0 && !userId) {
      return;
    }
    const timer = setTimeout(() => {
      void fetchPersonalized(1, false);
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchPersonalized, userId, initialItems.length]);

  // Refresh personalized feed when user searches, views, wishlists, or carts items
  useEffect(() => {
    const handler = () => {
      fetchPersonalized(1, false);
    };
    window.addEventListener("zebalpha:recommendations-updated", handler);
    return () => window.removeEventListener("zebalpha:recommendations-updated", handler);
  }, [fetchPersonalized]);

  const handleLoadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    fetchPersonalized(page + 1, true);
  }, [hasMore, loadingMore, page, fetchPersonalized]);

  // Hide cleanly if database currently has zero eligible products
  if (!loading && items.length === 0) {
    return null;
  }

  return (
    <RecommendationCarouselShell
      sectionId="suggested-for-you"
      title="✨ Suggested for You"
      subtitle="Based on your recent search & browsing"
      seeAllHref="/recommended"
      seeAllLabel="See All"
      surface="suggested_for_you"
      items={items}
      loading={loading}
      onReachEnd={handleLoadMore}
    />
  );
}
