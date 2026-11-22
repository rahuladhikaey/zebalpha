"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@shared/utils/supabaseClient";
import {
  Info,
  ShieldCheck,
  Search,
  PlayCircle,
  PackageCheck,
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
  Award,
  X,
  ArrowUpRight,
  RefreshCw,
  Star,
  Ban,
  Wrench,
  Store,
  Sparkles,
} from "lucide-react";

type QualityZone = "none" | "green" | "yellow" | "red" | "blocked";
type QualityTab = "blocking_soon" | "action_pending" | "fixed";
type SortOption = "relevance" | "highest_risk" | "lowest_rating" | "most_ratings" | "recent";

interface QualitySummary {
  lowRatingsCount: number;
  totalRatingsCount: number;
  avgRating: number | null;
  qualityScorePct: number | null;
  zone: QualityZone;
  totalProducts: number;
  counts: {
    blockingSoon: number;
    actionPending: number;
    fixed: number;
    blocked: number;
  };
  updatedAt: string;
}

interface FeedbackItem {
  theme: string;
  count: number;
  sharePct: number;
}

interface QualityProductItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  image_url: string | null;
  status: string;
  totalRatings: number;
  lowRatings: number;
  avgRating: number | null;
  qualityScorePct: number | null;
  zone: QualityZone;
  bucket: "blocked" | "blocking_soon" | "action_pending" | "fixed" | "healthy";
  feedback: Array<{ theme: string; count: number }>;
  listingImprovements: string[];
  fixedAt: string | null;
  fixedImprovements: string[];
  updatedAt: string;
}

const QUALITY_ZONES = [
  {
    key: "green" as const,
    views: "1.6X VIEWS",
    label: "Green",
    range: "0 - 15%",
    tip: "Excellent product quality! Eligible for 1.6X discovery visibility & Alpha Media social features.",
    barClass: "bg-emerald-300/90 text-emerald-950",
    badgeClass: "bg-emerald-50 border-emerald-300 text-emerald-800",
  },
  {
    key: "yellow" as const,
    views: "1X VIEWS",
    label: "Yellow",
    range: "15 - 22%",
    tip: "Average quality score. Review 1–2★ customer feedback and improve photos/specs to enter Green.",
    barClass: "bg-amber-300/90 text-amber-950",
    badgeClass: "bg-amber-50 border-amber-300 text-amber-800",
  },
  {
    key: "red" as const,
    views: "0.6X VIEWS",
    label: "Red",
    range: "22 - 25%",
    tip: "At risk of getting blocked! Visibility drops to 0.6X. Fix product defects or listing mismatches immediately.",
    barClass: "bg-rose-200 text-rose-950",
    badgeClass: "bg-rose-50 border-rose-300 text-rose-800",
  },
  {
    key: "blocked" as const,
    views: "NO VIEWS",
    label: "Blocked",
    range: "More than 25%",
    tip: "Products crossing 25% 1–2★ ratings lose storefront visibility until fixed and re-verified.",
    barClass: "bg-rose-400/90 text-rose-950",
    badgeClass: "bg-red-50 border-red-300 text-red-800",
  },
];

