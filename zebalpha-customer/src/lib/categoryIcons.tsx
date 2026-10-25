"use client";

import React from "react";
import {
  Shirt,
  Sparkles,
  Smartphone,
  Laptop,
  Home,
  ShoppingBag,
  Footprints,
  Watch,
  Dumbbell,
  BookOpen,
  Baby,
  ShoppingBasket,
  Tag,
  Package,
  Layers,
  Compass,
} from "lucide-react";
import {
  CategoryIconKey,
  CATEGORY_ICON_REGISTRY,
  resolveCategoryIcon,
  getLocalizedCategoryName,
} from "../../../shared/constants/categoryIcons";

export {
  type CategoryIconKey,
  CATEGORY_ICON_REGISTRY,
  resolveCategoryIcon,
  getLocalizedCategoryName,
};

interface CategoryIconProps {
  iconKey?: string | null;
  iconUrl?: string | null;
  className?: string;
  size?: number;
}

/**
 * Universal React Icon Renderer for Category Navigation
 * Supports Lucide vector icons, custom uploaded image/svg, and neutral fallbacks.
 */
export function CategoryIconRenderer({
  iconKey,
  iconUrl,
  className = "w-5 h-5",
  size = 20,
}: CategoryIconProps) {
  // If custom uploaded image/SVG URL is provided, display image
  if (iconUrl && typeof iconUrl === "string" && (iconUrl.startsWith("http") || iconUrl.startsWith("/"))) {
    return (
      <img
        src={iconUrl}
        alt=""
        className={`object-contain ${className}`}
        style={{ width: size, height: size }}
        loading="lazy"
        onError={(e) => {
          // Hide broken image and fallback to package icon
          (e.target as HTMLElement).style.display = "none";
        }}
      />
    );
  }

  const key = (iconKey || "package").toLowerCase();

  switch (key) {
    case "shirt":
      return <Shirt size={size} className={className} aria-hidden="true" />;
    case "dress":
      return <Sparkles size={size} className={className} aria-hidden="true" />;
    case "smartphone":
      return <Smartphone size={size} className={className} aria-hidden="true" />;
    case "laptop":
      return <Laptop size={size} className={className} aria-hidden="true" />;
    case "sparkles":
      return <Sparkles size={size} className={className} aria-hidden="true" />;
    case "house":
      return <Home size={size} className={className} aria-hidden="true" />;
    case "handbag":
      return <ShoppingBag size={size} className={className} aria-hidden="true" />;
    case "footwear":
      return <Footprints size={size} className={className} aria-hidden="true" />;
    case "watch":
      return <Watch size={size} className={className} aria-hidden="true" />;
    case "dumbbell":
      return <Dumbbell size={size} className={className} aria-hidden="true" />;
    case "book":
      return <BookOpen size={size} className={className} aria-hidden="true" />;
    case "baby":
      return <Baby size={size} className={className} aria-hidden="true" />;
    case "shopping-basket":
      return <ShoppingBasket size={size} className={className} aria-hidden="true" />;
    case "tag":
      return <Tag size={size} className={className} aria-hidden="true" />;
    case "for_you":
      return <Compass size={size} className={className} aria-hidden="true" />;
    default:
      return <Package size={size} className={className} aria-hidden="true" />;
  }
}
