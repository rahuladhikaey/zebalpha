"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/Header";
import { useCategories } from "@/hooks/useCatalogQueries";
import { Search, Sparkles, ArrowRight, LayoutGrid, Layers, Tag } from "lucide-react";
import { Category } from "@/lib/types";

const CATEGORY_TABS = [
  "ALL",
  "POLOS",
  "T-SHIRTS",
  "HOODIES",
  "SHIRTS",
  "BOTTOMS",
  "LIMITED",
  "ACCESSORIES",
];

export default function CategoriesPage() {
  const { data: rawCategories = [], isLoading } = useCategories();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("ALL");
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  // Filter categories by tab and search input
  const filteredCategories = useMemo(() => {
    return rawCategories.filter((cat) => {
      if (cat.is_active === false) return false;

      // Filter by Search Query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesName = cat.name.toLowerCase().includes(query);
        const matchesDesc = cat.description?.toLowerCase().includes(query);
        const matchesSlug = cat.slug?.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc && !matchesSlug) return false;
      }

      // Filter by Category Tab
      if (selectedTab === "ALL") return true;
      const combined = `${cat.name} ${cat.description || ""} ${cat.slug || ""}`.toUpperCase();
      return combined.includes(selectedTab);
    });
  }, [rawCategories, searchQuery, selectedTab]);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black pb-24">
      {/* Native-aware Header */}
      <Header title="Categories" subtitle="Explore Collections" />

      <main className="mx-auto w-full max-w-5xl px-4 py-6 md:px-8">
        {/* Page Title & Subtitle */}
        <div className="mb-6 flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-800 text-white">
              <LayoutGrid size={13} className="text-white" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">
              Directory
            </span>
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-white md:text-3xl">
            Collections & Categories
          </h1>
          <p className="text-xs font-semibold text-zinc-400">
            Browse our complete street couture, oversized tees, hoodies & premium drops.
          </p>
        </div>

        {/* Live Search Bar for Categories */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories (e.g. Hoodies, Polos, Jackets)..."
            className="w-full rounded-2xl border border-zinc-800/90 bg-zinc-950 px-11 py-3.5 text-xs sm:text-sm font-semibold text-white placeholder:text-zinc-600 outline-none transition-all focus:border-zinc-500 focus:bg-black shadow-inner"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-zinc-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {/* Horizontal Category Filter Pills */}
        <div className="mb-8 overflow-x-auto no-scrollbar -mx-4 px-4">
          <div className="flex items-center gap-2 w-max">
            {CATEGORY_TABS.map((tab) => {
              const isActive = selectedTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSelectedTab(tab)}
                  className={`rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap active:scale-95 ${
                    isActive
                      ? "bg-white text-black shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                      : "bg-zinc-950 text-zinc-400 border border-zinc-800/80 hover:text-white hover:bg-zinc-900"
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>
        </div>

        {/* Categories Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-44 rounded-3xl bg-zinc-950 border border-zinc-900 animate-pulse p-3.5 flex flex-col justify-end"
              >
                <div className="h-4 w-20 bg-zinc-800 rounded mb-2" />
                <div className="h-2.5 w-12 bg-zinc-900 rounded" />
              </div>
            ))}
          </div>
        ) : filteredCategories.length > 0 ? (
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4">
            {filteredCategories.map((cat: Category) => {
              const hasBrokenImg = brokenImages[cat.id];
              const displayImg = !hasBrokenImg && cat.image_url ? cat.image_url : "/official-logo.png";
              const targetHref = cat.slug ? `/category/${cat.slug}` : `/products?category=${encodeURIComponent(cat.name)}`;

              return (
                <Link
                  key={cat.id}
                  href={targetHref}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-3xl bg-zinc-950 border border-zinc-800/80 p-3.5 shadow-xl transition-all duration-300 hover:border-zinc-600 hover:shadow-2xl active:scale-[0.97]"
                >
                  {/* Category Image Cover */}
                  <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800/50 mb-3 flex items-center justify-center">
                    <Image
                      src={displayImg}
                      alt={cat.name}
                      fill
                      sizes="(max-width: 640px) 50vw, 25vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={() =>
                        setBrokenImages((prev) => ({ ...prev, [cat.id]: true }))
                      }
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                  </div>

                  {/* Category Info */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xs sm:text-sm font-black uppercase tracking-tight text-white truncate group-hover:text-zinc-200">
                        {cat.name}
                      </h2>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mt-0.5 flex items-center gap-1">
                        <Sparkles size={10} className="text-zinc-400" />
                        Explore Drop
                      </p>
                    </div>

                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 group-hover:bg-white group-hover:text-black group-hover:border-white transition-all shadow-sm">
                      <ArrowRight size={13} strokeWidth={2.5} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-zinc-800/80 bg-zinc-950 p-12 text-center shadow-2xl">
            <Layers className="mx-auto h-12 w-12 text-zinc-700 mb-3" />
            <h3 className="text-base font-black text-white uppercase tracking-wider">
              No Categories Found
            </h3>
            <p className="mt-1 text-xs font-semibold text-zinc-500">
              No categories match &quot;{searchQuery}&quot;. Try another search term or reset filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedTab("ALL");
              }}
              className="mt-5 rounded-full bg-white px-6 py-2.5 text-xs font-black uppercase tracking-widest text-black hover:bg-zinc-200 transition-all cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
