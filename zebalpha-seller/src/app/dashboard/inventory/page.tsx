"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import type { Product } from "@shared/types";
import {
  Package,
  RefreshCw,
  AlertTriangle,
  Check,
  TrendingDown,
  TrendingUp,
  History,
  Zap,
  Plus,
  Search,
  PauseCircle,
  PlayCircle,
} from "lucide-react";

type InventoryStream = "ZEBALPHA" | "ZEBQUICK";
type ZebQuickFilter = "ALL" | "LOW" | "OUT" | "PAUSED";

interface ZebQuickInventoryItem {
  id: string;
  source_product_id: string | null;
  title: string;
  image_url: string;
  category_group: string;
  subcategory_slug: string;
  zeb_quick_stock: number;
  low_stock_limit: number;
  zeb_quick_price: number;
  mrp: number | null;
  pickup_pincode: string;
  is_active: boolean;
  is_zebquick_only: boolean;
  updated_at: string;
}

export default function SellerInventory() {
  const [activeStream, setActiveStream] = useState<InventoryStream>("ZEBALPHA");

  // ZebAlpha inventory state
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [stockChanges, setStockChanges] = useState<Record<string | number, number>>({});
  const [limits, setLimits] = useState<Record<string | number, number>>({});
  const [updatingId, setUpdatingId] = useState<string | number | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);

  // ZebQuick isolated inventory state
  const [zqLoading, setZqLoading] = useState(true);
  const [zqProducts, setZqProducts] = useState<ZebQuickInventoryItem[]>([]);
  const [zqHistory, setZqHistory] = useState<any[]>([]);
  const [zqSummary, setZqSummary] = useState({
    totalProducts: 0,
    totalUnits: 0,
    inStockCount: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    pausedCount: 0,
  });
  const [zqStockInputs, setZqStockInputs] = useState<Record<string, number>>({});
  const [zqLimitInputs, setZqLimitInputs] = useState<Record<string, number>>({});
  const [zqPriceInputs, setZqPriceInputs] = useState<Record<string, number>>({});
  const [zqBusyId, setZqBusyId] = useState<string | null>(null);
  const [zqBulkBusy, setZqBulkBusy] = useState(false);
  const [zqFilter, setZqFilter] = useState<ZebQuickFilter>("ALL");
  const [zqSearch, setZqSearch] = useState("");

  // Detect optional ?tab=zebquick query parameter on client mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab")?.toLowerCase() === "zebquick") {
      setActiveStream("ZEBQUICK");
    }
  }, []);

  const getAuthHeaders = async () => {
    const headers: Record<string, string> = {};
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
    } catch { }
    return headers;
  };

  const loadZebQuickInventory = useCallback(async () => {
    setZqLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/zeb-quick/inventory?_t=${Date.now()}`, {
        headers,
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = await res.json();
      const list: ZebQuickInventoryItem[] = Array.isArray(json.products) ? json.products : [];
      setZqProducts(list);
      setZqHistory(Array.isArray(json.history) ? json.history : []);
      if (json.summary) setZqSummary(json.summary);

      const stocks: Record<string, number> = {};
      const lims: Record<string, number> = {};
      const prices: Record<string, number> = {};
      list.forEach((p) => {
        stocks[p.id] = p.zeb_quick_stock;
        lims[p.id] = p.low_stock_limit;
        prices[p.id] = p.zeb_quick_price;
      });
      setZqStockInputs(stocks);
      setZqLimitInputs(lims);
      setZqPriceInputs(prices);
    } catch (e) {
      console.error("Failed to load ZebQuick inventory:", e);
    } finally {
      setZqLoading(false);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: seller } = await supabase
        .from("sellers")
        .select("id, user_id, account_status, status")
        .or(`user_id.eq.${user.id},id.eq.${user.id},email.eq.${user.email?.toLowerCase().trim()}`)
        .maybeSingle();

      const sellerIdsToQuery = [user.id];
      if (seller?.id) {
        sellerIdsToQuery.push(seller.id);
        const accStatus = seller.account_status || seller.status || "Active";
        setIsSuspended(accStatus.toLowerCase() === "suspended");
      }

      const { data: productsData } = await supabase
        .from("products")
        .select("*")
        .in("seller_id", sellerIdsToQuery)
        .order("name", { ascending: true });

      const sProducts = (productsData || []) as Product[];
      setProducts(sProducts);

      const initialStock: Record<string | number, number> = {};
      const initialLimits: Record<string | number, number> = {};
      sProducts.forEach((p) => {
        initialStock[p.id] = p.stock || 0;
        initialLimits[p.id] = p.low_stock_limit || 5;
      });
      setStockChanges(initialStock);
      setLimits(initialLimits);

      const pIds = sProducts.map((p) => p.id);
      if (pIds.length > 0) {
        const { data: historyData } = await supabase
          .from("stock_history")
          .select("*, products(name)")
          .in("product_id", pIds)
          .order("created_at", { ascending: false })
          .limit(15);
        setHistory(historyData || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
    void loadZebQuickInventory();
  }, [loadData, loadZebQuickInventory]);

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    window.setTimeout(() => setStatusMessage(""), 3000);
  };

  // --- ZebAlpha Stock Save ---
  const handleSaveStock = async (product: Product) => {
    if (isSuspended) {
      alert("🚫 Account Suspended: You cannot update product inventory while your account is suspended.");
      return;
    }
    const newStock = stockChanges[product.id];
    const newLimit = limits[product.id];

    if (newStock === undefined || newLimit === undefined) return;
    if (newStock < 0 || newLimit < 1) {
      alert("Stock must be 0 or more. Low stock limit must be 1 or more.");
      return;
    }

    setUpdatingId(product.id);
    setStatusMessage("");

    const currentStock = product.stock || 0;
    const changeAmount = newStock - currentStock;

    try {
      const { error: prodError } = await supabase
        .from("products")
        .update({
          stock: newStock,
          low_stock_limit: newLimit,
          status: newStock > 0 ? "IN_STOCK" : "OUT_OF_STOCK",
        })
        .eq("id", product.id);

      if (prodError) throw prodError;

      if (changeAmount !== 0) {
        const { error: histError } = await supabase.from("stock_history").insert({
          product_id: product.id,
          change_amount: changeAmount,
          reason: `Seller Portal Manual Update (New Stock: ${newStock})`,
        });
        if (histError) console.error("Stock history insert error:", histError);
      }

      const updatedProdObj = {
        ...product,
        stock: newStock,
        low_stock_limit: newLimit,
        status: newStock > 0 ? "IN_STOCK" : "OUT_OF_STOCK",
      };

      showToast(`✅ Updated stock for ${product.name}`);
      setProducts(products.map((p) => (p.id === product.id ? updatedProdObj : p)));
      void loadData();
    } catch (e: any) {
      console.error(e);
      alert(e.message || "Failed to update stock.");
    } finally {
      setUpdatingId(null);
    }
  };

  // --- ZebQuick Stock Handlers ---
  const handleSaveZebQuick = async (item: ZebQuickInventoryItem) => {
    if (isSuspended) {
      alert("🚫 Account Suspended: You cannot update ZebQuick inventory while suspended.");
      return;
    }
    const newStock = zqStockInputs[item.id] ?? item.zeb_quick_stock;
    const newLimit = zqLimitInputs[item.id] ?? item.low_stock_limit;
    const newPrice = zqPriceInputs[item.id] ?? item.zeb_quick_price;

    if (newStock < 0 || newLimit < 1 || newPrice <= 0) {
      alert("Stock must be ≥ 0, Low Limit ≥ 1, and Express Price > ₹0.");
      return;
    }

    setZqBusyId(item.id);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/zeb-quick/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          action: "update_stock",
          productId: item.id,
          zeb_quick_stock: newStock,
          low_stock_limit: newLimit,
          zeb_quick_price: newPrice,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.error || "Failed to update ZebQuick inventory.");
        return;
      }
      showToast(`⚡ Saved ZebQuick stock (${newStock} units) for ${item.title}`);
      await loadZebQuickInventory();
    } finally {
      setZqBusyId(null);
    }
  };

  const handleQuickRestock = async (item: ZebQuickInventoryItem, delta: number) => {
    if (isSuspended) {
      alert("🚫 Account Suspended: You cannot restock while suspended.");
      return;
    }
    setZqBusyId(item.id);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/zeb-quick/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          action: "quick_restock",
          productId: item.id,
          delta,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.error || "Quick restock failed.");
        return;
      }
      showToast(`⚡ Restocked +${delta} units for ${item.title} (Now: ${json.newStock})`);
      await loadZebQuickInventory();
    } finally {
      setZqBusyId(null);
    }
  };

  const handleToggleZebQuickActive = async (item: ZebQuickInventoryItem) => {
    setZqBusyId(item.id);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/zeb-quick/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          action: "toggle_active",
          productId: item.id,
          is_active: !item.is_active,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.error || "Could not update status.");
        return;
      }
      showToast(
        !item.is_active
          ? `✅ ${item.title} is now LIVE on ZebQuick`
          : `⏸️ ${item.title} paused on ZebQuick`
      );
      await loadZebQuickInventory();
    } finally {
      setZqBusyId(null);
    }
  };

  const handleBulkRestockLow = async (delta = 10) => {
    if (isSuspended) return;
    setZqBulkBusy(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/zeb-quick/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ action: "bulk_restock_low", delta }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(`⚡ Restocked ${json.restockedCount} low-stock ZebQuick item(s) by +${delta} units each!`);
        await loadZebQuickInventory();
      } else {
        alert(json.error || "Bulk restock failed.");
      }
    } finally {
      setZqBulkBusy(false);
    }
  };

  const zqAlertCount = zqSummary.lowStockCount + zqSummary.outOfStockCount;

  const filteredZqProducts = zqProducts.filter((item) => {
    if (zqFilter === "OUT" && item.zeb_quick_stock > 0) return false;
    if (zqFilter === "LOW" && !(item.zeb_quick_stock > 0 && item.zeb_quick_stock <= item.low_stock_limit)) {
      return false;
    }
    if (zqFilter === "PAUSED" && item.is_active) return false;
    if (zqSearch.trim()) {
      const q = zqSearch.trim().toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.category_group.toLowerCase().includes(q) ||
        item.subcategory_slug.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Stock Inventory</h1>
          <p className="text-sm font-bold text-text-secondary mt-1">
            {activeStream === "ZEBQUICK"
              ? "Manage ZebQuick stock, instant restock, low-level alerts & pricing."
              : "Manage stock availability and low-level alerts."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-2 rounded-2xl border border-foreground/[0.08] px-5 py-3.5 text-sm font-black text-text-secondary hover:bg-foreground/[0.02] cursor-pointer"
        >
          <History size={16} />{" "}
          {showHistory
            ? "Show Inventory"
            : activeStream === "ZEBQUICK"
              ? "View ZebQuick Stock Logs"
              : "View Stock Logs"}
        </button>
      </div>

      {/* Stream Switcher Tabs: ZebAlpha vs ZebQuick */}
      <div className="flex flex-wrap items-center gap-2.5 border-b border-foreground/[0.08] pb-3.5">
        <button
          type="button"
          onClick={() => {
            setActiveStream("ZEBALPHA");
            setShowHistory(false);
          }}
          style={activeStream === "ZEBALPHA" ? { color: "#FFFFFF" } : undefined}
          className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition cursor-pointer ${activeStream === "ZEBALPHA"
            ? "bg-[#EE2B00] text-white shadow-sm"
            : "border border-foreground/[0.1] bg-foreground/[0.02] text-text-secondary hover:bg-foreground/[0.05]"
            }`}
        >
          <Package size={15} />
          ZebAlpha Inventory ({products.length})
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveStream("ZEBQUICK");
            setShowHistory(false);
          }}
          style={activeStream === "ZEBQUICK" ? { color: "#FFFFFF" } : undefined}
          className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition cursor-pointer ${activeStream === "ZEBQUICK"
            ? "bg-amber-600 text-white shadow-sm"
            : "border border-amber-500/35 bg-amber-500/10 text-amber-800 hover:bg-amber-500/20"
            }`}
        >
          <Zap size={15} className="fill-current" />
          ZebQuick Inventory ({zqProducts.length})
          {zqAlertCount > 0 && (
            <span
              style={{ color: "#FFFFFF" }}
              className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-black text-white"
            >
              {zqAlertCount} Low
            </span>
          )}
        </button>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-xs font-black shadow-sm">
          {statusMessage}
        </div>
      )}

      {/* ===================== ZEBQUICK INVENTORY TAB ===================== */}
      {activeStream === "ZEBQUICK" ? (
        zqLoading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-amber-600"></div>
            <span className="ml-3 text-sm font-bold text-text-muted">Loading ZebQuick inventory...</span>
          </div>
        ) : showHistory ? (
          /* ZebQuick Stock Logs View */
          <div className="space-y-4">
            <h3 className="text-lg font-black flex items-center gap-2">
              <Zap size={18} className="text-amber-600 fill-amber-500" />
              Recent ZebQuick Stock Actions
            </h3>
            {zqHistory.length === 0 ? (
              <div className="rounded-3xl border border-foreground/[0.06] p-12 text-center text-text-muted text-sm font-bold">
                No ZebQuick stock changes logged yet. Restock or update any item to start tracking.
              </div>
            ) : (
              <div className="rounded-3xl border border-foreground/[0.06] bg-foreground/[0.01] overflow-hidden">
                <div className="divide-y divide-foreground/[0.05]">
                  {zqHistory.map((log) => {
                    const isUp = Number(log.change_amount) > 0;
                    return (
                      <div key={log.id} className="flex items-center justify-between gap-4 p-4">
                        <div className="space-y-1 min-w-0">
                          <p className="font-black text-sm truncate">{log.product_title}</p>
                          <p className="text-xs text-text-muted font-bold">
                            {log.reason} • Stock: {log.previous_stock} → {log.new_stock}
                          </p>
                          <p className="text-[10px] text-text-disabled font-bold">
                            {new Date(log.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div
                          className={`flex items-center gap-1.5 font-black text-sm shrink-0 ${isUp ? "text-emerald-600" : "text-rose-600"
                            }`}
                        >
                          {isUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                          {isUp ? "+" : ""}
                          {log.change_amount}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {/* KPI Summary Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
              <button
                type="button"
                onClick={() => setZqFilter("ALL")}
                className={`rounded-2xl border p-4 text-left transition cursor-pointer ${zqFilter === "ALL"
                  ? "border-amber-500 bg-amber-50/70"
                  : "border-foreground/[0.08] bg-foreground/[0.01] hover:border-amber-400/60"
                  }`}
              >
                <span className="text-[10px] font-black uppercase tracking-wider text-text-secondary">
                  ZebQuick SKUs
                </span>
                <p className="mt-1 text-2xl font-black text-foreground">{zqSummary.totalProducts}</p>
                <span className="text-[11px] font-bold text-text-muted">Isolated 5–6 Hr catalog</span>
              </button>

              <div className="rounded-2xl border border-foreground/[0.08] bg-foreground/[0.01] p-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-text-secondary">
                  Total Express Units
                </span>
                <p className="mt-1 text-2xl font-black text-emerald-700">{zqSummary.totalUnits}</p>
                <span className="text-[11px] font-bold text-text-muted">Ready for instant dispatch</span>
              </div>

              <button
                type="button"
                onClick={() => setZqFilter("LOW")}
                className={`rounded-2xl border p-4 text-left transition cursor-pointer ${zqFilter === "LOW"
                  ? "border-amber-600 bg-amber-50"
                  : "border-amber-500/25 bg-amber-500/[0.04] hover:border-amber-500"
                  }`}
              >
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">
                  Low Stock Alerts
                </span>
                <p className="mt-1 text-2xl font-black text-amber-700">{zqSummary.lowStockCount}</p>
                <span className="text-[11px] font-bold text-amber-800/70">At or below low limit</span>
              </button>

              <button
                type="button"
                onClick={() => setZqFilter("OUT")}
                className={`rounded-2xl border p-4 text-left transition cursor-pointer ${zqFilter === "OUT"
                  ? "border-rose-600 bg-rose-50"
                  : "border-rose-500/25 bg-rose-500/[0.04] hover:border-rose-500"
                  }`}
              >
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-700">
                  Out of Stock
                </span>
                <p className="mt-1 text-2xl font-black text-rose-700">{zqSummary.outOfStockCount}</p>
                <span className="text-[11px] font-bold text-rose-800/70">Hidden from buyers until restocked</span>
              </button>
            </div>

            {/* Filter + Search + Bulk Restock Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    { key: "ALL", label: `All (${zqProducts.length})` },
                    { key: "LOW", label: `Low Stock (${zqSummary.lowStockCount})` },
                    { key: "OUT", label: `Out of Stock (${zqSummary.outOfStockCount})` },
                    { key: "PAUSED", label: `Paused (${zqSummary.pausedCount})` },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setZqFilter(tab.key)}
                    style={zqFilter === tab.key ? { color: "#FFFFFF" } : undefined}
                    className={`rounded-xl px-3.5 py-2 text-xs font-extrabold transition cursor-pointer ${zqFilter === tab.key
                      ? "bg-[#EE2B00] text-white shadow-xs"
                      : "border border-foreground/[0.1] bg-foreground/[0.02] text-text-secondary hover:bg-foreground/[0.05]"
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="flex items-center gap-2 rounded-xl border border-foreground/[0.1] bg-foreground/[0.01] px-3 py-2">
                  <Search size={14} className="text-text-muted" />
                  <input
                    type="text"
                    value={zqSearch}
                    onChange={(e) => setZqSearch(e.target.value)}
                    placeholder="Search ZebQuick SKU..."
                    className="bg-transparent text-xs font-bold outline-none w-44"
                  />
                </div>

                {zqAlertCount > 0 && (
                  <button
                    type="button"
                    disabled={zqBulkBusy}
                    onClick={() => void handleBulkRestockLow(10)}
                    style={{ color: "#FFFFFF" }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 text-xs font-black text-white shadow-xs disabled:opacity-50 transition cursor-pointer"
                  >
                    {zqBulkBusy ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={14} />}
                    Restock All Low (+10)
                  </button>
                )}
              </div>
            </div>

            {/* ZebQuick Product Cards Grid */}
            {filteredZqProducts.length === 0 ? (
              <div className="rounded-3xl border-2 border-dashed border-foreground/[0.08] p-12 text-center text-text-muted">
                <Zap size={44} className="mx-auto mb-3 opacity-40 text-amber-500" />
                <h3 className="text-lg font-black text-foreground">
                  {zqProducts.length === 0
                    ? "No ZebQuick Products Yet"
                    : "No Matching ZebQuick Products"}
                </h3>
                <p className="text-xs font-bold mt-1">
                  {zqProducts.length === 0
                    ? "Activate eligible products or add ZebQuick-Only items in the Products tab to manage express stock here."
                    : "Try clearing the filter or search query."}
                </p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredZqProducts.map((item) => {
                  const isOut = item.zeb_quick_stock <= 0;
                  const isLow = !isOut && item.zeb_quick_stock <= item.low_stock_limit;
                  const isBusy = zqBusyId === item.id;

                  return (
                    <div
                      key={item.id}
                      className={`rounded-3xl border p-6 flex flex-col justify-between bg-foreground/[0.01] transition-all duration-300 ${isOut
                        ? "border-rose-500/40 bg-rose-500/[0.02] shadow-md"
                        : isLow
                          ? "border-amber-500/40 bg-amber-500/[0.02] shadow-md"
                          : "border-foreground/[0.08] hover:shadow-md"
                        }`}
                    >
                      <div>
                        {/* Card Top: Thumbnail + Title + Status Badge */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={item.image_url || "/official-logo-sm.png"}
                              alt={item.title}
                              className="h-11 w-11 rounded-xl object-cover border border-foreground/[0.08] shrink-0"
                            />
                            <div className="min-w-0">
                              <h3 className="font-black text-sm text-foreground truncate">{item.title}</h3>
                              <p className="text-[10px] font-bold text-text-muted mt-0.5 truncate">
                                {item.category_group} • {item.is_zebquick_only ? "ZebQuick-Only" : "Synced"}
                              </p>
                            </div>
                          </div>

                          {isOut ? (
                            <span className="shrink-0 inline-flex items-center gap-1 rounded-md bg-rose-500/15 px-2 py-0.5 text-[9.5px] font-black uppercase text-rose-700">
                              <AlertTriangle size={10} /> Out of Stock
                            </span>
                          ) : !item.is_active ? (
                            <span className="shrink-0 rounded-md bg-neutral-200 px-2 py-0.5 text-[9.5px] font-black uppercase text-neutral-700">
                              Paused
                            </span>
                          ) : isLow ? (
                            <span className="shrink-0 inline-flex items-center gap-1 rounded-md bg-amber-500/15 px-2 py-0.5 text-[9.5px] font-black uppercase text-amber-700 animate-pulse">
                              <AlertTriangle size={10} /> Low Stock
                            </span>
                          ) : (
                            <span className="shrink-0 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[9.5px] font-black uppercase text-emerald-700">
                              Live
                            </span>
                          )}
                        </div>

                        {/* Quick 1-Click Restock Chips */}
                        <div className="mt-4 flex items-center justify-between gap-2 rounded-2xl bg-amber-500/[0.07] border border-amber-500/20 px-3 py-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-900">
                            Quick Restock
                          </span>
                          <div className="flex items-center gap-1.5">
                            {[5, 10, 25].map((delta) => (
                              <button
                                key={delta}
                                type="button"
                                disabled={isBusy}
                                onClick={() => void handleQuickRestock(item, delta)}
                                className="rounded-lg border border-emerald-600/30 bg-white px-2.5 py-1 text-[11px] font-black text-emerald-700 hover:bg-emerald-600 hover:text-white disabled:opacity-50 transition cursor-pointer"
                              >
                                +{delta}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Inputs: Current Stock, Low Limit, Express Price */}
                        <div className="grid grid-cols-3 gap-2.5 my-4">
                          <div>
                            <span className="text-[10px] font-black uppercase text-text-secondary block mb-1">
                              Current Stock
                            </span>
                            <input
                              type="number"
                              min="0"
                              value={zqStockInputs[item.id] ?? 0}
                              onChange={(e) =>
                                setZqStockInputs({ ...zqStockInputs, [item.id]: Number(e.target.value) })
                              }
                              className="w-full rounded-xl border border-foreground/[0.12] bg-foreground/[0.01] px-2.5 py-2 text-sm font-black outline-none focus:border-amber-600"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase text-text-secondary block mb-1">
                              Low Limit
                            </span>
                            <input
                              type="number"
                              min="1"
                              value={zqLimitInputs[item.id] ?? 5}
                              onChange={(e) =>
                                setZqLimitInputs({ ...zqLimitInputs, [item.id]: Number(e.target.value) })
                              }
                              className="w-full rounded-xl border border-foreground/[0.12] bg-foreground/[0.01] px-2.5 py-2 text-sm font-black outline-none focus:border-amber-600"
                            />
                          </div>
                          <div>
                            <span className="text-[10px] font-black uppercase text-text-secondary block mb-1">
                              Price (₹)
                            </span>
                            <input
                              type="number"
                              min="1"
                              value={zqPriceInputs[item.id] ?? 0}
                              onChange={(e) =>
                                setZqPriceInputs({ ...zqPriceInputs, [item.id]: Number(e.target.value) })
                              }
                              className="w-full rounded-xl border border-foreground/[0.12] bg-foreground/[0.01] px-2.5 py-2 text-sm font-black outline-none focus:border-amber-600"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Card Footer: Pause/Resume + Save Changes */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleToggleZebQuickActive(item)}
                          title={item.is_active ? "Pause on ZebQuick" : "Resume on ZebQuick"}
                          className={`flex h-11 items-center justify-center gap-1 rounded-2xl border px-3 text-[11px] font-black transition cursor-pointer disabled:opacity-50 shrink-0 ${item.is_active
                            ? "border-amber-500/35 bg-amber-50 text-amber-800 hover:bg-amber-100"
                            : "border-emerald-500/40 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            }`}
                        >
                          {item.is_active ? <PauseCircle size={15} /> : <PlayCircle size={15} />}
                          {item.is_active ? "Pause" : "Go Live"}
                        </button>

                        <button
                          type="button"
                          onClick={() => void handleSaveZebQuick(item)}
                          disabled={isBusy}
                          style={{ color: "#FFFFFF" }}
                          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-[#FF4D4F] hover:bg-[#EE2B00] text-xs font-black uppercase tracking-wider active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-md"
                        >
                          {isBusy ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                          Save Changes
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )
      ) : loading ? (
        /* ===================== ZEBALPHA INVENTORY TAB (EXISTING) ===================== */
        <div className="flex h-64 items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary"></div>
          <span className="ml-3 text-sm font-bold text-text-muted">Loading inventory...</span>
        </div>
      ) : showHistory ? (
        <div className="space-y-4">
          <h3 className="text-lg font-black flex items-center gap-2">
            <History size={18} className="text-primary" /> Recent Stock Actions
          </h3>
          {history.length === 0 ? (
            <div className="rounded-3xl border border-foreground/[0.06] p-12 text-center text-text-muted">
              No stock history logged yet.
            </div>
          ) : (
            <div className="rounded-3xl border border-foreground/[0.06] bg-foreground/[0.01] overflow-hidden">
              <div className="divide-y divide-foreground/[0.04]">
                {history.map((log) => {
                  const isUp = log.change_amount > 0;
                  return (
                    <div key={log.id} className="flex items-center justify-between p-4 bg-foreground/[0.005]">
                      <div className="space-y-1">
                        <p className="font-black text-sm">{log.products?.name || "Product"}</p>
                        <p className="text-xs text-text-muted font-bold">{log.reason}</p>
                        <p className="text-[10px] text-text-disabled font-bold">
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div
                        className={`flex items-center gap-1.5 font-black text-sm ${isUp ? "text-emerald-600" : "text-rose-600"
                          }`}
                      >
                        {isUp ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        {isUp ? "+" : ""}
                        {log.change_amount}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-foreground/[0.08] p-12 text-center text-text-muted">
          <Package size={48} className="mx-auto mb-4 opacity-40" />
          <h3 className="text-lg font-black text-foreground">No Products Found</h3>
          <p className="text-xs font-bold mt-1">
            Please add products in the Products page first to manage inventory.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const isLow = (product.stock || 0) <= (product.low_stock_limit || 5);
            return (
              <div
                key={product.id}
                className={`rounded-3xl border p-6 flex flex-col justify-between bg-foreground/[0.01] transition-all duration-300 ${isLow
                  ? "border-rose-500/20 bg-rose-500/[0.01] shadow-rose-900/5 shadow-md"
                  : "border-foreground/[0.06] hover:shadow-md"
                  }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-10 w-10 rounded-lg object-cover border border-foreground/[0.08]"
                      />
                      <div>
                        <h3 className="font-black text-sm text-foreground truncate max-w-[150px]">
                          {product.name}
                        </h3>
                        <p className="text-[10px] font-bold text-text-muted mt-0.5">
                          SKU: {product.sku || "N/A"}
                        </p>
                      </div>
                    </div>
                    {isLow && (
                      <span className="flex items-center gap-1 text-[9px] font-black uppercase text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-md animate-pulse">
                        <AlertTriangle size={10} /> Low Stock
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 my-6">
                    <div>
                      <span className="text-[10px] font-black uppercase text-text-secondary block mb-1">
                        Current Stock
                      </span>
                      <input
                        type="number"
                        min="0"
                        value={stockChanges[product.id] ?? 0}
                        onChange={(e) =>
                          setStockChanges({ ...stockChanges, [product.id]: Number(e.target.value) })
                        }
                        className="w-full rounded-xl border border-foreground/[0.1] bg-foreground/[0.01] px-3 py-2 text-sm font-black outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-text-secondary block mb-1">
                        Low Limit
                      </span>
                      <input
                        type="number"
                        min="1"
                        value={limits[product.id] ?? 5}
                        onChange={(e) =>
                          setLimits({ ...limits, [product.id]: Number(e.target.value) })
                        }
                        className="w-full rounded-xl border border-foreground/[0.1] bg-foreground/[0.01] px-3 py-2 text-sm font-black outline-none focus:border-primary"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSaveStock(product)}
                  disabled={updatingId === product.id}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white text-black hover:bg-zinc-200 text-xs font-black uppercase tracking-wider active:scale-95 disabled:opacity-50 transition-all cursor-pointer shadow-md"
                >
                  {updatingId === product.id ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Check size={14} />
                  )}
                  Save Changes
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
