"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ShoppingCart, ArrowLeft, ChevronDown, Sparkles } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useIsNativeApp } from "@/lib/platform";
import { CategoryIconRenderer } from "@/lib/categoryIcons";
import type { CategoryStorefrontPayload } from "@/lib/categoryStorefrontLoader";
import { inferCategoryArchetype, type CategoryWidgetConfig } from "@/lib/categoryStorefrontTypes";
import { HeroCarouselWidget } from "./widgets/HeroCarouselWidget";
import { SubcategoryNavWidget } from "./widgets/SubcategoryNavWidget";
import { ThemedDealRailWidget } from "./widgets/ThemedDealRailWidget";
import {
  AudienceSplit3ColWidget,
  TrendLookbookWidget,
  Occasion2ColWidget,
} from "./widgets/TrendAndOccasionWidgets";
import { BudgetAndDiscountWidget } from "./widgets/BudgetAndDiscountWidget";
import {
  BrandSpotlightGridWidget,
  CuratedShelfWidget,
  FullSpotlightBannerWidget,
  ComboKitsMarqueeWidget,
  ExploreStores3x3Widget,
  OfferPaymentStripWidget,
} from "./widgets/BrandsAndStoresWidgets";
import { CategoryInfiniteFeed } from "./widgets/CategoryInfiniteFeed";

interface CategoryStorefrontClientProps {
  data: CategoryStorefrontPayload;
  seoGuideSlot?: React.ReactNode;
}

const HINTS_BY_ARCHETYPE: Record<string, string[]> = {
  beauty: ["skincare", "face serum", "lipstick", "sunscreen", "hair oil", "perfume"],
  women: ["kurtis", "sarees", "dresses", "korean tops", "ethnic sets", "handbags"],
  electronics: ["earbuds", "smartwatch", "powerbank", "headphones", "chargers"],
  luxe: ["necklaces", "handbags", "home decor", "gifting sets", "watches"],
  fashion: ["oversized tees", "hoodies", "jackets", "cargo pants", "sneakers", "polos"],
};

