"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@shared/utils/supabaseClient";
import { 
  Sparkles, 
  Layers, 
  Eye, 
  EyeOff,
  Crown,
  Flame,
  ArrowRight,
  Package,
  ShieldCheck,
  Plus
} from "lucide-react";
import { isDropLive, getDropDisplayStatus } from "@/lib/dropUtils";

interface CategoryItem {
  id: string;
  name: string;
  slug?: string;
  main_category: string;
  image_url: string | null;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
}

export default function SellerCollectionsPage() {
  const [activeTab, setActiveTab] = useState<"collections" | "new_drops" | "premium">("collections");
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [sellerProducts, setSellerProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      // Fetch Categories / Collections directly from Supabase
      const { data: catData, error: catErr } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (!catErr && catData) {
        setCategories(catData);
      } else {
        // Fallback API call
        const res = await fetch("/api/categories");
        const data = await res.json();
        if (data.success && data.categories) {
          setCategories(data.categories);
        }
      }

      // Fetch seller's products
      if (user) {
        const { data: pData } = await supabase
          .from("products")
          .select("*")
          .eq("seller_id", user.id)
          .order("created_at", { ascending: false });

        setSellerProducts(pData || []);
      }
    } catch (err: any) {
      console.error("Failed to fetch collections and products:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();

    const channel = supabase
      .channel("seller-categories-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "categories" },
        () => {
          loadAllData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Filtered lists for tabs
  const newDropProducts = sellerProducts.filter(
    (p) => p.is_new_drop || p.status === "COMING_SOON" || (p.specifications as any)?.is_new_drop === "true"
  );
  const premiumProducts = sellerProducts.filter(
    (p) => p.is_premium || p.tier === "PREMIUM" || (p.specifications as any)?.is_premium === "true"
  );

  return (
    <div className="space-y-6 select-none">
      {/* 1. Page Header with Admin Authority Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-950 p-6 rounded-3xl border border-zinc-800 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-black tracking-tight text-white uppercase">
              Curated Collections Catalogue
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider bg-violet-500/20 text-violet-300 border border-violet-500/40 uppercase flex items-center gap-1">
              <ShieldCheck size={12} className="text-violet-400" />
              <span>Admin Managed</span>
            </span>
          </div>
          <p className="text-xs text-zinc-400 max-w-2xl">
            Browse official store collections created and curated by Admin. Use these categories when adding new products to ensure seamless routing on the ZEBALPHA storefront.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap relative z-10">
          <Link
            href="/dashboard/products"
            className="flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-xs font-black uppercase tracking-wider text-black transition-all hover:bg-zinc-200 active:scale-95 shadow-lg cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Product to Collection</span>
          </Link>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("collections")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "collections"
              ? "bg-white text-black shadow-md font-extrabold"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          <Layers size={14} />
          <span>Curated Collections ({categories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("new_drops")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "new_drops"
              ? "bg-orange-500 text-white shadow-md font-extrabold"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          <Flame size={14} className={activeTab === "new_drops" ? "text-white" : "text-orange-400"} />
          <span>⚡ Upcoming New Drops ({newDropProducts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("premium")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "premium"
              ? "bg-amber-500 text-black shadow-md font-extrabold"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          <Crown size={14} className={activeTab === "premium" ? "text-black" : "text-amber-400"} />
          <span>💎 Premium Store Vault ({premiumProducts.length})</span>
        </button>
      </div>

      {/* 3. TAB 1: CURATED COLLECTIONS (Read-Only Catalogue) */}
      {activeTab === "collections" && (
        <>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white" />
              <span className="text-xs text-zinc-400">Loading collection cards...</span>
            </div>
          ) : categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 rounded-3xl border border-zinc-800 bg-zinc-950 text-center">
              <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-500 mb-4 border border-zinc-800">
                <Sparkles size={28} />
              </div>
              <h3 className="text-base font-black text-white uppercase">No Curated Collections Added Yet</h3>
              <p className="text-xs text-zinc-400 max-w-sm mt-1 mb-2">
                SuperAdmin has not added any collection categories yet. Check back soon for updated storefront sets.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {categories.map((cat) => {
                const productCount = sellerProducts.filter(
                  (p) => (p.category_id && String(p.category_id) === String(cat.id)) || 
                         (p.category && (p.category || "").toLowerCase() === (cat.name || "").toLowerCase()) ||
                         (p.main_category && (p.main_category || "").toLowerCase() === (cat.main_category || "").toLowerCase())
                ).length;

                return (
                  <div
                    key={cat.id}
                    className={`group relative rounded-3xl border transition-all duration-300 p-5 flex flex-col justify-between ${
                      cat.is_active
                        ? "bg-zinc-950 border-zinc-800 hover:border-violet-500/50 hover:bg-zinc-900/60"
                        : "bg-zinc-950/50 border-zinc-900 opacity-60"
                    }`}
                  >
                    <div>
                      {/* Top Bar with Category & Active Status */}
                      <div className="flex items-center justify-between mb-4">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-zinc-900 border border-zinc-800 text-zinc-300">
                          {cat.main_category || "ALL"}
                        </span>
                        <span className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                          cat.is_active
                            ? "border-emerald-800/80 bg-emerald-950/60 text-emerald-400"
                            : "border-zinc-800 bg-zinc-900 text-zinc-500"
                        }`}>
                          {cat.is_active ? <Eye size={12} /> : <EyeOff size={12} />}
                          <span>{cat.is_active ? "Live" : "Hidden"}</span>
                        </span>
                      </div>

                      {/* Card Preview Cover Image */}
                      <div className="relative w-full h-40 rounded-2xl bg-zinc-900 border border-zinc-800/80 overflow-hidden flex items-center justify-center mb-4">
                        {cat.image_url ? (
                          <img
                            src={cat.image_url}
                            alt={cat.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-zinc-600">
                            <Sparkles size={24} />
                            <span className="text-[10px] uppercase tracking-wider font-bold">Default Cover</span>
                          </div>
                        )}
                      </div>

                      {/* Name & Description */}
                      <h3 className="text-sm font-black text-white uppercase tracking-tight line-clamp-1">
                        {cat.name}
                      </h3>
                      {cat.description && (
                        <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                          {cat.description}
                        </p>
                      )}
                    </div>

                    {/* Footer Info & Quick Link */}
                    <div className="mt-5 pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                        <Package size={12} className="text-zinc-500" />
                        <span>{productCount} Products Listed</span>
                      </span>

                      <Link
                        href={`/dashboard/products?category=${encodeURIComponent(cat.name)}`}
                        className="text-violet-400 hover:text-violet-300 font-black text-[11px] uppercase tracking-wider flex items-center gap-1"
                      >
                        <span>List Product</span>
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* 4. TAB 2: UPCOMING NEW DROPS */}
      {activeTab === "new_drops" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-orange-950/20 border border-orange-500/20">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
                <Flame size={18} />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-white">Upcoming Hype Drops List</h4>
                <p className="text-[11px] text-zinc-400">Products flagged as New Drops show on /new-drops where customers can cast hype votes and get drop alerts.</p>
              </div>
            </div>
            <Link
              href="/dashboard/products"
              className="px-4 py-2 rounded-xl bg-orange-500 text-white font-black text-xs uppercase hover:bg-orange-600 transition-all"
            >
              + Flag New Product as Drop
            </Link>
          </div>

          {newDropProducts.length === 0 ? (
            <div className="py-16 text-center rounded-3xl border border-zinc-800 bg-zinc-950 p-8">
              <Flame size={36} className="text-zinc-600 mx-auto mb-3" />
              <h3 className="text-sm font-black uppercase text-white">No Upcoming Drops Set</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                Go to Product Management and check &quot;Flag as New Drop&quot; on any upcoming design.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {newDropProducts.map((p) => {
                const live = isDropLive(p);
                const dropStatus = getDropDisplayStatus(p);

                return (
                  <div key={p.id} className="rounded-3xl border border-orange-500/30 bg-zinc-950 p-5 flex flex-col justify-between space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                          live
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                            : "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                        }`}>
                          {live ? "🔥 LIVE DROP" : "⚡ DROPPING SOON"}
                        </span>
                        <span className="text-[10px] font-bold text-zinc-400">
                          {dropStatus.dateText}
                        </span>
                      </div>

                      <div className="relative h-36 w-full rounded-2xl overflow-hidden bg-zinc-900 mb-3 border border-zinc-800">
                        <img src={p.image_url || "/banner-premium-polo.png"} alt={p.name} className="w-full h-full object-cover" />
                      </div>

                      <h4 className="text-sm font-black text-white">{p.name}</h4>
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{p.description}</p>
                    </div>

                    <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-xs">
                      <span className="font-black text-white">₹{p.price}</span>
                      <Link
                        href="/dashboard/products"
                        className="text-orange-400 font-bold hover:underline inline-flex items-center gap-1 text-[11px]"
                      >
                        <span>Edit Drop Settings</span>
                        <ArrowRight size={12} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 5. TAB 3: PREMIUM STORE ITEMS */}
      {activeTab === "premium" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-950/20 border border-amber-500/20">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <Crown size={18} />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-white">Premium Store Vault Listings</h4>
                <p className="text-[11px] text-zinc-400">Items tagged as Premium are featured in /premium-store and calculated in separated Premium Revenue reports.</p>
              </div>
            </div>
            <Link
              href="/dashboard/products"
              className="px-4 py-2 rounded-xl bg-amber-500 text-black font-black text-xs uppercase hover:bg-amber-400 transition-all"
            >
              + Tag Product as Premium
            </Link>
          </div>

          {premiumProducts.length === 0 ? (
            <div className="py-16 text-center rounded-3xl border border-zinc-800 bg-zinc-950 p-8">
              <Crown size={36} className="text-zinc-600 mx-auto mb-3" />
              <h3 className="text-sm font-black uppercase text-white">No Premium Products Tagged</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                Tag your high-GSM, luxury Supima, or capsule pieces as &quot;Premium Store Item&quot; in Product Management.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {premiumProducts.map((p) => (
                <div key={p.id} className="rounded-3xl border border-amber-500/30 bg-zinc-950 p-5 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider">
                        💎 PREMIUM VAULT
                      </span>
                      <span className="text-[10px] font-bold text-zinc-400">
                        {p.collection || "Luxury Tier"}
                      </span>
                    </div>

                    <div className="relative h-36 w-full rounded-2xl overflow-hidden bg-zinc-900 mb-3 border border-zinc-800">
                      <img src={p.image_url || "/banner-premium-polo.png"} alt={p.name} className="w-full h-full object-cover" />
                    </div>

                    <h4 className="text-sm font-black text-white">{p.name}</h4>
                    <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{p.description}</p>
                  </div>

                  <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-xs">
                    <span className="font-black text-amber-300">₹{p.price}</span>
                    <Link
                      href="/dashboard/products"
                      className="text-amber-400 font-bold hover:underline inline-flex items-center gap-1 text-[11px]"
                    >
                      <span>Edit Settings</span>
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
