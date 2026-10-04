"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

type CategoryTab = "ALL" | "POLOS" | "T-SHIRTS" | "HOODIES" | "SHIRTS" | "JACKETS";

interface CollectionItem {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  tag: string;
  href: string;
  categories: CategoryTab[];
  accentGradient: string;
  glowColor: string;
  renderIllustration: () => React.ReactNode;
}

const CATEGORY_TABS: CategoryTab[] = [
  "ALL",
  "POLOS",
  "T-SHIRTS",
  "HOODIES",
  "SHIRTS",
  "JACKETS",
];

const COLLECTIONS_DATA: CollectionItem[] = [
  {
    id: "premium-tshirts",
    title: "PREMIUM T-SHIRTS",
    subtitle: "100% California Supima® Pique",
    badge: "SUPIMA 240G",
    tag: "LUXURY PIQUE",
    href: "/products?collection=premium-tshirts&category=T-SHIRTS",
    categories: ["ALL", "T-SHIRTS", "POLOS"],
    accentGradient: "from-zinc-800 to-zinc-950",
    glowColor: "rgba(255,255,255,0.08)",
    renderIllustration: () => (
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-24 h-24 sm:w-28 sm:h-28 drop-shadow-[0_12px_24px_rgba(0,0,0,0.8)]"
      >
        {/* Ambient Back Glow */}
        <circle cx="60" cy="60" r="42" fill="url(#p-glow)" opacity="0.4" />
        {/* Premium T-Shirt Shape */}
        <path
          d="M38 34L20 46L30 58L38 52V92C38 94.2091 39.7909 96 42 96H78C80.2091 96 82 94.2091 82 92V52L90 58L100 46L82 34C78 40 68 43 60 43C52 43 42 40 38 34Z"
          fill="url(#p-tee-grad)"
          stroke="#404040"
          strokeWidth="1.2"
        />
        {/* Collar Ribbing */}
        <path
          d="M44 35C48 40 54 43 60 43C66 43 72 40 76 35C74 33 70 31 60 31C50 31 46 33 44 35Z"
          fill="#1C1C1C"
          stroke="#525252"
          strokeWidth="1.2"
        />
        {/* Minimal Chest Monogram */}
        <rect x="68" y="52" width="6" height="1.8" rx="0.9" fill="#A3A3A3" />
        <rect x="68" y="55.5" width="4" height="1.8" rx="0.9" fill="#737373" />
        {/* Hem stitch detail */}
        <line x1="42" y1="91" x2="78" y2="91" stroke="#333333" strokeDasharray="2 2" strokeWidth="1" />
        <defs>
          <radialGradient id="p-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="p-tee-grad" x1="20" y1="34" x2="100" y2="96" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2A2A2A" />
            <stop offset="0.5" stopColor="#1E1E1E" />
            <stop offset="1" stopColor="#121212" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  {
    id: "oversized",
    title: "OVERSIZED",
    subtitle: "Boxy Drop-Shoulder Silhouette",
    badge: "BOXY FIT",
    tag: "GEN-Z CUT",
    href: "/products?collection=oversized&category=T-SHIRTS",
    categories: ["ALL", "T-SHIRTS", "HOODIES"],
    accentGradient: "from-zinc-800 to-zinc-950",
    glowColor: "rgba(255,255,255,0.06)",
    renderIllustration: () => (
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-24 h-24 sm:w-28 sm:h-28 drop-shadow-[0_12px_24px_rgba(0,0,0,0.8)]"
      >
        <circle cx="60" cy="60" r="44" fill="url(#o-glow)" opacity="0.35" />
        {/* Wide Boxy Oversized Tee */}
        <path
          d="M34 32L12 48L24 64L34 56V94C34 96.2091 35.7909 98 38 98H82C84.2091 98 86 96.2091 86 94V56L96 64L108 48L86 32C80 40 70 44 60 44C50 44 40 40 34 32Z"
          fill="url(#o-tee-grad)"
          stroke="#4A4A4A"
          strokeWidth="1.2"
        />
        {/* Wide Relaxed Collar */}
        <path
          d="M40 33C46 40 53 43 60 43C67 43 74 40 80 33C78 30 71 28 60 28C49 28 42 30 40 33Z"
          fill="#181818"
          stroke="#555555"
          strokeWidth="1.2"
        />
        {/* Center Minimal Typography Artwork */}
        <rect x="52" y="58" width="16" height="2" rx="1" fill="#E5E5E5" />
        <rect x="48" y="63" width="24" height="2" rx="1" fill="#A3A3A3" opacity="0.8" />
        <rect x="56" y="68" width="8" height="2" rx="1" fill="#737373" opacity="0.6" />
        {/* Drop shoulder seam lines */}
        <line x1="34" y1="46" x2="34" y2="56" stroke="#404040" strokeWidth="1.2" />
        <line x1="86" y1="46" x2="86" y2="56" stroke="#404040" strokeWidth="1.2" />
        <defs>
          <radialGradient id="o-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="o-tee-grad" x1="12" y1="32" x2="108" y2="98" gradientUnits="userSpaceOnUse">
            <stop stopColor="#242424" />
            <stop offset="0.5" stopColor="#1B1B1B" />
            <stop offset="1" stopColor="#101010" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  {
    id: "heavyweight",
    title: "HEAVYWEIGHT",
    subtitle: "Structured 320+ GSM Heavy Cotton",
    badge: "320+ GSM",
    tag: "ARCHITECTURAL",
    href: "/products?collection=heavyweight&category=T-SHIRTS",
    categories: ["ALL", "T-SHIRTS", "HOODIES", "JACKETS"],
    accentGradient: "from-zinc-800 to-zinc-950",
    glowColor: "rgba(255,255,255,0.06)",
    renderIllustration: () => (
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-24 h-24 sm:w-28 sm:h-28 drop-shadow-[0_12px_24px_rgba(0,0,0,0.8)]"
      >
        <circle cx="60" cy="60" r="42" fill="url(#h-glow)" opacity="0.3" />
        {/* Heavy Structured Silhouette with Thick Collar */}
        <path
          d="M36 34L18 48L28 60L36 54V94C36 96.2091 37.7909 98 40 98H80C82.2091 98 84 96.2091 84 94V54L92 60L102 48L84 34C80 42 70 45 60 45C50 45 40 42 36 34Z"
          fill="url(#h-grad)"
          stroke="#4F4F4F"
          strokeWidth="1.5"
        />
        {/* Chunky Dense Collar */}
        <path
          d="M42 34C47 41 53 44 60 44C67 44 73 41 78 34C75 31 69 29 60 29C51 29 45 31 42 34Z"
          fill="#1F1F1F"
          stroke="#666666"
          strokeWidth="1.6"
        />
        {/* Double-stitch reinforcement indicators */}
        <line x1="40" y1="92" x2="80" y2="92" stroke="#444444" strokeWidth="1" />
        <line x1="40" y1="94.5" x2="80" y2="94.5" stroke="#333333" strokeWidth="1" />
        {/* Heavy fabric badge */}
        <rect x="48" y="58" width="24" height="14" rx="2" fill="#171717" stroke="#383838" strokeWidth="1" />
        <text x="60" y="67" textAnchor="middle" fill="#FFFFFF" fontSize="6" fontWeight="bold" letterSpacing="0.05em">
          320 GSM
        </text>
        <defs>
          <radialGradient id="h-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="h-grad" x1="18" y1="34" x2="102" y2="98" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2C2C2C" />
            <stop offset="0.6" stopColor="#1E1E1E" />
            <stop offset="1" stopColor="#141414" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  {
    id: "graphic-tees",
    title: "GRAPHIC TEES",
    subtitle: "High-Density Screen & Puff Art",
    badge: "EDITION ART",
    tag: "STATEMENT PIECES",
    href: "/products?collection=graphic-tees&category=T-SHIRTS",
    categories: ["ALL", "T-SHIRTS"],
    accentGradient: "from-zinc-800 to-zinc-950",
    glowColor: "rgba(255,255,255,0.08)",
    renderIllustration: () => (
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-24 h-24 sm:w-28 sm:h-28 drop-shadow-[0_12px_24px_rgba(0,0,0,0.8)]"
      >
        <circle cx="60" cy="60" r="42" fill="url(#g-glow)" opacity="0.35" />
        <path
          d="M38 34L20 46L30 58L38 52V92C38 94.2091 39.7909 96 42 96H78C80.2091 96 82 94.2091 82 92V52L90 58L100 46L82 34C78 40 68 43 60 43C52 43 42 40 38 34Z"
          fill="url(#g-grad)"
          stroke="#454545"
          strokeWidth="1.2"
        />
        {/* Bold Cyber Graphic Artwork on Chest */}
        <circle cx="60" cy="62" r="14" fill="#1C1C1C" stroke="#4B4B4B" strokeWidth="1" />
        <polygon points="60,52 69,67 51,67" fill="#E5E5E5" opacity="0.9" />
        <polygon points="60,60 66,70 54,70" fill="#737373" opacity="0.8" />
        <line x1="48" y1="80" x2="72" y2="80" stroke="#FFFFFF" strokeWidth="1.5" />
        <line x1="52" y1="83" x2="68" y2="83" stroke="#A3A3A3" strokeWidth="1" />
        <defs>
          <radialGradient id="g-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="g-grad" x1="20" y1="34" x2="100" y2="96" gradientUnits="userSpaceOnUse">
            <stop stopColor="#252525" />
            <stop offset="0.5" stopColor="#1D1D1D" />
            <stop offset="1" stopColor="#111111" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  {
    id: "streetwear",
    title: "STREETWEAR",
    subtitle: "Tactical Utility & Relaxed Fits",
    badge: "URBAN UTILITY",
    tag: "RAW AESTHETIC",
    href: "/products?collection=streetwear",
    categories: ["ALL", "HOODIES", "JACKETS", "SHIRTS"],
    accentGradient: "from-zinc-800 to-zinc-950",
    glowColor: "rgba(255,255,255,0.06)",
    renderIllustration: () => (
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-24 h-24 sm:w-28 sm:h-28 drop-shadow-[0_12px_24px_rgba(0,0,0,0.8)]"
      >
        <circle cx="60" cy="60" r="42" fill="url(#s-glow)" opacity="0.3" />
        {/* Tactical Streetwear Overshirt / Jacket */}
        <path
          d="M34 32L14 46L24 60L34 54V94C34 96.2091 35.7909 98 38 98H82C84.2091 98 86 96.2091 86 94V54L96 60L106 46L86 32C80 40 70 43 60 43C50 43 40 40 34 32Z"
          fill="url(#s-grad)"
          stroke="#444444"
          strokeWidth="1.2"
        />
        {/* Center Placket / Zip */}
        <line x1="60" y1="43" x2="60" y2="98" stroke="#525252" strokeWidth="1.5" />
        {/* Tactical Cargo Chest Pockets with Flaps */}
        <rect x="40" y="56" width="14" height="15" rx="1.5" fill="#1C1C1C" stroke="#3D3D3D" strokeWidth="1" />
        <rect x="40" y="54" width="14" height="4" rx="1" fill="#2E2E2E" />
        <rect x="66" y="56" width="14" height="15" rx="1.5" fill="#1C1C1C" stroke="#3D3D3D" strokeWidth="1" />
        <rect x="66" y="54" width="14" height="4" rx="1" fill="#2E2E2E" />
        {/* Webbing Strap Accent */}
        <line x1="43" y1="62" x2="51" y2="62" stroke="#A3A3A3" strokeWidth="1" />
        <line x1="69" y1="62" x2="77" y2="62" stroke="#A3A3A3" strokeWidth="1" />
        <defs>
          <radialGradient id="s-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="s-grad" x1="14" y1="32" x2="106" y2="98" gradientUnits="userSpaceOnUse">
            <stop stopColor="#282828" />
            <stop offset="0.5" stopColor="#1C1C1C" />
            <stop offset="1" stopColor="#121212" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
  {
    id: "essentials",
    title: "ESSENTIALS",
    subtitle: "Timeless Monochromatic Staples",
    badge: "CORE EVERYDAY",
    tag: "TIMELESS",
    href: "/products?collection=essentials",
    categories: ["ALL", "POLOS", "T-SHIRTS", "SHIRTS"],
    accentGradient: "from-zinc-800 to-zinc-950",
    glowColor: "rgba(255,255,255,0.06)",
    renderIllustration: () => (
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-24 h-24 sm:w-28 sm:h-28 drop-shadow-[0_12px_24px_rgba(0,0,0,0.8)]"
      >
        <circle cx="60" cy="60" r="42" fill="url(#e-glow)" opacity="0.3" />
        {/* Pure Minimalist Core Tee */}
        <path
          d="M38 34L20 46L30 58L38 52V92C38 94.2091 39.7909 96 42 96H78C80.2091 96 82 94.2091 82 92V52L90 58L100 46L82 34C78 40 68 43 60 43C52 43 42 40 38 34Z"
          fill="url(#e-grad)"
          stroke="#404040"
          strokeWidth="1.2"
        />
        {/* Subtle Minimalist Collar */}
        <path
          d="M44 35C48 40 54 43 60 43C66 43 72 40 76 35C74 33 70 31 60 31C50 31 46 33 44 35Z"
          fill="#1A1A1A"
          stroke="#4F4F4F"
          strokeWidth="1"
        />
        {/* Centered Small Geometric Monogram */}
        <polygon points="60,58 64,65 56,65" stroke="#FFFFFF" strokeWidth="1" fill="none" opacity="0.8" />
        <defs>
          <radialGradient id="e-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="e-grad" x1="20" y1="34" x2="100" y2="96" gradientUnits="userSpaceOnUse">
            <stop stopColor="#262626" />
            <stop offset="0.5" stopColor="#1B1B1B" />
            <stop offset="1" stopColor="#111111" />
          </linearGradient>
        </defs>
      </svg>
    ),
  },
];

export function CuratedCollectionsSection() {
  const [activeTab, setActiveTab] = useState<CategoryTab>("ALL");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Filter collections by active tab (fallback to all if no specific match)
  const filteredCollections = COLLECTIONS_DATA.filter((item) =>
    activeTab === "ALL" ? true : item.categories.includes(activeTab)
  );

  const collectionsToShow =
    filteredCollections.length > 0 ? filteredCollections : COLLECTIONS_DATA;

  const handleScroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === "left" ? -300 : 300;
      scrollContainerRef.current.scrollBy({
        left: scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <section className="w-full bg-[#000000] py-8 md:py-12 select-none">
      {/* Maximum width container with 16px horizontal padding */}
      <div className="mx-auto w-full max-w-[1400px] px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center">
            {/* Small vertical white accent line on the left */}
            <div className="w-[3px] h-5 bg-white rounded-full mr-2.5 shrink-0" />
            {/* Bold uppercase heading */}
            <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-tight leading-none">
              CURATED COLLECTIONS
            </h2>
          </div>

          {/* Desktop Navigation Arrows */}
          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => handleScroll("left")}
              aria-label="Scroll left"
              className="h-8 w-8 rounded-full bg-[#161616] border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600 flex items-center justify-center transition-colors active:scale-95"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => handleScroll("right")}
              aria-label="Scroll right"
              className="h-8 w-8 rounded-full bg-[#161616] border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600 flex items-center justify-center transition-colors active:scale-95"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Category Tabs: Horizontal scrollable row */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 mb-6 scroll-smooth">
          {CATEGORY_TABS.map((cat) => {
            const isActive = activeTab === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={`whitespace-nowrap rounded-full text-xs transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-white text-black font-bold px-4 py-2 shadow-sm"
                    : "bg-[#161616] text-neutral-400 border border-neutral-800/80 hover:text-white hover:border-neutral-700 font-semibold px-4 py-2"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Carousel: Horizontally scrollable collection cards with CSS scroll snap */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory pb-3 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {collectionsToShow.map((collection) => (
            <Link
              key={collection.id}
              href={collection.href}
              className="group snap-start shrink-0 w-[220px] sm:w-[240px] md:w-[260px] h-[310px] md:h-[320px] rounded-[20px] bg-[#161616] border border-neutral-800/90 hover:border-neutral-600/90 shadow-lg shadow-black/60 p-4 flex flex-col justify-between transition-all duration-250 ease-out hover:-translate-y-1.5 focus:outline-none"
            >
              {/* Card Top: Category Badge and Tag */}
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-neutral-300 border border-white/5">
                  {collection.badge}
                </span>
                <span className="text-[9px] font-mono tracking-widest text-neutral-500 uppercase">
                  {collection.tag}
                </span>
              </div>

              {/* Card Center: Centered premium clothing illustration / 3D fashion icon */}
              <div className="my-auto w-full h-[155px] sm:h-[165px] rounded-2xl bg-[#111111] border border-neutral-900 flex items-center justify-center relative overflow-hidden group-hover:bg-[#141414] transition-colors duration-250">
                {/* Subtle Radial Glow */}
                <div
                  className="absolute inset-0 pointer-events-none opacity-40 group-hover:opacity-70 transition-opacity duration-250"
                  style={{
                    background: `radial-gradient(circle at 50% 50%, ${collection.glowColor} 0%, transparent 70%)`,
                  }}
                />

                {/* 3D Clothing Illustration with smooth scale effect */}
                <div className="relative z-10 transform transition-transform duration-250 ease-out group-hover:scale-105">
                  {collection.renderIllustration()}
                </div>
              </div>

              {/* Card Bottom: Title & Explore link with strong visual hierarchy */}
              <div className="w-full pt-1">
                <h3 className="text-sm md:text-base font-black text-white uppercase tracking-tight leading-snug line-clamp-1 group-hover:text-neutral-100">
                  {collection.title}
                </h3>
                <p className="text-[11px] text-neutral-500 line-clamp-1 font-medium mt-0.5">
                  {collection.subtitle}
                </p>

                <div className="mt-3 pt-2.5 border-t border-neutral-800/70 flex items-center justify-between">
                  <span className="text-[11px] font-semibold tracking-wider text-neutral-400 group-hover:text-white transition-colors flex items-center gap-1">
                    EXPLORE <span className="transform transition-transform duration-200 group-hover:translate-x-1">→</span>
                  </span>
                  <div className="h-5 w-5 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-400 group-hover:text-black group-hover:bg-white transition-all duration-200">
                    <ArrowRight size={10} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
