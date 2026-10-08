"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  IndianRupee, 
  Sparkles, 
  ShieldCheck, 
  FileText, 
  Building2, 
  ArrowRight,
  TrendingUp,
  Download,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  CreditCard,
  Receipt,
  Scale,
  Eye,
  X,
  ExternalLink,
  Lock,
  ArrowUpRight,
  ArrowDownRight,
  SlidersHorizontal,
  ChevronDown,
  Info
} from "lucide-react";
import { LedgerTransaction, SellerLedgerBalances, DetailedSettlementRecord } from "@shared/types";

type PaymentTab = "settlements" | "ledger" | "reconciliation" | "bank";

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
  const [bankAccount, setBankAccount] = useState<any>(null);

  // Filters & Search
  const [ledgerSearch, setLedgerSearch] = useState("");
  const [ledgerTypeFilter, setLedgerTypeFilter] = useState("ALL");
  const [settlementFilter, setSettlementFilter] = useState("ALL");

  // Selected Settlement Modal
  const [selectedSettlement, setSelectedSettlement] = useState<DetailedSettlementRecord | null>(null);

  // Bank Form State
  const [bankForm, setBankForm] = useState({
    accountHolderName: "",
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    upiId: ""
  });
  const [bankSubmitting, setBankSubmitting] = useState(false);
  const [bankMessage, setBankMessage] = useState("");
  const [bankError, setBankError] = useState("");
  const [showEditBank, setShowEditBank] = useState(false);

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
        if (json.bankAccount) {
          setBankAccount(json.bankAccount);
          setBankForm({
            accountHolderName: json.bankAccount.account_holder_name || "",
            bankName: json.bankAccount.bank_name || "",
            accountNumber: "",
            ifscCode: json.bankAccount.ifsc_code || "",
            upiId: json.bankAccount.upi_id || ""
          });
        }
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

  // Filtered Settlements
  const filteredSettlements = useMemo(() => {
    return settlements.filter(st => {
      if (settlementFilter === "ALL") return true;
      return (st.status || "").toUpperCase() === settlementFilter.toUpperCase();
    });
  }, [settlements, settlementFilter]);

  // Handle Bank Submit
  async function handleBankSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBankSubmitting(true);
    setBankMessage("");
    setBankError("");

    try {
      const res = await fetch("/api/payments/bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bankForm)
      });
      const data = await res.json();

      if (data.success) {
        setBankMessage(data.message || "Bank details submitted for verification.");
        setBankAccount(data.bankAccount);
        setShowEditBank(false);
      } else {
        setBankError(data.error || "Failed to submit bank details.");
      }
    } catch (err: any) {
      setBankError(err?.message || "An unexpected error occurred.");
    } finally {
      setBankSubmitting(false);
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-6 px-2 sm:px-4 md:px-6">
      
      {/* ── TOP HEADER & QUICK STATS ──────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-emerald-400 mb-2">
            <Sparkles size={12} />
            <span>Financial Operations & Ledger</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Payments, Settlements & Ledger
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 font-medium mt-1">
            Real-time immutable audit trail, automated weekly settlements & fee reconciliation.
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
        {/* Available to Withdraw */}
        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 to-zinc-950 p-4 sm:p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between text-zinc-400 mb-2">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400">Available Payout</span>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl md:text-3xl font-black text-white">
            ₹{balances.available_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <p className="text-[11px] text-zinc-400 font-medium mt-1">
            Eligible past 7-day return window
          </p>
        </div>

        {/* Pending Settlement */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5 relative overflow-hidden">
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
            In-transit or in return window
          </p>
        </div>

        {/* On Hold / Disputed */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5 relative overflow-hidden">
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

        {/* Total Settled Paid */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 sm:p-5 relative overflow-hidden">
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
            Disbursed to merchant bank
          </p>
        </div>
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
          <span>Weekly Settlements</span>
          <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300">
            {settlements.length}
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
          onClick={() => setActiveTab("bank")}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-xl transition ${
            activeTab === "bank"
              ? "bg-white text-black shadow-lg"
              : "text-zinc-400 hover:text-white hover:bg-zinc-900"
          }`}
        >
          <Building2 size={14} />
          <span>Bank & Payout Profile</span>
          {bankAccount?.status === "BANK_CHANGE_PENDING" && (
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>
      </div>

      {/* ── TAB 1: WEEKLY SETTLEMENTS ────────────────────────────────────────────── */}
      {activeTab === "settlements" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Status Filter */}
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-400">Filter Status:</span>
              {["ALL", "PAID", "PENDING", "PROCESSING"].map(status => (
                <button
                  key={status}
                  onClick={() => setSettlementFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                    settlementFilter === status
                      ? "bg-zinc-800 text-white border border-zinc-700"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <div className="text-xs font-bold text-zinc-400">
              Showing {filteredSettlements.length} settlement cycles
            </div>
          </div>

          {filteredSettlements.length === 0 ? (
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-12 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-500">
                <Receipt size={32} />
              </div>
              <h3 className="text-lg font-bold text-white">No Settlement Cycles Found</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                Settlements are automatically computed every week for delivered orders past the customer return window.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/80 border-b border-zinc-800 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    <tr>
                      <th className="py-3.5 px-4">Settlement Cycle</th>
                      <th className="py-3.5 px-4">Period</th>
                      <th className="py-3.5 px-4">Orders</th>
                      <th className="py-3.5 px-4">Gross Sales</th>
                      <th className="py-3.5 px-4">Platform Deductions</th>
                      <th className="py-3.5 px-4">Net Payout</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {filteredSettlements.map((st) => {
                      const otherFees = (st.fixed_fees || 0) + (st.shipping_fees || 0) + (st.collection_fees || 0) || (st.platform_fees || 0);
                      const totalDeductions = (st.commission_deducted || 0) + otherFees + (st.taxes || 0);
                      const isPaid = (st.status || "").toUpperCase() === "PAID";

                      return (
                        <tr key={st.id} className="hover:bg-zinc-900/40 transition">
                          <td className="py-4 px-4 font-mono font-bold text-white">
                            {st.settlement_number || `SET-WK${st.week_number || st.id.slice(0, 8)}`}
                          </td>
                          <td className="py-4 px-4 text-zinc-300">
                            {new Date(st.start_date).toLocaleDateString()} – {new Date(st.end_date).toLocaleDateString()}
                          </td>
                          <td className="py-4 px-4 font-bold text-white">
                            {st.total_orders || 0}
                          </td>
                          <td className="py-4 px-4 font-bold text-white">
                            ₹{Number(st.gross_sales || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-4 text-rose-400 font-bold">
                            -₹{Number(totalDeductions).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-4 text-emerald-400 font-black text-sm">
                            ₹{Number(st.net_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                              isPaid 
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                            }`}>
                              {isPaid ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                              {st.status || "PENDING"}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <button
                              onClick={() => setSelectedSettlement(st)}
                              className="px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-zinc-200 transition"
                            >
                              View Breakdown
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

      {/* ── TAB 2: TRANSACTIONS LEDGER ───────────────────────────────────────────── */}
      {activeTab === "ledger" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Search & Type Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                placeholder="Search transaction description, order ID, reference..."
                className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white transition"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-zinc-400">Type:</span>
              <select
                value={ledgerTypeFilter}
                onChange={(e) => setLedgerTypeFilter(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-white"
              >
                <option value="ALL">All Types</option>
                <option value="SALE">SALE (Order Credit)</option>
                <option value="COMMISSION">COMMISSION (Platform Fee)</option>
                <option value="SHIPPING_FEE">SHIPPING_FEE (Logistics)</option>
                <option value="FIXED_FEE">FIXED_FEE (Platform)</option>
                <option value="COLLECTION_FEE">COLLECTION_FEE (Payment)</option>
                <option value="REFUND">REFUND (Return Debit)</option>
                <option value="SETTLEMENT">SETTLEMENT (Bank Payout)</option>
              </select>
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-12 text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-500">
                <Scale size={32} />
              </div>
              <h3 className="text-lg font-bold text-white">No Ledger Entries Recorded</h3>
              <p className="text-xs text-zinc-400 max-w-md mx-auto">
                Every order credit, commission deduction, reverse shipping fee, and settlement creates an immutable entry here.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-900/80 border-b border-zinc-800 text-[10px] font-black uppercase tracking-wider text-zinc-400">
                    <tr>
                      <th className="py-3.5 px-4">Date / Time</th>
                      <th className="py-3.5 px-4">Transaction Type</th>
                      <th className="py-3.5 px-4">Description</th>
                      <th className="py-3.5 px-4">Reference</th>
                      <th className="py-3.5 px-4 text-right">Credit / Debit</th>
                      <th className="py-3.5 px-4 text-right">Balance After</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {filteredTransactions.map((tx) => {
                      const isCredit = tx.entry_type === "CREDIT";

                      return (
                        <tr key={tx.id} className="hover:bg-zinc-900/40 transition">
                          <td className="py-4 px-4 text-zinc-400 whitespace-nowrap">
                            {new Date(tx.created_at).toLocaleString()}
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                              tx.transaction_type === "SALE"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                : tx.transaction_type === "SETTLEMENT"
                                ? "bg-blue-500/10 text-blue-400 border border-blue-500/30"
                                : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                            }`}>
                              {tx.transaction_type}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-white font-medium max-w-xs truncate">
                            {tx.description}
                          </td>
                          <td className="py-4 px-4 font-mono text-zinc-400 text-[11px]">
                            {tx.reference_id || tx.order_id || "—"}
                          </td>
                          <td className={`py-4 px-4 text-right font-black ${
                            isCredit ? "text-emerald-400" : "text-rose-400"
                          }`}>
                            {isCredit ? "+" : "-"}₹{Number(tx.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-4 px-4 text-right font-mono font-bold text-white">
                            ₹{Number(tx.balance_after).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
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

      {/* ── TAB 3: RECONCILIATION & FEE BREAKDOWN ─────────────────────────────────── */}
      {activeTab === "reconciliation" && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Master Reconciliation Summary */}
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 space-y-6">
              <div className="flex items-center gap-2 text-white font-black text-base border-b border-zinc-800 pb-4">
                <Scale className="text-emerald-400" size={18} />
                <span>Complete Financial Reconciliation</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between py-2 border-b border-zinc-900">
                  <span className="text-zinc-400 font-bold">Gross Customer Order Sales</span>
                  <span className="text-white font-black text-sm">₹{balances.gross_sales.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-zinc-900 text-rose-400">
                  <span>Platform Commission Fees</span>
                  <span className="font-bold">-₹{balances.commission.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-zinc-900 text-rose-400">
                  <span>Standard Shipping & Logistics</span>
                  <span className="font-bold">-₹{balances.shipping_fees.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-zinc-900 text-rose-400">
                  <span>Fixed & Payment Collection Fees</span>
                  <span className="font-bold">-₹{(balances.fixed_fees + balances.collection_fees).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-zinc-900 text-rose-400">
                  <span>Returns, RTO & Customer Refunds</span>
                  <span className="font-bold">-₹{balances.returns_and_refunds.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between py-3 border-t border-zinc-800 text-white font-black text-sm">
                  <span>Net Merchant Realized Earnings</span>
                  <span className="text-emerald-400 text-base">₹{balances.net_seller_earnings.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between py-2 border-b border-zinc-900 text-zinc-400">
                  <span>Cumulative Paid Disbursed Settlements</span>
                  <span className="text-blue-400 font-bold">-₹{balances.total_settled.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>

                <div className="flex justify-between py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 text-emerald-400 font-black text-sm">
                  <span>Closing Available Payout Balance</span>
                  <span>₹{balances.available_balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Configurable Fee Structure Info Card */}
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 space-y-6">
              <div className="flex items-center gap-2 text-white font-black text-base border-b border-zinc-800 pb-4">
                <SlidersHorizontal className="text-amber-400" size={18} />
                <span>Marketplace Standard Rate Card</span>
              </div>

              <div className="space-y-4 text-xs">
                <p className="text-zinc-400 font-medium leading-relaxed">
                  ZebAlpha operates on transparent, competitive marketplace fees. All deductions are dynamically configured from the Admin control panel:
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 space-y-1">
                    <span className="text-[10px] font-black uppercase text-zinc-500">Commission</span>
                    <div className="text-base font-black text-white">5.0%</div>
                    <p className="text-[10px] text-zinc-400 font-medium">3.5% for Premium Store</p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 space-y-1">
                    <span className="text-[10px] font-black uppercase text-zinc-500">Fixed Fee</span>
                    <div className="text-base font-black text-white">₹15.00</div>
                    <p className="text-[10px] text-zinc-400 font-medium">Per confirmed shipment</p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 space-y-1">
                    <span className="text-[10px] font-black uppercase text-zinc-500">Collection Fee</span>
                    <div className="text-base font-black text-white">2.0%</div>
                    <p className="text-[10px] text-zinc-400 font-medium">Prepaid gateway fee</p>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3.5 space-y-1">
                    <span className="text-[10px] font-black uppercase text-zinc-500">Settlement Delay</span>
                    <div className="text-base font-black text-emerald-400">7 Days</div>
                    <p className="text-[10px] text-zinc-400 font-medium">Post order delivery</p>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 flex items-start gap-3">
                  <Info size={16} className="text-zinc-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
                    GST @ 18% is legally applicable only on platform service fees (Commission + Fixed Fee + Collection Fee) and is automatically documented in your monthly tax statements.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── TAB 4: BANK ACCOUNT & PAYOUT SETTINGS ─────────────────────────────────── */}
      {activeTab === "bank" && (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
          
          {/* Active Bank Card */}
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 md:p-8 space-y-6 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Disbursement Bank Account</h3>
                  <p className="text-xs text-zinc-400 font-medium">All automated weekly payouts are sent to this account</p>
                </div>
              </div>

              {bankAccount?.status === "ACTIVE" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck size={12} />
                  Verified
                </span>
              )}

              {bankAccount?.status === "BANK_CHANGE_PENDING" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  <Clock size={12} />
                  Change Review Pending
                </span>
              )}
            </div>

            {/* Account Details Box */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500 font-bold uppercase tracking-wider">Account Holder</span>
                <span className="text-white font-bold">{bankAccount?.account_holder_name || "—"}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500 font-bold uppercase tracking-wider">Bank Name</span>
                <span className="text-white font-bold">{bankAccount?.bank_name || "—"}</span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500 font-bold uppercase tracking-wider">Account Number</span>
                <span className="font-mono text-emerald-400 font-bold tracking-widest">
                  {bankAccount?.masked_account_number || "•••• •••• —"}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500 font-bold uppercase tracking-wider">IFSC Code</span>
                <span className="font-mono text-white font-bold">{bankAccount?.ifsc_code || "—"}</span>
              </div>

              {bankAccount?.upi_id && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-500 font-bold uppercase tracking-wider">PhonePe / UPI ID</span>
                  <span className="font-mono text-amber-400 font-bold">{bankAccount.upi_id}</span>
                </div>
              )}
            </div>

            {/* Anti-Fraud Security Notice */}
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
              <Lock size={16} className="text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px] text-zinc-400 font-medium leading-relaxed">
                <strong className="text-amber-300">Marketplace Fraud Protection:</strong> Updating bank details requires manual verification by ZebAlpha compliance. Payouts remain locked to the existing verified account until changes are audited.
              </p>
            </div>

            {/* Edit Button */}
            {!showEditBank && (
              <button
                onClick={() => setShowEditBank(true)}
                className="w-full py-3 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs font-black uppercase tracking-wider text-white transition active:scale-95"
              >
                Update Bank Details
              </button>
            )}
          </div>

          {/* Edit Bank Form Modal/Drawer */}
          {showEditBank && (
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6 md:p-8 space-y-6 animate-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <h3 className="text-base font-black text-white">Update Settlement Account</h3>
                <button
                  onClick={() => setShowEditBank(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900"
                >
                  <X size={18} />
                </button>
              </div>

              {bankMessage && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-400">
                  {bankMessage}
                </div>
              )}

              {bankError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-bold text-rose-400">
                  {bankError}
                </div>
              )}

              <form onSubmit={handleBankSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">Account Holder Name (as in bank passbook)</label>
                  <input
                    type="text"
                    required
                    value={bankForm.accountHolderName}
                    onChange={(e) => setBankForm({ ...bankForm, accountHolderName: e.target.value })}
                    placeholder="e.g. Rahul Adhikary"
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-white transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">Bank Name</label>
                  <input
                    type="text"
                    required
                    value={bankForm.bankName}
                    onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                    placeholder="e.g. HDFC Bank, SBI, ICICI"
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-white transition"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">Account Number</label>
                  <input
                    type="text"
                    required
                    value={bankForm.accountNumber}
                    onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                    placeholder="Enter full bank account number"
                    className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-white transition"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300">IFSC Code</label>
                    <input
                      type="text"
                      required
                      value={bankForm.ifscCode}
                      onChange={(e) => setBankForm({ ...bankForm, ifscCode: e.target.value.toUpperCase() })}
                      placeholder="e.g. HDFC0001234"
                      className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white font-mono uppercase focus:outline-none focus:border-white transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-300">UPI / PhonePe ID (Optional)</label>
                    <input
                      type="text"
                      value={bankForm.upiId}
                      onChange={(e) => setBankForm({ ...bankForm, upiId: e.target.value })}
                      placeholder="e.g. merchant@ybl"
                      className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-white transition"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setShowEditBank(false)}
                    className="px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-xs font-bold text-zinc-300 hover:bg-zinc-800 transition"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={bankSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-white text-black text-xs font-black uppercase tracking-wider hover:bg-zinc-200 transition active:scale-95 disabled:opacity-50"
                  >
                    {bankSubmitting ? "Submitting..." : "Save for Review"}
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      )}

      {/* ── SETTLEMENT BREAKDOWN MODAL ───────────────────────────────────────────── */}
      {selectedSettlement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950 p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Settlement Statement</span>
                <h3 className="text-lg font-black text-white font-mono">
                  {selectedSettlement.settlement_number || `SET-WK${selectedSettlement.week_number || selectedSettlement.id.slice(0, 8)}`}
                </h3>
              </div>

              <button
                onClick={() => setSelectedSettlement(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-zinc-900">
                <span className="text-zinc-400">Settlement Period:</span>
                <span className="text-white font-bold">
                  {new Date(selectedSettlement.start_date).toLocaleDateString()} – {new Date(selectedSettlement.end_date).toLocaleDateString()}
                </span>
              </div>

              <div className="flex justify-between py-2 border-b border-zinc-900">
                <span className="text-zinc-400">Eligible Delivered Orders:</span>
                <span className="text-white font-black">{selectedSettlement.total_orders || 0}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-zinc-900">
                <span className="text-zinc-400">Gross Sales:</span>
                <span className="text-white font-bold">₹{Number(selectedSettlement.gross_sales || 0).toFixed(2)}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-zinc-900 text-rose-400">
                <span>Platform Commission:</span>
                <span className="font-bold">-₹{Number(selectedSettlement.commission_deducted || 0).toFixed(2)}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-zinc-900 text-rose-400">
                <span>Shipping & Fixed Fees:</span>
                <span className="font-bold">-₹{Number((selectedSettlement.fixed_fees || 0) + (selectedSettlement.shipping_fees || 0) + (selectedSettlement.collection_fees || 0) || (selectedSettlement.platform_fees || 0)).toFixed(2)}</span>
              </div>

              <div className="flex justify-between py-2 border-b border-zinc-900 text-rose-400">
                <span>Tax Deductions (TDS / GST):</span>
                <span className="font-bold">-₹{Number(selectedSettlement.taxes || 0).toFixed(2)}</span>
              </div>

              <div className="flex justify-between py-3 border-t border-zinc-800 text-emerald-400 font-black text-base">
                <span>Net Settlement Amount:</span>
                <span>₹{Number(selectedSettlement.net_amount || 0).toFixed(2)}</span>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2 mt-4 text-[11px]">
                <div className="flex justify-between text-zinc-400">
                  <span>Status:</span>
                  <span className="font-bold text-white uppercase">{selectedSettlement.status}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>UTR Reference:</span>
                  <span className="font-mono font-bold text-white">{selectedSettlement.transaction_id || selectedSettlement.utr_number || "Under Processing"}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
              <button
                onClick={() => setSelectedSettlement(null)}
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
