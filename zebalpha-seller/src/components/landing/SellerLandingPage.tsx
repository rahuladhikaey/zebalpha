"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@shared/utils/supabaseClient";
import {
  ArrowRight,
  BadgePercent,
  BarChart3,
  BookOpen,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileCheck2,
  Globe2,
  Handshake,
  LayoutDashboard,
  Mail,
  MapPin,
  Megaphone,
  Menu,
  PackageCheck,
  Palette,
  Play,
  Rocket,
  ShieldCheck,
  ShoppingBag,
  Flame,
  Store,
  TrendingUp,
  Truck,
  Users,
  X,
  Ban,
} from "lucide-react";

type SellerStory = {
  id: string;
  name: string;
  business: string;
  city: string;
  image: string;
  quote: string;
  highlight: string;
  fullStory: string;
  featured?: boolean;
};

const SELLER_STORIES: SellerStory[] = [
  {
    id: "story-1",
    name: "Aarav & Rohan Verma",
    business: "Urban Loom Apparel",
    city: "Tiruppur",
    image: "/images/seller-story-1.jpg",
    quote:
      "Our apparel business scaled far beyond local wholesale. Keeping 100% of our margin at 0% commission helped us launch fresh oversized tee drops every week.",
    highlight: "3.8x Monthly Order Growth",
    fullStory:
      "Starting from a small cotton knitting unit in Tiruppur, Aarav and Rohan listed 40 core oversized T-shirts on ZebAlpha Seller Hub. With zero marketplace commission, automated ZebAlpha courier pickups, and fast 5-day UPI settlements, they reinvested margins directly into new colorways and now ship across 18 Indian states.",
  },
  {
    id: "story-2",
    name: "Meera Deshmukh",
    business: "Kesar Ethnic Studio",
    city: "Jaipur",
    image: "/images/seller-story-2.jpg",
    quote:
      "I started selling on ZebAlpha with 4-5 daily boutique orders in my very first week. Easy listing, zero bank/PAN paperwork, and fast 5-day UPI payouts made going online completely stress-free.",
    highlight: "Zero Commission • 5-Day UPI Payouts",
    fullStory:
      "Meera ran a neighbourhood kurti & ethnic wear studio before joining ZebAlpha with her Enrolment ID. She prints thermal shipping labels straight from the Seller Dashboard and manages stock variants in minutes—turning her local studio into a pan-India direct-to-consumer brand.",
    featured: true,
  },
  {
    id: "story-3",
    name: "Rajesh & Dev Patel",
    business: "Vastra House Collective",
    city: "Surat",
    image: "/images/seller-story-3.jpg",
    quote:
      "ZebAlpha made transitioning our family textile business online effortless. Real-time inventory alerts and affordable Pan-India shipping helped us reach shoppers nationwide.",
    highlight: "28,000+ Pincode Reach",
    fullStory:
      "As a second-generation apparel supplier in Surat, Rajesh and Dev wanted a fair, seller-first marketplace without hefty commissions eating into margins. ZebAlpha's ledger transparency and SKU-level analytics helped them identify top-selling festive designs early and multiply festive season volume.",
  },
];

type MarketCategoryItem = {
  title: string;
  demandTag: string;
  insight: string;
};

const POPULAR_CATEGORIES_PRIMARY: MarketCategoryItem[] = [
  {
    title: "Trendy & Oversized T-Shirts",
    demandTag: "Top Demand",
    insight: "Fastest-moving streetwear & graphic tees among 18–30 social media shoppers.",
  },
  {
    title: "Kurtis & Women's Fashion",
    demandTag: "High Repeat",
    insight: "Year-round daily wear & festive orders across metro, Tier 2 & Tier 3 cities.",
  },
  {
    title: "Handmade Jewellery & Accessories",
    demandTag: "High Margin",
    insight: "Strong buyer appetite for unique, handcrafted designs not found in local stores.",
  },
  {
    title: "Custom & Personalised Gifts",
    demandTag: "Trending",
    insight: "High conversion on custom-printed tees, gift combos & personalised accessories.",
  },
  {
    title: "Sarees & Ethnic Sets",
    demandTag: "Festive Leader",
    insight: "Consistent nationwide demand for boutique ethnic wear at value-friendly prices.",
  },
  {
    title: "Men's Shirts & Casual Polos",
    demandTag: "Steady Volume",
    insight: "Reliable everyday & office-wear category for value-conscious 20–40 buyers.",
  },
  {
    title: "Hoodies & Streetwear Drops",
    demandTag: "Youth Favourite",
    insight: "High average order value for emerging small clothing labels & limited drops.",
  },
  {
    title: "Handmade Home Decor",
    demandTag: "Growing Fast",
    insight: "Artisanal room decor & aesthetic lifestyle pieces discovered via short videos.",
  },
];

const POPULAR_CATEGORIES_EXTRA: MarketCategoryItem[] = [
  {
    title: "Footwear & Everyday Socks",
    demandTag: "Daily Essential",
    insight: "High-volume casual sneakers, sliders, ethnic footwear & combo sock packs.",
  },
  {
    title: "Personalised Accessories",
    demandTag: "High Margin",
    insight: "Custom phone cases, keychains, wallets & name-engraved lifestyle add-ons.",
  },
  {
    title: "Tote Bags & Carry Essentials",
    demandTag: "College Trend",
    insight: "Printed canvas totes & compact slings popular with college & young shoppers.",
  },
  {
    title: "Watches & Style Essentials",
    demandTag: "Gift Pick",
    insight: "Affordable fashion watches & combo sets with strong COD conversion.",
  },
  {
    title: "Boutique & Regional Fashion",
    demandTag: "Tier 2 & 3 Hit",
    insight: "Local craft & boutique silhouettes that shoppers cannot easily find nearby.",
  },
  {
    title: "Winterwear & Layering",
    demandTag: "Seasonal Peak",
    insight: "Sweatshirts, jackets & fleece pullovers driving high-margin seasonal surges.",
  },
  {
    title: "Daily-Use Value Apparel",
    demandTag: "High Volume",
    insight: "Comfortable cotton basics & co-ord sets offering better quality for the price.",
  },
  {
    title: "Small-Brand Capsule Collections",
    demandTag: "Brand Growth",
    insight: "Direct-to-consumer launches for new labels scaling from wholesale to retail.",
  },
];

const TARGET_AUDIENCE_SEGMENTS = [
  {
    code: "Audience 01",
    ageTag: "Ages 18–30",
    title: "Young Fashion & Lifestyle Shoppers",
    icon: ShoppingBag,
    points: [
      "Actively shop for trendy T-shirts, oversized shirts, streetwear, and modern accessories.",
      "Look for fresh, unique designs and stylish fashion at affordable prices.",
      "Discover new products and emerging labels through social media and short-form video.",
      "Strongly prefer personalised and customised products that reflect their individuality.",
    ],
  },
  {
    code: "Audience 02",
    ageTag: "Ages 20–40",
    title: "Value-Conscious Everyday Shoppers",
    icon: Users,
    points: [
      "Shop regularly for affordable fashion and reliable daily-use lifestyle products.",
      "Prioritize dependable fabric and build quality at fair, reasonable prices.",
      "Expect Cash on Delivery (COD), easy returns, and trustworthy doorstep delivery.",
      "Always look for better product quality and lasting value within the same budget.",
    ],
  },
  {
    code: "Audience 03",
    ageTag: "Pan-India Reach",
    title: "Tier 2 & Tier 3 City Shoppers",
    icon: Globe2,
    points: [
      "High demand for curated and trendy products not easily available in local markets.",
      "Strong interest in affordable lifestyle upgrades, festive wear, and everyday fashion.",
      "Keen to explore authentic regional brands and emerging independent sellers.",
      "Value a dependable, transparent, and hassle-free online shopping experience.",
    ],
  },
];

