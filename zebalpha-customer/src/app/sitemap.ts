import { MetadataRoute } from 'next';
import { createClient } from "@supabase/supabase-js";
import { BLOG_POSTS } from "@/data/blogPosts";
import { CATEGORY_AEO_CATALOG } from "@/lib/aeo-geo/categoryAeo";
import { BUYING_GUIDES } from "@/lib/aeo-geo/buyingGuides";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://zebalpha.shop').replace(/\/$/, '');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_A_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_A_ANON_KEY;

  let products: Array<{
    id: string | number;
    updated_at?: string | null;
    created_at?: string | null;
    image_url?: string | null;
    images?: string[] | null;
  }> = [];

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data } = await supabase
        .from("products")
        .select("id, updated_at, created_at, image_url, images")
        .or("is_active.is.null,is_active.eq.true")
        .neq("status", "DELETED")
        .order("created_at", { ascending: false })
        .limit(2000);

      if (Array.isArray(data)) {
        products = data;
      }
    } catch (err) {
      console.warn("[sitemap] Failed to fetch product URLs:", err);
    }
  }

  const productUrls: MetadataRoute.Sitemap = products.map((product) => {
    const rawImgs = [
      ...(Array.isArray(product.images) ? product.images : []),
      ...(product.image_url ? [product.image_url] : []),
    ]
      .filter((u): u is string => typeof u === "string" && u.trim().startsWith("http"))
      .slice(0, 3);

    const lastMod = product.updated_at || product.created_at;
    return {
      url: `${baseUrl}/products/${product.id}`,
      lastModified: lastMod ? new Date(lastMod) : new Date(),
      changeFrequency: 'weekly',
      priority: 0.85,
      ...(rawImgs.length > 0 ? { images: rawImgs } : {}),
    };
  });

  const blogUrls: MetadataRoute.Sitemap = BLOG_POSTS.map((post) => ({
    url: `${baseUrl}/blogs/${post.slug}`,
    lastModified: new Date(post.modifiedAt),
    changeFrequency: 'weekly',
    priority: post.isFeatured ? 0.9 : 0.8,
  }));

  const categoryUrls: MetadataRoute.Sitemap = Object.keys(CATEGORY_AEO_CATALOG).map((slug) => ({
    url: `${baseUrl}/category/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: 0.9,
  }));

  const guideUrls: MetadataRoute.Sitemap = Object.values(BUYING_GUIDES).map((guide) => ({
    url: `${baseUrl}/guides/${guide.slug}`,
    lastModified: new Date(guide.modifiedAt),
    changeFrequency: 'monthly',
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/customize`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/new-drops`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/categories`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/collections`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/premium-store`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/recommended`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/seller`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/blogs`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/guides`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${baseUrl}/size-guide`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/virtual-try-on`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/help`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.75,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/shipping-policy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.65,
    },
    {
      url: `${baseUrl}/return-policy`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.65,
    },
    {
      url: `${baseUrl}/privacy-policy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms-and-conditions`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.4,
    },
    ...categoryUrls,
    ...guideUrls,
    ...blogUrls,
    ...productUrls,
  ];
}
