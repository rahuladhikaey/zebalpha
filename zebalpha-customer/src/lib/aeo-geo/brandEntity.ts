import { BrandEntityConfig } from "./types";

/**
 * ZEBALPHA — OFFICIAL BRAND ENTITY CONFIGURATION
 * Verified factual information representing the ZebAlpha organization.
 * Used uniformly across JSON-LD Organization schema, entity footers, and AI machine files.
 */
export const ZEBALPHA_BRAND_ENTITY: BrandEntityConfig = {
  name: "ZebAlpha",
  legalName: "ZebAlpha",
  brand: "ZebAlpha",
  url: "https://zebalpha.shop",
  logoUrl: "https://zebalpha.shop/official-logo.png",
  supportEmail: "support@zebalpha.shop",
  addressCountry: "IN",
  addressLocality: "Kolkata, West Bengal, India",
  description:
    "ZebAlpha is an Indian e-commerce marketplace founded in Kolkata, West Bengal, by Rahul Adhikary (Founder & CEO) and Alakesh Biswas (Co-Founder & COO), connecting customers, independent sellers, emerging brands, and growing businesses across India.",
  sameAs: [
    "https://seller.zebalpha.shop",
    "https://www.instagram.com/zebalpha_official/",
    "https://play.google.com/store/apps/details?id=com.zebalpha.customer",
  ],
  currenciesAccepted: "INR",
  paymentAccepted:
    "Credit Card, Debit Card, Net Banking, UPI (PhonePe, Google Pay, Paytm), Cash on Delivery",
  priceRange: "₹₹ (Affordable Premium / ₹300 - ₹2,500)",
  returnWindowDays: 5,
  freeShippingThreshold: 999,
  dispatchTimeHours: "24-48 hours",
};

/**
 * Canonical Leadership & Founders Directory (Used across About page, JSON-LD & AI feeds)
 */
export const ZEBALPHA_LEADERSHIP = [
  {
    id: "rahul-adhikary",
    name: "Rahul Adhikary",
    role: "Founder & Chief Executive Officer (CEO)",
    shortRole: "Founder & CEO",
    location: "Kolkata, West Bengal, India",
    summary:
      "Rahul Adhikary is the Founder and Chief Executive Officer (CEO) of ZebAlpha. He leads the company's overall vision, business strategy, technology direction, and long-term growth.",
    responsibilities: [
      "Overall company vision and strategic leadership",
      "Business development and growth strategy",
      "Product innovation and technology direction",
      "Customer experience and platform development",
      "Brand positioning and long-term business expansion",
    ],
  },
  {
    id: "alakesh-biswas",
    name: "Alakesh Biswas",
    role: "Co-Founder & Chief Operating Officer (COO)",
    shortRole: "Co-Founder & COO",
    location: "Kolkata, West Bengal, India",
    summary:
      "Alakesh Biswas is the Co-Founder and Chief Operating Officer (COO) of ZebAlpha. He translates the company's vision into effective business operations, seller partnerships, and scalable execution.",
    responsibilities: [
      "Business operations and execution",
      "Seller onboarding and relationship management",
      "Operational planning and coordination",
      "Business process development",
      "Team coordination and operational growth",
    ],
  },
] as const;

/**
 * Canonical Company Strategy, Target Audience & Competitive Differentiation
 * Grounded in ZebAlpha's official Bharat-First & Discovery-Led Marketplace Blueprint.
 */
