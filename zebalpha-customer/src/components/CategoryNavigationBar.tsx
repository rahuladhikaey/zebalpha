"use client";

import React, { useEffect, useState, useRef, useId } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useLanguage } from "@/context/LanguageContext";
import { CategoryIconRenderer, getLocalizedCategoryName } from "@/lib/categoryIcons";
import { ShoppingBag, Flame } from "lucide-react";
import { trackRecommendationEvent } from "@/lib/recommendationClient";

const ACTIVE_GOLD_BOX_CLASS =
  "bg-black text-white border-[2px] border-amber-300 shadow-[0_0_22px_rgba(251,191,36,0.7),inset_0_0_12px_rgba(251,191,36,0.25)]";

const INACTIVE_GOLD_BOX_CLASS =
  "bg-zinc-950/90 text-white border border-amber-500/40 group-hover:border-amber-400/80 shadow-[0_4px_12px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(253,230,138,0.15)] group-active:scale-95";

const GOLD_ACTIVE_UNDERLINE_CLASS =
  "absolute bottom-0 w-8 h-[3px] rounded-full bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-400 shadow-[0_0_14px_#fbbf24]";

const ANDROID_ACTIVE_GOLD_BOX_CLASS =
  "bg-gradient-to-b from-[#FFE68B] via-[#F2BF43] to-[#C88D0F] text-[#14120F] border border-[#FFF5C8] shadow-[0_6px_16px_rgba(198,138,18,0.32)]";

const ANDROID_INACTIVE_GOLD_BOX_CLASS =
  "bg-gradient-to-b from-[#FFFDF8] to-[#F7E8BD] text-[#14120F] border border-[#E3C167]/70 group-hover:border-[#C28D12] shadow-[0_3px_10px_rgba(160,115,20,0.10)] group-active:scale-95";

const ANDROID_GOLD_ACTIVE_UNDERLINE_CLASS =
  "absolute bottom-0 w-8 h-[3px] rounded-full bg-gradient-to-r from-[#D4A017] via-[#EAB308] to-[#9A6503]";

function AndroidCreamWaveBackdrop() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, rgba(252,249,242,0.5) 0%, rgba(250,242,220,0.7) 100%)",
        }}
      />
    </div>
  );
}

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

