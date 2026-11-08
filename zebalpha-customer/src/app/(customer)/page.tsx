import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { HomeHero } from "@/components/HomeHero";
import { CuratedCollectionsSection } from "@/components/CuratedCollectionsSection";
import { ZebalphaEditorial } from "@/components/home/ZebalphaEditorial";
import { Footer } from "@/components/Footer";
import { InfiniteProductFeed } from "@/components/InfiniteProductFeed";
import {
  CollectionSkeleton,
  EditorialSkeleton,
  ProductCardSkeleton,
} from "@/components/skeletons";
import {
  getCachedCuratedCollections,
  getCachedHomeProducts,
  getCachedEditorialCards,
  getCachedNavigationCategories,
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
  const products = await getCachedHomeProducts(brandParam, 20).catch(() => []);
  return <InfiniteProductFeed initialProducts={products} brandFilter={brandParam} />;
}

// --- MAIN HOMEPAGE ---

export default async function HomePage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await props.searchParams;
  const brandParam = typeof resolvedParams?.brand === "string" ? resolvedParams.brand : undefined;

  const navigationCategories = await getCachedNavigationCategories().catch(() => []);

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
      <main className="min-h-screen bg-black text-white selection:bg-white selection:text-black overflow-x-clip">
        {/* P0 IMMEDIATE: Header */}
        <Header title="ZebAlpha" subtitle="CLOTHING FOR THE CULTURE ✦" />

        {/* Hero Section (Handles Android App vs Website layout) */}
        <HomeHero initialCategories={navigationCategories} />

        {/* Main Content Container */}
        <div className="mx-auto w-full max-w-[1400px] px-4 md:px-8">
          {/* Curated Categories Section */}
          <Suspense fallback={<CollectionSkeleton />}>
            <CategoriesContainer />
          </Suspense>

          {/* Editorial Section */}
          <Suspense fallback={<EditorialSkeleton />}>
            <EditorialContainer brandParam={brandParam} />
          </Suspense>

          {/* Featured Marketplace Products Grid */}
          <section className="mt-14 mb-16">
            <div className="flex items-center justify-between mb-8 gap-4">
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

              {/* Right-side '+' Customize Button */}
              <Link
                href="/customize"
                aria-label="Create Custom Apparel Design"
                className="group relative flex items-center gap-2 rounded-full bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-transparent border border-emerald-500/50 hover:border-emerald-400 px-3.5 sm:px-4 py-2 text-xs font-black uppercase tracking-wider text-emerald-400 hover:text-white transition-all duration-300 shadow-lg hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95 shrink-0"
              >
                <div className="flex items-center justify-center h-5 w-5 rounded-full bg-emerald-500 text-black font-black text-sm group-hover:rotate-90 transition-transform duration-300">
                  +
                </div>
                <span className="hidden sm:inline">Customize</span>
                <span className="text-[10px] hidden md:inline px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  PRINT
                </span>
              </Link>
            </div>

            <Suspense
              fallback={
                <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 min-[1920px]:grid-cols-6 lg:gap-5">
                  <ProductCardSkeleton count={10} />
                </div>
              }
            >
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
