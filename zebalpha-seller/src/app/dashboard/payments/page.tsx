"use client";

import Link from "next/link";
import { 
  IndianRupee, 
  Sparkles, 
  ShieldCheck, 
  FileText, 
  Building2, 
  ArrowRight,
  TrendingUp
} from "lucide-react";

export default function SellerPaymentsPage() {
  return (
    <div className="space-y-8 max-w-4xl mx-auto py-6 px-2 md:px-4">
      {/* Coming Soon Hero Card */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 p-8 md:p-12 shadow-2xl text-center">
        {/* Glow backdrop effects */}
        <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          {/* Top Icon */}
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-amber-500/30 bg-amber-500/10 text-amber-400 shadow-xl shadow-amber-500/5">
            <IndianRupee className="h-10 w-10 animate-pulse" />
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-4 py-1.5 text-[11px] font-black uppercase tracking-widest text-amber-400 mb-4">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Coming Soon</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white mb-3">
            Settlements & Payouts Ledger
          </h1>

          <p className="max-w-2xl text-sm font-medium text-zinc-400 leading-relaxed mb-8">
            Currently, all products are 1st-party direct brand owned (own brand operations). Automated 3rd-party vendor settlement cycles, split-commissions, and payout disbursements will be activated once 3rd-party marketplace onboarding goes live.
          </p>

          {/* Feature Highlight Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full text-left mb-8">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-2">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Building2 className="h-4 w-4 text-emerald-400" />
                <span>Automated Bank Payouts</span>
              </div>
              <p className="text-xs text-zinc-400 font-medium">
                Scheduled weekly payouts directly to merchant bank accounts with automated reconciliation.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-2">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <FileText className="h-4 w-4 text-amber-400" />
                <span>GST & Tax Receipts</span>
              </div>
              <p className="text-xs text-zinc-400 font-medium">
                Downloadable PDF tax invoices, fee statements, and TDS/TCS deduction breakdowns.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-2">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <TrendingUp className="h-4 w-4 text-blue-400" />
                <span>Realtime Earning Analytics</span>
              </div>
              <p className="text-xs text-zinc-400 font-medium">
                Live order margins, pending escrow holds, and instant payout balance calculation.
              </p>
            </div>
          </div>

          {/* Current Status Box */}
          <div className="w-full rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <ShieldCheck size={18} />
              </div>
              <div>
                <p className="text-xs font-black text-white">Direct Brand Mode Active</p>
                <p className="text-[11px] font-medium text-zinc-400">All customer sales revenue is credited directly to your primary business account.</p>
              </div>
            </div>
            <Link 
              href="/dashboard/orders" 
              className="inline-flex items-center gap-2 rounded-xl bg-white text-black px-4 py-2.5 text-xs font-black hover:bg-zinc-200 transition-all shrink-0 shadow-lg shadow-white/5"
            >
              <span>View Orders</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
