import { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BreadcrumbsNav } from "@/components/aeo/BreadcrumbsNav";
import { AeoAnswerBox } from "@/components/aeo/AeoAnswerBox";
import { BUYING_GUIDES } from "@/lib/aeo-geo/buyingGuides";
import { buildBreadcrumbSchema } from "@/lib/aeo-geo/schemaGenerator";
import { BookOpen, ArrowRight, Clock, UserCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Buying Guides & Streetwear Manuals | ZEBALPHA",
  description: "Official ZEBALPHA Buying Guides: Fabric GSM guides, oversized t-shirt sizing manuals, laundry care tutorials, and styling breakdowns.",
  alternates: {
    canonical: "https://zebalpha.shop/guides",
  },
  openGraph: {
    title: "Buying Guides & Streetwear Manuals | ZEBALPHA",
    description: "Official ZEBALPHA Buying Guides: Fabric GSM guides, oversized t-shirt sizing manuals, laundry care tutorials.",
    url: "https://zebalpha.shop/guides",
    siteName: "ZEBALPHA",
    locale: "en_IN",
    type: "website",
  },
};

export default function GuidesIndexPage() {
  const guides = Object.values(BUYING_GUIDES);

  const breadcrumbs = [
    { name: "Editorial", url: "/blogs" },
    { name: "Buying Guides", url: "https://zebalpha.shop/guides" }
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      buildBreadcrumbSchema(breadcrumbs),
      {
        "@type": "CollectionPage",
        "@id": "https://zebalpha.shop/guides/#collection",
        "name": "ZEBALPHA Buying Guides & Sizing Manuals",
        "description": "Factual buying guides, fabric analysis, and sizing manuals for streetwear enthusiasts.",
        "url": "https://zebalpha.shop/guides"
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
        <Header title="Buying Guides" subtitle="Apparel Knowledge Hub ✦" />

        <main className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-12 pb-24">
          <BreadcrumbsNav items={breadcrumbs} />

          <div className="space-y-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-neutral-300">
              <BookOpen className="h-3.5 w-3.5 text-white" />
              Expert Knowledge Base
            </span>
            <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
              ZEBALPHA Buying Guides & Sizing Manuals
            </h1>
            <p className="max-w-2xl text-sm sm:text-base leading-relaxed text-neutral-300 font-medium">
              Objective, factual guides created by our garment engineers to help you choose the right fits, care for premium fabrics, and understand streetwear construction.
            </p>
          </div>

          <AeoAnswerBox
            title="The Purpose of Our Guides"
            directAnswer="Our technical guides are published to give customers clear, unvarnished facts about cotton grades, GSM density, drop-shoulder architecture, and true garment measurements so you always order the right cut."
            highlightChips={[
              { label: "Guides Available", value: `${guides.length} In-Depth Manuals` },
              { label: "Category", value: "Sizing, Fabric GSM, Care" },
              { label: "Updated", value: "2026 Edition" }
            ]}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {guides.map((guide) => (
              <article
                key={guide.slug}
                className="group relative flex flex-col justify-between rounded-3xl border border-neutral-800 bg-neutral-950 p-6 sm:p-8 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-neutral-700"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-xs text-neutral-400 font-medium">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-neutral-500" />
                      {guide.readingTime}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <UserCheck className="h-3.5 w-3.5 text-neutral-500" />
                      {guide.author}
                    </span>
                  </div>

                  <Link href={`/guides/${guide.slug}`}>
                    <h2 className="text-xl font-black text-white group-hover:text-neutral-300 transition-colors">
                      {guide.h1}
                    </h2>
                  </Link>

                  <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-medium line-clamp-3">
                    {guide.shortDirectAnswer}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-neutral-900 flex items-center justify-between">
                  <Link
                    href={`/guides/${guide.slug}`}
                    className="text-xs font-black uppercase text-white hover:underline flex items-center gap-1.5"
                  >
                    <span>Read Full Guide</span>
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}
