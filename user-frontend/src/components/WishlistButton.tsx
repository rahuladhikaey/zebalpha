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
      <div className={`flex items-center justify-center rounded-full p-2.5 transition-all duration-300 ${isWishlisted ? "bg-rose-50 text-rose-500" : "bg-white/80 text-slate-400 backdrop-blur-sm hover:bg-white hover:text-rose-400 shadow-sm"}`}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill={isWishlisted ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`h-5 w-5 transition-transform duration-300 group-hover:scale-110 ${isWishlisted ? "fill-rose-500" : ""}`}
        >
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </svg>
      </div>
    </button>
  );
}
