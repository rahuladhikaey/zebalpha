"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowDown, Star, Loader2, SlidersHorizontal } from "lucide-react";
import { WishlistButton } from "@/components/WishlistButton";
import {
  getResponsiveGridColsClass,
  getTitleAlignClass,
  getTitleSizeClass,
  getWidgetStyle,
  type CategoryWidgetConfig,
} from "@/lib/categoryStorefrontTypes";
import type { StorefrontProductCard } from "@/lib/categoryStorefrontLoader";

interface CategoryInfiniteFeedProps {
  widget: CategoryWidgetConfig;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  initialProducts: StorefrontProductCard[];
  initialTotal: number;
  initialHasMore: boolean;
}

export function CategoryInfiniteFeed({
  widget,
  categoryId,
  categorySlug,
  categoryName,
  initialProducts,
  initialTotal,
  initialHasMore,
}: CategoryInfiniteFeedProps) {
  const [items, setItems] = useState<StorefrontProductCard[]>(initialProducts);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingMore, setLoadingMore] = useState(false);

  const catParam = encodeURIComponent(categoryId);
  const wStyle = getWidgetStyle(widget);
  const gridClass = getResponsiveGridColsClass(
    wStyle.mobileCols,
    wStyle.desktopCols,
    "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
  );

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const nextPage = page + 1;
      const res = await fetch(
        `/api/category-storefront/${encodeURIComponent(categorySlug)}?page=${nextPage}&pageSize=24`
      );
      const json = await res.json();
      if (json?.success && Array.isArray(json.data?.paginatedProducts)) {
        setItems((prev) => {
          const seen = new Set(prev.map((p) => p.id));
          const fresh = json.data.paginatedProducts.filter((p: StorefrontProductCard) => !seen.has(p.id));
          return [...prev, ...fresh];
        });
        setPage(nextPage);
        setHasMore(Boolean(json.data.hasMore));
      } else {
        setHasMore(false);
      }
    } catch {
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <section className="max-w-[1440px] mx-auto px-3 md:px-6 pt-4 pb-10">
      {/* Header Row with Deep Filter CTA */}
      <div className="flex items-center justify-between gap-3 mb-3.5 pb-2.5 border-b border-zinc-200">
        <div>
          <h2 className="text-base md:text-xl font-black text-zinc-950 tracking-tight">
            {widget.title || `All ${categoryName}`}
          </h2>
          <p className="text-xs text-zinc-500 font-medium">
            {initialTotal > 0 ? `${initialTotal} live products • Verified sellers` : widget.subtitle}
          </p>
        </div>

        <Link
          href={`/products?category=${catParam}`}
          className="inline-flex items-center gap-1.5 rounded-full border border-zinc-300 bg-white px-3.5 py-1.5 text-xs font-extrabold text-zinc-900 hover:bg-zinc-50 shadow-xs shrink-0"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filter & Sort
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 p-10 text-center space-y-3">
          <p className="text-sm font-bold text-zinc-700">
            New {categoryName} listings are being curated right now.
          </p>
          <Link
            href="/products"
            data-keep-dark="true"
            className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-5 py-2 text-xs font-black text-white"
          >
            Browse Full Marketplace
          </Link>
        </div>
      ) : (
        <>
          {/* Flipkart-Grade Device-Fitted Product Grid (Synced with Superadmin Canva Columns, Gap & Radius) */}
          <div
            className={`grid ${gridClass} gap-2.5 sm:gap-3 md:gap-4`}
            style={typeof wStyle.gapPx === "number" ? { gap: `${wStyle.gapPx}px` } : undefined}
          >
            {items.map((p) => (
              <div
                key={p.id}
                className="group relative bg-white rounded-2xl border border-zinc-200/80 overflow-hidden hover:shadow-md transition-all flex flex-col"
                style={typeof wStyle.borderRadius === "number" ? { borderRadius: `${wStyle.borderRadius}px` } : undefined}
              >
                {/* Wishlist Heart Floating Top-Right */}
                <div className="absolute top-2 right-2 z-20">
                  <WishlistButton
                    product={
                      {
                        id: p.id,
                        name: p.name,
                        brand: p.brand,
                        price: p.price,
                        mrp: p.mrp,
                        image_url: p.image_url,
                        images: p.images,
                        stock: p.stock,
                      } as any
                    }
                  />
                </div>

                {/* Product Image (object-top keeps faces & collars cleanly framed!) */}
                <Link
                  href={`/products/${p.id}`}
                  className="relative block aspect-[4/5] w-full bg-zinc-50 overflow-hidden"
                >
                  {p.image_url ? (
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-400">
                      Zebalpha
                    </div>
                  )}

                  {/* Rating Pill Bottom-Left (Video 1 & 2 signature!) */}
                  {p.rating > 0 && (
                    <span className="absolute bottom-2 left-2 inline-flex items-center gap-0.5 rounded-md bg-white/95 px-1.5 py-0.5 text-[10px] font-extrabold text-zinc-900 shadow-sm">
                      {p.rating.toFixed(1)}
                      <Star className="h-2.5 w-2.5 fill-emerald-600 text-emerald-600" />
                      {p.reviewCount > 0 && (
                        <span className="text-zinc-500 font-semibold">({p.reviewCount})</span>
                      )}
                    </span>
                  )}
                </Link>

                {/* Product Info */}
                <Link href={`/products/${p.id}`} className="p-2.5 flex-1 flex flex-col justify-between gap-1">
                  <div>
                    <p className="text-[11px] font-extrabold uppercase tracking-tight text-zinc-900 truncate">
                      {p.brand}
                    </p>
                    <p className="text-xs font-medium text-zinc-600 line-clamp-1 leading-snug mt-0.5">
                      {p.name}
                    </p>
                  </div>

                  <div className="pt-1">
                    <div className="flex items-baseline flex-wrap gap-1.5">
                      {p.discountPercent > 0 && (
                        <span className="inline-flex items-center text-xs font-black text-emerald-700">
                          <ArrowDown className="h-3 w-3 stroke-[2.6]" />
                          {p.discountPercent}%
                        </span>
                      )}
                      {p.mrp > p.price && (
                        <span className="text-[11px] font-medium text-zinc-400 line-through">
                          ₹{p.mrp.toLocaleString("en-IN")}
                        </span>
                      )}
                      <span className="text-sm font-black text-zinc-950">
                        ₹{p.price.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <p className="text-[10px] font-bold text-indigo-700 mt-0.5 truncate">
                      ₹100 OFF 1st order • COD ready
                    </p>
                  </div>
                </Link>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                data-keep-dark="true"
                className="inline-flex items-center gap-2 rounded-full bg-zinc-950 px-7 py-2.5 text-xs font-black text-white shadow-md hover:bg-zinc-800 disabled:opacity-60 cursor-pointer transition"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading more...
                  </>
                ) : (
                  `Load More ${categoryName}`
                )}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
