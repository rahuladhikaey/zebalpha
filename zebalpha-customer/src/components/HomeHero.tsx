"use client";

import { useIsNativeApp } from "@/lib/platform";
import { BannerCarousel } from "@/components/BannerCarousel";
import { MovingOfferBanner } from "@/components/MovingOfferBanner";
import { MobileSearch } from "@/components/MobileSearch";
import { CategoryNavigationBar, NavigationCategory } from "@/components/CategoryNavigationBar";
import { AndroidHomeTrustBar } from "@/components/home/AndroidHomeTrustAndDrop";
import { Suspense } from "react";

interface HomeHeroProps {
  initialCategories?: NavigationCategory[];
}

function LuxuryGoldCurvesBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-0 select-none" aria-hidden="true">
      {/* Background radial gold aura on sides and top */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 15%, rgba(217,119,6,0.16), transparent 75%), radial-gradient(ellipse 35% 80% at 0% 50%, rgba(245,158,11,0.22), transparent 70%), radial-gradient(ellipse 35% 80% at 100% 50%, rgba(245,158,11,0.22), transparent 70%)",
        }}
      />

      {/* Flowing 3D Metallic Gold Ribbons & Stardust Particles */}
      <svg className="w-full h-full object-cover" viewBox="0 0 1000 240" preserveAspectRatio="none">
        <defs>
          <linearGradient id="heroGoldRibbonTop" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fde68a" stopOpacity="0.95" />
            <stop offset="25%" stopColor="#f59e0b" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#d97706" stopOpacity="0.35" />
            <stop offset="75%" stopColor="#f59e0b" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#fde68a" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="heroGoldRibbonBottom" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d97706" stopOpacity="0.25" />
            <stop offset="20%" stopColor="#fde68a" stopOpacity="0.95" />
            <stop offset="55%" stopColor="#f59e0b" stopOpacity="0.85" />
            <stop offset="85%" stopColor="#d97706" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#fde68a" stopOpacity="0.45" />
          </linearGradient>
          <filter id="heroRibbonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Top ribbon: curves under the header and over the search bar */}
        <path
          d="M -20,18 C 90,75 220,95 500,90 C 780,85 910,65 1020,18"
          fill="none"
          stroke="url(#heroGoldRibbonTop)"
          strokeWidth="3.2"
          filter="url(#heroRibbonGlow)"
        />
        <path
          d="M -20,10 C 90,68 220,88 500,83 C 780,78 910,58 1020,10"
          fill="none"
          stroke="#fde68a"
          strokeOpacity="0.45"
          strokeWidth="1.4"
        />

        {/* Lower ribbon: curves gracefully behind the category row */}
        <path
          d="M -10,185 C 180,118 420,215 700,165 C 860,135 950,160 1010,185"
          fill="none"
          stroke="url(#heroGoldRibbonBottom)"
          strokeWidth="2.8"
          filter="url(#heroRibbonGlow)"
        />

        {/* Clusters of Gold Stardust Dots (Left Side) */}
        <circle cx="15" cy="45" r="1.5" fill="#fde68a" opacity="0.85" />
        <circle cx="35" cy="65" r="1.1" fill="#f59e0b" opacity="0.65" />
        <circle cx="22" cy="85" r="1.4" fill="#fbbf24" opacity="0.8" />
        <circle cx="50" cy="50" r="1.0" fill="#fde68a" opacity="0.55" />
        <circle cx="30" cy="120" r="1.3" fill="#f59e0b" opacity="0.7" />
        <circle cx="18" cy="150" r="1.6" fill="#fde68a" opacity="0.75" />
        <circle cx="45" cy="175" r="1.2" fill="#fbbf24" opacity="0.65" />
        <circle cx="65" cy="195" r="1.1" fill="#fde68a" opacity="0.6" />

        {/* Clusters of Gold Stardust Dots (Right Side) */}
        <circle cx="985" cy="45" r="1.5" fill="#fde68a" opacity="0.85" />
        <circle cx="965" cy="65" r="1.1" fill="#f59e0b" opacity="0.65" />
        <circle cx="978" cy="85" r="1.4" fill="#fbbf24" opacity="0.8" />
        <circle cx="950" cy="50" r="1.0" fill="#fde68a" opacity="0.55" />
        <circle cx="970" cy="120" r="1.3" fill="#f59e0b" opacity="0.7" />
        <circle cx="982" cy="150" r="1.6" fill="#fde68a" opacity="0.75" />
        <circle cx="955" cy="175" r="1.2" fill="#fbbf24" opacity="0.65" />
        <circle cx="935" cy="195" r="1.1" fill="#fde68a" opacity="0.6" />
      </svg>
    </div>
  );
}

