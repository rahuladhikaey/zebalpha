"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { 
  ShoppingBag, 
  Search, 
  Eye, 
  X, 
  Truck, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Package, 
  MapPin, 
  CreditCard,
  User,
  Building2,
  Sparkles,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RotateCcw,
  FileCheck,
  ExternalLink,
  ShieldAlert,
  Layers,
  Store,
  Phone,
  Mail,
  ArrowUpRight,
  ChevronDown,
  Check,
  Send,
  HelpCircle
} from "lucide-react";

// Robust address & customer parser
function parseOrderAddress(order: any) {
  if (!order) return { customerName: "Customer", phone: "", city: "India", pincode: "", formattedDestination: "India", fullAddress: "Customer Address" };

  const customerName = order.customer_name || order.shipping_address?.name || order.name || "Customer";
  const phone = order.phone || order.shipping_address?.phone || order.mobile || "";

  let rawAddr = order.address || order.shipping_address;
  let addrObj: any = null;

  if (typeof rawAddr === "string") {
    try {
      const parsed = JSON.parse(rawAddr);
      if (parsed && typeof parsed === "object") addrObj = parsed;
    } catch (_) {}
  } else if (typeof rawAddr === "object" && rawAddr !== null) {
    addrObj = rawAddr;
  }

  let city = order.city || "";
  let pincode = order.pincode || order.pin_code || order.postcode || "";
  let fullAddress = "";

  if (addrObj) {
    city = addrObj.city || addrObj.town || addrObj.district || city;
    pincode = addrObj.pincode || addrObj.pin_code || addrObj.postal_code || addrObj.zip || pincode;
    fullAddress = [
      addrObj.address_line1 || addrObj.address || addrObj.street || addrObj.house,
      addrObj.address_line2 || addrObj.area || addrObj.landmark,
      city,
      addrObj.state,
      pincode
    ].filter(Boolean).join(", ");
  }

  if (typeof rawAddr === "string" && !addrObj) {
    fullAddress = rawAddr.trim();
    if (!pincode) {
      const pinMatch = fullAddress.match(/\b(\d{6})\b/);
      if (pinMatch) pincode = pinMatch[1];
    }
  }

  city = (city || "").replace(/-\s*\d{6}|\d{6}/g, "").trim() || "India";
  pincode = pincode ? String(pincode).trim() : "";
  const formattedDestination = pincode ? `${city} (${pincode})` : city;

  return { customerName, phone, city, pincode, formattedDestination, fullAddress: fullAddress || formattedDestination };
}

function maskPhone(phone?: string): string {
  if (!phone) return "—";
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (cleaned.length < 6) return "******";
  return cleaned.slice(0, 3) + "******" + cleaned.slice(-3);
}

interface OrderManagementViewProps {
  initialOrders?: any[];
  initialSellers?: any[];
  initialProducts?: any[];
  onRefresh?: () => void;
}

