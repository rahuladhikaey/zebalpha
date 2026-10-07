import Link from "next/link";
import { MobileSearch } from "@/components/MobileSearch";
import { Suspense } from "react";
export const dynamic = 'force-dynamic';
import { BannerCarousel } from "@/components/BannerCarousel";
import { Header } from "@/components/Header";
import { MovingOfferBanner } from "@/components/MovingOfferBanner";
import { CuratedCollectionsSection } from "@/components/CuratedCollectionsSection";
import { ZebalphaEditorial } from "@/components/home/ZebalphaEditorial";
import { Footer } from "@/components/Footer";
import { InfiniteProductFeed } from "@/components/InfiniteProductFeed";
import { getCachedCuratedCollections, getCachedHomeCategories, getCachedHomeProducts, getCachedEditorialCards } from "@/lib/cachedQueries";

// --- SKELETON LOADERS FOR PROGRESSIVE SECTIONS ---

function CategoriesSkeleton() {
  return (
    <div className="mt-10 sm:mt-14 space-y-4 animate-pulse">
      <div className="flex items-center gap-2.5">
        <div className="h-6 w-48 rounded-xl bg-neutral-900 border border-neutral-800" />
      </div>
      <div className="flex gap-2 overflow-hidden pb-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-8 w-20 rounded-full bg-neutral-900 border border-neutral-800 shrink-0" />
        ))}
      </div>
      <div className="grid grid-cols-6 gap-3 sm:gap-4 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="aspect-square rounded-2xl bg-neutral-900/80 border border-neutral-800 p-2" />
        ))}
      </div>
    </div>
  );
}

function EditorialSkeleton() {
  return (
    <div className="mt-14 space-y-6 animate-pulse">
      <div className="h-7 w-64 rounded-xl bg-neutral-900 border border-neutral-800" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-72 rounded-3xl bg-neutral-900/60 border border-neutral-800" />
        ))}
      </div>
    </div>
  );
}

function ProductFeedSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 min-[1920px]:grid-cols-6 lg:gap-5 animate-pulse">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="space-y-3 rounded-2xl md:rounded-3xl bg-neutral-900/60 p-3.5 border border-neutral-800">
          <div className="aspect-square rounded-xl bg-neutral-800" />
          <div className="h-3 w-16 bg-neutral-800 rounded" />
          <div className="h-4 w-3/4 bg-neutral-800 rounded" />
          <div className="h-4 w-1/3 bg-neutral-800 rounded mt-2" />
        </div>
      ))}
    </div>
  );
}

// --- ASYNC DATA CONTAINERS (STREAMED BELOW THE FOLD) ---

async function CategoriesContainer() {
  const [curatedCollections, categories] = await Promise.all([
    getCachedCuratedCollections().catch(() => []),
    getCachedHomeCategories(16).catch(() => []),
  ]);
  return <CuratedCollectionsSection initialCollections={curatedCollections} initialCategories={categories} />;
}

async function EditorialContainer({ brandParam }: { brandParam?: string } = {}) {
  const editorialCards = await getCachedEditorialCards().catch(() => []);
  return <ZebalphaEditorial initialEditorialCards={editorialCards} />;
}

async function ProductFeedContainer({ brandParam }: { brandParam?: string }) {
  const products = await getCachedHomeProducts(brandParam, 12).catch(() => []);
  return <InfiniteProductFeed initialProducts={products} brandFilter={brandParam} />;
}

// --- MAIN HOMEPAGE (HERO RENDERS IMMEDIATELY WITHOUT BLOCKING) ---

export default async function HomePage(props: { searchParams?: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const resolvedParams = await props.searchParams;
  const brandParam = typeof resolvedParams?.brand === 'string' ? resolvedParams.brand : undefined;

  return (
    <>
      <main className="min-h-screen bg-black text-white selection:bg-white selection:text-black overflow-x-hidden">
        {/* P0 IMMEDIATE: Header & Promotional Bar */}
        <Header title="ZEBALPHA" subtitle="CLOTHING FOR THE CULTURE ✦" />
        <MovingOfferBanner />

        {/* Hero Section Container — CRITICAL / IMMEDIATE (NEVER LAZY-LOADED) */}
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

          {/* P1 EARLY PROGRESSIVE: Curated Categories Section */}
          <Suspense fallback={<CategoriesSkeleton />}>
            <CategoriesContainer />
          </Suspense>

          {/* P2 LAZY / DEFERRED: Editorial Fashion Section */}
          <Suspense fallback={<EditorialSkeleton />}>
            <EditorialContainer brandParam={brandParam} />
          </Suspense>

          {/* P1/P2 PROGRESSIVE: Featured Clothing Drops Grid with Infinite Scroll */}
          <section className="mt-14 mb-16">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <span className="h-6 w-1 bg-white rounded-full" />
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tight md:text-2xl">
                    Our Products
                  </h2>
                  <p className="text-xs text-neutral-400 font-medium">
                    Explore our complete streetwear, polos, hoodies & apparel collection
                  </p>
                </div>
              </div>
            </div>

            <Suspense fallback={<ProductFeedSkeleton />}>
              <ProductFeedContainer brandParam={brandParam} />
            </Suspense>

            {/* See All Collections CTA */}
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
