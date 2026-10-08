"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  IndianRupee, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  Filter, 
  RefreshCw, 
  ChevronRight, 
  Sparkles, 
  Receipt, 
  Search, 
  X, 
  Scale, 
  SlidersHorizontal, 
  ChevronDown, 
  Info, 
  Wallet, 
  Smartphone, 
  AlertTriangle 
} from "lucide-react";
import { 
  LedgerTransaction, 
  SellerLedgerBalances, 
  DetailedSettlementRecord, 
  SellerSettlementMethod, 
  SellerPayoutRequest 
} from "@/shared/types";

type PaymentTab = "settlements" | "ledger" | "reconciliation" | "upi";

export default function SellerPaymentsPage() {
  const [activeTab, setActiveTab] = useState<PaymentTab>("settlements");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Financial state
  const [balances, setBalances] = useState<SellerLedgerBalances>({
    gross_sales: 0,
    commission: 0,
    shipping_fees: 0,
    fixed_fees: 0,
    collection_fees: 0,
    returns_and_refunds: 0,
    total_platform_fees: 0,
    net_seller_earnings: 0,
    total_settled: 0,
    available_balance: 0,
    pending_settlement: 0,
    on_hold_balance: 0
  });

  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [settlements, setSettlements] = useState<DetailedSettlementRecord[]>([]);
  const [settlementMethods, setSettlementMethods] = useState<SellerSettlementMethod[]>([]);
  const [activeSettlementMethod, setActiveSettlementMethod] = useState<SellerSettlementMethod | null>(null);
  const [payoutRequests, setPayoutRequests] = useState<SellerPayoutRequest[]>([]);

  // Filters & Search
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState("ALL");
  const [settlementFilter, setSettlementFilter] = useState("ALL");

  // Selected Settlement / Transaction Detail Modal
  const [selectedPayoutDetail, setSelectedPayoutDetail] = useState<any | null>(null);

  // Settlement Method Modal State (Strictly UPI ONLY)
  const [showEditSettlementModal, setShowEditSettlementModal] = useState(false);
  const [upiId, setUpiId] = useState("");
  const [upiVerifying, setUpiVerifying] = useState(false);
  const [upiVerified, setUpiVerified] = useState(false);
  const [upiVerifiedName, setUpiVerifiedName] = useState<string | null>(null);
  const [upiProviderRef, setUpiProviderRef] = useState<string | null>(null);
  const [upiError, setUpiError] = useState("");
  const [methodSubmitting, setMethodSubmitting] = useState(false);
  const [methodMessage, setMethodMessage] = useState("");
  const [methodError, setMethodError] = useState("");

  // On-Demand Withdrawal Modal State
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawSuccessMessage, setWithdrawSuccessMessage] = useState("");

  // Fetch financial data from server
  async function loadFinancialData() {
    try {
      setLoading(true);
      const res = await fetch("/api/payments");
      const json = await res.json();

      if (json.success) {
        if (json.balances) setBalances(json.balances);
        if (json.transactions) setTransactions(json.transactions);
        if (json.settlements) setSettlements(json.settlements);
        if (json.settlementMethods) setSettlementMethods(json.settlementMethods);
        if (json.activeSettlementMethod) {
          setActiveSettlementMethod(json.activeSettlementMethod);
          if (json.activeSettlementMethod.upi_id || json.activeSettlementMethod.destination_raw) {
            setUpiId(json.activeSettlementMethod.upi_id || json.activeSettlementMethod.destination_raw);
            setUpiVerified(true);
            setUpiVerifiedName(json.activeSettlementMethod.verified_name || null);
          }
        }
        if (json.payoutRequests) setPayoutRequests(json.payoutRequests);
      }
    } catch (e) {
      console.error("Failed to load payments data:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadFinancialData();
  }, []);

  // Filtered Ledger Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesSearch = 
        !ledgerSearch || 
        tx.description.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
        (tx.reference_id && tx.reference_id.toLowerCase().includes(ledgerSearch.toLowerCase())) ||
        tx.id.toLowerCase().includes(ledgerSearch.toLowerCase());

      const matchesType = 
        ledgerTypeFilter === "ALL" || 
        tx.transaction_type === ledgerTypeFilter;

      return matchesSearch && matchesType;
    });
  }, [transactions, ledgerSearch, ledgerTypeFilter]);

  // Combined Settlement History (On-Demand Withdrawals + Historical Settlements)
  const combinedSettlements = useMemo(() => {
    const list: any[] = [];

    // Add on-demand payout requests
    payoutRequests.forEach((p) => {
      list.push({
        id: p.id,
        settlement_number: p.payout_number,
        method_type: "UPI",
        destination_masked: p.destination_masked,
        beneficiary_name: p.beneficiary_name,
        created_at: p.initiated_at || p.created_at,
        amount: Number(p.amount || 0),
        status: p.status,
        utr_number: p.utr_number,
        failure_reason: p.failure_reason,
        is_payout: true
      });
    });

    // Add legacy settlements (if not duplicate of payout)
    settlements.forEach((s) => {
      if (!list.some(item => item.settlement_number === s.settlement_number)) {
        list.push({
          ...s,
          method_type: "UPI",
          destination_masked: s.account_masked || activeSettlementMethod?.masked_destination || "Verified UPI",
          amount: Number(s.net_amount || 0),
          is_payout: false
        });
      }
    });

    // Sort descending by date
    list.sort((a, b) => new Date(b.created_at || b.start_date).getTime() - new Date(a.created_at || a.start_date).getTime());

    if (settlementFilter === "ALL") return list;
    return list.filter(item => (item.status || "").toUpperCase() === settlementFilter.toUpperCase());
  }, [payoutRequests, settlements, settlementFilter, activeSettlementMethod]);

  // Handle Verify UPI through Razorpay-supported backend verification
  async function handleVerifyUpi() {
    const cleanVpa = upiId.trim().toLowerCase();
    if (!cleanVpa) {
      setUpiError("Please enter a valid UPI ID (e.g. seller@upi)");
      return;
    }

    const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z0-9.\-_]{2,64}$/;
    if (!upiRegex.test(cleanVpa)) {
      setUpiError("Invalid UPI format. Expected format: username@bank (e.g. seller@oksbi, merchant@paytm)");
      return;
    }

    setUpiVerifying(true);
    setUpiError("");
    setUpiVerified(false);
    setUpiVerifiedName(null);

    try {
      const res = await fetch("/api/payments/verify-upi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vpa: cleanVpa })
      });
      const data = await res.json();

      if (data.success && data.verified) {
        setUpiVerified(true);
        setUpiVerifiedName(data.verifiedName || "Verified Beneficiary");
        setUpiProviderRef(data.providerReference || null);
        setUpiError("");
      } else {
        setUpiVerified(false);
        setUpiVerifiedName(null);
        setUpiError(data.error || "Unable to verify this UPI ID with the banking network. Please check the handle and try again.");
      }
    } catch (err: any) {
      setUpiVerified(false);
      setUpiVerifiedName(null);
      setUpiError(err?.message || "Network error while verifying UPI ID.");
    } finally {
      setUpiVerifying(false);
    }
  }

  // Handle Save UPI Settlement Method
  async function handleSaveSettlementMethod(e: React.FormEvent) {
    e.preventDefault();
    if (!upiVerified || !upiId.trim()) {
      setMethodError("Please verify your UPI ID before saving.");
      return;
    }

    setMethodSubmitting(true);
    setMethodMessage("");
    setMethodError("");

    try {
      const res = await fetch("/api/payments/settlement-method", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          methodType: "UPI",
          vpa: upiId.trim(),
          verifiedName: upiVerifiedName,
          providerReference: upiProviderRef
        })
      });
      const data = await res.json();

      if (data.success) {
        setMethodMessage("✓ UPI Settlement Method saved and verified successfully!");
        setActiveSettlementMethod(data.settlementMethod);
        setTimeout(() => {
          setShowEditSettlementModal(false);
          loadFinancialData();
        }, 1500);
      } else {
        setMethodError(data.error || "Failed to save verified UPI settlement method.");
      }
    } catch (err: any) {
      setMethodError(err?.message || "An unexpected error occurred.");
    } finally {
      setMethodSubmitting(false);
    }
  }

  // Handle On-Demand Withdrawal Submit
  async function handleWithdrawSubmit(e: React.FormEvent) {
    e.preventDefault();
    const num = Number(withdrawAmount);
    if (!num || num <= 0) {
      setWithdrawError("Please enter a valid amount to withdraw.");
      return;
    }
    if (num < 100) {
      setWithdrawError("Minimum withdrawal amount is ₹100.00.");
      return;
    }
    if (num > balances.available_balance) {
      setWithdrawError(`Amount exceeds your available balance of ₹${balances.available_balance.toFixed(2)}.`);
      return;
    }

    setWithdrawSubmitting(true);
    setWithdrawError("");
    setWithdrawSuccessMessage("");

    try {
      const res = await fetch("/api/payments/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          amount: num,
          idempotencyKey: `withdraw_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
        })
      });
      const data = await res.json();

      if (data.success) {
        setWithdrawSuccessMessage(data.message || `Withdrawal request submitted! Payout: ${data.payout?.payout_number || ""}`);
        setTimeout(() => {
          setShowWithdrawModal(false);
          loadFinancialData();
        }, 2000);
      } else {
        setWithdrawError(data.error || data.failureReason || "Withdrawal could not be processed. Please try again.");
      }
    } catch (err: any) {
      setWithdrawError(err?.message || "Failed to process withdrawal.");
    } finally {
      setWithdrawSubmitting(false);
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-6 px-2 sm:px-4 md:px-6">
      
      {/* ── TOP HEADER & QUICK STATS ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-400 mb-2">
            <Sparkles size={12} />
            <span>UPI Payouts & Settlement Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Payments, Settlements & Ledger
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 font-medium mt-1">
            Real-time immutable ledger, Razorpay UPI verification, and instant on-demand withdrawals.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setRefreshing(true); loadFinancialData(); }}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-xs font-bold text-zinc-200 hover:bg-zinc-800 transition active:scale-95"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          <a
            href="/api/reports?type=ledger"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-xs font-bold text-zinc-200 hover:bg-zinc-800 transition active:scale-95"
          >
            <Download size={14} />
            <span>Ledger CSV</span>
          </a>

          <a
            href="/api/reports?type=settlements"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs font-black text-emerald-400 hover:bg-emerald-500/20 transition active:scale-95"
          >
            <Receipt size={14} />
            <span>Settlement Statement</span>
          </a>
        </div>
      </div>

      {/* ── REVENUE & SETTLEMENT KPI CARDS ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Available to Withdraw with Instant Withdraw Action */}
        <div className="rounded-2xl border border-emerald-500/40 bg-gradient-to-b from-emerald-950/30 via-zinc-950 to-zinc-950 p-4 sm:p-5 relative overflow-hidden group flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-400">Available to Withdraw</span>
              <div className="h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Wallet size={16} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl md:text-3xl font-black text-white">
              ₹{balances.available_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-zinc-400 font-medium mt-1">
              Ready for instant UPI payout
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-emerald-500/20">
            <button
              onClick={() => {
                setWithdrawAmount(balances.available_balance > 0 ? String(balances.available_balance) : "");
                setWithdrawError("");
                setWithdrawSuccessMessage("");
                setShowWithdrawModal(true);
              }}
              disabled={balances.available_balance <= 0}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
            >
              <ArrowUpRight size={14} />
              <span>Withdraw Money</span>
            </button>
          </div>
        </div>

        {/* Pending Escrow */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400">Pending Escrow</span>
              <div className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Clock size={16} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl md:text-3xl font-black text-white">
              ₹{balances.pending_settlement.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-zinc-400 font-medium mt-1">
              Active withdrawal or in-transit
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-900 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
            Releases automatically on delivery
          </div>
        </div>

        {/* On Hold / Disputed */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-rose-400">On-Hold Reserve</span>
              <div className="h-8 w-8 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <AlertCircle size={16} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl md:text-3xl font-black text-white">
              ₹{balances.on_hold_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-zinc-400 font-medium mt-1">
              Active claims & dispute holds
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-900 text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
            Protected escrow
          </div>
        </div>

        {/* Total Settled Paid */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5 relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-blue-400">Total Settled</span>
              <div className="h-8 w-8 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <IndianRupee size={16} />
              </div>
            </div>
            <div className="text-xl sm:text-2xl md:text-3xl font-black text-white">
              ₹{balances.total_settled.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[11px] text-zinc-400 font-medium mt-1">
              Disbursed directly via UPI
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-900 text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 size={10} />
            <span>100% UPI Settlement Rail</span>
          </div>
        </div>
      </div>

      {/* ── SETTLEMENT ACCOUNT WIDGET (DASHBOARD HIGHLIGHT) ────────────────────────── */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 shrink-0">
            <Smartphone size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-zinc-400">Settlement Method</span>
              {activeSettlementMethod?.is_verified ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 size={10} />
                  ✓ UPI Verified
                </span>
              ) : activeSettlementMethod ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <Clock size={10} />
                  Pending Verification
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-zinc-800 text-zinc-400">
                  Not Set Up
                </span>
              )}
            </div>

            {activeSettlementMethod ? (
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-sm font-black text-white font-mono">
                  UPI: {activeSettlementMethod.masked_destination}
                </span>
                {activeSettlementMethod.verified_name && (
                  <span className="text-xs text-zinc-400 font-medium">
                    ({activeSettlementMethod.verified_name})
                  </span>
                )}
              </div>
            ) : (
              <p className="text-xs text-zinc-400 font-medium mt-0.5">
                Add a verified UPI ID to receive instant seller payouts.
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => {
            setMethodError("");
            setMethodMessage("");
            setShowEditSettlementModal(true);
          }}
          className="px-4 py-2 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs font-black uppercase tracking-wider text-white transition active:scale-95 shrink-0"
        >
          {activeSettlementMethod ? "Change UPI ID" : "Set Up UPI"}
        </button>
      </div>

      {/* ── TABS NAVIGATION ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-zinc-800 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab("settlements")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition ${
            activeTab === "settlements"
              ? "bg-white text-black shadow-lg"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          <Receipt size={14} />
          <span>Settlements & Payouts</span>
          <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
            {combinedSettlements.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("ledger")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition ${
            activeTab === "ledger"
              ? "bg-white text-black shadow-lg"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          <Scale size={14} />
          <span>Transactions Ledger</span>
          <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
            {transactions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("reconciliation")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition ${
            activeTab === "reconciliation"
              ? "bg-white text-black shadow-lg"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          <SlidersHorizontal size={14} />
          <span>Reconciliation & Fees</span>
        </button>

        <button
          onClick={() => setActiveTab("upi")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition ${
            activeTab === "upi"
              ? "bg-white text-black shadow-lg"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          <Smartphone size={14} />
          <span>Settlement Account</span>
        </button>
      </div>

      {/* ── TAB 1: SETTLEMENTS & PAYOUT HISTORY ────────────────────────────────────── */}
      {activeTab === "settlements" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-zinc-400">Filter Status:</span>
              {(["ALL", "SUCCESS", "PROCESSING", "COMPLETED", "FAILED"] as const).map((filterVal) => (
                <button
                  key={filterVal}
                  onClick={() => setSettlementFilter(filterVal)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                    settlementFilter === filterVal
                      ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/20"
                      : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  {filterVal}
                </button>
              ))}
            </div>

            <div className="text-xs text-zinc-500 font-bold">
              Showing {combinedSettlements.length} settlement transactions
            </div>
          </div>

          {/* Settlements Table */}
          {combinedSettlements.length === 0 ? (
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-12 text-center space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                <Receipt size={24} />
              </div>
              <h3 className="text-base font-black text-white">No Settlement Records Found</h3>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                UPI disbursements generated from delivered orders or requested withdrawals will appear here.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/80 border-b border-zinc-800 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    <tr>
                      <th className="py-3.5 px-4">Settlement / Payout ID</th>
                      <th className="py-3.5 px-4">Method</th>
                      <th className="py-3.5 px-4">Verified Destination</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4">Amount</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {combinedSettlements.map((item) => {
                      const isSuccess = item.status === "SUCCESS" || item.status === "COMPLETED" || item.status === "PAID";
                      const isFailed = item.status === "FAILED" || item.status === "REVERSED";

                      return (
                        <tr key={item.id} className="hover:bg-zinc-900/40 transition">
                          <td className="py-4 px-4 font-mono font-bold text-white">
                            {item.settlement_number || `WTH-${item.id.slice(0, 8)}`}
                          </td>

                          <td className="py-4 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-zinc-900 border border-zinc-800 text-zinc-300">
                              <Smartphone size={10} className="text-emerald-400" />
                              UPI
                            </span>
                          </td>

                          <td className="py-4 px-4 font-mono text-zinc-400">
                            {item.destination_masked || activeSettlementMethod?.masked_destination || "Verified UPI"}
                          </td>

                          <td className="py-4 px-4 text-zinc-300">
                            {new Date(item.created_at || item.start_date).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric"
                            })}
                          </td>

                          <td className="py-4 px-4 text-emerald-400 font-black text-sm">
                            ₹{Number(item.amount || item.net_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>

                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                              isSuccess
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : isFailed
                                ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                                : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                            }`}>
                              {isSuccess ? <CheckCircle2 size={10} /> : isFailed ? <AlertCircle size={10} /> : <Clock size={10} />}
                              {item.status}
                            </span>
                          </td>

                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => setSelectedPayoutDetail(item)}
                              className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-[11px] font-bold text-zinc-200 transition"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: TRANSACTIONS LEDGER (IMMUTABLE AUDIT TRAIL) ────────────────────── */}
      {activeTab === "ledger" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* Search & Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search ledger entries, order IDs, UTRs..."
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700 transition"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-400">Type:</span>
              <select
                value={ledgerTypeFilter}
                onChange={(e) => setLedgerTypeFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-200 focus:outline-none focus:border-zinc-700 transition"
              >
                <option value="ALL">All Transaction Types</option>
                <option value="SALE">SALE / SALE_CREDIT</option>
                <option value="WITHDRAWAL_REQUESTED">WITHDRAWAL_REQUESTED</option>
                <option value="WITHDRAWAL_SUCCESS">WITHDRAWAL_SUCCESS</option>
                <option value="WITHDRAWAL_FAILED">WITHDRAWAL_FAILED</option>
                <option value="COMMISSION">COMMISSION</option>
                <option value="SHIPPING_FEE">SHIPPING_FEE</option>
                <option value="RETURN_ADJUSTMENT">RETURN_ADJUSTMENT</option>
              </select>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900/80 border-b border-zinc-800 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  <tr>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Type</th>
                    <th className="py-3.5 px-4">Description</th>
                    <th className="py-3.5 px-4">Reference</th>
                    <th className="py-3.5 px-4 text-right">Debit</th>
                    <th className="py-3.5 px-4 text-right">Credit</th>
                    <th className="py-3.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900">
                  {filteredTransactions.map((tx) => {
                    const isCredit = tx.entry_type === "CREDIT" || ["SALE", "SALE_CREDIT", "ADJUSTMENT_CREDIT", "WITHDRAWAL_FAILED", "WITHDRAWAL_REVERSED"].includes(tx.transaction_type);

                    return (
                      <tr key={tx.id} className="hover:bg-zinc-900/40 transition">
                        <td className="py-3.5 px-4 text-zinc-400 font-mono text-[11px]">
                          {new Date(tx.created_at).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </td>

                        <td className="py-3.5 px-4">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                            isCredit ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-300"
                          }`}>
                            {tx.transaction_type}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-zinc-200 max-w-xs truncate">
                          {tx.description}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-zinc-400 text-[11px]">
                          {tx.reference_id || tx.order_id || "—"}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold text-rose-400">
                          {!isCredit ? `₹${Number(tx.amount).toFixed(2)}` : "—"}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                          {isCredit ? `₹${Number(tx.amount).toFixed(2)}` : "—"}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-zinc-900 border border-zinc-800 text-zinc-400">
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: RECONCILIATION & FEE RULES ─────────────────────────────────────── */}
      {activeTab === "reconciliation" && (
        <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 space-y-6">
            <h3 className="text-lg font-black text-white">Marketplace Deduction & Settlement Rules</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Every delivered order is audited with transparent platform guidelines and disbursed via UPI.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Commission</span>
                <p className="text-lg font-black text-white mt-1">5.0%</p>
                <p className="text-[11px] text-zinc-400">On gross delivered order value</p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">Fixed Order Fee</span>
                <p className="text-lg font-black text-white mt-1">₹15.00</p>
                <p className="text-[11px] text-zinc-400">Packaging & handling</p>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">UPI Rail Payout</span>
                <p className="text-lg font-black text-emerald-400 mt-1">Instant</p>
                <p className="text-[11px] text-zinc-400">Direct to verified VPA</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: SETTLEMENT PROFILE & UPI METHOD ────────────────────────────────── */}
      {activeTab === "upi" && (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
          
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 md:p-8 space-y-6 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Smartphone size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Configured UPI Settlement Method</h3>
                  <p className="text-xs text-zinc-400 font-medium">Verified UPI ID used for all automated and on-demand payouts</p>
                </div>
              </div>

              {activeSettlementMethod?.is_verified && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 size={12} />
                  ✓ Verified
                </span>
              )}
            </div>

            {activeSettlementMethod ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500 font-bold uppercase tracking-wider">Settlement Method</span>
                  <span className="text-emerald-400 font-bold uppercase">UPI (Unified Payments Interface)</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500 font-bold uppercase tracking-wider">
                    Verified UPI ID
                  </span>
                  <span className="font-mono text-white font-bold tracking-wider">
                    {activeSettlementMethod.masked_destination}
                  </span>
                </div>

                {activeSettlementMethod.verified_name && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500 font-bold uppercase tracking-wider">Registered Beneficiary Name</span>
                    <span className="text-white font-bold">{activeSettlementMethod.verified_name}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500 font-bold uppercase tracking-wider">Verification Status</span>
                  <span className="text-emerald-400 font-bold uppercase">{activeSettlementMethod.status}</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 space-y-2">
                <p className="text-sm font-bold text-white">No UPI ID configured</p>
                <p className="text-xs text-zinc-500">Add and verify your UPI ID to enable seller withdrawals</p>
              </div>
            )}

            <button
              onClick={() => {
                setMethodError("");
                setMethodMessage("");
                setShowEditSettlementModal(true);
              }}
              className="w-full py-3 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs font-black uppercase tracking-wider text-white transition active:scale-95 flex items-center justify-center gap-2"
            >
              <Smartphone size={14} />
              <span>{activeSettlementMethod ? "Update UPI ID" : "Add Verified UPI ID"}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── MODAL 1: SETTLEMENT ACCOUNT MODAL (STRICTLY UPI ONLY) ────────────────── */}
      {showEditSettlementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 space-y-5 shadow-2xl">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Settlement Method</span>
                <h3 className="text-base font-black text-white">Set Up UPI ID</h3>
              </div>
              <button
                onClick={() => setShowEditSettlementModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Error & Success Alerts */}
            {methodMessage && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-400">
                {methodMessage}
              </div>
            )}

            {methodError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-bold text-rose-400">
                {methodError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSaveSettlementMethod} className="space-y-4">
              
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-300">UPI ID</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      value={upiId}
                      onChange={(e) => {
                        setUpiId(e.target.value);
                        setUpiVerified(false);
                        setUpiVerifiedName(null);
                        setUpiError("");
                      }}
                      placeholder="e.g. seller@upi"
                      className="flex-1 px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-white transition"
                    />

                    <button
                      type="button"
                      onClick={handleVerifyUpi}
                      disabled={upiVerifying || !upiId.trim() || upiVerified}
                      className={`px-3.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider whitespace-nowrap transition active:scale-95 ${
                        upiVerified
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 cursor-default"
                          : "bg-emerald-500 hover:bg-emerald-400 text-black disabled:opacity-50"
                      }`}
                    >
                      {upiVerifying ? "Verifying..." : upiVerified ? "✓ Verified" : "VERIFY UPI"}
                    </button>
                  </div>

                  <p className="text-[11px] text-zinc-500">
                    ZebAlpha verifies this UPI ID in real-time with Razorpay banking rails.
                  </p>
                </div>

                {/* Verification Status Alerts */}
                {upiError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-bold text-rose-400 flex items-start gap-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{upiError}</span>
                  </div>
                )}

                {upiVerified && (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-wider">
                      <CheckCircle2 size={14} />
                      <span>✓ UPI Verified</span>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Beneficiary</label>
                      <input
                        type="text"
                        readOnly
                        value={upiVerifiedName || ""}
                        className="w-full px-3 py-2 bg-zinc-900/80 border border-zinc-800 rounded-xl text-xs text-white font-bold cursor-not-allowed select-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowEditSettlementModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-xs font-bold text-zinc-300 hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={methodSubmitting || !upiVerified}
                  className="px-6 py-2.5 rounded-xl bg-white text-black text-xs font-black uppercase tracking-wider hover:bg-zinc-200 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {methodSubmitting ? "Saving..." : "SAVE UPI"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: ON-DEMAND WITHDRAWAL REQUEST MODAL ──────────────────────────── */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Instant Disbursement</span>
                <h3 className="text-base font-black text-white">Withdraw Money</h3>
              </div>
              <button
                onClick={() => setShowWithdrawModal(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
              >
                <X size={18} />
              </button>
            </div>

            {withdrawSuccessMessage && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs font-bold text-emerald-400 space-y-1">
                <div className="flex items-center gap-1.5 font-black uppercase tracking-wider">
                  <CheckCircle2 size={16} />
                  <span>Withdrawal Initiated</span>
                </div>
                <p className="text-[11px] text-zinc-300 font-medium">{withdrawSuccessMessage}</p>
              </div>
            )}

            {withdrawError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-bold text-rose-400 flex items-start gap-2">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{withdrawError}</span>
              </div>
            )}

            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3 text-xs">
                <div className="flex justify-between items-center text-zinc-400">
                  <span>Available Balance:</span>
                  <span className="text-white font-black text-sm">
                    ₹{balances.available_balance.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center text-zinc-400 border-t border-zinc-800/80 pt-2">
                  <span>Verified UPI:</span>
                  <span className="text-emerald-400 font-bold font-mono">
                    {activeSettlementMethod?.masked_destination || "Verified UPI"}
                  </span>
                </div>

                {activeSettlementMethod?.verified_name && (
                  <div className="flex justify-between items-center text-zinc-400">
                    <span>Beneficiary:</span>
                    <span className="text-white font-medium">{activeSettlementMethod.verified_name}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-zinc-300">Amount (₹)</label>
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(String(balances.available_balance))}
                    className="text-[10px] font-black text-emerald-400 hover:text-emerald-300 uppercase tracking-wider"
                  >
                    Withdraw All
                  </button>
                </div>

                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-500">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="100"
                    max={balances.available_balance}
                    required
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="Enter amount (min ₹100)"
                    className="w-full pl-8 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl text-base font-black text-white focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-xs font-bold text-zinc-300 hover:bg-zinc-800 transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={withdrawSubmitting || Number(withdrawAmount) < 100 || Number(withdrawAmount) > balances.available_balance}
                  className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
                >
                  {withdrawSubmitting ? "Processing UPI Payout..." : "WITHDRAW NOW"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 3: SETTLEMENT / PAYOUT DETAIL MODAL ────────────────────────────── */}
      {selectedPayoutDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Disbursement Record</span>
                <h3 className="text-lg font-black text-white font-mono">
                  {selectedPayoutDetail.settlement_number || `WTH-${selectedPayoutDetail.id.slice(0, 8)}`}
                </h3>
              </div>

              <button
                onClick={() => setSelectedPayoutDetail(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-zinc-900">
                <span className="text-zinc-400">Settlement Amount:</span>
                <span className="text-emerald-400 font-black text-base">
                  ₹{Number(selectedPayoutDetail.amount || selectedPayoutDetail.net_amount || 0).toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between py-2 border-b border-zinc-900">
                <span className="text-zinc-400">Settlement Method:</span>
                <span className="text-white font-bold uppercase flex items-center gap-1">
                  <Smartphone size={12} className="text-emerald-400" />
                  UPI
                </span>
              </div>

              <div className="flex justify-between py-2 border-b border-zinc-900">
                <span className="text-zinc-400">Destination (Masked):</span>
                <span className="font-mono font-bold text-white">
                  {selectedPayoutDetail.destination_masked || activeSettlementMethod?.masked_destination || "Verified UPI"}
                </span>
              </div>

              <div className="flex justify-between py-2 border-b border-zinc-900">
                <span className="text-zinc-400">Transaction Date:</span>
                <span className="text-white font-medium">
                  {new Date(selectedPayoutDetail.created_at || selectedPayoutDetail.start_date).toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex justify-between py-2 border-b border-zinc-900">
                <span className="text-zinc-400">Status:</span>
                <span className={`font-black uppercase tracking-wider ${
                  selectedPayoutDetail.status === "COMPLETED" || selectedPayoutDetail.status === "PAID" || selectedPayoutDetail.status === "SUCCESS"
                    ? "text-emerald-400"
                    : selectedPayoutDetail.status === "FAILED"
                    ? "text-rose-400"
                    : "text-amber-400"
                }`}>
                  {selectedPayoutDetail.status}
                </span>
              </div>

              <div className="flex justify-between py-2 border-b border-zinc-900">
                <span className="text-zinc-400">UTR / Banking Reference:</span>
                <span className="font-mono text-zinc-300 font-bold">
                  {selectedPayoutDetail.utr_number || selectedPayoutDetail.transaction_id || "Under Processing"}
                </span>
              </div>

              {selectedPayoutDetail.status === "FAILED" && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-4 space-y-2 mt-4 text-xs">
                  <div className="flex items-center gap-1.5 text-rose-400 font-black uppercase tracking-wider">
                    <AlertTriangle size={14} />
                    <span>Payout Failed</span>
                  </div>
                  <p className="text-zinc-300 text-[11px]">
                    <strong>Reason:</strong> {selectedPayoutDetail.failure_reason || "The banking network could not credit the requested amount. The balance has been restored to your available balance."}
                  </p>
                  <button
                    onClick={() => {
                      setSelectedPayoutDetail(null);
                      setWithdrawAmount(String(selectedPayoutDetail.amount || ""));
                      setShowWithdrawModal(true);
                    }}
                    className="w-full mt-2 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-black text-xs font-black uppercase tracking-wider transition"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
              <button
                onClick={() => setSelectedPayoutDetail(null)}
                className="w-full py-2.5 rounded-xl bg-white text-black text-xs font-black uppercase tracking-wider hover:bg-zinc-200 transition"
              >
                Close Statement
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
