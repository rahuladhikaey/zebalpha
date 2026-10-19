import Link from "next/link";
import { MobileSearch } from "@/components/MobileSearch";
import { Suspense } from "react";
import type { Metadata } from "next";
import { BannerCarousel } from "@/components/BannerCarousel";
import { Header } from "@/components/Header";
import { MovingOfferBanner } from "@/components/MovingOfferBanner";
import { CuratedCollectionsSection } from "@/components/CuratedCollectionsSection";
import { ZebalphaEditorial } from "@/components/home/ZebalphaEditorial";
import { Footer } from "@/components/Footer";
import { InfiniteProductFeed } from "@/components/InfiniteProductFeed";
import {
  getCachedCuratedCollections,
  getCachedHomeProducts,
  getCachedEditorialCards,
} from "@/lib/cachedQueries";
import {
  buildOrganizationSchema,
  buildWebSiteSchema,
} from "@/lib/aeo-geo/schemaGenerator";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "ZebAlpha | Indian E-Commerce Marketplace",
  description:
    "ZebAlpha is an Indian e-commerce marketplace connecting customers with sellers and growing businesses across India. Discover products and shop online with ZebAlpha.",
  alternates: {
    canonical: "https://zebalpha.shop",
  },
  keywords: [
    "ZebAlpha",
    "Zeb Alpha",
    "zeb alpha ecommerce",
    "zebalpha ecommerce",
    "ZebAlpha marketplace",
    "zeb alpha online shopping",
    "zebalpha official website",
  ],
  openGraph: {
    title: "ZebAlpha | Indian E-Commerce Marketplace",
    description:
      "ZebAlpha is an Indian e-commerce marketplace connecting customers with sellers and growing businesses across India. Founded in Kolkata, West Bengal.",
    url: "https://zebalpha.shop",
    siteName: "ZebAlpha",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/official-logo.png",
        width: 1200,
        height: 630,
        alt: "ZebAlpha - Indian E-Commerce Marketplace",
      },
    ],
  },
};

// --- SKELETON LOADERS FOR PROGRESSIVE SECTIONS ---

function CategoriesSkeleton() {
  return (
    <div className="mt-10 sm:mt-14 space-y-4 animate-pulse select-none">
      <div className="flex items-center justify-between gap-4 mb-4 sm:mb-5">
        <div className="h-7 w-56 rounded-xl bg-neutral-900 border border-neutral-800" />
      </div>
      <div className="w-full overflow-x-auto pb-2 pt-1 no-scrollbar">
        <div className="flex lg:grid lg:grid-cols-6 gap-3 sm:gap-4 w-max lg:w-full">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl sm:rounded-3xl bg-neutral-900/90 border border-neutral-800 p-2.5 sm:p-3 flex flex-col items-center w-[126px] sm:w-[136px] lg:w-auto shrink-0 lg:shrink"
            >
              <div className="w-full aspect-square rounded-xl sm:rounded-2xl bg-neutral-800/80" />
              <div className="mt-2 h-3 w-14 sm:w-16 bg-neutral-800 rounded" />
            </div>
          ))}
        </div>
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
        <div
          key={i}
          className="flex flex-col overflow-hidden rounded-2xl md:rounded-3xl bg-neutral-900/60 border border-neutral-800"
        >
          <div className="aspect-square w-full bg-neutral-800" />
          <div className="p-3.5 sm:p-4 space-y-2 flex-1 flex flex-col justify-between">
            <div className="space-y-1.5">
              <div className="h-2.5 w-16 bg-neutral-800 rounded" />
              <div className="h-3.5 w-3/4 bg-neutral-800 rounded" />
            </div>
            <div className="h-4 w-20 bg-neutral-800 rounded mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

// --- ASYNC DATA CONTAINERS ---

async function CategoriesContainer() {
  const curatedCollections = await getCachedCuratedCollections().catch(() => []);
  return <CuratedCollectionsSection initialCollections={curatedCollections} />;
}

async function EditorialContainer({ brandParam }: { brandParam?: string } = {}) {
  const editorialCards = await getCachedEditorialCards().catch(() => []);
  return <ZebalphaEditorial initialEditorialCards={editorialCards} />;
}

async function ProductFeedContainer({ brandParam }: { brandParam?: string }) {
  const products = await getCachedHomeProducts(brandParam, 12).catch(() => []);
  return <InfiniteProductFeed initialProducts={products} brandFilter={brandParam} />;
}

// --- MAIN HOMEPAGE ---

export default async function HomePage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await props.searchParams;
  const brandParam = typeof resolvedParams?.brand === "string" ? resolvedParams.brand : undefined;

  const jsonLdGraph = {
    "@context": "https://schema.org",
    "@graph": [
      buildOrganizationSchema(),
      buildWebSiteSchema(),
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdGraph) }}
      />
      <main className="min-h-screen bg-black text-white selection:bg-white selection:text-black overflow-x-hidden">
        {/* P0 IMMEDIATE: Header & Promotional Bar */}
        <Header title="ZebAlpha" subtitle="CLOTHING FOR THE CULTURE ✦" />
        <MovingOfferBanner />

        {/* Hero Section Container */}
        <div className="mx-auto w-full max-w-[1400px] px-4 md:px-8">
          {/* Carousel Showcase */}
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
          <Suspense fallback={<CategoriesSkeleton />}>
            <CategoriesContainer />
          </Suspense>

          {/* Editorial Section */}
          <Suspense fallback={<EditorialSkeleton />}>
            <EditorialContainer brandParam={brandParam} />
          </Suspense>

          {/* Featured Marketplace Products Grid */}
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
