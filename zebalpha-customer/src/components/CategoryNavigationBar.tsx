"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { CategoryIconRenderer, getLocalizedCategoryName } from "@/lib/categoryIcons";
import { Compass } from "lucide-react";

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

  // Scroll collapse state (0 = fully expanded, 1 = fully collapsed)
  const [collapseProgress, setCollapseProgress] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Synchronize when initialCategories prop updates from SSR
  useEffect(() => {
    if (initialCategories && initialCategories.length > 0) {
      setCategories(initialCategories);
      setLoading(false);
    }
  }, [initialCategories]);

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

  // 2. Scroll-linked icon collapse animation (Flipkart-style)
  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const COLLAPSE_DISTANCE = 60; // Pixels of scroll before full collapse
    let rafId: number | null = null;

    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        const scrollY =
          window.scrollY ||
          window.pageYOffset ||
          document.documentElement.scrollTop ||
          0;

        if (prefersReducedMotion) {
          const collapsed = scrollY > 30;
          setIsCollapsed(collapsed);
          setCollapseProgress(collapsed ? 1 : 0);
          return;
        }

        const rawProgress = Math.min(1, Math.max(0, scrollY / COLLAPSE_DISTANCE));
        // Clamp to precision to avoid excessive state churn
        const clamped = Math.round(rawProgress * 100) / 100;

        setCollapseProgress(clamped);
        setIsCollapsed(clamped >= 0.95);
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
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
      <div
        className={`w-full py-2 px-3 md:px-6 ${
          isNativeApp ? "bg-black" : "bg-black/90 border-b border-zinc-900"
        } ${className}`}
      >
        <div className="flex items-center gap-3 overflow-hidden no-scrollbar animate-pulse">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-1.5 shrink-0 w-[64px] sm:w-[72px]"
            >
              <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-850" />
              <div className="w-12 h-2.5 bg-zinc-900 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Calculate dynamic dimensions driven by collapse progress
  const baseIconSize = isNativeApp ? 40 : 42;
  const currentIconHeight = isCollapsed
    ? 0
    : Math.max(0, Math.round((1 - collapseProgress) * baseIconSize));
  const currentIconOpacity = isCollapsed
    ? 0
    : Math.max(0, 1 - collapseProgress * 1.3);
  const currentIconScale = isCollapsed
    ? 0
    : Math.max(0, 1 - collapseProgress * 0.35);

  return (
    <nav
      aria-label="Category Navigation"
      className={`w-full transition-all duration-200 select-none ${
        isNativeApp
          ? "bg-black"
          : "bg-black/95 backdrop-blur-xl border-b border-zinc-900/80"
      } ${
        isCollapsed
          ? "py-1.5 border-b border-zinc-850 shadow-md"
          : "py-2"
      } ${className}`}
    >
      <div className="mx-auto w-full max-w-[1400px]">
        <div
          ref={scrollContainerRef}
          role="tablist"
          className={`flex items-end gap-2 sm:gap-3.5 md:gap-5 overflow-x-auto px-3.5 md:px-8 no-scrollbar scroll-smooth transition-all ${
            isCollapsed ? "py-0.5" : "py-1"
          }`}
          style={{
            touchAction: "pan-x",
            overscrollBehaviorX: "contain",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {/* =================================================================== */}
          {/* SPECIAL VIRTUAL TAB 1: "For You" (Discover / Home)                  */}
          {/* =================================================================== */}
          <Link
            href="/"
            role="tab"
            aria-selected={isForYouActive}
            data-active={isForYouActive}
            className={`group relative flex flex-col items-center justify-end shrink-0 transition-all cursor-pointer focus:outline-none ${
              isCollapsed
                ? "min-w-[56px] sm:min-w-[64px] px-2 py-1.5"
                : "w-[62px] sm:w-[70px] md:w-[80px] py-1"
            } ${
              isForYouActive ? "text-white" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {/* Collapsible Icon Box */}
            <div
              aria-hidden={isCollapsed}
              style={{
                height: isCollapsed ? 0 : `${currentIconHeight}px`,
                width: isCollapsed ? 0 : `${currentIconHeight}px`,
                opacity: currentIconOpacity,
                transform: `scale(${currentIconScale})`,
                marginBottom: isCollapsed ? 0 : `${Math.round((1 - collapseProgress) * 6)}px`,
                display: isCollapsed ? "none" : "flex",
                visibility: isCollapsed ? "hidden" : "visible",
                pointerEvents: isCollapsed ? "none" : "auto",
                overflow: "hidden",
                transition: "height 0.15s ease-out, opacity 0.15s ease-out, transform 0.15s ease-out, margin 0.15s ease-out",
              }}
              className={`relative items-center justify-center rounded-2xl shrink-0 transition-colors duration-200 ${
                isForYouActive
                  ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)] ring-2 ring-white"
                  : "bg-zinc-900/90 text-zinc-300 border border-zinc-800/80 group-hover:border-zinc-600 group-hover:bg-zinc-850 group-active:scale-95"
              }`}
            >
              <Compass
                size={isNativeApp ? 19 : 20}
                className={`transition-transform ${
                  isForYouActive ? "scale-105" : "group-hover:rotate-12"
                }`}
              />
            </div>

            {/* Category Name - ALWAYS VISIBLE in both Expanded and Collapsed states */}
            <span
              className={`text-[10px] sm:text-[11px] font-bold text-center tracking-tight truncate w-full px-0.5 leading-tight transition-colors ${
                isForYouActive
                  ? "text-white font-extrabold"
                  : "text-zinc-400 group-hover:text-zinc-200"
              }`}
            >
              {forYouLabel}
            </span>

            {/* Active Indicator Underline - ALWAYS VISIBLE */}
            {isForYouActive && (
              <span className="absolute bottom-0 w-6 sm:w-8 h-[2.5px] rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
            )}
          </Link>

          {/* =================================================================== */}
          {/* DYNAMIC DATABASE-DRIVEN CATEGORIES (Flipkart-Inspired)             */}
          {/* =================================================================== */}
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
                className={`group relative flex flex-col items-center justify-end shrink-0 transition-all cursor-pointer focus:outline-none ${
                  isCollapsed
                    ? "min-w-[56px] sm:min-w-[64px] px-2 py-1.5"
                    : "w-[62px] sm:w-[70px] md:w-[80px] py-1"
                } ${
                  isSelected ? "text-white" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {/* Collapsible Icon Box */}
                <div
                  aria-hidden={isCollapsed}
                  style={{
                    height: isCollapsed ? 0 : `${currentIconHeight}px`,
                    width: isCollapsed ? 0 : `${currentIconHeight}px`,
                    opacity: currentIconOpacity,
                    transform: `scale(${currentIconScale})`,
                    marginBottom: isCollapsed ? 0 : `${Math.round((1 - collapseProgress) * 6)}px`,
                    display: isCollapsed ? "none" : "flex",
                    visibility: isCollapsed ? "hidden" : "visible",
                    pointerEvents: isCollapsed ? "none" : "auto",
                    overflow: "hidden",
                    transition: "height 0.15s ease-out, opacity 0.15s ease-out, transform 0.15s ease-out, margin 0.15s ease-out",
                  }}
                  className={`relative items-center justify-center rounded-2xl shrink-0 transition-colors duration-200 ${
                    isSelected
                      ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)] ring-2 ring-white"
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
                      className={
                        isSelected
                          ? "text-black"
                          : "text-zinc-300 group-hover:text-white"
                      }
                    />
                  )}
                </div>

                {/* Category Name - ALWAYS VISIBLE in both Expanded and Collapsed states */}
                <span
                  title={localizedName}
                  className={`text-[10px] sm:text-[11px] font-bold text-center tracking-tight truncate w-full px-0.5 leading-tight transition-colors ${
                    isSelected
                      ? "text-white font-extrabold"
                      : "text-zinc-400 group-hover:text-zinc-200"
                  }`}
                >
                  {localizedName}
                </span>

                {/* Active Indicator Underline - ALWAYS VISIBLE */}
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
