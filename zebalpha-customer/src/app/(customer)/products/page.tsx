"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Product, Category } from "@/lib/types";
import { LoadingCard } from "@/components/LoadingCard";
import { AddToCartButton } from "@/components/AddToCartButton";

import { Header } from "@/components/Header";
import { WishlistButton } from "@/components/WishlistButton";
import { ProductCardImageSlider } from "@/components/ProductCardImageSlider";
import { Search, ShoppingBag, Sparkles } from "lucide-react";
import { isProductNewDrop, isDropLive, getDropDisplayStatus } from "@/lib/dropUtils";
import { useCategories, usePaginatedProducts, useDebounce, DEFAULT_CLOTHING_CATEGORIES } from "@/hooks/useCatalogQueries";
import { useQueryClient } from "@tanstack/react-query";

const getCategoryEmojiOrIcon = (name: string) => {
  const lower = (name || "").toLowerCase();
  if (lower.includes("polo")) return "👕";
  if (lower.includes("tee") || lower.includes("t-shirt") || lower.includes("oversized")) return "🛹";
  if (lower.includes("hoodie") || lower.includes("sweatshirt") || lower.includes("fleece")) return "🧥";
  if (lower.includes("shirt")) return "👔";
  if (lower.includes("pant") || lower.includes("trouser") || lower.includes("cargo") || lower.includes("bottom")) return "👖";
  if (lower.includes("drop") || lower.includes("limited")) return "⚡";
  if (lower.includes("accessory") || lower.includes("cap") || lower.includes("headwear")) return "🧢";
  if (lower.includes("classic") || lower.includes("premium")) return "👑";
  return "🛍️";
};

