import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Footer } from "@/components/Footer";
import { DynamicFaqSection } from "@/components/aeo/DynamicFaqSection";
import { resolveCategoryAeo, CATEGORY_AEO_CATALOG } from "@/lib/aeo-geo/categoryAeo";
import { buildBreadcrumbSchema, buildFaqSchema } from "@/lib/aeo-geo/schemaGenerator";
import { loadCategoryStorefrontData } from "@/lib/categoryStorefrontLoader";
import { CategoryStorefrontClient } from "@/components/category-storefront/CategoryStorefrontClient";
import { ShieldCheck } from "lucide-react";

export const revalidate = 60; // 1 min ISR so Superadmin SDUI updates go live rapidly

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return Object.keys(CATEGORY_AEO_CATALOG).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = resolveCategoryAeo(slug);

  return {
    title: `${category.h1} | ZEBALPHA`,
    description: category.shortDirectAnswer,
    alternates: {
      canonical: category.canonicalUrl,
    },
    keywords: [
      category.name,
      ...category.availableTypes,
      ...category.keyCharacteristics,
      "ZEBALPHA",
      "buy online India",
    ],
    openGraph: {
      title: `${category.h1} | ZEBALPHA`,
      description: category.shortDirectAnswer,
      url: category.canonicalUrl,
      siteName: "ZEBALPHA",
      locale: "en_IN",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${category.h1} | ZEBALPHA`,
      description: category.shortDirectAnswer,
    },
    robots: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  };
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const storefrontData = await loadCategoryStorefrontData(slug, 1, 24);
  if (!storefrontData) {
    notFound();
  }

  const aeoCategory = resolveCategoryAeo(slug);
  const displayName = storefrontData.category.name || aeoCategory.name;

  const breadcrumbs = [
    { name: "Home", url: "https://zebalpha.shop" },
    { name: displayName, url: aeoCategory.canonicalUrl },
  ];

  const breadcrumbSchema = buildBreadcrumbSchema(breadcrumbs);
  const faqSchema = buildFaqSchema(aeoCategory.faqs);

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${aeoCategory.canonicalUrl}/#collection`,
    name: `${displayName} Store | ZEBALPHA`,
    description: aeoCategory.shortDirectAnswer,
    url: aeoCategory.canonicalUrl,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: storefrontData.paginatedProducts.slice(0, 20).map((p, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `https://zebalpha.shop/products/${p.id}`,
        name: p.name,
      })),
    },
  };

  const jsonLdGraph = {
    "@context": "https://schema.org",
    "@graph": [breadcrumbSchema, collectionSchema, ...(faqSchema ? [faqSchema] : [])],
  };

  const seoGuideSlot = (
    <div className="space-y-6 text-zinc-700">
      <div>
        <h1 className="text-lg sm:text-xl font-black text-zinc-950">{aeoCategory.h1}</h1>
        <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-zinc-600">
          {aeoCategory.summary}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 space-y-2">
          <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
            Key Highlights
          </h3>
          <ul className="space-y-1.5 text-xs text-zinc-600">
            {aeoCategory.keyCharacteristics.map((char, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="font-black text-zinc-900">•</span>
                <span>{char}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 space-y-2">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-900">
              Buying & Care Guide
            </h3>
          </div>
          <p className="text-xs text-zinc-600 leading-relaxed">{aeoCategory.buyingGuidance}</p>
          <p className="text-xs text-zinc-600">
            <strong className="text-zinc-900">Sizing:</strong> {aeoCategory.sizingGuidance}
          </p>
        </div>
      </div>

      {aeoCategory.faqs && aeoCategory.faqs.length > 0 && (
        <div className="rounded-2xl bg-zinc-950 p-4 text-white">
          <DynamicFaqSection faqs={aeoCategory.faqs} />
        </div>
      )}
    </div>
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdGraph) }}
      />
      <CategoryStorefrontClient data={storefrontData} seoGuideSlot={seoGuideSlot} />
      <Footer />
    </>
  );
}
