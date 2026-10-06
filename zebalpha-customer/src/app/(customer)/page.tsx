import Image from "next/image";
import Link from "next/link";
import { MobileSearch } from "@/components/MobileSearch";
import { Suspense } from "react";
export const dynamic = 'force-dynamic';
import { supabaseServer } from "@/lib/supabaseServer";
import { Product, Category } from "@/lib/types";
import { BannerCarousel } from "@/components/BannerCarousel";
import { Header } from "@/components/Header";
import { MovingOfferBanner } from "@/components/MovingOfferBanner";
import { ShopByCategorySection } from "@/components/ShopByCategorySection";
import { ZebalphaEditorial } from "@/components/home/ZebalphaEditorial";
import { Footer } from "@/components/Footer";
import { InfiniteProductFeed } from "@/components/InfiniteProductFeed";
import { isProductNewDrop, isDropLive } from "@/lib/dropUtils";
import { getCachedHomeCategories, getCachedHomeProducts, getCachedEditorialCards } from "@/lib/cachedQueries";

const SLIM_PRODUCT_FIELDS = "*";

const fetchHomeData = async (brandFilter?: string) => {
  let categories: Category[] = [];
  let products: Product[] = [];
  let editorialCards: any[] = [];

  try {
    // 1. Fetch categories via Redis L2 / in-memory cache
    categories = await getCachedHomeCategories(16);

    // 2. Fetch Superadmin-managed editorial cards via Redis L2 / in-memory cache
    editorialCards = await getCachedEditorialCards();

    // 3. Fetch featured initial 12 products via Redis L2 / in-memory cache
    let rawProducts = await getCachedHomeProducts(brandFilter, 12);

    // Fallback: If cache returned empty, query supabaseServer directly
    if (!rawProducts || rawProducts.length === 0) {
      let fallbackQuery = supabaseServer
        .from("products")
        .select(SLIM_PRODUCT_FIELDS)
        .order("created_at", { ascending: false })
        .limit(12);

      if (brandFilter) {
        fallbackQuery = fallbackQuery.ilike("brand", `%${brandFilter}%`);
      }

      const { data: dbProducts } = await fallbackQuery;
      if (dbProducts && dbProducts.length > 0) {
        rawProducts = dbProducts.filter((p: any) => 
          p.is_active !== false && p.is_approved !== false && p.approval_status !== 'rejected'
        ) as Product[];
      }
    }

    if (rawProducts && rawProducts.length > 0) {
      products = rawProducts
        .filter(p => {
          // Keep active products visible; only hide explicit upcoming drops with future dates
          if (p.specifications && (p.specifications as any).is_new_drop === "true" && !isDropLive(p)) {
            return false;
          }
          return true;
        })
        .slice(0, 12);
    }
  } catch (e) {
    console.error("Home data fetch notice:", e);
  }

  return {
    categories,
    products,
    editorialCards,
  };
};

export default async function HomePage(props: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const resolvedParams = await props.searchParams;
  const brandParam = typeof resolvedParams?.brand === 'string' ? resolvedParams.brand : undefined;
  const { categories, products, editorialCards } = await fetchHomeData(brandParam);

  return (
    <>
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

        {/* Zebalpha Editorial Fashion Section: Woven to Be Remembered */}
        <ZebalphaEditorial
          initialProducts={products}
          initialCategories={categories}
          initialEditorialCards={editorialCards}
        />

        {/* Featured Clothing Drops Grid with Infinite Scroll */}
        <section className="mt-14 mb-16">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <span className="h-6 w-1 bg-white rounded-full" />
              <div>
                <h2 className="text-xl font-black text-white uppercase tracking-tight md:text-2xl">
                  Our Products
                </h2>
                <p className="text-xs text-neutral-400 font-medium">Explore our complete streetwear, polos, hoodies & apparel collection</p>
              </div>
            </div>
          </div>

          <InfiniteProductFeed initialProducts={products} brandFilter={brandParam} />

          {/* See All Collections Button */}
          <div className="mt-12 flex justify-center">
            <Link 
              href="/products" 
              className="group relative flex w-fit items-center gap-3 overflow-hidden rounded-full bg-white px-8 py-4 text-xs font-black uppercase tracking-[0.25em] text-black shadow-[0_0_25px_rgba(255,255,255,0.2)] transition-all hover:bg-neutral-200 hover:shadow-[0_0_35px_rgba(255,255,255,0.4)] active:scale-95 mx-auto"
            >
              <span>ALL COLLECTION</span>
              <span className="text-lg transition-transform group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </section>

      </div>
    </main>
    <Footer />
    </>
  );
}
