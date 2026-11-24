"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { Product } from "@/lib/types";
import { ProductCardImageSlider } from "./ProductCardImageSlider";
import { ProductCardSkeleton } from "@/components/skeletons";
import { useScrollRestoration } from "@/hooks/useScrollRestoration";
import { useNetworkAdaptive } from "@/hooks/useNetworkAdaptive";
import { AddToCartButton } from "./AddToCartButton";
import { WishlistButton } from "./WishlistButton";
import { QuickCartButton } from "./QuickCartButton";
import { DeliveryEstimateWidget } from "./DeliveryEstimateWidget";
import { getProductDisplayPricing } from "@/hooks/useCatalogQueries";
import { useOfficialTheme } from "@/lib/platform";
import { Star } from "lucide-react";
import { useExperienceTheme } from "@/context/ExperienceThemeContext";

import { isProductNewDrop } from "@/lib/dropUtils";

interface InfiniteProductFeedProps {
  initialProducts: Product[];
  brandFilter?: string;
}

export function InfiniteProductFeed({ initialProducts = [], brandFilter }: InfiniteProductFeedProps) {
  useScrollRestoration("home_feed");
  const isNativeApp = useOfficialTheme();
  const { experience } = useExperienceTheme();
  const t = experience.themeTokens;
  const isFestivalOverride =
    !experience.isDefault ||
    (t.primaryColor && t.primaryColor.toUpperCase() !== "#F03A46");
  const { recommendedBatchSize, prefetchMargin, isOnline } = useNetworkAdaptive();
  const currentBatchSize = isOnline ? recommendedBatchSize : 20;

  const cleanInitial = (initialProducts || []).filter((p) => !isProductNewDrop(p));
  const [products, setProducts] = useState<Product[]>(cleanInitial);
  // SSR fetches up to 20 items; if fewer than 20 returned, catalog has no further pages
  const [hasMore, setHasMore] = useState(cleanInitial.length >= 20);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(() => {
    if (cleanInitial.length >= 20) {
      const last = cleanInitial[cleanInitial.length - 1];
      if (last?.created_at && last?.id && typeof window !== "undefined") {
        try {
          return window.btoa(JSON.stringify({ createdAt: last.created_at, id: String(last.id) }));
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  const observerRef = useRef<HTMLDivElement | null>(null);

  // Sync initial products when SSR revalidates (filtering out any new drops)
  useEffect(() => {
    const clean = (initialProducts || []).filter((p) => !isProductNewDrop(p));
    if (clean.length > 0) {
      setProducts(clean);
      setHasMore(clean.length >= 20);
      if (clean.length >= 20) {
        const last = clean[clean.length - 1];
        if (last?.created_at && last?.id && typeof window !== "undefined") {
          try {
            setNextCursor(window.btoa(JSON.stringify({ createdAt: last.created_at, id: String(last.id) })));
          } catch {
            setNextCursor(null);
          }
        }
      } else {
        setNextCursor(null);
      }
    }
  }, [initialProducts]);

  // Initial client fallback fetch via Edge CDN + Upstash Redis cached /api/products if SSR returned empty
  useEffect(() => {
    if (products.length === 0) {
      let isMounted = true;
      (async () => {
        try {
          const params = new URLSearchParams({ limit: String(currentBatchSize) });
          if (brandFilter) params.set("brand", brandFilter);
          const res = await fetch(`/api/products?${params.toString()}`);
          if (!res.ok) return;
          const json = await res.json();
          const rows = Array.isArray(json?.items) ? json.items : [];

          if (isMounted && rows.length > 0) {
            const nonDrops = rows.filter((p: any) => !isProductNewDrop(p));
            setProducts(nonDrops);
            setNextCursor(json?.nextCursor || null);
            setHasMore(Boolean(json?.hasMore));
          }
        } catch (e) {
          console.warn("Notice in client product fetch:", e);
        }
      })();
      return () => {
        isMounted = false;
      };
    }
  }, [products.length, brandFilter, currentBatchSize]);

  // Lazy load next batch on scroll via Edge CDN + Upstash Redis cached /api/products (zero direct browser Supabase calls)
  const loadMoreProducts = useCallback(async () => {
    if (isLoadingMore || !hasMore || !nextCursor) return;

    setIsLoadingMore(true);
    try {
      const params = new URLSearchParams({
        limit: String(currentBatchSize),
        cursor: nextCursor,
      });
      if (brandFilter) params.set("brand", brandFilter);

      const res = await fetch(`/api/products?${params.toString()}`);
      if (!res.ok) {
        setHasMore(false);
        return;
      }

      const json = await res.json();
      const rows = Array.isArray(json?.items) ? json.items : [];

      if (rows.length > 0) {
        const nonDrops: Product[] = rows.filter((p: any) => !isProductNewDrop(p));
        setProducts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const uniqueNew = nonDrops.filter((p) => !existingIds.has(p.id));
          return [...prev, ...uniqueNew];
        });
        setNextCursor(json?.nextCursor || null);
        setHasMore(Boolean(json?.hasMore) && Boolean(json?.nextCursor));
      } else {
        setHasMore(false);
        setNextCursor(null);
      }
    } catch (err) {
      console.warn("Notice loading more products on scroll:", err);
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMore, nextCursor, brandFilter, currentBatchSize]);

  // Intersection Observer trigger with network-adaptive prefetch margin
  useEffect(() => {
    const sentinel = observerRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && isOnline) {
          loadMoreProducts();
        }
      },
      { rootMargin: prefetchMargin } // 600px for 4G/Wi-Fi, 250px for 3G, 0px for 2G/Data Saver
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMoreProducts, hasMore, isLoadingMore, prefetchMargin, isOnline]);

  useEffect(() => {
    const handleReviewUpdated = (event: Event) => {
      const detail = (event as CustomEvent)?.detail;
      if (!detail?.productId || !detail?.summary) return;
      const targetId = String(detail.productId);
      setProducts((prev) =>
        prev.map((p) =>
          String(p.id) === targetId
            ? {
                ...p,
                rating: Number(detail.summary.rating ?? detail.summary.average ?? 0),
                review_count: Number(detail.summary.review_count ?? detail.summary.count ?? 0),
              }
            : p
        )
      );
    };
    window.addEventListener("zebalpha:review-updated", handleReviewUpdated);
    return () => window.removeEventListener("zebalpha:review-updated", handleReviewUpdated);
  }, []);

  return (
    <div className="w-full">
      {/* Product Grid */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 min-[1920px]:grid-cols-6 lg:gap-5">
        {products.map((product, idx) => {
          const { price: displayPrice, mrp: displayMrp, hasDiscount, discountAmount, discountPercent } = getProductDisplayPricing(product);

          return (
            <article
              key={product.id}
              style={
                isNativeApp && isFestivalOverride
                  ? {
                      backgroundColor: t.cardBackground,
                      borderColor: t.borderColor,
                    }
                  : undefined
              }
              className={`group relative flex flex-col overflow-hidden rounded-2xl md:rounded-3xl border transition-all duration-300 isolate ${
                isNativeApp
                  ? "bg-[#FFFDF8] border-[#E5C882]/85 shadow-[0_8px_22px_rgba(166,124,28,0.09)] hover:border-[#C28D12]"
                  : "bg-neutral-900/90 border-neutral-800 shadow-xl hover:-translate-y-1.5 hover:border-white/40 hover:shadow-[0_12px_35px_rgba(255,255,255,0.08)]"
              }`}
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
                  <p
                    style={isNativeApp && isFestivalOverride ? { color: t.primaryColor } : undefined}
                    className={`text-[9px] font-black uppercase tracking-[0.18em] ${isNativeApp ? "text-[#8E6208]" : "text-neutral-400"}`}
                  >
                    {product.brand || "ZEBALPHA"}
                  </p>
                  <h3
                    style={isNativeApp && isFestivalOverride ? { color: t.primaryText } : undefined}
                    className={`line-clamp-2 text-sm font-bold leading-snug transition-colors mt-0.5 ${isNativeApp ? "text-[#14120F]" : "text-neutral-100 group-hover:text-white"}`}
                  >
                    {product.name}
                  </h3>
                </Link>

                {typeof product.rating === "number" && product.rating > 0 && (
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span
                      style={
                        isNativeApp && isFestivalOverride
                          ? { backgroundColor: t.surfaceColor, borderColor: t.borderColor, color: t.primaryText }
                          : undefined
                      }
                      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-black border ${
                        isNativeApp
                          ? "bg-[#FAF0D1] border-[#E4C988] text-[#111111]"
                          : "bg-white text-black border-white/10"
                      }`}
                    >
                      <span>{product.rating.toFixed(1)}</span>
                      <Star size={9} className="fill-current" aria-hidden="true" />
                    </span>
                    {typeof product.review_count === "number" && product.review_count > 0 && (
                      <span className={`text-[10px] font-bold ${isNativeApp ? "text-[#7A6C52]" : "text-neutral-400"}`}>
                        ({product.review_count})
                      </span>
                    )}
                  </div>
                )}

                <div className="mt-3.5 space-y-2.5">
                  <div className="flex flex-col">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span
                        style={isNativeApp && isFestivalOverride ? { color: t.priceColor || t.primaryText } : undefined}
                        className={`text-base sm:text-lg font-black tracking-tight ${isNativeApp ? "text-[#111111]" : "text-white"}`}
                      >
                        ₹{displayPrice}
                      </span>
                      {hasDiscount && (
                        <span className={`text-xs font-semibold line-through ${isNativeApp ? "text-[#857860]" : "text-neutral-400"}`}>
                          ₹{displayMrp}
                        </span>
                      )}
                    </div>

                    {hasDiscount && (
                      <span
                        style={
                          isNativeApp && isFestivalOverride
                            ? {
                                backgroundColor: t.surfaceColor,
                                borderColor: t.borderColor,
                                color: t.discountBadgeColor || t.primaryColor,
                              }
                            : undefined
                        }
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full inline-block w-fit mt-1 border ${
                          isNativeApp
                            ? "text-[#8A5A03] bg-[#FAF0D1] border-[#E4C988]"
                            : "text-neutral-300 bg-white/10 border-white/10"
                        }`}
                      >
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
