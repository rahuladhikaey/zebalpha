"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@shared/utils/supabaseClient";
import {
  AlertTriangle,
  CheckCircle2,
  PlayCircle,
  PhoneCall,
  Sparkles,
  Search,
  X,
  Pause,
  Play,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Store,
  Video,
  Megaphone,
  Info,
  Clock,
  RefreshCw,
  ArrowUpRight,
  PackageCheck,
  Flame,
  History,
  CreditCard,
  Lock,
} from "lucide-react";

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (res: unknown) => void) => void;
    };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if (window.Razorpay) return resolve(true);
    const existing = document.getElementById("zebalpha-razorpay-sdk");
    if (existing) {
      existing.addEventListener("load", () => resolve(Boolean(window.Razorpay)));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.id = "zebalpha-razorpay-sdk";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

interface SellerProductOption {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  image_url: string | null;
}

interface EnrollmentRow {
  id: string;
  product_id: string;
  product_name: string;
  product_image: string | null;
  product_price: number;
  plan_type: "without_product_1pct" | "with_product_150";
  commission_rate: number;
  fixed_fee_inr: number;
  payment_method?: string;
  payment_status: string;
  payment_due_at?: string | null;
  pending_payment_amount_inr: number;
  pending_payment_purpose?: "new_shoot_150" | "upgrade_50" | null;
  pending_extension_days: number;
  pending_upgrade_mode?: string | null;
  razorpay_payment_id?: string | null;
  is_payment_pending: boolean;
  is_payment_overdue: boolean;
  dual_gate_ready: boolean;
  sample_status?: string;
  workflow_status?: string;
  effective_status: string;
  effective_workflow: string;
  is_expired: boolean;
  assigned_creator_name?: string | null;
  assigned_creator_handle?: string | null;
  starts_at?: string | null;
  expires_at?: string | null;
  missed_clicks_after_expiry: number;
  renewal_count: number;
  rejection_reason?: string | null;
  max_budget_cap: number | null;
  status: string;
  total_clicks: number;
  total_orders: number;
  delivered_orders: number;
  delivered_gmv: number;
  commission_accrued: number;
  updated_at: string;
}

interface CreatorLinkRow {
  id: string;
  enrollment_id?: string | null;
  product_id: string;
  plan_type?: string;
  creator_name: string;
  creator_handle: string | null;
  platform: string;
  video_url: string | null;
  ref_code: string;
  commission_rate: number;
  clicks: number;
  missed_clicks_after_expiry: number;
  orders: number;
  delivered_orders: number;
  gmv: number;
  status: string;
  effective_status: string;
  is_expired: boolean;
  starts_at?: string | null;
  expires_at?: string | null;
  renewal_count: number;
}

interface AuditLogRow {
  id: string;
  enrollment_id: string | null;
  product_name: string | null;
  event_type: string;
  from_plan: string | null;
  to_plan: string | null;
  fee_charged_inr: number;
  duration_days: number | null;
  actor_role: string | null;
  actor_name: string | null;
  notes: string | null;
  created_at: string;
}

function formatCountdown(targetIso?: string | null, emptyText = "Starts on Media Publish", expiredText = "Expired"): string {
  if (!targetIso) return emptyText;
  const diff = new Date(targetIso).getTime() - Date.now();
  if (Number.isNaN(diff) || diff <= 0) return expiredText;
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  if (days > 0) return `${days}d ${hours}h left`;
  const mins = Math.max(1, Math.floor((diff % 3_600_000) / 60_000));
  return `${hours}h ${mins}m left`;
}

function workflowLabel(wf: string): { label: string; tone: string } {
  switch (wf) {
    case "awaiting_payment":
      return { label: "Payment Pending", tone: "bg-rose-50 text-[#B91C1C] border-rose-200" };
    case "awaiting_review":
      return { label: "In Alpha Media Queue", tone: "bg-amber-50 text-amber-800 border-amber-200" };
    case "accepted":
      return { label: "Ready for Shoot", tone: "bg-sky-50 text-sky-800 border-sky-200" };
    case "assigned":
    case "in_production":
      return { label: "Creator Shooting Reel", tone: "bg-indigo-50 text-indigo-800 border-indigo-200" };
    case "submitted_for_review":
      return { label: "Leader Final Review", tone: "bg-purple-50 text-purple-800 border-purple-200" };
    case "revision_needed":
      return { label: "Editing Adjustments", tone: "bg-orange-50 text-orange-800 border-orange-200" };
    case "live":
      return { label: "7-Day Link LIVE", tone: "bg-emerald-50 text-emerald-800 border-emerald-200" };
    case "expired":
      return { label: "Expired — Deactivated", tone: "bg-[#FFF4F2] text-[#B91C1C] border-rose-200" };
    case "rejected":
      return { label: "Action Needed", tone: "bg-rose-50 text-rose-800 border-rose-200" };
    case "paused":
      return { label: "Paused", tone: "bg-neutral-100 text-neutral-700 border-neutral-200" };
    default:
      return { label: wf.replace(/_/g, " "), tone: "bg-neutral-100 text-neutral-700 border-neutral-200" };
  }
}

export default function InfluencerMarketingPage() {
  const [loading, setLoading] = useState(true);
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [upgradeMigrationRequired, setUpgradeMigrationRequired] = useState(false);
  const [sellerInfo, setSellerInfo] = useState({
    storeName: "Seller",
    phone: "",
    hasUpi: true,
    hasEnrolment: true,
  });
  const [summary, setSummary] = useState({
    activeCatalogs: 0,
    inQueueCatalogs: 0,
    paymentPendingCount: 0,
    paymentOverdueCount: 0,
    expiredCatalogs: 0,
    pausedCatalogs: 0,
    liveVideos: 0,
    totalClicks: 0,
    missedClicks: 0,
    totalOrders: 0,
    deliveredOrders: 0,
    deliveredGmv: 0,
    commissionAccrued: 0,
  });
  const [products, setProducts] = useState<SellerProductOption[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [creatorLinks, setCreatorLinks] = useState<CreatorLinkRow[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);

  const [activeTab, setActiveTab] = useState<"all" | "pending_pay" | "videos" | "expired" | "history">("all");
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  // Modals
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showCallbackModal, setShowCallbackModal] = useState(false);
  const [renewTarget, setRenewTarget] = useState<EnrollmentRow | null>(null);

  // Enrollment Modal State
  const [selectedPlan, setSelectedPlan] = useState<"without_product_1pct" | "with_product_150">(
    "without_product_1pct"
  );
  const [enrollPayTiming, setEnrollPayTiming] = useState<"pay_now" | "pay_within_3_days">("pay_now");
  const [sampleReturnPref, setSampleReturnPref] = useState<"return_after_shoot" | "keep_for_future_shoots">(
    "return_after_shoot"
  );
  const [catalogSearch, setCatalogSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [maxBudgetCap, setMaxBudgetCap] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Renew / Upgrade Modal State (₹50 Flat via Razorpay!)
  const [renewMode, setRenewMode] = useState<"renew" | "upgrade_with_product_150">("renew");
  const [renewDays, setRenewDays] = useState(7);
  const [renewPayTiming, setRenewPayTiming] = useState<"pay_now" | "pay_within_3_days">("pay_now");
  const [renewSubmitting, setRenewSubmitting] = useState(false);

  // Callback Form State
  const [cbPhone, setCbPhone] = useState("");
  const [cbNotes, setCbNotes] = useState("");
  const [cbSubmitting, setCbSubmitting] = useState(false);

  const notify = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 5500);
  };

  const getAuthHeaders = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
    return headers;
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/seller/marketing/influencer", {
        headers,
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (json?.success) {
        setMigrationRequired(Boolean(json.migrationRequired));
        setUpgradeMigrationRequired(Boolean(json.upgradeMigrationRequired));
        if (json.seller) {
          setSellerInfo(json.seller);
          setCbPhone((prev) => prev || json.seller.phone || "");
        }
        if (json.summary) setSummary(json.summary);
        if (Array.isArray(json.products)) setProducts(json.products);
        if (Array.isArray(json.enrollments)) setEnrollments(json.enrollments);
        if (Array.isArray(json.creatorLinks)) setCreatorLinks(json.creatorLinks);
        if (Array.isArray(json.auditLogs)) setAuditLogs(json.auditLogs);
      }
    } catch (err) {
      console.error("[Influencer Marketing] Load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Core Razorpay Checkout Launcher (₹150 New Studio Shoot OR ₹50 Upgrade/Reactivate)
  const launchRazorpayCheckout = async (opts: {
    enrollmentIds: string[];
    purpose: "new_shoot_150" | "upgrade_50";
    durationDays?: number;
    upgradeMode?: "renew" | "upgrade_with_product_150";
    busyKey?: string;
  }) => {
    setPayingId(opts.busyKey || opts.enrollmentIds[0] || "rzp");
    try {
      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded || !window.Razorpay) {
        notify("Could not load Razorpay Checkout SDK. Check your internet and try again.", "error");
        setPayingId(null);
        return;
      }

      const headers = await getAuthHeaders();
      const orderRes = await fetch("/api/seller/marketing/razorpay/create-order", {
        method: "POST",
        headers,
        body: JSON.stringify({
          enrollmentIds: opts.enrollmentIds,
          purpose: opts.purpose,
          durationDays: opts.durationDays || 7,
          upgradeMode: opts.upgradeMode || "renew",
        }),
      });
      const orderJson = await orderRes.json().catch(() => null);
      if (!orderRes.ok || !orderJson?.success) {
        notify(orderJson?.error || "Failed to create Razorpay order.", "error");
        setPayingId(null);
        return;
      }

      const rzp = new window.Razorpay({
        key: orderJson.keyId,
        amount: orderJson.amountPaise,
        currency: orderJson.currency || "INR",
        name: "ZebAlpha Alpha Media",
        description: orderJson.description || "Alpha Media Influencer Promotion",
        order_id: orderJson.orderId,
        prefill: {
          name: orderJson.seller?.name || sellerInfo.storeName,
          email: orderJson.seller?.email || "",
          contact: orderJson.seller?.phone || sellerInfo.phone || "",
        },
        theme: { color: "#F03A46" },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifyHeaders = await getAuthHeaders();
            const verifyRes = await fetch("/api/seller/marketing/razorpay/verify", {
              method: "POST",
              headers: verifyHeaders,
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            const verifyJson = await verifyRes.json().catch(() => null);
            if (!verifyRes.ok || !verifyJson?.success) {
              notify(verifyJson?.error || "Payment signature verification failed.", "error");
            } else {
              notify(verifyJson.message || "Razorpay payment verified successfully!");
              setShowSelectModal(false);
              setRenewTarget(null);
              setSelectedIds([]);
              await loadData();
            }
          } catch {
            notify("Network error verifying Razorpay payment.", "error");
          } finally {
            setPayingId(null);
          }
        },
        modal: {
          ondismiss: () => {
            setPayingId(null);
            notify(
              "Razorpay popup closed — campaign is safely saved as Payment Pending (complete within 3 days).",
              "error"
            );
            loadData();
          },
        },
      });

      rzp.on("payment.failed", () => {
        setPayingId(null);
        notify("Razorpay payment failed. Campaign remains saved under Payment Pending (3-day window).", "error");
        loadData();
      });

      rzp.open();
    } catch {
      setPayingId(null);
      notify("Error initializing Razorpay Checkout.", "error");
    }
  };

  const openEnrollWithPlan = (plan: "without_product_1pct" | "with_product_150") => {
    setSelectedPlan(plan);
    setEnrollPayTiming("pay_now");
    setShowSelectModal(true);
  };

  const openRenewModal = (row: EnrollmentRow, defaultMode?: "renew" | "upgrade_with_product_150") => {
    setRenewTarget(row);
    setRenewMode(defaultMode || "renew");
    setRenewDays(7);
    setRenewPayTiming("pay_now");
  };

  const enrolledMap = useMemo(() => {
    const map = new Map<string, EnrollmentRow>();
    enrollments.forEach((e) => map.set(e.product_id, e));
    return map;
  }, [enrollments]);

  const filteredModalProducts = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    return products.filter(
      (p) => !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    );
  }, [products, catalogSearch]);

  const toggleProductSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleEnrollSubmit = async () => {
    if (selectedIds.length === 0) {
      notify("Please select at least 1 catalog first.", "error");
      return;
    }
    setSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/seller/marketing/influencer", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "enroll_catalogs",
          productIds: selectedIds,
          planType: selectedPlan,
          paymentTiming: enrollPayTiming,
          sampleReturnPreference: sampleReturnPref,
          maxBudgetCap: maxBudgetCap.trim() ? Number(maxBudgetCap) : null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        notify(json?.error || "Failed to enroll catalogs.", "error");
        return;
      }

      if (json.requiresRazorpayNow && Array.isArray(json.createdEnrollmentIds) && json.createdEnrollmentIds.length > 0) {
        setSubmitting(false);
        await launchRazorpayCheckout({
          enrollmentIds: json.createdEnrollmentIds,
          purpose: "new_shoot_150",
          durationDays: 7,
          busyKey: "enroll-now",
        });
        return;
      }

      notify(json.message || "Catalogs enrolled!");
      setShowSelectModal(false);
      setSelectedIds([]);
      await loadData();
    } catch {
      notify("Network error while enrolling catalogs.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRenewUpgradeSubmit = async () => {
    if (!renewTarget) return;

    // Option 1: Pay ₹50 Now via Razorpay (Instant reactivation on verify!)
    if (renewPayTiming === "pay_now") {
      await launchRazorpayCheckout({
        enrollmentIds: [renewTarget.id],
        purpose: "upgrade_50",
        durationDays: renewDays,
        upgradeMode: renewMode,
        busyKey: renewTarget.id,
      });
      return;
    }

    // Option 2: Pay ₹50 Within 3 Days (Saved as Payment Pending — activates once paid!)
    setRenewSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/seller/marketing/influencer", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "schedule_upgrade_pay_later",
          enrollmentId: renewTarget.id,
          mode: renewMode,
          durationDays: renewDays,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        notify(json?.error || "Failed to save ₹50 upgrade request.", "error");
        return;
      }
      notify(json.message || "Saved as Payment Pending (Pay ₹50 via Razorpay within 3 days).");
      setRenewTarget(null);
      await loadData();
    } catch {
      notify("Network error saving upgrade.", "error");
    } finally {
      setRenewSubmitting(false);
    }
  };

  const handlePayPendingRow = async (row: EnrollmentRow) => {
    const purpose =
      row.pending_payment_purpose === "upgrade_50" || Number(row.pending_payment_amount_inr) === 50
        ? "upgrade_50"
        : "new_shoot_150";
    await launchRazorpayCheckout({
      enrollmentIds: [row.id],
      purpose,
      durationDays: row.pending_extension_days || 7,
      upgradeMode:
        row.pending_upgrade_mode === "upgrade_with_product_150"
          ? "upgrade_with_product_150"
          : "renew",
      busyKey: row.id,
    });
  };

  const handleToggleStatus = async (row: EnrollmentRow) => {
    const nextStatus = row.effective_status === "active" ? "paused" : "active";
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/seller/marketing/influencer", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "update_enrollment",
          enrollmentId: row.id,
          status: nextStatus,
        }),
      });
      const json = await res.json();
      if (json.success) {
        notify(`Campaign ${nextStatus === "active" ? "resumed" : "paused"}.`);
        await loadData();
      } else {
        notify(json.error || "Update failed", "error");
      }
    } catch {
      notify("Failed to update enrollment.", "error");
    }
  };

  const handleCallbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCbSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/seller/marketing/influencer", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "request_callback",
          phone: cbPhone,
          notes: cbNotes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        notify(json.message);
        setShowCallbackModal(false);
        setCbNotes("");
      } else {
        notify(json.error || "Failed to submit callback request.", "error");
      }
    } catch {
      notify("Network error submitting callback.", "error");
    } finally {
      setCbSubmitting(false);
    }
  };

  const copyGoLink = (refCode: string) => {
    const url = `https://zebalpha.shop/go/${encodeURIComponent(refCode)}`;
    navigator.clipboard?.writeText(url);
    setCopiedCode(refCode);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const visibleEnrollments = useMemo(() => {
    if (activeTab === "pending_pay") {
      return enrollments.filter((e) => e.is_payment_pending);
    }
    if (activeTab === "expired") {
      return enrollments.filter((e) => e.effective_status === "expired");
    }
    return enrollments;
  }, [enrollments, activeTab]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 animate-pulse">
        <div className="h-10 w-72 rounded-xl bg-[#F3E6C5]" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-56 rounded-3xl bg-white border border-[#EAD296]" />
          <div className="h-56 rounded-3xl bg-white border border-[#EAD296]" />
        </div>
        <div className="h-64 rounded-3xl bg-white border border-[#EAD296]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-20 relative">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl border px-5 py-3.5 text-xs font-black shadow-xl ${
            toast.type === "error"
              ? "border-rose-300 bg-[#FFF4F2] text-[#991B1B]"
              : "border-emerald-300 bg-emerald-50 text-emerald-900"
          }`}
        >
          {toast.type === "error" ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Migration Notice */}
      {(migrationRequired || upgradeMigrationRequired) && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-[#FFF8DB] px-5 py-3.5 text-xs font-bold text-[#6E4900]">
          <Info size={16} className="mt-0.5 shrink-0 text-[#B45309]" />
          <span>
            Run{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px]">
              supabase/upgrade_alpha_media_razorpay_and_dualgate.sql
            </code>{" "}
            in Supabase SQL Editor to enable Razorpay ₹150/₹50 checkout, 3-day payment deadlines, and Dual-Gate Media locking.
          </span>
        </div>
      )}

      {/* PAYMENT PENDING ALERT BANNER */}
      {summary.paymentPendingCount > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border-2 border-amber-400 bg-gradient-to-r from-[#FFF8DB] via-[#FFFDF8] to-[#FFF4F2] px-5 py-4 shadow-sm">
          <div className="flex items-start gap-3">
            <CreditCard size={20} className="mt-0.5 text-[#B45309] shrink-0" />
            <div>
              <p className="text-sm font-black text-[#92400E]">
                {summary.paymentPendingCount} campaign{summary.paymentPendingCount > 1 ? "s have" : " has"} Payment Pending
                {summary.paymentOverdueCount > 0 && (
                  <span className="ml-2 rounded-full bg-[#F03A46] px-2 py-0.5 text-[10px] text-white">
                    {summary.paymentOverdueCount} Overdue (&gt;3 Days)
                  </span>
                )}
              </p>
              <p className="text-xs font-semibold text-[#5C4E35] mt-0.5">
                Complete your Razorpay payment within 3 days (plus product delivery for ₹150 studio shoots) so Alpha Media can proceed!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab("pending_pay")}
            data-photo-overlay="true"
            className="shrink-0 rounded-xl bg-[#F03A46] px-4 py-2.5 text-xs font-black text-white shadow-md hover:brightness-105 cursor-pointer"
          >
            Pay Pending Now ({summary.paymentPendingCount})
          </button>
        </div>
      )}

      {/* Missed Clicks FOMO Alert Banner */}
      {summary.missedClicks > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-rose-300 bg-gradient-to-r from-[#FFF1F2] via-[#FFF8F6] to-[#FFFDF8] px-5 py-4 shadow-sm">
          <div className="flex items-start gap-3">
            <Flame size={20} className="mt-0.5 text-[#F03A46] shrink-0" />
            <div>
              <p className="text-sm font-black text-[#991B1B]">
                {summary.missedClicks} customer click{summary.missedClicks > 1 ? "s" : ""} arrived after your 7-day link expired!
              </p>
              <p className="text-xs font-semibold text-[#5C4E35]">
                Reactivate / Upgrade for just <strong>₹50 via Razorpay</strong> — your exact same <code className="font-mono font-black">/go/INF-...</code> link becomes live immediately!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab("expired")}
            data-photo-overlay="true"
            className="shrink-0 rounded-xl bg-[#F03A46] px-4 py-2.5 text-xs font-black text-white shadow-md hover:brightness-105 cursor-pointer"
          >
            Reactivate for ₹50 ({summary.expiredCatalogs})
          </button>
        </div>
      )}

      {/* 1. HEADER ROW */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-[#DFBE6F] bg-[#FFF8DB] px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#9A6503] mb-2">
            <Megaphone size={11} /> Powered by In-House Alpha Media Team
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#14120F]">
            Alpha Media Influencer Marketing
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-semibold text-[#6E5C3D]">
            Guaranteed in-house reels with 7-day smart links — new studio shoot ₹150, future reactivations/upgrades just ₹50 via Razorpay!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setShowHowItWorks(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-[#EAD296] bg-white px-4 py-2.5 text-xs font-black text-[#14120F] hover:border-[#F03A46] hover:bg-[#FFF4F2] transition-all cursor-pointer"
          >
            <PlayCircle size={17} className="text-[#F03A46]" />
            <span>How it Works?</span>
          </button>

          <button
            type="button"
            onClick={() => openEnrollWithPlan("without_product_1pct")}
            data-photo-overlay="true"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#F03A46] to-[#FF5757] px-5 py-2.5 text-xs font-black text-white shadow-[0_8px_20px_rgba(240,58,70,0.28)] hover:brightness-105 transition-all cursor-pointer"
          >
            <span>+ Enroll Catalogs</span>
          </button>
        </div>
      </div>

      {/* 2. TWO-PLAN SIDE-BY-SIDE COMPARISON HERO */}
      <section className="grid gap-5 lg:grid-cols-2">
        {/* PLAN 1: WITHOUT PRODUCT + 1% (7 DAYS) */}
        <div className="flex flex-col justify-between rounded-[1.75rem] border border-[#EAD296] bg-white p-6 sm:p-7 shadow-[0_12px_30px_rgba(166,124,28,0.08)]">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-800">
                Plan 1 • Zero Upfront Risk
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-black text-[#9A6503]">
                <Clock size={13} /> 7-Day Active Link
              </span>
            </div>

            <h2 className="mt-4 text-xl sm:text-2xl font-black text-[#14120F]">
              Without Product + <span className="text-[#F03A46]">1% Commission</span>
            </h2>
            <p className="mt-1.5 text-xs font-semibold text-[#6E5C3D]">
              No sample shipping needed. Alpha Media Team edits a promo reel using your catalog photos &amp; details.
            </p>

            <ul className="mt-5 space-y-2.5 text-xs font-bold text-[#14120F]">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                <span>
                  <strong>₹0 Upfront Fee:</strong> Pay 1% strictly on verified delivered orders (₹0 on cancels/RTO).
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                <span>
                  <strong>7-Day Clock Starts on Publish:</strong> Full 168 hours from when Media Leader publishes your reel.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
                <span>
                  <strong>Just ₹50 to Reactivate / Upgrade Anytime:</strong> Pay ₹50 via Razorpay after 7 days to instantly unlock the same link!
                </span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-[#F0E2BE] flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-black text-[#14120F]">₹0 upfront</p>
              <p className="text-[11px] font-bold text-[#7A6847]">+ 1% on delivered • ₹50 future upgrade</p>
            </div>
            <button
              type="button"
              onClick={() => openEnrollWithPlan("without_product_1pct")}
              className="rounded-xl border-2 border-[#14120F] bg-[#14120F] px-5 py-2.5 text-xs font-black text-white hover:bg-[#2C241B] transition-all cursor-pointer"
            >
              Start Without Product →
            </button>
          </div>
        </div>

        {/* PLAN 2: WITH PRODUCT + ₹150 (7 DAYS) */}
        <div className="relative overflow-hidden flex flex-col justify-between rounded-[1.75rem] border-2 border-[#F03A46]/60 bg-gradient-to-br from-[#FFFDF8] via-white to-[#FFF4F2] p-6 sm:p-7 shadow-[0_14px_36px_rgba(240,58,70,0.12)]">
          <div>
            <div className="flex items-center justify-between gap-2">
              <span
                data-photo-overlay="true"
                className="rounded-full bg-[#F03A46] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white"
              >
                Plan 2 • Alpha Studio Hero
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-black text-[#F03A46]">
                <Video size={13} /> Real Studio Shoot + 7 Days
              </span>
            </div>

            <h2 className="mt-4 text-xl sm:text-2xl font-black text-[#14120F]">
              With Product + <span className="text-[#F03A46]">₹150 Flat</span>
            </h2>
            <p className="mt-1.5 text-xs font-semibold text-[#6E5C3D]">
              Send your physical product sample to Alpha Studio — our in-house creators shoot a real try-on / unboxing reel &amp; attach it directly to your product page!
            </p>

            <ul className="mt-5 space-y-2.5 text-xs font-bold text-[#14120F]">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#F03A46]" />
                <span>
                  <strong>Pay ₹150 via Razorpay:</strong> Choose <em>Pay Now</em> or <em>Pay Within 3 Days</em> — Media Team proceeds once <strong>Product Delivered + Payment Complete</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#F03A46]" />
                <span>
                  <strong>Auto Product Video Proof:</strong> Reel auto-attaches to your product page to boost conversions &amp; cut returns.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#F03A46]" />
                <span>
                  <strong>0% Extra Commission + ₹50 Future Renewal:</strong> Never pay ₹150 again for the same reel — renew/reactivate anytime for just <strong>₹50</strong>!
                </span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-[#F0E2BE] flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-black text-[#14120F]">₹150 flat (Razorpay)</p>
              <p className="text-[11px] font-bold text-emerald-700">Pay Now or within 3 days • ₹50 renewals</p>
            </div>
            <button
              type="button"
              onClick={() => openEnrollWithPlan("with_product_150")}
              data-photo-overlay="true"
              className="rounded-xl bg-gradient-to-r from-[#F03A46] to-[#FF5757] px-5 py-2.5 text-xs font-black text-white shadow-[0_8px_20px_rgba(240,58,70,0.3)] hover:brightness-105 transition-all cursor-pointer"
            >
              Book Studio Shoot (₹150) →
            </button>
          </div>
        </div>
      </section>

      {/* 3. LIVE PERFORMANCE KPI STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {[
          { label: "Live 7-Day Links", value: summary.activeCatalogs },
          { label: "Payment Pending", value: summary.paymentPendingCount, accent: summary.paymentPendingCount > 0 },
          { label: "In Media Queue", value: summary.inQueueCatalogs },
          { label: "Active Clicks", value: summary.totalClicks },
          { label: "Missed After Expiry", value: summary.missedClicks, accent: summary.missedClicks > 0 },
          { label: "Delivered GMV", value: `₹${summary.deliveredGmv.toLocaleString("en-IN")}` },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className={`rounded-2xl border p-4 shadow-sm ${
              kpi.accent ? "border-rose-300 bg-[#FFF4F2]" : "border-[#EAD296] bg-white"
            }`}
          >
            <p className="text-[10px] font-black uppercase tracking-wider text-[#7A6847]">
              {kpi.label}
            </p>
            <p className={`mt-1.5 text-xl font-black ${kpi.accent ? "text-[#F03A46]" : "text-[#14120F]"}`}>
              {kpi.value}
            </p>
          </div>
        ))}
      </div>

      {/* 4. CAMPAIGNS, LINKS & SAVED HISTORY TABLE */}
      <section className="overflow-hidden rounded-[1.5rem] border border-[#EAD296] bg-white shadow-[0_10px_28px_rgba(166,124,28,0.07)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0E2BE] px-6 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: "all" as const, label: `All Campaigns (${enrollments.length})` },
              { key: "pending_pay" as const, label: `Payment Pending (${summary.paymentPendingCount})` },
              { key: "videos" as const, label: `Smart 7-Day Links (${creatorLinks.length})` },
              { key: "expired" as const, label: `Expired / ₹50 Renew (${summary.expiredCatalogs})` },
              { key: "history" as const, label: `Saved Activity (${auditLogs.length})` },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={`border-b-[3px] px-3 py-3 text-xs sm:text-sm transition-all cursor-pointer ${
                  activeTab === t.key
                    ? "border-[#F03A46] font-black text-[#F03A46]"
                    : "border-transparent font-bold text-[#6E5C3D] hover:text-[#14120F]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/dashboard/marketing/branding"
              className="rounded-xl border border-[#EAD296] bg-[#FFF8DB] px-3 py-1.5 text-[11px] font-black text-[#9A6503] hover:border-[#F03A46]"
            >
              <Sparkles size={11} className="inline mr-1" />
              App Branding
            </Link>
            <button
              type="button"
              onClick={() => openEnrollWithPlan("with_product_150")}
              className="rounded-xl border border-[#DFBE6F] bg-[#FFFDF8] px-3.5 py-1.5 text-xs font-black text-[#9A6503] hover:border-[#F03A46] hover:text-[#F03A46] cursor-pointer"
            >
              + Add Catalogs
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {activeTab === "videos" ? (
            creatorLinks.length === 0 ? (
              <div className="py-12 text-center px-6">
                <p className="text-sm font-black text-[#14120F]">No smart tracking links yet</p>
                <p className="mt-1 text-xs font-semibold text-[#6E5C3D]">
                  Enroll a catalog in Plan 1 or Plan 2 to get your reusable <code className="font-mono">zebalpha.shop/go/INF-...</code> link.
                </p>
              </div>
            ) : (
              <table className="w-full min-w-[780px] text-left text-xs">
                <thead>
                  <tr className="border-b border-[#EAD296] bg-[#FFF8EB] text-[11px] font-black uppercase tracking-wider text-[#5C4E35]">
                    <th className="px-6 py-3.5">Creator &amp; Plan</th>
                    <th className="px-5 py-3.5">Smart 7-Day Link</th>
                    <th className="px-5 py-3.5">Countdown</th>
                    <th className="px-5 py-3.5">Clicks / Missed</th>
                    <th className="px-5 py-3.5">Reel Video</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0E2BE]">
                  {creatorLinks.map((lnk) => {
                    const parentEnr = enrollments.find(
                      (e) => e.id === lnk.enrollment_id || e.product_id === lnk.product_id
                    );
                    return (
                      <tr key={lnk.id} className="hover:bg-[#FFFDF8]">
                        <td className="px-6 py-4">
                          <p className="font-black text-[#14120F]">{lnk.creator_name}</p>
                          <p className="text-[11px] font-semibold text-[#7A6847]">
                            {lnk.creator_handle || lnk.platform} •{" "}
                            {lnk.plan_type === "with_product_150" ? "With Product (₹150)" : "Without Product (1%)"}
                          </p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-mono font-black text-[#9A6503]">/go/{lnk.ref_code}</p>
                          <span
                            className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-black uppercase ${
                              lnk.effective_status === "active"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : lnk.effective_status === "expired"
                                ? "bg-[#FFF4F2] text-[#B91C1C] border-rose-200"
                                : "bg-amber-50 text-amber-800 border-amber-200"
                            }`}
                          >
                            {lnk.effective_status}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-bold text-[#14120F]">
                          {formatCountdown(lnk.expires_at, "Starts on Media Publish", "Expired — Deactivated")}
                          {lnk.renewal_count > 0 && (
                            <p className="text-[10px] text-emerald-700">Renewed {lnk.renewal_count}×</p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-black text-[#14120F]">
                            {lnk.clicks} clicks • {lnk.orders} orders
                          </p>
                          {lnk.missed_clicks_after_expiry > 0 && (
                            <p className="text-[11px] font-black text-[#F03A46]">
                              🔥 {lnk.missed_clicks_after_expiry} missed after expiry
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {lnk.video_url ? (
                            <a
                              href={lnk.video_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-black text-[#F03A46] hover:underline"
                            >
                              Watch Reel <ExternalLink size={12} />
                            </a>
                          ) : (
                            <span className="text-[11px] font-semibold text-[#7A6847]">
                              In Alpha Media Studio
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => copyGoLink(lnk.ref_code)}
                              className="inline-flex items-center gap-1 rounded-xl border border-[#DFBE6F] bg-[#FFFDF8] px-3 py-1.5 text-[11px] font-black text-[#14120F] hover:border-[#F03A46] cursor-pointer"
                            >
                              {copiedCode === lnk.ref_code ? (
                                <>
                                  <Check size={12} className="text-emerald-600" /> Copied
                                </>
                              ) : (
                                <>
                                  <Copy size={12} /> Copy /go/
                                </>
                              )}
                            </button>
                            {parentEnr && (
                              <button
                                type="button"
                                onClick={() => openRenewModal(parentEnr)}
                                data-photo-overlay="true"
                                className="inline-flex items-center gap-1 rounded-xl bg-[#F03A46] px-3 py-1.5 text-[11px] font-black text-white hover:brightness-105 cursor-pointer"
                              >
                                <RefreshCw size={11} />
                                {lnk.is_expired ? "Reactivate ₹50" : "Extend ₹50"}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          ) : activeTab === "history" ? (
            auditLogs.length === 0 ? (
              <div className="py-12 text-center px-6">
                <p className="text-sm font-black text-[#14120F]">No campaign timeline events yet</p>
                <p className="mt-1 text-xs font-semibold text-[#6E5C3D]">
                  Every enrollment, Razorpay payment ID, sample delivery, publish, and ₹50 upgrade is permanently saved here.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#F0E2BE]">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 hover:bg-[#FFFDF8]">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#FFF8DB] border border-[#EAD296] text-[#9A6503]">
                        <History size={14} />
                      </div>
                      <div>
                        <p className="text-xs font-black text-[#14120F]">
                          <span className="uppercase text-[#F03A46] mr-1.5">
                            {log.event_type.replace(/_/g, " ")}
                          </span>
                          {log.product_name || "Catalog"}
                          {Number(log.fee_charged_inr || 0) > 0 && (
                            <span className="ml-2 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] text-emerald-800">
                              ₹{log.fee_charged_inr} Paid
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] font-semibold text-[#5C4E35] mt-0.5">
                          {log.notes || "Workflow updated"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-[11px] font-bold text-[#7A6847]">
                      <p>{log.actor_name || log.actor_role || "System"}</p>
                      <p>{new Date(log.created_at).toLocaleString("en-IN")}</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : visibleEnrollments.length === 0 ? (
            <div className="py-12 text-center px-6">
              <p className="text-sm font-black text-[#14120F]">
                {activeTab === "pending_pay"
                  ? "No pending Razorpay payments!"
                  : activeTab === "expired"
                  ? "No expired influencer links right now!"
                  : "No catalogs enrolled in Alpha Media Influencer Marketing yet"}
              </p>
              <p className="mt-1 text-xs font-semibold text-[#6E5C3D]">
                Pick Plan 1 (Without Product + 1%) or Plan 2 (With Product + ₹150 via Razorpay) above.
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[860px] text-left text-xs">
              <thead>
                <tr className="border-b border-[#EAD296] bg-[#FFF8EB] text-[11px] font-black uppercase tracking-wider text-[#5C4E35]">
                  <th className="px-6 py-3.5">Catalog &amp; Plan</th>
                  <th className="px-5 py-3.5">Payment &amp; Delivery Gates</th>
                  <th className="px-5 py-3.5">7-Day Window</th>
                  <th className="px-5 py-3.5">Clicks / Orders</th>
                  <th className="px-5 py-3.5 text-right">Pay / Upgrade (₹50)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E2BE]">
                {visibleEnrollments.map((row) => {
                  const badge = workflowLabel(row.effective_workflow);
                  const pendingAmt =
                    row.pending_payment_amount_inr ||
                    (row.pending_payment_purpose === "upgrade_50" ? 50 : 150);
                  const sampleDelivered = [
                    "sample_received",
                    "in_shoot",
                    "shoot_completed",
                    "kept_at_studio",
                  ].includes(String(row.sample_status || ""));

                  return (
                    <tr key={row.id} className="hover:bg-[#FFFDF8]">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[#EAD296] bg-[#FFF8DB]">
                            {row.product_image ? (
                              <img src={row.product_image} alt={row.product_name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[#9A6503]">
                                <Store size={18} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-[#14120F] line-clamp-1">{row.product_name}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              <span
                                className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${
                                  row.plan_type === "with_product_150"
                                    ? "border-rose-200 bg-[#FFF4F2] text-[#F03A46]"
                                    : "border-emerald-200 bg-emerald-50 text-emerald-800"
                                }`}
                              >
                                {row.plan_type === "with_product_150"
                                  ? "With Product + ₹150"
                                  : `Without Product + ${row.commission_rate}%`}
                              </span>
                              <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-black ${badge.tone}`}>
                                {badge.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 space-y-1">
                        {/* Payment Gate Badge */}
                        {row.is_payment_pending ? (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-black ${
                              row.is_payment_overdue
                                ? "border-rose-300 bg-rose-50 text-[#B91C1C]"
                                : "border-amber-300 bg-[#FFF8DB] text-[#92400E]"
                            }`}
                          >
                            <CreditCard size={10} />
                            {row.is_payment_overdue
                              ? `Payment Pending ₹${pendingAmt} • Overdue (>3d)`
                              : `Payment Pending ₹${pendingAmt} • ${formatCountdown(row.payment_due_at, "3 days", "Overdue")}`}
                          </span>
                        ) : row.payment_status === "paid" ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black text-emerald-800">
                            <CheckCircle2 size={10} /> Razorpay Paid
                            {row.razorpay_payment_id ? ` (${row.razorpay_payment_id.slice(-6)})` : ""}
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold text-[#7A6847]">1% Delivered Comm.</span>
                        )}

                        {/* Product Delivery Gate (for Plan 2) */}
                        {row.plan_type === "with_product_150" && (
                          <div>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${
                                sampleDelivered
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                  : "border-[#EAD296] bg-[#FFF8DB] text-[#9A6503]"
                              }`}
                            >
                              <PackageCheck size={10} />
                              {sampleDelivered ? "Product Delivered to Studio" : "Send Product Sample"}
                            </span>
                            {!row.dual_gate_ready && (
                              <p className="text-[10px] font-bold text-[#7A6847] mt-0.5 flex items-center gap-1">
                                <Lock size={9} /> Media proceeds after Payment + Delivery
                              </p>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <p className={`font-black ${row.is_expired ? "text-[#F03A46]" : "text-[#14120F]"}`}>
                          {formatCountdown(row.expires_at, "Starts on Media Publish", "Expired — Deactivated")}
                        </p>
                        {row.missed_clicks_after_expiry > 0 && (
                          <p className="mt-0.5 text-[11px] font-black text-[#F03A46]">
                            🔥 {row.missed_clicks_after_expiry} missed clicks!
                          </p>
                        )}
                      </td>

                      <td className="px-5 py-4 font-extrabold text-[#14120F]">
                        {row.total_clicks} clicks • {row.delivered_orders}/{row.total_orders} orders
                        <p className="text-[11px] font-bold text-[#7A6847]">
                          GMV ₹{Number(row.delivered_gmv || 0).toLocaleString("en-IN")}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex flex-wrap items-center justify-end gap-2">
                          {row.is_payment_pending ? (
                            <button
                              type="button"
                              disabled={payingId === row.id}
                              onClick={() => handlePayPendingRow(row)}
                              data-photo-overlay="true"
                              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#F03A46] to-[#FF5757] px-3.5 py-2 text-[11px] font-black text-white shadow-md hover:brightness-105 disabled:opacity-60 cursor-pointer"
                            >
                              <CreditCard size={12} />
                              {payingId === row.id ? "Opening..." : `Pay ₹${pendingAmt} (Razorpay)`}
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => openRenewModal(row, "renew")}
                                data-photo-overlay={row.is_expired ? "true" : undefined}
                                className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-[11px] font-black cursor-pointer ${
                                  row.is_expired
                                    ? "bg-gradient-to-r from-[#F03A46] to-[#FF5757] text-white shadow-sm"
                                    : "border border-[#DFBE6F] bg-[#FFFDF8] text-[#14120F] hover:border-[#F03A46]"
                                }`}
                              >
                                <RefreshCw size={11} />
                                {row.is_expired ? "Reactivate ₹50" : "Upgrade ₹50"}
                              </button>

                              {row.plan_type === "without_product_1pct" && (
                                <button
                                  type="button"
                                  onClick={() => openRenewModal(row, "upgrade_with_product_150")}
                                  className="inline-flex items-center gap-1 rounded-xl border border-[#F03A46]/40 bg-[#FFF4F2] px-3 py-1.5 text-[11px] font-black text-[#F03A46] hover:bg-[#F03A46] hover:text-white transition-all cursor-pointer"
                                >
                                  <ArrowUpRight size={12} /> Studio ₹50
                                </button>
                              )}
                            </>
                          )}

                          {row.effective_status === "active" || row.effective_status === "paused" ? (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(row)}
                              title={row.effective_status === "active" ? "Pause" : "Resume"}
                              className="rounded-xl border border-[#EAD296] bg-white p-1.5 text-[#5C4E35] hover:text-[#F03A46] cursor-pointer"
                            >
                              {row.effective_status === "active" ? <Pause size={13} /> : <Play size={13} />}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* FLOATING REQUEST CALLBACK PILL */}
      <button
        type="button"
        onClick={() => setShowCallbackModal(true)}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full border border-[#DFBE6F] bg-white px-5 py-3 text-xs font-black text-[#14120F] shadow-[0_12px_32px_rgba(166,124,28,0.22)] hover:border-[#F03A46] hover:text-[#F03A46] transition-all cursor-pointer"
      >
        <PhoneCall size={15} className="text-[#F03A46]" />
        <span>Request Alpha Media Callback</span>
      </button>

      {/* ENROLL CATALOGS MODAL (2 PLANS + DUAL PAYMENT TIMING FOR PLAN 2) */}
      {showSelectModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          onClick={() => setShowSelectModal(false)}
        >
          <div
            className="w-full max-w-2xl rounded-[2rem] border border-[#EAD296] bg-white p-6 sm:p-8 shadow-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#F0E2BE] pb-4">
              <div>
                <h3 className="text-xl font-black text-[#14120F]">
                  Launch 7-Day Alpha Media Influencer Campaign
                </h3>
                <p className="mt-0.5 text-xs font-semibold text-[#6E5C3D]">
                  Choose your plan &amp; payment timing. For ₹150 studio shoots, Alpha Media proceeds once Product Delivery + Razorpay Payment are both complete.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSelectModal(false)}
                className="rounded-xl border border-[#EAD296] bg-[#FFFDF8] p-2 text-[#5C4E35] hover:text-[#F03A46] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Plan Toggle */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setSelectedPlan("without_product_1pct")}
                className={`rounded-2xl border-2 p-3.5 text-left transition-all cursor-pointer ${
                  selectedPlan === "without_product_1pct"
                    ? "border-[#F03A46] bg-[#FFF4F2]/60"
                    : "border-[#EAD296] bg-[#FFFDF8]"
                }`}
              >
                <p className="text-xs font-black text-[#14120F]">Plan 1: Without Product + 1%</p>
                <p className="mt-0.5 text-[11px] font-semibold text-[#6E5C3D]">
                  ₹0 upfront • No sample needed • 7-day active link
                </p>
              </button>
              <button
                type="button"
                onClick={() => setSelectedPlan("with_product_150")}
                className={`rounded-2xl border-2 p-3.5 text-left transition-all cursor-pointer ${
                  selectedPlan === "with_product_150"
                    ? "border-[#F03A46] bg-[#FFF4F2]/60"
                    : "border-[#EAD296] bg-[#FFFDF8]"
                }`}
              >
                <p className="text-xs font-black text-[#14120F]">Plan 2: With Product + ₹150 (Razorpay)</p>
                <p className="mt-0.5 text-[11px] font-semibold text-[#6E5C3D]">
                  Real Alpha Studio shoot + PDP Video Proof • 0% comm
                </p>
              </button>
            </div>

            {/* Plan-specific options */}
            {selectedPlan === "with_product_150" ? (
              <div className="mt-4 space-y-3 rounded-2xl border border-[#F0E2BE] bg-[#FFFDF8] p-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#5C4E35] mb-2">
                    Choose ₹150 Razorpay Payment Option (per catalog)
                  </label>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setEnrollPayTiming("pay_now")}
                      className={`rounded-xl border-2 p-3 text-left transition-all cursor-pointer ${
                        enrollPayTiming === "pay_now"
                          ? "border-[#F03A46] bg-white shadow-sm"
                          : "border-[#EAD296] bg-[#FFFDF8]"
                      }`}
                    >
                      <p className="text-xs font-black text-[#14120F] flex items-center gap-1.5">
                        <CreditCard size={13} className="text-[#F03A46]" /> Pay Now via Razorpay
                      </p>
                      <p className="text-[11px] font-semibold text-[#6E5C3D] mt-0.5">
                        UPI / GPay / PhonePe / Card — instant verification
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEnrollPayTiming("pay_within_3_days")}
                      className={`rounded-xl border-2 p-3 text-left transition-all cursor-pointer ${
                        enrollPayTiming === "pay_within_3_days"
                          ? "border-[#F03A46] bg-white shadow-sm"
                          : "border-[#EAD296] bg-[#FFFDF8]"
                      }`}
                    >
                      <p className="text-xs font-black text-[#14120F] flex items-center gap-1.5">
                        <Clock size={13} className="text-[#9A6503]" /> Pay Within 3 Days (Razorpay)
                      </p>
                      <p className="text-[11px] font-semibold text-[#6E5C3D] mt-0.5">
                        Shows Payment Pending until paid; Media starts after Payment + Delivery
                      </p>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#5C4E35] mb-1">
                    Sample Product Handling
                  </label>
                  <select
                    value={sampleReturnPref}
                    onChange={(e) =>
                      setSampleReturnPref(e.target.value as "return_after_shoot" | "keep_for_future_shoots")
                    }
                    className="w-full rounded-xl border border-[#EAD296] bg-white px-3 py-2 text-xs font-bold"
                  >
                    <option value="return_after_shoot">Return Sample to Seller after Shoot</option>
                    <option value="keep_for_future_shoots">Keep at Alpha Studio for Future Reels</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="mt-4">
                <label className="block text-[10px] font-black uppercase tracking-wider text-[#5C4E35] mb-1">
                  Optional Commission Cap (₹) — Fixed 1% on Verified Delivered Orders
                </label>
                <input
                  type="number"
                  min="100"
                  placeholder="No limit (e.g. 2000)"
                  value={maxBudgetCap}
                  onChange={(e) => setMaxBudgetCap(e.target.value)}
                  className="w-full rounded-xl border border-[#EAD296] px-3.5 py-2 text-xs font-bold"
                />
              </div>
            )}

            {/* Search Catalogs */}
            <div className="relative mt-4">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9A6503]" />
              <input
                type="text"
                value={catalogSearch}
                onChange={(e) => setCatalogSearch(e.target.value)}
                placeholder="Search your live products by title or SKU..."
                className="w-full rounded-xl border border-[#EAD296] py-2.5 pl-10 pr-4 text-xs font-bold"
              />
            </div>

            {/* Product List */}
            <div className="mt-3 flex-1 overflow-y-auto space-y-2 pr-1">
              {filteredModalProducts.length === 0 ? (
                <div className="py-10 text-center text-xs font-bold text-[#6E5C3D]">
                  No live products found. Upload products under Products first.
                </div>
              ) : (
                filteredModalProducts.map((p) => {
                  const isChecked = selectedIds.includes(p.id);
                  const existing = enrolledMap.get(p.id);
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center justify-between gap-3 rounded-2xl border p-3 transition-all cursor-pointer ${
                        isChecked
                          ? "border-[#F03A46] bg-[#FFF4F2]/60"
                          : "border-[#F0E2BE] bg-[#FFFDF8] hover:border-[#DFBE6F]"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleProductSelect(p.id)}
                          className="h-4 w-4 accent-[#F03A46] rounded cursor-pointer"
                        />
                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-[#EAD296] bg-white">
                          {p.image_url ? (
                            <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[#9A6503]">
                              <Store size={16} />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-[#14120F] truncate">{p.name}</p>
                          <p className="text-[11px] font-bold text-[#7A6847]">
                            ₹{p.price.toLocaleString("en-IN")} • SKU: {p.sku}
                          </p>
                        </div>
                      </div>
                      {existing && (
                        <span className="shrink-0 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-black text-amber-800">
                          {existing.effective_status}
                        </span>
                      )}
                    </label>
                  );
                })
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#F0E2BE] pt-4">
              <span className="text-xs font-extrabold text-[#5C4E35]">
                {selectedIds.length} catalog(s) •{" "}
                {selectedPlan === "with_product_150"
                  ? `₹${selectedIds.length * 150} via Razorpay (${enrollPayTiming === "pay_now" ? "Pay Now" : "Within 3 Days"})`
                  : "₹0 upfront + 1% delivered commission"}
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowSelectModal(false)}
                  className="rounded-xl border border-[#EAD296] bg-white px-4 py-2.5 text-xs font-extrabold text-[#5C4E35] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={submitting || payingId === "enroll-now" || selectedIds.length === 0}
                  onClick={handleEnrollSubmit}
                  data-photo-overlay="true"
                  className="rounded-xl bg-gradient-to-r from-[#F03A46] to-[#FF5757] px-6 py-2.5 text-xs font-black text-white shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {submitting || payingId === "enroll-now"
                    ? "Processing..."
                    : selectedPlan === "with_product_150" && enrollPayTiming === "pay_now"
                    ? `Pay ₹${selectedIds.length * 150} via Razorpay`
                    : selectedPlan === "with_product_150"
                    ? "Book Now (Pay Within 3 Days)"
                    : "Submit to Alpha Media"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REACTIVATE / UPGRADE MODAL (₹50 FLAT VIA RAZORPAY — PAY NOW OR WITHIN 3 DAYS!) */}
      {renewTarget && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
          onClick={() => setRenewTarget(null)}
        >
          <div
            className="w-full max-w-lg rounded-[2rem] border border-[#EAD296] bg-white p-6 sm:p-8 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-0.5 text-[10px] font-black uppercase text-emerald-800">
                  <RefreshCw size={10} /> Instant Same-Link Reactivation • Just ₹50
                </span>
                <h3 className="mt-2 text-lg font-black text-[#14120F]">
                  Reactivate / Upgrade Campaign (₹50)
                </h3>
                <p className="text-xs font-semibold text-[#6E5C3D]">{renewTarget.product_name}</p>
              </div>
              <button
                type="button"
                onClick={() => setRenewTarget(null)}
                className="rounded-xl border border-[#EAD296] p-1.5 text-[#5C4E35] cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setRenewMode("renew")}
                className={`rounded-2xl border-2 p-3 text-left cursor-pointer ${
                  renewMode === "renew" ? "border-[#F03A46] bg-[#FFF4F2]/60" : "border-[#EAD296]"
                }`}
              >
                <p className="text-xs font-black text-[#14120F]">Renew Current Plan — ₹50</p>
                <p className="text-[11px] font-semibold text-[#6E5C3D] mt-0.5">
                  Reactivate the exact same /go/INF link via Razorpay
                </p>
              </button>

              {renewTarget.plan_type === "without_product_1pct" && (
                <button
                  type="button"
                  onClick={() => setRenewMode("upgrade_with_product_150")}
                  className={`rounded-2xl border-2 p-3 text-left cursor-pointer ${
                    renewMode === "upgrade_with_product_150"
                      ? "border-[#F03A46] bg-[#FFF4F2]/60"
                      : "border-[#EAD296]"
                  }`}
                >
                  <p className="text-xs font-black text-[#F03A46]">Upgrade to Studio — ₹50</p>
                  <p className="text-[11px] font-semibold text-[#6E5C3D] mt-0.5">
                    Real try-on video + PDP proof + 0% comm (no ₹150 again!)
                  </p>
                </button>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#5C4E35] mb-1">
                Active Link Extension Window
              </label>
              <div className="flex gap-2">
                {[7, 14, 30].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setRenewDays(d)}
                    className={`rounded-xl border px-4 py-2 text-xs font-black cursor-pointer ${
                      renewDays === d
                        ? "border-[#F03A46] bg-[#FFF4F2] text-[#F03A46]"
                        : "border-[#EAD296] bg-[#FFFDF8] text-[#5C4E35]"
                    }`}
                  >
                    +{d} Days
                  </button>
                ))}
              </div>
            </div>

            {/* 2 Payment Options for ₹50 Upgrade */}
            <div className="rounded-2xl border border-[#F0E2BE] bg-[#FFFDF8] p-3.5 space-y-2">
              <label className="block text-[10px] font-black uppercase tracking-wider text-[#5C4E35]">
                ₹50 Razorpay Payment Option
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setRenewPayTiming("pay_now")}
                  className={`rounded-xl border-2 p-2.5 text-left cursor-pointer ${
                    renewPayTiming === "pay_now"
                      ? "border-[#F03A46] bg-white"
                      : "border-[#EAD296] bg-[#FFFDF8]"
                  }`}
                >
                  <p className="text-xs font-black text-[#14120F] flex items-center gap-1">
                    <CreditCard size={12} className="text-[#F03A46]" /> Pay ₹50 Now (Razorpay)
                  </p>
                  <p className="text-[10px] font-semibold text-[#6E5C3D] mt-0.5">
                    Link reactivates instantly after payment
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setRenewPayTiming("pay_within_3_days")}
                  className={`rounded-xl border-2 p-2.5 text-left cursor-pointer ${
                    renewPayTiming === "pay_within_3_days"
                      ? "border-[#F03A46] bg-white"
                      : "border-[#EAD296] bg-[#FFFDF8]"
                  }`}
                >
                  <p className="text-xs font-black text-[#14120F] flex items-center gap-1">
                    <Clock size={12} className="text-[#9A6503]" /> Pay Within 3 Days
                  </p>
                  <p className="text-[10px] font-semibold text-[#6E5C3D] mt-0.5">
                    Marked Payment Pending; unlocks once ₹50 paid
                  </p>
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRenewTarget(null)}
                className="rounded-xl border border-[#EAD296] bg-white px-4 py-2.5 text-xs font-extrabold text-[#5C4E35] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={renewSubmitting || payingId === renewTarget.id}
                onClick={handleRenewUpgradeSubmit}
                data-photo-overlay="true"
                className="rounded-xl bg-gradient-to-r from-[#F03A46] to-[#FF5757] px-6 py-2.5 text-xs font-black text-white shadow-md disabled:opacity-50 cursor-pointer"
              >
                {renewSubmitting || payingId === renewTarget.id
                  ? "Opening Razorpay..."
                  : renewPayTiming === "pay_now"
                  ? `Pay ₹50 via Razorpay (+${renewDays}d)`
                  : `Save Pending (Pay ₹50 in 3 Days)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HOW IT WORKS MODAL */}
      {showHowItWorks && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setShowHowItWorks(false)}
        >
          <div
            className="w-full max-w-lg rounded-[2rem] border border-[#EAD296] bg-white p-6 sm:p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF8DB] border border-[#DFBE6F] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#9A6503]">
                  <ShieldCheck size={11} className="text-emerald-600" /> Razorpay Verified + Dual Gate
                </span>
                <h3 className="mt-3 text-xl font-black text-[#14120F]">
                  How ZebAlpha&apos;s Alpha Media System Works
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHowItWorks(false)}
                className="rounded-xl border border-[#EAD296] p-2 text-[#5C4E35] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <ol className="mt-5 space-y-3 rounded-2xl border border-[#F0E2BE] bg-[#FFFDF8] p-5 text-xs sm:text-sm font-semibold text-[#14120F]">
              <li>
                <strong>1. New Apply (Plan 1 or Plan 2):</strong> Start free with <strong>Without Product + 1%</strong> OR book a real studio reel under <strong>With Product + ₹150 via Razorpay</strong> (Pay Now or within 3 days).
              </li>
              <li>
                <strong>2. Dual-Gate Verification (Plan 2):</strong> Alpha Media proceeds as soon as BOTH <strong>₹150 Razorpay Payment</strong> AND <strong>Physical Product Delivery</strong> to Alpha Studio are complete.
              </li>
              <li>
                <strong>3. Full 7-Day Smart Link:</strong> Your 7-day countdown starts <em>only</em> when Media Leader publishes your reel — zero wasted days!
              </li>
              <li>
                <strong>4. Future Upgrades Just ₹50:</strong> After 7 days, renew or upgrade anytime for just <strong>₹50 via Razorpay</strong> (Pay Now or within 3 days) to reactivate the exact same <code className="font-mono">/go/INF-...</code> link!
              </li>
            </ol>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowHowItWorks(false);
                  openEnrollWithPlan("with_product_150");
                }}
                data-photo-overlay="true"
                className="rounded-xl bg-gradient-to-r from-[#F03A46] to-[#FF5757] px-6 py-2.5 text-xs font-black text-white shadow-md cursor-pointer"
              >
                Book Studio Shoot (₹150)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REQUEST CALLBACK MODAL */}
      {showCallbackModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setShowCallbackModal(false)}
        >
          <form
            onSubmit={handleCallbackSubmit}
            className="w-full max-w-md rounded-[2rem] border border-[#EAD296] bg-white p-6 sm:p-8 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-[#14120F]">Request Alpha Media Callback</h3>
                <p className="mt-0.5 text-xs font-semibold text-[#6E5C3D]">
                  Need help delivering your sample for a ₹150 studio shoot or activating a ₹50 renewal?
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCallbackModal(false)}
                className="rounded-xl border border-[#EAD296] p-1.5 text-[#5C4E35] cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[#5C4E35] mb-1">
                10-Digit Mobile / WhatsApp Number
              </label>
              <input
                type="tel"
                required
                maxLength={10}
                value={cbPhone}
                onChange={(e) => setCbPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="9876543210"
                className="w-full rounded-xl border border-[#EAD296] px-3.5 py-2.5 text-sm font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-[#5C4E35] mb-1">
                Notes (Optional)
              </label>
              <textarea
                rows={3}
                value={cbNotes}
                onChange={(e) => setCbNotes(e.target.value)}
                placeholder="e.g. Want to coordinate sample delivery to Alpha Studio..."
                className="w-full rounded-xl border border-[#EAD296] px-3.5 py-2.5 text-xs font-semibold"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowCallbackModal(false)}
                className="rounded-xl border border-[#EAD296] bg-white px-4 py-2.5 text-xs font-extrabold text-[#5C4E35] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={cbSubmitting}
                data-photo-overlay="true"
                className="rounded-xl bg-gradient-to-r from-[#F03A46] to-[#FF5757] px-5 py-2.5 text-xs font-black text-white shadow-md disabled:opacity-50 cursor-pointer"
              >
                {cbSubmitting ? "Sending..." : "Request Callback"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
