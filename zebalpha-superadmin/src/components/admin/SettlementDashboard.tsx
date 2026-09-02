"use client";

import { useState } from "react";
import { 
  CreditCard, 
  IndianRupee, 
  Sparkles, 
  ShieldCheck, 
  FileText, 
  Building2, 
  TrendingUp, 
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Lock,
  Layers
} from "lucide-react";

export default function SettlementDashboard() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto py-6 px-2 md:px-4">
      {/* 🌟 COMING SOON HERO CARD 🌟 */}
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
            <span>Coming Soon • Phase 2</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white mb-3">
            Multi-Vendor Payouts & Settlement Ledger
          </h1>

          <p className="max-w-2xl text-sm font-medium text-zinc-400 leading-relaxed mb-8">
            Currently, all customer sales revenue flows <span className="text-white font-bold">100% directly into your primary ZEBALPHA Business Razorpay Account</span> (1st-Party Direct Brand Operations). Automated 3rd-party vendor weekly payouts, split commission deductions, and ledger receipts will be activated when external multi-vendor merchant onboarding goes live.
          </p>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full text-left mb-8">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-2">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Building2 className="h-4 w-4 text-emerald-400" />
                <span>Automated Vendor Payouts</span>
              </div>
              <p className="text-xs text-zinc-400 font-medium">
                Scheduled weekly IMPS/NEFT disbursements directly to 3rd-party merchant bank accounts.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-2">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <FileText className="h-4 w-4 text-amber-400" />
                <span>GST & Commission Invoicing</span>
              </div>
              <p className="text-xs text-zinc-400 font-medium">
                Auto-generated marketplace fee invoices, TDS/TCS breakdowns, and immutable PDF receipts.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 space-y-2">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Layers className="h-4 w-4 text-blue-400" />
                <span>Escrow Hold & Split Engine</span>
              </div>
              <p className="text-xs text-zinc-400 font-medium">
                Automatic order delivery confirmation holds and marketplace split commission processing.
              </p>
            </div>
          </div>

          {/* 1st-Party Razorpay Gateway Status Box */}
          <div className="w-full rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-left">
            <div className="flex items-center gap-3.5">
              <div className="h-10 w-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <ShieldCheck size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-black text-white">Direct Business Razorpay Routing Active</p>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase">
                    100% Volume
                  </span>
                </div>
                <p className="text-[11px] font-medium text-zinc-400 mt-0.5">
                  All customer payments are deposited directly into your primary brand merchant account via Razorpay standard settlements.
                </p>
              </div>
            </div>

            <a
              href="https://dashboard.razorpay.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-white text-black px-4 py-2.5 text-xs font-black hover:bg-zinc-200 transition-all shrink-0 shadow-lg shadow-white/5"
            >
              <span>Razorpay Live Portal</span>
              <ExternalLink size={13} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
