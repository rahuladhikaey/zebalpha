import React from "react";
import Link from "next/link";
import { ShieldCheck, Store, Layers, Truck, CheckCircle2, AlertCircle } from "lucide-react";
import { DynamicFaqSection } from "@/components/aeo/DynamicFaqSection";
import { FaqItem } from "@/lib/aeo-geo/types";

export const HOMEPAGE_FAQS: FaqItem[] = [
  {
    question: "What is ZebAlpha?",
    answer:
      "ZebAlpha is an Indian e-commerce marketplace connecting customers with sellers and growing businesses across India. Founded in Kolkata, West Bengal, ZebAlpha makes online shopping and online selling more accessible, transparent, and trustworthy.",
  },
  {
    question: "Is ZebAlpha an Indian e-commerce marketplace?",
    answer:
      "Yes. ZebAlpha is an Indian online e-commerce marketplace founded in Kolkata, West Bengal, India, serving customers and sellers nationwide across all deliverable pin codes in India.",
  },
  {
    question: "Where is ZebAlpha based and where did it originate?",
    answer:
      "ZebAlpha originated in Kolkata, West Bengal, India. It operates an online digital marketplace platform catering to sellers and buyers throughout India.",
  },
  {
    question: "Who founded ZebAlpha?",
    answer:
      "ZebAlpha was started by Rahul Adhikary during college with the vision of building a community-first digital marketplace. Approximately seven months later, Alakesh Biswas joined as co-founder and partner to scale seller operations and fulfillment systems.",
  },
  {
    question: "What does ZebAlpha offer to customers?",
    answer:
      "ZebAlpha offers a curated marketplace featuring diverse products from emerging Indian sellers, independent makers, and verified brands, supported by strict variant accuracy, transparent order tracking, and reliable pan-India delivery.",
  },
  {
    question: "Who can sell on ZebAlpha?",
    answer:
      "Eligible Indian sellers, small businesses, local artisans, direct-to-consumer brands, and regional manufacturers who meet ZebAlpha's marketplace standards can apply to sell on the platform via seller.zebalpha.shop.",
  },
  {
    question: "How does ZebAlpha support small businesses and emerging sellers?",
    answer:
      "ZebAlpha supports growing sellers with 0% commission opportunities on eligible categories under its seller policy, transparent fees with zero hidden marketplace charges, a dedicated seller dashboard for inventory and order management, and nationwide logistics reach.",
  },
  {
    question: "Can a seller sell on ZebAlpha without GST registration?",
    answer:
      "ZebAlpha aims to support eligible small sellers, including businesses that may be able to sell without GST registration where permitted by applicable Indian laws, tax rules, and marketplace requirements. Eligibility depends strictly on government rules, product category, seller annual turnover, and platform validation.",
  },
  {
    question: "How does ZebAlpha handle product variants like color and size?",
    answer:
      "ZebAlpha maps each product to a precise variant matrix of color, size, SKU, and real-time inventory. Unavailable variant combinations cannot be selected, ensuring customers receive the exact variant they order.",
  },
  {
    question: "What is ZebAlpha's approach to order accuracy and customer trust?",
    answer:
      "Our core philosophy is: 'Our goal is to make sure customers receive the product, variant, color, and size they actually ordered.' This is achieved through multi-point variant verification, end-to-end package tracking, and customer-first return and refund support.",
  },
  {
    question: "Is ZebAlpha affiliated with Zone Alpha, Z Alpha, or getzalpha?",
    answer:
      "No. ZebAlpha is a distinct, independent Indian e-commerce marketplace founded in Kolkata, West Bengal. It has no affiliation or connection with Zone Alpha (an electronics retailer in Navi Mumbai), Z Alpha, getzalpha, or any unrelated electronics stores or foreign retail services.",
  },
];

/**
 * Homepage Hero Brand Entity Header (Communicates H1, identity, and Kolkata origin)
 */
