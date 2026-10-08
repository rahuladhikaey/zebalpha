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
  ShieldAlert, 
  Truck, 
  Package, 
  ChevronDown, 
  X, 
  UploadCloud, 
  IndianRupee, 
  Sparkles,
  Layers,
  ArrowUpRight,
  TrendingUp,
  Camera,
  FileCheck,
  Calendar,
  Ban,
  ShieldCheck,
  Eye,
  Check
} from "lucide-react";

export default function ReturnsAndRtoPage() {
  // 11 Operational Tabs as requested
  const [activeTab, setActiveTab] = useState<string>("requests");

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [returnTypeFilter, setReturnTypeFilter] = useState("all");

  // Data states
  const [returns, setReturns] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [sellerProducts, setSellerProducts] = useState<any[]>([]);
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");

  // Modals & QC Inspection State
  const [selectedReturn, setSelectedReturn] = useState<any | null>(null);
  const [qcModalReturn, setQcModalReturn] = useState<any | null>(null);
  const [processingQc, setProcessingQc] = useState(false);

  // QC Checklist Form
  const [qcPackaging, setQcPackaging] = useState<"OK" | "DAMAGED">("OK");
  const [qcProduct, setQcProduct] = useState<"UNUSED" | "USED" | "DAMAGED">("UNUSED");
  const [qcAccuracy, setQcAccuracy] = useState<"CORRECT" | "WRONG_ITEM">("CORRECT");
  const [qcAccessories, setQcAccessories] = useState<"ALL_PRESENT" | "MISSING">("ALL_PRESENT");
  const [qcResult, setQcResult] = useState<"PASS" | "FAIL" | "PARTIAL" | "DISPUTED">("PASS");
  const [qcNotes, setQcNotes] = useState("");
  const [qcEvidenceUrl, setQcEvidenceUrl] = useState("");

  // Load Returns & Orders Data
  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: seller } = await supabase
        .from("sellers")
        .select("id")
        .or(`user_id.eq.${user.id},email.eq.${user.email?.toLowerCase().trim()}`)
        .maybeSingle();

      const currentSellerId = seller?.id || user.id;
      setSellerId(currentSellerId);
      const sellerIds = [user.id];
      if (seller?.id) sellerIds.push(seller.id);

      // 1. Fetch products
      const { data: productsData } = await supabase
        .from("products")
        .select("*")
        .in("seller_id", sellerIds);
      setSellerProducts(productsData || []);

      // 2. Fetch orders with returns or RTO status
      const { data: ordersData } = await supabase
        .from("orders")
        .select("*")
        .or(`seller_id.eq.${user.id}${seller?.id ? `,seller_id.eq.${seller.id}` : ""}`)
        .order("created_at", { ascending: false });

      const returnOrders = (ordersData || []).filter((o: any) => {
        const st = String(o.order_status || "").toLowerCase();
        const retSt = String(o.return_status || "").toLowerCase();
        return st.startsWith("return") || st.startsWith("rto") || (retSt && retSt !== "none") || o.refund_status === "COMPLETED";
      });

      setOrders(ordersData || []);
      setReturns(returnOrders);
    } catch (err) {
      console.error("Error fetching returns data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Submit QC Inspection and Ledger Adjustment
  const handleCompleteQc = async () => {
    if (!qcModalReturn) return;
    setProcessingQc(true);
    setStatusMessage("Recording QC Inspection and Updating Financial Ledger...");

    try {
      const res = await fetch("/api/orders/return-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: qcModalReturn.id,
          action: "SUBMIT_QC",
          qc_result: qcResult,
          packaging_condition: qcPackaging,
          product_condition: qcProduct,
          accuracy: qcAccuracy,
          accessories: qcAccessories,
          qc_notes: qcNotes,
          qc_evidence_urls: qcEvidenceUrl ? [qcEvidenceUrl] : []
        })
      });

      const json = await res.json();
      if (json.success) {
        setStatusMessage(
          qcResult === "PASS"
            ? "✓ QC Passed! Product restocked to inventory & refund debit recorded in ledger."
            : "⚠️ QC Failed / Disputed. Return escalated to Support Desk."
        );
        setQcModalReturn(null);
        await loadData();
      } else {
        alert(json.message || "Failed to submit QC");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setProcessingQc(false);
      setTimeout(() => setStatusMessage(""), 4000);
    }
  };

  // Quick Action
  const handleQuickAction = async (orderId: string, action: string) => {
    try {
      setStatusMessage(`Processing return action: ${action}...`);
      const res = await fetch("/api/orders/return-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action })
      });
      const json = await res.json();
      if (json.success) {
        setStatusMessage(`✓ Status updated successfully (${action})`);
        await loadData();
      } else {
        alert(json.message || "Action failed");
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setTimeout(() => setStatusMessage(""), 4000);
    }
  };

  // 11 requested operational tabs
  const tabsList = [
    { key: "requests", label: "Return Requests" },
    { key: "approved", label: "Approved" },
    { key: "pickup_pending", label: "Pickup Pending" },
    { key: "in_transit", label: "In Transit" },
    { key: "received", label: "Received" },
    { key: "qc_pending", label: "QC Pending" },
    { key: "approved_refund", label: "Approved Refund" },
    { key: "rejected", label: "Rejected" },
    { key: "replacement", label: "Replacement" },
    { key: "refunded", label: "Refunded" },
    { key: "disputed", label: "Disputed" },
  ];

  // Tab count
  const getTabCount = (tabKey: string) => {
    return returns.filter(item => {
      const st = String(item.order_status || "").toLowerCase();
      const retSt = String(item.return_status || "").toLowerCase();
      switch (tabKey) {
        case "requests": return st === "return_requested" || retSt === "requested";
        case "approved": return st === "return_approved" || retSt === "approved";
        case "pickup_pending": return retSt === "pickup_pending" || st === "return_approved";
        case "in_transit": return st === "return_in_transit" || retSt === "picked_up";
        case "received": return st === "return_received" || retSt === "received";
        case "qc_pending": return retSt === "qc_pending" || st === "return_received";
        case "approved_refund": return st === "returned" && retSt === "completed";
        case "rejected": return st === "return_rejected" || retSt === "rejected";
        case "replacement": return item.return_type === "REPLACEMENT" || item.return_type === "EXCHANGE";
        case "refunded": return item.refund_status === "COMPLETED";
        case "disputed": return st === "return_qc_failed" || retSt === "disputed";
        default: return true;
      }
    }).length;
  };

  // Filtered returns
  const filteredReturns = returns.filter((item) => {
    const st = String(item.order_status || "").toLowerCase();
    const retSt = String(item.return_status || "").toLowerCase();

    // Tab filter
    let matchesTab = false;
    switch (activeTab) {
      case "requests": matchesTab = st === "return_requested" || retSt === "requested"; break;
      case "approved": matchesTab = st === "return_approved" || retSt === "approved"; break;
      case "pickup_pending": matchesTab = retSt === "pickup_pending" || st === "return_approved"; break;
      case "in_transit": matchesTab = st === "return_in_transit" || retSt === "picked_up"; break;
      case "received": matchesTab = st === "return_received" || retSt === "received"; break;
      case "qc_pending": matchesTab = retSt === "qc_pending" || st === "return_received"; break;
      case "approved_refund": matchesTab = st === "returned" && retSt === "completed"; break;
      case "rejected": matchesTab = st === "return_rejected" || retSt === "rejected"; break;
      case "replacement": matchesTab = item.return_type === "REPLACEMENT" || item.return_type === "EXCHANGE"; break;
      case "refunded": matchesTab = item.refund_status === "COMPLETED"; break;
      case "disputed": matchesTab = st === "return_qc_failed" || retSt === "disputed"; break;
      default: matchesTab = true;
    }

    if (!matchesTab) return false;

    // Search query
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const ordNum = (item.order_number || item.id || "").toLowerCase();
      const cust = (item.customer_name || "").toLowerCase();
      const reason = (item.return_reason || "").toLowerCase();
      return ordNum.includes(q) || cust.includes(q) || reason.includes(q);
    }

    return true;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400">Reverse Logistics</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase flex items-center gap-2.5">
            <RotateCcw className="h-6 w-6 text-amber-400" />
            <span>Returns, RTO & QC Inspection</span>
          </h1>
          <p className="text-xs sm:text-sm font-bold text-zinc-400 mt-0.5">
            Customer return requests, courier reverse pickups, physical QC verification, and financial refund ledger.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => loadData()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-white border border-zinc-800 text-xs font-black uppercase tracking-wider transition cursor-pointer"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Advisory Status Banner */}
      {statusMessage && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-black uppercase tracking-wider flex items-center gap-2 animate-in fade-in">
          <ShieldAlert className="h-4 w-4 animate-bounce text-amber-400" />
          {statusMessage}
        </div>
      )}

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-3xl bg-zinc-900/40 border border-zinc-800/80 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Return Requests</span>
          <p className="text-2xl font-black text-white">{getTabCount("requests")}</p>
          <span className="text-[10px] text-amber-400 font-bold">Awaiting Seller Approval</span>
        </div>

        <div className="p-4 rounded-3xl bg-zinc-900/40 border border-zinc-800/80 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Reverse In Transit</span>
          <p className="text-2xl font-black text-white">{getTabCount("in_transit") + getTabCount("pickup_pending")}</p>
          <span className="text-[10px] text-zinc-400 font-bold">Courier Reverse Pickup Active</span>
        </div>

        <div className="p-4 rounded-3xl bg-zinc-900/40 border border-zinc-800/80 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">QC Pending</span>
          <p className="text-2xl font-black text-white">{getTabCount("qc_pending")}</p>
          <span className="text-[10px] text-purple-400 font-bold">Parcels Received at Warehouse</span>
        </div>

        <div className="p-4 rounded-3xl bg-zinc-900/40 border border-zinc-800/80 space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Disputed / SPF Claims</span>
          <p className="text-2xl font-black text-rose-400">{getTabCount("disputed")}</p>
          <span className="text-[10px] text-rose-400/80 font-bold">QC Failures Under Dispute</span>
        </div>
      </div>

      {/* 11 Operational Tabs */}
      <div className="flex items-center gap-1.5 border-b border-zinc-800 overflow-x-auto pb-1 scrollbar-none">
        {tabsList.map((tab) => {
          const isActive = activeTab === tab.key;
          const count = getTabCount(tab.key);
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition whitespace-nowrap cursor-pointer ${
                isActive
                  ? "border-amber-500 text-white bg-amber-500/10 rounded-t-xl"
                  : "border-transparent text-zinc-400 hover:text-white hover:bg-zinc-900/40 rounded-t-xl"
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                isActive 
                  ? "bg-amber-500 text-black" 
                  : count > 0 
                  ? "bg-zinc-800 text-zinc-300" 
                  : "bg-zinc-900 text-zinc-600"
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-zinc-900/40 p-4 rounded-3xl border border-zinc-800/80">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400">
            <Filter className="h-3.5 w-3.5" /> Filter:
          </div>
          <span className="text-xs font-bold text-zinc-300">
            Active Queue: <strong className="text-amber-400 uppercase">{activeTab.replace(/_/g, " ")}</strong>
          </span>
        </div>

        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Order ID, Customer, Reason..."
            className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-xs font-bold text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Returns List Table */}
      {loading ? (
        <div className="py-20 text-center space-y-3 bg-zinc-900/20 rounded-3xl border border-zinc-800">
          <div className="h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-zinc-400">Loading reverse logistics & QC queues...</p>
        </div>
      ) : filteredReturns.length === 0 ? (
        <div className="py-20 text-center space-y-3 bg-zinc-900/20 rounded-3xl border border-zinc-800">
          <RotateCcw className="h-10 w-10 text-zinc-600 mx-auto" />
          <h3 className="text-sm font-black text-white uppercase tracking-wider">No Records in this queue</h3>
          <p className="text-xs font-bold text-zinc-400">
            There are no returns or QC actions currently in "{activeTab.replace(/_/g, " ")}".
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReturns.map((ret) => {
            const rawItems = ret.items || ret.seller_items || [];
            const items = Array.isArray(rawItems) ? rawItems : [];
            const firstItem = items[0] || {};
            const orderNum = ret.order_number || String(ret.id).slice(0, 10).toUpperCase();
            const returnId = ret.return_id || `RET-${orderNum}`;
            const refundAmt = Number(ret.refund_amount || ret.total_amount || 0);

            return (
              <div
                key={ret.id}
                className="bg-zinc-900/40 rounded-3xl border border-zinc-800/80 overflow-hidden hover:border-zinc-700 transition"
              >
                <div className="p-4 sm:p-5 bg-zinc-900/70 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono text-xs sm:text-sm font-black text-white">Return #{returnId}</span>
                    <span className="text-xs font-mono font-bold text-zinc-400">Order #{orderNum}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-300 border border-amber-500/30">
                      {ret.return_reason || "Return Requested"}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase">Refund Value</span>
                    <p className="text-sm sm:text-base font-black text-white">₹{refundAmt.toLocaleString("en-IN")}</p>
                  </div>
                </div>

                <div className="p-4 sm:p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-zinc-800 border border-zinc-700 overflow-hidden shrink-0 flex items-center justify-center">
                        <Package className="h-6 w-6 text-zinc-500" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-white">{firstItem.name || "Apparel Item"}</p>
                        <p className="text-[11px] text-zinc-400 mt-0.5">Customer: <strong className="text-zinc-200">{ret.customer_name || "Customer"}</strong></p>
                        {ret.return_description && (
                          <p className="text-[11px] text-zinc-400 italic mt-0.5">"{ret.return_description}"</p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Action 1: Approve return request */}
                      {activeTab === "requests" && (
                        <>
                          <button
                            onClick={() => handleQuickAction(ret.id, "APPROVE")}
                            className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider transition cursor-pointer"
                          >
                            ✓ Approve Pickup
                          </button>
                          <button
                            onClick={() => handleQuickAction(ret.id, "REJECT")}
                            className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-black uppercase transition cursor-pointer"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {/* Action 2: Pickup Pending -> Mark Picked up */}
                      {(activeTab === "approved" || activeTab === "pickup_pending") && (
                        <button
                          onClick={() => handleQuickAction(ret.id, "PICKUP")}
                          className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase tracking-wider transition cursor-pointer"
                        >
                          🚚 Mark Picked Up by Courier
                        </button>
                      )}

                      {/* Action 3: In Transit -> Mark Received at warehouse */}
                      {activeTab === "in_transit" && (
                        <button
                          onClick={() => handleQuickAction(ret.id, "CONFIRM_RECEIVED")}
                          className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-black uppercase tracking-wider transition cursor-pointer"
                        >
                          📦 Mark Parcel Received
                        </button>
                      )}

                      {/* Action 4: Physical QC Inspection */}
                      {(activeTab === "received" || activeTab === "qc_pending") && (
                        <button
                          onClick={() => {
                            setQcModalReturn(ret);
                            setQcPackaging("OK");
                            setQcProduct("UNUSED");
                            setQcAccuracy("CORRECT");
                            setQcAccessories("ALL_PRESENT");
                            setQcResult("PASS");
                            setQcNotes("");
                            setQcEvidenceUrl("");
                          }}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-95 text-white text-xs font-black uppercase tracking-wider transition shadow-lg shadow-purple-600/20 cursor-pointer"
                        >
                          🔍 Start QC Inspection
                        </button>
                      )}

                      <button
                        onClick={() => setSelectedReturn(ret)}
                        className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-black uppercase tracking-wider transition cursor-pointer"
                      >
                        Audit Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* QC Inspection Modal */}
      {qcModalReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in">
          <div className="max-w-xl w-full rounded-3xl bg-zinc-950 p-6 md:p-8 border border-zinc-800 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Physical Verification</span>
                <h3 className="text-lg font-black text-white">Return QC Inspection Checklist</h3>
                <p className="text-xs text-zinc-400">Order #{qcModalReturn.order_number || qcModalReturn.id}</p>
              </div>
              <button onClick={() => setQcModalReturn(null)} className="h-8 w-8 rounded-full bg-zinc-900 text-zinc-400 font-bold">✕</button>
            </div>

            {/* Checklist Items */}
            <div className="space-y-4 text-xs">
              {/* Packaging Condition */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                <span className="text-[10px] font-black uppercase text-zinc-400">1. Outer Brand Packaging</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setQcPackaging("OK")}
                    className={`flex-1 py-2 rounded-xl text-xs font-black uppercase border transition cursor-pointer ${
                      qcPackaging === "OK" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-zinc-900 text-zinc-500 border-zinc-800"
                    }`}
                  >
                    Packaging Intact (OK)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQcPackaging("DAMAGED")}
                    className={`flex-1 py-2 rounded-xl text-xs font-black uppercase border transition cursor-pointer ${
                      qcPackaging === "DAMAGED" ? "bg-rose-500/20 text-rose-300 border-rose-500/40" : "bg-zinc-900 text-zinc-500 border-zinc-800"
                    }`}
                  >
                    Damaged / Torn
                  </button>
                </div>
              </div>

              {/* Product State */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                <span className="text-[10px] font-black uppercase text-zinc-400">2. Garment / Product Condition</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setQcProduct("UNUSED")}
                    className={`flex-1 py-2 rounded-xl text-xs font-black uppercase border transition cursor-pointer ${
                      qcProduct === "UNUSED" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-zinc-900 text-zinc-500 border-zinc-800"
                    }`}
                  >
                    Unused & Clean
                  </button>
                  <button
                    type="button"
                    onClick={() => setQcProduct("USED")}
                    className={`flex-1 py-2 rounded-xl text-xs font-black uppercase border transition cursor-pointer ${
                      qcProduct === "USED" ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-zinc-900 text-zinc-500 border-zinc-800"
                    }`}
                  >
                    Used / Washed
                  </button>
                  <button
                    type="button"
                    onClick={() => setQcProduct("DAMAGED")}
                    className={`flex-1 py-2 rounded-xl text-xs font-black uppercase border transition cursor-pointer ${
                      qcProduct === "DAMAGED" ? "bg-rose-500/20 text-rose-300 border-rose-500/40" : "bg-zinc-900 text-zinc-500 border-zinc-800"
                    }`}
                  >
                    Damaged
                  </button>
                </div>
              </div>

              {/* Item Accuracy */}
              <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
                <span className="text-[10px] font-black uppercase text-zinc-400">3. Correct Product Returned</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setQcAccuracy("CORRECT")}
                    className={`flex-1 py-2 rounded-xl text-xs font-black uppercase border transition cursor-pointer ${
                      qcAccuracy === "CORRECT" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-zinc-900 text-zinc-500 border-zinc-800"
                    }`}
                  >
                    Original Product
                  </button>
                  <button
                    type="button"
                    onClick={() => setQcAccuracy("WRONG_ITEM")}
                    className={`flex-1 py-2 rounded-xl text-xs font-black uppercase border transition cursor-pointer ${
                      qcAccuracy === "WRONG_ITEM" ? "bg-rose-500/20 text-rose-300 border-rose-500/40" : "bg-zinc-900 text-zinc-500 border-zinc-800"
                    }`}
                  >
                    Wrong Item In Box ⚠️
                  </button>
                </div>
              </div>

              {/* QC Final Decision */}
              <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-700 space-y-2">
                <span className="text-[10px] font-black uppercase text-amber-400">Final QC Verdict</span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setQcResult("PASS")}
                    className={`py-2.5 rounded-xl text-xs font-black uppercase border transition cursor-pointer ${
                      qcResult === "PASS" ? "bg-emerald-500 text-black font-black" : "bg-zinc-800 text-zinc-400 border-zinc-700"
                    }`}
                  >
                    ✓ PASS (Approve Refund)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQcResult("DISPUTED")}
                    className={`py-2.5 rounded-xl text-xs font-black uppercase border transition cursor-pointer ${
                      qcResult === "DISPUTED" ? "bg-rose-600 text-white font-black" : "bg-zinc-800 text-zinc-400 border-zinc-700"
                    }`}
                  >
                    ⚠️ DISPUTE / FAIL (SPF Claim)
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-400">Inspector Remarks / Evidence</label>
                <textarea
                  value={qcNotes}
                  onChange={(e) => setQcNotes(e.target.value)}
                  placeholder="Notes on garment tags, unboxing remarks, or reason for dispute..."
                  rows={2}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs text-white placeholder-zinc-500 outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <button
              onClick={handleCompleteQc}
              disabled={processingQc}
              className="w-full py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider transition shadow-xl shadow-amber-500/20 cursor-pointer disabled:opacity-50"
            >
              {processingQc ? "Saving Verification..." : "Confirm QC Verdict & Execute Ledger Adjustments"}
            </button>
          </div>
        </div>
      )}

      {/* Audit Drawer */}
      {selectedReturn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="max-w-lg w-full rounded-3xl bg-zinc-950 p-6 border border-zinc-800 shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-black text-white">Reverse Logistics Audit Record</h3>
              <button onClick={() => setSelectedReturn(null)} className="h-7 w-7 rounded-full bg-zinc-900 text-zinc-400">✕</button>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Return Identifier</span>
                <span className="font-mono text-white font-bold">{selectedReturn.return_id || `RET-${selectedReturn.order_number || selectedReturn.id}`}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Order Number</span>
                <span className="font-mono text-white font-bold">{selectedReturn.order_number || selectedReturn.id}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Customer</span>
                <span className="text-white font-bold">{selectedReturn.customer_name || "Customer"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">Return Reason</span>
                <span className="text-amber-400 font-bold">{selectedReturn.return_reason || "Customer Choice"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-zinc-800/60">
                <span className="text-zinc-400">QC Status</span>
                <span className="text-purple-300 font-bold">{selectedReturn.qc_result || "PENDING_INSPECTION"}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-zinc-400">Refund Amount</span>
                <span className="text-emerald-400 font-black">₹{Number(selectedReturn.refund_amount || selectedReturn.total_amount || 0).toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
