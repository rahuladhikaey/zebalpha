"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { CategoryThemeTokens, CategoryWidgetConfig } from "@/lib/categoryStorefrontTypes";
import type { StorefrontProductCard } from "@/lib/categoryStorefrontLoader";

interface BudgetAndDiscountWidgetProps {
  widget: CategoryWidgetConfig;
  categoryId: string;
  tokens: CategoryThemeTokens;
  products?: StorefrontProductCard[];
}

function computeSmartPriceSlabs(products: StorefrontProductCard[], fallback: number[]): number[] {
  const prices = products
    .map((p) => Number(p.price || 0))
    .filter((p) => p > 0)
    .sort((a, b) => a - b);
  if (prices.length === 0) return fallback;

  const minP = prices[0];
  const maxP = prices[prices.length - 1];
  const roundToNice = (n: number) => {
    if (n <= 299) return Math.ceil(n / 50) * 50 - 1;
    if (n <= 999) return Math.ceil(n / 100) * 100 - 1;
    return Math.ceil(n / 250) * 250 - 1;
  };

  const s1 = roundToNice(Math.max(199, minP));
  const s2 = roundToNice(Math.max(s1 + 100, prices[Math.floor(prices.length * 0.55)] || s1 + 100));
  const s3 = roundToNice(Math.max(s2 + 100, maxP));
  return Array.from(new Set([s1, s2, s3])).sort((a, b) => a - b);
}

