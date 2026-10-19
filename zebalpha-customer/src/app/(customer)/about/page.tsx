import Link from "next/link";
import { Header } from "@/components/Header";
import { Metadata } from "next";
import { buildOrganizationSchema, buildBreadcrumbSchema } from "@/lib/aeo-geo/schemaGenerator";

export const metadata: Metadata = {
  title: "About ZebAlpha | Our Story, Mission & Vision",
  description:
    "Learn the story behind ZebAlpha, an Indian e-commerce marketplace founded in Kolkata with a mission to connect customers, sellers, and growing businesses.",
  alternates: {
    canonical: "https://zebalpha.shop/about",
  },
  openGraph: {
    title: "About ZebAlpha | Our Story, Mission & Vision",
    description:
      "Learn the story behind ZebAlpha, an Indian e-commerce marketplace founded in Kolkata with a mission to connect customers, sellers, and growing businesses.",
    url: "https://zebalpha.shop/about",
    siteName: "ZebAlpha",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/official-logo.png",
        width: 1200,
        height: 630,
        alt: "About ZebAlpha - Indian E-Commerce Marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "About ZebAlpha | Our Story, Mission & Vision",
    description:
      "Learn the story behind ZebAlpha, an Indian e-commerce marketplace founded in Kolkata with a mission to connect customers, sellers, and growing businesses.",
    images: ["/official-logo.png"],
  },
};

