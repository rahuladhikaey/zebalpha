"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  Search, 
  Clock, 
  ArrowRight, 
  Sparkles, 
  Store, 
  CheckCircle2, 
  Share2, 
  TrendingUp, 
  ShieldCheck, 
  Layers, 
  Users, 
  Rocket 
} from "lucide-react";
import type { BlogPost } from "@/data/blogPosts";

interface BlogListClientProps {
  posts: BlogPost[];
}

const CATEGORIES = [
  "All Articles",
  "Founder Story",
  "Seller Guides",
  "SEO & Marketing",
  "Streetwear Culture",
];

export function BlogListClient({ posts }: BlogListClientProps) {
  const [selectedCategory, setSelectedCategory] = useState("All Articles");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesCategory =
        selectedCategory === "All Articles" || post.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        post.title.toLowerCase().includes(q) ||
        post.excerpt.toLowerCase().includes(q) ||
        post.tags.some((tag) => tag.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [posts, selectedCategory, searchQuery]);

  const featuredPost = posts.find((p) => p.isFeatured) || posts[0];

  return (
    <div className="space-y-12">
      {/* Category Pills & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-2 rounded-2xl bg-neutral-900/80 border border-neutral-800 backdrop-blur-md">
        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto p-1 scrollbar-none">
          {CATEGORIES.map((category) => {
            const isActive = selectedCategory === category;
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-white text-black shadow-md scale-100"
                    : "bg-neutral-950/70 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800/80"
                }`}
              >
                {category}
              </button>
            );
          })}
        </div>

        {/* Search input */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search guides, SEO, 0% commission..."
            className="w-full rounded-xl bg-neutral-950 border border-neutral-800 py-2 pl-10 pr-4 text-xs font-medium text-white placeholder-neutral-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Featured Banner Card (Only shown if on "All Articles" and no search query) */}
      {selectedCategory === "All Articles" && !searchQuery && featuredPost && (
        <article className="group relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-neutral-900 via-neutral-950 to-black border border-emerald-500/30 p-6 sm:p-10 shadow-[0_0_35px_rgba(52,211,153,0.12)] hover:border-emerald-500/50 transition-all">
          <div className="grid gap-8 lg:grid-cols-12 items-center">
            <div className="lg:col-span-7 space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-black uppercase tracking-widest px-3 py-1">
                  <Sparkles className="h-3 w-3" />
                  Featured Seller Guide
                </span>
                <span className="text-xs text-neutral-400 font-bold flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {featuredPost.readTime}
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight uppercase leading-tight group-hover:text-emerald-300 transition-colors">
                <Link href={`/blogs/${featuredPost.slug}`}>
                  {featuredPost.title}
                </Link>
              </h2>

              <p className="text-sm sm:text-base text-neutral-300 leading-relaxed font-normal">
                {featuredPost.excerpt}
              </p>

              {/* Key Seller Highlights Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                <div className="rounded-xl bg-neutral-900/90 border border-neutral-800 p-2.5">
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">✦ 0% Commission</p>
                  <p className="text-[11px] text-neutral-300 font-semibold mt-0.5">Keep 100% of profit</p>
                </div>
                <div className="rounded-xl bg-neutral-900/90 border border-neutral-800 p-2.5">
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">✦ Zero Hidden Fees</p>
                  <p className="text-[11px] text-neutral-300 font-semibold mt-0.5">No store rent or fees</p>
                </div>
                <div className="rounded-xl bg-neutral-900/90 border border-neutral-800 p-2.5 col-span-2 sm:col-span-1">
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">✦ Dedicated Panel</p>
                  <p className="text-[11px] text-neutral-300 font-semibold mt-0.5">Real-time inventory</p>
                </div>
              </div>

              <div className="pt-4 flex flex-wrap items-center gap-4">
                <Link
                  href={`/blogs/${featuredPost.slug}`}
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-400 text-black px-6 py-3 text-xs font-black uppercase tracking-wider hover:bg-emerald-300 transition-all shadow-lg active:scale-95"
                >
                  Read Complete Guide
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="https://seller.zebalpha.shop/register"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-neutral-900 border border-emerald-400/40 text-emerald-300 px-5 py-3 text-xs font-black uppercase tracking-wider hover:bg-emerald-500/20 transition-all"
                >
                  <Store className="h-4 w-4" />
                  Supplier Hub Register
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5">
              <Link href={`/blogs/${featuredPost.slug}`} className="block relative aspect-video rounded-3xl overflow-hidden border border-neutral-800 shadow-2xl group-hover:scale-[1.02] transition-transform">
                <Image
                  src={featuredPost.coverImage}
                  alt={featuredPost.coverImageAlt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 500px"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-xs text-white font-bold">
                  <span>Author: {featuredPost.author.name}</span>
                  <span className="bg-black/70 px-2.5 py-1 rounded-full border border-white/20">Updated 2026</span>
                </div>
              </Link>
            </div>
          </div>
        </article>
      )}

      {/* Grid of Blog Posts */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider">
            {selectedCategory === "All Articles" ? "All Editorial Guides & Insights" : `${selectedCategory} Articles`}
          </h2>
          <span className="text-xs font-bold text-neutral-400">
            {filteredPosts.length} {filteredPosts.length === 1 ? "Guide" : "Guides"} Available
          </span>
        </div>

        {filteredPosts.length === 0 ? (
          <div className="text-center py-16 rounded-3xl bg-neutral-950 border border-neutral-800 p-8">
            <p className="text-lg font-bold text-white">No articles match your query.</p>
            <p className="text-sm text-neutral-400 mt-2">Try searching for other terms like "commission", "SEO", or "streetwear".</p>
            <button
              onClick={() => {
                setSelectedCategory("All Articles");
                setSearchQuery("");
              }}
              className="mt-5 rounded-full bg-white text-black px-5 py-2 text-xs font-black uppercase tracking-wider hover:bg-neutral-200"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredPosts.map((post) => (
              <article
                key={post.slug}
                className="group flex flex-col justify-between overflow-hidden rounded-[2rem] bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-all hover:shadow-[0_0_25px_rgba(255,255,255,0.06)]"
              >
                <div>
                  <Link href={`/blogs/${post.slug}`} className="block relative aspect-video overflow-hidden">
                    <Image
                      src={post.coverImage}
                      alt={post.coverImageAlt}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-white font-black text-[10px] uppercase tracking-wider px-3 py-1">
                        {post.category}
                      </span>
                    </div>
                  </Link>

                  <div className="p-6 space-y-3">
                    <div className="flex items-center gap-3 text-xs text-neutral-400 font-semibold">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {post.readTime}
                      </span>
                      <span>•</span>
                      <span>{new Date(post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    </div>

                    <h3 className="text-lg font-black text-white uppercase tracking-tight leading-snug group-hover:text-emerald-300 transition-colors line-clamp-2">
                      <Link href={`/blogs/${post.slug}`}>
                        {post.title}
                      </Link>
                    </h3>

                    <p className="text-xs text-neutral-400 leading-relaxed line-clamp-3">
                      {post.excerpt}
                    </p>
                  </div>
                </div>

                <div className="p-6 pt-0 border-t border-neutral-900 mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full overflow-hidden bg-neutral-800 relative">
                      <Image
                        src={post.author.avatar}
                        alt={post.author.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <span className="text-[11px] font-bold text-neutral-300">{post.author.name}</span>
                  </div>

                  <Link
                    href={`/blogs/${post.slug}`}
                    className="inline-flex items-center gap-1 text-xs font-black uppercase tracking-wider text-emerald-400 group-hover:translate-x-1 transition-transform"
                  >
                    Read
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Seller Value Proposition Callout Box */}
      <section className="rounded-[2.5rem] bg-gradient-to-br from-neutral-900 via-zinc-950 to-neutral-900 border border-neutral-800 p-8 sm:p-12 shadow-2xl space-y-8">
        <div className="max-w-3xl space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-widest px-3.5 py-1">
            <Store className="h-3.5 w-3.5" />
            Empowering Independent Brands
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tight">
            Built for Small Brands & Sellers: Sell on Zebalpha with 0% Commission
          </h2>
          <p className="text-sm sm:text-base text-neutral-300 leading-relaxed font-medium">
            You continue focusing on your products and business, while we help you build your online presence and reach more customers. There’s no need to give up a large portion of your sale just to sell online.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="flex items-start gap-3 rounded-2xl bg-black/60 border border-neutral-800 p-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black text-white">0% Commission</p>
              <p className="text-xs text-neutral-400 mt-1">Keep more of what you earn with zero platform cut.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-black/60 border border-neutral-800 p-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black text-white">No Hidden Charges</p>
              <p className="text-xs text-neutral-400 mt-1">Transparent pricing, no surprises or deductions.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-black/60 border border-neutral-800 p-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black text-white">Dedicated Seller Panel</p>
              <p className="text-xs text-neutral-400 mt-1">Easily add products, manage inventory, orders & sales.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-black/60 border border-neutral-800 p-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black text-white">Reach More Customers</p>
              <p className="text-xs text-neutral-400 mt-1">Get your products in front of thousands of active online shoppers.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-black/60 border border-neutral-800 p-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black text-white">Easy Onboarding</p>
              <p className="text-xs text-neutral-400 mt-1">Simple process to start selling within 24-48 hours.</p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-black/60 border border-neutral-800 p-4">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black text-white">Built for Small Brands</p>
              <p className="text-xs text-neutral-400 mt-1">We want to help growing businesses compete online effectively.</p>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black text-white">Need help onboarding your products?</p>
            <p className="text-xs text-neutral-300 mt-0.5">If you’re interested, we’d be happy to explain how the platform works and help you get your products onboarded.</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
            <Link
              href="https://seller.zebalpha.shop/register"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto text-center rounded-full bg-emerald-400 text-black px-6 py-3 text-xs font-black uppercase tracking-wider hover:bg-emerald-300 transition-all shadow-lg active:scale-95"
            >
              ✦ Start Selling Now
            </Link>
            <Link
              href="/contact"
              className="w-full sm:w-auto text-center rounded-full bg-neutral-900 border border-neutral-700 text-white px-5 py-3 text-xs font-black uppercase tracking-wider hover:bg-neutral-800 transition-all active:scale-95"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
