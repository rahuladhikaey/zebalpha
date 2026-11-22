"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import {
  Star,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Plus,
  X,
  Eye,
  MousePointerClick,
  ShoppingBag,
  IndianRupee,
  ShieldCheck,
  Store,
  Wallet,
  CreditCard,
  Gift,
  Pause,
  Play,
  Info,
  Megaphone,
  ArrowRight,
} from "lucide-react";

interface BrandingPackage {
  key: "launch_pilot" | "starter_boost" | "homepage_spotlight" | "brand_takeover";
  name: string;
  placement_type: "top_search" | "homepage_spotlight" | "brand_takeover";
  duration_days: number;
  amount_inr: number;
  badge: string;
  summary: string;
  features: string[];
}

interface SellerProductItem {
  id: string;
  name: string;
  price: number;
  mrp: number;
  image_url: string | null;
}

interface BrandingCampaignRow {
  id: string;
  store_name: string;
  campaign_name: string;
  package_key: string;
  placement_type: string;
  product_ids: string[];
  headline: string;
  tagline: string | null;
  banner_image_url: string | null;
  duration_days: number;
  amount_inr: number;
  payment_method: string;
  payment_status: string;
  approval_status: "pending_review" | "approved" | "live" | "rejected" | "paused" | "completed";
  rejection_reason: string | null;
  starts_at: string | null;
  ends_at: string | null;
  impressions: number;
  clicks: number;
  attributed_orders: number;
  attributed_revenue: number;
  created_at: string;
}

const STATUS_BADGE: Record<string, string> = {
  live: "bg-emerald-50 border-emerald-300 text-emerald-800",
  approved: "bg-emerald-50 border-emerald-300 text-emerald-800",
  pending_review: "bg-[#FFF8DB] border-[#DFBE6F] text-[#9A6503]",
  paused: "bg-neutral-100 border-neutral-300 text-neutral-700",
  completed: "bg-sky-50 border-sky-200 text-sky-800",
  rejected: "bg-rose-50 border-rose-300 text-rose-800",
};

