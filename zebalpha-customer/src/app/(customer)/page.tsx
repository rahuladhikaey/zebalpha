import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { HomeHero } from "@/components/HomeHero";
import { BannerCarousel } from "@/components/BannerCarousel";
import { MovingOfferBanner } from "@/components/MovingOfferBanner";
import { CuratedCollectionsSection } from "@/components/CuratedCollectionsSection";
import {
  AndroidHomeTrustBar,
  AndroidNewSeasonDropBanner,
} from "@/components/home/AndroidHomeTrustAndDrop";
import { FlashDealStripSection } from "@/components/home/FlashDealStripSection";
import { PromotionalGridSection } from "@/components/home/PromotionalGridSection";
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
  getCachedPromotionalCampaigns,
  getCachedHomepageLayout,
  getCachedActiveCustomerExperience,
} from "@/lib/cachedQueries";
import type { SduiWidgetConfig } from "@/lib/types";
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

// --- ASYNC SDUI WIDGET CONTAINERS ---

async function CategoriesContainer({
  title,
  subtitle,
}: {
  title?: string;
  subtitle?: string;
}) {
  const curatedCollections = await getCachedCuratedCollections().catch(() => []);
  return (
    <CuratedCollectionsSection
      initialCollections={curatedCollections}
      title={title}
      subtitle={subtitle}
      hidePromoDropBanner={true}
    />
  );
}

async function EditorialContainer({
  title,
  subtitle,
  config,
}: {
  title?: string;
  subtitle?: string;
  config?: Record<string, any>;
}) {
  const editorialCards = await getCachedEditorialCards().catch(() => []);
  const rawTitle = String(title || "Customize & Wear Your Art").trim();
  const titleLine1 = config?.title_line_1 || (rawTitle.includes("&") ? `${rawTitle.split("&")[0].trim()} &` : "Customize &");
  const titleLine2 =
    config?.title_line_2 ||
    (rawTitle.includes("&") ? rawTitle.split("&").slice(1).join("&").trim() : rawTitle);

  return (
    <ZebalphaEditorial
      initialEditorialCards={editorialCards}
      eyebrow={config?.eyebrow || "ZEBALPHA CUSTOM STUDIO"}
      titleLine1={titleLine1}
      titleLine2={titleLine2}
      subtitle={subtitle}
    />
  );
}

async function FlashDealContainer({ widget }: { widget: SduiWidgetConfig }) {
  const products = await getCachedHomeProducts(undefined, 24).catch(() => []);
  const cfg = widget.config || {};
  return (
    <FlashDealStripSection
      title={widget.title}
      subtitle={widget.subtitle}
      badgeText={cfg.badge_text || "LIVE FLASH SALE"}
      endsAt={cfg.ends_at}
      productIds={Array.isArray(cfg.product_ids) ? cfg.product_ids : []}
      maxItems={Number(cfg.max_items || 8)}
      ctaLabel={cfg.cta_label || "View All Deals"}
      ctaHref={cfg.cta_href || "/products"}
      allProducts={products}
    />
  );
}

async function FestiveGridContainer({ widget }: { widget: SduiWidgetConfig }) {
  const campaigns = await getCachedPromotionalCampaigns().catch(() => []);
  if (!campaigns || campaigns.length === 0) return null;
  const slug = widget.config?.campaign_slug || "top-deals";
  const target = campaigns.find((c) => c.slug === slug) || campaigns[0];
  if (!target) return null;
  return (
    <PromotionalGridSection
      campaign={target}
      overrideTitle={widget.title}
      overrideSubtitle={widget.subtitle}
    />
  );
}

async function ProductFeedContainer({ brandParam }: { brandParam?: string }) {
  const products = await getCachedHomeProducts(brandParam, 20).catch(() => []);
  return <InfiniteProductFeed initialProducts={products} brandFilter={brandParam} />;
}

// --- MAIN HOMEPAGE (100% SERVER-DRIVEN UI ORCHESTRATOR) ---

