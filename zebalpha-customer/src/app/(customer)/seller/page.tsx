import Link from "next/link";
import { Header } from "@/components/Header";
import { Metadata } from "next";
import {
  Store,
  Percent,
  CheckCircle2,
  TrendingUp,
  Package,
  Layers,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
} from "lucide-react";
import {
  buildOrganizationSchema,
  buildBreadcrumbSchema,
  buildFaqSchema,
} from "@/lib/aeo-geo/schemaGenerator";
import { ZEBALPHA_STRATEGY } from "@/lib/aeo-geo/brandEntity";

export const metadata: Metadata = {
  title: "Sell on ZebAlpha | 0% Commission, Brand Storefront & Creator-Led Growth",
  description:
    "Sell online on ZebAlpha — India's discovery-led marketplace for home-based businesses, Instagram/WhatsApp sellers, artisans, local boutiques, small manufacturers & emerging brands with 0% core commission, creator discovery & 5-day UPI payouts.",
  alternates: {
    canonical: "https://zebalpha.shop/seller",
  },
  openGraph: {
    title: "Sell on ZebAlpha | 0% Commission, Brand Storefront & Creator-Led Growth",
    description:
      "Turn your listings into a real brand on ZebAlpha: 0% core commission, dedicated brand storefronts, micro-influencer campaigns, Enrolment ID onboarding & 5-day direct UPI payouts across 28,000+ PIN codes.",
    url: "https://zebalpha.shop/seller",
    siteName: "ZebAlpha",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/official-logo.png",
        width: 1200,
        height: 630,
        alt: "Sell on ZebAlpha - Discovery-Led Indian E-Commerce Marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sell on ZebAlpha | 0% Commission & Emerging Brands Growth Partner",
    description:
      "Built for small sellers & emerging Indian brands: 0% core commission, brand storefronts, creator-led discovery, and 5-day direct UPI payouts.",
    images: ["/official-logo.png"],
  },
};

const SELLER_FAQS = [
  {
    question: "Who can sell on ZebAlpha?",
    answer:
      "ZebAlpha is purpose-built for 6 priority seller groups across India: Home-Based Businesses, Instagram & WhatsApp Social Sellers, Handmade Makers & Artisans, Local Boutiques, Small Manufacturers, and Emerging Indian D2C Brands.",
  },
  {
    question: "How is selling on ZebAlpha different from Meesho or Flipkart?",
    answer:
      "While 0% commission is also offered by value platforms like Meesho, 0% alone doesn't build a brand. ZebAlpha pairs 0% core commission for eligible sellers with dedicated brand storefronts, founder storytelling, creator-led micro-influencer campaigns, fair discovery for new quality sellers, and actionable performance analytics — helping you build repeat customers instead of fighting anonymous price wars.",
  },
  {
    question: "What is the ZebAlpha Emerging Brands Programme?",
    answer:
      "The ZebAlpha Emerging Brands Programme turns a basic product listing into a brand journey through dedicated brand storefronts, curated collections, founder storytelling, trackable micro-creator collaborations, seller analytics, and fair discovery rules for quality young Indian labels.",
  },
  {
    question: "What documents are needed to start selling on ZebAlpha?",
    answer:
      "Eligible small sellers can get started quickly with their free 15-character Enrolment ID, verified email address, pickup address, and UPI ID — with fast 5-day direct UPI payouts and zero hidden marketplace deductions.",
  },
];