function ProductsContent() {
  const queryClient = useQueryClient();
  const { data: categories = DEFAULT_CLOTHING_CATEGORIES } = useCategories();
  const [selectedCategory, setSelectedCategory] = useState<number | string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);

  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const searchParam = searchParams.get("search");

  useEffect(() => {
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    } else {
      setSelectedCategory(null);
    }
  }, [categoryParam]);

  useEffect(() => {
    if (searchParam) {
      setSearch(searchParam);
    } else {
      setSearch("");
    }
  }, [searchParam]);

  // Reset page when category or search query changes
  useEffect(() => {
    setPage(1);
  }, [selectedCategory, debouncedSearch]);

  // Server-side paginated query with L1 browser caching
  const {
    data: paginatedData,
    isLoading: loading,
    isFetching,
  } = usePaginatedProducts({
    category: selectedCategory,
    search: debouncedSearch,
    page,
    pageSize: 24,
  });

  const products = paginatedData?.products || [];
  const totalCount = paginatedData?.totalCount || 0;
  const totalPages = paginatedData?.totalPages || 1;

  // Realtime subscription: Invalidate query cache instead of full-table reload
  useEffect(() => {
    const channel = supabase
      .channel("customer-products-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["products"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "curated_collections" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["categories"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const filtered = useMemo(() => {
    return products.filter((product) => {
      const isNewDrop = isProductNewDrop(product);
      const isLive = isDropLive(product);
      const isDropFilter = selectedCategory && String(selectedCategory).toLowerCase().includes("drop");

      // Upcoming drops whose date is in the future should not be shown in standard purchasable catalog
      // unless user is explicitly browsing the "New Drops" category
      if (isNewDrop && !isLive && !isDropFilter) {
        return false;
      }

      return true;
    });
  }, [products, selectedCategory]);

  return (
    <main className="min-h-screen bg-black text-white">
      <Header title="Browse Catalog" subtitle="Quality Selection" />

      {/* Top Search Bar */}
      <div className="sticky top-[68px] md:top-[72px] z-40 bg-black/90 backdrop-blur-xl border-b border-zinc-800 shadow-2xl px-3 py-3 md:px-8">
        <div className="relative mx-auto w-full max-w-[1400px]">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search streetwear, polos, hoodies, shirts..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 pl-11 pr-5 text-sm font-semibold text-white placeholder:text-zinc-500 outline-none transition-all focus:border-white focus:bg-zinc-950 focus:shadow-xl"
          />
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="flex flex-1 items-start w-full max-w-[1400px] mx-auto bg-black">
        
        {/* Left Sidebar Category Selector */}
        <aside className="w-[84px] sm:w-[104px] shrink-0 sticky top-[130px] md:top-[140px] h-[calc(100vh-130px)] md:h-[calc(100vh-140px)] overflow-y-auto no-scrollbar border-r border-zinc-800 bg-black py-4 z-10">
          <div className="flex flex-col gap-5 items-center">
            {/* View All Button */}
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className="flex flex-col items-center justify-center group focus:outline-none w-full relative cursor-pointer"
            >
              {selectedCategory === null && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-10 w-1 bg-white rounded-r-md transition-all duration-300"></div>
              )}
              
              <div className={`relative h-14 w-14 sm:h-16 sm:w-16 rounded-full flex items-center justify-center border-[3px] transition-all duration-300 overflow-hidden ${
                selectedCategory === null 
                  ? "border-white bg-zinc-900 text-white scale-105 shadow-xl shadow-white/10" 
                  : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-900"
              }`}>
                <span className="text-xl sm:text-2xl">🛍️</span>
              </div>
              <span className={`mt-1.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-center max-w-[80px] line-clamp-2 transition-colors duration-300 ${
                selectedCategory === null ? "text-white font-extrabold" : "text-zinc-400 group-hover:text-white"
              }`}>
                All Items
              </span>
            </button>

            {/* Curated Categories */}
            {categories.filter(c => c.is_active !== false).map((category) => {
              const isActive = selectedCategory === category.id || selectedCategory === category.name;
              const emoji = category.icon || getCategoryEmojiOrIcon(category.name);
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category.name || category.id)}
                  className="flex flex-col items-center justify-center group focus:outline-none w-full relative cursor-pointer"
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-10 w-1 bg-white rounded-r-md transition-all duration-300"></div>
                  )}

                  <div className={`relative h-14 w-14 sm:h-16 sm:w-16 rounded-full flex items-center justify-center border-[3px] transition-all duration-300 overflow-hidden ${
                    isActive 
                      ? "border-white bg-zinc-900 text-white scale-105 shadow-xl shadow-white/10" 
                      : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-900"
                  }`}>
                    {category.image_url ? (
                      <Image src={category.image_url} alt={category.name} fill className="object-cover" unoptimized />
                    ) : (
                      <span className="text-xl sm:text-2xl select-none">{emoji}</span>
                    )}
                  </div>
                  <span className={`mt-1.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-center max-w-[80px] line-clamp-2 px-1 transition-colors duration-300 ${
                    isActive ? "text-white font-extrabold" : "text-zinc-400 group-hover:text-white"
                  }`}>
                    {category.name}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right Product Grid */}
        <div className="flex-grow min-w-0 bg-black min-h-[calc(100vh-130px)] pb-10">
          <div className="p-2 sm:p-4 md:p-6 lg:p-8">
            {loading ? (
              <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 min-[1440px]:grid-cols-5 min-[1920px]:grid-cols-6 lg:gap-6">
                {Array.from({ length: 8 }).map((_, index) => <LoadingCard key={index} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-12 text-center text-zinc-400 my-8">
                <ShoppingBag size={48} className="mx-auto mb-4 opacity-40 text-white" />
                <h3 className="text-lg font-black text-white uppercase tracking-wider">
                  No Products Found
                </h3>
                <p className="text-xs font-semibold mt-1 text-zinc-400 max-w-sm mx-auto">
                  Try adjusting your search query or selecting a different category filter.
                </p>
                <button 
                  onClick={() => { setSelectedCategory(null); setSearch(""); }}
                  className="mt-6 rounded-full border border-white/20 bg-white text-black px-6 py-2.5 text-xs font-black uppercase tracking-wider hover:bg-neutral-200 transition-all cursor-pointer"
                >
                  Clear All Filters & View All
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 min-[1440px]:grid-cols-5 min-[1920px]:grid-cols-6 lg:gap-6">
                  {filtered.map((product, idx) => {
                    const discountPercent = product.mrp && product.mrp > product.price
                      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
                      : 0;
                    return (
                      <article key={product.id} className="group relative flex flex-col overflow-hidden rounded-xl sm:rounded-[2rem] bg-zinc-950 shadow-2xl transition-all hover:-translate-y-1 hover:shadow-2xl hover:border-zinc-700 border border-zinc-800">
                        {/* Auto-sliding Image Holder */}
                        <div className="relative">
                          <ProductCardImageSlider
                            images={product.images && product.images.length > 0 ? product.images : [product.image_url]}
                            alt={product.name}
                            href={`/products/${product.id}`}
                            discountPercent={discountPercent}
                            isPremium={product.is_premium || product.tier === "PREMIUM" || (product.specifications as any)?.is_premium === "true"}
                            isAboveTheFold={idx < 4}
                          />
                          <div className="absolute right-2 top-2 z-30 sm:right-3 sm:top-3">
                            <WishlistButton product={product} />
                          </div>
                        </div>
                        
                        {/* Content */}
                        <div className="flex flex-1 flex-col p-2.5 sm:p-4 sm:pt-5">
                          <Link href={`/products/${product.id}`} className="mb-auto">
                            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-400">
                              {product.brand || "ZEBALPHA"}
                            </p>
                            <h3 className="line-clamp-2 text-xs sm:text-sm font-bold leading-tight text-white group-hover:text-zinc-300 transition-colors mt-0.5">
                              {product.name}
                            </h3>
                          </Link>

                          <div className="mt-3.5 space-y-2.5">
                            <div className="flex flex-col">
                              <div className="flex items-baseline gap-1.5 flex-wrap">
                                <span className="text-sm sm:text-base font-black text-white">₹{product.price}</span>
                                {product.mrp && product.mrp > product.price && (
                                  <span className="text-[10px] font-bold text-zinc-400 line-through">
                                    ₹{product.mrp}
                                  </span>
                                )}
                              </div>
                              
                              {discountPercent > 0 && (
                                <span className="text-[9px] font-black uppercase text-zinc-300 bg-white/10 border border-white/10 px-2 py-0.5 rounded-full inline-block w-fit mt-1">
                                  Save ₹{product.mrp! - product.price}
                                </span>
                              )}
                            </div>

                            <div className="pt-1 flex items-center justify-between gap-2">
                              {isProductNewDrop(product) && !isDropLive(product) ? (
                                <Link
                                  href={`/products/${product.id}`}
                                  className="w-full flex h-10 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 text-[10px] font-black uppercase tracking-wider hover:bg-amber-500/20 transition-all"
                                >
                                  ⚡ Dropping Soon
                                </Link>
                              ) : (
                                <AddToCartButton product={product} />
                              )}
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* Server-Side Pagination Bar */}
                {totalPages > 1 && (
                  <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-800/80 pt-6 px-2">
                    <div className="text-xs font-bold text-zinc-400">
                      Showing{" "}
                      <span className="text-white font-black">
                        {(page - 1) * 24 + 1} - {Math.min(page * 24, totalCount)}
                      </span>{" "}
                      of <span className="text-white font-black">{totalCount}</span> products
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (page > 1) {
                            setPage(page - 1);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }
                        }}
                        disabled={page <= 1}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                          page <= 1
                            ? "bg-zinc-950 border-zinc-900 text-zinc-600 cursor-not-allowed opacity-40"
                            : "bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 hover:border-white shadow-md active:scale-95 cursor-pointer"
                        }`}
                      >
                        ← Prev
                      </button>

                      <span className="px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-black text-white">
                        Page {page} of {totalPages}
                      </span>

                      <button
                        type="button"
                        onClick={() => {
                          if (page < totalPages) {
                            setPage(page + 1);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }
                        }}
                        disabled={page >= totalPages}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all border ${
                          page >= totalPages
                            ? "bg-zinc-950 border-zinc-900 text-zinc-600 cursor-not-allowed opacity-40"
                            : "bg-zinc-900 border-zinc-700 text-white hover:bg-zinc-800 hover:border-white shadow-md active:scale-95 cursor-pointer"
                        }`}
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-white"></div>
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}
