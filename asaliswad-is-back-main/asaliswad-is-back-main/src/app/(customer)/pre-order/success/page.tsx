"use client";

export const dynamic = "force-dynamic";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Suspense } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("booking_id");

  return (
    <main className="min-h-screen bg-[#cefad0] text-slate-900 overflow-x-hidden pb-20">
      <Header title="Booking Successful" subtitle="Thank you for your pre-order" />

      <section className="mx-auto max-w-2xl px-4 py-12 md:px-8 mt-10">
        <div className="rounded-[2.5rem] bg-white p-8 md:p-12 text-center premium-shadow border border-slate-100 flex flex-col items-center">
          
          <div className="h-24 w-24 rounded-full bg-emerald-100 text-5xl flex items-center justify-center mb-8 border-8 border-emerald-50">
            ✅
          </div>

          <h2 className="text-3xl font-black text-emerald-900 mb-4">Order Reserved Successfully!</h2>
          <p className="text-slate-500 font-bold max-w-sm mb-8">
            Your booking amount of ₹2 has been received and your order is confirmed.
          </p>

          <div className="w-full bg-slate-50 rounded-2xl p-6 border-2 border-slate-100 mb-10 text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Booking ID</p>
            <p className="text-lg font-black text-slate-900 break-all">{bookingId || "N/A"}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <Link 
              href="/profile" 
              className="flex-1 flex h-14 items-center justify-center rounded-xl border-2 border-slate-200 bg-white text-sm font-black uppercase tracking-widest text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 active:scale-95"
            >
              View Booking
            </Link>
            <Link 
              href="/products" 
              className="flex-1 flex h-14 items-center justify-center rounded-xl bg-emerald-600 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-600/30 transition hover:bg-emerald-700 active:scale-95"
            >
              Continue Shopping
            </Link>
          </div>

        </div>
      </section>
    </main>
  );
}

export default function PreOrderSuccessPage() {
    return (
        <Suspense fallback={
            <main className="flex min-h-screen items-center justify-center bg-slate-50">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
            </main>
        }>
            <SuccessContent />
        </Suspense>
    )
}
