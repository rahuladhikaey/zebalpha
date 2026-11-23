"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { checkMediaAccess, MediaAuthSession } from "@/lib/authGuard";
import { supabase } from "@/lib/supabaseClient";
import {
  CheckCircle2,
  XCircle,
  UserCheck,
  Play,
  RefreshCw,
  Clock,
  PackageCheck,
  ExternalLink,
  Copy,
  Check,
  Plus,
  X,
  AlertCircle,
  Send,
  Video,
  RotateCcw,
  Lock,
  CreditCard,
} from "lucide-react";

interface CampaignRow {
  id: string;
  seller_id: string;
  seller_store_name?: string | null;
  product_id: string;
  product_name: string;
  product_image?: string | null;
  product_price?: number;
  campaign_source: "seller" | "zebalpha_own_brand";
  plan_type: "without_product_1pct" | "with_product_150";
  commission_rate: number;
  fixed_fee_inr: number;
  payment_status: string;
  payment_due_at?: string | null;
  pending_payment_amount_inr?: number;
  pending_payment_purpose?: string | null;
  razorpay_payment_id?: string | null;
  sample_status: string;
  workflow_status: string;
  status: string;
  assigned_creator_id?: string | null;
  assigned_creator_name?: string | null;
  assigned_creator_handle?: string | null;
  shoot_deadline?: string | null;
  shoot_brief?: string | null;
  submitted_video_url?: string | null;
  submitted_notes?: string | null;
  revision_feedback?: string | null;
  starts_at?: string | null;
  expires_at?: string | null;
  total_clicks: number;
  missed_clicks_after_expiry: number;
  total_orders: number;
  renewal_count: number;
  created_at: string;
}

interface CreatorProfile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  instagram_handle?: string | null;
  role_type: string;
  is_active: boolean;
  approval_status: string;
}

interface LinkRow {
  id: string;
  enrollment_id?: string | null;
  product_id: string;
  ref_code: string;
  video_url?: string | null;
  platform: string;
  status: string;
  expires_at?: string | null;
}

interface ProductOption {
  id: string;
  name: string;
  price: number;
  image_url?: string | null;
}

function countdownText(targetIso?: string | null, fallback = "Not live yet", expiredLabel = "Expired"): string {
  if (!targetIso) return fallback;
  const diff = new Date(targetIso).getTime() - Date.now();
  if (Number.isNaN(diff) || diff <= 0) return expiredLabel;
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  return d > 0 ? `${d}d ${h}h left` : `${h}h left`;
}

function getDualGateStatus(c: CampaignRow) {
  const isPlan2Seller =
    c.plan_type === "with_product_150" && (c.campaign_source || "seller") === "seller";
  const paymentPaid = ["paid", "waived"].includes(c.payment_status);
  const paymentPending = c.payment_status === "pending";
  const paymentOverdue =
    paymentPending &&
    Boolean(c.payment_due_at) &&
    new Date(String(c.payment_due_at)).getTime() <= Date.now();
  const sampleDelivered = [
    "sample_received",
    "in_shoot",
    "shoot_completed",
    "kept_at_studio",
  ].includes(c.sample_status);

  const canProceed = !isPlan2Seller || (paymentPaid && sampleDelivered);
  return {
    isPlan2Seller,
    paymentPaid,
    paymentPending,
    paymentOverdue,
    sampleDelivered,
    canProceed,
  };
}

