"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { EditorialCard, EditorialItemData } from "./EditorialCard";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";

interface EditorialCarouselProps {
  items: EditorialItemData[];
  speed?: number; // pixels per second for right-to-left auto-scroll
  autoPlayInterval?: number;
}

export function EditorialCarousel({
  items,
  speed = 45, // smooth right-to-left scroll speed
}: EditorialCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollPos, setScrollPos] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartScroll, setDragStartScroll] = useState(0);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      setIsReducedMotion(mq.matches);
      const updateWidth = () => {
        if (containerRef.current) {
          setContainerWidth(containerRef.current.clientWidth);
        }
      };
      updateWidth();
      window.addEventListener("resize", updateWidth);
      return () => window.removeEventListener("resize", updateWidth);
    }
  }, []);

  // Card geometry parameters
  const cardWidth = typeof window !== "undefined" && window.innerWidth < 640 ? 240 : 310;
  const cardGap = 16;
  const singleSetWidth = items.length * (cardWidth + cardGap);
  // Duplicate array 3 times for seamless infinite loop
  const displayItems = [...items, ...items, ...items];

  // Continuous Right-to-Left Animation Loop via requestAnimationFrame
  const animate = useCallback(
    (time: number) => {
      if (lastTimeRef.current !== null && !isPaused && !isDragging && !isReducedMotion && singleSetWidth > 0) {
        const delta = (time - lastTimeRef.current) / 1000;
        setScrollPos((prev) => {
          let next = prev + speed * delta;
          // Wrap around seamlessly
          if (next >= singleSetWidth) {
            next = next % singleSetWidth;
          }
          return next;
        });
      }
      lastTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    },
    [isPaused, isDragging, isReducedMotion, speed, singleSetWidth]
  );

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  // Dragging / Touch Swiping Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
    setDragStartScroll(scrollPos);
    setIsPaused(true);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const diffX = dragStartX - e.clientX;
    let newPos = dragStartScroll + diffX;
    if (newPos < 0) newPos += singleSetWidth;
    if (newPos >= singleSetWidth) newPos %= singleSetWidth;
    setScrollPos(newPos);
  };

  const handlePointerUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    setTimeout(() => setIsPaused(false), 2000);
  };

  const handlePrev = () => {
    setScrollPos((prev) => {
      let next = prev - (cardWidth + cardGap);
      if (next < 0) next += singleSetWidth;
      return next;
    });
  };

  const handleNext = () => {
    setScrollPos((prev) => {
      let next = prev + (cardWidth + cardGap);
      if (next >= singleSetWidth) next %= singleSetWidth;
      return next;
    });
  };

  if (!items || items.length === 0) return null;

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Woven to Be Remembered Fashion Carousel"
      className="relative w-full py-8 sm:py-14 overflow-hidden select-none outline-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => {
        if (!isDragging) setIsPaused(false);
      }}
    >
      {/* Background Curved Guideline */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-15">
        <div className="w-[110%] h-[260px] rounded-[100%] border-b-2 border-amber-500/40 transform translate-y-12" />
      </div>

      {/* Interactive Drag Tray */}
      <div
        className="relative w-full min-h-[380px] sm:min-h-[440px] flex items-center touch-pan-y cursor-grab active:cursor-grabbing overflow-hidden"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div
          className="flex items-center gap-4 absolute left-0"
          style={{
            transform: `translateX(${-scrollPos}px)`,
            willChange: "transform",
          }}
        >
          {displayItems.map((item, idx) => {
            // Calculate real-time screen position of this card center
            const cardLeft = idx * (cardWidth + cardGap) - scrollPos;
            const cardCenter = cardLeft + cardWidth / 2;
            const screenCenter = containerWidth / 2;

            // Relative offset t from screen center (-1 to +1)
            const t = containerWidth > 0 ? (cardCenter - screenCenter) / (containerWidth * 0.45) : 0;

            // Parabolic curve calculation: center is flat (0px), sides bow upward (15-35px)
            const absT = Math.min(1.5, Math.abs(t));
            const translateY = isReducedMotion ? 0 : Math.pow(absT, 1.8) * 32;
            const rotateDeg = isReducedMotion ? 0 : t * 5.5; // Left cards tilt right, right cards tilt left
            const scale = isReducedMotion ? 1 : Math.max(0.9, 1.04 - Math.abs(t) * 0.08);

            return (
              <EditorialCard
                key={`${item.id}-${idx}`}
                item={item}
                translateY={translateY}
                rotateDeg={rotateDeg}
                scale={scale}
              />
            );
          })}
        </div>
      </div>

      {/* Footer Controls matching Reference Photo */}
      <div className="mt-4 flex items-center justify-between px-2 sm:px-4 max-w-6xl mx-auto relative z-20">
        {/* Subtitle tag */}
        <div className="flex items-center gap-2 text-[10px] sm:text-xs font-mono tracking-widest text-neutral-500 uppercase">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <span>CURVED FASHION GALLERY</span>
        </div>

        {/* Action Controls: Pause, Prev, Next */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            aria-label={isPaused ? "Play Auto Scroll" : "Pause Auto Scroll"}
            className="p-2.5 rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600 transition-colors cursor-pointer"
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handlePrev}
            aria-label="Previous Item"
            className="p-3 rounded-full bg-neutral-900 border border-neutral-800 text-white hover:bg-white hover:text-black transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={handleNext}
            aria-label="Next Item"
            className="p-3 rounded-full bg-neutral-900 border border-neutral-800 text-white hover:bg-white hover:text-black transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
