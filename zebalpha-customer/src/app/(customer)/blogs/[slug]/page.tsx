import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BlogPostClient } from "@/components/blog/BlogPostClient";
import { BLOG_POSTS, getBlogPostBySlug, getAllBlogSlugs } from "@/data/blogPosts";
import { Clock, Calendar, ArrowLeft, Store } from "lucide-react";

interface BlogPostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const slugs = getAllBlogSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    return {
      title: "Post Not Found | ZEBALPHA",
      description: "The requested editorial guide could not be found.",
    };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://zebalpha.shop";
  const canonicalUrl = `${baseUrl}/blogs/${post.slug}`;
  const fullImageUrl = post.coverImage.startsWith("http")
    ? post.coverImage
    : `${baseUrl}${post.coverImage}`;

  return {
    title: `${post.metaTitle}`,
    description: post.metaDescription,
    keywords: post.tags,
    alternates: {
      canonical: canonicalUrl,
    },
    authors: [
      { name: post.author.name, url: baseUrl },
      ...(post.coAuthor ? [{ name: post.coAuthor.name, url: baseUrl }] : [])
    ],
    openGraph: {
      title: post.title,
      description: post.metaDescription,
      url: canonicalUrl,
      siteName: "ZEBALPHA",
      type: "article",
      publishedTime: post.publishedAt,
      modifiedTime: post.modifiedAt,
      authors: [post.author.name, ...(post.coAuthor ? [post.coAuthor.name] : [])],
      tags: post.tags,
      images: [
        {
          url: fullImageUrl,
          width: 1200,
          height: 630,
          alt: post.coverImageAlt,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.metaDescription,
      images: [fullImageUrl],
      creator: "@zebalpha",
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://zebalpha.shop";
  const canonicalUrl = `${baseUrl}/blogs/${post.slug}`;
  const fullImageUrl = post.coverImage.startsWith("http")
    ? post.coverImage
    : `${baseUrl}${post.coverImage}`;

  // Structured Data (JSON-LD) for Google BlogPosting rich results & AEO
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": canonicalUrl
    },
    "headline": post.title,
    "description": post.metaDescription,
    "image": [fullImageUrl],
    "datePublished": post.publishedAt,
    "dateModified": post.modifiedAt,
    "author": post.coAuthor ? [
      {
        "@type": "Person",
        "name": post.author.name,
        "jobTitle": post.author.role,
        "worksFor": {
          "@type": "Organization",
          "name": "ZEBALPHA"
        }
      },
      {
        "@type": "Person",
        "name": post.coAuthor.name,
        "jobTitle": post.coAuthor.role,
        "worksFor": {
          "@type": "Organization",
          "name": "ZEBALPHA"
        }
      }
    ] : {
      "@type": "Person",
      "name": post.author.name,
      "jobTitle": post.author.role,
      "worksFor": {
        "@type": "Organization",
        "name": "ZEBALPHA"
      }
    },
    "publisher": {
      "@type": "Organization",
      "name": "ZEBALPHA",
      "url": baseUrl,
      "logo": {
        "@type": "ImageObject",
        "url": `${baseUrl}/official-logo.png`
      }
    },
    "about": [
      {
        "@type": "Organization",
        "name": "ZEBALPHA",
        "url": baseUrl
      },
      {
        "@type": "Thing",
        "name": "Indian E-commerce"
      },
      {
        "@type": "Thing",
        "name": "Zero Commission Marketplace"
      },
      {
        "@type": "Place",
        "name": "Kolkata, West Bengal, India"
      }
    ],
    "keywords": post.tags.join(", ")
  };

  // Structured Data (JSON-LD) for Breadcrumbs
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
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": post.title,
        "item": canonicalUrl
      }
    ]
  };

  // Structured Data (JSON-LD) for FAQPage if post contains faqs
  const faqSchema = post.faqs && post.faqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": post.faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  } : null;

  const relatedPosts = BLOG_POSTS.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between selection:bg-emerald-500 selection:text-black">
      {/* Google SEO JSON-LD Injections */}
      <Script
        id="schema-article-posting"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <Script
        id="schema-article-breadcrumb"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {faqSchema && (
        <Script
          id="schema-article-faq"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      <div>
        <Header title="ZEBALPHA" subtitle="Blog Article ✦" />

        <main className="px-4 py-8 sm:px-6 lg:px-8 max-w-[1400px] mx-auto w-full">
          {/* Breadcrumb Navigation for On-Page SEO */}
          <nav aria-label="Breadcrumb" className="mb-6 text-xs text-neutral-400 font-bold">
            <ol className="flex items-center space-x-2 flex-wrap">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Home
                </Link>
              </li>
              <li>/</li>
              <li>
                <Link href="/blogs" className="hover:text-white transition-colors">
                  Blogs
                </Link>
              </li>
              <li>/</li>
              <li className="text-white truncate max-w-[280px] sm:max-w-md" aria-current="page">
                {post.title}
              </li>
            </ol>
          </nav>

          {/* Article Header & Hero Banner */}
          <header className="mb-10 space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/blogs"
                className="inline-flex items-center gap-1.5 rounded-full bg-neutral-900 border border-neutral-800 px-3.5 py-1 text-xs font-bold text-neutral-300 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to All Guides
              </Link>
              <span className="rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-widest px-3 py-1">
                {post.category}
              </span>
              <span className="text-xs text-neutral-400 font-semibold flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                {post.readTime}
              </span>
              <span className="text-xs text-neutral-400 font-semibold flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" />
                {new Date(post.publishedAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white uppercase tracking-tight leading-tight">
              {post.title}
            </h1>

            <p className="text-base sm:text-xl text-neutral-300 leading-relaxed font-medium max-w-4xl">
              {post.headline}
            </p>

            {/* Author Byline (Supports single or dual founders) */}
            <div className="flex flex-wrap items-center gap-6 pt-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full overflow-hidden bg-neutral-800 relative border border-emerald-500/40">
                  <Image
                    src={post.author.avatar}
                    alt={post.author.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{post.author.name}</p>
                  <p className="text-xs text-neutral-400">{post.author.role}</p>
                </div>
              </div>

              {post.coAuthor && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full overflow-hidden bg-neutral-800 relative border border-emerald-500/40">
                    <Image
                      src={post.coAuthor.avatar}
                      alt={post.coAuthor.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{post.coAuthor.name}</p>
                    <p className="text-xs text-neutral-400">{post.coAuthor.role}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Featured Image with proper figure / figcaption for SEO */}
            <figure className="relative aspect-video w-full rounded-[2.5rem] overflow-hidden border border-neutral-800 shadow-2xl mt-6">
              <Image
                src={post.coverImage}
                alt={post.coverImageAlt}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1400px) 100vw, 1400px"
              />
              <figcaption className="sr-only">{post.coverImageAlt}</figcaption>
            </figure>
          </header>

          {/* Interactive Client Component for Social Share, Content, TOC & FAQs */}
          <BlogPostClient post={post} relatedPosts={relatedPosts} />
        </main>
      </div>

      <Footer />
    </div>
  );
}
