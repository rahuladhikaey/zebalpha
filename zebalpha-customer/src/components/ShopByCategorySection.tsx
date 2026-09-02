"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { Category } from "@/lib/types";

const CLOTHING_TABS = ["ALL", "POLOS", "T-SHIRTS", "HOODIES", "SHIRTS", "BOTTOMS", "LIMITED"];

const DEFAULT_CLOTHING_CATEGORIES = [
  { id: "1", name: "Premium Polos", icon: "👕", main_category: "POLOS" },
  { id: "2", name: "Oversized Tees", icon: "🛹", main_category: "T-SHIRTS" },
  { id: "3", name: "Heavyweight Hoodies", icon: "🧥", main_category: "HOODIES" },
  { id: "4", name: "Casual Shirts", icon: "👔", main_category: "SHIRTS" },
  { id: "5", name: "Cargo & Trousers", icon: "👖", main_category: "BOTTOMS" },
  { id: "6", name: "Limited Drops", icon: "⚡", main_category: "LIMITED" },
  { id: "7", name: "Zebalpha Classics", icon: "👑", main_category: "ALL" },
  { id: "8", name: "Accessories & Caps", icon: "🧢", main_category: "ALL" },
];

export function ShopByCategorySection({ initialCategories = [] }: { initialCategories?: Category[] }) {
  const [categories, setCategories] = useState<Category[]>(
    initialCategories.length > 0 ? initialCategories : (DEFAULT_CLOTHING_CATEGORIES as unknown as Category[])
  );
  const [selectedMainTab, setSelectedMainTab] = useState<string>("ALL");
  const [loading, setLoading] = useState(false);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name", { ascending: true });

      if (!error && data && data.length > 0) {
        setCategories(data as Category[]);
      }
    } catch (err) {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();

    const channel = supabase
      .channel("customer-categories-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, () => fetchCategories())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const displayList = categories.length > 0 ? categories : (DEFAULT_CLOTHING_CATEGORIES as unknown as Category[]);

  const filteredCategories = displayList.filter((c) => {
    if (selectedMainTab === "ALL") return true;
    const mainCat = (c.main_category || c.description || c.name || "").toUpperCase();
    return mainCat.includes(selectedMainTab);
  });

  return (
    <section className="mt-10">
      {/* Header & Main Taxonomy Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="h-6 w-1 bg-white rounded-full" />
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
            Curated Collections
          </h2>
        </div>

        {/* Clothing Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {CLOTHING_TABS.map((tab) => {
            const isActive = selectedMainTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setSelectedMainTab(tab)}
                className={`px-4 py-1.5 rounded-full text-[11px] font-black tracking-wider transition-all uppercase whitespace-nowrap ${
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
      </div>

      {/* Categories Grid with 2D Animated Hover Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 sm:gap-4">
        {filteredCategories.map((cat, idx) => {
          const imageSrc = cat.image_url || null;
          return (
            <Link
              key={cat.id || idx}
              href={`/products?category=${encodeURIComponent(cat.name)}`}
              className="group relative flex flex-col items-center justify-center p-4 rounded-2xl bg-neutral-900/90 border border-neutral-800/90 shadow-lg hover:border-white/50 hover:bg-neutral-850 hover:shadow-[0_10px_25px_rgba(255,255,255,0.08)] transition-all duration-300 transform hover:-translate-y-1.5 active:scale-95 text-center overflow-hidden"
            >
              {/* 2D Animated Shimmer Highlight */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-b from-white/5 to-transparent transition-opacity duration-300 pointer-events-none" />

              {/* Icon / Image Container */}
              <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-2xl bg-neutral-950 border border-neutral-800 flex items-center justify-center overflow-hidden group-hover:border-white/40 group-hover:scale-110 transition-all duration-300 shadow-inner">
                {imageSrc ? (
                  <Image
                    src={imageSrc}
                    alt={cat.name}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover group-hover:scale-115 transition-transform duration-300"
                    unoptimized
                  />
                ) : (
                  <span className="text-2xl sm:text-3xl select-none group-hover:scale-120 transition-transform duration-300">
                    {cat.icon || "👕"}
                  </span>
                )}
              </div>

              <span className="mt-3 text-[11px] sm:text-xs font-black text-neutral-300 group-hover:text-white uppercase tracking-wider line-clamp-1 transition-colors">
                {cat.name}
              </span>
              <span className="text-[9px] text-neutral-500 font-bold uppercase tracking-widest mt-0.5 group-hover:text-neutral-400">
                Explore →
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
