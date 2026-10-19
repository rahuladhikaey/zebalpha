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
  description: "ZebAlpha is an Indian e-commerce marketplace connecting customers with sellers and growing businesses across India. Founded in Kolkata, West Bengal, ZebAlpha is focused on making online shopping and online selling more accessible, transparent, and trustworthy.",
  sameAs: [
    "https://seller.zebalpha.shop"
  ],
  currenciesAccepted: "INR",
  paymentAccepted: "Credit Card, Debit Card, Net Banking, UPI (PhonePe, Google Pay, Paytm), Cash on Delivery",
  priceRange: "₹₹ (Affordable Premium / ₹300 - ₹2,500)",
  returnWindowDays: 7,
  freeShippingThreshold: 999,
  dispatchTimeHours: "24-48 hours",
};

/**
 * Global entity facts accessible by answer engines, knowledge graphs, and AI crawlers
 */
export const BRAND_FACTS = [
  { label: "Brand Name", value: "ZebAlpha" },
  { label: "Business Type", value: "Indian Online E-Commerce Marketplace" },
  { label: "Founding Location", value: "Kolkata, West Bengal, India" },
  { label: "Founders", value: "Rahul Adhikary (Founder) & Alakesh Biswas (Co-founder / Partner)" },
  { label: "Core Mission", value: "Connect customers with sellers and small businesses across India" },
  { label: "Marketplace Model", value: "0% Commission for eligible sellers with transparent pricing" },
  { label: "Order Accuracy Mandate", value: "Ensure customers receive the exact product, variant, color, and size ordered" },
  { label: "Coverage", value: "Pan-India delivery across 19,000+ PIN codes" },
  { label: "Exchange / Return Policy", value: "7-Day Responsible Return & Exchange Window" },
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
    "Any other similarly named tech or retail company"
  ],
  clarification: "ZebAlpha is an independent Indian online e-commerce marketplace founded in Kolkata, West Bengal, connecting customers with independent sellers, apparel makers, and emerging brands."
};
