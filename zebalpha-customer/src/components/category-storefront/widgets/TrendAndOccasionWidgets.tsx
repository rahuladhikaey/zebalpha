"use client";

import React from "react";
import Link from "next/link";
import { Flame, Sparkles } from "lucide-react";
import {
  getResponsiveGridColsClass,
  getTitleAlignClass,
  getTitleSizeClass,
  getWidgetStyle,
  type CardImageTransform,
  type CategoryThemeTokens,
  type CategoryWidgetConfig,
} from "@/lib/categoryStorefrontTypes";
import type { StorefrontProductCard } from "@/lib/categoryStorefrontLoader";
import { SmartFitImage } from "../SmartFitImage";

interface CommonProps {
  widget: CategoryWidgetConfig;
  categoryId: string;
  tokens: CategoryThemeTokens;
  products: StorefrontProductCard[];
}

// ---------------------------------------------------------------------------
// 1. "Shop for someone" 3-Column Audience Split (Video 2: 00:05–00:08)
// ---------------------------------------------------------------------------
export function AudienceSplit3ColWidget({ widget, categoryId, products }: CommonProps) {
  const catParam = encodeURIComponent(categoryId);
  const variant = widget.style_variant || "mint_framed";
  const frameColor =
    variant === "blush_framed" ? "#F472B6" : variant === "gold_framed" ? "#D97706" : "#34D399";
  const softBg =
    variant === "blush_framed" ? "#FFF1F5" : variant === "gold_framed" ? "#FEF9E7" : "#ECFDF5";
  const wStyle = getWidgetStyle(widget);
  const hasCustomH = Boolean(wStyle.cardHeightMobile || wStyle.cardHeightDesktop);
  const cardHVars = hasCustomH
    ? ({
        "--cs-h-m": `${wStyle.cardHeightMobile || 135}px`,
        "--cs-h-d": `${wStyle.cardHeightDesktop || 195}px`,
      } as React.CSSProperties)
    : undefined;

  const cards: Array<{ id: string; title: string; image_url?: string; tag_filter?: string; destination_url?: string } & CardImageTransform> =
    Array.isArray(widget.config?.cards) ? widget.config.cards : [];

  if (cards.length === 0) return null;

  const gridClass = getResponsiveGridColsClass(
    wStyle.mobileCols,
    wStyle.desktopCols,
    "grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6"
  );

  return (
    <section
      className="max-w-[1440px] mx-auto px-3 md:px-6 py-3"
      style={typeof wStyle.paddingY === "number" ? { paddingTop: `${wStyle.paddingY}px`, paddingBottom: `${wStyle.paddingY}px` } : undefined}
    >
      {!wStyle.hideTitle && (
        <h2
          className={`font-black text-zinc-900 tracking-tight mb-3 ${getTitleSizeClass(wStyle.titleSize, "text-base md:text-xl")} ${getTitleAlignClass(wStyle.titleAlign, "text-left")}`}
          style={wStyle.titleColor ? { color: wStyle.titleColor } : undefined}
        >
          {widget.title}
        </h2>
      )}
      <div
        className={`grid ${gridClass} gap-2.5 md:gap-4`}
        style={typeof wStyle.gapPx === "number" ? { gap: `${wStyle.gapPx}px` } : undefined}
      >
        {cards.map((card, idx) => {
          const matchedProd =
            products.find((p) => card.tag_filter && p.storeTags.includes(card.tag_filter.toLowerCase())) ||
            products[idx * 2];
          const imgUrl = card.image_url || matchedProd?.image_url || "";
          const href = card.destination_url || `/products?category=${catParam}&tag=${encodeURIComponent(card.tag_filter || card.title)}`;

          return (
            <Link key={card.id || idx} href={href} className="group flex flex-col items-center">
              <div
                className={`w-full rounded-2xl overflow-hidden border-[2.5px] shadow-sm group-hover:shadow-md transition-all ${
                  hasCustomH ? "cs-h-responsive" : "aspect-[4/4.3]"
                }`}
                style={{
                  borderColor: frameColor,
                  backgroundColor: softBg,
                  ...(typeof wStyle.borderRadius === "number" ? { borderRadius: `${wStyle.borderRadius}px` } : {}),
                  ...cardHVars,
                }}
              >
                {imgUrl ? (
                  <SmartFitImage
                    src={imgUrl}
                    alt={card.title}
                    transform={card}
                    imgClassName="group-hover:scale-[1.03]"
                  />
                ) : (
                  <div
                    className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-3 text-center"
                    style={{
                      background: `radial-gradient(circle at 50% 35%, ${frameColor}28 0%, ${softBg} 85%)`,
                    }}
                  >
                    <Sparkles className="h-6 w-6 opacity-75" style={{ color: frameColor }} />
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-700 line-clamp-2">
                      {card.title}
                    </span>
                  </div>
                )}
              </div>
              <span className="mt-1.5 text-xs sm:text-sm font-extrabold text-zinc-900 text-center line-clamp-1">
                {card.title}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// 2. "trendy" 2x2 Dark Lookbook + Horizontal Trend Rail OR Beauty 4:5 Strip
//    (Video 2: 00:12–00:17 & Video 1: 00:14)
// ---------------------------------------------------------------------------
export function TrendLookbookWidget({ widget, categoryId, tokens, products }: CommonProps) {
  const catParam = encodeURIComponent(categoryId);
  const variant = widget.style_variant || "dark_2x2_and_rail";
  const wStyle = getWidgetStyle(widget);
  const hasCustomH = Boolean(wStyle.cardHeightMobile || wStyle.cardHeightDesktop);
  const cardHVars = hasCustomH
    ? ({
        "--cs-h-m": `${wStyle.cardHeightMobile || 210}px`,
        "--cs-h-d": `${wStyle.cardHeightDesktop || 240}px`,
      } as React.CSSProperties)
    : undefined;
  const gridClass = getResponsiveGridColsClass(
    wStyle.mobileCols,
    wStyle.desktopCols,
    "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
  );
  const manualItems: Array<{ title: string; offer?: string; tag?: string; image_url?: string; destination_url?: string } & CardImageTransform> =
    Array.isArray(widget.config?.items) ? widget.config.items : [];

  // VARIANT A: Beauty 4:5 Editorial Portrait Strip (Video 1: "Black Friday Specials")
  if (variant === "editorial_4x5_strip") {
    const cards =
      manualItems.length > 0
        ? manualItems.map((it, idx) => ({
            id: `ed-${idx}`,
            title: it.title,
            offer: it.offer || "Explore",
            image_url: it.image_url || products[idx * 2]?.image_url || "",
            href: it.destination_url || `/products?category=${catParam}&tag=${encodeURIComponent(it.tag || it.title)}`,
          }))
        : products.slice(0, 6).map((p) => ({
            id: `ed-p-${p.id}`,
            title: p.brand,
            offer: p.discountPercent >= 10 ? `Up to ${p.discountPercent}% Off` : `₹${p.price}`,
            image_url: p.image_url,
            href: `/products/${p.id}`,
          }));

    if (cards.length === 0) return null;

    return (
      <section className="max-w-[1440px] mx-auto px-3 md:px-6 py-3">
        <div className="mb-3">
          <h2 className="text-base md:text-xl font-black text-zinc-900 tracking-tight">{widget.title}</h2>
          {widget.subtitle && <p className="text-xs text-zinc-500 font-medium">{widget.subtitle}</p>}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 md:gap-4">
          {cards.map((c) => (
            <Link
              key={c.id}
              href={c.href}
              data-keep-dark="true"
              className="group relative w-full aspect-[4/5] rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-950 shadow-sm hover:shadow-lg transition-all"
            >
              {c.image_url && (
                <SmartFitImage
                  src={c.image_url}
                  alt={c.title}
                  imgClassName="group-hover:scale-[1.03]"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
              <div className="absolute bottom-3 inset-x-3 text-center">
                <p className="text-sm md:text-base font-black text-white uppercase tracking-tight leading-tight">
                  {c.title}
                </p>
                <span
                  className="inline-block mt-1 rounded-full px-2.5 py-0.5 text-[10px] font-black"
                  style={{ backgroundColor: tokens.accentBg, color: tokens.accentText }}
                >
                  {c.offer}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  // VARIANT B: Fashion "trendy" 2x2 Dark Grid + Horizontal Trend Rail (Video 2: 00:12–00:17)
  const sortedProds = [...products].filter((p) => p.image_url);
  if (sortedProds.length === 0 && manualItems.length === 0) return null;

  const topGrid = (manualItems.length >= 4 ? manualItems.slice(0, 4) : sortedProds.slice(0, 4).map((p) => ({
    title: p.name.split(" ").slice(0, 2).join(" "),
    offer: p.discountPercent >= 25 ? `Min. ${p.discountPercent}% Off` : `Under ₹${Math.ceil(p.price / 50) * 50}`,
    image_url: p.image_url,
    destination_url: `/products/${p.id}`,
  })));

  const trendRail = sortedProds.slice(4, 12);

  return (
    <section className="max-w-[1440px] mx-auto px-3 md:px-6 py-3 space-y-3">
      {/* Trendy Header Pill */}
      <div className="text-center py-1">
        <div className="inline-flex items-center gap-1.5 text-xl md:text-2xl font-black tracking-tight text-zinc-950">
          <span>{widget.config?.badge_brand || "trendy"}</span>
          <Flame className="h-5 w-5 text-orange-500 fill-orange-500" />
        </div>
        <div
          className="mt-1 inline-block rounded-full px-4 py-0.5 text-[11px] font-black uppercase tracking-wider"
          style={{ backgroundColor: tokens.accentBg, color: tokens.accentText }}
        >
          {widget.title}
        </div>
      </div>

      {/* Responsive Lookbook Grid */}
      <div
        className={`grid ${gridClass} gap-2.5 md:gap-4`}
        style={typeof wStyle.gapPx === "number" ? { gap: `${wStyle.gapPx}px` } : undefined}
      >
        {topGrid.map((item, idx) => (
          <Link
            key={`tr-grid-${idx}`}
            href={item.destination_url || `/products?category=${catParam}`}
            data-keep-dark="true"
            className={`group relative rounded-[20px] overflow-hidden bg-zinc-950 shadow-md ${
              hasCustomH ? "cs-h-responsive" : "aspect-[4/5]"
            }`}
            style={{
              ...(typeof wStyle.borderRadius === "number" ? { borderRadius: `${wStyle.borderRadius}px` } : {}),
              ...cardHVars,
            }}
          >
            {item.image_url && (
              <SmartFitImage
                src={item.image_url}
                alt={item.title}
                transform={item as CardImageTransform}
                imgClassName="group-hover:scale-[1.03]"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-transparent" />
            <div className="absolute bottom-2.5 inset-x-2.5 text-center space-y-1">
              <p className="text-xs sm:text-sm font-black uppercase tracking-wide text-white truncate">
                {item.title}
              </p>
              <span
                className="inline-block rounded-md px-2.5 py-0.5 text-[11px] font-black shadow"
                style={{ backgroundColor: tokens.accentBg, color: tokens.accentText }}
              >
                {item.offer}
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* Horizontal Season Trend Cards */}
      {trendRail.length > 0 && (
        <div className="flex gap-3 overflow-x-auto no-scrollbar scroll-smooth pt-1 pb-1">
          {trendRail.map((p) => (
            <Link
              key={`tr-rail-${p.id}`}
              href={`/products/${p.id}`}
              className="group shrink-0 w-[138px] sm:w-[162px] md:w-[184px] rounded-2xl overflow-hidden border border-zinc-200 bg-white shadow-sm hover:shadow-md transition-all"
            >
              <div className="aspect-[4/4.8] w-full bg-zinc-100 overflow-hidden">
                <SmartFitImage
                  src={p.image_url}
                  alt={p.name}
                  imgClassName="group-hover:scale-[1.04]"
                />
              </div>
              <div className="p-2 text-center space-y-1">
                <p className="text-[11px] font-black uppercase text-zinc-900 truncate">
                  {p.name.split(" ").slice(0, 2).join(" ")}
                </p>
                <span
                  className="block rounded-md py-0.5 px-1.5 text-[11px] font-black"
                  style={{ backgroundColor: tokens.accentBg, color: tokens.accentText }}
                >
                  {p.discountPercent >= 20 ? `Min. ${p.discountPercent}% Off` : `₹${p.price}`}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// 3. "Occasion coming up?" 2-Column Editorial Cards (Video 2: 00:13, 00:18)
// ---------------------------------------------------------------------------
export function Occasion2ColWidget({ widget, categoryId, tokens, products }: CommonProps) {
  const catParam = encodeURIComponent(categoryId);
  const wStyle = getWidgetStyle(widget);
  const hasCustomH = Boolean(wStyle.cardHeightMobile || wStyle.cardHeightDesktop);
  const cardHVars = hasCustomH
    ? ({
        "--cs-h-m": `${wStyle.cardHeightMobile || 190}px`,
        "--cs-h-d": `${wStyle.cardHeightDesktop || 230}px`,
      } as React.CSSProperties)
    : undefined;
  const gridClass = getResponsiveGridColsClass(
    wStyle.mobileCols,
    wStyle.desktopCols,
    "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
  );
  const cards: Array<{ id: string; title: string; image_url?: string; tag_filter?: string; destination_url?: string } & CardImageTransform> =
    Array.isArray(widget.config?.cards) ? widget.config.cards : [];

  if (cards.length === 0) return null;

  return (
    <section
      className="max-w-[1440px] mx-auto px-3 md:px-6 py-3"
      style={typeof wStyle.paddingY === "number" ? { paddingTop: `${wStyle.paddingY}px`, paddingBottom: `${wStyle.paddingY}px` } : undefined}
    >
      <div className={`${getTitleAlignClass(wStyle.titleAlign, "text-center")} mb-3`}>
        {!wStyle.hideTitle && (
          <h2
            className={`font-black text-zinc-950 tracking-tight ${getTitleSizeClass(wStyle.titleSize, "text-lg md:text-2xl")}`}
            style={wStyle.titleColor ? { color: wStyle.titleColor } : undefined}
          >
            {widget.title}
          </h2>
        )}
        {!wStyle.hideSubtitle && widget.subtitle && (
          <p
            className="inline-flex items-center gap-1 mt-0.5 rounded-full px-3 py-0.5 text-[11px] font-extrabold"
            style={{ backgroundColor: tokens.accentBg, color: tokens.accentText }}
          >
            <Sparkles className="h-3 w-3" />
            {widget.subtitle}
          </p>
        )}
      </div>

      <div
        className={`grid ${gridClass} gap-3 md:gap-4`}
        style={typeof wStyle.gapPx === "number" ? { gap: `${wStyle.gapPx}px` } : undefined}
      >
        {cards.map((card, idx) => {
          const matchedProd =
            products.find((p) => card.tag_filter && p.storeTags.includes(card.tag_filter.toLowerCase())) ||
            products[idx + 2];
          const imgUrl = card.image_url || matchedProd?.image_url || "";
          const href = card.destination_url || `/products?category=${catParam}&tag=${encodeURIComponent(card.tag_filter || card.title)}`;

          return (
            <Link
              key={card.id || idx}
              href={href}
              data-keep-dark="true"
              className={`group relative rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-950 shadow-md ${
                hasCustomH ? "cs-h-responsive" : "aspect-[4/4.5]"
              }`}
              style={{
                ...(typeof wStyle.borderRadius === "number" ? { borderRadius: `${wStyle.borderRadius}px` } : {}),
                ...cardHVars,
              }}
            >
              {imgUrl ? (
                <SmartFitImage
                  src={imgUrl}
                  alt={card.title}
                  transform={card}
                  imgClassName="group-hover:scale-[1.03]"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center pb-8">
                  <Sparkles className="h-8 w-8 opacity-40" style={{ color: tokens.accentBg }} />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
              <div
                className="absolute bottom-3 inset-x-3 rounded-lg py-1.5 px-3 text-center text-xs sm:text-sm font-black uppercase tracking-wide shadow-lg"
                style={{ backgroundColor: tokens.accentBg, color: tokens.accentText }}
              >
                {card.title}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
