"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

function OrderSuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id");
  const [order, setOrder] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      const fetchOrder = async () => {
        const { data } = await supabase
          .from("orders")
          .select("*")
          .eq("id", orderId)
          .single();

        if (data) setOrder(data);
        setLoading(false);
      };
      fetchOrder();
    }
  }, [orderId]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
          <p className="text-sm font-black uppercase tracking-widest text-white">Loading Order Status...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <Header title="Order Confirmed" subtitle={order?.payment_method === "COD" ? "Order Placed Successfully" : "Payment Complete"} />

      <section className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-[3rem] bg-zinc-950 p-8 md:p-12 border border-zinc-800 shadow-2xl text-center">
          <div className="mx-auto h-24 w-24 flex items-center justify-center rounded-full bg-zinc-900 border border-zinc-800 text-4xl mb-8 animate-bounce">
            ✅
          </div>

          <h1 className="text-3xl font-black text-white">
            {order?.payment_method === "COD" ? "Order Successful!" : "Payment Complete!"}
          </h1>
          <p className="mt-4 text-zinc-400 font-bold uppercase tracking-widest text-sm">
            Waiting for Shipping by Seller
          </p>

          <div className="mt-10 p-6 rounded-3xl bg-zinc-900 border border-zinc-800 text-left space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="font-bold text-zinc-400 uppercase tracking-widest">Order ID</span>
              <span className="font-black text-white">#{String(orderId).slice(0, 8)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="font-bold text-zinc-400 uppercase tracking-widest">Payment Method</span>
              <span className="px-3 py-1 rounded-full text-white bg-zinc-800 border border-zinc-700 text-[10px] font-black tracking-widest uppercase">
                {order?.payment_method === "COD" ? "Cash on Delivery" : "Online - Complete"}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="font-bold text-zinc-400 uppercase tracking-widest">Shipping Status</span>
              <span className="px-3 py-1 rounded-full bg-zinc-800 border border-zinc-700 text-white text-[10px] font-black tracking-widest uppercase">Pending</span>
            </div>
          </div>

          <div className="mt-10 space-y-4">
            <p className="text-zinc-400 font-medium">
              {order?.payment_method === "COD"
                ? "Your COD order has been received. Please keep the exact amount ready for payment at the time of delivery."
                : "We have received your payment. Our team is currently preparing your package for dispatch."}
              {" Our seller is preparing it for shipping. You will receive an update once it's shipped!"}
            </p>

            <div className="pt-8">
              <Link href="/" className="inline-flex items-center justify-center rounded-2xl bg-white px-8 py-4 text-sm font-black uppercase tracking-widest text-black transition hover:bg-zinc-200 active:scale-95 shadow-xl shadow-white/10 cursor-pointer">
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>

        {/* Status Tracker */}
        <div className="mt-12 overflow-hidden rounded-[2.5rem] bg-zinc-950 border border-zinc-800 shadow-2xl">
          <div className="bg-zinc-900 p-6 text-white flex items-center justify-between border-b border-zinc-800">
            <span className="text-xs font-black uppercase tracking-widest">Order Progress</span>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">In Real-time</span>
          </div>
          <div className="p-8 space-y-8 relative">
            {/* Vertical line connector */}
            <div className="absolute left-[2.45rem] top-12 bottom-20 w-1 bg-zinc-800" />

            <div className="flex items-start gap-6 relative">
              <div className="h-4 w-4 rounded-full bg-white mt-1 ring-8 ring-zinc-800" />
              <div>
                <h4 className="font-black text-sm uppercase text-white">
                  {order?.payment_method === "COD" ? "Order Confirmed" : "Order Placed & Paid"}
                </h4>
                <p className="text-xs text-zinc-400 font-medium mt-1">
                  {order?.payment_method === "COD" ? "Your COD order has been recorded." : "Order successfully created and payment verified."}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-6 relative">
              <div className="h-4 w-4 rounded-full bg-zinc-400 mt-1 ring-8 ring-zinc-800 animate-pulse" />
              <div>
                <h4 className="font-black text-sm uppercase text-white">Dispatch Center</h4>
                <p className="text-xs text-zinc-400 font-medium mt-1">Admin is reviewing your order for shipment via Shiprocket.</p>
              </div>
            </div>

            <div className="flex items-start gap-6 relative">
              <div className="h-4 w-4 rounded-full bg-zinc-700 mt-1" />
              <div>
                <h4 className="font-black text-sm uppercase text-zinc-500">Shipped</h4>
                <p className="text-xs text-zinc-600 font-medium mt-1">Waiting for courier pickup.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
          <p className="text-sm font-black uppercase tracking-widest text-white">Loading...</p>
        </div>
      </main>
    }>
      <OrderSuccessContent />
    </Suspense>
  );
}

