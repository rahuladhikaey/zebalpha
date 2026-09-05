"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { Category } from "@/lib/types";
import { ChevronLeft, ChevronRight, Sparkles, Flame, ArrowRight } from "lucide-react";

const CLOTHING_TABS = ["ALL", "POLOS", "T-SHIRTS", "HOODIES", "SHIRTS", "BOTTOMS", "LIMITED"];

interface CuratedCardItem {
  id: string;
  name: string;
  displayName: string;
  icon: string;
  main_category: string;
  priceTag: string; // e.g. "UNDER"
  price: string;    // e.g. "499"
  subtitle: string;
  badge?: string;
  image_url: string;
  theme: {
    frameGradient: string; // Arched frame 3D gradient
    glowColor: string;     // Radial spotlight glow
    stageLip: string;      // Top surface of the 3D podium
    stageBase: string;     // Front extruded face of the 3D podium
    stageShadow: string;   // 3D extruded bottom shadow color
    accentText: string;
  };
}

const DEFAULT_CURATED_COLLECTIONS: CuratedCardItem[] = [
  {
    id: "1",
    name: "Premium Polos",
    displayName: "Premium Polos",
    icon: "👕",
    main_category: "POLOS",
    priceTag: "UNDER",
    price: "499",
    subtitle: "100% Supima Pique",
    badge: "Bestseller",
    image_url: "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?q=80&w=600&auto=format&fit=crop",
    theme: {
      frameGradient: "from-rose-400 via-pink-500 to-rose-700",
      glowColor: "rgba(244, 63, 94, 0.4)",
      stageLip: "from-rose-300 via-pink-200 to-rose-300",
      stageBase: "from-rose-600 via-rose-700 to-rose-900",
      stageShadow: "#881337",
      accentText: "text-rose-200",
    },
  },
  {
    id: "2",
    name: "Oversized Tees",
    displayName: "Oversized Tees",
    icon: "🛹",
    main_category: "T-SHIRTS",
    priceTag: "UNDER",
    price: "299",
    subtitle: "240 GSM Heavyweight",
    badge: "Trending",
    image_url: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=600&auto=format&fit=crop",
    theme: {
      frameGradient: "from-purple-400 via-fuchsia-500 to-purple-800",
      glowColor: "rgba(168, 85, 247, 0.4)",
      stageLip: "from-purple-300 via-fuchsia-200 to-purple-300",
      stageBase: "from-purple-600 via-purple-700 to-purple-950",
      stageShadow: "#4c1d95",
      accentText: "text-purple-200",
    },
  },
  {
    id: "3",
    name: "Heavyweight Hoodies",
    displayName: "Heavy Hoodies",
    icon: "🧥",
    main_category: "HOODIES",
    priceTag: "UNDER",
    price: "799",
    subtitle: "380 GSM Fleece Lined",
    badge: "Hot Drop",
    image_url: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=600&auto=format&fit=crop",
    theme: {
      frameGradient: "from-emerald-400 via-teal-500 to-emerald-800",
      glowColor: "rgba(16, 185, 129, 0.4)",
      stageLip: "from-emerald-300 via-teal-200 to-emerald-300",
      stageBase: "from-emerald-600 via-teal-700 to-emerald-950",
      stageShadow: "#064e3b",
      accentText: "text-emerald-200",
    },
  },
  {
    id: "4",
    name: "Casual Shirts",
    displayName: "Casual Shirts",
    icon: "👔",
    main_category: "SHIRTS",
    priceTag: "UNDER",
    price: "399",
    subtitle: "Woven Textured Cottons",
    badge: "Summer Drop",
    image_url: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=600&auto=format&fit=crop",
    theme: {
      frameGradient: "from-amber-400 via-yellow-500 to-amber-700",
      glowColor: "rgba(245, 158, 11, 0.4)",
      stageLip: "from-amber-300 via-yellow-200 to-amber-300",
      stageBase: "from-amber-600 via-amber-700 to-amber-950",
      stageShadow: "#78350f",
      accentText: "text-amber-200",
    },
  },
  {
    id: "5",
    name: "Cargo & Trousers",
    displayName: "Cargo Trousers",
    icon: "👖",
    main_category: "BOTTOMS",
    priceTag: "UNDER",
    price: "599",
    subtitle: "Tactical Utility Fits",
    badge: "Essential",
    image_url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=600&auto=format&fit=crop",
    theme: {
      frameGradient: "from-blue-400 via-indigo-500 to-blue-800",
      glowColor: "rgba(59, 130, 246, 0.4)",
      stageLip: "from-blue-300 via-indigo-200 to-blue-300",
      stageBase: "from-blue-600 via-indigo-700 to-blue-950",
      stageShadow: "#1e3a8a",
      accentText: "text-blue-200",
    },
  },
  {
    id: "6",
    name: "Limited Drops",
    displayName: "Limited Drops",
    icon: "⚡",
    main_category: "LIMITED",
    priceTag: "UNDER",
    price: "499",
    subtitle: "Exclusive Drip Edition",
    badge: "Rare",
    image_url: "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?q=80&w=600&auto=format&fit=crop",
    theme: {
      frameGradient: "from-red-400 via-rose-500 to-red-800",
      glowColor: "rgba(239, 68, 68, 0.45)",
      stageLip: "from-red-300 via-rose-200 to-red-300",
      stageBase: "from-red-600 via-rose-700 to-red-950",
      stageShadow: "#7f1d1d",
      accentText: "text-red-200",
    },
  },
  {
    id: "7",
    name: "Zebalpha Classics",
    displayName: "Classics",
    icon: "👑",
    main_category: "ALL",
    priceTag: "UNDER",
    price: "349",
    subtitle: "Luxury Monogram Pieces",
    badge: "Iconic",
    image_url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600&auto=format&fit=crop",
    theme: {
      frameGradient: "from-yellow-300 via-amber-400 to-yellow-700",
      glowColor: "rgba(250, 204, 21, 0.4)",
      stageLip: "from-yellow-200 via-white to-amber-200",
      stageBase: "from-yellow-600 via-amber-700 to-amber-950",
      stageShadow: "#713f12",
      accentText: "text-yellow-200",
    },
  },
  {
    id: "8",
    name: "Accessories & Caps",
    displayName: "Caps & Extras",
    icon: "🧢",
    main_category: "ALL",
    priceTag: "UNDER",
    price: "199",
    subtitle: "Streetwear Caps & Chains",
    badge: "Steal Deal",
    image_url: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?q=80&w=600&auto=format&fit=crop",
    theme: {
      frameGradient: "from-cyan-400 via-teal-500 to-cyan-800",
      glowColor: "rgba(6, 182, 212, 0.4)",
      stageLip: "from-cyan-300 via-teal-200 to-cyan-300",
      stageBase: "from-cyan-600 via-teal-700 to-cyan-950",
      stageShadow: "#134e4a",
      accentText: "text-cyan-200",
    },
  },
];

