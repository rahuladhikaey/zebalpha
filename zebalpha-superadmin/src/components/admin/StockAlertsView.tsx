"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  AlertTriangle,
  Bell,
  History,
  Package,
  Search,
  RefreshCw,
  ArrowUpRight,
  CheckCircle2,
  Mail,
  User,
  Clock,
  Trash2,
  Send
} from "lucide-react";

export default function StockAlertsView() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [notifyRequests, setNotifyRequests] = useState<any[]>([]);
  const [stockHistory, setStockHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"critical" | "notify" | "history">("critical");
  const [statusMessage, setStatusMessage] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Load low stock products from Supabase DB
      const { data: pData } = await supabase
        .from("products")
        .select("*")
        .order("stock", { ascending: true });

      setProducts(pData || []);

      // 2. Load real customer back-in-stock notify requests from Supabase DB
      const { data: notifyData } = await supabase
        .from("notify_requests")
        .select("*, products(id, name, price, stock)")
        .order("created_at", { ascending: false });

      setNotifyRequests(notifyData || []);

      // 3. Load real stock audit trail history from Supabase DB
      const { data: historyData } = await supabase
        .from("stock_history")
        .select("*, products(name)")
        .order("created_at", { ascending: false });

      setStockHistory(historyData || []);
    } catch (e: any) {
      console.error("Error loading stock alerts real data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Supabase Realtime channel for zero-delay notification & stock alerts
    const channel = supabase
      .channel("admin-stock-alerts-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "notify_requests" }, () => loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_history" }, () => loadData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDeleteNotifyRequest = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notify_requests")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setNotifyRequests(notifyRequests.filter(req => req.id !== id));
      setStatusMessage("🗑️ Back-in-stock notification request deleted from database.");
    } catch (err: any) {
      alert(err.message || "Failed to delete notification request.");
    }
  };

  const criticalProducts = products.filter((p) => {
    const stockVal = Number(p.stock || 0);
    const limitVal = Number(p.low_stock_limit || 5);
    return stockVal <= limitVal;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-rose-600 to-rose-800 text-white p-6 rounded-2xl shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-rose-200 text-xs font-bold uppercase tracking-widest">
            <AlertTriangle className="w-4 h-4" />
            <span>Inventory Health & Real-time Alerts</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Stock Alerts & Back-In-Stock Requests</h2>
          <p className="text-xs text-rose-100 max-w-xl">
            Monitor low stock thresholds, fulfill customer back-in-stock notifications, and trace real inventory restock logs from the database.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center bg-black/20 backdrop-blur-md p-1 rounded-xl border border-white/10 shrink-0">
          <button
            onClick={() => setActiveTab("critical")}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${activeTab === "critical" ? "bg-white text-slate-900 shadow-sm" : "text-rose-100 hover:text-white"
              }`}
          >
            Critical Stock ({criticalProducts.length})
          </button>
          <button
            onClick={() => setActiveTab("notify")}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${activeTab === "notify" ? "bg-white text-slate-900 shadow-sm" : "text-rose-100 hover:text-white"
              }`}
          >
            Notify Requests ({notifyRequests.length})
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${activeTab === "history" ? "bg-white text-slate-900 shadow-sm" : "text-rose-100 hover:text-white"
              }`}
          >
            History Log ({stockHistory.length})
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage("")} className="text-rose-600">✕</button>
        </div>
      )}

      {activeTab === "critical" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-500">
              Products Below Minimum Threshold
            </h3>
            <button
              onClick={loadData}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
              title="Refresh Real-time Stock Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {loading ? (
            <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-100 dark:border-slate-800 text-center">
              <RefreshCw className="w-6 h-6 animate-spin text-rose-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-500">Scanning inventory stock levels...</p>
            </div>
          ) : criticalProducts.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 p-12 rounded-2xl border border-slate-100 dark:border-slate-800 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="text-sm font-bold text-slate-900 dark:text-white">Inventory Healthy!</p>
              <p className="text-xs text-slate-400">All products have stock above their defined minimum threshold limits.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {criticalProducts.map((p) => {
                const stockVal = Number(p.stock || 0);
                const limitVal = Number(p.low_stock_limit || 5);
                const isOutOfStock = stockVal <= 0;

                return (
                  <div
                    key={p.id}
                    className={`bg-white dark:bg-slate-900 rounded-2xl p-5 border shadow-sm flex flex-col justify-between space-y-4 ${isOutOfStock ? "border-rose-300 dark:border-rose-900/60" : "border-amber-300 dark:border-amber-900/60"
                      }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${isOutOfStock
                            ? "bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400"
                            : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400"
                          }`}>
                          {isOutOfStock ? "Out of Stock" : "Low Stock Alert"}
                        </span>
                        <span className="text-xs font-mono text-slate-400">SKU: {p.sku || p.id}</span>
                      </div>

                      <h4 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">{p.name}</h4>

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs font-semibold">
                        <span className="text-slate-400">Current Units:</span>
                        <span className={`font-black text-sm ${isOutOfStock ? "text-rose-600" : "text-amber-600"}`}>
                          {stockVal} units
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>Low Stock Limit:</span>
                        <span>{limitVal} units</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === "notify" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
              Customer Back-In-Stock Notification Requests
            </h3>
            <button onClick={loadData} className="text-slate-400 hover:text-slate-600">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {notifyRequests.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-bold text-xs">
              No back-in-stock notification requests found in database.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 text-[10px] uppercase font-black tracking-wider text-slate-400">
                    <th className="px-6 py-4">Requested Product</th>
                    <th className="px-6 py-4">Customer Email / Phone</th>
                    <th className="px-6 py-4">Requested Date</th>
                    <th className="px-6 py-4">Product Stock Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300">
                  {notifyRequests.map((req) => {
                    const prodName = req.products?.name || req.product_name || "Product #" + req.product_id;
                    const stock = req.products?.stock || 0;
                    return (
                      <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-900 dark:text-white">{prodName}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-bold">
                            <Mail className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{req.email || req.customer_email || "N/A"}</span>
                          </div>
                          {req.phone && <div className="text-[11px] text-slate-400 font-mono mt-0.5">{req.phone}</div>}
                        </td>
                        <td className="px-6 py-4 text-slate-400 font-mono">
                          {new Date(req.created_at || req.requested_at || Date.now()).toLocaleDateString("en-IN")}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            stock > 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                          }`}>
                            {stock > 0 ? `In Stock (${stock})` : "Out of Stock"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => handleDeleteNotifyRequest(req.id)}
                            className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer"
                            title="Delete Request"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "history" && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-6 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-600" />
            <span>Real-time Stock Audit Trail</span>
          </h3>

          {stockHistory.length === 0 ? (
            <div className="p-12 text-center text-slate-400 font-bold text-xs">
              No stock history logs recorded in database.
            </div>
          ) : (
            <div className="space-y-3">
              {stockHistory.map((item) => {
                const pName = item.products?.name || item.product_name || "Product ID " + item.product_id;
                const changeAmt = item.change_amount || item.amount || 0;
                return (
                  <div key={item.id} className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 text-xs">
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900 dark:text-white">{pName}</div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <User className="w-3 h-3" />
                        <span>{item.admin_user || item.user || "System / Seller"}</span>
                        <span>•</span>
                        <Clock className="w-3 h-3" />
                        <span>{new Date(item.created_at || item.timestamp || Date.now()).toLocaleString("en-IN")}</span>
                        {item.reason && <span className="italic text-slate-500">({item.reason})</span>}
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full font-black text-xs ${
                      changeAmt >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                    }`}>
                      {changeAmt >= 0 ? `+${changeAmt}` : changeAmt} Units
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
