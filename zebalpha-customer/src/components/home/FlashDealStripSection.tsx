"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Flame, Clock, ArrowRight } from "lucide-react";
import type { Product } from "@/lib/types";
import { getProductDisplayPricing } from "@/lib/productPricing";
import { IMAGE_VARIANTS } from "@/services/imageOptimizationService";
import { useOfficialTheme } from "@/lib/platform";

interface FlashDealStripSectionProps {
  title?: string;
  subtitle?: string;
  badgeText?: string;
  endsAt?: string;
  productIds?: string[];
  maxItems?: number;
  ctaLabel?: string;
  ctaHref?: string;
  allProducts: Product[];
}

function computeCountdown(endsAt?: string) {
  if (!endsAt) return null;
  const targetMs = new Date(endsAt).getTime();
  if (Number.isNaN(targetMs)) return null;
  const diff = targetMs - Date.now();
  if (diff <= 0) return { expired: true, hours: "00", mins: "00", secs: "00" };

  const totalSec = Math.floor(diff / 1000);
  const hrs = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  const secs = totalSec % 60;

  return {
    expired: false,
    hours: String(hrs).padStart(2, "0"),
    mins: String(mins).padStart(2, "0"),
    secs: String(secs).padStart(2, "0"),
  };
}

export function FlashDealStripSection({
  title = "Flash Culture Deals",
  subtitle = "Limited-time price drops — grab before timer ends",
  badgeText = "LIVE FLASH SALE",
  endsAt,
  productIds = [],
  maxItems = 8,
  ctaLabel = "View All Deals",
  ctaHref = "/products",
  allProducts = [],
}: FlashDealStripSectionProps) {
  const isNativeApp = useOfficialTheme();
  const [countdown, setCountdown] = useState(() => computeCountdown(endsAt));

  useEffect(() => {
    setCountdown(computeCountdown(endsAt));
    if (!endsAt) return;
    const timer = window.setInterval(() => {
      setCountdown(computeCountdown(endsAt));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [endsAt]);

  const dealProducts = useMemo(() => {
    if (!Array.isArray(allProducts) || allProducts.length === 0) return [];
    const limit = Math.max(2, Math.min(Number(maxItems || 8), 16));

    if (Array.isArray(productIds) && productIds.length > 0) {
      const idSet = new Set(productIds.map((id) => String(id)));
      const picked = allProducts.filter((p) => idSet.has(String(p.id)));
      if (picked.length > 0) return picked.slice(0, limit);
    }

    // Fallback: pick highest discount percentage active products
    return [...allProducts]
      .sort((a, b) => {
        const da = getProductDisplayPricing(a).discountPercent || 0;
        const db = getProductDisplayPricing(b).discountPercent || 0;
        return db - da;
      })
      .slice(0, limit);
  }, [allProducts, productIds, maxItems]);

  if (countdown?.expired || dealProducts.length === 0) {
    return null;
  }

  return (
    <section className="my-8 sm:my-12 relative select-none">
      <div
        className={`overflow-hidden rounded-3xl border p-4 sm:p-6 shadow-xl ${
          isNativeApp
            ? "border-[#E4C57A] bg-gradient-to-br from-[#FFFDF8] via-[#FFF6D6] to-[#FDE7A1]/65 shadow-[0_14px_34px_-12px_rgba(180,125,15,0.22)]"
            : "border-amber-500/35 bg-gradient-to-br from-zinc-950 via-[#151006] to-zinc-950"
        }`}
      >
        {/* Top Header Row + Live Countdown Timer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#EAD296]/70">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span
                data-photo-overlay="true"
                className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#F03A46] to-[#C81E2B] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-sm"
              >
                <Flame size={11} className="fill-current" />
                <span>{badgeText}</span>
              </span>

              {countdown && !countdown.expired && (
                <div
                  data-photo-overlay="true"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#14120F] px-3 py-1 text-[11px] font-black text-white shadow-sm"
                >
                  <Clock size={12} className="text-[#F5B922]" />
                  <span className="text-[10px] uppercase tracking-wider text-[#FDE68A]">Ends in</span>
                  <span className="font-mono tracking-tight text-white">
                    {countdown.hours}h : {countdown.mins}m : {countdown.secs}s
                  </span>
                </div>
              )}
            </div>

            <h2
              className={`text-lg sm:text-2xl font-black tracking-tight ${
                isNativeApp ? "text-[#14120F]" : "text-white"
              }`}
            >
              {title}
            </h2>
            {subtitle && (
              <p
                className={`text-xs font-medium ${
                  isNativeApp ? "text-[#5C4E35]" : "text-zinc-300"
                }`}
              >
                {subtitle}
              </p>
            )}
          </div>

          <Link
            href={ctaHref || "/products"}
            className={`inline-flex items-center gap-1.5 self-start sm:self-center rounded-full px-4 py-2 text-xs font-black uppercase tracking-wider transition-all active:scale-95 shrink-0 ${
              isNativeApp
                ? "bg-gradient-to-r from-[#FCE38A] via-[#F5B922] to-[#D49014] text-[#14120F] border border-[#DFAA30] shadow-sm"
                : "bg-amber-400 text-black hover:bg-amber-300"
            }`}
          >
            <span>{ctaLabel}</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        {/* Horizontal Scrollable Flash Product Rail */}
        <div className="mt-4 flex gap-3 sm:gap-4 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
          {dealProducts.map((product) => {
            const { price, mrp, hasDiscount, discountPercent } = getProductDisplayPricing(product);
            const rawImg =
              product.image_url ||
              (Array.isArray(product.images) && product.images[0]) ||
              "/placeholder.png";
            const imgSrc = IMAGE_VARIANTS.productGridCard(rawImg);

            return (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className={`group relative flex w-[148px] sm:w-[176px] shrink-0 flex-col overflow-hidden rounded-2xl border p-2 transition-all duration-200 hover:-translate-y-0.5 ${
                  isNativeApp
                    ? "border-[#EAD296] bg-white shadow-[0_6px_16px_rgba(166,124,28,0.12)] hover:border-[#C68A12]"
                    : "border-zinc-800 bg-zinc-900/90 hover:border-amber-400/50"
                }`}
              >
                <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-[#FAF3E1]">
                  <img
                    src={imgSrc}
                    alt={product.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {hasDiscount && discountPercent > 0 && (
                    <span
                      data-photo-overlay="true"
                      className="absolute top-1.5 left-1.5 rounded-full bg-[#F03A46] px-2 py-0.5 text-[9px] font-black uppercase text-white shadow"
                    >
                      {discountPercent}% OFF
                    </span>
                  )}
                </div>

                <div className="mt-2 flex flex-1 flex-col px-0.5">
                  <span
                    className={`text-[9px] font-black uppercase tracking-wider truncate ${
                      isNativeApp ? "text-[#9A6503]" : "text-amber-400"
                    }`}
                  >
                    {product.brand || "ZebAlpha"}
                  </span>
                  <h3
                    className={`text-xs font-bold line-clamp-1 mt-0.5 ${
                      isNativeApp ? "text-[#14120F]" : "text-white"
                    }`}
                  >
                    {product.name}
                  </h3>

                  <div className="mt-auto pt-1.5 flex items-baseline gap-1.5">
                    <span
                      className={`text-sm font-black ${
                        isNativeApp ? "text-[#14120F]" : "text-white"
                      }`}
                    >
                      ₹{price.toLocaleString("en-IN")}
                    </span>
                    {hasDiscount && mrp && (
                      <span
                        className={`text-[10px] font-semibold line-through ${
                          isNativeApp ? "text-[#8A7A5E]" : "text-zinc-500"
                        }`}
                      >
                        ₹{mrp.toLocaleString("en-IN")}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