export default function InfluencerQueuePage() {
  const router = useRouter();
  const [session, setSession] = useState<MediaAuthSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [creators, setCreators] = useState<CreatorProfile[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);

  const [sourceFilter, setSourceFilter] = useState<"all" | "seller" | "zebalpha_own_brand">("all");
  const [stageTab, setStageTab] = useState<
    "awaiting" | "production" | "review" | "live" | "expired"
  >("awaiting");

  // Assign Creator Modal
  const [assignTarget, setAssignTarget] = useState<CampaignRow | null>(null);
  const [selectedCreatorUid, setSelectedCreatorUid] = useState("");
  const [deadlineHours, setDeadlineHours] = useState("48");
  const [shootBrief, setShootBrief] = useState("");

  // Review & Publish Modal
  const [reviewTarget, setReviewTarget] = useState<CampaignRow | null>(null);
  const [publishedUrl, setPublishedUrl] = useState("");
  const [platform, setPlatform] = useState("instagram");
  const [attachVideoProof, setAttachVideoProof] = useState(true);
  const [revisionFeedback, setRevisionFeedback] = useState("");

  // Own-Brand Dispatch Modal
  const [showOwnBrandModal, setShowOwnBrandModal] = useState(false);
  const [obProductId, setObProductId] = useState("");
  const [obCreatorUid, setObCreatorUid] = useState("");
  const [obBrief, setObBrief] = useState("");

  const notify = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [enrRes, linkRes, profRes, prodRes] = await Promise.all([
        supabase
          .from("seller_influencer_enrollments")
          .select("*")
          .order("updated_at", { ascending: false })
          .limit(200),
        supabase
          .from("influencer_creator_links")
          .select("id, enrollment_id, product_id, ref_code, video_url, platform, status, expires_at")
          .order("created_at", { ascending: false })
          .limit(250),
        supabase
          .from("media_creator_profiles")
          .select("id, user_id, full_name, email, instagram_handle, role_type, is_active, approval_status")
          .eq("is_active", true)
          .order("full_name", { ascending: true }),
        supabase
          .from("products")
          .select("id, name, price, image_url")
          .order("created_at", { ascending: false })
          .limit(80),
      ]);

      if (!enrRes.error && Array.isArray(enrRes.data)) {
        setCampaigns(enrRes.data as CampaignRow[]);
      }
      if (!linkRes.error && Array.isArray(linkRes.data)) {
        setLinks(linkRes.data as LinkRow[]);
      }
      if (!profRes.error && Array.isArray(profRes.data)) {
        setCreators(profRes.data as CreatorProfile[]);
      }
      if (!prodRes.error && Array.isArray(prodRes.data)) {
        setProducts(prodRes.data as ProductOption[]);
      }
    } catch (err) {
      console.error("[Influencer Queue] Fetch error:", err);
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
      await fetchAll();
    }
    init();
  }, [router, fetchAll]);

  const creatorWorkload = useMemo(() => {
    const map = new Map<string, number>();
    campaigns.forEach((c) => {
      if (
        c.assigned_creator_id &&
        ["assigned", "in_production", "revision_needed"].includes(c.workflow_status)
      ) {
        map.set(c.assigned_creator_id, (map.get(c.assigned_creator_id) || 0) + 1);
      }
    });
    return map;
  }, [campaigns]);

  const linkByEnrollment = useMemo(() => {
    const map = new Map<string, LinkRow>();
    links.forEach((l) => {
      if (l.enrollment_id && !map.has(l.enrollment_id)) map.set(l.enrollment_id, l);
    });
    return map;
  }, [links]);

  const isRowExpired = (c: CampaignRow) => {
    const expMs = c.expires_at ? new Date(c.expires_at).getTime() : null;
    return (
      c.status === "expired" ||
      c.workflow_status === "expired" ||
      (c.status === "active" && expMs !== null && !Number.isNaN(expMs) && expMs <= Date.now())
    );
  };

  const filteredBySource = useMemo(
    () =>
      campaigns.filter((c) =>
        sourceFilter === "all" ? true : (c.campaign_source || "seller") === sourceFilter
      ),
    [campaigns, sourceFilter]
  );

  const stageCounts = useMemo(() => {
    return {
      awaiting: filteredBySource.filter((c) =>
        ["awaiting_review", "awaiting_payment"].includes(c.workflow_status)
      ).length,
      production: filteredBySource.filter((c) =>
        ["accepted", "assigned", "in_production", "revision_needed"].includes(c.workflow_status)
      ).length,
      review: filteredBySource.filter((c) => c.workflow_status === "submitted_for_review").length,
      live: filteredBySource.filter((c) => c.status === "active" && !isRowExpired(c)).length,
      expired: filteredBySource.filter(
        (c) => isRowExpired(c) || c.workflow_status === "rejected" || c.status === "paused"
      ).length,
    };
  }, [filteredBySource]);

  const visibleCampaigns = useMemo(() => {
    return filteredBySource.filter((c) => {
      if (stageTab === "awaiting")
        return ["awaiting_review", "awaiting_payment"].includes(c.workflow_status);
      if (stageTab === "production")
        return ["accepted", "assigned", "in_production", "revision_needed"].includes(c.workflow_status);
      if (stageTab === "review") return c.workflow_status === "submitted_for_review";
      if (stageTab === "live") return c.status === "active" && !isRowExpired(c);
      return isRowExpired(c) || c.workflow_status === "rejected" || c.status === "paused";
    });
  }, [filteredBySource, stageTab]);

  const handleAccept = async (c: CampaignRow, sampleReceived: boolean) => {
    setBusyId(c.id);
    try {
      const { data, error } = await supabase.rpc("media_leader_accept_campaign", {
        p_enrollment_id: c.id,
        p_sample_received: sampleReceived,
        p_notes: sampleReceived
          ? "Physical product sample delivery confirmed at Alpha Studio"
          : "Accepted by Media Leader",
      });
      if (error) throw error;
      const result = data as { dual_gate_ready?: boolean } | null;
      if (sampleReceived && result && result.dual_gate_ready === false) {
        notify(
          `Product delivery confirmed for "${c.product_name}"! Shoot stays locked until seller completes ₹150 Razorpay payment.`
        );
      } else if (sampleReceived) {
        notify(`Product delivered + ₹150 paid for "${c.product_name}" — ready to assign creator!`);
      } else {
        notify(`Accepted "${c.product_name}"!`);
      }
      await fetchAll();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Failed to update campaign", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (c: CampaignRow) => {
    const reason = window.prompt(
      "Reason for rejecting / sending back to seller:",
      "Please upload clearer product images"
    );
    if (reason === null) return;
    setBusyId(c.id);
    try {
      const { error } = await supabase.rpc("media_leader_reject_campaign", {
        p_enrollment_id: c.id,
        p_reason: reason,
      });
      if (error) throw error;
      notify("Campaign rejected with reason saved to audit log.");
      await fetchAll();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Reject failed", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTarget || !selectedCreatorUid) {
      notify("Please select a creator to assign.", "error");
      return;
    }
    setBusyId(assignTarget.id);
    try {
      const deadlineIso = new Date(
        Date.now() + Math.max(6, Number(deadlineHours || 48)) * 3_600_000
      ).toISOString();
      const { error } = await supabase.rpc("media_leader_assign_creator", {
        p_enrollment_id: assignTarget.id,
        p_creator_user_id: selectedCreatorUid,
        p_deadline: deadlineIso,
        p_brief: shootBrief,
      });
      if (error) throw error;
      notify("Creator assigned! Shoot task is now live in their My Shoots workspace.");
      setAssignTarget(null);
      setShootBrief("");
      await fetchAll();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Assignment blocked by Dual-Gate check", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleReviewDecision = async (approve: boolean) => {
    if (!reviewTarget) return;
    setBusyId(reviewTarget.id);
    try {
      const { data, error } = await supabase.rpc("media_leader_review_reel", {
        p_enrollment_id: reviewTarget.id,
        p_approve: approve,
        p_published_url: publishedUrl.trim() || reviewTarget.submitted_video_url || null,
        p_platform: platform,
        p_feedback: revisionFeedback.trim() || null,
        p_attach_video_proof: attachVideoProof,
      });
      if (error) throw error;
      notify(
        approve
          ? `Reel LIVE & 7-Day Link (${(data as { ref_code?: string })?.ref_code || "INF"}) activated!`
          : "Revision feedback sent back to creator."
      );
      setReviewTarget(null);
      setRevisionFeedback("");
      await fetchAll();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Review update failed", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handleCreateOwnBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    const prod = products.find((p) => String(p.id) === obProductId);
    if (!prod) {
      notify("Select a product first.", "error");
      return;
    }
    setBusyId("own-brand");
    try {
      const { error } = await supabase.rpc("media_leader_create_own_brand_campaign", {
        p_product_id: String(prod.id),
        p_product_name: prod.name,
        p_product_image: prod.image_url || null,
        p_product_price: Number(prod.price || 0),
        p_creator_user_id: obCreatorUid || null,
        p_brief: obBrief.trim() || "ZebAlpha Own-Brand hero reel shoot",
      });
      if (error) throw error;
      notify(`ZebAlpha Own-Brand shoot dispatched for "${prod.name}"!`);
      setShowOwnBrandModal(false);
      setObProductId("");
      setObCreatorUid("");
      setObBrief("");
      await fetchAll();
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Failed to dispatch Own-Brand shoot", "error");
    } finally {
      setBusyId(null);
    }
  };

  const copyGoUrl = (refCode: string) => {
    navigator.clipboard?.writeText(`https://zebalpha.shop/go/${encodeURIComponent(refCode)}`);
    setCopiedCode(refCode);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="min-h-screen bg-dark-950 pl-64">
      <Sidebar userRole={session?.role} userEmail={session?.email} />
      <Header
        title="Influencer & Alpha Studio Queue"
        description="Dual-Gate Enforced: For Plan 2 (₹150), Media proceeds only when BOTH Product Delivery and Razorpay Payment are complete"
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

        {/* Top Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {(
              [
                { key: "all", label: "All Sources" },
                { key: "seller", label: "Seller Campaigns" },
                { key: "zebalpha_own_brand", label: "ZebAlpha Own Brand" },
              ] as const
            ).map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => setSourceFilter(s.key)}
                className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  sourceFilter === s.key
                    ? "bg-brand-600 text-white"
                    : "bg-dark-900 text-zinc-400 border border-dark-800 hover:text-white"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchAll}
              className="px-3.5 py-2 rounded-lg bg-dark-900 border border-dark-800 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={() => setShowOwnBrandModal(true)}
              className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-brand-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Own-Brand Shoot</span>
            </button>
          </div>
        </div>

        {/* Stage Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-dark-800 pb-3">
          {(
            [
              { key: "awaiting", label: `Awaiting Gates / Accept (${stageCounts.awaiting})` },
              { key: "production", label: `Ready / In Shoot (${stageCounts.production})` },
              { key: "review", label: `Review & Go Live (${stageCounts.review})` },
              { key: "live", label: `Live 7-Day Links (${stageCounts.live})` },
              { key: "expired", label: `Expired / Closed (${stageCounts.expired})` },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setStageTab(t.key)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                stageTab === t.key
                  ? "bg-white text-black"
                  : "bg-dark-900 text-zinc-400 border border-dark-800 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Campaign List */}
        {loading ? (
          <div className="p-12 text-center text-xs text-zinc-400">Loading Alpha Media queue...</div>
        ) : visibleCampaigns.length === 0 ? (
          <div className="rounded-2xl bg-dark-900 border border-dark-800 p-12 text-center">
            <p className="text-sm font-bold text-white">No campaigns in this stage</p>
            <p className="text-xs text-zinc-400 mt-1">
              Switch tabs above or dispatch a ZebAlpha Own-Brand shoot.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {visibleCampaigns.map((c) => {
              const link = linkByEnrollment.get(c.id);
              const expired = isRowExpired(c);
              const gates = getDualGateStatus(c);
              const pendingAmt =
                Number(c.pending_payment_amount_inr || 0) ||
                (c.pending_payment_purpose === "upgrade_50" ? 50 : 150);

              return (
                <div
                  key={c.id}
                  className="rounded-2xl bg-dark-900 border border-dark-800 p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-16 h-16 rounded-xl bg-dark-800 border border-dark-700 overflow-hidden shrink-0">
                      {c.product_image ? (
                        <img src={c.product_image} alt={c.product_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-500">
                          <Video className="w-5 h-5" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold text-white truncate">{c.product_name}</h3>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            c.campaign_source === "zebalpha_own_brand"
                              ? "bg-purple-500/15 text-purple-300 border border-purple-500/30"
                              : "bg-blue-500/15 text-blue-300 border border-blue-500/30"
                          }`}
                        >
                          {c.campaign_source === "zebalpha_own_brand"
                            ? "Own Brand"
                            : c.seller_store_name || "Seller"}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            c.plan_type === "with_product_150"
                              ? "bg-rose-500/15 text-rose-300 border border-rose-500/30"
                              : "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                          }`}
                        >
                          {c.plan_type === "with_product_150"
                            ? `With Product + ₹${c.fixed_fee_inr || 150}`
                            : `Without Product + ${c.commission_rate}%`}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-dark-800 text-amber-300 border border-dark-700">
                          {expired ? "EXPIRED" : c.workflow_status.replace(/_/g, " ")}
                        </span>
                      </div>

                      {/* DUAL-GATE STATUS STRIP (for Plan 2 or any Pending ₹50 Upgrade) */}
                      {(gates.isPlan2Seller || gates.paymentPending) && (
                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              gates.paymentPaid
                                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                                : gates.paymentOverdue
                                ? "bg-red-500/15 border-red-500/40 text-red-300"
                                : "bg-amber-500/15 border-amber-500/30 text-amber-300"
                            }`}
                          >
                            <CreditCard className="w-3 h-3" />
                            {gates.paymentPaid
                              ? `Gate 1: ₹${c.fixed_fee_inr || 150} Paid (Razorpay)`
                              : gates.paymentOverdue
                              ? `Gate 1: Payment Pending ₹${pendingAmt} • OVERDUE (>3d)`
                              : `Gate 1: Payment Pending ₹${pendingAmt} • ${countdownText(
                                  c.payment_due_at,
                                  "3d window",
                                  "OVERDUE"
                                )}`}
                          </span>

                          {gates.isPlan2Seller && (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                gates.sampleDelivered
                                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                                  : "bg-zinc-800 border-zinc-700 text-zinc-300"
                              }`}
                            >
                              <PackageCheck className="w-3 h-3" />
                              {gates.sampleDelivered
                                ? "Gate 2: Product Delivered"
                                : "Gate 2: Awaiting Product Delivery"}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-400">
                        <span>Price: ₹{Number(c.product_price || 0).toLocaleString("en-IN")}</span>
                        <span>
                          Creator: <strong className="text-zinc-200">{c.assigned_creator_name || "Unassigned"}</strong>
                        </span>
                        {c.expires_at && (
                          <span className={expired ? "text-red-400 font-semibold" : "text-emerald-400 font-semibold"}>
                            <Clock className="w-3 h-3 inline mr-1" />
                            {countdownText(c.expires_at)}
                          </span>
                        )}
                        <span>
                          {c.total_clicks} clicks • {c.total_orders} orders
                          {c.missed_clicks_after_expiry > 0 && (
                            <strong className="text-rose-400 ml-1">
                              ({c.missed_clicks_after_expiry} missed)
                            </strong>
                          )}
                        </span>
                      </div>

                      {link && (
                        <div className="flex flex-wrap items-center gap-3 pt-0.5 text-[11px]">
                          <span className="font-mono text-brand-400">zebalpha.shop/go/{link.ref_code}</span>
                          <button
                            type="button"
                            onClick={() => copyGoUrl(link.ref_code)}
                            className="inline-flex items-center gap-1 text-zinc-300 hover:text-white cursor-pointer"
                          >
                            {copiedCode === link.ref_code ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" /> Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" /> Copy
                              </>
                            )}
                          </button>
                          {(c.submitted_video_url || link.video_url) && (
                            <a
                              href={c.submitted_video_url || link.video_url || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-emerald-400 hover:underline font-medium"
                            >
                              Watch Reel <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Leader Action Controls (Dual-Gate Enforced!) */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Confirm Product Delivery button (allowed anytime product physically arrives) */}
                    {gates.isPlan2Seller && !gates.sampleDelivered && (
                      <button
                        type="button"
                        disabled={busyId === c.id}
                        onClick={() => handleAccept(c, true)}
                        className="px-3.5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-black text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <PackageCheck className="w-3.5 h-3.5" />
                        <span>Confirm Product Delivered</span>
                      </button>
                    )}

                    {/* Plan 1 Accept button */}
                    {!gates.isPlan2Seller && ["awaiting_review", "awaiting_payment"].includes(c.workflow_status) && (
                      <button
                        type="button"
                        disabled={busyId === c.id}
                        onClick={() => handleAccept(c, false)}
                        className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>
                    )}

                    {["awaiting_review", "awaiting_payment"].includes(c.workflow_status) && (
                      <button
                        type="button"
                        disabled={busyId === c.id}
                        onClick={() => handleReject(c)}
                        className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    )}

                    {/* HARD DUAL-GATE LOCK INDICATOR */}
                    {!gates.canProceed && !expired && c.workflow_status !== "rejected" && (
                      <span
                        title="Media Team cannot assign a creator until BOTH Razorpay ₹150 Payment AND Product Delivery are completed"
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800/80 border border-zinc-700 text-zinc-400 text-[11px] font-semibold"
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                        <span>
                          Locked:{" "}
                          {!gates.paymentPaid && !gates.sampleDelivered
                            ? "Payment + Delivery"
                            : !gates.paymentPaid
                            ? "Payment Pending"
                            : "Awaiting Delivery"}
                        </span>
                      </span>
                    )}

                    {gates.canProceed &&
                      ["accepted", "assigned", "in_production", "revision_needed"].includes(c.workflow_status) && (
                        <button
                          type="button"
                          onClick={() => {
                            setAssignTarget(c);
                            setSelectedCreatorUid(c.assigned_creator_id || creators[0]?.user_id || "");
                            setShootBrief(c.shoot_brief || "");
                          }}
                          className="px-3.5 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>{c.assigned_creator_id ? "Reassign Creator" : "Assign Creator"}</span>
                        </button>
                      )}

                    {gates.canProceed &&
                      (c.workflow_status === "submitted_for_review" ||
                        ["accepted", "assigned", "in_production"].includes(c.workflow_status)) && (
                        <button
                          type="button"
                          onClick={() => {
                            setReviewTarget(c);
                            setPublishedUrl(c.submitted_video_url || link?.video_url || "");
                            setPlatform(link?.platform || "instagram");
                            setAttachVideoProof(c.plan_type === "with_product_150");
                          }}
                          className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>
                            {c.workflow_status === "submitted_for_review"
                              ? "Review & Go Live (7d)"
                              : "Publish & Start 7d"}
                          </span>
                        </button>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ASSIGN CREATOR MODAL */}
        {assignTarget && (
          <div
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setAssignTarget(null)}
          >
            <form
              onSubmit={handleAssignSubmit}
              className="w-full max-w-md rounded-2xl bg-dark-900 border border-dark-800 p-6 space-y-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Assign Alpha Media Creator</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">{assignTarget.product_name}</p>
                </div>
                <button type="button" onClick={() => setAssignTarget(null)} className="text-zinc-400 hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {creators.length === 0 ? (
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                  No active creators found yet. Approve pending creators under Alpha Media Team or create accounts in SuperAdmin.
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Select Creator / Editor (Live Workload Shown)
                  </label>
                  <select
                    required
                    value={selectedCreatorUid}
                    onChange={(e) => setSelectedCreatorUid(e.target.value)}
                    className="w-full px-3 py-2.5 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white"
                  >
                    <option value="">-- Choose Team Member --</option>
                    {creators.map((cr) => (
                      <option key={cr.user_id} value={cr.user_id}>
                        {cr.full_name} ({cr.instagram_handle || cr.role_type}) — {creatorWorkload.get(cr.user_id) || 0} active shoots
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Shoot Deadline</label>
                <select
                  value={deadlineHours}
                  onChange={(e) => setDeadlineHours(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white"
                >
                  <option value="24">24 Hours (Express)</option>
                  <option value="48">48 Hours (Standard)</option>
                  <option value="72">72 Hours (Studio Shoot)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">Shoot Brief / Angle</label>
                <textarea
                  rows={3}
                  value={shootBrief}
                  onChange={(e) => setShootBrief(e.target.value)}
                  placeholder="e.g. Highlight fabric stretch, 15s hook, mention ZebAlpha Cash on Delivery..."
                  className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAssignTarget(null)}
                  className="px-4 py-2 rounded-lg bg-dark-800 text-zinc-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busyId === assignTarget.id || !selectedCreatorUid}
                  className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold disabled:opacity-50 cursor-pointer"
                >
                  Assign Shoot
                </button>
              </div>
            </form>
          </div>
        )}

        {/* REVIEW & GO LIVE MODAL */}
        {reviewTarget && (
          <div
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setReviewTarget(null)}
          >
            <div
              className="w-full max-w-lg rounded-2xl bg-dark-900 border border-dark-800 p-6 space-y-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Approve Reel &amp; Start 7-Day Link</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {reviewTarget.product_name} • Creator: {reviewTarget.assigned_creator_name || "Alpha Studio"}
                  </p>
                </div>
                <button type="button" onClick={() => setReviewTarget(null)} className="text-zinc-400 hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {reviewTarget.submitted_video_url && (
                <div className="p-3 rounded-lg bg-dark-950 border border-dark-800 flex items-center justify-between text-xs">
                  <span className="text-zinc-300 truncate pr-2">
                    Submitted: {reviewTarget.submitted_video_url}
                  </span>
                  <a
                    href={reviewTarget.submitted_video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 font-semibold shrink-0 inline-flex items-center gap-1 hover:underline"
                  >
                    Preview <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Final Published Reel / Post URL (Instagram / YouTube / Facebook)
                </label>
                <input
                  type="url"
                  value={publishedUrl}
                  onChange={(e) => setPublishedUrl(e.target.value)}
                  placeholder="https://www.instagram.com/reel/..."
                  className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Channel Platform</label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white"
                  >
                    <option value="instagram">Instagram Reels</option>
                    <option value="youtube">YouTube Shorts</option>
                    <option value="facebook">Facebook Reels</option>
                    <option value="zebalpha_app">ZebAlpha App</option>
                  </select>
                </div>

                <label className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-dark-950 border border-dark-800 text-xs text-zinc-200 cursor-pointer mt-5 sm:mt-0">
                  <input
                    type="checkbox"
                    checked={attachVideoProof}
                    onChange={(e) => setAttachVideoProof(e.target.checked)}
                    className="accent-emerald-500"
                  />
                  <span>Sync as Product Video Proof</span>
                </label>
              </div>

              <div className="pt-2 border-t border-dark-800">
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Optional Revision Feedback (only if sending back to creator)
                </label>
                <input
                  type="text"
                  value={revisionFeedback}
                  onChange={(e) => setRevisionFeedback(e.target.value)}
                  placeholder="e.g. Make hook louder & add ZebAlpha watermark"
                  className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white"
                />
              </div>

              <div className="flex flex-wrap justify-between gap-2 pt-2">
                <button
                  type="button"
                  disabled={busyId === reviewTarget.id}
                  onClick={() => handleReviewDecision(false)}
                  className="px-3.5 py-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Request Revision</span>
                </button>

                <button
                  type="button"
                  disabled={busyId === reviewTarget.id}
                  onClick={() => handleReviewDecision(true)}
                  className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Approve &amp; Activate 7-Day Link</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CREATE OWN-BRAND SHOOT MODAL */}
        {showOwnBrandModal && (
          <div
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowOwnBrandModal(false)}
          >
            <form
              onSubmit={handleCreateOwnBrand}
              className="w-full max-w-md rounded-2xl bg-dark-900 border border-dark-800 p-6 space-y-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Dispatch ZebAlpha Own-Brand Shoot</h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Create an in-house D2C brand campaign inside the Alpha Media Studio queue.
                  </p>
                </div>
                <button type="button" onClick={() => setShowOwnBrandModal(false)} className="text-zinc-400 hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Select Product *</label>
                <select
                  required
                  value={obProductId}
                  onChange={(e) => setObProductId(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white"
                >
                  <option value="">-- Choose ZebAlpha Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (₹{Number(p.price || 0).toLocaleString("en-IN")})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Immediately Assign Creator (Optional)
                </label>
                <select
                  value={obCreatorUid}
                  onChange={(e) => setObCreatorUid(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white"
                >
                  <option value="">Leave in Accepted Queue</option>
                  {creators.map((cr) => (
                    <option key={cr.user_id} value={cr.user_id}>
                      {cr.full_name} ({cr.instagram_handle || cr.role_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Creative Brief</label>
                <textarea
                  rows={3}
                  value={obBrief}
                  onChange={(e) => setObBrief(e.target.value)}
                  placeholder="e.g. Streetwear lookbook transition reel for @zebalpha_official..."
                  className="w-full px-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOwnBrandModal(false)}
                  className="px-4 py-2 rounded-lg bg-dark-800 text-zinc-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busyId === "own-brand"}
                  className="px-4 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold cursor-pointer"
                >
                  Create Own-Brand Shoot
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
