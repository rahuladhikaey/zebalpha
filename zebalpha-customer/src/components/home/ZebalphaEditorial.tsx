"use client";

import { useMemo } from "react";
import { Product, Category } from "@/lib/types";
import { EditorialHeading } from "./EditorialHeading";
import { EditorialCarousel } from "./EditorialCarousel";
import { EditorialItemData } from "./EditorialCard";

interface ZebalphaEditorialProps {
  initialProducts?: Product[];
  initialCategories?: Category[];
  initialEditorialCards?: any[];
}

const CURATED_FALLBACK_EDITORIAL: EditorialItemData[] = [
  {
    id: "edit-1",
    title: "OBSIDIAN OVERSIZED HEAVY TEE",
    category: "ZEBALPHA ESSENTIALS",
    price: 2499,
    image: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&auto=format&fit=crop&q=80",
    href: "/products?category=oversized",
    badge: "EDITORIAL DROP",
  },
  {
    id: "edit-2",
    title: "VINTAGE WASH ARCHIVAL FLEECE",
    category: "STREET EDIT",
    price: 4999,
    image: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80",
    href: "/products?category=hoodies",
    badge: "LIMITED EDITION",
  },
  {
    id: "edit-3",
    title: "STRUCTURED MONOCHROME POLO",
    category: "PREMIUM ESSENTIALS",
    price: 3299,
    image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80",
    href: "/products?category=polos",
    badge: "CORE CAPSULE",
  },
  {
    id: "edit-4",
    title: "UTILITY CARGO TROUSERS",
    category: "BOTTOMS & PANTS",
    price: 4499,
    image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&auto=format&fit=crop&q=80",
    href: "/products?category=bottoms",
    badge: "BESTSELLER",
  },
  {
    id: "edit-5",
    title: "RAW DENIM OVERSIZED SHIRT",
    category: "LIMITED CAPSULE",
    price: 3899,
    image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&auto=format&fit=crop&q=80",
    href: "/products?category=shirts",
    badge: "DROP 02",
  },
  {
    id: "edit-6",
    title: "MINIMALIST EMBROIDERED CAP",
    category: "ACCESSORIES",
    price: 1499,
    image: "https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=800&auto=format&fit=crop&q=80",
    href: "/products?category=accessories",
    badge: "ACCESSORY",
  },
];

export function ZebalphaEditorial({
  initialProducts = [],
  initialCategories = [],
  initialEditorialCards = [],
}: ZebalphaEditorialProps) {
  // Convert real Superadmin editorial cards or catalog products to Editorial items
  const editorialItems = useMemo<EditorialItemData[]>(() => {
    if (initialEditorialCards && initialEditorialCards.length > 0) {
      return initialEditorialCards.map((card, idx) => ({
        id: card.id || `admin-card-${idx}`,
        title: (card.title || "").toUpperCase(),
        category: (card.category || "ZEBALPHA EDIT").toUpperCase(),
        price: card.price ? Number(card.price) : undefined,
        image: card.image_url || card.image || CURATED_FALLBACK_EDITORIAL[idx % CURATED_FALLBACK_EDITORIAL.length].image,
        href: card.href || "/products",
        badge: (card.badge || "EDITORIAL DROP").toUpperCase(),
      }));
    }

    if (initialProducts.length >= 4) {
      return initialProducts.slice(0, 8).map((product, idx) => ({
        id: product.id,
        title: product.name.toUpperCase(),
        category: (product.category_name || product.category || product.brand || "ZEBALPHA EDIT").toUpperCase(),
        price: product.price,
        image: product.image_url || product.images?.[0] || CURATED_FALLBACK_EDITORIAL[idx % CURATED_FALLBACK_EDITORIAL.length].image,
        href: `/products/${product.id}`,
        badge: (product.specifications as any)?.badge || (product.tier ? `${product.tier} EDIT` : "EDITORIAL DROP"),
      }));
    }

    // Merge available catalog products with curated fashion mock items
    const convertedFromProducts: EditorialItemData[] = initialProducts.map((product) => ({
      id: product.id,
      title: product.name.toUpperCase(),
      category: (product.category_name || product.category || "ZEBALPHA EDIT").toUpperCase(),
      price: product.price,
      image: product.image_url || product.images?.[0] || CURATED_FALLBACK_EDITORIAL[0].image,
      href: `/products/${product.id}`,
      badge: "EDITORIAL DROP",
    }));

    const remainingNeeded = Math.max(0, 6 - convertedFromProducts.length);
    return [...convertedFromProducts, ...CURATED_FALLBACK_EDITORIAL.slice(0, remainingNeeded)];
  }, [initialEditorialCards, initialProducts]);

  return (
    <section
      id="zebalpha-editorial-section"
      className="my-10 sm:my-16 relative w-full overflow-hidden text-white bg-transparent"
    >
      {/* 1. EDITORIAL HEADER (Headline + Subtitle only, no category strip, no explore link) */}
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
