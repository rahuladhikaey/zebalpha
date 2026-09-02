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
    <main className="min-h-screen bg-black text-white overflow-x-hidden pb-20">
      <Header title="Booking Successful" subtitle="Thank you for your pre-order" />

      <section className="mx-auto max-w-2xl px-4 py-12 md:px-8 mt-10">
        <div className="rounded-[2.5rem] bg-zinc-950 p-8 md:p-12 text-center border border-zinc-800 shadow-2xl flex flex-col items-center">
          
          <div className="h-24 w-24 rounded-full bg-zinc-900 text-5xl flex items-center justify-center mb-8 border border-zinc-800">
            ✅
          </div>

          <h2 className="text-3xl font-black text-white mb-4">Order Reserved Successfully!</h2>
          <p className="text-zinc-400 font-bold max-w-sm mb-8">
            Your booking amount of ₹2 has been received and your order is confirmed.
          </p>

          <div className="w-full bg-zinc-900 rounded-2xl p-6 border border-zinc-800 mb-10 text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1">Booking ID</p>
            <p className="text-lg font-black text-white break-all">{bookingId || "N/A"}</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <Link 
              href="/profile" 
              className="flex-1 flex h-14 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-sm font-black uppercase tracking-widest text-zinc-400 transition hover:bg-zinc-800 hover:text-white active:scale-95 cursor-pointer"
            >
              View Booking
            </Link>
            <Link 
              href="/products" 
              className="flex-1 flex h-14 items-center justify-center rounded-xl bg-white text-sm font-black uppercase tracking-widest text-black shadow-xl shadow-white/10 transition hover:bg-zinc-200 active:scale-95 cursor-pointer"
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
            <main className="flex min-h-screen items-center justify-center bg-black">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
            </main>
        }>
            <SuccessContent />
        </Suspense>
    )
}
