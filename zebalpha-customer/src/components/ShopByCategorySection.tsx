"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";
import { Category } from "@/lib/types";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { useCategories } from "@/hooks/useCatalogQueries";
import { useQueryClient } from "@tanstack/react-query";

const CLOTHING_TABS = ["ALL", "POLOS", "T-SHIRTS", "HOODIES", "SHIRTS", "BOTTOMS", "LIMITED", "ACCESSORIES"];

export function ShopByCategorySection({ initialCategories = [] }: { initialCategories?: Category[] }) {
  const queryClient = useQueryClient();
  const { data: categories = initialCategories } = useCategories(
    initialCategories.length > 0 ? initialCategories : undefined
  );
  const [selectedMainTab, setSelectedMainTab] = useState<string>("ALL");
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Listen to real-time additions/updates by SuperAdmin
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

  const displayList = categories || [];

  const filteredCategories = displayList.filter((c) => {
    if (c.is_active === false) return false;
    if (selectedMainTab === "ALL") return true;
    const mainCat = (c.main_category || c.description || c.name || "").toUpperCase();
    return mainCat.includes(selectedMainTab);
  });

  // Split filtered categories into groups of maximum 6 items per row
  const rowGroups: Category[][] = [];
  for (let i = 0; i < filteredCategories.length; i += 6) {
    rowGroups.push(filteredCategories.slice(i, i + 6));
  }

  return (
    <section className="mt-10 sm:mt-14 relative select-none">
      {/* 1. Header with Verified Badge */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-2.5">
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase flex items-center gap-2">
            <span>Curated Collections</span>
            <CheckCircle2 className="w-5 h-5 text-violet-400 fill-violet-500/20" />
          </h2>
        </div>
      </div>

      {/* 2. Taxonomy Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 no-scrollbar">
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
              className={`px-4 py-2 rounded-full text-[11px] font-black tracking-wider transition-all uppercase whitespace-nowrap cursor-pointer ${
                isActive
                  ? "bg-violet-600 text-white shadow-[0_0_20px_rgba(139,92,246,0.5)] scale-105"
                  : "bg-neutral-900 text-neutral-400 border border-neutral-800 hover:bg-neutral-800 hover:text-white"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* 3. Automatic 6-Column Horizontal-Scroll Rows (Cards 1–6 in Row 1, 7–12 in Row 2, etc.) */}
      <div className="space-y-4 sm:space-y-6">
        {rowGroups.map((group, rowIndex) => (
          <div
            key={`row-${rowIndex}`}
            className="w-full overflow-x-auto pb-2 pt-1 no-scrollbar scroll-smooth"
          >
            <div className="grid grid-cols-6 gap-3 sm:gap-4 min-w-[840px] lg:min-w-full">
              {group.map((cat, idx) => {
                const globalIndex = rowIndex * 6 + idx;
                const keyId = String(cat.id || globalIndex);
                let imageSrc = cat.image_url;
                const isBroken = imgErrors[keyId];

                if (
                  !imageSrc ||
                  isBroken ||
                  imageSrc.length < 5 ||
                  imageSrc.includes("photo-1576995853123-5a10305d93c0") ||
                  (imageSrc.includes("banner-retro-cream.png") && (cat.name || "").toUpperCase().includes("SHIRT"))
                ) {
                  const nameUpper = (cat.name || "").toUpperCase();
                  const mainCatUpper = (cat.main_category || "").toUpperCase();
                  const key = `${nameUpper} ${mainCatUpper}`;

                  if (key.includes("POLO")) imageSrc = "/banner-premium-polo.png";
                  else if (key.includes("TEE") || key.includes("T-SHIRT") || key.includes("OVERSIZED")) imageSrc = "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&auto=format&fit=crop&q=80";
                  else if (key.includes("HOODIE") || key.includes("SWEAT") || key.includes("FLEECE")) imageSrc = "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80";
                  else if (key.includes("SHIRT")) imageSrc = "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&auto=format&fit=crop&q=80";
                  else if (key.includes("CARGO") || key.includes("TROUSER") || key.includes("BOTTOM") || key.includes("PANT") || key.includes("DENIM")) imageSrc = "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&auto=format&fit=crop&q=80";
                  else if (key.includes("LIMITED") || key.includes("DROP") || key.includes("CAPSULE")) imageSrc = "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&auto=format&fit=crop&q=80";
                  else if (key.includes("ACCESSOR") || key.includes("CAP") || key.includes("HEADWEAR") || key.includes("HAT")) imageSrc = "https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=600&auto=format&fit=crop&q=80";
                  else imageSrc = "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80";
                }

                return (
                  <Link
                    key={cat.id || keyId}
                    href={`/products?category=${encodeURIComponent(cat.name)}`}
                    className="group relative flex flex-col items-center rounded-3xl bg-neutral-900/90 border border-neutral-800 hover:border-violet-500/50 hover:bg-neutral-850 shadow-lg hover:shadow-[0_12px_30px_rgba(139,92,246,0.18)] transition-all duration-300 transform hover:-translate-y-1.5 active:scale-95 text-center overflow-hidden cursor-pointer p-3"
                  >
                    {/* Clean Highlight Shimmer */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-b from-violet-500/10 to-transparent transition-opacity duration-300 pointer-events-none rounded-3xl" />

                    {/* Soft Curved Cover Image Box */}
                    <div className="relative w-full aspect-square rounded-2xl bg-gradient-to-b from-neutral-800/80 to-neutral-950/90 border border-neutral-800/70 flex items-center justify-center overflow-hidden group-hover:border-violet-500/40 transition-all duration-300 shadow-inner p-2">
                      <Image
                        src={imageSrc}
                        alt={cat.name}
                        fill
                        sizes="(max-width: 640px) 140px, (max-width: 1024px) 200px, 16vw"
                        className="object-cover group-hover:scale-108 transition-transform duration-500 rounded-xl"
                        onError={() => {
                          setImgErrors((prev) => ({ ...prev, [keyId]: true }));
                        }}
                        unoptimized
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