export const ZEBALPHA_STRATEGY = {
  positioning:
    "India's discovery-led e-commerce marketplace for customers, small sellers, and emerging Indian brands.",
  visionTagline: "Discover. Support. Grow.",
  philosophy: "Don't just work for the company. Build the company with us.",
  slogan: "Built Together. Growing Together.",
  bharatFocus:
    "Focused on Bharat — Tier 2, Tier 3, and smaller Indian cities alongside metro shoppers — proving quality cluster-by-cluster from Kolkata to West Bengal, East India, and Pan-India.",
  expansionPhases: [
    {
      phase: "Phase 1 • Kolkata",
      focus: "Build dense local seller supply, category depth, creator networks, and reliable delivery.",
    },
    {
      phase: "Phase 2 • West Bengal",
      focus: "Expand to regional cities based on order density, seller readiness, and service levels.",
    },
    {
      phase: "Phase 3 • East India",
      focus: "Enter high-growth Tier-2 and Tier-3+ clusters with regional creator and seller partnerships.",
    },
    {
      phase: "Phase 4 • Pan-India",
      focus: "Scale nationwide across 28,000+ PIN codes with repeatable retention and fulfilment quality.",
    },
  ],
  companyVsBrand: [
    {
      area: "Main Focus",
      company: "Sustainable business growth & disciplined unit economics",
      brand: "Deep customer trust & authentic product confidence",
    },
    {
      area: "Target",
      company: "Transparent revenue & long-term profitability",
      brand: "Lasting recognition & repeat customer loyalty",
    },
    {
      area: "Audience",
      company: "Investors, sellers, logistics partners & team members",
      brand: "Shoppers, communities & independent sellers",
    },
    {
      area: "Success Measurement",
      company: "Sustainable revenue, contribution margin & healthy growth",
      brand: "Brand awareness, reputation, reviews & repeat retention",
    },
    {
      area: "Long-Term Vision",
      company: "Build a durable, scalable Indian commerce enterprise",
      brand: "Become a trusted Indian household name",
    },
  ],
  primaryTargetCustomers: [
    {
      segment: "College Students",
      ageGroup: "18–24",
      needs: "Affordable fashion, heavyweight oversized streetwear, trendy everyday picks & custom-printed apparel",
    },
    {
      segment: "Young Professionals",
      ageGroup: "22–35",
      needs: "Verified fabric quality, time-saving discovery, dependable delivery & transparent value",
    },
    {
      segment: "Middle-Class Families",
      ageGroup: "25–45",
      needs: "Affordable household, ethnic & everyday lifestyle products with clear returns and COD/UPI trust",
    },
  ],
  customerMissions: [
    {
      title: "Value Seekers",
      description: "Shoppers comparing real quality, fair total pricing, delivery dates, and clear return rules.",
    },
    {
      title: "Trend Discoverers",
      description: "Young buyers discovering fresh styles through real product videos, reels, and micro-creators.",
    },
    {
      title: "Local-First Shoppers",
      description: "Tier-2 & Tier-3+ buyers seeking curated brands and styles unavailable in nearby local shops.",
    },
    {
      title: "Gift & Custom Buyers",
      description: "Shoppers ordering personalised gifts and custom-printed 240 GSM tees, hoodies & tote bags with zero MOQ.",
    },
    {
      title: "Family Households",
      description: "Everyday lifestyle and ethnic wear buyers who value reliable sizing and predictable doorstep delivery.",
    },
    {
      title: "Emerging-Brand Fans",
      description: "Customers eager to support homegrown Indian labels when product proof and reviews are genuine.",
    },
  ],
  targetSellers: [
    {
      title: "Home-Based Businesses",
      description: "Small apparel, accessory, gift, and lifestyle entrepreneurs ready to reach nationwide shoppers.",
    },
    {
      title: "Social Sellers (Instagram & WhatsApp)",
      description: "Independent social sellers needing structured catalogs, variant sizing, automated orders, and pan-India courier pickup.",
    },
    {
      title: "Makers & Artisans",
      description: "Handmade, craft, and personalised small-batch creators with an authentic brand story.",
    },
    {
      title: "Local Boutiques",
      description: "Regional ethnic, saree, kurti, and fashion boutiques expanding beyond walk-in footfall.",
    },
    {
      title: "Small Manufacturers",
      description: "Direct makers seeking higher direct-to-consumer (D2C) reach and fair margins.",
    },
    {
      title: "Emerging Indian Brands",
      description: "Young D2C labels wanting storefront identity, creator-led discovery, and actionable buyer analytics.",
    },
  ],
  emergingBrandsProgram: [
    "Dedicated brand storefront and curated brand collections rather than anonymous commodity listings",
    "Founder & product storytelling with consistent visual presentation",
    "Micro-influencer creator collaborations with trackable links and verified delivered orders",
    "Actionable seller analytics (views, add-to-cart, conversion, returns) and growth education",
    "Fair discovery rules for quality new brands based on product proof and satisfaction — not ad spend alone",
  ],
  whyCustomersChooseZebAlpha: [
    {
      title: "Discovery-Led Curation (Not Endless Generic Clutter)",
      description:
        "Discover distinctive emerging Indian brands, regional crafts, and curated drops instead of scrolling past paid ads and duplicate listings.",
    },
    {
      title: "Real Product Video Proof Before You Buy",
      description:
        "Watch genuine product proof videos alongside real fabric GSM specs, live per-color/size inventory, and verified buyer reviews.",
    },
    {
      title: "Built-In Custom Print Studio (Zero MOQ)",
      description:
        "Design and order even a single custom 240 GSM oversized t-shirt, classic tee, hoodie, or canvas tote bag with 1-click Background Removal.",
    },
    {
      title: "Multilingual Voice & Smart AI Shopping (Alpha AI)",
      description:
        "Search and shop naturally by voice or text in Bengali (বাংলা), Banglish, Hindi (हिन्दी), Hinglish, or English — built specifically for Bharat.",
    },
    {
      title: "Non-Negotiable Variant & Order Accuracy",
      description:
        "Every color and size runs as an independent verified SKU so the exact variant you order is the exact product delivered.",
    },
    {
      title: "Transparent Pricing, UPI/COD & 5-Day Easy Returns",
      description:
        "Clear upfront totals with Flat ₹100 OFF on 1st orders (₹399+), UPI & COD support, live tracking, and a straightforward 5-day return window.",
    },
  ],
  whySellersChooseZebAlpha: [
    {
      title: "Brand Storefront & Identity (Not Anonymous Price Wars)",
      description:
        "Build real brand recall with your own storefront, collections, and founder story — instead of getting buried as an unnamed listing.",
    },
    {
      title: "Creator-Led Micro-Influencer Distribution",
      description:
        "Connect products with relevant regional micro-creators for honest video demos and try-ons tracked directly to delivered orders.",
    },
    {
      title: "0% Core Commission + Zero Hidden Deductions",
      description:
        "Keep 100% of eligible product selling value with transparent fee disclosures and direct 5-day UPI settlements.",
    },
    {
      title: "Low-Friction Enrolment ID Onboarding",
      description:
        "Start selling quickly using a free 15-character Enrolment ID, verified email, pickup address, and UPI ID — built for small Indian sellers.",
    },
    {
      title: "Fair Visibility for Quality New Sellers",
      description:
        "Discovery rewards genuine catalogue quality, accurate variants, and customer trust rather than forcing massive ad budgets just to appear.",
    },
    {
      title: "Hands-On Seller Insights & Growth Enablement",
      description:
        "Track views, add-to-cart, conversions, and returns alongside practical guidance on catalog photography, pricing, packaging, and repeat buyers.",
    },
  ],
  marketplaceComparison: [
    {
      dimension: "Core Positioning",
      broad: "Broad-scale search & mega-catalog marketplace",
      value: "Lowest-price, unbranded value marketplace",
      zebalpha: "Discovery-led marketplace + hands-on seller & emerging-brand growth partner",
    },
    {
      dimension: "Seller Commission & Economics",
      broad: "Category & tier-based marketplace commissions + closing fees",
      value: "0% commission across categories (primarily price-competed)",
      zebalpha: "0% core commission for eligible sellers + transparent economics & 5-day UPI payouts",
    },
    {
      dimension: "Brand Identity & Storytelling",
      broad: "Primarily established big brands & paid brand stores",
      value: "Mostly commodity SKU listings with minimal brand recall",
      zebalpha: "Dedicated Emerging Brands focus — storefronts, collections & founder stories",
    },
    {
      dimension: "Product Discovery",
      broad: "Search ranking heavily driven by scale, history & ad spend",
      value: "Price-led feeds & generic social reselling",
      zebalpha: "Curated collections, fair new-seller discovery & micro-creator product demos",
    },
    {
      dimension: "Product Proof & Variant Accuracy",
      broad: "Standard product images & mixed-seller reviews",
      value: "Variable listing quality & frequent color/size mismatches",
      zebalpha: "Real Product Video Proof + strict per-color/size independent SKU verification",
    },
    {
      dimension: "Custom Print-on-Demand",
      broad: "Fragmented third-party listings without live studio tools",
      value: "Limited or bulk-oriented custom options",
      zebalpha: "Built-in ZebAlpha Custom Studio (Zero MOQ, live preview & 1-click Remove BG)",
    },
    {
      dimension: "Bharat Multilingual AI Shopping",
      broad: "Keyword search with basic filters",
      value: "Basic visual/category browse",
      zebalpha: "Alpha AI voice + chat shopping in বাংলা, Banglish, हिन्दी, Hinglish & English",
    },
    {
      dimension: "Small Seller Onboarding & Growth",
      broad: "Complex compliance & ad-heavy scaling",
      value: "Self-serve listing tools with price pressure",
      zebalpha: "Simple Enrolment ID onboarding + hands-on catalogue, creator & analytics enablement",
    },
  ],
} as const;

