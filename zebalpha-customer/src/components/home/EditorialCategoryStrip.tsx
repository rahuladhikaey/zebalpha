"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Category } from "@/lib/types";

export interface EditorialStoryItem {
  id: string | number;
  label: string;
  categoryQuery: string;
  image: string;
  tag?: string;
}

const DEFAULT_EDITORIAL_STORIES: EditorialStoryItem[] = [
  {
    id: "new-drops",
    label: "NEW DROPS",
    categoryQuery: "new-drops",
    image: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&auto=format&fit=crop&q=80",
    tag: "DROP 01",
  },
  {
    id: "oversized",
    label: "OVERSIZED",
    categoryQuery: "oversized",
    image: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=400&auto=format&fit=crop&q=80",
    tag: "FIT",
  },
  {
    id: "essentials",
    label: "ESSENTIALS",
    categoryQuery: "essentials",
    image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=400&auto=format&fit=crop&q=80",
    tag: "CORE",
  },
  {
    id: "street-edit",
    label: "STREET EDIT",
    categoryQuery: "streetwear",
    image: "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=400&auto=format&fit=crop&q=80",
    tag: "TRENDING",
  },
  {
    id: "hoodies",
    label: "HOODIES",
    categoryQuery: "hoodies",
    image: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=400&auto=format&fit=crop&q=80",
    tag: "HEAVYWEIGHT",
  },
  {
    id: "limited",
    label: "LIMITED",
    categoryQuery: "limited",
    image: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=400&auto=format&fit=crop&q=80",
    tag: "CAPSULE",
  },
  {
    id: "bestsellers",
    label: "BESTSELLERS",
    categoryQuery: "bestsellers",
    image: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=400&auto=format&fit=crop&q=80",
    tag: "ICONIC",
  },
];

interface EditorialCategoryStripProps {
  categories?: Category[];
  onSelectCategory?: (categoryName: string) => void;
  selectedCategory?: string;
}

export function EditorialCategoryStrip({
  categories = [],
  onSelectCategory,
  selectedCategory = "",
}: EditorialCategoryStripProps) {
  const [isPaused, setIsPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Merge provided categories with fallback stories if available
  const stories: EditorialStoryItem[] = categories.length > 0
    ? categories.slice(0, 7).map((c, i) => ({
        id: c.id || `cat-${i}`,
        label: c.name.toUpperCase(),
        categoryQuery: c.name,
        image: c.image_url || DEFAULT_EDITORIAL_STORIES[i % DEFAULT_EDITORIAL_STORIES.length].image,
        tag: c.main_category?.toUpperCase() || `0${i + 1}`,
      }))
    : DEFAULT_EDITORIAL_STORIES;

  // Duplicated list for seamless infinite right-to-left marquee auto-scroll effect
  const marqueeStories = [...stories, ...stories];

  return (
    <div
      aria-label="Editorial Category Navigation"
      className="w-full relative overflow-hidden py-3 border-y border-neutral-900 bg-neutral-950/80 backdrop-blur-md select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Right/Left subtle gradient overlay masks */}
      <div className="absolute left-0 top-0 bottom-0 w-8 md:w-16 bg-gradient-to-r from-neutral-950 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 md:w-16 bg-gradient-to-l from-neutral-950 to-transparent z-10 pointer-events-none" />

      {/* Auto-scrolling right-to-left marquee wrapper */}
      <div
        ref={scrollRef}
        className="flex items-center gap-3 md:gap-5 w-max no-scrollbar"
        style={{
          animation: `editorial-marquee 32s linear infinite`,
          animationPlayState: isPaused ? "paused" : "running",
        }}
      >
        {marqueeStories.map((item, index) => {
          const isSelected = selectedCategory.toLowerCase() === item.categoryQuery.toLowerCase();
          return (
            <Link
              key={`${item.id}-${index}`}
              href={`/products?category=${encodeURIComponent(item.categoryQuery)}`}
              onClick={(e) => {
                if (onSelectCategory) {
                  e.preventDefault();
                  onSelectCategory(item.categoryQuery);
                }
              }}
              className={`group flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border transition-all duration-300 whitespace-nowrap cursor-pointer ${
                isSelected
                  ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.3)] scale-105"
                  : "bg-neutral-900/90 text-neutral-300 border-neutral-800 hover:border-neutral-500 hover:bg-neutral-800 hover:text-white"
              }`}
            >
              {/* Small Story Image Box */}
              <div className="relative w-6 h-6 sm:w-7 sm:h-7 rounded-full overflow-hidden border border-neutral-700/80 flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                <Image
                  src={item.image}
                  alt={item.label}
                  fill
                  sizes="28px"
                  className="object-cover"
                  unoptimized
                />
              </div>

              {/* Label & Tag */}
              <div className="flex flex-col text-left">
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider leading-none">
                  {item.label}
                </span>
                {item.tag && (
                  <span className="text-[8px] font-semibold tracking-widest text-neutral-400 group-hover:text-rose-400 leading-none mt-0.5">
                    {item.tag}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Inline Keyframes for right-to-left marquee scroll */}
      <style jsx>{`
        @keyframes editorial-marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          div {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
