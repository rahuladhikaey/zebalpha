"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { SimilarProductItem } from "@/lib/similarProducts";
import { Product } from "@/lib/types";
import { DeliveryEstimateWidget } from "@/components/DeliveryEstimateWidget";
import { useCart } from "@/context/CartContext";
import { useVariantSelector } from "@/context/VariantSelectorContext";
import { IMAGE_VARIANTS } from "@/services/imageOptimizationService";
import {
  trackRecommendationClick,
  trackRecommendationImpressions,
} from "@/lib/recommendationClient";

interface SimilarProductsCarouselProps {
  products: SimilarProductItem[];
  title?: string;
  subtitle?: string;
  className?: string;
}

function SimilarProductCardItem({
  p,
  idx,
}: {
  p: SimilarProductItem;
  idx: number;
}) {
  const { addToCart } = useCart();
  const { openVariantSelector } = useVariantSelector();
  const [justAdded, setJustAdded] = useState(false);

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

  const brandName = (p.brand || "ZEBALPHA").trim();
  const isOutOfStock =
    (p.stock !== undefined && p.stock !== null && Number(p.stock) <= 0) ||
    p.status === "OUT_OF_STOCK";

  const handleCardClick = () => {
    trackRecommendationClick({
      productId: p.id,
      categoryId: p.category_id,
      surface: "similar_products",
      strategy: "product_similarity",
      positionIndex: idx,
    }).catch(() => {});
  };

  const handlePlusClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isOutOfStock) return;

    const pkgs = p.packages;
    const hasMultiplePkgs = Array.isArray(pkgs) && pkgs.length > 1;
    const pRecord = p as unknown as Record<string, unknown>;
    const hasUnselectedPkg = Array.isArray(pkgs) && pkgs.length > 0 && !pRecord.variant_id;
    const sizeChart = (p.specifications as Record<string, unknown> | null)?.size_chart;
    const mightHaveVariants = !pkgs && (p.category_id || sizeChart);

    if (hasMultiplePkgs || hasUnselectedPkg || mightHaveVariants) {
      openVariantSelector(p as unknown as Product);
      return;
    }

    addToCart(p as unknown as Product, 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1400);
  };

  return (
    <article
      data-testid="similar-product-card"
      className="group shrink-0 w-[165px] sm:w-[185px] md:w-[210px] snap-start flex flex-col justify-between rounded-[22px] sm:rounded-[24px] bg-[#FFF5F8] border border-[#FCE7F0] shadow-[0_4px_18px_rgba(244,114,182,0.08)] hover:shadow-[0_8px_24px_rgba(244,114,182,0.16)] transition-all duration-300 overflow-hidden select-none"
    >
      {/* Product Image Container */}
      <div className="relative aspect-[3/4] w-full bg-[#FCECEF]/60 overflow-hidden">
        <Link
          href={`/products/${p.id}`}
          onClick={handleCardClick}
          className="block h-full w-full"
          aria-label={p.name}
        >
          {primaryImage ? (
            <img
              src={IMAGE_VARIANTS.productGridCard(primaryImage)}
              alt={p.name}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-105"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-bold uppercase tracking-widest text-[#FF1E6F]/60">
              {brandName}
            </div>
          )}
        </Link>

        {/* Circular Hot-Pink Plus Button cleanly inside bottom-right of image */}
        <button
          type="button"
          data-photo-overlay="true"
          onClick={handlePlusClick}
          disabled={isOutOfStock}
          aria-label={justAdded ? "Added to Cart" : isOutOfStock ? "Out of Stock" : "Add to Cart"}
          title={justAdded ? "Added to Cart" : isOutOfStock ? "Out of Stock" : "Add to Cart"}
          className={`absolute bottom-2.5 right-2.5 sm:bottom-3 sm:right-3 z-20 flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-[#FF1E6F] text-white ring-2 ring-white/95 shadow-[0_4px_12px_rgba(255,30,111,0.42)] active:scale-90 transition-all duration-200 cursor-pointer ${
            isOutOfStock
              ? "opacity-50 cursor-not-allowed bg-zinc-400 shadow-none"
              : "hover:bg-[#E91E63] hover:scale-105"
          }`}
        >
          {justAdded ? (
            <Check size={16} strokeWidth={3} className="text-white" />
          ) : (
            <Plus size={16} strokeWidth={2.75} className="text-white" />
          )}
        </button>
      </div>

      {/* Product Info Block */}
      <div className="flex flex-1 flex-col justify-between p-3.5 sm:p-4 pt-3 sm:pt-3.5">
        <div className="space-y-1">
          {/* Brand Name in Pink */}
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#FF1E6F] truncate">
            {brandName}
          </p>

          {/* Title in Bold Black */}
          <Link
            href={`/products/${p.id}`}
            onClick={handleCardClick}
            className="block group/title"
          >
            <h3 className="text-sm sm:text-[15px] font-bold text-zinc-900 leading-snug line-clamp-2 min-h-[2.5rem] group-hover/title:text-[#FF1E6F] transition-colors">
              {p.name}
            </h3>
          </Link>

          {/* Pricing Row */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-base sm:text-lg font-black text-zinc-900 tracking-tight">
              ₹{sellingPrice.toLocaleString("en-IN")}
            </span>
            {mrp > sellingPrice && (
              <>
                <span className="text-xs sm:text-sm font-medium text-zinc-400 line-through">
                  ₹{mrp.toLocaleString("en-IN")}
                </span>
                {discountPct > 0 && (
                  <span className="text-[10px] sm:text-[11px] font-bold text-[#E11D48] bg-[#FFE4EE] px-2 py-0.5 rounded-full inline-flex items-center">
                    {discountPct}% off
                  </span>
                )}
              </>
            )}
          </div>

          {/* Delivery Row */}
          <DeliveryEstimateWidget
            compact
            variant="pink"
            productId={p.id}
            sellerId={p.seller_id}
            className="pt-1.5"
          />
        </div>
      </div>
    </article>
  );
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

  useEffect(() => {
    if (!products || products.length === 0) return;
    trackRecommendationImpressions(
      "similar_products",
      products.slice(0, 12).map((item, idx) => ({
        productId: String(item.id),
        categoryId: item.category_id ? String(item.category_id) : null,
        strategy: "product_similarity",
        positionIndex: idx,
      }))
    ).catch(() => {});
  }, [products]);

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
            <span className="h-5 w-1 rounded-full bg-gradient-to-b from-[#FF1E6F] to-[#E11D48]" />
            <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
              {title}
            </h2>
            <span className="text-[10px] font-bold text-[#FF1E6F] bg-[#FFE4EE] px-2 py-0.5 rounded-full">
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
        className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 pt-1 scroll-smooth no-scrollbar snap-x snap-mandatory touch-pan-x"
        style={{
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {products.map((p, idx) => (
          <SimilarProductCardItem key={p.id} p={p} idx={idx} />
        ))}
      </div>
    </section>
  );
}
