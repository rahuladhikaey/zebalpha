"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

const DEFAULT_BANNERS = [
  { 
    id: 1, 
    src: "/banner-casual-green.png", 
    alt: "Zebalpha Casual - Confidence In Every Detail",
    title: "Zebalpha Casuals",
    tagline: "CONFIDENCE IN EVERY DETAIL • 100% COMBED COTTON"
  },
  { 
    id: 2, 
    src: "/banner-retro-cream.png", 
    alt: "Zebalpha Limited Release 50% Off - Clothing For The Culture",
    title: "Limited Edition Drop",
    tagline: "50% OFF INTRODUCTORY DROP • TIMELESS FIT"
  },
  { 
    id: 3, 
    src: "/banner-premium-polo.png", 
    alt: "Zebalpha Men's Premium Polo T-Shirt - Comfortable & Stylish",
    title: "Men's Premium Polo",
    tagline: "TEXTURED FABRIC • MODERN ZIP COLLAR FIT"
  },
];

export function BannerCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [banners, setBanners] = useState(DEFAULT_BANNERS);
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
    if (isHovered) return;
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length, isHovered]);

  return (
    <div 
      className="relative mt-4 w-full overflow-hidden rounded-3xl md:rounded-[2.5rem] bg-neutral-950 border border-neutral-800 shadow-[0_20px_50px_rgba(0,0,0,0.8)] group transition-all duration-500"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 2D Animated Corner Royal Accents */}
      <div className="absolute top-4 left-4 z-20 hidden md:flex items-center gap-2 bg-black/75 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20 shadow-lg">
        <span className="h-2 w-2 rounded-full bg-white animate-ping" />
        <span className="text-[10px] font-black tracking-[0.2em] uppercase text-white">
          ZEBALPHA ORIGINAL
        </span>
      </div>

      <div className="absolute top-4 right-4 z-20 hidden md:flex items-center gap-1.5 bg-white text-black font-black text-[10px] px-3 py-1.5 rounded-full shadow-xl uppercase tracking-wider">
        <span>DROP 2026</span>
      </div>

      {/* Banner Container */}
      <div className="relative w-full aspect-[21/9] sm:aspect-[2.4/1] md:aspect-[2.8/1] min-h-[190px]">
        {banners.map((banner, index) => {
          const isActive = index === currentIndex;
          return (
            <div
              key={banner.id || index}
              className={`absolute inset-0 w-full h-full transition-all duration-700 ease-out ${
                isActive
                  ? "opacity-100 scale-100 z-10"
                  : "opacity-0 scale-105 pointer-events-none z-0"
              }`}
            >
              <Image
                src={banner.src}
                alt={banner.alt || "Zeb-alpha Banner"}
                fill
                priority={index === 0}
                sizes="(max-width: 1400px) 100vw, 1400px"
                className="w-full h-full object-cover rounded-3xl md:rounded-[2.5rem] transition-transform duration-1000 ease-out group-hover:scale-[1.02]"
                unoptimized
              />
              {/* Subtle High-End Royal Vignette */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none rounded-3xl md:rounded-[2.5rem]" />
            </div>
          );
        })}
      </div>

      {/* Modern Royal 2D Progress Navigation */}
      <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 gap-2.5 px-4 w-full max-w-[260px]">
        {banners.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className="group/dot relative h-1.5 flex-1 overflow-hidden rounded-full bg-white/25 backdrop-blur-sm transition-all hover:bg-white/40"
            aria-label={`Go to slide ${index + 1}`}
          >
            <div
              className={`absolute inset-0 bg-white transition-all duration-[5000ms] ease-linear ${
                index === currentIndex ? "w-full" : "w-0"
              }`}
              style={{ transitionDuration: index === currentIndex && !isHovered ? '5000ms' : '0ms' }}
            />
          </button>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={() => setCurrentIndex((currentIndex - 1 + banners.length) % banners.length)}
        className="absolute left-4 top-1/2 z-30 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white border border-white/20 backdrop-blur-md opacity-0 transition-all hover:bg-white hover:text-black hover:scale-110 group-hover:opacity-100 hidden md:flex shadow-2xl active:scale-95"
        aria-label="Previous banner"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <button
        onClick={() => setCurrentIndex((currentIndex + 1) % banners.length)}
        className="absolute right-4 top-1/2 z-30 -translate-y-1/2 flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white border border-white/20 backdrop-blur-md opacity-0 transition-all hover:bg-white hover:text-black hover:scale-110 group-hover:opacity-100 hidden md:flex shadow-2xl active:scale-95"
        aria-label="Next banner"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
