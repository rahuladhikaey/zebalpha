import { Metadata } from "next";
import Script from "next/script";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BlogListClient } from "@/components/blog/BlogListClient";
import { BLOG_POSTS } from "@/data/blogPosts";
import Link from "next/link";
import { Sparkles, ArrowRight, ShieldCheck, TrendingUp, Store } from "lucide-react";

export const metadata: Metadata = {
  title: "Blogs, Seller Guides & Fashion E-commerce Insights | ZEBALPHA",
  description:
    "Discover actionable guides on selling online with 0% commission, mastering on-page and off-page SEO for fashion brands, and behind-the-scenes apparel craftsmanship at Zebalpha.",
  keywords: [
    "zebalpha blog",
    "0% commission ecommerce",
    "sell online india",
    "seller onboarding guide",
    "on page seo fashion",
    "off page seo ecommerce",
    "supima cotton streetwear",
    "d2c clothing business",
    "supplier hub"
  ],
  alternates: {
    canonical: "/blogs",
  },
  openGraph: {
    title: "Blogs & Seller Guides | ZEBALPHA",
    description:
      "Actionable e-commerce guides, 0% commission seller platform benefits, and luxury streetwear culture insights.",
    url: "https://zebalpha.shop/blogs",
    siteName: "ZEBALPHA",
    images: [
      {
        url: "/blogs/seller-guide.jpg",
        width: 1200,
        height: 630,
        alt: "ZEBALPHA E-commerce Guides & Insights",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Blogs & Seller Guides | ZEBALPHA",
    description:
      "Actionable e-commerce guides, 0% commission seller platform benefits, and luxury streetwear culture insights.",
    images: ["/blogs/seller-guide.jpg"],
  },
};

export default function BlogsPage() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://zebalpha.shop";

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "ZEBALPHA Blogs & Seller Hub Guides",
    "description": "Editorial guides on 0% commission selling, on-page & off-page SEO for e-commerce, and luxury streetwear apparel engineering.",
    "url": `${baseUrl}/blogs`,
    "publisher": {
      "@type": "Organization",
      "name": "ZEBALPHA",
      "logo": `${baseUrl}/official-logo.png`
    },
    "mainEntity": {
      "@type": "ItemList",
      "itemListElement": BLOG_POSTS.map((post, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "url": `${baseUrl}/blogs/${post.slug}`,
        "name": post.title,
        "description": post.excerpt
      }))
    }
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": baseUrl
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Blogs & Guides",
        "item": `${baseUrl}/blogs`
      }
    ]
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between selection:bg-emerald-500 selection:text-black">
      {/* Schema.org Structured Data Injection */}
      <Script
        id="schema-blogs-collection"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <Script
        id="schema-blogs-breadcrumb"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div>
        <Header title="ZEBALPHA" subtitle="Blogs & Guides ✦" />

        <main className="px-4 py-8 sm:px-6 lg:px-8 max-w-[1400px] mx-auto w-full">
          {/* Breadcrumb Navigation for SEO */}
          <nav aria-label="Breadcrumb" className="mb-6 text-xs text-neutral-400 font-bold">
            <ol className="flex items-center space-x-2">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>/</li>
              <li className="text-white" aria-current="page">
                Blogs & Insights
              </li>
            </ol>
          </nav>

          {/* Hero Header Section */}
          <section className="mb-10 text-center sm:text-left rounded-[2.5rem] bg-gradient-to-br from-neutral-900 via-neutral-950 to-neutral-900 border border-neutral-800 p-8 sm:p-12 shadow-2xl relative overflow-hidden">
            <div className="relative z-10 max-w-3xl space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-widest px-4 py-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Editorial, SEO & Marketplace Knowledge Hub
              </span>

              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight uppercase leading-tight">
                ZEBALPHA INSIGHTS & SELLER GUIDES
              </h1>

              <p className="text-sm sm:text-base text-neutral-300 font-medium leading-relaxed max-w-2xl">
                Master modern fashion e-commerce: from scaling your small brand with our transparent <strong>0% commission</strong> seller model to dominating organic search rankings with on-page and off-page SEO.
              </p>

              <div className="pt-2 flex flex-wrap gap-4 text-xs font-bold text-neutral-300">
                <span className="flex items-center gap-1.5 rounded-full bg-neutral-900 border border-neutral-800 px-3.5 py-1.5">
                  <Store className="h-3.5 w-3.5 text-emerald-400" />
                  0% Commission Seller Guides
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-neutral-900 border border-neutral-800 px-3.5 py-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-cyan-400" />
                  On-Page & Off-Page SEO
                </span>
                <span className="flex items-center gap-1.5 rounded-full bg-neutral-900 border border-neutral-800 px-3.5 py-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
                  Textile Craftsmanship
                </span>
              </div>
            </div>

            {/* Subtle aesthetic backdrop glow */}
            <div className="absolute right-0 top-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
          </section>

          {/* Interactive Client Component for Search, Filtering & Post Listing */}
          <BlogListClient posts={BLOG_POSTS} />
        </main>
      </div>

      <Footer />
    </div>
  );
}
