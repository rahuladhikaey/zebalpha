"use client";

import { useIsNativeApp } from "@/lib/platform";
import { BannerCarousel } from "@/components/BannerCarousel";
import { MovingOfferBanner } from "@/components/MovingOfferBanner";
import { MobileSearch } from "@/components/MobileSearch";
import { CategoryNavigationBar } from "@/components/CategoryNavigationBar";
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
  // 2. New Horizontal Category Bar (directly below search bar, above hero banner)
  // 3. Hero Banner (starts immediately below category bar)
  // 4. Promotional Banner
  if (mounted && isNativeApp) {
    return (
      <>
        {/* 1. Android App Sticky Search Bar */}
        <div className="sticky top-0 z-40 w-full bg-zinc-950/98 backdrop-blur-xl border-b border-zinc-800/80 px-3.5 py-2.5 shadow-md">
          <Suspense fallback={<div className="h-[48px] w-full rounded-2xl bg-neutral-900 animate-pulse" />}>
            <MobileSearch className="relative flex w-full flex-col min-h-[48px]" />
          </Suspense>
        </div>

        {/* 2. New Horizontal Category Bar (Directly below search, above banner) */}
        <CategoryNavigationBar isNativeApp={true} />

        {/* 3. Hero Banner: Starts immediately below the category bar */}
        <div className="mx-auto w-full max-w-[1400px] px-3.5 md:px-8 pt-2.5">
          <BannerCarousel />
        </div>

        {/* 4. Promotional Banner */}
        <div className="mt-2.5">
          <MovingOfferBanner />
        </div>
      </>
    );
  }

  // When on Website / Web Browser (Desktop, Mobile Browser, Tablet, or SSR):
  // Order:
  // 1. MovingOfferBanner (Announcement / Marquee)
  // 2. New Category Navigation Bar (immediately above hero banner)
  // 3. Hero Banner (BannerCarousel)
  // 4. Mobile Search (below banner on mobile web)
  return (
    <>
      <MovingOfferBanner />

      {/* New Category Navigation Bar (Directly above hero banner) */}
      <CategoryNavigationBar isNativeApp={false} />

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
