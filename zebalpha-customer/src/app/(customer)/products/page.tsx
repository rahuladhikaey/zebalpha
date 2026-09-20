"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Product, Category } from "@/lib/types";
import { LoadingCard } from "@/components/LoadingCard";
import { AddToCartButton } from "@/components/AddToCartButton";

import { Header } from "@/components/Header";
import { WishlistButton } from "@/components/WishlistButton";
import { ProductCardImageSlider } from "@/components/ProductCardImageSlider";
import { Search, ShoppingBag, Sparkles } from "lucide-react";

const getCategoryEmojiOrIcon = (name: string) => {
  const lower = (name || "").toLowerCase();
  if (lower.includes("polo")) return "👕";
  if (lower.includes("tee") || lower.includes("t-shirt") || lower.includes("oversized")) return "🛹";
  if (lower.includes("hoodie") || lower.includes("sweatshirt") || lower.includes("fleece")) return "🧥";
  if (lower.includes("shirt")) return "👔";
  if (lower.includes("pant") || lower.includes("trouser") || lower.includes("cargo") || lower.includes("bottom")) return "👖";
  if (lower.includes("drop") || lower.includes("limited")) return "⚡";
  if (lower.includes("accessory") || lower.includes("cap") || lower.includes("headwear")) return "🧢";
  if (lower.includes("classic") || lower.includes("premium")) return "👑";
  return "🛍️";
};

const DEFAULT_CLOTHING_CATEGORIES: Category[] = [
  { id: "1", name: "Premium Polos", icon: "👕", main_category: "POLOS", description: "100% Supima Pique" },
  { id: "2", name: "Oversized Tees", icon: "🛹", main_category: "T-SHIRTS", description: "240 GSM Heavyweight" },
  { id: "3", name: "Heavyweight Hoodies", icon: "🧥", main_category: "HOODIES", description: "380 GSM Plush Fleece" },
  { id: "4", name: "Casual Shirts", icon: "👔", main_category: "SHIRTS", description: "Woven Textured Cottons" },
  { id: "5", name: "Cargo & Trousers", icon: "👖", main_category: "BOTTOMS", description: "Tactical Utility Fits" },
  { id: "6", name: "Limited Drops", icon: "⚡", main_category: "LIMITED", description: "Exclusive Release Drops" },
  { id: "7", name: "Zebalpha Classics", icon: "👑", main_category: "ALL", description: "Monogram Signature Pieces" },
  { id: "8", name: "Accessories & Caps", icon: "🧢", main_category: "ALL", description: "Caps, Chains & Extras" },
];

function ProductsContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>(DEFAULT_CLOTHING_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<number | string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const searchParam = searchParams.get("search");

  useEffect(() => {
    if (categoryParam) {
      setSelectedCategory(categoryParam);
    } else {
      setSelectedCategory(null);
    }
  }, [categoryParam]);

  useEffect(() => {
    if (searchParam) {
      setSearch(searchParam);
    } else {
      setSearch("");
    }
  }, [searchParam]);

  const load = async () => {
    setLoading(true);

    try {
      const [{ data: productsData }, { data: categoriesData }] = await Promise.all([
        supabase.from("products").select("*").order("created_at", { ascending: false }),
        supabase.from("categories").select("*").order("name", { ascending: true }),
      ]);

      const activeProducts = (productsData ?? []).filter((p: any) => 
        p.is_active !== false && p.is_approved !== false && p.approval_status !== 'rejected'
      );

      setProducts(activeProducts as Product[]);

      if (categoriesData && categoriesData.length > 0) {
        setCategories(categoriesData as Category[]);
      } else {
        setCategories(DEFAULT_CLOTHING_CATEGORIES);
      }
    } catch (err) {
      console.warn("Notice loading products catalog:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    const channel = supabase
      .channel("customer-products-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => load())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    return products.filter((product) => {
      let matchesCategory = true;

      if (selectedCategory !== null && selectedCategory !== undefined && selectedCategory !== "") {
        const catStr = String(selectedCategory).toLowerCase().trim();
        const prodCatIdStr = String(product.category_id || "").toLowerCase();
        const prodCatNameStr = String(product.category_name || "").toLowerCase();
        const prodCatStr = String(product.category || "").toLowerCase();
        const prodCollectionStr = String(product.collection || "").toLowerCase();
        const prodNameStr = String(product.name || "").toLowerCase();

        if (catStr.includes("polo")) {
          matchesCategory = prodCatNameStr.includes("polo") || prodCatStr.includes("polo") || prodNameStr.includes("polo") || prodCollectionStr.includes("polo");
        } else if (catStr.includes("tee") || catStr.includes("t-shirt") || catStr.includes("oversized")) {
          matchesCategory = prodCatNameStr.includes("tee") || prodCatNameStr.includes("t-shirt") || prodCatStr.includes("tee") || prodNameStr.includes("tee") || prodNameStr.includes("shirt");
        } else if (catStr.includes("hoodie") || catStr.includes("fleece")) {
          matchesCategory = prodCatNameStr.includes("hoodie") || prodCatStr.includes("hoodie") || prodNameStr.includes("hoodie");
        } else if (catStr.includes("shirt")) {
          matchesCategory = prodCatNameStr.includes("shirt") || prodCatStr.includes("shirt") || prodNameStr.includes("shirt");
        } else if (catStr.includes("bottom") || catStr.includes("cargo") || catStr.includes("pant") || catStr.includes("trouser")) {
          matchesCategory = prodCatNameStr.includes("cargo") || prodCatStr.includes("cargo") || prodNameStr.includes("pant") || prodNameStr.includes("trouser") || prodNameStr.includes("cargo");
        } else if (catStr.includes("drop") || catStr.includes("limited")) {
          matchesCategory = product.is_new_drop || prodCatNameStr.includes("drop") || prodNameStr.includes("drop") || prodNameStr.includes("limited");
        } else {
          const foundCat = categories.find(c => String(c.id).toLowerCase() === catStr || c.name.toLowerCase().includes(catStr) || catStr.includes(c.name.toLowerCase()));
          const targetValues = foundCat 
            ? [String(foundCat.id).toLowerCase(), foundCat.name.toLowerCase()] 
            : [catStr];

          matchesCategory = targetValues.some(v => prodCatIdStr.includes(v) || prodCatNameStr.includes(v) || prodCatStr.includes(v)) ||
            prodCatNameStr.includes(catStr) ||
            prodCatStr.includes(catStr) ||
            prodNameStr.includes(catStr);
        }
      }

      const matchesSearch = !search || product.name.toLowerCase().includes(search.toLowerCase()) || (product.description || "").toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, categories, selectedCategory, search]);

  return (
    <main className="min-h-screen bg-black text-white">
      <Header title="Browse Catalog" subtitle="Quality Selection" />

      {/* Top Search Bar */}
      <div className="sticky top-[68px] md:top-[72px] z-40 bg-black/90 backdrop-blur-xl border-b border-zinc-800 shadow-2xl px-3 py-3 md:px-8">
        <div className="relative mx-auto w-full max-w-[1400px]">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search streetwear, polos, hoodies, shirts..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-900 py-2.5 pl-11 pr-5 text-sm font-semibold text-white placeholder:text-zinc-500 outline-none transition-all focus:border-white focus:bg-zinc-950 focus:shadow-xl"
          />
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="flex flex-1 items-start w-full max-w-[1400px] mx-auto bg-black">
        
        {/* Left Sidebar Category Selector */}
        <aside className="w-[84px] sm:w-[104px] shrink-0 sticky top-[130px] md:top-[140px] h-[calc(100vh-130px)] md:h-[calc(100vh-140px)] overflow-y-auto no-scrollbar border-r border-zinc-800 bg-black py-4 z-10">
          <div className="flex flex-col gap-5 items-center">
            {/* View All Button */}
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className="flex flex-col items-center justify-center group focus:outline-none w-full relative cursor-pointer"
            >
              {selectedCategory === null && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-10 w-1 bg-white rounded-r-md transition-all duration-300"></div>
              )}
              
              <div className={`relative h-14 w-14 sm:h-16 sm:w-16 rounded-full flex items-center justify-center border-[3px] transition-all duration-300 overflow-hidden ${
                selectedCategory === null 
                  ? "border-white bg-zinc-900 text-white scale-105 shadow-xl shadow-white/10" 
                  : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-900"
              }`}>
                <span className="text-xl sm:text-2xl">🛍️</span>
              </div>
              <span className={`mt-1.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-center max-w-[80px] line-clamp-2 transition-colors duration-300 ${
                selectedCategory === null ? "text-white font-extrabold" : "text-zinc-400 group-hover:text-white"
              }`}>
                All Items
              </span>
            </button>

            {/* Curated Categories */}
            {categories.map((category) => {
              const isActive = selectedCategory === category.id || selectedCategory === category.name;
              const emoji = category.icon || getCategoryEmojiOrIcon(category.name);
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category.name || category.id)}
                  className="flex flex-col items-center justify-center group focus:outline-none w-full relative cursor-pointer"
                >
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-10 w-1 bg-white rounded-r-md transition-all duration-300"></div>
                  )}

                  <div className={`relative h-14 w-14 sm:h-16 sm:w-16 rounded-full flex items-center justify-center border-[3px] transition-all duration-300 overflow-hidden ${
                    isActive 
                      ? "border-white bg-zinc-900 text-white scale-105 shadow-xl shadow-white/10" 
                      : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-900"
                  }`}>
                    {category.image_url ? (
                      <Image src={category.image_url} alt={category.name} fill className="object-cover" unoptimized />
                    ) : (
                      <span className="text-xl sm:text-2xl select-none">{emoji}</span>
                    )}
                  </div>
                  <span className={`mt-1.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-center max-w-[80px] line-clamp-2 px-1 transition-colors duration-300 ${
                    isActive ? "text-white font-extrabold" : "text-zinc-400 group-hover:text-white"
                  }`}>
                    {category.name}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right Product Grid */}
        <div className="flex-grow min-w-0 bg-black min-h-[calc(100vh-130px)] pb-10">
          <div className="p-2 sm:p-4 md:p-6 lg:p-8">
            {loading ? (
              <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 min-[1440px]:grid-cols-5 min-[1920px]:grid-cols-6 lg:gap-6">
                {Array.from({ length: 8 }).map((_, index) => <LoadingCard key={index} />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-3xl border border-zinc-800 bg-zinc-950/60 p-12 text-center text-zinc-400 my-8">
                <ShoppingBag size={48} className="mx-auto mb-4 opacity-40 text-white" />
                <h3 className="text-lg font-black text-white uppercase tracking-wider">
                  No Products Found
                </h3>
                <p className="text-xs font-semibold mt-1 text-zinc-400 max-w-sm mx-auto">
                  Try adjusting your search query or selecting a different category filter.
                </p>
                <button 
                  onClick={() => { setSelectedCategory(null); setSearch(""); }}
                  className="mt-6 rounded-full border border-white/20 bg-white text-black px-6 py-2.5 text-xs font-black uppercase tracking-wider hover:bg-neutral-200 transition-all cursor-pointer"
                >
                  Clear All Filters & View All
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 min-[1440px]:grid-cols-5 min-[1920px]:grid-cols-6 lg:gap-6">
                {filtered.map((product) => {
                  const discountPercent = product.mrp && product.mrp > product.price
                    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
                    : 0;
                  return (
                    <article key={product.id} className="group relative flex flex-col overflow-hidden rounded-xl sm:rounded-[2rem] bg-zinc-950 shadow-2xl transition-all hover:-translate-y-1 hover:shadow-2xl hover:border-zinc-700 border border-zinc-800">
                      {/* Auto-sliding Image Holder */}
                      <div className="relative">
                        <ProductCardImageSlider
                          images={product.images && product.images.length > 0 ? product.images : [product.image_url]}
                          alt={product.name}
                          href={`/products/${product.id}`}
                          discountPercent={discountPercent}
                          isPremium={product.is_premium || product.tier === "PREMIUM" || (product.specifications as any)?.is_premium === "true"}
                        />
                        <div className="absolute right-2 top-2 z-30 sm:right-3 sm:top-3">
                          <WishlistButton product={product} />
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="flex flex-1 flex-col p-2.5 sm:p-4 sm:pt-5">
                        <Link href={`/products/${product.id}`} className="mb-auto">
                          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-400">
                            {product.brand || "ZEBALPHA"}
                          </p>
                          <h3 className="line-clamp-2 text-xs sm:text-sm font-bold leading-tight text-white group-hover:text-zinc-300 transition-colors mt-0.5">
                            {product.name}
                          </h3>
                        </Link>

                        <div className="mt-3.5 space-y-2.5">
                          <div className="flex flex-col">
                            <div className="flex items-baseline gap-1.5 flex-wrap">
                              <span className="text-sm sm:text-base font-black text-white">₹{product.price}</span>
                              {product.mrp && product.mrp > product.price && (
                                <span className="text-[10px] font-bold text-zinc-400 line-through">
                                  ₹{product.mrp}
                                </span>
                              )}
                            </div>
                            
                            {discountPercent > 0 && (
                              <span className="text-[9px] font-black uppercase text-zinc-300 bg-white/10 border border-white/10 px-2 py-0.5 rounded-full inline-block w-fit mt-1">
                                Save ₹{product.mrp! - product.price}
                              </span>
                            )}
                          </div>

                          <div className="pt-1 flex items-center justify-between gap-2">
                            <AddToCartButton product={product} />
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-white"></div>
      </div>
    }>
      <ProductsContent />
    </Suspense>
  );
}
