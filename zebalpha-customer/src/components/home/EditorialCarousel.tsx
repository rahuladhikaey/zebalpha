"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { EditorialCard, EditorialItemData } from "./EditorialCard";

interface EditorialCarouselProps {
  items: EditorialItemData[];
  speed?: number; // pixels per second for right-to-left auto-scroll
  autoPlayInterval?: number;
}

export function EditorialCarousel({
  items,
  speed = 35, // smooth subtle glide speed
}: EditorialCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollPos, setScrollPos] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartScroll, setDragStartScroll] = useState(0);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [windowWidth, setWindowWidth] = useState<number>(typeof window !== "undefined" ? window.innerWidth : 1200);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [scrollDir, setScrollDir] = useState<1 | -1>(1); // 1 = moving right, -1 = moving left
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Check prefers-reduced-motion & container width & window width
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      setIsReducedMotion(mq.matches);
      const updateDimensions = () => {
        setWindowWidth(window.innerWidth);
        if (containerRef.current) {
          setContainerWidth(containerRef.current.clientWidth);
        }
      };
      updateDimensions();
      window.addEventListener("resize", updateDimensions);
      return () => window.removeEventListener("resize", updateDimensions);
    }
  }, []);

  const isMobile = windowWidth < 640;
  const isTablet = windowWidth >= 640 && windowWidth < 1024;

  const cardWidth = windowWidth < 640 ? 170 : windowWidth < 768 ? 220 : windowWidth < 1024 ? 260 : 280;
  const cardGap = windowWidth < 640 ? 12 : windowWidth < 768 ? 14 : 16;

  // Single set: Every uploaded card is rendered EXACTLY ONCE (never duplicated 3 times)
  const totalContentWidth = items.length * (cardWidth + cardGap) - cardGap;
  const canScroll = containerWidth > 0 && totalContentWidth > containerWidth - 32;
  const maxScroll = Math.max(0, totalContentWidth - containerWidth + 64);

  // Smooth Gentle Auto-glide across cards if content overflows (no item duplication)
  const animate = useCallback(
    (time: number) => {
      if (lastTimeRef.current !== null && !isPaused && !isDragging && !isReducedMotion && canScroll && maxScroll > 0) {
        const delta = (time - lastTimeRef.current) / 1000;
        setScrollPos((prev) => {
          let next = prev + speed * delta * scrollDir;
          if (next >= maxScroll) {
            setScrollDir(-1);
            return maxScroll;
          } else if (next <= 0) {
            setScrollDir(1);
            return 0;
          }
          return next;
        });
      }
      lastTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    },
    [isPaused, isDragging, isReducedMotion, speed, canScroll, maxScroll, scrollDir]
  );

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  // Dragging / Touch Swiping Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!canScroll) return;
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragStartScroll(scrollPos);
    setIsPaused(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !canScroll) return;
    const diffX = dragStartX - e.clientX;
    let newPos = dragStartScroll + diffX;
    if (newPos < 0) newPos = 0;
    if (newPos > maxScroll) newPos = maxScroll;
    setScrollPos(newPos);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    setTimeout(() => setIsPaused(false), 2500);
  };

  // Manual scroll buttons
  const scrollLeft = () => {
    setScrollPos((prev) => Math.max(0, prev - (cardWidth + cardGap) * 1.5));
  };

  const scrollRight = () => {
    setScrollPos((prev) => Math.min(maxScroll, prev + (cardWidth + cardGap) * 1.5));
  };

  if (!items || items.length === 0) return null;

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Woven to Be Remembered Fashion Carousel"
      className="relative w-full py-4 sm:py-8 overflow-hidden select-none outline-none group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => {
        if (!isDragging) setIsPaused(false);
      }}
    >
      {/* Background Subtle Curved Arc Line */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-15">
        <div className="w-[110%] h-[220px] sm:h-[260px] rounded-[100%] border-b-2 border-amber-500/40 transform translate-y-10 sm:translate-y-12" />
      </div>

      {/* Manual Navigation Controls (shown only when cards overflow and can scroll) */}
      {canScroll && (
        <>
          <button
            type="button"
            onClick={scrollLeft}
            aria-label="Previous cards"
            className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md border border-zinc-700/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xl"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={scrollRight}
            aria-label="Next cards"
            className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md border border-zinc-700/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xl"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Interactive Curved Tray */}
      <div
        className={`relative w-full min-h-[280px] sm:min-h-[360px] md:min-h-[420px] flex items-center touch-pan-y ${
          canScroll ? "cursor-grab active:cursor-grabbing" : "justify-center"
        } overflow-hidden px-4`}
        onPointerDown={canScroll ? handlePointerDown : undefined}
        onPointerMove={canScroll ? handlePointerMove : undefined}
        onPointerUp={canScroll ? handlePointerUp : undefined}
        onPointerCancel={canScroll ? handlePointerUp : undefined}
      >
        <div
          className={`flex items-center ${canScroll ? "absolute left-0" : "relative justify-center"}`}
          style={{
            gap: `${cardGap}px`,
            transform: canScroll ? `translateX(${-scrollPos}px)` : "none",
            willChange: canScroll ? "transform" : "auto",
          }}
        >
          {items.map((item, idx) => {
            let cardCenter = 0;
            if (canScroll) {
              const cardLeft = idx * (cardWidth + cardGap) - scrollPos;
              cardCenter = cardLeft + cardWidth / 2;
            } else {
              // Centered items: calculate position relative to screen center
              const centerIdx = (items.length - 1) / 2;
              const offsetFromCenter = (idx - centerIdx) * (cardWidth + cardGap);
              cardCenter = containerWidth / 2 + offsetFromCenter;
            }
            const screenCenter = containerWidth / 2;

            const t = containerWidth > 0 ? (cardCenter - screenCenter) / (containerWidth * 0.45) : 0;
            const absT = Math.min(1.5, Math.abs(t));
            const translateY = isReducedMotion ? 0 : Math.pow(absT, 1.8) * (isMobile ? 8 : isTablet ? 20 : 32);
            const rotateDeg = isReducedMotion ? 0 : t * (isMobile ? 1.5 : isTablet ? 3.5 : 5.5);
            const scale = isReducedMotion ? 1 : Math.max(0.92, 1.04 - Math.abs(t) * (isMobile ? 0.04 : 0.08));

            return (
              <EditorialCard
                key={item.id}
                item={item}
                translateY={translateY}
                rotateDeg={rotateDeg}
                scale={scale}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
