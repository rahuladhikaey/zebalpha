"use client";

import { Plus, Minus, Clock } from "lucide-react";
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
  const { cart, addToCart, updateQty, openProductDetail } = useZebQuick();

  const img =
    product.image_url ||
    (Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : "") ||
    "/official-logo-sm.png";

  const price = Number(product.zeb_quick_price || 0);
  const mrp = Number(product.mrp || 0);
  const discountPct = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const defaultSize = Array.isArray(product.sizes) && product.sizes.length > 0 ? String(product.sizes[0]) : undefined;
  const cartItem = cart.find((c) => c.id === product.id && (c.size || "") === (defaultSize || ""));
  const qty = cartItem?.quantity || 0;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart({
      id: product.id,
      source_product_id: product.source_product_id || product.id,
      seller_id: product.seller_id,
      title: product.title,
      image_url: img,
      price,
      mrp: mrp || null,
      size: defaultSize,
      pickup_pincode: product.pickup_pincode,
    });
  };

  return (
    <div
      onClick={() => openProductDetail(product)}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.03)] transition hover:shadow-md cursor-pointer"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-neutral-50 p-2">
        <img
          src={img}
          alt={product.title}
          loading="lazy"
          className="h-full w-full rounded-xl object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Blinkit-style floating ADD / - 1 + Toggle on bottom-right of image */}
        {qty === 0 ? (
          <button
            type="button"
            onClick={handleQuickAdd}
            className="absolute bottom-2 right-2 inline-flex h-7 items-center gap-1 rounded-lg border border-emerald-600 bg-white px-2.5 text-[11px] font-black text-emerald-700 shadow-xs transition hover:bg-emerald-600 hover:text-white active:scale-95 cursor-pointer"
          >
            <Plus className="h-3 w-3" />
            ADD
          </button>
        ) : (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-2 right-2 inline-flex h-7 items-center gap-2 rounded-lg bg-[#0C831F] px-2 text-[11px] font-black text-white shadow-sm"
          >
            <button
              type="button"
              onClick={() => updateQty(product.id, defaultSize, undefined, qty - 1)}
              aria-label="Decrease quantity"
              className="flex h-5 w-4 items-center justify-center cursor-pointer"
            >
              <Minus className="h-3 w-3 stroke-[2.5]" />
            </button>
            <span className="min-w-[12px] text-center">{qty}</span>
            <button
              type="button"
              onClick={() => updateQty(product.id, defaultSize, undefined, qty + 1)}
              aria-label="Increase quantity"
              className="flex h-5 w-4 items-center justify-center cursor-pointer"
            >
              <Plus className="h-3 w-3 stroke-[2.5]" />
            </button>
          </div>
        )}
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
