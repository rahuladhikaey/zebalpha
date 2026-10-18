/**
 * ZEBALPHA — AEO (Answer Engine Optimization) & GEO (Generative Engine Optimization) TYPES
 * Pure factual entity definitions, structured schemas, and dynamic QA types.
 */

export interface FaqItem {
  question: string;
  answer: string;
  category?: string;
}

export interface BrandEntityConfig {
  name: string;
  legalName: string;
  brand: string;
  url: string;
  logoUrl: string;
  supportEmail: string;
  supportPhone?: string;
  addressCountry: string;
  addressLocality: string;
  postalCode?: string;
  description: string;
  sameAs: string[];
  currenciesAccepted: string;
  paymentAccepted: string;
  priceRange: string;
  returnWindowDays: number;
  freeShippingThreshold: number;
  dispatchTimeHours: string;
}

export interface VariantMatrixItem {
  color: string;
  colorHex?: string;
  size: string;
  stock: number;
  price: number;
  mrp?: number;
  sku?: string;
  isAvailable: boolean;
}

export interface ColorVariantSummary {
  color: string;
  colorHex?: string;
  availableSizes: string[];
  outOfStockSizes: string[];
  minPrice: number;
  maxPrice: number;
  totalStock: number;
  isAvailable: boolean;
}

export interface ProductAeoData {
  id: string;
  name: string;
  brand: string;
  categoryName: string;
  categorySlug: string;
  description: string;
  shortDirectAnswer: string;
  material: string;
  fitType: string;
  neckType?: string;
  sleeveType?: string;
  pattern?: string;
  careInstructions?: string;
  gsm?: string | number;
  countryOfOrigin: string;
  minPrice: number;
  maxPrice: number;
  mrp?: number;
  currency: string;
  totalStock: number;
  inStock: boolean;
  sku?: string;
  colors: string[];
  sizes: string[];
  colorVariants: ColorVariantSummary[];
  variantMatrix: VariantMatrixItem[];
  sizeChartColumns: string[];
  sizeChartRows: Array<Record<string, string | number>>;
  shippingInfo: string;
  returnInfo: string;
  faqs: FaqItem[];
  canonicalUrl: string;
  sellerName: string;
  sellerLocation?: string;
}

export interface CategoryAeoData {
  slug: string;
  name: string;
  h1: string;
  shortDirectAnswer: string;
  summary: string;
  keyCharacteristics: string[];
  availableTypes: string[];
  buyingGuidance: string;
  fabricAndCareTips: string;
  sizingGuidance: string;
  faqs: FaqItem[];
  relatedCategories: Array<{ name: string; slug: string }>;
  canonicalUrl: string;
}

export interface BuyingGuideArticle {
  slug: string;
  title: string;
  h1: string;
  metaDescription: string;
  publishedAt: string;
  modifiedAt: string;
  author: string;
  shortDirectAnswer: string;
  readingTime: string;
  heroImage?: string;
  sections: Array<{
    heading: string;
    content: string;
    table?: {
      headers: string[];
      rows: string[][];
    };
  }>;
  faqs: FaqItem[];
  relatedCategorySlugs: string[];
  canonicalUrl: string;
}
