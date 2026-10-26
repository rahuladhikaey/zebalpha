"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import {
  useCategories,
  useSubcategories,
  useCategoryTree,
  usePaginatedProducts,
  useDebounce,
  getProductDisplayPricing,
} from "@/hooks/useCatalogQueries";
import { CategoryIconRenderer } from "@/lib/categoryIcons";
import { LoadingCard } from "@/components/LoadingCard";
import { ProductCardImageSlider } from "@/components/ProductCardImageSlider";
import { WishlistButton } from "@/components/WishlistButton";
import { QuickCartButton } from "@/components/QuickCartButton";
import {
  Search,
  ShoppingBag,
  ArrowLeft,
  ChevronRight,
  Package,
  Layers,
  Sparkles,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { isProductNewDrop, isDropLive } from "@/lib/dropUtils";

function CategoriesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const subcategoryParam = searchParams.get("subcategory");

  // Load Main Categories and Full Category Tree from canonical DB
  const { data: mainCategories = [], isLoading: isCategoriesLoading } = useCategories();
  const { data: categoryTree = [] } = useCategoryTree();

  // Active Category State
  const [selectedCategory, setSelectedCategory] = useState<string | number | null>(categoryParam);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | number | null>(subcategoryParam);

  // Search State
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [page, setPage] = useState(1);

  // Sync category & subcategory from URL params
  useEffect(() => {
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    }
    if (subcategoryParam) {
      setSelectedSubcategory(subcategoryParam);
    }
  }, [categoryParam, subcategoryParam]);

  // Find active Main Category metadata
  const activeMainCategory = useMemo(() => {
    if (!selectedCategory) return null;
    return mainCategories.find(
      (c) => String(c.id) === String(selectedCategory) || c.slug === selectedCategory
    ) || categoryTree.find(
      (c) => String(c.id) === String(selectedCategory) || c.slug === selectedCategory
    );
  }, [selectedCategory, mainCategories, categoryTree]);

  // Real Subcategories under active Main Category
  const activeParentId = activeMainCategory ? String(activeMainCategory.id) : null;
  const { data: subcategories = [], isLoading: isSubcatsLoading } = useSubcategories(activeParentId);

  // Find active Subcategory metadata
  const activeSubcategoryMeta = useMemo(() => {
    if (!selectedSubcategory) return null;
    return subcategories.find(
      (s) => String(s.id) === String(selectedSubcategory) || s.slug === selectedSubcategory
    );
  }, [selectedSubcategory, subcategories]);

  // Reset page when category, subcategory or search changes
  useEffect(() => {
    setPage(1);
  }, [selectedCategory, selectedSubcategory, debouncedSearch]);

  // Effective product query category target: specific subcategory ID if selected, else main category ID
  const effectiveProductCategory = selectedSubcategory || selectedCategory;

  // Fetch real seller products for selected category/subcategory
  const {
    data: paginatedData,
    isLoading: isProductsLoading,
    isFetching,
  } = usePaginatedProducts({
    category: effectiveProductCategory,
    search: debouncedSearch,
    page,
    pageSize: 24,
  });

  const products = paginatedData?.products || [];
  const totalCount = paginatedData?.totalCount || 0;

  // Filter out unreleased new drops
  const filteredProducts = useMemo(() => {
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

  // Category Search in Directory Mode (Main Categories & Subcategories)
  const categorySearchResults = useMemo(() => {
    if (!debouncedSearch.trim()) return null;
    const q = debouncedSearch.toLowerCase().trim();

    const matchedMains: typeof mainCategories = [];
    const matchedSubs: Array<{
      sub: typeof subcategories[0];
      parent: typeof mainCategories[0];
    }> = [];

    categoryTree.forEach((main) => {
      if (main.name.toLowerCase().includes(q) || (main.slug && main.slug.toLowerCase().includes(q))) {
        matchedMains.push(main);
      }
      (main.subcategories || []).forEach((sub) => {
        if (sub.name.toLowerCase().includes(q) || (sub.slug && sub.slug.toLowerCase().includes(q))) {
          matchedSubs.push({ sub, parent: main });
        }
      });
    });

    return { matchedMains, matchedSubs };
  }, [debouncedSearch, categoryTree, mainCategories]);

  // Navigate to Main Category
  const handleSelectCategory = (categoryId: string | number) => {
    setSelectedCategory(categoryId);
    setSelectedSubcategory(null);
    setSearch("");
    router.replace(`/categories?category=${categoryId}`, { scroll: false });
  };

  // Navigate to Subcategory
  const handleSelectSubcategory = (subcategoryId: string | number | null) => {
    setSelectedSubcategory(subcategoryId);
    if (subcategoryId && selectedCategory) {
      router.replace(`/categories?category=${selectedCategory}&subcategory=${subcategoryId}`, {
        scroll: false,
      });
    } else if (selectedCategory) {
      router.replace(`/categories?category=${selectedCategory}`, { scroll: false });
    }
  };

  // Back to Main Category Directory
  const handleBackToDirectory = () => {
    setSelectedCategory(null);
    setSelectedSubcategory(null);
    setSearch("");
    router.replace(`/categories`, { scroll: false });
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black pb-28">
      {/* Top Header */}
      <Header
        title={activeMainCategory ? activeMainCategory.name : "Categories"}
        subtitle={activeMainCategory ? "Shop by Category" : "Official Directory"}
      />

      {/* ========================================================================= */}
      {/* VIEW A: INITIAL DIRECTORY VIEW ("SHOP BY CATEGORY")                       */}
      {/* ========================================================================= */}
      {!selectedCategory ? (
        <main className="mx-auto w-full max-w-[1400px] px-3.5 sm:px-6 md:px-8 pt-4 sm:pt-6">
          {/* Header Title & Directory Badge */}
          <div className="mb-5 sm:mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-300 mb-2.5">
              <Sparkles size={12} className="text-white" />
              <span>Shop by Category</span>
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
              Categories Directory
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl">
              Browse authentic verified collections across official categories and subcategories.
            </p>
          </div>

          {/* Sticky Category Search Bar */}
          <div className="sticky top-[60px] md:top-[68px] z-30 bg-black/95 backdrop-blur-xl py-2 mb-6">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search categories & subcategories (e.g. Kurtis, T-Shirts, Hoodies)..."
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-950 py-3 pl-11 pr-10 text-xs sm:text-sm font-semibold text-white placeholder:text-zinc-500 outline-none transition-all focus:border-zinc-500 focus:bg-black shadow-inner"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Category Search Results (When Searching) */}
          {categorySearchResults ? (
            <div className="space-y-6 mb-12">
              {categorySearchResults.matchedMains.length === 0 &&
              categorySearchResults.matchedSubs.length === 0 ? (
                <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-10 text-center text-zinc-400">
                  <ShoppingBag size={40} className="mx-auto mb-3 opacity-30 text-white" />
                  <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                    No Categories Found
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    No categories or subcategories matched &ldquo;{debouncedSearch}&rdquo;.
                  </p>
                  <button
                    onClick={() => setSearch("")}
                    className="mt-4 px-4 py-2 rounded-full bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-all cursor-pointer"
                  >
                    Clear Search
                  </button>
                </div>
              ) : (
                <>
                  {/* Matching Main Categories */}
                  {categorySearchResults.matchedMains.length > 0 && (
                    <div>
                      <h2 className="text-xs font-black uppercase tracking-wider text-zinc-400 mb-3">
                        Matching Main Categories ({categorySearchResults.matchedMains.length})
                      </h2>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {categorySearchResults.matchedMains.map((cat) => (
                          <CategoryCard
                            key={cat.id}
                            category={cat}
                            onSelect={() => handleSelectCategory(cat.id)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matching Subcategories with Parent Category Context */}
                  {categorySearchResults.matchedSubs.length > 0 && (
                    <div>
                      <h2 className="text-xs font-black uppercase tracking-wider text-zinc-400 mb-3">
                        Matching Subcategories ({categorySearchResults.matchedSubs.length})
                      </h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {categorySearchResults.matchedSubs.map(({ sub, parent }) => (
                          <button
                            key={sub.id}
                            type="button"
                            onClick={() => {
                              setSelectedCategory(parent.id);
                              setSelectedSubcategory(sub.id);
                              setSearch("");
                              router.replace(
                                `/categories?category=${parent.id}&subcategory=${sub.id}`,
                                { scroll: false }
                              );
                            }}
                            className="flex items-center justify-between p-3.5 rounded-2xl border border-zinc-800/80 bg-zinc-950 hover:border-zinc-600 hover:bg-zinc-900/60 transition-all text-left cursor-pointer group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-10 w-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                                <CategoryIconRenderer
                                  iconKey={(sub as any).icon_key}
                                  iconUrl={(sub as any).icon_url}
                                  size={18}
                                  className="text-zinc-300 group-hover:text-white"
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-black text-white group-hover:text-zinc-100 truncate">
                                  {sub.name}
                                </p>
                                <p className="text-[10px] font-semibold text-zinc-400 flex items-center gap-1 mt-0.5">
                                  <span>under</span>
                                  <span className="text-zinc-300 font-bold">{parent.name}</span>
                                </p>
                              </div>
                            </div>
                            <ChevronRight
                              size={16}
                              className="text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0 ml-2"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            /* Main Category Grid */
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-black uppercase tracking-wider text-zinc-400">
                  Main Categories ({mainCategories.length})
                </span>
                <span className="text-[11px] font-semibold text-zinc-400">
                  Select a category to view subcategories & products
                </span>
              </div>

              {isCategoriesLoading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-44 rounded-2xl bg-zinc-900/40 border border-zinc-800/60 animate-pulse"
                    />
                  ))}
                </div>
              ) : mainCategories.length === 0 ? (
                <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-10 text-center text-zinc-400">
                  <ShoppingBag size={40} className="mx-auto mb-3 opacity-30 text-white" />
                  <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                    No Categories Configured
                  </h3>
                  <p className="text-xs text-zinc-500 mt-1">
                    Contact Super Admin to activate main categories.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4.5">
                  {mainCategories.map((category) => {
                    const treeItem = categoryTree.find(
                      (c) => String(c.id) === String(category.id)
                    );
                    const subCount = treeItem?.subcategories?.length || 0;

                    return (
                      <CategoryCard
                        key={category.id}
                        category={category}
                        subCount={subCount}
                        onSelect={() => handleSelectCategory(category.id)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      ) : (
        /* ========================================================================= */
        /* VIEW B: CATEGORY PRODUCTS & SUBCATEGORY FILTER VIEW                       */
        /* ========================================================================= */
        <main className="mx-auto w-full max-w-[1400px] px-3.5 sm:px-6 md:px-8 pt-3 sm:pt-5">
          {/* Back Navigation & Breadcrumb */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <button
              type="button"
              onClick={handleBackToDirectory}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-white transition-all cursor-pointer shadow-sm group"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
              <span>All Categories</span>
            </button>

            <span className="text-[11px] font-bold text-zinc-500">
              {totalCount} {totalCount === 1 ? "Product" : "Products"} available
            </span>
          </div>

          {/* Main Category Banner Title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-4 border-b border-zinc-900">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                {activeMainCategory?.image_url && !activeMainCategory.image_url.includes("logo") ? (
                  <Image
                    src={activeMainCategory.image_url}
                    alt={activeMainCategory.name}
                    width={48}
                    height={48}
                    className="object-cover h-full w-full"
                    unoptimized
                  />
                ) : (
                  <CategoryIconRenderer
                    iconKey={(activeMainCategory as any)?.icon_key || activeMainCategory?.icon}
                    iconUrl={(activeMainCategory as any)?.icon_url}
                    size={22}
                    className="text-white"
                  />
                )}
              </div>
              <div>
                <h1 className="text-base sm:text-xl font-black uppercase tracking-tight text-white">
                  {activeMainCategory?.name || "Selected Category"}
                </h1>
                {activeMainCategory?.description && (
                  <p className="text-[11px] text-zinc-400 line-clamp-1">
                    {activeMainCategory.description}
                  </p>
                )}
              </div>
            </div>

            {/* In-Category Search */}
            <div className="relative w-full sm:w-64 md:w-80">
              <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search in ${activeMainCategory?.name || "category"}...`}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-2 pl-9 pr-8 text-xs font-semibold text-white placeholder:text-zinc-500 outline-none focus:border-zinc-500 focus:bg-black transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Subcategory Filter Pills Bar */}
          {subcategories.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
                {/* 1. "ALL" Pill */}
                <button
                  type="button"
                  onClick={() => handleSelectSubcategory(null)}
                  className={`shrink-0 px-4 py-2 rounded-full text-xs font-black tracking-wide transition-all cursor-pointer ${
                    selectedSubcategory === null
                      ? "bg-white text-black shadow-lg shadow-white/10"
                      : "bg-zinc-950 border border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:text-white"
                  }`}
                >
                  ALL
                </button>

                {/* 2. Real Subcategory Pills from Database */}
                {subcategories.map((sub) => {
                  const isSelected =
                    String(selectedSubcategory) === String(sub.id) ||
                    selectedSubcategory === sub.slug;

                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => handleSelectSubcategory(sub.id)}
                      className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-white text-black shadow-lg shadow-white/10"
                          : "bg-zinc-950 border border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:text-white"
                      }`}
                    >
                      <CategoryIconRenderer
                        iconKey={(sub as any).icon_key}
                        iconUrl={(sub as any).icon_url}
                        size={14}
                        className={isSelected ? "text-black" : "text-zinc-400"}
                      />
                      <span>{sub.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Active Subcategory Indicator */}
          {activeSubcategoryMeta && (
            <div className="flex items-center justify-between pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="h-4 w-1 bg-white rounded-full" />
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Showing Subcategory:
                </span>
                <span className="text-xs font-black text-white bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-lg">
                  {activeSubcategoryMeta.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleSelectSubcategory(null)}
                className="text-[11px] font-bold text-zinc-400 hover:text-white underline cursor-pointer"
              >
                Clear Subcategory
              </button>
            </div>
          )}

          {/* Product Grid */}
          {isProductsLoading ? (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <LoadingCard key={i} />
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-10 sm:p-14 text-center text-zinc-400 my-4 shadow-2xl">
              <ShoppingBag size={48} className="mx-auto mb-3 opacity-30 text-white" />
              <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                No products available in this category yet.
              </h3>
              <p className="text-xs font-semibold mt-1.5 text-zinc-400 max-w-md mx-auto">
                {activeSubcategoryMeta
                  ? `No verified seller products found for ${activeSubcategoryMeta.name}. Try selecting another subcategory or viewing all items in ${activeMainCategory?.name}.`
                  : `Verified seller products for ${activeMainCategory?.name} are being added. Check back soon for new drops.`}
              </p>
              <div className="flex items-center justify-center gap-3 mt-6">
                {activeSubcategoryMeta && (
                  <button
                    type="button"
                    onClick={() => handleSelectSubcategory(null)}
                    className="rounded-full border border-zinc-700 bg-zinc-900 text-white px-5 py-2.5 text-xs font-bold hover:bg-zinc-800 transition-all cursor-pointer"
                  >
                    View All {activeMainCategory?.name}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleBackToDirectory}
                  className="rounded-full border border-white/20 bg-white text-black px-6 py-2.5 text-xs font-black uppercase tracking-wider hover:bg-neutral-200 transition-all cursor-pointer shadow-lg"
                >
                  All Categories
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {filteredProducts.map((product, idx) => {
                const { price: displayPrice, mrp: displayMrp, discountPercent } =
                  getProductDisplayPricing(product);
                return (
                  <article
                    key={product.id}
                    className="group relative flex flex-col overflow-hidden rounded-2xl bg-zinc-950 border border-zinc-800/80 shadow-xl transition-all hover:border-zinc-600 hover:shadow-2xl"
                  >
                    {/* Image Slider */}
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
        </main>
      )}
    </div>
  );
}

/**
 * Main Category Card Component adhering strictly to STEP 8 Priority:
 * 1. Admin-uploaded category image (if valid and not logo)
 * 2. Automatically assigned vector category icon
 * 3. Neutral fallback icon (Package)
 * NEVER uses the ZebAlpha logo as a universal card thumbnail!
 */
function CategoryCard({
  category,
  subCount,
  onSelect,
}: {
  category: any;
  subCount?: number;
  onSelect: () => void;
}) {
  const hasValidAdminImage =
    Boolean(category.image_url) &&
    !category.image_url.includes("official-logo") &&
    !category.image_url.includes("logo.png");

  return (
    <button
      type="button"
      onClick={onSelect}
      className="group relative flex flex-col overflow-hidden rounded-2xl bg-zinc-950 border border-zinc-800/80 p-3.5 sm:p-4 text-left transition-all hover:border-zinc-500 hover:bg-zinc-900/60 hover:shadow-2xl hover:scale-[1.02] cursor-pointer"
    >
      {/* Top Icon / Image Container */}
      <div className="relative h-24 sm:h-28 w-full rounded-xl bg-zinc-900 border border-zinc-800/80 flex items-center justify-center overflow-hidden mb-3 group-hover:border-zinc-700 transition-colors">
        {hasValidAdminImage ? (
          <Image
            src={category.image_url}
            alt={category.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            unoptimized
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-1.5 p-2">
            <CategoryIconRenderer
              iconKey={category.icon_key || category.icon}
              iconUrl={category.icon_url}
              size={32}
              className="text-zinc-200 group-hover:text-white group-hover:scale-110 transition-all duration-200"
            />
          </div>
        )}
      </div>

      {/* Category Info */}
      <div className="flex-1 flex flex-col justify-between">
        <div>
          <h2 className="text-xs sm:text-sm font-black text-white uppercase tracking-tight group-hover:text-zinc-100 line-clamp-1">
            {category.name}
          </h2>
          {category.description && (
            <p className="text-[10px] sm:text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
              {category.description}
            </p>
          )}
        </div>

        <div className="mt-3 pt-2 border-t border-zinc-900 flex items-center justify-between">
          <span className="text-[10px] font-bold text-zinc-400">
            {typeof subCount === "number" && subCount > 0
              ? `${subCount} Subcategories`
              : "Explore"}
          </span>
          <ChevronRight
            size={14}
            className="text-zinc-400 group-hover:text-white group-hover:translate-x-0.5 transition-all"
          />
        </div>
      </div>
    </button>
  );
}

export default function CategoriesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black text-white p-8 flex items-center justify-center">
          <div className="text-xs font-bold uppercase tracking-widest text-zinc-400">
            Loading Categories...
          </div>
        </div>
      }
    >
      <CategoriesContent />
    </Suspense>
  );
}