function LuxuryGoldWaveBackdrop() {
  const uid = useId().replace(/:/g, "");
  const primaryId = `goldWavePrimary-${uid}`;
  const secondaryId = `goldWaveSecondary-${uid}`;
  const ribbonFillId = `goldRibbonFill-${uid}`;
  const glowId = `goldWaveGlow-${uid}`;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-85 z-0" aria-hidden="true">
      {/* Subtle side warm-gold radial glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 35% 90% at 0% 70%, rgba(245,158,11,0.18), transparent 72%), radial-gradient(ellipse 35% 90% at 100% 60%, rgba(245,158,11,0.16), transparent 72%)",
        }}
      />

      <svg className="w-full h-full object-cover" viewBox="0 0 1000 120" preserveAspectRatio="none">
        <defs>
          <linearGradient id={primaryId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#b45309" stopOpacity="0.25" />
            <stop offset="22%" stopColor="#fde68a" stopOpacity="0.95" />
            <stop offset="55%" stopColor="#fbbf24" stopOpacity="0.9" />
            <stop offset="82%" stopColor="#f59e0b" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#b45309" stopOpacity="0.2" />
          </linearGradient>
          <linearGradient id={secondaryId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0" />
            <stop offset="35%" stopColor="#fde68a" stopOpacity="0.55" />
            <stop offset="70%" stopColor="#fbbf24" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#b45309" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={ribbonFillId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#b45309" stopOpacity="0.08" />
            <stop offset="30%" stopColor="#f59e0b" stopOpacity="0.28" />
            <stop offset="65%" stopColor="#fbbf24" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#b45309" stopOpacity="0.06" />
          </linearGradient>
          <filter id={glowId} x="-20%" y="-30%" width="140%" height="160%">
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Soft glowing gold silk ribbon body */}
        <path
          d="M 0,48 C 210,105 460,55 720,96 C 845,114 935,98 1000,72 L 1000,96 C 925,116 825,122 700,108 C 445,74 205,118 0,72 Z"
          fill={`url(#${ribbonFillId})`}
        />

        {/* Primary glowing gold wave line */}
        <path
          d="M 0,50 C 210,104 460,56 720,96 C 845,114 935,98 1000,72"
          fill="none"
          stroke={`url(#${primaryId})`}
          strokeWidth="2.4"
          filter={`url(#${glowId})`}
        />

        {/* Secondary delicate gold shimmer curve */}
        <path
          d="M 0,78 C 240,118 520,66 780,104 C 890,116 955,104 1000,86"
          fill="none"
          stroke={`url(#${secondaryId})`}
          strokeWidth="1.2"
        />

        {/* Subtle golden stardust sparkles */}
        <circle cx="28" cy="28" r="1.4" fill="#fde68a" opacity="0.85" />
        <circle cx="52" cy="42" r="1.0" fill="#fbbf24" opacity="0.65" />
        <circle cx="76" cy="22" r="1.1" fill="#f59e0b" opacity="0.55" />
        <circle cx="110" cy="98" r="1.3" fill="#fde68a" opacity="0.7" />
        <circle cx="315" cy="96" r="1.0" fill="#fbbf24" opacity="0.55" />
        <circle cx="560" cy="84" r="1.2" fill="#fde68a" opacity="0.6" />
        <circle cx="890" cy="94" r="1.1" fill="#fbbf24" opacity="0.65" />
        <circle cx="935" cy="34" r="1.3" fill="#fde68a" opacity="0.75" />
        <circle cx="968" cy="52" r="1.5" fill="#f59e0b" opacity="0.8" />
        <circle cx="982" cy="24" r="1.0" fill="#fde68a" opacity="0.6" />
      </svg>
    </div>
  );
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
        className={`w-full py-2.5 px-3 md:px-6 ${
          isNativeApp ? "bg-[#050402]" : "bg-[#050402]/95 border-b border-amber-500/20"
        } ${className}`}
      >
        <div className="flex items-center gap-3 overflow-hidden no-scrollbar animate-pulse">
          {[...Array(7)].map((_, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-1.5 shrink-0 w-[64px] sm:w-[72px]"
            >
              <div className="w-11 h-11 rounded-2xl bg-[#120e07] border border-amber-500/20" />
              <div className="w-12 h-2.5 bg-[#1a140a] rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Calculate dynamic dimensions driven by collapse progress
  const baseIconSize = isNativeApp ? 44 : 46;
  const currentIconHeight = isCollapsed
    ? 0
    : Math.max(0, Math.round((1 - collapseProgress) * baseIconSize));
  const currentIconOpacity = isCollapsed
    ? 0
    : Math.max(0, 1 - collapseProgress * 1.3);
  const currentIconScale = isCollapsed
    ? 0
    : Math.max(0, 1 - collapseProgress * 0.35);

  const iconBoxStyle: React.CSSProperties = {
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
  };

  return (
    <nav
      aria-label="Category Navigation"
      className={`relative w-full transition-all duration-200 select-none overflow-hidden ${
        isNativeApp
          ? "bg-[#FCF9F2]"
          : "bg-[#050402]/95 backdrop-blur-xl border-b border-amber-500/20"
      } ${
        isCollapsed
          ? isNativeApp
            ? "py-1.5 border-b border-[#E5C882] shadow-sm"
            : "py-1.5 border-b border-amber-500/25 shadow-md"
          : "py-1.5"
      } ${className}`}
    >
      {/* Ambient Metallic Gold Silk Wave & Stardust Background */}
      {isNativeApp ? <AndroidCreamWaveBackdrop /> : <LuxuryGoldWaveBackdrop />}

      <div className="relative z-10 mx-auto w-full max-w-[1400px]">
        <div
          ref={scrollContainerRef}
          role="tablist"
          className={`flex items-end gap-2.5 sm:gap-4 md:gap-6 overflow-x-auto px-3.5 md:px-8 no-scrollbar scroll-smooth transition-all ${
            isCollapsed ? "py-0.5" : "pt-2.5 pb-1.5"
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
                : "w-[62px] sm:w-[70px] md:w-[80px] pt-1 pb-2"
            } ${
              isNativeApp
                ? isForYouActive
                  ? "text-[#14120F]"
                  : "text-[#3B3326] hover:text-[#14120F]"
                : isForYouActive
                  ? "text-white"
                  : "text-zinc-100 hover:text-amber-200"
            }`}
          >
            {/* Collapsible Icon Box */}
            <div
              aria-hidden={isCollapsed}
              style={iconBoxStyle}
              className={`relative items-center justify-center rounded-2xl shrink-0 transition-all duration-200 ${
                isNativeApp
                  ? isForYouActive
                    ? ANDROID_ACTIVE_GOLD_BOX_CLASS
                    : ANDROID_INACTIVE_GOLD_BOX_CLASS
                  : isForYouActive
                    ? ACTIVE_GOLD_BOX_CLASS
                    : INACTIVE_GOLD_BOX_CLASS
              }`}
            >
              <ShoppingBag
                size={isNativeApp ? 20 : 21}
                className={`transition-transform stroke-[2.2] ${
                  isNativeApp
                    ? "text-[#14120F]"
                    : isForYouActive
                      ? "text-white scale-105 drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]"
                      : "text-white group-hover:text-amber-100"
                }`}
              />
            </div>

            {/* Category Name - ALWAYS VISIBLE in both Expanded and Collapsed states */}
            <span
              className={`text-[10px] sm:text-[11px] text-center tracking-tight truncate w-full px-0.5 leading-tight transition-colors ${
                isNativeApp
                  ? isForYouActive
                    ? "text-[#14120F] font-extrabold"
                    : "text-[#3B3326] font-semibold"
                  : isForYouActive
                    ? "text-white font-extrabold"
                    : "text-zinc-100 font-semibold group-hover:text-amber-200"
              }`}
            >
              {forYouLabel}
            </span>

            {/* Active Indicator Underline - ALWAYS VISIBLE */}
            {isForYouActive && (
              <span className={isNativeApp ? ANDROID_GOLD_ACTIVE_UNDERLINE_CLASS : GOLD_ACTIVE_UNDERLINE_CLASS} />
            )}
          </Link>

          {/* =================================================================== */}
          {/* NEW DROPS & HYPE SHOWCASE TAB                                      */}
          {/* =================================================================== */}
          <Link
            href="/new-drops"
            role="tab"
            aria-selected={pathname === "/new-drops"}
            data-active={pathname === "/new-drops"}
            className={`group relative flex flex-col items-center justify-end shrink-0 transition-all cursor-pointer focus:outline-none ${
              isCollapsed
                ? "min-w-[56px] sm:min-w-[64px] px-2 py-1.5"
                : "w-[62px] sm:w-[70px] md:w-[80px] pt-1 pb-2"
            } ${
              isNativeApp
                ? pathname === "/new-drops"
                  ? "text-[#14120F]"
                  : "text-[#3B3326]"
                : pathname === "/new-drops"
                  ? "text-amber-300"
                  : "text-amber-400 hover:text-amber-300"
            }`}
          >
            {/* Collapsible Icon Box */}
            <div
              aria-hidden={isCollapsed}
              style={iconBoxStyle}
              className={`relative items-center justify-center rounded-2xl shrink-0 transition-all duration-200 ${
                isNativeApp
                  ? pathname === "/new-drops"
                    ? ANDROID_ACTIVE_GOLD_BOX_CLASS
                    : ANDROID_INACTIVE_GOLD_BOX_CLASS
                  : pathname === "/new-drops"
                    ? ACTIVE_GOLD_BOX_CLASS
                    : `${INACTIVE_GOLD_BOX_CLASS} border-amber-500/40`
              }`}
            >
              {isNativeApp && (
                <span
                  data-photo-overlay="true"
                  className="absolute -top-1.5 -right-1.5 z-10 rounded-full bg-gradient-to-r from-[#EF4444] to-[#B91C1C] px-1.5 py-[1px] text-[7.5px] font-black uppercase tracking-wider text-white border border-[#FFFDF8] shadow-sm leading-tight"
                >
                  NEW
                </span>
              )}
              <Flame
                size={isNativeApp ? 20 : 21}
                className={`transition-transform stroke-[2.2] ${
                  isNativeApp
                    ? "text-[#B45309]"
                    : pathname === "/new-drops"
                      ? "text-amber-300 scale-105 drop-shadow-[0_0_8px_rgba(251,191,36,0.55)]"
                      : "text-amber-400 group-hover:scale-110"
                }`}
              />
            </div>

            {/* Label */}
            <span
              className={`text-[10px] sm:text-[11px] text-center tracking-tight truncate w-full px-0.5 leading-tight transition-colors ${
                isNativeApp
                  ? pathname === "/new-drops"
                    ? "text-[#14120F] font-extrabold"
                    : "text-[#3B3326] font-bold"
                  : pathname === "/new-drops"
                    ? "text-amber-300 font-extrabold"
                    : "text-amber-400 font-bold group-hover:text-amber-300"
              }`}
            >
              {isNativeApp ? "Drops" : "⚡ Drops"}
            </span>

            {/* Active Indicator Underline */}
            {pathname === "/new-drops" && (
              <span className={isNativeApp ? ANDROID_GOLD_ACTIVE_UNDERLINE_CLASS : GOLD_ACTIVE_UNDERLINE_CLASS} />
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
                onClick={() => {
                  trackRecommendationEvent({
                    eventType: "category_viewed",
                    categoryId: cat.id,
                  }).catch(() => {});
                }}
                role="tab"
                aria-selected={isSelected}
                data-active={isSelected}
                className={`group relative flex flex-col items-center justify-end shrink-0 transition-all cursor-pointer focus:outline-none ${
                  isCollapsed
                    ? "min-w-[56px] sm:min-w-[64px] px-2 py-1.5"
                    : "w-[62px] sm:w-[70px] md:w-[80px] pt-1 pb-2"
                } ${
                  isNativeApp
                    ? isSelected
                      ? "text-[#14120F]"
                      : "text-[#3B3326] hover:text-[#14120F]"
                    : isSelected
                      ? "text-white"
                      : "text-zinc-100 hover:text-amber-200"
                }`}
              >
                {/* Collapsible Icon Box */}
                <div
                  aria-hidden={isCollapsed}
                  style={iconBoxStyle}
                  className={`relative items-center justify-center rounded-2xl shrink-0 transition-all duration-200 overflow-hidden ${
                    isNativeApp
                      ? isSelected
                        ? ANDROID_ACTIVE_GOLD_BOX_CLASS
                        : ANDROID_INACTIVE_GOLD_BOX_CLASS
                      : isSelected
                        ? ACTIVE_GOLD_BOX_CLASS
                        : INACTIVE_GOLD_BOX_CLASS
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
                      size={isNativeApp ? 19 : 20}
                      className={
                        isNativeApp
                          ? "text-[#14120F] stroke-[2.15]"
                          : isSelected
                            ? "text-white stroke-[2.3] drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]"
                            : "text-white stroke-[2.1] group-hover:text-amber-100"
                      }
                    />
                  )}
                </div>

                {/* Category Name - ALWAYS VISIBLE in both Expanded and Collapsed states */}
                <span
                  title={localizedName}
                  className={`text-[10px] sm:text-[11px] text-center tracking-tight truncate w-full px-0.5 leading-tight transition-colors ${
                    isNativeApp
                      ? isSelected
                        ? "text-[#14120F] font-extrabold"
                        : "text-[#3B3326] font-semibold"
                      : isSelected
                        ? "text-white font-extrabold"
                        : "text-zinc-100 font-semibold group-hover:text-amber-200"
                  }`}
                >
                  {localizedName}
                </span>

                {/* Active Indicator Underline - ALWAYS VISIBLE */}
                {isSelected && (
                  <span className={isNativeApp ? ANDROID_GOLD_ACTIVE_UNDERLINE_CLASS : GOLD_ACTIVE_UNDERLINE_CLASS} />
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
