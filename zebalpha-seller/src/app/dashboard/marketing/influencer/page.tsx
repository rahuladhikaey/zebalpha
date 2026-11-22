"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@shared/utils/supabaseClient";
import {
  AlertTriangle,
  CheckCircle2,
  PlayCircle,
  Users,
  PhoneCall,
  Sparkles,
  TrendingUp,
  Search,
  X,
  Pause,
  Play,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Store,
  Camera,
  Video,
  Megaphone,
  Info,
} from "lucide-react";

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
  commission_rate: number;
  max_budget_cap: number | null;
  status: "active" | "paused" | "ended";
  total_clicks: number;
  total_orders: number;
  delivered_orders: number;
  delivered_gmv: number;
  commission_accrued: number;
  updated_at: string;
}

interface CreatorLinkRow {
  id: string;
  product_id: string;
  creator_name: string;
  creator_handle: string | null;
  platform: string;
  video_url: string | null;
  ref_code: string;
  commission_rate: number;
  clicks: number;
  orders: number;
  delivered_orders: number;
  gmv: number;
  status: string;
}

export default function InfluencerMarketingPage() {
  const [loading, setLoading] = useState(true);
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [sellerInfo, setSellerInfo] = useState({
    storeName: "Seller",
    phone: "",
    hasUpi: true,
    hasEnrolment: true,
  });
  const [summary, setSummary] = useState({
    activeCatalogs: 0,
    pausedCatalogs: 0,
    liveVideos: 0,
    totalClicks: 0,
    totalOrders: 0,
    deliveredOrders: 0,
    deliveredGmv: 0,
    commissionAccrued: 0,
  });
  const [products, setProducts] = useState<SellerProductOption[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [creatorLinks, setCreatorLinks] = useState<CreatorLinkRow[]>([]);

  const [activeTab, setActiveTab] = useState<"active" | "videos" | "paused">("active");
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Modals
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showCallbackModal, setShowCallbackModal] = useState(false);

  // Catalog Selection State
  const [catalogSearch, setCatalogSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [commissionRate, setCommissionRate] = useState("0.5");
  const [maxBudgetCap, setMaxBudgetCap] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Callback Form State
  const [cbPhone, setCbPhone] = useState("");
  const [cbNotes, setCbNotes] = useState("");
  const [cbSubmitting, setCbSubmitting] = useState(false);

  const notify = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4500);
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
        if (json.seller) {
          setSellerInfo(json.seller);
          setCbPhone((prev) => prev || json.seller.phone || "");
        }
        if (json.summary) setSummary(json.summary);
        if (Array.isArray(json.products)) setProducts(json.products);
        if (Array.isArray(json.enrollments)) setEnrollments(json.enrollments);
        if (Array.isArray(json.creatorLinks)) setCreatorLinks(json.creatorLinks);
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

  const enrolledIdSet = useMemo(
    () => new Set(enrollments.filter((e) => e.status === "active").map((e) => e.product_id)),
    [enrollments]
  );

  const filteredModalProducts = useMemo(() => {
    const q = catalogSearch.trim().toLowerCase();
    return products.filter(
      (p) => !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    );
  }, [products, catalogSearch]);

  const toggleProductSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
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
          commissionRate: Number(commissionRate) || 0.5,
          maxBudgetCap: maxBudgetCap.trim() ? Number(maxBudgetCap) : null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        notify(json?.error || "Failed to enroll catalogs.", "error");
        return;
      }
      notify(json.message || "Catalogs enrolled in Influencer Marketing!");
      setShowSelectModal(false);
      setSelectedIds([]);
      await loadData();
    } catch {
      notify("Network error while enrolling catalogs.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (row: EnrollmentRow) => {
    const nextStatus = row.status === "active" ? "paused" : "active";
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

  const copyRefLink = (link: CreatorLinkRow) => {
    const url = `https://zebalpha.shop/products/${link.product_id}?ref=${encodeURIComponent(link.ref_code)}`;
    navigator.clipboard?.writeText(url);
    setCopiedCode(link.ref_code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const visibleEnrollments = useMemo(
    () =>
      enrollments.filter((e) =>
        activeTab === "paused" ? e.status === "paused" : e.status === "active"
      ),
    [enrollments, activeTab]
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 animate-pulse">
        <div className="h-10 w-72 rounded-xl bg-[#F3E6C5]" />
        <div className="h-44 rounded-3xl bg-white border border-[#EAD296]" />
        <div className="h-64 rounded-3xl bg-white border border-[#EAD296]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16 relative">
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

      {/* Setup / Migration Notices */}
      {(!sellerInfo.hasEnrolment || !sellerInfo.hasUpi) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-[#F03A46]/30 bg-gradient-to-r from-[#FFF3F1] via-[#FFF8F6] to-[#FFFDF8] px-5 py-3.5">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="mt-0.5 text-[#F03A46] shrink-0" />
            <div>
              <p className="text-xs sm:text-sm font-black text-[#B91C1C]">
                {!sellerInfo.hasEnrolment
                  ? "Your 15-Character Enrolment ID / GSTIN is missing!"
                  : "Verify your UPI ID for 5-day order payouts!"}
              </p>
              <p className="text-xs font-medium text-[#5C4E35]">
                Complete your seller profile to unlock full Alpha Media &amp; Influencer promotions.
              </p>
            </div>
          </div>
          <Link
            href={!sellerInfo.hasEnrolment ? "/dashboard/settings" : "/dashboard/payments"}
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-[#F03A46] bg-white px-4 py-2 text-xs font-black text-[#F03A46] hover:bg-[#F03A46] hover:text-white transition-all"
          >
            Complete Now
          </Link>
        </div>
      )}

      {migrationRequired && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-[#FFF8DB] px-5 py-3.5 text-xs font-bold text-[#6E4900]">
          <Info size={16} className="mt-0.5 shrink-0 text-[#B45309]" />
          <span>
            Database tables for Marketing need one-time setup: run{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px]">
              supabase/add_seller_marketing_and_branding_system.sql
            </code>{" "}
            in your Supabase SQL Editor to activate live saving &amp; tracking.
          </span>
        </div>
      )}

      {/* 1. HEADER ROW */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#14120F]">
            Influencer Marketing
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-semibold text-[#6E5C3D]">
            Promote your products via ZebAlpha&apos;s Alpha Media Team &amp; regional creators — pay only on verified delivered orders.
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
            onClick={() => setShowSelectModal(true)}
            data-photo-overlay="true"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#F03A46] to-[#FF5757] px-5 py-2.5 text-xs font-black text-white shadow-[0_8px_20px_rgba(240,58,70,0.28)] hover:brightness-105 transition-all cursor-pointer"
          >
            <span>Select Catalogs</span>
          </button>
        </div>
      </div>

      {/* 2. PROMO HERO BANNER ("Now commission starts at 0.5% NEW") */}
      <section className="overflow-hidden rounded-[1.75rem] border border-[#EAD296] bg-white p-6 sm:p-8 shadow-[0_12px_32px_rgba(166,124,28,0.08)]">
        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-black text-[#14120F]">
                Now commission starts at 0.5%
              </h2>
              <span
                data-photo-overlay="true"
                className="rounded-md bg-[#F03A46] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white"
              >
                NEW
              </span>
            </div>
            <p className="mt-2 text-xs sm:text-sm font-semibold text-[#6E5C3D] max-w-xl">
              Festive &amp; seasonal growth ahead — boost orders with micro-creator reels &amp; Alpha Media promotions.{" "}
              <span className="text-[#9A6503] font-bold">Pay ₹0 on cancellations &amp; RTOs.*</span>
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowSelectModal(true)}
                data-photo-overlay="true"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#F03A46] to-[#FF5757] px-6 py-3 text-xs font-black text-white shadow-[0_8px_20px_rgba(240,58,70,0.28)] hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>Opt-in now</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCallbackModal(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-[#DFBE6F] bg-[#FFFDF8] px-5 py-3 text-xs font-black text-[#14120F] hover:border-[#F03A46] hover:bg-[#FFF4F2] hover:text-[#F03A46] transition-all cursor-pointer"
              >
                <PhoneCall size={14} className="text-[#F03A46]" />
                <span>Request Callback</span>
              </button>
            </div>
          </div>

          {/* ZebAlpha Branded Visual Showcase Card */}
          <div
            data-keep-dark="true"
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1A1410] via-[#2A1D12] to-[#3B181C] p-6 text-white border border-[#DFBE6F]/40 shadow-xl"
          >
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#F5B922]/20 blur-2xl" />
            <div className="relative z-10 flex items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/10 border border-white/15 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-[#FCE89C]">
                  <Megaphone size={11} /> Alpha Media + Creators
                </span>
                <p className="mt-3 text-3xl font-black tracking-tight text-white">
                  Just <span className="text-[#F5B922]">0.5%</span>
                </p>
                <p className="text-xs font-bold text-neutral-300 mt-0.5">
                  Creator Commission on Delivered Orders
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHowItWorks(true)}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#F03A46] text-white shadow-lg hover:scale-105 transition-transform cursor-pointer"
                aria-label="Learn how Influencer Marketing works"
              >
                <Play size={20} className="ml-0.5 fill-white" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. GROW ORDERS WITH INFLUENCER PROMOTION SECTION (Matches Meesho Hero Layout) */}
      <section className="overflow-hidden rounded-[1.75rem] border border-[#EAD296] bg-gradient-to-br from-white via-[#FFFDF8] to-[#FFF8EB] p-6 sm:p-9 shadow-[0_12px_32px_rgba(166,124,28,0.08)]">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#14120F] flex items-center gap-2.5">
              <span>Grow Orders with Influencer Promotion!</span>
              <TrendingUp size={24} className="text-[#F03A46] shrink-0" />
            </h2>

            <ul className="mt-6 space-y-4">
              <li className="flex items-start gap-3">
                <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600" />
                <p className="text-sm sm:text-base font-bold text-[#14120F]">
                  <strong>Alpha Media Team &amp; Regional Creators</strong> make honest demo videos &amp; try-on reels on your products
                </p>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600" />
                <p className="text-sm sm:text-base font-bold text-[#14120F]">
                  Videos are posted on{" "}
                  <span className="text-[#F03A46]">ZebAlpha App</span> +{" "}
                  <span className="text-[#9A6503]">Instagram, Facebook &amp; YouTube</span> = More Visibility, More Sales
                </p>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-emerald-600" />
                <p className="text-sm sm:text-base font-bold text-[#14120F]">
                  <strong>Zero Upfront Fee:</strong> Pay commission only on verified delivered orders after the 5-day return window
                </p>
              </li>
            </ul>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setShowSelectModal(true)}
                data-photo-overlay="true"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#F03A46] to-[#FF5757] px-7 py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-[0_10px_24px_rgba(240,58,70,0.3)] hover:brightness-105 cursor-pointer"
              >
                <span>Select Catalogs</span>
              </button>
              <Link
                href="/dashboard/marketing/branding"
                className="inline-flex items-center gap-2 rounded-xl border border-[#DFBE6F] bg-white px-5 py-3.5 text-xs font-black text-[#14120F] hover:bg-[#FFF8DB] transition-all"
              >
                <Sparkles size={14} className="text-[#9A6503]" />
                <span>Also Explore App Branding →</span>
              </Link>
            </div>
          </div>

          {/* Visual Mock Reel Preview */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="rounded-2xl border border-[#EAD296] bg-white p-4 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-[#FFF4F2] border border-[#F03A46]/25 px-2.5 py-0.5 text-[10px] font-black text-[#F03A46]">
                  Your Product
                </span>
                <Camera size={15} className="text-[#E1306C]" />
              </div>
              <div className="aspect-[4/3] rounded-xl bg-gradient-to-br from-[#FFF8DB] to-[#FCE89C] flex items-center justify-center overflow-hidden border border-[#EAD296]">
                {products[0]?.image_url ? (
                  <img src={products[0].image_url} alt={products[0].name} className="h-full w-full object-cover" />
                ) : (
                  <Store size={28} className="text-[#9A6503]" />
                )}
              </div>
              <p className="text-[11px] font-black text-[#14120F] line-clamp-1">
                {products[0]?.name || "Featured Seller Catalog"}
              </p>
              <p className="text-[10px] font-bold text-emerald-700">
                Tracked ?ref= Link + Verified Orders
              </p>
            </div>

            <div
              data-keep-dark="true"
              className="rounded-2xl border border-[#DFBE6F] bg-gradient-to-b from-[#1A1410] to-[#2B1F15] p-4 text-white shadow-lg flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-[#FCE89C]">@zebalpha_official</span>
                <Video size={16} className="text-[#F03A46]" />
              </div>
              <div className="my-4 space-y-1.5 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white/10 border border-[#F5B922]/40">
                  <Users size={20} className="text-[#F5B922]" />
                </div>
                <p className="text-xs font-black">Live Creator Reels</p>
                <p className="text-[10px] text-neutral-300">
                  Honest Try-On + Direct Shop Link
                </p>
              </div>
              <div className="rounded-xl bg-[#F03A46] py-1.5 text-center text-[10px] font-black uppercase tracking-wider">
                Shop Now on ZebAlpha
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. LIVE PERFORMANCE KPI STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {[
          { label: "Active Catalogs", value: summary.activeCatalogs },
          { label: "Live Creator Reels", value: summary.liveVideos },
          { label: "Creator Clicks", value: summary.totalClicks },
          { label: "Total Orders", value: summary.totalOrders },
          { label: "Delivered GMV", value: `₹${summary.deliveredGmv.toLocaleString("en-IN")}` },
          { label: "Commission", value: `₹${summary.commissionAccrued.toLocaleString("en-IN")}` },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl border border-[#EAD296] bg-white p-4 shadow-sm"
          >
            <p className="text-[10px] font-black uppercase tracking-wider text-[#7A6847]">
              {kpi.label}
            </p>
            <p className="mt-1.5 text-xl font-black text-[#14120F]">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* 5. ENROLLED CATALOGS & CREATOR LINKS TABLE */}
      <section className="overflow-hidden rounded-[1.5rem] border border-[#EAD296] bg-white shadow-[0_10px_28px_rgba(166,124,28,0.07)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0E2BE] px-6 pt-4">
          <div className="flex items-center gap-2">
            {[
              { key: "active" as const, label: `Active Catalogs (${summary.activeCatalogs})` },
              { key: "videos" as const, label: `Creator Links & Reels (${creatorLinks.length})` },
              { key: "paused" as const, label: `Paused (${summary.pausedCatalogs})` },
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActiveTab(t.key)}
                className={`border-b-[3px] px-3.5 py-3 text-xs sm:text-sm transition-all cursor-pointer ${
                  activeTab === t.key
                    ? "border-[#F03A46] font-black text-[#F03A46]"
                    : "border-transparent font-bold text-[#6E5C3D] hover:text-[#14120F]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowSelectModal(true)}
            className="mb-2 rounded-xl border border-[#DFBE6F] bg-[#FFFDF8] px-3.5 py-1.5 text-xs font-black text-[#9A6503] hover:border-[#F03A46] hover:text-[#F03A46] cursor-pointer"
          >
            + Add More Catalogs
          </button>
        </div>

        <div className="overflow-x-auto">
          {activeTab === "videos" ? (
            creatorLinks.length === 0 ? (
              <div className="py-12 text-center px-6">
                <p className="text-sm font-black text-[#14120F]">No creator tracking links yet</p>
                <p className="mt-1 text-xs font-semibold text-[#6E5C3D]">
                  Enroll your catalogs above — our Alpha Media Team will generate unique ?ref= links &amp; reels.
                </p>
              </div>
            ) : (
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead>
                  <tr className="border-b border-[#EAD296] bg-[#FFF8EB] text-[11px] font-black uppercase tracking-wider text-[#5C4E35]">
                    <th className="px-6 py-3.5">Creator / Channel</th>
                    <th className="px-5 py-3.5">Tracking Ref Code</th>
                    <th className="px-5 py-3.5">Clicks / Orders</th>
                    <th className="px-5 py-3.5">Reel Video</th>
                    <th className="px-5 py-3.5 text-right">Share Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0E2BE]">
                  {creatorLinks.map((lnk) => (
                    <tr key={lnk.id} className="hover:bg-[#FFFDF8]">
                      <td className="px-6 py-4">
                        <p className="font-black text-[#14120F]">{lnk.creator_name}</p>
                        <p className="text-[11px] font-semibold text-[#7A6847]">
                          {lnk.creator_handle || lnk.platform} • {lnk.commission_rate}% comm.
                        </p>
                      </td>
                      <td className="px-5 py-4 font-mono font-black text-[#9A6503]">{lnk.ref_code}</td>
                      <td className="px-5 py-4 font-bold text-[#14120F]">
                        {lnk.clicks} clicks • {lnk.delivered_orders}/{lnk.orders} delivered
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
                            Ready for creator shoot
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => copyRefLink(lnk)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-[#DFBE6F] bg-[#FFFDF8] px-3 py-1.5 text-[11px] font-black text-[#14120F] hover:border-[#F03A46] hover:text-[#F03A46] cursor-pointer"
                        >
                          {copiedCode === lnk.ref_code ? (
                            <>
                              <Check size={12} className="text-emerald-600" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy size={12} /> Copy Link
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : visibleEnrollments.length === 0 ? (
            <div className="py-12 text-center px-6">
              <p className="text-sm font-black text-[#14120F]">
                {activeTab === "paused"
                  ? "No paused influencer campaigns"
                  : "No catalogs enrolled in Influencer Marketing yet"}
              </p>
              <p className="mt-1 text-xs font-semibold text-[#6E5C3D]">
                Click &ldquo;Select Catalogs&rdquo; to enroll your top products starting at just 0.5% commission.
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[700px] text-left text-xs">
              <thead>
                <tr className="border-b border-[#EAD296] bg-[#FFF8EB] text-[11px] font-black uppercase tracking-wider text-[#5C4E35]">
                  <th className="px-6 py-3.5">Catalog</th>
                  <th className="px-5 py-3.5">Commission %</th>
                  <th className="px-5 py-3.5">Clicks</th>
                  <th className="px-5 py-3.5">Orders / Delivered</th>
                  <th className="px-5 py-3.5">Delivered GMV</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E2BE]">
                {visibleEnrollments.map((row) => (
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
                          <p className="text-[11px] font-bold text-[#7A6847]">
                            ₹{Number(row.product_price || 0).toLocaleString("en-IN")}
                            {row.max_budget_cap ? ` • Cap ₹${row.max_budget_cap}` : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-black text-emerald-800">
                        {row.commission_rate}%
                      </span>
                    </td>
                    <td className="px-5 py-4 font-extrabold text-[#14120F]">{row.total_clicks}</td>
                    <td className="px-5 py-4 font-extrabold text-[#14120F]">
                      {row.total_orders} / <span className="text-emerald-700">{row.delivered_orders}</span>
                    </td>
                    <td className="px-5 py-4 font-black text-[#14120F]">
                      ₹{Number(row.delivered_gmv || 0).toLocaleString("en-IN")}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(row)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#DFBE6F] bg-white px-3.5 py-2 text-[11px] font-black text-[#14120F] hover:border-[#F03A46] hover:text-[#F03A46] cursor-pointer"
                      >
                        {row.status === "active" ? (
                          <>
                            <Pause size={12} /> Pause
                          </>
                        ) : (
                          <>
                            <Play size={12} /> Resume
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* FLOATING REQUEST CALLBACK PILL (Matches Meesho bottom-right floating button) */}
      <button
        type="button"
        onClick={() => setShowCallbackModal(true)}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full border border-[#DFBE6F] bg-white px-5 py-3 text-xs font-black text-[#14120F] shadow-[0_12px_32px_rgba(166,124,28,0.22)] hover:border-[#F03A46] hover:text-[#F03A46] transition-all cursor-pointer"
      >
        <PhoneCall size={15} className="text-[#F03A46]" />
        <span>Request Callback</span>
      </button>

      {/* SELECT CATALOGS MODAL */}
      {showSelectModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setShowSelectModal(false)}
        >
          <div
            className="w-full max-w-2xl rounded-[2rem] border border-[#EAD296] bg-white p-6 sm:p-8 shadow-2xl max-h-[88vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#F0E2BE] pb-4">
              <div>
                <h3 className="text-xl font-black text-[#14120F]">
                  Select Catalogs for Influencer Promotion
                </h3>
                <p className="mt-0.5 text-xs font-semibold text-[#6E5C3D]">
                  Choose live products &amp; set your creator commission (starting at just 0.5%).
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

            {/* Commission & Cap Controls */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#5C4E35] mb-1.5">
                  Creator Commission % (0.5% – 15%)
                </label>
                <div className="flex items-center gap-2">
                  {["0.5", "1", "2", "5"].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setCommissionRate(rate)}
                      className={`rounded-xl border px-3 py-2 text-xs font-black transition-all cursor-pointer ${
                        commissionRate === rate
                          ? "border-[#F03A46] bg-[#FFF4F2] text-[#F03A46]"
                          : "border-[#EAD296] bg-[#FFFDF8] text-[#5C4E35]"
                      }`}
                    >
                      {rate}%
                    </button>
                  ))}
                  <input
                    type="number"
                    min="0.5"
                    max="15"
                    step="0.5"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(e.target.value)}
                    className="w-20 rounded-xl border border-[#EAD296] px-2.5 py-2 text-xs font-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-[#5C4E35] mb-1.5">
                  Optional Monthly Budget Cap (₹)
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
            </div>

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
                  const alreadyActive = enrolledIdSet.has(p.id);
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
                      {alreadyActive && (
                        <span className="shrink-0 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-black text-emerald-700">
                          Already Active
                        </span>
                      )}
                    </label>
                  );
                })
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#F0E2BE] pt-4">
              <span className="text-xs font-extrabold text-[#5C4E35]">
                {selectedIds.length} catalog(s) selected • {commissionRate}% creator commission
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
                  disabled={submitting || selectedIds.length === 0}
                  onClick={handleEnrollSubmit}
                  data-photo-overlay="true"
                  className="rounded-xl bg-gradient-to-r from-[#F03A46] to-[#FF5757] px-6 py-2.5 text-xs font-black text-white shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? "Enrolling..." : "Confirm Opt-In"}
                </button>
              </div>
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
                  <ShieldCheck size={11} className="text-emerald-600" /> Risk-Free Creator Growth
                </span>
                <h3 className="mt-3 text-xl font-black text-[#14120F]">
                  How ZebAlpha Influencer Marketing Works
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
                <strong>1. Select Catalogs &amp; Commission:</strong> Opt-in your best live products starting from just <strong>0.5% commission</strong>.
              </li>
              <li>
                <strong>2. Alpha Media &amp; Creator Reels:</strong> Our in-house Alpha Media Team and verified micro-creators produce honest product try-ons &amp; reels on Instagram, Facebook, YouTube &amp; ZebAlpha App.
              </li>
              <li>
                <strong>3. Tracked ?ref= Orders:</strong> Every creator link tracks clicks and orders directly inside your Seller Panel.
              </li>
              <li>
                <strong>4. Pay Only on Delivered Orders:</strong> Commission applies strictly after delivery + the 5-day return window — <strong>₹0 charge on cancellations or RTOs</strong>.
              </li>
            </ol>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowHowItWorks(false);
                  setShowSelectModal(true);
                }}
                data-photo-overlay="true"
                className="rounded-xl bg-gradient-to-r from-[#F03A46] to-[#FF5757] px-6 py-2.5 text-xs font-black text-white shadow-md cursor-pointer"
              >
                Select Catalogs Now
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
                <h3 className="text-lg font-black text-[#14120F]">
                  Request Alpha Media Callback
                </h3>
                <p className="mt-0.5 text-xs font-semibold text-[#6E5C3D]">
                  Our Influencer &amp; Alpha Media specialist will call you to help pick winning catalogs.
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
                What would you like help with? (Optional)
              </label>
              <textarea
                rows={3}
                value={cbNotes}
                onChange={(e) => setCbNotes(e.target.value)}
                placeholder="e.g. Want regional creators in Kolkata to promote our oversized t-shirts & kurtis..."
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
