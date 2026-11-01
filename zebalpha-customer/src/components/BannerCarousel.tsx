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
  aspectRatio?: number;
  width?: number;
  height?: number;
}

const DEFAULT_BANNERS: BannerItem[] = [
  { 
    id: 1, 
    src: "/banner-casual-green.png", 
    alt: "Zebalpha Casual - Confidence In Every Detail",
    title: "Zebalpha Casuals",
    tagline: "CONFIDENCE IN EVERY DETAIL • 100% COMBED COTTON",
    link: "/products?category=T-Shirts",
    aspectRatio: 3.0,
    width: 1600,
    height: 533
  },
  { 
    id: 2, 
    src: "/banner-retro-cream.png", 
    alt: "Zebalpha Limited Release - Clothing For The Culture",
    title: "Exclusive New Drops",
    tagline: "TEASERS & HYPE RELEASES • PREVIEW UPCOMING DROPS",
    link: "/new-drops",
    aspectRatio: 2.367,
    width: 1600,
    height: 676
  },
  { 
    id: 3, 
    src: "/banner-premium-polo.png", 
    alt: "Zebalpha Men's Premium Polo T-Shirt - Comfortable & Stylish",
    title: "Men's Premium Polo",
    tagline: "TEXTURED FABRIC • MODERN ZIP COLLAR FIT",
    link: "/products?category=Polos",
    aspectRatio: 2.41,
    width: 1600,
    height: 664
  },
];

