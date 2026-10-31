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
import { Search, ShoppingBag, SlidersHorizontal, X, RotateCcw } from "lucide-react";
import { isProductNewDrop, isDropLive } from "@/lib/dropUtils";
import {
  useCategories,
  usePaginatedProducts,
  useActiveSellers,
  useDebounce,
  DEFAULT_CLOTHING_CATEGORIES,
  getProductDisplayPricing,
} from "@/hooks/useCatalogQueries";
import { useQueryClient } from "@tanstack/react-query";
import {
  ProductFilters,
  FilterState,
  INITIAL_FILTER_STATE,
  PriceRangeData,
} from "@/components/ProductFilters";

function ProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const { data: categories = DEFAULT_CLOTHING_CATEGORIES } = useCategories();
  const { data: dbSellers = [] } = useActiveSellers();

  const [selectedCategory, setSelectedCategory] = useState<number | string | null>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);

  // Multi-facet Real Filter State
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
      if (
        paramLower.includes("women") ||
        paramLower.includes("female") ||
        paramLower.includes("saree") ||
        paramLower.includes("kurti")
      ) {
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
          queryClient.invalidateQueries({ queryKey: ["activeSellers"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // =========================================================================
  // DYNAMIC FACET EXTRACTION: 100% REAL DETAILS DIRECTLY FROM DATABASE
  // =========================================================================
  const {
    realBrands,
    realSellers,
    realSizes,
    realColors,
    realMaterials,
    realSleeves,
    realMinPrice,
    realMaxPrice,
    dynamicPriceBrackets,
  } = useMemo(() => {
    const brandsSet = new Set<string>();
    const sellersSet = new Set<string>();
    const sizesSet = new Set<string>();
    const colorsSet = new Set<string>();
    const materialsSet = new Set<string>();
    const sleevesSet = new Set<string>();
    let minPrice = Infinity;
    let maxPrice = 0;

    const knownSleevePatterns = [
      "Sleeveless",
      "Full Sleeve",
      "Half Sleeve",
      "Short Sleeve",
      "3/4 Sleeve",
      "Three Quarter Sleeve",
      "Puff Sleeve",
      "Cap Sleeve",
      "Bell Sleeve",
      "Raglan Sleeve",
      "Cold Shoulder",
    ];

    const knownMaterialPatterns = [
      "Soft Silk",
      "Pure Silk",
      "Silk",
      "Cotton",
      "Art Silk",
      "Rayon",
      "Chiffon",
      "Georgette",
      "Linen",
      "Crepe",
      "Denim",
      "Lycra",
      "Polyester",
      "Wool",
      "Velvet",
    ];

    products.forEach((p) => {
      // 1. Real Brands
      if (p.brand && p.brand.trim() && p.brand.toLowerCase() !== "generic") {
        brandsSet.add(p.brand.trim());
      }

      // 2. Real Sellers
      const sName =
        p.seller_name ||
        p.business_name ||
        (p.seller as any)?.business_name;
      if (sName && sName.trim()) {
        sellersSet.add(sName.trim());
      } else if (p.brand && p.brand.trim() && !brandsSet.has(p.brand.trim())) {
        sellersSet.add(p.brand.trim());
      }

      // 3. Real Prices
      const { price } = getProductDisplayPricing(p);
      if (price > 0) {
        if (price < minPrice) minPrice = price;
        if (price > maxPrice) maxPrice = price;
      }

      // 4. Specifications & Packages
      const specs = (p.specifications as Record<string, any>) || {};

      // Real Sizes
      if (specs.size) sizesSet.add(String(specs.size).trim());
      if (Array.isArray(specs.sizes)) {
        specs.sizes.forEach((s) => s && sizesSet.add(String(s).trim()));
      }
      if (Array.isArray(p.packages)) {
        p.packages.forEach((pkg) => {
          if (pkg.size) sizesSet.add(String(pkg.size).trim());
          if (pkg.color) colorsSet.add(String(pkg.color).trim());
        });
      }
      if (
        p.name.toLowerCase().includes("free size") ||
        (p.description || "").toLowerCase().includes("free size")
      ) {
        sizesSet.add("Free Size");
      }

      // Real Colors
      if (specs.color) colorsSet.add(String(specs.color).trim());
      if (p.default_color) colorsSet.add(String(p.default_color).trim());
      if (p.main_color) colorsSet.add(String(p.main_color).trim());

      // Real Materials
      if (specs.material) materialsSet.add(String(specs.material).trim());
      if (specs.fabric) materialsSet.add(String(specs.fabric).trim());
      const fullText = `${p.name} ${p.description || ""}`.toLowerCase();
      knownMaterialPatterns.forEach((mat) => {
        if (fullText.includes(mat.toLowerCase())) {
          materialsSet.add(mat);
        }
      });

      // Real Sleeves
      if (specs.sleeve) sleevesSet.add(String(specs.sleeve).trim());
      if (specs.sleeve_type) sleevesSet.add(String(specs.sleeve_type).trim());
      knownSleevePatterns.forEach((slv) => {
        if (fullText.includes(slv.toLowerCase())) {
          sleevesSet.add(slv);
        }
      });
    });

    // Also include active sellers directly from DB table
    (dbSellers || []).forEach((s) => s && sellersSet.add(s.trim()));

    // Safe fallbacks for min/max
    const finalMin = minPrice === Infinity ? 0 : minPrice;
    const finalMax = maxPrice === 0 ? 3000 : maxPrice;

    // Dynamic price brackets based on real data spread
    const brackets: Array<{ label: string; value: string; min: number; max: number }> = [];
    if (finalMax <= 600) {
      brackets.push({
        label: `Up to ₹${Math.round(finalMax * 0.5)}`,
        value: "bracket1",
        min: 0,
        max: Math.round(finalMax * 0.5),
      });
      brackets.push({
        label: `Over ₹${Math.round(finalMax * 0.5)}`,
        value: "bracket2",
        min: Math.round(finalMax * 0.5),
        max: Infinity,
      });
    } else if (finalMax <= 1200) {
      brackets.push({ label: `Up to ₹499`, value: "bracket1", min: 0, max: 499 });
      brackets.push({ label: `₹500 - ₹999`, value: "bracket2", min: 500, max: 999 });
      brackets.push({ label: `Over ₹1,000`, value: "bracket3", min: 1000, max: Infinity });
    } else {
      brackets.push({ label: `Up to ₹500`, value: "bracket1", min: 0, max: 500 });
      brackets.push({ label: `₹500 - ₹1,000`, value: "bracket2", min: 500, max: 1000 });
      brackets.push({ label: `₹1,000 - ₹2,000`, value: "bracket3", min: 1000, max: 2000 });
      brackets.push({ label: `Over ₹2,000`, value: "bracket4", min: 2000, max: Infinity });
    }

    return {
      realBrands: Array.from(brandsSet),
      realSellers: Array.from(sellersSet),
      realSizes: Array.from(sizesSet),
      realColors: Array.from(colorsSet),
      realMaterials: Array.from(materialsSet),
      realSleeves: Array.from(sleevesSet),
      realMinPrice: finalMin,
      realMaxPrice: finalMax,
      dynamicPriceBrackets: brackets,
    };
  }, [products, dbSellers]);

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

      // 3. Real Size filter
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

      // 4. Real Color filter
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

      // 5. Real Brand filter
      if (filters.brands.length > 0) {
        const brand = (product.brand || "").toLowerCase();
        const matchesBrand = filters.brands.some(
          (b) =>
            brand === b.toLowerCase() ||
            product.name.toLowerCase().includes(b.toLowerCase())
        );
        if (!matchesBrand) return false;
      }

      // 6. Real Seller filter
      if (filters.sellers.length > 0) {
        const seller = (
          product.seller_name ||
          product.business_name ||
          (product.seller as any)?.business_name ||
          product.brand ||
          ""
        ).toLowerCase();
        const matchesSeller = filters.sellers.some((s) => seller.includes(s.toLowerCase()));
        if (!matchesSeller) return false;
      }

      // 7. Customer Reviews
      if (filters.minRating > 0) {
        const rating = product.rating || 4.2;
        if (rating < filters.minRating) return false;
      }

      // 8. Discount
      if (filters.minDiscount > 0) {
        const { discountPercent } = getProductDisplayPricing(product);
        if (discountPercent < filters.minDiscount) return false;
      }

      // 9. Real Fabric / Material
      if (filters.materials.length > 0) {
        const specMaterial = (
          product.specifications?.material ||
          product.specifications?.fabric ||
          ""
        ).toLowerCase();
        const text = `${product.name} ${product.description || ""}`.toLowerCase();
        const matchesMat = filters.materials.some(
          (m) =>
            specMaterial.includes(m.toLowerCase()) || text.includes(m.toLowerCase())
        );
        if (!matchesMat) return false;
      }

      // 10. Real Sleeve Type
      if (filters.sleeves.length > 0) {
        const specSleeve = (
          product.specifications?.sleeve ||
          product.specifications?.sleeve_type ||
          ""
        ).toLowerCase();
        const text = `${product.name} ${product.description || ""}`.toLowerCase();
        const matchesSleeve = filters.sleeves.some(
          (sl) =>
            specSleeve.includes(sl.toLowerCase()) || text.includes(sl.toLowerCase())
        );
        if (!matchesSleeve) return false;
      }

      // 11. Price Filter (Dynamic Brackets + Custom)
      const { price } = getProductDisplayPricing(product);
      if (filters.priceRange) {
        const matchedBracket = dynamicPriceBrackets.find(
          (b) => b.value === filters.priceRange
        );
        if (matchedBracket) {
          if (price < matchedBracket.min || price > matchedBracket.max) {
            return false;
          }
        }
      }
      if (filters.customMinPrice && price < Number(filters.customMinPrice)) return false;
      if (filters.customMaxPrice && price > Number(filters.customMaxPrice)) return false;

      return true;
    });
  }, [products, selectedCategory, filters, dynamicPriceBrackets]);

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
                  router.replace(
                    selectedCategory ? `/products?category=${selectedCategory}` : `/products`,
                    { scroll: false }
                  );
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
            className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-white bg-zinc-900 border border-zinc-700 px-3 py-1.5 rounded-xl active:scale-95 transition-all cursor-pointer shadow-sm"
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

        {/* ========================================================================= */}
        {/* MOBILE SLIDE-OVER DRAWER MODAL: FIXED FOOTER BUTTON (NEVER CUT OFF)        */}
        {/* ========================================================================= */}
        {isMobileFilterOpen && (
          <div className="fixed inset-0 z-[100] flex flex-col justify-end bg-black/85 backdrop-blur-md md:hidden animate-in fade-in duration-200">
            {/* Backdrop Dismiss Area */}
            <div
              className="absolute inset-0"
              onClick={() => setIsMobileFilterOpen(false)}
              aria-hidden="true"
            />

            {/* Bottom Sheet Modal Container */}
            <div className="relative z-10 w-full h-[88vh] max-h-[88vh] bg-zinc-950 border-t border-zinc-800 rounded-t-3xl shadow-2xl flex flex-col overflow-hidden">
              
              {/* 1. Fixed Modal Header */}
              <div className="flex items-center justify-between border-b border-zinc-800/90 px-5 py-4 shrink-0 bg-zinc-950">
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

                <div className="flex items-center gap-3">
                  {activeFilterCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilters(INITIAL_FILTER_STATE)}
                      className="text-xs font-bold text-emerald-400 hover:text-emerald-300 cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsMobileFilterOpen(false)}
                    className="rounded-full bg-zinc-900 p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    aria-label="Close Filters"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* 2. Scrollable Filter Body */}
              <div className="flex-1 overflow-y-auto px-5 py-4 overscroll-contain">
                <ProductFilters
                  filters={filters}
                  setFilters={setFilters}
                  availableBrands={realBrands}
                  availableSellers={realSellers}
                  availableSizes={realSizes}
                  availableColors={realColors}
                  availableMaterials={realMaterials}
                  availableSleeves={realSleeves}
                  priceRangeData={{
                    minPrice: realMinPrice,
                    maxPrice: realMaxPrice,
                    brackets: dynamicPriceBrackets,
                  }}
                  totalFilteredCount={filtered.length}
                />
              </div>

              {/* 3. Fixed High-Elevation Footer Action Button (Completely above any bottom navigation) */}
              <div className="shrink-0 border-t border-zinc-800 bg-zinc-950 px-5 py-3.5 pb-[max(env(safe-area-inset-bottom,16px),24px)] shadow-[0_-12px_30px_rgba(0,0,0,0.9)]">
                <button
                  type="button"
                  onClick={() => setIsMobileFilterOpen(false)}
                  className="w-full flex items-center justify-center rounded-2xl bg-emerald-400 hover:bg-emerald-300 active:scale-[0.98] py-3.5 text-center text-sm font-black uppercase tracking-wider text-black shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all cursor-pointer"
                >
                  Show {filtered.length} {filtered.length === 1 ? "Product" : "Products"}
                </button>
              </div>

            </div>
          </div>
        )}

        <div className="flex items-start gap-6 lg:gap-8">
          {/* ========================================================================= */}
          {/* LEFT SIDEBAR: REAL FILTER FACETS (Visible on md & lg screens)             */}
          {/* ========================================================================= */}
          <aside className="hidden md:block w-60 lg:w-72 shrink-0 sticky top-[150px] max-h-[calc(100vh-150px)] overflow-y-auto no-scrollbar border-r border-zinc-800/80 pr-4">
            <ProductFilters
              filters={filters}
              setFilters={setFilters}
              availableBrands={realBrands}
              availableSellers={realSellers}
              availableSizes={realSizes}
              availableColors={realColors}
              availableMaterials={realMaterials}
              availableSleeves={realSleeves}
              priceRangeData={{
                minPrice: realMinPrice,
                maxPrice: realMaxPrice,
                brackets: dynamicPriceBrackets,
              }}
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
                {filters.sellers.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-xs font-semibold text-emerald-400"
                  >
                    Seller: {s}
                    <X
                      size={12}
                      className="cursor-pointer hover:text-white"
                      onClick={() =>
                        setFilters((p) => ({
                          ...p,
                          sellers: p.sellers.filter((x) => x !== s),
                        }))
                      }
                    />
                  </span>
                ))}
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
                {filters.brands.map((b) => (
                  <span
                    key={b}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-xs font-semibold text-emerald-400"
                  >
                    Brand: {b}
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
                {filters.materials.map((m) => (
                  <span
                    key={m}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-xs font-semibold text-emerald-400"
                  >
                    Fabric: {m}
                    <X
                      size={12}
                      className="cursor-pointer hover:text-white"
                      onClick={() =>
                        setFilters((p) => ({
                          ...p,
                          materials: p.materials.filter((x) => x !== m),
                        }))
                      }
                    />
                  </span>
                ))}
                {filters.sleeves.map((sl) => (
                  <span
                    key={sl}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-xs font-semibold text-emerald-400"
                  >
                    Sleeve: {sl}
                    <X
                      size={12}
                      className="cursor-pointer hover:text-white"
                      onClick={() =>
                        setFilters((p) => ({
                          ...p,
                          sleeves: p.sleeves.filter((x) => x !== sl),
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
                  Try adjusting or clearing your filters (Seller, Price, Fabric, etc.) to view more products.
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

                    const shopDisplayName =
                      product.seller_name ||
                      product.business_name ||
                      (product.seller as any)?.business_name ||
                      product.brand ||
                      "BINODINI BASTRA BIPANI";

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
                            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-400 truncate">
                              {shopDisplayName}
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
