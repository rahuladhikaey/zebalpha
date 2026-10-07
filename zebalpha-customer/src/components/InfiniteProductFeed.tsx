"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Product } from "@/lib/types";
import { ProductCardImageSlider } from "./ProductCardImageSlider";
import { AddToCartButton } from "./AddToCartButton";
import { WishlistButton } from "./WishlistButton";
import { supabase } from "@/lib/supabaseClient";
import { SLIM_PRODUCT_CARD_FIELDS } from "@/hooks/useCatalogQueries";

interface InfiniteProductFeedProps {
  initialProducts: Product[];
  brandFilter?: string;
}

export function InfiniteProductFeed({ initialProducts = [], brandFilter }: InfiniteProductFeedProps) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [hasMore, setHasMore] = useState(initialProducts.length >= 12);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastCreatedAt, setLastCreatedAt] = useState<string | null>(
    initialProducts.length > 0 ? initialProducts[initialProducts.length - 1].created_at || null : null
  );

  const observerRef = useRef<HTMLDivElement | null>(null);

  // Sync initial products when SSR revalidates
  useEffect(() => {
    if (initialProducts.length > 0) {
      setProducts(initialProducts);
      setLastCreatedAt(initialProducts[initialProducts.length - 1].created_at || null);
      setHasMore(initialProducts.length >= 12);
    }
  }, [initialProducts]);

  // Lazy load next batch on scroll
  const loadMoreProducts = useCallback(async () => {
    if (isLoadingMore || !hasMore || !lastCreatedAt) return;

    setIsLoadingMore(true);
    try {
      let query = supabase
        .from("products")
        .select(SLIM_PRODUCT_CARD_FIELDS)
        .or("is_active.is.null,is_active.eq.true")
        .or("is_approved.is.null,is_approved.eq.true")
        .neq("approval_status", "rejected")
        .lt("created_at", lastCreatedAt)
        .order("created_at", { ascending: false })
        .limit(12);

      if (brandFilter) {
        query = query.ilike("brand", `%${brandFilter}%`);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        const newBatch = (data || []) as unknown as Product[];
        setProducts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const uniqueNew = newBatch.filter((p) => !existingIds.has(p.id));
          return [...prev, ...uniqueNew];
        });

        setLastCreatedAt(newBatch[newBatch.length - 1].created_at || null);
        setHasMore(newBatch.length >= 12);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.warn("Notice loading more products on scroll:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, lastCreatedAt, brandFilter]);

  // Intersection Observer trigger
  useEffect(() => {
    const sentinel = observerRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMoreProducts();
        }
      },
      { rootMargin: "300px" } // Preload 300px before reaching the bottom
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMoreProducts, hasMore, isLoadingMore]);

  return (
    <div className="w-full">
      {/* Product Grid */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 min-[1920px]:grid-cols-6 lg:gap-5">
        {products.map((product, idx) => {
          const effectiveMrp =
            product.mrp && product.mrp > product.price ? product.mrp : Math.round(product.price * 1.25);
          const discountAmount = effectiveMrp - product.price;
          const discountPercent = Math.round((discountAmount / effectiveMrp) * 100);

          return (
            <article
              key={product.id}
              className="group relative flex flex-col overflow-hidden rounded-2xl md:rounded-3xl bg-neutral-900/90 border border-neutral-800 shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-white/40 hover:shadow-[0_12px_35px_rgba(255,255,255,0.08)]"
            >
              {/* Auto-sliding Image Holder */}
              <div className="relative">
                <ProductCardImageSlider
                  images={
                    product.images && product.images.length > 0
                      ? product.images
                      : [product.image_url || (product as any).main_image || "/placeholder.jpg"].filter(Boolean)
                  }
                  alt={product.name}
                  href={`/products/${product.id}`}
                  discountPercent={discountPercent}
                  isPremium={
                    product.is_premium ||
                    product.tier === "PREMIUM" ||
                    (product.specifications as any)?.is_premium === "true"
                  }
                  isAboveTheFold={idx < 4}
                />
                <div className="absolute right-2 top-2 z-30 sm:right-3 sm:top-3">
                  <WishlistButton product={product} />
                </div>
              </div>

              {/* Quick Size Pills Preview */}
              <div className="absolute bottom-2 inset-x-2 z-10 flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                {["S", "M", "L", "XL"].map((sz) => (
                  <span
                    key={sz}
                    className="text-[9px] font-black px-1.5 py-0.5 rounded bg-black/85 text-white border border-white/20"
                  >
                    {sz}
                  </span>
                ))}
              </div>

              {/* Content */}
              <div className="flex flex-1 flex-col p-3.5 sm:p-4">
                <Link href={`/products/${product.id}`} className="mb-auto">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-neutral-400">
                    {product.brand || "ZEBALPHA"}
                  </p>
                  <h3 className="line-clamp-2 text-sm font-bold leading-snug text-neutral-100 group-hover:text-white transition-colors mt-0.5">
                    {product.name}
                  </h3>
                </Link>

                <div className="mt-3.5 space-y-2.5">
                  <div className="flex flex-col">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="text-base sm:text-lg font-black text-white tracking-tight">
                        ₹{product.price}
                      </span>
                      {effectiveMrp > product.price && (
                        <span className="text-xs font-semibold text-neutral-500 line-through">
                          ₹{effectiveMrp}
                        </span>
                      )}
                    </div>

                    {discountAmount > 0 && (
                      <span className="text-[9px] font-black uppercase text-neutral-300 bg-white/10 border border-white/10 px-2 py-0.5 rounded-full inline-block w-fit mt-1">
                        Save ₹{discountAmount}
                      </span>
                    )}
                  </div>

                  <div className="pt-1 flex items-center justify-between gap-2">
                    <AddToCartButton product={product} />
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Infinite Scroll Shimmer Loading Indicators */}
      {isLoadingMore && (
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 min-[1920px]:grid-cols-6 lg:gap-5 mt-6">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="h-80 rounded-2xl md:rounded-3xl bg-neutral-900/60 border border-neutral-800 animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Intersection Observer Sentinel */}
      {hasMore && <div ref={observerRef} className="h-14 w-full" />}
    </div>
  );
}
