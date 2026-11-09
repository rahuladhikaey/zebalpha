"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { checkOperationsAccess, OperationsAuthSession } from "@/lib/authGuard";
import { supabase } from "@/lib/supabaseClient";
import { Headphones, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SupportDeskPage() {
  const router = useRouter();
  const [session, setSession] = useState<OperationsAuthSession | null>(null);
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [ticketStatus, setTicketStatus] = useState("in_progress");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function init() {
      const auth = await checkOperationsAccess();
      if (!auth.authorized) {
        router.push(auth.userId ? "/unauthorized" : "/login");
        return;
      }
      setSession(auth);

      // Fetch customer support tickets under RLS
      const { data } = await supabase
        .from("customer_support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) setTickets(data);
    }
    init();
  }, [router]);

  const handleUpdateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket) return;
    setUpdating(true);

    try {
      // Direct update enforcing database trigger validate_support_ticket_mutation
      const { error } = await supabase
        .from("customer_support_tickets")
        .update({
          status: ticketStatus,
          resolution_notes: resolutionNotes.trim(),
        })
        .eq("id", selectedTicket.id);

      if (!error) {
        setTickets(tickets.map((t) => (t.id === selectedTicket.id ? { ...t, status: ticketStatus, resolution_notes: resolutionNotes } : t)));
        setSelectedTicket(null);
      } else {
        alert(error.message);
      }
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 pl-64">
      <Sidebar userRole={session?.role} userEmail={session?.email} />
      <Header title="Customer Support & Returns Desk" description="Manage customer queries, delivery exceptions, return requests, and disputes" />

      <main className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">Support Tickets Queue</h2>
            <p className="text-xs text-zinc-400">Total {tickets.length} tickets assigned to support workflow</p>
          </div>
        </div>

        {/* Modal for updating ticket */}
        {selectedTicket && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-dark-900 border border-dark-800 rounded-xl max-w-lg w-full p-6 shadow-2xl">
              <h3 className="text-sm font-bold text-white mb-1">Update Ticket: {selectedTicket.ticket_number}</h3>
              <p className="text-xs text-zinc-400 mb-4">{selectedTicket.subject}</p>

              <div className="p-3 bg-dark-950 rounded-lg text-xs text-zinc-300 mb-4 border border-dark-800">
                <div className="text-[10px] text-zinc-400 uppercase font-semibold mb-1">Customer Description</div>
                {selectedTicket.description}
              </div>

              <form onSubmit={handleUpdateTicket} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Status</label>
                  <select
                    value={ticketStatus}
                    onChange={(e) => setTicketStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white focus:outline-none focus:border-ops-500"
                  >
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting_customer">Waiting on Customer</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Resolution Notes</label>
                  <textarea
                    rows={4}
                    required
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Enter support resolution, courier coordination details, or customer response..."
                    className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-ops-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTicket(null)}
                    className="px-3.5 py-2 rounded-lg bg-dark-800 text-zinc-300 hover:text-white text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="px-4 py-2 rounded-lg bg-ops-600 hover:bg-ops-500 text-white text-xs font-semibold disabled:opacity-50"
                  >
                    {updating ? "Saving..." : "Save Resolution"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden shadow-xl">
          {tickets.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-xs">
              No support tickets currently in the queue.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-dark-950/50 text-[10px] uppercase tracking-wider text-zinc-400 border-b border-dark-800">
                  <tr>
                    <th className="py-3 px-4">Ticket</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Subject</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800">
                  {tickets.map((t) => (
                    <tr key={t.id} className="hover:bg-dark-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-white">{t.ticket_number}</td>
                      <td className="py-3 px-4 text-zinc-400 uppercase text-[10px] font-mono">{t.category}</td>
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
                      <td className="py-3 px-4">
                        <button
                          onClick={() => {
                            setSelectedTicket(t);
                            setResolutionNotes(t.resolution_notes || "");
                            setTicketStatus(t.status || "in_progress");
                          }}
                          className="px-2.5 py-1 rounded bg-dark-800 hover:bg-dark-700 text-xs text-ops-400 hover:text-ops-300 font-medium"
                        >
                          Resolve
                        </button>
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