export default function SellerPage() {
  const breadcrumbs = [
    { name: "Home", url: "https://zebalpha.shop" },
    { name: "Sell on ZebAlpha", url: "https://zebalpha.shop/seller" },
  ];

  const sellerWebPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": "https://zebalpha.shop/seller#webpage",
    name: "Sell on ZebAlpha | 0% Commission, Brand Storefront & Creator-Led Growth",
    url: "https://zebalpha.shop/seller",
    description:
      "Sell online on ZebAlpha — India's discovery-led marketplace for home-based businesses, social sellers, artisans, local boutiques, small manufacturers, and emerging Indian brands.",
    isPartOf: {
      "@type": "WebSite",
      "@id": "https://zebalpha.shop/#website",
      name: "ZebAlpha",
      url: "https://zebalpha.shop",
    },
    about: {
      "@id": "https://zebalpha.shop/#organization",
    },
  };

  const faqSchema = buildFaqSchema(SELLER_FAQS);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      sellerWebPageSchema,
      buildBreadcrumbSchema(breadcrumbs),
      buildOrganizationSchema(),
      ...(faqSchema ? [faqSchema] : []),
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
        <Header title="ZebAlpha" subtitle="Seller Onboarding & Growth ✦" />

        <main className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl space-y-12">
            {/* HERO SECTION */}
            <section className="overflow-hidden rounded-[2rem] bg-gradient-to-b from-neutral-900 to-neutral-950 border border-neutral-800 p-8 shadow-2xl sm:p-12">
              <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-neutral-800 border border-neutral-700 px-4 py-1.5 text-xs font-bold text-neutral-300">
                    <Store className="h-4 w-4 text-emerald-400" />
                    Official Seller Portal ✦ ZebAlpha Marketplace
                  </div>

                  <h1 className="mt-6 text-3xl sm:text-5xl font-black tracking-tight text-white">
                    Built for Small Businesses and Growing Sellers
                  </h1>

                  <p className="mt-6 max-w-2xl text-base leading-8 text-neutral-300 font-normal sm:text-lg">
                    Sell online with ZebAlpha and reach more customers through a dedicated seller platform designed for growing businesses and eligible sellers. Founded in Kolkata, West Bengal, ZebAlpha makes digital commerce accessible, transparent, and rewarding for Indian entrepreneurs.
                  </p>

                  <div className="mt-8 flex flex-wrap gap-4">
                    <Link
                      href="https://seller.zebalpha.shop/register"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-white text-black px-8 py-4 text-xs font-black uppercase tracking-widest transition hover:bg-neutral-200 active:scale-95 shadow-xl"
                    >
                      <span>Register as Seller</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="https://seller.zebalpha.shop/login"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-neutral-700 bg-neutral-900 text-white px-8 py-4 text-xs font-black uppercase tracking-widest transition hover:bg-neutral-800 active:scale-95"
                    >
                      Seller Login
                    </Link>
                  </div>
                </div>

                <div className="rounded-[2rem] bg-neutral-950 border border-neutral-800 p-8 text-white shadow-2xl sm:p-10">
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-neutral-400">Why Sell on ZebAlpha</p>
                  <h2 className="mt-4 text-2xl font-black text-white">Direct Seller Advantages</h2>
                  <ul className="mt-6 space-y-3.5 text-sm text-neutral-300">
                    <li className="flex items-center gap-3 rounded-2xl bg-neutral-900 border border-neutral-800 p-3.5">
                      <Percent className="h-5 w-5 text-emerald-400 shrink-0" />
                      <span><strong>0% Commission</strong> where applicable under actual policy</span>
                    </li>
                    <li className="flex items-center gap-3 rounded-2xl bg-neutral-900 border border-neutral-800 p-3.5">
                      <ShieldCheck className="h-5 w-5 text-sky-400 shrink-0" />
                      <span><strong>Zero Hidden Marketplace Charges</strong> & transparent settlements</span>
                    </li>
                    <li className="flex items-center gap-3 rounded-2xl bg-neutral-900 border border-neutral-800 p-3.5">
                      <Package className="h-5 w-5 text-indigo-400 shrink-0" />
                      <span><strong>Dedicated Seller Panel</strong> for inventory & order dispatch</span>
                    </li>
                    <li className="flex items-center gap-3 rounded-2xl bg-neutral-900 border border-neutral-800 p-3.5">
                      <TrendingUp className="h-5 w-5 text-amber-400 shrink-0" />
                      <span><strong>Pan-India Customer Reach</strong> across 28,000+ pin codes</span>
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* WHO SHOULD SELL ON ZEBALPHA — 6 TARGET SELLER SEGMENTS */}
            <section id="target-sellers" className="scroll-mt-24 rounded-[2rem] bg-neutral-900 border border-neutral-800 p-8 shadow-xl sm:p-12">
              <div className="max-w-3xl">
                <span className="text-xs font-black uppercase tracking-[0.25em] text-amber-400">
                  Target Sellers
                </span>
                <h2 className="mt-3 text-3xl font-black text-white tracking-tight sm:text-4xl">
                  Built for 6 High-Potential Seller Communities Across India
                </h2>
                <p className="mt-4 text-base leading-8 text-neutral-300">
                  ZebAlpha prioritises sellers who create differentiated, authentic products and need stronger digital distribution — turning listings into lasting brands across Kolkata, West Bengal, East India, and Pan-India.
                </p>
              </div>

              <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {ZEBALPHA_STRATEGY.targetSellers.map((seller, idx) => (
                  <div
                    key={seller.title}
                    className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6"
                  >
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 border border-neutral-700 text-[11px] font-black text-amber-400">
                      0{idx + 1}
                    </span>
                    <h3 className="mt-3 text-base font-black text-white">{seller.title}</h3>
                    <p className="mt-2 text-xs leading-6 text-neutral-400">
                      {seller.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* WHY SELLERS CHOOSE ZEBALPHA OVER ORDINARY MARKETPLACES */}
            <section id="why-sell-zebalpha" className="scroll-mt-24 rounded-[2rem] bg-neutral-900 border border-neutral-800 p-8 shadow-xl sm:p-12">
              <div className="max-w-3xl">
                <span className="text-xs font-black uppercase tracking-[0.25em] text-emerald-400">
                  Beyond 0% Commission
                </span>
                <h2 className="mt-3 text-3xl font-black text-white tracking-tight sm:text-4xl">
                  Why Sellers &amp; Emerging Brands Choose ZebAlpha Over Legacy Marketplaces
                </h2>
                <p className="mt-4 text-base leading-8 text-neutral-300">
                  0% commission alone is not enough if your brand stays invisible in a lowest-price commodity feed. ZebAlpha acts as your hands-on growth partner — uniting brand storefronts, creator-led discovery, fair new-seller visibility, and transparent economics.
                </p>
              </div>

              <div className="mt-8 grid gap-5 md:grid-cols-2">
                {ZEBALPHA_STRATEGY.whySellersChooseZebAlpha.map((point) => (
                  <div
                    key={point.title}
                    className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6"
                  >
                    <h3 className="text-base font-black text-white">{point.title}</h3>
                    <p className="mt-2 text-xs leading-6 text-neutral-300">
                      {point.description}
                    </p>
                  </div>
                ))}
              </div>

              {/* EMERGING BRANDS PROGRAMME */}
              <div className="mt-8 rounded-[1.75rem] border border-amber-400/25 bg-neutral-950 p-7 sm:p-8">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-400">
                  ZebAlpha Emerging Brands Programme
                </p>
                <h3 className="mt-2 text-xl sm:text-2xl font-black text-white">
                  Turn a Seller Listing into a Recognizable Indian Brand Journey
                </h3>
                <ul className="mt-5 grid gap-3 sm:grid-cols-2 text-sm text-neutral-200">
                  {ZEBALPHA_STRATEGY.emergingBrandsProgram.map((item) => (
                    <li key={item} className="flex items-start gap-2.5">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* ENROLMENT ID ONBOARDING NOTICE */}
            <section className="rounded-[2rem] bg-neutral-900 border border-neutral-800 p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-neutral-800 p-3 text-amber-400 shrink-0">
                  <HelpCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Simple Enrolment ID Onboarding &amp; Direct 5-Day UPI Payouts
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-neutral-300">
                    <strong>Start selling on ZebAlpha easily with your 15-character Enrolment ID, verified email, pickup address, and UPI ID — no Bank Account Number, PAN, or Aadhaar required.</strong>
                  </p>
                  <p className="mt-2 text-xs leading-6 text-neutral-400">
                    Don&apos;t have an Enrolment ID yet? You can generate one free online in minutes and start listing your products at 0% marketplace commission with safe 5-day direct UPI settlements.
                  </p>
                </div>
              </div>
            </section>

            {/* SELLER PANEL FEATURES */}
            <section className="rounded-[2rem] bg-neutral-900 border border-neutral-800 p-8 shadow-xl sm:p-12">
              <div className="max-w-3xl">
                <span className="text-xs font-black uppercase tracking-[0.25em] text-neutral-400">The Platform</span>
                <h2 className="mt-3 text-3xl font-black text-white tracking-tight sm:text-4xl">
                  Comprehensive Tools Designed for Sellers
                </h2>
                <p className="mt-4 text-base leading-8 text-neutral-300">
                  From listing your first item to managing multi-warehouse shipments, the dedicated ZebAlpha seller panel provides everything you need to run your digital store effortlessly.
                </p>
              </div>

              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
                  <Layers className="h-6 w-6 text-white mb-3" />
                  <h3 className="text-base font-bold text-white">Product & Variant Management</h3>
                  <p className="mt-2 text-xs leading-6 text-neutral-400">
                    Easily list products with full color and size variant matrix support. Set independent prices, SKUs, and stock counts per variant.
                  </p>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
                  <Package className="h-6 w-6 text-white mb-3" />
                  <h3 className="text-base font-bold text-white">Real-Time Inventory Control</h3>
                  <p className="mt-2 text-xs leading-6 text-neutral-400">
                    Never oversell. Real-time inventory sync prevents out-of-stock orders and protects your seller fulfillment rating.
                  </p>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
                  <CheckCircle2 className="h-6 w-6 text-white mb-3" />
                  <h3 className="text-base font-bold text-white">Seamless Order Processing</h3>
                  <p className="mt-2 text-xs leading-6 text-neutral-400">
                    Receive immediate notifications for new orders. Generate shipping labels, schedule pickups, and update dispatch tracking with one click.
                  </p>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
                  <TrendingUp className="h-6 w-6 text-white mb-3" />
                  <h3 className="text-base font-bold text-white">Sales & Revenue Tracking</h3>
                  <p className="mt-2 text-xs leading-6 text-neutral-400">
                    Clear visibility into gross sales, units shipped, return rates, and fast 5-day direct UPI payouts with complete transparency.
                  </p>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
                  <ShieldCheck className="h-6 w-6 text-white mb-3" />
                  <h3 className="text-base font-bold text-white">Order & Product Traceability</h3>
                  <p className="mt-2 text-xs leading-6 text-neutral-400">
                    Every shipment is linked to verified SKU details and courier milestones, protecting sellers against false delivery claims.
                  </p>
                </div>

                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
                  <Store className="h-6 w-6 text-white mb-3" />
                  <h3 className="text-base font-bold text-white">Rapid Onboarding</h3>
                  <p className="mt-2 text-xs leading-6 text-neutral-400">
                    Straightforward verification process gets your digital storefront live and selling within 24 to 48 hours.
                  </p>
                </div>
              </div>
            </section>

            {/* SELLER FAQS (SYNCED WITH JSON-LD) */}
            <section id="seller-faqs" className="scroll-mt-24 rounded-[2rem] bg-neutral-900 border border-neutral-800 p-8 shadow-xl sm:p-12">
              <div className="max-w-3xl">
                <span className="text-xs font-black uppercase tracking-[0.25em] text-amber-400">
                  Seller FAQs
                </span>
                <h2 className="mt-3 text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Common Questions from New Sellers &amp; Emerging Brands
                </h2>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {SELLER_FAQS.map((faq) => (
                  <div
                    key={faq.question}
                    className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6"
                  >
                    <h3 className="text-sm sm:text-base font-black text-white">
                      {faq.question}
                    </h3>
                    <p className="mt-2.5 text-xs sm:text-sm leading-6 text-neutral-300">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* SELLER CTA */}
            <section className="rounded-[2rem] bg-gradient-to-r from-neutral-900 to-neutral-950 border border-neutral-800 p-8 text-center sm:p-12">
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Ready to Grow Your Business Across India?
              </h2>
              <p className="mt-4 max-w-xl mx-auto text-sm leading-6 text-neutral-400">
                Join growing sellers who trust ZebAlpha for fair terms, transparent pricing, and nationwide reach.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Link
                  href="https://seller.zebalpha.shop/register"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-white text-black px-8 py-4 text-xs font-black uppercase tracking-widest transition hover:bg-neutral-200 active:scale-95 shadow-xl"
                >
                  Apply to Sell Now
                </Link>
                <Link
                  href="/contact"
                  className="rounded-full border border-neutral-700 bg-neutral-800 text-white px-8 py-4 text-xs font-black uppercase tracking-widest transition hover:bg-neutral-700 active:scale-95"
                >
                  Contact Seller Support
                </Link>
              </div>
            </section>
          </div>
        </main>
      </div>
    </>
  );
}
