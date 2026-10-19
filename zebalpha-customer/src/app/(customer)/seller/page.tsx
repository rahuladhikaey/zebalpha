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
import { buildOrganizationSchema, buildBreadcrumbSchema } from "@/lib/aeo-geo/schemaGenerator";

export const metadata: Metadata = {
  title: "Sell on ZebAlpha | Grow Your Business Online",
  description:
    "Sell online with ZebAlpha and reach more customers through a dedicated seller platform designed for growing businesses and eligible sellers.",
  alternates: {
    canonical: "https://zebalpha.shop/seller",
  },
  openGraph: {
    title: "Sell on ZebAlpha | Grow Your Business Online",
    description:
      "Sell online with ZebAlpha and reach more customers through a dedicated seller platform designed for growing businesses and eligible sellers.",
    url: "https://zebalpha.shop/seller",
    siteName: "ZebAlpha",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/official-logo.png",
        width: 1200,
        height: 630,
        alt: "Sell on ZebAlpha - Indian E-Commerce Marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sell on ZebAlpha | Grow Your Business Online",
    description:
      "Sell online with ZebAlpha and reach more customers through a dedicated seller platform designed for growing businesses and eligible sellers.",
    images: ["/official-logo.png"],
  },
};

export default function SellerPage() {
  const breadcrumbs = [
    { name: "Home", url: "https://zebalpha.shop" },
    { name: "Sell on ZebAlpha", url: "https://zebalpha.shop/seller" },
  ];

  const sellerWebPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": "https://zebalpha.shop/seller#webpage",
    name: "Sell on ZebAlpha | Grow Your Business Online",
    url: "https://zebalpha.shop/seller",
    description:
      "Sell online with ZebAlpha and reach more customers through a dedicated seller platform designed for growing businesses and eligible sellers.",
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

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      sellerWebPageSchema,
      buildBreadcrumbSchema(breadcrumbs),
      buildOrganizationSchema(),
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
                      href="https://seller.zebalpha.shop"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-white text-black px-8 py-4 text-xs font-black uppercase tracking-widest transition hover:bg-neutral-200 active:scale-95 shadow-xl"
                    >
                      <span>Register as Seller</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="https://seller.zebalpha.shop"
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
                      <span><strong>Pan-India Customer Reach</strong> across 19,000+ pin codes</span>
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* GST POLICY NOTICE */}
            <section className="rounded-[2rem] bg-neutral-900 border border-neutral-800 p-6 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-neutral-800 p-3 text-amber-400 shrink-0">
                  <HelpCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    GST Registration & Seller Eligibility Policy
                  </h3>
                  <p className="mt-2 text-sm leading-7 text-neutral-300">
                    <strong>ZebAlpha aims to support eligible small sellers, including businesses that may be able to sell without GST registration where permitted by applicable Indian laws, tax rules, and marketplace requirements.</strong>
                  </p>
                  <p className="mt-2 text-xs leading-6 text-neutral-400">
                    Tax compliance and exemption qualifications depend strictly on Indian tax legislation, seller business turnover, and product classification. ZebAlpha complies fully with Indian e-commerce laws and does not offer tax or legal advice. Always verify your specific tax status before onboarding.
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
                    Clear visibility into gross sales, units shipped, return rates, and scheduled bank transfers with complete transparency.
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
                  href="https://seller.zebalpha.shop"
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
