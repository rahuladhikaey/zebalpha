"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import { Star, ChevronLeft, ChevronRight } from "lucide-react";
import { SimilarProductItem } from "@/lib/similarProducts";

interface SimilarProductsCarouselProps {
  products: SimilarProductItem[];
  title?: string;
  subtitle?: string;
  className?: string;
}

export default function SimilarProductsCarousel({
  products,
  title = "Similar Products",
  subtitle = "Customers viewing this item also viewed",
  className = "",
}: SimilarProductsCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  if (!products || products.length === 0) {
    return null;
  }

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const handleScroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === "left" ? -280 : 280;
      scrollContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <section className={`w-full py-4 ${className}`} aria-label={title}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5 px-1 sm:px-0">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {title}
            </h2>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/70 border border-emerald-800/80 px-2 py-0.5 rounded-full">
              {products.length} Items
            </span>
          </div>
          {subtitle && (
            <p className="text-xs text-zinc-400 font-medium mt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        {/* Desktop Carousel Navigation Arrows */}
        <div className="hidden sm:flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleScroll("left")}
            disabled={!canScrollLeft}
            aria-label="Scroll left"
            className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
              canScrollLeft
                ? "bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 active:scale-95 cursor-pointer"
                : "bg-zinc-950 border-zinc-850 text-zinc-600 opacity-40 cursor-default"
            }`}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={() => handleScroll("right")}
            disabled={!canScrollRight}
            aria-label="Scroll right"
            className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
              canScrollRight
                ? "bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 active:scale-95 cursor-pointer"
                : "bg-zinc-950 border-zinc-850 text-zinc-600 opacity-40 cursor-default"
            }`}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Horizontal Swipeable Track */}
      <div
        ref={scrollContainerRef}
        onScroll={checkScroll}
        className="flex gap-3 overflow-x-auto pb-3 pt-1 scroll-smooth no-scrollbar snap-x snap-mandatory touch-pan-x"
        style={{
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {products.map((p) => {
          const sellingPrice = Number(p.price) || 0;
          const mrp = p.mrp != null && !isNaN(Number(p.mrp)) ? Number(p.mrp) : 0;
          const discountPct =
            p.discount_percentage ??
            (mrp > sellingPrice && mrp > 0
              ? Math.round(((mrp - sellingPrice) / mrp) * 100)
              : 0);

          const primaryImage =
            p.thumbnail_url ||
            p.image_url ||
            (Array.isArray(p.images) && p.images[0]) ||
            "";

          const ratingVal = p.rating ? Number(p.rating).toFixed(1) : null;

          return (
            <Link
              key={p.id}
              href={`/products/${p.id}`}
              className="group shrink-0 w-[150px] sm:w-[175px] md:w-[190px] snap-start flex flex-col rounded-2xl bg-zinc-950/90 border border-zinc-850 hover:border-emerald-500/50 hover:shadow-[0_0_15px_rgba(34,197,94,0.18)] transition-all duration-200 overflow-hidden select-none active:scale-[0.98]"
            >
              {/* Product Image Container */}
              <div className="relative aspect-[3/4] w-full bg-zinc-900 overflow-hidden flex items-center justify-center">
                {primaryImage ? (
                  <img
                    src={primaryImage}
                    alt={p.name}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                    onError={(e) => {
                      // Fallback placeholder on broken image
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600 text-[10px] font-bold uppercase tracking-wider">
                    ZebAlpha
                  </div>
                )}

                {/* Rating Badge (Bottom Left of Photo - Flipkart Style) */}
                {ratingVal && (
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-black/85 backdrop-blur-md px-1.5 py-0.5 text-[10px] font-black text-white shadow-md border border-white/10">
                    <span>{ratingVal}</span>
                    <Star
                      size={9}
                      className="text-emerald-400 fill-emerald-400"
                    />
                  </div>
                )}
              </div>

              {/* Product Info Block */}
              <div className="p-2.5 flex flex-col flex-1 justify-between gap-1.5">
                {/* Title */}
                <h3
                  className="text-xs font-medium text-zinc-200 line-clamp-2 leading-snug group-hover:text-white transition-colors"
                  title={p.name}
                >
                  {p.name}
                </h3>

                {/* Pricing Structure */}
                <div className="space-y-0.5 pt-0.5">
                  {/* Discount percent badge (Flipkart-style green highlight) */}
                  {discountPct > 0 && (
                    <div className="text-[11px] font-bold text-emerald-400 tracking-tight">
                      {discountPct}% OFF
                    </div>
                  )}

                  {/* MRP with strikethrough & Selling Price */}
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    {mrp > sellingPrice && (
                      <span className="text-[11px] text-zinc-500 line-through">
                        ₹{mrp.toLocaleString("en-IN")}
                      </span>
                    )}
                    <span className="text-xs sm:text-sm font-extrabold text-white">
                      ₹{sellingPrice.toLocaleString("en-IN")}
                    </span>
                  </div>

                  {/* Optional Real Highlight / Offer Label */}
                  {p.highlight_label && (
                    <div className="text-[10px] font-semibold text-sky-400 truncate pt-0.5">
                      {p.highlight_label}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
