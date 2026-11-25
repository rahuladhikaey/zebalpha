"use client";

import Link from "next/link";
import { Heart, Plus, Zap, Check } from "lucide-react";
import { useState } from "react";
import { useGoAlpha } from "@/context/GoAlphaContext";

export interface GoAlphaProductRecord {
  id: string;
  source_product_id: string;
  seller_id: string;
  subcategory_slug: string;
  category_group: string;
  title: string;
  image_url?: string | null;
  images?: string[];
  sizes?: string[];
  colors?: string[];
  go_alpha_price: number;
  mrp?: number | null;
  go_alpha_stock: number;
  pickup_pincode: string;
  delivery_eta_label?: string;
}

export function GoAlphaProductCard({ product }: { product: GoAlphaProductRecord }) {
  const { addToCart, toggleWishlist, isWishlisted } = useGoAlpha();
  const [added, setAdded] = useState(false);

  const img =
    product.image_url ||
    (Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : "") ||
    "/official-logo-sm.png";

  const price = Number(product.go_alpha_price || 0);
  const mrp = Number(product.mrp || 0);
  const discountPct = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const wishlisted = isWishlisted(product.id);
  const defaultSize = Array.isArray(product.sizes) && product.sizes.length > 0 ? String(product.sizes[0]) : undefined;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart({
      id: product.id,
      source_product_id: product.source_product_id,
      seller_id: product.seller_id,
      title: product.title,
      image_url: img,
      price,
      mrp: mrp || null,
      size: defaultSize,
      pickup_pincode: product.pickup_pincode,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-xs transition hover:shadow-md">
      <div className="relative aspect-[4/4.3] w-full overflow-hidden bg-orange-50/40">
        <img
          src={img}
          alt={product.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-[#EE2B00] px-2 py-0.5 text-[10px] font-black text-white shadow-xs">
          <Zap className="h-2.5 w-2.5 fill-white" />
          5–6 Hr
        </div>
        {discountPct > 0 && (
          <div className="absolute bottom-2 left-2 rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
            {discountPct}% OFF
          </div>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            toggleWishlist(product.id);
          }}
          aria-label="Toggle ZebQuick Wishlist"
          className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-neutral-700 shadow-xs backdrop-blur-xs transition active:scale-90 cursor-pointer"
        >
          <Heart className={`h-4 w-4 ${wishlisted ? "fill-[#EE2B00] text-[#EE2B00]" : "text-neutral-700"}`} />
        </button>
      </div>

      <div className="flex flex-1 flex-col justify-between p-2.5">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-orange-600 truncate">
            {product.category_group}
          </p>
          <h3 className="mt-0.5 line-clamp-2 text-xs font-bold text-neutral-900 leading-snug">
            {product.title}
          </h3>
        </div>

        <div className="mt-2.5 flex items-center justify-between gap-1.5">
          <div className="flex items-baseline gap-1">
            <span className="text-sm font-black text-neutral-950">₹{price}</span>
            {mrp > price && <span className="text-[11px] text-neutral-400 line-through">₹{mrp}</span>}
          </div>

          <button
            type="button"
            onClick={handleQuickAdd}
            className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-extrabold transition active:scale-95 cursor-pointer ${
              added
                ? "bg-emerald-600 text-white"
                : "border border-[#EE2B00] bg-orange-50 text-[#EE2B00] hover:bg-[#EE2B00] hover:text-white"
            }`}
          >
            {added ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {added ? "Added" : "ADD"}
          </button>
        </div>
      </div>
    </div>
  );
}
