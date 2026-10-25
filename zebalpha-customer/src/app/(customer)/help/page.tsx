import { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BreadcrumbsNav } from "@/components/aeo/BreadcrumbsNav";
import { AeoAnswerBox } from "@/components/aeo/AeoAnswerBox";
import { DynamicFaqSection } from "@/components/aeo/DynamicFaqSection";
import { ZEBALPHA_BRAND_ENTITY } from "@/lib/aeo-geo/brandEntity";
import { buildBreadcrumbSchema, buildFaqSchema } from "@/lib/aeo-geo/schemaGenerator";
import { HelpCircle, Package, RotateCcw, CreditCard, Mail, Store, Ruler } from "lucide-react";

export const metadata: Metadata = {
  title: "Help & Customer Support Center | ZEBALPHA",
  description: "Official ZEBALPHA Help Center: Find instant answers on order tracking, 7-day returns, payments, sizing charts, and seller support.",
  alternates: {
    canonical: "https://zebalpha.shop/help",
  },
  openGraph: {
    title: "Help & Customer Support Center | ZEBALPHA",
    description: "Official ZEBALPHA Help Center: Find instant answers on order tracking, 7-day returns, payments, and sizing.",
    url: "https://zebalpha.shop/help",
    siteName: "ZEBALPHA",
    locale: "en_IN",
    type: "website",
  },
};

const masterHelpFaqs = [
  {
    question: "How do I track my order status?",
    answer: "Visit Account > Order History or click the tracking link sent via SMS and Email upon dispatch. Live milestones from carrier pickup to out-for-delivery are visible in real-time."
  },
  {
    question: "What is the return and exchange window?",
    answer: "ZEBALPHA offers a 7-day return and exchange policy from the delivery date. Items must be in original unworn condition with tags attached."
  },
  {
    question: "Which payment methods are accepted?",
    answer: "We accept UPI (Google Pay, PhonePe, Paytm, BHIM), Debit/Credit Cards (Visa, MasterCard, RuPay), Net Banking, and Cash on Delivery (COD)."
  },
  {
    question: "How can apparel makers sell on ZEBALPHA?",
    answer: "Independent apparel brands and manufacturers can register on the Zebalpha Supplier Hub (seller.zebalpha.shop) with 0% commission and automated express logistics."
  },
  {
    question: "How can I contact customer care directly?",
    answer: "Email our support desk at support@zebalpha.shop. Our support team operates 7 days a week from 9:00 AM to 11:00 PM IST."
  }
];

export default function HelpPage() {
  const breadcrumbs = [
    { name: "Support", url: "/contact" },
    { name: "Help Center", url: "https://zebalpha.shop/help" }
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      buildBreadcrumbSchema(breadcrumbs),
      buildFaqSchema(masterHelpFaqs),
      {
        "@type": "WebPage",
        "@id": "https://zebalpha.shop/help/#webpage",
        "url": "https://zebalpha.shop/help",
        "name": "ZEBALPHA Help & Customer Support Center",
        "description": "Comprehensive customer support, FAQs, and help center for ZEBALPHA apparel orders."
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
        <Header title="Help Center" subtitle="Customer Experience ✦" />

        <main className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-12 pb-24">
          <BreadcrumbsNav items={breadcrumbs} />

          <div className="space-y-4 text-center max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-800 bg-neutral-900 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-neutral-300">
              <HelpCircle className="h-3.5 w-3.5 text-white" />
              Assistance & Solutions
            </span>
            <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-tight text-white">
              How Can We Help You?
            </h1>
            <p className="text-sm sm:text-base leading-relaxed text-neutral-300 font-medium">
              Find quick answers to common questions about orders, deliveries, returns, sizing, and payments.
            </p>
          </div>

          <AeoAnswerBox
            title="Need Instant Support?"
            directAnswer={`For urgent order queries, write directly to support@zebalpha.shop. Orders dispatch in 24-48 hours, pan-India delivery arrives in 2-5 days, and all items feature a 7-day hassle-free exchange window.`}
            highlightChips={[
              { label: "Email Support", value: ZEBALPHA_BRAND_ENTITY.supportEmail },
              { label: "Support Hours", value: "9 AM - 11 PM (Daily)" },
              { label: "Exchange Window", value: "7 Days" }
            ]}
          />

          {/* Quick Help Portals */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
            <Link
              href="/profile/orders"
              className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-center hover:border-white transition-all flex flex-col items-center justify-center space-y-2 group"
            >
              <Package className="h-5 w-5 text-neutral-400 group-hover:text-white" />
              <span className="text-xs font-bold text-white">Track Order</span>
            </Link>

            <Link
              href="/return-policy"
              className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-center hover:border-white transition-all flex flex-col items-center justify-center space-y-2 group"
            >
              <RotateCcw className="h-5 w-5 text-neutral-400 group-hover:text-white" />
              <span className="text-xs font-bold text-white">Returns</span>
            </Link>

            <Link
              href="/shipping-policy"
              className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-center hover:border-white transition-all flex flex-col items-center justify-center space-y-2 group"
            >
              <CreditCard className="h-5 w-5 text-neutral-400 group-hover:text-white" />
              <span className="text-xs font-bold text-white">Shipping</span>
            </Link>

            <Link
              href="/size-guide"
              className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-center hover:border-white transition-all flex flex-col items-center justify-center space-y-2 group"
            >
              <Ruler className="h-5 w-5 text-neutral-400 group-hover:text-white" />
              <span className="text-xs font-bold text-white">Size Charts</span>
            </Link>

            <Link
              href="/contact"
              className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-center hover:border-white transition-all flex flex-col items-center justify-center space-y-2 group"
            >
              <Mail className="h-5 w-5 text-neutral-400 group-hover:text-white" />
              <span className="text-xs font-bold text-white">Contact Us</span>
            </Link>

            <Link
              href="https://seller.zebalpha.shop/register"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-center hover:border-white transition-all flex flex-col items-center justify-center space-y-2 group"
            >
              <Store className="h-5 w-5 text-emerald-400 group-hover:text-emerald-300" />
              <span className="text-xs font-bold text-emerald-400">Seller Hub</span>
            </Link>
          </div>

          <DynamicFaqSection
            title="Frequently Asked Questions"
            subtitle="Detailed answers regarding order tracking, payments, deliveries, and policies"
            faqs={masterHelpFaqs}
          />
        </main>
        <Footer />
      </div>
    </>
  );
}