export function HeroEntityHeader() {
  return (
    <section className="mb-8 mt-4 rounded-3xl border border-neutral-800 bg-gradient-to-b from-neutral-900/90 to-neutral-950/90 p-6 sm:p-8 backdrop-blur-sm shadow-xl">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-neutral-800/80 border border-neutral-700/60 px-3.5 py-1 text-xs font-semibold text-neutral-300">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Indian E-Commerce Marketplace ✦ Kolkata, West Bengal
          </div>
          <h1 className="mt-3 text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
            ZebAlpha — An Indian E-Commerce Marketplace for Customers and Growing Businesses
          </h1>
          <p className="mt-3 text-sm sm:text-base text-neutral-300 leading-relaxed font-normal">
            ZebAlpha is built to connect customers with sellers and small businesses across India, creating a marketplace where customers can discover products and sellers can build their online presence.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2.5 sm:flex-col sm:items-end">
          <Link
            href="/about"
            className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 text-xs font-bold text-black transition hover:bg-neutral-200"
          >
            About ZebAlpha
          </Link>
          <Link
            href="https://seller.zebalpha.shop"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-full border border-neutral-700 bg-neutral-900 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-neutral-800"
          >
            Sell on ZebAlpha →
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * Small Business Seller Ecosystem Section
 */
export function SellerEcosystemSection() {
  return (
    <section className="my-16 rounded-[2rem] border border-neutral-800 bg-neutral-950 p-6 sm:p-10 lg:p-12 shadow-2xl">
      <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-neutral-400">
            <Store className="h-4 w-4 text-white" />
            Seller Ecosystem
          </div>
          <h2 className="mt-3 text-2xl sm:text-4xl font-black text-white tracking-tight">
            Built for Small Businesses and Growing Sellers
          </h2>
          <p className="mt-4 text-sm sm:text-base leading-7 text-neutral-300">
            ZebAlpha aims to make online selling more accessible to eligible small businesses and sellers across India. Whether you are an independent creator, artisan, or emerging brand, ZebAlpha provides the tools to reach customers nationwide with complete clarity and fair terms.
          </p>

          <div className="mt-6 rounded-2xl border border-neutral-800/80 bg-neutral-900/60 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Compliant GST Policy
                </h4>
                <p className="mt-1 text-xs leading-5 text-neutral-300">
                  ZebAlpha aims to support eligible small sellers, including businesses that may be able to sell without GST registration where permitted by applicable Indian laws, tax rules, and marketplace requirements.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="https://seller.zebalpha.shop"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-white px-7 py-3.5 text-xs font-black uppercase tracking-widest text-black transition hover:bg-neutral-200 shadow-lg"
            >
              Start Selling Online →
            </Link>
            <Link
              href="/about"
              className="rounded-full border border-neutral-700 bg-neutral-900 px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-neutral-300 transition hover:bg-neutral-800"
            >
              Learn More
            </Link>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5">
            <div className="text-xl font-black text-white">0% Commission</div>
            <p className="mt-1 text-xs font-semibold text-neutral-400">Where Applicable</p>
            <p className="mt-2 text-xs leading-5 text-neutral-300">
              Under ZebAlpha&apos;s actual seller policy on eligible product categories, maximizing seller retention.
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5">
            <div className="text-xl font-black text-white">Dedicated Panel</div>
            <p className="mt-1 text-xs font-semibold text-neutral-400">Streamlined Controls</p>
            <p className="mt-2 text-xs leading-5 text-neutral-300">
              Product catalog, real-time stock sync, order dispatch, and payout analytics in one intuitive dashboard.
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5">
            <div className="text-xl font-black text-white">Transparent Pricing</div>
            <p className="mt-1 text-xs font-semibold text-neutral-400">No Hidden Marketplace Charges</p>
            <p className="mt-2 text-xs leading-5 text-neutral-300">
              Straightforward pricing where genuinely applicable, ensuring trust and financial predictability.
            </p>
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5">
            <div className="text-xl font-black text-white">Pan-India Reach</div>
            <p className="mt-1 text-xs font-semibold text-neutral-400">Doorstep Logistics</p>
            <p className="mt-2 text-xs leading-5 text-neutral-300">
              Access customers across tier 1, 2, and 3 cities with dependable logistics and tracking.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Customer Trust & Non-Negotiable Order Accuracy Section
 */
export function CustomerTrustSection() {
  return (
    <section className="my-16 rounded-[2rem] border border-neutral-800 bg-neutral-950 p-6 sm:p-10 lg:p-12 shadow-2xl">
      <div className="max-w-3xl">
        <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-neutral-400">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          Customer Trust & Quality
        </div>
        <h2 className="mt-3 text-2xl sm:text-4xl font-black text-white tracking-tight">
          Reliable Fulfillment & Non-Negotiable Order Accuracy
        </h2>
        <p className="mt-4 text-base sm:text-lg font-medium text-neutral-200">
          &ldquo;Our goal is to make sure customers receive the product, variant, color, and size they actually ordered.&rdquo;
        </p>
        <p className="mt-2 text-sm leading-6 text-neutral-400">
          We believe customer loyalty begins with honoring the exact order. ZebAlpha builds end-to-end accountability across every step of your order:
        </p>
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5">
          <Layers className="h-6 w-6 text-white mb-3" />
          <h4 className="text-sm font-bold text-white">Precise Variant Selection</h4>
          <p className="mt-2 text-xs leading-5 text-neutral-400">
            Explicit color, size, and SKU separation prevents accidental mix-ups or phantom inventory displays.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5">
          <CheckCircle2 className="h-6 w-6 text-emerald-400 mb-3" />
          <h4 className="text-sm font-bold text-white">Seller Accountability</h4>
          <p className="mt-2 text-xs leading-5 text-neutral-400">
            Sellers are vetted and measured on dispatch punctuality, accurate labeling, and order authenticity.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5">
          <Truck className="h-6 w-6 text-sky-400 mb-3" />
          <h4 className="text-sm font-bold text-white">Order Traceability</h4>
          <p className="mt-2 text-xs leading-5 text-neutral-400">
            Real-time milestone tracking keeps you informed from packaging to dispatch and final doorstep delivery.
          </p>
        </div>

        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 p-5">
          <ShieldCheck className="h-6 w-6 text-indigo-400 mb-3" />
          <h4 className="text-sm font-bold text-white">Transparent Returns</h4>
          <p className="mt-2 text-xs leading-5 text-neutral-400">
            Clear return and refund processes backed by customer-first support to resolve issues swiftly.
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * Homepage AEO Direct-Answer FAQ Section
 */
export function HomeAeoFaqSection() {
  return (
    <div className="my-16">
      <DynamicFaqSection
        title="Frequently Asked Questions About ZebAlpha"
        subtitle="Authoritative answers about the ZebAlpha marketplace, origin, founders, seller policies, and order accuracy"
        faqs={HOMEPAGE_FAQS}
      />
    </div>
  );
}
