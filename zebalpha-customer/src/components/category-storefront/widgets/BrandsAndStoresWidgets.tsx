"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, ChevronRight, Sparkles, ShieldCheck, Truck } from "lucide-react";
import type {
  CategoryThemeTokens,
  CategoryWidgetConfig,
  BrandSpotlightItem,
  MicroStoreTile,
  CategorySpotlightRequest,
} from "@/lib/categoryStorefrontTypes";
import type { AutoPilotBrandSummary, StorefrontProductCard } from "@/lib/categoryStorefrontLoader";

interface BrandsWidgetProps {
  widget: CategoryWidgetConfig;
  categoryId: string;
  tokens: CategoryThemeTokens;
  brands: AutoPilotBrandSummary[];
  products: StorefrontProductCard[];
  spotlights: CategorySpotlightRequest[];
}

// ---------------------------------------------------------------------------
// 1. Brand Spotlight Grid: 3x3 Polaroid (Fashion) OR 2-Col Dark Glow (Beauty)
// ---------------------------------------------------------------------------
export function BrandSpotlightGridWidget({
  widget,
  categoryId,
  tokens,
  brands,
  products,
  spotlights,
}: BrandsWidgetProps) {
  const catParam = encodeURIComponent(categoryId);
  const variant = widget.style_variant || "polaroid_3x3";
  const maxItems = Number(widget.config?.max_items || (variant === "polaroid_3x3" ? 9 : 6));

  const manualBrands: BrandSpotlightItem[] = Array.isArray(widget.config?.brands)
    ? widget.config.brands.filter((b: any) => b?.brand_name)
    : [];

  const sellerBrands: BrandSpotlightItem[] = spotlights
    .filter((s) => s.target_widget === "BRAND_SPOTLIGHT_GRID")
    .map((s) => {
      const matched = products.find((p) => s.product_ids?.includes(p.id)) || products[0];
      return {
        id: `sb-${s.id}`,
        brand_name: s.brand_name,
        offer_text: s.offer_badge || "Top Deals",
        product_image_url: s.banner_image_url || matched?.image_url || "",
        secondary_image_url: matched?.images?.[1] || matched?.image_url || "",
        destination_url: s.destination_url || `/products?category=${catParam}&brand=${encodeURIComponent(s.brand_name)}`,
      };
    });

  let items: BrandSpotlightItem[] = [...manualBrands, ...sellerBrands];

  if (items.length < maxItems && widget.auto_fill !== false) {
    const existingNames = new Set(items.map((i) => i.brand_name.toLowerCase()));
    for (const b of brands) {
      if (items.length >= maxItems) break;
      if (existingNames.has(b.brand_name.toLowerCase())) continue;
      existingNames.add(b.brand_name.toLowerCase());
      items.push({
        id: `ab-${b.brand_name}`,
        brand_name: b.brand_name,
        offer_text: b.max_discount >= 15 ? `Up to ${b.max_discount}% Off` : `From ₹${b.min_price}`,
        product_image_url: b.primary_image,
        secondary_image_url: b.secondary_image,
        destination_url: `/products?category=${catParam}&brand=${encodeURIComponent(b.brand_name)}`,
      });
    }
  }

  if (items.length === 0) return null;

  // VARIANT A: Beauty 2-Col Cosmic Dark Glow Cards (Video 1: "Boujee brands" / "Biggest beauty brands")
  if (variant === "glow_2col") {
    return (
      <section className="max-w-[1440px] mx-auto px-3 md:px-6 py-4">
        <div className="mb-3">
          <h2 className="text-base md:text-xl font-black text-zinc-900 tracking-tight">{widget.title}</h2>
          {widget.subtitle && <p className="text-xs text-zinc-500 font-medium">{widget.subtitle}</p>}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {items.slice(0, maxItems).map((b, idx) => (
            <Link
              key={b.id}
              href={b.destination_url}
              data-keep-dark="true"
              className="group relative rounded-[22px] overflow-hidden p-3.5 sm:p-5 min-h-[175px] sm:min-h-[220px] flex flex-col justify-between shadow-md hover:shadow-xl transition-all"
              style={{
                background:
                  idx % 2 === 0
                    ? "radial-gradient(circle at 80% 30%, #7e22ce 0%, #2e1065 45%, #0f071c 100%)"
                    : "radial-gradient(circle at 80% 30%, #be185d 0%, #4c0519 45%, #14050c 100%)",
              }}
            >
              {/* Tilted White Brand Pill (Video 1 signature!) */}
              <div className="relative z-10 flex items-start justify-between gap-2">
                <span className="inline-block -rotate-2 rounded-xl bg-white px-3 py-1.5 text-xs sm:text-sm font-black uppercase tracking-tight text-zinc-950 shadow-md max-w-[75%] truncate">
                  {b.brand_name}
                </span>
                <Sparkles className="h-4 w-4 text-pink-300 shrink-0" />
              </div>

              <div className="relative z-10 mt-2">
                <p className="text-sm sm:text-lg font-extrabold text-white drop-shadow-sm">{b.offer_text}</p>
              </div>

              {/* Dual Overlapping Product Showcase */}
              <div className="relative z-10 mt-3 flex items-end justify-end gap-2">
                {b.product_image_url && (
                  <div className="w-16 h-20 sm:w-24 sm:h-28 rounded-xl overflow-hidden bg-white/10 border border-white/20 shadow-lg group-hover:-translate-y-1 transition-transform">
                    <img src={b.product_image_url} alt={b.brand_name} className="w-full h-full object-cover object-top" loading="lazy" />
                  </div>
                )}
                {b.secondary_image_url && b.secondary_image_url !== b.product_image_url && (
                  <div className="w-14 h-16 sm:w-20 sm:h-24 rounded-xl overflow-hidden bg-white/10 border border-white/20 shadow-lg group-hover:translate-y-0.5 transition-transform">
                    <img src={b.secondary_image_url} alt={b.brand_name} className="w-full h-full object-cover object-top" loading="lazy" />
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  // VARIANT B: Fashion 3x3 Pinned Polaroid Brand Grid (Video 2: "Spotlight brands")
  return (
    <section className="max-w-[1440px] mx-auto px-3 md:px-6 py-4">
      <div className="text-center mb-3.5">
        <h2 className="text-lg md:text-2xl font-black text-zinc-950 tracking-tight">{widget.title}</h2>
        {widget.subtitle && (
          <p
            className="inline-block mt-0.5 rounded-full px-3 py-0.5 text-[11px] font-black"
            style={{ backgroundColor: tokens.accentBg, color: tokens.accentText }}
          >
            {widget.subtitle}
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-2.5 md:gap-4">
        {items.slice(0, maxItems).map((b) => (
          <Link
            key={b.id}
            href={b.destination_url}
            className="group relative bg-white rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col justify-between pt-4"
          >
            {/* Cute Top-Center Tape Strip */}
            <span className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-8 h-2.5 rounded-b bg-zinc-200/90" />

            <div className="px-2.5 pb-2 flex flex-col items-center text-center gap-1.5">
              {b.product_image_url && (
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden bg-zinc-50 border border-zinc-100">
                  <img src={b.product_image_url} alt={b.brand_name} className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform" loading="lazy" />
                </div>
              )}
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-tight text-zinc-950 line-clamp-1">
                {b.brand_name}
              </span>
            </div>

            {/* Bold Black + Accent Bottom Offer Strip */}
            <div
              data-keep-dark="true"
              className="w-full py-1.5 px-1.5 text-center text-[10px] sm:text-[11px] font-black border-t-2"
              style={{ backgroundColor: "#111111", color: "#FFFFFF", borderTopColor: tokens.accentBg }}
            >
              {b.offer_text}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 2. Curated / Fresh Finds Pastel Shelf (Video 1: 00:17, 00:19)
// ---------------------------------------------------------------------------
export function CuratedShelfWidget({
  widget,
  categoryId,
  tokens,
  products,
  spotlights,
}: Omit<BrandsWidgetProps, "brands">) {
  const catParam = encodeURIComponent(categoryId);
  const maxItems = Number(widget.config?.max_items || 8);

  const spotlightCards = spotlights
    .filter((s) => s.target_widget === "CURATED_SHELF")
    .map((s) => {
      const matched = products.find((p) => s.product_ids?.includes(p.id)) || products[0];
      return {
        id: `cs-${s.id}`,
        brand: s.brand_name,
        offer: s.offer_badge,
        image_url: s.banner_image_url || matched?.image_url || "",
        href: s.destination_url || `/products?category=${catParam}&brand=${encodeURIComponent(s.brand_name)}`,
      };
    });

  const autoCards = products.slice(0, maxItems).map((p) => ({
    id: `cp-${p.id}`,
    brand: p.brand,
    offer: p.discountPercent >= 15 ? `Up to ${p.discountPercent}% Off` : `Under ₹${Math.ceil(p.price / 50) * 50}`,
    image_url: p.image_url,
    href: `/products/${p.id}`,
  }));

  const cards = [...spotlightCards, ...autoCards].slice(0, maxItems);
  if (cards.length === 0) return null;

  return (
    <section className="max-w-[1440px] mx-auto px-3 md:px-6 py-3">
      <div className="mb-3">
        <h2 className="text-base md:text-xl font-black text-zinc-900 tracking-tight">{widget.title}</h2>
        {widget.subtitle && <p className="text-xs text-zinc-500 font-medium">{widget.subtitle}</p>}
      </div>

      <div className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth pb-1">
        {cards.map((c) => (
          <Link
            key={c.id}
            href={c.href}
            className="group shrink-0 w-[136px] sm:w-[164px] rounded-2xl overflow-hidden border shadow-sm hover:shadow-md transition-all flex flex-col"
            style={{ backgroundColor: tokens.softTintBg, borderColor: tokens.borderColor }}
          >
            <div className="aspect-[4/4.2] w-full p-2.5 flex items-center justify-center">
              {c.image_url ? (
                <img
                  src={c.image_url}
                  alt={c.brand}
                  className="w-full h-full object-cover object-top rounded-xl group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full rounded-xl bg-white/70" />
              )}
            </div>
            <div className="bg-white px-2 py-1.5 text-center border-t border-zinc-100">
              <p className="text-[11px] font-black uppercase tracking-tight text-zinc-900 truncate">{c.brand}</p>
            </div>
            <div
              data-keep-dark="true"
              className="py-1.5 px-2 text-center text-[11px] font-black"
              style={{ backgroundColor: tokens.pillBg, color: tokens.pillText }}
            >
              {c.offer}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 3. Full-Width Luxe / Mega Brand Spotlight Banner (Video 1: 00:39 & Video 2: 00:18)
// ---------------------------------------------------------------------------
export function FullSpotlightBannerWidget({
  widget,
  categoryId,
  tokens,
  brands,
  products,
}: {
  widget: CategoryWidgetConfig;
  categoryId: string;
  tokens: CategoryThemeTokens;
  brands: AutoPilotBrandSummary[];
  products: StorefrontProductCard[];
}) {
  const catParam = encodeURIComponent(categoryId);
  const variant = widget.style_variant || "luxe_noir_gold";
  const cfg = widget.config || {};
  const href = cfg.destination_url || `/products?category=${catParam}&sort=discount_desc`;
  const bannerImg = cfg.banner_image_url || products[0]?.image_url || "";

  const isLuxeGold = variant === "luxe_noir_gold";
  const isBridal = variant === "bridal_pastel";

  return (
    <section className="max-w-[1440px] mx-auto px-3 md:px-6 py-3">
      <Link
        href={href}
        data-keep-dark="true"
        className="group relative block rounded-[24px] overflow-hidden shadow-md hover:shadow-xl transition-all"
        style={{
          background: isLuxeGold
            ? "linear-gradient(125deg, #0b0907 0%, #3a2711 50%, #120d08 100%)"
            : isBridal
              ? "linear-gradient(125deg, #4a0e2e 0%, #be185d 55%, #831843 100%)"
              : "linear-gradient(125deg, #111315 0%, #23272b 55%, #0c0e10 100%)",
        }}
      >
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-6 md:px-10 md:py-9">
          <div className="text-center sm:text-left space-y-2 max-w-xl">
            <h2
              className="text-2xl md:text-4xl font-black tracking-tight leading-tight"
              style={{ color: isLuxeGold ? "#FDE68A" : "#FFFFFF" }}
            >
              {widget.title}
            </h2>
            {widget.subtitle && (
              <p className="text-xs md:text-sm font-medium text-white/80">{widget.subtitle}</p>
            )}
            <span
              className="inline-flex items-center gap-2 mt-2 rounded-full px-5 py-2 text-xs md:text-sm font-black shadow-lg group-hover:gap-3 transition-all"
              style={{
                backgroundColor: isLuxeGold ? "#FDE68A" : tokens.accentBg,
                color: isLuxeGold ? "#140E05" : tokens.accentText,
              }}
            >
              {cfg.cta_label || "Explore now"}
              <ArrowRight className="h-4 w-4" />
            </span>
          </div>

          {bannerImg && (
            <div className="w-32 h-32 sm:w-36 sm:h-36 md:w-44 md:h-44 rounded-2xl overflow-hidden border border-white/20 shadow-2xl shrink-0 group-hover:scale-105 transition-transform duration-300">
              <img src={bannerImg} alt={widget.title} className="w-full h-full object-cover object-top" loading="lazy" />
            </div>
          )}
        </div>

        {/* Optional Brand Ticker Strip underneath (Video 2: 00:18) */}
        {variant === "brand_ticker_banner" && brands.length > 0 && (
          <div className="relative z-10 bg-white/95 border-t border-white/20 px-4 py-2 flex items-center gap-4 overflow-x-auto no-scrollbar">
            {brands.slice(0, 8).map((b) => (
              <span
                key={b.brand_name}
                className="shrink-0 text-[11px] font-black uppercase tracking-wider text-zinc-900 px-2.5 py-0.5 rounded bg-zinc-100"
              >
                {b.brand_name}
              </span>
            ))}
          </div>
        )}
      </Link>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 4. Combo & Kit Deals 3-Col + Diagonal Tilted Marquee Tape (Video 1: 00:18, 00:33)
// ---------------------------------------------------------------------------
export function ComboKitsMarqueeWidget({
  widget,
  categoryId,
  tokens,
  products,
}: {
  widget: CategoryWidgetConfig;
  categoryId: string;
  tokens: CategoryThemeTokens;
  products: StorefrontProductCard[];
}) {
  const catParam = encodeURIComponent(categoryId);
  const cfg = widget.config || {};
  const marqueeText = cfg.marquee_text || "ZEBALPHA SPECIALS • VALUE COMBOS • UP TO 80% OFF •";
  const manualKits: Array<{ id: string; title: string; offer_pill: string; image_url?: string; destination_url?: string }> =
    Array.isArray(cfg.kits) ? cfg.kits : [];

  const comboProds = products.filter((p) => p.isCombo);
  const fallbackPool = comboProds.length >= 3 ? comboProds : products;

  const kits =
    manualKits.length > 0
      ? manualKits.map((k, idx) => ({
          ...k,
          image_url: k.image_url || fallbackPool[idx]?.image_url || "",
          destination_url: k.destination_url || `/products?category=${catParam}&tag=combo`,
        }))
      : fallbackPool.slice(0, 3).map((p) => ({
          id: `kit-${p.id}`,
          title: p.name,
          offer_pill: p.discountPercent >= 15 ? `Up to ${p.discountPercent}% Off` : `₹${p.price}`,
          image_url: p.image_url,
          destination_url: `/products/${p.id}`,
        }));

  if (kits.length === 0) return null;

  return (
    <section className="max-w-[1440px] mx-auto px-3 md:px-6 py-4">
      <div
        data-keep-dark="true"
        className="relative rounded-[26px] overflow-hidden pt-5 pb-16 sm:pb-20 px-3.5 md:px-6 shadow-lg"
        style={{ backgroundColor: tokens.secondaryBoxBg, color: tokens.secondaryBoxText }}
      >
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h2 className="text-lg md:text-2xl font-black tracking-tight">{widget.title}</h2>
            {widget.subtitle && <p className="text-xs opacity-75">{widget.subtitle}</p>}
          </div>
          <Link
            href={`/products?category=${catParam}&tag=combo`}
            className="text-xs font-black inline-flex items-center gap-1"
            style={{ color: tokens.accentBg }}
          >
            All Combos <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 md:gap-4 relative z-10">
          {kits.map((kit) => (
            <Link
              key={kit.id}
              href={kit.destination_url || `/products?category=${catParam}&tag=combo`}
              className="group flex flex-col items-center text-center"
            >
              <div className="w-full aspect-[4/4.3] rounded-2xl overflow-hidden bg-white p-1.5 shadow-md">
                {kit.image_url ? (
                  <img
                    src={kit.image_url}
                    alt={kit.title}
                    className="w-full h-full object-cover object-top rounded-xl group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full rounded-xl bg-zinc-100 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-zinc-400" />
                  </div>
                )}
              </div>
              <p className="mt-2 text-xs sm:text-sm font-black text-white leading-tight">{kit.offer_pill}</p>
              <p className="text-[11px] sm:text-xs font-semibold text-white/75 line-clamp-1">{kit.title}</p>
            </Link>
          ))}
        </div>

        {/* Signature Tilted Marquee Ribbon (Video 1: 00:33) */}
        <div
          className="pointer-events-none absolute -bottom-1 -inset-x-6 -rotate-2 py-1.5 overflow-hidden whitespace-nowrap shadow-md"
          style={{ backgroundColor: tokens.marqueeBg, color: tokens.marqueeText }}
        >
          <div className="inline-block text-[10px] sm:text-xs font-black uppercase tracking-[0.22em]">
            {Array.from({ length: 6 })
              .map(() => marqueeText)
              .join("   ")}
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 5. "Explore our stores" 3x3 Framed Micro-Stores (Video 2: 00:20–00:21)
// ---------------------------------------------------------------------------
export function ExploreStores3x3Widget({
  widget,
  categoryId,
  tokens,
  products,
}: {
  widget: CategoryWidgetConfig;
  categoryId: string;
  tokens: CategoryThemeTokens;
  products: StorefrontProductCard[];
}) {
  const catParam = encodeURIComponent(categoryId);
  const stores: MicroStoreTile[] = Array.isArray(widget.config?.stores) ? widget.config.stores : [];
  if (stores.length === 0) return null;

  const isBlush = widget.style_variant === "blush_frame_arrow";
  const frameBg = isBlush ? "#4A0E2E" : "#111214";

  return (
    <section className="max-w-[1440px] mx-auto px-3 md:px-6 py-4">
      <div className="text-center mb-3.5">
        <h2 className="text-lg md:text-2xl font-black text-zinc-950 tracking-tight">{widget.title}</h2>
        {widget.subtitle && <p className="text-xs text-zinc-500 font-semibold">{widget.subtitle}</p>}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2.5 md:gap-3.5">
        {stores.map((st, idx) => {
          const taggedProd =
            products.find((p) => st.tag_filter && p.storeTags.includes(st.tag_filter.toLowerCase())) ||
            products[idx];
          const imgUrl = st.image_url || taggedProd?.image_url || "";
          const href = st.destination_url || `/products?category=${catParam}&tag=${encodeURIComponent(st.tag_filter || st.title)}`;

          return (
            <Link
              key={st.id || idx}
              href={href}
              data-keep-dark="true"
              className="group relative rounded-2xl overflow-hidden p-2 sm:p-2.5 flex flex-col justify-between aspect-[4/4.4] shadow-sm hover:shadow-lg transition-all"
              style={{ backgroundColor: frameBg }}
            >
              <p className="relative z-10 text-[10px] sm:text-[11px] font-black uppercase leading-tight text-white line-clamp-2 pr-1">
                {st.title}
              </p>

              <div className="relative mt-1.5 flex-1 w-full rounded-xl overflow-hidden bg-white/10">
                {imgUrl ? (
                  <img
                    src={imgUrl}
                    alt={st.title}
                    className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div
                    className="w-full h-full flex flex-col items-center justify-center gap-1 p-2 text-center"
                    style={{
                      background: `radial-gradient(circle at 30% 25%, ${tokens.accentBg}30 0%, rgba(255,255,255,0.04) 75%)`,
                    }}
                  >
                    <Sparkles className="h-5 w-5 opacity-75" style={{ color: tokens.accentBg }} />
                    <span className="text-[9px] font-extrabold uppercase tracking-wider text-white/65">
                      Shop Edit
                    </span>
                  </div>
                )}
                {/* Signature Circular White Arrow Badge Bottom-Right */}
                <span className="absolute bottom-1.5 right-1.5 h-5 w-5 sm:h-6 sm:w-6 rounded-full bg-white text-zinc-950 flex items-center justify-center shadow group-hover:scale-110 transition-transform">
                  <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 6. Dual Offer / Welcome Strip (Video 1: 00:21, 00:31)
// ---------------------------------------------------------------------------
export function OfferPaymentStripWidget({
  widget,
  categoryId,
}: {
  widget: CategoryWidgetConfig;
  categoryId: string;
}) {
  const cfg = widget.config || {};
  const catParam = encodeURIComponent(categoryId);
  return (
    <section className="max-w-[1440px] mx-auto px-3 md:px-6 py-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href={cfg.left_href || `/products?category=${catParam}`}
          className="flex items-center justify-between gap-3 rounded-2xl bg-[#ECFDF5] border border-emerald-200 px-4 py-3.5 hover:shadow-sm transition"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="h-10 w-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-black text-zinc-950 truncate">
                {cfg.left_title || "Flat ₹100 OFF on 1st Order"}
              </p>
              <p className="text-[11px] font-semibold text-zinc-600 truncate">
                {cfg.left_subtitle || "Use code FIRST100 on orders ₹399+"}
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-zinc-700 shrink-0" />
        </Link>

        <Link
          href={cfg.right_href || `/products?category=${catParam}&sort=price_asc`}
          className="flex items-center justify-between gap-3 rounded-2xl bg-[#EFF6FF] border border-blue-200 px-4 py-3.5 hover:shadow-sm transition"
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Truck className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-black text-zinc-950 truncate">
                {cfg.right_title || "Free Delivery & Easy Exchange"}
              </p>
              <p className="text-[11px] font-semibold text-zinc-600 truncate">
                {cfg.right_subtitle || "COD & UPI ready • Free shipping above ₹499"}
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-zinc-700 shrink-0" />
        </Link>
      </div>
    </section>
  );
}
