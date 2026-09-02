"use client";

import { useState } from "react";
import { BarChart3, FileSpreadsheet, Download, TrendingUp } from "lucide-react";
import { exportCustomDataExcel } from "@/utils/excelExport";

export default function ReportsAnalyticsView({ orders = [], products = [], sellers = [] }: any) {
  const [exporting, setExporting] = useState(false);

  const handleExportReport = async (reportType: string) => {
    setExporting(true);
    await new Promise((r) => setTimeout(r, 600));

    try {
      if (reportType === "sales") {
        exportCustomDataExcel(
          orders.map((o: any) => ({
            "Order ID": o.order_number || o.id,
            Date: o.created_at,
            Customer: o.shipping_address?.name || o.customer_name || "Customer",
            Amount: o.total_amount,
            Status: o.order_status,
            Payment: o.payment_status
          })),
          "Sales_Report"
        );
      } else if (reportType === "products") {
        exportCustomDataExcel(
          products.map((p: any) => ({
            "Product Name": p.name,
            Brand: p.brand,
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
    setExporting(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600">Executive Intelligence</span>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">Reports & Business Analytics</h1>
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 mt-0.5">
          Generate comprehensive sales, seller performance, product catalog, and revenue reports with 1-click Excel export.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-slate-900 dark:text-white text-base">Sales & Dispatch Report</h3>
            <p className="text-xs text-slate-500 mt-1">Detailed order dispatches, sales revenue breakdown, and payment states.</p>
          </div>
          <button
            disabled={exporting}
            onClick={() => handleExportReport("sales")}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-md shadow-emerald-600/20"
          >
            <Download className="w-4 h-4" />
            <span>Export Sales (.xlsx)</span>
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-slate-900 dark:text-white text-base">Product & Inventory Report</h3>
            <p className="text-xs text-slate-500 mt-1">Stock status, pricing, brand distribution, and shelf placement metrics.</p>
          </div>
          <button
            disabled={exporting}
            onClick={() => handleExportReport("products")}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 shadow-md shadow-amber-600/20"
          >
            <Download className="w-4 h-4" />
            <span>Export Products (.xlsx)</span>
          </button>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-black text-slate-900 dark:text-white text-base">Seller Performance Report</h3>
            <p className="text-xs text-slate-500 mt-1">Merchant onboardings, status counts, geographic location analysis.</p>
          </div>
          <button
            disabled={exporting}
            onClick={() => handleExportReport("sellers")}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-md shadow-indigo-600/20"
          >
            <Download className="w-4 h-4" />
            <span>Export Sellers (.xlsx)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
