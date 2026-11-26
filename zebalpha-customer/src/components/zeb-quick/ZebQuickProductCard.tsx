"use client";

import { Heart, Plus, Clock, Check } from "lucide-react";
import { useState } from "react";
import { useZebQuick } from "@/context/ZebQuickContext";

export interface ZebQuickProductRecord {
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
  zeb_quick_price: number;
  mrp?: number | null;
  zeb_quick_stock: number;
  pickup_pincode: string;
  delivery_eta_label?: string;
}

export function ZebQuickProductCard({ product }: { product: ZebQuickProductRecord }) {
  const { addToCart, toggleWishlist, isWishlisted } = useZebQuick();
  const [added, setAdded] = useState(false);

  const img =
    product.image_url ||
    (Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : "") ||
    "/official-logo-sm.png";

  const price = Number(product.zeb_quick_price || 0);
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
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.03)] transition hover:shadow-md">
      <div className="relative aspect-square w-full overflow-hidden bg-neutral-50 p-2">
        <img
          src={img}
          alt={product.title}
          loading="lazy"
          className="h-full w-full rounded-xl object-cover transition-transform duration-300 group-hover:scale-105"
        />

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            toggleWishlist(product.id);
          }}
          aria-label="Toggle ZebQuick Wishlist"
          className="absolute top-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-neutral-600 shadow-xs backdrop-blur-xs transition active:scale-90 cursor-pointer"
        >
          <Heart className={`h-3.5 w-3.5 ${wishlisted ? "fill-rose-500 text-rose-500" : "text-neutral-600"}`} />
        </button>

        {/* Blinkit-style floating ADD button on bottom-right of image */}
        <button
          type="button"
          onClick={handleQuickAdd}
          className={`absolute bottom-2 right-2 inline-flex h-7 items-center gap-1 rounded-lg border px-2.5 text-[11px] font-black shadow-xs transition active:scale-95 cursor-pointer ${
            added
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-emerald-600 bg-white text-emerald-700 hover:bg-emerald-600 hover:text-white"
          }`}
        >
          {added ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {added ? "ADDED" : "ADD"}
        </button>
      </div>

      <div className="flex flex-1 flex-col justify-between p-2.5 pt-1.5">
        <div>
          <div className="flex items-center gap-1 text-[10px] font-bold text-neutral-500">
            <Clock className="h-3 w-3 text-emerald-600" />
            <span>5–6 hrs</span>
            {defaultSize && <span className="ml-auto rounded bg-neutral-100 px-1.5 py-0.5 text-[9px] font-bold text-neutral-600">{defaultSize}</span>}
          </div>
          <h3 className="mt-1 line-clamp-2 text-xs font-bold text-neutral-900 leading-snug">
            {product.title}
          </h3>
        </div>

        <div className="mt-2 flex items-baseline gap-1.5 flex-wrap">
          <span className="text-sm font-black text-neutral-950">₹{price}</span>
          {mrp > price && <span className="text-[11px] text-neutral-400 line-through">₹{mrp}</span>}
          {discountPct > 0 && (
            <span className="text-[10px] font-extrabold text-blue-600">{discountPct}% OFF</span>
          )}
        </div>
      </div>
    </div>
  );
}
