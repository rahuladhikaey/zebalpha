import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { HomeHero } from "@/components/HomeHero";
import { CuratedCollectionsSection } from "@/components/CuratedCollectionsSection";
import { ZebalphaEditorial } from "@/components/home/ZebalphaEditorial";
import { BrandSpotlightSection } from "@/components/home/BrandSpotlightSection";
import { OurProductsBanner } from "@/components/home/OurProductsBanner";
import { Footer } from "@/components/Footer";
import { InfiniteProductFeed } from "@/components/InfiniteProductFeed";
import { RecentlyViewedSection } from "@/components/recommendations/RecentlyViewedSection";
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
  buildMobileAppSchema,
  buildFaqSchema,
} from "@/lib/aeo-geo/schemaGenerator";
import { NativePlatformProvider } from "@/lib/platform";
import { detectNativeAppOnServer } from "@/lib/platformServer";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "ZebAlpha | Oversized T-Shirts, Custom Print Studio & Indian Streetwear Marketplace",
  description:
    "Shop 240 GSM heavyweight oversized t-shirts, textured zip polos, hoodies & custom printed tees on ZebAlpha India. Enjoy Flat ₹100 OFF on your 1st order (₹399+), COD, Pan-India delivery & 0% commission for sellers.",
  alternates: {
    canonical: "https://zebalpha.shop",
  },
  keywords: [
    "ZebAlpha",
    "Zeb Alpha",
    "zebalpha.shop",
    "ZebAlpha clothing",
    "ZebAlpha oversized t-shirts",
    "ZebAlpha custom t-shirt studio",
    "oversized t-shirts India",
    "240 GSM oversized t-shirt India",
    "custom t-shirt printing India",
    "Indian streetwear marketplace",
    "zero commission marketplace India",
    "ZebAlpha Kolkata",
  ],
  openGraph: {
    title: "ZebAlpha | Oversized T-Shirts, Custom Studio & Indian Streetwear Marketplace",
    description:
      "Shop 240 GSM oversized tees, zip polos, hoodies & custom printed apparel across India. Flat ₹100 OFF on your 1st order (₹399+) with COD & UPI.",
    url: "https://zebalpha.shop",
    siteName: "ZebAlpha",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/official-logo.png",
        width: 1200,
        height: 630,
        alt: "ZebAlpha — Streetwear & Indian E-Commerce Marketplace",
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

  const [navigationCategories, serverIsNative] = await Promise.all([
    getCachedNavigationCategories().catch(() => []),
    detectNativeAppOnServer(resolvedParams),
  ]);

  const homeFaqSchema = buildFaqSchema([
    {
      question: "What is ZebAlpha?",
      answer:
        "ZebAlpha (zebalpha.shop) is an Indian e-commerce marketplace and streetwear apparel brand founded in Kolkata, West Bengal, offering 240+ GSM oversized t-shirts, textured zip polos, heavyweight hoodies, a live Custom Print Studio, and a 0% commission seller platform.",
    },
    {
      question: "Does ZebAlpha offer a first-order discount for new customers?",
      answer:
        "Yes. New customers automatically receive Flat ₹100 OFF on their first order of ₹399 or more (code FIRST100), valid on both Cash on Delivery (COD) and Online UPI/Card payments.",
    },
    {
      question: "Can I design and print my own custom t-shirt on ZebAlpha?",
      answer:
        "Yes. Visit ZebAlpha Custom Studio at zebalpha.shop/customize to upload your artwork, remove backgrounds in 1 click, preview on real 240 GSM oversized tees, classic tees, hoodies, or canvas tote bags, and order with pan-India delivery.",
    },
    {
      question: "Does ZebAlpha support Cash on Delivery (COD) and Pan-India shipping?",
      answer:
        "Yes. ZebAlpha ships across 19,000+ Indian PIN codes with both Cash on Delivery (COD) and secure Razorpay UPI, Card, and Net Banking payments, backed by an easy return and exchange policy.",
    },
  ]);

  const jsonLdGraph = {
    "@context": "https://schema.org",
    "@graph": [
      buildOrganizationSchema(),
      buildWebSiteSchema(),
      buildMobileAppSchema(),
      ...(homeFaqSchema ? [homeFaqSchema] : []),
    ],
  };

  return (
    <NativePlatformProvider initialIsNativeApp={serverIsNative}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdGraph) }}
      />
      <main
        data-ssr-native={serverIsNative ? "true" : undefined}
        className="min-h-screen bg-[#FFFFFF] text-[#111111] selection:bg-[#F5B922]/30 selection:text-[#111111] overflow-x-clip"
      >
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

          {/* Approved Seller App Branding Spotlights (Renders only when live campaigns exist) */}
          <BrandSpotlightSection />

          {/* Featured Marketplace Products Grid */}
          <section className="mt-14 mb-16">
            <OurProductsBanner />

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

          {/* Separate Recently Viewed Section (below Our Products) */}
          <RecentlyViewedSection />
        </div>
      </main>
      <Footer />
    </NativePlatformProvider>
  );
}
