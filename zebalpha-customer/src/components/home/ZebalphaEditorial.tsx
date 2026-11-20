"use client";

import { useMemo } from "react";
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
      className={`my-6 sm:my-14 relative w-full overflow-hidden bg-transparent ${
        isNativeApp ? "text-[#111111]" : "text-white"
      }`}
    >
      {/* 1. UNIFIED CUSTOMIZE DESIGN SHOWCASE HEADER */}
      <EditorialHeading
        eyebrow="ZEBALPHA CUSTOM STUDIO"
        titleLine1="Customize &"
        titleLine2="Wear Your Art"
        subtitle="Tap any artwork below to open Custom Studio with that exact design ready on tees, hoodies & totes."
      />

      {/* 2. CURVED AUTO-SCROLLING CUSTOM DESIGN CAROUSEL */}
      <div className="mt-1">
        <EditorialCarousel items={designItems} speed={42} />
      </div>
    </section>
  );
}
