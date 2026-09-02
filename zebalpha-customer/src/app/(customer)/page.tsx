import Image from "next/image";
import Link from "next/link";
import { MobileSearch } from "@/components/MobileSearch";
import { Suspense } from "react";
export const dynamic = 'force-dynamic';
import { supabaseServer } from "@/lib/supabaseServer";
import { Product, Category } from "@/lib/types";
import { AddToCartButton } from "@/components/AddToCartButton";
import { BannerCarousel } from "@/components/BannerCarousel";
import { Header } from "@/components/Header";
import { MovingOfferBanner } from "@/components/MovingOfferBanner";
import { ShopByCategorySection } from "@/components/ShopByCategorySection";

const fetchHomeData = async (brandFilter: boolean = false) => {
  let categories: Category[] = [];
  let products: Product[] = [];

  try {
    const { data: catData } = await supabaseServer
      .from("categories")
      .select("*")
      .order("name", { ascending: true });

    if (catData && catData.length > 0) {
      categories = catData as Category[];
    }

    let query = supabaseServer
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (brandFilter) {
      query = query.eq('brand', 'asaliswad');
    }

    query = query.limit(50);

    const { data: prodData } = await query;
    if (prodData && prodData.length > 0) {
      products = (prodData as Product[])
        .filter(p => p.is_active !== false && p.is_approved !== false && p.approval_status !== 'rejected')
        .slice(0, 24);
    }
  } catch (e) {
    console.error("Home data fetch notice:", e);
  }

  return {
    categories,
    products,
  };
};

export default async function HomePage(props: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const resolvedParams = await props.searchParams;
  const brandFilter = resolvedParams?.brand === 'asaliswad';
  const { categories, products } = await fetchHomeData(brandFilter);

  return (
    <main className="min-h-screen bg-black text-white selection:bg-white selection:text-black overflow-x-hidden">
      <Header title="ZEBALPHA" subtitle="CLOTHING FOR THE CULTURE ✦" />
      
      <MovingOfferBanner />

      {/* Hero Section Container */}
      <div className="mx-auto w-full max-w-[1400px] px-4 md:px-8">

        {/* 2D Animated Carousel Showcase */}
        <div className="pt-2">
          <BannerCarousel />
        </div>

        {/* Mobile Search */}
        <div className="md:hidden mt-3">
          <Suspense fallback={<div className="h-[50px] w-full rounded-2xl bg-neutral-900 animate-pulse" />}>
            <MobileSearch />
          </Suspense>
        </div>

        {/* Curated Categories Section */}
        <ShopByCategorySection initialCategories={categories} />

        {/* Featured Clothing Drops Grid */}
        <section className="mt-14 mb-16">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <span className="h-6 w-1 bg-white rounded-full" />
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight md:text-2xl">
                  Latest Drops & Essentials
                </h2>
                <p className="text-xs text-neutral-400 font-medium">Elevated fits engineered for timeless everyday wear</p>
              </div>
            </div>
            <Link 
              href="/products" 
              className="rounded-full border border-neutral-800 bg-neutral-900 px-4 py-2 text-xs font-black uppercase tracking-wider text-neutral-300 hover:bg-white hover:text-black hover:border-white transition-all active:scale-95"
            >
              View All →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 min-[1920px]:grid-cols-6 lg:gap-5">
            {products.map((product) => {
              const effectiveMrp = product.mrp && product.mrp > product.price ? product.mrp : Math.round(product.price * 1.25);
              const discountAmount = effectiveMrp - product.price;
              const discountPercent = Math.round((discountAmount / effectiveMrp) * 100);

              return (
                <article
                  key={product.id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl md:rounded-3xl bg-neutral-900/90 border border-neutral-800 shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-white/40 hover:shadow-[0_12px_35px_rgba(255,255,255,0.08)]"
                >
                  {/* Image Holder */}
                  <Link href={`/products/${product.id}`} className="relative aspect-square w-full overflow-hidden bg-neutral-950 p-3 sm:p-4">
                    <Image
                      src={product.images?.[0] || product.image_url}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                      className="h-full w-full object-contain transition-transform duration-700 group-hover:scale-108"
                    />
                    
                    {/* 2D Animated Discount Badge */}
                    {discountPercent > 0 && (
                      <div className="absolute top-2.5 left-2.5 z-10 bg-white text-black font-black uppercase tracking-wider rounded-md px-2 py-0.5 text-[10px] shadow-lg">
                        {discountPercent}% OFF
                      </div>
                    )}

                    {/* Quick Size Pills Preview */}
                    <div className="absolute bottom-2 inset-x-2 z-10 flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      {["S", "M", "L", "XL"].map((sz) => (
                        <span key={sz} className="text-[9px] font-black px-1.5 py-0.5 rounded bg-black/85 text-white border border-white/20">
                          {sz}
                        </span>
                      ))}
                    </div>
                  </Link>

                  {/* Content */}
                  <div className="flex flex-1 flex-col p-3.5 sm:p-4">
                    <Link href={`/products/${product.id}`} className="mb-auto">
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-neutral-400">
                        {product.brand || "ZEBALPHA"}
                      </p>
                      <h3 className="line-clamp-2 text-sm font-bold leading-snug text-neutral-100 group-hover:text-white transition-colors mt-0.5">
                        {product.name}
                      </h3>
                    </Link>

                    <div className="mt-3.5 space-y-2.5">
                      <div className="flex flex-col">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-base sm:text-lg font-black text-white tracking-tight">₹{product.price}</span>
                          {effectiveMrp > product.price && (
                            <span className="text-xs font-semibold text-neutral-500 line-through">
                              ₹{effectiveMrp}
                            </span>
                          )}
                        </div>
                        
                        {discountAmount > 0 && (
                          <span className="text-[9px] font-black uppercase text-neutral-300 bg-white/10 border border-white/10 px-2 py-0.5 rounded-full inline-block w-fit mt-1">
                            Save ₹{discountAmount}
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

          {/* See All Products Button */}
          <div className="mt-12 flex justify-center">
            <Link 
              href="/products" 
              className="group relative flex w-fit items-center gap-3 overflow-hidden rounded-full bg-white px-8 py-4 text-xs font-black uppercase tracking-[0.25em] text-black shadow-[0_0_25px_rgba(255,255,255,0.2)] transition-all hover:bg-neutral-200 hover:shadow-[0_0_35px_rgba(255,255,255,0.4)] active:scale-95 mx-auto"
            >
              <span>EXPLORE ALL APPAREL & DROPS</span>
              <span className="text-lg transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </section>

      </div>
    </main>
  );
}
