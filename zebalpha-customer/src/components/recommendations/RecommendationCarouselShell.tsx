"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { useIsNativeApp } from "@/lib/platform";
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
  return (
    <section
      aria-label={title}
      className="my-10 rounded-3xl bg-gradient-to-b from-[#070b09] via-[#050505] to-black border border-emerald-500/20 p-4 sm:p-6 shadow-[0_12px_40px_rgba(0,0,0,0.75)]"
    >
      <div className="flex items-center justify-between mb-5">
        <div className="space-y-2">
          <div className="h-6 w-48 rounded-lg bg-zinc-800/80 animate-pulse" />
          <div className="h-3.5 w-64 rounded-md bg-zinc-900 animate-pulse" />
        </div>
        <div className="h-8 w-24 rounded-full bg-zinc-900 animate-pulse" />
      </div>
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="w-[46%] sm:w-[31%] md:w-[23.5%] lg:w-[19.2%] shrink-0 rounded-2xl bg-zinc-950 border border-zinc-800/80 p-2.5 space-y-3"
          >
            <div className="aspect-[4/5] w-full rounded-xl bg-zinc-900 animate-pulse" />
            <div className="h-3 w-16 rounded bg-zinc-800 animate-pulse" />
            <div className="h-4 w-full rounded bg-zinc-800 animate-pulse" />
            <div className="h-4 w-24 rounded bg-zinc-800 animate-pulse" />
            <div className="h-9 w-full rounded-xl bg-zinc-900 animate-pulse" />
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
        isNativeApp
          ? "bg-gradient-to-b from-[#FFFDF8] to-[#FAF2DE] border-[#E3C167]/75 shadow-[0_8px_28px_rgba(166,124,28,0.10)]"
          : "bg-gradient-to-b from-[#070b09] via-[#050505] to-black border-emerald-500/25 shadow-[0_12px_45px_rgba(0,0,0,0.8),0_0_36px_rgba(16,185,129,0.09)]"
      }`}
    >
      {/* Subtle aura */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -top-24 left-10 h-44 w-72 rounded-full blur-3xl ${
          isNativeApp ? "bg-[#FDE047]/15" : "bg-emerald-500/10"
        }`}
      />

      {/* Section Heading Row */}
      <div className="relative z-10 flex items-center justify-between gap-3 mb-5">
        <div className="flex items-start gap-3 min-w-0">
          <span
            className={`mt-1 h-6 w-1.5 shrink-0 rounded-full ${
              isNativeApp
                ? "bg-gradient-to-b from-[#FCE38A] to-[#C68A12] shadow-sm"
                : "bg-gradient-to-b from-emerald-300 to-emerald-500 shadow-[0_0_12px_#10b981]"
            }`}
          />
          <div className="min-w-0">
            <h2 className={`text-lg sm:text-xl md:text-2xl font-black tracking-tight truncate ${isNativeApp ? "text-[#14120F]" : "text-white"}`}>
              {title}
            </h2>
            {subtitle && (
              <p className={`text-xs sm:text-[13px] font-medium mt-0.5 line-clamp-1 ${isNativeApp ? "text-[#5C4E35]" : "text-zinc-400"}`}>
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
                    ? "border-emerald-500/40 bg-zinc-900 text-white hover:bg-emerald-500 hover:text-black hover:border-emerald-400 cursor-pointer"
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
                    ? "border-emerald-500/40 bg-zinc-900 text-white hover:bg-emerald-500 hover:text-black hover:border-emerald-400 cursor-pointer"
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
                isNativeApp
                  ? "border-[#DFBE6F] bg-[#FFFDF8] text-[#8E6208] hover:bg-[#F7E8BD] shadow-sm"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500 hover:text-black hover:border-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.14)]"
              }`}
            >
              <span>{seeAllLabel}</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Horizontal Carousel Track (~5 cards desktop, smooth swipe Android) */}
      <div
        ref={trackRef}
        onScroll={updateScrollButtons}
        className="relative z-10 flex gap-3 sm:gap-4 overflow-x-auto pb-2 pt-1 scroll-smooth snap-x snap-mandatory touch-pan-x no-scrollbar"
      >
        {items.map((prod, idx) => (
          <div
            key={String(prod.id)}
            className="w-[46.5%] sm:w-[31%] md:w-[23.6%] lg:w-[19%] shrink-0 snap-start flex"
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
