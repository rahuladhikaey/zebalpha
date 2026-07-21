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

const getCategoryEmojiOrIcon = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes("bori")) return "🧆";
  if (lower.includes("dall") || lower.includes("dal")) return "🥣";
  if (lower.includes("spice") || lower.includes("masala")) return "🌶️";
  if (lower.includes("oil")) return "🧴";
  if (lower.includes("rice")) return "🌾";
  if (lower.includes("sweet") || lower.includes("sugar")) return "🍬";
  if (lower.includes("cloth") || lower.includes("wear")) return "👕";
  if (lower.includes("elect")) return "🔌";
  return "📦";
};

function ProductsContent() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("category");
  const searchParam = searchParams.get("search");
  const brandParam = searchParams.get("brand") === "asaliswad";

  useEffect(() => {
    if (categoryParam) {
      setSelectedCategory(Number(categoryParam));
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

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      let productsQuery = supabase.from("products").select("*").order("id", { ascending: false });
      
      if (brandParam) {
        productsQuery = productsQuery.eq('brand', 'asaliswad');
      }

      const [{ data: productsData }, { data: categoriesData }] = await Promise.all([
        productsQuery,
        supabase.from("categories").select("*").order("name", { ascending: true }),
      ]);
      setProducts((productsData ?? []) as Product[]);
      setCategories((categoriesData ?? []) as Category[]);
      setLoading(false);
    };
    load();
  }, [brandParam]);

  const filtered = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = selectedCategory ? product.category_id === selectedCategory : true;
      const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase()) || product.description.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, search]);

  return (
    <main className="min-h-screen bg-[#cefad0] text-slate-900">
      <Header title="Browse Catalog" subtitle="Quality Selection" />


      {/* Top Search Bar (App-like sticky) */}
      <div className="sticky top-[68px] md:top-[72px] z-40 bg-white border-b border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.03)] px-3 py-3 md:px-8">
        <div className="relative mx-auto w-full max-w-[1400px]">
          <svg className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search spices, products..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-11 pr-5 text-sm font-semibold outline-none transition-all focus:border-emerald-500 focus:bg-white focus:shadow-md"
          />
        </div>
      </div>

      {/* Main Split Layout - Full Bleed */}
      <div className="flex flex-1 items-start w-full max-w-[1400px] mx-auto bg-white">
        {/* Left Sidebar Category Selector: Flush Left */}
        <aside className="w-[84px] sm:w-[104px] shrink-0 sticky top-[130px] md:top-[140px] h-[calc(100vh-130px)] md:h-[calc(100vh-140px)] overflow-y-auto no-scrollbar border-r border-slate-200/80 bg-white py-4 z-10 shadow-[2px_0_15px_rgba(0,0,0,0.02)]">
          <div className="flex flex-col gap-6 items-center">
            {/* View All Button */}
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className="flex flex-col items-center justify-center group focus:outline-none w-full relative"
            >
              {/* Left Active Indicator Bar */}
              {selectedCategory === null && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 h-10 w-1 bg-emerald-500 rounded-r-md transition-all duration-300"></div>
              )}
              
              <div className={`relative h-14 w-14 sm:h-16 sm:w-16 rounded-full flex items-center justify-center border-[3px] transition-all duration-300 ${
                selectedCategory === null 
                  ? "border-emerald-500 bg-emerald-50 text-emerald-600 scale-105 shadow-md shadow-emerald-500/10" 
                  : "border-slate-100 bg-slate-50 text-slate-400 hover:border-emerald-200 hover:bg-slate-50/50"
              }`}>
                <span className="text-xl sm:text-2xl">🛍️</span>
              </div>
              <span className={`mt-2 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-center max-w-[80px] line-clamp-2 transition-colors duration-300 ${
                selectedCategory === null ? "text-emerald-600 font-extrabold" : "text-slate-500 group-hover:text-slate-800"
              }`}>
                All Items
              </span>
            </button>

            {/* Dynamic Categories */}
            {categories.map((category) => {
              const isActive = selectedCategory === category.id;
              const emoji = getCategoryEmojiOrIcon(category.name);
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category.id)}
                  className="flex flex-col items-center justify-center group focus:outline-none w-full relative"
                >
                  {/* Left Active Indicator Bar */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-10 w-1 bg-emerald-500 rounded-r-md transition-all duration-300"></div>
                  )}

                  <div className={`relative h-14 w-14 sm:h-16 sm:w-16 rounded-full flex items-center justify-center border-[3px] transition-all duration-300 ${
                    isActive 
                      ? "border-emerald-500 bg-emerald-50 text-emerald-600 scale-105 shadow-md shadow-emerald-500/10" 
                      : "border-slate-100 bg-slate-50 text-slate-400 hover:border-emerald-200 hover:bg-slate-50/50"
                  }`}>
                    <span className="text-xl sm:text-2xl">{emoji}</span>
                  </div>
                  <span className={`mt-2 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-center max-w-[80px] line-clamp-2 px-1 transition-colors duration-300 ${
                    isActive ? "text-emerald-600 font-extrabold" : "text-slate-500 group-hover:text-slate-800"
                  }`}>
                    {category.name}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right Product Grid */}
        <div className="flex-grow min-w-0 bg-slate-50 min-h-[calc(100vh-130px)] pb-10">
          <div className="p-2 sm:p-4 md:p-6 lg:p-8">
            {/* Grid */}
            <div className="grid grid-cols-2 gap-2 sm:gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 min-[1440px]:grid-cols-5 min-[1920px]:grid-cols-6 lg:gap-6">
              {loading
                ? Array.from({ length: 8 }).map((_, index) => <LoadingCard key={index} />)
                : filtered.map((product) => {
                    const discountPercent = product.mrp && product.mrp > product.price
                      ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
                      : 0;
                    const mockRating = {
                      rating: 4.0 + ((product.id * 7) % 11) / 10,
                      count: 30 + ((product.id * 13) % 150)
                    };
                    return (
                      <article key={product.id} className="group relative flex flex-col overflow-hidden rounded-xl sm:rounded-[2rem] bg-white premium-shadow transition-all hover:-translate-y-1 hover:shadow-2xl hover:shadow-emerald-500/10 border border-slate-100/50">
                        {/* Image Holder */}
                        <Link href={`/products/${product.id}`} className="relative aspect-square w-full overflow-hidden bg-slate-50 p-2 sm:p-4">
                          <Image
                            src={product.images?.[0] || product.image_url}
                            alt={product.name}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                            className="h-full w-full object-contain transition duration-500 group-hover:scale-110"
                          />
                          
                          {/* Discount Badge (vertical layout on mobile) */}
                          {discountPercent > 0 && (
                            <div className="absolute top-2 left-2 z-10 bg-black/90 text-white rounded-md px-1.5 py-0.5 text-center flex flex-col items-center justify-center leading-none">
                              <span className="text-[9px] sm:text-[10px] font-extrabold">{discountPercent}%</span>
                              <span className="text-[6px] sm:text-[7px] font-black tracking-wide">OFF</span>
                            </div>
                          )}

                          <div className="absolute right-2 top-2 z-10 sm:right-3 sm:top-3">
                            <WishlistButton product={product} />
                          </div>
                        </Link>
                        
                        {/* Content */}
                        <div className="flex flex-1 flex-col p-2.5 sm:p-4 sm:pt-5">
                          <div className="mb-auto">
                             <h3 className="line-clamp-2 text-xs sm:text-sm font-bold leading-tight text-slate-800 group-hover:text-emerald-600 transition-colors">
                                {product.name}
                             </h3>
                             
                             {/* Rating Stars (Mocked for premium aesthetic, like 2nd pic) */}
                             <div className="flex items-center gap-0.5 mt-1">
                               {Array.from({ length: 5 }).map((_, i) => {
                                 const isFilled = i < Math.floor(mockRating.rating);
                                 return (
                                   <span key={i} className={`text-[10px] sm:text-xs ${isFilled ? "text-amber-400" : "text-slate-200"}`}>
                                     ★
                                   </span>
                                 );
                               })}
                               <span className="text-[8px] sm:text-[10px] text-slate-400 ml-1">
                                 ({mockRating.count})
                               </span>
                             </div>

                             <p className="mt-1 hidden sm:line-clamp-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                {product.description || "Asali Swad Choice"}
                             </p>
                          </div>
                          
                          <div className="mt-3 sm:mt-6 flex items-end justify-between gap-1.5">
                              <div className="flex flex-col">
                                <div className="flex items-baseline gap-1 flex-wrap">
                                  <span className="text-sm sm:text-base font-black text-slate-900">₹{product.price}</span>
                                  {product.mrp && product.mrp > product.price && (
                                    <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 line-through">
                                      ₹{product.mrp}
                                    </span>
                                  )}
                                </div>
                                {discountPercent > 0 && (
                                  <span className="text-[8px] sm:text-[9px] font-extrabold text-emerald-600">
                                    {discountPercent}% off
                                  </span>
                                )}
                                <span className={`text-[8px] sm:text-[10px] font-bold mt-0.5 ${product.stock && product.stock > 0 ? "text-emerald-600" : "text-rose-500"}`}>
                                  {product.stock && product.stock > 0 ? "IN STOCK" : "OUT OF STOCK"}
                                </span>
                              </div>
                              {product.stock && product.stock > 0 ? (
                                <AddToCartButton product={product} compact={true} />
                              ) : null}
                           </div>

                        </div>
                      </article>
                    );
                  })}
            </div>

            {!loading && filtered.length === 0 && (
              <div className="mt-20 text-center">
                 <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-3xl">🔍</div>
                 <h3 className="mt-4 text-xl font-black text-slate-900">No products found</h3>
                 <p className="mt-2 text-slate-500">Try adjusting your search or category filters.</p>
                 <button onClick={() => { setSearch(""); setSelectedCategory(null); }} className="mt-6 font-bold text-emerald-600 underline">Clear all filters</button>
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
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
      </main>
    }>
      <ProductsContent />
    </Suspense>
  );
}

