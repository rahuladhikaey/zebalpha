"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { CategoryIconRenderer, getLocalizedCategoryName } from "@/lib/categoryIcons";
import { Sparkles, Compass } from "lucide-react";

export interface NavigationCategory {
  id: string;
  name: string;
  slug: string;
  icon_key?: string | null;
  icon_url?: string | null;
  image_url?: string | null;
  display_order?: number;
}

interface CategoryNavigationBarProps {
  initialCategories?: NavigationCategory[];
  isNativeApp?: boolean;
  className?: string;
}

export function CategoryNavigationBar({
  initialCategories = [],
  isNativeApp = false,
  className = "",
}: CategoryNavigationBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { language } = useLanguage();

  const [categories, setCategories] = useState<NavigationCategory[]>(initialCategories);
  const [loading, setLoading] = useState(initialCategories.length === 0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Active Category state
  const activeCategoryId = searchParams.get("category");
  const isHomePage = pathname === "/";
  const isForYouActive = isHomePage && !activeCategoryId;

  // 1. Fetch live categories from backend/Supabase if not pre-populated
  useEffect(() => {
    let isMounted = true;
    async function loadNavigationCategories() {
      try {
        const res = await fetch("/api/categories/navigation");
        if (!res.ok) return;
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && isMounted) {
          setCategories(json.data);
        }
      } catch (err) {
        console.warn("[CategoryNavigationBar] Failed to fetch live categories:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadNavigationCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  const forYouLabel = language === "hi" ? "आपके लिए" : "For You";

  // Handle active item scroll into view
  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeEl = scrollContainerRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }
  }, [activeCategoryId, isForYouActive]);

  if (loading && categories.length === 0) {
    return (
      <div className={`w-full py-2.5 px-3 md:px-6 bg-black/90 border-b border-zinc-900 ${className}`}>
        <div className="flex items-center gap-3 overflow-hidden no-scrollbar animate-pulse">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 shrink-0 w-[72px]">
              <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-850" />
              <div className="w-12 h-2.5 bg-zinc-900 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // If no categories available from DB, render minimal For You tab only
  return (
    <nav
      aria-label="Category Navigation"
      className={`w-full bg-black/95 backdrop-blur-xl border-b border-zinc-900/80 transition-colors select-none ${className}`}
    >
      <div className="mx-auto w-full max-w-[1400px]">
        <div
          ref={scrollContainerRef}
          role="tablist"
          className="flex items-start gap-2.5 sm:gap-4 md:gap-6 overflow-x-auto py-2.5 px-3.5 md:px-8 no-scrollbar scroll-smooth"
          style={{
            touchAction: "pan-x",
            overscrollBehaviorX: "contain",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {/* SPECIAL VIRTUAL TAB 1: "For You" (Discover / Home) */}
          <Link
            href="/"
            role="tab"
            aria-selected={isForYouActive}
            data-active={isForYouActive}
            className={`group relative flex flex-col items-center justify-start shrink-0 w-[64px] sm:w-[72px] md:w-[84px] py-1 transition-all cursor-pointer focus:outline-none ${
              isForYouActive
                ? "text-white"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {/* Icon Circle */}
            <div
              className={`relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-2xl transition-all duration-200 ${
                isForYouActive
                  ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)] ring-2 ring-white scale-105"
                  : "bg-zinc-900/90 text-zinc-300 border border-zinc-800/80 group-hover:border-zinc-600 group-hover:bg-zinc-850 group-active:scale-95"
              }`}
            >
              <Compass
                size={isNativeApp ? 19 : 21}
                className={`transition-transform ${isForYouActive ? "scale-105" : "group-hover:rotate-12"}`}
              />
            </div>

            {/* Label */}
            <span
              className={`mt-1.5 text-[10px] sm:text-[11px] font-bold text-center tracking-tight truncate w-full px-0.5 leading-tight ${
                isForYouActive ? "text-white font-extrabold" : "text-zinc-400 group-hover:text-zinc-200"
              }`}
            >
              {forYouLabel}
            </span>

            {/* Active Indicator Underline */}
            {isForYouActive && (
              <span className="absolute bottom-0 w-6 sm:w-8 h-[2.5px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
            )}
          </Link>

          {/* DYNAMIC DATABASE-DRIVEN CATEGORIES (Flipkart-Inspired) */}
          {categories.map((cat) => {
            const isSelected = String(activeCategoryId) === String(cat.id);
            const localizedName = getLocalizedCategoryName(cat.name, language);

            return (
              <Link
                key={cat.id}
                href={`/products?category=${encodeURIComponent(cat.id)}`}
                role="tab"
                aria-selected={isSelected}
                data-active={isSelected}
                className={`group relative flex flex-col items-center justify-start shrink-0 w-[64px] sm:w-[72px] md:w-[84px] py-1 transition-all cursor-pointer focus:outline-none ${
                  isSelected
                    ? "text-white"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {/* Icon Container */}
                <div
                  className={`relative flex items-center justify-center w-10 h-10 sm:w-11 sm:h-11 rounded-2xl transition-all duration-200 overflow-hidden ${
                    isSelected
                      ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)] ring-2 ring-white scale-105"
                      : "bg-zinc-900/90 text-zinc-300 border border-zinc-800/80 group-hover:border-zinc-600 group-hover:bg-zinc-850 group-active:scale-95"
                  }`}
                >
                  {cat.image_url ? (
                    <img
                      src={cat.image_url}
                      alt={cat.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <CategoryIconRenderer
                      iconKey={cat.icon_key}
                      iconUrl={cat.icon_url}
                      size={isNativeApp ? 18 : 20}
                      className={isSelected ? "text-black" : "text-zinc-300 group-hover:text-white"}
                    />
                  )}
                </div>

                {/* Category Name Centered & Gracefully Truncated */}
                <span
                  title={localizedName}
                  className={`mt-1.5 text-[10px] sm:text-[11px] font-bold text-center tracking-tight truncate w-full px-0.5 leading-tight ${
                    isSelected ? "text-white font-extrabold" : "text-zinc-400 group-hover:text-zinc-200"
                  }`}
                >
                  {localizedName}
                </span>

                {/* Active Indicator Underline */}
                {isSelected && (
                  <span className="absolute bottom-0 w-6 sm:w-8 h-[2.5px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default CategoryNavigationBar;
