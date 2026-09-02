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
  Boxes
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

export default function SellerDashboard() {
  const [loading, setLoading] = useState(true);
  
  // All seller orders & products
  const [allSellerOrders, setAllSellerOrders] = useState<any[]>([]);
  const [sellerProducts, setSellerProducts] = useState<Product[]>([]);
  const [lowStockCount, setLowStockCount] = useState(0);

  // Filter controls state
  const [filterType, setFilterType] = useState<FilterType>("this_month");
  const [selectedDate, setSelectedDate] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [customStartDate, setCustomStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [customEndDate, setCustomEndDate] = useState<string>(() => new Date().toISOString().split("T")[0]);

  // Overall quick stats
  const [quickKPIs, setQuickKPIs] = useState({
    todayRevenue: 0,
    weeklyRevenue: 0,
    monthlyRevenue: 0,
    allTimeRevenue: 0,
    totalOrders: 0,
    todaysOrders: 0,
    pendingOrders: 0,
  });

  // Fetch all data
  async function fetchDashboardData() {
    try {
      let currentUserId: string | null = null;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        currentUserId = user.id;
      } else if (typeof window !== "undefined") {
        const cachedSession = localStorage.getItem("zebalpha_seller_session");
        if (cachedSession) {
          try {
            const parsed = JSON.parse(cachedSession);
            currentUserId = parsed.id || parsed.user_id || null;
          } catch (e) {}
        }
      }

      // 1. Fetch seller's products
      let queryProducts = supabase.from("products").select("*");
      if (currentUserId) {
        queryProducts = queryProducts.eq("seller_id", currentUserId);
      }
      const { data: products } = await queryProducts;
      const productsList = (products || []) as Product[];
      setSellerProducts(productsList);

      const pIds = productsList.map(p => p.id);
      const lowStock = productsList.filter(p => (p.stock ?? 0) <= (p.low_stock_limit ?? 5)).length;
      setLowStockCount(lowStock);

      // 2. Fetch orders
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
            const itemsRevenue = sellerItems.reduce((sum: number, item: any) =>
              sum + (item.subtotal || (item.price * item.quantity) || 0), 0);
            const orderRevenue = itemsRevenue > 0 ? itemsRevenue : (Number(order.total_amount) || 0);

            const totalUnits = sellerItems.reduce((sum: number, item: any) =>
              sum + (Number(item.quantity) || 1), 0) || 1;

            processedSellerOrders.push({
              ...order,
              _revenue: orderRevenue,
              _units: totalUnits,
              _sellerItems: sellerItems
            });
          }
        } catch (e) {
          console.error("Error processing order", order.id, e);
        }
      });

      setAllSellerOrders(processedSellerOrders);

      // 3. Compute Quick KPIs
      const now = new Date();
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      const weekStart = startOfWeek(now);
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);

      let todayRev = 0;
      let weekRev = 0;
      let monthRev = 0;
      let allRev = 0;
      let todayCount = 0;
      let pendingCount = 0;

      processedSellerOrders.forEach(o => {
        const d = new Date(o.created_at);
        const rev = Number(o._revenue) || 0;
        allRev += rev;

        if (d >= todayStart && d <= todayEnd) {
          todayRev += rev;
          todayCount++;
        }
        if (d >= weekStart && d <= todayEnd) {
          weekRev += rev;
        }
        if (d >= monthStart && d <= monthEnd) {
          monthRev += rev;
        }
        if (["placed", "pending", "processing", "PLACED", "PENDING", "PROCESSING"].includes(o.order_status || "")) {
          pendingCount++;
        }
      });

      setQuickKPIs({
        todayRevenue: todayRev,
        weeklyRevenue: weekRev,
        monthlyRevenue: monthRev,
        allTimeRevenue: allRev,
        totalOrders: processedSellerOrders.length,
        todaysOrders: todayCount,
        pendingOrders: pendingCount,
      });

    } catch (error) {
      console.error("Error fetching seller dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDashboardData();

    const channel = supabase
      .channel("seller-dashboard-realtime-enhanced")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchDashboardData())
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => fetchDashboardData())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Calculate selected filtered range & metrics ──────────────────────────────
  const { dateRange, periodLabel, filteredOrders, periodStats, timeBreakdown } = useMemo(() => {
    const now = new Date();
    let start = new Date(0);
    let end = new Date(3000, 0, 1);
    let label = "All Time";
    let groupMode: "hourly" | "daily" | "monthly" = "daily";

    if (filterType === "today") {
      start = startOfDay(now);
      end = endOfDay(now);
      label = `Today (${now.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })})`;
      groupMode = "hourly";
    } else if (filterType === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      start = startOfDay(y);
      end = endOfDay(y);
      label = `Yesterday (${y.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })})`;
      groupMode = "hourly";
    } else if (filterType === "this_week") {
      start = startOfWeek(now);
      end = endOfDay(now);
      label = `This Week (${start.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} - Today)`;
      groupMode = "daily";
    } else if (filterType === "this_month") {
      start = startOfMonth(now);
      end = endOfMonth(now);
      label = `${now.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}`;
      groupMode = "daily";
    } else if (filterType === "specific_month") {
      start = new Date(selectedYear, selectedMonth, 1, 0, 0, 0, 0);
      end = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59, 999);
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

    // Filter orders
    const matched = allSellerOrders.filter(o => {
      const d = new Date(o.created_at);
      return d >= start && d <= end;
    });

    // Compute stats
    const totalRev = matched.reduce((s, o) => s + (Number(o._revenue) || 0), 0);
    const totalUnits = matched.reduce((s, o) => s + (Number(o._units) || 1), 0);
    const orderCount = matched.length;
    const aov = orderCount > 0 ? totalRev / orderCount : 0;

    // Time-series breakdown grouping
    const groupMap: Record<string, { label: string; dateObj: Date; revenue: number; ordersCount: number; units: number }> = {};

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
        // monthly
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        groupLabel = d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
      }

      if (!groupMap[key]) {
        groupMap[key] = { label: groupLabel, dateObj: d, revenue: 0, ordersCount: 0, units: 0 };
      }
      groupMap[key].revenue += Number(o._revenue) || 0;
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
        orderCount,
        aov,
        totalUnits,
      },
      timeBreakdown: {
        items: breakdownList,
        maxRevenue: maxRev,
        mode: groupMode
      }
    };
  }, [allSellerOrders, filterType, selectedDate, selectedMonth, selectedYear, customStartDate, customEndDate]);

  const fmt = (n: number) => `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Quick navigation helpers for day picker
  const handleShiftDay = (delta: number) => {
    const current = selectedDate ? new Date(selectedDate) : new Date();
    current.setDate(current.getDate() + delta);
    setSelectedDate(current.toISOString().split("T")[0]);
  };

  // Quick navigation helpers for month picker
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

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
          <span className="text-xs font-bold text-text-muted">Loading metrics & income breakdown...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-[2.5rem] bg-gradient-to-r from-zinc-900 via-black to-zinc-950 p-8 text-white shadow-2xl border border-zinc-800 relative overflow-hidden">
        <div className="absolute -top-8 -right-8 h-40 w-40 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="relative z-10">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Overview</span>
          <h1 className="text-3xl font-black tracking-tight mt-1 text-white">Merchant Performance</h1>
          <p className="mt-2 text-xs font-bold text-zinc-400 max-w-xl">
            Track real-time revenue across custom dates, days, weeks, months, or all time with detailed earnings breakdowns.
          </p>
        </div>
      </div>

      {/* ── Quick KPI Summary Cards ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <IndianRupee size={16} className="text-white" />
          <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400">Quick Revenue Overview</h2>
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
            <p className="mt-4 text-2xl font-black tracking-tight text-white">{fmt(quickKPIs.todayRevenue)}</p>
            <span className="text-[10px] font-bold text-zinc-400 mt-1 inline-flex items-center gap-1">
              <TrendingUp size={11} /> Fresh Today ({quickKPIs.todaysOrders} orders)
            </span>
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
            <p className="mt-4 text-2xl font-black tracking-tight text-white">{fmt(quickKPIs.weeklyRevenue)}</p>
            <span className="text-[10px] font-bold text-zinc-400 mt-1 inline-flex items-center gap-1">
              <TrendingUp size={11} /> Sun → Today
            </span>
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
            <p className="mt-4 text-2xl font-black tracking-tight text-white">{fmt(quickKPIs.monthlyRevenue)}</p>
            <span className="text-[10px] font-bold text-zinc-400 mt-1 inline-flex items-center gap-1">
              <TrendingUp size={11} /> {new Date().toLocaleString("en-IN", { month: "long" })}
            </span>
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
            <p className="mt-4 text-2xl font-black tracking-tight text-white">{fmt(quickKPIs.allTimeRevenue)}</p>
            <span className="text-[10px] font-bold text-zinc-400 mt-1 inline-block">Total Cumulative</span>
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
              <h2 className="text-lg font-black tracking-tight text-white">Custom Income & Date Breakdown</h2>
            </div>
            <p className="text-xs font-bold text-zinc-400 mt-1">
              Filter by specific days, months, weeks, custom ranges, or inspect all-time revenue trends.
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
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
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

        {/* ── Sub-selector Controls depending on active filter ── */}
        {filterType === "specific_month" && (
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleShiftMonth(-1)}
                className="h-10 w-10 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white hover:bg-zinc-700 transition-all"
                title="Previous Month"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex items-center gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="bg-zinc-950 border border-zinc-700 text-white rounded-2xl px-4 py-2 text-xs font-black focus:outline-none focus:border-primary"
                >
                  {MONTH_NAMES.map((m, idx) => (
                    <option key={m} value={idx}>{m}</option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-zinc-950 border border-zinc-700 text-white rounded-2xl px-4 py-2 text-xs font-black focus:outline-none focus:border-primary"
                >
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <button 
                onClick={() => handleShiftMonth(1)}
                className="h-10 w-10 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white hover:bg-zinc-700 transition-all"
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
                className="h-10 w-10 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white hover:bg-zinc-700 transition-all"
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
                className="h-10 w-10 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white hover:bg-zinc-700 transition-all"
                title="Next Day"
              >
                <ChevronRight size={18} />
              </button>
              <button
                onClick={() => setSelectedDate(new Date().toISOString().split("T")[0])}
                className="text-[11px] font-black text-primary hover:underline px-2"
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
            <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Total Income ({periodLabel})</span>
            <p className="text-3xl font-black mt-2 text-emerald-400">{fmt(periodStats.totalRevenue)}</p>
            <span className="text-[10px] font-bold text-zinc-400 mt-1 block">Net merchant volume</span>
          </div>

          <div className="rounded-3xl bg-zinc-900/70 border border-zinc-800 p-5">
            <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Orders in Period</span>
            <p className="text-3xl font-black mt-2 text-white">{periodStats.orderCount}</p>
            <span className="text-[10px] font-bold text-zinc-400 mt-1 block">Placed customer checkouts</span>
          </div>

          <div className="rounded-3xl bg-zinc-900/70 border border-zinc-800 p-5">
            <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Average Order Value (AOV)</span>
            <p className="text-3xl font-black mt-2 text-amber-400">{fmt(periodStats.aov)}</p>
            <span className="text-[10px] font-bold text-zinc-400 mt-1 block">Avg revenue per purchase</span>
          </div>

          <div className="rounded-3xl bg-zinc-900/70 border border-zinc-800 p-5">
            <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Units Sold</span>
            <p className="text-3xl font-black mt-2 text-blue-400">{periodStats.totalUnits}</p>
            <span className="text-[10px] font-bold text-zinc-400 mt-1 block">Individual product items</span>
          </div>
        </div>

        {/* ── TIME-SERIES BREAKDOWN TIMELINE / LIST ── */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-zinc-300">
              {timeBreakdown.mode === "hourly" ? "Hourly Breakdown" : timeBreakdown.mode === "daily" ? "Daily Income Breakdown" : "Monthly Breakdown"}
            </h3>
            <span className="text-[11px] font-bold text-zinc-400">
              {timeBreakdown.items.length} {timeBreakdown.items.length === 1 ? "entry" : "entries"} recorded
            </span>
          </div>

          {timeBreakdown.items.length === 0 ? (
            <div className="py-10 text-center text-xs font-bold text-zinc-500 bg-zinc-900/30 rounded-3xl border border-zinc-800/80">
              No revenue transactions recorded for the selected period ({periodLabel}).
            </div>
          ) : (
            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {timeBreakdown.items.map((item, idx) => {
                const percentage = Math.round((item.revenue / timeBreakdown.maxRevenue) * 100);
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
                          {item.ordersCount} {item.ordersCount === 1 ? "order" : "orders"} • {item.units} units
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
                        {periodStats.totalRevenue > 0 ? `${Math.round((item.revenue / periodStats.totalRevenue) * 100)}% of period` : "0%"}
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
          <h2 className="text-sm font-black uppercase tracking-widest text-text-muted">Operations</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
          {/* Total Orders */}
          <div className="rounded-3xl bg-foreground/[0.03] p-5 border border-foreground/[0.06] backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Total Orders</span>
              <div className="h-8 w-8 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                <Receipt size={16} />
              </div>
            </div>
            <p className="mt-4 text-2xl font-black tracking-tight">{quickKPIs.totalOrders}</p>
            <span className="text-[10px] font-bold text-text-muted mt-1 inline-block">All Time</span>
          </div>

          {/* Today's Orders */}
          <div className="rounded-3xl bg-foreground/[0.03] p-5 border border-foreground/[0.06] backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Today</span>
              <div className="h-8 w-8 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600">
                <Clock size={16} />
              </div>
            </div>
            <p className="mt-4 text-2xl font-black tracking-tight">{quickKPIs.todaysOrders}</p>
            <span className="text-[10px] font-bold text-purple-600 mt-1 inline-block">Fresh Placed</span>
          </div>

          {/* Pending Orders */}
          <div className="rounded-3xl bg-foreground/[0.03] p-5 border border-foreground/[0.06] backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Pending</span>
              <div className="h-8 w-8 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                <Truck size={16} />
              </div>
            </div>
            <p className="mt-4 text-2xl font-black tracking-tight">{quickKPIs.pendingOrders}</p>
            <span className="text-[10px] font-bold text-amber-600 mt-1 inline-block">Needs Action</span>
          </div>

          {/* Products */}
          <div className="rounded-3xl bg-foreground/[0.03] p-5 border border-foreground/[0.06] backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Products</span>
              <div className="h-8 w-8 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <ShoppingBag size={16} />
              </div>
            </div>
            <p className="mt-4 text-2xl font-black tracking-tight">{sellerProducts.length}</p>
            <span className="text-[10px] font-bold text-text-muted mt-1 inline-block">Active Listings</span>
          </div>

          {/* Low Stock */}
          <div className="rounded-3xl bg-foreground/[0.03] p-5 border border-foreground/[0.06] backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Low Stock</span>
              <div className="h-8 w-8 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600">
                <AlertTriangle size={16} />
              </div>
            </div>
            <p className="mt-4 text-2xl font-black tracking-tight">{lowStockCount}</p>
            <span className="text-[10px] font-bold text-rose-600 mt-1 inline-block">Action Required</span>
          </div>
        </div>
      </div>

      {/* Orders within Selected Filter Period Table */}
      <div className="rounded-[2.5rem] bg-foreground/[0.03] border border-foreground/[0.06] p-6 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-black tracking-tight">Orders in Period ({periodLabel})</h2>
            <p className="text-xs font-bold text-text-secondary mt-0.5">
              Showing {filteredOrders.length} {filteredOrders.length === 1 ? "order" : "orders"} matching your selected date filter
            </p>
          </div>
          <Link
            href="/dashboard/orders"
            className="inline-flex items-center gap-1.5 text-xs font-black text-primary hover:underline"
          >
            <span>Full Order Management</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {filteredOrders.length === 0 ? (
          <div className="py-12 text-center text-text-muted text-xs font-bold">
            No orders found for this selected period ({periodLabel}). Choose another date or range above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-foreground/[0.06] text-[10px] font-black uppercase tracking-wider text-text-muted">
                  <th className="pb-3">Order #</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Date & Time</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Income (Amount)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/[0.04] text-xs font-bold">
                {filteredOrders.slice(0, 10).map((ord) => (
                  <tr key={ord.id} className="hover:bg-foreground/[0.02]">
                    <td className="py-4 font-black">{ord.order_number || String(ord.id).slice(0, 8)}</td>
                    <td className="py-4">{ord.customer_name || "Customer"}</td>
                    <td className="py-4 text-text-muted">
                      {new Date(ord.created_at).toLocaleString("en-IN", { 
                        day: "numeric", 
                        month: "short", 
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </td>
                    <td className="py-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        {ord.order_status || "Processing"}
                      </span>
                    </td>
                    <td className="py-4 text-right font-black text-emerald-500">
                      {fmt(Number(ord._revenue) || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredOrders.length > 10 && (
              <div className="mt-4 text-center border-t border-foreground/[0.04] pt-3">
                <Link href="/dashboard/orders" className="text-xs font-black text-primary hover:underline">
                  + View {filteredOrders.length - 10} more orders in orders tab
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