const IDEAL_SELLER_PROFILES = [
  {
    tag: "High Priority",
    featured: true,
    title: "Handmade & Customised Product Sellers",
    icon: Palette,
    points: [
      "Handmade jewellery artisans and independent craft creators.",
      "Custom gift makers and personalised hamper brands.",
      "Printed T-shirt designers and made-to-order apparel creators.",
      "Handmade home decor studios and personalised accessory sellers.",
    ],
  },
  {
    tag: "Direct-to-Consumer",
    featured: false,
    title: "Local Manufacturers & Small Boutiques",
    icon: Building2,
    points: [
      "Local clothing and textile manufacturers scaling beyond regional trade.",
      "Small fashion houses and independent studio labels.",
      "Boutique owners expanding their collections to Pan-India buyers.",
      "Wholesale businesses transitioning smoothly into direct retail at 0% commission.",
    ],
  },
  {
    tag: "Launch Ready",
    featured: false,
    title: "Emerging Small Brands",
    icon: Rocket,
    points: [
      "Newly launched clothing and streetwear brands building loyal audiences.",
      "Growing D2C lifestyle and accessories labels.",
      "Local fashion brands expanding into digital commerce.",
      "Founders ready to launch fresh collections and new product drops nationwide.",
    ],
  },
];

const LEARNING_HUB_GUIDES = [
  {
    step: "01",
    title: "High-Converting Catalog Photography",
    points: [
      "Upload bright, clean front/back photos on neutral light backgrounds.",
      "Add accurate size charts, fabric GSM, and fit details to minimize returns.",
    ],
  },
  {
    step: "02",
    title: "Smart 0% Commission Pricing",
    points: [
      "Because ZebAlpha charges 0% marketplace commission, price competitively while protecting healthy profit margins.",
      "Offer multi-color & size variants under a single listing for higher conversion.",
    ],
  },
  {
    step: "03",
    title: "Fast Packing & Doorstep Pickup",
    points: [
      "Download thermal/A4 shipping labels with one click inside Seller Dashboard.",
      "Dispatch within 24 hours to qualify for faster delivery badges & higher buyer trust.",
    ],
  },
  {
    step: "04",
    title: "Zero Sensitive Paperwork & Safe UPI Payouts",
    points: [
      "No Bank Account Number, No PAN Card, and No Aadhaar Number needed to start selling on ZebAlpha.",
      "Receive 100% safe, direct payouts to your UPI ID / UPI Number within 5 days of order delivery.",
    ],
  },
];

