"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { 
  Volume2, 
  VolumeX, 
  Sparkles, 
  Flame, 
  ShieldCheck,
  Truck,
  Crown,
  ChevronLeft,
  ChevronRight
} from "lucide-react";

export function AdShowcaseSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  
  const video1Ref = useRef<HTMLVideoElement>(null);
  const video2Ref = useRef<HTMLVideoElement>(null);

  const SLIDES_COUNT = 3;

  // Auto rotate slides smoothly
  useEffect(() => {
    // Give adequate showcase time for video slides (0 and 1) and card slide (2)
    const slideDuration = currentSlide === 2 ? 7000 : 9500;
    
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES_COUNT);
    }, slideDuration);

    return () => clearInterval(interval);
  }, [currentSlide]);

  // Video autoplay & synchronization handling
  useEffect(() => {
    if (currentSlide === 0) {
      if (video1Ref.current) {
        video1Ref.current.currentTime = 0;
        video1Ref.current.play().catch(() => {});
      }
      if (video2Ref.current) {
        video2Ref.current.pause();
      }
    } else if (currentSlide === 1) {
      if (video2Ref.current) {
        video2Ref.current.currentTime = 0;
        video2Ref.current.play().catch(() => {});
      }
      if (video1Ref.current) {
        video1Ref.current.pause();
      }
    } else {
      if (video1Ref.current) video1Ref.current.pause();
      if (video2Ref.current) video2Ref.current.pause();
    }
  }, [currentSlide]);

  const toggleMute = () => {
    const nextMuted = !isMuted;
    if (video1Ref.current) video1Ref.current.muted = nextMuted;
    if (video2Ref.current) video2Ref.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handlePrev = () => {
    setCurrentSlide((prev) => (prev - 1 + SLIDES_COUNT) % SLIDES_COUNT);
  };

  const handleNext = () => {
    setCurrentSlide((prev) => (prev + 1) % SLIDES_COUNT);
  };

  return (
    <section 
      className="my-14 sm:my-18 lg:my-20 w-full select-none"
      aria-label="Featured Campaigns and Visual Showcase"
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

      {/* Carousel Showcase Display Container */}
      <div className="group relative w-full overflow-hidden rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] bg-neutral-950 border border-neutral-800/80 shadow-[0_25px_60px_rgba(0,0,0,0.9)] min-h-[380px] sm:min-h-[440px] md:min-h-[480px] lg:min-h-[520px]">
        
        {/* ========================================================================= */}
        {/* SLIDE 1: Viral Gen Z Promo Video Display */}
        {/* ========================================================================= */}
        <div
          className={`absolute inset-0 w-full h-full transition-all duration-700 ease-in-out ${
            currentSlide === 0
              ? "opacity-100 scale-100 z-10 pointer-events-auto"
              : "opacity-0 scale-[1.02] pointer-events-none z-0"
          }`}
        >
          {/* Background Video 1 */}
          <video
            ref={video1Ref}
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
            {/* Top Badges & Audio Toggle */}
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

              {/* Audio Toggle */}
              <button
                onClick={toggleMute}
                className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-black/70 hover:bg-white hover:text-black text-white border border-white/20 backdrop-blur-md transition-all active:scale-90 cursor-pointer shadow-lg"
                aria-label={isMuted ? "Unmute video" : "Mute video"}
                title={isMuted ? "Unmute video" : "Mute video"}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Bottom Hero Text */}
            <div className="max-w-xl space-y-2.5 sm:space-y-3 pb-10 sm:pb-8">
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

              {/* Features Tag Pills */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/20 text-white font-bold text-[9px] sm:text-[10px] px-3 py-1 uppercase tracking-wider backdrop-blur-md">
                  ✦ 100% Combed Cotton
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 border border-white/20 text-white font-bold text-[9px] sm:text-[10px] px-3 py-1 uppercase tracking-wider backdrop-blur-md">
                  ✦ Signature Boxy Cut
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SLIDE 2: 2nd Ad Video Display (create_best_ad_video_best_the.mp4) */}
        {/* ========================================================================= */}
        <div
          className={`absolute inset-0 w-full h-full transition-all duration-700 ease-in-out ${
            currentSlide === 1
              ? "opacity-100 scale-100 z-10 pointer-events-auto"
              : "opacity-0 scale-[1.02] pointer-events-none z-0"
          }`}
        >
          {/* Background Video 2 */}
          <video
            ref={video2Ref}
            src="/create_best_ad_video_best_the.mp4"
            autoPlay
            muted={isMuted}
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover object-center"
          />

          {/* Cinematic Dark Gradient Overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/60 sm:via-black/30 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent pointer-events-none hidden sm:block" />

          {/* Slide 2 Content */}
          <div className="relative z-10 h-full flex flex-col justify-between p-6 sm:p-8 md:p-12">
            {/* Top Badges & Audio Toggle */}
            <div className="flex items-center justify-between gap-3 w-full">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 text-black font-black text-[9px] sm:text-[10px] px-3 py-1 uppercase tracking-wider shadow-lg backdrop-blur-sm animate-pulse">
                  <Sparkles className="w-3 h-3 fill-black" />
                  EXCLUSIVE PROMO FILM
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-black/60 border border-white/20 text-neutral-300 font-bold text-[9px] sm:text-[10px] px-2.5 py-1 uppercase tracking-wider backdrop-blur-md">
                  LIMITED RELEASE DROP
                </span>
              </div>

              {/* Audio Toggle */}
              <button
                onClick={toggleMute}
                className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-black/70 hover:bg-white hover:text-black text-white border border-white/20 backdrop-blur-md transition-all active:scale-90 cursor-pointer shadow-lg"
                aria-label={isMuted ? "Unmute video" : "Mute video"}
                title={isMuted ? "Unmute video" : "Mute video"}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Bottom Hero Text */}
            <div className="max-w-2xl space-y-3 pb-10 sm:pb-8">
              <div className="space-y-1">
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.25em] text-amber-400">
                  SEASON INTRODUCTORY DROP
                </span>
                <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white leading-tight drop-shadow-md">
                  FLAT 50% OFF <br />
                  <span className="bg-gradient-to-r from-amber-200 via-yellow-300 to-amber-500 bg-clip-text text-transparent font-black">
                    ON SIGNATURE ESSENTIALS
                  </span>
                </h3>
              </div>

              {/* Promo Code Display Badge */}
              <div className="flex items-center gap-3 flex-wrap pt-0.5">
                <div className="inline-flex items-center bg-black/80 border border-amber-400/60 rounded-xl px-3.5 py-1.5 backdrop-blur-md shadow-xl">
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-neutral-400 mr-2">Promo Code:</span>
                  <span className="text-sm sm:text-base font-black tracking-[0.25em] text-amber-300 font-mono">ZEB50</span>
                </div>
              </div>

              {/* Highlights Pill */}
              <div className="flex items-center gap-2.5 sm:gap-3.5 text-[11px] sm:text-xs text-neutral-300 font-medium pt-1 flex-wrap">
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> 100% Quality Inspected</span>
                <span className="flex items-center gap-1.5"><Truck className="w-3.5 h-3.5 text-blue-400" /> Free Express Shipping</span>
              </div>
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
                <Crown className="w-3 h-3 fill-black" />
                LUXURY CRAFTSMANSHIP
              </span>
              <span className="text-[10px] sm:text-xs font-mono font-bold text-neutral-400 uppercase tracking-widest">
                ARCHIVE DROP #04
              </span>
            </div>

            {/* Middle Content */}
            <div className="max-w-xl space-y-3 pb-10 sm:pb-8">
              <div>
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.25em] text-neutral-400">
                  PREMIUM ZIP POLOS & HEAVYWEIGHT OVERSIZED TEES
                </span>
                <h3 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white leading-tight mt-1">
                  TEXTURED WEAVE. <br />
                  <span className="bg-gradient-to-r from-neutral-100 via-neutral-300 to-neutral-500 bg-clip-text text-transparent">
                    CONFIDENCE IN EVERY FIT.
                  </span>
                </h3>
              </div>

              <p className="text-xs sm:text-sm text-neutral-300 font-medium max-w-md leading-relaxed">
                Tailored from long-staple combed cotton with anti-pilling yarn. Engineered collar structure that retains its crisp shape wear after wear.
              </p>

              <div className="flex items-center gap-2.5 pt-1 flex-wrap">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-300 bg-white/10 border border-white/15 px-3 py-1 rounded-full">
                  ✦ Pre-Shrunk Bio-Washed
                </span>
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-neutral-300 bg-white/10 border border-white/15 px-3 py-1 rounded-full">
                  ✦ 240-280 GSM Heavyweight
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={handlePrev}
          className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-black/60 text-white border border-white/20 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:text-black hover:scale-105 active:scale-95 cursor-pointer shadow-xl hidden sm:flex"
          aria-label="Previous slide"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={handleNext}
          className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 flex h-9 w-9 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-black/60 text-white border border-white/20 backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all hover:bg-white hover:text-black hover:scale-105 active:scale-95 cursor-pointer shadow-xl hidden sm:flex"
          aria-label="Next slide"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* ========================================================================= */}
        {/* Bottom Slide Interactive Progress Indicators */}
        {/* ========================================================================= */}
        <div className="absolute bottom-4 left-1/2 z-30 -translate-x-1/2 flex items-center gap-2 sm:gap-3 px-4 w-full max-w-[280px] sm:max-w-[380px]">
          {[
            { label: "Viral Film 01", index: 0 },
            { label: "Exclusive Ad 02", index: 1 },
            { label: "Luxury Fit 03", index: 2 },
          ].map((tab) => {
            const isActive = tab.index === currentSlide;
            return (
              <button
                key={tab.index}
                onClick={() => setCurrentSlide(tab.index)}
                className="group/indicator relative flex-1 py-1 text-left cursor-pointer transition-transform active:scale-95"
                aria-label={`Go to slide ${tab.index + 1}`}
              >
                {/* Visual Progress Bar */}
                <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/20 backdrop-blur-md transition-colors group-hover/indicator:bg-white/30">
                  <div
                    className={`absolute inset-0 bg-white transition-all ease-linear ${
                      isActive ? "w-full" : "w-0"
                    }`}
                    style={{
                      transitionDuration: isActive ? (currentSlide === 2 ? "7000ms" : "9500ms") : "0ms",
                    }}
                  />
                </div>
                {/* Text Label on larger screens */}
                <span className={`hidden sm:block text-[9px] font-bold uppercase tracking-wider mt-1.5 text-center truncate transition-colors ${
                  isActive ? "text-white font-extrabold" : "text-white/40 group-hover/indicator:text-white/70"
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

