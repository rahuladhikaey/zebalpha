"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Store,
  ShieldCheck,
  Search,
  Copy,
  Check,
  ArrowRight,
  ShoppingBag,
  ArrowUpDown,
  X,
} from "lucide-react";
import type { Product } from "@/lib/types";
import { getProductDisplayPricing } from "@/lib/productPricing";
import { ProductCardImageSlider } from "@/components/ProductCardImageSlider";
import { WishlistButton } from "@/components/WishlistButton";
import { useOfficialTheme } from "@/lib/platform";

export interface StorefrontSellerInfo {
  id: string;
  business_name: string;
  store_slug: string;
  business_logo_url?: string | null;
  store_banner_url?: string | null;
  store_tagline?: string | null;
  is_pro_pass?: boolean;
}

interface StorefrontClientProps {
  mode: "active" | "paused";
  seller?: StorefrontSellerInfo | null;
  products: Product[];
  fallbackTrendingProducts?: Product[];
}

export function StorefrontClient({
  mode,
  seller,
  products,
  fallbackTrendingProducts = [],
}: StorefrontClientProps) {
  const isNativeApp = useOfficialTheme();
  const [inStoreQuery, setInStoreQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "price_desc">("newest");
  const [copied, setCopied] = useState(false);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      const cat = String(p.category_name || p.category || "").trim();
      if (cat && cat.toLowerCase() !== "all styles") set.add(cat);
    });
    return ["All", ...Array.from(set).slice(0, 12)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = inStoreQuery.trim().toLowerCase();
    let list = products.filter((p) => {
      if (selectedCategory !== "All") {
        const cat = String(p.category_name || p.category || "").trim();
        if (cat.toLowerCase() !== selectedCategory.toLowerCase()) return false;
      }
      if (!q) return true;
      const hay = `${p.name} ${p.brand || ""} ${p.description || ""} ${p.collection || ""}`.toLowerCase();
      return hay.includes(q);
    });

    if (sortBy === "price_asc") {
      list = [...list].sort(
        (a, b) => getProductDisplayPricing(a).price - getProductDisplayPricing(b).price
      );
    } else if (sortBy === "price_desc") {
      list = [...list].sort(
        (a, b) => getProductDisplayPricing(b).price - getProductDisplayPricing(a).price
      );
    }
    return list;
  }, [products, inStoreQuery, selectedCategory, sortBy]);

  const storeUrl = seller?.store_slug
    ? `https://zebalpha.shop/store/${seller.store_slug}`
    : "https://zebalpha.shop/products";

  // Avoid showing redundant tagline if it simply duplicates the store name
  const displayTagline = useMemo(() => {
    const t = String(seller?.store_tagline || "").trim();
    const name = String(seller?.business_name || "").trim();
    if (!t || t.toLowerCase() === name.toLowerCase()) return null;
    return t;
  }, [seller?.store_tagline, seller?.business_name]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Ignore clipboard failure
    }
  };

  const renderProductCard = (product: Product, idx: number) => {
    const { price, mrp, hasDiscount, discountPercent } = getProductDisplayPricing(product);
    const images =
      Array.isArray(product.images) && product.images.length > 0
        ? product.images
        : product.image_url
          ? [product.image_url]
          : ["/placeholder.png"];

    return (
      <article
        key={product.id}
        className={
          isNativeApp
            ? "group relative flex flex-col overflow-hidden rounded-2xl bg-white border border-[#EAD296] shadow-[0_6px_18px_-10px_rgba(160,115,20,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#C68A12] isolate"
            : "group relative flex flex-col overflow-hidden rounded-2xl bg-zinc-950 border border-zinc-800/90 shadow-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-zinc-600 isolate"
        }
      >
        <div className="relative">
          <ProductCardImageSlider
            images={images}
            alt={product.name}
            href={`/products/${product.id}`}
            discountPercent={discountPercent}
            isPremium={product.is_premium || product.tier === "PREMIUM"}
            isAboveTheFold={idx < 4}
          />
          <div className="absolute right-2 top-2 z-30">
            <WishlistButton product={product} />
          </div>
        </div>

        <Link
          href={`/products/${product.id}`}
          className="flex flex-1 flex-col px-2.5 py-2.5 sm:px-3.5 sm:py-3"
        >
          <span
            className={`text-[10px] font-black uppercase tracking-wider truncate ${
              isNativeApp ? "text-[#9A6503]" : "text-amber-400/90"
            }`}
          >
            {seller?.business_name || product.brand || "ZebAlpha"}
          </span>
          <h3
            className={`mt-0.5 text-[12px] sm:text-[13px] font-bold line-clamp-2 leading-snug ${
              isNativeApp ? "text-[#14120F]" : "text-zinc-100"
            }`}
          >
            {product.name}
          </h3>

          <div className="mt-auto pt-2 flex items-baseline gap-1.5 flex-wrap">
            <span
              className={`text-sm sm:text-base font-black tracking-tight ${
                isNativeApp ? "text-[#14120F]" : "text-white"
              }`}
            >
              ₹{price.toLocaleString("en-IN")}
            </span>
            {hasDiscount && mrp && (
              <>
                <span
                  className={`text-[10px] sm:text-[11px] font-semibold line-through ${
                    isNativeApp ? "text-[#8A7A5E]" : "text-zinc-500"
                  }`}
                >
                  ₹{mrp.toLocaleString("en-IN")}
                </span>
                <span className="text-[10px] font-black text-emerald-600">
                  {discountPercent}% OFF
                </span>
              </>
            )}
          </div>
        </Link>
      </article>
    );
  };

  // =========================================================================
  // PAUSED / EXPIRED STOREFRONT FALLBACK (Zero Lost Traffic -> ZebAlpha Trending)
  // =========================================================================
  if (mode === "paused" || !seller) {
    return (
      <div
        className={`min-h-screen pb-24 ${
          isNativeApp ? "bg-[#FFFDF8] text-[#14120F]" : "bg-black text-white"
        }`}
      >
        <div className="mx-auto max-w-6xl px-3.5 py-6 sm:px-6 sm:py-10 space-y-7">
          <div
            className={`rounded-3xl border p-6 sm:p-8 text-center space-y-3 ${
              isNativeApp
                ? "border-[#E4C988] bg-gradient-to-b from-white to-[#FFF7DF]"
                : "border-zinc-800 bg-zinc-950"
            }`}
          >
            <div
              className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border ${
                isNativeApp
                  ? "border-[#DFBE6F] bg-[#FFF8DB] text-[#9A6503]"
                  : "border-zinc-700 bg-zinc-900 text-amber-400"
              }`}
            >
              <Store size={22} />
            </div>
            <h1 className="text-lg sm:text-2xl font-black tracking-tight">
              This Seller Storefront is Currently Paused
            </h1>
            <p
              className={`mx-auto max-w-lg text-xs sm:text-sm font-medium ${
                isNativeApp ? "text-[#5C4E35]" : "text-zinc-400"
              }`}
            >
              Explore curated ZebAlpha Official &amp; Trending Indian Styles below with fast
              Pan-India delivery and 7-day easy returns.
            </p>
            <div className="pt-1">
              <Link
                href="/products"
                className={
                  isNativeApp
                    ? "inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#FCE38A] via-[#F5B922] to-[#D49014] px-6 py-2.5 text-xs font-black uppercase tracking-wider text-[#14120F] shadow-md"
                    : "inline-flex items-center gap-2 rounded-full bg-white px-6 py-2.5 text-xs font-black uppercase tracking-wider text-black hover:bg-zinc-200"
                }
              >
                <span>Browse All ZebAlpha Products</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {fallbackTrendingProducts.length > 0 && (
            <section className="space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <span
                    className={`text-[10px] font-black uppercase tracking-[0.22em] ${
                      isNativeApp ? "text-[#9A6503]" : "text-amber-400"
                    }`}
                  >
                    ZebAlpha Official &amp; Trending
                  </span>
                  <h2 className="text-lg sm:text-2xl font-black">Trending Styles Right Now</h2>
                </div>
                <Link
                  href="/products"
                  className={`text-xs font-black hover:underline shrink-0 ${
                    isNativeApp ? "text-[#9A6503]" : "text-zinc-300"
                  }`}
                >
                  View All →
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                {fallbackTrendingProducts.map((p, i) => renderProductCard(p, i))}
              </div>
            </section>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // ACTIVE BRANDED MINI-STOREFRONT (Ultra-Clean, Zero Overlap, Privacy-First)
  // =========================================================================
  return (
    <div
      className={`min-h-screen pb-24 ${
        isNativeApp ? "bg-[#FFFDF8] text-[#14120F]" : "bg-black text-white"
      }`}
    >
      {/* 1. CLEAN BRANDED STORE HEADER (Zero Text Clipping, Zero Seller Address Leak) */}
      <section className="mx-auto max-w-6xl px-3 pt-3 sm:px-6 sm:pt-5">
        <div
          className={`overflow-hidden rounded-3xl border shadow-lg ${
            isNativeApp
              ? "border-[#E4C988] bg-white shadow-[0_12px_30px_-14px_rgba(166,124,28,0.22)]"
              : "border-zinc-800 bg-zinc-950"
          }`}
        >
          {/* Compact Luxury Cover Strip */}
          <div className="relative h-24 sm:h-36 w-full overflow-hidden">
            {seller.store_banner_url ? (
              <img
                src={seller.store_banner_url}
                alt={`${seller.business_name} cover`}
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className={
                  isNativeApp
                    ? "h-full w-full bg-gradient-to-r from-[#FFF3C4] via-[#F7D774] to-[#E9B93B]"
                    : "h-full w-full bg-gradient-to-r from-zinc-900 via-amber-950/70 to-zinc-900"
                }
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/25" />

            {/* Floating Copy Link Control (Top-Right) */}
            <div className="absolute top-2.5 right-2.5 sm:top-3.5 sm:right-3.5 flex items-center">
              <button
                type="button"
                onClick={handleCopy}
                data-photo-overlay="true"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#14120F]/80 border border-white/25 backdrop-blur-md px-3 py-1.5 text-[11px] font-black text-white hover:bg-[#14120F] active:scale-95 transition-all cursor-pointer"
              >
                {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copied ? "Copied" : "Copy Link"}</span>
              </button>
            </div>
          </div>

          {/* Store Identity Row — Properly Positioned Below Cover Strip (Never Clipped!) */}
          <div className="px-4 pb-4 pt-3 sm:px-6 sm:pb-5 sm:pt-4">
            <div className="flex items-start gap-3.5 sm:gap-4">
              {/* Store Avatar with Controlled Negative Margin Only on the Icon Tile */}
              <div
                className={`-mt-10 sm:-mt-12 h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-2xl border-[3px] shadow-md flex items-center justify-center ${
                  isNativeApp
                    ? "border-white bg-[#FFF8DB] text-[#9A6503] ring-1 ring-[#E4C988]"
                    : "border-zinc-950 bg-zinc-900 text-amber-400 ring-1 ring-zinc-700"
                }`}
              >
                {seller.business_logo_url ? (
                  <img
                    src={seller.business_logo_url}
                    alt={seller.business_name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Store size={28} />
                )}
              </div>

              {/* Crisp Store Name + Verified Badge + Clean Store Meta (Zero Personal Info) */}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-lg sm:text-2xl font-black tracking-tight leading-tight truncate">
                    {seller.business_name}
                  </h1>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider shrink-0 ${
                      isNativeApp
                        ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                        : "border-emerald-500/40 bg-emerald-950/70 text-emerald-300"
                    }`}
                  >
                    <ShieldCheck size={11} />
                    Verified Store
                  </span>
                </div>

                {displayTagline && (
                  <p
                    className={`mt-1 text-xs sm:text-sm font-medium line-clamp-2 ${
                      isNativeApp ? "text-[#5C4E35]" : "text-zinc-300"
                    }`}
                  >
                    {displayTagline}
                  </p>
                )}

                <div
                  className={`mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] font-bold ${
                    isNativeApp ? "text-[#7A6847]" : "text-zinc-400"
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    <ShoppingBag size={12} className={isNativeApp ? "text-[#9A6503]" : "text-amber-400"} />
                    {products.length} {products.length === 1 ? "Product" : "Products"}
                  </span>
                  <span>•</span>
                  <span>100% Genuine ZebAlpha Protection</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. COMPACT SINGLE-ROW IN-STORE SEARCH + SORT BAR + CATEGORY CHIPS */}
      <section className="mx-auto max-w-6xl px-3 pt-4 sm:px-6 sm:pt-5 space-y-3.5">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* In-Store Search Input */}
          <div
            className={`flex flex-1 min-w-0 items-center rounded-2xl border px-3 py-2.5 shadow-sm transition-colors ${
              isNativeApp
                ? "border-[#E4C988] bg-white focus-within:border-[#B4780C]"
                : "border-zinc-800 bg-zinc-950 focus-within:border-amber-400/60"
            }`}
          >
            <Search
              size={15}
              className={`mr-2 shrink-0 ${isNativeApp ? "text-[#9A6503]" : "text-zinc-400"}`}
            />
            <input
              type="search"
              value={inStoreQuery}
              onChange={(e) => setInStoreQuery(e.target.value)}
              placeholder={`Search in ${seller.business_name}...`}
              className={`w-full min-w-0 bg-transparent text-xs sm:text-sm font-semibold outline-none ${
                isNativeApp
                  ? "text-[#14120F] placeholder:text-[#8A7A5E]"
                  : "text-white placeholder:text-zinc-500"
              }`}
            />
            {inStoreQuery && (
              <button
                type="button"
                onClick={() => setInStoreQuery("")}
                className="p-0.5 opacity-70 hover:opacity-100 cursor-pointer shrink-0"
                aria-label="Clear store search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Compact Sort Pill */}
          <div
            className={`inline-flex items-center gap-1.5 rounded-2xl border px-3 py-2.5 shadow-sm shrink-0 ${
              isNativeApp
                ? "border-[#E4C988] bg-[#FFF8DB]/65 text-[#14120F]"
                : "border-zinc-800 bg-zinc-950 text-white"
            }`}
          >
            <ArrowUpDown size={13} className={isNativeApp ? "text-[#9A6503]" : "text-amber-400"} />
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "newest" | "price_asc" | "price_desc")
              }
              className="bg-transparent outline-none cursor-pointer text-[11px] sm:text-xs font-black pr-0.5"
              aria-label="Sort store products"
            >
              <option value="newest" className="text-black">
                Newest
              </option>
              <option value="price_asc" className="text-black">
                Price: Low
              </option>
              <option value="price_desc" className="text-black">
                Price: High
              </option>
            </select>
          </div>
        </div>

        {/* Category Filter Chips (Only if multiple categories exist) */}
        {categories.length > 2 && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
            {categories.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 rounded-full border px-3.5 py-1.5 text-[11px] sm:text-xs font-black transition-all cursor-pointer ${
                    active
                      ? isNativeApp
                        ? "border-[#B4780C] bg-gradient-to-r from-[#FCE38A] to-[#F5B922] text-[#14120F] shadow-sm"
                        : "border-amber-400 bg-amber-400 text-black"
                      : isNativeApp
                        ? "border-[#EAD296] bg-white text-[#5C4E35] hover:border-[#C68A12]"
                        : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-white"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        )}

        {/* 3. CLEAN SINGLE-LINE COUNT BAR & COMPETITOR-FREE PRODUCT GRID */}
        <div className="flex items-center justify-between gap-2 text-[11px] sm:text-xs font-bold">
          <span className={isNativeApp ? "text-[#5C4E35]" : "text-zinc-400"}>
            <strong className={isNativeApp ? "text-[#14120F]" : "text-white"}>
              {filteredProducts.length}
            </strong>{" "}
            {filteredProducts.length === 1 ? "item" : "items"} in store
          </span>
          <Link
            href="/products"
            className={`inline-flex items-center gap-1 whitespace-nowrap font-black hover:underline ${
              isNativeApp ? "text-[#9A6503]" : "text-amber-400"
            }`}
          >
            <span>All ZebAlpha</span>
            <ArrowRight size={12} />
          </Link>
        </div>

        {filteredProducts.length === 0 ? (
          <div
            className={`rounded-3xl border p-10 text-center space-y-2.5 ${
              isNativeApp
                ? "border-[#E4C988] bg-white text-[#5C4E35]"
                : "border-zinc-800 bg-zinc-950 text-zinc-400"
            }`}
          >
            <ShoppingBag size={32} className="mx-auto opacity-50" />
            <p className="text-sm font-black">
              No items found for &ldquo;{inStoreQuery}&rdquo;
            </p>
            <button
              type="button"
              onClick={() => {
                setInStoreQuery("");
                setSelectedCategory("All");
              }}
              data-photo-overlay="true"
              className="mt-1 inline-flex rounded-full bg-[#F03A46] px-4 py-2 text-xs font-black text-white cursor-pointer"
            >
              Show All Store Products
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((p, idx) => renderProductCard(p, idx))}
          </div>
        )}
      </section>
    </div>
  );
}