function formatDateShort(iso?: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export default function SellerQualityPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<QualitySummary>({
    lowRatingsCount: 0,
    totalRatingsCount: 0,
    avgRating: null,
    qualityScorePct: null,
    zone: "none",
    totalProducts: 0,
    counts: { blockingSoon: 0, actionPending: 0, fixed: 0, blocked: 0 },
    updatedAt: "",
  });
  const [topFeedback, setTopFeedback] = useState<FeedbackItem[]>([]);
  const [products, setProducts] = useState<QualityProductItem[]>([]);

  const [activeTab, setActiveTab] = useState<QualityTab>("action_pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("relevance");
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showLearnModal, setShowLearnModal] = useState(false);
  const [showBlockedModal, setShowBlockedModal] = useState(false);

  const loadQualityData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/seller/quality", {
        headers,
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = await res.json();
      if (json.success) {
        if (json.summary) setSummary(json.summary);
        if (Array.isArray(json.topFeedback)) setTopFeedback(json.topFeedback);
        if (Array.isArray(json.products)) setProducts(json.products);
      }
    } catch (err) {
      console.error("[Seller Quality] Failed to load quality data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadQualityData(false);
  }, [loadQualityData]);

  const handleMarkFixed = async (item: QualityProductItem) => {
    setMarkingId(item.id);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/seller/quality", {
        method: "POST",
        headers,
        body: JSON.stringify({
          productId: item.id,
          action: "mark_fixed",
          improvementsFixed:
            item.listingImprovements.length > 0
              ? item.listingImprovements
              : ["Reviewed customer feedback and updated catalog quality"],
        }),
      });
      const json = await res.json();
      if (json.success) {
        setToastMsg(`"${item.name}" marked as Fixed and moved to the Fixed tab.`);
        setTimeout(() => setToastMsg(null), 4000);
        await loadQualityData(true);
      }
    } catch (err) {
      console.error("[Seller Quality] mark_fixed error:", err);
    } finally {
      setMarkingId(null);
    }
  };

  const blockedProducts = useMemo(
    () => products.filter((p) => p.bucket === "blocked"),
    [products]
  );

  const visibleRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = products.filter((p) => {
      if (p.bucket !== activeTab) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
      );
    });

    const sorted = [...filtered];
    if (sortBy === "highest_risk") {
      sorted.sort((a, b) => (b.qualityScorePct ?? -1) - (a.qualityScorePct ?? -1));
    } else if (sortBy === "lowest_rating") {
      sorted.sort((a, b) => (a.avgRating ?? 99) - (b.avgRating ?? 99));
    } else if (sortBy === "most_ratings") {
      sorted.sort((a, b) => b.totalRatings - a.totalRatings);
    } else if (sortBy === "recent") {
      sorted.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    } else {
      // Relevance: items with actual low ratings first, then most listing improvements
      sorted.sort((a, b) => {
        if (b.lowRatings !== a.lowRatings) return b.lowRatings - a.lowRatings;
        return b.listingImprovements.length - a.listingImprovements.length;
      });
    }
    return sorted;
  }, [products, activeTab, searchQuery, sortBy]);

  const activeZoneDef = QUALITY_ZONES.find((z) => z.key === summary.zone) || null;

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-6 animate-pulse">
        <div className="h-10 w-64 rounded-xl bg-[#F3E6C5]" />
        <div className="h-12 rounded-2xl bg-emerald-50 border border-emerald-200" />
        <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
          <div className="h-64 rounded-3xl bg-white border border-[#EAD296]" />
          <div className="h-64 rounded-3xl bg-white border border-[#EAD296]" />
        </div>
        <div className="h-80 rounded-3xl bg-white border border-[#EAD296]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-10">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-2xl border border-emerald-300 bg-emerald-50 px-5 py-3.5 text-xs font-black text-emerald-900 shadow-xl">
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 1. PAGE HEADER ROW */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#14120F]">
            Product Quality
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-semibold text-[#6E5C3D]">
            Monitor verified customer ratings, protect storefront visibility &amp; resolve catalog quality issues early.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => loadQualityData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#EAD296] bg-white px-3.5 py-2.5 text-xs font-extrabold text-[#5C4E35] hover:bg-[#FFF8DB] transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin text-[#F03A46]" : "text-[#9A6503]"} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => setShowLearnModal(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-[#EAD296] bg-white px-4 py-2.5 text-xs font-black text-[#14120F] hover:border-[#F03A46] hover:bg-[#FFF4F2] transition-all shadow-sm cursor-pointer"
          >
            <PlayCircle size={17} className="text-[#F03A46]" />
            <span>Learn about Quality</span>
          </button>
        </div>
      </div>

      {/* 2. TRUSTED & VERIFIED CUSTOMERS STATUS BANNER */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-emerald-300 bg-emerald-50/80 px-4 py-3 text-xs font-bold text-emerald-950 shadow-sm">
        <Info size={16} className="text-emerald-700 shrink-0" />
        <span>Quality score updated. Based on ratings from</span>
        <span
          data-photo-overlay="true"
          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-[11px] font-black text-white shadow-sm"
        >
          <ShieldCheck size={13} />
          Trusted and verified customers
        </span>
      </div>

      {/* 3. TOP 2-COLUMN OVERVIEW: QUALITY SCORE + TOP CUSTOMER FEEDBACK */}
      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        {/* LEFT: QUALITY SCORE CARD */}
        <section className="flex flex-col justify-between rounded-[1.5rem] border border-[#EAD296] bg-white p-6 shadow-[0_10px_28px_rgba(166,124,28,0.07)]">
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <h2 className="text-base sm:text-lg font-black text-[#14120F]">Quality Score</h2>
                <button
                  type="button"
                  onClick={() => setShowLearnModal(true)}
                  className="text-[#9A6503] hover:text-[#F03A46] cursor-pointer"
                  title="Quality Score = (1 & 2 star ratings / Total ratings) × 100"
                >
                  <Info size={15} />
                </button>
              </div>
              {summary.avgRating !== null && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF8DB] border border-[#DFBE6F] px-3 py-1 text-xs font-black text-[#9A6503]">
                  <Star size={12} className="fill-[#F5B922] text-[#F5B922]" />
                  {summary.avgRating} Avg Rating
                </span>
              )}
            </div>

            <p className="mt-1.5 text-xs font-semibold text-[#6E5C3D] flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>
                1 and 2 star ratings <strong className="text-[#14120F]">{summary.lowRatingsCount}</strong>
              </span>
              <span>•</span>
              <span>
                Total Ratings <strong className="text-[#14120F]">{summary.totalRatingsCount}</strong>
              </span>
              <span>•</span>
              <span>
                Quality Score ={" "}
                <strong className="text-[#14120F]">
                  {summary.qualityScorePct !== null ? `${summary.qualityScorePct}%` : "N/A"}
                </strong>
              </span>
            </p>
          </div>

          {/* Center Score Display or Empty State */}
          <div className="my-7 flex flex-col items-center justify-center text-center">
            {summary.qualityScorePct === null ? (
              <>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF8DB] border border-[#EAD296] text-[#9A6503]">
                  <Award size={26} />
                </div>
                <h3 className="mt-3 text-base font-black text-[#14120F]">No score available</h3>
                <p className="mt-1 text-xs font-semibold text-[#6E5C3D]">
                  Since you don&apos;t have enough ratings.
                </p>
              </>
            ) : (
              <>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black tracking-tight text-[#14120F]">
                    {summary.qualityScorePct}%
                  </span>
                  {activeZoneDef && (
                    <span
                      className={`rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-wider ${activeZoneDef.badgeClass}`}
                    >
                      {activeZoneDef.label} • {activeZoneDef.views}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-xs font-semibold text-[#6E5C3D]">
                  Lower 1–2★ percentage gives higher discovery visibility across ZebAlpha.
                </p>
              </>
            )}
          </div>

          {/* 4-ZONE HORIZONTAL VISIBILITY BAR (Green / Yellow / Red / Blocked) */}
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-1 overflow-hidden rounded-full">
              {QUALITY_ZONES.map((z) => {
                const isCurrent = summary.zone === z.key;
                return (
                  <div
                    key={z.key}
                    title={z.tip}
                    className={`relative py-2 text-center text-[10px] sm:text-[11px] font-black tracking-wide transition-all ${z.barClass} ${
                      isCurrent ? "ring-2 ring-inset ring-[#14120F]" : ""
                    }`}
                  >
                    {z.views}
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-4 gap-1 text-center">
              {QUALITY_ZONES.map((z) => {
                const isCurrent = summary.zone === z.key;
                return (
                  <div key={z.key} title={z.tip} className="space-y-0.5">
                    <p
                      className={`text-xs flex items-center justify-center gap-1 ${
                        isCurrent ? "font-black text-[#F03A46]" : "font-extrabold text-[#14120F]"
                      }`}
                    >
                      <span>{z.label}</span>
                      <Info size={11} className="text-[#9A6503] hidden sm:inline" />
                    </p>
                    <p className="text-[10px] sm:text-[11px] font-semibold text-[#6E5C3D]">
                      {z.range}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* RIGHT: TOP CUSTOMER FEEDBACK CARD */}
        <section className="flex flex-col rounded-[1.5rem] border border-[#EAD296] bg-white p-6 shadow-[0_10px_28px_rgba(166,124,28,0.07)]">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base sm:text-lg font-black text-[#14120F]">
              Top Customer Feedback
            </h2>
            <span className="text-[11px] font-bold text-[#7A6847]">From 1–2★ &amp; Returns</span>
          </div>

          {topFeedback.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFFDF8] border border-[#EAD296] text-[#9A6503]">
                <ClipboardCheck size={26} />
              </div>
              <h3 className="mt-3 text-base font-black text-[#14120F]">No feedback available</h3>
              <p className="mt-1 max-w-xs text-xs font-semibold text-[#6E5C3D]">
                Great work! Continue listing good quality products
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-3.5 flex-1">
              {topFeedback.map((fb) => (
                <div key={fb.theme} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-[#14120F]">{fb.theme}</span>
                    <span className="font-black text-[#F03A46]">
                      {fb.count} {fb.count === 1 ? "report" : "reports"} ({fb.sharePct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#FFF3C4] border border-[#EAD296]/60">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#F03A46] to-[#F5B922]"
                      style={{ width: `${Math.max(10, fb.sharePct)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* 4. QUALITY RECOMMENDATIONS TABLE CARD (3 TABS + VIEW BLOCKED PRODUCTS) */}
      <section className="overflow-hidden rounded-[1.5rem] border border-[#EAD296] bg-white shadow-[0_12px_32px_rgba(166,124,28,0.08)]">
        {/* Card Header + Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 pt-6 pb-4">
          <h2 className="text-lg font-black text-[#14120F]">Quality Recommendations</h2>

          <div className="relative w-full sm:w-80">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9A6503]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search By Style / SKU / Catalog ID"
              className="w-full rounded-xl border border-[#EAD296] bg-[#FFFDF8] py-2.5 pl-10 pr-4 text-xs font-bold text-[#14120F] placeholder:text-[#9C8B6B] outline-none focus:border-[#F03A46] focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Tabs Bar + View Blocked Products */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0E2BE] px-6">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
            {[
              {
                key: "blocking_soon" as const,
                label: `Blocking Soon (${summary.counts.blockingSoon})`,
              },
              {
                key: "action_pending" as const,
                label: `Action Pending (${summary.counts.actionPending})`,
              },
              {
                key: "fixed" as const,
                label: `Fixed (${summary.counts.fixed})`,
              },
            ].map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`whitespace-nowrap border-b-[3px] px-3.5 py-3 text-xs sm:text-sm transition-all cursor-pointer ${
                    isActive
                      ? "border-[#F03A46] font-black text-[#F03A46]"
                      : "border-transparent font-bold text-[#6E5C3D] hover:text-[#14120F]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setShowBlockedModal(true)}
            className="mb-2 sm:mb-0 inline-flex items-center gap-1.5 text-xs font-black text-[#F03A46] hover:underline cursor-pointer"
          >
            <span>View Blocked Products ({summary.counts.blocked})</span>
            <Info size={14} />
          </button>
        </div>

        {/* Sort Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-[#FFFDF8]/60">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-bold text-[#6E5C3D]">Sort by :</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="rounded-xl border border-[#EAD296] bg-white px-3.5 py-2 text-xs font-extrabold text-[#14120F] outline-none focus:border-[#F03A46] cursor-pointer"
            >
              <option value="relevance">Relevance</option>
              <option value="highest_risk">Highest Defect %</option>
              <option value="lowest_rating">Lowest Star Rating</option>
              <option value="most_ratings">Most Ratings</option>
              <option value="recent">Recently Updated</option>
            </select>
          </div>
          <span className="text-[11px] font-bold text-[#7A6847]">
            Showing {visibleRows.length} {visibleRows.length === 1 ? "catalog" : "catalogs"}
          </span>
        </div>

        {/* Fixed Tab Amber Notice Banner (Exact match to Screenshot 3) */}
        {activeTab === "fixed" && (
          <div className="mx-6 mb-4 flex items-center gap-2.5 rounded-xl border border-[#F5B922]/60 bg-[#FFF8DB] px-4 py-3 text-xs font-bold text-[#6E4900]">
            <Info size={15} className="text-[#B45309] shrink-0" />
            <span>Growth for fixed products takes around 1–3 months to reflect</span>
          </div>
        )}

        {/* Table Header + Rows */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left border-collapse">
            <thead>
              <tr className="border-y border-[#EAD296]/80 bg-[#FFF8EB] text-[11px] font-black uppercase tracking-wider text-[#5C4E35]">
                <th className="px-6 py-3.5 w-[32%]">Product Details and Quality Score</th>
                <th className="px-5 py-3.5 w-[24%]">
                  <span className="block">Top Customer Feedback</span>
                  <span className="block text-[10px] font-semibold normal-case text-[#7A6847]">
                    from 1 &amp; 2 star ratings
                  </span>
                </th>
                {activeTab === "fixed" ? (
                  <>
                    <th className="px-5 py-3.5 w-[16%]">Fixed Date</th>
                    <th className="px-5 py-3.5 w-[28%]">Listing Improvements Fixed</th>
                  </>
                ) : (
                  <>
                    <th className="px-5 py-3.5 w-[28%]">Product Listing Improvements</th>
                    <th className="px-5 py-3.5 w-[16%] text-right">Action</th>
                  </>
                )}
              </tr>
            </thead>

            {visibleRows.length > 0 && (
              <tbody className="divide-y divide-[#F0E2BE] text-xs">
                {visibleRows.map((item) => {
                  const zoneObj = QUALITY_ZONES.find((z) => z.key === item.zone);
                  return (
                    <tr key={item.id} className="hover:bg-[#FFFDF8] transition-colors align-top">
                      {/* Column 1: Product Details & Score */}
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-3.5">
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#EAD296] bg-[#FFF8DB]">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Store size={20} className="text-[#9A6503]" />
                            )}
                          </div>
                          <div className="min-w-0 space-y-1">
                            <p className="font-black text-[#14120F] line-clamp-2 leading-snug">
                              {item.name}
                            </p>
                            <p className="text-[11px] font-bold text-[#7A6847]">
                              SKU: {item.sku} • ₹{item.price.toLocaleString("en-IN")}
                            </p>
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              {item.qualityScorePct !== null && zoneObj ? (
                                <span
                                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black ${zoneObj.badgeClass}`}
                                >
                                  {item.qualityScorePct}% ({zoneObj.label})
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full border border-[#EAD296] bg-[#FFFDF8] px-2 py-0.5 text-[10px] font-bold text-[#7A6847]">
                                  No ratings yet
                                </span>
                              )}
                              {item.avgRating !== null && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-[#9A6503]">
                                  <Star size={10} className="fill-[#F5B922] text-[#F5B922]" />
                                  {item.avgRating} ({item.totalRatings})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Top Customer Feedback */}
                      <td className="px-5 py-4">
                        {item.feedback.length === 0 ? (
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                            <CheckCircle2 size={13} />
                            No 1–2★ complaints
                          </span>
                        ) : (
                          <ul className="space-y-1.5">
                            {item.feedback.map((fb) => (
                              <li
                                key={fb.theme}
                                className="flex items-center justify-between gap-2 rounded-lg bg-[#FFF4F2] border border-[#F03A46]/20 px-2.5 py-1 text-[11px] font-bold text-[#991B1B]"
                              >
                                <span>{fb.theme}</span>
                                <span className="font-black">×{fb.count}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>

                      {/* Column 3 & 4 depend on Fixed vs Action/Blocking */}
                      {activeTab === "fixed" ? (
                        <>
                          <td className="px-5 py-4 font-extrabold text-[#14120F] whitespace-nowrap">
                            {formatDateShort(item.fixedAt)}
                          </td>
                          <td className="px-5 py-4">
                            <ul className="space-y-1.5">
                              {item.fixedImprovements.map((imp) => (
                                <li
                                  key={imp}
                                  className="flex items-start gap-1.5 text-[11px] font-semibold text-emerald-800"
                                >
                                  <CheckCircle2 size={13} className="mt-0.5 shrink-0 text-emerald-600" />
                                  <span>{imp}</span>
                                </li>
                              ))}
                            </ul>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-5 py-4">
                            <ul className="space-y-1.5">
                              {item.listingImprovements.slice(0, 3).map((tip) => (
                                <li
                                  key={tip}
                                  className="flex items-start gap-1.5 text-[11px] font-semibold text-[#4A3F2B]"
                                >
                                  <Wrench size={12} className="mt-0.5 shrink-0 text-[#9A6503]" />
                                  <span>{tip}</span>
                                </li>
                              ))}
                            </ul>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex flex-col items-end gap-2">
                              <Link
                                href="/dashboard/products"
                                data-photo-overlay="true"
                                className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-[#F03A46] to-[#FF5757] px-3.5 py-2 text-[11px] font-black text-white shadow-sm hover:brightness-105 transition-all"
                              >
                                <span>Fix Listing</span>
                                <ArrowUpRight size={13} />
                              </Link>
                              <button
                                type="button"
                                disabled={markingId === item.id}
                                onClick={() => handleMarkFixed(item)}
                                className="inline-flex items-center gap-1 rounded-xl border border-[#DFBE6F] bg-[#FFFDF8] px-3 py-1.5 text-[11px] font-extrabold text-[#5C4E35] hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-800 transition-all cursor-pointer disabled:opacity-50"
                              >
                                <CheckCircle2 size={12} />
                                <span>{markingId === item.id ? "Saving..." : "Mark Fixed"}</span>
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            )}
          </table>

          {/* EMPTY STATES FOR EACH TAB (Matching Screenshots 1, 2 & 3) */}
          {visibleRows.length === 0 && (
            <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
              {activeTab === "blocking_soon" && (
                <>
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFF8DB] border border-[#EAD296] text-[#9A6503]">
                    <PackageCheck size={30} />
                  </div>
                  <h3 className="mt-4 text-base font-black text-[#14120F]">
                    None of your products are at risk of being blocked.
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-[#6E5C3D]">
                    Regularly check this dashboard to catch issues early.
                  </p>
                </>
              )}

              {activeTab === "action_pending" && (
                <>
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700">
                    <ShieldCheck size={30} />
                  </div>
                  <h3 className="mt-4 text-base font-black text-[#14120F]">
                    No pending quality actions!
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-[#6E5C3D]">
                    {searchQuery
                      ? "No matching products found for your search query."
                      : "Great work! All your listings meet ZebAlpha's quality checklist."}
                  </p>
                </>
              )}

              {activeTab === "fixed" && (
                <>
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFF8DB] border border-[#EAD296] text-[#9A6503]">
                    <Award size={30} />
                    <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#F03A46] text-[11px] font-black text-white shadow">
                      0
                    </span>
                  </div>
                  <h3 className="mt-4 text-base font-black text-[#14120F]">
                    No fixed products as of now
                  </h3>
                  <p className="mt-1 text-xs font-semibold text-[#6E5C3D]">
                    But keep checking this section from time to time.
                  </p>
                </>
              )}
            </div>
          )}
        </div>
      </section>

      {/* LEARN ABOUT QUALITY GUIDE MODAL */}
      {showLearnModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setShowLearnModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-[2rem] border border-[#EAD296] bg-white p-6 sm:p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF8DB] border border-[#DFBE6F] px-3 py-1 text-[10px] font-black uppercase tracking-widest text-[#9A6503]">
                  <Sparkles size={11} className="text-[#F03A46]" />
                  ZebAlpha Quality Guide
                </span>
                <h3 className="mt-3 text-xl font-black text-[#14120F]">
                  How Product Quality Score Boosts Your Sales
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowLearnModal(false)}
                className="rounded-xl border border-[#EAD296] bg-[#FFFDF8] p-2 text-[#5C4E35] hover:bg-[#FFF4F2] hover:text-[#F03A46] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs sm:text-sm font-medium text-[#5C4E35] leading-relaxed">
              <p>
                <strong>Quality Score</strong> measures the percentage of{" "}
                <strong>1-star and 2-star ratings</strong> received from verified ZebAlpha buyers
                out of your total ratings.
              </p>
              <ul className="space-y-2.5 rounded-2xl border border-[#F0E2BE] bg-[#FFFDF8] p-4">
                <li className="flex items-start gap-2">
                  <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />
                  <span>
                    <strong>Green (0–15%):</strong> Unlocks <strong>1.6X discovery views</strong> &amp; priority eligibility for our <strong>Alpha Media Team</strong> daily Instagram/Facebook reels.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0 text-amber-600" />
                  <span>
                    <strong>Yellow (15–22%) &amp; Red (22–25%):</strong> Check Top Customer Feedback and add Real Product Video Proof, clear sizing &amp; accurate color photos before blocking occurs.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Ban size={15} className="mt-0.5 shrink-0 text-rose-600" />
                  <span>
                    <strong>Blocked (&gt;25%):</strong> Hidden from storefront until quality fixes are completed and reviewed with our <strong>Alpha Seller Support Team</strong>.
                  </span>
                </li>
              </ul>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowLearnModal(false)}
                className="rounded-xl border border-[#EAD296] bg-white px-4 py-2.5 text-xs font-extrabold text-[#5C4E35] hover:bg-[#FFF8DB] cursor-pointer"
              >
                Got It
              </button>
              <Link
                href="/dashboard/products"
                onClick={() => setShowLearnModal(false)}
                data-photo-overlay="true"
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#F03A46] to-[#FF5757] px-5 py-2.5 text-xs font-black text-white shadow-md"
              >
                <span>Improve Catalogs</span>
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* VIEW BLOCKED PRODUCTS MODAL */}
      {showBlockedModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setShowBlockedModal(false)}
        >
          <div
            className="w-full max-w-2xl rounded-[2rem] border border-[#EAD296] bg-white p-6 sm:p-8 shadow-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#F0E2BE] pb-4">
              <div>
                <h3 className="text-lg font-black text-[#14120F]">
                  Blocked Products ({blockedProducts.length})
                </h3>
                <p className="mt-0.5 text-xs font-semibold text-[#6E5C3D]">
                  Products blocked due to &gt;25% 1–2★ quality defects or policy hold.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBlockedModal(false)}
                className="rounded-xl border border-[#EAD296] bg-[#FFFDF8] p-2 text-[#5C4E35] hover:bg-[#FFF4F2] hover:text-[#F03A46] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 flex-1 overflow-y-auto space-y-3">
              {blockedProducts.length === 0 ? (
                <div className="py-10 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700">
                    <ShieldCheck size={28} />
                  </div>
                  <p className="mt-3 text-sm font-black text-[#14120F]">
                    Zero blocked products!
                  </p>
                  <p className="mt-1 text-xs font-semibold text-[#6E5C3D]">
                    Keep maintaining accurate sizing, authentic photos &amp; high product quality.
                  </p>
                </div>
              ) : (
                blockedProducts.map((bp) => (
                  <div
                    key={bp.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-rose-200 bg-[#FFF4F2]/70 p-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-rose-200 bg-white">
                        {bp.image_url ? (
                          <img src={bp.image_url} alt={bp.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-rose-500">
                            <Ban size={18} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-[#14120F] truncate">{bp.name}</p>
                        <p className="text-[11px] font-bold text-rose-700">
                          SKU: {bp.sku} •{" "}
                          {bp.qualityScorePct !== null
                            ? `${bp.qualityScorePct}% 1–2★ ratings`
                            : "Status: BLOCKED"}
                        </p>
                      </div>
                    </div>
                    <Link
                      href="/dashboard/support"
                      onClick={() => setShowBlockedModal(false)}
                      className="inline-flex shrink-0 items-center justify-center rounded-xl border border-[#F03A46] bg-white px-4 py-2 text-xs font-black text-[#F03A46] hover:bg-[#F03A46] hover:text-white transition-all"
                    >
                      Appeal via Support
                    </Link>
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
