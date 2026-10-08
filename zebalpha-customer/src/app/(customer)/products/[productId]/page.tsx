import { Suspense, cache } from "react";
import { Metadata } from "next";
import Link from "next/link";
import { Star } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { Product } from "@/lib/types";
import { Header } from "@/components/Header";
import ProductDetailTemplate from "./ProductDetailTemplate";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qjpahzstldiatfbutvfc.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqcGFoenN0bGRpYXRmYnV0dmZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1NTM0MDYsImV4cCI6MjEwNDEyOTQwNn0.ixVg7bopkA0BAKpOVhuQSVUlWNWB-o_YIPuowta53lI"
);

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

const getRelatedProducts = async (category_id: any, currentProductId: string | number) => {
  let query = supabase
    .from("products")
    .select("id, name, brand, price, mrp, image_url, images, is_active, stock, category_id")
    .neq("id", currentProductId)
    .limit(5);

  if (category_id) {
    query = query.eq("category_id", category_id);
  }

  let { data, error } = await query;
  if (error || !data) {
    const fallback = await supabase
      .from("products")
      .select("*")
      .neq("id", currentProductId)
      .limit(5);
    data = fallback.data;
  }

  const rawList = data || [];
  return rawList.map((p: any) => ({
    ...p,
    thumbnail_url: p.thumbnail_url || p.image_url || (Array.isArray(p.images) && p.images[0]) || "",
  })) as Product[];
};

function RelatedProductsSkeleton() {
  return (
    <div className="mt-20 border-t border-zinc-800 pt-16">
      <div className="flex items-center justify-between mb-8">
        <div className="space-y-2">
          <div className="h-3 w-20 bg-zinc-900 rounded animate-pulse" />
          <div className="h-6 w-44 bg-zinc-900 rounded animate-pulse" />
        </div>
        <div className="h-4 w-28 bg-zinc-900 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col rounded-3xl bg-zinc-950 p-3 border border-zinc-800">
            <div className="aspect-square w-full rounded-2xl bg-zinc-900 animate-pulse mb-4" />
            <div className="h-4 w-3/4 bg-zinc-900 rounded animate-pulse mb-2" />
            <div className="h-3 w-1/2 bg-zinc-900 rounded animate-pulse mb-3" />
            <div className="h-5 w-20 bg-zinc-900 rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

async function RelatedProductsSection({
  categoryId,
  currentProductId,
}: {
  categoryId: any;
  currentProductId: string | number;
}) {
  const relatedProducts = await getRelatedProducts(categoryId, currentProductId);
  if (!relatedProducts || relatedProducts.length === 0) return null;

  return (
    <div className="mt-20 border-t border-zinc-800 pt-16">
      <div className="flex items-center justify-between mb-8">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Suggestions</span>
          <h2 className="text-2xl font-black text-white mt-1">You Might Also Like</h2>
        </div>
        <Link href="/products" className="text-sm font-black text-white hover:underline">
          View All Products
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
        {relatedProducts.map((p) => (
          <Link
            key={p.id}
            href={`/products/${p.id}`}
            className="group flex flex-col rounded-3xl bg-zinc-950 p-3 transition-all hover:shadow-2xl border border-zinc-800 hover:border-zinc-700"
          >
            <div className="aspect-square w-full overflow-hidden rounded-2xl bg-zinc-900 mb-4 flex items-center justify-center">
              <img
                src={p.images?.[0] || p.image_url}
                alt={p.name}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-zinc-300 transition-colors">
                {p.name}
              </h3>
              <div className="flex items-center gap-1.5">
                <div className="flex h-5 items-center gap-0.5 rounded-md bg-white text-black px-1.5 text-[10px] font-bold">
                  <span>4.4</span>
                  <Star size={8} fill="currentColor" aria-hidden="true" />
                </div>
                <span className="text-[10px] font-bold text-zinc-400">(234)</span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] font-bold text-zinc-500 line-through">
                    ₹{p.mrp || Math.round(p.price * 1.2)}
                  </span>
                  <span className="text-[9px] font-extrabold text-white bg-zinc-900 border border-zinc-800 px-1 py-0.5 rounded">
                    {Math.round(
                      (((p.mrp || Math.round(p.price * 1.2)) - p.price) /
                        (p.mrp || Math.round(p.price * 1.2))) *
                        100
                    )}
                    % OFF
                  </span>
                </div>
                <span className="text-sm font-black text-white">₹{p.price}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { productId } = await params;
  const product = await getProduct(productId);

  if (!product) {
    return {
      title: "Product Not Found",
    };
  }

  const sellerName = product.seller_name || product.brand || "ZEBALPHA";

  return {
    title: `${product.name} | ${sellerName}`,
    description: product.description || `Buy ${product.name} online at ZEBALPHA. Premium quality apparel, streetwear & lifestyle.`,
    keywords: [product.name, "zebalpha", "zeb-alpha", sellerName, product.category_name || "", "buy online"],
    openGraph: {
      title: product.name,
      description: product.description,
      images: [product.image_url],
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

  const sellerDisplayName = product.seller_name || product.business_name || product.brand || "ZEBALPHA Official Store";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "image": product.images || [product.image_url],
    "description": product.description,
    "brand": {
      "@type": "Brand",
      "name": product.brand || "ZEB-ALPHA"
    },
    "offers": {
      "@type": "Offer",
      "url": `https://zebalpha.shop/products/${product.id}`,
      "priceCurrency": "INR",
      "price": product.price,
      "priceValidUntil": new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      "itemCondition": "https://schema.org/NewCondition",
      "availability": "https://schema.org/InStock",
      "seller": {
        "@type": "Organization",
        "name": sellerDisplayName
      }
    }
  };

  return (
    <main className="min-h-screen bg-white text-slate-900 overflow-x-hidden">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header title={product.name} subtitle={product.category_name || "Premium Quality"} />

      <ProductDetailTemplate
        product={product}
        relatedProductsSlot={
          product.category_id ? (
            <Suspense fallback={<RelatedProductsSkeleton />}>
              <RelatedProductsSection
                categoryId={product.category_id}
                currentProductId={product.id}
              />
            </Suspense>
          ) : null
        }
      />
    </main>
  );
}
