"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { EditorialHeading } from "./EditorialHeading";
import { EditorialCarousel } from "./EditorialCarousel";
import { EditorialItemData } from "./EditorialCard";
import { EditorialCard } from "@/lib/types";
import { useIsNativeApp } from "@/lib/platform";

interface ZebalphaEditorialProps {
  initialEditorialCards?: EditorialCard[];
}

export function ZebalphaEditorial({
  initialEditorialCards = [],
}: ZebalphaEditorialProps) {
  const isNativeApp = useIsNativeApp();

  // Map ONLY active, deduplicated Cloudinary CDN Custom Studio designs from the single source of truth
  const designItems = useMemo<EditorialItemData[]>(() => {
    if (!initialEditorialCards || initialEditorialCards.length === 0) {
      return [];
    }

    const seenUrls = new Set<string>();
    const results: EditorialItemData[] = [];

    for (let idx = 0; idx < initialEditorialCards.length; idx++) {
      const card = initialEditorialCards[idx];
      if (!card || card.is_active === false || !card.image_url || !card.image_url.trim()) {
        continue;
      }

      const cleanUrl = card.image_url.trim();
      const urlKey = cleanUrl.toLowerCase();
      if (seenUrls.has(urlKey)) continue;
      seenUrls.add(urlKey);

      const idStr = String(card.id || `design-${idx}`);
      const customizeHref =
        card.href && card.href.startsWith("/customize")
          ? card.href
          : `/customize?design=${encodeURIComponent(idStr)}`;

      results.push({
        id: idStr,
        title: (card.title || "Custom Design").trim(),
        category: (card.category || "CUSTOM STUDIO").toUpperCase(),
        price: card.price ? Number(card.price) : undefined,
        image: cleanUrl,
        href: customizeHref,
        badge: (card.badge || "CUSTOMIZE NOW").toUpperCase(),
      });
    }

    return results;
  }, [initialEditorialCards]);

  if (designItems.length === 0) {
    return null;
  }

  return (
    <section
      id="zebalpha-editorial-section"
      className={`my-10 sm:my-16 relative w-full overflow-hidden bg-transparent ${
        isNativeApp ? "text-[#111111]" : "text-white"
      }`}
    >
      {/* 1. UNIFIED CUSTOMIZE DESIGN SHOWCASE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <EditorialHeading
          eyebrow="ZEBALPHA CUSTOM STUDIO"
          titleLine1="Customize &"
          titleLine2="Wear Your Art"
          subtitle="Tap any artwork below to open Custom Studio with that exact design ready on tees, hoodies & totes."
        />

        <Link
          href="/customize"
          className={`self-start sm:self-end mb-2 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 shrink-0 ${
            isNativeApp
              ? "bg-gradient-to-r from-[#FCE89C] via-[#F2C34B] to-[#DDA216] text-[#111111] border border-[#FFF3C4] shadow-[0_6px_16px_rgba(202,138,4,0.22)]"
              : "bg-white/10 hover:bg-amber-400 hover:text-black text-amber-300 border border-amber-400/35"
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" />
          <span>Explore Custom Studio</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* 2. CURVED AUTO-SCROLLING CUSTOM DESIGN CAROUSEL */}
      <div className="mt-2">
        <EditorialCarousel items={designItems} speed={42} />
      </div>
    </section>
  );
}
