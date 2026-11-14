"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Sparkles,
  Eye,
  MousePointerClick,
  Percent,
  ShoppingCart,
  CreditCard,
  Activity,
  RefreshCw,
  Smartphone,
  Globe,
  Search,
  Layers,
  AlertTriangle,
} from "lucide-react";

interface AnalyticsData {
  migrationPending?: boolean;
  days: number;
  platform: string;
  kpis: {
    impressions: number;
    clicks: number;
    ctrPercent: number;
    cartAdds: number;
    wishlistAdds: number;
    purchases: number;
    attributedRevenue: number;
    totalEvents: number;
  };
  topProducts: Array<{
    productId: string;
    name: string;
    imageUrl: string;
    price: number;
    impressions: number;
    clicks: number;
    ctrPercent: number;
    cartAdds: number;
    purchases: number;
    attributedRevenue: number;
  }>;
  topCategories: Array<{
    categoryId: string;
    name: string;
    totalEvents: number;
    views: number;
    cartAdds: number;
    clicks: number;
  }>;
  surfaceBreakdown: Array<{
    surface: string;
    impressions: number;
    clicks: number;
    purchases: number;
    ctrPercent: number;
  }>;
  strategyBreakdown: Array<{
    strategy: string;
    impressions: number;
    clicks: number;
    purchases: number;
    ctrPercent: number;
  }>;
  platformBreakdown: {
    website: { impressions: number; clicks: number; purchases: number };
    android: { impressions: number; clicks: number; purchases: number };
  };
  topSearches: Array<{ query: string; count: number }>;
}

