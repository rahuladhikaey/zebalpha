import { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BreadcrumbsNav } from "@/components/aeo/BreadcrumbsNav";
import { AeoAnswerBox } from "@/components/aeo/AeoAnswerBox";
import { DynamicFaqSection } from "@/components/aeo/DynamicFaqSection";
import { buildBreadcrumbSchema, buildFaqSchema } from "@/lib/aeo-geo/schemaGenerator";
import { Ruler, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Official Sizing & Measurement Guide | ZEBALPHA",
  description: "Accurate garment size charts for ZEBALPHA t-shirts, oversized tees, polos, and hoodies. Detailed chest, shoulder, and length measurements in inches and cm.",
  alternates: {
    canonical: "https://zebalpha.shop/size-guide",
  },
  openGraph: {
    title: "Official Sizing & Measurement Guide | ZEBALPHA",
    description: "Accurate garment size charts for ZEBALPHA t-shirts, oversized tees, polos, and hoodies.",
    url: "https://zebalpha.shop/size-guide",
    siteName: "ZEBALPHA",
    locale: "en_IN",
    type: "website",
  },
};

const sizeGuideFaqs = [
  {
    question: "How do I know if I should order S, M, L, XL or XXL?",
    answer: "Measure the fullest circumference of your body chest. If your body chest is 38 inches, order Size S (40\" garment chest) for a classic fit. For an intentional oversized streetwear drape, order your true size M (44\" oversized chest). All dimensions are detailed in our sizing tables."
  },
  {
    question: "Are oversized t-shirt sizes larger than standard t-shirt sizes?",
    answer: "Yes. An oversized t-shirt has 4 to 6 inches of additional chest ease and dropped shoulder seams compared to a regular t-shirt of the same label size. You do NOT need to size up."
  },
  {
    question: "What if the size I ordered doesn't fit?",
    answer: "ZEBALPHA offers free 7-day size exchanges. We arrange doorstep pickup of your original item and dispatch the replacement size at zero additional cost."
  }
];

