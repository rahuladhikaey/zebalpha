"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { apiService } from "@/services/apiService";
import { 
  TrendingUp, 
  IndianRupee, 
  Clock, 
  RefreshCw,
} from "lucide-react";

type RevenueSummary = {
  todayRevenue: number;
  yesterdayRevenue: number;
  thisWeekRevenue: number;
  lastWeekRevenue: number;
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  thisYearRevenue: number;
  lifetimeRevenue: number;
  pendingSettlement: number;
  paidSettlement: number;
  availableBalance: number;
  ordersToday: number;
  ordersThisWeek: number;
  ordersThisMonth: number;
  ordersThisYear: number;
};

export default function RevenueDashboard() {
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<RevenueSummary>({
    todayRevenue: 0,
    yesterdayRevenue: 0,
    thisWeekRevenue: 0,
    lastWeekRevenue: 0,
    thisMonthRevenue: 0,
    lastMonthRevenue: 0,
    thisYearRevenue: 0,
    lifetimeRevenue: 0,
    pendingSettlement: 0,
    paidSettlement: 0,
    availableBalance: 0,
    ordersToday: 0,
    ordersThisWeek: 0,
    ordersThisMonth: 0,
    ordersThisYear: 0
  });

  const [timeFilter, setTimeFilter] = useState<string>("this_month");
  const [selectedSellerId, setSelectedSellerId] = useState<string>("all");
  const [sellers, setSellers] = useState<any[]>([]);

  // Detailed calculations from orders
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [totalOrderRevenue, setTotalOrderRevenue] = useState(0);
  const [totalUnitsSold, setTotalUnitsSold] = useState(0);

  // Chart data states
  const [revenueTrend, setRevenueTrend] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [orderTrend, setOrderTrend] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [topProducts, setTopProducts] = useState<{name: string, sales: number, revenue: number}[]>([]);
  const [topCategories, setTopCategories] = useState<{name: string, percentage: number}[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load sellers safely
      let sellersList: any[] = [];
      try {
        const sRes = await fetch("/api/admin/sellers");
        const sJson = await sRes.json();
        if (sJson.success && Array.isArray(sJson.data)) {
          sellersList = sJson.data;
        }
      } catch (_) {}
      setSellers(sellersList);

      // Load revenue statistics from backend
      const params = selectedSellerId !== "all" ? { sellerId: selectedSellerId } : {};
      try {
        const res = await apiService.getRevenueSummary(params);
        if (res?.success && res.data) {
          const d = res.data;
          setRevenueData((prev) => ({
            ...prev,
            todayRevenue: Number(d.todayRevenue ?? d.today_revenue ?? prev.todayRevenue ?? 0),
            yesterdayRevenue: Number(d.yesterdayRevenue ?? d.yesterday_revenue ?? prev.yesterdayRevenue ?? 0),
            thisWeekRevenue: Number(d.thisWeekRevenue ?? d.this_week_revenue ?? prev.thisWeekRevenue ?? 0),
            lastWeekRevenue: Number(d.lastWeekRevenue ?? d.last_week_revenue ?? prev.lastWeekRevenue ?? 0),
            thisMonthRevenue: Number(d.thisMonthRevenue ?? d.this_month_revenue ?? prev.thisMonthRevenue ?? 0),
            lastMonthRevenue: Number(d.lastMonthRevenue ?? d.last_month_revenue ?? prev.lastMonthRevenue ?? 0),
            thisYearRevenue: Number(d.thisYearRevenue ?? d.this_year_revenue ?? prev.thisYearRevenue ?? 0),
            lifetimeRevenue: Number(d.lifetimeRevenue ?? d.lifetime_revenue ?? prev.lifetimeRevenue ?? 0),
            pendingSettlement: Number(d.pendingSettlement ?? d.pending_settlement ?? prev.pendingSettlement ?? 0),
            paidSettlement: Number(d.paidSettlement ?? d.paid_settlement ?? prev.paidSettlement ?? 0),
            availableBalance: Number(d.availableBalance ?? d.available_balance ?? prev.availableBalance ?? 0),
            ordersToday: Number(d.ordersToday ?? d.orders_today ?? prev.ordersToday ?? 0),
            ordersThisWeek: Number(d.ordersThisWeek ?? d.orders_this_week ?? prev.ordersThisWeek ?? 0),
            ordersThisMonth: Number(d.ordersThisMonth ?? d.orders_this_month ?? prev.ordersThisMonth ?? 0),
            ordersThisYear: Number(d.ordersThisYear ?? d.orders_this_year ?? prev.ordersThisYear ?? 0),
          }));
        }
      } catch (_) {}

      // Fetch actual orders for real-time calculation
      let fetchedOrders: any[] = [];

      try {
        const ordersRes = await supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200);

        if (ordersRes?.data && Array.isArray(ordersRes.data)) {
          fetchedOrders = ordersRes.data;
        } else {
          const directO = await fetch("/api/admin/orders").then(r => r.json()).catch(() => ({ data: [] }));
          if (Array.isArray(directO?.data)) fetchedOrders = directO.data;
        }
      } catch (err) {
        console.warn("Direct query error fallback:", err);
      }

      setOrdersList(fetchedOrders);

      let totalRev = 0;
      let totalUnits = 0;

      const productCounts: { [key: string]: { qty: number, rev: number } } = {};
      const categoryCounts: { [key: string]: number } = {};

      fetchedOrders.forEach(order => {
        let items: any[] = [];
        if (Array.isArray(order.items)) {
          items = order.items;
        } else if (order.product_details) {
          try {
            items = typeof order.product_details === "string" 
              ? JSON.parse(order.product_details) 
              : order.product_details;
          } catch (_) {}
        }

        if (Array.isArray(items) && items.length > 0) {
          items.forEach((item: any) => {
            const name = item.name || item.product_name || "Streetwear Item";
            const qty = Number(item.quantity) || 1;
            const price = Number(item.price) || 0;
            const itemRev = item.subtotal ? Number(item.subtotal) : (qty * price);

            totalRev += itemRev;
            totalUnits += qty;

            if (!productCounts[name]) {
              productCounts[name] = { qty: 0, rev: 0 };
            }
            productCounts[name].qty += qty;
            productCounts[name].rev += itemRev;

            const cat = item.category || "Apparel";
            categoryCounts[cat] = (categoryCounts[cat] || 0) + qty;
          });
        } else {
          const total = Number(order.total_amount) || 0;
          totalRev += total;
          totalUnits += 1;
        }
      });

      setTotalOrderRevenue(totalRev);
      setTotalUnitsSold(totalUnits);

      // Format top products
      const sortedProducts = Object.keys(productCounts)
        .map(name => ({
          name,
          sales: productCounts[name].qty,
          revenue: productCounts[name].rev,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 6);

      setTopProducts(sortedProducts);

      // Format categories
      const totalCats = Object.values(categoryCounts).reduce((s, c) => s + c, 0);
      const sortedCategories = totalCats > 0
        ? Object.keys(categoryCounts).map(name => ({
            name,
            percentage: Math.round((categoryCounts[name] / totalCats) * 100)
          })).sort((a, b) => b.percentage - a.percentage)
        : [];

      setTopCategories(sortedCategories);

      // Compute exact 7-day daily trend from real orders
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split("T")[0];
      });

      const dailyRevs = last7Days.map(dayStr => {
        return fetchedOrders
          .filter(o => o.created_at && o.created_at.startsWith(dayStr) && o.order_status !== "cancelled" && o.order_status !== "returned")
          .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
      });

      const dailyOrders = last7Days.map(dayStr => {
        return fetchedOrders
          .filter(o => o.created_at && o.created_at.startsWith(dayStr) && o.order_status !== "cancelled")
          .length;
      });

      setRevenueTrend(dailyRevs);
      setOrderTrend(dailyOrders);

    } catch (err) {
      console.error("Failed to load revenue summary:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [timeFilter, selectedSellerId]);

  const displayRevenue = useMemo(() => {
    const lifetime = Number(revenueData?.lifetimeRevenue) || 0;
    return totalOrderRevenue || lifetime || 0;
  }, [totalOrderRevenue, revenueData]);

  const displayUnits = totalUnitsSold;

  const getMaxVal = (arr: number[]) => {
    if (!Array.isArray(arr) || arr.length === 0) return 1;
    const m = Math.max(...arr.map(v => Number(v) || 0));
    return isFinite(m) && m > 0 ? m : 1;
  };

  const maxRev = getMaxVal(revenueTrend);
  const maxOrd = getMaxVal(orderTrend);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase">Revenue & Analytics Desk</h1>
          <p className="text-xs font-bold text-zinc-400 mt-0.5">
            Marketplace revenue tracking, unit margins, and settlement reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select 
            className="bg-zinc-900 border border-zinc-800 rounded-xl py-2 px-3 text-xs font-black text-white outline-none cursor-pointer"
            value={selectedSellerId}
            onChange={(e) => setSelectedSellerId(e.target.value)}
          >
            <option value="all">Marketplace Aggregated</option>
            {sellers.map(s => (
              <option key={s.id} value={s.id}>{s.business_name}</option>
            ))}
          </select>
          <button 
            onClick={loadData} 
            className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-bold p-2.5 rounded-xl hover:bg-zinc-800 hover:text-white transition-all cursor-pointer"
            title="Refresh Revenue Data"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Time Filter Controls */}
      <div className="flex flex-wrap items-center justify-end gap-3 p-2 rounded-2xl bg-zinc-950 border border-zinc-800">
        {/* Time Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: "today", label: "Today" },
            { id: "this_week", label: "Week" },
            { id: "this_month", label: "Month" },
            { id: "lifetime", label: "Lifetime" }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTimeFilter(t.id)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all cursor-pointer ${
                timeFilter === t.id
                  ? "bg-zinc-800 text-white font-bold"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* 1. Total Gross Revenue Card */}
        <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl relative overflow-hidden shadow-xl">
          <div className="h-10 w-10 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl flex items-center justify-center absolute right-6 top-6">
            <IndianRupee size={18} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
            Total Marketplace Revenue
          </span>
          <p className="text-3xl font-black text-white mt-2">
            ₹{(Number(displayRevenue) || 0).toLocaleString("en-IN")}
          </p>
          <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-zinc-400 pt-2 border-t border-zinc-900">
            <span>Volume: {displayUnits || 0} units</span>
            <span className="text-emerald-400 font-black flex items-center gap-1">
              <TrendingUp size={12} /> Active
            </span>
          </div>
        </div>

        {/* 2. Settlements Balance Card */}
        <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl relative overflow-hidden shadow-xl">
          <div className="h-10 w-10 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-2xl flex items-center justify-center absolute right-6 top-6">
            <Clock size={18} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
            Pending Settlements
          </span>
          <p className="text-3xl font-black text-purple-300 mt-2">
            ₹{(Number(revenueData?.pendingSettlement) || 0).toLocaleString("en-IN")}
          </p>
          <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-zinc-400 pt-2 border-t border-zinc-900">
            <span className="text-emerald-400 font-bold">Avail: ₹{(Number(revenueData?.availableBalance) || 0).toLocaleString("en-IN")}</span>
            <span>Weekly Cycle</span>
          </div>
        </div>
      </div>

      {/* Graphs & Trends Box */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend SVG Chart */}
        <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-tight">Sales & Orders Velocity</h3>
              <p className="text-[10px] text-zinc-400 font-bold">Historical data plot for the selected period.</p>
            </div>
            <div className="flex gap-4 text-[10px] font-black uppercase">
              <span className="flex items-center gap-1.5 text-emerald-400"><span className="h-2 w-2 bg-emerald-400 rounded-full"></span> Revenue</span>
              <span className="flex items-center gap-1.5 text-amber-400"><span className="h-2 w-2 bg-amber-400 rounded-full"></span> Orders</span>
            </div>
          </div>

          {loading ? (
            <div className="h-64 flex items-center justify-center text-zinc-500 font-bold text-xs">
              Loading trends data plot...
            </div>
          ) : (
            <div className="relative w-full h-64 border-b border-l border-zinc-800 pt-6">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
                <line x1="0" y1="25%" x2="100%" y2="25%" stroke="#3f3f46" strokeOpacity="0.2" />
                <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#3f3f46" strokeOpacity="0.2" />
                <line x1="0" y1="75%" x2="100%" y2="75%" stroke="#3f3f46" strokeOpacity="0.2" />

                <path
                  d={(revenueTrend || []).reduce((path, val, index) => {
                    const count = Math.max((revenueTrend?.length || 1) - 1, 1);
                    const x = (index / count) * 100 + "%";
                    const y = (1 - (Number(val) || 0) / maxRev) * 100 + "%";
                    return path + `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }, "")}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                <path
                  d={(orderTrend || []).reduce((path, val, index) => {
                    const count = Math.max((orderTrend?.length || 1) - 1, 1);
                    const x = (index / count) * 100 + "%";
                    const y = (1 - (Number(val) || 0) / maxOrd) * 100 + "%";
                    return path + `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }, "")}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  strokeLinecap="round"
                />
              </svg>
              <div className="flex justify-between text-[8px] font-black uppercase text-zinc-500 mt-2 px-1">
                {(revenueTrend || []).map((_, i) => (
                  <span key={i}>Pt {i + 1}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Top Categories Card */}
        <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl">
          <h3 className="text-sm font-black text-white uppercase mb-6">Top Selling Segments</h3>
          
          <div className="space-y-4">
            {(topCategories || []).map((c, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-zinc-300">{c.name}</span>
                  <span className="text-white font-mono">{c.percentage}%</span>
                </div>
                <div className="h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                  <div 
                    className="h-full rounded-full transition-all duration-500 bg-emerald-500"
                    style={{ width: `${c.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Products Box */}
      <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-black text-white uppercase tracking-tight">Top Product Performers by Revenue</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-medium text-zinc-300 border-collapse">
            <thead>
              <tr className="bg-zinc-900/60 text-zinc-400 border-b border-zinc-800 uppercase tracking-widest font-black text-[9px]">
                <th className="px-6 py-4">Product Catalog Name</th>
                <th className="px-6 py-4 text-center">Sales Units</th>
                <th className="px-6 py-4 text-right">Revenue Generated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {(topProducts || []).map((p, i) => (
                <tr key={i} className="hover:bg-zinc-900/40 font-bold transition-colors">
                  <td className="px-6 py-4 text-white font-black">{p.name}</td>
                  <td className="px-6 py-4 text-center text-zinc-400 font-mono">{p.sales || 0} units</td>
                  <td className="px-6 py-4 text-right text-emerald-400 font-mono font-black">
                    ₹{(Number(p?.revenue) || 0).toLocaleString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
