"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@shared/utils/supabaseClient";
import { 
  Plus, 
  Sparkles, 
  Trash2, 
  Edit3, 
  Upload, 
  X, 
  Check, 
  Layers, 
  Eye, 
  EyeOff,
  AlertCircle,
  ExternalLink,
  Crown,
  Flame,
  Clock,
  ArrowRight,
  Package
} from "lucide-react";
import { uploadToCloudinary } from "@shared/services";
import { isProductNewDrop, isDropLive, getDropDisplayStatus } from "@/lib/dropUtils";

const TAXONOMY_OPTIONS = [
  "ALL",
  "POLOS",
  "T-SHIRTS",
  "HOODIES",
  "SHIRTS",
  "BOTTOMS",
  "LIMITED",
  "ACCESSORIES"
];

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string>("");
  const [successMsg, setSuccessMsg] = useState<string>("");

  // Form State
  const [form, setForm] = useState({
    name: "",
    main_category: "POLOS",
    image_url: "",
    description: "",
    sort_order: 0,
    is_active: true,
  });

  const [imagePreview, setImagePreview] = useState<string>("");

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

  const openCreateModal = () => {
    setEditingId(null);
    setForm({
      name: "",
      main_category: "POLOS",
      image_url: "",
      description: "",
      sort_order: categories.length,
      is_active: true,
    });
    setImagePreview("");
    setError("");
    setIsModalOpen(true);
  };

  const openEditModal = (item: CategoryItem) => {
    setEditingId(item.id);
    setForm({
      name: item.name,
      main_category: item.main_category || "POLOS",
      image_url: item.image_url || "",
      description: item.description || "",
      sort_order: item.sort_order ?? categories.length,
      is_active: item.is_active ?? true,
    });
    setImagePreview(item.image_url || "");
    setError("");
    setIsModalOpen(true);
  };

  const [uploadingImage, setUploadingImage] = useState(false);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("❌ Image file size must be less than 5 MB.");
      return;
    }

    try {
      setUploadingImage(true);
      setError("");

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setImagePreview(base64);
        setForm((prev) => ({ ...prev, image_url: prev.image_url || base64 }));
      };
      reader.readAsDataURL(file);

      const uploadedUrl = await uploadToCloudinary(file);
      if (uploadedUrl) {
        setForm((prev) => ({ ...prev, image_url: uploadedUrl }));
        setImagePreview(uploadedUrl);
      }
    } catch (err: any) {
      console.warn("Cloudinary/Supabase storage upload notice, using local image preview:", err);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (!form.name.trim()) {
      setError("❌ Please provide a collection name.");
      return;
    }

    setSubmitting(true);
    try {
      const finalImage = form.image_url || imagePreview || null;

      const payload = {
        name: form.name.trim(),
        main_category: (form.main_category || "ALL").trim().toUpperCase(),
        image_url: finalImage,
        description: form.description || null,
        sort_order: form.sort_order || 0,
        is_active: form.is_active !== false,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        // 1. Try Supabase direct update
        const { error: sbErr } = await supabase
          .from("categories")
          .update(payload)
          .eq("id", editingId);

        if (sbErr) {
          // Fallback to API route
          const res = await fetch(`/api/categories/${editingId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = await res.json();
          if (!data.success) throw new Error(data.error || "Failed to update collection.");
        }
        setSuccessMsg("✅ Collection updated successfully!");
      } else {
        const baseSlug = form.name
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
        const uniqueSlug = `${baseSlug || "collection"}-${Date.now().toString(36)}`;

        const insertPayload = {
          ...payload,
          slug: uniqueSlug,
          created_at: new Date().toISOString(),
        };

        const { error: sbErr } = await supabase
          .from("categories")
          .insert([insertPayload]);

        if (sbErr) {
          const res = await fetch("/api/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(insertPayload),
          });
          const data = await res.json();
          if (!data.success) throw new Error(data.error || "Failed to create collection.");
        }
        setSuccessMsg("✅ Collection created successfully!");
      }

      setIsModalOpen(false);
      loadAllData();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      setError(`❌ ${err.message || "Failed to save collection."}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete collection "${name}"?`)) return;

    try {
      // 1. Try direct Supabase delete
      const { error: sbErr } = await supabase
        .from("categories")
        .delete()
        .eq("id", id);

      if (sbErr) {
        // 2. Fallback to API route
        const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || "Failed to delete collection.");
        }
      }

      setSuccessMsg(`✅ Collection "${name}" deleted.`);
      loadAllData();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      alert(`Error deleting collection: ${err.message || "Failed to delete"}`);
    }
  };

  const toggleActive = async (item: CategoryItem) => {
    try {
      const updatedStatus = !item.is_active;

      // Optimistic UI update
      setCategories((prev) =>
        prev.map((c) => (c.id === item.id ? { ...c, is_active: updatedStatus } : c))
      );

      // 1. Try direct Supabase update
      const { error: sbErr } = await supabase
        .from("categories")
        .update({ is_active: updatedStatus, updated_at: new Date().toISOString() })
        .eq("id", item.id);

      if (sbErr) {
        const res = await fetch(`/api/categories/${item.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: updatedStatus }),
        });
        const data = await res.json();
        if (!data.success) {
          // Rollback optimistic update
          setCategories((prev) =>
            prev.map((c) => (c.id === item.id ? { ...c, is_active: item.is_active } : c))
          );
        }
      }
    } catch (err) {
      console.error("Failed to toggle category active status:", err);
    }
  };

  // Filtered lists for tabs
  const newDropProducts = sellerProducts.filter(
    (p) => p.is_new_drop || p.status === "COMING_SOON" || (p.specifications as any)?.is_new_drop === "true"
  );
  const premiumProducts = sellerProducts.filter(
    (p) => p.is_premium || p.tier === "PREMIUM" || (p.specifications as any)?.is_premium === "true"
  );

  const handleSeedCollections = async () => {
    try {
      const DEFAULT_BRAND_CATEGORIES = [
        { name: "Premium Polos", main_category: "POLOS", icon: "👕", description: "100% Supima Pique & Knitted Polos", image_url: "/banner-premium-polo.png", sort_order: 1, is_active: true },
        { name: "Oversized Tees", main_category: "T-SHIRTS", icon: "🛹", description: "240 GSM Heavyweight Streetwear Tees", image_url: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&auto=format&fit=crop&q=80", sort_order: 2, is_active: true },
        { name: "Heavyweight Hoodies", main_category: "HOODIES", icon: "🧥", description: "400+ GSM French Terry Fleece Hoodies", image_url: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=600&auto=format&fit=crop&q=80", sort_order: 3, is_active: true },
        { name: "Classic Shirts", main_category: "SHIRTS", icon: "👔", description: "Structured Utility & Camp-Collar Overshirts", image_url: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600&auto=format&fit=crop&q=80", sort_order: 4, is_active: true },
        { name: "Cargo & Bottoms", main_category: "BOTTOMS", icon: "👖", description: "Multi-Pocket Tactical Cargos & Streetwear Bottoms", image_url: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=600&auto=format&fit=crop&q=80", sort_order: 5, is_active: true },
        { name: "Limited Drops", main_category: "LIMITED", icon: "⚡", description: "Exclusive Seasonally Numbered Limited Capsules", image_url: "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&auto=format&fit=crop&q=80", sort_order: 6, is_active: true },
        { name: "Accessories & Headwear", main_category: "ACCESSORIES", icon: "🧢", description: "Elevated Beanies, Caps & Streetwear Essentials", image_url: "https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?w=600&auto=format&fit=crop&q=80", sort_order: 7, is_active: true }
      ];

      const seedPayload = DEFAULT_BRAND_CATEGORIES.map((c) => ({
        ...c,
        slug: c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from("categories")
        .upsert(seedPayload, { onConflict: "name" });

      if (error) {
        await fetch("/api/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(seedPayload)
        });
      }

      setSuccessMsg("✨ 7 Brand Collections populated to database!");
      loadAllData();
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: any) {
      console.error("Error seeding collections:", err);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white uppercase">
              Collections & Drops Hub
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
              Storefront Sets
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Organize products into curated collections, upcoming hype drops, and luxury premium vaults visible across the storefront.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {activeTab === "collections" && (
            <>
              <button
                onClick={handleSeedCollections}
                className="flex items-center justify-center gap-1.5 rounded-2xl bg-zinc-900 border border-zinc-700 px-4 py-3 text-xs font-bold text-white hover:bg-zinc-800 transition-all cursor-pointer"
                title="Populate missing default brand collections"
              >
                <Sparkles size={14} className="text-amber-400" />
                <span>Seed Brand Sets</span>
              </button>
              <button
                onClick={openCreateModal}
                className="flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-xs font-black uppercase tracking-wider text-black transition-all hover:bg-zinc-200 active:scale-95 shadow-lg cursor-pointer"
              >
                <Plus size={16} />
                <span>Create Collection</span>
              </button>
            </>
          )}
          <Link
            href="/dashboard/products"
            className="flex items-center justify-center gap-2 rounded-2xl bg-zinc-900 border border-zinc-800 px-4 py-3 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all"
          >
            <Package size={15} />
            <span>Manage Products</span>
          </Link>
        </div>
      </div>

      {/* 2. Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
        <button
          onClick={() => setActiveTab("collections")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
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
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
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
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            activeTab === "premium"
              ? "bg-amber-500 text-black shadow-md font-extrabold"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          <Crown size={14} className={activeTab === "premium" ? "text-black" : "text-amber-400"} />
          <span>💎 Premium Store Vault ({premiumProducts.length})</span>
        </button>
      </div>

      {/* Success Notification */}
      {successMsg && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-950/70 border border-emerald-800 p-4 text-xs font-bold text-emerald-300 animate-fadeIn">
          <Check size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 3. TAB 1: CURATED COLLECTIONS */}
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
              <h3 className="text-base font-black text-white uppercase">No Curated Cards Uploaded Yet</h3>
              <p className="text-xs text-zinc-400 max-w-sm mt-1 mb-6">
                Upload your first collection card (e.g. Premium Polos, Oversized Tees) to have it feature live on the storefront.
              </p>
              <button
                onClick={openCreateModal}
                className="flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-xs font-black uppercase tracking-wider text-black hover:bg-zinc-200 transition-all cursor-pointer"
              >
                <Plus size={16} />
                <span>Upload First Collection</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className={`group relative rounded-3xl border transition-all duration-300 p-5 flex flex-col justify-between ${
                    cat.is_active
                      ? "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                      : "bg-zinc-950/50 border-zinc-900 opacity-60"
                  }`}
                >
                  <div>
                    {/* Top Bar with Category & Active Toggle */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-zinc-900 border border-zinc-800 text-zinc-300">
                        {cat.main_category || "ALL"}
                      </span>
                      <button
                        onClick={() => toggleActive(cat)}
                        title={cat.is_active ? "Card is visible on storefront" : "Card is hidden"}
                        className={`p-1.5 rounded-xl border transition-colors ${
                          cat.is_active
                            ? "border-emerald-800 bg-emerald-950/60 text-emerald-400"
                            : "border-zinc-800 bg-zinc-900 text-zinc-500"
                        }`}
                      >
                        {cat.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                    </div>

                    {/* Card Preview Image */}
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
                          <span className="text-[10px] uppercase tracking-wider font-bold">No Image</span>
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

                  {/* Action Buttons */}
                  <div className="mt-5 pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                      Order: #{cat.sort_order}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEditModal(cat)}
                        className="p-2 rounded-xl bg-zinc-900 text-zinc-300 border border-zinc-800 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
                        title="Edit Collection"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id, cat.name)}
                        className="p-2 rounded-xl bg-rose-950/30 text-rose-400 border border-rose-900/40 hover:bg-rose-900/60 transition-colors cursor-pointer"
                        title="Delete Collection"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
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

      {/* 6. Add / Edit Modal for Collection Cards */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800">
              <div>
                <h2 className="text-lg font-black text-white uppercase tracking-tight">
                  {editingId ? "Edit Collection Card" : "New Collection Card"}
                </h2>
                <p className="text-xs text-zinc-400">Manage storefront collection card assets and display order.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-2xl bg-rose-950/60 border border-rose-800 p-3.5 text-xs font-bold text-rose-300">
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-black text-zinc-300 uppercase tracking-wider mb-1.5">
                  Collection Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Polos & Streetwear Tees"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-xs font-bold text-white placeholder-zinc-500 focus:border-white focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-zinc-300 uppercase tracking-wider mb-1.5">
                    Category Filter
                  </label>
                  <select
                    value={form.main_category}
                    onChange={(e) => setForm({ ...form, main_category: e.target.value })}
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-3 py-3 text-xs font-bold text-white focus:border-white focus:outline-none transition-colors cursor-pointer"
                  >
                    {TAXONOMY_OPTIONS.map((tax) => (
                      <option key={tax} value={tax}>{tax}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-zinc-300 uppercase tracking-wider mb-1.5">
                    Display Order
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value, 10) || 0 })}
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-xs font-bold text-white placeholder-zinc-500 focus:border-white focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-zinc-300 uppercase tracking-wider mb-1.5">
                  Collection Description
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Signature 100% Supima & Combed Cotton streetwear pieces..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-bold text-white placeholder-zinc-500 focus:border-white focus:outline-none transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-zinc-300 uppercase tracking-wider mb-1.5">
                  Collection Banner Image
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-28 shrink-0 rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Upload size={20} className="text-zinc-600" />
                    )}
                  </div>
                  <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 hover:border-zinc-600 rounded-2xl p-4 cursor-pointer transition-colors bg-zinc-900/40">
                    <span className="text-xs font-black text-white">
                      {uploadingImage ? "Uploading Image..." : "Upload New Image"}
                    </span>
                    <span className="text-[10px] text-zinc-500 mt-0.5">PNG, JPG, WEBP (Max 5MB)</span>
                    <input type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-3 text-xs font-bold text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingImage}
                  className="flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-xs font-black uppercase tracking-wider text-black hover:bg-zinc-200 transition-all disabled:opacity-50 cursor-pointer shadow-lg"
                >
                  {submitting ? "Saving..." : uploadingImage ? "Uploading Cover..." : editingId ? "Update Card" : "Save Collection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
