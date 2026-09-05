import { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { Product } from "@/lib/types";
import { Header } from "@/components/Header";
import ProductDetailTemplate from "./ProductDetailTemplate";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://qjpahzstldiatfbutvfc.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_Mm3pqD7ev-c76TXhkL0ajQ_ZHq325WW"
);

type PageProps = {
  params: Promise<{ productId: string }>;
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const getProduct = async (productId: string) => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .maybeSingle();

  if (error || !data) {
    console.error("Error fetching product:", error);
    return null;
  }

  return data as Product;
};

const getRelatedProducts = async (category_id: any, currentProductId: string | number) => {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("category_id", category_id)
    .neq("id", currentProductId)
    .limit(5);

  if (error) {
    console.error("Error fetching related products:", error);
    return [];
  }

  return data as Product[];
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { productId } = await params;
  const product = await getProduct(productId);

  if (!product) {
    return {
      title: "Product Not Found",
    };
  }

  return {
    title: `${product.name} | Asali Swad`,
    description: product.description || `Buy ${product.name} online at Asali Swad. Authentic taste and premium quality.`,
    keywords: [product.name, "asaliswad", "asli swad", product.category_name || "", "buy online"],
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
  
  // Fetch related products if category_id exists
  const relatedProducts = product && product.category_id 
    ? await getRelatedProducts(product.category_id, product.id)
    : [];

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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "image": product.images || [product.image_url],
    "description": product.description,
    "brand": {
      "@type": "Brand",
      "name": "ZEB-ALPHA"
    },
    "offers": {
      "@type": "Offer",
      "url": `https://www.zebalpha.com/products/${product.id}`,
      "priceCurrency": "INR",
      "price": product.price,
      "priceValidUntil": new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      "itemCondition": "https://schema.org/NewCondition",
      "availability": "https://schema.org/InStock",
      "seller": {
        "@type": "Organization",
        "name": "Asali Swad"
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

      <ProductDetailTemplate product={product} relatedProducts={relatedProducts} />
    </main>
  );
}




