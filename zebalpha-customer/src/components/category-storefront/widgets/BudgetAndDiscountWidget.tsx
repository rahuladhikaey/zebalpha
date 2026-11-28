"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { CategoryThemeTokens, CategoryWidgetConfig } from "@/lib/categoryStorefrontTypes";

interface BudgetAndDiscountWidgetProps {
  widget: CategoryWidgetConfig;
  categoryId: string;
  tokens: CategoryThemeTokens;
}

export function BudgetAndDiscountWidget({
  widget,
  categoryId,
  tokens,
}: BudgetAndDiscountWidgetProps) {
  const catParam = encodeURIComponent(categoryId);
  const variant = widget.style_variant || "ticket_3col";
  const priceSlabs: number[] = Array.isArray(widget.config?.price_slabs) && widget.config.price_slabs.length > 0
    ? widget.config.price_slabs.map(Number).filter((n: number) => n > 0)
    : [199, 299, 399];
  const discountSlabs: number[] = Array.isArray(widget.config?.discount_slabs) && widget.config.discount_slabs.length > 0
    ? widget.config.discount_slabs.map(Number).filter((n: number) => n > 0)
    : [30, 50, 70];

  // VARIANT A: Beauty 3x2 Dark Neon Grid (Video 1: 00:19–00:20, 00:31)
  if (variant === "neon_grid_3x2") {
    return (
      <section className="max-w-[1440px] mx-auto px-3 md:px-6 py-4">
        <div className="mb-3">
          <h2 className="text-base md:text-xl font-black text-zinc-900 tracking-tight">{widget.title}</h2>
          {widget.subtitle && <p className="text-xs text-zinc-500 font-medium">{widget.subtitle}</p>}
        </div>

        <div className="grid grid-cols-3 lg:grid-cols-6 gap-2.5 md:gap-4">
          {priceSlabs.slice(0, 3).map((price) => (
            <Link
              key={`under-${price}`}
              href={`/products?category=${catParam}&maxPrice=${price}&sort=price_asc`}
              data-keep-dark="true"
              className="group relative overflow-hidden rounded-2xl bg-[#161B1A] p-3.5 sm:p-5 flex flex-col justify-between min-h-[104px] sm:min-h-[132px] border border-emerald-500/20 shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="pointer-events-none absolute -right-4 -bottom-4 h-20 w-20 rounded-full bg-emerald-400/20 blur-xl" />
              <span className="text-xs sm:text-sm font-bold text-emerald-300/90">Under</span>
              <div className="flex items-end justify-between">
                <span className="text-xl sm:text-3xl font-black text-emerald-400 tracking-tight leading-none">
                  ₹{price}
                </span>
                <ArrowRight className="h-4 w-4 text-emerald-300 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          ))}

          {discountSlabs.slice(0, 3).map((disc) => (
            <Link
              key={`disc-${disc}`}
              href={`/products?category=${catParam}&minDiscount=${disc}&sort=discount_desc`}
              data-keep-dark="true"
              className="group relative overflow-hidden rounded-2xl bg-[#161B1A] p-3.5 sm:p-5 flex flex-col justify-between min-h-[104px] sm:min-h-[132px] border border-emerald-500/20 shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="pointer-events-none absolute -right-4 -bottom-4 h-20 w-20 rounded-full bg-emerald-400/20 blur-xl" />
              <span className="text-xs sm:text-sm font-bold text-emerald-300/90">Min.</span>
              <div className="flex items-end justify-between">
                <span className="text-xl sm:text-3xl font-black text-emerald-400 tracking-tight leading-none">
                  {disc}% <span className="text-sm sm:text-lg">Off</span>
                </span>
                <ArrowRight className="h-4 w-4 text-emerald-300 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  // VARIANT B: Fashion Perforated Ticket Cards (Video 2: 00:13–00:17 — "Budget deals")
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

      {/* 3 Ticket-Style Price Cards */}
      <div className="grid grid-cols-3 gap-2.5 md:gap-4 max-w-3xl mx-auto">
        {priceSlabs.slice(0, 3).map((price) => (
          <Link
            key={`ticket-${price}`}
            href={`/products?category=${catParam}&maxPrice=${price}&sort=price_asc`}
            className="group relative rounded-2xl p-3 sm:p-5 text-center border-2 border-dashed border-zinc-900 shadow-sm hover:-translate-y-0.5 transition-all overflow-hidden"
            style={{ backgroundColor: tokens.accentBg, color: tokens.accentText }}
          >
            {/* Left & Right Ticket Punch Notches */}
            <span className="pointer-events-none absolute -left-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-white border-r-2 border-zinc-900" />
            <span className="pointer-events-none absolute -right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-white border-l-2 border-zinc-900" />

            <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest opacity-80">UNDER</p>
            <p className="text-xl sm:text-3xl font-black tracking-tight leading-tight mt-0.5">₹{price}</p>
            <div className="mt-2 inline-flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full bg-zinc-950 text-white group-hover:translate-x-0.5 transition-transform">
              <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        ))}
      </div>

      {/* Secondary Discount Pills Row */}
      <div className="mt-3 grid grid-cols-3 gap-2.5 md:gap-4 max-w-3xl mx-auto">
        {discountSlabs.slice(0, 3).map((disc) => (
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
    </section>
  );
}
