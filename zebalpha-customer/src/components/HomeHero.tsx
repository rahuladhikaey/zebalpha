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
  // The Header, Search Bar, and Category Navigation Bar are in the permanently fixed top section.
  // Scrollable Homepage Content starts here:
  // 1. Hero Banner (BannerCarousel)
  // 2. Promotional Banner / Marquee (MovingOfferBanner)
  if (mounted && isNativeApp) {
    return (
      <>
        {/* 1. Hero Banner: Starts immediately below the permanently fixed category navigation */}
        <div className="mx-auto w-full max-w-[1400px] px-3.5 md:px-8 pt-2.5">
          <BannerCarousel />
        </div>

        {/* 2. Promotional Banner / Marquee */}
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
