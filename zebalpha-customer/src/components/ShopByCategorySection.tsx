"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { Category } from "@/lib/types";
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight } from "lucide-react";
import { useCategories, DEFAULT_CLOTHING_CATEGORIES } from "@/hooks/useCatalogQueries";
import { useQueryClient } from "@tanstack/react-query";

const CLOTHING_TABS = ["ALL", "POLOS", "T-SHIRTS", "HOODIES", "SHIRTS", "BOTTOMS", "LIMITED"];

export function ShopByCategorySection({ initialCategories = [] }: { initialCategories?: Category[] }) {
  const queryClient = useQueryClient();
  const { data: categories = (initialCategories.length > 0 ? initialCategories : DEFAULT_CLOTHING_CATEGORIES) } = useCategories(
    initialCategories.length > 0 ? initialCategories : undefined
  );
  const [selectedMainTab, setSelectedMainTab] = useState<string>("ALL");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
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
    // Listen to real-time additions/updates by sellers
    const channel = supabase
      .channel("customer-categories-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["categories"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

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

  const displayList = categories.length > 0 ? categories : DEFAULT_CLOTHING_CATEGORIES;

  const filteredCategories = displayList.filter((c) => {
    if (selectedMainTab === "ALL") return true;
    const mainCat = (c.main_category || c.description || c.name || "").toUpperCase();
    return mainCat.includes(selectedMainTab);
  });

  return (
    <section className="mt-10 sm:mt-14 relative select-none">
      {/* 1. Header & Taxonomy Tabs */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <span className="h-6 w-1 bg-white rounded-full" />
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
            Curated Collections
          </h2>
        </div>
      </div>

      {/* 2. Taxonomy Filter Pills */}
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
              className={`px-4 py-1.5 rounded-full text-[11px] font-black tracking-wider transition-all uppercase whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.4)] scale-105"
                  : "bg-neutral-900 text-neutral-400 border border-neutral-800 hover:bg-neutral-800 hover:text-white"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* 3. Responsive Wrapped Grid (6 cards per row / 3x2 on mobile; >6 collections wrap to next line) */}
      <div className="relative">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 sm:gap-3.5 py-2">
          {filteredCategories.map((cat, idx) => {
            let imageSrc = cat.image_url;
            if (!imageSrc) {
              const nameUpper = (cat.name || "").toUpperCase();
              const mainCatUpper = (cat.main_category || "").toUpperCase();
              const key = `${nameUpper} ${mainCatUpper}`;

              if (key.includes("POLO")) imageSrc = "/banner-premium-polo.png";
              else if (key.includes("TEE") || key.includes("T-SHIRT") || key.includes("OVERSIZED")) imageSrc = "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=600&auto=format&fit=crop&q=80";
              else if (key.includes("HOODIE") || key.includes("SWEAT")) imageSrc = "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80";
              else if (key.includes("SHIRT")) imageSrc = "/banner-retro-cream.png";
              else if (key.includes("CARGO") || key.includes("TROUSER") || key.includes("BOTTOM")) imageSrc = "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&auto=format&fit=crop&q=80";
              else if (key.includes("LIMITED") || key.includes("DROP")) imageSrc = "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&auto=format&fit=crop&q=80";
              else if (key.includes("ACCESSOR") || key.includes("CAP") || key.includes("HEADWEAR")) imageSrc = "https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=600&auto=format&fit=crop&q=80";
              else imageSrc = "/banner-casual-green.png";
            }

            return (
              <Link
                key={cat.id || idx}
                href={`/products?category=${encodeURIComponent(cat.name)}`}
                className="group relative w-full flex flex-col items-center p-1.5 sm:p-2.5 rounded-2xl bg-neutral-900/90 border border-neutral-800/90 hover:border-white/40 hover:bg-neutral-850 shadow-lg hover:shadow-[0_8px_20px_rgba(255,255,255,0.06)] transition-all duration-300 transform hover:-translate-y-1 active:scale-95 text-center overflow-hidden cursor-pointer"
              >
                {/* Clean Highlight Shimmer */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-b from-white/5 to-transparent transition-opacity duration-300 pointer-events-none" />

                {/* Cover Image Box */}
                <div className="relative w-full aspect-square rounded-xl bg-neutral-950 border border-neutral-800/80 flex items-center justify-center overflow-hidden group-hover:border-white/30 transition-all duration-300 shadow-inner mb-1.5">
                  <Image
                    src={imageSrc}
                    alt={cat.name}
                    fill
                    sizes="(max-width: 640px) 33vw, 16vw"
                    className="object-cover group-hover:scale-108 transition-transform duration-500"
                    unoptimized
                  />
                </div>

                {/* Collection Title */}
                <span className="text-[10px] sm:text-xs md:text-[13px] font-black text-neutral-200 group-hover:text-white uppercase tracking-wider line-clamp-1 transition-colors px-0.5">
                  {cat.name}
                </span>

                {/* Action Prompt */}
                <span className="text-[8px] sm:text-[9px] text-neutral-500 font-bold uppercase tracking-widest mt-0.5 group-hover:text-neutral-300 transition-colors flex items-center gap-0.5">
                  <span>Explore</span>
                  <ArrowRight className="w-2.5 h-2.5 transform group-hover:translate-x-0.5 transition-transform" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
