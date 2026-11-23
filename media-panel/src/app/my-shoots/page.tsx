"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { checkMediaAccess, getCachedMediaSession, MediaAuthSession } from "@/lib/authGuard";
import { supabase } from "@/lib/supabaseClient";
import {
  Film,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Video,
  X,
} from "lucide-react";

interface AssignedShootRow {
  id: string;
  product_id: string;
  product_name: string;
  product_image?: string | null;
  product_price?: number;
  campaign_source: "seller" | "zebalpha_own_brand";
  plan_type: "without_product_1pct" | "with_product_150";
  workflow_status: string;
  status: string;
  shoot_deadline?: string | null;
  shoot_brief?: string | null;
  submitted_video_url?: string | null;
  submitted_notes?: string | null;
  revision_feedback?: string | null;
  expires_at?: string | null;
  total_clicks: number;
  total_orders: number;
  delivered_orders: number;
}

interface MyLinkRow {
  id: string;
  enrollment_id?: string | null;
  ref_code: string;
  video_url?: string | null;
  status: string;
  clicks: number;
  orders: number;
}

export default function MyShootsPage() {
  const router = useRouter();
  const [session, setSession] = useState<MediaAuthSession | null>(() => getCachedMediaSession());
  const [loading, setLoading] = useState(true);
  const [shoots, setShoots] = useState<AssignedShootRow[]>([]);
  const [links, setLinks] = useState<MyLinkRow[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Submit Reel Modal
  const [submitTarget, setSubmitTarget] = useState<AssignedShootRow | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const notify = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4500);
  };

  const loadShoots = useCallback(async (uid: string) => {
    setLoading(true);
    try {
      const [shootRes, linkRes] = await Promise.all([
        supabase
          .from("seller_influencer_enrollments")
          .select(
            "id, product_id, product_name, product_image, product_price, campaign_source, plan_type, workflow_status, status, shoot_deadline, shoot_brief, submitted_video_url, submitted_notes, revision_feedback, expires_at, total_clicks, total_orders, delivered_orders"
          )
          .eq("assigned_creator_id", uid)
          .order("updated_at", { ascending: false }),
        supabase
          .from("influencer_creator_links")
          .select("id, enrollment_id, ref_code, video_url, status, clicks, orders")
          .eq("assigned_creator_id", uid),
      ]);

      if (!shootRes.error && Array.isArray(shootRes.data)) {
        setShoots(shootRes.data as AssignedShootRow[]);
      }
      if (!linkRes.error && Array.isArray(linkRes.data)) {
        setLinks(linkRes.data as MyLinkRow[]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      const auth = await checkMediaAccess();
      if (!auth.authorized || !auth.userId) {
        router.push(!auth.userId ? "/login" : "/unauthorized");
        return;
      }
      setSession(auth);
      await loadShoots(auth.userId);
    }
    init();
  }, [router, loadShoots]);

  const linkMap = useMemo(() => {
    const map = new Map<string, MyLinkRow>();
    links.forEach((l) => {
      if (l.enrollment_id) map.set(l.enrollment_id, l);
    });
    return map;
  }, [links]);

  const stats = useMemo(() => {
    const activeAssigned = shoots.filter((s) =>
      ["assigned", "in_production", "revision_needed"].includes(s.workflow_status)
    ).length;
    const inReview = shoots.filter((s) => s.workflow_status === "submitted_for_review").length;
    const liveReels = shoots.filter((s) => s.status === "active").length;
    const clicks = shoots.reduce((sum, s) => sum + Number(s.total_clicks || 0), 0);
    const orders = shoots.reduce((sum, s) => sum + Number(s.total_orders || 0), 0);
    return { activeAssigned, inReview, liveReels, clicks, orders };
  }, [shoots]);

  const handleSubmitReel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitTarget || !session?.userId) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("media_creator_submit_reel", {
        p_enrollment_id: submitTarget.id,
        p_video_url: videoUrl.trim(),
        p_notes: notes.trim() || null,
      });
      if (error) throw error;
      notify("Reel submitted to Media Leader for final review & 7-day link activation!");
      setSubmitTarget(null);
      setVideoUrl("");
      setNotes("");
      await loadShoots(session.userId);
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Failed to submit reel", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = (refCode: string) => {
    navigator.clipboard?.writeText(`https://zebalpha.shop/go/${encodeURIComponent(refCode)}`);
    setCopiedCode(refCode);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="min-h-screen bg-dark-950 pl-64">
      <Sidebar userRole={session?.role} userEmail={session?.email} />
      <Header
        title="My Assigned Shoots & Reels"
        description="Your private Alpha Media Creator workspace — upload reels for Media Leader review and track your impact"
      />

      <main className="p-8 space-y-6">
        {toast && (
          <div
            className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border px-4 py-3 text-xs font-semibold shadow-2xl ${
              toast.type === "error"
                ? "bg-red-950 border-red-500/40 text-red-200"
                : "bg-emerald-950 border-emerald-500/40 text-emerald-200"
            }`}
          >
            {toast.type === "error" ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{toast.text}</span>
          </div>
        )}

        {/* Creator Personal Scorecard */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          {[
            { label: "Active Tasks", value: stats.activeAssigned },
            { label: "Awaiting Leader", value: stats.inReview },
            { label: "Live Reels", value: stats.liveReels },
            { label: "My Reel Clicks", value: stats.clicks },
            { label: "Orders Driven", value: stats.orders },
          ].map((k) => (
            <div key={k.label} className="p-4 rounded-xl bg-dark-900 border border-dark-800">
              <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">{k.label}</p>
              <p className="text-2xl font-bold text-white mt-1">{k.value}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Film className="w-4 h-4 text-brand-400" />
            Assigned Campaigns ({shoots.length})
          </h2>
          {session?.userId && (
            <button
              type="button"
              onClick={() => loadShoots(session.userId!)}
              className="px-3.5 py-2 rounded-lg bg-dark-900 border border-dark-800 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-zinc-400">Loading your assigned shoots...</div>
        ) : shoots.length === 0 ? (
          <div className="rounded-2xl bg-dark-900 border border-dark-800 p-12 text-center">
            <div className="w-11 h-11 rounded-xl bg-dark-800 text-zinc-400 mx-auto flex items-center justify-center mb-3">
              <Video className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-white">No shoots assigned to you yet</p>
            <p className="text-xs text-zinc-400 mt-1">
              When the Media Leader assigns a Seller or ZebAlpha Own-Brand campaign to you, it will appear here with the product brief &amp; deadline.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {shoots.map((s) => {
              const lnk = linkMap.get(s.id);
              const canSubmit = ["assigned", "in_production", "revision_needed"].includes(s.workflow_status);
              return (
                <div
                  key={s.id}
                  className="rounded-2xl bg-dark-900 border border-dark-800 p-5 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start gap-3.5">
                      <div className="w-16 h-16 rounded-xl bg-dark-800 border border-dark-700 overflow-hidden shrink-0">
                        {s.product_image ? (
                          <img src={s.product_image} alt={s.product_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-500">
                            <Film className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-brand-500/15 text-brand-400 border border-brand-500/30">
                            {s.campaign_source === "zebalpha_own_brand" ? "ZebAlpha Brand" : "Seller Shoot"}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-dark-800 text-zinc-200 border border-dark-700">
                            {s.plan_type === "with_product_150" ? "Physical Studio Shoot" : "Catalog Edit Reel"}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white line-clamp-1">{s.product_name}</h3>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Status: <strong className="text-amber-300 uppercase">{s.workflow_status.replace(/_/g, " ")}</strong>
                          {s.shoot_deadline && (
                            <span className="ml-2 inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Due {new Date(s.shoot_deadline).toLocaleDateString("en-IN")}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {s.shoot_brief && (
                      <div className="p-3 rounded-xl bg-dark-950 border border-dark-800 text-xs text-zinc-300">
                        <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-1">
                          Media Leader Brief
                        </span>
                        {s.shoot_brief}
                      </div>
                    )}

                    {s.revision_feedback && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
                        <span className="text-[10px] uppercase font-bold text-amber-400 block mb-0.5">
                          Revision Requested by Leader
                        </span>
                        {s.revision_feedback}
                      </div>
                    )}

                    {lnk && (
                      <div className="p-3 rounded-xl bg-dark-950 border border-dark-800 flex items-center justify-between text-xs">
                        <div>
                          <p className="font-mono text-brand-400 text-[11px]">zebalpha.shop/go/{lnk.ref_code}</p>
                          <p className="text-[10px] text-zinc-400">
                            {s.total_clicks} clicks • {s.total_orders} orders • Link {lnk.status}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyLink(lnk.ref_code)}
                          className="px-2.5 py-1.5 rounded-lg bg-dark-800 text-zinc-200 hover:text-white text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          {copiedCode === lnk.ref_code ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copy
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-dark-800">
                    {s.submitted_video_url ? (
                      <a
                        href={s.submitted_video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-400 hover:underline inline-flex items-center gap-1 font-medium"
                      >
                        View Submitted Reel <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-[11px] text-zinc-500">No reel uploaded yet</span>
                    )}

                    {canSubmit && (
                      <button
                        type="button"
                        onClick={() => {
                          setSubmitTarget(s);
                          setVideoUrl(s.submitted_video_url || "");
                          setNotes(s.submitted_notes || "");
                        }}
                        className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{s.workflow_status === "revision_needed" ? "Re-Submit Reel" : "Submit Reel"}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* SUBMIT REEL MODAL */}
        {submitTarget && (
          <div
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSubmitTarget(null)}
          >
            <form
              onSubmit={handleSubmitReel}
              className="w-full max-w-md rounded-2xl bg-dark-900 border border-dark-800 p-6 space-y-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Submit Reel for Leader Review</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">{submitTarget.product_name}</p>
                </div>
                <button type="button" onClick={() => setSubmitTarget(null)} className="text-zinc-400 hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Video / Reel URL (Drive / Cloudinary / Instagram / YouTube) *
                </label>
                <input
                  type="url"
                  required
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Creator Notes (Optional)</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Shot in natural daylight, 18s vertical 9:16 edit ready to post..."
                  className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSubmitTarget(null)}
                  className="px-4 py-2 rounded-lg bg-dark-800 text-zinc-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Submitting..." : "Submit to Media Leader"}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
