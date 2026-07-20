import { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { Product } from "@/lib/types";
import { Header } from "@/components/Header";
import ProductDetailTemplate from "./ProductDetailTemplate";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder_key"
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
    .eq("id", Number(productId))
    .single();

  if (error || !data) {
    console.error("Error fetching product:", error);
    return null;
  }

  return data as Product;
};

const getRelatedProducts = async (category_id: number, currentProductId: number) => {
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
      <main className="min-h-screen bg-[#cefad0] flex items-center justify-center p-6 text-slate-900">
        <div className="max-w-md w-full rounded-[2.5rem] bg-white p-10 text-center premium-shadow">
          <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-full bg-slate-100 text-3xl mb-6">🚫</div>
          <h1 className="text-2xl font-black text-slate-900">Product not found</h1>
          <p className="mt-3 text-slate-500 font-medium">This product might have been moved or removed. (ID: {productId})</p>
          <Link href="/products" className="mt-8 inline-flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-6 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-600/20 transition hover:bg-emerald-700 active:scale-95">
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
      "name": "Asali Swad"
    },
    "offers": {
      "@type": "Offer",
      "url": `https://www.asaliswad.com/products/${product.id}`,
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




