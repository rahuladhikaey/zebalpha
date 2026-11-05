"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Product } from "@/lib/types";
import { ProductCardImageSlider } from "./ProductCardImageSlider";
import { ProductCardSkeleton } from "@/components/skeletons";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { AddToCartButton } from "./AddToCartButton";
import { WishlistButton } from "./WishlistButton";
import { QuickCartButton } from "./QuickCartButton";
import { DeliveryEstimateWidget } from "./DeliveryEstimateWidget";
import { supabase } from "@/lib/supabaseClient";
import { SLIM_PRODUCT_CARD_FIELDS, getProductDisplayPricing } from "@/hooks/useCatalogQueries";

import { isProductNewDrop } from "@/lib/dropUtils";

interface InfiniteProductFeedProps {
  initialProducts: Product[];
  brandFilter?: string;
}

export function InfiniteProductFeed({ initialProducts = [], brandFilter }: InfiniteProductFeedProps) {
  useScrollRestoration("home_feed");
  const BATCH_SIZE = 20;
  const cleanInitial = (initialProducts || []).filter((p) => !isProductNewDrop(p));
  const [products, setProducts] = useState<Product[]>(cleanInitial);
  const [hasMore, setHasMore] = useState(cleanInitial.length >= BATCH_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastCreatedAt, setLastCreatedAt] = useState<string | null>(
    cleanInitial.length > 0 ? cleanInitial[cleanInitial.length - 1].created_at || null : null
  );

  const observerRef = useRef<HTMLDivElement | null>(null);

  // Sync initial products when SSR revalidates (filtering out any new drops)
  useEffect(() => {
    const clean = (initialProducts || []).filter((p) => !isProductNewDrop(p));
    if (clean.length > 0) {
      setProducts(clean);
      setLastCreatedAt(clean[clean.length - 1].created_at || null);
      setHasMore(clean.length >= BATCH_SIZE);
    }
  }, [initialProducts]);

  // Initial client fallback fetch if SSR returned empty array (e.g., cold cache)
  useEffect(() => {
    if (products.length === 0) {
      let isMounted = true;
      (async () => {
        try {
          let query = supabase
            .from("products")
            .select(SLIM_PRODUCT_CARD_FIELDS)
            .or("is_active.is.null,is_active.eq.true")
            .neq("approval_status", "rejected")
            .neq("status", "COMING_SOON")
            .neq("tier", "DROP")
            .order("created_at", { ascending: false })
            .limit(BATCH_SIZE);

          if (brandFilter) {
            query = query.ilike("brand", `%${brandFilter}%`);
          }

          let { data, error } = await query;
          if (error || !data || data.length === 0) {
            const fallback = await supabase
              .from("products")
              .select("*")
              .or("is_active.is.null,is_active.eq.true")
              .neq("approval_status", "rejected")
              .neq("status", "COMING_SOON")
              .neq("tier", "DROP")
              .order("created_at", { ascending: false })
              .limit(BATCH_SIZE);
            data = fallback.data;
          }

          if (isMounted && data && data.length > 0) {
            const nonDrops = data.filter((p: any) => !isProductNewDrop(p));
            const mapped = nonDrops.map((p: any) => {
              const specs = p.specifications || {};
              const isPrem = p.is_premium === true || p.tier === "PREMIUM" || specs.is_premium === true || specs.is_premium === "true" || specs.tier === "PREMIUM";
              return {
                ...p,
                thumbnail_url: p.thumbnail_url || p.image_url || (Array.isArray(p.images) && p.images[0]) || "",
                is_premium: isPrem,
                tier: isPrem ? "PREMIUM" : (p.tier || specs.tier || "STANDARD"),
                is_new_drop: false,
                category: p.category || specs.category || "Apparel",
              };
            });
            setProducts(mapped);
            if (mapped.length > 0) {
              setLastCreatedAt(mapped[mapped.length - 1].created_at || null);
            }
            setHasMore(mapped.length >= BATCH_SIZE);
          }
        } catch (e) {
          console.warn("Notice in client product fetch:", e);
        }
      })();
      return () => {
        isMounted = false;
      };
    }
  }, [products.length, brandFilter]);

  // Lazy load next batch on scroll
  const loadMoreProducts = useCallback(async () => {
    if (isLoadingMore || !hasMore || !lastCreatedAt) return;

    setIsLoadingMore(true);
    try {
      let query = supabase
        .from("products")
        .select(SLIM_PRODUCT_CARD_FIELDS)
        .or("is_active.is.null,is_active.eq.true")
        .neq("approval_status", "rejected")
        .neq("status", "COMING_SOON")
        .neq("tier", "DROP")
        .lt("created_at", lastCreatedAt)
        .order("created_at", { ascending: false })
        .limit(BATCH_SIZE);

      if (brandFilter) {
        query = query.ilike("brand", `%${brandFilter}%`);
      }

      let { data, error } = await query;
      if (error || !data || data.length === 0) {
        const fallback = await supabase
          .from("products")
          .select("*")
          .or("is_active.is.null,is_active.eq.true")
          .neq("approval_status", "rejected")
          .neq("status", "COMING_SOON")
          .neq("tier", "DROP")
          .lt("created_at", lastCreatedAt)
          .order("created_at", { ascending: false })
          .limit(BATCH_SIZE);
        data = fallback.data;
        error = fallback.error;
      }

      if (!error && data && data.length > 0) {
        const nonDrops = data.filter((p: any) => !isProductNewDrop(p));
        const newBatch: Product[] = nonDrops.map((p: any) => {
          const specs = p.specifications || {};
          const isPrem = p.is_premium === true || p.tier === "PREMIUM" || specs.is_premium === true || specs.is_premium === "true" || specs.tier === "PREMIUM";
          return {
            ...p,
            thumbnail_url: p.thumbnail_url || p.image_url || (Array.isArray(p.images) && p.images[0]) || "",
            is_premium: isPrem,
            tier: isPrem ? "PREMIUM" : (p.tier || specs.tier || "STANDARD"),
            is_new_drop: false,
            category: p.category || specs.category || "Apparel",
          };
        });

        setProducts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const uniqueNew = newBatch.filter((p) => !existingIds.has(p.id));
          return [...prev, ...uniqueNew];
        });

        if (newBatch.length > 0) {
          setLastCreatedAt(newBatch[newBatch.length - 1].created_at || null);
        }
        setHasMore(newBatch.length >= BATCH_SIZE);
      } else {
        setHasMore(false);
      }
    } catch (err) {
      console.warn("Notice loading more products on scroll:", err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, lastCreatedAt, brandFilter]);

  // Intersection Observer trigger with intelligent 600px prefetch margin
  useEffect(() => {
    const sentinel = observerRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          loadMoreProducts();
        }
      },
      { rootMargin: "600px 0px" } // Preload when 5 products remain before viewport bottom
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMoreProducts, hasMore, isLoadingMore]);

  return (
    <div className="w-full">
      {/* Product Grid */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 min-[1920px]:grid-cols-6 lg:gap-5">
        {products.map((product, idx) => {
          const { price: displayPrice, mrp: displayMrp, hasDiscount, discountAmount, discountPercent } = getProductDisplayPricing(product);

          return (
            <article
              key={product.id}
              className="group relative flex flex-col overflow-hidden rounded-2xl md:rounded-3xl bg-neutral-900/90 border border-neutral-800 shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-white/40 hover:shadow-[0_12px_35px_rgba(255,255,255,0.08)] isolate"
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
                <div className="absolute right-2 top-2 z-30 sm:right-3 sm:top-3 flex flex-col gap-1.5 items-center">
                  <WishlistButton product={product} />
                  <QuickCartButton product={product} />
                </div>
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
                        ₹{displayPrice}
                      </span>
                      {hasDiscount && (
                        <span className="text-xs font-semibold text-neutral-400 line-through">
                          ₹{displayMrp}
                        </span>
                      )}
                    </div>

                    {hasDiscount && (
                      <span className="text-[9px] font-black uppercase text-neutral-300 bg-white/10 border border-white/10 px-2 py-0.5 rounded-full inline-block w-fit mt-1">
                        Save ₹{discountAmount}
                      </span>
                    )}

                    {/* Compact Real Dynamic Delivery Estimate */}
                    <div className="pt-1">
                      <DeliveryEstimateWidget compact productId={product.id} sellerId={product.seller_id} />
                    </div>
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
          <ProductCardSkeleton count={4} />
        </div>
      )}

      {/* Intersection Observer Sentinel */}
      {hasMore && <div ref={observerRef} className="h-14 w-full" />}
    </div>
  );
}
