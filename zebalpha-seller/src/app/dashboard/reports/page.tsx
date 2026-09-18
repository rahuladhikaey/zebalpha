"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import type { Product, Order } from "@shared/types";
import { 
  BarChart3, 
  Download, 
  TrendingUp, 
  Package, 
  Receipt, 
  DollarSign, 
  Calendar,
  Crown,
  Shirt,
  Sparkles,
  Layers,
  CheckCircle2
} from "lucide-react";

type ReportType = "all_sales" | "premium_sales" | "standard_sales" | "product" | "order" | "inventory";

export default function SellerReports() {
  const [loading, setLoading] = useState(true);
  const [reportType, setReportType] = useState<ReportType>("all_sales");
  const [dateRange, setDateRange] = useState("all");

  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Seller Profile
      const { data: sProfile } = await supabase
        .from("sellers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      // Products
      let productsData: any[] = [];
      try {
        const { data: pData } = await supabase
          .from("products")
          .select("*")
          .or(`seller_id.eq.${user.id}${sProfile?.id ? `,seller_id.eq.${sProfile.id}` : ""}`);
        productsData = pData || [];
      } catch (_) {
        const { data: pFallback } = await supabase
          .from("products")
          .select("*")
          .eq("seller_id", user.id);
        productsData = pFallback || [];
      }

      const sProducts = (productsData || []) as Product[];
      setProducts(sProducts);
      const pIdSet = new Set(sProducts.map(p => String(p.id)));
      const premiumProductIdSet = new Set(
        sProducts
          .filter(p => p.is_premium === true || p.tier === "PREMIUM" || (p.specifications as any)?.is_premium === "true" || (p.category && p.category.toLowerCase().includes("premium")))
          .map(p => String(p.id))
      );

      // Orders
      const { data: ordersData } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      const allOrders = (ordersData || []) as Order[];
      const filteredOrders: any[] = [];

      allOrders.forEach(ord => {
        const isDirect = ord.seller_id === user.id || (sProfile?.id && ord.seller_id === sProfile.id);
        let sellerItems: any[] = [];

        if (ord.items && Array.isArray(ord.items)) {
          sellerItems = pIdSet.size > 0 
            ? ord.items.filter((i: any) => pIdSet.has(String(i.product_id || i.id || "")))
            : ord.items;
        } else if (ord.product_details) {
          try {
            const parsed = typeof ord.product_details === "string" ? JSON.parse(ord.product_details || "[]") : ord.product_details;
            sellerItems = pIdSet.size > 0
              ? parsed.filter((i: any) => pIdSet.has(String(i.id || i.product_id || "")))
              : parsed;
          } catch (e) {}
        }

        if (isDirect || sellerItems.length > 0 || pIdSet.size === 0) {
          let premTotal = 0;
          let stdTotal = 0;
          let premUnits = 0;
          let stdUnits = 0;

          const itemsToCalc = sellerItems.length > 0 ? sellerItems : (ord.items || []);

          itemsToCalc.forEach((item: any) => {
            const itemId = String(item.product_id || item.id || "");
            const itemTotal = item.subtotal || ((Number(item.price) || 0) * (Number(item.quantity) || 1)) || 0;
            const qty = Number(item.quantity) || 1;
            const isPrem = 
              item.is_premium === true || 
              item.tier === "PREMIUM" || 
              premiumProductIdSet.has(itemId) ||
              (item.name && item.name.toLowerCase().includes("premium")) ||
              (item.name && item.name.toLowerCase().includes("supima"));

            if (isPrem) {
              premTotal += itemTotal;
              premUnits += qty;
            } else {
              stdTotal += itemTotal;
              stdUnits += qty;
            }
          });

          const sellerTotal = (premTotal + stdTotal) > 0 
            ? (premTotal + stdTotal) 
            : (Number(ord.total_amount) || 0);

          filteredOrders.push({
            ...ord,
            seller_items: itemsToCalc,
            seller_total: sellerTotal,
            premium_total: premTotal,
            standard_total: stdTotal > 0 ? stdTotal : (premTotal > 0 ? 0 : sellerTotal),
            premium_units: premUnits,
            standard_units: stdUnits,
            is_premium_order: premTotal > 0
          });
        }
      });

      setOrders(filteredOrders);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, []);

  // Display orders filtered by report type
  const displayedOrders = useMemo(() => {
    if (reportType === "premium_sales") {
      return orders.filter(o => o.premium_total > 0);
    }
    if (reportType === "standard_sales") {
      return orders.filter(o => o.standard_total > 0);
    }
    return orders;
  }, [orders, reportType]);

  const handleExportCSV = () => {
    let csvHeader = "";
    let csvRows: string[] = [];

    if (reportType === "all_sales" || reportType === "premium_sales" || reportType === "standard_sales" || reportType === "order") {
      csvHeader = "Order Number,Customer Name,Date,Status,Total Revenue (INR),Premium Revenue (INR),Standard Revenue (INR),Tier\n";
      csvRows = displayedOrders.map(o => 
        `"${o.order_number || o.id}","${o.customer_name || 'Customer'}","${new Date(o.created_at).toLocaleDateString()}","${o.order_status || 'Placed'}","${o.seller_total || o.total_amount}","${o.premium_total || 0}","${o.standard_total || 0}","${o.premium_total > 0 ? '💎 Premium' : '👕 Standard'}"`
      );
    } else if (reportType === "product" || reportType === "inventory") {
      csvHeader = "Product Name,SKU,Brand,Tier,Collection,Price (INR),Stock Level,Low Stock Limit,Status\n";
      csvRows = products.map(p => 
        `"${p.name}","${p.sku || 'N/A'}","${p.brand || 'ZEBALPHA'}","${p.is_premium ? '💎 PREMIUM' : '👕 Standard'}","${p.collection || 'General'}","${p.price}","${p.stock || 0}","${p.low_stock_limit || 5}","${(p.stock || 0) > 0 ? 'In Stock' : 'Out of Stock'}"`
      );
    }

    const csvContent = "data:text/csv;charset=utf-8," + csvHeader + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `zebalpha_seller_${reportType}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.seller_total || 0), 0);
  const totalPremiumRevenue = orders.reduce((sum, o) => sum + Number(o.premium_total || 0), 0);
  const totalStandardRevenue = orders.reduce((sum, o) => sum + Number(o.standard_total || 0), 0);
  const totalUnitsSold = orders.reduce((sum, o) => sum + (o.premium_units || 0) + (o.standard_units || 0) || 1, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white uppercase">Analytics & Financial Ledger</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
              CSV Export Ready
            </span>
          </div>
          <p className="text-xs font-bold text-zinc-400 mt-1">
            Generate and export separated financial reports for Premium Store sales, Standard Apparel, and inventory dispatches.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white text-black hover:bg-zinc-200 text-xs font-black uppercase tracking-wider shadow-lg transition-all cursor-pointer"
        >
          <Download size={16} />
          <span>Export {reportType.replace("_", " ")} CSV</span>
        </button>
      </div>

      {/* Report Selector Tabs */}
      <div className="flex gap-2 border-b border-zinc-800 pb-3 overflow-x-auto no-scrollbar">
        {[
          { key: "all_sales", label: "All Sales Ledger", icon: Layers },
          { key: "premium_sales", label: "💎 Premium Store Sales", icon: Crown },
          { key: "standard_sales", label: "👕 Standard Apparel Sales", icon: Shirt },
          { key: "product", label: "Product Catalog & Tiers", icon: Package },
          { key: "order", label: "Order Dispatches", icon: Receipt },
          { key: "inventory", label: "Stock & Inventory", icon: BarChart3 },
        ].map(t => {
          const Icon = t.icon;
          const isSelected = reportType === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setReportType(t.key as any)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 ${
                isSelected
                  ? t.key === "premium_sales"
                    ? "bg-amber-500 text-black shadow-md font-extrabold"
                    : "bg-white text-black shadow-md font-extrabold"
                  : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800"
              }`}
            >
              <Icon size={14} className={isSelected && t.key === "premium_sales" ? "text-black" : undefined} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Summary Cards with Separated Revenue */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="rounded-3xl bg-zinc-950 p-5 border border-zinc-800">
          <span className="text-[10px] font-black uppercase text-zinc-400">Total Sales Volume</span>
          <p className="text-2xl font-black mt-2 text-white">₹{totalRevenue.toLocaleString('en-IN')}</p>
          <span className="text-[10px] font-bold text-zinc-400 mt-1 block">Net revenue across all orders</span>
        </div>

        {/* Premium Store Sales */}
        <div className="rounded-3xl bg-zinc-950 p-5 border border-amber-500/30">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-amber-400">💎 Premium Store Sales</span>
            <Crown size={14} className="text-amber-400" />
          </div>
          <p className="text-2xl font-black mt-2 text-amber-300">₹{totalPremiumRevenue.toLocaleString('en-IN')}</p>
          <span className="text-[10px] font-bold text-zinc-400 mt-1 block">
            {totalRevenue > 0 ? Math.round((totalPremiumRevenue / totalRevenue) * 100) : 0}% of total seller revenue
          </span>
        </div>

        {/* Standard Apparel Sales */}
        <div className="rounded-3xl bg-zinc-950 p-5 border border-blue-500/30">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-blue-400">👕 Standard Apparel Sales</span>
            <Shirt size={14} className="text-blue-400" />
          </div>
          <p className="text-2xl font-black mt-2 text-blue-300">₹{totalStandardRevenue.toLocaleString('en-IN')}</p>
          <span className="text-[10px] font-bold text-zinc-400 mt-1 block">Core apparel and basics</span>
        </div>

        {/* Units Sold */}
        <div className="rounded-3xl bg-zinc-950 p-5 border border-zinc-800">
          <span className="text-[10px] font-black uppercase text-zinc-400">Total Units Shipped</span>
          <p className="text-2xl font-black mt-2 text-emerald-400">{totalUnitsSold}</p>
          <span className="text-[10px] font-bold text-zinc-400 mt-1 block">Across {orders.length} orders</span>
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-[2.5rem] bg-zinc-950 border border-zinc-800 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-black uppercase tracking-tight text-white capitalize">
            {reportType.replace("_", " ")} ({displayedOrders.length} records)
          </h2>
          <span className="text-[11px] font-bold text-zinc-400">
            Export format: CSV Spreadsheet
          </span>
        </div>
        
        {loading ? (
          <div className="py-12 text-center text-zinc-500 font-bold text-xs">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white mx-auto mb-2" />
            Loading report records...
          </div>
        ) : (reportType === "all_sales" || reportType === "premium_sales" || reportType === "standard_sales" || reportType === "order") ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-bold border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-[10px] uppercase font-black text-zinc-400 bg-zinc-900/60">
                  <th className="px-4 py-3">Order Number</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Order Amount</th>
                  <th className="px-4 py-3 text-right">Premium Split</th>
                  <th className="px-4 py-3 text-right">Standard Split</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {displayedOrders.map((o) => (
                  <tr key={o.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="px-4 py-3 font-black text-white">{o.order_number || String(o.id).slice(0, 8)}</td>
                    <td className="px-4 py-3 text-zinc-300">{o.customer_name || "Customer"}</td>
                    <td className="px-4 py-3 text-zinc-400">{new Date(o.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      {o.premium_total > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2.5 py-0.5 text-[9px] font-black uppercase">
                          <Crown size={10} /> 💎 PREMIUM
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 text-zinc-400 px-2.5 py-0.5 text-[9px] font-bold uppercase">
                          👕 Standard
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                        {o.order_status || "Placed"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-black text-white font-mono">
                      ₹{Number(o.seller_total || o.total_amount).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-amber-400 font-mono">
                      ₹{Number(o.premium_total || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right font-black text-blue-400 font-mono">
                      ₹{Number(o.standard_total || 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-bold border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-[10px] uppercase font-black text-zinc-400 bg-zinc-900/60">
                  <th className="px-4 py-3">Product Name</th>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Current Stock</th>
                  <th className="px-4 py-3">Low Limit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="px-4 py-3 font-black text-white">{p.name}</td>
                    <td className="px-4 py-3">
                      {p.is_premium ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2 py-0.5 text-[9px] font-black uppercase">
                          💎 PREMIUM
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 text-zinc-400 px-2 py-0.5 text-[9px] font-bold uppercase">
                          👕 Standard
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 font-mono">{p.sku || "N/A"}</td>
                    <td className="px-4 py-3 font-black text-white font-mono">₹{p.price}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${(p.stock || 0) <= (p.low_stock_limit || 5) ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'}`}>
                        {p.stock || 0} units
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-400 font-mono">{p.low_stock_limit || 5}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