export default function RecommendationAnalyticsView() {
  const [days, setDays] = useState<number>(30);
  const [platform, setPlatform] = useState<string>("all");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");
  const [data, setData] = useState<AnalyticsData | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/admin/recommendations/analytics?days=${days}&platform=${encodeURIComponent(platform)}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (!res.ok || !json?.success) {
        setError(json?.message || json?.error || "Failed to load recommendation analytics");
      } else {
        setData(json);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Network error loading analytics");
    } finally {
      setLoading(false);
    }
  }, [days, platform]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchAnalytics();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchAnalytics]);

  const k = data?.kpis;

  return (
    <div className="space-y-8 text-white animate-in fade-in duration-300">
      {/* Header + Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 rounded-3xl bg-gradient-to-r from-[#070c0a] via-zinc-900 to-black border border-emerald-500/30 p-6 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-400">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-400">
              ZebAlpha Recommendation Intelligence
            </p>
            <h2 className="text-2xl font-black tracking-tight text-white">
              Recommendation Performance & Attribution
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex rounded-xl bg-zinc-950 border border-zinc-800 p-1">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  days === d
                    ? "bg-emerald-500 text-black"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {d}D
              </button>
            ))}
          </div>

          <div className="flex rounded-xl bg-zinc-950 border border-zinc-800 p-1">
            {[
              { id: "all", label: "All Platforms" },
              { id: "website", label: "Website" },
              { id: "android", label: "Android App" },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPlatform(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  platform === p.id
                    ? "bg-white text-black"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={fetchAnalytics}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 border border-zinc-700 px-3.5 py-2 text-xs font-bold text-white hover:border-emerald-500/60 transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {data?.migrationPending && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-950/20 p-4 text-xs text-amber-200">
          <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-300">
              Recommendation database migration pending
            </p>
            <p className="text-amber-200/80 mt-0.5">
              Apply <code className="text-white">supabase/add_personalized_recommendation_system.sql</code> in Supabase SQL Editor to begin persisting impressions, clicks, and cross-platform customer events.
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-950/30 p-4 text-xs font-bold text-rose-300">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          {
            label: "Impressions",
            value: (k?.impressions ?? 0).toLocaleString("en-IN"),
            icon: Eye,
            accent: "text-emerald-400",
          },
          {
            label: "Rec Clicks",
            value: (k?.clicks ?? 0).toLocaleString("en-IN"),
            icon: MousePointerClick,
            accent: "text-sky-400",
          },
          {
            label: "CTR Rate",
            value: `${k?.ctrPercent ?? 0}%`,
            icon: Percent,
            accent: "text-emerald-300",
          },
          {
            label: "Rec Cart Adds",
            value: (k?.cartAdds ?? 0).toLocaleString("en-IN"),
            icon: ShoppingCart,
            accent: "text-amber-400",
          },
          {
            label: "Attributed Orders",
            value: (k?.purchases ?? 0).toLocaleString("en-IN"),
            sub: `₹${(k?.attributedRevenue ?? 0).toLocaleString("en-IN")} rev`,
            icon: CreditCard,
            accent: "text-emerald-400",
          },
          {
            label: "Signals Logged",
            value: (k?.totalEvents ?? 0).toLocaleString("en-IN"),
            icon: Activity,
            accent: "text-purple-400",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl bg-zinc-950 border border-zinc-800/90 p-4 space-y-2 shadow-lg"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
                  {card.label}
                </span>
                <Icon className={`h-4 w-4 ${card.accent}`} />
              </div>
              <p className="text-2xl font-black text-white">{loading && !data ? "—" : card.value}</p>
              {card.sub && <p className="text-[11px] font-bold text-emerald-400">{card.sub}</p>}
            </div>
          );
        })}
      </div>

      {/* Platform & Surface Attribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-3xl bg-zinc-950 border border-zinc-800 p-5 space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-zinc-200 flex items-center gap-2">
            <Globe className="h-4 w-4 text-emerald-400" /> Cross-Platform Sync Breakdown
          </h3>
          <div className="space-y-3">
            {[
              {
                name: "Website",
                icon: Globe,
                stats: data?.platformBreakdown?.website,
              },
              {
                name: "Android App",
                icon: Smartphone,
                stats: data?.platformBreakdown?.android,
              },
            ].map((row) => {
              const Icon = row.icon;
              const imps = row.stats?.impressions ?? 0;
              const clks = row.stats?.clicks ?? 0;
              const ctr = imps > 0 ? ((clks / imps) * 100).toFixed(1) : "0.0";
              return (
                <div
                  key={row.name}
                  className="flex items-center justify-between rounded-2xl bg-zinc-900/70 border border-zinc-800 p-3.5"
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 text-emerald-400" />
                    <div>
                      <p className="text-xs font-bold text-white">{row.name}</p>
                      <p className="text-[11px] text-zinc-400">
                        {imps} impressions • {clks} clicks
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-emerald-400">{ctr}% CTR</p>
                    <p className="text-[10px] text-zinc-400">
                      {row.stats?.purchases ?? 0} purchases
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-3xl bg-zinc-950 border border-zinc-800 p-5 space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-zinc-200 flex items-center gap-2">
            <Layers className="h-4 w-4 text-emerald-400" /> Surface Performance
          </h3>
          <div className="space-y-2.5">
            {data?.surfaceBreakdown && data.surfaceBreakdown.length > 0 ? (
              data.surfaceBreakdown.map((s) => (
                <div
                  key={s.surface}
                  className="flex items-center justify-between rounded-xl bg-zinc-900/70 border border-zinc-800 px-3.5 py-2.5 text-xs"
                >
                  <span className="font-bold text-white capitalize">
                    {s.surface.replace(/_/g, " ")}
                  </span>
                  <span className="text-zinc-400">
                    {s.impressions} imp / {s.clicks} clk ({s.ctrPercent}%)
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-zinc-500 py-4 text-center">
                No surface impression data recorded yet.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-3xl bg-zinc-950 border border-zinc-800 p-5 space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-zinc-200 flex items-center gap-2">
            <Search className="h-4 w-4 text-emerald-400" /> Top Search Intent Queries
          </h3>
          <div className="flex flex-wrap gap-2">
            {data?.topSearches && data.topSearches.length > 0 ? (
              data.topSearches.map((s) => (
                <span
                  key={s.query}
                  className="inline-flex items-center gap-1.5 rounded-full bg-zinc-900 border border-zinc-800 px-3 py-1 text-xs font-bold text-zinc-200"
                >
                  <span>&quot;{s.query}&quot;</span>
                  <span className="text-emerald-400">({s.count})</span>
                </span>
              ))
            ) : (
              <p className="text-xs text-zinc-500 py-4 w-full text-center">
                No search intent queries recorded in this window.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tables: Top Recommended Products & Most Engaged Categories */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Top Recommended Products */}
        <div className="rounded-3xl bg-zinc-950 border border-zinc-800 p-5 space-y-4 overflow-x-auto">
          <h3 className="text-sm font-black uppercase tracking-wider text-zinc-200">
            Top Recommended Products (Real Attribution)
          </h3>
          {data?.topProducts && data.topProducts.length > 0 ? (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-[10px] uppercase tracking-wider text-zinc-400">
                  <th className="py-2 pr-3">Product</th>
                  <th className="py-2 px-2 text-right">Imp</th>
                  <th className="py-2 px-2 text-right">Clicks</th>
                  <th className="py-2 px-2 text-right">CTR</th>
                  <th className="py-2 px-2 text-right">Carts</th>
                  <th className="py-2 pl-2 text-right">Orders</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {data.topProducts.map((p) => (
                  <tr key={p.productId} className="hover:bg-zinc-900/40">
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2.5 min-w-[160px]">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="h-9 w-9 rounded-lg object-cover bg-zinc-900 shrink-0"
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-lg bg-zinc-900 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate max-w-[200px]">
                            {p.name}
                          </p>
                          <p className="text-[10px] text-zinc-400">
                            ₹{p.price.toLocaleString("en-IN")}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-zinc-300">
                      {p.impressions}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono text-white font-bold">
                      {p.clicks}
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold text-emerald-400">
                      {p.ctrPercent}%
                    </td>
                    <td className="py-2.5 px-2 text-right text-amber-300 font-bold">
                      {p.cartAdds}
                    </td>
                    <td className="py-2.5 pl-2 text-right text-emerald-300 font-black">
                      {p.purchases}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-zinc-500 py-8 text-center">
              No real product recommendation impressions recorded yet.
            </p>
          )}
        </div>

        {/* Most Engaged Categories */}
        <div className="rounded-3xl bg-zinc-950 border border-zinc-800 p-5 space-y-4 overflow-x-auto">
          <h3 className="text-sm font-black uppercase tracking-wider text-zinc-200">
            Most Engaged Categories
          </h3>
          {data?.topCategories && data.topCategories.length > 0 ? (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-[10px] uppercase tracking-wider text-zinc-400">
                  <th className="py-2 pr-3">Category</th>
                  <th className="py-2 px-2 text-right">Signals</th>
                  <th className="py-2 px-2 text-right">Views</th>
                  <th className="py-2 px-2 text-right">Rec Clicks</th>
                  <th className="py-2 pl-2 text-right">Cart Adds</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {data.topCategories.map((c) => (
                  <tr key={c.categoryId} className="hover:bg-zinc-900/40">
                    <td className="py-2.5 pr-3 font-bold text-white">{c.name}</td>
                    <td className="py-2.5 px-2 text-right font-black text-emerald-400">
                      {c.totalEvents}
                    </td>
                    <td className="py-2.5 px-2 text-right text-zinc-300">{c.views}</td>
                    <td className="py-2.5 px-2 text-right text-sky-300">{c.clicks}</td>
                    <td className="py-2.5 pl-2 text-right text-amber-300">{c.cartAdds}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-xs text-zinc-500 py-8 text-center">
              No category engagement events recorded yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