export default function SizeGuidePage() {
  const breadcrumbs = [
    { name: "Customer Support", url: "/contact" },
    { name: "Size Guide", url: "https://zebalpha.shop/size-guide" }
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      buildBreadcrumbSchema(breadcrumbs),
      buildFaqSchema(sizeGuideFaqs),
      {
        "@type": "WebPage",
        "@id": "https://zebalpha.shop/size-guide/#webpage",
        "url": "https://zebalpha.shop/size-guide",
        "name": "ZEBALPHA Apparel Sizing & Fit Guide",
        "description": "Comprehensive garment measurement tables and fitting instructions for ZEBALPHA collections."
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
        <Header title="Size Guide" subtitle="Garment Measurement Manual ✦" />

        <main className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-12 pb-24">
          <BreadcrumbsNav items={breadcrumbs} />

          <div className="space-y-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-neutral-300">
              <Ruler className="h-3.5 w-3.5 text-white" />
              Technical Fit Manual
            </span>
            <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
              ZEBALPHA Sizing & Measurement Guide
            </h1>
            <p className="max-w-3xl text-sm sm:text-base leading-relaxed text-neutral-300 font-medium">
              Every ZEBALPHA garment is cut with precision architecture. Use the exact garment measurement tables below to find your ideal fit.
            </p>
          </div>

          <AeoAnswerBox
            title="Direct Sizing Recommendation"
            directAnswer="For regular fit t-shirts, polos, and shirts: select your exact body chest measurement with 2-3 inches of ease. For oversized streetwear tees and hoodies: select your standard true size; the garment is already engineered with 4-6 inches of relaxed chest ease and dropped shoulders."
            highlightChips={[
              { label: "Free Exchanges", value: "7 Days" },
              { label: "Unit", value: "Inches (Garment Dimension)" },
              { label: "Accuracy", value: "+/- 0.5 in tolerance" }
            ]}
          />

          {/* Table 1: Oversized T-Shirts (240+ GSM) */}
          <section className="space-y-4 rounded-3xl border border-neutral-800 bg-neutral-950 p-6 sm:p-8 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-900 flex-wrap gap-2">
              <div>
                <h2 className="text-lg sm:text-xl font-black uppercase text-white">
                  1. Oversized Streetwear T-Shirts (240+ GSM Heavyweight)
                </h2>
                <p className="text-xs text-neutral-400 font-medium">
                  Engineered with drop shoulders and architectural boxy drape
                </p>
              </div>
              <Link
                href="/category/oversized-t-shirts"
                className="text-xs font-black text-white hover:underline flex items-center gap-1"
              >
                <span>Shop Oversized</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-neutral-800 text-[10px] font-black uppercase tracking-widest text-neutral-400">
                    <th className="py-3 pr-4">Label Size</th>
                    <th className="py-3 px-4">Garment Chest (in)</th>
                    <th className="py-3 px-4">Length (in)</th>
                    <th className="py-3 px-4">Shoulder Drop (in)</th>
                    <th className="py-3 pl-4">Fits Body Chest</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900 font-medium">
                  <tr>
                    <td className="py-3 pr-4 font-black text-white">S</td>
                    <td className="py-3 px-4 text-neutral-200">42"</td>
                    <td className="py-3 px-4 text-neutral-200">28"</td>
                    <td className="py-3 px-4 text-neutral-200">21"</td>
                    <td className="py-3 pl-4 text-emerald-400 font-bold">36" - 38"</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-black text-white">M</td>
                    <td className="py-3 px-4 text-neutral-200">44"</td>
                    <td className="py-3 px-4 text-neutral-200">29"</td>
                    <td className="py-3 px-4 text-neutral-200">22"</td>
                    <td className="py-3 pl-4 text-emerald-400 font-bold">38" - 40"</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-black text-white">L</td>
                    <td className="py-3 px-4 text-neutral-200">46"</td>
                    <td className="py-3 px-4 text-neutral-200">30"</td>
                    <td className="py-3 px-4 text-neutral-200">23"</td>
                    <td className="py-3 pl-4 text-emerald-400 font-bold">40" - 42"</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-black text-white">XL</td>
                    <td className="py-3 px-4 text-neutral-200">48"</td>
                    <td className="py-3 px-4 text-neutral-200">31"</td>
                    <td className="py-3 px-4 text-neutral-200">24"</td>
                    <td className="py-3 pl-4 text-emerald-400 font-bold">42" - 44"</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-black text-white">XXL</td>
                    <td className="py-3 px-4 text-neutral-200">50"</td>
                    <td className="py-3 px-4 text-neutral-200">32"</td>
                    <td className="py-3 px-4 text-neutral-200">25"</td>
                    <td className="py-3 pl-4 text-emerald-400 font-bold">44" - 46"</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Table 2: Regular & Zip Polos */}
          <section className="space-y-4 rounded-3xl border border-neutral-800 bg-neutral-950 p-6 sm:p-8 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-900 flex-wrap gap-2">
              <div>
                <h2 className="text-lg sm:text-xl font-black uppercase text-white">
                  2. Textured Zip Polos & Classic T-Shirts
                </h2>
                <p className="text-xs text-neutral-400 font-medium">
                  Tailored clean silhouette with natural shoulder seam placement
                </p>
              </div>
              <Link
                href="/category/polos"
                className="text-xs font-black text-white hover:underline flex items-center gap-1"
              >
                <span>Shop Polos</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-neutral-800 text-[10px] font-black uppercase tracking-widest text-neutral-400">
                    <th className="py-3 pr-4">Label Size</th>
                    <th className="py-3 px-4">Garment Chest (in)</th>
                    <th className="py-3 px-4">Length (in)</th>
                    <th className="py-3 px-4">Shoulder (in)</th>
                    <th className="py-3 pl-4">Sleeve (in)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-900 font-medium">
                  <tr>
                    <td className="py-3 pr-4 font-black text-white">S</td>
                    <td className="py-3 px-4 text-neutral-200">38"</td>
                    <td className="py-3 px-4 text-neutral-200">27.5"</td>
                    <td className="py-3 px-4 text-neutral-200">17.5"</td>
                    <td className="py-3 pl-4 text-neutral-200">8"</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-black text-white">M</td>
                    <td className="py-3 px-4 text-neutral-200">40"</td>
                    <td className="py-3 px-4 text-neutral-200">28.5"</td>
                    <td className="py-3 px-4 text-neutral-200">18.5"</td>
                    <td className="py-3 pl-4 text-neutral-200">8.5"</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-black text-white">L</td>
                    <td className="py-3 px-4 text-neutral-200">42"</td>
                    <td className="py-3 px-4 text-neutral-200">29.5"</td>
                    <td className="py-3 px-4 text-neutral-200">19.5"</td>
                    <td className="py-3 pl-4 text-neutral-200">9"</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-black text-white">XL</td>
                    <td className="py-3 px-4 text-neutral-200">44"</td>
                    <td className="py-3 px-4 text-neutral-200">30.5"</td>
                    <td className="py-3 px-4 text-neutral-200">20.5"</td>
                    <td className="py-3 pl-4 text-neutral-200">9.5"</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-black text-white">XXL</td>
                    <td className="py-3 px-4 text-neutral-200">46"</td>
                    <td className="py-3 px-4 text-neutral-200">31.5"</td>
                    <td className="py-3 px-4 text-neutral-200">21.5"</td>
                    <td className="py-3 pl-4 text-neutral-200">10"</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Sizing FAQ */}
          <DynamicFaqSection
            title="Sizing Frequently Asked Questions"
            subtitle="Verified advice on measurements, ease, and exchange guarantee"
            faqs={sizeGuideFaqs}
          />
        </main>
        <Footer />
      </div>
    </>
  );
}
