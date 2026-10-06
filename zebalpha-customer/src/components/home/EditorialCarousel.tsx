"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { EditorialCard, EditorialItemData } from "./EditorialCard";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

interface EditorialCarouselProps {
  items: EditorialItemData[];
  autoPlayInterval?: number; // ms
}

export function EditorialCarousel({
  items,
  autoPlayInterval = 3500,
}: EditorialCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setIsReducedMotion(mediaQuery.matches);

      const handleChange = (e: MediaQueryListEvent) => setIsReducedMotion(e.matches);
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, []);

  const handleNext = useCallback(() => {
    if (items.length === 0) return;
    setActiveIndex((prev) => (prev + 1) % items.length);
  }, [items.length]);

  const handlePrev = useCallback(() => {
    if (items.length === 0) return;
    setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
  }, [items.length]);

  // Continuous Right-to-Left Auto Play
  useEffect(() => {
    if (isPaused || isDragging || isReducedMotion || items.length <= 1) return;

    const timer = setInterval(() => {
      handleNext();
    }, autoPlayInterval);

    return () => clearInterval(timer);
  }, [isPaused, isDragging, isReducedMotion, items.length, autoPlayInterval, handleNext]);

  // Keyboard navigation support
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") {
      handlePrev();
    } else if (e.key === "ArrowRight") {
      handleNext();
    }
  };

  // Pointer/Touch Drag handlers for smooth horizontal swipe
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
    setIsPaused(true);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    const diffX = e.clientX - dragStartX;

    // Swipe threshold (50px)
    if (diffX < -50) {
      handleNext();
    } else if (diffX > 50) {
      handlePrev();
    }
    // Resume auto-play after short delay
    setTimeout(() => setIsPaused(false), 2000);
  };

  if (!items || items.length === 0) return null;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="region"
      aria-label="Woven to Be Remembered Editorial Carousel"
      onKeyDown={handleKeyDown}
      className="relative w-full py-10 sm:py-16 overflow-hidden select-none outline-none focus-visible:ring-1 focus-visible:ring-white/40 rounded-3xl"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => {
        if (!isDragging) setIsPaused(false);
      }}
    >
      {/* Background Subtle Curved Arc Guidelines */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
        <div className="w-[120%] h-[300px] rounded-[100%] border-b border-rose-500/30 transform translate-y-16" />
      </div>

      {/* Curved Card Tray Container */}
      <div
        className="relative flex items-center justify-center min-h-[420px] sm:min-h-[480px] touch-pan-y"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        {items.map((item, index) => {
          // Calculate relative circular offset from activeIndex
          let offset = index - activeIndex;
          const half = Math.floor(items.length / 2);

          // Handle wrap-around math for smooth infinite visual feel
          if (offset > half) offset -= items.length;
          if (offset < -half) offset += items.length;

          // Hide items further out than +/- 2 from view to optimize DOM rendering
          if (Math.abs(offset) > 3) return null;

          const isActive = index === activeIndex;

          return (
            <div
              key={item.id}
              onClick={() => {
                if (!isActive) setActiveIndex(index);
              }}
              style={{
                position: "absolute",
                left: `calc(50% + ${offset * (typeof window !== "undefined" && window.innerWidth < 640 ? 170 : 250)}px - 140px)`,
              }}
            >
              <EditorialCard
                item={item}
                isActive={isActive}
                offset={offset}
                totalItems={items.length}
                isReducedMotion={isReducedMotion}
              />
            </div>
          );
        })}
      </div>

      {/* Bottom Controls Bar: Left/Right Buttons + Index Indicator + AutoPlay Toggle */}
      <div className="mt-8 flex items-center justify-between px-4 max-w-4xl mx-auto z-30 relative">
        {/* Editorial Counter ("01 / 06") */}
        <div className="flex items-center gap-3 text-xs font-black tracking-widest text-neutral-400 font-mono">
          <span className="text-white text-sm">
            {String(activeIndex + 1).padStart(2, "0")}
          </span>
          <span className="text-neutral-700">/</span>
          <span className="text-neutral-500">
            {String(items.length).padStart(2, "0")}
          </span>

          {/* Active indicator bar */}
          <div className="w-16 h-1 bg-neutral-800 rounded-full overflow-hidden ml-2 hidden sm:block">
            <div
              className="h-full bg-white transition-all duration-500 rounded-full"
              style={{
                width: `${((activeIndex + 1) / items.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Action Controls: Previous, Pause/Play, Next */}
        <div className="flex items-center gap-2">
          {/* Pause / Play status */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            aria-label={isPaused ? "Play Carousel" : "Pause Carousel"}
            className="p-2.5 rounded-full bg-neutral-900/80 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600 transition-colors cursor-pointer"
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>

          {/* Prev Button */}
          <button
            onClick={handlePrev}
            aria-label="Previous Editorial Card"
            className="p-3 rounded-full bg-neutral-900/90 border border-neutral-800 text-white hover:bg-white hover:text-black transition-all duration-300 shadow-md active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Next Button */}
          <button
            onClick={handleNext}
            aria-label="Next Editorial Card"
            className="p-3 rounded-full bg-neutral-900/90 border border-neutral-800 text-white hover:bg-white hover:text-black transition-all duration-300 shadow-md active:scale-95 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
