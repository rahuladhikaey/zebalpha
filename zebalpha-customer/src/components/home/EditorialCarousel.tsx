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

  // Check prefers-reduced-motion & container width
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

  const cardWidth = typeof window !== "undefined" && window.innerWidth < 640 ? 240 : 310;
  const cardGap = 16;
  const singleSetWidth = items.length * (cardWidth + cardGap);
  const displayItems = [...items, ...items, ...items];

  // Continuous Right-to-Left Animation Loop via requestAnimationFrame
  const animate = useCallback(
    (time: number) => {
      if (lastTimeRef.current !== null && !isPaused && !isDragging && !isReducedMotion && singleSetWidth > 0) {
        const delta = (time - lastTimeRef.current) / 1000;
        setScrollPos((prev) => {
          let next = prev + speed * delta;
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

  if (!items || items.length === 0) return null;

  return (
    <div
      ref={containerRef}
      role="region"
      aria-label="Woven to Be Remembered Fashion Carousel"
      className="relative w-full py-6 sm:py-10 overflow-hidden select-none outline-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => {
        if (!isDragging) setIsPaused(false);
      }}
    >
      {/* Background Subtle Curved Arc Line */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-15">
        <div className="w-[110%] h-[260px] rounded-[100%] border-b-2 border-amber-500/40 transform translate-y-12" />
      </div>

      {/* Interactive Curved Tray */}
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
            const cardLeft = idx * (cardWidth + cardGap) - scrollPos;
            const cardCenter = cardLeft + cardWidth / 2;
            const screenCenter = containerWidth / 2;

            const t = containerWidth > 0 ? (cardCenter - screenCenter) / (containerWidth * 0.45) : 0;
            const absT = Math.min(1.5, Math.abs(t));
            const translateY = isReducedMotion ? 0 : Math.pow(absT, 1.8) * 32;
            const rotateDeg = isReducedMotion ? 0 : t * 5.5;
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
    </div>
  );
}
