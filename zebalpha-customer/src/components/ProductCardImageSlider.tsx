"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ProductCardImageSliderProps {
  images: string[];
  alt: string;
  href: string;
  discountPercent?: number;
  isPremium?: boolean;
  className?: string;
}

export function ProductCardImageSlider({
  images = [],
  alt,
  href,
  discountPercent,
  isPremium,
  className = "",
}: ProductCardImageSliderProps) {
  // Normalize image list (remove empty/null strings and duplicates)
  const validImages = Array.from(
    new Set(images.filter((img) => img && typeof img === "string" && img.trim().length > 0))
  );

  // If no valid image, fallback to placeholder
  const slideImages = validImages.length > 0 ? validImages : ["/placeholder.jpg"];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-slide on hover like top e-commerce platforms (Myntra, Zara, ASOS)
  useEffect(() => {
    if (isHovered && slideImages.length > 1) {
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % slideImages.length);
      }, 1600); // 1.6 seconds per image slide
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setCurrentIndex(0); // Reset to 1st image when mouse leaves
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isHovered, slideImages.length]);

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + slideImages.length) % slideImages.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % slideImages.length);
  };

  return (
    <div
      className="relative aspect-square w-full overflow-hidden bg-neutral-950 group/slider select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={href} className="relative block w-full h-full">
        {/* Images Sliding Container */}
        {slideImages.map((imgSrc, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 w-full h-full transition-opacity duration-500 ease-in-out ${
              idx === currentIndex ? "opacity-100 z-10 scale-100" : "opacity-0 z-0 scale-105"
            }`}
          >
            <Image
              src={imgSrc}
              alt={`${alt} - View ${idx + 1}`}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
              className="w-full h-full object-cover transition-transform duration-700 group-hover/slider:scale-108"
            />
          </div>
        ))}
      </Link>

      {/* 2D Animated Discount Badge */}
      {discountPercent !== undefined && discountPercent > 0 && (
        <div className="absolute top-2.5 left-2.5 z-20 bg-white text-black font-black uppercase tracking-wider rounded-md px-2 py-0.5 text-[10px] shadow-lg pointer-events-none">
          {discountPercent}% OFF
        </div>
      )}

      {/* 💎 Premium Store Badge */}
      {isPremium && (
        <div className="absolute top-2.5 right-2.5 z-20 bg-gradient-to-r from-amber-400 to-yellow-500 text-black font-black uppercase tracking-wider rounded-md px-2 py-0.5 text-[9px] shadow-lg flex items-center gap-1 pointer-events-none">
          <span>💎</span>
          <span>PREMIUM</span>
        </div>
      )}

      {/* Arrow Controls for manual slide on hover */}
      {slideImages.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-30 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur-md opacity-0 group-hover/slider:opacity-100 transition-opacity hover:bg-white hover:text-black cursor-pointer shadow-md"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-30 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white backdrop-blur-md opacity-0 group-hover/slider:opacity-100 transition-opacity hover:bg-white hover:text-black cursor-pointer shadow-md"
            aria-label="Next image"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}

      {/* Bottom E-commerce Slide Indicator Bars */}
      {slideImages.length > 1 && (
        <div className="absolute bottom-2 inset-x-3 z-20 flex items-center justify-center gap-1.5 pointer-events-none">
          {slideImages.map((_, idx) => (
            <div
              key={idx}
              className={`h-1 rounded-full transition-all duration-300 ${
                idx === currentIndex
                  ? "w-5 bg-white shadow-md"
                  : "w-1.5 bg-white/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
