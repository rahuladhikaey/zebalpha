"use client";

import { useState, useEffect, useMemo } from "react";
import { supabaseA as supabase } from "@shared/utils/supabaseClient";
import { apiService } from "@/services/apiService";
import { 
  TrendingUp, 
  IndianRupee, 
  ShoppingBag, 
  BarChart3, 
  Clock, 
  CheckCircle2, 
  Calendar,
  AlertTriangle,
  RefreshCw,
  Percent,
  Crown,
  Flame,
  Shirt,
  Sparkles,
  Layers,
  ArrowUpRight
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
  const [tierFilter, setTierFilter] = useState<"all" | "premium" | "standard">("all");
  const [selectedSellerId, setSelectedSellerId] = useState<string>("all");
  const [sellers, setSellers] = useState<any[]>([]);

  // Detailed split calculations from orders
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [premiumRevenueStats, setPremiumRevenueStats] = useState({
    totalPremiumRevenue: 0,
    totalStandardRevenue: 0,
    premiumUnitsCount: 0,
    standardUnitsCount: 0,
    premiumOrdersCount: 0,
    standardOrdersCount: 0,
  });

  // Chart data states
  const [revenueTrend, setRevenueTrend] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [orderTrend, setOrderTrend] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [topProducts, setTopProducts] = useState<{name: string, sales: number, revenue: number, isPremium: boolean}[]>([]);
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
          setRevenueData(res.data);
        }
      } catch (_) {}

      // Fetch actual orders and products for real-time Premium vs Standard calculation
      const [ordersRes, productsRes] = await Promise.all([
        supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200),
        supabase
          .from("products")
          .select("id, name, is_premium, tier, category")
      ]);

      const fetchedOrders = ordersRes.data || [];
      const fetchedProducts = productsRes.data || [];
      const premiumProductIdSet = new Set(
        fetchedProducts
          .filter(p => p.is_premium === true || p.tier === "PREMIUM" || (p.category && p.category.toLowerCase().includes("premium")))
          .map(p => String(p.id))
      );

      setOrdersList(fetchedOrders);

      // Calculate Premium vs Standard Breakdown
      let premRev = 0;
      let stdRev = 0;
      let premUnits = 0;
      let stdUnits = 0;
      let premOrders = 0;
      let stdOrders = 0;

      const productCounts: { [key: string]: { qty: number, rev: number, isPremium: boolean } } = {};
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

        let orderHasPremium = false;
        let orderHasStandard = false;

        if (Array.isArray(items) && items.length > 0) {
          items.forEach((item: any) => {
            const itemId = String(item.product_id || item.id || "");
            const name = item.name || item.product_name || "Streetwear Item";
            const qty = Number(item.quantity) || 1;
            const price = Number(item.price) || 0;
            const itemRev = item.subtotal ? Number(item.subtotal) : (qty * price);

            const isItemPremium = 
              item.is_premium === true || 
              item.tier === "PREMIUM" || 
              premiumProductIdSet.has(itemId) ||
              name.toLowerCase().includes("premium") ||
              name.toLowerCase().includes("supima") ||
              name.toLowerCase().includes("luxe");

            if (isItemPremium) {
              premRev += itemRev;
              premUnits += qty;
              orderHasPremium = true;
            } else {
              stdRev += itemRev;
              stdUnits += qty;
              orderHasStandard = true;
            }

            if (!productCounts[name]) {
              productCounts[name] = { qty: 0, rev: 0, isPremium: isItemPremium };
            }
            productCounts[name].qty += qty;
            productCounts[name].rev += itemRev;

            const cat = isItemPremium ? "💎 Premium Vault" : (item.category || "Standard Apparel");
            categoryCounts[cat] = (categoryCounts[cat] || 0) + qty;
          });
        } else {
          // Fallback if no item array
          const total = Number(order.total_amount) || 0;
          stdRev += total;
          stdUnits += 1;
          orderHasStandard = true;
        }

        if (orderHasPremium) premOrders++;
        if (orderHasStandard) stdOrders++;
      });

      setPremiumRevenueStats({
        totalPremiumRevenue: premRev,
        totalStandardRevenue: stdRev,
        premiumUnitsCount: premUnits,
        standardUnitsCount: stdUnits,
        premiumOrdersCount: premOrders,
        standardOrdersCount: stdOrders,
      });

      // Format top products
      const sortedProducts = Object.keys(productCounts)
        .map(name => ({
          name,
          sales: productCounts[name].qty,
          revenue: productCounts[name].rev,
          isPremium: productCounts[name].isPremium
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

  // Active revenue calculation considering tier filter
  const totalRevenueAll = premiumRevenueStats.totalPremiumRevenue + premiumRevenueStats.totalStandardRevenue || revenueData.lifetimeRevenue;
  const premiumSharePct = totalRevenueAll > 0 
    ? Math.round((premiumRevenueStats.totalPremiumRevenue / totalRevenueAll) * 100) 
    : 45;

  const displayRevenue = useMemo(() => {
    if (tierFilter === "premium") return premiumRevenueStats.totalPremiumRevenue;
    if (tierFilter === "standard") return premiumRevenueStats.totalStandardRevenue;
    return totalRevenueAll;
  }, [tierFilter, premiumRevenueStats, totalRevenueAll]);

  const displayUnits = useMemo(() => {
    if (tierFilter === "premium") return premiumRevenueStats.premiumUnitsCount;
    if (tierFilter === "standard") return premiumRevenueStats.standardUnitsCount;
    return premiumRevenueStats.premiumUnitsCount + premiumRevenueStats.standardUnitsCount;
  }, [tierFilter, premiumRevenueStats]);

  const getMaxVal = (arr: number[]) => Math.max(...arr) || 1;
  const maxRev = getMaxVal(revenueTrend);
  const maxOrd = getMaxVal(orderTrend);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white uppercase">Revenue & Analytics Desk</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40">
              💎 Premium Split Active
            </span>
          </div>
          <p className="text-xs font-bold text-zinc-400 mt-0.5">
            Separated revenue tracking for Premium Store vs. Standard Apparel with unit margins and settlement reconciliation.
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

      {/* Tier Filter Toggle Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-2xl bg-zinc-950 border border-zinc-800">
        {/* Tier Tabs */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-black uppercase text-zinc-400 px-2">Revenue Stream:</span>
          {[
            { id: "all", label: "All Marketplace Revenue", icon: Layers },
            { id: "premium", label: "💎 Premium Store Revenue Only", icon: Crown },
            { id: "standard", label: "👕 Standard Apparel Only", icon: Shirt }
          ].map(tab => {
            const Icon = tab.icon;
            const isSelected = tierFilter === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setTierFilter(tab.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  isSelected
                    ? tab.id === "premium" 
                      ? "bg-amber-500 text-black shadow-md shadow-amber-500/20 font-extrabold"
                      : tab.id === "standard"
                      ? "bg-blue-600 text-white shadow-md font-extrabold"
                      : "bg-white text-black shadow-md font-extrabold"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                }`}
              >
                <Icon size={13} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Gross Revenue Card */}
        <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl relative overflow-hidden shadow-xl">
          <div className="h-10 w-10 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-2xl flex items-center justify-center absolute right-6 top-6">
            <IndianRupee size={18} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
            {tierFilter === "premium" ? "💎 Premium Revenue" : tierFilter === "standard" ? "👕 Standard Revenue" : "Total Marketplace Revenue"}
          </span>
          <p className="text-3xl font-black text-white mt-2">
            ₹{displayRevenue.toLocaleString("en-IN")}
          </p>
          <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-zinc-400 pt-2 border-t border-zinc-900">
            <span>Volume: {displayUnits} units</span>
            <span className="text-emerald-400 font-black flex items-center gap-1">
              <TrendingUp size={12} /> Active
            </span>
          </div>
        </div>

        {/* 2. Premium Store Sales Card */}
        <div className="bg-zinc-950 border border-amber-500/30 p-6 rounded-3xl relative overflow-hidden shadow-xl shadow-amber-500/5">
          <div className="h-10 w-10 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-2xl flex items-center justify-center absolute right-6 top-6 animate-pulse">
            <Crown size={18} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1">
            <Sparkles size={11} /> 💎 Premium Store Revenue
          </span>
          <p className="text-3xl font-black text-amber-300 mt-2">
            ₹{premiumRevenueStats.totalPremiumRevenue.toLocaleString("en-IN")}
          </p>
          <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-zinc-400 pt-2 border-t border-zinc-900">
            <span className="text-amber-400/90 font-black">{premiumSharePct}% of Gross Revenue</span>
            <span>{premiumRevenueStats.premiumUnitsCount} units</span>
          </div>
        </div>

        {/* 3. Standard Apparel Revenue Card */}
        <div className="bg-zinc-950 border border-blue-500/30 p-6 rounded-3xl relative overflow-hidden shadow-xl">
          <div className="h-10 w-10 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-2xl flex items-center justify-center absolute right-6 top-6">
            <Shirt size={18} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">
            👕 Standard Apparel Revenue
          </span>
          <p className="text-3xl font-black text-blue-300 mt-2">
            ₹{premiumRevenueStats.totalStandardRevenue.toLocaleString("en-IN")}
          </p>
          <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-zinc-400 pt-2 border-t border-zinc-900">
            <span>{100 - premiumSharePct}% Share</span>
            <span>{premiumRevenueStats.standardUnitsCount} units</span>
          </div>
        </div>

        {/* 4. Settlements Balance Card */}
        <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl relative overflow-hidden shadow-xl">
          <div className="h-10 w-10 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-2xl flex items-center justify-center absolute right-6 top-6">
            <Clock size={18} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
            Pending Settlements
          </span>
          <p className="text-3xl font-black text-purple-300 mt-2">
            ₹{revenueData.pendingSettlement.toLocaleString("en-IN")}
          </p>
          <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-zinc-400 pt-2 border-t border-zinc-900">
            <span className="text-emerald-400 font-bold">Avail: ₹{revenueData.availableBalance.toLocaleString("en-IN")}</span>
            <span>Weekly Cycle</span>
          </div>
        </div>
      </div>

      {/* Revenue Split Ratio Visualizer */}
      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crown size={16} className="text-amber-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-white">
              Revenue Stream Distribution (💎 Premium vs 👕 Standard)
            </h3>
          </div>
          <span className="text-xs font-black text-amber-400">
            Premium Share: {premiumSharePct}%
          </span>
        </div>

        {/* Segmented Multi-Color Progress Bar */}
        <div className="h-4 w-full rounded-full bg-zinc-900 overflow-hidden flex p-0.5 border border-zinc-800">
          <div 
            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-l-full transition-all duration-700" 
            style={{ width: `${premiumSharePct}%` }}
            title={`Premium Revenue: ₹${premiumRevenueStats.totalPremiumRevenue}`}
          />
          <div 
            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-r-full transition-all duration-700" 
            style={{ width: `${100 - premiumSharePct}%` }}
            title={`Standard Revenue: ₹${premiumRevenueStats.totalStandardRevenue}`}
          />
        </div>

        <div className="flex items-center justify-between text-xs font-bold text-zinc-400 pt-1">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-amber-400 inline-block" />
            <span className="text-white font-black">💎 Premium Store Vault: ₹{premiumRevenueStats.totalPremiumRevenue.toLocaleString("en-IN")}</span>
            <span className="text-zinc-500">({premiumRevenueStats.premiumUnitsCount} units sold)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-blue-500 inline-block" />
            <span className="text-white font-black">👕 Standard Apparel: ₹{premiumRevenueStats.totalStandardRevenue.toLocaleString("en-IN")}</span>
            <span className="text-zinc-500">({premiumRevenueStats.standardUnitsCount} units sold)</span>
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
                  d={revenueTrend.reduce((path, val, index) => {
                    const x = (index / (revenueTrend.length - 1)) * 100 + "%";
                    const y = (1 - val / maxRev) * 100 + "%";
                    return path + `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
                  }, "")}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                <path
                  d={orderTrend.reduce((path, val, index) => {
                    const x = (index / (orderTrend.length - 1)) * 100 + "%";
                    const y = (1 - val / maxOrd) * 100 + "%";
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
                {revenueTrend.map((_, i) => (
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
            {topCategories.map((c, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-zinc-300">{c.name}</span>
                  <span className="text-white font-mono">{c.percentage}%</span>
                </div>
                <div className="h-2 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      c.name.includes("Premium") ? "bg-amber-400" : "bg-emerald-500"
                    }`}
                    style={{ width: `${c.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Products Box with Tier Badges */}
      <div className="bg-zinc-950 border border-zinc-800 p-6 rounded-3xl shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-sm font-black text-white uppercase tracking-tight">Top Product Performers by Revenue</h3>
          <span className="text-[10px] font-bold text-zinc-400">Classified by Premium & Standard Tier</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-medium text-zinc-300 border-collapse">
            <thead>
              <tr className="bg-zinc-900/60 text-zinc-400 border-b border-zinc-800 uppercase tracking-widest font-black text-[9px]">
                <th className="px-6 py-4">Product Catalog Name</th>
                <th className="px-6 py-4">Tier</th>
                <th className="px-6 py-4 text-center">Sales Units</th>
                <th className="px-6 py-4 text-right">Revenue Generated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {topProducts.map((p, i) => (
                <tr key={i} className="hover:bg-zinc-900/40 font-bold transition-colors">
                  <td className="px-6 py-4 text-white font-black">{p.name}</td>
                  <td className="px-6 py-4">
                    {p.isPremium ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2.5 py-0.5 text-[9px] font-black uppercase">
                        <Crown size={10} /> 💎 PREMIUM
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 text-zinc-400 px-2.5 py-0.5 text-[9px] font-bold uppercase">
                        👕 Standard
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center text-zinc-400 font-mono">{p.sales} units</td>
                  <td className="px-6 py-4 text-right text-emerald-400 font-mono font-black">
                    ₹{p.revenue.toLocaleString("en-IN")}
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
