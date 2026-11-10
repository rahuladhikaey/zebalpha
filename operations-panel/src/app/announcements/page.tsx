"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { checkOperationsAccess, OperationsAuthSession } from "@/lib/authGuard";
import { supabase } from "@/lib/supabaseClient";
import { Radio, Plus, AlertCircle, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AnnouncementsPage() {
  const router = useRouter();
  const [session, setSession] = useState<OperationsAuthSession | null>(null);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [scope, setScope] = useState("company_wide");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      const auth = await checkOperationsAccess();
      if (!auth.authorized) {
        router.push(auth.userId ? "/unauthorized" : "/login");
        return;
      }
      setSession(auth);

      // Scoped visibility enforced by PostgreSQL RLS
      const { data } = await supabase
        .from("internal_announcements")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (data) setAnnouncements(data);
    }
    init();
  }, [router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.userId) return;
    setFormError(null);
    setSubmitting(true);

    try {
      const { data, error } = await supabase.from("internal_announcements").insert({
        title: title.trim(),
        content: content.trim(),
        target_scope: scope,
        priority: "normal",
        author_id: session.userId,
      }).select().single();

      if (!error && data) {
        setAnnouncements([data, ...announcements]);
        setTitle("");
        setContent("");
        setShowModal(false);
      } else if (error) {
        setFormError(error.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isManager = session?.role === "OWNER" || session?.role === "Operations Manager";

  return (
    <div className="min-h-screen bg-dark-950 pl-64">
      <Sidebar userRole={session?.role} userEmail={session?.email} />
      <Header title="Company Bulletins & Announcements" description="Departmental updates, standard operating procedures, and operational directives" />

      <main className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">Internal Announcements</h2>
            <p className="text-xs text-zinc-400">Scoped by department and management access</p>
          </div>
          {isManager && (
            <button
              onClick={() => {
                setFormError(null);
                setShowModal(true);
              }}
              className="px-4 py-2 rounded-lg bg-ops-600 hover:bg-ops-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-ops-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Publish Bulletin</span>
            </button>
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-dark-900 border border-dark-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
              <h3 className="text-sm font-bold text-white mb-4">Post Internal Announcement</h3>
              {formError && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Headline</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Courier Pickup Schedule Update - Diwali Peak"
                    className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-ops-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Target Scope</label>
                  <select
                    value={scope}
                    onChange={(e) => setScope(e.target.value)}
                    className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white focus:outline-none focus:border-ops-500"
                  >
                    <option value="company_wide">Company-Wide (All Employees)</option>
                    <option value="department">Assigned Department Only</option>
                    <option value="management_only">Management Only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Bulletin Content</label>
                  <textarea
                    required
                    rows={4}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Full announcement text..."
                    className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-ops-500"
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
                    className="px-4 py-2 rounded-lg bg-ops-600 hover:bg-ops-500 text-white text-xs font-semibold disabled:opacity-50"
                  >
                    {submitting ? "Publishing..." : "Publish"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {announcements.length === 0 ? (
            <div className="p-12 text-center bg-dark-900 border border-dark-800 rounded-xl text-zinc-500 text-xs">
              No active announcements for your department scope.
            </div>
          ) : (
            announcements.map((a) => (
              <div key={a.id} className="p-5 rounded-xl bg-dark-900 border border-dark-800">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] uppercase font-mono bg-ops-500/10 text-ops-400 border border-ops-500/20">
                      {a.target_scope}
                    </span>
                    <h3 className="text-xs font-bold text-white">{a.title}</h3>
                  </div>
                  <span className="text-[10px] text-zinc-500">
                    {new Date(a.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line">{a.content}</p>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

