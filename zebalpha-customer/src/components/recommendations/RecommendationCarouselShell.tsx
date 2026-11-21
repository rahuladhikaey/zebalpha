"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { useIsNativeApp, useOfficialTheme } from "@/lib/platform";
import { trackRecommendationImpressions } from "@/lib/recommendationClient";
import type {
  RecommendationSurface,
  RecommendedProductCard,
} from "@/lib/recommendationScoring";
import { RecommendationProductCard } from "./RecommendationProductCard";

interface RecommendationCarouselShellProps {
  title: string;
  subtitle?: string;
  seeAllHref?: string;
  seeAllLabel?: string;
  surface: RecommendationSurface;
  items: RecommendedProductCard[];
  loading?: boolean;
  onReachEnd?: () => void;
  sectionId?: string;
}

export function RecommendationCarouselSkeleton({ title = "Suggested for You" }: { title?: string }) {
  const isOfficialTheme = useOfficialTheme();

  return (
    <section
      aria-label={title}
      className={`my-8 sm:my-10 rounded-3xl border p-4 sm:p-6 ${
        isOfficialTheme
          ? "bg-gradient-to-b from-[#FFFDFC] via-[#FFF8FA] to-[#FFF0F4] border-[#FCE7F0] shadow-[0_8px_24px_rgba(244,114,182,0.06)]"
          : "bg-gradient-to-b from-[#070b09] via-[#050505] to-black border-pink-500/20 shadow-[0_12px_40px_rgba(0,0,0,0.75)]"
      }`}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="space-y-2">
          <div className="h-6 w-48 rounded-lg animate-pulse bg-pink-200/50" />
          <div className="h-3.5 w-64 rounded-md animate-pulse bg-pink-100/60" />
        </div>
        <div className="h-8 w-24 rounded-full animate-pulse bg-pink-100/60" />
      </div>
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="w-[47%] sm:w-[31%] md:w-[23.5%] lg:w-[19.2%] shrink-0 rounded-[22px] border border-[#FCE7F0] bg-[#FFF5F8] p-3 space-y-3"
          >
            <div className="aspect-[3/4] w-full rounded-2xl bg-pink-100/60 animate-pulse" />
            <div className="h-3 w-16 rounded bg-pink-100/80 animate-pulse" />
            <div className="h-4 w-full rounded bg-pink-100/80 animate-pulse" />
            <div className="h-4 w-24 rounded bg-pink-100/80 animate-pulse" />
            <div className="h-3.5 w-32 rounded bg-pink-100/60 animate-pulse" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function RecommendationCarouselShell({
  title,
  subtitle,
  seeAllHref,
  seeAllLabel = "See All",
  surface,
  items,
  loading = false,
  onReachEnd,
  sectionId,
}: RecommendationCarouselShellProps) {
  const isNativeApp = useIsNativeApp();
  const isOfficialTheme = useOfficialTheme();
  const trackRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const reportedIdsRef = useRef<Set<string>>(new Set());
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const updateScrollButtons = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    const remaining = el.scrollWidth - el.clientWidth - el.scrollLeft;
    setCanScrollRight(remaining > 8);
    if (remaining < 160 && onReachEnd) {
      onReachEnd();
    }
  }, [onReachEnd]);

  useEffect(() => {
    updateScrollButtons();
    window.addEventListener("resize", updateScrollButtons);
    return () => window.removeEventListener("resize", updateScrollButtons);
  }, [items.length, updateScrollButtons]);

  // Batch viewport impression logging once cards enter viewport
  useEffect(() => {
    if (!items || items.length === 0 || typeof IntersectionObserver === "undefined") return;
    const target = sectionRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        const unseen = items
          .slice(0, 12)
          .map((item, idx) => ({
            productId: String(item.id),
            categoryId: item.category_id ? String(item.category_id) : null,
            strategy: item.recommendation_strategy || "hybrid",
            positionIndex: idx,
          }))
          .filter((row) => !reportedIdsRef.current.has(row.productId));

        if (unseen.length > 0) {
          unseen.forEach((row) => reportedIdsRef.current.add(row.productId));
          trackRecommendationImpressions(surface, unseen).catch(() => {});
        }
      },
      { threshold: 0.25 }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [items, surface]);

  const scrollTrack = (direction: "left" | "right") => {
    const el = trackRef.current;
    if (!el) return;
    const step = Math.max(280, Math.round(el.clientWidth * 0.8));
    el.scrollBy({
      left: direction === "left" ? -step : step,
      behavior: "smooth",
    });
  };

  if (loading && items.length === 0) {
    return <RecommendationCarouselSkeleton title={title} />;
  }

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <section
      ref={sectionRef}
      id={sectionId}
      aria-label={title}
      className={`relative my-8 sm:my-10 rounded-3xl p-4 sm:p-6 overflow-hidden border ${
        isOfficialTheme
          ? "bg-gradient-to-b from-[#FFFDFC] via-[#FFF8FA] to-[#FFF0F4] border-[#FCE7F0] shadow-[0_8px_24px_rgba(244,114,182,0.06)]"
          : "bg-gradient-to-b from-[#0e070a] via-[#050505] to-black border-pink-500/20 shadow-[0_12px_45px_rgba(0,0,0,0.8),0_0_36px_rgba(255,30,111,0.08)]"
      }`}
    >
      {/* Subtle aura */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -top-24 left-10 h-44 w-72 rounded-full blur-3xl ${
          isOfficialTheme ? "bg-pink-300/15" : "bg-[#FF1E6F]/10"
        }`}
      />

      {/* Section Heading Row */}
      <div className="relative z-10 flex items-center justify-between gap-3 mb-5">
        <div className="flex items-start gap-3 min-w-0">
          <span
            className="mt-1 h-6 w-1.5 shrink-0 rounded-full bg-gradient-to-b from-[#FF1E6F] to-[#E11D48] shadow-sm"
          />
          <div className="min-w-0">
            <h2 className={`text-lg sm:text-xl md:text-2xl font-black tracking-tight truncate ${isOfficialTheme ? "text-[#14120F]" : "text-white"}`}>
              {title}
            </h2>
            {subtitle && (
              <p className={`text-xs sm:text-[13px] font-medium mt-0.5 line-clamp-1 ${isOfficialTheme ? "text-[#6E555C]" : "text-zinc-400"}`}>
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Desktop Prev / Next Controls */}
          {!isNativeApp && items.length > 2 && (
            <div className="hidden md:flex items-center gap-1.5 mr-1">
              <button
                type="button"
                onClick={() => scrollTrack("left")}
                disabled={!canScrollLeft}
                aria-label={`Previous ${title}`}
                className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all ${
                  canScrollLeft
                    ? isOfficialTheme
                      ? "border-pink-200 bg-[#FFFDFC] text-[#14120F] hover:bg-[#FF1E6F] hover:text-white hover:border-[#FF1E6F] shadow-sm cursor-pointer"
                      : "border-pink-500/40 bg-zinc-900 text-white hover:bg-[#FF1E6F] hover:text-white hover:border-[#FF1E6F] cursor-pointer"
                    : isOfficialTheme
                      ? "border-pink-100 bg-pink-50/50 text-pink-300 cursor-not-allowed"
                      : "border-zinc-800 bg-zinc-950 text-zinc-600 cursor-not-allowed"
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollTrack("right")}
                disabled={!canScrollRight}
                aria-label={`Next ${title}`}
                className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all ${
                  canScrollRight
                    ? isOfficialTheme
                      ? "border-pink-200 bg-[#FFFDFC] text-[#14120F] hover:bg-[#FF1E6F] hover:text-white hover:border-[#FF1E6F] shadow-sm cursor-pointer"
                      : "border-pink-500/40 bg-zinc-900 text-white hover:bg-[#FF1E6F] hover:text-white hover:border-[#FF1E6F] cursor-pointer"
                    : isOfficialTheme
                      ? "border-pink-100 bg-pink-50/50 text-pink-300 cursor-not-allowed"
                      : "border-zinc-800 bg-zinc-950 text-zinc-600 cursor-not-allowed"
                }`}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {seeAllHref && (
            <Link
              href={seeAllHref}
              className={`group inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-extrabold transition-all ${
                isOfficialTheme
                  ? "border-pink-200 bg-pink-50/80 text-[#FF1E6F] hover:bg-[#FF1E6F] hover:text-white shadow-sm"
                  : "border-pink-500/40 bg-pink-500/10 text-pink-300 hover:bg-[#FF1E6F] hover:text-white hover:border-[#FF1E6F] shadow-[0_0_16px_rgba(255,30,111,0.18)]"
              }`}
            >
              <span>{seeAllLabel}</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Horizontal Carousel Track (~5 cards desktop, smooth swipe Android with 2 columns visible on mobile) */}
      <div
        ref={trackRef}
        onScroll={updateScrollButtons}
        className="relative z-10 flex gap-3 sm:gap-4 overflow-x-auto pb-4 pt-1 scroll-smooth snap-x snap-mandatory touch-pan-x no-scrollbar"
      >
        {items.map((prod, idx) => (
          <div
            key={String(prod.id)}
            className="w-[47%] sm:w-[31%] md:w-[23.6%] lg:w-[19%] shrink-0 snap-start flex"
          >
            <RecommendationProductCard
              product={prod}
              surface={surface}
              positionIndex={idx}
              className="w-full"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