const NAV_LINKS = [
  { label: "Sell Online", href: "#sell-online" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing & Commission", href: "#pricing" },
  { label: "Shipping & Returns", href: "#shipping" },
  { label: "Grow Business", href: "#grow-business" },
  { label: "Enrolment ID", href: "#enrolment-id" },
];

export function SellerLandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showMoreCategories, setShowMoreCategories] = useState(false);
  const [activeStory, setActiveStory] = useState<SellerStory | null>(null);
  const [learningHubOpen, setLearningHubOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check if seller already has an active authenticated session (to show quick Dashboard button)
  useEffect(() => {
    let mounted = true;
    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (mounted && data?.user) {
          setIsLoggedIn(true);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const visibleCategories = showMoreCategories
    ? [...POPULAR_CATEGORIES_PRIMARY, ...POPULAR_CATEGORIES_EXTRA]
    : POPULAR_CATEGORIES_PRIMARY;

  return (
    <div className="min-h-screen bg-white text-[#14120F] selection:bg-[#F5B922]/35 selection:text-[#14120F]">
      {/* ===================================================================== */}
      {/* 1. STICKY OFFICIAL NAVIGATION BAR                                     */}
      {/* ===================================================================== */}
      <header className="sticky top-0 z-50 bg-white/96 backdrop-blur-xl border-b border-[#F0E2BE] shadow-[0_4px_20px_rgba(166,124,28,0.06)]">
        {/* Signature ZebAlpha Bright Coral + Champagne Gold Top Accent Strip */}
        <div className="h-1 w-full bg-gradient-to-r from-[#F03A46] via-[#F5B922] to-[#F03A46]" />

        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 h-[70px]">
          {/* Left: Official ZebAlpha Brand (Full Black Wordmark) */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <img
              src="/official-logo.png"
              alt="ZebAlpha Seller Hub"
              className="h-10 w-10 rounded-full object-cover border-2 border-[#DFBE6F] shadow-sm"
            />
            <div className="leading-tight">
              <span className="block text-xl font-black tracking-tight text-[#000000]">
                zebalpha
              </span>
              <span className="block text-[9.5px] font-extrabold uppercase tracking-[0.18em] text-[#9A6503]">
                Seller Hub
              </span>
            </div>
          </Link>

          {/* Center: Desktop Navigation */}
          <nav className="hidden xl:flex items-center gap-6" aria-label="Seller Portal Navigation">
            {NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-[13.5px] font-semibold text-[#3A3122] hover:text-[#F03A46] transition-colors whitespace-nowrap"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* Right: Login + Start Selling (or Dashboard if already authenticated) */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            {isLoggedIn ? (
              <>
                <Link
                  href="/dashboard/home"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#F03A46] via-[#FF5757] to-[#E63946] px-5 py-2.5 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(240,58,70,0.28)] hover:brightness-105 active:scale-[0.98] transition-all"
                >
                  <LayoutDashboard size={16} />
                  <span>Go to Seller Home</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-xl border-[1.5px] border-[#DFBE6F] bg-[#FFFDF8] px-6 py-2.5 text-sm font-extrabold text-[#14120F] hover:border-[#F03A46] hover:text-[#F03A46] hover:bg-[#FFF4F2] active:scale-[0.98] transition-all"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#F03A46] via-[#FF5757] to-[#E63946] px-6 py-2.5 text-sm font-extrabold text-white shadow-[0_8px_20px_rgba(240,58,70,0.28)] hover:brightness-105 active:scale-[0.98] transition-all"
                >
                  Start Selling
                </Link>
              </>
            )}
          </div>

          {/* Mobile Actions + Menu Toggle */}
          <div className="flex sm:hidden items-center gap-2">
            <Link
              href={isLoggedIn ? "/dashboard/home" : "/login"}
              className="rounded-lg border border-[#DFBE6F] bg-[#FFFDF8] px-3 py-1.5 text-xs font-extrabold text-[#14120F]"
            >
              {isLoggedIn ? "Home" : "Login"}
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-[#F03A46] px-3 py-1.5 text-xs font-extrabold text-white shadow-sm"
            >
              Sell
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle Menu"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#EAD296] bg-[#FFFDF8] text-[#14120F]"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Navigation */}
        {mobileMenuOpen && (
          <div className="xl:hidden border-t border-[#F0E2BE] bg-[#FFFDF8] px-4 py-4 shadow-lg">
            <div className="flex flex-col space-y-2.5">
              {NAV_LINKS.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-xl px-3 py-2 text-sm font-bold text-[#2D2518] hover:bg-[#FAF2DC] hover:text-[#F03A46] transition"
                >
                  {item.label}
                </a>
              ))}
              <div className="pt-2 flex gap-2.5 border-t border-[#F0E2BE]">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center rounded-xl border-[1.5px] border-[#DFBE6F] bg-white py-2.5 text-xs font-extrabold text-[#14120F]"
                >
                  Seller Login
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center rounded-xl bg-gradient-to-r from-[#F03A46] to-[#FF5757] py-2.5 text-xs font-extrabold text-white"
                >
                  Start Selling
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* ===================================================================== */}
      {/* 2. HERO BANNER (ZEBALPHA YELLOW + GOLD + WHITE + BRIGHT CORAL)        */}
      {/* ===================================================================== */}
      <section
        id="sell-online"
        className="relative overflow-hidden bg-gradient-to-br from-[#FFF9F7] via-[#FFFDF8] to-[#FFF6E0] border-b border-[#F3E6C8]"
      >
        {/* Subtle festive floral watermark along top right edge */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-28 opacity-[0.07]"
          style={{
            backgroundImage: "url('/festive-header-bg.jpg')",
            backgroundSize: "520px auto",
            backgroundRepeat: "repeat-x",
            WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 100%)",
            maskImage: "linear-gradient(to bottom, black 0%, transparent 100%)",
          }}
        />

        {/* Soft Sweeping Coral-Golden Arch Background on Right Half */}
        <div
          aria-hidden="true"
          className="pointer-events-none hidden lg:block absolute right-0 top-6 bottom-0 w-[56%] rounded-tl-[260px] bg-gradient-to-br from-[#FFE8E4]/85 via-[#FFF2D4]/75 to-[#FFE5DE]/70"
        />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-0">
          <div className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-end">
            {/* Hero Left Copy */}
            <div className="pb-10 lg:pb-16">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#F5B922]/60 bg-[#FFF8DB] px-3.5 py-1.5 text-xs font-extrabold text-[#8A5A00] mb-5 shadow-sm">
                <Store size={14} className="text-[#F03A46]" />
                <span>Official ZebAlpha Supplier Portal • Pan-India</span>
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-[50px] font-black tracking-tight text-[#14120F] leading-[1.12]">
                Sell online to Crores of Customers at{" "}
                <span className="bg-gradient-to-r from-[#F03A46] via-[#FF5757] to-[#D97706] bg-clip-text text-transparent">
                  0% Commission
                </span>
              </h1>

              <p className="mt-4 text-base sm:text-lg font-medium text-[#5C4E35] max-w-xl leading-relaxed">
                Become a ZebAlpha seller and grow your business across India with a fast{" "}
                <strong className="text-[#14120F]">5-day payment cycle</strong> directly to your{" "}
                <strong className="text-[#14120F]">UPI ID / UPI Number</strong> — no Bank Account No., PAN, or Aadhaar required.
              </p>

              {/* Bright Coral NEW Ribbon Notice */}
              <div className="mt-5 flex flex-wrap items-center gap-2.5 text-sm font-medium text-[#3D3322]">
                <span className="inline-flex items-center rounded-md bg-gradient-to-r from-[#F03A46] to-[#FF6B6B] px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-white shadow-sm">
                  SAFE &amp; EASY
                </span>
                <span>
                  Start with just your Enrolment ID &amp; UPI ID — No Bank Account, PAN, or Aadhaar required!{" "}
                  <a
                    href="#enrolment-id"
                    className="font-extrabold text-[#F03A46] underline decoration-[#F03A46]/50 underline-offset-4 hover:text-[#C82333]"
                  >
                    Know more
                  </a>
                </span>
              </div>

              {/* Hero CTAs */}
              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#F03A46] via-[#FF5757] to-[#E63946] px-8 py-3.5 text-sm sm:text-base font-black text-white shadow-[0_12px_28px_rgba(240,58,70,0.32)] hover:brightness-105 active:scale-[0.98] transition-all"
                >
                  <span>Start Selling</span>
                  <ArrowRight size={17} />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-[1.5px] border-[#DFBE6F] bg-white px-7 py-3.5 text-sm sm:text-base font-extrabold text-[#14120F] shadow-sm hover:border-[#F03A46] hover:text-[#F03A46] hover:bg-[#FFF9F7] active:scale-[0.98] transition-all"
                >
                  <span>Seller Login</span>
                </Link>
              </div>
            </div>

            {/* Hero Right Visual: Glowing Pan-India 28,000+ Pincodes Map + Transparent ZebAlpha Seller Cutout */}
            <div className="relative flex items-end justify-center lg:justify-end min-h-[370px] sm:min-h-[440px] lg:min-h-[480px] pt-8 sm:pt-6">
              {/* Soft Golden Radial Halo behind India Map */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 -translate-x-1/2 lg:left-4 lg:translate-x-0 top-6 h-[320px] w-[320px] sm:h-[400px] sm:w-[400px] rounded-full bg-gradient-to-tr from-[#FCE89C]/45 via-[#FFD6CC]/35 to-transparent blur-2xl z-0"
              />

              {/* Official India Map Highlighting 28,000+ Serviceable Pincodes */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-1/2 -translate-x-[58%] sm:-translate-x-[56%] lg:left-[-28px] lg:translate-x-0 bottom-2 sm:bottom-3 w-[310px] sm:w-[410px] lg:w-[455px] z-10 select-none"
              >
                <div className="relative w-full">
                  <img
                    src="/images/india-pincodes-map.jpg"
                    alt="India Map showing 28,000+ ZebAlpha serviceable delivery pincodes across India"
                    className="w-full h-auto object-contain mix-blend-multiply opacity-95"
                  />

                  {/* Animated Live Radar Pulse Rings on Major Pan-India Pincode Hubs */}
                  {[
                    { top: "19%", left: "28%", label: "North" },
                    { top: "33%", left: "35%", label: "Delhi NCR" },
                    { top: "47%", left: "18%", label: "Gujarat" },
                    { top: "58%", left: "22%", label: "Mumbai" },
                    { top: "48%", left: "70%", label: "Kolkata" },
                    { top: "38%", left: "84%", label: "Northeast" },
                    { top: "74%", left: "36%", label: "South" },
                  ].map((hub, idx) => (
                    <span
                      key={hub.label}
                      style={{ top: hub.top, left: hub.left, animationDelay: `${idx * 240}ms` }}
                      className="absolute flex h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2"
                    >
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F03A46] opacity-55" />
                      <span className="relative inline-flex rounded-full h-2 w-2 m-auto bg-[#F03A46] ring-2 ring-white/90" />
                    </span>
                  ))}
                </div>
              </div>

              {/* Floating Callout Badge: 28,000+ Pincodes Across India */}
              <div
                aria-hidden="true"
                className="pointer-events-none flex absolute left-1 sm:left-2 lg:-left-6 top-2 sm:top-5 z-30 items-center gap-2.5 rounded-2xl bg-white/96 backdrop-blur-md border-[1.5px] border-[#DFBE6F] px-3.5 py-2 shadow-[0_10px_28px_rgba(240,58,70,0.16)]"
              >
                <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#F03A46] to-[#FF5757] text-white shadow-sm">
                  <MapPin size={16} />
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F5B922] opacity-80" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#F5B922] border border-white" />
                  </span>
                </span>
                <div className="leading-tight">
                  <span className="block text-xs sm:text-[13px] font-black text-[#14120F]">
                    28,000+ Pincodes
                  </span>
                  <span className="block text-[9.5px] sm:text-[10px] font-extrabold uppercase tracking-wider text-[#F03A46]">
                    Pan-India Delivery
                  </span>
                </div>
              </div>

              {/* Floating Top-Right Badge: 0% Commission */}
              <div
                aria-hidden="true"
                className="pointer-events-none flex absolute right-1 sm:right-2 top-3 sm:top-6 z-30 items-center gap-1.5 rounded-full bg-gradient-to-r from-[#FFF8DB] to-[#FCE89C] border border-[#DFBE6F] px-3 sm:px-3.5 py-1.5 text-[10.5px] sm:text-[11px] font-black text-[#8A5A00] shadow-md"
              >
                <BadgePercent size={13} className="text-[#F03A46]" />
                <span>0% Commission</span>
              </div>

              {/* Floating Lower-Left Trust Chip: 5-Day Safe UPI Payouts */}
              <div
                aria-hidden="true"
                className="pointer-events-none hidden sm:flex absolute left-0 lg:-left-4 bottom-6 z-30 items-center gap-2 rounded-2xl bg-white/95 backdrop-blur-md border border-[#EAD296] px-3.5 py-2 shadow-[0_10px_24px_rgba(166,124,28,0.14)]"
              >
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                <div className="leading-tight">
                  <span className="block text-[11px] font-black text-[#14120F]">5-Day UPI Payouts</span>
                  <span className="block text-[9.5px] font-bold text-[#6E5C3D]">No Bank A/C, PAN or Aadhaar</span>
                </div>
              </div>

              {/* Transparent Cutout Studio Seller Portrait (Zero Rectangular Box Edge!) */}
              <div className="relative z-20 ml-auto mr-0 sm:mr-2 lg:mr-1 w-[215px] sm:w-[265px] lg:w-[295px] flex items-end justify-end">
                <img
                  src="/images/seller-hero-cutout.png"
                  alt="Smiling ZebAlpha Indian seller holding official ZebAlpha branded shipping boxes across India"
                  className="w-full h-auto object-contain object-bottom drop-shadow-[0_14px_24px_rgba(110,60,15,0.18)] select-none"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 3. FOUR IMPACT METRIC CARDS                                           */}
      {/* ===================================================================== */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              highlight: "0%",
              title: "Commission fee — sellers keep 100% of their product margin",
            },
            {
              highlight: "5-Day",
              title: "Fast direct UPI ID payouts — no Bank A/C, PAN or Aadhaar needed",
            },
            {
              highlight: "28,000+",
              title: "Serviceable pincodes across India — we deliver everywhere",
            },
            {
              highlight: "100%",
              title: "Safe & private seller details with encrypted ZebAlpha onboarding",
            },
          ].map((stat) => (
            <div
              key={stat.highlight}
              className="rounded-2xl bg-[#FFFDF8] border border-[#F0E2BE] p-6 sm:p-7 shadow-[0_8px_24px_rgba(166,124,28,0.07)] hover:border-[#DFBE6F] hover:-translate-y-0.5 transition-all"
            >
              <p className="text-3xl sm:text-[34px] font-black tracking-tight bg-gradient-to-r from-[#F03A46] to-[#D97706] bg-clip-text text-transparent">
                {stat.highlight}
              </p>
              <p className="mt-2.5 text-base font-bold text-[#14120F] leading-snug">
                {stat.title}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 4. WHY SUPPLIERS LOVE ZEBALPHA (#pricing)                             */}
      {/* ===================================================================== */}
      <section id="pricing" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          {/* Left Title */}
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF4F2] border border-[#F03A46]/25 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-[#F03A46]">
              Seller First Policy
            </span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight text-[#14120F]">
              Why Suppliers Love ZebAlpha
            </h2>
            <p className="mt-4 text-base text-[#5C4E35] leading-relaxed max-w-md">
              All the benefits that come with selling on ZebAlpha are designed to help you sell more, protect your profit margins, and make it easier to grow your business across India.
            </p>
          </div>

          {/* Right White Feature Card with Dividers */}
          <div className="rounded-3xl bg-white border-[1.5px] border-[#EAD296] p-6 sm:p-9 shadow-[0_14px_40px_rgba(166,124,28,0.1)] divide-y divide-[#F3E7C8]">
            {/* Item 1 */}
            <div className="flex items-start gap-4 pb-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFF4F2] to-[#FFE2DC] border border-[#F03A46]/25 text-[#F03A46]">
                <BadgePercent size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#14120F]">0% Commission Fee</h3>
                <p className="mt-1 text-sm text-[#5C4E35] leading-relaxed">
                  Suppliers selling on ZebAlpha keep 100% of their selling profit by paying zero marketplace commission on orders.
                </p>
              </div>
            </div>

            {/* Item 2 */}
            <div className="flex items-start gap-4 py-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFF8DB] to-[#FCE89C] border border-[#DFBE6F] text-[#9A6503]">
                <Ban size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#14120F]">0 Penalty Charges</h3>
                <p className="mt-1 text-sm text-[#5C4E35] leading-relaxed">
                  Sell online without fear of surprise cancellation fees — 0 penalty charges for unforeseen cancellations or early onboarding adjustments.
                </p>
              </div>
            </div>

            {/* Item 3 */}
            <div className="flex items-start gap-4 py-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFF4F2] to-[#FCE89C]/60 border border-[#F03A46]/20 text-[#F03A46]">
                <TrendingUp size={24} />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#14120F]">Growth for Every Supplier</h3>
                <p className="mt-1 text-sm text-[#5C4E35] leading-relaxed">
                  From small local studios and unbranded manufacturers to growing streetwear labels — start selling easily with just your Enrolment ID.
                </p>
              </div>
            </div>

            {/* Item 4 */}
            <div className="flex items-start gap-4 pt-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFF8DB] to-[#FCE89C] border border-[#DFBE6F] text-[#9A6503]">
                <Handshake size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-black text-[#14120F]">Ease of Doing Business &amp; 100% Privacy</h3>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm font-semibold text-[#3D3322]">
                  <span className="inline-flex items-center gap-2">
                    <Check size={16} strokeWidth={3} className="text-[#F03A46] shrink-0" />
                    Easy Product Listing
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Check size={16} strokeWidth={3} className="text-[#F03A46] shrink-0" />
                    Lowest Cost Shipping
                  </span>
                  <span className="inline-flex items-center gap-2 sm:col-span-2">
                    <Check size={16} strokeWidth={3} className="text-[#F03A46] shrink-0" />
                    5-Day Payment Cycle directly to your UPI ID / UPI Number
                  </span>
                  <span className="inline-flex items-center gap-2 sm:col-span-2">
                    <Check size={16} strokeWidth={3} className="text-[#F03A46] shrink-0" />
                    No Bank Account No., PAN, or Aadhaar required — all details stay 100% safe
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 5. EXCLUSIVE SELLER+ LAUNCH REWARDS FOR THE FIRST 30 DAYS             */}
      {/* ===================================================================== */}
      <section className="my-8 bg-gradient-to-r from-[#FFF4F2] via-[#FFF9EB] to-[#FFF4F2] border-y border-[#F0E2BE] py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#DFBE6F] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#9A6503] shadow-sm">
                New Merchant Launch Boost
              </span>
              <h2 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight text-[#14120F] leading-tight">
                Exclusive Seller+ Rewards for the first 30 days
              </h2>
              <p className="mt-3 text-sm sm:text-base text-[#5C4E35] max-w-md">
                Every newly verified ZebAlpha merchant gets priority onboarding perks to generate their first orders faster.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              {/* Card 1 */}
              <div className="rounded-3xl bg-white border border-[#EAD296] p-7 shadow-[0_14px_34px_rgba(166,124,28,0.12)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F03A46] to-[#FF6B6B] text-white shadow-md">
                  <Megaphone size={22} />
                </div>
                <h3 className="mt-5 text-lg font-black text-[#14120F]">
                  Free Catalog Visibility Boost
                </h3>
                <p className="mt-2.5 text-sm text-[#5C4E35] leading-relaxed">
                  Get featured discovery placement inside Trending Picks on ZebAlpha Web &amp; App to attract your first buyers quickly.
                </p>
              </div>

              {/* Card 2 */}
              <div className="rounded-3xl bg-white border border-[#EAD296] p-7 shadow-[0_14px_34px_rgba(166,124,28,0.12)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FCE89C] via-[#F5B922] to-[#D9910F] text-[#14120F] shadow-md">
                  <ShieldCheck size={22} />
                </div>
                <h3 className="mt-5 text-lg font-black text-[#14120F]">
                  No Order Cancellation Charges
                </h3>
                <p className="mt-2.5 text-sm text-[#5C4E35] leading-relaxed">
                  Cancel orders that you can&apos;t fulfil for unforeseen inventory reasons without worrying about marketplace penalties.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 6. EXPERIENCES SELLERS LOVE TO TALK ABOUT                             */}
      {/* ===================================================================== */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-20">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#14120F]">
            Experiences sellers love to talk about
          </h2>
          <p className="mt-2.5 text-sm sm:text-base text-[#5C4E35]">
            Real Indian apparel makers, homegrown labels, and wholesalers growing online with ZebAlpha.
          </p>
        </div>

        <div className="mt-12 grid gap-7 md:grid-cols-3 items-stretch">
          {SELLER_STORIES.map((story) => (
            <div
              key={story.id}
              onClick={() => setActiveStory(story)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setActiveStory(story);
                }
              }}
              className={`group rounded-3xl p-5 transition-all cursor-pointer flex flex-col ${
                story.featured
                  ? "bg-white border-2 border-[#DFBE6F] shadow-[0_20px_50px_rgba(166,124,28,0.16)] md:-translate-y-2"
                  : "bg-[#FFFDF8] border border-[#F0E2BE] shadow-[0_10px_28px_rgba(166,124,28,0.08)] hover:border-[#DFBE6F] hover:-translate-y-1"
              }`}
            >
              <div className="relative">
                <div className="aspect-[16/10] w-full overflow-hidden rounded-2xl bg-[#FAF2DC]">
                  <img
                    src={story.image}
                    alt={`${story.name} - ${story.business}`}
                    loading="lazy"
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                {/* Story Spotlight Circle Badge */}
                <span className="absolute -bottom-5 left-4 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#F03A46] to-[#FF5757] text-white ring-4 ring-white shadow-lg group-hover:scale-110 transition-transform">
                  <Play size={16} className="fill-white ml-0.5" />
                </span>
              </div>

              <div className="mt-8 flex-1 flex flex-col">
                <h3 className="text-lg font-black text-[#14120F]">{story.name}</h3>
                <p className="text-xs font-bold text-[#9A6503] mt-0.5">
                  {story.business}, {story.city}
                </p>
                <p className="mt-3 text-sm text-[#4A3F2B] leading-relaxed flex-1">
                  &ldquo;{story.quote}&rdquo;
                </p>
                <div className="mt-4 pt-3 border-t border-[#F3E7C8] flex items-center justify-between text-xs font-extrabold">
                  <span className="text-[#F03A46]">{story.highlight}</span>
                  <span className="text-[#6E5C3D] group-hover:text-[#14120F] inline-flex items-center gap-1">
                    Read story <ArrowRight size={13} />
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 7. HOW IT WORKS (5-STEP CONNECTED STEPPER)                            */}
      {/* ===================================================================== */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <h2 className="text-center text-3xl sm:text-4xl font-black tracking-tight text-[#14120F] mb-10">
          How it works
        </h2>

        <div className="rounded-3xl bg-[#FFFBF2] border border-[#EAD296] p-7 sm:p-10 shadow-[0_12px_32px_rgba(166,124,28,0.08)]">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-8 relative">
            {[
              {
                num: 1,
                title: "Create Account",
                desc: "No Bank Account No., PAN, or Aadhaar required. All you need is:",
                bullets: [
                  "Verified Email & Pickup Address",
                  "UPI ID / UPI Number (100% safe direct payouts)",
                  "15-character Enrolment ID (free to generate online)",
                ],
              },
              {
                num: 2,
                title: "List Products",
                desc: "List the products, sizes, colors & prices you want to sell in your ZebAlpha Seller Panel.",
              },
              {
                num: 3,
                title: "Get Orders",
                desc: "Start receiving orders from shoppers across India browsing ZebAlpha Web & Android App.",
              },
              {
                num: 4,
                title: "Affordable Shipping",
                desc: "Enjoy doorstep courier pickup and affordable Pan-India shipping across 28,000+ pincodes.",
              },
              {
                num: 5,
                title: "Receive Payments",
                desc: "Your income is sent directly and safely to your UPI ID / UPI Number on a fast 5-day payment cycle from delivery.",
              },
            ].map((step, index) => (
              <div key={step.num} className="relative">
                {/* Connecting horizontal line on desktop */}
                {index < 4 && (
                  <div
                    aria-hidden="true"
                    className="hidden md:block absolute top-5 left-12 right-[-20px] h-[2px] bg-gradient-to-r from-[#F03A46]/60 to-[#F5B922]/60"
                  />
                )}

                <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#F03A46] to-[#FF5757] text-sm font-black text-white shadow-[0_6px_14px_rgba(240,58,70,0.3)]">
                  {step.num}
                </div>

                <h3 className="mt-4 text-base font-black text-[#14120F]">{step.title}</h3>
                <p className="mt-2 text-xs sm:text-[13px] text-[#5C4E35] leading-relaxed">
                  {step.desc}
                </p>
                {step.bullets && (
                  <ul className="mt-2 space-y-1.5 text-xs text-[#4A3F2B] font-medium">
                    {step.bullets.map((b) => (
                      <li key={b} className="flex items-start gap-1.5">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#F03A46] shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          <div className="mt-9 pt-6 border-t border-[#EAD296]/70 flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs sm:text-sm font-bold text-[#5C4E35]">
              Ready in under 5 minutes — verified via email OTP with zero onboarding fee.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#FCE89C] via-[#F5B922] to-[#DDA216] border border-[#C68A12]/60 px-6 py-2.5 text-xs sm:text-sm font-black text-[#14120F] shadow-sm hover:brightness-105 transition"
            >
              <span>Create Free Seller Account</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 8. ZEBALPHA SELLER LEARNING HUB BANNER                                */}
      {/* ===================================================================== */}
      <section className="bg-[#FFF9EB] border-y border-[#F0E2BE] py-12 sm:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-2xl font-black tracking-tight text-[#000000]">zebalpha</span>
              <span className="h-6 w-[1.5px] bg-[#DFBE6F]" />
              <span className="text-sm font-extrabold text-[#14120F] leading-tight">
                Seller
                <br />
                LearningHub
              </span>
            </div>
            <h2 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-[#14120F]">
              Learn how to sell and grow your business on ZebAlpha
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setLearningHubOpen(true)}
            className="inline-flex items-center gap-3 rounded-2xl border-[1.5px] border-[#F03A46]/45 bg-white px-7 py-4 text-sm font-black text-[#F03A46] shadow-sm hover:bg-[#FFF4F2] hover:border-[#F03A46] active:scale-[0.98] transition-all cursor-pointer w-fit"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#F03A46] to-[#FF5757] text-white">
              <BookOpen size={15} />
            </span>
            <span>Visit Learning Hub</span>
          </button>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 9. GROW YOUR BUSINESS WITH ZEBALPHA (#grow-business & #shipping)      */}
      {/* ===================================================================== */}
      <section
        id="grow-business"
        className="bg-gradient-to-b from-[#FFF6F4] via-[#FFFBF2] to-[#FFFDF8] py-16 sm:py-20"
      >
        <div id="shipping" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#EAD296] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#9A6503]">
                Tools Built to Scale
              </span>
              <h2 className="mt-4 text-3xl sm:text-4xl font-black tracking-tight text-[#14120F] leading-tight">
                Grow Your Business With ZebAlpha
              </h2>
              <p className="mt-3 text-sm sm:text-base text-[#5C4E35] leading-relaxed">
                Everything from Pan-India courier integration to live revenue insights—ready inside your Seller Dashboard from Day 1.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              {/* Left staggered column */}
              <div className="space-y-6">
                <div className="rounded-3xl bg-white border border-[#EAD296] p-7 shadow-[0_12px_30px_rgba(166,124,28,0.09)]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF4F2] border border-[#F03A46]/25 text-[#F03A46]">
                    <Truck size={23} />
                  </div>
                  <h3 className="mt-4 text-lg font-black text-[#14120F]">
                    Efficient &amp; Affordable Shipping
                  </h3>
                  <p className="mt-2 text-sm text-[#5C4E35] leading-relaxed">
                    Sell your products across India to over 28,000+ serviceable pincodes with automated doorstep pickup and transparent shipping labels.
                  </p>
                </div>

                <div className="rounded-3xl bg-white border border-[#EAD296] p-7 shadow-[0_12px_30px_rgba(166,124,28,0.09)]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF8DB] border border-[#DFBE6F] text-[#9A6503]">
                    <Rocket size={23} />
                  </div>
                  <h3 className="mt-4 text-lg font-black text-[#14120F]">
                    Next Day Dispatch (NDD) Program
                  </h3>
                  <p className="mt-2 text-sm text-[#5C4E35] leading-relaxed">
                    Faster shipping timelines for reliable sellers with priority pickup support, boosting buyer trust and repeat orders.
                  </p>
                </div>
              </div>

              {/* Right staggered column */}
              <div className="space-y-6 sm:mt-8">
                <div className="rounded-3xl bg-white border border-[#EAD296] p-7 shadow-[0_12px_30px_rgba(166,124,28,0.09)]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FFF4F2] to-[#FCE89C]/70 border border-[#F03A46]/20 text-[#F03A46]">
                    <Flame size={23} />
                  </div>
                  <h3 className="mt-4 text-lg font-black text-[#14120F]">
                    Storefront Drops &amp; Visibility
                  </h3>
                  <p className="mt-2 text-sm text-[#5C4E35] leading-relaxed">
                    Feature your best collections inside ZebAlpha Curated Drops, Trending Now &amp; personalized shopper feeds to accelerate sales.
                  </p>
                </div>

                <div className="rounded-3xl bg-white border border-[#EAD296] p-7 shadow-[0_12px_30px_rgba(166,124,28,0.09)]">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF8DB] border border-[#DFBE6F] text-[#9A6503]">
                    <BarChart3 size={23} />
                  </div>
                  <h3 className="mt-4 text-lg font-black text-[#14120F]">Business Insights</h3>
                  <p className="mt-2 text-sm text-[#5C4E35] leading-relaxed">
                    Use live order analytics, inventory alerts, and settlement ledger breakdowns so you always stay on top of your business.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 10. ENROLMENT ID ONBOARDING + SAFE 5-DAY UPI PAYOUTS (#enrolment-id)  */}
      {/* ===================================================================== */}
      <section id="enrolment-id" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-16">
        <div className="rounded-[2rem] bg-gradient-to-br from-[#FFF8DB] via-[#FFFDF8] to-[#FFF2EE] border-[1.5px] border-[#DFBE6F] p-7 sm:p-10 shadow-[0_14px_36px_rgba(166,124,28,0.12)]">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-[#F03A46] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                <FileCheck2 size={13} />
                <span>100% Safe • Enrolment ID Onboarding</span>
              </div>
              <h2 className="mt-4 text-2xl sm:text-3xl font-black tracking-tight text-[#14120F]">
                Start with Just Your Enrolment ID — Receive Payouts Directly via UPI!
              </h2>
              <p className="mt-3 text-sm sm:text-base text-[#4A3F2B] leading-relaxed">
                Your privacy and safety come first on <strong className="text-[#000000]">ZebAlpha</strong>. You do{" "}
                <strong className="text-[#14120F]">not need to share your Bank Account Number, PAN Card, or Aadhaar Number</strong> to start selling. Simply enter your{" "}
                <strong className="text-[#14120F]">15-character Enrolment ID</strong>, connect your{" "}
                <strong className="text-[#14120F]">UPI ID / UPI Number</strong>, and receive your full earnings safely within a fast{" "}
                <strong className="text-[#F03A46]">5-day payment cycle</strong>.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#F03A46] to-[#FF5757] px-6 py-3 text-sm font-black text-white shadow-[0_8px_20px_rgba(240,58,70,0.28)] hover:brightness-105 transition"
                >
                  <span>Start Selling with Enrolment ID</span>
                  <ArrowRight size={16} />
                </Link>
                <a
                  href="https://reg.gst.gov.in/registration/generateuid"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border-[1.5px] border-[#DFBE6F] bg-white px-5 py-3 text-sm font-extrabold text-[#14120F] hover:border-[#F03A46] hover:text-[#F03A46] transition"
                >
                  <span>Generate Free Enrolment ID</span>
                  <ArrowRight size={15} />
                </a>
              </div>
              <p className="mt-4 text-[11px] text-[#7A6847] leading-relaxed">
                All seller contact, Enrolment ID &amp; UPI details are strictly protected and encrypted on ZebAlpha.
              </p>
            </div>

            <div className="grid gap-3">
              {[
                {
                  step: "1",
                  title: "No Bank A/C, PAN or Aadhaar Required",
                  desc: "Keep your sensitive personal and banking documents completely private — never asked at signup.",
                },
                {
                  step: "2",
                  title: "Connect Only Your UPI ID / UPI Number",
                  desc: "Receive 100% safe, automated earnings straight to your UPI ID / UPI Number within 5 days of delivery.",
                },
                {
                  step: "3",
                  title: "Simple Enrolment ID Onboarding",
                  desc: "Create your seller account using your free 15-character Enrolment ID at 0% marketplace commission.",
                },
              ].map((row) => (
                <div
                  key={row.step}
                  className="flex items-start gap-3.5 rounded-2xl bg-white/95 border border-[#EAD296] p-4 shadow-sm"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#FCE89C] to-[#EAB308] text-xs font-black text-[#14120F]">
                    {row.step}
                  </span>
                  <div>
                    <p className="text-sm font-black text-[#14120F]">{row.title}</p>
                    <p className="text-xs text-[#5C4E35] mt-0.5">{row.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 11. TARGET AUDIENCE & IDEAL SELLERS ON ZEBALPHA                       */}
      {/* ===================================================================== */}
      <section
        id="target-audience"
        className="bg-gradient-to-b from-[#FFFDF8] via-[#FFF9EB] to-white border-t border-[#F3E7C8] py-14 sm:py-18"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-14">
          {/* Block A: Who Shops on ZebAlpha (Target Audience) */}
          <div>
            <div className="max-w-3xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#EAD296] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#9A6503]">
                Buyer Market Insights
              </span>
              <h2 className="mt-3.5 text-2xl sm:text-3xl font-black tracking-tight text-[#14120F]">
                Target Audience Shopping on ZebAlpha
              </h2>
              <p className="mt-2.5 text-sm sm:text-base text-[#5C4E35] leading-relaxed">
                Understand the high-intent Indian buyer segments actively discovering fashion, customised goods, and everyday lifestyle products on ZebAlpha.
              </p>
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {TARGET_AUDIENCE_SEGMENTS.map((segment) => {
                const Icon = segment.icon;
                return (
                  <div
                    key={segment.title}
                    className="rounded-3xl bg-white border border-[#EAD296] p-6 sm:p-7 shadow-[0_12px_30px_rgba(166,124,28,0.08)] flex flex-col"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FFF8DB] border border-[#DFBE6F] text-[#9A6503]">
                        <Icon size={21} />
                      </span>
                      <span className="rounded-full bg-[#FFF4F2] border border-[#F03A46]/25 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#F03A46]">
                        {segment.ageTag}
                      </span>
                    </div>

                    <p className="mt-4 text-[10px] font-black uppercase tracking-widest text-[#9A6503]">
                      {segment.code}
                    </p>
                    <h3 className="mt-1 text-lg font-black text-[#14120F] leading-snug">
                      {segment.title}
                    </h3>

                    <ul className="mt-4 space-y-2.5 text-sm text-[#4A3F2B] leading-relaxed flex-1">
                      {segment.points.map((pt) => (
                        <li key={pt} className="flex items-start gap-2.5">
                          <CheckCircle2
                            size={15}
                            className="mt-0.5 shrink-0 text-[#F03A46]"
                          />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Block B: Ideal Sellers Who Succeed on ZebAlpha */}
          <div className="pt-2 border-t border-[#F3E7C8]">
            <div className="max-w-3xl pt-8">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF4F2] border border-[#F03A46]/25 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#F03A46]">
                Who Should Sell on ZebAlpha
              </span>
              <h2 className="mt-3.5 text-2xl sm:text-3xl font-black tracking-tight text-[#14120F]">
                Built for Creators, Boutiques &amp; Emerging Brands
              </h2>
              <p className="mt-2.5 text-sm sm:text-base text-[#5C4E35] leading-relaxed">
                Whether you craft personalised pieces, run a local manufacturing unit, or are launching a fresh brand, ZebAlpha gives you 0% commission growth from Day 1.
              </p>
            </div>

            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {IDEAL_SELLER_PROFILES.map((profile) => {
                const Icon = profile.icon;
                return (
                  <div
                    key={profile.title}
                    className={`rounded-3xl p-6 sm:p-7 flex flex-col border ${
                      profile.featured
                        ? "bg-gradient-to-br from-[#FFF8DB] via-[#FFFDF8] to-[#FFF2EE] border-[1.5px] border-[#F03A46]/55 shadow-[0_14px_34px_rgba(240,58,70,0.12)]"
                        : "bg-white border-[#EAD296] shadow-[0_12px_30px_rgba(166,124,28,0.08)]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
                          profile.featured
                            ? "bg-gradient-to-br from-[#F03A46] to-[#FF5757] border-[#F03A46] text-white shadow-sm"
                            : "bg-[#FFF8DB] border-[#DFBE6F] text-[#9A6503]"
                        }`}
                      >
                        <Icon size={21} />
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                          profile.featured
                            ? "bg-[#F03A46] text-white shadow-sm"
                            : "bg-[#FFF8DB] border border-[#DFBE6F] text-[#9A6503]"
                        }`}
                      >
                        {profile.tag}
                      </span>
                    </div>

                    <h3 className="mt-5 text-lg font-black text-[#14120F] leading-snug">
                      {profile.title}
                    </h3>

                    <ul className="mt-4 space-y-2.5 text-sm text-[#4A3F2B] leading-relaxed flex-1">
                      {profile.points.map((pt) => (
                        <li key={pt} className="flex items-start gap-2.5">
                          <Check
                            size={15}
                            strokeWidth={2.75}
                            className="mt-0.5 shrink-0 text-[#9A6503]"
                          />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 12. POPULAR CATEGORIES TO SELL ONLINE (MARKET DEMAND GUIDE — NO LINKS)*/}
      {/* ===================================================================== */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 border-t border-[#F3E7C8]">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF8DB] border border-[#EAD296] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#9A6503]">
            Market Demand Guide
          </span>
          <h2 className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-[#14120F]">
            Popular Categories to Sell Online
          </h2>
          <p className="mt-2 text-sm sm:text-base text-[#5C4E35] leading-relaxed">
            High-performing categories across the Indian e-commerce market with strong buyer demand, healthy seller margins, and repeat purchase potential.
          </p>
        </div>

        <div className="mt-7 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {visibleCategories.map((cat) => (
            <div
              key={cat.title}
              className="rounded-2xl border border-[#F0E2BE] bg-[#FFFDF8] p-4 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-block rounded-full bg-[#FFF4F2] border border-[#F03A46]/20 px-2.5 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-[#F03A46]">
                  {cat.demandTag}
                </span>
              </div>
              <h3 className="text-sm font-black text-[#14120F] leading-snug pt-0.5">
                {cat.title}
              </h3>
              <p className="text-xs text-[#5C4E35] leading-relaxed">
                {cat.insight}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={() => setShowMoreCategories((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#EAD296] bg-[#FFFDF8] px-5 py-2 text-xs font-black text-[#14120F] hover:border-[#F03A46] hover:text-[#F03A46] transition cursor-pointer"
          >
            <span>{showMoreCategories ? "View Less" : "View More Categories"}</span>
            {showMoreCategories ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 12. ZEBALPHA SELLER SUPPORT AVAILABLE 24/7                            */}
      {/* ===================================================================== */}
      <section className="bg-[#FFF9EB] border-y border-[#F0E2BE] py-14 sm:py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 grid gap-6 md:grid-cols-[0.85fr_1.15fr] md:items-center">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#14120F]">
              ZebAlpha Seller Support
              <br />
              Available 24/7
            </h2>
          </div>

          <div>
            <p className="text-sm sm:text-base text-[#5C4E35] leading-relaxed">
              ZebAlpha seller support is available to solve all your doubts and issues before and after you start your online selling business.
            </p>
            <div className="mt-5 flex items-center gap-3.5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#F03A46] to-[#FF5757] text-white shadow-md">
                <Mail size={20} />
              </span>
              <div className="text-sm">
                <p className="text-xs font-semibold text-[#6E5C3D]">You can reach out to</p>
                <a
                  href="mailto:support@zebalpha.shop"
                  className="font-extrabold text-[#F03A46] hover:underline"
                >
                  support@zebalpha.shop
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================================================================== */}
      {/* 13. CLEAN OFFICIAL SUPPLIER FOOTER                                    */}
      {/* ===================================================================== */}
      <footer className="bg-white pt-14 pb-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-3">
            {/* Brand + Start Selling CTA */}
            <div>
              <Link href="/" className="inline-flex items-center gap-2.5">
                <img
                  src="/official-logo.png"
                  alt="ZebAlpha Logo"
                  className="h-11 w-11 rounded-full object-cover border-2 border-[#DFBE6F]"
                />
                <span className="text-2xl font-black tracking-tight text-[#000000]">
                  zebalpha
                </span>
              </Link>
              <p className="mt-4 text-sm text-[#5C4E35] max-w-xs leading-relaxed">
                Sell your products to customers across India on ZebAlpha at 0% commission with fast, safe 5-day direct UPI payouts.
              </p>
              <div className="mt-6 flex items-center gap-3">
                <Link
                  href="/register"
                  className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-[#F03A46] to-[#FF5757] px-6 py-2.5 text-sm font-extrabold text-white shadow-[0_8px_18px_rgba(240,58,70,0.25)] hover:brightness-105 transition"
                >
                  Start Selling
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center rounded-xl border border-[#DFBE6F] bg-[#FFFDF8] px-5 py-2.5 text-sm font-extrabold text-[#14120F] hover:border-[#F03A46] hover:text-[#F03A46] transition"
                >
                  Login
                </Link>
              </div>
            </div>

            {/* Sell on ZebAlpha Links */}
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-[#14120F]">
                Sell on ZebAlpha
              </h3>
              <ul className="mt-4 space-y-2.5 text-sm font-medium text-[#5C4E35]">
                <li>
                  <a href="#sell-online" className="hover:text-[#F03A46] transition-colors">
                    Sell Online
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-[#F03A46] transition-colors">
                    Pricing &amp; Commission
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" className="hover:text-[#F03A46] transition-colors">
                    How it works
                  </a>
                </li>
                <li>
                  <a href="#shipping" className="hover:text-[#F03A46] transition-colors">
                    Shipping &amp; Returns
                  </a>
                </li>
                <li>
                  <a href="#grow-business" className="hover:text-[#F03A46] transition-colors">
                    Grow Your Business
                  </a>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setLearningHubOpen(true)}
                    className="hover:text-[#F03A46] transition-colors cursor-pointer"
                  >
                    Learning Hub
                  </button>
                </li>
                <li>
                  <a
                    href="https://zebalpha.shop"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#F03A46] transition-colors"
                  >
                    Shop Online on ZebAlpha
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact Us */}
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-[#14120F]">
                Contact Us
              </h3>
              <div className="mt-4 space-y-3 text-sm text-[#5C4E35]">
                <a
                  href="mailto:support@zebalpha.shop"
                  className="block font-bold text-[#14120F] hover:text-[#F03A46] transition-colors"
                >
                  support@zebalpha.shop
                </a>
                <p className="text-xs text-[#6E5C3D]">
                  ZebAlpha Merchant Operations • Kolkata, West Bengal, India
                </p>
                <div className="flex items-center gap-2.5 pt-1">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFF4F2] border border-[#F03A46]/25 px-3 py-1.5 text-xs font-extrabold text-[#F03A46] hover:bg-[#F03A46] hover:text-white transition"
                  >
                    <PackageCheck size={14} />
                    <span>Seller Portal</span>
                  </Link>
                  <a
                    href="https://zebalpha.shop"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFF8DB] border border-[#DFBE6F] px-3 py-1.5 text-xs font-extrabold text-[#9A6503] hover:bg-[#F5B922] hover:text-[#14120F] transition"
                  >
                    <Store size={14} />
                    <span>Main Store</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-[#F0E2BE] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-medium text-[#7A6847]">
            <p>© 2026 ZEBALPHA. All Rights Reserved.</p>
            <div className="flex items-center gap-4">
              <a
                href="https://zebalpha.shop/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#14120F]"
              >
                Privacy Policy
              </a>
              <a
                href="https://zebalpha.shop/terms-and-conditions"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#14120F]"
              >
                Terms &amp; Conditions
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* ===================================================================== */}
      {/* INTERACTIVE MODAL: SELLER STORY SPOTLIGHT                             */}
      {/* ===================================================================== */}
      {activeStory && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
          onClick={() => setActiveStory(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-white border-2 border-[#DFBE6F] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[16/9] w-full bg-[#FAF2DC]">
              <img
                src={activeStory.image}
                alt={activeStory.name}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => setActiveStory(null)}
                aria-label="Close Story"
                className="absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[#14120F] shadow-md hover:bg-[#F03A46] hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
              <span className="absolute bottom-3 left-3 rounded-full bg-[#F03A46] px-3 py-1 text-[11px] font-black text-white shadow">
                {activeStory.highlight}
              </span>
            </div>
            <div className="p-6">
              <h3 className="text-xl font-black text-[#14120F]">{activeStory.name}</h3>
              <p className="text-xs font-extrabold text-[#9A6503] mt-0.5">
                {activeStory.business} • {activeStory.city}
              </p>
              <p className="mt-4 text-sm text-[#3D3322] leading-relaxed">
                {activeStory.fullStory}
              </p>
              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveStory(null)}
                  className="rounded-xl border border-[#EAD296] px-4 py-2 text-xs font-bold text-[#5C4E35] hover:bg-[#FFF9EB] cursor-pointer"
                >
                  Close
                </button>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#F03A46] to-[#FF5757] px-5 py-2 text-xs font-black text-white shadow"
                >
                  <span>Start Your Journey</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* INTERACTIVE MODAL: SELLER LEARNING HUB QUICK PLAYBOOK                 */}
      {/* ===================================================================== */}
      {learningHubOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 backdrop-blur-sm p-4"
          onClick={() => setLearningHubOpen(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-3xl bg-white border-2 border-[#DFBE6F] p-6 sm:p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#F0E2BE]">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF4F2] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#F03A46]">
                  ZebAlpha Seller Learning Hub
                </span>
                <h3 className="mt-2 text-xl sm:text-2xl font-black text-[#14120F]">
                  Quick-Start Playbook for Indian Sellers
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setLearningHubOpen(false)}
                aria-label="Close Learning Hub"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#EAD296] bg-[#FFFDF8] text-[#14120F] hover:bg-[#F03A46] hover:text-white transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 grid sm:grid-cols-2 gap-4">
              {LEARNING_HUB_GUIDES.map((guide) => (
                <div
                  key={guide.step}
                  className="rounded-2xl bg-[#FFFDF8] border border-[#EAD296] p-4"
                >
                  <span className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-[#FCE89C] to-[#F5B922] px-2 py-0.5 text-[11px] font-black text-[#14120F]">
                    Guide {guide.step}
                  </span>
                  <h4 className="mt-2.5 text-sm font-black text-[#14120F]">{guide.title}</h4>
                  <ul className="mt-2 space-y-1.5 text-xs text-[#4A3F2B]">
                    {guide.points.map((pt) => (
                      <li key={pt} className="flex items-start gap-1.5">
                        <CheckCircle2 size={13} className="text-[#F03A46] shrink-0 mt-0.5" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-[#F0E2BE] flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold text-[#5C4E35]">
                Need onboarding help? Email <strong className="text-[#F03A46]">support@zebalpha.shop</strong>
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#F03A46] to-[#FF5757] px-6 py-2.5 text-xs font-black text-white shadow"
              >
                <span>Start Selling Free</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
