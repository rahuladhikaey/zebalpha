"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { checkOperationsAccess, OperationsAuthSession } from "@/lib/authGuard";
import { supabase } from "@/lib/supabaseClient";
import { Truck, Package, Clock, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function FulfillmentPage() {
  const router = useRouter();
  const [session, setSession] = useState<OperationsAuthSession | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const auth = await checkOperationsAccess();
      if (!auth.authorized) {
        router.push(auth.userId ? "/unauthorized" : "/login");
        return;
      }
      setSession(auth);

      // Query real marketplace orders under RLS
      const { data } = await supabase
        .from("orders")
        .select("id, total_amount, status, payment_status, shipping_address, created_at")
        .order("created_at", { ascending: false })
        .limit(20);

      if (data) setOrders(data);
      setLoading(false);
    }
    init();
  }, [router]);

  return (
    <div className="min-h-screen bg-dark-950 pl-64">
      <Sidebar userRole={session?.role} userEmail={session?.email} />
      <Header title="Order Fulfillment & Dispatch Queue" description="Monitor marketplace orders moving through packaging, labeling, and courier dispatch" />

      <main className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">Fulfillment Queue</h2>
            <p className="text-xs text-zinc-400">Total {orders.length} orders retrieved from PostgreSQL orders table</p>
          </div>
        </div>

        <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden shadow-xl">
          {orders.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-xs">
              No active orders currently awaiting fulfillment.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-dark-950/50 text-[10px] uppercase tracking-wider text-zinc-400 border-b border-dark-800">
                  <tr>
                    <th className="py-3 px-4">Order ID</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">Total Amount</th>
                    <th className="py-3 px-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-dark-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-white">{o.id.slice(0, 8)}...</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-ops-500/10 text-ops-400 border border-ops-500/20">
                          {o.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 uppercase text-[10px] font-mono text-zinc-400">{o.payment_status}</td>
                      <td className="py-3 px-4 font-mono text-white">₹{Number(o.total_amount).toLocaleString("en-IN")}</td>
                      <td className="py-3 px-4 text-zinc-400">
                        {new Date(o.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