export function ShopByCategorySection({ initialCategories = [] }: { initialCategories?: Category[] }) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [selectedMainTab, setSelectedMainTab] = useState<string>("ALL");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
      const totalScrollable = scrollWidth - clientWidth;
      setScrollProgress(totalScrollable > 0 ? (scrollLeft / totalScrollable) * 100 : 0);
    }
  };

  const handleScroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const { clientWidth } = scrollContainerRef.current;
      const scrollDistance = clientWidth > 640 ? clientWidth * 0.65 : 220;
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollDistance : scrollDistance,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      checkScroll();
      el.addEventListener("scroll", checkScroll, { passive: true });
      window.addEventListener("resize", checkScroll);
      return () => {
        el.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
      };
    }
  }, [categories, selectedMainTab]);

  // Fetch realtime categories if available
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const { data } = await supabase.from("categories").select("*").order("name", { ascending: true });
        if (data && data.length > 0) {
          setCategories(data as Category[]);
        }
      } catch (err) {
        // graceful fallback
      }
    };

    fetchCats();

    const channel = supabase
      .channel("customer-curated-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, () => fetchCats())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Merge Supabase categories with rich 3D themes if categories exist in DB
  const mergedItems: CuratedCardItem[] = DEFAULT_CURATED_COLLECTIONS.map((defItem, idx) => {
    const dbMatch = categories.find(
      (c) => c.name.toLowerCase().trim() === defItem.name.toLowerCase().trim()
    );
    if (dbMatch) {
      return {
        ...defItem,
        id: dbMatch.id || defItem.id,
        name: dbMatch.name,
        image_url: dbMatch.image_url || defItem.image_url,
      };
    }
    return defItem;
  });

  // Filter based on taxonomy tab
  const filteredItems = mergedItems.filter((item) => {
    if (selectedMainTab === "ALL") return true;
    const itemCat = (item.main_category || item.name || "").toUpperCase();
    return itemCat.includes(selectedMainTab);
  });

  return (
    <section className="mt-10 sm:mt-14 relative select-none">
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        {/* Title & Badge */}
        <div className="flex items-center gap-3">
          <span className="h-6 w-1.5 bg-gradient-to-b from-rose-500 to-purple-600 rounded-full shadow-[0_0_12px_rgba(244,63,94,0.6)]" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                Curated Collections
              </h2>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40">
                <Flame className="w-3 h-3 text-rose-400 fill-rose-400" /> 3D DEALS
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-neutral-400 font-medium">
              Handpicked streetwear fits & lowest price guarantees
            </p>
          </div>
        </div>

        {/* Desktop Carousel Navigation Arrows */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => handleScroll("left")}
            disabled={!canScrollLeft}
            aria-label="Scroll left"
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all border ${
              canScrollLeft
                ? "bg-neutral-900 border-neutral-700 text-white hover:bg-neutral-800 hover:border-white shadow-md active:scale-95"
                : "bg-neutral-950 border-neutral-900 text-neutral-600 cursor-not-allowed opacity-40"
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleScroll("right")}
            disabled={!canScrollRight}
            aria-label="Scroll right"
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all border ${
              canScrollRight
                ? "bg-neutral-900 border-neutral-700 text-white hover:bg-neutral-800 hover:border-white shadow-md active:scale-95"
                : "bg-neutral-950 border-neutral-900 text-neutral-600 cursor-not-allowed opacity-40"
            }`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 2. Taxonomy Filter Pills (ALL, POLOS, T-SHIRTS, etc.) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
        {CLOTHING_TABS.map((tab) => {
          const isActive = selectedMainTab === tab;
          return (
            <button
              key={tab}
              onClick={() => {
                setSelectedMainTab(tab);
                if (scrollContainerRef.current) {
                  scrollContainerRef.current.scrollTo({ left: 0, behavior: "smooth" });
                }
              }}
              className={`px-3.5 py-1 rounded-full text-[10px] sm:text-[11px] font-black tracking-wider transition-all uppercase whitespace-nowrap ${
                isActive
                  ? "bg-white text-black shadow-[0_0_16px_rgba(255,255,255,0.45)] scale-105"
                  : "bg-neutral-900 text-neutral-400 border border-neutral-800 hover:bg-neutral-850 hover:text-white"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* 3. 3D Side-to-Side Scrolling Track (Inspired by Meesho 3D Arched Stage) */}
      <div className="relative group/carousel">
        <div
          ref={scrollContainerRef}
          className="flex items-stretch gap-3.5 sm:gap-5 overflow-x-auto scroll-smooth snap-x snap-mandatory py-4 px-1 sm:px-2 no-scrollbar -mx-2 sm:mx-0"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {filteredItems.map((item) => {
            const { theme } = item;
            return (
              <Link
                key={item.id}
                href={`/products?category=${encodeURIComponent(item.name)}`}
                className="group relative flex-shrink-0 snap-start w-[158px] sm:w-[195px] md:w-[215px] flex flex-col cursor-pointer transition-transform duration-300 transform hover:-translate-y-2 active:scale-95"
              >
                {/* 3D Arched Frame Container with Chamfered Upper Edge */}
                <div
                  className={`relative p-[3px] rounded-t-[34px] sm:rounded-t-[42px] bg-gradient-to-b ${theme.frameGradient} shadow-[inset_0_2px_4px_rgba(255,255,255,0.45),0_10px_20px_rgba(0,0,0,0.6)]`}
                >
                  {/* Subtle Top-Bevel Light Reflection */}
                  <div className="absolute inset-x-4 top-0 h-[2px] bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none rounded-full" />

                  {/* Arched Stage Interior with Illuminated Radial Spotlight */}
                  <div
                    className="relative h-[180px] sm:h-[210px] md:h-[230px] rounded-t-[31px] sm:rounded-t-[39px] overflow-hidden flex flex-col justify-between p-2.5"
                    style={{
                      background: `radial-gradient(circle at 50% 38%, ${theme.glowColor} 0%, rgba(20, 20, 26, 0.95) 70%, #09090c 100%)`,
                    }}
                  >
                    {/* Background Radial Rings / Stage Depth */}
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/10 via-transparent to-black/60 pointer-events-none" />

                    {/* Top Pill with Category Name */}
                    <div className="relative z-10 mx-auto">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-white shadow-lg">
                        {item.icon} {item.displayName}
                      </span>
                    </div>

                    {/* Center Model Cutout standing on the 3D Stage */}
                    <div className="relative w-full h-[135px] sm:h-[160px] md:h-[175px] flex items-end justify-center">
                      {/* Ground Contact Shadow */}
                      <div className="absolute bottom-1 w-3/4 h-3.5 bg-black/70 rounded-full blur-md" />

                      {item.image_url ? (
                        <div className="relative w-full h-full">
                          <Image
                            src={item.image_url}
                            alt={item.name}
                            fill
                            sizes="(max-width: 640px) 160px, 220px"
                            className="object-contain object-bottom transition-transform duration-300 group-hover:scale-108 group-hover:-translate-y-1.5 filter drop-shadow-[0_12px_14px_rgba(0,0,0,0.6)]"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center text-5xl sm:text-6xl drop-shadow-[0_10px_12px_rgba(0,0,0,0.6)] group-hover:scale-110 transition-transform">
                          {item.icon}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. The 3D Stage / Podium Platform (Exact 2nd Pic Look) */}
                <div className="relative z-20">
                  {/* Top Beveled Lip / Platform Surface where subject stands */}
                  <div
                    className={`h-2.5 sm:h-3 w-[calc(100%+8px)] -ml-[4px] rounded-t-sm bg-gradient-to-r ${theme.stageLip} shadow-[inset_0_1px_2px_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.4)]`}
                  />

                  {/* Front Extruded Face of the 3D Podium with Chamfered Side Wings */}
                  <div
                    className={`relative w-[calc(100%+12px)] -ml-[6px] px-2 py-2 sm:py-2.5 rounded-b-2xl sm:rounded-b-3xl bg-gradient-to-b ${theme.stageBase} text-center flex flex-col items-center justify-center`}
                    style={{
                      boxShadow: `0 8px 0 ${theme.stageShadow}, 0 16px 24px rgba(0, 0, 0, 0.75)`,
                    }}
                  >
                    {/* Small Uppercase "UNDER" Label */}
                    <span className="text-[9px] sm:text-[10px] font-black tracking-widest uppercase text-white/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                      {item.priceTag}
                    </span>

                    {/* Massive Bold Price Typography */}
                    <div className="flex items-baseline justify-center gap-0.5">
                      <span className="text-sm sm:text-base font-black text-amber-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                        ₹
                      </span>
                      <span className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] leading-none">
                        {item.price}
                      </span>
                    </div>

                    {/* Subtle Explore Hint */}
                    <div className="mt-1 flex items-center gap-1 text-[8px] sm:text-[9px] font-bold text-white/80 uppercase tracking-wider group-hover:text-white transition-colors">
                      <span>EXPLORE</span>
                      <ArrowRight className="w-2.5 h-2.5 transform group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Mobile Swipe Cue Hint */}
        <div className="flex sm:hidden items-center justify-between px-1 mt-2 text-[10px] text-neutral-500 font-bold uppercase tracking-wider">
          <span>Side to side scrolling</span>
          <span className="text-neutral-400">Swipe →</span>
        </div>
      </div>

      {/* 5. Scroll Progress Bar Indicator */}
      <div className="mt-3 flex items-center justify-center">
        <div className="w-24 sm:w-32 h-1 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
          <div
            className="h-full bg-gradient-to-r from-rose-500 via-purple-500 to-amber-500 rounded-full transition-all duration-150"
            style={{ width: `${Math.max(15, scrollProgress)}%` }}
          />
        </div>
      </div>
    </section>
  );
}
