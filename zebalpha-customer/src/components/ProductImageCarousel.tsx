"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export default function ProductImageCarousel({
  images,
  productName,
}: {
  images: string[];
  productName: string;
}) {
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
        className="relative overflow-hidden rounded-[3rem] bg-white shadow-2xl shadow-slate-200/50"
        onMouseDown={onStart}
        onMouseMove={onMove}
        onMouseUp={onEnd}
        onMouseLeave={() => isDragging && onEnd()}
        onTouchStart={onStart}
        onTouchMove={onMove}
        onTouchEnd={onEnd}
      >
        {/* Sliding Track */}
        <div
          ref={sliderRef}
          className="flex transition-transform duration-500 ease-[cubic-bezier(0.4,0,0.2,1)]"
          style={{ transform: `translateX(${currentIndex * -100}%)` }}
        >
          {normalizedImages.map((img, idx) => (
            <div key={idx} className="flex-none w-full p-2">
              <div className="relative overflow-hidden rounded-[2.5rem] bg-white group shadow-sm border border-slate-100 flex items-center justify-center min-h-[320px] sm:min-h-[450px] md:min-h-[550px] aspect-square w-full">
                <img
                  src={img || "/placeholder.jpg"}
                  alt={`${productName} - View ${idx + 1}`}
                  className="h-full w-full object-contain p-4 transition-transform duration-500 rounded-[2.5rem]"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Controls */}
      {totalSlides > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-6 top-1/2 -translate-y-1/2 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-black/80 backdrop-blur-xl border border-white/20 shadow-xl hover:bg-black transition-all hover:scale-110 active:scale-95 group cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5 text-white group-hover:scale-110 transition-transform" />
          </button>

          <button
            onClick={handleNext}
            className="absolute right-6 top-1/2 -translate-y-1/2 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-black/80 backdrop-blur-xl border border-white/20 shadow-xl hover:bg-black transition-all hover:scale-110 active:scale-95 group cursor-pointer"
          >
            <ChevronRight className="h-5 w-5 text-white group-hover:scale-110 transition-transform" />
          </button>

          <div className="flex items-center justify-center gap-2 mt-8">
            {Array.from({ length: totalSlides }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentIndex(idx)}
                className={`transition-all duration-500 rounded-full ${idx === currentIndex
                    ? "bg-white h-2 w-10 shadow-lg shadow-white/20"
                    : "bg-zinc-700 h-2 w-2 hover:bg-zinc-500"
                  }`}
              />
            ))}
          </div>
        </>
      )}

      {/* Footer Info */}
      <div className="mt-6 flex items-center justify-between px-2 text-[10px] font-black uppercase tracking-widest text-zinc-400">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span>Interactive Gallery</span>
        </div>
        <span className="text-zinc-500">
          Slide to explore
        </span>
      </div>
    </div>
  );
}
