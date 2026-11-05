"use client";

import React from "react";

export function HeaderSkeleton() {
  return (
    <header className="sticky top-0 z-50 w-full bg-black/95 backdrop-blur-md border-b border-zinc-900 px-4 py-3 animate-pulse select-none">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between">
        {/* Left: Logo & Menu Mock */}
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-neutral-800" />
          <div className="h-5 w-28 bg-neutral-800 rounded" />
        </div>

        {/* Center: Search Bar Mock */}
        <div className="hidden md:block w-72 lg:w-96">
          <div className="h-10 w-full rounded-full bg-neutral-900 border border-neutral-800" />
        </div>

        {/* Right: Notification & Cart Icons Mock */}
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-full bg-neutral-850" />
          <div className="h-9 w-9 rounded-full bg-neutral-850" />
        </div>
      </div>
    </header>
  );
}

export function BannerSkeleton() {
  return (
    <div className="relative mt-2 md:mt-4 w-full overflow-hidden rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] bg-neutral-950 border border-neutral-800/80 aspect-[2.4] animate-pulse select-none">
      <div className="absolute inset-0 bg-neutral-900/60" />
      {/* Badge Mock */}
      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 h-6 w-32 rounded-full bg-neutral-800" />
      {/* Progress Dots Mock */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
        <div className="h-1.5 w-6 rounded-full bg-neutral-700" />
        <div className="h-1.5 w-6 rounded-full bg-neutral-800" />
        <div className="h-1.5 w-6 rounded-full bg-neutral-800" />
      </div>
    </div>
  );
}

export function CategorySkeleton() {
  return (
    <div className="w-full overflow-x-auto py-2.5 no-scrollbar animate-pulse select-none">
      <div className="flex items-center gap-2.5 px-3.5 w-max">
        {Array.from({ length: 7 }).map((_, idx) => (
          <div
            key={idx}
            className="flex flex-col items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900/80 border border-neutral-800/60 shrink-0"
          >
            <div className="w-10 h-10 rounded-full bg-neutral-800" />
            <div className="w-12 h-2.5 rounded bg-neutral-800/70" />
          </div>
        ))}
      </div>
    </div>
  );
}
