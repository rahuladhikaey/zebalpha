"use client";

import { useState, useEffect } from "react";
import { supabaseA as supabase } from "@shared/utils/supabaseClient";
import { 
  Package, 
  CheckCircle2, 
  XCircle, 
  EyeOff, 
  Eye, 
  Trash2, 
  Search, 
  Image as ImageIcon,
  AlertCircle,
  Crown,
  Flame,
  Layers,
  Sparkles
} from "lucide-react";

export default function ProductApprovalView() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [filterTab, setFilterTab] = useState<"all" | "premium" | "new_drops" | "approved" | "hidden">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [actioningId, setActioningId] = useState<string | number | null>(null);
  const [editingCollectionId, setEditingCollectionId] = useState<string | number | null>(null);
  const [collectionInput, setCollectionInput] = useState<string>("");

  const loadProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (e: any) {
      console.error("Error loading products:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleUpdateProductStatus = async (productId: string | number, updates: any) => {
    setActioningId(productId);
    try {
      const { data, error } = await supabase
        .from("products")
        .update(updates)
        .eq("id", productId)
        .select();

      if (error) throw error;

      const updatedObj = data?.[0] || { ...products.find(p => p.id === productId), ...updates };
      setProducts(products.map(p => p.id === productId ? updatedObj : p));
      if (selectedProduct?.id === productId) {
        setSelectedProduct(updatedObj);
      }
    } catch (err: any) {
      alert(err.message || "Failed to update product.");
    }
    setActioningId(null);
  };

  const handleSaveCollection = async (productId: string | number) => {
    await handleUpdateProductStatus(productId, { collection: collectionInput.trim() || null });
    setEditingCollectionId(null);
  };

  const handleDeleteProduct = async (productId: string | number, name: string) => {
    if (!confirm(`Are you sure you want to delete product "${name}"?`)) return;

    setActioningId(productId);
    try {
      const { error } = await supabase.from("products").delete().eq("id", productId);
      if (error) throw error;

      setProducts(products.filter(p => p.id !== productId));
      if (selectedProduct?.id === productId) setSelectedProduct(null);
    } catch (err: any) {
      alert(err.message || "Failed to delete product.");
    }
    setActioningId(null);
  };

  const filteredProducts = products.filter(p => {
    let matchesTab = true;
    if (filterTab === "premium") {
      matchesTab = p.is_premium === true || p.tier === "PREMIUM" || (p.specifications as any)?.is_premium === "true";
    } else if (filterTab === "new_drops") {
      matchesTab = p.is_new_drop === true || p.status === "COMING_SOON" || (p.specifications as any)?.is_new_drop === "true";
    } else if (filterTab === "approved") {
      matchesTab = p.is_active !== false && (p.approval_status === "approved" || p.is_approved === true || !p.approval_status);
    } else if (filterTab === "hidden") {
      matchesTab = p.is_active === false;
    }

    const matchesSearch = 
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.collection?.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Product Moderation</span>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase">Product Catalog & Tier Moderation</h1>
          <p className="text-xs font-bold text-zinc-400 mt-0.5">
            Manage approved marketplace products, assign to Premium Store or New Drops, configure curated collections, and moderate listings.
          </p>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-950 p-4 rounded-3xl border border-zinc-800 shadow-xl">
        <div className="flex gap-2 overflow-x-auto w-full sm:w-auto no-scrollbar">
          {[
            { id: "all", label: `All (${products.length})` },
            { id: "premium", label: `💎 Premium Store (${products.filter(p => p.is_premium || p.tier === 'PREMIUM').length})` },
            { id: "new_drops", label: `⚡ New Drops (${products.filter(p => p.is_new_drop).length})` },
            { id: "approved", label: "Approved" },
            { id: "hidden", label: "Hidden" }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilterTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                filterTab === tab.id
                  ? "bg-white text-black shadow-md shadow-white/10"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search products, brand, collection..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-xs font-bold text-white outline-none focus:border-white"
          />
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="p-12 text-center text-zinc-500 font-bold text-xs">Loading products...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-12 text-center text-zinc-500 font-bold text-xs">No products found for selected criteria.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map(prod => {
            const isPremium = prod.is_premium === true || prod.tier === "PREMIUM" || (prod.specifications as any)?.is_premium === "true";
            const isNewDrop = prod.is_new_drop === true || prod.status === "COMING_SOON" || (prod.specifications as any)?.is_new_drop === "true";

            return (
              <div key={prod.id} className="bg-zinc-950 rounded-3xl p-5 border border-zinc-800 shadow-xl flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex gap-4">
                    <div className="h-20 w-20 rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden relative shrink-0">
                      {prod.image_url ? (
                        <img src={prod.image_url} alt={prod.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-500">
                          <ImageIcon className="w-8 h-8" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">{prod.brand || "ZEBALPHA"}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          prod.is_active === false ? "bg-zinc-900 text-rose-400 border border-rose-900/40" : "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
                        }`}>
                          {prod.is_active === false ? "Hidden" : "Active"}
                        </span>
                      </div>
                      <h3 className="font-black text-white truncate text-sm mt-0.5">{prod.name}</h3>
                      <p className="text-xs font-bold text-zinc-300 mt-1">₹{prod.price} {prod.mrp ? <span className="line-through text-zinc-500 text-[10px]">₹{prod.mrp}</span> : null}</p>
                      <p className="text-[11px] text-zinc-400 font-semibold">Stock: {prod.stock ?? "N/A"}</p>
                    </div>
                  </div>

                  {/* Tier Badges & Quick Toggles */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-900">
                    <button
                      onClick={() => handleUpdateProductStatus(prod.id, { 
                        is_premium: !isPremium, 
                        tier: !isPremium ? "PREMIUM" : "STANDARD" 
                      })}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border transition-all cursor-pointer ${
                        isPremium
                          ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-500/10"
                          : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300"
                      }`}
                      title="Toggle Premium Store placement"
                    >
                      <Crown size={11} className={isPremium ? "text-amber-400" : "text-zinc-500"} />
                      <span>{isPremium ? "💎 Premium" : "+ Set Premium"}</span>
                    </button>

                    <button
                      onClick={() => handleUpdateProductStatus(prod.id, { 
                        is_new_drop: !isNewDrop,
                        status: !isNewDrop ? "COMING_SOON" : (prod.stock > 0 ? "IN_STOCK" : "OUT_OF_STOCK")
                      })}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border transition-all cursor-pointer ${
                        isNewDrop
                          ? "bg-orange-500/20 text-orange-300 border-orange-500/50 shadow-sm shadow-orange-500/10"
                          : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:text-zinc-300"
                      }`}
                      title="Toggle New Drop placement"
                    >
                      <Flame size={11} className={isNewDrop ? "text-orange-400" : "text-zinc-500"} />
                      <span>{isNewDrop ? "⚡ New Drop" : "+ Set Drop"}</span>
                    </button>
                  </div>

                  {/* Collection Tag / Inline Edit */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-zinc-500 text-[10px] uppercase font-black">Collection:</span>
                    {editingCollectionId === prod.id ? (
                      <div className="flex items-center gap-1 flex-1">
                        <input
                          type="text"
                          value={collectionInput}
                          onChange={(e) => setCollectionInput(e.target.value)}
                          placeholder="Collection Name..."
                          className="flex-1 bg-zinc-900 border border-zinc-700 px-2 py-1 rounded text-xs text-white"
                        />
                        <button
                          onClick={() => handleSaveCollection(prod.id)}
                          className="px-2 py-1 bg-white text-black text-[10px] font-black rounded"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingCollectionId(null)}
                          className="px-1.5 py-1 text-zinc-400 hover:text-white text-[10px]"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingCollectionId(prod.id);
                          setCollectionInput(prod.collection || "");
                        }}
                        className="text-[10px] font-bold text-zinc-300 hover:text-white bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded cursor-pointer truncate max-w-[180px]"
                      >
                        {prod.collection ? `🏷️ ${prod.collection}` : "+ Assign Collection"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-zinc-800/80 pt-3">
                  <span className="text-[10px] text-zinc-500 font-semibold">ID: {prod.id}</span>

                  <div className="flex items-center gap-1.5">
                    {/* Approve / Reject */}
                    {prod.approval_status === "pending" && (
                      <button
                        onClick={() => handleUpdateProductStatus(prod.id, { approval_status: "approved", is_approved: true, is_active: true })}
                        className="p-2 rounded-xl bg-white text-black hover:bg-zinc-200 transition-colors shadow-sm cursor-pointer"
                        title="Approve Product"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}

                    {/* Hide / Show Toggle */}
                    <button
                      onClick={() => handleUpdateProductStatus(prod.id, { is_active: !prod.is_active })}
                      className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
                      title={prod.is_active ? "Hide Product" : "Show Product"}
                    >
                      {prod.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-white" />}
                    </button>

                    <button
                      onClick={() => handleDeleteProduct(prod.id, prod.name)}
                      className="p-2 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-400 hover:bg-rose-900/80 transition-colors cursor-pointer"
                      title="Delete Product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
