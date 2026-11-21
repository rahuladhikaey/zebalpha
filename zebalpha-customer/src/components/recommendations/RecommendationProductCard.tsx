"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Plus, Check, Star } from "lucide-react";
import { WishlistButton } from "@/components/WishlistButton";
import { DeliveryEstimateWidget } from "@/components/DeliveryEstimateWidget";
import { useCart } from "@/context/CartContext";
import { useVariantSelector } from "@/context/VariantSelectorContext";
import { isProductNewDrop, isDropLive } from "@/lib/dropUtils";
import { trackRecommendationClick } from "@/lib/recommendationClient";
import { IMAGE_VARIANTS } from "@/services/imageOptimizationService";
import { Product } from "@/lib/types";
import type {
  RecommendationSurface,
  RecommendedProductCard,
} from "@/lib/recommendationScoring";

interface RecommendationProductCardProps {
  product: Product | RecommendedProductCard;
  surface?: RecommendationSurface;
  positionIndex?: number;
  className?: string;
}

export function RecommendationProductCard({
  product,
  surface,
  positionIndex = 0,
  className = "",
}: RecommendationProductCardProps) {
  const { addToCart } = useCart();
  const { openVariantSelector } = useVariantSelector();
  const [justAdded, setJustAdded] = useState(false);

  const sellingPrice = Number(product.price) || 0;
  const mrp =
    product.mrp != null && !isNaN(Number(product.mrp)) ? Number(product.mrp) : 0;
  const hasValidDiscount = mrp > sellingPrice && mrp > 0;
  const discountPct =
    hasValidDiscount
      ? ("discount_percentage" in product && typeof product.discount_percentage === "number"
          ? product.discount_percentage
          : Math.round(((mrp - sellingPrice) / mrp) * 100))
      : 0;

  const primaryImage =
    ("thumbnail_url" in product && typeof product.thumbnail_url === "string" && product.thumbnail_url
      ? product.thumbnail_url
      : product.image_url ||
        (Array.isArray(product.images) && product.images[0]) ||
        "");

  const isUpcomingDrop = isProductNewDrop(product) && !isDropLive(product);
  const isOutOfStock =
    !isUpcomingDrop &&
    ((product.stock !== undefined && product.stock !== null && Number(product.stock) <= 0) ||
      product.status === "OUT_OF_STOCK");

  const productHref = `/products/${product.id}`;

  const handleCardClick = () => {
    if (surface) {
      trackRecommendationClick({
        productId: product.id,
        categoryId: product.category_id,
        surface,
        strategy:
          "recommendation_strategy" in product && product.recommendation_strategy
            ? product.recommendation_strategy
            : "hybrid",
        positionIndex,
      }).catch(() => {});
    }
  };

  const handlePlusClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isUpcomingDrop || isOutOfStock) return;

    // If item has sizes/packages or specs requiring choice, open variant selector bottom sheet
    const pkgs = product.packages;
    const hasMultiplePkgs = Array.isArray(pkgs) && pkgs.length > 1;
    const productRecord = product as Record<string, unknown>;
    const hasUnselectedPkg = Array.isArray(pkgs) && pkgs.length > 0 && !productRecord.variant_id;
    const sizeChart = (product.specifications as Record<string, unknown> | null)?.size_chart;
    const mightHaveVariants = !pkgs && (product.category_id || sizeChart);

    if (hasMultiplePkgs || hasUnselectedPkg || mightHaveVariants) {
      openVariantSelector(product);
      return;
    }

    addToCart(product, 1);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1400);
  };

  const brandName = (product.brand || "ZEBALPHA").trim();
  const hasValidRating = typeof product.rating === "number" && product.rating > 0;

  return (
    <article
      data-testid="recommendation-product-card"
      className={`group relative flex flex-col justify-between rounded-[22px] sm:rounded-[24px] bg-[#FFF5F8] border border-[#FCE7F0] shadow-[0_4px_18px_rgba(244,114,182,0.08)] hover:shadow-[0_8px_24px_rgba(244,114,182,0.16)] transition-all duration-300 overflow-hidden select-none ${className}`}
    >
      {/* Product Image Holder */}
      <div className="relative aspect-[3/4] w-full bg-[#FCECEF]/60 overflow-hidden">
        <Link
          href={productHref}
          onClick={handleCardClick}
          className="block h-full w-full"
          aria-label={product.name}
        >
          {primaryImage ? (
            <img
              src={IMAGE_VARIANTS.productGridCard(primaryImage)}
              alt={product.name}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-bold uppercase tracking-widest text-[#FF1E6F]/60">
              {brandName}
            </div>
          )}
        </Link>

        {/* Wishlist Button at top-right of image */}
        <div className="absolute right-2.5 top-2.5 z-10">
          <WishlistButton product={product} />
        </div>

        {/* Optional Rating Badge (if verified reviews exist) */}
        {hasValidRating && (
          <div className="absolute bottom-2.5 left-2.5 sm:bottom-3 sm:left-3 z-10 inline-flex items-center gap-1 rounded-md bg-white/90 backdrop-blur-sm border border-pink-100 px-1.5 py-0.5 text-[10px] font-black text-zinc-900 shadow-sm">
            <span>{Number(product.rating).toFixed(1)}</span>
            <Star size={9} className="fill-[#FF1E6F] text-[#FF1E6F]" />
          </div>
        )}

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

      {/* Content Section below image */}
      <div className="flex flex-1 flex-col justify-between p-3.5 sm:p-4 pt-3 sm:pt-3.5">
        <div className="space-y-1">
          {/* Brand Name in Vibrant Pink */}
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-[#FF1E6F] truncate">
            {brandName}
          </p>

          {/* Product Title in Bold Black */}
          <Link
            href={productHref}
            onClick={handleCardClick}
            className="block group/title"
          >
            <h3 className="text-sm sm:text-[15px] font-bold text-zinc-900 leading-snug line-clamp-2 min-h-[2.5rem] group-hover/title:text-[#FF1E6F] transition-colors">
              {product.name}
            </h3>
          </Link>

          {/* Price Row: Selling Price + Strikethrough MRP + Soft Pink Discount Pill */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <span className="text-base sm:text-lg font-black text-zinc-900 tracking-tight">
              ₹{sellingPrice.toLocaleString("en-IN")}
            </span>
            {hasValidDiscount && (
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

          {/* Delivery Row: Pink Truck + "Delivery by DD – DD MMM" */}
          <DeliveryEstimateWidget
            compact
            variant="pink"
            productId={product.id}
            sellerId={product.seller_id}
            className="pt-1.5"
          />
        </div>
      </div>
    </article>
  );
}
