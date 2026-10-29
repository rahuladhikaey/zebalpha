import { Suspense, cache } from "react";
import { Metadata } from "next";
import Link from "next/link";
import { Star } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { Product } from "@/lib/types";
import { Header } from "@/components/Header";
import ProductDetailTemplate from "./ProductDetailTemplate";
import SimilarProductsCarousel from "@/components/catalog/SimilarProductsCarousel";
import { getSimilarProducts } from "@/lib/similarProducts";

const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_A_URL || "https://placeholder.supabase.co").trim();
const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_A_ANON_KEY || "dummy-anon-key-for-build").trim();

const supabase = createClient(supabaseUrl, supabaseAnonKey);

type PageProps = {
  params: Promise<{ productId: string }>;
};

export const revalidate = 60;

// Explicit minimal projection of fields genuinely required by the PDP
const SLIM_PDP_FIELDS = "id, name, brand, price, mrp, stock, status, is_active, image_url, images, category_id, seller_id, description, packages, offers, specifications, created_at";

const getProduct = cache(async (productId: string) => {
  // Attempt single roundtrip with embedded seller details
  const { data, error } = await supabase
    .from("products")
    .select(`${SLIM_PDP_FIELDS}, seller:sellers(business_name, owner_name, city, state, business_logo_url)`)
    .eq("id", productId)
    .maybeSingle();

  let productData: any = data;

  // Fallback to select(*) if relationship or slim fields error
  if (error || !productData) {
    const fallback = await supabase
      .from("products")
      .select("*")
      .eq("id", productId)
      .maybeSingle();

    if (fallback.data) {
      productData = fallback.data;
    } else {
      console.error("Error fetching product:", fallback.error || error);
      return null;
    }
  }

  // Populate seller fields directly from embedded seller without extra sequential query
  if (productData.seller) {
    const s = Array.isArray(productData.seller) ? productData.seller[0] : productData.seller;
    if (s) {
      productData.seller_name = s.business_name || s.owner_name;
      productData.business_name = s.business_name;
      productData.seller_city = s.city;
      productData.seller_logo = s.business_logo_url;
    }
    delete productData.seller;
  }

  if (productData) {
    const specs = productData.specifications || {};
    productData.thumbnail_url = productData.thumbnail_url || productData.image_url || (Array.isArray(productData.images) && productData.images[0]) || "";
    productData.category_name = productData.category_name || specs.category || "Apparel";
    productData.is_premium = productData.is_premium ?? (productData.tier === "PREMIUM" || specs.is_premium === true || specs.is_premium === "true");
    productData.is_new_drop = productData.is_new_drop ?? (specs.is_new_drop === true || specs.is_new_drop === "true" || productData.status === "COMING_SOON");
    productData.tier = productData.tier || specs.tier || "STANDARD";
  }

  return productData as Product;
});

