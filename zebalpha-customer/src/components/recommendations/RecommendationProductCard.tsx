"use client";

import React from "react";
import Link from "next/link";
import { Star, Award, Sparkles } from "lucide-react";
import { WishlistButton } from "@/components/WishlistButton";
import { AddToCartButton } from "@/components/AddToCartButton";
import { useIsNativeApp } from "@/lib/platform";
import { trackRecommendationClick } from "@/lib/recommendationClient";
import type {
  RecommendationSurface,
  RecommendedProductCard,
} from "@/lib/recommendationScoring";

interface RecommendationProductCardProps {
  product: RecommendedProductCard;
  surface: RecommendationSurface;
  positionIndex: number;
  className?: string;
}

export function RecommendationProductCard({
  product,
  surface,
  positionIndex,
  className = "",
}: RecommendationProductCardProps) {
  const isNativeApp = useIsNativeApp();

  const sellingPrice = Number(product.price) || 0;
  const mrp =
    product.mrp != null && !isNaN(Number(product.mrp)) ? Number(product.mrp) : 0;
  const hasValidDiscount = mrp > sellingPrice && mrp > 0;
  const discountPct =
    hasValidDiscount
      ? product.discount_percentage ?? Math.round(((mrp - sellingPrice) / mrp) * 100)
      : 0;

  const primaryImage =
    product.thumbnail_url ||
    product.image_url ||
    (Array.isArray(product.images) && product.images[0]) ||
    "";

  const hasValidRating =
    typeof product.rating === "number" && product.rating > 0;

  const productHref = `/products/${product.id}`;

  const handleCardClick = () => {
    trackRecommendationClick({
      productId: product.id,
      categoryId: product.category_id,
      surface,
      strategy: product.recommendation_strategy || "hybrid",
      positionIndex,
    }).catch(() => {});
  };

  return (
    <article
      data-testid="recommendation-product-card"
      className={`group relative flex flex-col justify-between rounded-2xl transition-all duration-300 overflow-hidden ${
        isNativeApp
          ? "bg-[#FFFDF8] border border-[#E5C882]/85 shadow-[0_8px_22px_rgba(166,124,28,0.10)] hover:border-[#C28D12]"
          : "bg-gradient-to-b from-zinc-900/95 via-zinc-950 to-black border border-zinc-800/90 hover:border-emerald-500/60 shadow-[0_8px_24px_rgba(0,0,0,0.6)] hover:shadow-[0_12px_32px_rgba(16,185,129,0.16)]"
      } ${className}`}
    >
      {/* Image & Overlay Badges */}
      <div className={`relative aspect-[4/5] w-full overflow-hidden ${isNativeApp ? "bg-[#FAF3E1]" : "bg-zinc-900"}`}>
        <Link
          href={productHref}
          onClick={handleCardClick}
          className="block h-full w-full"
          aria-label={product.name}
        >
          {primaryImage ? (
            <img
              src={primaryImage}
              alt={product.name}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-bold uppercase tracking-widest text-zinc-600">
              ZebAlpha
            </div>
          )}
        </Link>

        {/* Subtle Dark Gradient Overlay at Bottom & Top for Readable Badges */}
        <div
          data-photo-overlay="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/50 to-transparent"
        />
        <div
          data-photo-overlay="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/65 to-transparent"
        />

        {/* Bestseller / Badge Indicator (Only when real DB qualifies) */}
        {(product.is_bestseller || product.badge_label) && (
          <div
            data-photo-overlay="true"
            className={`pointer-events-none absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider backdrop-blur-md border ${
              isNativeApp
                ? "border-[#FCE38A]/70 bg-[#14120F]/85 text-[#FDE047] shadow-md"
                : "border-emerald-400/50 bg-black/80 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.28)]"
            }`}
          >
            {product.is_bestseller ? (
              <Award className={`h-2.5 w-2.5 ${isNativeApp ? "text-[#FDE047]" : "text-emerald-400"}`} />
            ) : (
              <Sparkles className={`h-2.5 w-2.5 ${isNativeApp ? "text-[#FDE047]" : "text-emerald-400"}`} />
            )}
            <span>{product.is_bestseller ? "Bestseller" : product.badge_label}</span>
          </div>
        )}

        {/* Wishlist Action */}
        <div className="absolute right-1.5 top-1.5 z-10 scale-[0.82] origin-top-right">
          <WishlistButton product={product} />
        </div>

        {/* Real Verified Rating Pill (Shown ONLY when verified reviews exist) */}
        {hasValidRating && (
          <div
            data-photo-overlay="true"
            className={`pointer-events-none absolute bottom-2 left-2 z-10 inline-flex items-center gap-1 rounded-md bg-black/85 border px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm ${
              isNativeApp ? "border-[#EAB308]/55" : "border-emerald-500/40"
            }`}
          >
            <span>{Number(product.rating).toFixed(1)}</span>
            <Star className={`h-2.5 w-2.5 ${isNativeApp ? "fill-[#FDE047] text-[#FDE047]" : "fill-emerald-400 text-emerald-400"}`} />
            {typeof product.review_count === "number" && product.review_count > 0 && (
              <span className="text-zinc-300 font-medium">({product.review_count})</span>
            )}
          </div>
        )}
      </div>

      {/* Product Info + Cart Action */}
      <div className="flex flex-1 flex-col justify-between gap-2.5 p-2.5 sm:p-3">
        <div className="space-y-1">
          {product.brand && (
            <p className={`text-[10px] font-bold uppercase tracking-wider truncate ${isNativeApp ? "text-[#8E6208]" : "text-emerald-400/90"}`}>
              {product.brand}
            </p>
          )}
          <Link
            href={productHref}
            onClick={handleCardClick}
            className="block"
          >
            <h3 className={`text-xs sm:text-[13px] font-bold leading-snug line-clamp-2 transition-colors ${isNativeApp ? "text-[#14120F]" : "text-white group-hover:text-emerald-300"}`}>
              {product.name}
            </h3>
          </Link>

          {/* Price Row */}
          <div className="flex items-baseline gap-1.5 flex-wrap pt-0.5">
            <span className={`text-sm sm:text-[15px] font-black tracking-tight ${isNativeApp ? "text-[#111111]" : "text-white"}`}>
              ₹{sellingPrice.toLocaleString("en-IN")}
            </span>
            {hasValidDiscount && (
              <>
                <span className={`text-[11px] font-medium line-through ${isNativeApp ? "text-[#857860]" : "text-zinc-500"}`}>
                  ₹{mrp.toLocaleString("en-IN")}
                </span>
                {discountPct > 0 && (
                  <span className={`text-[10px] font-extrabold ${isNativeApp ? "text-[#15803D]" : "text-emerald-400"}`}>
                    {discountPct}% off
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Touch-Friendly Add to Cart Button */}
        <div
          className="pt-1"
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <AddToCartButton
            product={product}
            className={`w-full rounded-xl font-black uppercase tracking-wider transition-all active:scale-95 ${
              isNativeApp
                ? "min-h-[38px] text-[10px]"
                : "h-9 text-[10px] sm:text-[11px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500 hover:text-black hover:border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.12)]"
            }`}
          />
        </div>
      </div>
    </article>
  );
}
