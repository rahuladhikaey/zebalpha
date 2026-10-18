import { BrandEntityConfig } from "./types";

/**
 * ZEBALPHA — OFFICIAL BRAND ENTITY CONFIGURATION
 * Verified factual information representing the ZebAlpha organization.
 * Used uniformly across JSON-LD Organization schema, entity footers, and AI machine files.
 */
export const ZEBALPHA_BRAND_ENTITY: BrandEntityConfig = {
  name: "ZEBALPHA",
  legalName: "Zebalpha Apparel & Retail Private Limited",
  brand: "ZEBALPHA",
  url: "https://zebalpha.shop",
  logoUrl: "https://zebalpha.shop/official-logo.png",
  supportEmail: "support@zebalpha.shop",
  supportPhone: "+91 98765 43210",
  addressCountry: "IN",
  addressLocality: "India",
  description: "ZEBALPHA is an Indian premium direct-to-consumer apparel brand and multi-vendor fashion marketplace engineering heavyweight luxury streetwear, 100% combed cotton zip polos, and 240+ GSM oversized t-shirts.",
  sameAs: [
    "https://www.instagram.com/",
    "https://twitter.com/",
    "https://www.linkedin.com/",
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
 * Global entity facts accessible by answer engines and crawlers
 */
export const BRAND_FACTS = [
  { label: "Founded Brand", value: "ZEBALPHA" },
  { label: "Fabric Specialization", value: "100% Combed Cotton, Supima Cotton, Heavyweight Fleece (220-350 GSM)" },
  { label: "Marketplace Model", value: "0% Commission Direct-from-Maker Fashion Marketplace" },
  { label: "Coverage", value: "Pan-India delivery across 19,000+ PIN codes" },
  { label: "Exchange / Return Policy", value: "7-Day Hassle-free Exchange & Return Window" },
  { label: "Dispatch Guarantee", value: "Orders dispatched within 24 to 48 hours" },
];
