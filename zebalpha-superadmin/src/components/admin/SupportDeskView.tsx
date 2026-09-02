"use client";

import { useState } from "react";
import { MessageSquare, CheckCircle2, Clock, Filter, Send } from "lucide-react";

export default function SupportDeskView() {
  const [activeStream, setActiveStream] = useState<"seller" | "customer">("seller");
  const [tickets, setTickets] = useState<any[]>([]);

  const handleUpdateStatus = (id: string, status: string) => {
    setTickets(tickets.map(t => t.id === id ? { ...t, status } : t));
  };

  const filteredTickets = tickets.filter(t => t.type === activeStream);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Help Center</span>
          <h1 className="text-2xl font-black tracking-tight text-white">Support Desk & Ticket Resolution</h1>
          <p className="text-xs font-bold text-zinc-400 mt-0.5">
            Resolve incoming support inquiries from merchants and customers in real-time.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-1.5 rounded-2xl self-start">
          <button
            onClick={() => setActiveStream("seller")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeStream === "seller" ? "bg-white text-black shadow-xl" : "text-zinc-400 hover:text-white"
            }`}
          >
            Seller Tickets
          </button>
          <button
            onClick={() => setActiveStream("customer")}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              activeStream === "customer" ? "bg-white text-black shadow-xl" : "text-zinc-400 hover:text-white"
            }`}
          >
            Customer Tickets
          </button>
        </div>
      </div>

      <div className="bg-zinc-950 rounded-3xl border border-zinc-800 shadow-xl overflow-hidden">
        {filteredTickets.length > 0 ? (
          <div className="divide-y divide-zinc-800">
            {filteredTickets.map(t => (
              <div key={t.id} className="p-5 flex items-center justify-between gap-4 hover:bg-zinc-900 transition-colors">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-xs text-white">{t.id}</span>
                    <span className="font-black text-white text-sm">{t.subject}</span>
                  </div>
                  <p className="text-xs text-zinc-400 font-medium">From: {t.user} • Created {t.created}</p>
                </div>

                <div className="flex items-center gap-3">
                  <select
                    value={t.status}
                    onChange={(e) => handleUpdateStatus(t.id, e.target.value)}
                    className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-bold text-white outline-none focus:border-white cursor-pointer"
                  >
                    <option value="OPEN">OPEN</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="RESOLVED">RESOLVED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <MessageSquare className="mx-auto h-12 w-12 text-zinc-700 mb-3" />
            <h3 className="text-lg font-black text-white">No {activeStream === "seller" ? "Seller" : "Customer"} Tickets</h3>
            <p className="mt-1 text-xs text-zinc-500 max-w-sm mx-auto font-medium">
              Incoming support tickets will be routed here automatically for administrative resolution.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
