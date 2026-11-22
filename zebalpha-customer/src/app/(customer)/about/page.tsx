import Link from "next/link";
import { Header } from "@/components/Header";
import { Metadata } from "next";
import {
  buildOrganizationSchema,
  buildBreadcrumbSchema,
  buildFaqSchema,
} from "@/lib/aeo-geo/schemaGenerator";
import { ZEBALPHA_LEADERSHIP, ZEBALPHA_STRATEGY } from "@/lib/aeo-geo/brandEntity";

export const metadata: Metadata = {
  title: "About ZebAlpha | Vision, Leadership, Target Customers, Sellers & What Sets Us Apart",
  description:
    "Discover ZebAlpha — India's discovery-led, Bharat-first e-commerce marketplace led by CEO Rahul Adhikary & COO Alakesh Biswas. Explore our vision (Discover. Support. Grow.), target customers & sellers, Company vs Brand identity, and how ZebAlpha stands apart from traditional marketplaces.",
  alternates: {
    canonical: "https://zebalpha.shop/about",
  },
  openGraph: {
    title: "About ZebAlpha | Vision, Leadership & Why Customers and Sellers Choose Us",
    description:
      "Meet ZebAlpha's leadership (CEO Rahul Adhikary & COO Alakesh Biswas), our Bharat-first vision, target customers & sellers, Emerging Brands programme, and what makes ZebAlpha different.",
    url: "https://zebalpha.shop/about",
    siteName: "ZebAlpha",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/official-logo.png",
        width: 1200,
        height: 630,
        alt: "About & Leadership at ZebAlpha - Discovery-Led Indian E-Commerce Marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "About ZebAlpha | Vision, Leadership & Why Choose ZebAlpha",
    description:
      "Discover. Support. Grow. — India's discovery-led marketplace for customers, small sellers & emerging brands. Built Together. Growing Together.",
    images: ["/official-logo.png"],
  },
};

const ABOUT_FAQS = [
  {
    question: "Who is the Founder and CEO of ZebAlpha?",
    answer:
      "Rahul Adhikary is the Founder and Chief Executive Officer (CEO) of ZebAlpha. He leads the company's overall vision, business strategy, product innovation, technology direction, customer experience, brand positioning, and long-term business expansion.",
  },
  {
    question: "Who is the Co-Founder and COO of ZebAlpha?",
    answer:
      "Alakesh Biswas is the Co-Founder and Chief Operating Officer (COO) of ZebAlpha. He leads business operations and execution, seller onboarding and relationship management, operational planning and coordination, business process development, and team coordination.",
  },
  {
    question: "What is ZebAlpha's main vision?",
    answer:
      "ZebAlpha's main vision is 'Discover. Support. Grow.' — building India's discovery-led e-commerce marketplace with a Bharat-first focus on Tier 2, Tier 3, and smaller cities alongside metros, where shoppers discover trustworthy emerging brands and small sellers build lasting businesses.",
  },
  {
    question: "Who are ZebAlpha's primary target customers?",
    answer:
      "ZebAlpha serves three core demographic segments across India — College Students (18–24) seeking affordable fashion and trendy streetwear, Young Professionals (22–35) looking for verified quality and value, and Middle-Class Families (25–45) shopping for dependable everyday lifestyle and ethnic products — across six missions: Value Seekers, Trend Discoverers, Local-First Shoppers, Gift & Custom Buyers, Family Households, and Emerging-Brand Fans.",
  },
  {
    question: "Who are ZebAlpha's target sellers?",
    answer:
      "ZebAlpha prioritises six supply-side seller segments: Home-Based Businesses, Instagram & WhatsApp Social Sellers, Handmade Makers & Artisans, Local Boutiques, Small Manufacturers, and Emerging Indian D2C Brands looking for storefront identity, creator-led discovery, and nationwide reach.",
  },
  {
    question: "Why should customers choose ZebAlpha over other Indian e-commerce apps?",
    answer:
      "ZebAlpha brings together capabilities rarely offered under one roof: discovery-led curation of emerging Indian brands, Real Product Video Proof before buying, strict per-color and per-size SKU accuracy, a built-in Zero-MOQ Custom Print Studio for 240 GSM tees/hoodies/tote bags, Alpha AI multilingual voice and chat shopping in Bengali, Hindi, and English, and transparent pricing with UPI/COD and 5-day easy returns.",
  },
  {
    question: "How is ZebAlpha different for sellers compared to Flipkart or Meesho?",
    answer:
      "Large search marketplaces rely heavily on high commissions and ad spend, while zero-commission value apps often reduce sellers to anonymous price-war listings. ZebAlpha pairs 0% core commission for eligible sellers with dedicated brand storefronts, founder storytelling, micro-influencer creator campaigns, low-friction Enrolment ID onboarding, fair new-seller discovery, and actionable conversion analytics.",
  },
];

