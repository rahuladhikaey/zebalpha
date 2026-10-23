"use client";

import React from "react";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useVariantSelector } from "@/context/VariantSelectorContext";
import { Product } from "@/lib/types";
import { useIsNativeApp } from "@/lib/platform";

export function QuickCartButton({
  product,
  className = "",
}: {
  product: Product;
  className?: string;
}) {
  const { cart, addToCart } = useCart();
  const { openVariantSelector } = useVariantSelector();
  const isNativeApp = useIsNativeApp();

  const isUpcomingDrop = (product as any).is_new_drop && !(product as any).is_drop_live;
  const isOutOfStock =
    (product.stock !== undefined && Number(product.stock) <= 0) ||
    product.status === "OUT_OF_STOCK";

  // Check if item is already in cart (sum across any selected variants)
  const matchingItems = cart.filter(
    (item) => String(item.id) === String(product.id)
  );
  const totalQuantity = matchingItems.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0);
  const isInCart = totalQuantity > 0;
  const quantity = totalQuantity;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isUpcomingDrop || isOutOfStock) return;

    // Check if product requires variant selection
    const pkgs = product.packages;
    const hasMultiplePkgs = Array.isArray(pkgs) && pkgs.length > 1;
    const hasUnselectedPkg = Array.isArray(pkgs) && pkgs.length > 0 && !(product as any).variant_id;
    const mightHaveVariants = !pkgs && (product.category_id || (product as any).specifications?.size_chart);

    if (hasMultiplePkgs || hasUnselectedPkg || mightHaveVariants) {
      openVariantSelector(product);
      return;
    }

    // Direct add if no variants needed
    addToCart(product, 1);
  };

  const normalStyle = isNativeApp
    ? "bg-emerald-600 text-white backdrop-blur-md border border-emerald-500/50 hover:bg-emerald-500 hover:scale-110 shadow-lg shadow-emerald-600/30"
    : "bg-white/90 text-neutral-900 backdrop-blur-md border border-white/60 hover:bg-white hover:scale-110 hover:shadow-xl";

  const inCartStyle = isNativeApp
    ? "bg-emerald-700 text-white border border-emerald-400 shadow-lg scale-105"
    : "bg-black text-white border border-neutral-700 shadow-lg scale-105";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isOutOfStock}
      aria-label={isInCart ? `${quantity} in cart` : "Add to cart"}
      title={isInCart ? `${quantity} in cart` : "Add to cart"}
      className={`group/cart flex items-center justify-center rounded-full p-2 sm:p-2.5 transition-all duration-300 shadow-md cursor-pointer select-none ${
        isInCart
          ? inCartStyle
          : isOutOfStock
          ? "bg-neutral-900/60 text-neutral-500 border border-neutral-800 cursor-not-allowed opacity-50"
          : normalStyle
      } ${className}`}
    >
      {isInCart ? (
        <span className="text-[10px] font-black leading-none">{quantity}</span>
      ) : (
        <ShoppingBag className="w-4 h-4 transition-transform duration-200 group-hover/cart:scale-110" />
      )}
    </button>
  );
}
