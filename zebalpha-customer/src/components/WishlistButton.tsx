"use client";

import { useWishlist } from "@/context/WishlistContext";
import { Product } from "@/lib/types";

export function WishlistButton({ product, className = "" }: { product: Product; className?: string }) {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const isWishlisted = isInWishlist(product.id);

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleWishlist(product);
      }}
      className={`group flex items-center justify-center transition-all duration-300 ${className}`}
      aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
    >
      <div
        className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full transition-all duration-300 shadow-md ${
          isWishlisted
            ? "bg-rose-50 text-rose-500 border border-rose-200/80"
            : "bg-white/90 text-slate-600 backdrop-blur-md border border-black/10 hover:bg-white hover:text-rose-500"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill={isWishlisted ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-4 w-4 transition-transform duration-300 group-hover:scale-110 ${isWishlisted ? "fill-rose-500" : ""}`}
        >
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
      </div>
    </button>
  );
}