export default function OrderManagementView({
  initialOrders,
  initialSellers,
  initialProducts,
  onRefresh,
}: OrderManagementViewProps = {}) {
  // Navigation View: "all-orders" vs "seller-orders"
  const [currentView, setCurrentView] = useState<"all-orders" | "seller-orders">("all-orders");

  // State: Orders & Pagination
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  
  // Real Database KPI Aggregates
  const [kpis, setKpis] = useState({
    totalOrders: 0,
    newOrders: 0,
    pendingProcessing: 0,
    shippedOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
    returnRequests: 0,
    totalOrderValue: 0
  });

  // State: Seller Summary Matrix
  const [sellerSummaries, setSellerSummaries] = useState<any[]>([]);
  const [loadingSellers, setLoadingSellers] = useState(false);

  // Filters
  const [activeTab, setActiveTab] = useState<"all" | "new" | "processing" | "shipped" | "delivered" | "cancelled" | "returns">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [orderStatusFilter, setOrderStatusFilter] = useState("all");
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState("all");
  const [sellerFilter, setSellerFilter] = useState("all");
  const [sellersList, setSellersList] = useState<any[]>(initialSellers || []);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Single Order Details Drawer
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [orderDetail, setOrderDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Admin Privileged Action Modals & Forms
  const [actionModal, setActionModal] = useState<{
    type: "return_approval" | "return_rejection" | "process_refund" | "escalate" | "delivery_override" | null;
    order: any | null;
  }>({ type: null, order: null });

  const [actionReason, setActionReason] = useState("");
  const [actionVerificationProof, setActionVerificationProof] = useState("");
  const [actionRefundAmount, setActionRefundAmount] = useState<number | "">("");
  const [actionRefundTxId, setActionRefundTxId] = useState("");
  const [executingAction, setExecutingAction] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [pushingShiprocket, setPushingShiprocket] = useState(false);

  // -------------------------------------------------------------
  // Data Fetching: Centralized Orders with Server-Side Pagination
  // -------------------------------------------------------------
  const fetchOrders = useCallback(async (pageToLoad = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pageToLoad),
        limit: String(pagination.limit),
        tab: activeTab,
        includeKPIs: "true"
      });

      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (dateRange !== "all") params.set("dateRange", dateRange);
      if (dateRange === "custom" && customStartDate) {
        params.set("startDate", customStartDate);
        if (customEndDate) params.set("endDate", customEndDate);
      }
      if (paymentStatusFilter !== "all") params.set("paymentStatus", paymentStatusFilter);
      if (orderStatusFilter !== "all") params.set("orderStatus", orderStatusFilter);
      if (sellerFilter !== "all") params.set("sellerId", sellerFilter);

      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      const json = await res.json();

      if (json.success) {
        setOrders(json.data || []);
        if (json.pagination) {
          setPagination(json.pagination);
        }
        if (json.kpis) {
          setKpis(json.kpis);
        }
      } else {
        console.warn("Orders fetch returned non-success:", json.message);
      }
    } catch (err: any) {
      console.error("Error loading centralized orders:", err);
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, activeTab, searchQuery, dateRange, customStartDate, customEndDate, paymentStatusFilter, orderStatusFilter, sellerFilter]);

  // Fetch Seller Summaries
  const fetchSellerSummaries = useCallback(async () => {
    setLoadingSellers(true);
    try {
      const params = new URLSearchParams({ view: "seller-summary" });
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      const res = await fetch(`/api/admin/orders?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setSellerSummaries(json.data || []);
      }
    } catch (err) {
      console.error("Error fetching seller summaries:", err);
    } finally {
      setLoadingSellers(false);
    }
  }, [searchQuery]);

  // Initial load and filter change trigger
  useEffect(() => {
    if (currentView === "all-orders") {
      fetchOrders(1);
    } else {
      fetchSellerSummaries();
    }
  }, [currentView, activeTab, dateRange, paymentStatusFilter, orderStatusFilter, sellerFilter, fetchOrders, fetchSellerSummaries]);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentView === "all-orders") fetchOrders(1);
      else fetchSellerSummaries();
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // -------------------------------------------------------------
  // Order Detail Drawer Fetcher
  // -------------------------------------------------------------
  const openOrderDetail = async (orderId: string) => {
    setSelectedOrderId(orderId);
    setLoadingDetail(true);
    setOrderDetail(null);
    try {
      const res = await fetch(`/api/admin/orders?orderId=${encodeURIComponent(orderId)}`);
      const json = await res.json();
      if (json.success && json.order) {
        setOrderDetail(json.order);
      } else {
        setStatusMsg("⚠️ Could not load complete order details");
      }
    } catch (err: any) {
      console.error("Failed to fetch order detail:", err);
      setStatusMsg("⚠️ Error fetching order detail");
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeOrderDetail = () => {
    setSelectedOrderId(null);
    setOrderDetail(null);
  };

  // -------------------------------------------------------------
  // Push to Shiprocket Action
  // -------------------------------------------------------------
  const handlePushShiprocket = async (orderId: string | number) => {
    setPushingShiprocket(true);
    try {
      const res = await fetch("/api/admin/orders/push-shiprocket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const result = await res.json();
      if (result.success) {
        setStatusMsg("✓ " + (result.message || "Pushed to Shiprocket successfully!"));
        if (selectedOrderId) openOrderDetail(selectedOrderId);
        fetchOrders(pagination.page);
        onRefresh?.();
      } else {
        setStatusMsg("⚠️ " + (result.message || "Failed to push to Shiprocket"));
      }
    } catch (err: any) {
      setStatusMsg("Error: " + err.message);
    } finally {
      setPushingShiprocket(false);
      setTimeout(() => setStatusMsg(""), 5000);
    }
  };

  // -------------------------------------------------------------
  // Admin Privileged Action Execution
  // -------------------------------------------------------------
  const handleExecuteAdminAction = async () => {
    if (!actionModal.order || !actionModal.type) return;
    setExecutingAction(true);
    try {
      const payload: Record<string, any> = {
        id: actionModal.order.id,
        reason: actionReason
      };

      if (actionModal.type === "return_approval") {
        payload.action = "approve_return";
      } else if (actionModal.type === "return_rejection") {
        payload.action = "reject_return";
        if (!actionReason.trim()) {
          alert("A valid rejection reason is required.");
          setExecutingAction(false);
          return;
        }
      } else if (actionModal.type === "process_refund") {
        payload.action = "process_refund";
        payload.refund_amount = actionRefundAmount || actionModal.order.total_amount;
        payload.refund_transaction_id = actionRefundTxId || `RFD_${Date.now()}`;
      } else if (actionModal.type === "escalate") {
        payload.action = "escalate";
      } else if (actionModal.type === "delivery_override") {
        payload.order_status = "delivered";
        payload.verification_proof = actionVerificationProof;
      }

      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const json = await res.json();
      if (json.success) {
        setStatusMsg(`✓ Action executed successfully: ${actionModal.type.replace(/_/g, " ").toUpperCase()}`);
        setActionModal({ type: null, order: null });
        setActionReason("");
        setActionVerificationProof("");
        setActionRefundTxId("");
        setActionRefundAmount("");
        if (selectedOrderId) openOrderDetail(selectedOrderId);
        fetchOrders(pagination.page);
        onRefresh?.();
      } else {
        alert("⚠️ Action Failed: " + (json.message || "Verification restriction"));
      }
    } catch (err: any) {
      alert("Error executing action: " + err.message);
    } finally {
      setExecutingAction(false);
      setTimeout(() => setStatusMsg(""), 5000);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (orders.length === 0) {
      alert("No orders available to export.");
      return;
    }
    const headers = ["Order Number", "Date", "Customer Name", "Customer Phone", "Destination", "Seller / Merchant", "Amount", "Payment Mode", "Payment Status", "Fulfilment Status", "Delivery Status"];
    const rows = orders.map(o => {
      const dest = parseOrderAddress(o);
      return [
        `"${o.order_number || o.id}"`,
        `"${new Date(o.created_at).toLocaleDateString()}"`,
        `"${dest.customerName}"`,
        `"${maskPhone(dest.phone)}"`,
        `"${dest.formattedDestination}"`,
        `"${o.seller_display_name || "Merchant"}"`,
        o.total_amount || 0,
        `"${o.payment_method || "COD"}"`,
        `"${o.payment_status || "PENDING"}"`,
        `"${o.fulfillment_status || "placed"}"`,
        `"${o.delivery_status || "PENDING"}"`
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ZebAlpha_Orders_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 text-zinc-100 font-sans pb-16">
      
      {/* ========================================================= */}
      {/* TOP HEADER & TITLE BAR                                    */}
      {/* ========================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-950 p-6 rounded-3xl border border-zinc-800 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-white">Centralized Marketplace Order Management</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Multi-Vendor Architecture
              </span>
            </div>
            <p className="text-xs font-bold text-zinc-400 mt-0.5">
              Unified Customer Checkout • Granular Merchant Fulfilment • Live Logistics & Financial Auditing
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Toggle */}
          <div className="bg-zinc-900 border border-zinc-800 p-1 rounded-2xl flex items-center">
            <button
              onClick={() => setCurrentView("all-orders")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                currentView === "all-orders"
                  ? "bg-white text-black shadow-md shadow-white/10"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Orders</span>
            </button>
            <button
              onClick={() => setCurrentView("seller-orders")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                currentView === "seller-orders"
                  ? "bg-white text-black shadow-md shadow-white/10"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Store className="w-3.5 h-3.5" />
              <span>Seller Orders</span>
            </button>
          </div>

          <button
            onClick={() => {
              if (currentView === "all-orders") fetchOrders(pagination.page);
              else fetchSellerSummaries();
            }}
            disabled={loading || loadingSellers}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${loading || loadingSellers ? "animate-spin" : ""}`} />
            <span>Sync</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all shadow-lg shadow-emerald-600/20 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Status Message Notification Banner */}
      {statusMsg && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-xs font-bold flex items-center justify-between shadow-xl animate-in fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusMsg}</span>
          </div>
          <button onClick={() => setStatusMsg("")} className="text-emerald-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* 1. TOP-LEVEL KPI METRIC STRIP (Database Aggregates)       */}
      {/* ========================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: "Total Orders", value: kpis.totalOrders, color: "text-white", border: "border-zinc-800" },
          { label: "New Orders", value: kpis.newOrders, color: "text-blue-400", border: "border-blue-900/40" },
          { label: "Pending Processing", value: kpis.pendingProcessing, color: "text-amber-400", border: "border-amber-900/40" },
          { label: "Shipped Orders", value: kpis.shippedOrders, color: "text-purple-400", border: "border-purple-900/40" },
          { label: "Delivered Orders", value: kpis.deliveredOrders, color: "text-emerald-400", border: "border-emerald-900/40" },
          { label: "Cancelled Orders", value: kpis.cancelledOrders, color: "text-rose-400", border: "border-rose-900/40" },
          { label: "Return Requests", value: kpis.returnRequests, color: "text-orange-400", border: "border-orange-900/40" },
          { label: "Total Order Value", value: `₹${Number(kpis.totalOrderValue || 0).toLocaleString("en-IN")}`, color: "text-emerald-400", border: "border-emerald-900/40", isCurrency: true },
        ].map((kpi, idx) => (
          <div key={idx} className={`bg-zinc-950 p-4 rounded-2xl border ${kpi.border} shadow-lg space-y-1`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block truncate">{kpi.label}</span>
            <p className={`text-lg sm:text-xl font-black ${kpi.color} tracking-tight`}>
              {loading ? "..." : kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* ========================================================= */}
      {/* VIEW 1: ALL ORDERS CENTRALIZED MARKETPLACE VIEW           */}
      {/* ========================================================= */}
      {currentView === "all-orders" && (
        <div className="space-y-4">
          
          {/* Main Status Tabs */}
          <div className="border-b border-zinc-800 bg-zinc-950 rounded-2xl border p-1.5">
            <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {[
                { key: "all", label: "All Orders", count: kpis.totalOrders },
                { key: "new", label: "New", count: kpis.newOrders },
                { key: "processing", label: "Processing", count: kpis.pendingProcessing },
                { key: "shipped", label: "Shipped", count: kpis.shippedOrders },
                { key: "delivered", label: "Delivered", count: kpis.deliveredOrders },
                { key: "cancelled", label: "Cancelled", count: kpis.cancelledOrders },
                { key: "returns", label: "Returns / Refunds", count: kpis.returnRequests },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => {
                    setActiveTab(t.key as any);
                    setPagination(p => ({ ...p, page: 1 }));
                  }}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                    activeTab === t.key
                      ? "bg-white text-black shadow-lg shadow-white/10"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                  }`}
                >
                  <span>{t.label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                    activeTab === t.key ? "bg-black/10 text-black" : "bg-zinc-800 text-zinc-400"
                  }`}>
                    {t.count}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {/* Search, Date, and Advanced Filters Toolbar */}
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3 shadow-xl">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              
              {/* Search Input */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="Search by Order ID, Buyer Name, Phone, Seller, AWB..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-emerald-500 transition-all font-medium"
                />
              </div>

              {/* Quick Dropdown Selectors */}
              <div className="flex flex-wrap items-center gap-2">
                
                {/* Date Range Filter */}
                <div className="relative">
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="appearance-none bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 pr-8 text-xs font-bold text-zinc-300 outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="all">Date: All Time</option>
                    <option value="today">Date: Today</option>
                    <option value="7d">Date: Last 7 Days</option>
                    <option value="30d">Date: Last 30 Days</option>
                    <option value="90d">Date: Last 90 Days</option>
                    <option value="custom">Date: Custom Range</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-3 pointer-events-none" />
                </div>

                {/* Custom Date Pickers if Selected */}
                {dateRange === "custom" && (
                  <div className="flex items-center gap-1.5 animate-in fade-in">
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                    />
                    <span className="text-zinc-500 text-xs">to</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="bg-zinc-900 border border-zinc-800 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                    />
                  </div>
                )}

                {/* Payment Status Dropdown */}
                <div className="relative">
                  <select
                    value={paymentStatusFilter}
                    onChange={(e) => setPaymentStatusFilter(e.target.value)}
                    className="appearance-none bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 pr-8 text-xs font-bold text-zinc-300 outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="all">Payment: All</option>
                    <option value="PAID">Paid / Completed</option>
                    <option value="PENDING">Pending (COD)</option>
                    <option value="FAILED">Failed</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-3 pointer-events-none" />
                </div>

                {/* Advanced Filters Toggle */}
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    showAdvancedFilters ? "bg-emerald-600 text-white border-emerald-500" : "bg-zinc-900 text-zinc-300 border-zinc-800 hover:bg-zinc-800"
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filters</span>
                </button>
              </div>
            </div>

            {/* Expandable Advanced Filters */}
            {showAdvancedFilters && (
              <div className="pt-3 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in">
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">Filter by Seller Store</label>
                  <select
                    value={sellerFilter}
                    onChange={(e) => setSellerFilter(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2 text-xs font-bold text-white outline-none"
                  >
                    <option value="all">All Registered Sellers</option>
                    {sellersList.map(s => (
                      <option key={s.id} value={s.id}>{s.business_name || s.store_name || s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">Filter by Order Status</label>
                  <select
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2 text-xs font-bold text-white outline-none"
                  >
                    <option value="all">All Order Statuses</option>
                    <option value="placed">Placed</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="processing">Processing</option>
                    <option value="packed">Packed</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setDateRange("all");
                      setCustomStartDate("");
                      setCustomEndDate("");
                      setPaymentStatusFilter("all");
                      setOrderStatusFilter("all");
                      setSellerFilter("all");
                    }}
                    className="w-full py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-bold transition-all"
                  >
                    Reset All Filters
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================= */}
          {/* 2. ENTERPRISE ORDER TABLE                                 */}
          {/* ========================================================= */}
          <div className="bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl">
            {loading ? (
              <div className="p-16 text-center space-y-3">
                <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold text-zinc-400">Loading Centralized Orders...</p>
              </div>
            ) : orders.length === 0 ? (
              <div className="p-16 text-center space-y-4">
                <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center mx-auto text-emerald-400 shadow-xl">
                  <Package className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">No Orders Found</h3>
                  <p className="text-xs font-bold text-zinc-500 mt-1">There are no orders matching your active tab and filter criteria.</p>
                </div>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setDateRange("all");
                    setActiveTab("all");
                  }}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[700px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-zinc-900 z-10 border-b border-zinc-800 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    <tr>
                      <th className="p-3.5 pl-5">Order ID & Date</th>
                      <th className="p-3.5">Customer</th>
                      <th className="p-3.5">Products & Qty</th>
                      <th className="p-3.5">Seller / Merchant</th>
                      <th className="p-3.5">Order Amount</th>
                      <th className="p-3.5">Payment</th>
                      <th className="p-3.5">Fulfilment</th>
                      <th className="p-3.5">Delivery Status</th>
                      <th className="p-3.5 text-right pr-5">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-zinc-800/60 text-xs font-bold text-zinc-300">
                    {orders.map(ord => {
                      const dest = parseOrderAddress(ord);
                      const fStatus = String(ord.fulfillment_status || ord.order_status || "placed").toLowerCase();
                      const dStatus = String(ord.delivery_status || "PENDING").toUpperCase();

                      return (
                        <tr
                          key={ord.id}
                          className="hover:bg-zinc-900/40 transition-colors"
                        >
                          {/* Order ID & Time */}
                          <td className="p-3.5 pl-5">
                            <p className="font-black text-white font-mono flex items-center gap-1.5">
                              <span>#{ord.order_number || ord.id.slice(0, 8)}</span>
                              {ord.is_multi_vendor && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase font-sans">
                                  Multi-Vendor
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-zinc-400" />
                              <span>{new Date(ord.created_at).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                            </p>
                          </td>

                          {/* Customer */}
                          <td className="p-3.5">
                            <p className="font-black text-white">{dest.customerName}</p>
                            <p className="text-[11px] text-zinc-400 truncate max-w-[140px]" title={dest.fullAddress}>
                              {dest.formattedDestination}
                            </p>
                            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{ord.customer_phone_masked || maskPhone(dest.phone)}</p>
                          </td>

                          {/* Products & Quantity */}
                          <td className="p-3.5">
                            <div className="flex items-center gap-2 max-w-[200px]">
                              {ord.primary_product_thumbnail ? (
                                <img src={ord.primary_product_thumbnail} alt="" className="w-8 h-8 object-cover rounded-lg border border-zinc-800 shrink-0" />
                              ) : (
                                <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                                  <Package className="w-4 h-4" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-white font-bold truncate text-[11px]">{ord.primary_product_name}</p>
                                <p className="text-[10px] text-zinc-400">
                                  <span>Total items: {ord.total_items_count || 1}</span>
                                  {ord.more_items_count > 0 && (
                                    <span className="ml-1.5 px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300 font-black text-[9px]">
                                      +{ord.more_items_count} more
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Seller / Merchant */}
                          <td className="p-3.5">
                            <p className="font-bold text-white flex items-center gap-1 truncate max-w-[160px]" title={ord.seller_display_name}>
                              <Building2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="truncate">{ord.seller_display_name}</span>
                            </p>
                            {ord.is_multi_vendor && (
                              <span className="text-[9px] text-purple-400 font-semibold block">
                                {ord.sub_orders_count || 2} Independent Shipments
                              </span>
                            )}
                          </td>

                          {/* Order Amount */}
                          <td className="p-3.5">
                            <p className="font-black text-emerald-400 text-sm">
                              ₹{Number(ord.total_amount || 0).toLocaleString("en-IN")}
                            </p>
                            {ord.discount_amount > 0 && (
                              <span className="text-[9px] text-zinc-500 line-through block">
                                ₹{Number((Number(ord.total_amount) + Number(ord.discount_amount)) || 0).toLocaleString("en-IN")}
                              </span>
                            )}
                          </td>

                          {/* Payment Method & Status */}
                          <td className="p-3.5">
                            <span className="text-[11px] font-bold text-white block uppercase">
                              {ord.payment_method || "COD"}
                            </span>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                              ord.payment_status === "PAID" || ord.payment_status === "COMPLETE"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : ord.payment_status === "FAILED"
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            }`}>
                              {ord.payment_status || "PENDING"}
                            </span>
                          </td>

                          {/* Fulfilment Status */}
                          <td className="p-3.5">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase inline-flex items-center gap-1 ${
                              fStatus === "delivered" || fStatus === "completed"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : ["shipped", "in_transit"].includes(fStatus)
                                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                                : ["processing", "packed", "ready_for_pickup", "ready_to_ship"].includes(fStatus)
                                ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                : fStatus === "cancelled"
                                ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                                : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                            }`}>
                              {fStatus.replace(/_/g, " ")}
                            </span>
                          </td>

                          {/* Delivery Status */}
                          <td className="p-3.5">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase inline-block ${
                              dStatus === "DELIVERED"
                                ? "text-emerald-400"
                                : ["IN_TRANSIT", "SHIPPED", "OUT_FOR_DELIVERY"].includes(dStatus)
                                ? "text-purple-400"
                                : dStatus.includes("RTO")
                                ? "text-rose-400"
                                : "text-zinc-500"
                            }`}>
                              {dStatus}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="p-3.5 text-right pr-5">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openOrderDetail(ord.id)}
                                className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm hover:border-emerald-500"
                              >
                                View Details
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-bold text-zinc-400">
              <span className="text-zinc-400">
                Showing {orders.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}–
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} orders
              </span>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchOrders(pagination.page - 1)}
                  disabled={pagination.page <= 1 || loading}
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white text-xs font-bold disabled:opacity-40 cursor-pointer flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>PREV</span>
                </button>

                <span className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-white font-mono">
                  {pagination.page} / {pagination.totalPages}
                </span>

                <button
                  onClick={() => fetchOrders(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages || loading}
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white text-xs font-bold disabled:opacity-40 cursor-pointer flex items-center gap-1"
                >
                  <span>NEXT</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* VIEW 2: SELLER-WISE ORDER MANAGEMENT                      */}
      {/* ========================================================= */}
      {currentView === "seller-orders" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl">
            <div>
              <h2 className="text-sm font-black text-white flex items-center gap-2">
                <Store className="w-4 h-4 text-emerald-400" />
                <span>Merchant Fulfilment Matrix</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Centralized view of orders and fulfillment volumes grouped by merchant store.
              </p>
            </div>

            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search sellers by store name, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-zinc-500 outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="bg-zinc-950 rounded-2xl border border-zinc-800 overflow-hidden shadow-2xl">
            {loadingSellers ? (
              <div className="p-16 text-center space-y-3">
                <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold text-zinc-400">Loading Merchant Performance Matrix...</p>
              </div>
            ) : sellerSummaries.length === 0 ? (
              <div className="p-16 text-center text-zinc-500 text-xs font-bold">
                No merchant stores found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-zinc-900 border-b border-zinc-800 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    <tr>
                      <th className="p-4 pl-6">Merchant Store</th>
                      <th className="p-4">Contact</th>
                      <th className="p-4 text-center">Total Orders</th>
                      <th className="p-4 text-center">Pending</th>
                      <th className="p-4 text-center">Processing</th>
                      <th className="p-4 text-center">Shipped</th>
                      <th className="p-4 text-center">Delivered</th>
                      <th className="p-4 text-center">Cancelled</th>
                      <th className="p-4 text-right">Order Value</th>
                      <th className="p-4 text-right pr-6">Filter Orders</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-xs font-bold text-zinc-300">
                    {sellerSummaries.map(s => (
                      <tr key={s.seller_id} className="hover:bg-zinc-900/40 transition-colors">
                        <td className="p-4 pl-6">
                          <p className="font-black text-white text-sm">{s.seller_name}</p>
                          <span className="text-[10px] text-zinc-500 font-mono">ID: {s.seller_id.slice(0, 8)}...</span>
                        </td>
                        <td className="p-4">
                          <p className="text-zinc-300 text-xs">{s.phone}</p>
                          <p className="text-[10px] text-zinc-500 truncate max-w-[140px]">{s.city}</p>
                        </td>
                        <td className="p-4 text-center font-black text-white">{s.total_orders}</td>
                        <td className="p-4 text-center text-amber-400 font-bold">{s.pending_orders}</td>
                        <td className="p-4 text-center text-blue-400 font-bold">{s.processing_orders}</td>
                        <td className="p-4 text-center text-purple-400 font-bold">{s.shipped_orders}</td>
                        <td className="p-4 text-center text-emerald-400 font-bold">{s.delivered_orders}</td>
                        <td className="p-4 text-center text-rose-400 font-bold">{s.cancelled_orders}</td>
                        <td className="p-4 text-right font-black text-emerald-400 text-sm">
                          ₹{Number(s.seller_order_value || 0).toLocaleString("en-IN")}
                        </td>
                        <td className="p-4 text-right pr-6">
                          <button
                            onClick={() => {
                              setSellerFilter(s.seller_id);
                              setCurrentView("all-orders");
                            }}
                            className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm hover:border-emerald-500"
                          >
                            View Orders
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. ORDER DETAILS DRAWER / FULL MODAL                      */}
      {/* ========================================================= */}
      {selectedOrderId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 md:p-6 overflow-y-auto animate-in fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 md:p-8 w-full max-w-4xl shadow-2xl space-y-6 max-h-[92vh] overflow-y-auto">
            
            {/* Drawer Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Centralized Marketplace Order</span>
                  <h3 className="font-black text-white text-lg flex items-center gap-2 mt-0.5">
                    <span>Order #{orderDetail?.order_number || selectedOrderId}</span>
                    {orderDetail?.seller_orders?.length > 1 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                        {orderDetail.seller_orders.length} Merchants
                      </span>
                    )}
                  </h3>
                </div>
              </div>

              <button
                onClick={closeOrderDetail}
                className="p-2 rounded-full text-zinc-400 hover:bg-zinc-900 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingDetail ? (
              <div className="p-16 text-center space-y-3">
                <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs font-bold text-zinc-400">Retrieving Deep Relational Order Data...</p>
              </div>
            ) : orderDetail ? (
              <div className="space-y-6 text-xs font-bold">

                {/* Top Row: Customer Card & Financial Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Customer Card */}
                  <div className="bg-zinc-900/60 p-5 rounded-2xl border border-zinc-800 space-y-2">
                    <p className="text-[10px] font-black uppercase text-zinc-400 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-emerald-400" /> Customer Information
                    </p>
                    <p className="text-white text-base font-black">{parseOrderAddress(orderDetail).customerName}</p>
                    <div className="space-y-1 text-zinc-300 font-medium">
                      <p className="flex items-center gap-1 text-[11px]">
                        <Phone className="w-3 h-3 text-zinc-500" />
                        <span>Phone: {orderDetail.customer_phone_masked || maskPhone(orderDetail.phone)}</span>
                      </p>
                      <p className="flex items-start gap-1 text-[11px] leading-relaxed">
                        <MapPin className="w-3 h-3 text-zinc-500 mt-0.5 shrink-0" />
                        <span>{parseOrderAddress(orderDetail).fullAddress}</span>
                      </p>
                    </div>
                  </div>

                  {/* Financial Reconciliation Card */}
                  <div className="bg-zinc-900/60 p-5 rounded-2xl border border-zinc-800 space-y-2">
                    <p className="text-[10px] font-black uppercase text-zinc-400 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-emerald-400" /> Payment & Financial Breakdown
                    </p>
                    <div className="grid grid-cols-2 gap-2 pt-1 font-medium text-[11px]">
                      <div>
                        <span className="text-zinc-500 block">Order Total</span>
                        <span className="text-white font-black text-sm">₹{Number(orderDetail.total_amount || 0).toLocaleString("en-IN")}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Payment Method</span>
                        <span className="text-emerald-400 font-bold uppercase">{orderDetail.payment_method || "COD"} ({orderDetail.payment_status || "PENDING"})</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Discount Applied</span>
                        <span className="text-zinc-300">₹{Number(orderDetail.discount_amount || 0).toLocaleString("en-IN")}</span>
                      </div>
                      <div>
                        <span className="text-zinc-500 block">Shipping Charges</span>
                        <span className="text-zinc-300">₹{Number(orderDetail.shipping_charge || 0).toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                    {orderDetail.razorpay_payment_id && (
                      <p className="text-[10px] text-zinc-500 font-mono pt-1">
                        Razorpay Ref: {orderDetail.razorpay_payment_id}
                      </p>
                    )}
                  </div>
                </div>

                {/* Multi-Merchant Fulfilment Sections */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                    <Store className="w-4 h-4 text-emerald-400" />
                    <span>Merchant Fulfilment & Item Breakdown</span>
                  </h4>

                  {orderDetail.seller_orders?.length > 0 ? (
                    orderDetail.seller_orders.map((so: any) => {
                      const sellerInfo = orderDetail.sellers?.[so.seller_id] || {};
                      const sellerItems = (orderDetail.order_items || []).filter((oi: any) => oi.seller_order_id === so.id || oi.seller_id === so.seller_id);
                      const sellerShipment = (orderDetail.shipments || []).find((sh: any) => sh.seller_order_id === so.id || sh.seller_id === so.seller_id);

                      return (
                        <div key={so.id} className="bg-zinc-900/80 p-5 rounded-2xl border border-zinc-800 space-y-4">
                          {/* Seller Sub-Order Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                            <div>
                              <p className="text-white font-black text-sm flex items-center gap-1.5">
                                <Building2 className="w-4 h-4 text-emerald-400" />
                                <span>{sellerInfo.business_name || sellerInfo.store_name || "Merchant Hub"}</span>
                                <span className="text-[10px] text-zinc-500 font-normal">({sellerInfo.city || "India"})</span>
                              </p>
                              <p className="text-[10px] text-zinc-500 font-mono">
                                Sub-Order #{so.seller_order_number || so.id.slice(0, 8)}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-zinc-800 text-zinc-300 border border-zinc-700">
                                Status: {so.seller_status || "PENDING"}
                              </span>
                              {sellerShipment?.tracking_number && (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-purple-500/10 text-purple-300 border border-purple-500/20">
                                  AWB: {sellerShipment.tracking_number}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Line Items for this Seller */}
                          <div className="space-y-2">
                            {sellerItems.map((item: any) => {
                              const v = item.variant || {};
                              return (
                                <div key={item.id} className="flex items-center justify-between bg-zinc-950 p-3 rounded-xl border border-zinc-800/80 text-xs">
                                  <div className="flex items-center gap-3">
                                    {v.image_url ? (
                                      <img src={v.image_url} alt="" className="w-10 h-10 object-cover rounded-lg border border-zinc-800 shrink-0" />
                                    ) : (
                                      <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-500">
                                        <Package className="w-5 h-5" />
                                      </div>
                                    )}
                                    <div>
                                      <p className="text-white font-bold">{v.product_name || item.name || "Product"}</p>
                                      <p className="text-[10px] text-zinc-400 font-normal">
                                        Qty: {item.quantity || 1} • Size: {v.size || "Free"} • Color: {v.color || "Standard"} • SKU: {v.sku || "ZEB-SKU"}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-black text-white">₹{Number(item.price || 0).toLocaleString("en-IN")}</p>
                                    <p className="text-[10px] text-zinc-500">₹{Number(item.price || 0) * (item.quantity || 1)} subtotal</p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    /* Fallback when child seller_orders records are not present */
                    <div className="bg-zinc-900/80 p-5 rounded-2xl border border-zinc-800 space-y-3">
                      <p className="text-white font-black text-sm">Items in Order</p>
                      <div className="space-y-2">
                        {(orderDetail.order_items || orderDetail.items || []).map((item: any, i: number) => (
                          <div key={i} className="flex items-center justify-between bg-zinc-950 p-3 rounded-xl border border-zinc-800/80 text-xs">
                            <div className="flex items-center gap-3">
                              {item.image_url ? (
                                <img src={item.image_url} alt="" className="w-9 h-9 object-cover rounded-lg border border-zinc-800 shrink-0" />
                              ) : (
                                <div className="w-9 h-9 rounded-lg bg-zinc-900 flex items-center justify-center text-zinc-500">
                                  <Package className="w-4 h-4" />
                                </div>
                              )}
                              <div>
                                <p className="text-white font-bold">{item.name || "Apparel Item"}</p>
                                <p className="text-[10px] text-zinc-400 font-normal">Qty: {item.quantity || 1} • SKU: {item.sku || "ZEB-SKU"}</p>
                              </div>
                            </div>
                            <p className="font-black text-white">₹{Number(item.price || 0).toLocaleString("en-IN")}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Order Timeline (Show ONLY events that actually occurred) */}
                <div className="bg-zinc-900/60 p-5 rounded-2xl border border-zinc-800 space-y-3">
                  <p className="text-[10px] font-black uppercase text-zinc-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-400" /> Chronological Event Timeline
                  </p>
                  
                  {orderDetail.timeline?.length > 0 ? (
                    <div className="space-y-3 pl-2 border-l-2 border-zinc-800 ml-2">
                      {orderDetail.timeline.map((event: any, idx: number) => (
                        <div key={idx} className="relative pl-4 space-y-0.5">
                          <div className={`w-2.5 h-2.5 rounded-full absolute -left-[21px] top-1 ${
                            event.status === "cancelled" ? "bg-rose-500" : "bg-emerald-400"
                          }`} />
                          <div className="flex items-center justify-between">
                            <p className="text-white font-bold text-xs">{event.title}</p>
                            <span className="text-[10px] text-zinc-500 font-mono">
                              {new Date(event.timestamp).toLocaleString("en-IN")}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-400 font-normal">{event.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-zinc-500 text-xs italic">No historical events recorded yet.</p>
                  )}
                </div>

                {/* ========================================================= */}
                {/* 7. ADMIN PRIVILEGED ACTIONS STRIP                         */}
                {/* ========================================================= */}
                <div className="pt-4 border-t border-zinc-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Shiprocket Push */}
                    <button
                      onClick={() => handlePushShiprocket(orderDetail.id)}
                      disabled={pushingShiprocket}
                      className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Truck className={`w-3.5 h-3.5 ${pushingShiprocket ? "animate-spin" : ""}`} />
                      <span>{pushingShiprocket ? "Manifesting..." : "Push Shiprocket"}</span>
                    </button>

                    {/* Return Actions */}
                    <button
                      onClick={() => setActionModal({ type: "return_approval", order: orderDetail })}
                      className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-emerald-400 text-xs font-black transition-all cursor-pointer"
                    >
                      Approve Return
                    </button>

                    <button
                      onClick={() => setActionModal({ type: "return_rejection", order: orderDetail })}
                      className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-rose-400 text-xs font-black transition-all cursor-pointer"
                    >
                      Reject Return
                    </button>

                    {/* Process Refund */}
                    <button
                      onClick={() => setActionModal({ type: "process_refund", order: orderDetail })}
                      className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-blue-400 text-xs font-black transition-all cursor-pointer"
                    >
                      Process Refund
                    </button>

                    {/* Manual Delivery (Protected) */}
                    <button
                      onClick={() => setActionModal({ type: "delivery_override", order: orderDetail })}
                      className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs font-black transition-all cursor-pointer"
                    >
                      Verify Delivery
                    </button>
                  </div>

                  <button
                    onClick={closeOrderDetail}
                    className="px-5 py-2 rounded-xl bg-white text-black text-xs font-black hover:bg-zinc-200 transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>

              </div>
            ) : null}

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* PRIVILEGED ACTION CONFIRMATION MODAL                      */}
      {/* ========================================================= */}
      {actionModal.type && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-60 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h4 className="font-black text-white text-sm flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-emerald-400" />
                <span>Privileged Admin Action</span>
              </h4>
              <button
                onClick={() => setActionModal({ type: null, order: null })}
                className="text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-zinc-300 font-medium">
              You are performing: <span className="font-bold text-white uppercase">{actionModal.type.replace(/_/g, " ")}</span> on Order #{actionModal.order?.order_number || actionModal.order?.id}.
              An immutable audit log entry will be created.
            </p>

            {/* Delivery Override Verification Proof */}
            {actionModal.type === "delivery_override" && (
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-400 block">
                  Delivery Verification Proof / AWB Reference *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Courier POD reference, AWB number, or Customer OTP proof"
                  value={actionVerificationProof}
                  onChange={(e) => setActionVerificationProof(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
                />
                <span className="text-[10px] text-amber-400 block">
                  Manual delivery requires verified courier proof to protect seller settlements.
                </span>
              </div>
            )}

            {/* Refund Inputs */}
            {actionModal.type === "process_refund" && (
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">Refund Amount (₹)</label>
                  <input
                    type="number"
                    placeholder={`Total: ₹${actionModal.order?.total_amount}`}
                    value={actionRefundAmount}
                    onChange={(e) => setActionRefundAmount(e.target.value ? Number(e.target.value) : "")}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-zinc-400 block mb-1">Transaction / UTR Reference</label>
                  <input
                    type="text"
                    placeholder="e.g. RFD_179388... or Bank UTR"
                    value={actionRefundTxId}
                    onChange={(e) => setActionRefundTxId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white outline-none"
                  />
                </div>
              </div>
            )}

            {/* General Reason Input */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-zinc-400 block">Reason / Audit Justification</label>
              <textarea
                rows={2}
                placeholder="Enter justification for this action..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-emerald-500"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                onClick={() => setActionModal({ type: null, order: null })}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleExecuteAdminAction}
                disabled={executingAction}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition-all cursor-pointer shadow-lg shadow-emerald-600/20"
              >
                {executingAction ? "Recording..." : "Confirm & Record Audit"}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
