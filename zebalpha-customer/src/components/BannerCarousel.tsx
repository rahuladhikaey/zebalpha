"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

interface BannerItem {
  id?: number | string;
  src: string;
  alt?: string;
  title?: string;
  tagline?: string;
  link?: string;
}

const DEFAULT_BANNERS: BannerItem[] = [
  { 
    id: 1, 
    src: "/banner-casual-green.png", 
    alt: "Zebalpha Casual - Confidence In Every Detail",
    title: "Zebalpha Casuals",
    tagline: "CONFIDENCE IN EVERY DETAIL • 100% COMBED COTTON",
    link: "/products?category=T-Shirts"
  },
  { 
    id: 2, 
    src: "/banner-retro-cream.png", 
    alt: "Zebalpha Limited Release 50% Off - Clothing For The Culture",
    title: "Limited Edition Drop",
    tagline: "50% OFF INTRODUCTORY DROP • TIMELESS FIT",
    link: "/products?discount=50"
  },
  { 
    id: 3, 
    src: "/banner-premium-polo.png", 
    alt: "Zebalpha Men's Premium Polo T-Shirt - Comfortable & Stylish",
    title: "Men's Premium Polo",
    tagline: "TEXTURED FABRIC • MODERN ZIP COLLAR FIT",
    link: "/products?category=Polos"
  },
];

export function BannerCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [banners, setBanners] = useState<BannerItem[]>(DEFAULT_BANNERS);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    // Load admin-configured banners from store_settings DB if present
    const fetchBanners = async () => {
      try {
        const { data } = await supabase
          .from("store_settings")
          .select("value")
          .eq("key", "hero_banners")
          .single();

        if (data?.value && Array.isArray(data.value) && data.value.length > 0) {
          setBanners(data.value);
        }
      } catch (err) {
        // Fallback to default banners
      }
    };
    fetchBanners();

    const channel = supabase
      .channel("banner-carousel-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "store_settings", filter: "key=eq.hero_banners" }, (payload) => {
        const value = (payload.new as any)?.value;
        if (value && Array.isArray(value) && value.length > 0) {
          setBanners(value);
          setCurrentIndex(0);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (isHovered || banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length, isHovered]);

  return (
    <div 
      className="relative mt-2 md:mt-4 w-full overflow-hidden rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] bg-neutral-950 border border-neutral-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.85)] group transition-all duration-500"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 2D Animated Corner Royal Accents */}
      <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 flex items-center gap-2 bg-black/75 backdrop-blur-md px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full border border-white/20 shadow-lg">
        <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-400 animate-ping" />
        <span className="text-[9px] sm:text-[10px] font-black tracking-[0.2em] uppercase text-white">
          ZEBALPHA ORIGINAL
        </span>
      </div>

      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex items-center gap-1.5 bg-white text-black font-black text-[9px] sm:text-[10px] px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full shadow-xl uppercase tracking-wider">
        <span>DROP 2026</span>
      </div>

      {/* Standardized Uniform Banner Container - Exact Same Size Across All Slides */}
      <div className="relative w-full aspect-[2.2/1] sm:aspect-[2.5/1] md:aspect-[2.7/1] lg:aspect-[2.9/1] min-h-[175px] sm:min-h-[260px] md:min-h-[340px] max-h-[520px]">
        {banners.map((banner, index) => {
          const isActive = index === currentIndex;
          const SlideWrapper = banner.link ? Link : "div";
          const wrapperProps = banner.link ? { href: banner.link } : {};

          return (
            <SlideWrapper
              key={banner.id || index}
              {...(wrapperProps as any)}
              className={`absolute inset-0 w-full h-full transition-all duration-700 ease-in-out ${
                isActive
                  ? "opacity-100 scale-100 z-10 pointer-events-auto"
                  : "opacity-0 scale-[1.03] pointer-events-none z-0"
              }`}
            >
              {/* Blurred Ambient Backdrop for Full Content Consistency */}
              <div 
                className="absolute inset-0 bg-cover bg-center filter blur-xl opacity-40 scale-110"
                style={{ backgroundImage: `url(${banner.src})` }}
              />

              {/* Main Banner Image with Actual Proportions and Clean Sizing */}
              <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                <Image
                  src={banner.src}
                  alt={banner.alt || "Zeb-alpha Banner"}
                  fill
                  priority={index === 0}
                  sizes="(max-width: 640px) 100vw, (max-width: 1400px) 100vw, 1400px"
                  className="w-full h-full object-cover object-center rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] transition-transform duration-1000 ease-out group-hover:scale-[1.015]"
                  unoptimized
                />
              </div>

              {/* Subtle High-End Royal Vignette Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none rounded-2xl sm:rounded-3xl md:rounded-[2.5rem]" />
            </SlideWrapper>
          );
        })}
      </div>

      {/* Modern Royal Progress Indicators */}
      <div className="absolute bottom-3 sm:bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2 sm:gap-2.5 px-4 w-full max-w-[240px] sm:max-w-[280px]">
        {banners.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className="group/dot relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/30 backdrop-blur-sm transition-all hover:bg-white/50"
            aria-label={`Go to slide ${index + 1}`}
          >
            <div
              className={`absolute inset-0 bg-white transition-all ease-linear ${
                index === currentIndex ? "w-full" : "w-0"
              }`}
              style={{ 
                transitionDuration: index === currentIndex && !isHovered ? '5000ms' : '0ms' 
              }}
            />
          </button>
        ))}
      </div>

      {/* Navigation Arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setCurrentIndex((currentIndex - 1 + banners.length) % banners.length);
            }}
            className="absolute left-3 sm:left-4 top-1/2 z-30 -translate-y-1/2 flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-black/70 text-white border border-white/20 backdrop-blur-md opacity-0 transition-all hover:bg-white hover:text-black hover:scale-110 group-hover:opacity-100 hidden md:flex shadow-2xl active:scale-95 cursor-pointer"
            aria-label="Previous banner"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setCurrentIndex((currentIndex + 1) % banners.length);
            }}
            className="absolute right-3 sm:right-4 top-1/2 z-30 -translate-y-1/2 flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-black/70 text-white border border-white/20 backdrop-blur-md opacity-0 transition-all hover:bg-white hover:text-black hover:scale-110 group-hover:opacity-100 hidden md:flex shadow-2xl active:scale-95 cursor-pointer"
            aria-label="Next banner"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}
    </div>
  );
}

