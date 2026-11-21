"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ArrowLeft, TrendingUp, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  getOrCreateRecommendationSessionId,
  getRecommendationPlatform,
  trackRecommendationImpressions,
} from "@/lib/recommendationClient";
import type { RecommendedProductCard } from "@/lib/recommendationScoring";
import { RecommendationProductCard } from "@/components/recommendations/RecommendationProductCard";
import { RecentlyViewedSection } from "@/components/recommendations/RecentlyViewedSection";

export default function RecommendedPage() {
  const { user, session } = useAuth();
  const accessToken = session?.access_token;
  const userId = user?.id;
  const [items, setItems] = useState<RecommendedProductCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [personalized, setPersonalized] = useState(false);

  const loadPage = useCallback(
    async (targetPage: number, append: boolean) => {
      try {
        if (append) setLoadingMore(true);
        else setLoading(true);

        const sessionId = getOrCreateRecommendationSessionId();
        const platform = getRecommendationPlatform();
        const params = new URLSearchParams({
          page: String(targetPage),
          limit: "20",
          platform,
        });
        if (sessionId) params.set("sessionId", sessionId);

        const headers: Record<string, string> = {};
        if (accessToken) {
          headers.Authorization = `Bearer ${accessToken}`;
        }

        const res = await fetch(
          `/api/recommendations/for-you?${params.toString()}`,
          { headers, cache: "no-store" }
        );
        if (!res.ok) return;

        const json = await res.json();
        const fetched: RecommendedProductCard[] = Array.isArray(json?.items)
          ? json.items
          : [];

        setPersonalized(Boolean(json?.personalized));
        setHasMore(Boolean(json?.hasMore));
        setPage(targetPage);

        if (append) {
          setItems((prev) => {
            const seen = new Set(prev.map((p) => String(p.id)));
            const merged = [...prev];
            for (const item of fetched) {
              if (!seen.has(String(item.id))) {
                seen.add(String(item.id));
                merged.push(item);
              }
            }
            return merged;
          });
        } else {
          setItems(fetched);
        }

        if (fetched.length > 0) {
          trackRecommendationImpressions(
            "recommended_page",
            fetched.slice(0, 20).map((it, idx) => ({
              productId: String(it.id),
              categoryId: it.category_id ? String(it.category_id) : null,
              strategy: it.recommendation_strategy,
              positionIndex: idx + (targetPage - 1) * 20,
            }))
          ).catch(() => {});
        }
      } catch {
        // Handled cleanly via empty state
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [accessToken]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadPage(1, false);
    }, 0);
    return () => clearTimeout(timer);
  }, [loadPage, userId]);

  return (
    <>
      <Header
        title="Suggested for You"
        subtitle="Personalized recommendations synced across Web & Android"
      />
      <main className="min-h-screen bg-black text-white pb-20">
        <div className="mx-auto max-w-[1400px] px-4 md:px-8 pt-6">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl bg-gradient-to-r from-[#070b09] via-zinc-950 to-black border border-emerald-500/25 p-5 sm:p-6 mb-8 shadow-[0_0_30px_rgba(16,185,129,0.08)]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to Home</span>
                </Link>
                <span className="text-zinc-700">•</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">
                  {personalized ? (
                    <>Personalised Feed</>
                  ) : (
                    <>
                      <TrendingUp className="h-3 w-3" /> Trending & Popular
                    </>
                  )}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                ✨ Suggested for You
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400">
                Based on your recent search & browsing
              </p>
            </div>

            <Link
              href="/products"
              className="w-fit rounded-full border border-zinc-700 bg-zinc-900 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-white hover:border-emerald-500/60 hover:text-emerald-300 transition-all"
            >
              Browse Full Catalog →
            </Link>
          </div>

          {/* Shimmer State */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl bg-zinc-950 border border-zinc-800/80 p-3 space-y-3"
                >
                  <div className="aspect-[4/5] rounded-xl bg-zinc-900 animate-pulse" />
                  <div className="h-4 w-full rounded bg-zinc-800 animate-pulse" />
                  <div className="h-4 w-24 rounded bg-zinc-800 animate-pulse" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-12 text-center space-y-4">
              <p className="text-base font-bold text-zinc-300">
                No active recommendations available right now.
              </p>
              <Link
                href="/products"
                className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-black hover:bg-emerald-400 transition-all"
              >
                Explore All Products
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-5">
                {items.map((product, idx) => (
                  <RecommendationProductCard
                    key={String(product.id)}
                    product={product}
                    surface="recommended_page"
                    positionIndex={idx}
                  />
                ))}
              </div>

              {hasMore && (
                <div className="mt-10 flex justify-center">
                  <button
                    type="button"
                    onClick={() => loadPage(page + 1, true)}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-500/50 bg-emerald-500/10 px-7 py-3 text-xs font-black uppercase tracking-widest text-emerald-300 hover:bg-emerald-500 hover:text-black transition-all disabled:opacity-60 cursor-pointer"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Loading...</span>
                      </>
                    ) : (
                      <span>Load More Recommendations</span>
                    )}
                  </button>
                </div>
              )}
            </>
          )}

          {/* Separate Recently Viewed Section */}
          <div className="mt-12">
            <RecentlyViewedSection />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