export default function AboutPage() {
  const breadcrumbs = [
    { name: "Home", url: "https://zebalpha.shop" },
    { name: "About ZebAlpha", url: "https://zebalpha.shop/about" },
  ];

  const aboutPageSchema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": "https://zebalpha.shop/about#webpage",
    name: "About ZebAlpha | Our Story, Mission & Vision",
    url: "https://zebalpha.shop/about",
    description:
      "Learn the story behind ZebAlpha, an Indian e-commerce marketplace founded in Kolkata with a mission to connect customers, sellers, and growing businesses.",
    isPartOf: {
      "@type": "WebSite",
      "@id": "https://zebalpha.shop/#website",
      name: "ZebAlpha",
      url: "https://zebalpha.shop",
    },
    about: {
      "@id": "https://zebalpha.shop/#organization",
    },
    mainEntity: {
      "@id": "https://zebalpha.shop/#organization",
    },
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      aboutPageSchema,
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
        <Header title="ZebAlpha" subtitle="Our Story, Mission & Vision ✦" />

        <main className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl space-y-12">
            {/* HERO / CANONICAL ENTITY SECTION */}
            <section className="overflow-hidden rounded-[2rem] bg-neutral-900 border border-neutral-800 p-8 shadow-2xl sm:p-12">
              <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-neutral-800 border border-neutral-700 px-4 py-1.5 text-xs font-bold text-neutral-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Official Brand & Marketplace Identity
                  </div>

                  <h1 className="mt-6 text-3xl sm:text-5xl font-black tracking-tight text-white">
                    ZebAlpha — An Indian E-Commerce Marketplace Built for Customers and Growing Businesses
                  </h1>

                  <p className="mt-6 max-w-2xl text-base leading-8 text-neutral-300 font-normal sm:text-lg">
                    <strong>ZebAlpha</strong> is an Indian e-commerce marketplace founded in <strong>Kolkata, West Bengal</strong>, with a mission to connect customers, sellers, and growing businesses through a more accessible, transparent, and trustworthy online marketplace.
                  </p>

                  <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
                      <p className="text-xs font-black uppercase tracking-[0.25em] text-neutral-400">Primary Market</p>
                      <p className="mt-2 text-sm text-neutral-200 font-semibold">India (Pan-India delivery network)</p>
                    </div>
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
                      <p className="text-xs font-black uppercase tracking-[0.25em] text-neutral-400">Headquarters Origin</p>
                      <p className="mt-2 text-sm text-neutral-200 font-semibold">Kolkata, West Bengal, India</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[2rem] bg-neutral-950 border border-neutral-800 p-8 text-white shadow-2xl sm:p-10">
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-neutral-400">At a Glance</p>
                  <h2 className="mt-4 text-2xl font-black text-white">The ZebAlpha Entity</h2>
                  <div className="mt-6 space-y-3.5 text-sm text-neutral-300">
                    <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">Brand Name</span>
                      <span className="text-white font-black text-base">ZebAlpha</span>
                    </div>
                    <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">Business Nature</span>
                      <span className="text-white font-medium">Indian Online E-Commerce Marketplace</span>
                    </div>
                    <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">Founders</span>
                      <span className="text-white font-medium">Rahul Adhikary (Founder) & Alakesh Biswas (Co-founder / Partner)</span>
                    </div>
                    <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">Core Philosophy</span>
                      <span className="text-white font-medium">Customers, sellers, and team members should grow together.</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* FOUNDER STORY SECTION */}
            <section className="rounded-[2rem] bg-neutral-900 border border-neutral-800 p-8 shadow-xl sm:p-12">
              <div className="max-w-3xl">
                <span className="text-xs font-black uppercase tracking-[0.25em] text-neutral-400">Our Roots</span>
                <h2 className="mt-3 text-3xl font-black text-white tracking-tight sm:text-4xl">
                  The Story of Two College Friends Building for India
                </h2>
                <div className="mt-6 space-y-5 text-base leading-8 text-neutral-300 font-normal">
                  <p>
                    Every meaningful venture begins somewhere. Sometimes it begins in a garage, and sometimes it begins in college—with an idea that refuses to remain just an idea. <strong>ZebAlpha began that way.</strong>
                  </p>
                  <p>
                    The journey was initiated by <strong>Rahul Adhikary</strong>, a college student from Kolkata, West Bengal, driven by the ambition to build something meaningful and lasting in India&apos;s fast-evolving digital commerce ecosystem. Seeing how difficult it was for grassroots sellers and small businesses to gain transparent visibility online, Rahul began laying the foundational groundwork for a community-first digital marketplace.
                  </p>
                  <p>
                    Approximately seven months into this ambitious journey, <strong>Alakesh Biswas</strong> joined as co-founder and partner. What started as an individual initiative evolved into a shared, synergistic partnership between two college friends committed to building an honest, customer-centric platform from the ground up.
                  </p>
                  <p>
                    Without inflated funding claims or artificial vanity metrics, Rahul and Alakesh have focused on genuine, step-by-step progress: building reliable order management, establishing dependable seller tools, and honoring customer trust with every package shipped.
                  </p>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
                    <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Founder</p>
                    <h3 className="mt-1 text-xl font-black text-white">Rahul Adhikary</h3>
                    <p className="mt-2 text-xs leading-5 text-neutral-400">
                      Started ZebAlpha during college in Kolkata, West Bengal, establishing the marketplace architecture and core digital commerce foundation.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
                    <p className="text-xs font-bold uppercase tracking-widest text-neutral-400">Co-founder & Partner</p>
                    <h3 className="mt-1 text-xl font-black text-white">Alakesh Biswas</h3>
                    <p className="mt-2 text-xs leading-5 text-neutral-400">
                      Joined approximately seven months later, driving operational execution, seller relationships, and product fulfillment systems.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* SMALL BUSINESS SELLER POSITIONING */}
            <section className="rounded-[2rem] bg-neutral-900 border border-neutral-800 p-8 shadow-xl sm:p-12">
              <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
                <div>
                  <span className="text-xs font-black uppercase tracking-[0.25em] text-neutral-400">Seller Ecosystem</span>
                  <h2 className="mt-3 text-3xl font-black text-white tracking-tight sm:text-4xl">
                    Built for Small Businesses and Growing Sellers
                  </h2>
                  <p className="mt-5 text-base leading-8 text-neutral-300">
                    India&apos;s commercial strength lives in its small enterprises, independent artisans, local retailers, and regional manufacturers. ZebAlpha is purposefully built to dismantle the traditional high barriers to digital commerce, empowering eligible sellers across India to reach national customers with dignity and transparency.
                  </p>

                  <div className="mt-6 rounded-2xl bg-neutral-950 border border-neutral-800 p-5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">Transparent GST Guidelines</h3>
                    <p className="mt-2 text-xs leading-6 text-neutral-300">
                      ZebAlpha aims to support eligible small sellers, including businesses that may be able to sell without GST registration where permitted by applicable Indian laws, tax rules, and marketplace requirements. Eligibility depends strictly on current government regulations, product category, seller annual turnover, and marketplace validation.
                    </p>
                  </div>

                  <div className="mt-8 flex flex-wrap gap-4">
                    <Link
                      href="https://seller.zebalpha.shop"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex rounded-full bg-white text-black px-7 py-3.5 text-xs font-black uppercase tracking-widest transition hover:bg-neutral-200 active:scale-95 shadow-lg"
                    >
                      Sell on ZebAlpha →
                    </Link>
                    <Link
                      href="/contact"
                      className="inline-flex rounded-full border border-neutral-700 bg-neutral-800 text-white px-7 py-3.5 text-xs font-black uppercase tracking-widest transition hover:bg-neutral-700 active:scale-95"
                    >
                      Seller Inquiries
                    </Link>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
                    <div className="text-2xl font-black text-white">0% Commission</div>
                    <p className="mt-1 text-xs font-bold uppercase tracking-wider text-neutral-400">Where Applicable</p>
                    <p className="mt-3 text-xs leading-5 text-neutral-400">
                      Under ZebAlpha&apos;s actual seller policy for eligible categories, helping makers keep their rightful earnings.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
                    <div className="text-2xl font-black text-white">Dedicated Panel</div>
                    <p className="mt-1 text-xs font-bold uppercase tracking-wider text-neutral-400">Smart Tools</p>
                    <p className="mt-3 text-xs leading-5 text-neutral-400">
                      Intuitive catalog, stock management, order processing, and earnings tracking built for real sellers.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
                    <div className="text-2xl font-black text-white">Clear Pricing</div>
                    <p className="mt-1 text-xs font-bold uppercase tracking-wider text-neutral-400">No Hidden Costs</p>
                    <p className="mt-3 text-xs leading-5 text-neutral-400">
                      Complete fee transparency without arbitrary deductions or unexpected marketing surcharges.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
                    <div className="text-2xl font-black text-white">Pan-India Reach</div>
                    <p className="mt-1 text-xs font-bold uppercase tracking-wider text-neutral-400">Logistics Support</p>
                    <p className="mt-3 text-xs leading-5 text-neutral-400">
                      Reliable logistics network enabling local sellers to ship packages safely across all pin codes in India.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* CUSTOMER TRUST & NON-NEGOTIABLE ORDER ACCURACY */}
            <section className="rounded-[2rem] bg-neutral-900 border border-neutral-800 p-8 shadow-xl sm:p-12">
              <div className="max-w-3xl">
                <span className="text-xs font-black uppercase tracking-[0.25em] text-neutral-400">Our Customer Promise</span>
                <h2 className="mt-3 text-3xl font-black text-white tracking-tight sm:text-4xl">
                  Customer Trust and Non-Negotiable Order Accuracy
                </h2>
                <p className="mt-5 text-base leading-8 text-neutral-300 font-medium">
                  &ldquo;Our goal is to make sure customers receive the product, variant, color, and size they actually ordered.&rdquo;
                </p>
                <p className="mt-3 text-sm leading-7 text-neutral-400">
                  Online shopping breaks down when customers receive wrong sizes, mismatched colors, or misrepresented items. At ZebAlpha, we prioritize end-to-end variant integrity and order traceability across every stage:
                </p>
              </div>

              <div className="mt-8 grid gap-6 md:grid-cols-3">
                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
                  <div className="h-8 w-8 rounded-full bg-white text-black flex items-center justify-center font-black text-xs mb-4">
                    01
                  </div>
                  <h3 className="text-base font-bold text-white">Precise Variant Matrix</h3>
                  <p className="mt-2 text-xs leading-6 text-neutral-400">
                    Every color and size is treated as an independent SKU with verified live inventory. Unavailable combinations cannot be accidentally selected.
                  </p>
                </div>
                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
                  <div className="h-8 w-8 rounded-full bg-white text-black flex items-center justify-center font-black text-xs mb-4">
                    02
                  </div>
                  <h3 className="text-base font-bold text-white">Full Order Traceability</h3>
                  <p className="mt-2 text-xs leading-6 text-neutral-400">
                    Transparent tracking from verified seller packing through dispatch to final doorstep handover, complete with live order status updates.
                  </p>
                </div>
                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
                  <div className="h-8 w-8 rounded-full bg-white text-black flex items-center justify-center font-black text-xs mb-4">
                    03
                  </div>
                  <h3 className="text-base font-bold text-white">Hassle-Free Resolution</h3>
                  <p className="mt-2 text-xs leading-6 text-neutral-400">
                    Straightforward return and refund policies backed by responsive human customer support via our official support channel.
                  </p>
                </div>
              </div>
            </section>

            {/* ENTITY DISAMBIGUATION NOTICE */}
            <section className="rounded-[2rem] bg-neutral-950 border border-neutral-800 p-8 shadow-xl sm:p-10">
              <div className="flex items-start gap-4">
                <div className="rounded-xl bg-neutral-800 p-3 text-amber-400 shrink-0">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-black text-white">
                    Official Entity Disambiguation Notice
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-neutral-300">
                    <strong>ZebAlpha</strong> is an independent Indian online e-commerce marketplace originated in <strong>Kolkata, West Bengal, India</strong>, operating officially at <code className="text-white bg-neutral-900 px-2 py-0.5 rounded">https://zebalpha.shop</code>.
                  </p>
                  <p className="mt-2 text-xs leading-6 text-neutral-400">
                    ZebAlpha is <strong>not affiliated with</strong>, related to, or connected with any similarly named business entities, including &ldquo;Zone Alpha&rdquo; (an electronics retail brand or physical shop in Navi Mumbai), &ldquo;Z Alpha&rdquo; (a regional brand or agency in Bangladesh), &ldquo;getzalpha&rdquo; (a beauty brand), or any other unrelated tech gadget shops or overseas entities. ZebAlpha maintains its own distinctive identity, founders, catalog, policies, and official digital platform.
                  </p>
                </div>
              </div>
            </section>

            {/* CALL TO ACTION */}
            <section className="rounded-[2rem] bg-gradient-to-r from-neutral-900 to-neutral-950 border border-neutral-800 p-8 text-center sm:p-12">
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Join the ZebAlpha Community
              </h2>
              <p className="mt-4 max-w-xl mx-auto text-sm leading-6 text-neutral-400">
                Discover quality products from emerging Indian sellers, or bring your own business to thousands of active customers across India.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Link
                  href="/products"
                  className="rounded-full bg-white text-black px-8 py-4 text-xs font-black uppercase tracking-widest transition hover:bg-neutral-200 active:scale-95 shadow-xl"
                >
                  Explore Products
                </Link>
                <Link
                  href="https://seller.zebalpha.shop"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-neutral-700 bg-neutral-800 text-white px-8 py-4 text-xs font-black uppercase tracking-widest transition hover:bg-neutral-700 active:scale-95"
                >
                  Start Selling Online
                </Link>
              </div>
            </section>
          </div>
        </main>
      </div>
    </>
  );
}