export function BudgetAndDiscountWidget({
  widget,
  categoryId,
  tokens,
  products = [],
}: BudgetAndDiscountWidgetProps) {
  const catParam = encodeURIComponent(categoryId);
  const variant = widget.style_variant || "ticket_3col";
  const cfg = widget.config || {};

  const configuredPriceSlabs: number[] =
    Array.isArray(cfg.price_slabs) && cfg.price_slabs.length > 0
      ? cfg.price_slabs.map(Number).filter((n: number) => !isNaN(n) && n > 0)
      : [299, 499, 799];

  // If smart_auto_slabs is enabled (or auto_fill is on and none of the default slabs have matching items),
  // automatically align slabs to real product prices so every card shows live products!
  const anyMatchesConfigured =
    products.length === 0 ||
    configuredPriceSlabs.some((slab) => products.some((p) => p.price > 0 && p.price <= slab));

  const priceSlabs =
    cfg.smart_auto_slabs === true || (widget.auto_fill !== false && !anyMatchesConfigured)
      ? computeSmartPriceSlabs(products, configuredPriceSlabs)
      : configuredPriceSlabs;

  const discountSlabs: number[] =
    Array.isArray(cfg.discount_slabs) && cfg.discount_slabs.length > 0
      ? cfg.discount_slabs.map(Number).filter((n: number) => !isNaN(n) && n > 0)
      : [30, 50, 70];

  const countUnderPrice = (maxP: number) => products.filter((p) => p.price > 0 && p.price <= maxP).length;
  const countMinDiscount = (minD: number) => products.filter((p) => p.discountPercent >= minD).length;

  const priceGridCols =
    priceSlabs.length <= 2
      ? "grid-cols-2"
      : priceSlabs.length === 4
        ? "grid-cols-2 sm:grid-cols-4"
        : "grid-cols-3";

  const discGridCols =
    discountSlabs.length <= 2
      ? "grid-cols-2"
      : discountSlabs.length === 4
        ? "grid-cols-2 sm:grid-cols-4"
        : "grid-cols-3";

  // VARIANT A: Beauty 3x2 / Dynamic Dark Neon Grid (Video 1)
  if (variant === "neon_grid_3x2") {
    const totalCards = priceSlabs.length + discountSlabs.length;
    return (
      <section className="max-w-[1440px] mx-auto px-3 md:px-6 py-4">
        <div className="mb-3">
          <h2 className="text-base md:text-xl font-black text-zinc-900 tracking-tight">{widget.title}</h2>
          {widget.subtitle && <p className="text-xs text-zinc-500 font-medium">{widget.subtitle}</p>}
        </div>

        <div
          className={`grid grid-cols-3 gap-2.5 md:gap-4 ${
            totalCards >= 6 ? "lg:grid-cols-6" : totalCards === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"
          }`}
        >
          {priceSlabs.map((price) => {
            const matchCnt = countUnderPrice(price);
            return (
              <Link
                key={`under-${price}`}
                href={`/products?category=${catParam}&maxPrice=${price}&sort=price_asc`}
                data-keep-dark="true"
                className="group relative overflow-hidden rounded-2xl bg-[#161B1A] p-3.5 sm:p-5 flex flex-col justify-between min-h-[104px] sm:min-h-[132px] border border-emerald-500/20 shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="pointer-events-none absolute -right-4 -bottom-4 h-20 w-20 rounded-full bg-emerald-400/20 blur-xl" />
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs sm:text-sm font-bold text-emerald-300/90">Under</span>
                  {matchCnt > 0 && (
                    <span className="text-[10px] font-bold text-emerald-200/80">{matchCnt} items</span>
                  )}
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-xl sm:text-3xl font-black text-emerald-400 tracking-tight leading-none">
                    ₹{price}
                  </span>
                  <ArrowRight className="h-4 w-4 text-emerald-300 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            );
          })}

          {discountSlabs.map((disc) => {
            const matchCnt = countMinDiscount(disc);
            return (
              <Link
                key={`disc-${disc}`}
                href={`/products?category=${catParam}&minDiscount=${disc}&sort=discount_desc`}
                data-keep-dark="true"
                className="group relative overflow-hidden rounded-2xl bg-[#161B1A] p-3.5 sm:p-5 flex flex-col justify-between min-h-[104px] sm:min-h-[132px] border border-emerald-500/20 shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className="pointer-events-none absolute -right-4 -bottom-4 h-20 w-20 rounded-full bg-emerald-400/20 blur-xl" />
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs sm:text-sm font-bold text-emerald-300/90">Min.</span>
                  {matchCnt > 0 && (
                    <span className="text-[10px] font-bold text-emerald-200/80">{matchCnt} items</span>
                  )}
                </div>
                <div className="flex items-end justify-between">
                  <span className="text-xl sm:text-3xl font-black text-emerald-400 tracking-tight leading-none">
                    {disc}% <span className="text-sm sm:text-lg">Off</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-emerald-300 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    );
  }

  // VARIANT B: Fashion Perforated Ticket Cards (Dynamic count — Admin can add 2, 3, 4, 6+ cards!)
  return (
    <section className="max-w-[1440px] mx-auto px-3 md:px-6 py-4">
      <div className="text-center mb-3.5">
        <h2 className="text-lg md:text-2xl font-black italic text-zinc-950 tracking-tight">{widget.title}</h2>
        {widget.subtitle && (
          <p
            className="inline-block mt-0.5 rounded-full px-3 py-0.5 text-[11px] font-black"
            style={{ backgroundColor: tokens.accentBg, color: tokens.accentText }}
          >
            {widget.subtitle}
          </p>
        )}
      </div>

      {/* Dynamic Ticket-Style Price Cards */}
      {priceSlabs.length > 0 && (
        <div className={`grid ${priceGridCols} gap-2.5 md:gap-4 max-w-4xl mx-auto`}>
          {priceSlabs.map((price) => {
            const matchCnt = countUnderPrice(price);
            return (
              <Link
                key={`ticket-${price}`}
                href={`/products?category=${catParam}&maxPrice=${price}&sort=price_asc`}
                className="group relative rounded-2xl p-3 sm:p-5 text-center border-2 border-dashed border-zinc-900 shadow-sm hover:-translate-y-0.5 transition-all overflow-hidden"
                style={{ backgroundColor: tokens.accentBg, color: tokens.accentText }}
              >
                <span className="pointer-events-none absolute -left-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-white border-r-2 border-zinc-900" />
                <span className="pointer-events-none absolute -right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-white border-l-2 border-zinc-900" />

                <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest opacity-80">UNDER</p>
                <p className="text-xl sm:text-3xl font-black tracking-tight leading-tight mt-0.5">₹{price}</p>
                {matchCnt > 0 && (
                  <p className="text-[10px] font-extrabold opacity-75 mt-0.5">{matchCnt} live picks</p>
                )}
                <div className="mt-2 inline-flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-zinc-950 text-white group-hover:translate-x-0.5 transition-transform">
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Dynamic Discount Pills Row */}
      {discountSlabs.length > 0 && (
        <div className={`mt-3 grid ${discGridCols} gap-2.5 md:gap-4 max-w-4xl mx-auto`}>
          {discountSlabs.map((disc) => (
            <Link
              key={`min-disc-${disc}`}
              href={`/products?category=${catParam}&minDiscount=${disc}&sort=discount_desc`}
              data-keep-dark="true"
              className="rounded-xl bg-zinc-950 text-white py-2 px-3 text-center text-xs sm:text-sm font-black tracking-tight hover:bg-zinc-800 transition flex items-center justify-center gap-1"
            >
              <span>Min. {disc}% Off</span>
              <ArrowRight className="h-3.5 w-3.5" style={{ color: tokens.accentBg }} />
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
