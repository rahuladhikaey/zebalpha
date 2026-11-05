"use client";

import React from "react";

export interface ProductCardSkeletonProps {
  count?: number;
}

export function ProductCardSkeleton({ count = 1 }: ProductCardSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <article
          key={idx}
          className="group relative flex flex-col overflow-hidden rounded-2xl md:rounded-3xl bg-neutral-900/90 border border-neutral-800/80 shadow-xl animate-pulse select-none"
        >
          {/* Image Aspect Box (3:4 ratio matching ProductCardImageSlider) */}
          <div className="relative aspect-[3/4] w-full bg-neutral-800/60 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.8s_infinite]" />
            {/* Top Badge Mock */}
            <div className="absolute top-2.5 left-2.5 h-4 w-12 rounded-full bg-neutral-700/60" />
            {/* Top Right Action Button Mock */}
            <div className="absolute top-2.5 right-2.5 h-7 w-7 rounded-full bg-neutral-700/60" />
          </div>

          {/* Content Area */}
          <div className="p-3 sm:p-4 space-y-2.5 flex-1 flex flex-col justify-between">
            <div className="space-y-1.5">
              {/* Brand Mock */}
              <div className="h-2.5 w-16 bg-neutral-800 rounded" />
              {/* Title Mock (2 lines) */}
              <div className="h-3.5 w-4/5 bg-neutral-800 rounded" />
              <div className="h-3.5 w-2/3 bg-neutral-800/70 rounded" />
            </div>

            {/* Price & Rating Row */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-baseline gap-1.5">
                <div className="h-4 w-16 bg-neutral-800 rounded" />
                <div className="h-3 w-10 bg-neutral-800/50 rounded" />
              </div>
              <div className="h-3.5 w-10 bg-neutral-800/60 rounded-full" />
            </div>
          </div>
        </article>
      ))}
    </>
  );
}
