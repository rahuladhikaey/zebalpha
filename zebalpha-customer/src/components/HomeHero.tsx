"use client";

import { useIsNativeApp } from "@/lib/platform";
import { BannerCarousel } from "@/components/BannerCarousel";
import { MovingOfferBanner } from "@/components/MovingOfferBanner";
import { MobileSearch } from "@/components/MobileSearch";
import { Suspense, useEffect, useState } from "react";

export function HomeHero() {
  const isNativeApp = useIsNativeApp();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // When in Android App:
  // Order:
  // 1. Search Bar (placed directly above banner, sticky at top during upward scroll)
  // 2. Hero Banner (starts immediately below search bar)
  // 3. Promotional Banner
  // Content below (Banner, Collections, Products) scrolls naturally underneath the sticky search bar.
  if (mounted && isNativeApp) {
    return (
      <>
        {/* 1. Android App Sticky Search Bar: Placed directly ABOVE the banner */}
        <div className="sticky top-0 z-40 w-full bg-zinc-950/98 backdrop-blur-xl border-b border-zinc-800/80 px-3.5 py-2.5 shadow-md">
          <Suspense fallback={<div className="h-[48px] w-full rounded-2xl bg-neutral-900 animate-pulse" />}>
            <MobileSearch className="relative flex w-full flex-col min-h-[48px]" />
          </Suspense>
        </div>

        {/* 2. Hero Banner: Starts immediately below the search bar */}
        <div className="mx-auto w-full max-w-[1400px] px-3.5 md:px-8 pt-2.5">
          <BannerCarousel />
        </div>

        {/* 3. Promotional Banner */}
        <div className="mt-2.5">
          <MovingOfferBanner />
        </div>
      </>
    );
  }

  // When on Website / Web Browser (Desktop, Mobile Browser, Tablet, or SSR):
  // 100% UNCHANGED: MovingOfferBanner -> BannerCarousel -> MobileSearch (below banner on mobile web)
  return (
    <>
      <MovingOfferBanner />

      <div className="mx-auto w-full max-w-[1400px] px-4 md:px-8">
        {/* Carousel Showcase */}
        <div className="pt-2">
          <BannerCarousel />
        </div>

        {/* Mobile Search - under banner on mobile web */}
        <div className="md:hidden mt-3">
          <Suspense fallback={<div className="h-[50px] w-full rounded-2xl bg-neutral-900 animate-pulse" />}>
            <MobileSearch />
          </Suspense>
        </div>
      </div>
    </>
  );
}
