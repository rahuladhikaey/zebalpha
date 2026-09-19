"use client";

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import type { Product, Order } from "@shared/types";
import { 
  ShoppingBag, 
  Receipt, 
  AlertTriangle, 
  ArrowRight, 
  Package, 
  TrendingUp, 
  Clock, 
  Truck, 
  IndianRupee, 
  CalendarDays, 
  Calendar, 
  BarChart3, 
  CalendarRange, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  CheckCircle2, 
  Boxes,
  Crown,
  Shirt,
  Sparkles,
  Layers
} from "lucide-react";
import Link from "next/link";

// ── Date range helpers ──────────────────────────────────────────────────────────
function startOfDay(d: Date)  { const r = new Date(d); r.setHours(0,0,0,0); return r; }
function endOfDay(d: Date)    { const r = new Date(d); r.setHours(23,59,59,999); return r; }
function startOfWeek(d: Date) { const r = new Date(d); r.setDate(r.getDate() - r.getDay()); r.setHours(0,0,0,0); return r; }
function startOfMonth(d: Date){ return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0); }
function endOfMonth(d: Date)  { return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999); }

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

type FilterType = "today" | "yesterday" | "this_week" | "this_month" | "specific_month" | "specific_day" | "custom" | "all";
type StreamFilterType = "all" | "premium" | "standard";

