"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import {
  getTitleAlignClass,
  getTitleSizeClass,
  getWidgetStyle,
  type CategoryThemeTokens,
  type CategoryWidgetConfig,
  type DealCardItem,
} from "@/lib/categoryStorefrontTypes";
import type { StorefrontProductCard, EnrichedSubcategory } from "@/lib/categoryStorefrontLoader";
import { SmartFitImage } from "../SmartFitImage";

interface ThemedDealRailWidgetProps {
  widget: CategoryWidgetConfig;
  categoryId: string;
  tokens: CategoryThemeTokens;
  products: StorefrontProductCard[];
  subcategories: EnrichedSubcategory[];
}

export function ThemedDealRailWidget({
  widget,
  categoryId,
  tokens,
  products,
  subcategories,
}: ThemedDealRailWidgetProps) {
  const cfg = widget.config || {};
  const wStyle = getWidgetStyle(widget);
  const hasCustomH = Boolean(wStyle.cardHeightMobile || wStyle.cardHeightDesktop);
  const cardHVars = hasCustomH
    ? ({
        "--cs-h-m": `${wStyle.cardHeightMobile || 150}px`,
        "--cs-h-d": `${wStyle.cardHeightDesktop || 185}px`,
      } as React.CSSProperties)
    : undefined;
  const padStyle: React.CSSProperties =
    typeof wStyle.paddingY === "number" ? { paddingTop: `${wStyle.paddingY}px`, paddingBottom: `${wStyle.paddingY}px` } : {};
  const radiusStyle: React.CSSProperties =
    typeof wStyle.borderRadius === "number" ? { borderRadius: `${wStyle.borderRadius}px` } : {};
  const gapStyle: React.CSSProperties =
    typeof wStyle.gapPx === "number" ? { gap: `${wStyle.gapPx}px` } : {};
  const variant = widget.style_variant || "clean_white";
  const maxItems = Number(cfg.max_items || 8);
  const catParam = encodeURIComponent(categoryId);

  const manualCards: DealCardItem[] = Array.isArray(cfg.cards) ? cfg.cards.filter((c: any) => c?.title) : [];

  // Auto-pilot pool selection based on widget filters (color / min_discount / tag / subcategory)
  let cards: DealCardItem[] = [...manualCards];

  if (cards.length === 0 && widget.auto_fill !== false) {
    if (variant === "pastel_seasonal_edit" && subcategories.length >= 3) {
      cards = subcategories.slice(0, Math.min(6, maxItems)).map((sc) => ({
        id: `sc-deal-${sc.id}`,
        title: sc.name,
        offer_pill:
          sc.max_discount && sc.max_discount >= 15
            ? `Up to ${sc.max_discount}% Off`
            : sc.min_price && sc.min_price > 0
              ? `From ₹${sc.min_price}`
              : "Top Picks",
        image_url: sc.image_url || sc.sample_image_url || "",
        destination_url: `/products?category=${catParam}&subcategory=${encodeURIComponent(sc.id)}`,
      }));
    } else {
      let pool = [...products];
      if (cfg.color_filter) {
        const cf = String(cfg.color_filter).toLowerCase();
        const colorMatches = pool.filter(
          (p) => p.colors.includes(cf) || p.name.toLowerCase().includes(cf)
        );
        if (colorMatches.length >= 2) pool = colorMatches;
      }
      if (cfg.max_price && Number(cfg.max_price) > 0) {
        const priceMatches = pool.filter((p) => p.price > 0 && p.price <= Number(cfg.max_price));
        if (priceMatches.length > 0) pool = priceMatches;
      }
      if (cfg.min_discount && Number(cfg.min_discount) > 0) {
        const discMatches = pool.filter((p) => p.discountPercent >= Number(cfg.min_discount));
        if (discMatches.length >= 2) pool = discMatches;
      }
      if (cfg.subcategory_id) {
        const subMatches = pool.filter((p) => p.subcategory_id === cfg.subcategory_id || p.category_id === cfg.subcategory_id);
        if (subMatches.length > 0) pool = subMatches;
      }
      pool.sort((a, b) => b.discountPercent - a.discountPercent || b.rating - a.rating);
      cards = pool.slice(0, maxItems).map((p) => ({
        id: `prod-deal-${p.id}`,
        title: p.brand !== "Zebalpha" ? `${p.brand} • ${p.name}` : p.name,
        offer_pill:
          p.discountPercent >= 20
            ? `Min. ${p.discountPercent}% Off`
            : `Under ₹${Math.ceil(p.price / 50) * 50}`,
        image_url: p.image_url,
        destination_url: `/products/${p.id}`,
      }));
    }
  }

  // Hide lonely 1-card auto-filled deal shelves when a category doesn't have enough real listings yet
  if (cards.length === 0 || (manualCards.length === 0 && cards.length < 2)) return null;

  // VARIANT 1: Pastel Seasonal Beauty Edit Header + 3-Col Cards (Video 1: 00:08–00:09)
  if (variant === "pastel_seasonal_edit") {
    return (
      <section className="max-w-[1440px] mx-auto px-3 md:px-6 py-3">
        <div
          className="rounded-3xl overflow-hidden border"
          style={{ backgroundColor: tokens.softTintBg, borderColor: tokens.borderColor }}
        >
          {/* Seasonal Banner Header */}
          <div
            className="relative px-5 py-5 md:py-7 text-center overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${tokens.accentBg} 0%, ${tokens.softTintBg} 60%, ${tokens.accentBg} 100%)`,
            }}
          >
            <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-75" style={{ color: tokens.accentText }}>
              <Sparkles className="h-3 w-3" />
              {cfg.badge_text || "SEASONAL EDIT"}
            </div>
            <h2
              className="text-xl md:text-3xl font-black uppercase tracking-tight"
              style={{ color: tokens.accentText }}
            >
              {widget.title}
            </h2>
            {widget.subtitle && (
              <p className="text-xs md:text-sm font-medium italic mt-0.5 opacity-80" style={{ color: tokens.accentText }}>
                {widget.subtitle}
              </p>
            )}
          </div>

          {/* 3-Col Highlight Cards Grid */}
          <div className="p-3.5 md:p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {cards.slice(0, 6).map((card) => (
              <Link
                key={card.id}
                href={card.destination_url}
                className="group bg-white rounded-2xl overflow-hidden border border-black/5 shadow-sm hover:shadow-md transition-all flex flex-col"
              >
                <div className="aspect-square w-full bg-zinc-50 overflow-hidden p-2">
                  {card.image_url ? (
                    <SmartFitImage
                      src={card.image_url}
                      alt={card.title}
                      roundedClass="rounded-xl"
                      imgClassName="group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="w-full h-full rounded-xl bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-400">
                      {card.title}
                    </div>
                  )}
                </div>
                <div className="px-2 pb-2.5 pt-1 text-center flex-1 flex flex-col justify-between gap-1">
                  <span
                    data-keep-dark="true"
                    className="block w-full rounded-lg py-1 px-2 text-[11px] font-black tracking-tight"
                    style={{ backgroundColor: tokens.pillBg, color: tokens.pillText }}
                  >
                    {card.offer_pill}
                  </span>
                  <span className="text-[11px] font-bold text-zinc-700 line-clamp-1">{card.title}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // VARIANT 2 & 3: Color-Blocked Neon Lime Box ("Back to black") OR Pure Black Box ("Clearance deals") (Video 2: 00:05, 00:09)
  const isLime = variant === "neon_lime_box";
  const isBlack = variant === "noir_black_box";

  if (isLime || isBlack) {
    const boxBg = isLime ? tokens.accentBg : tokens.secondaryBoxBg;
    const boxText = isLime ? tokens.accentText : tokens.secondaryBoxText;
    const pillBg = isLime ? "#111111" : tokens.accentBg;
    const pillText = isLime ? "#FFFFFF" : tokens.accentText;

    return (
      <section className="max-w-[1440px] mx-auto px-3 md:px-6 py-2.5" style={padStyle}>
        <div
          data-keep-dark={isBlack ? "true" : undefined}
          className="relative rounded-[24px] p-4 md:p-5 overflow-hidden shadow-sm"
          style={{ backgroundColor: boxBg, color: boxText, ...radiusStyle }}
        >
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3 mb-3.5">
            <div className={getTitleAlignClass(wStyle.titleAlign, "text-left")}>
              {!wStyle.hideTitle && (
                <h2
                  className={`font-black tracking-tight leading-none ${getTitleSizeClass(wStyle.titleSize, "text-lg md:text-2xl")}`}
                  style={wStyle.titleColor ? { color: wStyle.titleColor } : undefined}
                >
                  {widget.title}
                </h2>
              )}
              {!wStyle.hideSubtitle && widget.subtitle && (
                <p className="text-[11px] md:text-xs font-extrabold uppercase tracking-wider mt-1 opacity-75">
                  {widget.subtitle}
                </p>
              )}
            </div>
            <Link
              href={`/products?category=${catParam}&sort=discount_desc`}
              className="shrink-0 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-black transition hover:opacity-90"
              style={{ backgroundColor: pillBg, color: pillText }}
            >
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Horizontal Scroll Cards */}
          <div className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth pb-1" style={gapStyle}>
            {cards.map((card) => (
              <Link
                key={card.id}
                href={card.destination_url}
                className="group shrink-0 w-[138px] sm:w-[164px] md:w-[188px] flex flex-col"
              >
                <div
                  className={`relative w-full rounded-2xl overflow-hidden bg-white shadow-sm ${
                    hasCustomH ? "cs-h-responsive" : "aspect-[4/4.6]"
                  }`}
                  style={{ ...radiusStyle, ...cardHVars }}
                >
                  {card.image_url ? (
                    <SmartFitImage
                      src={card.image_url}
                      alt={card.title}
                      transform={card}
                      imgClassName="group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-500">
                      Zebalpha
                    </div>
                  )}
                  <div
                    className="absolute bottom-2 inset-x-2 rounded-lg py-1 px-2 text-center text-[11px] font-black shadow"
                    style={{ backgroundColor: pillBg, color: pillText }}
                  >
                    {card.offer_pill}
                  </div>
                </div>
                <p className="mt-1.5 text-xs font-bold truncate px-0.5" style={{ color: boxText }}>
                  {card.title}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // VARIANT 4: Clean White Steal Deals Rail (Video 2: 00:11)
  return (
    <section className="max-w-[1440px] mx-auto px-3 md:px-6 py-3">
      <div className="flex items-end justify-between mb-3">
        <div>
          <h2 className="text-base md:text-xl font-black text-zinc-900 tracking-tight">{widget.title}</h2>
          {widget.subtitle && (
            <p className="text-xs font-medium text-zinc-500 mt-0.5">{widget.subtitle}</p>
          )}
        </div>
        <Link
          href={`/products?category=${catParam}`}
          className="text-xs font-extrabold text-zinc-900 inline-flex items-center gap-0.5 hover:underline"
        >
          See all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth pb-1">
        {cards.map((card) => (
          <Link
            key={card.id}
            href={card.destination_url}
            className="group shrink-0 w-[142px] sm:w-[168px] md:w-[196px] flex flex-col"
          >
            <div className="relative aspect-[4/4.7] w-full rounded-2xl overflow-hidden bg-zinc-100 border border-zinc-200/80">
              {card.image_url ? (
                <SmartFitImage
                  src={card.image_url}
                  alt={card.title}
                  imgClassName="group-hover:scale-[1.04]"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs font-bold text-zinc-400">
                  Zebalpha
                </div>
              )}
              <div data-keep-dark="true" className="absolute bottom-2 inset-x-2 rounded-lg bg-zinc-950 text-white text-center py-1 px-2 text-[11px] font-black shadow">
                {card.offer_pill}
              </div>
            </div>
            <p className="mt-1.5 text-xs font-bold text-zinc-800 truncate">{card.title}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