export function BannerCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [banners, setBanners] = useState<BannerItem[]>(DEFAULT_BANNERS);
  const [isCustomBanners, setIsCustomBanners] = useState(false);
  const [naturalDimensions, setNaturalDimensions] = useState<Record<string, { width: number; height: number; ratio: number }>>({});
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    // Load admin-configured banners from store_settings DB if present
    const fetchBanners = async () => {
      try {
        const { data } = await supabase
          .from("store_settings")
          .select("value")
          .eq("key", "hero_banners")
          .maybeSingle();

        if (data?.value && Array.isArray(data.value) && data.value.length > 0) {
          setBanners(data.value);
          setIsCustomBanners(true);
        }
      } catch (err) {
        // Fallback to default banners
      }
    };
    fetchBanners();
  }, []);

  // Pre-calculate natural aspect ratios for all banners
  useEffect(() => {
    banners.forEach((b) => {
      if (b.src) {
        if (b.aspectRatio && b.width && b.height) {
          setNaturalDimensions((prev) => ({
            ...prev,
            [b.src]: { width: b.width!, height: b.height!, ratio: b.aspectRatio! },
          }));
        } else {
          const img = new window.Image();
          img.onload = () => {
            if (img.naturalWidth && img.naturalHeight) {
              const ratio = Number((img.naturalWidth / img.naturalHeight).toFixed(3));
              setNaturalDimensions((prev) => ({
                ...prev,
                [b.src]: {
                  width: img.naturalWidth,
                  height: img.naturalHeight,
                  ratio,
                },
              }));
            }
          };
          img.src = b.src;
        }
      }
    });
  }, [banners]);

  useEffect(() => {
    if (isHovered || banners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length, isHovered]);

  const activeBanner = banners[currentIndex] || banners[0];
  const activeRatio = 
    activeBanner?.aspectRatio ||
    naturalDimensions[activeBanner?.src]?.ratio ||
    2.4;

  return (
    <div 
      className="relative mt-2 md:mt-4 w-full overflow-hidden rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] bg-neutral-950 border border-neutral-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.85)] group transition-all duration-500 isolate"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Corner Royal Accents - only shown on default placeholder banners; hidden on custom banners so they never cover custom artwork */}
      {!isCustomBanners && (
        <>
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 flex items-center gap-2 bg-black/75 backdrop-blur-md px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full border border-white/20 shadow-lg">
            <span className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-[9px] sm:text-[10px] font-black tracking-[0.2em] uppercase text-white">
              ZEBALPHA ORIGINAL
            </span>
          </div>

          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex items-center gap-1.5 bg-white text-black font-black text-[9px] sm:text-[10px] px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full shadow-xl uppercase tracking-wider">
            <span>DROP 2026</span>
          </div>
        </>
      )}

      {/* Responsive Banner Container - Dynamically matching the banner's actual aspect ratio without any cropping */}
      <div 
        className="relative w-full overflow-hidden transition-[aspect-ratio] duration-500 ease-out"
        style={{ aspectRatio: `${activeRatio}` }}
      >
        {banners.map((banner, index) => {
          const isActive = index === currentIndex;
          const SlideWrapper = banner.link ? Link : "div";
          const wrapperProps = banner.link
            ? { href: banner.link, "aria-label": banner.alt || "Featured ZebAlpha collection promotion" }
            : {};

          return (
            <SlideWrapper
              key={banner.id || index}
              {...(wrapperProps as any)}
              className={`absolute inset-0 w-full h-full transition-[opacity,transform] duration-700 ease-in-out ${
                isActive
                  ? "opacity-100 scale-100 z-10 pointer-events-auto"
                  : "opacity-0 scale-[1.02] pointer-events-none z-0"
              }`}
            >
              {/* Main Banner Image / Video - Actual Size, 100% Uncropped, Perfectly Responsive */}
              <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                {banner.src.endsWith(".mp4") ? (
                  <video
                    src={banner.src}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-contain object-center rounded-2xl sm:rounded-3xl md:rounded-[2.5rem]"
                  />
                ) : (
                  <>
                    {/* Ambient subtle blur backdrop matching image color to smoothly fill any boundary */}
                    <div 
                      className="absolute inset-0 bg-cover bg-center filter blur-2xl opacity-20 scale-105 pointer-events-none"
                      style={{ backgroundImage: `url(${banner.src})` }}
                    />
                    <Image
                      src={banner.src}
                      alt={banner.alt || "Zeb-alpha Banner"}
                      fill
                      priority={index === 0}
                      fetchPriority={index === 0 ? "high" : "auto"}
                      sizes="(max-width: 640px) 100vw, (max-width: 1400px) 100vw, 1400px"
                      onLoad={(e) => {
                        const img = e.currentTarget;
                        if (img.naturalWidth && img.naturalHeight) {
                          const ratio = Number((img.naturalWidth / img.naturalHeight).toFixed(3));
                          setNaturalDimensions((prev) => ({
                            ...prev,
                            [banner.src]: {
                              width: img.naturalWidth,
                              height: img.naturalHeight,
                              ratio,
                            },
                          }));
                        }
                      }}
                      className="w-full h-full object-contain object-center rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] transition-transform duration-700 ease-out group-hover:scale-[1.01]"
                    />
                  </>
                )}
              </div>

              {/* Gentle bottom shadow so progress indicator dots remain crystal clear */}
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent pointer-events-none rounded-b-2xl sm:rounded-b-3xl md:rounded-b-[2.5rem]" />
            </SlideWrapper>
          );
        })}
      </div>

      {/* Modern Royal Progress Indicators */}
      <div className="absolute bottom-1 sm:bottom-2 left-1/2 z-20 flex -translate-x-1/2 gap-2 sm:gap-2.5 px-4 w-full max-w-[240px] sm:max-w-[280px]">
        {banners.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className="group/dot relative py-3.5 flex-1 flex items-center justify-center transition-all cursor-pointer"
            aria-label={`Go to slide ${index + 1}`}
          >
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/30 backdrop-blur-sm">
              <div
                className="absolute inset-0 bg-white origin-left transition-transform ease-linear will-change-transform"
                style={{ 
                  transform: index === currentIndex ? 'scaleX(1)' : 'scaleX(0)',
                  transitionDuration: index === currentIndex && !isHovered ? '5000ms' : '0ms' 
                }}
              />
            </div>
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