export default function SellerDashboard() {
  const [loading, setLoading] = useState(true);
  
  // All seller orders & products
  const [allSellerOrders, setAllSellerOrders] = useState<any[]>([]);
  const [sellerProducts, setSellerProducts] = useState<Product[]>([]);
  const [lowStockCount, setLowStockCount] = useState(0);

  // Filter controls state
  const [filterType, setFilterType] = useState<FilterType>("this_month");
  const [streamFilter, setStreamFilter] = useState<StreamFilterType>("all");
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => new Date().toISOString().split("T")[0]);

  // Overall quick stats with Premium vs Standard separation
  const [quickKPIs, setQuickKPIs] = useState({
    todayRevenue: 0,
    todayPremiumRevenue: 0,
    todayStandardRevenue: 0,
    weeklyRevenue: 0,
    weeklyPremiumRevenue: 0,
    weeklyStandardRevenue: 0,
    monthlyRevenue: 0,
    monthlyPremiumRevenue: 0,
    monthlyStandardRevenue: 0,
    allTimeRevenue: 0,
    allTimePremiumRevenue: 0,
    allTimeStandardRevenue: 0,
    totalOrders: 0,
    todaysOrders: 0,
    pendingOrders: 0,
    totalPremiumUnits: 0,
    totalStandardUnits: 0
  });

  // Fetch all data
  async function fetchDashboardData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/";
        return;
      }
      const currentUserId = user.id;

      // Fetch seller profile
      const { data: sProfile } = await supabase
        .from("sellers")
        .select("id")
        .eq("user_id", currentUserId)
        .maybeSingle();

      const sellerIdsToQuery = [currentUserId];
      if (sProfile?.id) sellerIdsToQuery.push(sProfile.id);

      // 1. Fetch seller's products
      let productsList: Product[] = [];
      try {
        const { data: products } = await supabase
          .from("products")
          .select("*")
          .in("seller_id", sellerIdsToQuery);
        productsList = (products || []) as Product[];
      } catch (_) {
        const { data: fallbackProducts } = await supabase
          .from("products")
          .select("*")
          .eq("seller_id", currentUserId);
        productsList = (fallbackProducts || []) as Product[];
      }

      setSellerProducts(productsList);

      const pIds = productsList.map(p => p.id);
      const premiumProductIdSet = new Set(
        productsList
          .filter(p => p.is_premium === true || p.tier === "PREMIUM" || (p.specifications as any)?.is_premium === "true" || (p.category && p.category.toLowerCase().includes("premium")))
          .map(p => String(p.id))
      );

      const lowStock = productsList.filter(p => (p.stock ?? 0) <= (p.low_stock_limit ?? 5)).length;
      setLowStockCount(lowStock);

      // 2. Fetch all orders
      const { data: orders } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      const rawOrders = (orders || []) as Order[];
      const processedSellerOrders: any[] = [];

      rawOrders.forEach(order => {
        try {
          const isDirectSellerOrder = currentUserId ? order.seller_id === currentUserId : true;
          let sellerItems: any[] = [];

          if (order.items && Array.isArray(order.items)) {
            if (pIds.length > 0) {
              sellerItems = order.items.filter((item: any) => pIds.includes(item.product_id || item.id));
            } else {
              sellerItems = order.items;
            }
          } else if (order.product_details) {
            try {
              const items = typeof order.product_details === "string"
                ? JSON.parse(order.product_details)
                : order.product_details;
              if (pIds.length > 0) {
                sellerItems = items.filter((item: any) => pIds.includes(item.id));
              } else {
                sellerItems = items;
              }
            } catch (_) {}
          }

          if (isDirectSellerOrder || sellerItems.length > 0 || !currentUserId) {
            let premRev = 0;
            let stdRev = 0;
            let premUnits = 0;
            let stdUnits = 0;

            sellerItems.forEach((item: any) => {
              const itemId = String(item.product_id || item.id || "");
              const itemTotal = item.subtotal || (item.price * item.quantity) || 0;
              const qty = Number(item.quantity) || 1;
              const isPrem = 
                item.is_premium === true || 
                item.tier === "PREMIUM" || 
                premiumProductIdSet.has(itemId) ||
                (item.name && item.name.toLowerCase().includes("premium")) ||
                (item.name && item.name.toLowerCase().includes("supima"));

              if (isPrem) {
                premRev += itemTotal;
                premUnits += qty;
              } else {
                stdRev += itemTotal;
                stdUnits += qty;
              }
            });

            const itemsRevenue = premRev + stdRev;
            const orderRevenue = itemsRevenue > 0 ? itemsRevenue : (Number(order.total_amount) || 0);
            const totalUnits = premUnits + stdUnits || 1;

            processedSellerOrders.push({
              ...order,
              _revenue: orderRevenue,
              _premiumRevenue: premRev,
              _standardRevenue: stdRev > 0 ? stdRev : (premRev > 0 ? 0 : orderRevenue),
              _units: totalUnits,
              _premiumUnits: premUnits,
              _standardUnits: stdUnits,
              _sellerItems: sellerItems,
              _isPremiumOrder: premRev > 0
            });
          }
        } catch (e) {
          console.error("Error processing order", order.id, e);
        }
      });

      setAllSellerOrders(processedSellerOrders);

      // 3. Compute Quick KPIs with Premium vs Standard
      const now = new Date();
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      const weekStart = startOfWeek(now);
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      let todayRev = 0, todayPrem = 0, todayStd = 0;
      let weekRev = 0, weekPrem = 0, weekStd = 0;
      let monthRev = 0, monthPrem = 0, monthStd = 0;
      let allRev = 0, allPrem = 0, allStd = 0;
      let totalPremUnits = 0, totalStdUnits = 0;
      let todayCount = 0;
      let pendingCount = 0;

      processedSellerOrders.forEach(o => {
        const d = new Date(o.created_at);
        const rev = Number(o._revenue) || 0;
        const pRev = Number(o._premiumRevenue) || 0;
        const sRev = Number(o._standardRevenue) || 0;
        const pU = Number(o._premiumUnits) || 0;
        const sU = Number(o._standardUnits) || 0;

        allRev += rev;
        allPrem += pRev;
        allStd += sRev;
        totalPremUnits += pU;
        totalStdUnits += sU;

        if (d >= todayStart && d <= todayEnd) {
          todayRev += rev;
          todayPrem += pRev;
          todayStd += sRev;
          todayCount++;
        }
        if (d >= weekStart && d <= todayEnd) {
          weekRev += rev;
          weekPrem += pRev;
          weekStd += sRev;
        }
        if (d >= monthStart && d <= monthEnd) {
          monthRev += rev;
          monthPrem += pRev;
          monthStd += sRev;
        }
        if (["placed", "pending", "processing", "PLACED", "PENDING", "PROCESSING"].includes(o.order_status || "")) {
          pendingCount++;
        }
      });

      setQuickKPIs({
        todayRevenue: todayRev,
        todayPremiumRevenue: todayPrem,
        todayStandardRevenue: todayStd,
        weeklyRevenue: weekRev,
        weeklyPremiumRevenue: weekPrem,
        weeklyStandardRevenue: weekStd,
        monthlyRevenue: monthRev,
        monthlyPremiumRevenue: monthPrem,
        monthlyStandardRevenue: monthStd,
        allTimeRevenue: allRev,
        allTimePremiumRevenue: allPrem,
        allTimeStandardRevenue: allStd,
        totalOrders: processedSellerOrders.length,
        todaysOrders: todayCount,
        pendingOrders: pendingCount,
        totalPremiumUnits: totalPremUnits,
        totalStandardUnits: totalStdUnits
      });

    } catch (error) {
      console.error("Error fetching seller dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // ── FILTERING & GROUPING ENGINE ────────────────────────────────────────────────
  const selectedPeriodData = useMemo(() => {
    const now = new Date();
    let start = new Date();
    let end = new Date();
    let label = "";
    let groupMode: "hourly" | "daily" | "monthly" = "daily";

    if (filterType === "today") {
      start = startOfDay(now);
      end = endOfDay(now);
      label = `Today (${now.toLocaleDateString("en-IN", { day: "numeric", month: "short" })})`;
      groupMode = "hourly";
    } else if (filterType === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      start = startOfDay(y);
      end = endOfDay(y);
      label = `Yesterday (${y.toLocaleDateString("en-IN", { day: "numeric", month: "short" })})`;
      groupMode = "hourly";
    } else if (filterType === "this_week") {
      start = startOfWeek(now);
      end = endOfDay(now);
      label = `This Week (Sun - Sat)`;
      groupMode = "daily";
    } else if (filterType === "this_month") {
      start = startOfMonth(now);
      end = endOfMonth(now);
      label = `This Month (${now.toLocaleString("en-IN", { month: "long" })})`;
      groupMode = "daily";
    } else if (filterType === "specific_month") {
      const targetM = new Date(selectedYear, selectedMonth, 1);
      start = startOfMonth(targetM);
      end = endOfMonth(targetM);
      label = `${MONTH_NAMES[selectedMonth]} ${selectedYear}`;
      groupMode = "daily";
    } else if (filterType === "specific_day") {
      if (selectedDate) {
        const [yy, mm, dd] = selectedDate.split("-").map(Number);
        const targetD = new Date(yy, mm - 1, dd);
        start = startOfDay(targetD);
        end = endOfDay(targetD);
        label = targetD.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
      }
      groupMode = "hourly";
    } else if (filterType === "custom") {
      if (customStartDate) {
        const [sY, sM, sD] = customStartDate.split("-").map(Number);
        start = startOfDay(new Date(sY, sM - 1, sD));
      }
      if (customEndDate) {
        const [eY, eM, eD] = customEndDate.split("-").map(Number);
        end = endOfDay(new Date(eY, eM - 1, eD));
      }
      label = `${new Date(start).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} — ${new Date(end).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`;
      
      const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      groupMode = diffDays > 60 ? "monthly" : "daily";
    } else if (filterType === "all") {
      start = new Date(2020, 0, 1);
      end = new Date(3000, 0, 1);
      label = "All Time History";
      groupMode = "monthly";
    }

    // Filter orders by Date & Stream
    const matched = allSellerOrders.filter(o => {
      const d = new Date(o.created_at);
      const matchesDate = d >= start && d <= end;
      if (!matchesDate) return false;

      if (streamFilter === "premium") {
        return (Number(o._premiumRevenue) || 0) > 0;
      }
      if (streamFilter === "standard") {
        return (Number(o._standardRevenue) || 0) > 0;
      }
      return true;
    });

    // Compute stats
    let totalRev = 0;
    let totalPremRev = 0;
    let totalStdRev = 0;
    let totalUnits = 0;
    let totalPremUnits = 0;
    let totalStdUnits = 0;

    matched.forEach(o => {
      const pRev = Number(o._premiumRevenue) || 0;
      const sRev = Number(o._standardRevenue) || 0;
      const pU = Number(o._premiumUnits) || 0;
      const sU = Number(o._standardUnits) || 0;

      if (streamFilter === "premium") {
        totalRev += pRev;
        totalUnits += pU;
      } else if (streamFilter === "standard") {
        totalRev += sRev;
        totalUnits += sU;
      } else {
        totalRev += (pRev + sRev) || (Number(o._revenue) || 0);
        totalUnits += (pU + sU) || (Number(o._units) || 1);
      }

      totalPremRev += pRev;
      totalStdRev += sRev;
      totalPremUnits += pU;
      totalStdUnits += sU;
    });

    const orderCount = matched.length;
    const aov = orderCount > 0 ? totalRev / orderCount : 0;

    // Time-series breakdown grouping
    const groupMap: Record<string, { label: string; dateObj: Date; revenue: number; premiumRevenue: number; standardRevenue: number; ordersCount: number; units: number }> = {};

    matched.forEach(o => {
      const d = new Date(o.created_at);
      let key = "";
      let groupLabel = "";

      if (groupMode === "hourly") {
        const hour = d.getHours();
        key = `hour_${hour}`;
        const ampm = hour >= 12 ? "PM" : "AM";
        const h12 = hour % 12 || 12;
        groupLabel = `${h12}:00 ${ampm} - ${h12}:59 ${ampm}`;
      } else if (groupMode === "daily") {
        key = d.toISOString().split("T")[0];
        groupLabel = d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
      } else {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        groupLabel = d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
      }

      if (!groupMap[key]) {
        groupMap[key] = { label: groupLabel, dateObj: d, revenue: 0, premiumRevenue: 0, standardRevenue: 0, ordersCount: 0, units: 0 };
      }

      const revToAdd = streamFilter === "premium" ? (o._premiumRevenue || 0) : streamFilter === "standard" ? (o._standardRevenue || 0) : (o._revenue || 0);
      groupMap[key].revenue += Number(revToAdd);
      groupMap[key].premiumRevenue += Number(o._premiumRevenue) || 0;
      groupMap[key].standardRevenue += Number(o._standardRevenue) || 0;
      groupMap[key].ordersCount += 1;
      groupMap[key].units += Number(o._units) || 1;
    });

    const breakdownList = Object.values(groupMap).sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
    const maxRev = Math.max(...breakdownList.map(b => b.revenue), 1);

    return {
      dateRange: { start, end },
      periodLabel: label,
      filteredOrders: matched,
      periodStats: {
        totalRevenue: totalRev,
        totalPremRevenue: totalPremRev,
        totalStdRevenue: totalStdRev,
        orderCount,
        aov,
        totalUnits,
        totalPremUnits,
        totalStdUnits
      },
      timeBreakdown: {
        items: breakdownList,
        maxRevenue: maxRev,
        mode: groupMode
      }
    };
  }, [allSellerOrders, filterType, streamFilter, selectedDate, selectedMonth, selectedYear, customStartDate, customEndDate]);

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleShiftDay = (delta: number) => {
    const current = selectedDate ? new Date(selectedDate) : new Date();
    current.setDate(current.getDate() + delta);
    setSelectedDate(current.toISOString().split("T")[0]);
  };

  const handleShiftMonth = (delta: number) => {
    let newM = selectedMonth + delta;
    let newY = selectedYear;
    if (newM > 11) {
      newM = 0;
      newY += 1;
    } else if (newM < 0) {
      newM = 11;
      newY -= 1;
    }
    setSelectedMonth(newM);
    setSelectedYear(newY);
  };

  const allTimeTotal = quickKPIs.allTimeRevenue || 1;
  const premiumSharePct = Math.round((quickKPIs.allTimePremiumRevenue / allTimeTotal) * 100) || 0;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white" />
          <span className="text-xs text-zinc-400 font-bold">Loading seller revenue metrics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-[2.5rem] bg-gradient-to-r from-zinc-900 via-black to-zinc-950 p-8 text-white shadow-2xl border border-zinc-800 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Overview & Ledger</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 text-[9px] font-black uppercase">
                <Crown size={10} /> 💎 Premium Revenue Engine
              </span>
            </div>
            <h1 className="text-3xl font-black tracking-tight mt-1 text-white">Merchant Performance</h1>
            <p className="mt-2 text-xs font-bold text-zinc-400 max-w-xl">
              Track real-time earnings with separated calculations for Premium Store vs. Standard collections.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/collections"
              className="px-4 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs font-black uppercase text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all flex items-center gap-2"
            >
              <Sparkles size={14} className="text-amber-400" />
              <span>Collections & Drops</span>
            </Link>
            <Link
              href="/dashboard/reports"
              className="px-4 py-2.5 rounded-2xl bg-white text-black text-xs font-black uppercase hover:bg-zinc-200 transition-all shadow-md flex items-center gap-2"
            >
              <Receipt size={14} />
              <span>Export Ledger</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ── Revenue Stream Switcher ── */}
      <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 p-2 rounded-2xl w-fit flex-wrap">
        <span className="text-[10px] font-black uppercase text-zinc-400 px-2">Filter Stream:</span>
        <button
          onClick={() => setStreamFilter("all")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            streamFilter === "all"
              ? "bg-white text-black shadow-md font-extrabold"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Layers size={13} />
          <span>All Revenue</span>
        </button>

        <button
          onClick={() => setStreamFilter("premium")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            streamFilter === "premium"
              ? "bg-amber-500 text-black shadow-md font-extrabold"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Crown size={13} className={streamFilter === "premium" ? "text-black" : "text-amber-400"} />
          <span>💎 Premium Store</span>
        </button>

        <button
          onClick={() => setStreamFilter("standard")}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
            streamFilter === "standard"
              ? "bg-blue-600 text-white shadow-md font-extrabold"
              : "text-zinc-400 hover:text-white"
          }`}
        >
          <Shirt size={13} />
          <span>👕 Standard Apparel</span>
        </button>
      </div>

      {/* ── Quick KPI Summary Cards with Separated Revenue ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <IndianRupee size={16} className="text-white" />
            <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400">Quick Revenue Overview</h2>
          </div>
          <span className="text-xs font-black text-amber-400 flex items-center gap-1">
            <Crown size={13} /> Premium Share: {premiumSharePct}%
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Today */}
          <div 
            onClick={() => setFilterType("today")}
            className={`rounded-3xl p-5 shadow-xl transition-all cursor-pointer border ${
              filterType === "today" 
                ? "bg-zinc-900 border-primary ring-2 ring-primary/20" 
                : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Today</span>
              <div className="h-9 w-9 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400">
                <Clock size={18} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-black tracking-tight text-white">
              {fmt(streamFilter === "premium" ? quickKPIs.todayPremiumRevenue : streamFilter === "standard" ? quickKPIs.todayStandardRevenue : quickKPIs.todayRevenue)}
            </p>
            <div className="mt-2 text-[10px] font-bold text-zinc-400 pt-2 border-t border-zinc-900 flex items-center justify-between">
              <span className="text-amber-400">💎 Prem: {fmt(quickKPIs.todayPremiumRevenue)}</span>
              <span>👕 Std: {fmt(quickKPIs.todayStandardRevenue)}</span>
            </div>
          </div>

          {/* This Week */}
          <div 
            onClick={() => setFilterType("this_week")}
            className={`rounded-3xl p-5 shadow-xl transition-all cursor-pointer border ${
              filterType === "this_week" 
                ? "bg-zinc-900 border-primary ring-2 ring-primary/20" 
                : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">This Week</span>
              <div className="h-9 w-9 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-blue-400">
                <CalendarDays size={18} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-black tracking-tight text-white">
              {fmt(streamFilter === "premium" ? quickKPIs.weeklyPremiumRevenue : streamFilter === "standard" ? quickKPIs.weeklyStandardRevenue : quickKPIs.weeklyRevenue)}
            </p>
            <div className="mt-2 text-[10px] font-bold text-zinc-400 pt-2 border-t border-zinc-900 flex items-center justify-between">
              <span className="text-amber-400">💎 Prem: {fmt(quickKPIs.weeklyPremiumRevenue)}</span>
              <span>👕 Std: {fmt(quickKPIs.weeklyStandardRevenue)}</span>
            </div>
          </div>

          {/* This Month */}
          <div 
            onClick={() => setFilterType("this_month")}
            className={`rounded-3xl p-5 shadow-xl transition-all cursor-pointer border ${
              filterType === "this_month" 
                ? "bg-zinc-900 border-primary ring-2 ring-primary/20" 
                : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">This Month</span>
              <div className="h-9 w-9 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-400">
                <Calendar size={18} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-black tracking-tight text-white">
              {fmt(streamFilter === "premium" ? quickKPIs.monthlyPremiumRevenue : streamFilter === "standard" ? quickKPIs.monthlyStandardRevenue : quickKPIs.monthlyRevenue)}
            </p>
            <div className="mt-2 text-[10px] font-bold text-zinc-400 pt-2 border-t border-zinc-900 flex items-center justify-between">
              <span className="text-amber-400">💎 Prem: {fmt(quickKPIs.monthlyPremiumRevenue)}</span>
              <span>👕 Std: {fmt(quickKPIs.monthlyStandardRevenue)}</span>
            </div>
          </div>

          {/* All Time */}
          <div 
            onClick={() => setFilterType("all")}
            className={`rounded-3xl p-5 shadow-xl transition-all cursor-pointer border ${
              filterType === "all" 
                ? "bg-zinc-900 border-primary ring-2 ring-primary/20" 
                : "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">All Time</span>
              <div className="h-9 w-9 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-purple-400">
                <BarChart3 size={18} />
              </div>
            </div>
            <p className="mt-3 text-2xl font-black tracking-tight text-white">
              {fmt(streamFilter === "premium" ? quickKPIs.allTimePremiumRevenue : streamFilter === "standard" ? quickKPIs.allTimeStandardRevenue : quickKPIs.allTimeRevenue)}
            </p>
            <div className="mt-2 text-[10px] font-bold text-zinc-400 pt-2 border-t border-zinc-900 flex items-center justify-between">
              <span className="text-amber-400">💎 Prem: {fmt(quickKPIs.allTimePremiumRevenue)}</span>
              <span>👕 Std: {fmt(quickKPIs.allTimeStandardRevenue)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── INTERACTIVE DATE & MONTH SELECTOR ENGINE ── */}
      <div className="rounded-[2.5rem] bg-zinc-950 border border-zinc-800 p-6 md:p-8 shadow-2xl space-y-6">
        {/* Header & Filter Mode Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-primary" />
              <h2 className="text-lg font-black tracking-tight text-white">Income & Tier Period Analytics</h2>
            </div>
            <p className="text-xs font-bold text-zinc-400 mt-1">
              Showing {streamFilter === "premium" ? "💎 Premium Store" : streamFilter === "standard" ? "👕 Standard Apparel" : "All Marketplace"} earnings for {selectedPeriodData.periodLabel}.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap gap-1.5 bg-zinc-900/90 p-1.5 rounded-2xl border border-zinc-800">
            {[
              { key: "today", label: "Today" },
              { key: "yesterday", label: "Yesterday" },
              { key: "this_week", label: "This Week" },
              { key: "this_month", label: "This Month" },
              { key: "specific_month", label: "Select Month" },
              { key: "specific_day", label: "Select Day" },
              { key: "custom", label: "Custom Range" },
              { key: "all", label: "All Time" },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setFilterType(t.key as FilterType)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  filterType === t.key
                    ? "bg-white text-black shadow-md shadow-white/10"
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Sub-selector Controls ── */}
        {filterType === "specific_month" && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleShiftMonth(-1)}
                className="h-10 w-10 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white hover:bg-zinc-700 transition-all cursor-pointer"
                title="Previous Month"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex items-center gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="bg-zinc-950 border border-zinc-700 text-white rounded-2xl px-4 py-2 text-xs font-black focus:outline-none focus:border-primary cursor-pointer"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={idx}>{m}</option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-zinc-950 border border-zinc-700 text-white rounded-2xl px-4 py-2 text-xs font-black focus:outline-none focus:border-primary cursor-pointer"
                >
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <button 
                onClick={() => handleShiftMonth(1)}
                className="h-10 w-10 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white hover:bg-zinc-700 transition-all cursor-pointer"
                title="Next Month"
              >
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="text-xs font-bold text-zinc-400">
              Showing earnings for <span className="text-white font-black">{MONTH_NAMES[selectedMonth]} {selectedYear}</span>
            </div>
          </div>
        )}

        {filterType === "specific_day" && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleShiftDay(-1)}
                className="h-10 w-10 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white hover:bg-zinc-700 transition-all cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft size={18} />
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-zinc-950 border border-zinc-700 text-white rounded-2xl px-4 py-2 text-xs font-black focus:outline-none focus:border-primary cursor-pointer"
              />
              <button 
                onClick={() => handleShiftDay(1)}
                className="h-10 w-10 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white hover:bg-zinc-700 transition-all cursor-pointer"
                title="Next Day"
              >
                <ChevronRight size={18} />
              </button>
              <button
                onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
                className="text-[11px] font-black text-primary hover:underline px-2 cursor-pointer"
              >
                Today
              </button>
            </div>
            <div className="text-xs font-bold text-zinc-400">
              Selected Single Day: <span className="text-white font-black">{selectedDate}</span>
            </div>
          </div>
        )}

        {filterType === "custom" && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-zinc-400">From:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="bg-zinc-950 border border-zinc-700 text-white rounded-2xl px-4 py-2 text-xs font-black focus:outline-none focus:border-primary cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-zinc-400">To:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="bg-zinc-950 border border-zinc-700 text-white rounded-2xl px-4 py-2 text-xs font-black focus:outline-none focus:border-primary cursor-pointer"
                />
              </div>
            </div>
            <div className="text-xs font-bold text-zinc-400">
              Custom Range Selected
            </div>
          </div>
        )}

        {/* ── SELECTED PERIOD PERFORMANCE METRICS ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-3xl bg-zinc-900/70 border border-zinc-800 p-5 relative overflow-hidden">
            <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">
              {streamFilter === "premium" ? "💎 Premium Income" : streamFilter === "standard" ? "👕 Standard Income" : "Period Gross Income"}
            </span>
            <p className="text-3xl font-black mt-2 text-emerald-400">{fmt(selectedPeriodData.periodStats.totalRevenue)}</p>
            <span className="text-[10px] font-bold text-zinc-400 mt-1 block">
              {streamFilter === "all" ? `💎 ${fmt(selectedPeriodData.periodStats.totalPremRevenue)} Prem • 👕 ${fmt(selectedPeriodData.periodStats.totalStdRevenue)} Std` : "Net period volume"}
            </span>
          </div>

          <div className="rounded-3xl bg-zinc-900/70 border border-zinc-800 p-5">
            <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Orders in Period</span>
            <p className="text-3xl font-black mt-2 text-white">{selectedPeriodData.periodStats.orderCount}</p>
            <span className="text-[10px] font-bold text-zinc-400 mt-1 block">Placed customer checkouts</span>
          </div>

          <div className="rounded-3xl bg-zinc-900/70 border border-zinc-800 p-5">
            <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Average Order Value (AOV)</span>
            <p className="text-3xl font-black mt-2 text-amber-400">{fmt(selectedPeriodData.periodStats.aov)}</p>
            <span className="text-[10px] font-bold text-zinc-400 mt-1 block">Avg revenue per purchase</span>
          </div>

          <div className="rounded-3xl bg-zinc-900/70 border border-zinc-800 p-5">
            <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Units Sold</span>
            <p className="text-3xl font-black mt-2 text-blue-400">{selectedPeriodData.periodStats.totalUnits}</p>
            <span className="text-[10px] font-bold text-zinc-400 mt-1 block">
              {selectedPeriodData.periodStats.totalPremUnits} 💎 Premium • {selectedPeriodData.periodStats.totalStdUnits} 👕 Std
            </span>
          </div>
        </div>

        {/* ── TIME-SERIES BREAKDOWN TIMELINE / LIST ── */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-zinc-300">
              {selectedPeriodData.timeBreakdown.mode === "hourly" ? "Hourly Income Breakdown" : selectedPeriodData.timeBreakdown.mode === "daily" ? "Daily Income Breakdown" : "Monthly Breakdown"}
            </h3>
            <span className="text-[11px] font-bold text-zinc-400">
              {selectedPeriodData.timeBreakdown.items.length} entries recorded
            </span>
          </div>

          {selectedPeriodData.timeBreakdown.items.length === 0 ? (
            <div className="py-10 text-center text-xs font-bold text-zinc-500 bg-zinc-900/30 rounded-3xl border border-zinc-800/80">
              No revenue transactions recorded for the selected period ({selectedPeriodData.periodLabel}).
            </div>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {selectedPeriodData.timeBreakdown.items.map((item, idx) => {
                const percentage = Math.round((item.revenue / selectedPeriodData.timeBreakdown.maxRevenue) * 100);
                return (
                  <div 
                    key={idx}
                    className="rounded-2xl bg-zinc-900/80 border border-zinc-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-zinc-700 transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-[160px]">
                      <div className="h-8 w-8 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-300 text-xs font-black shrink-0">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-xs font-black text-white">{item.label}</p>
                        <p className="text-[10px] font-bold text-zinc-400">
                          {item.ordersCount} orders • 💎 ₹{item.premiumRevenue} Prem | 👕 ₹{item.standardRevenue} Std
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar Meter */}
                    <div className="flex-1 mx-2 hidden md:block">
                      <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(percentage, 5)}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-black text-emerald-400 block font-mono">
                        {fmt(item.revenue)}
                      </span>
                      <span className="text-[10px] font-bold text-zinc-400">
                        {selectedPeriodData.periodStats.totalRevenue > 0 ? `${Math.round((item.revenue / selectedPeriodData.periodStats.totalRevenue) * 100)}% of period` : "0%"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Operations Metric Cards ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Package size={16} className="text-primary" />
          <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400">Operations Overview</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
          {/* Total Orders */}
          <div className="rounded-3xl bg-zinc-950 p-5 border border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Total Orders</span>
              <div className="h-8 w-8 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Receipt size={16} />
              </div>
            </div>
            <p className="mt-4 text-2xl font-black text-white">{quickKPIs.totalOrders}</p>
            <span className="text-[10px] font-bold text-zinc-400 mt-1 inline-block">All Time</span>
          </div>

          {/* Today's Orders */}
          <div className="rounded-3xl bg-zinc-950 p-5 border border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Today</span>
              <div className="h-8 w-8 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                <Clock size={16} />
              </div>
            </div>
            <p className="mt-4 text-2xl font-black text-white">{quickKPIs.todaysOrders}</p>
            <span className="text-[10px] font-bold text-zinc-400 mt-1 inline-block">Active Today</span>
          </div>

          {/* Low Stock Warning */}
          <div className="rounded-3xl bg-zinc-950 p-5 border border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Low Stock Alert</span>
              <div className="h-8 w-8 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-400">
                <AlertTriangle size={16} />
              </div>
            </div>
            <p className="mt-4 text-2xl font-black text-rose-400">{lowStockCount}</p>
            <span className="text-[10px] font-bold text-zinc-400 mt-1 inline-block">Need Restock</span>
          </div>

          {/* Products Listed */}
          <div className="rounded-3xl bg-zinc-950 p-5 border border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Active Products</span>
              <div className="h-8 w-8 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <Boxes size={16} />
              </div>
            </div>
            <p className="mt-4 text-2xl font-black text-white">{sellerProducts.length}</p>
            <span className="text-[10px] font-bold text-zinc-400 mt-1 inline-block">
              {sellerProducts.filter(p => p.is_premium).length} 💎 Premium Items
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
