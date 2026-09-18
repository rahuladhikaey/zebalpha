"use client";

import { useState } from "react";
import { BarChart3, FileSpreadsheet, Download, TrendingUp, Sparkles, Flame, Gem } from "lucide-react";
import { exportCustomDataExcel } from "@/utils/excelExport";

export default function ReportsAnalyticsView({ orders = [], products = [], sellers = [] }: any) {
  const [exporting, setExporting] = useState<string | null>(null);

  // Helper to test if item is premium
  const isItemPremium = (item: any) => {
    if (item.is_premium === true || item.tier === 'PREMIUM') return true;
    const match = products.find((p: any) => p.name === (item.name || item.product_name) || (item.id && p.id === item.id));
    if (match) {
      if (match.is_premium || match.tier === 'PREMIUM') return true;
      const cat = (match.category || "").toLowerCase();
      if (cat.includes("premium") || cat.includes("luxe")) return true;
    }
    const name = (item.name || item.product_name || "").toLowerCase();
    return name.includes("premium") || name.includes("supima") || name.includes("luxe");
  };

  const handleExportReport = async (reportType: string) => {
    setExporting(reportType);
    await new Promise((r) => setTimeout(r, 600));

    try {
      if (reportType === "sales_all") {
        exportCustomDataExcel(
          orders.map((o: any) => {
            let streamType = "Standard";
            try {
              const items = typeof o.product_details === "string" ? JSON.parse(o.product_details) : o.product_details;
              if (Array.isArray(items) && items.some(isItemPremium)) {
                streamType = "Premium Store";
              }
            } catch {}

            return {
              "Order ID": o.order_number || o.id,
              Date: o.created_at,
              "Revenue Stream": streamType,
              Customer: o.shipping_address?.name || o.customer_name || "Customer",
              Amount: o.total_amount,
              Status: o.order_status,
              Payment: o.payment_status,
            };
          }),
          "All_Sales_Revenue_Report"
        );
      } else if (reportType === "sales_premium") {
        // Filter orders that have premium items
        const premiumRows: any[] = [];
        orders.forEach((o: any) => {
          try {
            const items = typeof o.product_details === "string" ? JSON.parse(o.product_details) : o.product_details;
            if (Array.isArray(items)) {
              items.filter(isItemPremium).forEach((item: any) => {
                const productMatch = products.find((p: any) => p.name === (item.name || item.product_name) || p.id === item.id);
                premiumRows.push({
                  "Order ID": o.order_number || o.id,
                  "Order Date": o.created_at,
                  "Premium Item": item.name || item.product_name,
                  Collection: productMatch?.collection || item.collection || "Signature Atelier",
                  Tier: "💎 PREMIUM",
                  Quantity: item.quantity || 1,
                  Price: item.price,
                  Subtotal: (Number(item.price) || 0) * (Number(item.quantity) || 1),
                  Customer: o.shipping_address?.name || o.customer_name || "Customer",
                  Status: o.order_status,
                  Payment: o.payment_status,
                });
              });
            }
          } catch {}
        });

        exportCustomDataExcel(
          premiumRows.length > 0 ? premiumRows : [{ Status: "No Premium Orders Found" }],
          "Premium_Store_Sales_Report"
        );
      } else if (reportType === "sales_standard") {
        const standardRows: any[] = [];
        orders.forEach((o: any) => {
          try {
            const items = typeof o.product_details === "string" ? JSON.parse(o.product_details) : o.product_details;
            if (Array.isArray(items)) {
              items.filter((item: any) => !isItemPremium(item)).forEach((item: any) => {
                standardRows.push({
                  "Order ID": o.order_number || o.id,
                  "Order Date": o.created_at,
                  "Product Name": item.name || item.product_name,
                  Tier: "STANDARD",
                  Quantity: item.quantity || 1,
                  Price: item.price,
                  Subtotal: (Number(item.price) || 0) * (Number(item.quantity) || 1),
                  Customer: o.shipping_address?.name || o.customer_name || "Customer",
                  Status: o.order_status,
                  Payment: o.payment_status,
                });
              });
            }
          } catch {}
        });

        exportCustomDataExcel(
          standardRows.length > 0 ? standardRows : [{ Status: "No Standard Orders Found" }],
          "Standard_Apparel_Sales_Report"
        );
      } else if (reportType === "new_drops") {
        const dropProducts = products.filter((p: any) => p.is_new_drop || p.target_drop_date || p.drop_date);
        exportCustomDataExcel(
          dropProducts.map((p: any) => ({
            "Product Name": p.name,
            Brand: p.brand,
            Collection: p.collection || "Exclusive Drop",
            "Drop Date / Target": p.target_drop_date || p.drop_date || "Upcoming",
            Tier: p.is_premium ? "💎 PREMIUM" : "STANDARD",
            Price: p.price,
            Stock: p.stock || 0,
            Status: p.is_active ? "Active" : "Pending Launch"
          })),
          "New_Drops_Performance_Report"
        );
      } else if (reportType === "products") {
        exportCustomDataExcel(
          products.map((p: any) => ({
            "Product Name": p.name,
            Brand: p.brand,
            "Store Stream": p.is_premium || p.tier === 'PREMIUM' ? "💎 Premium Store" : "Standard",
            "New Drop": p.is_new_drop ? "⚡ YES" : "NO",
            Collection: p.collection || "General",
            Price: p.price,
            MRP: p.mrp || p.price,
            Stock: p.stock || 0,
            Status: p.is_active ? "Active" : "Hidden"
          })),
          "Product_Catalog_Report"
        );
      } else if (reportType === "sellers") {
        exportCustomDataExcel(
          sellers.map((s: any) => ({
            Business: s.business_name,
            Owner: s.owner_name,
            Email: s.email,
            Phone: s.mobile_number,
            City: s.city,
            Status: s.status
          })),
          "Seller_Directory_Report"
        );
      }
    } catch (e) {
      console.error("Export error:", e);
    }
    setExporting(null);
  };

  return (
    <div className="space-y-8">
      <div>
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600">Executive Intelligence</span>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Reports & Revenue Streams Analytics</h1>
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
          Generate comprehensive sales, separated Premium Store revenue, curated Collections & Drops, and merchant directories.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 💎 Premium Store Sales Report */}
        <div className="bg-gradient-to-br from-amber-950/20 via-slate-900 to-zinc-950 p-6 rounded-3xl border border-amber-500/30 shadow-lg space-y-4 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="h-12 w-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black border border-amber-500/30">
            <Gem className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-amber-400 text-black">Luxury Stream</span>
            </div>
            <h3 className="font-black text-white text-base mt-1">💎 Premium Store Sales Report</h3>
            <p className="text-xs text-zinc-400 mt-1">Exclusively high-ticket luxury apparel sales, atelier items, revenue subtotals, and collections.</p>
          </div>
          <button
            disabled={exporting !== null}
            onClick={() => handleExportReport("sales_premium")}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-black text-xs hover:brightness-110 shadow-md shadow-amber-500/20 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{exporting === "sales_premium" ? "Generating..." : "Export Premium Sales (.xlsx)"}</span>
          </button>
        </div>

        {/* ⚡ New Drops & Release Report */}
        <div className="bg-gradient-to-br from-orange-950/20 via-slate-900 to-zinc-950 p-6 rounded-3xl border border-orange-500/30 shadow-lg space-y-4 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="h-12 w-12 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-black border border-orange-500/30">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-orange-400 text-black">Hype Releases</span>
            </div>
            <h3 className="font-black text-white text-base mt-1">⚡ New Drops Performance</h3>
            <p className="text-xs text-zinc-400 mt-1">Drop launch dates, release calendar, curated collection mappings, and launch stock.</p>
          </div>
          <button
            disabled={exporting !== null}
            onClick={() => handleExportReport("new_drops")}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-black font-black text-xs hover:brightness-110 shadow-md shadow-orange-500/20 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{exporting === "new_drops" ? "Generating..." : "Export New Drops (.xlsx)"}</span>
          </button>
        </div>

        {/* 🏷️ Standard Apparel Sales Report */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center font-black">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">Everyday Catalog</span>
            <h3 className="font-black text-slate-900 dark:text-white text-base mt-1">🏷️ Standard Apparel Sales</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Regular apparel & everyday fashion orders, payment methods, and delivery status.</p>
          </div>
          <button
            disabled={exporting !== null}
            onClick={() => handleExportReport("sales_standard")}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-sky-600 text-white font-bold text-xs hover:bg-sky-700 shadow-md shadow-sky-600/20 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{exporting === "sales_standard" ? "Generating..." : "Export Standard Sales (.xlsx)"}</span>
          </button>
        </div>

        {/* All Combined Sales & Dispatches */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">Full Ledger</span>
            <h3 className="font-black text-slate-900 dark:text-white text-base mt-1">Combined Sales & Revenue</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Unified ledger containing both Premium Store and Standard sales with stream tags.</p>
          </div>
          <button
            disabled={exporting !== null}
            onClick={() => handleExportReport("sales_all")}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-md shadow-emerald-600/20 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{exporting === "sales_all" ? "Generating..." : "Export All Sales (.xlsx)"}</span>
          </button>
        </div>

        {/* Complete Product Catalog */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">Catalog Registry</span>
            <h3 className="font-black text-slate-900 dark:text-white text-base mt-1">Product & Inventory Catalog</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Stock status, pricing, stream tier, collection tags, and drop status.</p>
          </div>
          <button
            disabled={exporting !== null}
            onClick={() => handleExportReport("products")}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 shadow-md shadow-amber-600/20 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{exporting === "products" ? "Generating..." : "Export Products (.xlsx)"}</span>
          </button>
        </div>

        {/* Seller Directory */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">Merchants</span>
            <h3 className="font-black text-slate-900 dark:text-white text-base mt-1">Seller Performance & Directory</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Merchant onboardings, contact directory, and verification status analysis.</p>
          </div>
          <button
            disabled={exporting !== null}
            onClick={() => handleExportReport("sellers")}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-md shadow-indigo-600/20 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{exporting === "sellers" ? "Generating..." : "Export Sellers (.xlsx)"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