function AndroidFestiveCurvesBackdrop() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-0 select-none" aria-hidden="true">
      {/* Base warm peach-coral gradient foundation matching image gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, #fd5852 0%, #feaa90 40%, #ffd0be 75%, #FFFFFF 100%)",
        }}
      />
      {/* Continuing festive floral lattice pattern from image */}
      <div
        className="absolute inset-0 bg-no-repeat"
        style={{
          backgroundImage: "url('/festive-header-bg.jpg')",
          backgroundSize: "100% auto",
          backgroundPosition: "center -60px",
        }}
      />
      {/* Seamless bottom fade to pure white so categories flow organically into the page */}
      <div
        className="absolute inset-x-0 bottom-0 h-10 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.85) 60%, #FFFFFF 100%)",
        }}
      />
    </div>
  );
}

export function HomeHero({ initialCategories = [] }: HomeHeroProps) {
  const isNativeApp = useIsNativeApp();

  // When in Android App:
  // Order:
  // 1. Sticky Unit (Search Bar + Category Navigation Bar moving together)
  //    Stops immediately below Android status bar during downward scroll.
  // 2. Hero Banner (BannerCarousel)
  // 3. Promotional Announcement / Marquee (MovingOfferBanner)
  if (isNativeApp) {
    return (
      <>
        {/* =================================================================== */}
        {/* ANDROID APP: STICKY SEARCH BAR + HORIZONTAL CATEGORY NAVIGATION     */}
        {/* Festive Red & Peach Coral Pattern Top Unit                          */}
        {/* =================================================================== */}
        <div
          className="sticky z-40 w-full bg-[#FFFFFF] border-b border-[#feece2]/60 shadow-[0_6px_20px_rgba(240,58,70,0.08)] select-none"
          style={{ top: "env(safe-area-inset-top, 0px)" }}
        >
          <AndroidFestiveCurvesBackdrop />

          {/* 1. Sticky Search Bar */}
          <div className="relative z-30 w-full px-3.5 pt-2 pb-1">
            <Suspense fallback={<div className="h-[50px] w-full rounded-full bg-[#F5E8C3] animate-pulse" />}>
              <MobileSearch className="relative flex w-full flex-col min-h-[50px]" />
            </Suspense>
          </div>

          {/* 2. Sticky Horizontal Category Navigation Bar */}
          <CategoryNavigationBar
            initialCategories={initialCategories}
            isNativeApp={true}
            className="relative z-10 !bg-transparent !border-b-0"
          />
        </div>

        {/* =================================================================== */}
        {/* SCROLLABLE HOMEPAGE CONTENT                                         */}
        {/* =================================================================== */}
        {/* 1. Hero Banner: Starts with clean separation below category bar */}
        <div className="mx-auto w-full max-w-[1400px] px-3.5 md:px-8 pt-3">
          <BannerCarousel />
        </div>

        {/* 2. 3-Column Trust & Free Delivery Strip */}
        <AndroidHomeTrustBar />

        {/* 3. Promotional Announcement / Marquee Banner */}
        <div className="mt-3">
          <MovingOfferBanner />
        </div>
      </>
    );
  }

  // When on Website / Web Browser (Desktop, Mobile Browser, Tablet, or SSR):
  // Order:
  // 1. Obsidian & Gold Top Unit (Mobile Search directly above Category Navigation Bar)
  // 2. MovingOfferBanner (Announcement / Marquee)
  // 3. Hero Banner (BannerCarousel)
  return (
    <>
      <div className="relative w-full bg-[#050402] border-b border-amber-500/20 shadow-[0_10px_30px_rgba(0,0,0,0.85)]">
        <LuxuryGoldCurvesBackdrop />

        {/* Mobile Search - sits directly above Category Navigation Bar on mobile web */}
        <div className="md:hidden relative z-30 w-full px-3.5 pt-2.5 pb-1">
          <Suspense fallback={<div className="h-[54px] w-full rounded-full bg-[#120e07] animate-pulse" />}>
            <MobileSearch className="relative flex w-full flex-col min-h-[54px]" />
          </Suspense>
        </div>

        {/* Category Navigation Bar */}
        <CategoryNavigationBar
          initialCategories={initialCategories}
          isNativeApp={false}
          className="relative z-10 !bg-transparent !border-b-0"
        />
      </div>

      <MovingOfferBanner />

      <div className="mx-auto w-full max-w-[1400px] px-4 md:px-8">
        {/* Carousel Showcase */}
        <div className="pt-2">
          <BannerCarousel />
        </div>
      </div>
    </>
  );
}
