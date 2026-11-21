"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { IMAGE_VARIANTS } from "@/services/imageOptimizationService";
import { useOfficialTheme } from "@/lib/platform";

interface BannerItem {
  id?: number | string;
  src: string;
  alt?: string;
  title?: string;
  tagline?: string;
  link?: string;
  bgColor?: string;
}

const AUTO_SCROLL_INTERVAL_MS = 4200;

/**
 * Default Homepage Hero Banners
 * Slide 1 is always the official Grand Opening Sale banner.
 * Every slide renders inside one identical fixed aspect-ratio frame (zero height jump).
 */
const DEFAULT_BANNERS: BannerItem[] = [
  {
    id: "grand-opening-sale",
    src: "/banner-grand-opening.jpg",
    alt: "ZebAlpha Grand Opening Sale Now Live - Explore new clothing collections & special offers",
    title: "Grand Opening Sale",
    tagline: "NOW LIVE • SPECIAL OFFERS ON LAUNCH PRODUCTS",
    link: "/products",
    bgColor: "#c5cdd9",
  },
  {
    id: "retro-cream-drop",
    src: "/banner-retro-cream.png",
    alt: "ZebAlpha Limited Release - Clothing For The Culture 50% Off",
    title: "Exclusive New Drops",
    tagline: "LIMITED RELEASE • CLOTHING FOR THE CULTURE",
    link: "/new-drops",
    bgColor: "#e6dbc8",
  },
  {
    id: "premium-polo",
    src: "/banner-premium-polo.png",
    alt: "ZebAlpha Men's Premium Polo T-Shirt - Comfortable & Stylish",
    title: "Men's Premium Polo",
    tagline: "TEXTURED FABRIC • MODERN ZIP COLLAR FIT",
    link: "/products?category=Polos",
    bgColor: "#041630",
  },
  {
    id: "casual-green",
    src: "/banner-casual-green.png",
    alt: "ZebAlpha Casual - Confidence In Every Detail",
    title: "ZebAlpha Casuals",
    tagline: "CONFIDENCE IN EVERY DETAIL • 100% COMBED COTTON",
    link: "/products?category=T-Shirts",
    bgColor: "#4f5633",
  },
];

