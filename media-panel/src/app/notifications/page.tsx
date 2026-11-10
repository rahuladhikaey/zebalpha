"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { checkMediaAccess, MediaAuthSession } from "@/lib/authGuard";
import { supabase } from "@/lib/supabaseClient";
import { Bell, Plus, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NotificationsPage() {
  const router = useRouter();
  const [session, setSession] = useState<MediaAuthSession | null>(null);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetAudience, setTargetAudience] = useState("customers");
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const auth = await checkMediaAccess();
      if (!auth.authorized) {
        router.push(auth.userId ? "/unauthorized" : "/login");
        return;
      }
      setSession(auth);

      const { data } = await supabase
        .from("notification_campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) setCampaigns(data);
    }
    init();
  }, [router]);

  const handleQueueBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.userId) return;
    setFormError(null);
    setSubmitting(true);

    try {
      const { data, error } = await supabase.from("notification_campaigns").insert({
        title: title.trim(),
        message: message.trim(),
        target_audience: targetAudience,
        status: "queued",
        created_by: session.userId,
      }).select().single();

      if (!error && data) {
        setCampaigns([data, ...campaigns]);
        setTitle("");
        setMessage("");
        setShowModal(false);
      } else if (error) {
        setFormError(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 pl-64">
      <Sidebar userRole={session?.role} userEmail={session?.email} />
      <Header title="Audience Notification Broadcasts" description="Create and queue push notification campaigns powered by central backend worker" />

      <main className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">Broadcast Campaigns</h2>
            <p className="text-xs text-zinc-400">Decoupled from Super Admin: dispatches through central push queue</p>
          </div>
          <button
            onClick={() => {
              setFormError(null);
              setShowModal(true);
            }}
            className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-brand-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>New Notification Broadcast</span>
          </button>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-dark-900 border border-dark-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
              <h3 className="text-sm font-bold text-white mb-4">Queue Broadcast Campaign</h3>
              {formError && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              <form onSubmit={handleQueueBroadcast} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Notification Title</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Flash Drop: 40% Off Handcrafted Styles"
                    className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Message Body</label>
                  <textarea
                    required
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Short engaging broadcast copy..."
                    className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Target Segment</label>
                  <select
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="customers">Customers (Storefront App & Web)</option>
                    <option value="sellers">Verified Sellers Only</option>
                    <option value="all">Entire Ecosystem (All Registered Users)</option>
                  </select>
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-3.5 py-2 rounded-lg bg-dark-800 text-zinc-300 hover:text-white text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold disabled:opacity-50"
                  >
                    {submitting ? "Queueing..." : "Queue Broadcast"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden shadow-xl">
          {campaigns.length === 0 ? (
            <div className="p-12 text-center text-zinc-400 text-xs">
              No broadcast campaigns queued yet.
            </div>
          ) : (
            <div className="divide-y divide-dark-800">
              {campaigns.map((camp) => (
                <div key={camp.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white">{camp.title}</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono bg-brand-500/10 text-brand-400 border border-brand-500/20">
                        {camp.status}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">{camp.message}</p>
                  </div>
                  <div className="text-right text-[11px] text-zinc-500">
                    <div>Target: <span className="text-zinc-300 uppercase">{camp.target_audience}</span></div>
                    <div>Delivered: {camp.total_delivered}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