export function CategoryStorefrontClient({ data, seoGuideSlot }: CategoryStorefrontClientProps) {
  const router = useRouter();
  const isNativeApp = useIsNativeApp();
  const { totalItems: cartCount } = useCart();

  const { category, blueprint, subcategories, brands, approvedSpotlights, allCategoryProducts, paginatedProducts, totalProducts, hasMore, navCategories } = data;
  const tokens = blueprint.theme_tokens;
  const archetype = inferCategoryArchetype(`${category.slug} ${category.name}`);
  const rotatingHints = HINTS_BY_ARCHETYPE[archetype] || HINTS_BY_ARCHETYPE.fashion;

  const [searchText, setSearchText] = useState("");
  const [hintIdx, setHintIdx] = useState(0);
  const [isScrolled, setIsScrolled] = useState(false);

  // Rotating Flipkart-style search placeholder (category-aware!)
  useEffect(() => {
    const t = setInterval(() => {
      setHintIdx((prev) => (prev + 1) % rotatingHints.length);
    }, 2600);
    return () => clearInterval(t);
  }, [rotatingHints.length]);

  // Scroll-linked collapsing category icon strip with hysteresis (zero top-scroll bounce/jitter!)
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY || 0;
      setIsScrolled((prev) => {
        if (!prev && y > 72) return true;
        if (prev && y < 24) return false;
        return prev;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchText.trim();
    const catParam = encodeURIComponent(category.id);
    if (q) {
      router.push(`/products?category=${catParam}&search=${encodeURIComponent(q)}`);
    } else {
      router.push(`/products?category=${catParam}`);
    }
  };

  // Filter widgets enabled for current platform (Web vs Android App)
  const visibleWidgets = blueprint.widgets.filter((w) => {
    if (!w.enabled) return false;
    if (isNativeApp && w.app_enabled === false) return false;
    if (!isNativeApp && w.web_enabled === false) return false;
    return true;
  });

  const renderWidget = (widget: CategoryWidgetConfig) => {
    switch (widget.widget_type) {
      case "HERO_CAROUSEL":
        return (
          <HeroCarouselWidget
            key={widget.id}
            widget={widget}
            categoryId={category.id}
            categoryName={category.name}
            tokens={tokens}
            products={allCategoryProducts}
            spotlights={approvedSpotlights}
          />
        );
      case "SUBCATEGORY_NAV":
        return (
          <SubcategoryNavWidget
            key={widget.id}
            widget={widget}
            categoryId={category.id}
            tokens={tokens}
            subcategories={subcategories}
            products={allCategoryProducts}
          />
        );
      case "AUDIENCE_SPLIT_3COL":
        return (
          <AudienceSplit3ColWidget
            key={widget.id}
            widget={widget}
            categoryId={category.id}
            tokens={tokens}
            products={allCategoryProducts}
          />
        );
      case "THEMED_DEAL_RAIL":
        return (
          <ThemedDealRailWidget
            key={widget.id}
            widget={widget}
            categoryId={category.id}
            tokens={tokens}
            products={allCategoryProducts}
            subcategories={subcategories}
          />
        );
      case "TREND_LOOKBOOK":
        return (
          <TrendLookbookWidget
            key={widget.id}
            widget={widget}
            categoryId={category.id}
            tokens={tokens}
            products={allCategoryProducts}
          />
        );
      case "BUDGET_DISCOUNT_TILES":
        return (
          <BudgetAndDiscountWidget
            key={widget.id}
            widget={widget}
            categoryId={category.id}
            tokens={tokens}
            products={allCategoryProducts}
          />
        );
      case "OCCASION_2COL":
        return (
          <Occasion2ColWidget
            key={widget.id}
            widget={widget}
            categoryId={category.id}
            tokens={tokens}
            products={allCategoryProducts}
          />
        );
      case "FULL_SPOTLIGHT_BANNER":
        return (
          <FullSpotlightBannerWidget
            key={widget.id}
            widget={widget}
            categoryId={category.id}
            tokens={tokens}
            brands={brands}
            products={allCategoryProducts}
          />
        );
      case "BRAND_SPOTLIGHT_GRID":
        return (
          <BrandSpotlightGridWidget
            key={widget.id}
            widget={widget}
            categoryId={category.id}
            tokens={tokens}
            brands={brands}
            products={allCategoryProducts}
            spotlights={approvedSpotlights}
          />
        );
      case "CURATED_SHELF":
        return (
          <CuratedShelfWidget
            key={widget.id}
            widget={widget}
            categoryId={category.id}
            tokens={tokens}
            products={allCategoryProducts}
            spotlights={approvedSpotlights}
          />
        );
      case "COMBO_KITS_MARQUEE":
        return (
          <ComboKitsMarqueeWidget
            key={widget.id}
            widget={widget}
            categoryId={category.id}
            tokens={tokens}
            products={allCategoryProducts}
          />
        );
      case "EXPLORE_STORES_3X3":
        return (
          <ExploreStores3x3Widget
            key={widget.id}
            widget={widget}
            categoryId={category.id}
            tokens={tokens}
            products={allCategoryProducts}
          />
        );
      case "OFFER_PAYMENT_STRIP":
        return (
          <OfferPaymentStripWidget
            key={widget.id}
            widget={widget}
            categoryId={category.id}
          />
        );
      case "INFINITE_PRODUCT_FEED":
        return (
          <CategoryInfiniteFeed
            key={widget.id}
            widget={widget}
            categoryId={category.id}
            categorySlug={category.slug}
            categoryName={category.name}
            initialProducts={paginatedProducts}
            initialTotal={totalProducts}
            initialHasMore={hasMore}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="min-h-screen w-full transition-colors duration-300"
      style={{ backgroundColor: tokens.pageBg, color: "#111111" }}
    >
      {/* STICKY CLEAN CATEGORY HEADER (NO REDUNDANT ZEBQUICK/CUSTOM PILLS) + COLLAPSING CATEGORY TABS */}
      <header
        data-keep-dark="true"
        className="sticky top-0 z-40 w-full shadow-sm transition-colors duration-200"
        style={{ backgroundColor: tokens.headerBg, color: tokens.headerText }}
      >
        {/* Single Sleek Top Row: Back + Search Bar + Cart */}
        <div className="max-w-[1440px] mx-auto px-3 md:px-6 pt-2.5 pb-2">
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <Link
              href="/"
              aria-label="Back to Home"
              className="h-10 w-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-white shrink-0 transition"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder={`Search ${category.name} — try "${rotatingHints[hintIdx % rotatingHints.length]}"`}
                className="w-full h-10 rounded-xl bg-white pl-9 pr-4 text-xs sm:text-sm font-semibold text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2"
                style={{ ["--tw-ring-color" as any]: tokens.accentBg }}
              />
            </div>

            <Link
              href="/cart"
              aria-label="Cart"
              className="relative h-10 px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 flex items-center gap-1.5 text-white shrink-0 transition"
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline text-xs font-extrabold">Cart</span>
              {cartCount > 0 && (
                <span
                  className="inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-black"
                  style={{ backgroundColor: tokens.accentBg, color: tokens.accentText }}
                >
                  {cartCount}
                </span>
              )}
            </Link>
          </form>
        </div>

        {/* Collapsible Horizontal Category Tab Bar (Video 1 & Video 2) */}
        <nav aria-label="Category Switcher" className="border-t border-white/10">
          <div className="max-w-[1440px] mx-auto px-3 md:px-6 flex items-end gap-4 md:gap-6 overflow-x-auto no-scrollbar py-1.5">
            <Link
              href="/"
              className="group shrink-0 flex flex-col items-center gap-1 pb-1 text-white/75 hover:text-white transition"
            >
              {!isScrolled && (
                <div className="h-8 w-8 rounded-xl bg-white/10 flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
              )}
              <span className="text-[11px] font-bold whitespace-nowrap">For You</span>
            </Link>

            {navCategories.map((nc) => {
              const isActive =
                nc.id === category.id ||
                nc.slug.toLowerCase() === category.slug.toLowerCase();
              return (
                <Link
                  key={nc.id}
                  href={`/category/${encodeURIComponent(nc.slug)}`}
                  prefetch={true}
                  className={`group relative shrink-0 flex flex-col items-center gap-1 pb-1.5 transition ${
                    isActive ? "text-white" : "text-white/70 hover:text-white"
                  }`}
                >
                  {!isScrolled && (
                    <div
                      className="h-8 w-8 rounded-xl overflow-hidden flex items-center justify-center transition-transform group-active:scale-95"
                      style={
                        isActive
                          ? { backgroundColor: tokens.accentBg, color: tokens.accentText }
                          : { backgroundColor: "rgba(255,255,255,0.12)", color: "#FFFFFF" }
                      }
                    >
                      {nc.image_url ? (
                        <img src={nc.image_url} alt={nc.name} className="w-full h-full object-cover" />
                      ) : (
                        <CategoryIconRenderer iconKey={nc.icon_key} iconUrl={nc.icon_url} size={16} />
                      )}
                    </div>
                  )}
                  <span className={`text-[11px] whitespace-nowrap ${isActive ? "font-black" : "font-semibold"}`}>
                    {nc.name}
                  </span>
                  {isActive && (
                    <span
                      className="absolute bottom-0 inset-x-0 h-[3px] rounded-full"
                      style={{ backgroundColor: tokens.accentBg }}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>
      </header>

      {/* MODULAR SDUI WIDGET STACK */}
      <main className="pb-20 md:pb-12">
        {visibleWidgets.map((w) => renderWidget(w))}

        {/* Preserved Collapsible SEO / AEO Buying Guide & FAQs at Bottom */}
        {seoGuideSlot && (
          <details className="max-w-[1440px] mx-auto px-3 md:px-6 mt-4 mb-6 group">
            <summary className="list-none cursor-pointer rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-3.5 flex items-center justify-between text-xs sm:text-sm font-extrabold text-zinc-800 hover:bg-zinc-100 transition">
              <span>About {category.name} on Zebalpha — Buying Guide, Sizing & FAQs</span>
              <ChevronDown className="h-4 w-4 text-zinc-500 transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-3 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
              {seoGuideSlot}
            </div>
          </details>
        )}
      </main>
    </div>
  );
}