export function BannerCarousel() {
  const isNativeApp = useOfficialTheme();
  const [banners, setBanners] = useState<BannerItem[]>(DEFAULT_BANNERS);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffsetPx, setDragOffsetPx] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);
  const didSwipeRef = useRef<boolean>(false);

  // Load admin-configured custom banners via Edge CDN + Upstash Redis cached API
  useEffect(() => {
    let isMounted = true;
    const fetchBanners = async () => {
      try {
        const res = await fetch("/api/banners");
        if (!res.ok) return;
        const json = await res.json();
        if (isMounted && json?.success && Array.isArray(json.data) && json.data.length > 0) {
          setBanners(json.data);
          setCurrentIndex(0);
        }
      } catch {
        // Keep DEFAULT_BANNERS seamlessly
      }
    };
    fetchBanners();
    return () => {
      isMounted = false;
    };
  }, []);

  const totalSlides = banners.length;

  const goToSlide = useCallback(
    (nextIndex: number) => {
      if (totalSlides <= 0) return;
      const normalized = ((nextIndex % totalSlides) + totalSlides) % totalSlides;
      setCurrentIndex(normalized);
    },
    [totalSlides]
  );

  // Smooth Flipkart/Meesho-style automatic horizontal side-scroll
  useEffect(() => {
    if (isPaused || isDragging || totalSlides <= 1) return;

    const timer = window.setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      setCurrentIndex((prev) => (prev + 1) % totalSlides);
    }, AUTO_SCROLL_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [totalSlides, isPaused, isDragging]);

  // Native-feel horizontal touch swipe with vertical scroll lock protection
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (totalSlides <= 1 || e.touches.length !== 1) return;
    const touch = e.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
    isHorizontalSwipeRef.current = null;
    didSwipeRef.current = false;
    setIsDragging(true);
    setDragOffsetPx(0);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    const dx = touch.clientX - touchStartXRef.current;
    const dy = touch.clientY - touchStartYRef.current;

    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        isHorizontalSwipeRef.current = Math.abs(dx) > Math.abs(dy);
      }
    }

    if (isHorizontalSwipeRef.current) {
      didSwipeRef.current = true;
      setDragOffsetPx(dx);
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    const width = containerRef.current?.offsetWidth || 320;
    const swipeThreshold = Math.min(56, width * 0.16);

    if (isHorizontalSwipeRef.current && Math.abs(dragOffsetPx) > swipeThreshold) {
      if (dragOffsetPx < 0) {
        goToSlide(currentIndex + 1);
      } else {
        goToSlide(currentIndex - 1);
      }
    }

    setIsDragging(false);
    setDragOffsetPx(0);
    isHorizontalSwipeRef.current = null;

    // Reset click-suppression flag after the synthetic click event tick
    window.setTimeout(() => {
      didSwipeRef.current = false;
    }, 80);
  };

  return (
    <div
      className="w-full select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Uniform Fixed-Size Banner Frame — 100% consistent height across every slide */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className={`relative w-full overflow-hidden group isolate touch-pan-y ${
          isNativeApp
            ? "mt-1 rounded-2xl bg-[#FFFDF8] border border-[#E2BE66]/80 shadow-[0_10px_26px_rgba(166,124,28,0.13)]"
            : "mt-2 md:mt-4 rounded-2xl sm:rounded-3xl md:rounded-[2rem] bg-neutral-950 border border-neutral-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
        }`}
      >
        {/* Locked uniform aspect ratio: identical height on every slide (zero layout bounce) */}
        <div className="relative w-full aspect-[16/9] sm:aspect-[2.2/1] lg:aspect-[2.35/1] overflow-hidden">
          {/* GPU-Accelerated Horizontal Side-Scroll Track */}
          <div
            className="flex h-full w-full will-change-transform"
            style={{
              transform: `translate3d(calc(-${currentIndex * 100}% + ${dragOffsetPx}px), 0, 0)`,
              transition: isDragging
                ? "none"
                : "transform 540ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            {banners.map((banner, index) => {
              const bannerSrc = IMAGE_VARIANTS.heroBanner(banner.src);
              const slideStyle = {
                backgroundColor:
                  banner.bgColor || (isNativeApp ? "#FAF4E4" : "#0A0A0C"),
              };
              const slideClassName =
                "relative h-full w-full shrink-0 overflow-hidden block";

              const slideMedia = banner.src.endsWith(".mp4") ? (
                <video
                  src={banner.src}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="h-full w-full object-cover object-center"
                />
              ) : (
                <>
                  {/* Seamless color-matched ambient backdrop so every slide fills 100% edge-to-edge */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 bg-cover bg-center scale-110 blur-2xl opacity-90 pointer-events-none"
                    style={{ backgroundImage: `url(${bannerSrc})` }}
                  />
                  {/* Crisp uncropped artwork centered inside the uniform frame */}
                  <Image
                    src={bannerSrc}
                    alt={banner.alt || "ZebAlpha Banner"}
                    fill
                    priority={index === 0}
                    loading={index <= 1 ? "eager" : "lazy"}
                    fetchPriority={index === 0 ? "high" : "auto"}
                    sizes="(max-width: 640px) 100vw, (max-width: 1400px) 95vw, 1360px"
                    draggable={false}
                    className="relative z-10 h-full w-full object-contain object-center"
                  />
                </>
              );

              if (banner.link) {
                return (
                  <Link
                    key={banner.id || index}
                    href={banner.link}
                    aria-label={
                      banner.alt ||
                      banner.title ||
                      `Featured ZebAlpha promotion ${index + 1}`
                    }
                    onClick={(e) => {
                      if (didSwipeRef.current) {
                        e.preventDefault();
                      }
                    }}
                    className={slideClassName}
                    style={slideStyle}
                  >
                    {slideMedia}
                  </Link>
                );
              }

              return (
                <div
                  key={banner.id || index}
                  className={slideClassName}
                  style={slideStyle}
                >
                  {slideMedia}
                </div>
              );
            })}
          </div>

          {/* Desktop Hover Navigation Arrows */}
          {totalSlides > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  goToSlide(currentIndex - 1);
                }}
                className="absolute left-3 sm:left-4 top-1/2 z-20 -translate-y-1/2 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-black/65 text-white border border-white/20 backdrop-blur-md opacity-0 transition-all hover:bg-white hover:text-black hover:scale-105 group-hover:opacity-100 shadow-xl active:scale-95 cursor-pointer"
                aria-label="Previous banner"
              >
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  goToSlide(currentIndex + 1);
                }}
                className="absolute right-3 sm:right-4 top-1/2 z-20 -translate-y-1/2 hidden md:flex h-10 w-10 items-center justify-center rounded-full bg-black/65 text-white border border-white/20 backdrop-blur-md opacity-0 transition-all hover:bg-white hover:text-black hover:scale-105 group-hover:opacity-100 shadow-xl active:scale-95 cursor-pointer"
                aria-label="Next banner"
              >
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Clean Flipkart/Meesho-Style Animated Pill Indicators below banner (never covers artwork) */}
      {totalSlides > 1 && (
        <div
          className="mt-2.5 flex items-center justify-center gap-1.5"
          role="tablist"
          aria-label="Banner slides"
        >
          {banners.map((banner, index) => {
            const isActive = index === currentIndex;
            return (
              <button
                key={banner.id || index}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={`Go to slide ${index + 1}`}
                onClick={() => goToSlide(index)}
                className="py-1 px-0.5 cursor-pointer flex items-center"
              >
                <span
                  className={`relative block h-1.5 overflow-hidden rounded-full transition-all duration-300 ${
                    isActive
                      ? isNativeApp
                        ? "w-7 bg-[#E6D4A6]"
                        : "w-7 bg-white/25"
                      : isNativeApp
                      ? "w-1.5 bg-[#D4BC82]/80 hover:bg-[#B88D26]"
                      : "w-1.5 bg-white/30 hover:bg-white/60"
                  }`}
                >
                  {isActive && (
                    <span
                      key={`${currentIndex}-${isPaused ? "paused" : "play"}`}
                      className={`absolute inset-0 origin-left rounded-full ${
                        isNativeApp
                          ? "bg-gradient-to-r from-[#EAB308] to-[#B45309]"
                          : "bg-white"
                      }`}
                      style={{
                        animation:
                          !isPaused && !isDragging
                            ? `za-banner-pill-fill ${AUTO_SCROLL_INTERVAL_MS}ms linear forwards`
                            : "none",
                      }}
                    />
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