function formatDate(iso?: string | null) {
  if (!iso) return "Starts upon approval";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function AppBrandingPage() {
  const [loading, setLoading] = useState(true);
  const [migrationRequired, setMigrationRequired] = useState(false);
  const [razorpayConfigured, setRazorpayConfigured] = useState(false);
  const [seller, setSeller] = useState({
    storeName: "Your Brand",
    availableBalance: 0,
    liveCatalogCount: 0,
    launchPilotEligible: true,
  });
  const [packages, setPackages] = useState<BrandingPackage[]>([]);
  const [products, setProducts] = useState<SellerProductItem[]>([]);
  const [campaigns, setCampaigns] = useState<BrandingCampaignRow[]>([]);
  const [summary, setSummary] = useState({
    liveCount: 0,
    pendingCount: 0,
    totalImpressions: 0,
    totalClicks: 0,
    ctrPct: 0,
    totalOrders: 0,
    totalRevenue: 0,
  });

  const [activeTab, setActiveTab] = useState<"live" | "pending" | "history">("live");
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Campaign Builder Modal State
  const [showBuilder, setShowBuilder] = useState(false);
  const [builderStep, setBuilderStep] = useState<1 | 2 | 3>(1);
  const [selectedPkgKey, setSelectedPkgKey] =
    useState<BrandingPackage["key"]>("homepage_spotlight");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [headline, setHeadline] = useState("");
  const [tagline, setTagline] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"upi_manual" | "razorpay_upi" | "seller_balance" | "launch_pilot">("upi_manual");
  const [upiRef, setUpiRef] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      const res = await fetch("/api/seller/marketing/branding", {
        headers,
        cache: "no-store",
      });
      const json = await res.json().catch(() => null);
      if (json?.success) {
        setMigrationRequired(Boolean(json.migrationRequired));
        setRazorpayConfigured(Boolean(json.razorpayConfigured));
        if (json.seller) {
          setSeller(json.seller);
          setHeadline((prev) => prev || `Shop ${json.seller.storeName} Official Collection`);
          setTagline((prev) => prev || "Handpicked styles delivered across India on ZebAlpha");
        }
        if (Array.isArray(json.packages)) setPackages(json.packages);
        if (Array.isArray(json.products)) setProducts(json.products);
        if (Array.isArray(json.campaigns)) setCampaigns(json.campaigns);
        if (json.summary) setSummary(json.summary);
      }
    } catch (err) {
      console.error("[App Branding] Load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const selectedPackage = useMemo(
    () => packages.find((p) => p.key === selectedPkgKey) || packages[0] || null,
    [packages, selectedPkgKey]
  );

  const openBuilderWithPackage = (pkgKey: BrandingPackage["key"]) => {
    setSelectedPkgKey(pkgKey);
    if (pkgKey === "launch_pilot") {
      setPaymentMethod("launch_pilot");
    } else if (razorpayConfigured) {
      setPaymentMethod("razorpay_upi");
    } else {
      setPaymentMethod("upi_manual");
    }
    if (selectedProductIds.length === 0 && products.length > 0) {
      setSelectedProductIds(products.slice(0, 3).map((p) => p.id));
    }
    setBuilderStep(1);
    setShowBuilder(true);
  };

  const toggleProduct = (id: string) => {
    setSelectedProductIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 6) return prev;
      return [...prev, id];
    });
  };

  const handleSubmitCampaign = async () => {
    if (!selectedPackage) return;
    if (selectedProductIds.length === 0) {
      notify("Select at least 1 product to showcase.", "error");
      return;
    }
    if (headline.trim().length < 4) {
      notify("Enter a brand headline (at least 4 characters).", "error");
      return;
    }

    setSubmitting(true);
    try {
      const headers = await getAuthHeaders();
      const firstSelected = products.find((p) => p.id === selectedProductIds[0]);
      const res = await fetch("/api/seller/marketing/branding", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "create_campaign",
          packageKey: selectedPackage.key,
          productIds: selectedProductIds,
          headline: headline.trim(),
          tagline: tagline.trim(),
          bannerImageUrl: firstSelected?.image_url || "",
          paymentMethod: selectedPackage.amount_inr === 0 ? "launch_pilot" : paymentMethod,
          paymentRef: upiRef.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        notify(json?.error || "Could not create campaign.", "error");
        return;
      }

      notify(json.message || "Campaign submitted for Admin & Alpha Media approval!");
      setShowBuilder(false);
      setUpiRef("");
      setActiveTab("pending");
      await loadData();
    } catch {
      notify("Network error creating branding campaign.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePause = async (camp: BrandingCampaignRow) => {
    const nextStatus = camp.approval_status === "paused" ? "live" : "paused";
    try {
      const headers = await getAuthHeaders();
      const res = await fetch("/api/seller/marketing/branding", {
        method: "POST",
        headers,
        body: JSON.stringify({
          action: "update_status",
          campaignId: camp.id,
          status: nextStatus,
        }),
      });
      const json = await res.json();
      if (json.success) {
        notify(`Campaign ${nextStatus === "live" ? "resumed" : "paused"}.`);
        await loadData();
      } else {
        notify(json.error || "Failed to update campaign.", "error");
      }
    } catch {
      notify("Network error updating campaign.", "error");
    }
  };

  const visibleCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      if (activeTab === "live") {
        return c.approval_status === "live" || c.approval_status === "approved";
      }
      if (activeTab === "pending") {
        return c.approval_status === "pending_review";
      }
      return ["paused", "completed", "rejected"].includes(c.approval_status);
    });
  }, [campaigns, activeTab]);

  const previewProducts = useMemo(
    () => products.filter((p) => selectedProductIds.includes(p.id)).slice(0, 3),
    [products, selectedProductIds]
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 animate-pulse">
        <div className="h-10 w-64 rounded-xl bg-[#F3E6C5]" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-64 rounded-3xl bg-white border border-[#EAD296]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-12">
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

      {migrationRequired && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-[#FFF8DB] px-5 py-3.5 text-xs font-bold text-[#6E4900]">
          <Info size={16} className="mt-0.5 shrink-0 text-[#B45309]" />
          <span>
            Database tables for App Branding need one-time setup: run{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[11px]">
              supabase/add_seller_marketing_and_branding_system.sql
            </code>{" "}
            in Supabase SQL Editor.
          </span>
        </div>
      )}

      {/* 1. HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF8DB] border border-[#DFBE6F] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#9A6503] mb-2">
            <Star size={11} className="fill-[#F5B922] text-[#F5B922]" />
            ZebAlpha App &amp; Web Storefront Branding
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#14120F]">
            App Branding &amp; Product Spotlight
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-semibold text-[#6E5C3D]">
            Promote your products &amp; emerging brand directly on <strong>zebalpha.shop</strong> and the ZebAlpha Android App with fixed, transparent packages.
          </p>
        </div>

        <button
          type="button"
          onClick={() => openBuilderWithPackage("homepage_spotlight")}
          data-photo-overlay="true"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-[#F03A46] to-[#FF5757] px-5 py-3 text-xs font-black text-white shadow-[0_8px_20px_rgba(240,58,70,0.28)] hover:brightness-105 cursor-pointer"
        >
          <Plus size={16} />
          <span>Create Branding Campaign</span>
        </button>
      </div>

      {/* 2. KPI STRIP */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#EAD296] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#7A6847]">
              App Impressions
            </span>
            <Eye size={15} className="text-[#9A6503]" />
          </div>
          <p className="mt-2 text-2xl font-black text-[#14120F]">
            {summary.totalImpressions.toLocaleString("en-IN")}
          </p>
          <p className="text-[11px] font-semibold text-[#6E5C3D]">
            {summary.liveCount} live • {summary.pendingCount} pending review
          </p>
        </div>

        <div className="rounded-2xl border border-[#EAD296] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#7A6847]">
              Shopper Clicks
            </span>
            <MousePointerClick size={15} className="text-[#F03A46]" />
          </div>
          <p className="mt-2 text-2xl font-black text-[#14120F]">
            {summary.totalClicks.toLocaleString("en-IN")}
          </p>
          <p className="text-[11px] font-semibold text-[#6E5C3D]">
            CTR: {summary.ctrPct}%
          </p>
        </div>

        <div className="rounded-2xl border border-[#EAD296] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#7A6847]">
              Attributed Orders
            </span>
            <ShoppingBag size={15} className="text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-[#14120F]">{summary.totalOrders}</p>
          <p className="text-[11px] font-semibold text-[#6E5C3D]">Verified App Orders</p>
        </div>

        <div className="rounded-2xl border border-[#EAD296] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-[#7A6847]">
              Branding Revenue
            </span>
            <IndianRupee size={15} className="text-[#9A6503]" />
          </div>
          <p className="mt-2 text-2xl font-black text-[#14120F]">
            ₹{summary.totalRevenue.toLocaleString("en-IN")}
          </p>
          <p className="text-[11px] font-semibold text-[#6E5C3D]">
            Payout Balance: ₹{seller.availableBalance.toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {/* 3. FOUR TRANSPARENT FIXED PACKAGES */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-black text-[#14120F]">
            Choose a Transparent App Branding Package
          </h2>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
            <ShieldCheck size={14} /> Zero CPC surprises • Admin &amp; Alpha Media Quality Reviewed
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {packages.map((pkg) => {
            const isPopular = pkg.key === "homepage_spotlight";
            const isPilotDisabled = pkg.key === "launch_pilot" && !seller.launchPilotEligible;
            return (
              <div
                key={pkg.key}
                className={`flex flex-col justify-between rounded-[1.5rem] border p-5 transition-all ${
                  isPopular
                    ? "border-[#F03A46] bg-gradient-to-b from-[#FFF7F6] via-white to-[#FFFDF8] shadow-[0_14px_34px_rgba(240,58,70,0.14)]"
                    : "border-[#EAD296] bg-white shadow-[0_8px_24px_rgba(166,124,28,0.06)]"
                }`}
              >
                <div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                      isPopular
                        ? "bg-[#F03A46] text-white"
                        : "bg-[#FFF8DB] border border-[#DFBE6F] text-[#9A6503]"
                    }`}
                    data-photo-overlay={isPopular ? "true" : undefined}
                  >
                    {pkg.badge}
                  </span>

                  <h3 className="mt-3 text-base font-black text-[#14120F]">{pkg.name}</h3>
                  <div className="mt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-[#14120F]">
                      {pkg.amount_inr === 0 ? "₹0" : `₹${pkg.amount_inr.toLocaleString("en-IN")}`}
                    </span>
                    <span className="text-xs font-bold text-[#6E5C3D]">/ {pkg.duration_days} days</span>
                  </div>
                  <p className="mt-2 text-xs font-medium text-[#5C4E35] leading-relaxed">
                    {pkg.summary}
                  </p>

                  <ul className="mt-4 space-y-2 border-t border-[#F0E2BE] pt-4 text-[11px] font-semibold text-[#14120F]">
                    {pkg.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-emerald-600" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  disabled={isPilotDisabled}
                  onClick={() => openBuilderWithPackage(pkg.key)}
                  data-photo-overlay={isPopular ? "true" : undefined}
                  className={`mt-5 w-full rounded-xl py-2.5 text-xs font-black transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                    isPopular
                      ? "bg-gradient-to-r from-[#F03A46] to-[#FF5757] text-white shadow-md hover:brightness-105"
                      : "border border-[#DFBE6F] bg-[#FFFDF8] text-[#14120F] hover:border-[#F03A46] hover:bg-[#FFF4F2] hover:text-[#F03A46]"
                  }`}
                >
                  {isPilotDisabled
                    ? "Pilot Used / Upload Catalogs"
                    : pkg.amount_inr === 0
                      ? "Request Free Trial"
                      : `Select ₹${pkg.amount_inr} Pack`}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* 4. CAMPAIGNS TABLE */}
      <section className="overflow-hidden rounded-[1.5rem] border border-[#EAD296] bg-white shadow-[0_10px_28px_rgba(166,124,28,0.07)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0E2BE] px-6 pt-4">
          <div className="flex items-center gap-2">
            {[
              { key: "live" as const, label: `Live on App (${summary.liveCount})` },
              { key: "pending" as const, label: `Pending Review (${summary.pendingCount})` },
              {
                key: "history" as const,
                label: `Paused / History (${Math.max(
                  0,
                  campaigns.length - summary.liveCount - summary.pendingCount
                )})`,
              },
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
        </div>

        <div className="overflow-x-auto">
          {visibleCampaigns.length === 0 ? (
            <div className="py-12 px-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF8DB] border border-[#EAD296] text-[#9A6503]">
                <Megaphone size={24} />
              </div>
              <p className="mt-3 text-sm font-black text-[#14120F]">
                {activeTab === "pending"
                  ? "No campaigns waiting for review"
                  : activeTab === "live"
                    ? "No live App Branding campaigns yet"
                    : "No past or paused campaigns"}
              </p>
              <p className="mt-1 text-xs font-semibold text-[#6E5C3D]">
                Pick a package above to showcase your products &amp; brand on zebalpha.shop and the Android App.
              </p>
            </div>
          ) : (
            <table className="w-full min-w-[780px] text-left text-xs">
              <thead>
                <tr className="border-b border-[#EAD296] bg-[#FFF8EB] text-[11px] font-black uppercase tracking-wider text-[#5C4E35]">
                  <th className="px-6 py-3.5">Campaign &amp; Headline</th>
                  <th className="px-5 py-3.5">Package &amp; Payment</th>
                  <th className="px-5 py-3.5">Schedule</th>
                  <th className="px-5 py-3.5">Views / Clicks / Orders</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0E2BE]">
                {visibleCampaigns.map((c) => {
                  const ctr = c.impressions > 0 ? ((c.clicks / c.impressions) * 100).toFixed(1) : "0.0";
                  return (
                    <tr key={c.id} className="hover:bg-[#FFFDF8]">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-[#EAD296] bg-[#FFF8DB]">
                            {c.banner_image_url ? (
                              <img src={c.banner_image_url} alt={c.headline} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[#9A6503]">
                                <Store size={18} />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-[#14120F] line-clamp-1">{c.headline}</p>
                            <p className="text-[11px] font-semibold text-[#6E5C3D] line-clamp-1">
                              {c.product_ids?.length || 0} products • {c.placement_type.replace("_", " ")}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-black text-[#14120F]">
                          ₹{Number(c.amount_inr || 0).toLocaleString("en-IN")} ({c.duration_days}d)
                        </p>
                        <p className="text-[10px] font-bold uppercase text-[#7A6847]">
                          {c.payment_method.replace("_", " ")} • {c.payment_status}
                        </p>
                      </td>
                      <td className="px-5 py-4 font-bold text-[#5C4E35]">
                        {c.starts_at ? `${formatDate(c.starts_at)} – ${formatDate(c.ends_at)}` : "Awaiting approval"}
                      </td>
                      <td className="px-5 py-4 font-bold text-[#14120F]">
                        {c.impressions} views • {c.clicks} clicks ({ctr}%)
                        <span className="block text-[11px] text-emerald-700 font-black">
                          {c.attributed_orders} orders • ₹{Number(c.attributed_revenue || 0).toLocaleString("en-IN")}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase ${
                            STATUS_BADGE[c.approval_status] || STATUS_BADGE.pending_review
                          }`}
                        >
                          {c.approval_status.replace("_", " ")}
                        </span>
                        {c.rejection_reason && (
                          <p className="mt-1 text-[10px] font-bold text-rose-700">{c.rejection_reason}</p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {(c.approval_status === "live" ||
                          c.approval_status === "approved" ||
                          c.approval_status === "paused") && (
                          <button
                            type="button"
                            onClick={() => handleTogglePause(c)}
                            className="inline-flex items-center gap-1 rounded-xl border border-[#DFBE6F] bg-white px-3 py-1.5 text-[11px] font-black text-[#14120F] hover:border-[#F03A46] hover:text-[#F03A46] cursor-pointer"
                          >
                            {c.approval_status === "paused" ? (
                              <>
                                <Play size={12} /> Resume
                              </>
                            ) : (
                              <>
                                <Pause size={12} /> Pause
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* 3-STEP CAMPAIGN BUILDER MODAL */}
      {showBuilder && selectedPackage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setShowBuilder(false)}
        >
          <div
            className="w-full max-w-3xl rounded-[2rem] border border-[#EAD296] bg-white p-6 sm:p-8 shadow-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-[#F0E2BE] pb-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[#9A6503]">
                  Step {builderStep} of 3 • App Branding Builder
                </p>
                <h3 className="mt-1 text-xl font-black text-[#14120F]">
                  {selectedPackage.name} (₹{selectedPackage.amount_inr} / {selectedPackage.duration_days} Days)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBuilder(false)}
                className="rounded-xl border border-[#EAD296] p-2 text-[#5C4E35] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Step Body */}
            <div className="mt-5 flex-1 overflow-y-auto space-y-5 pr-1">
              {builderStep === 1 && (
                <div className="space-y-3">
                  <p className="text-xs font-bold text-[#5C4E35]">
                    Confirm your placement &amp; duration package:
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {packages.map((p) => {
                      const active = p.key === selectedPkgKey;
                      const disabled = p.key === "launch_pilot" && !seller.launchPilotEligible;
                      return (
                        <button
                          key={p.key}
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            setSelectedPkgKey(p.key);
                            if (p.key === "launch_pilot") setPaymentMethod("launch_pilot");
                            else if (paymentMethod === "launch_pilot") setPaymentMethod("upi_manual");
                          }}
                          className={`text-left rounded-2xl border p-4 transition-all cursor-pointer disabled:opacity-40 ${
                            active
                              ? "border-[#F03A46] bg-[#FFF4F2]/70 ring-2 ring-[#F03A46]/15"
                              : "border-[#EAD296] bg-[#FFFDF8] hover:border-[#C68A12]"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-[#14120F]">{p.name}</span>
                            <span className="text-sm font-black text-[#F03A46]">
                              ₹{p.amount_inr}
                            </span>
                          </div>
                          <p className="mt-1 text-[11px] font-semibold text-[#6E5C3D]">
                            {p.duration_days} Days • {p.summary}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {builderStep === 2 && (
                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider text-[#5C4E35] mb-1">
                        Brand Headline (Shown on ZebAlpha App)
                      </label>
                      <input
                        type="text"
                        maxLength={90}
                        value={headline}
                        onChange={(e) => setHeadline(e.target.value)}
                        placeholder="e.g. Kolkata Streetwear by Your Brand"
                        className="w-full rounded-xl border border-[#EAD296] px-3.5 py-2.5 text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider text-[#5C4E35] mb-1">
                        Short Brand Tagline
                      </label>
                      <input
                        type="text"
                        maxLength={140}
                        value={tagline}
                        onChange={(e) => setTagline(e.target.value)}
                        placeholder="e.g. Heavyweight 240 GSM tees & artisanal kurtis"
                        className="w-full rounded-xl border border-[#EAD296] px-3.5 py-2.5 text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider text-[#5C4E35] mb-1.5">
                        Select Products to Showcase ({selectedProductIds.length}/6)
                      </label>
                      <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                        {products.map((p) => {
                          const checked = selectedProductIds.includes(p.id);
                          return (
                            <label
                              key={p.id}
                              className={`flex items-center gap-2.5 rounded-xl border p-2.5 cursor-pointer ${
                                checked ? "border-[#F03A46] bg-[#FFF4F2]/60" : "border-[#F0E2BE] bg-[#FFFDF8]"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleProduct(p.id)}
                                className="h-4 w-4 accent-[#F03A46]"
                              />
                              <span className="text-xs font-bold text-[#14120F] truncate flex-1">
                                {p.name}
                              </span>
                              <span className="text-[11px] font-black text-[#9A6503]">₹{p.price}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* LIVE CUSTOMER APP PREVIEW CARD */}
                  <div className="rounded-2xl border border-[#DFBE6F] bg-gradient-to-b from-[#FFFDF8] to-[#FFF8EB] p-5 space-y-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#9A6503]">
                      Live Preview inside ZebAlpha App
                    </span>
                    <div className="rounded-2xl border border-[#EAD296] bg-white p-4 shadow-md space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full bg-[#FFF8DB] border border-[#DFBE6F] px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#9A6503]">
                          Featured Indian Brand
                        </span>
                        <span className="text-[10px] font-bold text-[#7A6847]">Sponsored</span>
                      </div>
                      <div>
                        <p className="text-sm font-black text-[#14120F]">
                          {headline || `Shop ${seller.storeName}`}
                        </p>
                        <p className="text-[11px] font-medium text-[#5C4E35]">
                          {tagline || "Curated styles delivered Pan-India"}
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {previewProducts.map((pp) => (
                          <div key={pp.id} className="rounded-xl border border-[#F0E2BE] bg-[#FFFDF8] p-1.5">
                            <div className="aspect-square overflow-hidden rounded-lg bg-[#FFF8DB]">
                              {pp.image_url ? (
                                <img src={pp.image_url} alt={pp.name} className="h-full w-full object-cover" />
                              ) : null}
                            </div>
                            <p className="mt-1 text-[10px] font-black text-[#14120F] truncate">
                              ₹{pp.price}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {builderStep === 3 && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-[#EAD296] bg-[#FFFDF8] p-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-[#14120F]">{selectedPackage.name}</p>
                      <p className="text-[11px] font-semibold text-[#6E5C3D]">
                        {selectedProductIds.length} products • {selectedPackage.duration_days} Days live upon Admin approval
                      </p>
                    </div>
                    <span className="text-2xl font-black text-[#F03A46]">
                      ₹{selectedPackage.amount_inr}
                    </span>
                  </div>

                  {selectedPackage.amount_inr === 0 ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex items-center gap-3 text-xs font-bold text-emerald-900">
                      <Gift size={20} className="text-emerald-600 shrink-0" />
                      <span>
                        Free Launch Pilot selected (₹0). Your campaign goes straight to our Admin &amp; Alpha Media Team for quick approval!
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs font-black text-[#14120F]">Choose Payment Method:</p>

                      {/* Option A: UPI / Razorpay */}
                      <label
                        className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer ${
                          paymentMethod === "upi_manual" || paymentMethod === "razorpay_upi"
                            ? "border-[#F03A46] bg-[#FFF4F2]/60"
                            : "border-[#EAD296] bg-white"
                        }`}
                      >
                        <input
                          type="radio"
                          name="brandPay"
                          checked={paymentMethod === "upi_manual" || paymentMethod === "razorpay_upi"}
                          onChange={() =>
                            setPaymentMethod(razorpayConfigured ? "razorpay_upi" : "upi_manual")
                          }
                          className="mt-1 accent-[#F03A46]"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CreditCard size={15} className="text-[#F03A46]" />
                            <span className="text-xs font-black text-[#14120F]">
                              Pay via UPI / GPay / PhonePe
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] font-semibold text-[#6E5C3D]">
                            Zero billing surprises. Full refund if campaign is not approved.
                          </p>
                          {!razorpayConfigured && (
                            <input
                              type="text"
                              value={upiRef}
                              onChange={(e) => setUpiRef(e.target.value)}
                              placeholder="Optional UPI UTR / Reference No. (or pay after approval)"
                              className="mt-2.5 w-full rounded-xl border border-[#EAD296] px-3 py-2 text-xs font-bold"
                            />
                          )}
                        </div>
                      </label>

                      {/* Option B: Seller Payout Balance */}
                      <label
                        className={`flex items-start gap-3 rounded-2xl border p-4 cursor-pointer ${
                          paymentMethod === "seller_balance"
                            ? "border-[#F03A46] bg-[#FFF4F2]/60"
                            : "border-[#EAD296] bg-white"
                        } ${seller.availableBalance < selectedPackage.amount_inr ? "opacity-55" : ""}`}
                      >
                        <input
                          type="radio"
                          name="brandPay"
                          disabled={seller.availableBalance < selectedPackage.amount_inr}
                          checked={paymentMethod === "seller_balance"}
                          onChange={() => setPaymentMethod("seller_balance")}
                          className="mt-1 accent-[#F03A46]"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <Wallet size={15} className="text-[#9A6503]" />
                            <span className="text-xs font-black text-[#14120F]">
                              Deduct from Available Payout Balance (₹
                              {seller.availableBalance.toLocaleString("en-IN")})
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] font-semibold text-[#6E5C3D]">
                            {seller.availableBalance >= selectedPackage.amount_inr
                              ? "Instant frictionless deduction from your settled earnings."
                              : `Needs ₹${selectedPackage.amount_inr} available balance.`}
                          </p>
                        </div>
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#F0E2BE] pt-4">
              <button
                type="button"
                onClick={() => (builderStep > 1 ? setBuilderStep((s) => (s - 1) as 1 | 2 | 3) : setShowBuilder(false))}
                className="rounded-xl border border-[#EAD296] bg-white px-4 py-2.5 text-xs font-extrabold text-[#5C4E35] cursor-pointer"
              >
                {builderStep > 1 ? "← Back" : "Cancel"}
              </button>

              {builderStep < 3 ? (
                <button
                  type="button"
                  onClick={() => setBuilderStep((s) => (s + 1) as 1 | 2 | 3)}
                  data-photo-overlay="true"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#F03A46] to-[#FF5757] px-6 py-2.5 text-xs font-black text-white shadow-md cursor-pointer"
                >
                  <span>Next Step</span>
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleSubmitCampaign}
                  data-photo-overlay="true"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#F03A46] to-[#FF5757] px-6 py-2.5 text-xs font-black text-white shadow-md disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles size={14} />
                  <span>{submitting ? "Submitting..." : "Submit for Approval"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
