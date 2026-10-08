"use client";

import { useEffect, useState } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import { 
  Plus, 
  MessageSquare, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  HelpCircle, 
  Send, 
  ShieldCheck, 
  RefreshCw,
  Search,
  Filter
} from "lucide-react";

interface SupportTicket {
  id: string;
  seller_id: string;
  subject: string;
  category: string;
  description: string;
  priority: string;
  status: string;
  response?: string | null;
  created_at: string;
  updated_at?: string;
}

export default function SellerSupport() {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("Order Dispatch");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [submitting, setSubmitting] = useState(false);

  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 5000);
  };

  const loadTickets = async () => {
    setLoading(true);
    try {
      // 1. Try secure API route first
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/support", {
        headers,
        cache: "no-store",
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.tickets)) {
          setTickets(json.tickets);
          return;
        }
      }

      // 2. Fallback to direct client Supabase query
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: seller } = await supabase
        .from("sellers")
        .select("id")
        .or(`user_id.eq.${user.id},id.eq.${user.id},email.eq.${user.email?.toLowerCase().trim()}`)
        .maybeSingle();

      const sellerIds = [user.id, seller?.id].filter(Boolean) as string[];

      const { data } = await supabase
        .from("seller_support_tickets")
        .select("*")
        .in("seller_id", sellerIds)
        .order("created_at", { ascending: false });

      setTickets(data || []);
    } catch (e: any) {
      console.warn("Notice loading tickets:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTickets();
  }, []);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      showToast("Please provide both a subject and detailed description.", "error");
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      // 1. Call secure API route
      const res = await fetch("/api/support", {
        method: "POST",
        headers,
        body: JSON.stringify({
          subject: subject.trim(),
          category,
          description: description.trim(),
          priority,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to submit support ticket.");
      }

      showToast("Support ticket raised successfully! Our administration team will review it shortly.", "success");
      setShowCreateModal(false);
      setSubject("");
      setDescription("");
      setCategory("Order Dispatch");
      setPriority("medium");
      loadTickets();
    } catch (err: any) {
      console.error("Ticket submission error:", err);
      showToast(err.message || "Failed to submit support ticket.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const matchesSearch = 
      t.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = 
      statusFilter === "all" ||
      t.status?.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const getPriorityBadge = (p: string) => {
    const val = (p || "medium").toLowerCase();
    switch (val) {
      case "urgent":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide uppercase bg-rose-500/10 text-rose-500 border border-rose-500/20">🚨 Urgent</span>;
      case "high":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide uppercase bg-amber-500/10 text-amber-500 border border-amber-500/20">⚠️ High</span>;
      case "low":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide uppercase bg-slate-500/10 text-slate-500 border border-slate-500/20">Low</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide uppercase bg-blue-500/10 text-blue-500 border border-blue-500/20">Medium</span>;
    }
  };

  const getStatusBadge = (s: string) => {
    const val = (s || "open").toLowerCase();
    switch (val) {
      case "resolved":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">✓ Resolved</span>;
      case "in_progress":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-blue-500/15 text-blue-400 border border-blue-500/30"><Clock size={11} /> In Progress</span>;
      case "closed":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-slate-500/15 text-slate-400 border border-slate-500/30">Closed</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-amber-500/15 text-amber-500 border border-amber-500/30">● Open</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Toast Notification Banner */}
      {notification && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl border text-xs font-semibold shadow-lg transition-all animate-in fade-in slide-in-from-top-2 ${
            notification.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
              : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <HelpCircle className="text-emerald-500" size={22} />
            Help Center & Support
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Raise support tickets or view merchant resolution updates directly from Super Admin.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadTickets()}
            title="Refresh tickets"
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Plus size={16} />
            Raise Support Ticket
          </button>
        </div>
      </div>

      {/* FAQs Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-2 shadow-xs">
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            📦 Product Approvals
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Approved products are immediately active on marketplace unless flagged for brand copyright review.
          </p>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-2 shadow-xs">
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            💳 Payout Settlements
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Payouts settle every Tuesday via registered UPI / bank account for all delivered shipments.
          </p>
        </div>
        <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 space-y-2 shadow-xs">
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            🚚 Dispatch & Logistics
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Mark order as Ready for Dispatch in Orders to generate courier shipping labels and schedule pickup.
          </p>
        </div>
      </div>

      {/* Tickets Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Your Support Tickets ({tickets.length})
          </h2>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-500 w-36 sm:w-48"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex h-36 items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-emerald-600 border-t-transparent"></div>
              <span className="text-xs text-slate-500">Loading support inquiries...</span>
            </div>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 text-center space-y-3">
            <MessageSquare className="mx-auto h-10 w-10 text-slate-300 dark:text-slate-700" />
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {tickets.length === 0 
                ? "No support tickets raised yet. Have a question or facing an issue? Raise a ticket anytime."
                : "No support tickets match your filter criteria."}
            </p>
            {tickets.length === 0 && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus size={14} />
                Raise First Ticket
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTickets.map((t) => (
              <div
                key={t.id}
                className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 transition-all hover:border-slate-300 dark:hover:border-slate-700 shadow-xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">{t.subject}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      {t.category}
                    </span>
                    {getPriorityBadge(t.priority)}
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0">
                    {getStatusBadge(t.status)}
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(t.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {t.description}
                </p>

                {/* Admin Official Response */}
                {t.response ? (
                  <div className="mt-3 p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-[11px] uppercase tracking-wide">
                      <ShieldCheck size={14} />
                      Official Resolution from ZEB-ALPHA Super Admin
                    </div>
                    <p className="text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap font-medium">
                      {t.response}
                    </p>
                    {t.updated_at && (
                      <p className="text-[9px] text-slate-400 text-right">
                        Updated {new Date(t.updated_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400 italic flex items-center gap-1 pt-1">
                    <Clock size={11} />
                    Awaiting Super Admin review and resolution...
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ticket Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4 text-slate-900 dark:text-slate-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Raise Support Ticket</h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Directly contact the marketplace resolution desk</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Inquiry regarding order dispatch pickup delay"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="Order Dispatch">Order Dispatch</option>
                    <option value="Payouts & Billing">Payouts & Billing</option>
                    <option value="Product Catalog">Product Catalog & Approvals</option>
                    <option value="Technical Issue">Technical Issue</option>
                    <option value="Account Settings">Account & GST/FSSAI</option>
                    <option value="General Inquiry">General Inquiry</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent (Action Required)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Detailed Description *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Please describe your query or issue in detail, including relevant Order IDs, SKU names, or screenshot details..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send size={13} />
                      <span>Submit Ticket</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
