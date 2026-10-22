import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BreadcrumbsNav } from "@/components/aeo/BreadcrumbsNav";
import { AeoAnswerBox } from "@/components/aeo/AeoAnswerBox";
import { DynamicFaqSection } from "@/components/aeo/DynamicFaqSection";
import { resolveCategoryAeo, CATEGORY_AEO_CATALOG } from "@/lib/aeo-geo/categoryAeo";
import { buildBreadcrumbSchema, buildFaqSchema } from "@/lib/aeo-geo/schemaGenerator";
import { createClient } from "@supabase/supabase-js";
import { Sparkles, ArrowRight, ShieldCheck, Tag, Ruler } from "lucide-react";
import { getProductDisplayPricing } from "@/lib/productPricing";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_A_URL || "https://qjpahzstldiatfbutvfc.supabase.co",
  (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_A_ANON_KEY || "placeholder_anon_key").trim()
);

export const revalidate = 120; // 2 min revalidation

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
      "streetwear"
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

async function getCategoryProducts(slug: string) {
  try {
    let keyword = "";
    if (slug.includes("polo")) keyword = "polo";
    else if (slug.includes("oversized")) keyword = "oversized";
    else if (slug.includes("hoodie")) keyword = "hoodie";
    else if (slug.includes("shirt")) keyword = "shirt";
    else keyword = "tee";

    const { data } = await supabase
      .from("products")
      .select("id, name, brand, price, mrp, image_url, images, is_active, stock, specifications, packages")
      .eq("is_active", true)
      .ilike("name", `%${keyword}%`)
      .limit(16);

    if (data && data.length > 0) return data;

    // Fallback: fetch recent active products
    const fallback = await supabase
      .from("products")
      .select("id, name, brand, price, mrp, image_url, images, is_active, stock, specifications, packages")
      .eq("is_active", true)
      .limit(12);

    return fallback.data || [];
  } catch {
    return [];
  }
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const category = resolveCategoryAeo(slug);
  const products = await getCategoryProducts(slug);

  const breadcrumbs = [
    { name: "Collections", url: "https://zebalpha.shop/products" },
    { name: category.name, url: category.canonicalUrl },
  ];

  const breadcrumbSchema = buildBreadcrumbSchema(breadcrumbs);
  const faqSchema = buildFaqSchema(category.faqs);

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${category.canonicalUrl}/#collection`,
    "name": category.h1,
    "description": category.shortDirectAnswer,
    "url": category.canonicalUrl,
    "mainEntity": {
      "@type": "ItemList",
      "itemListElement": products.map((p, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "url": `https://zebalpha.shop/products/${p.id}`,
        "name": p.name
      }))
    }
  };

  const jsonLdGraph = {
    "@context": "https://schema.org",
    "@graph": [
      breadcrumbSchema,
      collectionSchema,
      ...(faqSchema ? [faqSchema] : [])
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdGraph) }}
      />
      <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
        <Header title={category.name} subtitle="Canonical Category Hub ✦" />

        <main className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-10 pb-20">
          {/* Breadcrumbs */}
          <BreadcrumbsNav items={breadcrumbs} />

          {/* Category Header Hero */}
          <div className="space-y-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-neutral-300">
              <Tag className="h-3.5 w-3.5 text-white" />
              Category Collection
            </span>
            <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
              {category.h1}
            </h1>
            <p className="max-w-3xl text-sm sm:text-base leading-relaxed text-neutral-300 font-medium">
              {category.summary}
            </p>
          </div>

          {/* AEO Direct Answer Box */}
          <AeoAnswerBox
            title={`At a Glance: What Defines ZEBALPHA ${category.name}?`}
            directAnswer={category.shortDirectAnswer}
            highlightChips={[
              { label: "Dispatch", value: "24-48 Hours" },
              { label: "Exchange", value: "7 Days" },
              { label: "Shipping", value: "Free above ₹999" }
            ]}
          />

          {/* Key Characteristics & Guidance Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <section className="rounded-3xl border border-neutral-800 bg-neutral-950 p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-neutral-900">
                <Sparkles className="h-4 w-4 text-white" />
                <h2 className="text-base font-black text-white uppercase tracking-wider">
                  Key Technical Characteristics
                </h2>
              </div>
              <ul className="space-y-2.5 text-xs sm:text-sm text-neutral-300 font-medium">
                {category.keyCharacteristics.map((char, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="text-white font-black">✦</span>
                    <span>{char}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-3xl border border-neutral-800 bg-neutral-950 p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-neutral-900">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <h2 className="text-base font-black text-white uppercase tracking-wider">
                  Buying & Styling Guidance
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-medium">
                {category.buyingGuidance}
              </p>
              <div className="pt-3 border-t border-neutral-900/80 space-y-2">
                <p className="text-xs font-bold text-neutral-400">
                  <span className="text-white">Care Tip: </span>
                  {category.fabricAndCareTips}
                </p>
                <p className="text-xs font-bold text-neutral-400">
                  <span className="text-white">Sizing: </span>
                  {category.sizingGuidance}
                </p>
              </div>
            </section>
          </div>

          {/* Products Grid */}
          <section className="space-y-6 pt-6">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div>
                <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                  Available {category.name} ({products.length} Products)
                </h2>
                <p className="text-xs text-neutral-400 font-medium">
                  Direct from verified manufacturers and master craftsmen
                </p>
              </div>
              <Link
                href="/products"
                className="text-xs font-black uppercase text-white hover:underline flex items-center gap-1"
              >
                <span>View All Store</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            {products.length === 0 ? (
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-12 text-center text-neutral-400">
                New seasonal drops arriving soon for this category.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 min-[1920px]:grid-cols-6 lg:gap-5">
                {products.map((p) => {
                  const img = (Array.isArray(p.images) && p.images[0]) || p.image_url;
                  const { price: displayPrice, mrp: displayMrp, hasDiscount, discountPercent } = getProductDisplayPricing(p);
                  return (
                    <article
                      key={p.id}
                      className="group relative flex flex-col overflow-hidden rounded-2xl md:rounded-3xl bg-neutral-900/90 border border-neutral-800 shadow-xl transition-all duration-300 hover:-translate-y-1.5 hover:border-white/40"
                    >
                      <Link href={`/products/${p.id}`} className="block aspect-square w-full overflow-hidden bg-neutral-950 relative">
                        {img && (
                          <img
                            src={img}
                            alt={p.name}
                            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-108"
                            loading="lazy"
                          />
                        )}
                        {hasDiscount && (
                          <div className="absolute top-2.5 left-2.5 bg-white text-black font-black uppercase tracking-wider rounded-md px-2 py-0.5 text-[10px] shadow-lg">
                            {discountPercent}% OFF
                          </div>
                        )}
                      </Link>
                      <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-2">
                        <div>
                          <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400">
                            {p.brand || "ZEBALPHA"}
                          </p>
                          <Link href={`/products/${p.id}`}>
                            <h3 className="line-clamp-2 text-xs sm:text-sm font-bold text-white group-hover:text-neutral-300 transition-colors mt-0.5">
                              {p.name}
                            </h3>
                          </Link>
                        </div>
                        <div className="flex items-baseline gap-2 pt-1 border-t border-neutral-800/80">
                          <span className="text-sm sm:text-base font-black text-white">
                            ₹{displayPrice}
                          </span>
                          {hasDiscount && (
                            <span className="text-[10px] font-semibold text-neutral-500 line-through">
                              ₹{displayMrp}
                            </span>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Category FAQ Section */}
          <DynamicFaqSection
            title={`Frequently Asked Questions: ${category.name}`}
            subtitle="Verified answers on fit, fabrics, sizing, and styling guidance"
            faqs={category.faqs}
          />

          {/* Internal Linking Engine: Related Categories & Buying Guides */}
          <section className="rounded-3xl border border-neutral-800 bg-neutral-950 p-6 sm:p-8 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-[0.25em] text-neutral-400">
              Related Categories & Sizing Guides
            </h3>
            <div className="flex flex-wrap gap-3">
              {category.relatedCategories.map((rc, i) => (
                <Link
                  key={i}
                  href={`/category/${rc.slug}`}
                  className="rounded-full bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs font-bold px-4 py-2 hover:bg-white hover:text-black hover:border-white transition-all shadow-md"
                >
                  {rc.name} →
                </Link>
              ))}
              <Link
                href="/guides/t-shirt-size-guide"
                className="rounded-full bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs font-bold px-4 py-2 hover:bg-white hover:text-black hover:border-white transition-all shadow-md flex items-center gap-1.5"
              >
                <Ruler className="h-3 w-3" />
                <span>Garment Sizing Manual</span>
              </Link>
              <Link
                href="/guides/cotton-fabric-gsm-guide"
                className="rounded-full bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs font-bold px-4 py-2 hover:bg-white hover:text-black hover:border-white transition-all shadow-md"
              >
                Fabric GSM Guide
              </Link>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
}
