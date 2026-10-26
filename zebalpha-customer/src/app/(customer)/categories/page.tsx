"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { useCategories, usePaginatedProducts, useDebounce, getProductDisplayPricing } from "@/hooks/useCatalogQueries";
import { CategoryIconRenderer } from "@/lib/categoryIcons";
import { LoadingCard } from "@/components/LoadingCard";
import { ProductCardImageSlider } from "@/components/ProductCardImageSlider";
import { WishlistButton } from "@/components/WishlistButton";
import { QuickCartButton } from "@/components/QuickCartButton";
import { Search, ShoppingBag, Sparkles, Layers } from "lucide-react";
import { isProductNewDrop, isDropLive } from "@/lib/dropUtils";

function CategoriesContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");

  const { data: categories = [], isLoading: isCategoriesLoading } = useCategories();
  const [selectedCategory, setSelectedCategory] = useState<string | number | null>(categoryParam);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);

  // Sync category from URL param if present
  useEffect(() => {
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
  }, [categoryParam]);

  // Reset page whenever category or search changes
  useEffect(() => {
    setPage(1);
  }, [selectedCategory, debouncedSearch]);

  // Fetch products for currently selected category with race-condition protection
  const {
    data: paginatedData,
    isLoading: isProductsLoading,
    isFetching,
  } = usePaginatedProducts({
    category: selectedCategory,
    search: debouncedSearch,
    page,
    pageSize: 24,
  });

  const products = paginatedData?.products || [];
  const totalCount = paginatedData?.totalCount || 0;

  // Active category meta for header
  const activeCategoryMeta = useMemo(() => {
    if (!selectedCategory) return null;
    return categories.find((c) => String(c.id) === String(selectedCategory) || c.slug === selectedCategory);
  }, [selectedCategory, categories]);

  const activeCategoryName = activeCategoryMeta ? activeCategoryMeta.name : (selectedCategory ? "Filtered Category" : "All Collections");

  const filtered = useMemo(() => {
    return products.filter((product) => {
      const isNewDrop = isProductNewDrop(product);
      const isLive = isDropLive(product);
      const isDropFilter = selectedCategory && String(selectedCategory).toLowerCase().includes("drop");

      if (isNewDrop && !isLive && !isDropFilter) {
        return false;
      }
      return true;
    });
  }, [products, selectedCategory]);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black pb-24">
      {/* Top Header */}
      <Header title="Categories" subtitle="Explore Collections" />

      {/* Sticky Search Bar */}
      <div className="sticky top-[60px] md:top-[68px] z-30 bg-black/95 backdrop-blur-xl border-b border-zinc-800 px-3.5 py-2.5 md:px-8">
        <div className="relative mx-auto w-full max-w-[1400px]">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search within categories (e.g. Kurtis, Tees, Hoodies)..."
            className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 py-2.5 pl-11 pr-5 text-xs sm:text-sm font-semibold text-white placeholder:text-zinc-500 outline-none transition-all focus:border-zinc-500 focus:bg-black"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Split Layout: Left Vertical Sidebar + Right Product Grid */}
      <div className="flex flex-1 items-start w-full max-w-[1400px] mx-auto bg-black">
        {/* =================================================================== */}
        {/* VERTICAL CATEGORY SIDEBAR (Flipkart-Style)                         */}
        {/* =================================================================== */}
        <aside
          aria-label="Categories Sidebar"
          className="w-[84px] sm:w-[100px] shrink-0 sticky top-[115px] md:top-[125px] h-[calc(100vh-115px)] md:h-[calc(100vh-125px)] overflow-y-auto no-scrollbar border-r border-zinc-800 bg-zinc-950/80 py-3 z-10 select-none"
        >
          <div className="flex flex-col gap-4 items-center">
            {/* 1. All Items Option */}
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className="flex flex-col items-center justify-center group focus:outline-none w-full relative cursor-pointer"
            >
              {selectedCategory === null && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-9 w-1 bg-white rounded-r-md transition-all duration-300" />
              )}
              <div
                className={`relative h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center border transition-all duration-200 overflow-hidden ${
                  selectedCategory === null
                    ? "border-white bg-white text-black scale-105 shadow-lg shadow-white/20"
                    : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-850"
                }`}
              >
                <Layers size={20} className={selectedCategory === null ? "text-black" : "text-zinc-300"} />
              </div>
              <span
                className={`mt-1.5 text-[9px] sm:text-[10px] font-bold text-center max-w-[76px] truncate leading-tight transition-colors ${
                  selectedCategory === null ? "text-white font-extrabold" : "text-zinc-400 group-hover:text-white"
                }`}
              >
                All Items
              </span>
            </button>

            {/* 2. Real Main Categories from Supabase */}
            {categories
              .filter((c) => c.is_active !== false)
              .map((category) => {
                const isSelected = String(selectedCategory) === String(category.id);

                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedCategory(category.id)}
                    className="flex flex-col items-center justify-center group focus:outline-none w-full relative cursor-pointer"
                  >
                    {/* Active Pip Indicator */}
                    {isSelected && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 h-9 w-1 bg-white rounded-r-md transition-all duration-300" />
                    )}

                    {/* Icon Container */}
                    <div
                      className={`relative h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center border transition-all duration-200 overflow-hidden ${
                        isSelected
                          ? "border-white bg-white text-black scale-105 shadow-lg shadow-white/20"
                          : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-850 group-active:scale-95"
                      }`}
                    >
                      {category.image_url ? (
                        <Image
                          src={category.image_url}
                          alt={category.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <CategoryIconRenderer
                          iconKey={(category as any).icon_key || category.icon}
                          iconUrl={(category as any).icon_url}
                          size={20}
                          className={isSelected ? "text-black" : "text-zinc-300 group-hover:text-white"}
                        />
                      )}
                    </div>

                    {/* Category Label */}
                    <span
                      title={category.name}
                      className={`mt-1.5 text-[9px] sm:text-[10px] font-bold text-center max-w-[76px] truncate leading-tight px-1 transition-colors ${
                        isSelected ? "text-white font-extrabold" : "text-zinc-400 group-hover:text-white"
                      }`}
                    >
                      {category.name}
                    </span>
                  </button>
                );
              })}
          </div>
        </aside>

        {/* =================================================================== */}
        {/* RIGHT CONTENT: FILTERED PRODUCTS GRID                              */}
        {/* =================================================================== */}
        <div className="flex-grow min-w-0 bg-black min-h-[calc(100vh-115px)] pb-12">
          <div className="p-3 sm:p-5 md:p-6 lg:p-8">
            {/* Category Title & Count */}
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-900">
              <div className="flex items-center gap-2">
                <span className="h-5 w-1 bg-white rounded-full" />
                <h2 className="text-sm sm:text-base font-black uppercase tracking-tight text-white">
                  {activeCategoryName}
                </h2>
              </div>
              <span className="text-[10px] sm:text-xs font-bold text-zinc-500 uppercase tracking-wider">
                {totalCount} {totalCount === 1 ? "Product" : "Products"}
              </span>
            </div>

            {/* Product Grid State */}
            {isProductsLoading ? (
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 min-[1440px]:grid-cols-5 lg:gap-5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <LoadingCard key={i} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-10 text-center text-zinc-400 my-6 shadow-2xl">
                <ShoppingBag size={44} className="mx-auto mb-3 opacity-30 text-white" />
                <h3 className="text-base font-black text-white uppercase tracking-wider">
                  {selectedCategory ? "No products available in this category yet." : "No Products Found"}
                </h3>
                <p className="text-xs font-semibold mt-1 text-zinc-400 max-w-sm mx-auto">
                  {selectedCategory
                    ? "Check back soon as new collections and products are added regularly."
                    : "Try adjusting your search query or selecting a different category."}
                </p>
                {selectedCategory && (
                  <button
                    onClick={() => {
                      setSelectedCategory(null);
                      setSearch("");
                    }}
                    className="mt-5 rounded-full border border-white/20 bg-white text-black px-6 py-2.5 text-xs font-black uppercase tracking-wider hover:bg-neutral-200 transition-all cursor-pointer shadow-lg"
                  >
                    View All Products
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 min-[1440px]:grid-cols-5 lg:gap-5">
                {filtered.map((product, idx) => {
                  const { price: displayPrice, mrp: displayMrp, discountPercent } = getProductDisplayPricing(product);
                  return (
                    <article
                      key={product.id}
                      className="group relative flex flex-col overflow-hidden rounded-2xl bg-zinc-950 border border-zinc-800/80 shadow-xl transition-all hover:border-zinc-600 hover:shadow-2xl"
                    >
                      {/* Image Slider */}
                      <div className="relative">
                        <ProductCardImageSlider
                          images={product.images && product.images.length > 0 ? product.images : [product.image_url]}
                          alt={product.name}
                          href={`/products/${product.id}`}
                          discountPercent={discountPercent}
                          isPremium={product.is_premium || product.tier === "PREMIUM"}
                          isAboveTheFold={idx < 4}
                        />
                        <div className="absolute right-2 top-2 z-30 flex flex-col gap-1.5 items-center">
                          <WishlistButton product={product} />
                          <QuickCartButton product={product} />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex flex-1 flex-col p-2.5 sm:p-3.5">
                        <Link href={`/products/${product.id}`} className="mb-auto">
                          <p className="text-[9px] font-black uppercase tracking-wider text-zinc-400">
                            {product.brand || "ZEBALPHA"}
                          </p>
                          <h3 className="line-clamp-2 text-xs font-bold text-white group-hover:text-zinc-200 mt-0.5">
                            {product.name}
                          </h3>
                        </Link>

                        <div className="mt-2.5 flex items-baseline gap-2">
                          <span className="text-xs sm:text-sm font-black text-white">
                            ₹{displayPrice}
                          </span>
                          {displayMrp > displayPrice && (
                            <span className="text-[10px] text-zinc-500 line-through">
                              ₹{displayMrp}
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CategoriesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white p-8">Loading Categories...</div>}>
      <CategoriesContent />
    </Suspense>
  );
}
