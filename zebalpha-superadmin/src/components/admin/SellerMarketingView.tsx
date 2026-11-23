"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  CheckCircle2,
  XCircle,
  PhoneCall,
  ExternalLink,
  RefreshCw,
  Plus,
  UserPlus,
  History,
  Download,
  Clock,
  ShieldCheck,
  Copy,
  Check,
  PackageCheck,
  Play,
  Ban,
  X,
  CreditCard,
} from "lucide-react";

interface ProvisionedCreds {
  fullName: string;
  email: string;
  password: string;
  roleType: string;
  loginUrl: string;
}

function dueRemaining(dueIso?: string | null): string {
  if (!dueIso) return "3-day window";
  const diff = new Date(dueIso).getTime() - Date.now();
  if (Number.isNaN(diff) || diff <= 0) return "OVERDUE (>3 Days)";
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  return d > 0 ? `${d}d ${h}h left` : `${h}h left`;
}

export default function SellerMarketingView() {
  const [loading, setLoading] = useState(true);
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [upgradeMigrationRequired, setUpgradeMigrationRequired] = useState(false);
  const [tab, setTab] = useState<"influencer" | "team" | "audit" | "branding" | "callbacks">(
    "influencer"
  );

  const [summary, setSummary] = useState({
    totalFixedFeesInr: 0,
    totalCommissionAccrued: 0,
    activeLinks: 0,
    expiredLinks: 0,
    paymentPendingCount: 0,
    paymentOverdueCount: 0,
    totalMissedClicks: 0,
    pendingCreatorApps: 0,
  });
  const [brandingCampaigns, setBrandingCampaigns] = useState<Array<Record<string, any>>>([]);
  const [enrollments, setEnrollments] = useState<Array<Record<string, any>>>([]);
  const [creatorLinks, setCreatorLinks] = useState<Array<Record<string, any>>>([]);
  const [callbacks, setCallbacks] = useState<Array<Record<string, any>>>([]);
  const [auditLogs, setAuditLogs] = useState<Array<Record<string, any>>>([]);
  const [mediaCreators, setMediaCreators] = useState<Array<Record<string, any>>>([]);

  const [planFilter, setPlanFilter] = useState<
    "all" | "payment_pending" | "without_product_1pct" | "with_product_150" | "own_brand"
  >("all");
  const [auditSearch, setAuditSearch] = useState("");
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Modals
  const [assignTarget, setAssignTarget] = useState<Record<string, any> | null>(null);
  const [creatorName, setCreatorName] = useState("Alpha Media Team");
  const [creatorHandle, setCreatorHandle] = useState("@zebalpha_official");
  const [assignedCreatorId, setAssignedCreatorId] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [videoUrl, setVideoUrl] = useState("");

  // Create Media Account Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("Alpha@2026");
  const [newPhone, setNewPhone] = useState("");
  const [newCity, setNewCity] = useState("Kolkata");
  const [newIg, setNewIg] = useState("");
  const [newRole, setNewRole] = useState<"MEDIA_LEADER" | "MEDIA_CREATOR" | "INFLUENCER">("MEDIA_LEADER");
  const [provisionedCreds, setProvisionedCreds] = useState<ProvisionedCreds | null>(null);
  const [copiedCreds, setCopiedCreds] = useState(false);

  // Campaign History Drawer Modal
  const [historyTarget, setHistoryTarget] = useState<Record<string, any> | null>(null);

  const notify = (text: string, type: "success" | "error" = "success") => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 5000);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/seller-marketing", { cache: "no-store" });
      const json = await res.json().catch(() => null);
      if (json?.success) {
        setMigrationRequired(Boolean(json.migrationRequired));
        setUpgradeMigrationRequired(Boolean(json.upgradeMigrationRequired));
        if (json.summary) setSummary(json.summary);
        setBrandingCampaigns(json.brandingCampaigns || []);
        setEnrollments(json.influencerEnrollments || []);
        setCreatorLinks(json.creatorLinks || []);
        setCallbacks(json.callbacks || []);
        setAuditLogs(json.auditLogs || []);
        setMediaCreators(json.mediaCreators || []);
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
        notify(json.message || "Updated successfully");
        if (json.credentials) {
          setProvisionedCreds(json.credentials as ProvisionedCreds);
        }
        setAssignTarget(null);
        setVideoUrl("");
        await loadAll();
      } else {
        notify(json.message || "Operation failed", "error");
      }
    } catch {
      notify("Network error performing action", "error");
    } finally {
      setSaving(false);
    }
  };

  const filteredEnrollments = useMemo(() => {
    return enrollments.filter((e) => {
      if (planFilter === "payment_pending") return String(e.payment_status || "") === "pending";
      if (planFilter === "own_brand") return e.campaign_source === "zebalpha_own_brand";
      if (planFilter === "without_product_1pct")
        return e.campaign_source !== "zebalpha_own_brand" && (e.plan_type || "without_product_1pct") === "without_product_1pct";
      if (planFilter === "with_product_150")
        return e.campaign_source !== "zebalpha_own_brand" && e.plan_type === "with_product_150";
      return true;
    });
  }, [enrollments, planFilter]);

  const filteredAuditLogs = useMemo(() => {
    const q = auditSearch.trim().toLowerCase();
    if (!q) return auditLogs;
    return auditLogs.filter(
      (l) =>
        String(l.product_name || "").toLowerCase().includes(q) ||
        String(l.event_type || "").toLowerCase().includes(q) ||
        String(l.actor_name || "").toLowerCase().includes(q) ||
        String(l.notes || "").toLowerCase().includes(q)
    );
  }, [auditLogs, auditSearch]);

  const activeTeamCreators = useMemo(
    () => mediaCreators.filter((c) => c.is_active && c.approval_status === "approved"),
    [mediaCreators]
  );

  const exportAuditCsv = () => {
    const header = ["Date", "Event", "Product", "From Plan", "To Plan", "Fee INR", "Days", "Actor Role", "Actor", "Notes"];
    const rows = filteredAuditLogs.map((l) => [
      new Date(l.created_at).toISOString(),
      l.event_type || "",
      l.product_name || "",
      l.from_plan || "",
      l.to_plan || "",
      String(l.fee_charged_inr || 0),
      String(l.duration_days || ""),
      l.actor_role || "",
      l.actor_name || "",
      String(l.notes || "").replace(/"/g, '""'),
    ]);
    const csv = [header.join(","), ...rows.map((r) => r.map((v) => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zebalpha-influencer-audit-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyCredentials = (creds: ProvisionedCreds) => {
    const text = `ZebAlpha Alpha Media Panel Login\nRole: ${creds.roleType}\nLogin URL: ${creds.loginUrl}\nEmail: ${creds.email}\nPassword: ${creds.password}`;
    navigator.clipboard?.writeText(text);
    setCopiedCreds(true);
    setTimeout(() => setCopiedCreds(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Alpha Media, Influencer &amp; Seller Branding Command
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Razorpay ₹150 New Studio Shoot + ₹50 Upgrade tracking, 3-day Payment Pending alerts, Dual-Gate delivery verification &amp; permanent audit data.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setProvisionedCreds(null);
              setShowCreateModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-black hover:bg-amber-300 cursor-pointer"
          >
            <UserPlus size={14} /> + Create Media Account
          </button>
          <button
            type="button"
            onClick={loadAll}
            className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800 cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`rounded-xl border px-4 py-3 text-xs font-bold ${
            statusMsg.type === "error"
              ? "border-rose-500/40 bg-rose-950/50 text-rose-300"
              : "border-emerald-500/40 bg-emerald-950/50 text-emerald-300"
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      {(migrationRequired || upgradeMigrationRequired) && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-950/40 px-4 py-3 text-xs font-bold text-amber-300">
          Run{" "}
          <code className="bg-black px-1.5 py-0.5 rounded">
            supabase/upgrade_alpha_media_razorpay_and_dualgate.sql
          </code>{" "}
          in Supabase SQL Editor to enable Razorpay payment ledger &amp; Dual-Gate hard locks.
        </div>
      )}

      {/* Financial & Operations KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: "Verified Fees (₹150/₹50)", value: `₹${summary.totalFixedFeesInr.toLocaleString("en-IN")}`, tone: "text-emerald-400" },
          { label: "Payment Pending / Overdue", value: `${summary.paymentPendingCount} / ${summary.paymentOverdueCount}`, tone: summary.paymentPendingCount > 0 ? "text-rose-400" : "text-zinc-300" },
          { label: "1% Commission Ledger", value: `₹${summary.totalCommissionAccrued.toLocaleString("en-IN")}`, tone: "text-amber-400" },
          { label: "Active 7-Day Links", value: summary.activeLinks, tone: "text-white" },
          { label: "Expired / Missed Clicks", value: `${summary.expiredLinks} / ${summary.totalMissedClicks}`, tone: "text-rose-400" },
          { label: "Pending Creator Apps", value: summary.pendingCreatorApps, tone: "text-sky-400" },
        ].map((k) => (
          <div key={k.label} className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">{k.label}</p>
            <p className={`mt-1.5 text-xl font-black ${k.tone}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-3">
        {[
          { key: "influencer" as const, label: `Influencer Campaigns (${enrollments.length})` },
          { key: "team" as const, label: `Alpha Media Team & Accounts (${mediaCreators.length})` },
          { key: "audit" as const, label: `Permanent Audit Ledger (${auditLogs.length})` },
          { key: "branding" as const, label: `App Branding (${brandingCampaigns.length})` },
          { key: "callbacks" as const, label: `Callbacks (${callbacks.length})` },
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

      {/* TAB 1: INFLUENCER CAMPAIGNS */}
      {tab === "influencer" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(
              [
                { key: "all", label: "All Campaigns" },
                { key: "payment_pending", label: `Payment Pending (${summary.paymentPendingCount})` },
                { key: "without_product_1pct", label: "Plan 1: Without Product + 1%" },
                { key: "with_product_150", label: "Plan 2: With Product + ₹150" },
                { key: "own_brand", label: "ZebAlpha Own Brand" },
              ] as const
            ).map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setPlanFilter(f.key)}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-bold cursor-pointer ${
                  planFilter === f.key
                    ? "bg-amber-400 text-black"
                    : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredEnrollments.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-10 text-center text-xs text-zinc-400">
              No influencer campaigns match this filter yet.
            </div>
          ) : (
            filteredEnrollments.map((enr) => {
              const relatedLinks = creatorLinks.filter(
                (l) => l.enrollment_id === enr.id || l.product_id === enr.product_id
              );
              const expMs = enr.expires_at ? new Date(enr.expires_at).getTime() : null;
              const isExpired =
                enr.status === "expired" ||
                (enr.status === "active" && expMs !== null && expMs <= Date.now());
              const isPayPending = String(enr.payment_status || "") === "pending";
              const isPayOverdue =
                isPayPending &&
                Boolean(enr.payment_due_at) &&
                new Date(String(enr.payment_due_at)).getTime() <= Date.now();
              const pendingAmt =
                Number(enr.pending_payment_amount_inr || 0) ||
                (enr.pending_payment_purpose === "upgrade_50" ? 50 : 150);
              const sampleDelivered = [
                "sample_received",
                "in_shoot",
                "shoot_completed",
                "kept_at_studio",
              ].includes(String(enr.sample_status || ""));

              return (
                <div
                  key={enr.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-black text-white">{enr.product_name}</p>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                            enr.plan_type === "with_product_150"
                              ? "bg-rose-500/20 text-rose-300"
                              : "bg-emerald-500/20 text-emerald-300"
                          }`}
                        >
                          {enr.plan_type === "with_product_150"
                            ? `With Product + ₹${enr.fixed_fee_inr || 150}`
                            : `Without Product + ${enr.commission_rate}%`}
                        </span>
                        <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-400">
                          {isExpired ? "EXPIRED" : String(enr.workflow_status || enr.status).replace(/_/g, " ")}
                        </span>
                        {enr.renewal_count > 0 && (
                          <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-bold text-sky-300">
                            Renewed {enr.renewal_count}×
                          </span>
                        )}
                      </div>

                      {/* Dual-Gate + Razorpay Payment Strip */}
                      {(enr.plan_type === "with_product_150" || isPayPending || enr.razorpay_payment_id) && (
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-black ${
                              enr.payment_status === "paid"
                                ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                                : isPayOverdue
                                ? "border-rose-500/40 bg-rose-500/20 text-rose-300"
                                : "border-amber-500/30 bg-amber-500/15 text-amber-300"
                            }`}
                          >
                            <CreditCard size={11} />
                            {enr.payment_status === "paid"
                              ? `Razorpay Paid${enr.razorpay_payment_id ? ` (${enr.razorpay_payment_id})` : ""}`
                              : `Payment Pending ₹${pendingAmt} • ${dueRemaining(enr.payment_due_at)}`}
                          </span>

                          {enr.plan_type === "with_product_150" && (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-black ${
                                sampleDelivered
                                  ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                                  : "border-zinc-700 bg-zinc-900 text-zinc-300"
                              }`}
                            >
                              <PackageCheck size={11} />
                              {sampleDelivered ? "Product Delivered" : "Awaiting Product Delivery"}
                            </span>
                          )}
                        </div>
                      )}

                      <p className="text-xs text-zinc-400">
                        Store: <strong className="text-zinc-200">{enr.seller_store_name || enr.seller_id}</strong> •{" "}
                        Creator: <strong className="text-zinc-200">{enr.assigned_creator_name || "Unassigned"}</strong> •{" "}
                        Clicks: {enr.total_clicks} • Orders: {enr.total_orders}
                        {Number(enr.missed_clicks_after_expiry || 0) > 0 && (
                          <strong className="text-rose-400 ml-2">
                            • {enr.missed_clicks_after_expiry} Missed Clicks
                          </strong>
                        )}
                      </p>
                      {enr.expires_at && (
                        <p className="text-[11px] text-zinc-400 flex items-center gap-1">
                          <Clock size={12} />
                          Expires: {new Date(enr.expires_at).toLocaleString("en-IN")}
                        </p>
                      )}
                    </div>

                    {/* Master Override Buttons */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {isPayPending && (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() =>
                            runAction({ action: "verify_plan_payment", enrollmentId: enr.id })
                          }
                          className="inline-flex items-center gap-1 rounded-xl bg-emerald-500 px-3 py-1.5 text-[11px] font-black text-black cursor-pointer"
                        >
                          <CheckCircle2 size={12} /> Mark ₹{pendingAmt} Paid
                        </button>
                      )}

                      {enr.plan_type === "with_product_150" && !sampleDelivered && (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() =>
                            runAction({
                              action: "admin_override_campaign",
                              enrollmentId: enr.id,
                              overrideAction: "accept",
                              sampleReceived: true,
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-xl bg-sky-500 px-3 py-1.5 text-[11px] font-black text-black cursor-pointer"
                        >
                          <PackageCheck size={12} /> Confirm Delivery
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setAssignTarget(enr);
                          setAssignedCreatorId(enr.assigned_creator_id || activeTeamCreators[0]?.user_id || "");
                          setCreatorName(enr.assigned_creator_name || activeTeamCreators[0]?.full_name || "Alpha Media Team");
                          setCreatorHandle(enr.assigned_creator_handle || activeTeamCreators[0]?.instagram_handle || "@zebalpha_official");
                        }}
                        className="inline-flex items-center gap-1 rounded-xl bg-amber-400 px-3 py-1.5 text-[11px] font-black text-black cursor-pointer"
                      >
                        <Plus size={12} /> Assign / Link
                      </button>

                      <button
                        type="button"
                        disabled={saving}
                        onClick={() =>
                          runAction({
                            action: "admin_override_campaign",
                            enrollmentId: enr.id,
                            overrideAction: "activate_extend_7d",
                            durationDays: 7,
                          })
                        }
                        className="inline-flex items-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-3 py-1.5 text-[11px] font-black text-emerald-300 hover:bg-emerald-900/50 cursor-pointer"
                      >
                        <Play size={11} /> +7d Live
                      </button>

                      {!isExpired && (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() =>
                            runAction({
                              action: "admin_override_campaign",
                              enrollmentId: enr.id,
                              overrideAction: "force_deactivate",
                            })
                          }
                          className="inline-flex items-center gap-1 rounded-xl border border-rose-500/40 bg-rose-950/40 px-3 py-1.5 text-[11px] font-black text-rose-300 hover:bg-rose-900/50 cursor-pointer"
                        >
                          <Ban size={11} /> Expire Now
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setHistoryTarget(enr)}
                        className="inline-flex items-center gap-1 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[11px] font-bold text-zinc-200 hover:bg-zinc-800 cursor-pointer"
                      >
                        <History size={12} /> History
                      </button>
                    </div>
                  </div>

                  {relatedLinks.length > 0 && (
                    <div className="grid gap-2 sm:grid-cols-2 pt-2 border-t border-zinc-900">
                      {relatedLinks.map((lnk) => (
                        <div
                          key={lnk.id}
                          className="flex items-center justify-between rounded-xl bg-zinc-900 px-3.5 py-2 text-xs"
                        >
                          <div>
                            <p className="font-bold text-white">
                              {lnk.creator_name}{" "}
                              <span className="text-[10px] uppercase text-zinc-400">({lnk.status})</span>
                            </p>
                            <p className="text-[11px] text-amber-400 font-mono">
                              /go/{lnk.ref_code} • {lnk.clicks} clicks
                              {Number(lnk.missed_clicks_after_expiry || 0) > 0
                                ? ` • ${lnk.missed_clicks_after_expiry} missed`
                                : ""}
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

      {/* TAB 2: ALPHA MEDIA TEAM & CREATOR ACCOUNTS */}
      {tab === "team" && (
        <div className="space-y-4">
          {mediaCreators.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-10 text-center text-xs text-zinc-400 space-y-3">
              <p>No Alpha Media Leader or Creator accounts provisioned yet.</p>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2 text-xs font-black text-black cursor-pointer"
              >
                <UserPlus size={14} /> Create First Media Leader Account
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {mediaCreators.map((c) => {
                const linksOwned = creatorLinks.filter((l) => l.assigned_creator_id === c.user_id);
                const clicks = linksOwned.reduce((s, l) => s + Number(l.clicks || 0), 0);
                const orders = linksOwned.reduce((s, l) => s + Number(l.orders || 0), 0);
                const gmv = linksOwned.reduce((s, l) => s + Number(l.gmv || 0), 0);

                return (
                  <div
                    key={c.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-black text-white">{c.full_name}</p>
                        <span className="rounded-full bg-amber-400/15 border border-amber-400/30 px-2.5 py-0.5 text-[10px] font-black text-amber-300">
                          {c.role_type}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                            c.approval_status === "approved" && c.is_active
                              ? "bg-emerald-500/20 text-emerald-300"
                              : c.approval_status === "pending"
                              ? "bg-sky-500/20 text-sky-300"
                              : "bg-rose-500/20 text-rose-300"
                          }`}
                        >
                          {c.approval_status}
                        </span>
                        <span className="text-[10px] text-zinc-500">({c.onboarding_source})</span>
                      </div>
                      <p className="text-xs text-zinc-400">
                        {c.email} • {c.phone || "No phone"} • {c.instagram_handle || "No IG"} • {c.city || "India"}
                      </p>
                      <p className="text-[11px] text-zinc-300">
                        Performance: <strong>{linksOwned.length} links</strong> • {clicks} clicks • {orders} orders •{" "}
                        <strong className="text-emerald-400">GMV ₹{gmv.toLocaleString("en-IN")}</strong>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {c.approval_status === "pending" ? (
                        <>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                              runAction({
                                action: "manage_creator",
                                profileId: c.id,
                                operation: "approve",
                                roleType: "INFLUENCER",
                              })
                            }
                            className="rounded-xl bg-emerald-500 px-3.5 py-2 text-xs font-black text-black cursor-pointer"
                          >
                            Approve Influencer
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                              runAction({
                                action: "manage_creator",
                                profileId: c.id,
                                operation: "approve",
                                roleType: "MEDIA_CREATOR",
                              })
                            }
                            className="rounded-xl bg-amber-400 px-3.5 py-2 text-xs font-black text-black cursor-pointer"
                          >
                            Approve In-House
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                              runAction({
                                action: "manage_creator",
                                profileId: c.id,
                                operation: "reject",
                              })
                            }
                            className="rounded-xl border border-rose-500/40 bg-rose-950/40 px-3 py-2 text-xs font-bold text-rose-300 cursor-pointer"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <>
                          <select
                            value={c.role_type}
                            onChange={(e) =>
                              runAction({
                                action: "manage_creator",
                                profileId: c.id,
                                operation: "set_role",
                                roleType: e.target.value,
                              })
                            }
                            className="rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs font-bold text-white"
                          >
                            <option value="MEDIA_LEADER">MEDIA_LEADER</option>
                            <option value="MEDIA_CREATOR">MEDIA_CREATOR</option>
                            <option value="INFLUENCER">INFLUENCER</option>
                          </select>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() =>
                              runAction({
                                action: "manage_creator",
                                profileId: c.id,
                                operation: "toggle_active",
                              })
                            }
                            className={`rounded-xl px-3.5 py-2 text-xs font-black cursor-pointer ${
                              c.is_active
                                ? "border border-rose-500/40 bg-rose-950/40 text-rose-300"
                                : "bg-emerald-500 text-black"
                            }`}
                          >
                            {c.is_active ? "Suspend" : "Restore"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PERMANENT AUDIT LEDGER */}
      {tab === "audit" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <input
              type="text"
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              placeholder="Search audit logs by product, event, actor, or Razorpay ID..."
              className="w-full sm:w-96 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs text-white"
            />
            <button
              type="button"
              onClick={exportAuditCsv}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-black text-black hover:bg-zinc-200 cursor-pointer"
            >
              <Download size={14} /> Export Saved Audit CSV
            </button>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden">
            {filteredAuditLogs.length === 0 ? (
              <div className="p-10 text-center text-xs text-zinc-400">
                No audit events recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-zinc-900 text-[10px] uppercase tracking-wider text-zinc-400 border-b border-zinc-800">
                    <tr>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4">Event</th>
                      <th className="py-3 px-4">Product</th>
                      <th className="py-3 px-4">Plan / Fee</th>
                      <th className="py-3 px-4">Actor</th>
                      <th className="py-3 px-4">Saved Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    {filteredAuditLogs.map((l) => (
                      <tr key={l.id} className="hover:bg-zinc-900/50">
                        <td className="py-3 px-4 font-mono text-[11px] text-zinc-400 whitespace-nowrap">
                          {new Date(l.created_at).toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-4">
                          <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-black uppercase text-amber-300">
                            {String(l.event_type || "").replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-white">{l.product_name || l.product_id || "-"}</td>
                        <td className="py-3 px-4 text-[11px]">
                          {l.to_plan || "-"}
                          {Number(l.fee_charged_inr || 0) > 0 && (
                            <span className="ml-1 text-emerald-400 font-bold">₹{l.fee_charged_inr}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-[11px]">
                          <strong className="text-zinc-200">{l.actor_name || "-"}</strong>
                          <span className="block text-[10px] text-zinc-500">{l.actor_role}</span>
                        </td>
                        <td className="py-3 px-4 text-zinc-400 max-w-md">{l.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: APP BRANDING APPROVALS */}
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
                    {c.placement_type} • Products: {c.product_ids?.length || 0} • Views: {c.impressions} • Clicks:{" "}
                    {c.clicks}
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

      {/* TAB 5: SELLER CALLBACKS */}
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

      {/* CREATE MEDIA ACCOUNT MODAL */}
      {showCreateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <ShieldCheck size={18} className="text-amber-400" />
                  Create Alpha Media Account
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Directly provision a Media Leader, In-House Creator, or Influencer for media.zebalpha.shop.
                </p>
              </div>
              <button type="button" onClick={() => setShowCreateModal(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            {provisionedCreds ? (
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-4 space-y-3 text-xs">
                <p className="font-black text-emerald-300">Account Active! Share Credentials:</p>
                <div className="space-y-1 font-mono text-zinc-200">
                  <p>Role: {provisionedCreds.roleType}</p>
                  <p>URL: {provisionedCreds.loginUrl}</p>
                  <p>Email: {provisionedCreds.email}</p>
                  <p>Password: {provisionedCreds.password}</p>
                </div>
                <button
                  type="button"
                  onClick={() => copyCredentials(provisionedCreds)}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-black text-black cursor-pointer"
                >
                  {copiedCreds ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedCreds ? "Copied for WhatsApp / Email!" : "Copy Login Details"}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <select
                  value={newRole}
                  onChange={(e) =>
                    setNewRole(e.target.value as "MEDIA_LEADER" | "MEDIA_CREATOR" | "INFLUENCER")
                  }
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-xs font-bold text-white"
                >
                  <option value="MEDIA_LEADER">MEDIA_LEADER (Leads Team, Accepts, Assigns, Publishes)</option>
                  <option value="MEDIA_CREATOR">MEDIA_CREATOR (In-House Alpha Studio Member)</option>
                  <option value="INFLUENCER">INFLUENCER (Partner Creator)</option>
                </select>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Full Name *"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-xs text-white"
                />
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Email Address *"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-xs text-white"
                />
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Temporary Password (min 6 chars) *"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-xs text-white"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="Phone / WhatsApp"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-xs text-white"
                  />
                  <input
                    type="text"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    placeholder="City"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-xs text-white"
                  />
                </div>
                <input
                  type="text"
                  value={newIg}
                  onChange={(e) => setNewIg(e.target.value)}
                  placeholder="Instagram Handle (e.g. @alpha_lead)"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-xs text-white"
                />
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="rounded-xl border border-zinc-700 px-4 py-2 text-xs font-bold text-zinc-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={saving || !newName.trim() || !newEmail.trim()}
                    onClick={() =>
                      runAction({
                        action: "create_media_account",
                        fullName: newName,
                        email: newEmail,
                        password: newPassword,
                        phone: newPhone,
                        city: newCity,
                        instagramHandle: newIg,
                        roleType: newRole,
                      })
                    }
                    className="rounded-xl bg-amber-400 px-5 py-2 text-xs font-black text-black disabled:opacity-50 cursor-pointer"
                  >
                    {saving ? "Creating..." : "Create & Activate"}
                  </button>
                </div>
              </div>
            )}
          </div>
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
              Attach Creator Reel &amp; Activate 7-Day Link
            </h3>
            <p className="text-xs text-zinc-400">Product: {assignTarget.product_name}</p>

            {activeTeamCreators.length > 0 && (
              <select
                value={assignedCreatorId}
                onChange={(e) => {
                  const uid = e.target.value;
                  setAssignedCreatorId(uid);
                  const found = activeTeamCreators.find((x) => x.user_id === uid);
                  if (found) {
                    setCreatorName(found.full_name);
                    setCreatorHandle(found.instagram_handle || "@zebalpha_official");
                  }
                }}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-xs text-white"
              >
                <option value="">-- Optional: Pick Active Alpha Media Creator --</option>
                {activeTeamCreators.map((cr) => (
                  <option key={cr.user_id} value={cr.user_id}>
                    {cr.full_name} ({cr.role_type} • {cr.instagram_handle || cr.email})
                  </option>
                ))}
              </select>
            )}

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
                    assignedCreatorId: assignedCreatorId || null,
                    creatorName,
                    creatorHandle,
                    platform,
                    videoUrl,
                  })
                }
                className="rounded-xl bg-emerald-500 px-5 py-2 text-xs font-black text-black cursor-pointer"
              >
                {saving ? "Saving..." : "Activate 7-Day Link"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PER-CAMPAIGN AUDIT HISTORY MODAL */}
      {historyTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setHistoryTarget(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950 p-6 space-y-4 max-h-[82vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-black text-white">Saved Campaign History</h3>
                <p className="text-xs text-zinc-400">{historyTarget.product_name}</p>
              </div>
              <button type="button" onClick={() => setHistoryTarget(null)} className="text-zinc-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {auditLogs.filter((l) => l.enrollment_id === historyTarget.id).length === 0 ? (
                <p className="text-xs text-zinc-400 py-8 text-center">No timeline logs saved for this campaign yet.</p>
              ) : (
                auditLogs
                  .filter((l) => l.enrollment_id === historyTarget.id)
                  .map((l) => (
                    <div key={l.id} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-black uppercase text-amber-400">
                          {String(l.event_type || "").replace(/_/g, " ")}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-400">
                          {new Date(l.created_at).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <p className="text-zinc-200">{l.notes}</p>
                      <p className="text-[10px] text-zinc-400">
                        By: {l.actor_name || l.actor_role || "System"}
                        {Number(l.fee_charged_inr || 0) > 0 ? ` • Fee ₹${l.fee_charged_inr}` : ""}
                      </p>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
