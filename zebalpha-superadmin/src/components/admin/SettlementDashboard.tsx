"use client";

import { useState, useEffect, useMemo } from "react";
import { apiService } from "@/services/apiService";
import { 
  CreditCard, 
  IndianRupee, 
  Sparkles, 
  ShieldCheck, 
  Building2, 
  TrendingUp, 
  ExternalLink, 
  CheckCircle2, 
  Copy, 
  Check, 
  RefreshCw,
  Search,
  Download,
  AlertTriangle,
  FileText,
  Clock,
  XCircle,
  RotateCcw,
  ArrowRight,
  Filter,
  Eye,
  User,
  ShieldAlert,
  Zap,
  Activity,
  History,
  Lock,
  Layers,
  ChevronRight
} from "lucide-react";
import { exportCustomDataExcel } from "@/utils/excelExport";

export default function SettlementDashboard() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"payouts" | "audit">("payouts");
  
  // Aggregated Overview
  const [overview, setOverview] = useState<any>({
    total_seller_earnings: 0,
    total_pending_balance: 0,
    total_available_balance: 0,
    total_reserved_balance: 0,
    total_withdrawn: 0,
    total_withdrawals_count: 0,
    total_payout_amount: 0,
    total_processing_payouts: 0,
    total_processing_amount: 0,
    total_successful_payouts: 0,
    total_successful_amount: 0,
    total_failed_payouts: 0,
    failed_payout_count: 0,
    total_failed_amount: 0,
    total_reversed_payouts: 0,
    total_reversed_amount: 0,
    reconciliation_issues_count: 0,
    stuck_payouts_count: 0,
    queued_jobs: 0,
    dead_letter_jobs: 0,
    unprocessed_webhooks: 0
  });

  // Payout Requests List & Filters
  const [payouts, setPayouts] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Modals & Details
  const [selectedPayoutId, setSelectedPayoutId] = useState<string | null>(null);
  const [payoutDetail, setPayoutDetail] = useState<any | null>(null);
  const [payoutDetailLoading, setPayoutDetailLoading] = useState(false);

  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [sellerDetail, setSellerDetail] = useState<any | null>(null);
  const [sellerDetailLoading, setSellerDetailLoading] = useState(false);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // Status message
  const [actionMsg, setActionMsg] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [reconcilingId, setReconcilingId] = useState<string | null>(null);
  const [workerRunning, setWorkerRunning] = useState(false);

  // Load Overview & Payout List
  const loadOverviewAndPayouts = async () => {
    setLoading(true);
    try {
      const [overviewRes, payoutsRes] = await Promise.all([
        apiService.getSettlementOverview().catch(() => ({ success: false, data: null, error: "Load failed" })),
        apiService.getPayoutRequests({
          status: statusFilter,
          search: searchQuery,
          limit: 100
        }).catch(() => ({ success: false, data: [], error: "Load failed" }))
      ]);

      if (overviewRes?.data) {
        setOverview(overviewRes.data);
      }
      if (payoutsRes?.data) {
        setPayouts(payoutsRes.data);
      }
    } catch (err: any) {
      console.error("[Settlement Dashboard Load Error]:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load Audit Logs
  const loadAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const res = await apiService.getAdminAuditLogs({ limit: 50 });
      if (res?.data) {
        setAuditLogs(res.data);
      }
    } catch (err: any) {
      console.error("[Audit Logs Load Error]:", err);
    } finally {
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    loadOverviewAndPayouts();
  }, [statusFilter]);

  useEffect(() => {
    if (activeTab === "audit") {
      loadAuditLogs();
    }
  }, [activeTab]);

  // Open Payout Detail Modal
  const handleViewPayoutDetail = async (payoutId: string) => {
    setSelectedPayoutId(payoutId);
    setPayoutDetailLoading(true);
    try {
      const res = await apiService.getPayoutDetails(payoutId);
      if (res?.success && res.data) {
        setPayoutDetail(res.data);
      }
    } catch (err: any) {
      console.error("[Payout Detail Error]:", err);
    } finally {
      setPayoutDetailLoading(false);
    }
  };

  // Open Seller Financial Detail Modal
  const handleViewSellerDetail = async (sellerId: string) => {
    setSelectedSellerId(sellerId);
    setSellerDetailLoading(true);
    try {
      const res = await apiService.getSellerFinancialDetails(sellerId);
      if (res?.success && res.data) {
        setSellerDetail(res.data);
      }
    } catch (err: any) {
      console.error("[Seller Financial Detail Error]:", err);
    } finally {
      setSellerDetailLoading(false);
    }
  };

  // Trigger Reconcile for a Single Payout
  const handleReconcileSingle = async (payoutId: string) => {
    setReconcilingId(payoutId);
    setActionMsg({ text: "Querying Razorpay banking rails & verifying ledger...", type: "info" });
    try {
      const res = await apiService.reconcileSinglePayout(payoutId, "Admin initiated on-demand automated reconciliation");
      if (res?.success && res.data) {
        const payload = res.data as any;
        const issuesList = payload.issues || [];
        setActionMsg({ 
          text: `Reconciliation check complete for ${payload.payoutNumber || payoutId}. Status: ${payload.currentStatus || 'In Sync'}. Issues: ${issuesList.length}`, 
          type: issuesList.length > 0 ? "error" : "success" 
        });
        loadOverviewAndPayouts();
        if (selectedPayoutId === payoutId) {
          handleViewPayoutDetail(payoutId);
        }
      } else {
        setActionMsg({ text: res?.error || "Reconciliation check failed.", type: "error" });
      }
    } catch (err: any) {
      setActionMsg({ text: err?.message || "Reconciliation call failed.", type: "error" });
    } finally {
      setReconcilingId(null);
    }
  };

  // Trigger Batch Reconciliation
  const handleReconcileAll = async () => {
    setLoading(true);
    setActionMsg({ text: "Initiating batch reconciliation across all active & stuck withdrawals...", type: "info" });
    try {
      const res = await apiService.reconcileAllPayouts("Admin initiated batch reconciliation");
      if (res?.success && res.data) {
        const payload = res.data as any;
        setActionMsg({ 
          text: `Batch reconciliation finished! Checked ${payload.totalChecked || 0} active withdrawals.`, 
          type: "success" 
        });
        loadOverviewAndPayouts();
      } else {
        setActionMsg({ text: res?.error || "Batch reconciliation failed.", type: "error" });
      }
    } catch (err: any) {
      setActionMsg({ text: err?.message || "Batch reconciliation exception.", type: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Trigger On-Demand Payout Worker
  const handleTriggerWorker = async () => {
    setWorkerRunning(true);
    setActionMsg({ text: "Executing backend payout queue worker & stuck detector...", type: "info" });
    try {
      const res = await apiService.triggerPayoutWorker();
      if (res?.success && res.data) {
        const payload = res.data as any;
        setActionMsg({ 
          text: `Worker executed successfully! Processed: ${payload.queueResult?.processed || 0} queue jobs. Reconciled: ${payload.stuckResult?.checked || 0} stuck payouts.`, 
          type: "success" 
        });
        loadOverviewAndPayouts();
      } else {
        setActionMsg({ text: res?.error || "Worker execution failed.", type: "error" });
      }
    } catch (err: any) {
      setActionMsg({ text: err?.message || "Worker trigger exception.", type: "error" });
    } finally {
      setWorkerRunning(false);
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    const dataToExport = payouts.map(p => ({
      "Withdrawal ID": p.payout_number,
      "Seller Name": p.sellers?.business_name || p.sellers?.owner_name || "Merchant",
      "Seller ID": p.seller_id,
      "Amount (₹)": p.amount,
      "Masked UPI": p.destination_masked || p.destination_upi,
      "Status": p.status,
      "Razorpay Payout ID": p.provider_payout_id || "N/A",
      "Razorpay Status": p.provider_status || "N/A",
      "UTR Number": p.utr_number || "N/A",
      "Failure Reason": p.failure_reason || "N/A",
      "Created At": p.created_at,
      "Updated At": p.updated_at,
      "Completed At": p.processed_at || "N/A"
    }));

    exportCustomDataExcel(dataToExport, `ZEBALPHA_Admin_Payout_Ledger_${new Date().toISOString().split("T")[0]}`);
  };

  // Client-side text search filter
  const filteredPayouts = useMemo(() => {
    return payouts.filter(p => {
      const q = searchQuery.toLowerCase().trim();
      if (dateFilter && (!p.created_at || !p.created_at.startsWith(dateFilter))) {
        return false;
      }
      if (!q) return true;

      return (
        p.payout_number?.toLowerCase().includes(q) ||
        p.id?.toLowerCase().includes(q) ||
        p.provider_payout_id?.toLowerCase().includes(q) ||
        p.utr_number?.toLowerCase().includes(q) ||
        p.destination_masked?.toLowerCase().includes(q) ||
        p.destination_upi?.toLowerCase().includes(q) ||
        p.sellers?.business_name?.toLowerCase().includes(q) ||
        p.sellers?.owner_name?.toLowerCase().includes(q) ||
        p.sellers?.email?.toLowerCase().includes(q) ||
        p.seller_id?.toLowerCase().includes(q)
      );
    });
  }, [payouts, searchQuery, dateFilter]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2500);
  };

  const getStatusBadge = (status: string) => {
    const st = (status || "").toUpperCase();
    switch (st) {
      case "SUCCESS":
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-black uppercase">
            <CheckCircle2 size={12} />
            <span>Success</span>
          </span>
        );
      case "PROCESSING":
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-black uppercase">
            <Clock size={12} className="animate-spin" />
            <span>Processing</span>
          </span>
        );
      case "FAILED":
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-[11px] font-black uppercase">
            <XCircle size={12} />
            <span>Failed</span>
          </span>
        );
      case "REVERSED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[11px] font-black uppercase">
            <RotateCcw size={12} />
            <span>Reversed</span>
          </span>
        );
      case "RECONCILIATION_REQUIRED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[11px] font-black uppercase">
            <AlertTriangle size={12} />
            <span>Reconcile Req.</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-300 text-[11px] font-black uppercase">
            <span>{st}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* ── 1. HEADER & GLOBAL CONTROLS ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">FINANCIAL MONITORING</span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase">
              ● Automated Banking Rails
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">Admin Seller Settlement & Payout Desk</h1>
          <p className="text-xs font-bold text-zinc-400 mt-0.5">
            Complete real-time visibility into seller earnings, balance reservations, Razorpay UPI disbursements, and automated reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start flex-wrap">
          <button
            onClick={handleReconcileAll}
            disabled={loading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck size={14} />
            <span>Reconcile All Active</span>
          </button>

          <button
            onClick={handleTriggerWorker}
            disabled={workerRunning}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-200 font-bold text-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            <Zap size={14} className={workerRunning ? "animate-spin text-amber-400" : "text-amber-400"} />
            <span>Run Queue Worker</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white text-black hover:bg-zinc-200 font-bold text-xs transition-all shadow-md cursor-pointer"
          >
            <Download size={14} />
            <span>Export Excel</span>
          </button>

          <button
            onClick={loadOverviewAndPayouts}
            className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 transition-colors cursor-pointer"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionMsg && (
        <div className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-bold ${
          actionMsg.type === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
          actionMsg.type === "error" ? "bg-red-500/10 border-red-500/30 text-red-400" :
          "bg-blue-500/10 border-blue-500/30 text-blue-400"
        }`}>
          <div className="flex items-center gap-2">
            {actionMsg.type === "error" ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
            <span>{actionMsg.text}</span>
          </div>
          <button onClick={() => setActionMsg(null)} className="text-zinc-400 hover:text-white">✕</button>
        </div>
      )}

      {/* ── 2. ADMIN OVERVIEW KPI CARDS ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        
        {/* Total Seller Earnings */}
        <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 shadow-lg space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Total Seller Earnings</span>
          <p className="text-lg sm:text-xl font-black text-white">
            ₹{Number(overview.total_seller_earnings || 0).toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-zinc-500 block">Net Platform Earnings</span>
        </div>

        {/* Available Balance */}
        <div className="bg-zinc-950 p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 shadow-lg space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">Available Balance</span>
          <p className="text-lg sm:text-xl font-black text-emerald-400">
            ₹{Number(overview.total_available_balance || 0).toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-zinc-500 block">Eligible for Withdrawal</span>
        </div>

        {/* Reserved Balance */}
        <div className="bg-zinc-950 p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5 shadow-lg space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">Reserved Balance</span>
          <p className="text-lg sm:text-xl font-black text-amber-400">
            ₹{Number(overview.total_reserved_balance || 0).toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-zinc-500 block">Anti-Double Spend Lock</span>
        </div>

        {/* Total Withdrawn */}
        <div className="bg-zinc-950 p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 shadow-lg space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 block">Total Withdrawn</span>
          <p className="text-lg sm:text-xl font-black text-blue-400">
            ₹{Number(overview.total_withdrawn || 0).toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-zinc-500 block">{overview.total_successful_payouts || 0} Successful Payouts</span>
        </div>

        {/* Pending Escrow */}
        <div className="bg-zinc-950 p-4 rounded-2xl border border-purple-500/20 bg-purple-500/5 shadow-lg space-y-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 block">Pending Escrow</span>
          <p className="text-lg sm:text-xl font-black text-purple-400">
            ₹{Number(overview.total_pending_balance || 0).toLocaleString("en-IN")}
          </p>
          <span className="text-[10px] text-zinc-500 block">In Return Window</span>
        </div>

        {/* Reconciliation Issues & Stuck */}
        <div className={`p-4 rounded-2xl border shadow-lg space-y-1 ${
          (overview.reconciliation_issues_count > 0 || overview.stuck_payouts_count > 0)
            ? "bg-red-500/10 border-red-500/40"
            : "bg-zinc-950 border-zinc-800"
        }`}>
          <span className="text-[10px] font-black uppercase tracking-wider text-red-400 block flex items-center justify-between">
            <span>Reconciliation / Stuck</span>
            {(overview.reconciliation_issues_count > 0 || overview.stuck_payouts_count > 0) && <ShieldAlert size={12} className="animate-bounce" />}
          </span>
          <p className="text-lg sm:text-xl font-black text-red-400">
            {overview.reconciliation_issues_count || 0} / {overview.stuck_payouts_count || 0}
          </p>
          <span className="text-[10px] text-zinc-400 block">Issues / Long Processing</span>
        </div>

      </div>

      {/* Breakdown Metrics bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-950 p-4 rounded-2xl border border-zinc-800 text-xs font-bold">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400"><Clock size={16} /></div>
          <div>
            <span className="text-[10px] text-zinc-400 uppercase font-black block">Processing Payouts</span>
            <span className="text-white font-black">{overview.total_processing_payouts || 0} (₹{Number(overview.total_processing_amount || 0).toLocaleString("en-IN")})</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400"><CheckCircle2 size={16} /></div>
          <div>
            <span className="text-[10px] text-zinc-400 uppercase font-black block">Successful Payouts</span>
            <span className="text-white font-black">{overview.total_successful_payouts || 0} (₹{Number(overview.total_successful_amount || 0).toLocaleString("en-IN")})</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-red-500/10 text-red-400"><XCircle size={16} /></div>
          <div>
            <span className="text-[10px] text-zinc-400 uppercase font-black block">Failed Payouts</span>
            <span className="text-white font-black">{overview.total_failed_payouts || overview.failed_payout_count || 0} (₹{Number(overview.total_failed_amount || 0).toLocaleString("en-IN")})</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400"><RotateCcw size={16} /></div>
          <div>
            <span className="text-[10px] text-zinc-400 uppercase font-black block">Reversed Payouts</span>
            <span className="text-white font-black">{overview.total_reversed_payouts || 0} (₹{Number(overview.total_reversed_amount || 0).toLocaleString("en-IN")})</span>
          </div>
        </div>
      </div>

      {/* ── 3. NAVIGATION TABS & FILTERS ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        
        {/* Tab Selection */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("payouts")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "payouts"
                ? "bg-white text-black shadow-md"
                : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
            }`}
          >
            <CreditCard size={14} />
            <span>Withdrawal Requests ({filteredPayouts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("audit")}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === "audit"
                ? "bg-white text-black shadow-md"
                : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
            }`}
          >
            <History size={14} />
            <span>Admin Audit Logs</span>
          </button>
        </div>

        {/* Status Filter Chips */}
        {activeTab === "payouts" && (
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1">
            {["ALL", "PROCESSING", "SUCCESS", "FAILED", "REVERSED", "RECONCILIATION_REQUIRED", "LONG_PROCESSING"].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap cursor-pointer ${
                  statusFilter === st
                    ? "bg-zinc-100 text-black font-extrabold shadow-sm"
                    : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800"
                }`}
              >
                {st.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── 4. MAIN CONTENT VIEW ─────────────────────────────────────────────────── */}
      {activeTab === "payouts" ? (
        <div className="space-y-4">

          {/* Search & Date Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-950 p-3.5 rounded-2xl border border-zinc-800">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Filter by seller, ID, UTR, UPI..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-xs font-bold text-white outline-none focus:border-zinc-500 transition-all placeholder:text-zinc-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-900 text-xs font-bold text-zinc-300 outline-none cursor-pointer"
              />
              {dateFilter && (
                <button
                  onClick={() => setDateFilter("")}
                  className="px-2.5 py-2 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white text-xs font-bold"
                >
                  Clear Date
                </button>
              )}
            </div>
          </div>

          {/* Withdrawal Requests Table */}
          <div className="bg-zinc-950 rounded-2xl border border-zinc-800 shadow-xl overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-zinc-400 font-bold text-xs space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-white mx-auto" />
                <p>Loading withdrawal requests...</p>
              </div>
            ) : filteredPayouts.length === 0 ? (
              <div className="p-12 text-center text-zinc-400 font-bold text-xs space-y-1">
                <FileText className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <p className="text-white">No withdrawal requests found matching filter.</p>
                <p className="text-zinc-500 text-[11px]">Normal seller withdrawals process automatically via Razorpay banking rails.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900/60 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                      <th className="p-4 pl-6">Withdrawal & Seller</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Masked UPI ID</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Razorpay Reference / UTR</th>
                      <th className="p-4">Initiated At</th>
                      <th className="p-4 text-right pr-6">Admin Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/80 text-xs font-bold text-zinc-300">
                    {filteredPayouts.map((p) => (
                      <tr key={p.id} className="hover:bg-zinc-900/40 transition-colors">
                        
                        {/* Withdrawal ID & Seller */}
                        <td className="p-4 pl-6">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-white">{p.payout_number}</span>
                              <button
                                onClick={() => handleCopy(p.payout_number)}
                                className="text-zinc-500 hover:text-white p-0.5"
                                title="Copy Withdrawal ID"
                              >
                                {copiedText === p.payout_number ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                              </button>
                            </div>
                            <button
                              onClick={() => handleViewSellerDetail(p.seller_id)}
                              className="text-[11px] text-purple-400 hover:underline font-bold mt-0.5 block text-left"
                            >
                              {p.sellers?.business_name || p.sellers?.owner_name || "Merchant"} ({p.seller_id?.slice(0, 8)}...)
                            </button>
                          </div>
                        </td>

                        {/* Amount */}
                        <td className="p-4 font-black text-white text-sm">
                          ₹{Number(p.amount || 0).toFixed(2)}
                        </td>

                        {/* Masked UPI */}
                        <td className="p-4 font-mono text-emerald-400 text-xs">
                          {p.destination_masked || p.destination_upi || "UPI"}
                        </td>

                        {/* Status */}
                        <td className="p-4">
                          <div>
                            {getStatusBadge(p.status)}
                            {p.failure_reason && (
                              <p className="text-[10px] text-red-400 mt-1 max-w-xs truncate" title={p.failure_reason}>
                                {p.failure_reason}
                              </p>
                            )}
                          </div>
                        </td>

                        {/* Razorpay Reference / UTR */}
                        <td className="p-4 font-mono text-xs">
                          {p.provider_payout_id ? (
                            <div className="space-y-0.5">
                              <p className="text-white font-bold">{p.provider_payout_id}</p>
                              {p.utr_number && <p className="text-emerald-400 text-[11px]">UTR: {p.utr_number}</p>}
                            </div>
                          ) : (
                            <span className="text-zinc-500 italic">Pending Provider Response</span>
                          )}
                        </td>

                        {/* Initiated At */}
                        <td className="p-4 text-zinc-400 text-[11px]">
                          {p.created_at ? new Date(p.created_at).toLocaleString() : "N/A"}
                        </td>

                        {/* Admin Actions */}
                        <td className="p-4 text-right pr-6">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleViewPayoutDetail(p.id)}
                              className="px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white font-bold text-xs inline-flex items-center gap-1 transition-all cursor-pointer"
                              title="View Complete Payout Timeline"
                            >
                              <Eye size={12} />
                              <span>Timeline</span>
                            </button>

                            <button
                              onClick={() => handleReconcileSingle(p.id)}
                              disabled={reconcilingId === p.id}
                              className="px-2.5 py-1.5 rounded-xl bg-purple-600/20 border border-purple-500/30 hover:bg-purple-600 text-purple-300 hover:text-white font-bold text-xs inline-flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                              title="Query Razorpay API to verify live status"
                            >
                              <RefreshCw size={12} className={reconcilingId === p.id ? "animate-spin" : ""} />
                              <span>Reconcile</span>
                            </button>
                          </div>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── 5. ADMIN AUDIT LOGS VIEW ───────────────────────────────────────────── */
        <div className="bg-zinc-950 rounded-2xl border border-zinc-800 shadow-xl overflow-hidden">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Lock size={14} className="text-amber-400" />
              <span>Immutable Financial Audit Trail</span>
            </h3>
            <button
              onClick={loadAuditLogs}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1"
            >
              <RefreshCw size={12} className={auditLoading ? "animate-spin" : ""} />
              <span>Refresh Logs</span>
            </button>
          </div>

          {auditLoading ? (
            <div className="p-12 text-center text-zinc-400 text-xs font-bold">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-white" />
              <p>Fetching admin audit logs...</p>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-xs font-bold">
              No financial admin audit logs recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/60 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    <th className="p-3.5 pl-6">Timestamp</th>
                    <th className="p-3.5">Admin ID</th>
                    <th className="p-3.5">Action</th>
                    <th className="p-3.5">Target Seller</th>
                    <th className="p-3.5">Withdrawal ID</th>
                    <th className="p-3.5">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80 text-xs font-bold text-zinc-300">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-900/40">
                      <td className="p-3.5 pl-6 text-zinc-400 text-[11px]">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="p-3.5 text-white font-mono">{log.admin_email || log.admin_id}</td>
                      <td className="p-3.5 font-black text-amber-400">{log.action}</td>
                      <td className="p-3.5 text-zinc-300 font-mono text-[11px]">{log.target_seller_id || "N/A"}</td>
                      <td className="p-3.5 text-emerald-400 font-mono text-[11px]">{log.payout_request_id || "N/A"}</td>
                      <td className="p-3.5 text-zinc-400 text-[11px]">{log.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── 6. PAYOUT DETAIL & TIMELINE MODAL ────────────────────────────────────── */}
      {selectedPayoutId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden my-8 space-y-6 p-6">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 block">WITHDRAWAL TIMELINE AUDIT</span>
                <h2 className="text-xl font-black text-white">
                  {payoutDetail?.payout?.payout_number || selectedPayoutId}
                </h2>
              </div>
              <button
                onClick={() => { setSelectedPayoutId(null); setPayoutDetail(null); }}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {payoutDetailLoading ? (
              <div className="p-12 text-center text-zinc-400 text-xs font-bold space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-white" />
                <p>Fetching full transaction timeline...</p>
              </div>
            ) : payoutDetail ? (
              <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                
                {/* Status & References Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase font-black block">Status</span>
                    {getStatusBadge(payoutDetail.payout?.status)}
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase font-black block">Amount</span>
                    <span className="text-white font-black text-sm">₹{Number(payoutDetail.payout?.amount || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase font-black block">Razorpay Payout ID</span>
                    <span className="text-emerald-400 font-mono text-[11px]">{payoutDetail.payout?.provider_payout_id || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase font-black block">Bank UTR</span>
                    <span className="text-purple-400 font-mono text-[11px]">{payoutDetail.payout?.utr_number || "Awaiting UTR"}</span>
                  </div>
                </div>

                {/* Complete Transaction Timeline */}
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Activity size={14} className="text-emerald-400" />
                    <span>Transaction Timeline</span>
                  </h4>

                  <div className="space-y-4 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-zinc-800">
                    {payoutDetail.timeline?.map((step: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-4 relative">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0 border z-10 ${
                          step.status === 'COMPLETED' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' :
                          step.status === 'FAILED' ? 'bg-red-500/20 border-red-500 text-red-400' :
                          step.status === 'REVERSED' ? 'bg-purple-500/20 border-purple-500 text-purple-400' :
                          'bg-amber-500/20 border-amber-500 text-amber-400'
                        }`}>
                          {idx + 1}
                        </div>
                        <div className="bg-zinc-900/60 p-3.5 rounded-2xl border border-zinc-800 flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-black text-white text-xs">{step.title}</span>
                            <span className="text-[10px] text-zinc-400">{step.timestamp ? new Date(step.timestamp).toLocaleString() : ""}</span>
                          </div>
                          <p className="text-xs text-zinc-300 font-medium">{step.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ledger Entries */}
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                    <FileText size={14} className="text-purple-400" />
                    <span>Associated Immutable Ledger Entries ({payoutDetail.ledgerEntries?.length || 0})</span>
                  </h4>
                  <div className="space-y-2">
                    {payoutDetail.ledgerEntries?.map((entry: any) => (
                      <div key={entry.id} className="bg-zinc-900/40 p-3 rounded-xl border border-zinc-800 flex items-center justify-between text-xs font-bold">
                        <div>
                          <span className="text-emerald-400 font-mono">{entry.transaction_type}</span>
                          <p className="text-zinc-400 text-[11px] font-normal">{entry.description}</p>
                        </div>
                        <span className="text-white font-mono">₹{Number(entry.amount).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ) : null}

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-zinc-800 pt-4">
              <button
                onClick={() => handleReconcileSingle(selectedPayoutId!)}
                disabled={reconcilingId === selectedPayoutId}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw size={14} className={reconcilingId === selectedPayoutId ? "animate-spin" : ""} />
                <span>Reconcile Against Razorpay</span>
              </button>

              <button
                onClick={() => { setSelectedPayoutId(null); setPayoutDetail(null); }}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── 7. SELLER FINANCIAL DETAIL MODAL ────────────────────────────────────── */}
      {selectedSellerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden my-8 space-y-6 p-6">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 block">MERCHANT FINANCIAL PROFILE</span>
                <h2 className="text-xl font-black text-white">
                  {sellerDetail?.seller?.business_name || sellerDetail?.seller?.owner_name || selectedSellerId}
                </h2>
                <p className="text-xs text-zinc-400">Seller ID: {selectedSellerId}</p>
              </div>
              <button
                onClick={() => { setSelectedSellerId(null); setSellerDetail(null); }}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {sellerDetailLoading ? (
              <div className="p-12 text-center text-zinc-400 text-xs font-bold space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-white" />
                <p>Loading seller financial ledger & balances...</p>
              </div>
            ) : sellerDetail ? (
              <div className="space-y-6 max-h-[75vh] overflow-y-auto pr-2">
                
                {/* Real Balance Summary Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 text-xs">
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase font-black block">Gross Sales</span>
                    <span className="text-white font-black text-sm">₹{Number(sellerDetail.balances?.gross_sales || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase font-black block">Total Platform Deductions</span>
                    <span className="text-red-400 font-black text-sm">-₹{Number(sellerDetail.balances?.total_deductions || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase font-black block">Available Balance</span>
                    <span className="text-emerald-400 font-black text-sm">₹{Number(sellerDetail.balances?.available_balance || 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-zinc-400 uppercase font-black block">Reserved Balance</span>
                    <span className="text-amber-400 font-black text-sm">₹{Number(sellerDetail.balances?.reserved_balance || 0).toFixed(2)}</span>
                  </div>
                </div>

                {/* Verified UPI Info */}
                <div className="bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] font-black uppercase text-zinc-400 block">Verified Settlement UPI</span>
                    <span className="text-emerald-400 font-mono font-black text-sm">
                      {sellerDetail.settlementMethods?.[0]?.masked_destination || sellerDetail.seller?.phonepay_no || sellerDetail.seller?.phonepay_number || "Not provided"}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase">
                    ● Verified Merchant
                  </span>
                </div>

                {/* Ledger History */}
                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-wider mb-3">
                    Complete Immutable Financial Ledger ({sellerDetail.ledger?.length || 0})
                  </h4>
                  <div className="bg-zinc-900/30 rounded-xl border border-zinc-800 max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-800 bg-zinc-900/60 text-[10px] font-black uppercase text-zinc-400">
                          <th className="p-2.5 pl-4">Type</th>
                          <th className="p-2.5">Description</th>
                          <th className="p-2.5 text-right pr-4">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60 text-zinc-300 font-bold">
                        {sellerDetail.ledger?.map((tx: any) => (
                          <tr key={tx.id}>
                            <td className="p-2.5 pl-4 font-mono text-emerald-400">{tx.transaction_type}</td>
                            <td className="p-2.5 text-zinc-400 font-normal">{tx.description}</td>
                            <td className={`p-2.5 text-right pr-4 font-mono ${tx.entry_type === 'DEBIT' ? 'text-red-400' : 'text-emerald-400'}`}>
                              {tx.entry_type === 'DEBIT' ? '-' : '+'}₹{Number(tx.amount).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            ) : null}

            {/* Footer */}
            <div className="flex items-center justify-end border-t border-zinc-800 pt-4">
              <button
                onClick={() => { setSelectedSellerId(null); setSellerDetail(null); }}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
