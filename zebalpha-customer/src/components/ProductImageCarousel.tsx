"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { IMAGE_VARIANTS } from "@/services/imageOptimizationService";
import { useIsNativeApp } from "@/lib/platform";

export default function ProductImageCarousel({
  images,
  productName,
  topRightAction,
}: {
  images: string[];
  productName: string;
  topRightAction?: React.ReactNode;
}) {
  const isNativeApp = useIsNativeApp();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const safeImages = Array.isArray(images) ? images.filter(Boolean) : [];
  const normalizedImages = safeImages.length > 0 ? safeImages : ["/placeholder.jpg"];

  const sliderRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>(0);
  const startPosRef = useRef(0);
  const currentTranslateRef = useRef(0);
  const prevTranslateRef = useRef(0);

  const itemsPerSlide = 1;
  const totalSlides = normalizedImages.length;

  // Reset to first slide when image set changes (e.g. on color variant selection)
  useEffect(() => {
    setCurrentIndex(0);
  }, [images]);

  // Sync state to ref for animation loop
  useEffect(() => {
    const translate = currentIndex * -100;
    currentTranslateRef.current = translate;
    prevTranslateRef.current = translate;
    if (sliderRef.current) {
      sliderRef.current.style.transform = `translateX(${translate}%)`;
    }
  }, [currentIndex]);

  // Auto-advance
  useEffect(() => {
    if (isDragging || totalSlides <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalSlides);
    }, 5000);
    return () => clearInterval(interval);
  }, [totalSlides, isDragging]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  // ANIMATION LOOP
  const setSliderPosition = useCallback(() => {
    if (sliderRef.current) {
      sliderRef.current.style.transform = `translateX(${currentTranslateRef.current}%)`;
    }
  }, []);

  const animation = useCallback(() => {
    setSliderPosition();
    if (isDragging) {
      animationRef.current = requestAnimationFrame(animation);
    }
  }, [isDragging, setSliderPosition]);

  // TOUCH / MOUSE EVENTS
  const getPositionX = (event: React.TouchEvent | React.MouseEvent) => {
    return "touches" in event ? event.touches[0].clientX : event.clientX;
  };

  const onStart = (event: React.TouchEvent | React.MouseEvent) => {
    setIsDragging(true);
    startPosRef.current = getPositionX(event);
    animationRef.current = requestAnimationFrame(animation);
    if (sliderRef.current) {
      sliderRef.current.style.transition = "none";
    }
  };

  const onMove = (event: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return;
    const currentPosition = getPositionX(event);
    const diff = ((currentPosition - startPosRef.current) / (sliderRef.current?.offsetWidth || 1)) * 100;
    currentTranslateRef.current = prevTranslateRef.current + diff;
  };

  const onEnd = () => {
    setIsDragging(false);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    const movedBy = currentTranslateRef.current - prevTranslateRef.current;

    if (sliderRef.current) {
      sliderRef.current.style.transition = "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)";
    }

    if (movedBy < -15 && currentIndex < totalSlides - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (movedBy > 15 && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      // Snap back
      const translate = currentIndex * -100;
      currentTranslateRef.current = translate;
      prevTranslateRef.current = translate;
      setSliderPosition();
    }
  };

  return (
    <div className="relative w-full select-none">

      {/* Main Carousel Container */}
      <div
        className={`relative overflow-hidden rounded-3xl sm:rounded-[2.5rem] border shadow-2xl ${
          isNativeApp
            ? "bg-white border-[#E4C988] shadow-[0_10px_28px_-14px_rgba(160,115,20,0.22)]"
            : "bg-zinc-950 border-zinc-800"
        }`}
        onMouseDown={onStart}
        onMouseMove={onMove}
        onMouseUp={onEnd}
        onMouseLeave={() => isDragging && onEnd()}
        onTouchStart={onStart}
        onTouchMove={onMove}
        onTouchEnd={onEnd}
      >
        {/* Top-Right Photo Action Slot (Flipkart-style Wishlist Heart overlay) */}
        {topRightAction && (
          <div
            data-photo-overlay="true"
            className="absolute top-3.5 right-3.5 sm:top-5 sm:right-5 z-30"
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >
            {topRightAction}
          </div>
        )}

        {/* Sliding Track */}
        <div
          ref={sliderRef}
          className="flex transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{ transform: `translateX(${currentIndex * -100}%)` }}
        >
          {normalizedImages.map((img, idx) => {
            const isVisibleOrAdjacent =
              idx === currentIndex ||
              idx === (currentIndex + 1) % totalSlides ||
              idx === (currentIndex - 1 + totalSlides) % totalSlides;
            const optimizedSrc = IMAGE_VARIANTS.productDetailMain(img);

            return (
              <div key={idx} className="flex-none w-full p-1 sm:p-2">
                <div
                  className={`relative overflow-hidden rounded-[1.35rem] sm:rounded-[2rem] flex items-center justify-center w-full aspect-square sm:aspect-[4/5] lg:aspect-[3/4] min-h-[290px] sm:min-h-[440px] md:min-h-[540px] max-h-[680px] ${
                    isNativeApp ? "bg-[#FFFDF8]" : "bg-zinc-950"
                  }`}
                >
                  {isVisibleOrAdjacent ? (
                    <img
                      src={optimizedSrc || "/placeholder.jpg"}
                      alt={`${productName} - View ${idx + 1}`}
                      loading={idx === 0 ? "eager" : "lazy"}
                      decoding="async"
                      fetchPriority={idx === 0 ? "high" : "low"}
                      className="h-full w-full object-contain transition-transform duration-300"
                    />
                  ) : (
                    <div
                      className={`w-full h-full animate-pulse ${
                        isNativeApp ? "bg-[#FAF0D1]/60" : "bg-zinc-900/40"
                      }`}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Navigation Controls */}
      {totalSlides > 1 && (
        <>
          <button
            onClick={handlePrev}
            data-photo-overlay="true"
            className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-black/75 backdrop-blur-xl border border-white/20 shadow-xl hover:bg-black transition-all hover:scale-110 active:scale-95 group cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5 text-white group-hover:scale-110 transition-transform" />
          </button>

          <button
            onClick={handleNext}
            data-photo-overlay="true"
            className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-black/75 backdrop-blur-xl border border-white/20 shadow-xl hover:bg-black transition-all hover:scale-110 active:scale-95 group cursor-pointer"
          >
            <ChevronRight className="h-5 w-5 text-white group-hover:scale-110 transition-transform" />
          </button>

          <div className="flex items-center justify-center gap-2 mt-3 sm:mt-5">
            {Array.from({ length: totalSlides }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`transition-all duration-500 rounded-full ${
                  idx === currentIndex
                    ? isNativeApp
                      ? "bg-[#D97706] h-2 w-8 shadow-sm"
                      : "bg-white h-2 w-10 shadow-lg shadow-white/20"
                    : isNativeApp
                      ? "bg-[#D4A017]/35 h-2 w-2 hover:bg-[#D97706]/70"
                      : "bg-zinc-700 h-2 w-2 hover:bg-zinc-500"
                }`}
              />
            ))}
          </div>
        </>
      )}

      {/* Footer Info */}
      <div
        className={`mt-2 sm:mt-3.5 flex items-center justify-between px-1.5 text-[10px] font-black uppercase tracking-widest ${
          isNativeApp ? "text-[#4A3F2B]" : "text-zinc-400"
        }`}
      >
        <div className="flex items-center gap-2">
          <div
            className={`w-1.5 h-1.5 rounded-full animate-pulse ${
              isNativeApp ? "bg-[#D97706]" : "bg-white"
            }`}
          />
          <span>Interactive Gallery</span>
        </div>
        <span className={isNativeApp ? "text-[#6B5B3E]" : "text-zinc-500"}>
          Slide to explore
        </span>
      </div>
    </div>
  );
}
