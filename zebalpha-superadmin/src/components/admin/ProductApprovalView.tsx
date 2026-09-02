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
  AlertCircle
} from "lucide-react";

export default function ProductApprovalView() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [filterTab, setFilterTab] = useState<"approved" | "hidden" | "all">("approved");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [actioningId, setActioningId] = useState<string | number | null>(null);

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
    if (filterTab === "approved") matchesTab = p.is_active !== false && (p.approval_status === "approved" || p.is_approved === true || !p.approval_status);
    else if (filterTab === "hidden") matchesTab = p.is_active === false;

    const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || p.brand?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Product Moderation</span>
          <h1 className="text-2xl font-black tracking-tight text-white">Product Catalog & Moderation</h1>
          <p className="text-xs font-bold text-zinc-400 mt-0.5">
            Manage approved marketplace products, review listing details, hide non-compliant products, or delete items.
          </p>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-zinc-950 p-4 rounded-3xl border border-zinc-800 shadow-xl">
        <div className="flex gap-2 overflow-x-auto w-full sm:w-auto no-scrollbar">
          {(["approved", "hidden", "all"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilterTab(tab)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider shrink-0 transition-all ${
                filterTab === tab
                  ? "bg-white text-black shadow-md shadow-white/10"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search products, brand..."
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
          {filteredProducts.map(prod => (
            <div key={prod.id} className="bg-zinc-950 rounded-3xl p-5 border border-zinc-800 shadow-xl flex flex-col justify-between space-y-4">
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
                  <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">{prod.brand || "Asali Swad"}</span>
                  <h3 className="font-black text-white truncate">{prod.name}</h3>
                  <p className="text-xs font-bold text-zinc-300 mt-1">₹{prod.price} {prod.mrp ? <span className="line-through text-zinc-500 text-[10px]">₹{prod.mrp}</span> : null}</p>
                  <p className="text-[11px] text-zinc-400 font-semibold mt-0.5">Stock: {prod.stock ?? "N/A"}</p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-zinc-800/80 pt-3">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  prod.is_active === false ? "bg-zinc-900 text-rose-400 border border-rose-900/40" : "bg-white/10 text-white border border-white/20"
                }`}>
                  {prod.is_active === false ? "Hidden" : "Active"}
                </span>

                <div className="flex items-center gap-1.5">
                  {/* Approve / Reject */}
                  {prod.approval_status === "pending" && (
                    <button
                      onClick={() => handleUpdateProductStatus(prod.id, { approval_status: "approved", is_approved: true, is_active: true })}
                      className="p-2 rounded-xl bg-white text-black hover:bg-zinc-200 transition-colors shadow-sm"
                      title="Approve Product"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}

                  {/* Hide / Show Toggle */}
                  <button
                    onClick={() => handleUpdateProductStatus(prod.id, { is_active: !prod.is_active })}
                    className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                    title={prod.is_active ? "Hide Product" : "Show Product"}
                  >
                    {prod.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-white" />}
                  </button>

                  <button
                    onClick={() => handleDeleteProduct(prod.id, prod.name)}
                    className="p-2 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-400 hover:bg-rose-900/80 transition-colors"
                    title="Delete Product"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
