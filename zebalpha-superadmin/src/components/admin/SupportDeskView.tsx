"use client";

import { useEffect, useState } from "react";
import { 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  Filter, 
  Send, 
  RefreshCw, 
  Search, 
  AlertCircle, 
  ShieldCheck, 
  User, 
  Store, 
  Mail, 
  Phone, 
  Tag, 
  AlertTriangle,
  Trash2,
  ExternalLink
} from "lucide-react";

interface TicketSeller {
  id: string;
  seller_code: string;
  business_name: string;
  owner_name: string;
  email: string;
  phone: string;
  city?: string;
  state?: string;
}

interface Ticket {
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
  seller?: TicketSeller;
}

interface SupportStats {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
  urgent: number;
}

export default function SupportDeskView() {
  const [activeStream, setActiveStream] = useState<"seller" | "customer">("seller");
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<SupportStats>({
    total: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
    closed: 0,
    urgent: 0,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Local draft replies keyed by ticket ID
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  };

  const fetchTickets = async (showLoadingState = true) => {
    if (showLoadingState) setLoading(true);
    try {
      const res = await fetch("/api/admin/support", { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        setTickets(json.tickets || []);
        if (json.stats) setStats(json.stats);

        // Pre-populate draft replies with existing response if any
        const initialReplies: Record<string, string> = {};
        (json.tickets || []).forEach((t: Ticket) => {
          if (t.response) initialReplies[t.id] = t.response;
        });
        setReplies(initialReplies);
      } else {
        showToast(json.message || "Failed to load support tickets", "error");
      }
    } catch (e: any) {
      console.error("Failed to fetch tickets:", e);
      showToast("Network error loading tickets.", "error");
    } finally {
      if (showLoadingState) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleUpdateTicket = async (ticketId: string, status?: string, responseText?: string) => {
    setUpdatingId(ticketId);
    try {
      const payload: Record<string, any> = { ticketId };
      if (status !== undefined) payload.status = status;
      if (responseText !== undefined) payload.response = responseText;

      const res = await fetch("/api/admin/support", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        showToast("Ticket updated and response saved.", "success");
        // Update local state smoothly
        setTickets((curr) =>
          curr.map((t) => (t.id === ticketId ? { ...t, ...json.ticket } : t))
        );
        // Refresh full stats in background
        fetchTickets(false);
      } else {
        showToast(json.message || "Failed to update ticket", "error");
      }
    } catch (e: any) {
      console.error("Ticket update error:", e);
      showToast("Network error saving response", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm("Are you sure you want to permanently delete this support ticket?")) return;

    try {
      const res = await fetch(`/api/admin/support?id=${ticketId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        showToast("Ticket deleted successfully.", "success");
        setTickets((curr) => curr.filter((t) => t.id !== ticketId));
        fetchTickets(false);
      } else {
        showToast(json.message || "Failed to delete ticket", "error");
      }
    } catch (e) {
      showToast("Error deleting ticket.", "error");
    }
  };

  const filteredTickets = tickets.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      t.subject?.toLowerCase().includes(q) ||
      t.description?.toLowerCase().includes(q) ||
      t.id?.toLowerCase().includes(q) ||
      t.seller?.business_name?.toLowerCase().includes(q) ||
      t.seller?.owner_name?.toLowerCase().includes(q) ||
      t.seller?.email?.toLowerCase().includes(q) ||
      t.seller?.seller_code?.toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === "all" ||
      t.status?.toLowerCase() === statusFilter.toLowerCase();

    const matchesPriority =
      priorityFilter === "all" ||
      t.priority?.toLowerCase() === priorityFilter.toLowerCase();

    const matchesCategory =
      categoryFilter === "all" ||
      t.category?.toLowerCase() === categoryFilter.toLowerCase();

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
  });

  const getPriorityBadge = (p: string) => {
    const val = (p || "medium").toLowerCase();
    switch (val) {
      case "urgent":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide uppercase bg-rose-500/20 text-rose-400 border border-rose-500/30">🚨 Urgent</span>;
      case "high":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">⚠️ High</span>;
      case "low":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide uppercase bg-zinc-800 text-zinc-400 border border-zinc-700">Low</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wide uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">Medium</span>;
    }
  };

  const getStatusBadge = (s: string) => {
    const val = (s || "open").toLowerCase();
    switch (val) {
      case "resolved":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">✓ Resolved</span>;
      case "in_progress":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-blue-500/20 text-blue-400 border border-blue-500/40"><Clock size={11} /> In Progress</span>;
      case "closed":
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-zinc-800 text-zinc-400 border border-zinc-700">Closed</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse">● Open</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-center gap-3 p-4 rounded-2xl border text-xs font-bold shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-4 ${
            notification.type === "success"
              ? "bg-emerald-950/90 text-emerald-200 border-emerald-600/40"
              : "bg-rose-950/90 text-rose-200 border-rose-600/40"
          }`}
        >
          {notification.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Header & Stream Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Help Center</span>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <MessageSquare className="text-white" size={24} />
            Support Desk & Ticket Resolution
          </h1>
          <p className="text-xs font-bold text-zinc-400 mt-0.5">
            Resolve incoming support inquiries from merchants, answer questions, and publish official resolutions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchTickets()}
            title="Refresh tickets from database"
            className="flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 p-1.5 rounded-2xl self-start">
            <button
              onClick={() => setActiveStream("seller")}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                activeStream === "seller" ? "bg-white text-black shadow-xl font-extrabold" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Store size={14} />
              Seller Tickets
              {stats.open > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] font-black bg-rose-600 text-white">
                  {stats.open}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveStream("customer")}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                activeStream === "customer" ? "bg-white text-black shadow-xl font-extrabold" : "text-zinc-400 hover:text-white"
              }`}
            >
              <User size={14} />
              Customer Helpdesk
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      {activeStream === "seller" && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
          <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Total Tickets</span>
            <p className="text-2xl font-black text-white">{stats.total}</p>
          </div>
          <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">Open Tickets</span>
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
            </div>
            <p className="text-2xl font-black text-amber-400">{stats.open}</p>
          </div>
          <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">In Progress</span>
            <p className="text-2xl font-black text-blue-400">{stats.in_progress}</p>
          </div>
          <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl space-y-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Resolved</span>
            <p className="text-2xl font-black text-emerald-400">{stats.resolved}</p>
          </div>
          <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl space-y-1 col-span-2 md:col-span-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">Urgent Priority</span>
            <p className="text-2xl font-black text-rose-400">{stats.urgent}</p>
          </div>
        </div>
      )}

      {/* Customer Stream Tab Info */}
      {activeStream === "customer" && (
        <div className="rounded-3xl bg-zinc-950 border border-zinc-800 p-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-white">
              <Mail size={24} />
            </div>
            <div className="space-y-1 flex-1">
              <h2 className="text-base font-black text-white">Customer Support & Inquiries Hub</h2>
              <p className="text-xs text-zinc-400 font-medium">
                Customer support inquiries from the storefront are received at <strong className="text-white">support@zebalpha.shop</strong> and through the AI Assistant.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-black text-white">
                <Mail size={15} className="text-emerald-400" /> Support Email
              </div>
              <p className="text-xs font-mono text-zinc-300">support@zebalpha.shop</p>
              <p className="text-[11px] text-zinc-500">Inquiries route to administrative inbox with direct customer reply capability.</p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-black text-white">
                <Clock size={15} className="text-blue-400" /> Operational Hours
              </div>
              <p className="text-xs font-semibold text-zinc-300">Mon – Sun: 9:00 AM – 11:00 PM</p>
              <p className="text-[11px] text-zinc-500">Standard response turnaround time is under 4 business hours.</p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-black text-white">
                <ShieldCheck size={15} className="text-purple-400" /> Order Escalations
              </div>
              <p className="text-xs font-semibold text-zinc-300">Returns & Claims Tab</p>
              <p className="text-[11px] text-zinc-500">Customer return disputes and courier discrepancies are handled in the Returns view.</p>
            </div>
          </div>
        </div>
      )}

      {/* Seller Stream Tab */}
      {activeStream === "seller" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-zinc-950 border border-zinc-800 p-3 rounded-2xl">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={15} />
              <input
                type="text"
                placeholder="Search by ticket ID, subject, store name, or merchant email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-white transition-colors"
              />
            </div>

            {/* Dropdown Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-white cursor-pointer"
              >
                <option value="all">All Statuses ({tickets.length})</option>
                <option value="open">Open ({stats.open})</option>
                <option value="in_progress">In Progress ({stats.in_progress})</option>
                <option value="resolved">Resolved ({stats.resolved})</option>
                <option value="closed">Closed ({stats.closed})</option>
              </select>

              {/* Priority Filter */}
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-white cursor-pointer"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-white cursor-pointer"
              >
                <option value="all">All Categories</option>
                <option value="Order Dispatch">Order Dispatch</option>
                <option value="Payouts & Billing">Payouts & Billing</option>
                <option value="Product Catalog">Product Catalog</option>
                <option value="Technical Issue">Technical Issue</option>
                <option value="General Inquiry">General Inquiry</option>
              </select>
            </div>
          </div>

          {/* Tickets List */}
          <div className="space-y-4">
            {loading ? (
              <div className="p-16 text-center rounded-3xl bg-zinc-950 border border-zinc-800">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent mb-3"></div>
                <p className="text-xs font-bold text-zinc-400">Loading merchant support tickets...</p>
              </div>
            ) : filteredTickets.length === 0 ? (
              <div className="p-16 text-center rounded-3xl bg-zinc-950 border border-zinc-800 space-y-2">
                <MessageSquare className="mx-auto h-12 w-12 text-zinc-700" />
                <h3 className="text-base font-black text-white">No Tickets Found</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto font-medium">
                  {tickets.length === 0
                    ? "No seller support tickets have been created yet. When sellers raise inquiries from their dashboard, they will appear here in real-time."
                    : "No tickets match your active filter criteria. Try clearing search filters."}
                </p>
              </div>
            ) : (
              filteredTickets.map((t) => {
                const draftReply = replies[t.id] ?? (t.response || "");
                const isUpdating = updatingId === t.id;

                return (
                  <div
                    key={t.id}
                    className="rounded-3xl bg-zinc-950 border border-zinc-800 p-6 space-y-5 hover:border-zinc-700 transition-all shadow-xl"
                  >
                    {/* Top Row: ID, Subject, Category, Priority, Status, Date */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="font-mono text-[10px] font-black uppercase text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md">
                            #{t.id.slice(0, 8)}
                          </span>
                          <span className="font-black text-white text-base">{t.subject}</span>
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-zinc-900 text-zinc-300 border border-zinc-800">
                            {t.category}
                          </span>
                          {getPriorityBadge(t.priority)}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {getStatusBadge(t.status)}
                        <span className="text-xs text-zinc-400 font-mono">
                          {new Date(t.created_at).toLocaleString([], {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <button
                          onClick={() => handleDeleteTicket(t.id)}
                          title="Delete ticket"
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Merchant Profile Banner */}
                    <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
                      <div className="flex items-center gap-2 text-white font-bold">
                        <Store size={14} className="text-emerald-400" />
                        <span>{t.seller?.business_name || "Merchant Store"}</span>
                        {t.seller?.seller_code && (
                          <span className="text-[10px] font-mono text-zinc-400">({t.seller.seller_code})</span>
                        )}
                      </div>

                      {t.seller?.owner_name && (
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <User size={13} />
                          <span>{t.seller.owner_name}</span>
                        </div>
                      )}

                      {t.seller?.email && t.seller.email !== "N/A" && (
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <Mail size={13} />
                          <a href={`mailto:${t.seller.email}`} className="hover:text-white underline">
                            {t.seller.email}
                          </a>
                        </div>
                      )}

                      {t.seller?.phone && t.seller.phone !== "N/A" && (
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <Phone size={13} />
                          <a href={`tel:${t.seller.phone}`} className="hover:text-white font-mono">
                            {t.seller.phone}
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Ticket Description */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Merchant Query:</span>
                      <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap font-medium">
                        {t.description}
                      </div>
                    </div>

                    {/* Admin Response Box */}
                    <div className="space-y-2 pt-2 border-t border-zinc-800">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                          <ShieldCheck size={14} /> Official Administrator Resolution
                        </span>
                        {t.response && (
                          <span className="text-[10px] text-zinc-500 font-mono">
                            Resolved/Replied {t.updated_at ? new Date(t.updated_at).toLocaleDateString() : ""}
                          </span>
                        )}
                      </div>

                      <textarea
                        rows={3}
                        placeholder="Write official resolution or response to merchant. This will be visible on their seller dashboard immediately..."
                        value={draftReply}
                        onChange={(e) =>
                          setReplies((curr) => ({ ...curr, [t.id]: e.target.value }))
                        }
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-3.5 text-xs text-white placeholder-zinc-500 outline-none focus:border-emerald-500 transition-colors leading-relaxed font-medium"
                      />

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase text-zinc-400">Set Status:</span>
                          <select
                            value={t.status?.toLowerCase()}
                            onChange={(e) => handleUpdateTicket(t.id, e.target.value, draftReply)}
                            disabled={isUpdating}
                            className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-1.5 text-xs font-bold text-white outline-none focus:border-white cursor-pointer disabled:opacity-50"
                          >
                            <option value="open">OPEN</option>
                            <option value="in_progress">IN PROGRESS</option>
                            <option value="resolved">RESOLVED</option>
                            <option value="closed">CLOSED</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          {t.status?.toLowerCase() !== "resolved" && (
                            <button
                              onClick={() => handleUpdateTicket(t.id, "resolved", draftReply)}
                              disabled={isUpdating}
                              className="px-3 py-1.5 text-xs font-bold rounded-xl bg-zinc-900 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                            >
                              <CheckCircle2 size={13} />
                              Mark as Resolved
                            </button>
                          )}

                          <button
                            onClick={() => handleUpdateTicket(t.id, t.status?.toLowerCase(), draftReply)}
                            disabled={isUpdating}
                            className="px-4 py-1.5 text-xs font-bold rounded-xl bg-white text-black hover:bg-zinc-200 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 font-extrabold shadow-lg"
                          >
                            {isUpdating ? (
                              <>
                                <RefreshCw size={13} className="animate-spin" />
                                <span>Saving...</span>
                              </>
                            ) : (
                              <>
                                <Send size={13} />
                                <span>Send Resolution</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
