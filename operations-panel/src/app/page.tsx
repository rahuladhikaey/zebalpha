"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { checkOperationsAccess, OperationsAuthSession } from "@/lib/authGuard";
import { supabase } from "@/lib/supabaseClient";
import { 
  Truck, 
  Headphones, 
  CheckSquare, 
  Radio, 
  Package, 
  Clock, 
  AlertCircle,
  TrendingUp
} from "lucide-react";
import Link from "next/link";

export default function OperationsDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<OperationsAuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    pendingFulfillment: 0,
    openTickets: 0,
    pendingTasks: 0,
    activeAnnouncements: 0,
  });
  const [recentTickets, setRecentTickets] = useState<any[]>([]);

  useEffect(() => {
    async function init() {
      const auth = await checkOperationsAccess();
      if (!auth.authorized) {
        if (!auth.userId) {
          router.push("/login");
        } else {
          router.push("/unauthorized");
        }
        return;
      }
      setSession(auth);

      // Fetch live data under RLS
      try {
        const [
          { count: orderCount },
          { count: ticketCount, data: ticketData },
          { count: taskCount },
          { count: annCount },
        ] = await Promise.all([
          supabase.from("orders").select("id", { count: "exact", head: true }).in("status", ["confirmed", "processing", "packed"]),
          supabase.from("customer_support_tickets").select("*", { count: "exact" }).limit(5).order("created_at", { ascending: false }),
          supabase.from("operations_tasks").select("id", { count: "exact", head: true }).eq("status", "pending"),
          supabase.from("internal_announcements").select("id", { count: "exact", head: true }).eq("is_active", true),
        ]);

        setStats({
          pendingFulfillment: orderCount || 0,
          openTickets: ticketCount || 0,
          pendingTasks: taskCount || 0,
          activeAnnouncements: annCount || 0,
        });

        if (ticketData) {
          setRecentTickets(ticketData);
        }
      } catch (err) {
        console.error("Error loading operations dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-ops-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-zinc-400 font-medium">Verifying Operations Panel Authorization...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 pl-64">
      <Sidebar userRole={session?.role} userEmail={session?.email} />
      <Header 
        title="Operations, Logistics & Support Center" 
        description="Fulfillment coordination, delivery exceptions, customer helpdesk, and departmental tasks" 
      />

      <main className="p-8 space-y-8">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-dark-900 border border-dark-800 hover:border-dark-700 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-zinc-400">Orders in Fulfillment</span>
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{stats.pendingFulfillment}</div>
            <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span>Packaging & dispatch queue</span>
            </div>
          </div>

          <div className="p-5 rounded-xl bg-dark-900 border border-dark-800 hover:border-dark-700 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-zinc-400">Customer Support Tickets</span>
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <Headphones className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{stats.openTickets}</div>
            <div className="text-[11px] text-zinc-400 mt-1">Pending queries & returns</div>
          </div>

          <div className="p-5 rounded-xl bg-dark-900 border border-dark-800 hover:border-dark-700 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-zinc-400">Operations Tasks</span>
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <CheckSquare className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{stats.pendingTasks}</div>
            <div className="text-[11px] text-zinc-400 mt-1">Warehouse & logistics queue</div>
          </div>

          <div className="p-5 rounded-xl bg-dark-900 border border-dark-800 hover:border-dark-700 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-zinc-400">Internal Announcements</span>
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                <Radio className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{stats.activeAnnouncements}</div>
            <div className="text-[11px] text-zinc-400 mt-1">Active staff bulletins</div>
          </div>
        </div>

        {/* Customer Support Desk Table */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-dark-800 flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Customer Support Queue</h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">Live tracking from PostgreSQL customer_support_tickets</p>
            </div>
            <Link
              href="/support"
              className="text-xs text-ops-500 hover:underline font-medium"
            >
              Open Support Desk &rarr;
            </Link>
          </div>

          {recentTickets.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-xs">
              No support tickets currently pending in the queue.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-dark-950/50 text-[10px] uppercase tracking-wider text-zinc-400 border-b border-dark-800">
                  <tr>
                    <th className="py-3 px-4">Ticket Number</th>
                    <th className="py-3 px-4">Customer Email</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800">
                  {recentTickets.map((t) => (
                    <tr key={t.id} className="hover:bg-dark-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-white">{t.ticket_number}</td>
                      <td className="py-3 px-4 text-zinc-400">{t.customer_email}</td>
                      <td className="py-3 px-4 text-zinc-200">{t.subject}</td>
                      <td className="py-3 px-4 uppercase font-semibold text-[10px]">
                        <span className={`px-2 py-0.5 rounded ${
                          t.priority === 'urgent' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-zinc-800 text-zinc-300'
                        }`}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] uppercase font-semibold bg-ops-500/10 text-ops-400 border border-ops-500/20">
                          {t.status}
                        </span>
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

