"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/Header";
import { AddToCartButton } from "@/components/AddToCartButton";
import { supabase } from "@/lib/supabaseClient";
import { Product } from "@/lib/types";
import { 
  Sparkles, 
  Crown, 
  ShieldCheck, 
  Flame, 
  Truck, 
  RotateCcw, 
  Star, 
  SlidersHorizontal,
  ChevronDown,
  Layers,
  ArrowRight
} from "lucide-react";

// Curated luxury fallback products with high-end imagery and specs
const LUXURY_FALLBACK_PRODUCTS: Product[] = [
  {
    id: "luxe-101",
    name: "Supima Imperial Zip Polo - Midnight Onyx",
    price: 1899,
    mrp: 2999,
    description: "Constructed with 100% long-staple Supima® cotton yarn. Features a polished gunmetal quarter-zip, anti-curl collar, and bespoke tailored shoulder drop.",
    image_url: "/banner-premium-polo.png",
    category: "Premium Polos",
    is_premium: true,
    is_active: true,
    rating: 4.95,
    review_count: 142,
    brand: "ZEBALPHA COUTURE",
    stock: 25,
    specifications: {
      "Fabric": "100% California Supima Cotton",
      "Knit Weight": "240 GSM Luxury Interlock",
      "Hardware": "Gunmetal YKK Custom Puller",
      "Fit": "Tailored Luxury Fit"
    }
  },
  {
    id: "luxe-102",
    name: "Architectural Heavyweight Hoodie 420 GSM - Bone",
    price: 2699,
    mrp: 4499,
    description: "Ultra-heavyweight 420 GSM French Terry with double-lined structural hood, hidden headphone pocket, and minimalist tonal puff chest branding.",
    image_url: "/banner-retro-cream.png",
    category: "Heavy Hoodies",
    is_premium: true,
    is_active: true,
    rating: 4.98,
    review_count: 210,
    brand: "ZEBALPHA LUXE",
    stock: 18,
    specifications: {
      "Fabric": "100% Combed Compact Cotton Terry",
      "GSM": "420 GSM Ultra Heavyweight",
      "Hood": "Double Lined Structured Hood",
      "Treatment": "Pre-shrunk Enzyme Washed"
    }
  },
  {
    id: "luxe-103",
    name: "Textured Ottoman Rib Polo - Sage Emerald",
    price: 1749,
    mrp: 2799,
    description: "Horizontal ribbed Ottoman texture with breathable micro-knit structure. Styled with a spread collar and mother-of-pearl tonal buttons.",
    image_url: "/banner-casual-green.png",
    category: "Premium Polos",
    is_premium: true,
    is_active: true,
    rating: 4.88,
    review_count: 98,
    brand: "ZEBALPHA COUTURE",
    stock: 30,
    specifications: {
      "Fabric": "Ottoman Micro-Ribbed Cotton Blend",
      "Buttons": "Mother-of-Pearl Tonal Hardware",
      "Breathability": "High-Airflow Knit Matrix",
      "Care": "Machine Wash Cold"
    }
  },
  {
    id: "luxe-104",
    name: "Zebalpha Tactical Modular Cargo - Phantom",
    price: 2499,
    mrp: 3999,
    description: "High-density twill weave with 8 geometric pockets, magnetic storm flaps, adjustable silhouette toggles at hem, and reinforced seat.",
    image_url: "/banner-premium-polo.png",
    category: "Luxury Bottoms",
    is_premium: true,
    is_active: true,
    rating: 4.92,
    review_count: 175,
    brand: "ZEBALPHA LAB",
    stock: 14,
    specifications: {
      "Fabric": "Heavyweight Cotton-Poly Twill",
      "Closures": "Fidlock-Style Magnetic Snaps",
      "Pocket Count": "8 Deep Utility Compartments",
      "Hem": "Elastic Quick-Cinch Bungee"
    }
  },
  {
    id: "luxe-105",
    name: "Acid-Wash Vintage Oversized Tee 280 GSM - Carbon",
    price: 1299,
    mrp: 2199,
    description: "Hand-treated mineral wash finish giving each piece a distinct pattern. 280 GSM heavyweight jersey with a boxy drop-shoulder silhouette.",
    image_url: "/banner-casual-green.png",
    category: "Oversized Tees",
    is_premium: true,
    is_active: true,
    rating: 4.91,
    review_count: 312,
    brand: "ZEBALPHA LUXE",
    stock: 40,
    specifications: {
      "Fabric": "100% Combed Ring-Spun Cotton",
      "GSM": "280 GSM Heavy Single Jersey",
      "Dye": "Hand-Dyed Acid Mineral Wash",
      "Collar": "1.25-inch Heavy Ribbed Collar"
    }
  },
  {
    id: "luxe-106",
    name: "Limited Edition Cyberpunk Silk-Screen Overshirt",
    price: 2899,
    mrp: 4999,
    description: "Numbered micro-capsule of only 150 pieces worldwide. Heavyweight brushed canvas with dual chest flap utility bellows and iridescent badge.",
    image_url: "/banner-retro-cream.png",
    category: "Capsule Drops",
    is_premium: true,
    is_active: true,
    rating: 5.0,
    review_count: 84,
    brand: "ZEBALPHA LIMITED",
    stock: 8,
    specifications: {
      "Edition": "Strictly Limited to 150 Units",
      "Fabric": "12oz Brushed Cotton Duck Canvas",
      "Branding": "Serial-Numbered Laser Cut Metal Plate",
      "Fit": "Relaxed Layering Overshirt"
    }
  }
];

