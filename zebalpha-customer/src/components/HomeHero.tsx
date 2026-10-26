"use client";

import { useIsNativeApp } from "@/lib/platform";
import { BannerCarousel } from "@/components/BannerCarousel";
import { MovingOfferBanner } from "@/components/MovingOfferBanner";
import { MobileSearch } from "@/components/MobileSearch";
import { CategoryNavigationBar, NavigationCategory } from "@/components/CategoryNavigationBar";
import { Suspense, useEffect, useState } from "react";

interface HomeHeroProps {
  initialCategories?: NavigationCategory[];
}

export function HomeHero({ initialCategories = [] }: HomeHeroProps) {
  const isNativeApp = useIsNativeApp();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // When in Android App:
  // Order:
  // 1. Sticky Unit (Search Bar + Category Navigation Bar moving together)
  //    Stops immediately below Android status bar during downward scroll.
  // 2. Hero Banner (BannerCarousel)
  // 3. Promotional Announcement / Marquee (MovingOfferBanner)
  if (mounted && isNativeApp) {
    return (
      <>
        {/* =================================================================== */}
        {/* ANDROID APP: STICKY SEARCH BAR + HORIZONTAL CATEGORY NAVIGATION     */}
        {/* Exactly these two elements move together as ONE sticky unit        */}
        {/* Stops immediately below Android status bar during downward scroll   */}
        {/* =================================================================== */}
        <div
          className="sticky z-40 w-full bg-black border-b border-zinc-800/90 shadow-xl select-none"
          style={{ top: "env(safe-area-inset-top, 0px)" }}
        >
          {/* 1. Sticky Search Bar */}
          <div className="w-full bg-black px-3.5 pt-2 pb-1.5">
            <Suspense fallback={<div className="h-[48px] w-full rounded-2xl bg-neutral-900 animate-pulse" />}>
              <MobileSearch className="relative flex w-full flex-col min-h-[48px]" />
            </Suspense>
          </div>

          {/* 2. Sticky Horizontal Category Navigation Bar */}
          <CategoryNavigationBar
            initialCategories={initialCategories}
            isNativeApp={true}
            className="border-t border-zinc-900/80 bg-black"
          />
        </div>

        {/* =================================================================== */}
        {/* SCROLLABLE HOMEPAGE CONTENT                                         */}
        {/* =================================================================== */}
        {/* 1. Hero Banner: Starts with clean separation below category bar */}
        <div className="mx-auto w-full max-w-[1400px] px-3.5 md:px-8 pt-3">
          <BannerCarousel />
        </div>

        {/* 2. Promotional Announcement / Marquee Banner */}
        <div className="mt-3">
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
      <CategoryNavigationBar initialCategories={initialCategories} isNativeApp={false} />

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
