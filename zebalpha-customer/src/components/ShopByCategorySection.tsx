"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { Category } from "@/lib/types";
import { ChevronLeft, ChevronRight, Sparkles, ArrowRight } from "lucide-react";

const CLOTHING_TABS = ["ALL", "POLOS", "T-SHIRTS", "HOODIES", "SHIRTS", "BOTTOMS", "LIMITED"];

const DEFAULT_CLOTHING_CATEGORIES: Category[] = [
  { id: "1", name: "Premium Polos", icon: "👕", main_category: "POLOS", description: "100% Supima Pique", image_url: "https://images.unsplash.com/photo-1586363104862-3a5e2ab60d99?q=80&w=600&auto=format&fit=crop" },
  { id: "2", name: "Oversized Tees", icon: "🛹", main_category: "T-SHIRTS", description: "240 GSM Heavyweight", image_url: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?q=80&w=600&auto=format&fit=crop" },
  { id: "3", name: "Heavyweight Hoodies", icon: "🧥", main_category: "HOODIES", description: "380 GSM Plush Fleece", image_url: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?q=80&w=600&auto=format&fit=crop" },
  { id: "4", name: "Casual Shirts", icon: "👔", main_category: "SHIRTS", description: "Woven Textured Cottons", image_url: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?q=80&w=600&auto=format&fit=crop" },
  { id: "5", name: "Cargo & Trousers", icon: "👖", main_category: "BOTTOMS", description: "Tactical Utility Fits", image_url: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?q=80&w=600&auto=format&fit=crop" },
  { id: "6", name: "Limited Drops", icon: "⚡", main_category: "LIMITED", description: "Exclusive Release Drops", image_url: "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?q=80&w=600&auto=format&fit=crop" },
  { id: "7", name: "Zebalpha Classics", icon: "👑", main_category: "ALL", description: "Monogram Signature Pieces", image_url: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=600&auto=format&fit=crop" },
  { id: "8", name: "Accessories & Caps", icon: "🧢", main_category: "ALL", description: "Caps, Chains & Extras", image_url: "https://images.unsplash.com/photo-1588850561407-ed78c282e89b?q=80&w=600&auto=format&fit=crop" },
];

export function ShopByCategorySection({ initialCategories = [] }: { initialCategories?: Category[] }) {
  const [categories, setCategories] = useState<Category[]>(
    initialCategories.length > 0 ? initialCategories : DEFAULT_CLOTHING_CATEGORIES
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

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (!error && data && data.length > 0) {
        setCategories(data as Category[]);
      } else if (initialCategories.length === 0) {
        setCategories(DEFAULT_CLOTHING_CATEGORIES);
      }
    } catch (err) {
      // Graceful fallback
    }
  };

  useEffect(() => {
    fetchCategories();

    // Listen to real-time additions/updates by sellers
    const channel = supabase
      .channel("customer-categories-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        () => fetchCategories()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <span className="h-6 w-1 bg-white rounded-full" />
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
            Curated Collections
          </h2>
        </div>

        {/* Desktop Carousel Navigation Arrows */}
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => handleScroll("left")}
            disabled={!canScrollLeft}
            aria-label="Scroll left"
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all border ${
              canScrollLeft
                ? "bg-neutral-900 border-neutral-700 text-white hover:bg-neutral-800 hover:border-white shadow-md active:scale-95 cursor-pointer"
                : "bg-neutral-950 border-neutral-900 text-neutral-600 cursor-not-allowed opacity-30"
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
                ? "bg-neutral-900 border-neutral-700 text-white hover:bg-neutral-800 hover:border-white shadow-md active:scale-95 cursor-pointer"
                : "bg-neutral-950 border-neutral-900 text-neutral-600 cursor-not-allowed opacity-30"
            }`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
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

      {/* 3. Normal Clean Curated Cards (Side-to-Side Scrollable) */}
      <div className="relative">
        <div
          ref={scrollContainerRef}
          className="flex items-stretch gap-3 sm:gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory py-2 px-1 no-scrollbar -mx-2 sm:mx-0"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {filteredCategories.map((cat, idx) => {
            const imageSrc = cat.image_url || null;
            return (
              <Link
                key={cat.id || idx}
                href={`/products?category=${encodeURIComponent(cat.name)}`}
                className="group relative flex-shrink-0 snap-start w-[145px] sm:w-[170px] md:w-[185px] flex flex-col items-center justify-between p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800/90 hover:border-white/40 hover:bg-neutral-850 shadow-lg hover:shadow-[0_8px_20px_rgba(255,255,255,0.06)] transition-all duration-300 transform hover:-translate-y-1 active:scale-95 text-center overflow-hidden cursor-pointer"
              >
                {/* Clean Highlight Shimmer */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-b from-white/5 to-transparent transition-opacity duration-300 pointer-events-none" />

                {/* Cover Image / Icon Box */}
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-center overflow-hidden group-hover:border-white/30 group-hover:scale-105 transition-all duration-300 shadow-inner mb-3">
                  {imageSrc ? (
                    <Image
                      src={imageSrc}
                      alt={cat.name}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      unoptimized
                    />
                  ) : (
                    <span className="text-2xl sm:text-3xl select-none group-hover:scale-115 transition-transform duration-300">
                      {cat.icon || "👕"}
                    </span>
                  )}
                </div>

                {/* Collection Title */}
                <span className="text-xs sm:text-[13px] font-black text-neutral-200 group-hover:text-white uppercase tracking-wider line-clamp-1 transition-colors">
                  {cat.name}
                </span>

                {/* Action Prompt */}
                <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest mt-1.5 group-hover:text-neutral-300 transition-colors flex items-center gap-1">
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