export default function PremiumStorePage() {
  const [products, setProducts] = useState<Product[]>(LUXURY_FALLBACK_PRODUCTS);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("featured");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    async function loadPremiumProducts() {
      try {
        setLoading(true);
        // Query products flagged as premium or tier=PREMIUM or category with Premium/Luxe
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .or("is_premium.eq.true,tier.eq.PREMIUM,category.ilike.%premium%,category.ilike.%luxe%,category_name.ilike.%premium%")
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (data && data.length > 0) {
          // Merge with fallback products ensuring no duplicates
          const dbIds = new Set(data.map((p: any) => p.id?.toString()));
          const combined = [
            ...data,
            ...LUXURY_FALLBACK_PRODUCTS.filter(fb => !dbIds.has(fb.id?.toString()))
          ];
          setProducts(combined as Product[]);
        } else {
          setProducts(LUXURY_FALLBACK_PRODUCTS);
        }
      } catch (err) {
        console.warn("Notice loading premium products, using luxury default catalog:", err);
        setProducts(LUXURY_FALLBACK_PRODUCTS);
      } finally {
        setLoading(false);
      }
    }

    loadPremiumProducts();
  }, []);

  const CATEGORY_TABS = [
    { id: "ALL", label: "All Premium Vault" },
    { id: "POLOS", label: "Supima Polos" },
    { id: "HOODIES", label: "Heavyweight Fleece" },
    { id: "TEES", label: "280+ GSM Tees" },
    { id: "BOTTOMS", label: "Tailored Bottoms" },
    { id: "CAPSULE", label: "Capsule Exclusives" }
  ];

  // Filter & Sort Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      let matchesCategory = true;
      const cat = (p.category || (p as any).category_name || (p as any).collection || "").toUpperCase();
      const name = p.name.toUpperCase();
      if (activeCategory === "POLOS") {
        matchesCategory = cat.includes("POLO") || name.includes("POLO");
      } else if (activeCategory === "HOODIES") {
        matchesCategory = cat.includes("HOOD") || name.includes("HOOD") || name.includes("FLEECE");
      } else if (activeCategory === "TEES") {
        matchesCategory = cat.includes("TEE") || name.includes("TEE") || name.includes("SHIRT");
      } else if (activeCategory === "BOTTOMS") {
        matchesCategory = cat.includes("BOTTOM") || cat.includes("CARGO") || name.includes("CARGO") || name.includes("PANT");
      } else if (activeCategory === "CAPSULE") {
        matchesCategory = cat.includes("CAPSULE") || cat.includes("LIMITED") || (p as any).is_new_drop === true;
      }

      // Search query
      const matchesSearch = 
        !searchQuery.trim() || 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.description?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    }).sort((a, b) => {
      if (sortBy === "price_asc") return a.price - b.price;
      if (sortBy === "price_desc") return b.price - a.price;
      if (sortBy === "rating") return (b.rating || 5) - (a.rating || 5);
      return 0; // featured default
    });
  }, [products, activeCategory, searchQuery, sortBy]);

  return (
    <div className="min-h-screen bg-[#070708] text-white selection:bg-amber-500/30 selection:text-amber-200">
      <Header />

      {/* Luxury Hero Showcase Section */}
      <section className="relative overflow-hidden border-b border-zinc-800/80 bg-gradient-to-b from-black via-zinc-950 to-[#0a0a0c] pt-12 pb-16 md:pt-20 md:pb-24">
        {/* Ambient Gold / Platinum Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-amber-500/10 via-amber-300/5 to-transparent blur-[120px] pointer-events-none rounded-full" />
        <div className="absolute -top-12 right-10 w-96 h-96 bg-zinc-700/10 blur-[100px] pointer-events-none rounded-full" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Top Pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.28em] text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.15)] mb-6 animate-pulse">
            <Crown className="h-3.5 w-3.5 text-amber-400" />
            <span>ZEBALPHA ATELIER • LUXURY STORE</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-tight text-white max-w-4xl mx-auto leading-[1.05]">
            Crafted For The <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-100 bg-clip-text text-transparent">Elite Culture</span>.
          </h1>

          <p className="mt-5 text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto font-medium leading-relaxed">
            High-density French Terry, 100% Long-Staple Supima® Cotton, and architectural streetwear cuts. Every piece is engineered with zero compromise.
          </p>

          {/* Luxury Value Pillars */}
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-5xl mx-auto text-left">
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-md p-4 flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <Crown size={18} />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-white">100% Supima</h4>
                <p className="text-[11px] text-zinc-400 font-medium">Extra-long staple yarn luxury</p>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-md p-4 flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-white">400+ GSM</h4>
                <p className="text-[11px] text-zinc-400 font-medium">Heavyweight drape architecture</p>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-md p-4 flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                <Truck size={18} />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-white">VIP Dispatch</h4>
                <p className="text-[11px] text-zinc-400 font-medium">Priority 24-hr express transit</p>
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-md p-4 flex items-start gap-3">
              <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                <RotateCcw size={18} />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-white">Seamless Exchange</h4>
                <p className="text-[11px] text-zinc-400 font-medium">7-day doorstep fitting support</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Catalog & Interactive Filtering */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Category Pills & Control Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-zinc-800">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 md:pb-0">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id)}
                className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                  activeCategory === tab.id
                    ? "bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-lg shadow-amber-500/20 font-extrabold scale-105"
                    : "bg-zinc-900/90 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800/80"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Sort Controls */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 md:w-56">
              <input
                type="text"
                placeholder="Search luxury vault..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl bg-zinc-900/80 border border-zinc-800 px-3.5 py-2 text-xs font-medium text-white placeholder:text-zinc-500 focus:border-amber-500/60 focus:outline-none transition-all"
              />
            </div>

            {/* Sort Select */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none rounded-xl bg-zinc-900/80 border border-zinc-800 px-4 py-2 pr-9 text-xs font-bold text-white focus:border-amber-500/60 focus:outline-none transition-all cursor-pointer"
              >
                <option value="featured">Featured Luxe</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating">Highest Rated ⭐</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Results Info */}
        <div className="flex items-center justify-between py-6">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
            Showing <span className="text-white font-black">{filteredProducts.length}</span> Masterpiece Design{filteredProducts.length !== 1 ? "s" : ""}
          </p>
          <span className="text-[11px] font-bold text-amber-400/90 tracking-wide flex items-center gap-1.5">
            <Sparkles size={13} />
            Verified Luxury Tier
          </span>
        </div>

        {/* Product Grid */}
        {filteredProducts.length === 0 ? (
          <div className="py-20 text-center rounded-3xl border border-zinc-800/80 bg-zinc-950/60 p-8">
            <Crown className="h-12 w-12 text-zinc-600 mx-auto mb-4 animate-pulse" />
            <h3 className="text-lg font-black uppercase tracking-wider text-white">No Matching Luxury Items</h3>
            <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto font-medium">
              We couldn't find items matching your search. Try changing the category filter or search terms.
            </p>
            <button
              onClick={() => { setActiveCategory("ALL"); setSearchQuery(""); }}
              className="mt-6 rounded-xl bg-white text-black px-5 py-2.5 text-xs font-black uppercase tracking-wider hover:bg-zinc-200 transition-all"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredProducts.map((product) => {
              const discountPct = product.mrp && product.mrp > product.price
                ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
                : 0;

              return (
                <div
                  key={product.id}
                  className="group relative flex flex-col rounded-3xl border border-zinc-800/80 bg-zinc-950/90 overflow-hidden transition-all duration-300 hover:border-amber-500/40 hover:shadow-[0_0_30px_rgba(245,158,11,0.08)] hover:-translate-y-1"
                >
                  {/* Luxury Badges */}
                  <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-black/80 backdrop-blur-md border border-amber-500/40 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-300 shadow-md">
                      <Crown size={11} className="text-amber-400" />
                      PREMIUM
                    </span>
                    {discountPct > 0 && (
                      <span className="inline-flex items-center rounded-full bg-emerald-500/90 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-sm">
                        {discountPct}% OFF
                      </span>
                    )}
                  </div>

                  {/* Brand Tag Right */}
                  <div className="absolute top-4 right-4 z-20">
                    <span className="rounded-md bg-black/60 backdrop-blur-md px-2 py-1 text-[9px] font-extrabold uppercase tracking-widest text-zinc-400 border border-zinc-800">
                      {product.brand || "ZEBALPHA"}
                    </span>
                  </div>

                  {/* Image Container with Zoom Effect */}
                  <Link
                    href={`/products/${product.id}`}
                    className="relative aspect-[4/5] w-full overflow-hidden bg-zinc-900 block"
                  >
                    <Image
                      src={product.image_url || "/banner-premium-polo.png"}
                      alt={product.name}
                      fill
                      className="object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-60" />
                  </Link>

                  {/* Product Details */}
                  <div className="flex flex-1 flex-col p-5 sm:p-6 justify-between">
                    <div>
                      {/* Rating & Stock */}
                      <div className="flex items-center justify-between text-xs mb-2.5">
                        <div className="flex items-center gap-1 text-amber-400 font-black">
                          <Star size={13} className="fill-amber-400 text-amber-400" />
                          <span>{product.rating || "4.9"}</span>
                          <span className="text-[10px] text-zinc-500 font-bold">({product.review_count || "120+"})</span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                          In Stock ({product.stock || 20})
                        </span>
                      </div>

                      {/* Product Name */}
                      <Link href={`/products/${product.id}`} className="group-hover:text-amber-200 transition-colors">
                        <h3 className="text-base sm:text-lg font-black text-white leading-snug line-clamp-2 tracking-tight">
                          {product.name}
                        </h3>
                      </Link>

                      {/* Description */}
                      <p className="mt-2 text-xs font-medium text-zinc-400 line-clamp-2 leading-relaxed">
                        {product.description}
                      </p>

                      {/* Key Specification Pills */}
                      {product.specifications && Object.keys(product.specifications).length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {Object.entries(product.specifications).slice(0, 2).map(([k, v]) => (
                            <span key={k} className="text-[10px] font-bold text-zinc-300 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md">
                              {v}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Price and Cart Action */}
                    <div className="mt-6 pt-4 border-t border-zinc-900 flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-lg sm:text-xl font-black text-white">
                            ₹{product.price.toLocaleString("en-IN")}
                          </span>
                          {product.mrp && product.mrp > product.price && (
                            <span className="text-xs font-bold text-zinc-500 line-through">
                              ₹{product.mrp.toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                          Taxes Included
                        </span>
                      </div>

                      <div className="shrink-0">
                        <AddToCartButton product={product} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Exclusive VIP Banner Footnote */}
        <section className="mt-16 rounded-3xl border border-amber-500/20 bg-gradient-to-r from-zinc-950 via-[#120f0a] to-zinc-950 p-8 md:p-12 text-center relative overflow-hidden">
          <div className="relative z-10 max-w-2xl mx-auto space-y-3">
            <div className="inline-flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-widest">
              <Crown size={15} />
              <span>ZEBALPHA LUXURY MEMBERSHIP</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black uppercase text-white">
              Unlock Early Access To Micro-Drops
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 font-medium leading-relaxed">
              Every premium purchase adds loyalty points toward your next unreleased capsule drop. Guaranteed limited batch reservation.
            </p>
            <div className="pt-2">
              <Link
                href="/new-drops"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-black px-6 py-3 text-xs font-black uppercase tracking-wider hover:brightness-110 transition-all shadow-lg shadow-amber-500/20"
              >
                <span>Explore Upcoming Hype Drops</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
