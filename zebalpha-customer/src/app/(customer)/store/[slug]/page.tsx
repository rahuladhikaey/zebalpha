import type { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { supabaseServer } from "@/lib/supabaseServer";
import { isSellerStorePassActive } from "@/lib/smartStoreSearch";
import { attachRatingsToProducts, fetchProductRatingSummaries } from "@/lib/productRatings";
import { NativePlatformProvider } from "@/lib/platform";
import { detectNativeAppOnServer } from "@/lib/platformServer";
import {
  StorefrontClient,
  type StorefrontSellerInfo,
} from "@/components/store/StorefrontClient";
import type { Product } from "@/lib/types";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

const STORE_PRODUCT_FIELDS =
  "id, name, brand, price, mrp, image_url, images, category_id, subcategory_id, collection, stock, status, is_active, is_approved, approval_status, created_at, specifications, seller_id";

function normalizeProductRows(rows: Array<Record<string, unknown>>): Product[] {
  return rows
    .filter((p) => {
      if (p.is_active === false) return false;
      const st = String(p.status || "").toUpperCase();
      if (["DELETED", "COMING_SOON", "BLOCKED", "DRAFT"].includes(st)) return false;
      if (String(p.approval_status || "").toLowerCase() === "rejected") return false;
      return true;
    })
    .map((p) => {
      const specs = (p.specifications as Record<string, unknown>) || {};
      const img =
        (typeof p.image_url === "string" && p.image_url) ||
        (Array.isArray(p.images) && typeof p.images[0] === "string" ? p.images[0] : "") ||
        "";
      return {
        ...(p as unknown as Product),
        thumbnail_url: img,
        category: String(p.category || specs.category || "Apparel"),
        category_name: String(specs.category || specs.maincategory || p.category || "All Styles"),
      };
    });
}

const fetchSellerBySlug = cache(async (slug: string) => {
  const cleanSlug = decodeURIComponent(slug || "").trim().toLowerCase();
  if (!cleanSlug) return null;

  // Privacy-safe projection: never expose personal address, city, state, phone, or email
  const { data, error } = await supabaseServer
    .from("sellers")
    .select(
      "id, business_name, store_slug, business_logo_url, store_banner_url, store_tagline, store_pass_plan, store_pass_status, store_pass_expires_at, store_slug_blocked"
    )
    .ilike("store_slug", cleanSlug)
    .maybeSingle();

  if (!error && data) return data as Record<string, unknown>;

  // Fallback: match by business_name if slug contains spaces or was derived from name
  const nameGuess = cleanSlug.replace(/-/g, " ");
  const { data: byName } = await supabaseServer
    .from("sellers")
    .select(
      "id, business_name, store_slug, business_logo_url, store_banner_url, store_tagline, store_pass_plan, store_pass_status, store_pass_expires_at, store_slug_blocked"
    )
    .ilike("business_name", nameGuess)
    .limit(1)
    .maybeSingle();

  return byName ? (byName as Record<string, unknown>) : null;
});

async function incrementStoreVisitMetric(sellerId: string, metric: "store_visit" | "missed_visit") {
  try {
    const { error } = await supabaseServer.rpc("increment_seller_store_metric", {
      p_seller_id: sellerId,
      p_metric: metric,
    });
    if (error) {
      const col = metric === "store_visit" ? "store_visit_count" : "missed_store_visits";
      const { data: row } = await supabaseServer
        .from("sellers")
        .select(col)
        .eq("id", sellerId)
        .maybeSingle();
      const current = Number((row as Record<string, unknown> | null)?.[col] || 0);
      await supabaseServer
        .from("sellers")
        .update({ [col]: current + 1 })
        .eq("id", sellerId);
    }
  } catch {
    // Non-blocking
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const sellerRow = await fetchSellerBySlug(slug);

  if (!sellerRow) {
    return {
      title: "Storefront | ZebAlpha",
      description: "Discover verified Indian fashion brands & emerging sellers on ZebAlpha.",
    };
  }

  const active = isSellerStorePassActive({
    store_pass_status: String(sellerRow.store_pass_status || "inactive"),
    store_pass_expires_at: sellerRow.store_pass_expires_at
      ? String(sellerRow.store_pass_expires_at)
      : null,
    store_slug_blocked: Boolean(sellerRow.store_slug_blocked),
  });

  if (!active) {
    return {
      title: "Explore Trending Styles | ZebAlpha",
      description: "Shop curated authentic fashion & lifestyle styles across India on ZebAlpha.",
      robots: { index: false, follow: true },
    };
  }

  const shopName = String(sellerRow.business_name || "Official Store");
  const tagline =
    typeof sellerRow.store_tagline === "string" && sellerRow.store_tagline.trim()
      ? sellerRow.store_tagline.trim()
      : `Shop all authentic products directly from ${shopName} on ZebAlpha with fast Pan-India delivery.`;
  const ogImg =
    (typeof sellerRow.store_banner_url === "string" && sellerRow.store_banner_url) ||
    (typeof sellerRow.business_logo_url === "string" && sellerRow.business_logo_url) ||
    undefined;

  return {
    title: `${shopName} — Official Store on ZebAlpha`,
    description: tagline,
    openGraph: {
      title: `${shopName} — Official Store on ZebAlpha`,
      description: tagline,
      url: `https://zebalpha.shop/store/${String(sellerRow.store_slug || slug)}`,
      images: ogImg ? [{ url: ogImg }] : undefined,
      type: "website",
    },
  };
}

export default async function SellerMiniStorefrontPage({ params }: PageProps) {
  const [{ slug }, isNativeApp] = await Promise.all([params, detectNativeAppOnServer()]);
  const sellerRow = await fetchSellerBySlug(slug);

  if (!sellerRow) {
    notFound();
  }

  const sellerId = String(sellerRow.id);
  const isPassActive = isSellerStorePassActive({
    store_pass_status: String(sellerRow.store_pass_status || "inactive"),
    store_pass_expires_at: sellerRow.store_pass_expires_at
      ? String(sellerRow.store_pass_expires_at)
      : null,
    store_slug_blocked: Boolean(sellerRow.store_slug_blocked),
  });

  // PAUSED / EXPIRED STORE PASS -> Increment missed_store_visits & show ZebAlpha Own-Brand / Trending Fallback
  if (!isPassActive) {
    void incrementStoreVisitMetric(sellerId, "missed_visit");

    const { data: trendingRaw } = await supabaseServer
      .from("products")
      .select(STORE_PRODUCT_FIELDS)
      .or("is_active.is.null,is_active.eq.true")
      .order("created_at", { ascending: false })
      .limit(16);

    const trendingNorm = normalizeProductRows(
      Array.isArray(trendingRaw) ? (trendingRaw as Array<Record<string, unknown>>) : []
    ).slice(0, 12);

    const ratingsMap = await fetchProductRatingSummaries(
      supabaseServer,
      trendingNorm.map((p) => p.id)
    );
    const ratedTrending = attachRatingsToProducts(trendingNorm, ratingsMap);

    return (
      <NativePlatformProvider initialIsNativeApp={isNativeApp}>
        <Header />
        <StorefrontClient
          mode="paused"
          seller={null}
          products={[]}
          fallbackTrendingProducts={ratedTrending}
        />
      </NativePlatformProvider>
    );
  }

  // ACTIVE STORE PASS -> Increment store_visit_count & load full seller catalog
  void incrementStoreVisitMetric(sellerId, "store_visit");

  const { data: prodData } = await supabaseServer
    .from("products")
    .select(STORE_PRODUCT_FIELDS)
    .eq("seller_id", sellerId)
    .or("is_active.is.null,is_active.eq.true")
    .order("created_at", { ascending: false })
    .limit(120);

  const normalizedProducts = normalizeProductRows(
    Array.isArray(prodData) ? (prodData as Array<Record<string, unknown>>) : []
  );

  const ratingsMap = await fetchProductRatingSummaries(
    supabaseServer,
    normalizedProducts.map((p) => p.id)
  );
  const ratedProducts = attachRatingsToProducts(normalizedProducts, ratingsMap);

  const sellerInfo: StorefrontSellerInfo = {
    id: sellerId,
    business_name: String(sellerRow.business_name || "Verified Store"),
    store_slug: String(sellerRow.store_slug || slug).toLowerCase(),
    business_logo_url:
      typeof sellerRow.business_logo_url === "string" ? sellerRow.business_logo_url : null,
    store_banner_url:
      typeof sellerRow.store_banner_url === "string" ? sellerRow.store_banner_url : null,
    store_tagline: typeof sellerRow.store_tagline === "string" ? sellerRow.store_tagline : null,
    is_pro_pass: sellerRow.store_pass_plan === "store_search_59_28d",
  };

  // Privacy-safe Store JSON-LD structured data (no personal location/address)
  const storeJsonLd = {
    "@context": "https://schema.org",
    "@type": "Store",
    name: sellerInfo.business_name,
    url: `https://zebalpha.shop/store/${sellerInfo.store_slug}`,
    description: sellerInfo.store_tagline || `${sellerInfo.business_name} Official Store on ZebAlpha`,
    image: sellerInfo.store_banner_url || sellerInfo.business_logo_url || undefined,
  };

  return (
    <NativePlatformProvider initialIsNativeApp={isNativeApp}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(storeJsonLd) }}
      />
      <Header />
      <StorefrontClient
        mode="active"
        seller={sellerInfo}
        products={ratedProducts}
      />
    </NativePlatformProvider>
  );
}
