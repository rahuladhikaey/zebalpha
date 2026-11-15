"use client";

import React from "react";
import { useIsNativeApp } from "@/lib/platform";

export interface ProductCardSkeletonProps {
  count?: number;
}

export function ProductCardSkeleton({ count = 1 }: ProductCardSkeletonProps) {
  const isNativeApp = useIsNativeApp();

  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <article
          key={idx}
          className={`group relative flex flex-col overflow-hidden rounded-2xl md:rounded-3xl border animate-pulse select-none ${
            isNativeApp
              ? "bg-[#FFFDF8] border-[#E4C988] shadow-[0_8px_20px_rgba(166,124,28,0.08)]"
              : "bg-neutral-900/90 border-neutral-800/80 shadow-xl"
          }`}
        >
          {/* Image Aspect Box (3:4 ratio matching ProductCardImageSlider) */}
          <div
            className={`relative aspect-[3/4] w-full overflow-hidden ${
              isNativeApp ? "bg-[#FAF0D1]" : "bg-neutral-800/60"
            }`}
          >
            <div
              className={`absolute inset-0 bg-gradient-to-r from-transparent to-transparent -translate-x-full animate-[shimmer_1.8s_infinite] ${
                isNativeApp ? "via-white/50" : "via-white/5"
              }`}
            />
            {/* Top Badge Mock */}
            <div
              className={`absolute top-2.5 left-2.5 h-4 w-12 rounded-full ${
                isNativeApp ? "bg-[#EED9A4]" : "bg-neutral-700/60"
              }`}
            />
            {/* Top Right Action Button Mock */}
            <div
              className={`absolute top-2.5 right-2.5 h-7 w-7 rounded-full ${
                isNativeApp ? "bg-[#EED9A4]" : "bg-neutral-700/60"
              }`}
            />
          </div>

          {/* Content Area */}
          <div className="p-3 sm:p-4 space-y-2.5 flex-1 flex flex-col justify-between">
            <div className="space-y-1.5">
              {/* Brand Mock */}
              <div className={`h-2.5 w-16 rounded ${isNativeApp ? "bg-[#EAD49C]" : "bg-neutral-800"}`} />
              {/* Title Mock (2 lines) */}
              <div className={`h-3.5 w-4/5 rounded ${isNativeApp ? "bg-[#F3E2B3]" : "bg-neutral-800"}`} />
              <div className={`h-3.5 w-2/3 rounded ${isNativeApp ? "bg-[#F7EBCB]" : "bg-neutral-800/70"}`} />
            </div>

            {/* Price & Rating Row */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-baseline gap-1.5">
                <div className={`h-4 w-16 rounded ${isNativeApp ? "bg-[#EAD49C]" : "bg-neutral-800"}`} />
                <div className={`h-3 w-10 rounded ${isNativeApp ? "bg-[#F7EBCB]" : "bg-neutral-800/50"}`} />
              </div>
              <div className={`h-3.5 w-10 rounded-full ${isNativeApp ? "bg-[#F3E2B3]" : "bg-neutral-800/60"}`} />
            </div>
          </div>
        </article>
      ))}
    </>
  );
}

