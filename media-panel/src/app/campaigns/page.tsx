"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { checkMediaAccess, MediaAuthSession } from "@/lib/authGuard";
import { supabase } from "@/lib/supabaseClient";
import { Megaphone, Plus, Search, Filter } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CampaignsPage() {
  const router = useRouter();
  const [session, setSession] = useState<MediaAuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [objective, setObjective] = useState("");
  const [budget, setBudget] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    async function init() {
      const auth = await checkMediaAccess();
      if (!auth.authorized) {
        router.push(auth.userId ? "/unauthorized" : "/login");
        return;
      }
      setSession(auth);

      const { data } = await supabase
        .from("media_campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) setCampaigns(data);
      setLoading(false);
    }
    init();
  }, [router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.userId) return;
    setSubmitting(true);

    try {
      const { data, error } = await supabase.from("media_campaigns").insert({
        name: name.trim(),
        objective: objective.trim(),
        budget: parseFloat(budget) || 0,
        status: "draft",
        created_by: session.userId,
      }).select().single();

      if (!error && data) {
        setCampaigns([data, ...campaigns]);
        setName("");
        setObjective("");
        setBudget("");
        setShowModal(false);
      } else if (error) {
        alert(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 pl-64">
      <Sidebar userRole={session?.role} userEmail={session?.email} />
      <Header title="Brand & Media Campaigns" description="Plan, approve, and track multi-channel marketing campaigns" />

      <main className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">All Campaigns</h2>
            <p className="text-xs text-zinc-400">Total {campaigns.length} campaigns listed</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-brand-600/20"
          >
            <Plus className="w-4 h-4" />
            <span>New Campaign</span>
          </button>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-dark-900 border border-dark-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
              <h3 className="text-sm font-bold text-white mb-4">Launch New Brand Campaign</h3>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Campaign Title</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Winter Drop 2026 Lookbook"
                    className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Objective</label>
                  <input
                    type="text"
                    required
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    placeholder="e.g. Drive 10,000 app installs & brand awareness"
                    className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Budget Allocation (INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder="50000"
                    className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500"
                  />
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
                    {submitting ? "Creating..." : "Save Campaign"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Campaign List */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden shadow-xl">
          {campaigns.length === 0 ? (
            <div className="p-12 text-center text-zinc-400 text-xs">
              No marketing campaigns active. Click "New Campaign" to create one.
            </div>
          ) : (
            <div className="divide-y divide-dark-800">
              {campaigns.map((camp) => (
                <div key={camp.id} className="p-5 flex items-center justify-between hover:bg-dark-850/40 transition-colors">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h4 className="text-xs font-bold text-white">{camp.name}</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-brand-500/10 text-brand-400 border border-brand-500/20">
                        {camp.status}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 mt-1">{camp.objective}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-white">₹{Number(camp.budget).toLocaleString("en-IN")}</div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">Budget</div>
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

