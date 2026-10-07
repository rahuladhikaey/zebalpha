"use client";

import { useMemo } from "react";
import { EditorialHeading } from "./EditorialHeading";
import { EditorialCarousel } from "./EditorialCarousel";
import { EditorialItemData } from "./EditorialCard";
import { EditorialCard } from "@/lib/types";

interface ZebalphaEditorialProps {
  initialEditorialCards?: EditorialCard[];
}

export function ZebalphaEditorial({
  initialEditorialCards = [],
}: ZebalphaEditorialProps) {
  // Map ONLY active, real admin-managed editorial cards from the database
  const editorialItems = useMemo<EditorialItemData[]>(() => {
    if (!initialEditorialCards || initialEditorialCards.length === 0) {
      return [];
    }

    return initialEditorialCards
      .filter((card) => card && card.is_active !== false && card.image_url && card.image_url.trim().length > 0)
      .map((card, idx) => ({
        id: card.id || `editorial-${idx}`,
        title: (card.title || "").toUpperCase(),
        category: (card.category || "ZEBALPHA EDIT").toUpperCase(),
        price: card.price ? Number(card.price) : undefined,
        image: card.image_url,
        href: card.href || "/products",
        badge: (card.badge || "EDITORIAL DROP").toUpperCase(),
      }));
  }, [initialEditorialCards]);

  // If no admin-managed editorial cards exist, cleanly hide the section (no fake cards or stock fallbacks)
  if (editorialItems.length === 0) {
    return null;
  }

  return (
    <section
      id="zebalpha-editorial-section"
      className="my-10 sm:my-16 relative w-full overflow-hidden text-white bg-transparent"
    >
      {/* 1. EDITORIAL HEADER */}
      <EditorialHeading
        eyebrow="THE ZEBALPHA EDIT"
        titleLine1="Woven to Be"
        titleLine2="Remembered"
        subtitle="Pieces made for the moments that stay with you. Signature Gen-Z fashion & luxury streetwear."
      />

      {/* 2. CURVED FASHION CAROUSEL */}
      <div className="mt-2">
        <EditorialCarousel items={editorialItems} speed={45} />
      </div>
    </section>
  );
}

