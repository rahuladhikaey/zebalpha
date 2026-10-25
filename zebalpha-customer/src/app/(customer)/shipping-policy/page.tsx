import { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BreadcrumbsNav } from "@/components/aeo/BreadcrumbsNav";
import { AeoAnswerBox } from "@/components/aeo/AeoAnswerBox";
import { DynamicFaqSection } from "@/components/aeo/DynamicFaqSection";
import { ZEBALPHA_BRAND_ENTITY, BRAND_FACTS } from "@/lib/aeo-geo/brandEntity";
import { buildBreadcrumbSchema, buildFaqSchema } from "@/lib/aeo-geo/schemaGenerator";
import { Truck, Clock, ShieldCheck, MapPin } from "lucide-react";

export const metadata: Metadata = {
  title: "Shipping & Delivery Policy | ZEBALPHA",
  description: "Official ZEBALPHA shipping policy: 24-48 hour dispatch, pan-India delivery in 2-5 days across 19,000+ pincodes, and free shipping on orders over ₹999.",
  alternates: {
    canonical: "https://zebalpha.shop/shipping-policy",
  },
  openGraph: {
    title: "Shipping & Delivery Policy | ZEBALPHA",
    description: "Official ZEBALPHA shipping policy: 24-48 hour dispatch, pan-India delivery in 2-5 days across 19,000+ pincodes.",
    url: "https://zebalpha.shop/shipping-policy",
    siteName: "ZEBALPHA",
    locale: "en_IN",
    type: "website",
  },
};

const shippingFaqs = [
  {
    question: "How long does delivery take across India?",
    answer: "Orders are processed and dispatched within 24 to 48 hours. Metro cities typically receive deliveries within 2 to 3 business days; other regions across India take 3 to 5 business days."
  },
  {
    question: "What are the shipping charges?",
    answer: `Shipping is completely FREE on all prepaid and COD orders over ₹${ZEBALPHA_BRAND_ENTITY.freeShippingThreshold}. For orders below ₹${ZEBALPHA_BRAND_ENTITY.freeShippingThreshold}, a nominal delivery fee of ₹40 applies.`
  },
  {
    question: "Is Cash on Delivery (COD) available?",
    answer: "Yes, Cash on Delivery is supported across all serviceable Indian pincodes with no hidden handling surcharges."
  },
  {
    question: "How do I track my order in real-time?",
    answer: "Once dispatched, an automated tracking link with courier AWB details is sent via SMS and Email. You can also view live delivery milestones inside your Account > Order History."
  }
];

export default function ShippingPolicyPage() {
  const breadcrumbs = [
    { name: "Customer Support", url: "/contact" },
    { name: "Shipping & Delivery Policy", url: "https://zebalpha.shop/shipping-policy" }
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      buildBreadcrumbSchema(breadcrumbs),
      buildFaqSchema(shippingFaqs),
      {
        "@type": "WebPage",
        "@id": "https://zebalpha.shop/shipping-policy/#webpage",
        "url": "https://zebalpha.shop/shipping-policy",
        "name": "ZEBALPHA Shipping & Delivery Policy",
        "description": "Factual shipping policy and delivery estimates for ZEBALPHA apparel orders."
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
        <Header title="Shipping Policy" subtitle="Pan-India Logistics ✦" />

        <main className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-10 pb-24">
          <BreadcrumbsNav items={breadcrumbs} />

          <div className="space-y-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-neutral-300">
              <Truck className="h-3.5 w-3.5 text-white" />
              Pan-India Fulfillment
            </span>
            <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
              ZEBALPHA Shipping & Logistics Policy
            </h1>
            <p className="max-w-2xl text-sm sm:text-base leading-relaxed text-neutral-300 font-medium">
              We partner with India's leading surface and air logistics networks (BlueDart, Delhivery, and XpressBees) to deliver premium streetwear safely to your doorstep.
            </p>
          </div>

          <AeoAnswerBox
            title="Summary of Delivery Terms"
            directAnswer={`Orders placed on ZEBALPHA are dispatched within 24 to 48 business hours from our verified distribution hubs. Metro delivery takes 2 to 3 business days; rest of India takes 3 to 5 business days. Free shipping applies automatically on all orders exceeding ₹${ZEBALPHA_BRAND_ENTITY.freeShippingThreshold}.`}
            highlightChips={[
              { label: "Dispatch Window", value: "24-48h" },
              { label: "Delivery Window", value: "2-5 Days" },
              { label: "Free Shipping", value: `Orders > ₹${ZEBALPHA_BRAND_ENTITY.freeShippingThreshold}` },
              { label: "Coverage", value: "19,000+ PIN Codes" }
            ]}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-3xl border border-neutral-800 bg-neutral-950 p-6 space-y-3">
              <Clock className="h-6 w-6 text-white" />
              <h3 className="text-base font-black text-white uppercase">Fast Processing</h3>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-medium">
                Orders are verified, packed in tamper-proof waterproof packaging, and handed over to courier carriers within 1 to 2 business days.
              </p>
            </div>

            <div className="rounded-3xl border border-neutral-800 bg-neutral-950 p-6 space-y-3">
              <MapPin className="h-6 w-6 text-white" />
              <h3 className="text-base font-black text-white uppercase">Live Milestones</h3>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-medium">
                Track exact carrier milestones from pickup, air transit, out for delivery, and doorstep confirmation directly from your user dashboard.
              </p>
            </div>

            <div className="rounded-3xl border border-neutral-800 bg-neutral-950 p-6 space-y-3">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
              <h3 className="text-base font-black text-white uppercase">Insured Transit</h3>
              <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-medium">
                All shipments are 100% insured against loss or transit damage. Damaged packages qualify for immediate zero-cost replacement.
              </p>
            </div>
          </div>

          <DynamicFaqSection
            title="Shipping Frequently Asked Questions"
            subtitle="Verified answers on dispatch timeframes, pincode serviceability, and tracking"
            faqs={shippingFaqs}
          />
        </main>
        <Footer />
      </div>
    </>
  );
}
