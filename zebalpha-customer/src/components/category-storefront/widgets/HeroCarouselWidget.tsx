"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight } from "lucide-react";
import type {
  CategoryThemeTokens,
  CategoryWidgetConfig,
  HeroSlideItem,
  CategorySpotlightRequest,
} from "@/lib/categoryStorefrontTypes";
import type { StorefrontProductCard } from "@/lib/categoryStorefrontLoader";

interface HeroCarouselWidgetProps {
  widget: CategoryWidgetConfig;
  categoryId: string;
  categoryName: string;
  tokens: CategoryThemeTokens;
  products: StorefrontProductCard[];
  spotlights: CategorySpotlightRequest[];
}

const DARK_GRADIENTS = [
  "linear-gradient(135deg, #1b0d26 0%, #3b124d 55%, #16091f 100%)",
  "linear-gradient(135deg, #0e1726 0%, #1d3557 55%, #0a101d 100%)",
  "linear-gradient(135deg, #1e1612 0%, #4a2d1d 55%, #120d0a 100%)",
  "linear-gradient(135deg, #0d1f1a 0%, #194538 55%, #081410 100%)",
];

export function HeroCarouselWidget({
  widget,
  categoryId,
  categoryName,
  tokens,
  products,
  spotlights,
}: HeroCarouselWidgetProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const desktopScrollRef = useRef<HTMLDivElement>(null);
  const cfg = widget.config || {};
  const catParam = encodeURIComponent(categoryId);
  const campaignBadge = cfg.campaign_badge || "FEATURED";
  const footerOffer = cfg.footer_offer || "Flat ₹100 OFF on 1st Order • Code FIRST100";

  // Build slides: Manual Admin slides -> Approved Seller Hero Spotlights -> Auto-Pilot top products
  const manualSlides: HeroSlideItem[] = Array.isArray(cfg.slides) ? cfg.slides.filter((s: any) => s?.title) : [];

  const sellerSlides: HeroSlideItem[] = spotlights
    .filter((s) => s.target_widget === "HERO_CAROUSEL")
    .map((s) => {
      const matchedProd = products.find((p) => s.product_ids?.includes(p.id)) || products[0];
      return {
        id: `spot-${s.id}`,
        badge: campaignBadge,
        title: s.brand_name,
        subtitle: s.headline,
        offer_text: s.offer_badge || "Special Offer",
        footer_pill: footerOffer,
        image_url: s.banner_image_url || matchedProd?.image_url || "",
        destination_url: s.destination_url || `/products?category=${catParam}&brand=${encodeURIComponent(s.brand_name)}`,
      };
    });

  let slides: HeroSlideItem[] = [...manualSlides, ...sellerSlides];

  if (slides.length < 3 && widget.auto_fill !== false && products.length > 0) {
    const sorted = [...products]
      .filter((p) => p.image_url)
      .sort((a, b) => b.discountPercent - a.discountPercent || b.rating - a.rating);
    const seenBrands = new Set(slides.map((s) => s.title.toLowerCase()));
    for (const p of sorted) {
      if (slides.length >= 5) break;
      const key = p.brand.toLowerCase();
      if (seenBrands.has(key) && sorted.length > 4) continue;
      seenBrands.add(key);
      slides.push({
        id: `auto-hero-${p.id}`,
        badge: campaignBadge,
        title: p.brand !== "Zebalpha" ? p.brand : p.name.split(" ").slice(0, 3).join(" "),
        subtitle: p.name,
        offer_text: p.discountPercent >= 10 ? `Up to ${p.discountPercent}% Off` : `Starting ₹${p.price}`,
        footer_pill: footerOffer,
        image_url: p.image_url,
        destination_url: `/products/${p.id}`,
      });
    }
  }

  if (slides.length === 0) {
    slides = [
      {
        id: "default-hero-1",
        badge: campaignBadge,
        title: categoryName,
        subtitle: "Explore fresh drops & everyday essentials on Zebalpha",
        offer_text: "Up to 70% Off",
        footer_pill: footerOffer,
        destination_url: `/products?category=${catParam}`,
      },
    ];
  }

  // Auto-advance mobile slider
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIdx((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [slides.length]);

  const scrollDesktop = (dir: number) => {
    if (!desktopScrollRef.current) return;
    desktopScrollRef.current.scrollBy({ left: dir * 420, behavior: "smooth" });
  };

  const currentMobile = slides[activeIdx % slides.length];

  return (
    <section className="w-full">
      {/* MOBILE / ANDROID APP VIEW: Full-Bleed Flipkart Fashion Hero Card + Segmented Progress Bars */}
      <div className="md:hidden px-3 pt-2.5 pb-1">
        <Link
          href={currentMobile.destination_url}
          data-keep-dark="true"
          className="relative block w-full overflow-hidden rounded-[22px] shadow-[0_10px_28px_rgba(0,0,0,0.16)] active:scale-[0.99] transition-transform"
          style={{
            background: currentMobile.bg_gradient || DARK_GRADIENTS[activeIdx % DARK_GRADIENTS.length],
            minHeight: "268px",
          }}
        >
          {/* Decorative neon/accent corner geometric shapes matching Video 2 */}
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full opacity-20 blur-2xl"
            style={{ backgroundColor: tokens.accentBg }}
          />
          <div
            className="pointer-events-none absolute bottom-12 right-5 h-7 w-7 opacity-80"
            style={{ backgroundColor: tokens.accentBg }}
          />
          <div
            className="pointer-events-none absolute bottom-5 right-12 h-5 w-5 opacity-60"
            style={{ backgroundColor: tokens.accentBg }}
          />

          <div className="relative z-10 grid grid-cols-12 items-center min-h-[268px] p-4 gap-2">
            {/* Left Copy */}
            <div className="col-span-7 flex flex-col justify-between h-full py-1 space-y-2.5">
              <span
                className="inline-flex items-center gap-1 self-start rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider"
                style={{ backgroundColor: tokens.accentBg, color: tokens.accentText }}
              >
                <Sparkles className="h-2.5 w-2.5" />
                {currentMobile.badge || campaignBadge}
              </span>

              <div className="space-y-1">
                <h2 className="text-[22px] font-black uppercase leading-[1.08] tracking-tight text-white line-clamp-2 drop-shadow-sm">
                  {currentMobile.title}
                </h2>
                {currentMobile.subtitle && (
                  <p className="text-[11px] font-semibold text-white/80 line-clamp-2 leading-snug">
                    {currentMobile.subtitle}
                  </p>
                )}
              </div>

              <div className="pt-1 flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-black shadow-md"
                  style={{ backgroundColor: "#0B0D0E", color: tokens.accentBg }}
                >
                  {currentMobile.offer_text}
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>

            {/* Right Hero Product Cutout */}
            <div className="col-span-5 flex items-center justify-center">
              {currentMobile.image_url ? (
                <div className="relative w-full aspect-[4/5] rounded-2xl overflow-hidden bg-white/10 backdrop-blur-sm border border-white/15 shadow-xl">
                  <img
                    src={currentMobile.image_url}
                    alt={currentMobile.title}
                    className="w-full h-full object-cover"
                    loading="eager"
                  />
                </div>
              ) : (
                <div className="w-28 h-32 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-white/70 text-xs font-black">
                  {categoryName}
                </div>
              )}
            </div>
          </div>

          {/* Bottom Offer Pill Strip */}
          {currentMobile.footer_pill && (
            <div className="relative z-10 border-t border-white/10 bg-black/35 backdrop-blur-sm px-4 py-1.5 text-[10px] font-bold text-white/90 flex items-center justify-between">
              <span className="truncate">{currentMobile.footer_pill}</span>
              <span className="shrink-0 font-black" style={{ color: tokens.accentBg }}>
                SHOP →
              </span>
            </div>
          )}
        </Link>

        {/* Segmented Progress Bar Indicators (Flipkart Mobile Style) */}
        {slides.length > 1 && (
          <div className="mt-2.5 flex items-center justify-center gap-1.5">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Slide ${idx + 1}`}
                onClick={() => setActiveIdx(idx)}
                className="h-1.5 rounded-full transition-all duration-300 cursor-pointer"
                style={{
                  width: idx === activeIdx ? "24px" : "8px",
                  backgroundColor: idx === activeIdx ? "#111111" : "#D1D5DB",
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* DESKTOP VIEW: Responsive 1-Up / 2-Up / 3-Up Flipkart Beauty Carousel */}
      <div className="hidden md:block relative max-w-[1440px] mx-auto px-6 pt-4 pb-2">
        <div
          ref={desktopScrollRef}
          className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory"
        >
          {slides.map((slide, idx) => (
            <Link
              key={slide.id}
              href={slide.destination_url}
              data-keep-dark="true"
              className={`group relative shrink-0 ${
                slides.length === 1
                  ? "w-full"
                  : slides.length === 2
                    ? "w-[calc(50%-8px)]"
                    : "w-[calc(33.333%-11px)] min-w-[340px]"
              } h-[220px] rounded-[20px] overflow-hidden snap-start shadow-md hover:shadow-xl transition-all`}
              style={{ background: slide.bg_gradient || DARK_GRADIENTS[idx % DARK_GRADIENTS.length] }}
            >
              <div
                className="pointer-events-none absolute -right-8 -bottom-8 h-36 w-36 rounded-full opacity-25 blur-2xl"
                style={{ backgroundColor: tokens.accentBg }}
              />
              <div className="relative z-10 flex h-[calc(100%-30px)] items-center justify-between p-5 gap-3">
                <div className="flex flex-col justify-between h-full flex-1 min-w-0">
                  <span
                    className="inline-flex items-center gap-1 self-start rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider"
                    style={{ backgroundColor: tokens.accentBg, color: tokens.accentText }}
                  >
                    <Sparkles className="h-2.5 w-2.5" />
                    {slide.badge || campaignBadge}
                  </span>

                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-white leading-tight truncate group-hover:underline">
                      {slide.title}
                    </h3>
                    <p className="text-base font-extrabold" style={{ color: tokens.accentBg }}>
                      {slide.offer_text}
                    </p>
                    {slide.subtitle && (
                      <p className="text-xs font-medium text-white/75 line-clamp-1">{slide.subtitle}</p>
                    )}
                  </div>
                </div>

                {slide.image_url && (
                  <div className="w-[126px] h-[146px] shrink-0 rounded-2xl overflow-hidden bg-white/10 border border-white/15 shadow-lg group-hover:scale-105 transition-transform duration-300">
                    <img
                      src={slide.image_url}
                      alt={slide.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                )}
              </div>

              {/* Bottom White Offer Ribbon (Video 1 Flipkart Beauty style) */}
              <div className="relative z-10 h-[30px] bg-white/95 px-4 flex items-center justify-between text-[11px] font-bold text-zinc-800">
                <span className="truncate">{slide.footer_pill || footerOffer}</span>
                <ArrowRight className="h-3.5 w-3.5 text-zinc-900 shrink-0" />
              </div>
            </Link>
          ))}
        </div>

        {slides.length > 3 && (
          <>
            <button
              type="button"
              onClick={() => scrollDesktop(-1)}
              aria-label="Previous banners"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white shadow-lg border border-zinc-200 flex items-center justify-center text-zinc-900 hover:scale-105 transition cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => scrollDesktop(1)}
              aria-label="Next banners"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-white shadow-lg border border-zinc-200 flex items-center justify-center text-zinc-900 hover:scale-105 transition cursor-pointer"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>
    </section>
  );
}