/**
 * Global entity facts accessible by answer engines, knowledge graphs, and AI crawlers
 */
export const BRAND_FACTS = [
  { label: "Brand Name", value: "ZebAlpha" },
  { label: "Business Type", value: "India's Discovery-Led E-Commerce Marketplace for Customers, Small Sellers & Emerging Brands" },
  { label: "Founding Location", value: "Kolkata, West Bengal, India" },
  { label: "Founder & CEO", value: "Rahul Adhikary (Founder & Chief Executive Officer)" },
  { label: "Co-Founder & COO", value: "Alakesh Biswas (Co-Founder & Chief Operating Officer)" },
  { label: "Main Vision", value: "Discover. Support. Grow. — Make online discovery and brand-building accessible across Bharat (Tier 2, Tier 3 & smaller cities)" },
  { label: "Philosophy", value: "Don't just work for the company. Build the company with us. — Built Together. Growing Together." },
  { label: "Primary Target Customers", value: "College Students (18–24), Young Professionals (22–35), and Middle-Class Families (25–45) across India" },
  { label: "Target Sellers", value: "Home-based businesses, Instagram/WhatsApp social sellers, makers & artisans, local boutiques, small manufacturers, and emerging Indian D2C brands" },
  { label: "Marketplace Model", value: "0% Core Commission for eligible sellers, Emerging Brands storefronts, creator-led discovery, and 5-day direct UPI payouts" },
  { label: "Unique Customer Features", value: "Real Product Video Proof, Built-in Zero-MOQ Custom Print Studio, Alpha AI Multilingual Voice Shopping (Bengali/Hindi/English), and strict SKU variant accuracy" },
  { label: "Coverage", value: "Pan-India delivery across 28,000+ serviceable PIN codes (phased Bharat-first cluster growth starting in Kolkata & West Bengal)" },
  { label: "Exchange / Return Policy", value: "5-Day Responsible Return & Exchange Window" },
];

/**
 * Entity Disambiguation Record for AI Engines
 */
export const ENTITY_DISAMBIGUATION = {
  canonicalName: "ZebAlpha",
  entityType: "Indian E-Commerce Marketplace",
  headquarters: "Kolkata, West Bengal, India",
  notAffiliatedWith: [
    "Zone Alpha (a physical gadget/electronics retail store located in Navi Mumbai)",
    "Z Alpha (regional digital agency in Bangladesh)",
    "getzalpha (K-Beauty agency)",
    "Any other similarly named tech or retail company",
  ],
  clarification:
    "ZebAlpha is an independent Indian online e-commerce marketplace founded in Kolkata, West Bengal, by Rahul Adhikary (Founder & CEO) and Alakesh Biswas (Co-Founder & COO), connecting customers with independent sellers, apparel makers, and emerging brands.",
};
