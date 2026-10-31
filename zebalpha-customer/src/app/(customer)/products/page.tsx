"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useMemo, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Product, Category } from "@/lib/types";
import { LoadingCard } from "@/components/LoadingCard";
import { AddToCartButton } from "@/components/AddToCartButton";
import { Header } from "@/components/Header";
import { WishlistButton } from "@/components/WishlistButton";
import { QuickCartButton } from "@/components/QuickCartButton";
import { ProductCardImageSlider } from "@/components/ProductCardImageSlider";
import { Search, ShoppingBag, SlidersHorizontal, X, RotateCcw, Sparkles } from "lucide-react";
import { isProductNewDrop, isDropLive } from "@/lib/dropUtils";
import {
  useCategories,
  usePaginatedProducts,
  useDebounce,
  DEFAULT_CLOTHING_CATEGORIES,
  getProductDisplayPricing,
} from "@/hooks/useCatalogQueries";
import { useQueryClient } from "@tanstack/react-query";
import {
  ProductFilters,
  FilterState,
  INITIAL_FILTER_STATE,
} from "@/components/ProductFilters";

function ProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const { data: categories = DEFAULT_CLOTHING_CATEGORIES } = useCategories();

  const [selectedCategory, setSelectedCategory] = useState<number | string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);

  // Multi-facet Amazon-style Filter State
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTER_STATE);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Category horizontal scroll ref
  const categoryScrollRef = useRef<HTMLDivElement>(null);

  const categoryParam = searchParams.get("category");
  const searchParam = searchParams.get("search");

  // Sync category param from URL
  useEffect(() => {
    if (categoryParam) {
      setSelectedCategory(categoryParam);
      // If user came specifically to Women's category, preset Gender filter to Women
      const paramLower = categoryParam.toLowerCase();
      if (paramLower.includes("women") || paramLower.includes("female") || paramLower.includes("saree") || paramLower.includes("kurti")) {
        setFilters((prev) => {
          if (!prev.genders.includes("Women")) {
            return { ...prev, genders: ["Women"] };
          }
          return prev;
        });
      }
    } else {
      setSelectedCategory(null);
    }
  }, [categoryParam]);

  // Sync search param from URL
  useEffect(() => {
    if (searchParam) {
      setSearch(searchParam);
    } else {
      setSearch("");
    }
  }, [searchParam]);

  // Reset page when category, debounced search, or filters change
  useEffect(() => {
    setPage(1);
  }, [selectedCategory, debouncedSearch, filters]);

  // Server-side paginated query
  const {
    data: paginatedData,
    isLoading: loading,
    isFetching,
  } = usePaginatedProducts({
    category: selectedCategory,
    search: debouncedSearch,
    page,
    pageSize: 36,
  });

  const products = paginatedData?.products || [];
  const totalCount = paginatedData?.totalCount || 0;
  const totalPages = paginatedData?.totalPages || 1;

  // Realtime DB updates
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

  // Dynamic available brands and sellers from loaded products
  const availableBrands = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.brand && p.brand.trim() && p.brand.toLowerCase() !== "generic") {
        set.add(p.brand.trim());
      }
    });
    return Array.from(set);
  }, [products]);

  const availableSellers = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      const s = p.seller_name || p.business_name;
      if (s && s.trim()) {
        set.add(s.trim());
      }
    });
    return Array.from(set);
  }, [products]);

  // Multi-facet filter pipeline
  const filtered = useMemo(() => {
    return products.filter((product) => {
      // 1. Upcoming drop check
      const isNewDrop = isProductNewDrop(product);
      const isLive = isDropLive(product);
      const isDropFilter =
        selectedCategory && String(selectedCategory).toLowerCase().includes("drop");
      if (isNewDrop && !isLive && !isDropFilter) {
        return false;
      }

      // 2. Gender filter
      if (filters.genders.length > 0) {
        const prodText = `${product.name} ${product.description || ""} ${product.category_name || ""} ${JSON.stringify(product.specifications || {})}`.toLowerCase();
        const matchesGender = filters.genders.some((g) => {
          const gl = g.toLowerCase();
          if (gl === "women") {
            return (
              prodText.includes("women") ||
              prodText.includes("female") ||
              prodText.includes("girl") ||
              prodText.includes("saree") ||
              prodText.includes("sari") ||
              prodText.includes("kurti") ||
              prodText.includes("lehenga") ||
              prodText.includes("gown") ||
              prodText.includes("dress") ||
              prodText.includes("ladies")
            );
          }
          if (gl === "men") {
            return (
              prodText.includes("men") ||
              prodText.includes("male") ||
              prodText.includes("boy") ||
              prodText.includes("polo") ||
              prodText.includes("shirt")
            );
          }
          if (gl === "unisex") {
            return (
              prodText.includes("unisex") ||
              (!prodText.includes("women") && !prodText.includes("men"))
            );
          }
          return prodText.includes(gl);
        });
        if (!matchesGender) return false;
      }

      // 3. Size filter
      if (filters.sizes.length > 0) {
        const pkgSizes = (product.packages || []).map((p) => (p.size || "").toUpperCase());
        const specSize = product.specifications?.size
          ? String(product.specifications.size).toUpperCase()
          : "";
        const specSizes = Array.isArray(product.specifications?.sizes)
          ? product.specifications.sizes.map((s: any) => String(s).toUpperCase())
          : [];
        const prodSku = (product.sku || "").toUpperCase();

        const allSizes = new Set([...pkgSizes, specSize, ...specSizes, prodSku]);
        const matchesSize = filters.sizes.some((s) => {
          const su = s.toUpperCase();
          for (const sizeVal of allSizes) {
            if (sizeVal === su || sizeVal.includes(su)) return true;
          }
          if (su === "FREE SIZE" && product.name.toLowerCase().includes("free size")) {
            return true;
          }
          return false;
        });
        if (!matchesSize) return false;
      }

      // 4. Color filter
      if (filters.colors.length > 0) {
        const pkgColors = (product.packages || []).map((p) => (p.color || "").toLowerCase());
        const specColor = product.specifications?.color
          ? String(product.specifications.color).toLowerCase()
          : "";
        const defColor = (product.default_color || "").toLowerCase();
        const nameLower = product.name.toLowerCase();

        const matchesColor = filters.colors.some((c) => {
          const cl = c.toLowerCase();
          return (
            pkgColors.some((pc) => pc.includes(cl)) ||
            specColor.includes(cl) ||
            defColor.includes(cl) ||
            nameLower.includes(cl)
          );
        });
        if (!matchesColor) return false;
      }

      // 5. Brand filter
      if (filters.brands.length > 0) {
        const brand = (product.brand || "").toLowerCase();
        const matchesBrand = filters.brands.some(
          (b) => brand === b.toLowerCase() || product.name.toLowerCase().includes(b.toLowerCase())
        );
        if (!matchesBrand) return false;
      }

      // 6. ZebAlpha Fashion Tiers
      if (filters.fashionTiers.length > 0) {
        const isPremium =
          product.is_premium ||
          product.tier === "PREMIUM" ||
          (product.specifications as any)?.is_premium === "true";
        const isTopBrand = Boolean(product.brand && product.brand.toLowerCase() !== "generic");
        const matchesTier = filters.fashionTiers.some((tier) => {
          if (tier === "Premium Brands") return isPremium;
          if (tier === "Top Brands") return isTopBrand;
          if (tier === "Made for ZebAlpha" || tier === "Made for Amazon") {
            return (
              (product.brand || "").toLowerCase().includes("zebalpha") ||
              (product.brand || "").toLowerCase().includes("symbol")
            );
          }
          return true;
        });
        if (!matchesTier) return false;
      }

      // 7. Customer Reviews (Rating)
      if (filters.minRating > 0) {
        const rating = product.rating || 4.2;
        if (rating < filters.minRating) return false;
      }

      // 8. Discount
      if (filters.minDiscount > 0) {
        const { discountPercent } = getProductDisplayPricing(product);
        if (discountPercent < filters.minDiscount) return false;
      }

      // 9. Apparel Material
      if (filters.materials.length > 0) {
        const specMaterial = (
          product.specifications?.material ||
          product.specifications?.fabric ||
          ""
        ).toLowerCase();
        const text = `${product.name} ${product.description || ""}`.toLowerCase();
        const matchesMat = filters.materials.some(
          (m) => specMaterial.includes(m.toLowerCase()) || text.includes(m.toLowerCase())
        );
        if (!matchesMat) return false;
      }

      // 10. Sleeve Type
      if (filters.sleeves.length > 0) {
        const specSleeve = (
          product.specifications?.sleeve ||
          product.specifications?.sleeve_type ||
          ""
        ).toLowerCase();
        const text = `${product.name} ${product.description || ""}`.toLowerCase();
        const matchesSleeve = filters.sleeves.some(
          (sl) => specSleeve.includes(sl.toLowerCase()) || text.includes(sl.toLowerCase())
        );
        if (!matchesSleeve) return false;
      }

      // 11. Price
      const { price } = getProductDisplayPricing(product);
      if (filters.priceRange) {
        if (filters.priceRange === "under300" && price > 300) return false;
        if (filters.priceRange === "300to400" && (price < 300 || price > 400)) return false;
        if (filters.priceRange === "400to600" && (price < 400 || price > 600)) return false;
        if (filters.priceRange === "over600" && price < 600) return false;
      }
      if (filters.customMinPrice && price < Number(filters.customMinPrice)) return false;
      if (filters.customMaxPrice && price > Number(filters.customMaxPrice)) return false;

      // 12. Seller
      if (filters.sellers.length > 0) {
        const seller = (product.seller_name || product.business_name || "").toLowerCase();
        const matchesSeller = filters.sellers.some((s) => seller.includes(s.toLowerCase()));
        if (!matchesSeller) return false;
      }

      return true;
    });
  }, [products, selectedCategory, filters]);

  // Handle category switch from horizontal tabs
  const handleCategorySelect = (categoryId: number | string | null) => {
    setSelectedCategory(categoryId);
    if (categoryId) {
      router.replace(`/products?category=${categoryId}`, { scroll: false });
    } else {
      router.replace(`/products`, { scroll: false });
    }
  };

  // Handle Search Pill Submit (Enter or GO click)
  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (search.trim()) {
      router.replace(`/products?search=${encodeURIComponent(search.trim())}`, {
        scroll: false,
      });
    }
  };

  // Active filter count
  const activeFilterCount =
    filters.genders.length +
    filters.sizes.length +
    filters.colors.length +
    filters.brands.length +
    filters.fashionTiers.length +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.minDiscount > 0 ? 1 : 0) +
    filters.materials.length +
    filters.sleeves.length +
    (filters.priceRange || filters.customMinPrice || filters.customMaxPrice ? 1 : 0) +
    filters.sellers.length;

  return (
    <main className="min-h-screen bg-black text-white">
      <Header title="Browse Catalog" subtitle="Quality Selection" />

      {/* ========================================================================= */}
      {/* TOP SECTION: IMAGE 2 SEARCH BAR + HORIZONTAL CATEGORY TABS               */}
      {/* ========================================================================= */}
      <section className="sticky top-[60px] md:top-[68px] z-40 bg-black/95 backdrop-blur-2xl border-b border-zinc-800/80 shadow-2xl pt-2.5 pb-1 px-3 sm:px-6 md:px-8">
        <div className="mx-auto w-full max-w-[1400px]">
          {/* 1. Neon Green Pill Search Bar (Matching Image 2) */}
          <form
            onSubmit={handleSearchSubmit}
            className="relative flex items-center rounded-full border border-emerald-500/80 bg-zinc-950/90 shadow-[0_0_15px_rgba(16,185,129,0.18)] focus-within:border-emerald-400 focus-within:shadow-[0_0_22px_rgba(16,185,129,0.35)] transition-all px-1.5 py-1"
          >
            <Search className="ml-3 sm:ml-4 h-5 w-5 text-emerald-400 shrink-0" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder='Search "Fashion"'
              className="w-full bg-transparent px-3 py-1.5 sm:py-2 text-xs sm:text-sm md:text-base font-semibold text-white placeholder:text-zinc-500 outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  router.replace(selectedCategory ? `/products?category=${selectedCategory}` : `/products`, {
                    scroll: false,
                  });
                }}
                className="mr-2 p-1 text-zinc-400 hover:text-white transition-colors"
                aria-label="Clear Search"
              >
                <X size={16} />
              </button>
            )}
            <button
              type="submit"
              className="rounded-full bg-emerald-400 hover:bg-emerald-300 active:scale-95 text-black font-black px-5 sm:px-6 py-1.5 sm:py-2 text-xs sm:text-sm tracking-wider shadow-md transition-all cursor-pointer shrink-0"
            >
              GO
            </button>
          </form>

          {/* 2. Horizontal Category Scroll Bar (Immediately below Search Bar, like Image 2) */}
          <div className="relative mt-2.5 pb-1">
            <div
              ref={categoryScrollRef}
              className="flex items-center gap-6 sm:gap-8 overflow-x-auto no-scrollbar scroll-smooth px-1"
            >
              {/* "For You" Tab */}
              <button
                type="button"
                onClick={() => handleCategorySelect(null)}
                className="relative shrink-0 pb-2 text-xs sm:text-sm font-semibold transition-all group cursor-pointer focus:outline-none"
              >
                <span
                  className={
                    selectedCategory === null
                      ? "text-emerald-400 font-extrabold"
                      : "text-zinc-400 group-hover:text-white"
                  }
                >
                  For You
                </span>
                {selectedCategory === null && (
                  <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
                )}
              </button>

              {/* Dynamic Categories: Men's Fashion, Women's Fashion, etc. */}
              {categories
                .filter((c) => c.is_active !== false)
                .map((category) => {
                  const isActive =
                    String(selectedCategory) === String(category.id) ||
                    String(selectedCategory).toLowerCase() === category.name.toLowerCase() ||
                    (String(selectedCategory).toLowerCase().includes("women") &&
                      category.name.toLowerCase().includes("women")) ||
                    (String(selectedCategory).toLowerCase().includes("men") &&
                      !String(selectedCategory).toLowerCase().includes("women") &&
                      category.name.toLowerCase().includes("men") &&
                      !category.name.toLowerCase().includes("women"));

                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => handleCategorySelect(category.id)}
                      className="relative shrink-0 pb-2 text-xs sm:text-sm font-semibold transition-all group cursor-pointer focus:outline-none whitespace-nowrap"
                    >
                      <span
                        className={
                          isActive
                            ? "text-emerald-400 font-extrabold"
                            : "text-zinc-400 group-hover:text-white"
                        }
                      >
                        {category.name}
                      </span>
                      {isActive && (
                        <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.9)]" />
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* MAIN LAYOUT: LEFT FILTER SIDEBAR + RIGHT PRODUCT GRID                     */}
      {/* ========================================================================= */}
      <div className="w-full max-w-[1400px] mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-4">
        
        {/* Mobile Sticky Filter Trigger Bar (< md) */}
        <div className="md:hidden flex items-center justify-between gap-2 mb-3 bg-zinc-950/80 border border-zinc-800/80 rounded-2xl px-3.5 py-2.5 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setIsMobileFilterOpen(true)}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white bg-zinc-900 border border-zinc-700 px-3 py-1.5 rounded-xl active:scale-95 transition-all"
          >
            <SlidersHorizontal size={14} className="text-emerald-400" />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 text-[9px] font-black text-black">
                {activeFilterCount}
              </span>
            )}
          </button>

          <div className="text-[11px] font-bold text-zinc-400 truncate">
            {filtered.length} products found
          </div>

          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={() => setFilters(INITIAL_FILTER_STATE)}
              className="text-[11px] font-bold text-emerald-400 hover:text-emerald-300"
            >
              Clear
            </button>
          )}
        </div>

        {/* Mobile Filter Slide-Over Drawer Modal (< md) */}
        {isMobileFilterOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm md:hidden animate-in fade-in duration-200">
            <div className="relative w-full max-h-[85vh] overflow-y-auto bg-zinc-950 border-t border-zinc-800 rounded-t-3xl p-5 shadow-2xl flex flex-col">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={18} className="text-emerald-400" />
                  <span className="text-base font-black text-white uppercase tracking-wider">
                    Filters & Options
                  </span>
                  {activeFilterCount > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 text-[10px] font-black text-black">
                      {activeFilterCount}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="rounded-full bg-zinc-900 p-2 text-zinc-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Filter Body */}
              <div className="flex-1 overflow-y-auto pr-1">
                <ProductFilters
                  filters={filters}
                  setFilters={setFilters}
                  availableBrands={availableBrands}
                  availableSellers={availableSellers}
                  totalFilteredCount={filtered.length}
                  onApply={() => setIsMobileFilterOpen(false)}
                  isMobileModal={true}
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-start gap-6 lg:gap-8">
          {/* ========================================================================= */}
          {/* LEFT SIDEBAR: AMAZON-STYLE FILTER FACETS (Visible on md & lg screens)     */}
          {/* ========================================================================= */}
          <aside className="hidden md:block w-60 lg:w-72 shrink-0 sticky top-[150px] max-h-[calc(100vh-150px)] overflow-y-auto no-scrollbar border-r border-zinc-800/80 pr-4">
            <ProductFilters
              filters={filters}
              setFilters={setFilters}
              availableBrands={availableBrands}
              availableSellers={availableSellers}
              totalFilteredCount={filtered.length}
            />
          </aside>

          {/* ========================================================================= */}
          {/* RIGHT CONTENT: PRODUCT GRID + ACTIVE PILLS + SERVER PAGINATION            */}
          {/* ========================================================================= */}
          <div className="flex-1 min-w-0 pb-16">
            {/* Active Filters Summary Bar */}
            {activeFilterCount > 0 && (
              <div className="hidden md:flex flex-wrap items-center gap-2 mb-4 p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                <span className="text-xs font-bold text-zinc-400">Active Filters:</span>
                {filters.genders.map((g) => (
                  <span
                    key={g}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-xs font-semibold text-emerald-400"
                  >
                    {g}
                    <X
                      size={12}
                      className="cursor-pointer hover:text-white"
                      onClick={() =>
                        setFilters((p) => ({
                          ...p,
                          genders: p.genders.filter((x) => x !== g),
                        }))
                      }
                    />
                  </span>
                ))}
                {filters.sizes.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-xs font-semibold text-emerald-400"
                  >
                    Size: {s}
                    <X
                      size={12}
                      className="cursor-pointer hover:text-white"
                      onClick={() =>
                        setFilters((p) => ({
                          ...p,
                          sizes: p.sizes.filter((x) => x !== s),
                        }))
                      }
                    />
                  </span>
                ))}
                {filters.colors.map((c) => (
                  <span
                    key={c}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-xs font-semibold text-emerald-400"
                  >
                    Color: {c}
                    <X
                      size={12}
                      className="cursor-pointer hover:text-white"
                      onClick={() =>
                        setFilters((p) => ({
                          ...p,
                          colors: p.colors.filter((x) => x !== c),
                        }))
                      }
                    />
                  </span>
                ))}
                {filters.brands.map((b) => (
                  <span
                    key={b}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-xs font-semibold text-emerald-400"
                  >
                    {b}
                    <X
                      size={12}
                      className="cursor-pointer hover:text-white"
                      onClick={() =>
                        setFilters((p) => ({
                          ...p,
                          brands: p.brands.filter((x) => x !== b),
                        }))
                      }
                    />
                  </span>
                ))}
                {filters.minRating > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-xs font-semibold text-amber-400">
                    4★ & Above
                    <X
                      size={12}
                      className="cursor-pointer hover:text-white"
                      onClick={() => setFilters((p) => ({ ...p, minRating: 0 }))}
                    />
                  </span>
                )}
                {filters.minDiscount > 0 && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-xs font-semibold text-emerald-400">
                    {filters.minDiscount}%+ Off
                    <X
                      size={12}
                      className="cursor-pointer hover:text-white"
                      onClick={() => setFilters((p) => ({ ...p, minDiscount: 0 }))}
                    />
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setFilters(INITIAL_FILTER_STATE)}
                  className="text-xs font-black uppercase text-emerald-400 hover:text-emerald-300 ml-auto cursor-pointer"
                >
                  Clear All
                </button>
              </div>
            )}

            {/* Products Counter */}
            <div className="flex items-center justify-between mb-3 text-xs font-bold text-zinc-400">
              <div>
                Showing <span className="text-white font-black">{filtered.length}</span>{" "}
                {filtered.length === 1 ? "product" : "products"}
              </div>
            </div>

            {/* Product Grid / Loading / Empty states */}
            {loading ? (
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-6">
                {Array.from({ length: 8 }).map((_, index) => (
                  <LoadingCard key={index} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-12 text-center text-zinc-400 my-8">
                <ShoppingBag size={48} className="mx-auto mb-4 opacity-40 text-white" />
                <h3 className="text-lg font-black text-white uppercase tracking-wider">
                  No matching products found
                </h3>
                <p className="text-xs font-semibold mt-1 text-zinc-400 max-w-sm mx-auto">
                  Try adjusting or clearing your filters (Gender, Size, Color, Price, etc.) to view more products.
                </p>
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setSearch("");
                    setFilters(INITIAL_FILTER_STATE);
                  }}
                  className="mt-6 rounded-full border border-white/20 bg-white text-black px-6 py-2.5 text-xs font-black uppercase tracking-wider hover:bg-neutral-200 transition-all cursor-pointer"
                >
                  Clear All Filters & Reset
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-6">
                  {filtered.map((product, idx) => {
                    const {
                      price: displayPrice,
                      mrp: displayMrp,
                      hasDiscount,
                      discountAmount,
                      discountPercent,
                    } = getProductDisplayPricing(product);

                    return (
                      <article
                        key={product.id}
                        className="group relative flex flex-col overflow-hidden rounded-xl sm:rounded-[2rem] bg-zinc-950 shadow-2xl transition-all hover:-translate-y-1 hover:shadow-2xl hover:border-zinc-700 border border-zinc-800 isolate"
                      >
                        {/* Auto-sliding Image Holder */}
                        <div className="relative">
                          <ProductCardImageSlider
                            images={
                              product.images && product.images.length > 0
                                ? product.images
                                : [product.image_url]
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
                                <span className="text-sm sm:text-base font-black text-white">
                                  ₹{displayPrice}
                                </span>
                                {hasDiscount && (
                                  <span className="text-[10px] font-bold text-zinc-400 line-through">
                                    ₹{displayMrp}
                                  </span>
                                )}
                              </div>

                              {hasDiscount && (
                                <span className="text-[9px] font-black uppercase text-zinc-300 bg-white/10 border border-white/10 px-2 py-0.5 rounded-full inline-block w-fit mt-1">
                                  Save ₹{discountAmount}
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
                        {(page - 1) * 36 + 1} - {Math.min(page * 36, totalCount)}
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
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-black text-white">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-emerald-400"></div>
        </div>
      }
    >
      <ProductsContent />
    </Suspense>
  );
}
