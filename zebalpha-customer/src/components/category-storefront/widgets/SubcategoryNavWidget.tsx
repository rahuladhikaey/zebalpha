"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { CategoryIconRenderer, resolveCategoryIcon } from "@/lib/categoryIcons";
import type { CategoryThemeTokens, CategoryWidgetConfig } from "@/lib/categoryStorefrontTypes";
import type { EnrichedSubcategory, StorefrontProductCard } from "@/lib/categoryStorefrontLoader";
import { SmartFitImage } from "../SmartFitImage";

interface SubcategoryNavWidgetProps {
  widget: CategoryWidgetConfig;
  categoryId: string;
  tokens: CategoryThemeTokens;
  subcategories: EnrichedSubcategory[];
  products: StorefrontProductCard[];
}

const BEAUTY_GRADIENTS = [
  "linear-gradient(180deg, #ff7eb3 0%, #ff4d8d 100%)",
  "linear-gradient(180deg, #ffa07a 0%, #ff5e62 100%)",
  "linear-gradient(180deg, #f472b6 0%, #db2777 100%)",
  "linear-gradient(180deg, #fb7185 0%, #e11d48 100%)",
  "linear-gradient(180deg, #c084fc 0%, #9333ea 100%)",
  "linear-gradient(180deg, #f9a8d4 0%, #ec4899 100%)",
];

export function SubcategoryNavWidget({
  widget,
  categoryId,
  tokens,
  subcategories,
  products,
}: SubcategoryNavWidgetProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const catParam = encodeURIComponent(categoryId);
  const variant = widget.style_variant || "grid_2row_tiles";
  const fallbackItems: Array<{ title: string; tag?: string; image_url?: string }> =
    Array.isArray(widget.config?.fallback_items) ? widget.config.fallback_items : [];

  // Build normalized items from real DB subcategories -> fallback preset items
  // Never recycle the same product image across unrelated subcategories!
  const items =
    subcategories.length > 0
      ? subcategories.map((sc) => ({
          id: sc.id,
          name: sc.name,
          image_url: sc.image_url || sc.sample_image_url || "",
          icon_key: sc.icon_key || resolveCategoryIcon(sc.name).icon_key,
          icon_url: sc.icon_url,
          href: `/products?category=${catParam}&subcategory=${encodeURIComponent(sc.id)}`,
        }))
      : fallbackItems.length > 0
        ? fallbackItems.map((fi, i) => {
            const kw = (fi.tag || fi.title).toLowerCase();
            const matchedProd = products.find(
              (p) =>
                p.image_url &&
                (p.name.toLowerCase().includes(kw) || p.storeTags.includes(kw))
            );
            return {
              id: `fb-${i}`,
              name: fi.title,
              image_url: fi.image_url || matchedProd?.image_url || "",
              icon_key: resolveCategoryIcon(fi.title).icon_key,
              icon_url: null,
              href: `/products?category=${catParam}&search=${encodeURIComponent(fi.tag || fi.title)}`,
            };
          })
        : [];

  if (items.length === 0) return null;

  // VARIANT A: Beauty 1-Row Vibrant Gradient Portrait Strip (Video 1: 00:00–00:07)
  if (variant === "portrait_1row_cards") {
    return (
      <section className="relative max-w-[1440px] mx-auto px-3 md:px-6 py-3">
        <div
          ref={scrollRef}
          className="flex gap-3 md:gap-4 overflow-x-auto no-scrollbar scroll-smooth pb-1"
        >
          {items.map((item, idx) => (
            <Link
              key={item.id}
              href={item.href}
              className="group shrink-0 w-[112px] sm:w-[148px] md:w-[178px] flex flex-col items-center cursor-pointer"
            >
              <div
                className="relative w-full aspect-[4/4.3] rounded-[20px] overflow-hidden shadow-sm group-hover:shadow-lg transition-all p-1.5 flex items-end justify-center"
                style={{ background: BEAUTY_GRADIENTS[idx % BEAUTY_GRADIENTS.length] }}
              >
                {item.image_url ? (
                  <SmartFitImage
                    src={item.image_url}
                    alt={item.name}
                    roundedClass="rounded-[15px]"
                    imgClassName="group-hover:scale-[1.04]"
                  />
                ) : (
                  <div className="w-full h-full rounded-[15px] bg-white/25 backdrop-blur-sm flex items-center justify-center text-white">
                    <CategoryIconRenderer iconKey={item.icon_key} iconUrl={item.icon_url} size={34} />
                  </div>
                )}
                <span className="absolute bottom-2 inset-x-2 rounded-full bg-white/95 text-zinc-900 text-[10px] sm:text-xs font-extrabold text-center py-1 px-2 truncate shadow">
                  {item.name}
                </span>
              </div>
            </Link>
          ))}
        </div>

        {items.length > 5 && (
          <button
            type="button"
            onClick={() => scrollRef.current?.scrollBy({ left: 360, behavior: "smooth" })}
            aria-label="Scroll categories"
            className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white shadow-lg border border-zinc-200 items-center justify-center text-zinc-900 hover:scale-105 transition cursor-pointer"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </section>
    );
  }

  // VARIANT B: Fashion 2-Row Horizontal Square Icon Grid (Video 2: 00:00–00:08)
  const useScrollable2Row = items.length > 8;
  return (
    <section className="max-w-[1440px] mx-auto px-3 md:px-6 py-3">
      <div
        className={
          useScrollable2Row
            ? "grid grid-rows-2 grid-flow-col auto-cols-[78px] sm:auto-cols-[92px] md:auto-cols-[106px] gap-x-2.5 gap-y-3 overflow-x-auto no-scrollbar scroll-smooth pb-1"
            : "flex flex-wrap items-start justify-start gap-x-3 gap-y-3.5 sm:gap-x-4 md:gap-x-5"
        }
      >
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`group flex flex-col items-center gap-1.5 text-center cursor-pointer ${
              useScrollable2Row ? "" : "w-[74px] sm:w-[86px] md:w-[96px]"
            }`}
          >
            <div
              className="w-full aspect-square rounded-2xl overflow-hidden border transition-all group-hover:shadow-md group-active:scale-95 flex items-center justify-center"
              style={{
                backgroundColor: tokens.softTintBg,
                borderColor: tokens.borderColor,
              }}
            >
              {item.image_url ? (
                <SmartFitImage
                  src={item.image_url}
                  alt={item.name}
                  imgClassName="group-hover:scale-[1.04]"
                />
              ) : (
                <CategoryIconRenderer
                  iconKey={item.icon_key}
                  iconUrl={item.icon_url}
                  size={26}
                  className="text-zinc-800"
                />
              )}
            </div>
            <span className="text-[11px] sm:text-xs font-semibold text-zinc-800 leading-tight line-clamp-2 w-full px-0.5 group-hover:text-black">
              {item.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