const SHARED_VISION_PILLARS = [
  {
    step: "01",
    title: "Customers",
    description: "Get convenient, transparent access to quality products with dependable delivery and order accuracy.",
  },
  {
    step: "02",
    title: "Emerging Brands",
    description: "Get a fair opportunity to build their own distinctive brand identity and connect with shoppers nationwide.",
  },
  {
    step: "03",
    title: "Independent Sellers",
    description: "Reach more customers across India through 0% commission models and practical seller tools.",
  },
  {
    step: "04",
    title: "Team Members",
    description: "Become active co-builders and meaningful contributors to the company's long-term growth.",
  },
];

export default function AboutPage() {
  const breadcrumbs = [
    { name: "Home", url: "https://zebalpha.shop" },
    { name: "About & Leadership", url: "https://zebalpha.shop/about" },
  ];

  const aboutPageSchema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": "https://zebalpha.shop/about#webpage",
    name: "About & Leadership at ZebAlpha | Founders, Vision & Story",
    url: "https://zebalpha.shop/about",
    description:
      "Official company profile and leadership directory for ZebAlpha, founded in Kolkata, West Bengal by Rahul Adhikary (Founder & CEO) and Alakesh Biswas (Co-Founder & COO).",
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

  const faqSchema = buildFaqSchema(ABOUT_FAQS);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      aboutPageSchema,
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
        <Header title="ZebAlpha" subtitle="Leadership, Story & Vision ✦" />

        <main className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl space-y-12">
            {/* HERO / CANONICAL ENTITY SECTION */}
            <section className="overflow-hidden rounded-[2rem] bg-neutral-900 border border-neutral-800 p-8 shadow-2xl sm:p-12">
              <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-neutral-800 border border-neutral-700 px-4 py-1.5 text-xs font-bold text-neutral-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Official Brand &amp; Leadership Identity
                  </div>

                  <h1 className="mt-6 text-3xl sm:text-5xl font-black tracking-tight text-white">
                    ZebAlpha — Building a Smarter, More Inclusive E-Commerce Future
                  </h1>

                  <p className="mt-6 max-w-2xl text-base leading-8 text-neutral-300 font-normal sm:text-lg">
                    <strong>ZebAlpha</strong> was founded in <strong>Kolkata, West Bengal</strong> with a clear vision: to create a modern Indian e-commerce platform where customers, independent sellers, emerging brands, and businesses can grow together.
                  </p>

                  <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
                      <p className="text-xs font-black uppercase tracking-[0.25em] text-neutral-400">Primary Market</p>
                      <p className="mt-2 text-sm text-neutral-200 font-semibold">India (28,000+ Pan-India PIN codes)</p>
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
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">Founder &amp; CEO</span>
                      <span className="text-white font-semibold">Rahul Adhikary</span>
                      <span className="block text-xs text-neutral-400 mt-0.5">Chief Executive Officer</span>
                    </div>
                    <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">Co-Founder &amp; COO</span>
                      <span className="text-white font-semibold">Alakesh Biswas</span>
                      <span className="block text-xs text-neutral-400 mt-0.5">Chief Operating Officer</span>
                    </div>
                    <div className="rounded-2xl bg-neutral-900 border border-neutral-800 p-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 block">Core Philosophy</span>
                      <span className="text-white font-medium">Built Together. Growing Together.</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* LEADERSHIP AT ZEBALPHA — OFFICIAL EXECUTIVE PROFILES */}
            <section
              id="leadership"
              className="scroll-mt-24 rounded-[2rem] bg-neutral-900 border border-neutral-800 p-8 shadow-2xl sm:p-12"
            >
              <div className="max-w-3xl">
                <span className="text-xs font-black uppercase tracking-[0.25em] text-amber-400">
                  Leadership at ZebAlpha
                </span>
                <h2 className="mt-3 text-3xl font-black text-white tracking-tight sm:text-4xl">
                  Building a Smarter, More Inclusive E-Commerce Future
                </h2>
                <div className="mt-5 space-y-4 text-base leading-8 text-neutral-300">
                  <p>
                    Driven by innovation, customer satisfaction, and technology, <strong>ZebAlpha</strong> aims to build a unified shopping ecosystem that combines its own curated product offerings with products from independent sellers and emerging brands across India.
                  </p>
                  <p>
                    Our leadership team brings together entrepreneurial vision, strategic thinking, modern technology, and disciplined operational execution to build and scale the company responsibly.
                  </p>
                </div>
              </div>

              {/* OUR FOUNDERS */}
              <div className="mt-10">
                <div className="flex items-center justify-between gap-4 border-b border-neutral-800 pb-4">
                  <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    Our Founders
                  </h3>
                  <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">
                    Executive Leadership
                  </span>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                  {/* Rahul Adhikary — Founder & CEO */}
                  <article
                    id={ZEBALPHA_LEADERSHIP[0].id}
                    className="scroll-mt-24 flex flex-col justify-between rounded-[1.75rem] border border-neutral-800 bg-neutral-950 p-7 sm:p-8 shadow-xl"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <span className="inline-flex items-center rounded-full bg-amber-500/15 border border-amber-400/30 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-amber-400">
                            {ZEBALPHA_LEADERSHIP[0].role}
                          </span>
                          <h4 className="mt-3 text-2xl sm:text-3xl font-black text-white tracking-tight">
                            {ZEBALPHA_LEADERSHIP[0].name}
                          </h4>
                          <p className="mt-1 text-xs font-semibold text-neutral-400">
                            {ZEBALPHA_LEADERSHIP[0].location}
                          </p>
                        </div>
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-400/30 bg-neutral-900 text-base font-black text-amber-400">
                          RA
                        </div>
                      </div>

                      <div className="mt-6 space-y-3.5 text-sm leading-7 text-neutral-300">
                        <p>
                          <strong>Rahul Adhikary</strong> is the Founder and Chief Executive Officer (CEO) of ZebAlpha. He leads the company&apos;s overall vision, business strategy, technology direction, and long-term growth.
                        </p>
                        <p>
                          As the driving force behind ZebAlpha, Rahul focuses on building a customer-centric e-commerce ecosystem, developing innovative shopping experiences, strengthening the company&apos;s technology infrastructure, and creating meaningful opportunities for emerging brands and independent sellers.
                        </p>
                        <p>
                          His vision is to establish ZebAlpha as a trusted e-commerce destination where customers discover quality products and businesses gain real opportunities to grow.
                        </p>
                      </div>
                    </div>

                    <div className="mt-7 border-t border-neutral-800 pt-6">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">
                        Key Responsibilities
                      </p>
                      <ul className="mt-3.5 space-y-2.5 text-sm text-neutral-200">
                        {ZEBALPHA_LEADERSHIP[0].responsibilities.map((item) => (
                          <li key={item} className="flex items-start gap-2.5">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </article>

                  {/* Alakesh Biswas — Co-Founder & COO */}
                  <article
                    id={ZEBALPHA_LEADERSHIP[1].id}
                    className="scroll-mt-24 flex flex-col justify-between rounded-[1.75rem] border border-neutral-800 bg-neutral-950 p-7 sm:p-8 shadow-xl"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-400/30 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-emerald-400">
                            {ZEBALPHA_LEADERSHIP[1].role}
                          </span>
                          <h4 className="mt-3 text-2xl sm:text-3xl font-black text-white tracking-tight">
                            {ZEBALPHA_LEADERSHIP[1].name}
                          </h4>
                          <p className="mt-1 text-xs font-semibold text-neutral-400">
                            {ZEBALPHA_LEADERSHIP[1].location}
                          </p>
                        </div>
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/30 bg-neutral-900 text-base font-black text-emerald-400">
                          AB
                        </div>
                      </div>

                      <div className="mt-6 space-y-3.5 text-sm leading-7 text-neutral-300">
                        <p>
                          <strong>Alakesh Biswas</strong> is the Co-Founder and Chief Operating Officer (COO) of ZebAlpha. He plays a key role in translating the company&apos;s vision into effective business operations and reliable execution.
                        </p>
                        <p>
                          He focuses on operational management, business coordination, seller relationships, and building efficient processes that support ZebAlpha&apos;s day-to-day activities and future expansion.
                        </p>
                        <p>
                          As a co-founder, Alakesh contributes to building a strong operational foundation and fostering a collaborative environment where customers, sellers, and team members can grow together.
                        </p>
                      </div>
                    </div>

                    <div className="mt-7 border-t border-neutral-800 pt-6">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-neutral-400">
                        Key Responsibilities
                      </p>
                      <ul className="mt-3.5 space-y-2.5 text-sm text-neutral-200">
                        {ZEBALPHA_LEADERSHIP[1].responsibilities.map((item) => (
                          <li key={item} className="flex items-start gap-2.5">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </article>
                </div>
              </div>

              {/* OUR SHARED VISION & PHILOSOPHY */}
              <div className="mt-10 border-t border-neutral-800 pt-10">
                <div className="max-w-3xl">
                  <span className="text-xs font-black uppercase tracking-[0.25em] text-neutral-400">
                    Our Shared Vision
                  </span>
                  <h3 className="mt-2 text-2xl sm:text-3xl font-black text-white tracking-tight">
                    E-Commerce Should Create Opportunities for Everyone
                  </h3>
                  <p className="mt-3 text-sm sm:text-base leading-7 text-neutral-300">
                    At ZebAlpha, we are building an ecosystem where every participant grows together:
                  </p>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {SHARED_VISION_PILLARS.map((pillar) => (
                    <div
                      key={pillar.step}
                      className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5"
                    >
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 border border-neutral-700 text-[11px] font-black text-amber-400">
                        {pillar.step}
                      </span>
                      <h4 className="mt-3 text-base font-black text-white">{pillar.title}</h4>
                      <p className="mt-2 text-xs leading-6 text-neutral-400">
                        {pillar.description}
                      </p>
                    </div>
                  ))}
                </div>

                <blockquote className="mt-8 rounded-[1.75rem] border border-amber-400/25 bg-neutral-950 p-7 sm:p-9 text-center shadow-xl">
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-amber-400">
                    Our Philosophy
                  </p>
                  <p className="mt-3 text-xl sm:text-2xl font-black italic text-white leading-snug">
                    &ldquo;Don&apos;t just work for the company. Build the company with us.&rdquo;
                  </p>
                  <p className="mt-3 text-xs sm:text-sm font-black uppercase tracking-[0.2em] text-neutral-400">
                    ZebAlpha — Built Together. Growing Together.
                  </p>
                </blockquote>
              </div>
            </section>

            {/* MAIN VISION, BHARAT-FIRST STRATEGY & COMPANY VS BRAND */}
            <section
              id="vision"
              className="scroll-mt-24 rounded-[2rem] bg-neutral-900 border border-neutral-800 p-8 shadow-2xl sm:p-12"
            >
              <div className="max-w-3xl">
                <span className="text-xs font-black uppercase tracking-[0.25em] text-amber-400">
                  Our Main Vision • Bharat-First Strategy
                </span>
                <h2 className="mt-3 text-3xl font-black text-white tracking-tight sm:text-4xl">
                  Discover. Support. Grow. — Beyond India&apos;s Largest Metros
                </h2>
                <p className="mt-5 text-base leading-8 text-neutral-300">
                  {ZEBALPHA_STRATEGY.positioning} {ZEBALPHA_STRATEGY.bharatFocus}
                </p>
              </div>

              {/* 4-PHASE CLUSTER EXPANSION */}
              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {ZEBALPHA_STRATEGY.expansionPhases.map((item) => (
                  <div
                    key={item.phase}
                    className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5"
                  >
                    <p className="text-xs font-black uppercase tracking-wider text-amber-400">
                      {item.phase}
                    </p>
                    <p className="mt-2.5 text-xs leading-6 text-neutral-300">{item.focus}</p>
                  </div>
                ))}
              </div>

              {/* COMPANY VS BRAND TABLE */}
              <div className="mt-10 border-t border-neutral-800 pt-10">
                <div className="max-w-3xl">
                  <span className="text-xs font-black uppercase tracking-[0.25em] text-neutral-400">
                    Dual Commitment
                  </span>
                  <h3 className="mt-2 text-2xl sm:text-3xl font-black text-white tracking-tight">
                    Company vs Brand — How ZebAlpha Balances Business Discipline &amp; Customer Trust
                  </h3>
                </div>

                <div className="mt-6 overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-950">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-800 bg-neutral-900 text-xs uppercase tracking-wider text-neutral-400">
                        <th className="p-4 font-black">Area</th>
                        <th className="p-4 font-black text-amber-400">ZebAlpha as a Company</th>
                        <th className="p-4 font-black text-emerald-400">ZebAlpha as a Brand</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800 text-neutral-300">
                      {ZEBALPHA_STRATEGY.companyVsBrand.map((row) => (
                        <tr key={row.area}>
                          <td className="p-4 font-bold text-white whitespace-nowrap">{row.area}</td>
                          <td className="p-4">{row.company}</td>
                          <td className="p-4">{row.brand}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>

            {/* TARGET CUSTOMERS & TARGET SELLERS */}
            <section
              id="who-we-serve"
              className="scroll-mt-24 rounded-[2rem] bg-neutral-900 border border-neutral-800 p-8 shadow-2xl sm:p-12"
            >
              <div className="max-w-3xl">
                <span className="text-xs font-black uppercase tracking-[0.25em] text-amber-400">
                  Who We Serve
                </span>
                <h2 className="mt-3 text-3xl font-black text-white tracking-tight sm:text-4xl">
                  Target Customers &amp; Target Sellers Across Bharat
                </h2>
                <p className="mt-4 text-base leading-8 text-neutral-300">
                  ZebAlpha serves practical everyday Indian shopping needs while unlocking digital brand-building for small sellers and emerging labels.
                </p>
              </div>

              {/* PRIMARY TARGET CUSTOMERS (AGE DEMOGRAPHICS) */}
              <div className="mt-8">
                <h3 className="text-lg sm:text-xl font-black text-white">
                  1. Primary Target Customers
                </h3>
                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  {ZEBALPHA_STRATEGY.primaryTargetCustomers.map((group) => (
                    <div
                      key={group.segment}
                      className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-base font-black text-white">{group.segment}</h4>
                        <span className="rounded-full bg-amber-500/15 border border-amber-400/30 px-2.5 py-0.5 text-[11px] font-black text-amber-400">
                          Age {group.ageGroup}
                        </span>
                      </div>
                      <p className="mt-3 text-xs leading-6 text-neutral-300">{group.needs}</p>
                    </div>
                  ))}
                </div>

                {/* 6 SHOPPING MISSIONS */}
                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {ZEBALPHA_STRATEGY.customerMissions.map((mission) => (
                    <div
                      key={mission.title}
                      className="rounded-2xl border border-neutral-800/80 bg-neutral-950/70 p-4"
                    >
                      <p className="text-xs font-black uppercase tracking-wider text-white">
                        {mission.title}
                      </p>
                      <p className="mt-1.5 text-xs leading-5 text-neutral-400">
                        {mission.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* TARGET SELLERS & EMERGING BRANDS */}
              <div className="mt-10 border-t border-neutral-800 pt-10">
                <h3 className="text-lg sm:text-xl font-black text-white">
                  2. Target Sellers &amp; Emerging Brands Ecosystem
                </h3>
                <p className="mt-2 text-sm leading-7 text-neutral-300 max-w-3xl">
                  We prioritise differentiated sellers and young Indian brands who need real storefronts, creator visibility, and reliable fulfilment — not just another commodity listing.
                </p>

                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {ZEBALPHA_STRATEGY.targetSellers.map((seller, idx) => (
                    <div
                      key={seller.title}
                      className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5"
                    >
                      <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400">
                        Segment 0{idx + 1}
                      </span>
                      <h4 className="mt-1.5 text-base font-black text-white">{seller.title}</h4>
                      <p className="mt-2 text-xs leading-6 text-neutral-400">
                        {seller.description}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl border border-emerald-500/25 bg-neutral-950 p-6">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-400">
                    ZebAlpha Emerging Brands Programme
                  </p>
                  <ul className="mt-3.5 grid gap-2.5 sm:grid-cols-2 text-xs sm:text-sm text-neutral-200">
                    {ZEBALPHA_STRATEGY.emergingBrandsProgram.map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            {/* WHY CHOOSE ZEBALPHA — WHAT OTHER MARKETPLACES DON'T COMBINE */}
            <section
              id="why-zebalpha"
              className="scroll-mt-24 rounded-[2rem] bg-neutral-900 border border-neutral-800 p-8 shadow-2xl sm:p-12"
            >
              <div className="max-w-3xl">
                <span className="text-xs font-black uppercase tracking-[0.25em] text-amber-400">
                  Why Customers &amp; Sellers Choose ZebAlpha
                </span>
                <h2 className="mt-3 text-3xl font-black text-white tracking-tight sm:text-4xl">
                  What ZebAlpha Delivers That Ordinary E-Commerce Platforms Don&apos;t Offer Together
                </h2>
                <p className="mt-4 text-base leading-8 text-neutral-300">
                  Access to products is not the same as access to growth. ZebAlpha unifies product proof, zero-MOQ customisation, multilingual Bharat AI shopping, brand storefronts, and creator-led discovery in one transparent marketplace.
                </p>
              </div>

              <div className="mt-8 grid gap-6 lg:grid-cols-2">
                {/* FOR CUSTOMERS */}
                <div className="rounded-[1.75rem] border border-neutral-800 bg-neutral-950 p-7">
                  <span className="inline-flex rounded-full bg-amber-500/15 border border-amber-400/30 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-amber-400">
                    For Customers
                  </span>
                  <h3 className="mt-3 text-xl font-black text-white">
                    6 Reasons Shoppers Trust ZebAlpha
                  </h3>
                  <div className="mt-5 space-y-4">
                    {ZEBALPHA_STRATEGY.whyCustomersChooseZebAlpha.map((point, idx) => (
                      <div key={point.title} className="border-b border-neutral-900 pb-4 last:border-0 last:pb-0">
                        <h4 className="text-sm font-black text-white">
                          {idx + 1}. {point.title}
                        </h4>
                        <p className="mt-1 text-xs leading-6 text-neutral-400">
                          {point.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* FOR SELLERS */}
                <div className="rounded-[1.75rem] border border-neutral-800 bg-neutral-950 p-7">
                  <span className="inline-flex rounded-full bg-emerald-500/15 border border-emerald-400/30 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-emerald-400">
                    For Sellers &amp; Emerging Brands
                  </span>
                  <h3 className="mt-3 text-xl font-black text-white">
                    6 Reasons Sellers Grow Stronger Here
                  </h3>
                  <div className="mt-5 space-y-4">
                    {ZEBALPHA_STRATEGY.whySellersChooseZebAlpha.map((point, idx) => (
                      <div key={point.title} className="border-b border-neutral-900 pb-4 last:border-0 last:pb-0">
                        <h4 className="text-sm font-black text-white">
                          {idx + 1}. {point.title}
                        </h4>
                        <p className="mt-1 text-xs leading-6 text-neutral-400">
                          {point.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* OBJECTIVE MARKETPLACE COMPARISON MATRIX */}
              <div className="mt-10 border-t border-neutral-800 pt-10">
                <div className="max-w-3xl">
                  <span className="text-xs font-black uppercase tracking-[0.25em] text-neutral-400">
                    Competitive Positioning
                  </span>
                  <h3 className="mt-2 text-2xl font-black text-white tracking-tight">
                    How ZebAlpha Compares to Traditional &amp; Value Marketplaces
                  </h3>
                  <p className="mt-2 text-xs leading-6 text-neutral-400">
                    An honest strategic view — value marketplaces like Meesho already advertise 0% commission, so ZebAlpha differentiates through discovery, brand identity, real video proof, custom printing, multilingual AI, and hands-on seller growth.
                  </p>
                </div>

                <div className="mt-6 overflow-x-auto rounded-2xl border border-neutral-800 bg-neutral-950">
                  <table className="w-full text-left text-xs sm:text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-neutral-800 bg-neutral-900 text-xs uppercase tracking-wider text-neutral-400">
                        <th className="p-4 font-black">Dimension</th>
                        <th className="p-4 font-black">Broad-Scale Marketplaces</th>
                        <th className="p-4 font-black">Value-Led Marketplaces</th>
                        <th className="p-4 font-black text-amber-400">ZebAlpha</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800 text-neutral-300">
                      {ZEBALPHA_STRATEGY.marketplaceComparison.map((row) => (
                        <tr key={row.dimension}>
                          <td className="p-4 font-bold text-white">{row.dimension}</td>
                          <td className="p-4 text-neutral-400">{row.broad}</td>
                          <td className="p-4 text-neutral-400">{row.value}</td>
                          <td className="p-4 font-semibold text-white">{row.zebalpha}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-neutral-800 bg-neutral-950 p-5">
                  <p className="text-xs sm:text-sm text-neutral-300">
                    Want the full deep dive into our Bharat-first marketplace model and creator-led growth engine?
                  </p>
                  <Link
                    href="/blogs/why-zebalpha-vision-target-customers-sellers-and-marketplace-difference"
                    className="inline-flex rounded-full bg-white text-black px-5 py-2.5 text-xs font-black uppercase tracking-wider transition hover:bg-neutral-200"
                  >
                    Read Full Vision Guide →
                  </Link>
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
                    The journey was initiated by <strong>Rahul Adhikary</strong> (Founder &amp; CEO), a college student from Kolkata, West Bengal, driven by the ambition to build something meaningful and lasting in India&apos;s fast-evolving digital commerce ecosystem. Seeing how difficult it was for grassroots sellers and small businesses to gain transparent visibility online, Rahul began laying the foundational groundwork for a community-first digital marketplace.
                  </p>
                  <p>
                    Approximately seven months into this ambitious journey, <strong>Alakesh Biswas</strong> joined as Co-Founder &amp; COO. What started as an individual initiative evolved into a shared, synergistic partnership between two college friends committed to building an honest, customer-centric platform from the ground up.
                  </p>
                  <p>
                    Without inflated funding claims or artificial vanity metrics, Rahul and Alakesh have focused on genuine, step-by-step progress: building reliable order management, establishing dependable seller tools, and honoring customer trust with every package shipped.
                  </p>
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
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400">Simple Enrolment ID Onboarding</h3>
                    <p className="mt-2 text-xs leading-6 text-neutral-300">
                      ZebAlpha makes onboarding fast and accessible for small businesses and independent creators across India. Sellers can create their account using their 15-character Enrolment ID and UPI ID — with zero Bank Account, PAN, or Aadhaar uploads required.
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

            {/* FREQUENTLY ASKED QUESTIONS (SYNCED WITH JSON-LD FAQ SCHEMA) */}
            <section id="faqs" className="scroll-mt-24 rounded-[2rem] bg-neutral-900 border border-neutral-800 p-8 shadow-xl sm:p-12">
              <div className="max-w-3xl">
                <span className="text-xs font-black uppercase tracking-[0.25em] text-amber-400">
                  Frequently Asked Questions
                </span>
                <h2 className="mt-3 text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Everything You Should Know About ZebAlpha
                </h2>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {ABOUT_FAQS.map((faq) => (
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
