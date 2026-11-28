"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight } from "lucide-react";
import {
  getWidgetStyle,
  type CategoryThemeTokens,
  type CategoryWidgetConfig,
  type HeroSlideItem,
  type CategorySpotlightRequest,
} from "@/lib/categoryStorefrontTypes";
import type { StorefrontProductCard } from "@/lib/categoryStorefrontLoader";
import { SmartFitImage } from "../SmartFitImage";

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

  const maxAutoSlides = Math.max(1, Number(cfg.max_slides || 5));
  if (slides.length < maxAutoSlides && widget.auto_fill !== false && products.length > 0) {
    const sorted = [...products]
      .filter((p) => p.image_url)
      .sort((a, b) => b.discountPercent - a.discountPercent || b.rating - a.rating);
    const seenBrands = new Set(slides.map((s) => s.title.toLowerCase()));
    for (const p of sorted) {
      if (slides.length >= maxAutoSlides) break;
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

  const isFullArtwork = (slide: HeroSlideItem) =>
    Boolean((slide as any).full_banner_mode && slide.image_url);
  const wStyle = getWidgetStyle(widget);
  const padStyle: React.CSSProperties =
    typeof wStyle.paddingY === "number" ? { paddingTop: `${wStyle.paddingY}px`, paddingBottom: `${wStyle.paddingY}px` } : {};
  const radiusStyle: React.CSSProperties =
    typeof wStyle.borderRadius === "number" ? { borderRadius: `${wStyle.borderRadius}px` } : {};
  const gapStyle: React.CSSProperties =
    typeof wStyle.gapPx === "number" ? { gap: `${wStyle.gapPx}px` } : {};
  const hasSlideTransform = (sl: HeroSlideItem) =>
    Boolean(sl.img_fit || (sl.img_zoom && sl.img_zoom !== 100) || typeof sl.img_pos_y === "number" || typeof sl.img_pos_x === "number");

  return (
    <section className="w-full" style={padStyle}>
      {/* MOBILE / ANDROID APP VIEW: Full-Bleed Banners Adopt Uploaded Photo's Actual Natural Ratio or Custom Admin Height */}
      <div className="md:hidden px-3 pt-2.5 pb-1">
        <Link
          href={currentMobile.destination_url}
          data-keep-dark="true"
          className={`relative block w-full overflow-hidden rounded-[20px] shadow-[0_10px_28px_rgba(0,0,0,0.14)] active:scale-[0.99] transition-transform ${
            isFullArtwork(currentMobile) ? "" : "min-h-[215px] sm:min-h-[240px]"
          }`}
          style={{
            background: isFullArtwork(currentMobile)
              ? "#0B0D0E"
              : currentMobile.bg_gradient || DARK_GRADIENTS[activeIdx % DARK_GRADIENTS.length],
            height: wStyle.bannerHeightMobile ? `${wStyle.bannerHeightMobile}px` : undefined,
            ...radiusStyle,
          }}
        >
          {isFullArtwork(currentMobile) ? (
            wStyle.bannerHeightMobile || hasSlideTransform(currentMobile) ? (
              <SmartFitImage
                src={currentMobile.image_url || ""}
                alt={currentMobile.title}
                loading="eager"
                transform={currentMobile}
              />
            ) : (
              <img
                src={currentMobile.image_url}
                alt={currentMobile.title}
                className="block w-full h-auto max-h-[440px] object-contain mx-auto"
                loading="eager"
              />
            )
          ) : (
            <>
              {/* Decorative neon/accent corner geometric shapes */}
              <div
                className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-20 blur-2xl"
                style={{ backgroundColor: tokens.accentBg }}
              />
              <div
                className="pointer-events-none absolute bottom-11 right-5 h-6 w-6 opacity-80"
                style={{ backgroundColor: tokens.accentBg }}
              />
              <div
                className="pointer-events-none absolute bottom-5 right-11 h-4 w-4 opacity-60"
                style={{ backgroundColor: tokens.accentBg }}
              />

              <div className="relative z-10 grid grid-cols-12 items-center min-h-[188px] sm:min-h-[212px] p-3.5 sm:p-4 gap-2.5">
                {/* Left Copy */}
                <div className="col-span-7 flex flex-col justify-between h-full py-0.5 space-y-2">
                  <span
                    className="inline-flex items-center gap-1 self-start rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider"
                    style={{ backgroundColor: tokens.accentBg, color: tokens.accentText }}
                  >
                    <Sparkles className="h-2.5 w-2.5" />
                    {currentMobile.badge || campaignBadge}
                  </span>

                  <div className="space-y-1">
                    <h2 className="text-[19px] sm:text-[22px] font-black uppercase leading-[1.08] tracking-tight text-white line-clamp-2 drop-shadow-sm">
                      {currentMobile.title}
                    </h2>
                    {currentMobile.subtitle && (
                      <p className="text-[11px] font-semibold text-white/80 line-clamp-2 leading-snug">
                        {currentMobile.subtitle}
                      </p>
                    )}
                  </div>

                  <div className="pt-0.5 flex items-center gap-2">
                    <span
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-black shadow-md"
                      style={{ backgroundColor: "#0B0D0E", color: tokens.accentBg }}
                    >
                      {currentMobile.offer_text}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>

                {/* Right Hero Product Auto-Fit Cutout */}
                <div className="col-span-5 flex items-center justify-center">
                  {currentMobile.image_url ? (
                    <div className="relative w-full max-w-[136px] aspect-[4/4.8] rounded-2xl overflow-hidden bg-white/10 border border-white/15 shadow-xl">
                      <SmartFitImage
                        src={currentMobile.image_url}
                        alt={currentMobile.title}
                        loading="eager"
                      />
                    </div>
                  ) : (
                    <div className="w-24 h-28 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center text-white/70 text-xs font-black text-center px-2">
                      {categoryName}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Offer Pill Strip */}
              {currentMobile.footer_pill && (
                <div className="relative z-10 border-t border-white/10 bg-black/35 backdrop-blur-sm px-3.5 py-1.5 text-[10px] font-bold text-white/90 flex items-center justify-between">
                  <span className="truncate">{currentMobile.footer_pill}</span>
                  <span className="shrink-0 font-black" style={{ color: tokens.accentBg }}>
                    SHOP →
                  </span>
                </div>
              )}
            </>
          )}
        </Link>

        {/* Segmented Progress Bar Indicators */}
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

      {/* DESKTOP / TABLET VIEW: Uploaded Banners Automatically Take Their Exact Natural Aspect Ratio (or Admin Custom Height) */}
      <div className="hidden md:block relative max-w-[1440px] mx-auto px-6 pt-4 pb-2">
        <div
          ref={desktopScrollRef}
          className="flex items-stretch gap-4 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory pb-1"
          style={gapStyle}
        >
          {slides.map((slide, idx) => {
            const fullArt = isFullArtwork(slide);
            const deskH = wStyle.bannerHeightDesktop;
            return (
              <Link
                key={slide.id}
                href={slide.destination_url}
                data-keep-dark="true"
                className={`group relative shrink-0 rounded-[20px] overflow-hidden snap-start shadow-md hover:shadow-xl transition-all ${
                  fullArt
                    ? `${deskH ? "" : "h-[260px] lg:h-[310px]"} w-auto flex items-center justify-center bg-zinc-950`
                    : `${
                        slides.length === 1
                          ? `w-full max-w-[920px] mx-auto ${deskH ? "" : "h-[260px] lg:h-[300px]"}`
                          : slides.length === 2
                            ? `w-[calc(50%-8px)] ${deskH ? "" : "h-[260px] lg:h-[310px]"}`
                            : `w-[420px] lg:w-[460px] ${deskH ? "" : "h-[260px] lg:h-[310px]"}`
                      } flex flex-col justify-between`
                }`}
                style={{
                  background: fullArt
                    ? "#0B0D0E"
                    : slide.bg_gradient || DARK_GRADIENTS[idx % DARK_GRADIENTS.length],
                  height: deskH ? `${deskH}px` : undefined,
                  ...radiusStyle,
                }}
              >
                {fullArt ? (
                  hasSlideTransform(slide) ? (
                    <div className="h-full w-[420px] lg:w-[480px]">
                      <SmartFitImage
                        src={slide.image_url || ""}
                        alt={slide.title}
                        transform={slide}
                        imgClassName="group-hover:scale-[1.015]"
                      />
                    </div>
                  ) : (
                    <img
                      src={slide.image_url}
                      alt={slide.title}
                      className="block h-full w-auto max-w-[82vw] object-contain group-hover:scale-[1.015] transition-transform duration-300"
                      loading="lazy"
                    />
                  )
                ) : (
                  <>
                    <div
                      className="pointer-events-none absolute -right-8 -bottom-8 h-36 w-36 rounded-full opacity-25 blur-2xl"
                      style={{ backgroundColor: tokens.accentBg }}
                    />
                    <div className="relative z-10 flex flex-1 min-h-0 items-center justify-between p-4 lg:p-5 gap-3">
                      <div className="flex flex-col justify-between h-full flex-1 min-w-0">
                        <span
                          className="inline-flex items-center gap-1 self-start rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider"
                          style={{ backgroundColor: tokens.accentBg, color: tokens.accentText }}
                        >
                          <Sparkles className="h-2.5 w-2.5" />
                          {slide.badge || campaignBadge}
                        </span>

                        <div className="space-y-1 my-auto">
                          <h3 className="text-lg lg:text-xl font-black text-white leading-tight truncate group-hover:underline">
                            {slide.title}
                          </h3>
                          <p className="text-sm lg:text-base font-extrabold" style={{ color: tokens.accentBg }}>
                            {slide.offer_text}
                          </p>
                          {slide.subtitle && (
                            <p className="text-xs font-medium text-white/75 line-clamp-1">{slide.subtitle}</p>
                          )}
                        </div>
                      </div>

                      {slide.image_url && (
                        <div className="h-full max-h-[190px] aspect-[4/4.6] shrink-0 rounded-2xl overflow-hidden bg-white/10 border border-white/15 shadow-lg">
                          <SmartFitImage
                            src={slide.image_url}
                            alt={slide.title}
                            imgClassName="group-hover:scale-105"
                          />
                        </div>
                      )}
                    </div>

                    {/* Bottom White Offer Ribbon */}
                    <div className="relative z-10 h-[30px] shrink-0 bg-white/95 px-4 flex items-center justify-between text-[11px] font-bold text-zinc-800">
                      <span className="truncate">{slide.footer_pill || footerOffer}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-zinc-900 shrink-0" />
                    </div>
                  </>
                )}
              </Link>
            );
          })}
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
