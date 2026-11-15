"use client";

import React from "react";
import { useIsNativeApp } from "@/lib/platform";

export function CollectionSkeleton() {
  const isNativeApp = useIsNativeApp();

  return (
    <div className="mt-10 sm:mt-14 space-y-4 animate-pulse select-none">
      <div className="flex items-center justify-between gap-4 mb-4 sm:mb-5">
        <div
          className={`h-7 w-56 rounded-xl border ${
            isNativeApp
              ? "bg-[#FAF0D1] border-[#E4C988]"
              : "bg-neutral-900 border-neutral-800"
          }`}
        />
      </div>
      <div className="w-full overflow-x-auto pb-2 pt-1 no-scrollbar">
        <div className="flex lg:grid lg:grid-cols-6 gap-3 sm:gap-4 w-max lg:w-full">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`rounded-2xl sm:rounded-3xl border p-2.5 sm:p-3 flex flex-col items-center w-[126px] sm:w-[136px] lg:w-auto shrink-0 lg:shrink ${
                isNativeApp
                  ? "bg-[#FFFDF8] border-[#E4C988]"
                  : "bg-neutral-900/90 border-neutral-800"
              }`}
            >
              <div
                className={`w-full aspect-square rounded-xl sm:rounded-2xl ${
                  isNativeApp ? "bg-[#FAF0D1]" : "bg-neutral-800/80"
                }`}
              />
              <div className={`mt-2 h-3 w-16 rounded ${isNativeApp ? "bg-[#EAD49C]" : "bg-neutral-800"}`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function EditorialSkeleton() {
  const isNativeApp = useIsNativeApp();

  return (
    <div className="mt-14 space-y-6 animate-pulse select-none">
      <div
        className={`h-7 w-64 rounded-xl border ${
          isNativeApp
            ? "bg-[#FAF0D1] border-[#E4C988]"
            : "bg-neutral-900 border-neutral-800"
        }`}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className={`h-80 rounded-3xl border overflow-hidden relative ${
              isNativeApp
                ? "bg-[#FFFDF8] border-[#E4C988]"
                : "bg-neutral-900/60 border-neutral-800/80"
            }`}
          >
            <div className={`absolute inset-0 ${isNativeApp ? "bg-[#FAF0D1]/60" : "bg-neutral-850/50"}`} />
            <div className="absolute bottom-4 left-4 space-y-2">
              <div className={`h-3 w-20 rounded ${isNativeApp ? "bg-[#EAD49C]" : "bg-neutral-700/60"}`} />
              <div className={`h-5 w-40 rounded ${isNativeApp ? "bg-[#E2C275]" : "bg-neutral-700/80"}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ProductDetailSkeleton() {
  const isNativeApp = useIsNativeApp();

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-6 animate-pulse select-none">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* Left: Gallery Skeleton */}
        <div className="space-y-4">
          <div
            className={`aspect-[3/4] w-full rounded-2xl md:rounded-3xl border ${
              isNativeApp ? "bg-[#FAF0D1] border-[#E4C988]" : "bg-neutral-900 border-neutral-800"
            }`}
          />
          <div className="flex gap-3 overflow-x-auto pb-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={`w-20 h-24 rounded-xl border shrink-0 ${
                  isNativeApp ? "bg-[#FFFDF8] border-[#E4C988]" : "bg-neutral-850 border-neutral-800"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Right: Info Skeleton */}
        <div className="space-y-6">
          <div className="space-y-2">
            <div className={`h-3.5 w-24 rounded ${isNativeApp ? "bg-[#EAD49C]" : "bg-neutral-800"}`} />
            <div className={`h-7 w-3/4 rounded ${isNativeApp ? "bg-[#F3E2B3]" : "bg-neutral-800"}`} />
            <div className={`h-5 w-32 rounded mt-3 ${isNativeApp ? "bg-[#FAF0D1]" : "bg-neutral-800/70"}`} />
          </div>

          {/* Sizes */}
          <div className={`space-y-3 pt-4 border-t ${isNativeApp ? "border-[#E4C988]" : "border-neutral-800"}`}>
            <div className={`h-4 w-28 rounded ${isNativeApp ? "bg-[#EAD49C]" : "bg-neutral-800"}`} />
            <div className="flex gap-2">
              {["S", "M", "L", "XL"].map((s) => (
                <div
                  key={s}
                  className={`w-12 h-10 rounded-xl border ${
                    isNativeApp ? "bg-[#FFFDF8] border-[#E4C988]" : "bg-neutral-900 border-neutral-800"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-6">
            <div className={`h-14 flex-1 rounded-full ${isNativeApp ? "bg-[#F3E2B3]" : "bg-neutral-800"}`} />
            <div className="h-14 flex-1 rounded-full bg-emerald-500/20 border border-emerald-500/40" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function CartSkeleton() {
  const isNativeApp = useIsNativeApp();

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-8 space-y-4 animate-pulse select-none">
      <div
        className={`h-8 w-44 rounded-xl border ${
          isNativeApp ? "bg-[#FAF0D1] border-[#E4C988]" : "bg-neutral-900 border-neutral-800"
        }`}
      />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className={`flex gap-4 p-4 rounded-2xl border ${
              isNativeApp ? "bg-[#FFFDF8] border-[#E4C988]" : "bg-neutral-900/80 border-neutral-800"
            }`}
          >
            <div className={`w-24 h-28 rounded-xl shrink-0 ${isNativeApp ? "bg-[#FAF0D1]" : "bg-neutral-800"}`} />
            <div className="flex-1 space-y-2.5">
              <div className={`h-4 w-48 rounded ${isNativeApp ? "bg-[#F3E2B3]" : "bg-neutral-800"}`} />
              <div className={`h-3 w-24 rounded ${isNativeApp ? "bg-[#FAF0D1]" : "bg-neutral-800/70"}`} />
              <div className={`h-4 w-20 rounded mt-3 ${isNativeApp ? "bg-[#EAD49C]" : "bg-neutral-800"}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OrderSkeleton() {
  const isNativeApp = useIsNativeApp();

  return (
    <div className="space-y-4 animate-pulse select-none">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className={`p-4 sm:p-5 rounded-2xl border space-y-3 ${
            isNativeApp ? "bg-[#FFFDF8] border-[#E4C988]" : "bg-neutral-900/80 border-neutral-800"
          }`}
        >
          <div className={`flex justify-between items-center pb-2 border-b ${isNativeApp ? "border-[#E4C988]/60" : "border-neutral-800/60"}`}>
            <div className={`h-3.5 w-32 rounded ${isNativeApp ? "bg-[#F3E2B3]" : "bg-neutral-800"}`} />
            <div className={`h-5 w-24 rounded-full ${isNativeApp ? "bg-[#FAF0D1]" : "bg-neutral-800"}`} />
          </div>
          <div className="flex gap-3 items-center">
            <div className={`w-16 h-20 rounded-xl shrink-0 ${isNativeApp ? "bg-[#FAF0D1]" : "bg-neutral-800"}`} />
            <div className="space-y-1.5 flex-1">
              <div className={`h-3.5 w-40 rounded ${isNativeApp ? "bg-[#F3E2B3]" : "bg-neutral-800"}`} />
              <div className={`h-3 w-28 rounded ${isNativeApp ? "bg-[#FAF0D1]" : "bg-neutral-800/70"}`} />
              <div className={`h-3.5 w-16 rounded ${isNativeApp ? "bg-[#EAD49C]" : "bg-neutral-800"}`} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ReviewSkeleton() {
  const isNativeApp = useIsNativeApp();

  return (
    <div className="space-y-3 animate-pulse select-none">
      {Array.from({ length: 2 }).map((_, i) => (
        <div
          key={i}
          className={`p-4 rounded-2xl border space-y-2 ${
            isNativeApp ? "bg-[#FFFDF8] border-[#E4C988]" : "bg-neutral-900/60 border-neutral-800/80"
          }`}
        >
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full ${isNativeApp ? "bg-[#FAF0D1]" : "bg-neutral-800"}`} />
            <div className={`h-3 w-24 rounded ${isNativeApp ? "bg-[#F3E2B3]" : "bg-neutral-800"}`} />
          </div>
          <div className={`h-3.5 w-full rounded ${isNativeApp ? "bg-[#FAF0D1]" : "bg-neutral-800/80"}`} />
          <div className={`h-3.5 w-2/3 rounded ${isNativeApp ? "bg-[#F7EBCB]" : "bg-neutral-800/60"}`} />
        </div>
      ))}
    </div>
  );
}

