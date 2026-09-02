"use client";

import { useState, useEffect } from "react";
import { supabaseA as supabase } from "@shared/utils/supabaseClient";
import { AlertTriangle, AlertCircle, Package, Search, ArrowUpRight } from "lucide-react";

export default function InventoryMonitoringView() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<"all" | "low_stock" | "out_of_stock">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadInventory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("stock", { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (e: any) {
      console.error("Error loading inventory:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const lowStockCount = products.filter(p => (p.stock || 0) > 0 && (p.stock || 0) <= (p.low_stock_limit || 10)).length;
  const outOfStockCount = products.filter(p => (p.stock || 0) === 0).length;

  const filteredProducts = products.filter(p => {
    const stock = p.stock || 0;
    const limit = p.low_stock_limit || 10;

    let matchesFilter = true;
    if (filterType === "low_stock") matchesFilter = stock > 0 && stock <= limit;
    else if (filterType === "out_of_stock") matchesFilter = stock === 0;

    const matchesSearch = p.name?.toLowerCase().includes(searchQuery.toLowerCase()) || p.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600">Inventory Control</span>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Seller Inventory & Low Stock Alerts</h1>
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor real-time product stock levels across seller inventories, prevent stockouts, and manage reorders.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Products</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{products.length}</p>
          </div>
          <Package className="w-8 h-8 text-emerald-600 opacity-80" />
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-500">Low Stock Items</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{lowStockCount}</p>
          </div>
          <AlertTriangle className="w-8 h-8 text-amber-500 opacity-80" />
        </div>
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-rose-500">Out of Stock</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{outOfStockCount}</p>
          </div>
          <AlertCircle className="w-8 h-8 text-rose-500 opacity-80" />
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto">
          <button
            onClick={() => setFilterType("all")}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider shrink-0 transition-all ${
              filterType === "all" ? "bg-emerald-600 text-white shadow-md" : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}
          >
            All Inventory ({products.length})
          </button>
          <button
            onClick={() => setFilterType("low_stock")}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider shrink-0 transition-all ${
              filterType === "low_stock" ? "bg-amber-600 text-white shadow-md" : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}
          >
            Low Stock ({lowStockCount})
          </button>
          <button
            onClick={() => setFilterType("out_of_stock")}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider shrink-0 transition-all ${
              filterType === "out_of_stock" ? "bg-rose-600 text-white shadow-md" : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
            }`}
          >
            Out of Stock ({outOfStockCount})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by product name or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 text-xs font-bold outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 font-bold text-xs">Loading inventory data...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-slate-400 font-bold text-xs">No inventory items match filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <th className="p-4 pl-6">Product Details</th>
                  <th className="p-4">SKU</th>
                  <th className="p-4">Current Stock</th>
                  <th className="p-4">Low Limit</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                {filteredProducts.map(p => {
                  const stock = p.stock || 0;
                  const limit = p.low_stock_limit || 10;
                  const isOut = stock === 0;
                  const isLow = stock > 0 && stock <= limit;

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-4 pl-6">
                        <p className="font-black text-slate-900 dark:text-white">{p.name}</p>
                        <p className="text-[11px] text-slate-400">{p.brand || "Asali Swad"}</p>
                      </td>
                      <td className="p-4 font-mono text-slate-500">{p.sku || "—"}</td>
                      <td className="p-4 font-black text-sm">{stock} units</td>
                      <td className="p-4 text-slate-400">{limit} units</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          isOut 
                            ? "bg-rose-50 text-rose-700 dark:bg-rose-950/50 border border-rose-200" 
                            : isLow
                            ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 border border-amber-200"
                            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 border border-emerald-200"
                        }`}>
                          {isOut ? "Out of Stock" : isLow ? "Low Stock Alert" : "In Stock"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