function SimilarProductsSkeleton() {
  return (
    <div className="w-full py-4 space-y-3">
      <div className="h-5 w-36 bg-zinc-900 rounded animate-pulse" />
      <div className="flex gap-3 overflow-hidden pb-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="shrink-0 w-[150px] sm:w-[175px] md:w-[190px] rounded-xl bg-[#0f0f12] border border-[#232328] overflow-hidden"
          >
            <div className="aspect-[3/4] w-full bg-zinc-900 animate-pulse" />
            <div className="p-2.5 space-y-2">
              <div className="h-3 w-4/5 bg-zinc-800 rounded animate-pulse" />
              <div className="h-2.5 w-1/2 bg-zinc-800 rounded animate-pulse" />
              <div className="h-4 w-20 bg-zinc-850 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function SimilarProductsSection({ product }: { product: Product }) {
  const similarProducts = await getSimilarProducts(product, 20);
  if (!similarProducts || similarProducts.length === 0) return null;

  return <SimilarProductsCarousel products={similarProducts} title="Similar Products" />;
}

import { extractProductAeoData } from "@/lib/aeo-geo/productAeo";
import { buildProductSchema, buildBreadcrumbSchema, buildFaqSchema } from "@/lib/aeo-geo/schemaGenerator";
import { DynamicFaqSection } from "@/components/aeo/DynamicFaqSection";
import { BreadcrumbsNav } from "@/components/aeo/BreadcrumbsNav";
import { resolveCategoryAeo } from "@/lib/aeo-geo/categoryAeo";

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { productId } = await params;
  const product = await getProduct(productId);

  if (!product) {
    return {
      title: "Product Not Found | ZebAlpha",
      robots: { index: false, follow: false },
    };
  }

  const aeo = extractProductAeoData(product);
  const images = Array.isArray(product.images) && product.images.length > 0 ? product.images : [product.image_url].filter(Boolean);

  return {
    title: `${aeo.name} | ${aeo.brand}`,
    description: aeo.shortDirectAnswer,
    alternates: {
      canonical: `https://zebalpha.shop/products/${product.id}`,
    },
    keywords: [
      aeo.name,
      aeo.brand,
      aeo.categoryName,
      aeo.material,
      aeo.fitType,
      "ZebAlpha",
      "buy online India",
      ...aeo.colors,
      ...aeo.sizes
    ],
    openGraph: {
      title: `${aeo.name} | ${aeo.brand}`,
      description: aeo.shortDirectAnswer,
      url: `https://zebalpha.shop/products/${product.id}`,
      siteName: "ZebAlpha",
      images: images.map(img => ({ url: img, alt: aeo.name })),
      locale: "en_IN",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${aeo.name} | ${aeo.brand}`,
      description: aeo.shortDirectAnswer,
      images: images,
    },
    robots: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { productId } = await params;
  const product = await getProduct(productId);

  if (!product) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center p-6 text-white">
        <div className="max-w-md w-full rounded-[2.5rem] bg-zinc-950 p-10 text-center border border-zinc-800 shadow-2xl">
          <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-3xl mb-6">🚫</div>
          <h1 className="text-2xl font-black text-white">Product not found</h1>
          <p className="mt-3 text-zinc-400 font-medium">This product might have been moved or removed. (ID: {productId})</p>
          <Link href="/products" className="mt-8 inline-flex w-full items-center justify-center rounded-2xl bg-white px-6 py-4 text-sm font-black uppercase tracking-widest text-black shadow-xl shadow-white/10 transition hover:bg-zinc-200 active:scale-95">
            Back to store
          </Link>
        </div>
      </main>
    );
  }

  const aeo = extractProductAeoData(product);
  const images = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : [product.image_url].filter(Boolean);

  const breadcrumbs = [
    { name: "Collections", url: "https://zebalpha.shop/products" },
    { name: aeo.categoryName, url: `https://zebalpha.shop/category/${aeo.categorySlug}` },
    { name: aeo.name, url: aeo.canonicalUrl },
  ];

  const categoryData = resolveCategoryAeo(aeo.categorySlug);

  const breadcrumbSchema = buildBreadcrumbSchema(breadcrumbs);
  const productSchema = buildProductSchema(aeo, images);
  const faqSchema = buildFaqSchema(aeo.faqs);

  const jsonLdGraph = {
    "@context": "https://schema.org",
    "@graph": [
      breadcrumbSchema,
      productSchema,
      ...(faqSchema ? [faqSchema] : [])
    ]
  };

  return (
    <main className="min-h-screen bg-black text-white overflow-x-hidden selection:bg-white selection:text-black">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdGraph) }}
      />
      <Header title={product.name} subtitle={aeo.categoryName || "Premium Quality"} />

      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8">
        {/* Visible Breadcrumbs */}
        <BreadcrumbsNav items={breadcrumbs} className="pt-3 pb-2" />

        {/* Existing Product Interactive Template (Photos, Variants, Cart, Buy Now) */}
        <ProductDetailTemplate
          product={product}
          relatedProductsSlot={null}
        />

        {/* Customer Help & Dynamic FAQs (Clean E-Commerce Standard) */}
        <div className="mt-12 space-y-8 pb-16">
          <DynamicFaqSection
            title="Frequently Asked Questions"
            subtitle="Quick answers about materials, sizing accuracy, delivery and returns"
            faqs={aeo.faqs}
          />

          {/* Flipkart-Style Similar Products Recommendation Carousel */}
          <Suspense fallback={<SimilarProductsSkeleton />}>
            <SimilarProductsSection product={product} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
