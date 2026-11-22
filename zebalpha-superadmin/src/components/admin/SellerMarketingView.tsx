"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle2, XCircle, PhoneCall, ExternalLink, RefreshCw, Plus } from "lucide-react";

export default function SellerMarketingView() {
  const [loading, setLoading] = useState(true);
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [tab, setTab] = useState<"branding" | "influencer" | "callbacks">("branding");
  const [brandingCampaigns, setBrandingCampaigns] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [creatorLinks, setCreatorLinks] = useState<any[]>([]);
  const [callbacks, setCallbacks] = useState<any[]>([]);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  // Assign Creator Modal State
  const [assignTarget, setAssignTarget] = useState<any | null>(null);
  const [creatorName, setCreatorName] = useState("Alpha Media Team");
  const [creatorHandle, setCreatorHandle] = useState("@zebalpha_official");
  const [platform, setPlatform] = useState("instagram");
  const [videoUrl, setVideoUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/seller-marketing", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (json?.success) {
        setMigrationRequired(Boolean(json.migrationRequired));
        setBrandingCampaigns(json.brandingCampaigns || []);
        setEnrollments(json.influencerEnrollments || []);
        setCreatorLinks(json.creatorLinks || []);
        setCallbacks(json.callbacks || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const runAction = async (payload: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/seller-marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setStatusMsg(json.message || "Updated successfully");
        setTimeout(() => setStatusMsg(null), 4000);
        setAssignTarget(null);
        setVideoUrl("");
        await loadAll();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Seller Marketing &amp; App Branding Approvals
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Approve Seller App Branding spots for zebalpha.shop, attach Alpha Media / Creator reels &amp; manage seller callbacks.
          </p>
        </div>
        <button
          type="button"
          onClick={loadAll}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800 cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {statusMsg && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/50 px-4 py-3 text-xs font-bold text-emerald-300">
          {statusMsg}
        </div>
      )}

      {migrationRequired && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-950/40 px-4 py-3 text-xs font-bold text-amber-300">
          Run <code className="bg-black px-1.5 py-0.5 rounded">supabase/add_seller_marketing_and_branding_system.sql</code> in Supabase SQL Editor to initialize Seller Marketing tables.
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-3">
        {[
          { key: "branding" as const, label: `App Branding Campaigns (${brandingCampaigns.length})` },
          { key: "influencer" as const, label: `Influencer Opt-Ins (${enrollments.length})` },
          { key: "callbacks" as const, label: `Seller Callbacks (${callbacks.length})` },
        ].map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-xl px-4 py-2 text-xs font-black transition cursor-pointer ${
              tab === t.key
                ? "bg-white text-black"
                : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB 1: APP BRANDING APPROVALS */}
      {tab === "branding" && (
        <div className="space-y-3">
          {brandingCampaigns.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-10 text-center text-xs text-zinc-400">
              No seller App Branding campaigns submitted yet.
            </div>
          ) : (
            brandingCampaigns.map((c) => (
              <div
                key={c.id}
                className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-black text-white">{c.headline}</span>
                    <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-400">
                      {c.approval_status}
                    </span>
                    <span className="rounded-full bg-zinc-900 border border-zinc-700 px-2.5 py-0.5 text-[10px] font-bold text-zinc-300">
                      ₹{c.amount_inr} • {c.duration_days}d • {c.payment_status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Store: <strong className="text-zinc-200">{c.store_name}</strong> • Placement:{" "}
                    {c.placement_type} • Products: {c.product_ids?.length || 0} • Views: {c.impressions} • Clicks: {c.clicks}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {c.approval_status !== "live" && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        runAction({
                          action: "approve_branding",
                          campaignId: c.id,
                          durationDays: c.duration_days,
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-black text-black hover:bg-emerald-400 cursor-pointer"
                    >
                      <CheckCircle2 size={14} /> Approve &amp; Go Live
                    </button>
                  )}
                  {c.approval_status !== "rejected" && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        runAction({
                          action: "reject_branding",
                          campaignId: c.id,
                          reason: "Please update creative/catalog quality and resubmit.",
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl border border-rose-500/40 bg-rose-950/40 px-4 py-2 text-xs font-black text-rose-300 hover:bg-rose-900/50 cursor-pointer"
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: INFLUENCER ENROLLMENTS & CREATOR LINKS */}
      {tab === "influencer" && (
        <div className="space-y-4">
          {enrollments.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-10 text-center text-xs text-zinc-400">
              No seller catalogs opted into Influencer Marketing yet.
            </div>
          ) : (
            enrollments.map((enr) => {
              const relatedLinks = creatorLinks.filter((l) => l.product_id === enr.product_id);
              return (
                <div
                  key={enr.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-white">{enr.product_name}</p>
                      <p className="text-xs text-zinc-400">
                        Commission: <strong className="text-emerald-400">{enr.commission_rate}%</strong> •
                        Status: {enr.status} • Clicks: {enr.total_clicks} • Orders: {enr.total_orders}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAssignTarget(enr)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-3.5 py-2 text-xs font-black text-black hover:bg-amber-300 cursor-pointer"
                    >
                      <Plus size={14} /> Assign Creator Reel &amp; Ref Link
                    </button>
                  </div>

                  {relatedLinks.length > 0 && (
                    <div className="grid gap-2 sm:grid-cols-2 pt-2 border-t border-zinc-900">
                      {relatedLinks.map((lnk) => (
                        <div
                          key={lnk.id}
                          className="flex items-center justify-between rounded-xl bg-zinc-900 px-3.5 py-2 text-xs"
                        >
                          <div>
                            <p className="font-bold text-white">{lnk.creator_name}</p>
                            <p className="text-[11px] text-amber-400 font-mono">
                              ?ref={lnk.ref_code} • {lnk.clicks} clicks
                            </p>
                          </div>
                          {lnk.video_url && (
                            <a
                              href={lnk.video_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-emerald-400 hover:underline inline-flex items-center gap-1 font-bold"
                            >
                              Reel <ExternalLink size={12} />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* TAB 3: SELLER CALLBACKS */}
      {tab === "callbacks" && (
        <div className="space-y-3">
          {callbacks.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-10 text-center text-xs text-zinc-400">
              No pending seller marketing callbacks.
            </div>
          ) : (
            callbacks.map((cb) => (
              <div
                key={cb.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
              >
                <div>
                  <p className="text-sm font-black text-white flex items-center gap-2">
                    <PhoneCall size={14} className="text-emerald-400" />
                    {cb.seller_name || "Seller"} — {cb.phone}
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">{cb.notes}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-zinc-800 px-3 py-1 text-[10px] font-black uppercase text-amber-400">
                    {cb.status}
                  </span>
                  {cb.status !== "resolved" && (
                    <button
                      type="button"
                      onClick={() =>
                        runAction({
                          action: "update_callback",
                          callbackId: cb.id,
                          status: cb.status === "pending" ? "contacted" : "resolved",
                        })
                      }
                      className="rounded-xl bg-white px-3.5 py-2 text-xs font-black text-black hover:bg-zinc-200 cursor-pointer"
                    >
                      Mark {cb.status === "pending" ? "Contacted" : "Resolved"}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ASSIGN CREATOR REEL MODAL */}
      {assignTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setAssignTarget(null)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-black text-white">
              Attach Creator Reel &amp; Generate ?ref= Code
            </h3>
            <p className="text-xs text-zinc-400">Product: {assignTarget.product_name}</p>

            <input
              type="text"
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              placeholder="Creator / Team Name"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-xs text-white"
            />
            <input
              type="text"
              value={creatorHandle}
              onChange={(e) => setCreatorHandle(e.target.value)}
              placeholder="@instagram_handle"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-xs text-white"
            />
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-xs text-white"
            >
              <option value="instagram">Instagram</option>
              <option value="youtube">YouTube Shorts</option>
              <option value="facebook">Facebook</option>
              <option value="zebalpha_app">ZebAlpha App</option>
            </select>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="Published Reel / Video URL (optional)"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-xs text-white"
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAssignTarget(null)}
                className="rounded-xl border border-zinc-700 px-4 py-2 text-xs font-bold text-zinc-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() =>
                  runAction({
                    action: "assign_creator_link",
                    enrollmentId: assignTarget.id,
                    sellerId: assignTarget.seller_id,
                    productId: assignTarget.product_id,
                    commissionRate: assignTarget.commission_rate,
                    creatorName,
                    creatorHandle,
                    platform,
                    videoUrl,
                  })
                }
                className="rounded-xl bg-emerald-500 px-5 py-2 text-xs font-black text-black cursor-pointer"
              >
                {saving ? "Saving..." : "Create Tracking Link"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