export default async function HomePage(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const resolvedParams = await props.searchParams;
  const brandParam = typeof resolvedParams?.brand === "string" ? resolvedParams.brand : undefined;

  const [navigationCategories, serverIsNative, sduiLayout, activeDemsExperience] = await Promise.all([
    getCachedNavigationCategories().catch(() => []),
    detectNativeAppOnServer(resolvedParams),
    getCachedHomepageLayout(),
    getCachedActiveCustomerExperience(),
  ]);

  // Merge active DEMS homeSections override if present, otherwise fallback to sduiLayout.widgets
  const rawWidgets: SduiWidgetConfig[] =
    Array.isArray(activeDemsExperience?.homeSections) && activeDemsExperience.homeSections.length > 0
      ? activeDemsExperience.homeSections.map((sec) => ({
          id: sec.id,
          widget_type: sec.widget_type as any,
          title: sec.title,
          subtitle: sec.subtitle,
          enabled: sec.is_visible !== false,
          app_enabled: sec.app_enabled !== false,
          web_enabled: sec.web_enabled !== false,
          display_order: sec.display_order,
          config: sec.settings_json || {},
        }))
      : sduiLayout.widgets || [];

  // Filter & sort widgets according to SuperAdmin DEMS / SDUI Blueprint + platform targeting
  const activeWidgets = rawWidgets
    .filter((w) => {
      if (!w || !w.enabled) return false;
      if (serverIsNative && w.app_enabled === false) return false;
      if (!serverIsNative && w.web_enabled === false) return false;
      return true;
    })
    .sort((a, b) => (a.display_order ?? 99) - (b.display_order ?? 99));

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
        "Yes. ZebAlpha ships across 19,000+ Indian PIN codes with both Cash on Delivery (COD) and secure Online UPI, Card, and Net Banking payments, backed by an easy return and exchange policy.",
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
        style={{
          backgroundColor: activeDemsExperience?.themeTokens?.backgroundColor || "var(--dems-bg, #FFFFFF)",
          color: activeDemsExperience?.themeTokens?.primaryText || "var(--dems-text-primary, #111111)",
        }}
        className="min-h-screen selection:bg-[#F5B922]/30 selection:text-[#111111] overflow-x-clip"
      >
        {/* P0 IMMEDIATE: Header + Sticky Search & Category Navigation Bar */}
        <Header title="ZebAlpha" subtitle="CLOTHING FOR THE CULTURE ✦" />
        <HomeHero initialCategories={navigationCategories} stickyNavOnly={true} />

        {/* =================================================================== */}
        {/* DYNAMIC SDUI WIDGET STREAM (Flipkart / Meesho Multi-Widget Engine)  */}
        {/* =================================================================== */}
        {activeWidgets.map((widget) => {
          switch (widget.widget_type) {
            case "HERO_CAROUSEL":
              return (
                <div
                  key={widget.id}
                  className="mx-auto w-full max-w-[1400px] px-3.5 md:px-8 pt-3"
                >
                  <BannerCarousel />
                </div>
              );

            case "TRUST_BADGE_STRIP":
              if (sduiLayout.global_theme?.trust_bar_enabled === false) return null;
              return (
                <AndroidHomeTrustBar
                  key={widget.id}
                  badges={sduiLayout.global_theme?.trust_badges}
                  freeShippingThreshold={sduiLayout.global_theme?.free_shipping_threshold}
                />
              );

            case "MARQUEE_TICKER":
              if (sduiLayout.global_theme?.announcement_bar_enabled === false) return null;
              return (
                <div key={widget.id} className="mt-3">
                  <MovingOfferBanner initialItems={sduiLayout.global_theme?.marquee_items} />
                </div>
              );

            case "CURATED_COLLECTIONS":
              return (
                <div key={widget.id} className="mx-auto w-full max-w-[1400px] px-4 md:px-8">
                  <Suspense fallback={<CollectionSkeleton />}>
                    <CategoriesContainer title={widget.title} subtitle={widget.subtitle} />
                  </Suspense>
                </div>
              );

            case "PROMO_DROP_CAROUSEL":
              return (
                <div key={widget.id} className="mx-auto w-full max-w-[1400px] px-4 md:px-8">
                  <AndroidNewSeasonDropBanner
                    showFirstOrderSlideConfig={widget.config?.show_first_order_slide !== false}
                    showNewDropSlideConfig={widget.config?.show_new_drop_slide !== false}
                  />
                </div>
              );

            case "FLASH_DEAL_STRIP":
              return (
                <div key={widget.id} className="mx-auto w-full max-w-[1400px] px-4 md:px-8">
                  <Suspense fallback={null}>
                    <FlashDealContainer widget={widget} />
                  </Suspense>
                </div>
              );

            case "FESTIVE_16_SLOT_GRID":
              return (
                <div key={widget.id} className="mx-auto w-full max-w-[1400px] px-4 md:px-8">
                  <Suspense fallback={null}>
                    <FestiveGridContainer widget={widget} />
                  </Suspense>
                </div>
              );

            case "CUSTOM_STUDIO_EDITORIAL":
              return (
                <div key={widget.id} className="mx-auto w-full max-w-[1400px] px-4 md:px-8">
                  <Suspense fallback={<EditorialSkeleton />}>
                    <EditorialContainer
                      title={widget.title}
                      subtitle={widget.subtitle}
                      config={widget.config}
                    />
                  </Suspense>
                </div>
              );

            case "SELLER_BRAND_SPOTLIGHT":
              return (
                <div key={widget.id} className="mx-auto w-full max-w-[1400px] px-4 md:px-8">
                  <BrandSpotlightSection title={widget.title} subtitle={widget.subtitle} />
                </div>
              );

            case "FEATURED_PRODUCT_FEED":
              return (
                <div key={widget.id} className="mx-auto w-full max-w-[1400px] px-4 md:px-8">
                  <section className="mt-10 sm:mt-14 mb-14">
                    <OurProductsBanner
                      title={widget.title}
                      subtitle={widget.subtitle}
                      ctaLabel={widget.config?.cta_label || "Create"}
                      ctaHref={widget.config?.cta_href || "/customize"}
                    />

                    <Suspense
                      fallback={
                        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 min-[1920px]:grid-cols-6 lg:gap-5">
                          <ProductCardSkeleton count={10} />
                        </div>
                      }
                    >
                      <ProductFeedContainer brandParam={brandParam} />
                    </Suspense>

                    <div className="mt-12 flex justify-center">
                      <Link
                        href="/products"
                        className="group relative flex w-fit items-center gap-3 overflow-hidden rounded-full bg-white px-8 py-4 text-xs font-black uppercase tracking-[0.25em] text-black shadow-[0_0_25px_rgba(255,255,255,0.2)] transition-all hover:bg-neutral-200 hover:shadow-[0_0_35px_rgba(255,255,255,0.4)] active:scale-95 mx-auto"
                      >
                        <span>ALL COLLECTION</span>
                        <span className="text-lg transition-transform group-hover:translate-x-1">
                          →
                        </span>
                      </Link>
                    </div>
                  </section>
                </div>
              );

            case "RECENTLY_VIEWED":
              return (
                <div key={widget.id} className="mx-auto w-full max-w-[1400px] px-4 md:px-8">
                  <RecentlyViewedSection />
                </div>
              );

            default:
              return null;
          }
        })}
      </main>
      <Footer />
    </NativePlatformProvider>
  );
}
