"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Header } from "@/components/Header";
import { supabase } from "@/lib/supabaseClient";
import { Product } from "@/lib/types";
import { ArrowUpRight, Sparkles, Layers, Flame } from "lucide-react";

interface CollectionItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
  categoryFilter: string;
  image: string;
  itemCount: number;
}

const FEATURED_COLLECTIONS: CollectionItem[] = [
  {
    id: "polos-tees",
    title: "Polos & Streetwear Tees",
    subtitle: "Signature 100% Supima & Combed Cotton",
    description: "Relaxed modern fits, tailored zip collars, and heavyweight minimal streetwear tees crafted for everyday luxury.",
    badge: "Bestsellers",
    categoryFilter: "Polos",
    image: "/banner-premium-polo.png",
    itemCount: 18,
  },
  {
    id: "heavyweight-hoodies",
    title: "Heavyweight Hoodies",
    subtitle: "380 GSM Plush Fleece Lined",
    description: "Architectural silhouettes with double-lined hoods, drop-shoulders, and ultra-durable ribbing built for cold drops.",
    badge: "Core Drops",
    categoryFilter: "Hoodies",
    image: "/banner-casual-green.png",
    itemCount: 12,
  },
  {
    id: "casual-shirts",
    title: "Casual Collared Shirts",
    subtitle: "Resort Linen & Textured Knits",
    description: "Breathable woven cottons and effortless relaxed tailoring designed for day-to-night versatility.",
    badge: "Summer Edits",
    categoryFilter: "Shirts",
    image: "/banner-retro-cream.png",
    itemCount: 14,
  },
  {
    id: "streetwear-bottoms",
    title: "Cargo & Streetwear Bottoms",
    subtitle: "Utility Pockets & Relaxed Trousers",
    description: "Deep pocket utility cargo pants, heavyweight fleece joggers, and relaxed modern trousers with adjustable hems.",
    badge: "Essential Bottoms",
    categoryFilter: "Bottoms",
    image: "/banner-premium-polo.png",
    itemCount: 9,
  },
  {
    id: "limited-drops",
    title: "Limited Edition Drops",
    subtitle: "Numbered Micro-Batches",
    description: "Exclusive small-batch releases with custom dye treatments, high-density embroidery, and unique serial tags.",
    badge: "🔥 Limited 100",
    categoryFilter: "Limited",
    image: "/banner-casual-green.png",
    itemCount: 6,
  },
  {
    id: "coming-soon",
    title: "New Drops & Future Designs",
    subtitle: "Unreleased Sample Preview",
    description: "Sneak peek into upcoming drops. Vote your customer hype rating and register for drop notifications before launch.",
    badge: "⚡ Coming Soon",
    categoryFilter: "new-drops",
    image: "/banner-retro-cream.png",
    itemCount: 8,
  },
];

export default function CollectionsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      try {
        const { data } = await supabase
          .from("products")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (data) setProducts(data as Product[]);
      } catch (err) {
        console.error("Error loading products for collections:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  return (
    <main className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-zinc-800 bg-gradient-to-b from-zinc-950 via-black to-black px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.06),transparent_50%)] pointer-events-none" />
        <div className="mx-auto max-w-[1400px]">
          <div className="flex flex-col items-start gap-4 max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/80 px-4 py-1.5 text-xs font-black uppercase tracking-[0.25em] text-neutral-300 backdrop-blur-md">
              <Layers className="h-3.5 w-3.5 text-white" />
              Curated Style Edits • 2026
            </span>
            <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl md:text-6xl uppercase">
              Curated Collections
            </h1>
            <p className="text-base sm:text-lg font-medium text-zinc-400 leading-relaxed">
              Explore ZEBALPHA handpicked signature edits, premium fabric drops, and timeless streetwear fits crafted with 100% Supima and combed cottons.
            </p>
          </div>
        </div>
      </section>

      {/* Collections Grid */}
      <section className="mx-auto max-w-[1400px] px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {FEATURED_COLLECTIONS.map((col) => {
            const matchedProductsCount = products.filter((p) => {
              const catName = (p.category_name || p.category || "").toLowerCase();
              return catName.includes(col.categoryFilter.toLowerCase());
            }).length;

            const totalDisplayCount = matchedProductsCount > 0 ? matchedProductsCount : col.itemCount;

            const isNewDropsCard = col.categoryFilter === "new-drops";
            const targetHref = isNewDropsCard ? "/new-drops" : `/products?category=${col.categoryFilter}`;

            return (
              <div
                key={col.id}
                className="group relative flex flex-col justify-between overflow-hidden rounded-[2.5rem] border border-zinc-800 bg-zinc-950 p-6 md:p-8 transition-all duration-500 hover:border-zinc-700 hover:shadow-[0_20px_50px_rgba(255,255,255,0.05)]"
              >
                {/* Background Image Container with Overlay */}
                <div className="absolute inset-0 z-0 opacity-25 transition-transform duration-700 group-hover:scale-110">
                  <Image
                    src={col.image}
                    alt={col.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-transparent" />
                </div>

                {/* Top Badge & Action */}
                <div className="relative z-10 flex items-center justify-between">
                  <span className="rounded-full border border-white/20 bg-black/60 px-3.5 py-1 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur-md">
                    {col.badge}
                  </span>
                  <span className="text-[11px] font-bold text-zinc-400">
                    {totalDisplayCount} Items Available
                  </span>
                </div>

                {/* Body Details */}
                <div className="relative z-10 mt-16 space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">
                    {col.subtitle}
                  </span>
                  <h3 className="text-2xl font-black tracking-tight text-white group-hover:text-neutral-200 transition-colors">
                    {col.title}
                  </h3>
                  <p className="text-xs font-medium text-zinc-400 leading-relaxed line-clamp-3">
                    {col.description}
                  </p>
                </div>

                {/* Bottom Action Link */}
                <div className="relative z-10 mt-8 pt-4 border-t border-zinc-800/80 flex items-center justify-between">
                  <Link
                    href={targetHref}
                    className="inline-flex items-center gap-2 rounded-xl bg-white text-black font-black text-xs uppercase tracking-wider px-5 py-3 transition-all hover:bg-neutral-200 active:scale-95 shadow-md"
                  >
                    <span>{isNewDropsCard ? "Preview Upcoming Drops" : "Explore Collection"}</span>
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Quick Category Direct Access Banner */}
      <section className="border-t border-zinc-800 bg-zinc-950 py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1400px] flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h4 className="text-xl font-black uppercase tracking-tight text-white">Looking for something specific?</h4>
            <p className="text-xs text-zinc-400 mt-1 font-medium">Browse our full inventory catalog or filter directly by your preferred fit.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/products?category=Polos"
              className="rounded-full border border-zinc-800 bg-zinc-900 px-5 py-2.5 text-xs font-bold text-white hover:border-white transition-all"
            >
              👕 Polos & Tees
            </Link>
            <Link
              href="/products?category=Hoodies"
              className="rounded-full border border-zinc-800 bg-zinc-900 px-5 py-2.5 text-xs font-bold text-white hover:border-white transition-all"
            >
              🧥 Hoodies
            </Link>
            <Link
              href="/products?category=Shirts"
              className="rounded-full border border-zinc-800 bg-zinc-900 px-5 py-2.5 text-xs font-bold text-white hover:border-white transition-all"
            >
              👔 Shirts
            </Link>
            <Link
              href="/new-drops"
              className="rounded-full border border-white bg-white text-black px-5 py-2.5 text-xs font-black uppercase tracking-wider hover:bg-neutral-200 transition-all"
            >
              ⚡ New Drops
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
