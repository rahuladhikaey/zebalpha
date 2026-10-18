import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BreadcrumbsNav } from "@/components/aeo/BreadcrumbsNav";
import { AeoAnswerBox } from "@/components/aeo/AeoAnswerBox";
import { DynamicFaqSection } from "@/components/aeo/DynamicFaqSection";
import { BUYING_GUIDES } from "@/lib/aeo-geo/buyingGuides";
import { buildBreadcrumbSchema, buildArticleSchema, buildFaqSchema } from "@/lib/aeo-geo/schemaGenerator";
import { BookOpen, Clock, Calendar, UserCheck, ArrowRight, ArrowLeft } from "lucide-react";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return Object.keys(BUYING_GUIDES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = BUYING_GUIDES[slug];

  if (!guide) {
    return {
      title: "Guide Not Found | ZEBALPHA",
      robots: { index: false, follow: false },
    };
  }

  return {
    title: guide.title,
    description: guide.metaDescription,
    alternates: {
      canonical: guide.canonicalUrl,
    },
    openGraph: {
      title: guide.title,
      description: guide.metaDescription,
      url: guide.canonicalUrl,
      siteName: "ZEBALPHA",
      type: "article",
      publishedTime: guide.publishedAt,
      modifiedTime: guide.modifiedAt,
      authors: [guide.author],
    },
    twitter: {
      card: "summary_large_image",
      title: guide.title,
      description: guide.metaDescription,
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

export default async function GuideDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const guide = BUYING_GUIDES[slug];

  if (!guide) {
    notFound();
  }

  const breadcrumbs = [
    { name: "Buying Guides", url: "/guides" },
    { name: guide.h1, url: guide.canonicalUrl },
  ];

  const breadcrumbSchema = buildBreadcrumbSchema(breadcrumbs);
  const articleSchema = buildArticleSchema(guide);
  const faqSchema = buildFaqSchema(guide.faqs);

  const jsonLdGraph = {
    "@context": "https://schema.org",
    "@graph": [
      breadcrumbSchema,
      articleSchema,
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
        <Header title="Buying Guide" subtitle="Apparel Insights ✦" />

        <main className="mx-auto max-w-[960px] px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-10 pb-24">
          <BreadcrumbsNav items={breadcrumbs} />

          <article className="space-y-8">
            {/* Header info */}
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-xs text-neutral-400 font-medium flex-wrap">
                <span className="flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-neutral-500" />
                  {guide.author}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-neutral-500" />
                  {guide.readingTime}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-neutral-500" />
                  Updated {new Date(guide.modifiedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white leading-tight">
                {guide.h1}
              </h1>
            </div>

            {/* AEO Short Direct Answer */}
            <AeoAnswerBox
              title="Key Takeaway / Direct Answer"
              directAnswer={guide.shortDirectAnswer}
              sourceLabel="EXPERT SUMMARY"
            />

            {/* Article Sections */}
            <div className="space-y-8 text-neutral-200 text-sm sm:text-base leading-relaxed font-normal">
              {guide.sections.map((section, idx) => (
                <section key={idx} className="space-y-4 pt-4 border-t border-neutral-900">
                  <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight">
                    {section.heading}
                  </h2>
                  <p className="text-neutral-300 leading-relaxed font-medium">
                    {section.content}
                  </p>

                  {section.table && (
                    <div className="mt-4 overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-950 p-4 shadow-lg">
                      <table className="w-full text-left text-xs sm:text-sm">
                        <thead>
                          <tr className="border-b border-neutral-800 text-[10px] font-black uppercase tracking-widest text-neutral-400">
                            {section.table.headers.map((h, i) => (
                              <th key={i} className="py-2.5 px-3">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-900 font-medium">
                          {section.table.rows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-neutral-900/50">
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="py-2.5 px-3 text-neutral-200">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              ))}
            </div>

            {/* FAQs */}
            <DynamicFaqSection
              title="Frequently Asked Questions"
              subtitle="Quick factual clarifications answered by our technical specialists"
              faqs={guide.faqs}
            />

            {/* Related Collections */}
            {guide.relatedCategorySlugs.length > 0 && (
              <section className="rounded-3xl border border-neutral-800 bg-neutral-950 p-6 sm:p-8 space-y-4">
                <h3 className="text-xs font-black uppercase tracking-[0.25em] text-neutral-400">
                  Related Collections to Explore
                </h3>
                <div className="flex flex-wrap gap-2.5">
                  {guide.relatedCategorySlugs.map((slug) => (
                    <Link
                      key={slug}
                      href={`/category/${slug}`}
                      className="rounded-full bg-neutral-900 border border-neutral-800 text-xs font-bold px-4 py-2 hover:bg-white hover:text-black hover:border-white transition-all shadow-md"
                    >
                      Shop {slug.replace(/-/g, " ")} →
                    </Link>
                  ))}
                  <Link
                    href="/guides"
                    className="rounded-full bg-white text-black text-xs font-black px-4 py-2 hover:bg-neutral-200 transition-colors"
                  >
                    All Guides
                  </Link>
                </div>
              </section>
            )}
          </article>
        </main>
        <Footer />
      </div>
    </>
  );
}
