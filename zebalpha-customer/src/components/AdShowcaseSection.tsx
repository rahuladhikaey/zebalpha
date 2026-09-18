"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Flame, 
  ArrowUpRight, 
  ChevronLeft, 
  ChevronRight, 
  Copy, 
  Check,
  ShieldCheck,
  Truck,
  Tag
} from "lucide-react";

export function AdShowcaseSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  const SLIDES_COUNT = 3;

  // Auto rotate slides
  useEffect(() => {
    if (isHovered) return;
    
    // Give more time on video slide
    const slideDuration = currentSlide === 0 ? 9000 : 6500;
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES_COUNT);
    }, slideDuration);

    return () => clearInterval(interval);
  }, [currentSlide, isHovered]);

  // Video play/pause effect when active
  useEffect(() => {
    if (videoRef.current) {
      if (currentSlide === 0) {
        videoRef.current.play().catch(() => {
          // Autoplay policy fallback
          setIsPlaying(false);
        });
      } else {
        videoRef.current.pause();
      }
    }
  }, [currentSlide]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  const handleCopyPromo = (code: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    }
  };

  return (
    <section 
      className="my-14 sm:my-18 lg:my-20 w-full"
      aria-label="Featured Campaigns and Promotions"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Section Header Label */}
      <div className="flex items-center justify-between mb-5 px-1">
        <div className="flex items-center gap-3">
          <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_#34d399] animate-pulse" />
          <h2 className="text-xs sm:text-sm font-black uppercase tracking-[0.25em] text-neutral-400">
            CULTURE SPOTLIGHT & PROMOS
          </h2>
        </div>
        
        {/* Slide Counter Badges */}
        <div className="flex items-center gap-1.5 bg-neutral-900/80 border border-neutral-800 px-3 py-1 rounded-full text-[11px] font-mono text-neutral-300">
          <span className="font-bold text-white">0{currentSlide + 1}</span>
          <span className="text-neutral-600">/</span>
          <span className="text-neutral-500">03</span>
        </div>
      </div>

      {/* Carousel Container */}
      <div className="relative w-full overflow-hidden rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] bg-neutral-950 border border-neutral-800 shadow-[0_25px_60px_rgba(0,0,0,0.9)] group min-h-[380px] sm:min-h-[440px] md:min-h-[480px] lg:min-h-[520px]">
        
        {/* ========================================================================= */}
        {/* SLIDE 1: Viral Gen Z Promo Video */}
        {/* ========================================================================= */}
        <div
          className={`absolute inset-0 w-full h-full transition-all duration-700 ease-in-out ${
            currentSlide === 0
              ? "opacity-100 scale-100 z-10 pointer-events-auto"
              : "opacity-0 scale-[1.02] pointer-events-none z-0"
          }`}
        >
          {/* Background Video */}
          <video
            ref={videoRef}
            src="/Create_a_premium_viral_Gen_Z.mp4"
            autoPlay
            muted={isMuted}
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover object-center"
          />

          {/* Cinematic Dark Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/60 sm:via-black/30 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent pointer-events-none hidden sm:block" />

          {/* Slide 1 Content */}
          <div className="relative z-10 h-full flex flex-col justify-between p-6 sm:p-8 md:p-12">
            {/* Top Badges & Video Controls */}
            <div className="flex items-center justify-between gap-3 w-full">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600/90 text-white font-black text-[9px] sm:text-[10px] px-3 py-1 uppercase tracking-wider shadow-lg backdrop-blur-sm animate-pulse">
                  <Flame className="w-3 h-3 fill-white" />
                  VIRAL CAMPAIGN
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-black/60 border border-white/20 text-neutral-300 font-bold text-[9px] sm:text-[10px] px-2.5 py-1 uppercase tracking-wider backdrop-blur-md">
                  GEN Z STREETWEAR 2026
                </span>
              </div>

              {/* Video Audio & Playback Quick Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={togglePlay}
                  className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-black/70 hover:bg-white hover:text-black text-white border border-white/20 backdrop-blur-md transition-all active:scale-90"
                  aria-label={isPlaying ? "Pause video" : "Play video"}
                  title={isPlaying ? "Pause video" : "Play video"}
                >
                  {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current translate-x-0.5" />}
                </button>
                <button
                  onClick={toggleMute}
                  className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-black/70 hover:bg-white hover:text-black text-white border border-white/20 backdrop-blur-md transition-all active:scale-90"
                  aria-label={isMuted ? "Unmute video" : "Mute video"}
                  title={isMuted ? "Unmute video" : "Mute video"}
                >
                  {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Bottom Hero Text & Actions */}
            <div className="max-w-xl space-y-3 sm:space-y-4">
              <div className="inline-block">
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.25em] text-neutral-400">
                  ZEBALPHA ORIGINAL FILM
                </span>
                <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white leading-tight drop-shadow-md">
                  CLOTHING FOR <br className="hidden sm:inline" />
                  <span className="bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
                    THE CULTURE
                  </span>
                </h3>
              </div>

              <p className="text-xs sm:text-sm text-neutral-300 font-medium max-w-md line-clamp-2 sm:line-clamp-3 leading-relaxed drop-shadow">
                Engineered for elevated self-expression. 100% combed cotton, architectural fits, and zero compromises.
              </p>

              <div className="pt-2 flex items-center gap-3 flex-wrap">
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 rounded-full bg-white text-black font-black text-xs uppercase tracking-[0.2em] px-6 py-3 hover:bg-neutral-200 transition-all active:scale-95 shadow-[0_0_25px_rgba(255,255,255,0.3)]"
                >
                  <span>Shop The Viral Drop</span>
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/products?category=Polos"
                  className="inline-flex items-center gap-2 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/25 font-bold text-xs uppercase tracking-wider px-5 py-3 backdrop-blur-md transition-all active:scale-95"
                >
                  <span>Explore Polos</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SLIDE 2: 50% Off Limited Introductory Drop Promo */}
        {/* ========================================================================= */}
        <div
          className={`absolute inset-0 w-full h-full transition-all duration-700 ease-in-out ${
            currentSlide === 1
              ? "opacity-100 scale-100 z-10 pointer-events-auto"
              : "opacity-0 scale-[1.02] pointer-events-none z-0"
          }`}
        >
          {/* Background Image / Ambient Backdrop */}
          <Image
            src="/banner-retro-cream.png"
            alt="Limited Release 50% Off Drop"
            fill
            sizes="100vw"
            className="w-full h-full object-cover object-center filter brightness-[0.45] saturate-125 scale-105"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/40 pointer-events-none" />

          {/* Slide 2 Content */}
          <div className="relative z-10 h-full flex flex-col justify-between p-6 sm:p-8 md:p-12">
            {/* Top Label */}
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/90 text-black font-black text-[9px] sm:text-[10px] px-3 py-1 uppercase tracking-wider shadow-lg">
                <Sparkles className="w-3 h-3 fill-black" />
                LIMITED PROMO CODE
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-neutral-400 uppercase tracking-widest">
                ✦ PAN-INDIA EXPRESS DELIVERY
              </span>
            </div>

            {/* Middle Feature Grid */}
            <div className="max-w-2xl space-y-4 my-auto">
              <div className="space-y-1">
                <span className="text-[11px] sm:text-xs font-black uppercase tracking-[0.25em] text-amber-400">
                  SEASON INTRODUCTORY DROP
                </span>
                <h3 className="text-2xl sm:text-3xl md:text-5xl font-black uppercase tracking-tight text-white leading-tight">
                  FLAT 50% OFF <br />
                  <span className="text-neutral-300 font-extrabold text-xl sm:text-2xl md:text-3xl">
                    ON ALL SIGNATURE ESSENTIALS
                  </span>
                </h3>
              </div>

              {/* Promo Code Copy Pill */}
              <div className="flex items-center gap-3 flex-wrap pt-1">
                <div className="flex items-center bg-black/80 border border-amber-400/40 rounded-2xl p-1.5 pl-4 backdrop-blur-md shadow-xl">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mr-2">Use Code:</span>
                  <span className="text-sm sm:text-base font-black tracking-[0.2em] text-amber-300 font-mono mr-3">ZEB50</span>
                  <button
                    onClick={() => handleCopyPromo("ZEB50")}
                    className="flex items-center gap-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-[10px] sm:text-xs px-3 py-1.5 transition-all active:scale-95 cursor-pointer"
                    aria-label="Copy promo code"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>COPIED!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>COPY CODE</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Highlights Pill */}
              <div className="hidden sm:flex items-center gap-4 text-xs text-neutral-300 font-medium pt-2">
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-emerald-400" /> 100% Quality Inspected</span>
                <span className="flex items-center gap-1.5"><Truck className="w-4 h-4 text-blue-400" /> Free Shipping Above ₹999</span>
                <span className="flex items-center gap-1.5"><Tag className="w-4 h-4 text-amber-400" /> Instant Checkout Discount</span>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 flex items-center gap-3">
              <Link
                href="/products?discount=50"
                className="inline-flex items-center gap-2 rounded-full bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-[0.2em] px-6 py-3 transition-all active:scale-95 shadow-[0_0_25px_rgba(251,191,36,0.3)]"
              >
                <span>Shop 50% Off Drop</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SLIDE 3: Supima & Heavyweight Luxury Archive */}
        {/* ========================================================================= */}
        <div
          className={`absolute inset-0 w-full h-full transition-all duration-700 ease-in-out ${
            currentSlide === 2
              ? "opacity-100 scale-100 z-10 pointer-events-auto"
              : "opacity-0 scale-[1.02] pointer-events-none z-0"
          }`}
        >
          {/* Background Image / Ambient Backdrop */}
          <Image
            src="/banner-premium-polo.png"
            alt="Zebalpha Luxury Archive"
            fill
            sizes="100vw"
            className="w-full h-full object-cover object-center filter brightness-[0.45] saturate-110 scale-105"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/40 pointer-events-none" />

          {/* Slide 3 Content */}
          <div className="relative z-10 h-full flex flex-col justify-between p-6 sm:p-8 md:p-12">
            {/* Top Label */}
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white text-black font-black text-[9px] sm:text-[10px] px-3 py-1 uppercase tracking-wider shadow-lg">
                ✦ LUXURY CRAFTSMANSHIP
              </span>
              <span className="text-[10px] sm:text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest">
                ARCHIVE DROP #04
              </span>
            </div>

            {/* Middle Content */}
            <div className="max-w-xl space-y-3 sm:space-y-4 my-auto">
              <div>
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.25em] text-neutral-400">
                  PREMIUM ZIP POLOS & HEAVYWEIGHT OVERSIZED TEES
                </span>
                <h3 className="text-2xl sm:text-3xl md:text-5xl font-black uppercase tracking-tight text-white leading-tight mt-1">
                  TEXTURED WEAVE. <br />
                  <span className="bg-gradient-to-r from-neutral-100 via-neutral-300 to-neutral-500 bg-clip-text text-transparent">
                    CONFIDENCE IN EVERY FIT.
                  </span>
                </h3>
              </div>

              <p className="text-xs sm:text-sm text-neutral-300 font-medium max-w-md leading-relaxed">
                Tailored from long-staple combed cotton with anti-pilling yarn. Engineered collar structure that retains its crisp shape wear after wear.
              </p>

              <div className="flex items-center gap-2.5 pt-1">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-300 bg-white/10 border border-white/15 px-3 py-1 rounded-full">
                  ✦ Pre-Shrunk Bio-Washed
                </span>
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-300 bg-white/10 border border-white/15 px-3 py-1 rounded-full">
                  ✦ 240-280 GSM Heavyweight
                </span>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-2 flex items-center gap-3">
              <Link
                href="/products?category=Polos"
                className="inline-flex items-center gap-2 rounded-full bg-white text-black font-black text-xs uppercase tracking-[0.2em] px-6 py-3 hover:bg-neutral-200 transition-all active:scale-95 shadow-lg"
              >
                <span>Explore Polos</span>
                <ArrowUpRight className="w-4 h-4" />
              </Link>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 font-bold text-xs uppercase tracking-wider px-5 py-3 backdrop-blur-md transition-all active:scale-95"
              >
                <span>View Full Catalog</span>
              </Link>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* Navigation Arrows */}
        {/* ========================================================================= */}
        <button
          onClick={() => setCurrentSlide((prev) => (prev - 1 + SLIDES_COUNT) % SLIDES_COUNT)}
          className="absolute left-3 sm:left-4 top-1/2 z-30 -translate-y-1/2 flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-black/75 text-white border border-white/20 backdrop-blur-md opacity-0 transition-all hover:bg-white hover:text-black hover:scale-110 group-hover:opacity-100 hidden md:flex shadow-2xl active:scale-95 cursor-pointer"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={() => setCurrentSlide((prev) => (prev + 1) % SLIDES_COUNT)}
          className="absolute right-3 sm:right-4 top-1/2 z-30 -translate-y-1/2 flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-black/75 text-white border border-white/20 backdrop-blur-md opacity-0 transition-all hover:bg-white hover:text-black hover:scale-110 group-hover:opacity-100 hidden md:flex shadow-2xl active:scale-95 cursor-pointer"
          aria-label="Next slide"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* ========================================================================= */}
        {/* Bottom Slide Tabs / Indicators */}
        {/* ========================================================================= */}
        <div className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2 flex items-center gap-2 sm:gap-3 px-4 w-full max-w-[320px] sm:max-w-[420px]">
          {[
            { label: "Viral Film", index: 0 },
            { label: "50% Off Code", index: 1 },
            { label: "Luxury Fit", index: 2 },
          ].map((tab) => {
            const isActive = tab.index === currentSlide;
            return (
              <button
                key={tab.index}
                onClick={() => setCurrentSlide(tab.index)}
                className="group/tab relative flex-1 py-1 text-left cursor-pointer"
                aria-label={`Jump to slide ${tab.index + 1}: ${tab.label}`}
              >
                {/* Visual Progress Bar */}
                <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/20 backdrop-blur-md">
                  <div
                    className={`absolute inset-0 bg-white transition-all ease-linear ${
                      isActive ? "w-full" : "w-0"
                    }`}
                    style={{
                      transitionDuration: isActive && !isHovered ? (currentSlide === 0 ? "9000ms" : "6500ms") : "0ms",
                    }}
                  />
                </div>
                {/* Text Label on larger screens */}
                <span className={`hidden sm:block text-[9px] font-bold uppercase tracking-wider mt-1 text-center truncate transition-colors ${
                  isActive ? "text-white" : "text-white/40 group-hover/tab:text-white/70"
                }`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

      </div>
    </section>
  );
}
