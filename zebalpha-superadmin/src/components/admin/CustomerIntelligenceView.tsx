"use client";

import { useState, useEffect, useMemo, useCallback } from "react";

interface Customer360 {
  id: string;
  name: string;
  email_masked: string;
  phone_masked: string;
  phone_raw: string;
  registration_date: string;
  last_login: string;
  last_active: string;
  is_online: boolean;
  platform_preference: "android" | "website";
  is_guest: boolean;
  total_orders: number;
  delivered_orders: number;
  cancelled_orders: number;
  returned_orders: number;
  total_purchase_value: number;
  segment: "New" | "Repeat" | "Loyal";
  orders: any[];
}

interface IntelligenceData {
  liveMonitor: {
    currentlyOnlineTotal: number;
    onlineAndroidCount: number;
    onlineWebsiteCount: number;
    onlineGuestCount: number;
    inactivityTimeoutSeconds: number;
    lastUpdated: string;
  };
  kpis: {
    totalCustomers: number;
    registeredCount: number;
    guestShoppersCount: number;
    purchasedCustomersCount: number;
    repeatCustomerRate: number;
    repeatCustomersCount: number;
    newCustomersCount: number;
    repeatSegmentCount: number;
    loyalSegmentCount: number;
    firstTimeRevenue: number;
    repeatRevenue: number;
    totalDeliveredRevenue: number;
    averageClv: number;
    ordersPerCustomer: string;
  };
  loginAnalytics: {
    uniqueLoginsToday: number;
    uniqueLoginsLast7D: number;
    uniqueLoginsLast30D: number;
    totalSuccessfulLogins: number;
    totalFailedLogins: number;
    loginMethodsBreakdown: Record<string, number>;
  };
  retention: {
    retention7D: number;
    retention30D: number;
    retention90D: number;
    inactiveCount: number;
  };
  config: {
    new_max_delivered: number;
    repeat_min_delivered: number;
    repeat_max_delivered: number;
    loyal_min_delivered: number;
    inactivity_timeout_seconds: number;
  };
  customers: Customer360[];
  totalFiltered: number;
}

