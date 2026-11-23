"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { checkMediaAccess, getCachedMediaSession, MediaAuthSession } from "@/lib/authGuard";
import { supabase } from "@/lib/supabaseClient";
import {
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  ShieldCheck,
  UserX,
  UserCheck,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";

interface CreatorProfileRow {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  city?: string | null;
  instagram_handle?: string | null;
  youtube_handle?: string | null;
  followers_count: number;
  niche?: string | null;
  sample_reel_url?: string | null;
  role_type: "MEDIA_LEADER" | "MEDIA_CREATOR" | "INFLUENCER";
  onboarding_source: "admin_invite" | "self_apply";
  approval_status: "pending" | "approved" | "rejected" | "suspended";
  is_active: boolean;
  created_at: string;
}

interface LinkMetricRow {
  assigned_creator_id?: string | null;
  clicks: number;
  orders: number;
  delivered_orders: number;
  gmv: number;
  video_url?: string | null;
}

export default function MediaTeamPage() {
  const router = useRouter();
  const [session, setSession] = useState<MediaAuthSession | null>(() => getCachedMediaSession());
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<"pending" | "active">("pending");
  const [profiles, setProfiles] = useState<CreatorProfileRow[]>([]);
  const [linkMetrics, setLinkMetrics] = useState<LinkMetricRow[]>([]);
  const [roleChoice, setRoleChoice] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedApplyLink, setCopiedApplyLink] = useState(false);

  const notify = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4500);
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [profRes, linkRes] = await Promise.all([
        supabase
          .from("media_creator_profiles")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("influencer_creator_links")
          .select("assigned_creator_id, clicks, orders, delivered_orders, gmv, video_url"),
      ]);

      if (!profRes.error && Array.isArray(profRes.data)) {
        const list = profRes.data as CreatorProfileRow[];
        setProfiles(list);
        if (list.filter((p) => p.approval_status === "pending").length === 0) {
          setTab("active");
        }
      }
      if (!linkRes.error && Array.isArray(linkRes.data)) {
        setLinkMetrics(linkRes.data as LinkMetricRow[]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      const auth = await checkMediaAccess();
      if (!auth.authorized) {
        router.push(!auth.userId ? "/login" : "/unauthorized");
        return;
      }
      if (!auth.isLeader) {
        router.replace("/my-shoots");
        return;
      }
      setSession(auth);
      await loadData();
    }
    init();
  }, [router, loadData]);

  const metricsByCreator = useMemo(() => {
    const map = new Map<
      string,
      { reels: number; clicks: number; orders: number; delivered: number; gmv: number }
    >();
    linkMetrics.forEach((l) => {
      if (!l.assigned_creator_id) return;
      const cur = map.get(l.assigned_creator_id) || {
        reels: 0,
        clicks: 0,
        orders: 0,
        delivered: 0,
        gmv: 0,
      };
      cur.reels += l.video_url ? 1 : 0;
      cur.clicks += Number(l.clicks || 0);
      cur.orders += Number(l.orders || 0);
      cur.delivered += Number(l.delivered_orders || 0);
      cur.gmv += Number(l.gmv || 0);
      map.set(l.assigned_creator_id, cur);
    });
    return map;
  }, [linkMetrics]);

  const pendingProfiles = useMemo(
    () => profiles.filter((p) => p.approval_status === "pending"),
    [profiles]
  );
  const teamProfiles = useMemo(
    () => profiles.filter((p) => p.approval_status !== "pending"),
    [profiles]
  );

  const handleApprove = async (p: CreatorProfileRow) => {
    setBusyId(p.id);
    try {
      const role = roleChoice[p.id] || "INFLUENCER";
      const { error } = await supabase.rpc("media_approve_creator_application", {
        p_profile_id: p.id,
        p_role: role,
      });
      if (error) throw error;
      notify(`${p.full_name} approved as ${role}! They can now log into My Shoots.`);
      await loadData();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Approval failed", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (p: CreatorProfileRow) => {
    const reason = window.prompt("Rejection note (optional):", "Portfolio does not match current campaign requirements");
    if (reason === null) return;
    setBusyId(p.id);
    try {
      const { error } = await supabase.rpc("media_reject_creator_application", {
        p_profile_id: p.id,
        p_reason: reason,
      });
      if (error) throw error;
      notify(`Application for ${p.full_name} marked rejected.`);
      await loadData();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Reject failed", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleAccess = async (p: CreatorProfileRow) => {
    setBusyId(p.id);
    try {
      const nextActive = !p.is_active;
      const { error } = await supabase.rpc("media_toggle_creator_access", {
        p_profile_id: p.id,
        p_active: nextActive,
      });
      if (error) throw error;
      notify(
        nextActive
          ? `${p.full_name}'s Media Panel access restored!`
          : `${p.full_name}'s login suspended (historical metrics preserved).`
      );
      await loadData();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Access toggle failed", "error");
    } finally {
      setBusyId(null);
    }
  };

  const copyApplyLink = () => {
    const url = `${window.location.origin}/apply`;
    navigator.clipboard?.writeText(url);
    setCopiedApplyLink(true);
    setTimeout(() => setCopiedApplyLink(false), 2000);
  };

  return (
    <div className="min-h-screen bg-dark-950 pl-64">
      <Sidebar userRole={session?.role} userEmail={session?.email} />
      <Header
        title="Alpha Media Team & Creator Approvals"
        description="Approve /apply creator applications, monitor performance per creator, and manage team access"
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

        {/* Shareable Creator Apply Banner */}
        <div className="p-5 rounded-2xl bg-dark-900 border border-dark-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Creator Onboarding Invite Link
            </p>
            <p className="text-xs text-zinc-400 mt-0.5">
              Share <code className="text-brand-400">/apply</code> with new creators — applications wait here until you approve them (or create direct accounts from SuperAdmin).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={copyApplyLink}
              className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              {copiedApplyLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedApplyLink ? "Apply Link Copied" : "Copy /apply Link"}</span>
            </button>
            <button
              type="button"
              onClick={loadData}
              className="px-3.5 py-2 rounded-lg bg-dark-800 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-dark-800 pb-3">
          <button
            type="button"
            onClick={() => setTab("pending")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
              tab === "pending" ? "bg-white text-black" : "bg-dark-900 text-zinc-400 border border-dark-800"
            }`}
          >
            Pending Approvals ({pendingProfiles.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("active")}
            className={`px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer ${
              tab === "active" ? "bg-white text-black" : "bg-dark-900 text-zinc-400 border border-dark-800"
            }`}
          >
            Team &amp; Performance ({teamProfiles.length})
          </button>
        </div>

        {loading ? (
          <div className="p-12 text-center text-xs text-zinc-400">Loading Alpha Media Team...</div>
        ) : tab === "pending" ? (
          pendingProfiles.length === 0 ? (
            <div className="rounded-2xl bg-dark-900 border border-dark-800 p-12 text-center text-xs text-zinc-400">
              No pending creator applications right now.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingProfiles.map((p) => (
                <div
                  key={p.id}
                  className="rounded-2xl bg-dark-900 border border-dark-800 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-bold text-white">{p.full_name}</h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        PENDING REVIEW
                      </span>
                      {p.niche && (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-dark-800 text-zinc-300">
                          {p.niche}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400">
                      {p.email} • {p.phone || "No phone"} • {p.city || "India"} •{" "}
                      <strong className="text-zinc-200">{Number(p.followers_count || 0).toLocaleString("en-IN")} followers</strong>
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-300">
                      {p.instagram_handle && <span>IG: {p.instagram_handle}</span>}
                      {p.youtube_handle && <span>YT: {p.youtube_handle}</span>}
                      {p.sample_reel_url && (
                        <a
                          href={p.sample_reel_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-brand-400 hover:underline inline-flex items-center gap-1 font-semibold"
                        >
                          Watch Sample Reel <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <select
                      value={roleChoice[p.id] || "INFLUENCER"}
                      onChange={(e) => setRoleChoice((prev) => ({ ...prev, [p.id]: e.target.value }))}
                      className="px-3 py-2 rounded-lg bg-dark-950 border border-dark-800 text-xs text-white"
                    >
                      <option value="INFLUENCER">Role: INFLUENCER</option>
                      <option value="MEDIA_CREATOR">Role: MEDIA_CREATOR (In-House)</option>
                      <option value="MEDIA_LEADER">Role: MEDIA_LEADER</option>
                    </select>
                    <button
                      type="button"
                      disabled={busyId === p.id}
                      onClick={() => handleApprove(p)}
                      className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      type="button"
                      disabled={busyId === p.id}
                      onClick={() => handleReject(p)}
                      className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-dark-950/60 text-[10px] uppercase tracking-wider text-zinc-400 border-b border-dark-800">
                  <tr>
                    <th className="py-3 px-4">Creator / Member</th>
                    <th className="py-3 px-4">Role &amp; Source</th>
                    <th className="py-3 px-4">Published Reels</th>
                    <th className="py-3 px-4">Clicks / Orders</th>
                    <th className="py-3 px-4">GMV Generated</th>
                    <th className="py-3 px-4 text-right">Access</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-800">
                  {teamProfiles.map((p) => {
                    const m = metricsByCreator.get(p.user_id) || {
                      reels: 0,
                      clicks: 0,
                      orders: 0,
                      delivered: 0,
                      gmv: 0,
                    };
                    return (
                      <tr key={p.id} className="hover:bg-dark-800/40">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-white">{p.full_name}</p>
                          <p className="text-[11px] text-zinc-400">
                            {p.instagram_handle || p.email} {p.city ? `• ${p.city}` : ""}
                          </p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-brand-500/15 text-brand-400 border border-brand-500/30">
                            {p.role_type}
                          </span>
                          <p className="text-[10px] text-zinc-500 mt-0.5">{p.onboarding_source}</p>
                        </td>
                        <td className="py-3.5 px-4 font-bold text-white">{m.reels}</td>
                        <td className="py-3.5 px-4">
                          {m.clicks} clicks • {m.delivered}/{m.orders} orders
                        </td>
                        <td className="py-3.5 px-4 font-mono text-emerald-400">
                          ₹{m.gmv.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            disabled={busyId === p.id}
                            onClick={() => handleToggleAccess(p)}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold cursor-pointer ${
                              p.is_active
                                ? "bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20"
                                : "bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25"
                            }`}
                          >
                            {p.is_active ? (
                              <>
                                <UserX className="w-3.5 h-3.5" /> Suspend
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3.5 h-3.5" /> Restore
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
