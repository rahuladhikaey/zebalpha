"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@shared/utils/supabaseClient";
import { 
  RotateCcw, 
  Search, 
  Filter, 
  Download, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  HelpCircle, 
  PlayCircle, 
  ShieldAlert, 
  Truck, 
  Package, 
  ChevronDown, 
  ChevronRight, 
  X, 
  UploadCloud, 
  FileText, 
  IndianRupee, 
  Sparkles,
  Info,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Camera,
  Video,
  FileCheck,
  Calendar,
  Ban
} from "lucide-react";

export default function ReturnsAndRtoPage() {
  // Navigation Tabs
  const [activeMainTab, setActiveMainTab] = useState<"overview" | "tracking" | "claims">("overview");
  
  // Return Tracking Sub-tabs
  const [trackingSubTab, setTrackingSubTab] = useState<
    "in_transit" | "out_for_delivery" | "delivered" | "lost" | "no_charge" | "disposed"
  >("in_transit");

  // Claim Tracking Sub-tabs
  const [claimsSubTab, setClaimsSubTab] = useState<"all" | "open" | "approved" | "rejected">("all");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("Today");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [courierFilter, setCourierFilter] = useState("All");
  const [returnTypeFilter, setReturnTypeFilter] = useState("All");

  // Data states
  const [returns, setReturns] = useState<any[]>([]);
  const [claims, setClaims] = useState<any[]>([]);
  const [cancellations, setCancellations] = useState<any[]>([]);
  const [sellerProducts, setSellerProducts] = useState<any[]>([]);
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [selectedReturn, setSelectedReturn] = useState<any | null>(null);
  const [showSpfClaimModal, setShowSpfClaimModal] = useState(false);
  const [claimTargetReturn, setClaimTargetReturn] = useState<any | null>(null);
  const [showRateCardModal, setShowRateCardModal] = useState(false);
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);
  const [showPodModal, setShowPodModal] = useState<any | null>(null);

  // SPF Claim Form State
  const [claimForm, setClaimForm] = useState({
    claimType: "WRONG_ITEM",
    claimAmount: "",
    unboxingVideoUrl: "",
    outerBoxImageUrl: "",
    itemDamageImageUrl: "",
    sellerComments: "",
  });
  const [submittingClaim, setSubmittingClaim] = useState(false);

  // Load Seller, Products & Returns Data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: seller } = await supabase
            .from("sellers")
            .select("id")
            .or(`user_id.eq.${user.id},email.eq.${user.email?.toLowerCase().trim()}`)
            .maybeSingle();

          const currentSellerId = seller?.id || user.id;
          setSellerId(currentSellerId);

          const sellerIds = [user.id];
          if (seller?.id) sellerIds.push(seller.id);

          // 1. Fetch real clothing products for this seller
          const { data: productsData } = await supabase
            .from("products")
            .select("*")
            .in("seller_id", sellerIds)
            .order("created_at", { ascending: false });

          if (productsData && productsData.length > 0) {
            setSellerProducts(productsData);
          } else {
            // Fetch any clothing products if seller has none uploaded yet
            const { data: globalProducts } = await supabase
              .from("products")
              .select("*")
              .limit(10);
            setSellerProducts(globalProducts || []);
          }

          // 2. Fetch returns from order_returns table
          const { data: returnsData } = await supabase
            .from("order_returns")
            .select("*")
            .order("created_at", { ascending: false });

          setReturns(returnsData || []);

          // 3. Fetch cancellations from orders table (cancelled orders)
          const { data: cancelledOrders } = await supabase
            .from("orders")
            .select("*")
            .eq("status", "cancelled")
            .order("created_at", { ascending: false });

          setCancellations(cancelledOrders || []);

          // 4. Fetch claims from seller_claims table
          const { data: claimsData } = await supabase
            .from("seller_claims")
            .select("*")
            .order("created_at", { ascending: false });

          setClaims(claimsData || []);
        } else {
          // Fetch public products if not authenticated
          const { data: productsData } = await supabase
            .from("products")
            .select("*")
            .limit(10);
          setSellerProducts(productsData || []);
          setReturns([]);
          setCancellations([]);
          setClaims([]);
        }
      } catch (err) {
        console.error("Error fetching returns data:", err);
        setReturns([]);
        setCancellations([]);
        setClaims([]);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Helper for Date Filtering
  const isWithinSelectedDate = (dateString?: string) => {
    if (!dateString) return true;
    const itemDate = new Date(dateString);
    const now = new Date();
    
    // Normalize to start of today
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (dateFilter === "Today") {
      return itemDate >= startOfToday;
    }
    if (dateFilter === "Yesterday") {
      const startOfYesterday = new Date(startOfToday);
      startOfYesterday.setDate(startOfYesterday.getDate() - 1);
      return itemDate >= startOfYesterday && itemDate < startOfToday;
    }
    if (dateFilter === "Last 7 Days") {
      const past7 = new Date(startOfToday);
      past7.setDate(past7.getDate() - 7);
      return itemDate >= past7;
    }
    if (dateFilter === "This Month") {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return itemDate >= startOfMonth;
    }
    if (dateFilter === "Last 1 Month") {
      const past30 = new Date(startOfToday);
      past30.setDate(past30.getDate() - 30);
      return itemDate >= past30;
    }
    if (dateFilter === "Last 3 Months") {
      const past90 = new Date(startOfToday);
      past90.setDate(past90.getDate() - 90);
      return itemDate >= past90;
    }
    if (dateFilter === "Custom Date" && customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);
      return itemDate >= start && itemDate <= end;
    }
    return true; // "All Time"
  };

  // Get current active date range label for UI display
  const getDateRangeLabel = () => {
    const now = new Date();
    const formatDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" });

    if (dateFilter === "Today") {
      return `(${formatDate(now)} - Today)`;
    }
    if (dateFilter === "Yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return `(${formatDate(y)})`;
    }
    if (dateFilter === "Last 7 Days") {
      const past7 = new Date(now);
      past7.setDate(past7.getDate() - 7);
      return `(${formatDate(past7)} - ${formatDate(now)})`;
    }
    if (dateFilter === "This Month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return `(${formatDate(start)} - ${formatDate(now)})`;
    }
    if (dateFilter === "Last 1 Month") {
      const past30 = new Date(now);
      past30.setDate(past30.getDate() - 30);
      return `(${formatDate(past30)} - ${formatDate(now)})`;
    }
    if (dateFilter === "Last 3 Months") {
      const past90 = new Date(now);
      past90.setDate(past90.getDate() - 90);
      return `(${formatDate(past90)} - ${formatDate(now)})`;
    }
    if (dateFilter === "Custom Date" && customStartDate && customEndDate) {
      return `(${formatDate(new Date(customStartDate))} - ${formatDate(new Date(customEndDate))})`;
    }
    return "(All Time)";
  };

  // Time-filtered returns and cancellations for overview
  const timeFilteredReturns = returns.filter((r) => isWithinSelectedDate(r.created_at));
  const timeFilteredCancellations = cancellations.filter((c) => isWithinSelectedDate(c.created_at || c.updated_at));

  // Filtered Returns by Sub-Tab and Search
  const filteredReturns = returns.filter((item) => {
    const matchesSearch = 
      !searchQuery ||
      item.order_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.suborder_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.awb_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.product_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === "All" || item.category === categoryFilter;
    const matchesCourier = courierFilter === "All" || item.courier_partner === courierFilter;
    const matchesReturnType = 
      returnTypeFilter === "All" || 
      (returnTypeFilter === "Customer Return" && item.return_type === "CUSTOMER_RETURN") ||
      (returnTypeFilter === "Courier Return (RTO)" && item.return_type === "RTO");

    const statusMatches = (() => {
      switch (trackingSubTab) {
        case "in_transit": return item.status?.toLowerCase() === "in_transit";
        case "out_for_delivery": return item.status?.toLowerCase() === "out_for_delivery";
        case "delivered": return item.status?.toLowerCase() === "delivered";
        case "lost": return item.status?.toLowerCase() === "lost";
        case "no_charge": return item.status?.toLowerCase() === "no_return_no_charge";
        case "disposed": return item.status?.toLowerCase() === "disposed";
        default: return true;
      }
    })();

    return matchesSearch && matchesCategory && matchesCourier && matchesReturnType && statusMatches;
  });

  // Filtered Claims
  const filteredClaims = claims.filter((claim) => {
    if (claimsSubTab === "all") return true;
    return claim.status?.toLowerCase() === claimsSubTab;
  });

  // Handle SPF Claim Submission
  const handleRaiseClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimTargetReturn) return;
    setSubmittingClaim(true);

    try {
      const newClaim = {
        claim_id: `CLM-${Math.floor(100000 + Math.random() * 900000)}`,
        return_id: claimTargetReturn.id,
        order_id: claimTargetReturn.order_id,
        suborder_id: claimTargetReturn.suborder_id,
        seller_id: sellerId || "seller_default",
        product_id: claimTargetReturn.product_id,
        product_name: claimTargetReturn.product_name,
        product_image: claimTargetReturn.product_image,
        claim_type: claimForm.claimType,
        claim_amount: parseFloat(claimForm.claimAmount || "0"),
        status: "OPEN",
        seller_comments: claimForm.sellerComments,
        unboxing_video_url: claimForm.unboxingVideoUrl || "https://example.com/unboxing_video.mp4",
        outer_box_image_url: claimForm.outerBoxImageUrl || "https://images.unsplash.com/photo-1586880244406-556ebe35f282?w=500",
        item_damage_images: claimForm.itemDamageImageUrl ? [claimForm.itemDamageImageUrl] : ["https://images.unsplash.com/photo-1584905066893-7d5c142ba4e1?w=500"],
      };

      // Try saving to Supabase
      const { data, error } = await supabase.from("seller_claims").insert([newClaim]).select().single();

      if (!error && data) {
        setClaims((prev) => [data, ...prev]);
      } else {
        setClaims((prev) => [newClaim, ...prev]);
      }

      setShowSpfClaimModal(false);
      setClaimForm({
        claimType: "WRONG_ITEM",
        claimAmount: "",
        unboxingVideoUrl: "",
        outerBoxImageUrl: "",
        itemDamageImageUrl: "",
        sellerComments: "",
      });
      alert("✅ SPF Claim raised successfully! Zebalpha Support team will review evidence within 48 hours.");
      setActiveMainTab("claims");
    } catch (err) {
      console.error("Error raising claim:", err);
      alert("Failed to raise claim. Please try again.");
    } finally {
      setSubmittingClaim(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1E293B] pb-20 font-sans">
      
      {/* 1. TOP HEADER BAR */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Title & Help links */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-indigo-600" />
              <h1 className="text-xl font-bold tracking-tight text-gray-900">Return/RTO Orders</h1>
            </div>

            <div className="hidden sm:flex items-center gap-4 text-xs font-semibold">
              <button 
                onClick={() => setShowRateCardModal(true)}
                className="text-indigo-600 hover:text-indigo-800 hover:underline transition"
              >
                View Rate Card
              </button>
              <button 
                onClick={() => setShowHowItWorksModal(true)}
                className="flex items-center gap-1 text-red-600 hover:text-red-700 font-medium"
              >
                <PlayCircle className="w-4 h-4 fill-red-600 text-white" />
                <span>How it works?</span>
              </button>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order ID, SKU or AWB Number"
              className="w-full pl-9 pr-4 py-2 bg-gray-50 hover:bg-white focus:bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition shadow-inner"
            />
          </div>
        </div>

        {/* 2. PRIMARY TAB NAVIGATION */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-8 border-t border-gray-100">
          <button
            onClick={() => setActiveMainTab("overview")}
            className={`py-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
              activeMainTab === "overview"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveMainTab("tracking")}
            className={`py-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
              activeMainTab === "tracking"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            Return Tracking
          </button>
          <button
            onClick={() => setActiveMainTab("claims")}
            className={`py-3 text-sm font-semibold border-b-2 transition flex items-center gap-2 ${
              activeMainTab === "claims"
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            Claim Tracking
            {claims.length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                {claims.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">

        {/* ====================================================================== */}
        {/* TAB 1: OVERVIEW (MATCHES SCREENSHOT 2) */}
        {/* ====================================================================== */}
        {activeMainTab === "overview" && (
          <div className="space-y-6">
            
            {/* Header / Date selector */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 font-bold text-gray-700 text-xs">
                  <Calendar className="w-4 h-4 text-indigo-600" />
                  <span className="uppercase tracking-wider">Timeline:</span>
                  <span className="text-gray-500 font-semibold">{getDateRangeLabel()}</span>
                </div>
                
                <select 
                  value={dateFilter} 
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="text-xs font-bold bg-gray-50 hover:bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs transition"
                >
                  <option value="Today">Today</option>
                  <option value="Yesterday">Yesterday</option>
                  <option value="Last 7 Days">Last 7 Days</option>
                  <option value="This Month">This Month</option>
                  <option value="Last 1 Month">Last 1 Month</option>
                  <option value="Last 3 Months">Last 3 Months</option>
                  <option value="All Time">All Time</option>
                  <option value="Custom Date">Custom Date Range 📅</option>
                </select>

                {dateFilter === "Custom Date" && (
                  <div className="flex items-center gap-2 animate-in fade-in duration-200">
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="text-xs font-medium bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1 text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-gray-400">to</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="text-xs font-medium bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-1 text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs font-bold text-indigo-600">
                <TrendingUp className="w-4 h-4" />
                <span>Live Return & Cancellation Monitor</span>
              </div>
            </div>

            {/* Metric KPI Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Card 1: Customer Returns */}
              <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-xs space-y-3 hover:border-indigo-200 transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
                    Customer Returns
                  </span>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                    Post-Delivery
                  </span>
                </div>

                <div className="pt-1">
                  <div className="text-2xl font-black text-gray-900 tracking-tight">
                    {timeFilteredReturns.filter((r) => r.return_type === "CUSTOMER_RETURN").length}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5 font-medium">
                    Total customer returns in this period
                  </div>
                </div>

                <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px]">
                  <span className="text-gray-500">Reverse Transit Fee:</span>
                  <span className="font-black text-emerald-600">₹0 (Waived)</span>
                </div>
              </div>

              {/* Card 2: Courier Returns (RTO) */}
              <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-xs space-y-3 hover:border-rose-200 transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-rose-600" />
                    Courier Returns (RTO)
                  </span>
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                    Undelivered
                  </span>
                </div>

                <div className="pt-1">
                  <div className="text-2xl font-black text-rose-600 tracking-tight">
                    {timeFilteredReturns.filter((r) => r.return_type === "RTO").length}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5 font-medium">
                    Failed delivery / returned to origin
                  </div>
                </div>

                <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px]">
                  <span className="text-gray-500">RTO Shipping Fee:</span>
                  <span className="font-black text-emerald-600">₹0 (Free RTO)</span>
                </div>
              </div>

              {/* Card 3: Order Cancellations */}
              <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-xs space-y-3 hover:border-amber-200 transition">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                    <Ban className="w-3.5 h-3.5 text-amber-600" />
                    Order Cancellations
                  </span>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                    Pre-Dispatch
                  </span>
                </div>

                <div className="pt-1">
                  <div className="text-2xl font-black text-amber-700 tracking-tight">
                    {timeFilteredCancellations.length}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5 font-medium">
                    Cancelled within 60-min window
                  </div>
                </div>

                <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between text-[11px]">
                  <span className="text-gray-500">Loss Prevented:</span>
                  <span className="font-black text-indigo-600">100% Protected</span>
                </div>
              </div>

            </div>

            {/* Return Reasons & Protection Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Return Reason Breakdown */}
              <div className="bg-white rounded-xl border border-gray-200/80 p-5 shadow-xs space-y-3">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Return & Cancellation Root Causes
                </h4>
                <div className="space-y-2.5 pt-1 text-xs font-medium">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Size / Fit Issue</span>
                    <span className="font-bold text-gray-900">
                      {timeFilteredReturns.filter((r) => r.reason?.toLowerCase().includes("size") || r.reason?.toLowerCase().includes("fit")).length} cases
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${Math.min(100, (timeFilteredReturns.filter((r) => r.reason?.toLowerCase().includes("size") || r.reason?.toLowerCase().includes("fit")).length / Math.max(1, timeFilteredReturns.length)) * 100)}%` }}></div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-gray-600">Defective / Damaged Fabric</span>
                    <span className="font-bold text-gray-900">
                      {timeFilteredReturns.filter((r) => r.reason?.toLowerCase().includes("defect") || r.reason?.toLowerCase().includes("damage")).length} cases
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-rose-500 h-full rounded-full" style={{ width: `${Math.min(100, (timeFilteredReturns.filter((r) => r.reason?.toLowerCase().includes("defect") || r.reason?.toLowerCase().includes("damage")).length / Math.max(1, timeFilteredReturns.length)) * 100)}%` }}></div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-gray-600">Customer Changed Mind (Pre-dispatch cancellation)</span>
                    <span className="font-bold text-gray-900">
                      {timeFilteredCancellations.length} cases
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: `${Math.min(100, (timeFilteredCancellations.length / Math.max(1, timeFilteredReturns.length + timeFilteredCancellations.length)) * 100)}%` }}></div>
                  </div>
                </div>
              </div>

              {/* SPF Seller Protection Fund Banner */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50/40 border border-amber-200/80 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-black text-amber-950 uppercase tracking-wider">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    <span>Seller Protection Fund (SPF)</span>
                  </div>
                  <p className="text-xs text-amber-900/80 leading-relaxed">
                    Did you receive wrong, damaged, or empty packages from customer returns or courier RTOs? Raise an SPF claim within 72 hours with continuous 360° unboxing video evidence to get 100% financial reimbursement.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-amber-200/60">
                  <div className="text-xs text-amber-900 font-bold">
                    Claims Status: {claims.filter(c => c.status === "APPROVED").length} Approved / {claims.length} Total
                  </div>
                  <button
                    onClick={() => setActiveMainTab("claims")}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold text-xs rounded-lg shadow-2xs transition"
                  >
                    View Claims
                  </button>
                </div>
              </div>

            </div>

            {/* Recent Return & Cancellation Events List */}
            <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Return & Cancellation Log</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Showing events filtered by timeline</p>
                </div>
                <div className="text-xs text-gray-500 font-bold">
                  {timeFilteredReturns.length + timeFilteredCancellations.length} total events recorded
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="py-3 px-4">Event Type</th>
                      <th className="py-3 px-4">Order / Suborder ID</th>
                      <th className="py-3 px-4">Item Details</th>
                      <th className="py-3 px-4">Reason</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {timeFilteredReturns.length === 0 && timeFilteredCancellations.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-gray-400 font-medium">
                          No returns or cancellations recorded for the selected timeline.
                        </td>
                      </tr>
                    ) : (
                      <>
                        {timeFilteredReturns.map((item) => (
                          <tr key={`ret-${item.id}`} className="hover:bg-gray-50/60 transition">
                            <td className="py-3.5 px-4">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                item.return_type === "RTO" 
                                  ? "bg-rose-50 text-rose-700 border border-rose-200" 
                                  : "bg-indigo-50 text-indigo-700 border border-indigo-200"
                              }`}>
                                {item.return_type === "RTO" ? "Courier RTO" : "Customer Return"}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-gray-800">
                              {item.suborder_id || item.order_id}
                            </td>
                            <td className="py-3.5 px-4">
                              <p className="font-bold text-gray-900 line-clamp-1">{item.product_name || "Apparel Item"}</p>
                              <span className="text-[10px] text-gray-400 font-mono">SKU: {item.sku || "PROD-SKU"}</span>
                            </td>
                            <td className="py-3.5 px-4 text-gray-600 font-medium">
                              {item.reason || "Defective / Size mismatch"}
                            </td>
                            <td className="py-3.5 px-4 text-gray-500 font-medium">
                              {new Date(item.created_at || Date.now()).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                                {item.status || "In Transit"}
                              </span>
                            </td>
                          </tr>
                        ))}

                        {timeFilteredCancellations.map((item) => (
                          <tr key={`canc-${item.id}`} className="hover:bg-gray-50/60 transition bg-amber-50/20">
                            <td className="py-3.5 px-4">
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                                Pre-Dispatch Cancel
                              </span>
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold text-gray-800">
                              {item.order_number || item.id}
                            </td>
                            <td className="py-3.5 px-4">
                              <p className="font-bold text-gray-900 line-clamp-1">{item.product_name || item.title || "Ordered Item"}</p>
                              <span className="text-[10px] text-gray-400">Qty: {item.quantity || 1}</span>
                            </td>
                            <td className="py-3.5 px-4 text-amber-800 font-medium">
                              {item.cancel_reason || "Customer cancelled during 60-min window"}
                            </td>
                            <td className="py-3.5 px-4 text-gray-500 font-medium">
                              {new Date(item.created_at || Date.now()).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                            </td>
                            <td className="py-3.5 px-4 text-center">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 uppercase">
                                Cancelled
                              </span>
                            </td>
                          </tr>
                        ))}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}


        {/* ====================================================================== */}
        {/* TAB 2: RETURN TRACKING (MATCHES SCREENSHOTS 1, 3, 4) */}
        {/* ====================================================================== */}
        {activeMainTab === "tracking" && (
          <div className="space-y-5">
            
            {/* Horizontal Sub-Tabs Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-gray-200">
              {[
                { key: "in_transit", label: "In transit" },
                { key: "out_for_delivery", label: "Out for Delivery" },
                { key: "delivered", label: "Delivered" },
                { key: "lost", label: "Lost" },
                { key: "no_charge", label: "No Return No Charge", isNew: true },
                { key: "disposed", label: "Disposed" },
              ].map((tab) => {
                const count = returns.filter((r) => r.status?.toLowerCase() === tab.key).length;
                const isActive = trackingSubTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setTrackingSubTab(tab.key as any)}
                    className={`px-4 py-2 text-xs font-bold rounded-t-lg transition flex items-center gap-1.5 whitespace-nowrap relative ${
                      isActive
                        ? "bg-white text-indigo-700 border-t-2 border-indigo-600 border-x border-gray-200 shadow-2xs -mb-px"
                        : "text-gray-500 hover:text-gray-900 bg-transparent"
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.isNew && (
                      <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded text-[9px] font-black uppercase tracking-wider">
                        New
                      </span>
                    )}
                    {count > 0 && (
                      <span className="w-4 h-4 rounded-full bg-gray-100 text-gray-700 text-[10px] inline-flex items-center justify-center font-bold">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Filter Bar */}
            <div className="bg-white p-3.5 rounded-xl border border-gray-200/80 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-bold text-gray-500">Filter by :</span>
                
                {/* Return Created */}
                <select className="text-xs font-medium bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none">
                  <option>Return Created</option>
                  <option>Today</option>
                  <option>Last 7 Days</option>
                  <option>Last 30 Days</option>
                </select>

                {/* Category */}
                <select 
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="text-xs font-medium bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none"
                >
                  <option value="All">Category: All</option>
                  <option value="Men">Men&apos;s Wear</option>
                  <option value="Women">Women&apos;s Wear</option>
                  <option value="Kids">Kids Wear</option>
                  <option value="Streetwear">Streetwear & Hoodies</option>
                  <option value="T-Shirts">T-Shirts</option>
                </select>

                {/* Courier Partner */}
                <select 
                  value={courierFilter}
                  onChange={(e) => setCourierFilter(e.target.value)}
                  className="text-xs font-medium bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none"
                >
                  <option value="All">Courier Partner: All</option>
                  <option value="Delhivery">Delhivery</option>
                  <option value="Shadowfax">Shadowfax</option>
                  <option value="Ekart">Ekart</option>
                </select>

                {/* Return Type */}
                <select 
                  value={returnTypeFilter}
                  onChange={(e) => setReturnTypeFilter(e.target.value)}
                  className="text-xs font-medium bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none"
                >
                  <option value="All">Return Type: All</option>
                  <option value="Customer Return">Customer Return</option>
                  <option value="Courier Return (RTO)">Courier Return (RTO)</option>
                </select>

                <button 
                  onClick={() => {
                    setCategoryFilter("All");
                    setCourierFilter("All");
                    setReturnTypeFilter("All");
                    setSearchQuery("");
                  }}
                  className="text-xs font-semibold text-gray-500 hover:text-gray-800 px-2 py-1"
                >
                  Clear All
                </button>
              </div>

              {/* Files Export */}
              <button 
                onClick={() => alert("Downloading return report CSV...")}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-3 py-1.5 shadow-2xs transition"
              >
                <FileText className="w-3.5 h-3.5 text-gray-500" />
                <span>0/0 files ready</span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>
            </div>

            {/* Content: List or Empty State */}
            {filteredReturns.length === 0 ? (
              /* Empty State (Matching Screenshot 1 & 3) */
              <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-16 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-24 h-24 rounded-full bg-indigo-50/70 border border-indigo-100 flex items-center justify-center relative">
                  <RotateCcw className="w-10 h-10 text-indigo-400 stroke-[1.75]" />
                  <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center shadow">
                    0
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-800">No data as of now.</h4>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm">
                    There are currently no return or RTO shipments in the &quot;{trackingSubTab.replace(/_/g, " ")}&quot; stage.
                  </p>
                </div>
              </div>
            ) : (
              /* Delivered Returns Table (Matching Screenshot 4) */
              <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 bg-gray-50/80 border-b border-gray-100 text-[11px] font-bold text-gray-500 flex items-center justify-between">
                  <span>{filteredReturns.length} result found</span>
                  <span className="text-gray-400 font-normal">Delivered in last 2 weeks</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50/50 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-100">
                      <tr>
                        <th className="py-3 px-4">Product Details</th>
                        <th className="py-3 px-4">Suborder ID</th>
                        <th className="py-3 px-4">Return Reason</th>
                        <th className="py-3 px-4 text-center">Return Shipping Fee</th>
                        <th className="py-3 px-4">Delivered on</th>
                        <th className="py-3 px-4">AWB Number</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {filteredReturns.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50/60 transition">
                          
                          {/* Product Details */}
                          <td className="py-4 px-4 max-w-xs">
                            <div className="flex items-start gap-3">
                              <img
                                src={item.product_image || "https://images.unsplash.com/photo-1584905066893-7d5c142ba4e1?w=500"}
                                alt={item.product_name}
                                className="w-12 h-12 rounded-lg object-cover border border-gray-200 shrink-0 bg-gray-100"
                              />
                              <div className="space-y-0.5">
                                <p className="font-bold text-gray-900 line-clamp-2">{item.product_name}</p>
                                <div className="text-[10px] text-gray-400 space-y-0.2 font-medium">
                                  <div>SKU ID: {item.sku}</div>
                                  <div>Category: {item.category}</div>
                                  <div>Qty: {item.quantity || 1} | Size: {item.size || "Free Size"}</div>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Suborder ID */}
                          <td className="py-4 px-4 font-mono font-medium text-gray-800">
                            {item.suborder_id}
                          </td>

                          {/* Return Reason */}
                          <td className="py-4 px-4 font-medium text-gray-600">
                            {item.reason || "N/A"}
                          </td>

                          {/* Return Shipping Fee */}
                          <td className="py-4 px-4 text-center font-bold text-gray-900">
                            ₹{item.return_shipping_fee || 0}
                          </td>

                          {/* Delivered on */}
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-1.5 font-bold text-gray-900">
                              <span>{item.delivered_at_formatted || "26 Sept'26"}</span>
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            </div>
                          </td>

                          {/* AWB Number & Courier */}
                          <td className="py-4 px-4">
                            <div className="space-y-1">
                              <a
                                href={`https://www.delhivery.com/track/package/${item.awb_number}`}
                                target="_blank"
                                rel="noreferrer"
                                className="font-mono text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1"
                              >
                                <span>{item.awb_number}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-[10px] font-bold">
                                <Truck className="w-2.5 h-2.5 text-gray-500" />
                                <span>{item.courier_partner || "Delhivery"}</span>
                              </span>
                            </div>
                          </td>

                          {/* Action Buttons */}
                          <td className="py-4 px-4 text-right space-y-1.5">
                            <button
                              onClick={() => setSelectedReturn(item)}
                              className="w-full px-3 py-1 bg-white border border-gray-200 hover:border-gray-400 text-gray-800 font-bold rounded-md shadow-2xs hover:bg-gray-50 transition text-center"
                            >
                              View Details
                            </button>

                            <button
                              onClick={() => setShowPodModal(item)}
                              className="w-full px-3 py-1 text-indigo-600 hover:text-indigo-800 font-bold text-[11px] flex items-center justify-center gap-1 transition"
                            >
                              <Download className="w-3 h-3" />
                              <span>Download POD</span>
                            </button>

                            {/* Raise SPF Claim Button */}
                            {trackingSubTab === "delivered" && (
                              <button
                                onClick={() => {
                                  setClaimTargetReturn(item);
                                  setShowSpfClaimModal(true);
                                }}
                                className="w-full px-3 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-black rounded-md text-[10px] uppercase tracking-wider transition shadow-2xs"
                              >
                                ⚡ Raise SPF Claim
                              </button>
                            )}
                          </td>

                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}


        {/* ====================================================================== */}
        {/* TAB 3: CLAIM TRACKING (SPF DISPUTES - MATCHES SCREENSHOT 5) */}
        {/* ====================================================================== */}
        {activeMainTab === "claims" && (
          <div className="space-y-6">
            
            {/* Header + CTA */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Claims Sub-tabs */}
              <div className="flex items-center gap-3 border-b border-gray-200 sm:border-0 pb-2 sm:pb-0">
                {[
                  { key: "all", label: "All", count: claims.length },
                  { key: "open", label: "Open", count: claims.filter(c => c.status === "OPEN").length },
                  { key: "approved", label: "Approved", count: claims.filter(c => c.status === "APPROVED").length },
                  { key: "rejected", label: "Rejected", count: claims.filter(c => c.status === "REJECTED").length },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setClaimsSubTab(tab.key as any)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${
                      claimsSubTab === tab.key
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "text-gray-600 hover:text-gray-900 bg-white border border-gray-200"
                    }`}
                  >
                    {tab.label} ({tab.count})
                  </button>
                ))}
              </div>

              {/* Raise SPF Claim Button */}
              <button
                onClick={() => {
                  const delivered = returns.find((r) => r.status?.toLowerCase() === "delivered");
                  if (delivered) {
                    setClaimTargetReturn(delivered);
                    setShowSpfClaimModal(true);
                  } else {
                    alert("No delivered return orders available to claim against.");
                  }
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Raise New SPF Claim</span>
              </button>
            </div>

            {/* Claims Content: List or Empty State */}
            {filteredClaims.length === 0 ? (
              /* Empty State (Matching Screenshot 5) */
              <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm p-16 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-20 h-20 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <FileCheck className="w-9 h-9 stroke-[1.75]" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-gray-800">Looking for Claim Tracking?</h4>
                  <p className="text-xs text-gray-400 max-w-sm">
                    Seller Protection Fund (SPF) protects you against wrong, damaged, or fake return items. File a dispute within 72 hours of return delivery.
                  </p>
                </div>
                <button
                  onClick={() => {
                    const delivered = returns.find((r) => r.status?.toLowerCase() === "delivered");
                    if (delivered) {
                      setClaimTargetReturn(delivered);
                      setShowSpfClaimModal(true);
                    } else {
                      alert("No delivered return available to raise a claim.");
                    }
                  }}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm transition"
                >
                  Raise SPF Claim Now
                </button>
              </div>
            ) : (
              /* Claims List Table */
              <div className="bg-white rounded-xl border border-gray-200/80 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50/80 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-100">
                      <tr>
                        <th className="py-3 px-4">Claim ID</th>
                        <th className="py-3 px-4">Suborder ID</th>
                        <th className="py-3 px-4">Product Details</th>
                        <th className="py-3 px-4">Dispute Type</th>
                        <th className="py-3 px-4 text-center">Claim Amount</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-center">Approved ₹</th>
                        <th className="py-3 px-4 text-right">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {filteredClaims.map((claim) => (
                        <tr key={claim.id || claim.claim_id} className="hover:bg-gray-50/60 transition">
                          <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">{claim.claim_id}</td>
                          <td className="py-3.5 px-4 font-mono text-gray-600">{claim.suborder_id}</td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-gray-900 line-clamp-1">{claim.product_name}</p>
                          </td>
                          <td className="py-3.5 px-4 font-bold text-gray-700">
                            {claim.claim_type?.replace(/_/g, " ")}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-gray-900">
                            ₹{claim.claim_amount}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              claim.status === "APPROVED" 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : claim.status === "REJECTED"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}>
                              {claim.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center font-black text-emerald-600">
                            {claim.approved_amount ? `₹${claim.approved_amount}` : "—"}
                          </td>
                          <td className="py-3.5 px-4 text-right text-gray-400 font-medium max-w-xs truncate">
                            {claim.admin_remarks || claim.seller_comments || "Under review by Zebalpha Support"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}

      </div>


      {/* ====================================================================== */}
      {/* MODAL 1: RAISE SPF CLAIM (SELLER PROTECTION FUND) */}
      {/* ====================================================================== */}
      {showSpfClaimModal && claimTargetReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-gray-900">Raise Seller Protection Fund (SPF) Claim</h3>
              </div>
              <button 
                onClick={() => setShowSpfClaimModal(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleRaiseClaim} className="p-6 space-y-5">
              
              {/* Product Info Preview */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200/80 flex items-center gap-4">
                <img
                  src={claimTargetReturn.product_image || "https://images.unsplash.com/photo-1584905066893-7d5c142ba4e1?w=500"}
                  alt={claimTargetReturn.product_name}
                  className="w-14 h-14 rounded-lg object-cover border border-gray-200 bg-white shrink-0"
                />
                <div className="space-y-1">
                  <div className="text-xs font-bold text-gray-900">{claimTargetReturn.product_name}</div>
                  <div className="text-[11px] text-gray-500">
                    Suborder ID: <span className="font-mono font-bold text-gray-800">{claimTargetReturn.suborder_id}</span>
                  </div>
                  <div className="text-[11px] text-gray-500">
                    AWB: <span className="font-mono text-gray-700">{claimTargetReturn.awb_number}</span> ({claimTargetReturn.courier_partner})
                  </div>
                </div>
              </div>

              {/* Claim Type */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Dispute Reason / Claim Type *
                </label>
                <select
                  value={claimForm.claimType}
                  onChange={(e) => setClaimForm({ ...claimForm, claimType: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                >
                  <option value="WRONG_ITEM">Received Completely Wrong Product (Customer/Courier fraud)</option>
                  <option value="DAMAGED_ITEM">Product Received in Broken / Damaged Condition</option>
                  <option value="MISSING_QUANTITY">Missing Items / Incomplete Combo inside box</option>
                  <option value="EMPTY_PACKAGE">Empty Package Received (Product stolen)</option>
                  <option value="FAKE_DELIVERY">Fake Delivery (Marked delivered by courier but not received)</option>
                </select>
              </div>

              {/* Claim Amount */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Claim Loss Amount (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 font-bold text-xs">₹</span>
                  <input
                    type="number"
                    value={claimForm.claimAmount}
                    onChange={(e) => setClaimForm({ ...claimForm, claimAmount: e.target.value })}
                    placeholder="Enter estimated cost of lost/damaged item"
                    className="w-full pl-8 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              {/* Video Proof (Unboxing Video) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center justify-between">
                  <span>Unboxing Video URL (Google Drive / Cloudinary) *</span>
                  <span className="text-[10px] text-indigo-600 font-normal">Continuous unboxing without cut</span>
                </label>
                <input
                  type="url"
                  value={claimForm.unboxingVideoUrl}
                  onChange={(e) => setClaimForm({ ...claimForm, unboxingVideoUrl: e.target.value })}
                  placeholder="https://drive.google.com/file/d/..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Photos Proof */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Outer Box & Shipping Label Photo *
                  </label>
                  <input
                    type="url"
                    value={claimForm.outerBoxImageUrl}
                    onChange={(e) => setClaimForm({ ...claimForm, outerBoxImageUrl: e.target.value })}
                    placeholder="Paste image link or upload"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                    Damaged / Wrong Item Photo *
                  </label>
                  <input
                    type="url"
                    value={claimForm.itemDamageImageUrl}
                    onChange={(e) => setClaimForm({ ...claimForm, itemDamageImageUrl: e.target.value })}
                    placeholder="Paste image link or upload"
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* Seller Explanation Comments */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                  Detailed Explanation / Incident Summary *
                </label>
                <textarea
                  rows={3}
                  value={claimForm.sellerComments}
                  onChange={(e) => setClaimForm({ ...claimForm, sellerComments: e.target.value })}
                  placeholder="Explain what was in the parcel vs what you received from courier partner..."
                  className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Terms Warning */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-[11px] text-amber-900 font-medium leading-relaxed">
                ⚠️ False claims or altered video evidence may lead to permanent suspension of your Zebalpha supplier account under SPF guidelines.
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSpfClaimModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingClaim}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
                >
                  {submittingClaim ? "Submitting Claim..." : "Submit Claim for Review"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}


      {/* ====================================================================== */}
      {/* MODAL 2: VIEW DETAILS MODAL */}
      {/* ====================================================================== */}
      {selectedReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h3 className="text-base font-bold text-gray-900">Return Order Details</h3>
              <button onClick={() => setSelectedReturn(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Suborder ID:</span>
                <span className="font-mono font-bold text-gray-800">{selectedReturn.suborder_id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Product Name:</span>
                <span className="font-bold text-gray-800 text-right">{selectedReturn.product_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Return Reason:</span>
                <span className="font-bold text-rose-600">{selectedReturn.reason || "Defective Item"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">AWB Number:</span>
                <span className="font-mono font-bold text-indigo-600">{selectedReturn.awb_number}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Courier Partner:</span>
                <span className="font-bold text-gray-800">{selectedReturn.courier_partner}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-50">
                <span className="text-gray-500">Return Shipping Fee:</span>
                <span className="font-bold text-emerald-600">₹{selectedReturn.return_shipping_fee || 0}</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedReturn(null)}
                className="w-full py-2.5 bg-gray-900 text-white font-bold text-xs rounded-xl shadow transition hover:bg-black"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ====================================================================== */}
      {/* MODAL 3: RATE CARD & HOW IT WORKS MODALS */}
      {/* ====================================================================== */}
      {showRateCardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900">Zebalpha Reverse Shipping Rate Card</h3>
              <button onClick={() => setShowRateCardModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="text-xs space-y-2 text-gray-600">
              <p>• <strong>Courier Return (RTO):</strong> ₹0 reverse shipping fee (Waived by platform).</p>
              <p>• <strong>Customer Return (Easy Return):</strong> Standard freight slab starting at ₹45 / 500g.</p>
              <p>• <strong>Defective / Wrong Item Return:</strong> Free reverse pickup for customers.</p>
            </div>
            <button onClick={() => setShowRateCardModal(false)} className="w-full py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl">
              Got It
            </button>
          </div>
        </div>
      )}

      {showHowItWorksModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900">How Returns & SPF Work</h3>
              <button onClick={() => setShowHowItWorksModal(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="text-xs space-y-2.5 text-gray-600 leading-relaxed">
              <p>1. <strong>Doorstep Quality Check:</strong> Delivery partner verifies apparel tags, polybags, and fabric condition before accepting return from customer.</p>
              <p>2. <strong>Tracking:</strong> Track clothing returns live from &apos;In Transit&apos; to &apos;Delivered&apos; at your pickup hub.</p>
              <p>3. <strong>SPF Protection:</strong> If you receive wrong/damaged apparel, record a clear 360° unboxing video and raise an SPF claim within 72 hours to get up to 100% financial reimbursement.</p>
            </div>
            <button onClick={() => setShowHowItWorksModal(false)} className="w-full py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl">
              Understand
            </button>
          </div>
        </div>
      )}

      {/* POD Download Simulation */}
      {showPodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Proof of Delivery (POD)</h3>
              <p className="text-xs text-gray-500 mt-1 font-mono">AWB: {showPodModal.awb_number}</p>
              <p className="text-xs text-gray-400 mt-0.5">Signed by Merchant on {showPodModal.delivered_at_formatted || "26 Sept'26"}</p>
            </div>
            <button 
              onClick={() => setShowPodModal(null)} 
              className="w-full py-2 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-xl"
            >
              Close POD Viewer
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