export default function CustomerIntelligenceView() {
  const [data, setData] = useState<IntelligenceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer360 | null>(null);

  // Config Modal State
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configNewMax, setConfigNewMax] = useState(1);
  const [configRepeatMin, setConfigRepeatMin] = useState(2);
  const [configRepeatMax, setConfigRepeatMax] = useState(4);
  const [configLoyalMin, setConfigLoyalMin] = useState(5);
  const [configTimeout, setConfigTimeout] = useState(120);
  const [savingConfig, setSavingConfig] = useState(false);

  // Fetch Intelligence Data
  const fetchIntelligence = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (segmentFilter !== "all") params.set("segment", segmentFilter);
      if (platformFilter !== "all") params.set("platform", platformFilter);

      const res = await fetch(`/api/admin/customer-intelligence?${params.toString()}`);
      const json = await res.json();
      if (json.success && json.data) {
        setData(json.data);
        if (json.data.config) {
          setConfigNewMax(json.data.config.new_max_delivered);
          setConfigRepeatMin(json.data.config.repeat_min_delivered);
          setConfigRepeatMax(json.data.config.repeat_max_delivered);
          setConfigLoyalMin(json.data.config.loyal_min_delivered);
          setConfigTimeout(json.data.config.inactivity_timeout_seconds);
        }
      }
    } catch (err) {
      console.error("Failed to load customer intelligence:", err);
    } finally {
      setLoading(false);
    }
  }, [search, segmentFilter, platformFilter]);

  useEffect(() => {
    fetchIntelligence();
    // Auto-refresh live online users every 30 seconds
    const interval = setInterval(fetchIntelligence, 30000);
    return () => clearInterval(interval);
  }, [fetchIntelligence]);

  // Handle Config Save
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingConfig(true);
    try {
      const res = await fetch("/api/admin/customer-intelligence/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          new_max_delivered: configNewMax,
          repeat_min_delivered: configRepeatMin,
          repeat_max_delivered: configRepeatMax,
          loyal_min_delivered: configLoyalMin,
          inactivity_timeout_seconds: configTimeout,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsConfigOpen(false);
        fetchIntelligence();
      } else {
        alert(json.message || "Failed to save configuration");
      }
    } catch {
      alert("Error saving rules configuration");
    } finally {
      setSavingConfig(false);
    }
  };

  // View Customer Details
  const handleViewCustomer = async (cust: Customer360) => {
    setSelectedCustomer(cust);
    try {
      // Trigger audit logged single profile fetch
      await fetch(`/api/admin/customer-intelligence?customerId=${encodeURIComponent(cust.id)}`);
    } catch {}
  };

  const lm = data?.liveMonitor;
  const kpis = data?.kpis;
  const logins = data?.loginAnalytics;
  const ret = data?.retention;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 text-white">
      {/* 🔴 LIVE USER MONITOR BAR */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-zinc-950 via-zinc-900 to-black border border-emerald-500/30 p-6 sm:p-8 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="relative flex items-center justify-center h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <span className="absolute flex h-3 w-3 -top-1 -right-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Live Customer Monitor</span>
                <span className="text-[10px] font-bold text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-full border border-zinc-700">
                  {lm?.inactivityTimeoutSeconds || 120}s heartbeat timeout
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-baseline gap-3 mt-1">
                {lm?.currentlyOnlineTotal ?? 0}
                <span className="text-sm font-bold text-zinc-400 tracking-normal uppercase">Customers Currently Online</span>
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 sm:gap-6 bg-black/60 p-3 sm:p-4 rounded-2xl border border-zinc-800">
            <div className="text-center px-2">
              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Android App</span>
              <p className="text-lg font-black text-emerald-400 mt-1">{lm?.onlineAndroidCount ?? 0}</p>
            </div>
            <div className="text-center border-x border-zinc-800 px-2">
              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Customer Web</span>
              <p className="text-lg font-black text-sky-400 mt-1">{lm?.onlineWebsiteCount ?? 0}</p>
            </div>
            <div className="text-center px-2">
              <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Active Guests</span>
              <p className="text-lg font-black text-amber-400 mt-1">{lm?.onlineGuestCount ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 📊 ENTERPRISE CUSTOMER KPIS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 bg-zinc-950 rounded-2xl border border-zinc-800 shadow-lg">
          <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Total Customers</span>
          <p className="text-2xl sm:text-3xl font-black text-white mt-2">{kpis?.totalCustomers ?? 0}</p>
          <p className="text-[11px] font-bold text-zinc-500 mt-1">
            {kpis?.registeredCount ?? 0} registered • {kpis?.guestShoppersCount ?? 0} guest shoppers
          </p>
        </div>

        <div className="p-5 bg-zinc-950 rounded-2xl border border-zinc-800 shadow-lg">
          <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Repeat Purchase Rate</span>
          <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-2">{kpis?.repeatCustomerRate ?? 0}%</p>
          <p className="text-[11px] font-bold text-zinc-500 mt-1">
            {kpis?.repeatCustomersCount ?? 0} repeat & loyal buyers
          </p>
        </div>

        <div className="p-5 bg-zinc-950 rounded-2xl border border-zinc-800 shadow-lg">
          <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Unique Logins Today</span>
          <p className="text-2xl sm:text-3xl font-black text-sky-400 mt-2">{logins?.uniqueLoginsToday ?? 0}</p>
          <p className="text-[11px] font-bold text-zinc-500 mt-1">
            {logins?.uniqueLoginsLast7D ?? 0} in 7d • {logins?.uniqueLoginsLast30D ?? 0} in 30d
          </p>
        </div>

        <div className="p-5 bg-zinc-950 rounded-2xl border border-zinc-800 shadow-lg">
          <span className="text-[10px] font-black uppercase text-zinc-400 tracking-wider">Customer Lifetime Value</span>
          <p className="text-2xl sm:text-3xl font-black text-amber-400 mt-2">₹{kpis?.averageClv?.toLocaleString() ?? 0}</p>
          <p className="text-[11px] font-bold text-zinc-500 mt-1">
            {kpis?.ordersPerCustomer ?? "0"} avg orders / customer
          </p>
        </div>
      </div>

      {/* 🔄 REPEAT REVENUE & RETENTION BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Repeat vs First-Time Revenue */}
        <div className="lg:col-span-2 bg-zinc-950 rounded-3xl p-6 border border-zinc-800 shadow-xl">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-6">
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-white">First-Time vs Repeat Order Revenue</h3>
              <p className="text-xs font-bold text-zinc-400 mt-0.5">Flipkart / Meesho repeat sales attribution</p>
            </div>
            <button
              onClick={() => setIsConfigOpen(true)}
              className="text-xs font-black uppercase px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              ⚙️ Configure Rules
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-zinc-900/60 rounded-2xl border border-zinc-800">
              <span className="text-[10px] font-black uppercase text-zinc-400">First-Time Customer Sales</span>
              <p className="text-2xl font-black text-white mt-1">₹{kpis?.firstTimeRevenue?.toLocaleString() ?? 0}</p>
              <span className="text-[10px] font-bold text-zinc-500">From 1st delivered orders</span>
            </div>
            <div className="p-4 bg-zinc-900/60 rounded-2xl border border-zinc-800">
              <span className="text-[10px] font-black uppercase text-emerald-400">Repeat & Loyal Customer Sales</span>
              <p className="text-2xl font-black text-emerald-400 mt-1">₹{kpis?.repeatRevenue?.toLocaleString() ?? 0}</p>
              <span className="text-[10px] font-bold text-zinc-500">From 2nd+ delivered orders</span>
            </div>
          </div>

          {/* Segment Badges */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 text-center">
              <span className="text-[10px] font-black uppercase text-sky-400">New Segment</span>
              <p className="text-lg font-black text-white mt-0.5">{kpis?.newCustomersCount ?? 0}</p>
              <span className="text-[9px] font-bold text-zinc-500">≤ {data?.config?.new_max_delivered ?? 1} delivered</span>
            </div>
            <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 text-center">
              <span className="text-[10px] font-black uppercase text-amber-400">Repeat Segment</span>
              <p className="text-lg font-black text-white mt-0.5">{kpis?.repeatSegmentCount ?? 0}</p>
              <span className="text-[9px] font-bold text-zinc-500">{data?.config?.repeat_min_delivered ?? 2}–{data?.config?.repeat_max_delivered ?? 4} delivered</span>
            </div>
            <div className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 text-center">
              <span className="text-[10px] font-black uppercase text-purple-400">Loyal Segment</span>
              <p className="text-lg font-black text-white mt-0.5">{kpis?.loyalSegmentCount ?? 0}</p>
              <span className="text-[9px] font-bold text-zinc-500">≥ {data?.config?.loyal_min_delivered ?? 5} delivered</span>
            </div>
          </div>
        </div>

        {/* Retention Rates & Inactive Monitor */}
        <div className="bg-zinc-950 rounded-3xl p-6 border border-zinc-800 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-black uppercase tracking-wider text-white pb-4 border-b border-zinc-800 mb-6">
              Customer Retention Cohorts
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-zinc-400">7-Day Retention</span>
                  <span className="text-emerald-400 font-mono font-black">{ret?.retention7D ?? 0}%</span>
                </div>
                <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${ret?.retention7D ?? 0}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-zinc-400">30-Day Retention</span>
                  <span className="text-sky-400 font-mono font-black">{ret?.retention30D ?? 0}%</span>
                </div>
                <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-500 rounded-full" style={{ width: `${ret?.retention30D ?? 0}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1">
                  <span className="text-zinc-400">90-Day Retention</span>
                  <span className="text-purple-400 font-mono font-black">{ret?.retention90D ?? 0}%</span>
                </div>
                <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${ret?.retention90D ?? 0}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-zinc-900 flex justify-between items-center text-xs">
            <span className="font-bold text-zinc-400">Inactive Shoppers (30d+ idle):</span>
            <span className="px-2.5 py-1 rounded-full font-black text-rose-400 bg-rose-500/10 border border-rose-500/20">
              {ret?.inactiveCount ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* 🔍 SEARCH & CUSTOMER 360° MANAGEMENT TABLE */}
      <div className="bg-zinc-950 rounded-3xl p-6 border border-zinc-800 shadow-xl">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div>
            <h3 className="text-base font-black uppercase tracking-wider text-white">Customer 360° Directory</h3>
            <p className="text-xs font-bold text-zinc-400 mt-0.5">Real database customer profiles with masked contact security</p>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="Search by name, phone, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-white transition-colors"
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 py-4">
          <span className="text-[10px] font-black uppercase text-zinc-500 mr-2">Segment:</span>
          {(["all", "online", "new", "repeat", "loyal"] as const).map((seg) => (
            <button
              key={seg}
              onClick={() => setSegmentFilter(seg)}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer uppercase ${
                segmentFilter === seg
                  ? "bg-white text-black border-white font-black"
                  : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white"
              }`}
            >
              {seg === "online" ? "🟢 Currently Online" : seg}
            </button>
          ))}

          <span className="text-[10px] font-black uppercase text-zinc-500 ml-4 mr-2">Platform:</span>
          {(["all", "android", "website"] as const).map((plat) => (
            <button
              key={plat}
              onClick={() => setPlatformFilter(plat)}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer uppercase ${
                platformFilter === plat
                  ? "bg-white text-black border-white font-black"
                  : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white"
              }`}
            >
              {plat}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto mt-2">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                <th className="py-3 px-3">Customer ID</th>
                <th className="py-3 px-3">Name</th>
                <th className="py-3 px-3">Masked Phone</th>
                <th className="py-3 px-3">Status / Platform</th>
                <th className="py-3 px-3">Segment</th>
                <th className="py-3 px-3 text-center">Orders</th>
                <th className="py-3 px-3 text-center">Delivered</th>
                <th className="py-3 px-3 text-right">Total Spent</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-500 font-bold">
                    Loading customer intelligence directory...
                  </td>
                </tr>
              ) : !data?.customers || data.customers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-zinc-500 font-bold">
                    No customers match the active filters.
                  </td>
                </tr>
              ) : (
                data.customers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-zinc-900/50 transition-colors">
                    <td className="py-3.5 px-3 font-mono text-[11px] text-zinc-400 truncate max-w-[100px]">
                      {cust.id.startsWith("guest_") ? "GUEST" : cust.id.slice(0, 8)}
                    </td>
                    <td className="py-3.5 px-3 font-bold text-white whitespace-nowrap">
                      {cust.name}
                    </td>
                    <td className="py-3.5 px-3 font-mono text-zinc-300 whitespace-nowrap">
                      {cust.phone_masked}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {cust.is_online ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                            Online
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-zinc-500">Offline</span>
                        )}
                        <span className="text-[10px] font-black uppercase text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                          {cust.platform_preference === "android" ? "Android" : "Web"}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase border ${
                        cust.segment === "Loyal"
                          ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                          : cust.segment === "Repeat"
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          : "bg-sky-500/10 text-sky-400 border-sky-500/30"
                      }`}>
                        {cust.segment}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-center font-bold text-white">{cust.total_orders}</td>
                    <td className="py-3.5 px-3 text-center font-black text-emerald-400">{cust.delivered_orders}</td>
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-white whitespace-nowrap">
                      ₹{cust.total_purchase_value.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <button
                        onClick={() => handleViewCustomer(cust)}
                        className="px-3 py-1 rounded-xl bg-white text-black font-black text-[11px] uppercase tracking-wider hover:bg-zinc-200 transition-colors cursor-pointer"
                      >
                        360° Profile
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 👤 CUSTOMER 360° PROFILE MODAL */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setSelectedCustomer(null)}
              className="absolute top-6 right-6 text-zinc-400 hover:text-white p-2 rounded-xl bg-zinc-900 border border-zinc-800"
            >
              ✕
            </button>

            <div className="flex items-center gap-4 pb-6 border-b border-zinc-800">
              <div className="h-16 w-16 rounded-2xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-xl font-black text-white">
                {selectedCustomer.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-black text-white">{selectedCustomer.name}</h3>
                <p className="text-xs font-mono text-zinc-400 mt-0.5">
                  ID: {selectedCustomer.id} • Registered: {new Date(selectedCustomer.registration_date).toLocaleDateString()}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase border ${
                    selectedCustomer.segment === "Loyal"
                      ? "bg-purple-500/10 text-purple-400 border-purple-500/30"
                      : selectedCustomer.segment === "Repeat"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      : "bg-sky-500/10 text-sky-400 border-sky-500/30"
                  }`}>
                    {selectedCustomer.segment} Customer
                  </span>
                  {selectedCustomer.is_online ? (
                    <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      🟢 Online Now
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-zinc-500">
                      Last Active: {new Date(selectedCustomer.last_active).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Masked Contact Info Card */}
            <div className="grid grid-cols-2 gap-4 my-6 bg-zinc-900/60 p-4 rounded-2xl border border-zinc-800">
              <div>
                <span className="text-[10px] font-black uppercase text-zinc-400">Masked Phone</span>
                <p className="font-mono text-sm font-bold text-white mt-1">{selectedCustomer.phone_masked}</p>
                <span className="text-[9px] text-zinc-500">DPDP Act Compliant</span>
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-zinc-400">Lifetime Purchase</span>
                <p className="font-mono text-sm font-bold text-emerald-400 mt-1">₹{selectedCustomer.total_purchase_value.toLocaleString()}</p>
                <span className="text-[9px] text-zinc-500">{selectedCustomer.delivered_orders} delivered orders</span>
              </div>
            </div>

            {/* Complete Order History */}
            <h4 className="text-xs font-black uppercase tracking-wider text-white mb-3">Complete Customer Order History</h4>
            {selectedCustomer.orders.length === 0 ? (
              <p className="text-xs text-zinc-500 py-4 text-center">No orders placed by this customer yet.</p>
            ) : (
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {selectedCustomer.orders.map((ord: any) => (
                  <div key={ord.id} className="p-3.5 bg-zinc-900 rounded-xl border border-zinc-800 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-white font-mono">{ord.order_number || ord.id}</p>
                      <p className="text-[10px] text-zinc-400">{new Date(ord.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-white">₹{ord.total_amount}</p>
                      <span className={`text-[10px] font-black uppercase ${
                        String(ord.order_status).toLowerCase() === "delivered" ? "text-emerald-400" : "text-amber-400"
                      }`}>
                        {ord.order_status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ⚙️ DYNAMIC SEGMENTATION CONFIG MODAL */}
      {isConfigOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative">
            <h3 className="text-lg font-black uppercase tracking-tight text-white mb-2">Configure Repeat Rules</h3>
            <p className="text-xs text-zinc-400 mb-6">
              Customize delivered order thresholds for New, Repeat and Loyal segments across all analytics.
            </p>

            <form onSubmit={handleSaveConfig} className="space-y-4 text-xs font-bold">
              <div>
                <label className="text-zinc-400 block mb-1">New Customer (Max Delivered Orders):</label>
                <input
                  type="number"
                  min="0"
                  value={configNewMax}
                  onChange={(e) => setConfigNewMax(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white outline-none focus:border-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 block mb-1">Repeat Min Orders:</label>
                  <input
                    type="number"
                    min="1"
                    value={configRepeatMin}
                    onChange={(e) => setConfigRepeatMin(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white outline-none focus:border-white"
                  />
                </div>
                <div>
                  <label className="text-zinc-400 block mb-1">Repeat Max Orders:</label>
                  <input
                    type="number"
                    min={configRepeatMin}
                    value={configRepeatMax}
                    onChange={(e) => setConfigRepeatMax(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white outline-none focus:border-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Loyal Customer (Min Delivered Orders):</label>
                <input
                  type="number"
                  min={configRepeatMax + 1}
                  value={configLoyalMin}
                  onChange={(e) => setConfigLoyalMin(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white outline-none focus:border-white"
                />
              </div>

              <div>
                <label className="text-zinc-400 block mb-1">Inactivity Timeout (Seconds for Offline):</label>
                <input
                  type="number"
                  min="30"
                  max="600"
                  value={configTimeout}
                  onChange={(e) => setConfigTimeout(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-white outline-none focus:border-white"
                />
                <span className="text-[10px] text-zinc-500 font-normal">Standard is 120s (2 minutes).</span>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsConfigOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 text-zinc-300 font-bold hover:bg-zinc-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingConfig}
                  className="px-5 py-2 rounded-xl bg-white text-black font-black uppercase hover:bg-zinc-200 cursor-pointer disabled:opacity-50"
                >
                  {savingConfig ? "Saving..." : "Save Rules"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
