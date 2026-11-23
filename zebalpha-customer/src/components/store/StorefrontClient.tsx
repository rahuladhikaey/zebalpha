"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Store,
  ShieldCheck,
  MapPin,
  Search,
  Share2,
  Copy,
  Check,
  ArrowRight,
  ShoppingBag,
  Play,
  SlidersHorizontal,
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
  city?: string | null;
  state?: string | null;
  business_logo_url?: string | null;
  store_banner_url?: string | null;
  store_tagline?: string | null;
  is_pro_pass?: boolean;
}

export interface StorefrontReelItem {
  id: string;
  product_id: string;
  creator_name: string;
  creator_handle?: string | null;
  platform: string;
  video_url?: string | null;
  ref_code: string;
  product_name?: string;
  product_image?: string | null;
  product_price?: number;
}

interface StorefrontClientProps {
  mode: "active" | "paused";
  seller?: StorefrontSellerInfo | null;
  products: Product[];
  reels?: StorefrontReelItem[];
  fallbackTrendingProducts?: Product[];
}

export function StorefrontClient({
  mode,
  seller,
  products,
  reels = [],
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
      if (cat) set.add(cat);
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

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleWhatsAppShare = () => {
    const text = `Check out *${seller?.business_name || "this store"}* on ZebAlpha: ${storeUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
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
            ? "group relative flex flex-col overflow-hidden rounded-2xl bg-white border border-[#E4C988] shadow-[0_8px_22px_-12px_rgba(160,115,20,0.22)] transition-all hover:-translate-y-1"
            : "group relative flex flex-col overflow-hidden rounded-2xl bg-zinc-950 border border-zinc-800 shadow-xl transition-all hover:-translate-y-1 hover:border-zinc-600"
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

        <Link href={`/products/${product.id}`} className="flex flex-1 flex-col p-3 sm:p-3.5">
          <span
            className={`text-[10px] font-black uppercase tracking-wider truncate ${
              isNativeApp ? "text-[#9A6503]" : "text-zinc-400"
            }`}
          >
            {seller?.business_name || product.brand || "ZebAlpha"}
          </span>
          <h3
            className={`mt-1 text-xs sm:text-sm font-bold line-clamp-2 leading-snug ${
              isNativeApp ? "text-[#14120F]" : "text-white"
            }`}
          >
            {product.name}
          </h3>

          <div className="mt-auto pt-2.5 flex items-baseline gap-2 flex-wrap">
            <span
              className={`text-sm sm:text-base font-black ${
                isNativeApp ? "text-[#14120F]" : "text-white"
              }`}
            >
              ₹{price.toLocaleString("en-IN")}
            </span>
            {hasDiscount && mrp && (
              <>
                <span
                  className={`text-[11px] font-semibold line-through ${
                    isNativeApp ? "text-[#8A7A5E]" : "text-zinc-500"
                  }`}
                >
                  ₹{mrp.toLocaleString("en-IN")}
                </span>
                <span className="text-[10px] font-black text-emerald-500">
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
        <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12 space-y-8">
          <div
            className={`rounded-3xl border p-6 sm:p-8 text-center space-y-3 ${
              isNativeApp
                ? "border-[#E4C988] bg-gradient-to-b from-white to-[#FFF7DF]"
                : "border-zinc-800 bg-zinc-950"
            }`}
          >
            <div
              className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border ${
                isNativeApp
                  ? "border-[#DFBE6F] bg-[#FFF8DB] text-[#9A6503]"
                  : "border-zinc-700 bg-zinc-900 text-amber-400"
              }`}
            >
              <Store size={26} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
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
            <div className="pt-2">
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
            <section className="space-y-4">
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
                  className={`text-xs font-black hover:underline ${
                    isNativeApp ? "text-[#9A6503]" : "text-zinc-300"
                  }`}
                >
                  View All →
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
                {fallbackTrendingProducts.map((p, i) => renderProductCard(p, i))}
              </div>
            </section>
          )}
        </div>
      </div>
    );
  }

  // =========================================================================
  // ACTIVE BRANDED MINI-STOREFRONT
  // =========================================================================
  return (
    <div
      className={`min-h-screen pb-24 ${
        isNativeApp ? "bg-[#FFFDF8] text-[#14120F]" : "bg-black text-white"
      }`}
    >
      {/* 1. BRANDED HERO BANNER & STORE PROFILE */}
      <section className="mx-auto max-w-6xl px-3.5 pt-4 sm:px-6 sm:pt-6">
        <div
          className={`overflow-hidden rounded-[2rem] border shadow-xl ${
            isNativeApp
              ? "border-[#DFBE6F] bg-white"
              : "border-zinc-800 bg-zinc-950"
          }`}
        >
          {/* Cover Strip */}
          <div className="relative h-32 sm:h-44 w-full overflow-hidden">
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
                    ? "h-full w-full bg-gradient-to-r from-[#FFF3C4] via-[#FCE89C] to-[#F5B922]/70"
                    : "h-full w-full bg-gradient-to-r from-zinc-900 via-amber-950/60 to-zinc-900"
                }
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent" />

            {/* Top-Right Share Bar */}
            <div className="absolute top-3 right-3 flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopy}
                data-photo-overlay="true"
                className="inline-flex items-center gap-1.5 rounded-full bg-black/65 border border-white/20 backdrop-blur-md px-3 py-1.5 text-[11px] font-black text-white hover:bg-black/85 cursor-pointer"
              >
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>{copied ? "Copied" : "Copy Store Link"}</span>
              </button>
              <button
                type="button"
                onClick={handleWhatsAppShare}
                data-photo-overlay="true"
                className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600/90 border border-emerald-400/40 backdrop-blur-md px-3 py-1.5 text-[11px] font-black text-white hover:bg-emerald-500 cursor-pointer"
              >
                <Share2 size={13} />
                <span className="hidden sm:inline">Share</span>
              </button>
            </div>
          </div>

          {/* Store Identity Details */}
          <div className="relative px-4 pb-5 sm:px-7 sm:pb-6">
            <div className="-mt-10 sm:-mt-12 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="flex items-end gap-3.5 sm:gap-4">
                <div
                  className={`h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-2xl border-4 shadow-lg flex items-center justify-center ${
                    isNativeApp
                      ? "border-white bg-[#FFF8DB] text-[#9A6503]"
                      : "border-zinc-950 bg-zinc-900 text-amber-400"
                  }`}
                >
                  {seller.business_logo_url ? (
                    <img
                      src={seller.business_logo_url}
                      alt={seller.business_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <Store size={32} />
                  )}
                </div>

                <div className="pb-0.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight truncate">
                      {seller.business_name}
                    </h1>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                        isNativeApp
                          ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                          : "border-emerald-500/40 bg-emerald-950/70 text-emerald-300"
                      }`}
                    >
                      <ShieldCheck size={11} />
                      Verified Store
                    </span>
                  </div>

                  {seller.store_tagline && (
                    <p
                      className={`mt-1 text-xs sm:text-sm font-medium line-clamp-2 ${
                        isNativeApp ? "text-[#5C4E35]" : "text-zinc-300"
                      }`}
                    >
                      {seller.store_tagline}
                    </p>
                  )}

                  <div
                    className={`mt-1.5 flex flex-wrap items-center gap-3 text-[11px] font-bold ${
                      isNativeApp ? "text-[#7A6847]" : "text-zinc-400"
                    }`}
                  >
                    {(seller.city || seller.state) && (
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={12} />
                        {[seller.city, seller.state].filter(Boolean).join(", ")}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1">
                      <ShoppingBag size={12} />
                      {products.length} Live {products.length === 1 ? "Product" : "Products"}
                    </span>
                    <span>• 100% Genuine ZebAlpha Protection</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. ACTIVE ALPHA MEDIA REELS (Synergy Strip if seller has live video reels) */}
      {reels.length > 0 && (
        <section className="mx-auto max-w-6xl px-3.5 pt-6 sm:px-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm sm:text-base font-black flex items-center gap-2">
              <Play size={15} className="text-[#F03A46] fill-[#F03A46]" />
              <span>Watch {seller.business_name} Reels</span>
            </h2>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
            {reels.map((r) => (
              <Link
                key={r.id}
                href={`/go/${r.ref_code}`}
                className={`group flex w-60 shrink-0 items-center gap-3 rounded-2xl border p-2.5 transition-all ${
                  isNativeApp
                    ? "border-[#EAD296] bg-white hover:border-[#F03A46]"
                    : "border-zinc-800 bg-zinc-950 hover:border-amber-400/60"
                }`}
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-zinc-900">
                  {r.product_image ? (
                    <img
                      src={r.product_image}
                      alt={r.product_name || "Reel"}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                  <span
                    data-photo-overlay="true"
                    className="absolute inset-0 flex items-center justify-center bg-black/35 text-white"
                  >
                    <Play size={16} className="fill-white" />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-black truncate">{r.product_name || "Featured Style"}</p>
                  <p
                    className={`text-[10px] font-bold truncate ${
                      isNativeApp ? "text-[#7A6847]" : "text-zinc-400"
                    }`}
                  >
                    By {r.creator_name} • {r.platform}
                  </p>
                  {typeof r.product_price === "number" && r.product_price > 0 && (
                    <p className="mt-0.5 text-xs font-black text-[#F03A46]">
                      ₹{r.product_price.toLocaleString("en-IN")}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 3. IN-STORE SEARCH + CATEGORY CHIPS + SORT BAR */}
      <section className="mx-auto max-w-6xl px-3.5 pt-6 sm:px-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div
            className={`flex flex-1 items-center rounded-2xl border px-3.5 py-2.5 ${
              isNativeApp
                ? "border-[#DFBE6F] bg-white"
                : "border-zinc-800 bg-zinc-950"
            }`}
          >
            <Search
              size={16}
              className={`mr-2.5 shrink-0 ${isNativeApp ? "text-[#9A6503]" : "text-zinc-400"}`}
            />
            <input
              type="search"
              value={inStoreQuery}
              onChange={(e) => setInStoreQuery(e.target.value)}
              placeholder={`Search inside ${seller.business_name}...`}
              className={`w-full bg-transparent text-xs sm:text-sm font-semibold outline-none ${
                isNativeApp
                  ? "text-[#14120F] placeholder:text-[#7A6847]"
                  : "text-white placeholder:text-zinc-500"
              }`}
            />
            {inStoreQuery && (
              <button
                type="button"
                onClick={() => setInStoreQuery("")}
                className="p-1 opacity-70 hover:opacity-100 cursor-pointer"
                aria-label="Clear store search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div
            className={`inline-flex items-center gap-2 rounded-2xl border px-3.5 py-2 text-xs font-bold shrink-0 ${
              isNativeApp
                ? "border-[#DFBE6F] bg-white text-[#14120F]"
                : "border-zinc-800 bg-zinc-950 text-white"
            }`}
          >
            <SlidersHorizontal size={14} />
            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "newest" | "price_asc" | "price_desc")
              }
              className="bg-transparent outline-none cursor-pointer text-xs font-black"
              aria-label="Sort store products"
            >
              <option value="newest" className="text-black">
                Newest First
              </option>
              <option value="price_asc" className="text-black">
                Price: Low to High
              </option>
              <option value="price_desc" className="text-black">
                Price: High to Low
              </option>
            </select>
          </div>
        </div>

        {/* Category Filter Chips */}
        {categories.length > 2 && (
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {categories.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`shrink-0 rounded-full border px-4 py-1.5 text-xs font-black transition-all cursor-pointer ${
                    active
                      ? isNativeApp
                        ? "border-[#B4780C] bg-gradient-to-r from-[#FCE38A] to-[#F5B922] text-[#14120F]"
                        : "border-white bg-white text-black"
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

        {/* 4. COMPETITOR-FREE SELLER PRODUCT GRID */}
        <div className="flex items-center justify-between text-xs font-bold opacity-80">
          <span>
            Showing <strong>{filteredProducts.length}</strong>{" "}
            {filteredProducts.length === 1 ? "item" : "items"} exclusively from{" "}
            <strong>{seller.business_name}</strong>
          </span>
          <Link href="/products" className="hover:underline">
            Explore all ZebAlpha →
          </Link>
        </div>

        {filteredProducts.length === 0 ? (
          <div
            className={`rounded-3xl border p-10 text-center space-y-2 ${
              isNativeApp
                ? "border-[#E4C988] bg-white text-[#5C4E35]"
                : "border-zinc-800 bg-zinc-950 text-zinc-400"
            }`}
          >
            <ShoppingBag size={36} className="mx-auto opacity-50" />
            <p className="text-sm font-black">No products match &ldquo;{inStoreQuery}&rdquo; in this store</p>
            <button
              type="button"
              onClick={() => {
                setInStoreQuery("");
                setSelectedCategory("All");
              }}
              className="mt-2 inline-flex rounded-full bg-[#F03A46] px-4 py-2 text-xs font-black text-white cursor-pointer"
              data-photo-overlay="true"
            >
              Show All Store Products
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
            {filteredProducts.map((p, idx) => renderProductCard(p, idx))}
          </div>
        )}
      </section>
    </div>
  );
}
