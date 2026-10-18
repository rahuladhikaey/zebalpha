import { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BreadcrumbsNav } from "@/components/aeo/BreadcrumbsNav";
import { AeoAnswerBox } from "@/components/aeo/AeoAnswerBox";
import { DynamicFaqSection } from "@/components/aeo/DynamicFaqSection";
import { ZEBALPHA_BRAND_ENTITY } from "@/lib/aeo-geo/brandEntity";
import { buildBreadcrumbSchema, buildFaqSchema } from "@/lib/aeo-geo/schemaGenerator";
import { RotateCcw, CheckCircle2, ShieldCheck, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Return & Exchange Policy | ZEBALPHA",
  description: "Official ZEBALPHA 7-day return and exchange policy: zero hassle doorstep reverse pickup, quick size exchanges, and rapid refund timelines.",
  alternates: {
    canonical: "https://zebalpha.shop/return-policy",
  },
  openGraph: {
    title: "Return & Exchange Policy | ZEBALPHA",
    description: "Official ZEBALPHA 7-day return and exchange policy: zero hassle doorstep reverse pickup.",
    url: "https://zebalpha.shop/return-policy",
    siteName: "ZEBALPHA",
    locale: "en_IN",
    type: "website",
  },
};

const returnFaqs = [
  {
    question: "What is the return and exchange window on ZEBALPHA?",
    answer: "You can request a return or size exchange within 7 calendar days from the date the order is marked as delivered by the courier."
  },
  {
    question: "What conditions must the returned garment meet?",
    answer: "Garments must be unworn, unwashed, unaltered, and returned in their original packaging with all brand tags and barcode labels intact."
  },
  {
    question: "How does the reverse pickup process work?",
    answer: "Once requested in your Account > Orders dashboard, a courier partner will arrive at your pickup address within 24 to 48 hours to collect the securely sealed parcel."
  },
  {
    question: "How and when are refunds issued?",
    answer: "Prepaid orders are refunded back to the original source account (UPI, Credit/Debit card, Netbanking) within 48 to 72 hours of receiving and inspecting the item at our warehouse. COD orders are refunded directly via instant UPI or IMPS bank transfer."
  }
];

export default function ReturnPolicyPage() {
  const breadcrumbs = [
    { name: "Customer Support", url: "/contact" },
    { name: "Return & Refund Policy", url: "https://zebalpha.shop/return-policy" }
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      buildBreadcrumbSchema(breadcrumbs),
      buildFaqSchema(returnFaqs),
      {
        "@type": "WebPage",
        "@id": "https://zebalpha.shop/return-policy/#webpage",
        "url": "https://zebalpha.shop/return-policy",
        "name": "ZEBALPHA Returns & Exchange Policy",
        "description": "Factual return and exchange rules for ZEBALPHA apparel orders."
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
        <Header title="Return Policy" subtitle="7-Day Guarantee ✦" />

        <main className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-10 pb-24">
          <BreadcrumbsNav items={breadcrumbs} />

          <div className="space-y-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-neutral-300">
              <RotateCcw className="h-3.5 w-3.5 text-white" />
              Customer Protection
            </span>
            <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
              ZEBALPHA 7-Day Return & Exchange Policy
            </h1>
            <p className="max-w-2xl text-sm sm:text-base leading-relaxed text-neutral-300 font-medium">
              We stand behind the craftsmanship of every garment. If the size isn't ideal or you are not completely satisfied, we provide seamless exchanges and straightforward refunds.
            </p>
          </div>

          <AeoAnswerBox
            title="Summary of Return Terms"
            directAnswer={`Customers can initiate a return or size exchange within ${ZEBALPHA_BRAND_ENTITY.returnWindowDays} days of delivery directly through their order dashboard. Doorstep reverse pickup is scheduled automatically within 24-48 hours. Refunds are credited within 48-72 hours post quality verification.`}
            highlightChips={[
              { label: "Window", value: `${ZEBALPHA_BRAND_ENTITY.returnWindowDays} Days from Delivery` },
              { label: "Reverse Pickup", value: "Doorstep Collection" },
              { label: "Refund Timeline", value: "48-72 Hours" },
              { label: "Exchange Fee", value: "₹0 (Free Size Exchange)" }
            ]}
          />

          {/* 3 Step Process */}
          <section className="space-y-6">
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
              How to Return or Exchange in 3 Simple Steps
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="rounded-3xl border border-neutral-800 bg-neutral-950 p-6 space-y-3">
                <span className="text-2xl font-black text-white">01</span>
                <h3 className="text-base font-black text-white uppercase">Request Online</h3>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-medium">
                  Go to <Link href="/profile/orders" className="text-white underline">My Orders</Link>, select your order item, and choose "Exchange Size" or "Return for Refund".
                </p>
              </div>

              <div className="rounded-3xl border border-neutral-800 bg-neutral-950 p-6 space-y-3">
                <span className="text-2xl font-black text-white">02</span>
                <h3 className="text-base font-black text-white uppercase">Doorstep Pickup</h3>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-medium">
                  Pack the unwashed item in its original bag with tags attached. Our courier agent will pick it up directly from your shipping address.
                </p>
              </div>

              <div className="rounded-3xl border border-neutral-800 bg-neutral-950 p-6 space-y-3">
                <span className="text-2xl font-black text-emerald-400">03</span>
                <h3 className="text-base font-black text-white uppercase">Instant Fulfillment</h3>
                <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-medium">
                  Exchanged sizes are dispatched immediately. For returns, refunds are credited within 48-72 hours via original payment or direct UPI.
                </p>
              </div>
            </div>
          </section>

          <DynamicFaqSection
            title="Return Policy Frequently Asked Questions"
            subtitle="Verified answers on exchange guidelines, reverse courier timelines, and refund methods"
            faqs={returnFaqs}
          />
        </main>
        <Footer />
      </div>
    </>
  );
}
