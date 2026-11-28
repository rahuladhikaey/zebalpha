"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Image as ImageIcon,
  Layers,
  Palette,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Smartphone,
  Sparkles,
  Trash2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import {
  CATEGORY_THEME_PRESETS,
  WIDGET_CATALOG_META,
  buildDefaultCategoryBlueprint,
  type CategoryStorefrontBlueprint,
  type CategoryThemePresetKey,
  type CategoryWidgetConfig,
  type CategoryWidgetType,
} from "@/lib/categoryStorefrontTypes";

interface MainCategoryItem {
  id: string;
  name: string;
  slug: string;
  image_url?: string | null;
}

interface SubcategoryRow {
  id: string;
  name: string;
  slug: string;
  image_url?: string | null;
}

interface SpotlightRequestRow {
  id: string;
  seller_id: string;
  seller_name?: string | null;
  category_id: string;
  category_name?: string;
  target_widget: string;
  brand_name: string;
  headline: string;
  offer_badge: string;
  banner_image_url?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejection_reason?: string | null;
  created_at: string;
}

export default function CategoryStorefrontStudioView() {
  const [subTab, setSubTab] = useState<"builder" | "subcategories" | "spotlights">("builder");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [migrationRequired, setMigrationRequired] = useState(false);

  const [mainCategories, setMainCategories] = useState<MainCategoryItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [blueprint, setBlueprint] = useState<CategoryStorefrontBlueprint | null>(null);
  const [subcategories, setSubcategories] = useState<SubcategoryRow[]>([]);
  const [subcatEdits, setSubcatEdits] = useState<Record<string, string>>({});
  const [spotlights, setSpotlights] = useState<SpotlightRequestRow[]>([]);

  const [expandedWidgetId, setExpandedWidgetId] = useState<string | null>(null);
  const [addWidgetType, setAddWidgetType] = useState<CategoryWidgetType>("THEMED_DEAL_RAIL");
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const notify = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4500);
  };

  const getStorefrontBase = () => {
    if (typeof window !== "undefined") {
      const h = window.location.hostname;
      if (h === "localhost" || h === "127.0.0.1") {
        return process.env.NEXT_PUBLIC_STOREFRONT_URL || "http://localhost:3000";
      }
    }
    return process.env.NEXT_PUBLIC_STOREFRONT_URL || "https://zebalpha.shop";
  };

  const loadCategoryData = useCallback(async (catId?: string) => {
    setLoading(true);
    try {
      const url = catId
        ? `/api/admin/category-storefront?category_id=${encodeURIComponent(catId)}`
        : "/api/admin/category-storefront";
      const res = await fetch(url, { cache: "no-store" });
      const json = await res.json();
      if (!json.success) {
        notify(json.message || "Failed to load category storefront", "error");
        return;
      }
      const d = json.data;
      setMainCategories(d.mainCategories || []);
      setMigrationRequired(Boolean(d.migrationRequired));
      if (d.selectedCategory) {
        setSelectedCategoryId(String(d.selectedCategory.id));
      }
      setBlueprint(d.blueprint || null);
      const subs: SubcategoryRow[] = d.subcategories || [];
      setSubcategories(subs);
      const imgMap: Record<string, string> = {};
      subs.forEach((s) => {
        imgMap[s.id] = s.image_url || "";
      });
      setSubcatEdits(imgMap);
      setSpotlights(d.spotlightRequests || []);
    } catch (err: any) {
      notify(err?.message || "Network error", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCategoryData();
  }, [loadCategoryData]);

  const handleSelectCategory = (catId: string) => {
    setSelectedCategoryId(catId);
    setExpandedWidgetId(null);
    loadCategoryData(catId);
  };

  const handleSaveBlueprint = async () => {
    if (!blueprint) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/category-storefront", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: blueprint.category_id,
          is_enabled: blueprint.is_enabled,
          theme_preset: blueprint.theme_preset,
          theme_tokens: blueprint.theme_tokens,
          widgets: blueprint.widgets,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        if (json.migrationRequired) setMigrationRequired(true);
        notify(json.message || "Save failed", "error");
        return;
      }
      notify(`Saved ${blueprint.category_name} storefront live for Web & Android App!`);
    } catch (err: any) {
      notify(err?.message || "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  const applyThemePreset = (preset: Exclude<CategoryThemePresetKey, "custom">) => {
    if (!blueprint) return;
    setBlueprint({
      ...blueprint,
      theme_preset: preset,
      theme_tokens: { ...CATEGORY_THEME_PRESETS[preset].tokens },
    });
  };

  const updateToken = (key: keyof CategoryStorefrontBlueprint["theme_tokens"], value: string) => {
    if (!blueprint) return;
    setBlueprint({
      ...blueprint,
      theme_preset: "custom",
      theme_tokens: { ...blueprint.theme_tokens, [key]: value },
    });
  };

  const updateWidget = (id: string, patch: Partial<CategoryWidgetConfig>) => {
    if (!blueprint) return;
    setBlueprint({
      ...blueprint,
      widgets: blueprint.widgets.map((w) => (w.id === id ? { ...w, ...patch } : w)),
    });
  };

  const updateWidgetConfig = (id: string, configPatch: Record<string, any>) => {
    if (!blueprint) return;
    setBlueprint({
      ...blueprint,
      widgets: blueprint.widgets.map((w) =>
        w.id === id ? { ...w, config: { ...(w.config || {}), ...configPatch } } : w
      ),
    });
  };

  const moveWidget = (index: number, delta: number) => {
    if (!blueprint) return;
    const next = [...blueprint.widgets];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    setBlueprint({
      ...blueprint,
      widgets: next.map((w, i) => ({ ...w, display_order: i + 1 })),
    });
  };

  const deleteWidget = (id: string) => {
    if (!blueprint) return;
    setBlueprint({
      ...blueprint,
      widgets: blueprint.widgets
        .filter((w) => w.id !== id)
        .map((w, i) => ({ ...w, display_order: i + 1 })),
    });
  };

  const handleAddWidget = () => {
    if (!blueprint) return;
    const meta = WIDGET_CATALOG_META[addWidgetType];
    const newWidget: CategoryWidgetConfig = {
      id: `${addWidgetType.toLowerCase()}_${Date.now()}`,
      widget_type: addWidgetType,
      title: meta.label,
      subtitle: "Curated picks for this category",
      style_variant: meta.variants[0]?.value,
      enabled: true,
      web_enabled: true,
      app_enabled: true,
      auto_fill: true,
      display_order: blueprint.widgets.length + 1,
      config:
        addWidgetType === "BUDGET_DISCOUNT_TILES"
          ? { price_slabs: [199, 299, 399], discount_slabs: [30, 50, 70] }
          : addWidgetType === "HERO_CAROUSEL"
            ? { campaign_badge: "FEATURED", slides: [] }
            : {},
    };
    setBlueprint({
      ...blueprint,
      widgets: [...blueprint.widgets, newWidget],
    });
    setExpandedWidgetId(newWidget.id);
  };

  const handleResetDefault = () => {
    if (!blueprint) return;
    const fresh = buildDefaultCategoryBlueprint(
      { id: blueprint.category_id, name: blueprint.category_name, slug: blueprint.category_slug },
      subcategories
    );
    setBlueprint(fresh);
    notify("Reset to Flipkart smart default preset (click Save to publish).");
  };

  const handleSaveSubcatImage = async (subId: string) => {
    try {
      const res = await fetch("/api/admin/category-storefront", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_subcategory_image",
          subcategory_id: subId,
          image_url: subcatEdits[subId] || "",
        }),
      });
      const json = await res.json();
      if (!json.success) {
        notify(json.message || "Update failed", "error");
        return;
      }
      notify("Subcategory portrait image saved!");
    } catch (err: any) {
      notify(err?.message || "Update error", "error");
    }
  };

  const handleReviewSpotlight = async (requestId: string, status: "APPROVED" | "REJECTED") => {
    try {
      const res = await fetch("/api/admin/category-storefront", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request_id: requestId, status }),
      });
      const json = await res.json();
      if (!json.success) {
        notify(json.message || "Action failed", "error");
        return;
      }
      setSpotlights((prev) =>
        prev.map((s) => (s.id === requestId ? { ...s, status } : s))
      );
      notify(
        status === "APPROVED"
          ? "Seller spotlight approved & live on Category Storefront!"
          : "Seller spotlight request rejected."
      );
    } catch (err: any) {
      notify(err?.message || "Network error", "error");
    }
  };

  const pendingCount = spotlights.filter((s) => s.status === "PENDING").length;

  return (
    <div className="space-y-6 pb-16">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-2xl px-4 py-3 text-xs font-extrabold shadow-2xl border ${
            toast.type === "error"
              ? "bg-red-950 text-red-100 border-red-500/40"
              : "bg-emerald-950 text-emerald-100 border-emerald-500/40"
          }`}
        >
          {toast.type === "error" ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
          <span>{toast.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="rounded-3xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-black border border-zinc-800 p-5 md:p-7 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-300 mb-2">
              <Sparkles className="h-3 w-3" /> Flipkart-Grade Category SDUI Studio
            </div>
            <h1 className="text-xl md:text-2xl font-black tracking-tight">
              Category Storefront Studio (Zero-Code Control)
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Control themes, hero sliders, subcategory strips, deal boxes, budget tiles, spotlight brands, and micro-stores per Main Category — syncs live to Website & Android App with zero code deploys.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {blueprint && (
              <a
                href={`${getStorefrontBase()}/category/${encodeURIComponent(blueprint.category_slug)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3.5 py-2 text-xs font-bold text-white transition"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Live Page
              </a>
            )}
            <button
              type="button"
              onClick={handleResetDefault}
              disabled={!blueprint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3.5 py-2 text-xs font-bold text-zinc-200 transition cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Smart Preset
            </button>
            <button
              type="button"
              onClick={handleSaveBlueprint}
              disabled={saving || !blueprint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black px-5 py-2 text-xs font-black shadow-lg shadow-amber-400/20 transition cursor-pointer disabled:opacity-50"
            >
              {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {saving ? "Publishing..." : "Save & Publish Live"}
            </button>
          </div>
        </div>

        {/* Migration Notice Banner (Only if SQL not run yet) */}
        {migrationRequired && (
          <div className="mt-4 rounded-2xl bg-amber-500/15 border border-amber-400/40 p-3.5 flex items-start gap-3 text-xs text-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-300 shrink-0 mt-0.5" />
            <div>
              <p className="font-black">One-time SQL migration needed to persist custom edits:</p>
              <p className="opacity-85 mt-0.5">
                Run <code className="px-1.5 py-0.5 rounded bg-black/40 text-amber-100">supabase/add_category_storefront_sdui_engine.sql</code> in Supabase SQL Editor. Until then, all category storefronts run smoothly in Smart Auto-Pilot mode.
              </p>
            </div>
          </div>
        )}

        {/* Main Category Pill Selector */}
        <div className="mt-5 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {mainCategories.map((cat) => {
            const active = String(cat.id) === String(selectedCategoryId);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleSelectCategory(cat.id)}
                className={`shrink-0 rounded-xl px-4 py-2 text-xs font-black transition cursor-pointer border ${
                  active
                    ? "bg-white text-black border-white shadow-md"
                    : "bg-zinc-900/90 text-zinc-300 border-zinc-800 hover:border-zinc-600 hover:text-white"
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-3">
        <button
          type="button"
          onClick={() => setSubTab("builder")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black cursor-pointer transition ${
            subTab === "builder"
              ? "bg-zinc-950 text-white dark:bg-white dark:text-black"
              : "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
          }`}
        >
          <Layers className="h-4 w-4" /> Theme & Widget Builder
        </button>
        <button
          type="button"
          onClick={() => setSubTab("subcategories")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black cursor-pointer transition ${
            subTab === "subcategories"
              ? "bg-zinc-950 text-white dark:bg-white dark:text-black"
              : "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
          }`}
        >
          <ImageIcon className="h-4 w-4" /> Subcategory Portraits ({subcategories.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab("spotlights")}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black cursor-pointer transition ${
            subTab === "spotlights"
              ? "bg-zinc-950 text-white dark:bg-white dark:text-black"
              : "bg-zinc-100 text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
          }`}
        >
          <Sparkles className="h-4 w-4" /> Seller Spotlight Queue
          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-400 text-black px-2 py-0.5 text-[10px] font-black">
              {pendingCount}
            </span>
          )}
        </button>
      </div>

      {loading || !blueprint ? (
        <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 p-12 text-center text-xs font-bold text-zinc-500">
          Loading category storefront configuration...
        </div>
      ) : subTab === "builder" ? (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* LEFT: Theme Presets & Live Color Controls */}
          <div className="xl:col-span-4 space-y-4">
            <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-amber-500" />
                  <h2 className="text-sm font-black">Category Theme Preset</h2>
                </div>
                <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={blueprint.is_enabled}
                    onChange={(e) => setBlueprint({ ...blueprint, is_enabled: e.target.checked })}
                    className="rounded"
                  />
                  Enabled
                </label>
              </div>

              <div className="space-y-2">
                {(Object.keys(CATEGORY_THEME_PRESETS) as Array<Exclude<CategoryThemePresetKey, "custom">>).map(
                  (key) => {
                    const p = CATEGORY_THEME_PRESETS[key];
                    const active = blueprint.theme_preset === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => applyThemePreset(key)}
                        className={`w-full text-left rounded-2xl p-3 border transition cursor-pointer ${
                          active
                            ? "border-amber-500 bg-amber-50/70 dark:bg-amber-500/10"
                            : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black">{p.label}</span>
                          <div className="flex items-center gap-1">
                            <span className="h-4 w-4 rounded-full border border-black/15" style={{ background: p.tokens.headerBg }} />
                            <span className="h-4 w-4 rounded-full border border-black/15" style={{ background: p.tokens.accentBg }} />
                            <span className="h-4 w-4 rounded-full border border-black/15" style={{ background: p.tokens.softTintBg }} />
                          </div>
                        </div>
                        <p className="text-[11px] text-zinc-500 mt-1 leading-snug">{p.description}</p>
                      </button>
                    );
                  }
                )}
              </div>

              {/* Fine-tune Color Swatches */}
              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2.5">
                <p className="text-[11px] font-black uppercase tracking-wider text-zinc-500">
                  Custom Color Tokens
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {(
                    [
                      ["headerBg", "Header Bar"],
                      ["accentBg", "Primary Accent"],
                      ["accentText", "Accent Text"],
                      ["secondaryBoxBg", "Dark Deal Box"],
                      ["softTintBg", "Soft Tint"],
                      ["marqueeBg", "Marquee Ribbon"],
                    ] as const
                  ).map(([tokenKey, label]) => (
                    <label
                      key={tokenKey}
                      className="flex items-center justify-between rounded-xl border border-zinc-200 dark:border-zinc-800 px-2.5 py-1.5 text-[11px] font-bold"
                    >
                      <span>{label}</span>
                      <input
                        type="color"
                        value={blueprint.theme_tokens[tokenKey] || "#111111"}
                        onChange={(e) => updateToken(tokenKey, e.target.value)}
                        className="h-6 w-8 rounded cursor-pointer border-0 bg-transparent"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Add New Widget Card */}
            <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 space-y-3 shadow-sm">
              <h3 className="text-sm font-black text-zinc-900 dark:text-white">Add Flipkart Section Widget</h3>
              <select
                value={addWidgetType}
                onChange={(e) => setAddWidgetType(e.target.value as CategoryWidgetType)}
                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark] px-3 py-2.5 text-xs font-bold focus:border-amber-400 focus:outline-none"
              >
                {(Object.keys(WIDGET_CATALOG_META) as CategoryWidgetType[]).map((wt) => (
                  <option
                    key={wt}
                    value={wt}
                    className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white"
                  >
                    {WIDGET_CATALOG_META[wt].label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleAddWidget}
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-zinc-950 dark:bg-amber-400 text-white dark:text-black py-2.5 text-xs font-black cursor-pointer hover:opacity-90 transition"
              >
                <Plus className="h-4 w-4" /> Add Section to {blueprint.category_name}
              </button>
            </div>
          </div>

          {/* RIGHT: Ordered Widget Stack Editor */}
          <div className="xl:col-span-8 space-y-3">
            {blueprint.widgets.map((w, idx) => {
              const meta = WIDGET_CATALOG_META[w.widget_type];
              const isOpen = expandedWidgetId === w.id;

              return (
                <div
                  key={w.id}
                  className={`rounded-2xl border transition ${
                    w.enabled
                      ? "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xs"
                      : "border-dashed border-zinc-300 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 opacity-65"
                  }`}
                >
                  {/* Row Header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3.5">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="h-7 w-7 rounded-lg bg-zinc-900 text-white text-xs font-black flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs sm:text-sm font-black truncate">{w.title}</span>
                          <span className="rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-[10px] font-black uppercase">
                            {meta?.label || w.widget_type}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-500 truncate">{w.subtitle || meta?.description}</p>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateWidget(w.id, { web_enabled: !w.web_enabled })}
                        title="Toggle Desktop Web"
                        className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
                          w.web_enabled ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10" : "border-zinc-300 text-zinc-400"
                        }`}
                      >
                        <Globe className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateWidget(w.id, { app_enabled: !w.app_enabled })}
                        title="Toggle Android App"
                        className={`p-1.5 rounded-lg border text-xs cursor-pointer ${
                          w.app_enabled ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10" : "border-zinc-300 text-zinc-400"
                        }`}
                      >
                        <Smartphone className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => updateWidget(w.id, { enabled: !w.enabled })}
                        title="Show / Hide Section"
                        className="p-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                      >
                        {w.enabled ? <Eye className="h-3.5 w-3.5 text-emerald-600" /> : <EyeOff className="h-3.5 w-3.5 text-zinc-400" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => moveWidget(idx, -1)}
                        disabled={idx === 0}
                        className="p-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveWidget(idx, 1)}
                        disabled={idx === blueprint.widgets.length - 1}
                        className="p-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedWidgetId(isOpen ? null : w.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-xs font-black inline-flex items-center gap-1 cursor-pointer"
                      >
                        Edit {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteWidget(w.id)}
                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 cursor-pointer"
                        title="Remove Section"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Inline Visual Config Editor */}
                  {isOpen && (
                    <div className="border-t border-zinc-200 dark:border-zinc-800 p-4 bg-zinc-50/70 dark:bg-zinc-900/60 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">Section Title</label>
                          <input
                            type="text"
                            value={w.title}
                            onChange={(e) => updateWidget(w.id, { title: e.target.value })}
                            className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white px-3 py-1.5 text-xs font-bold focus:border-amber-400 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">Subtitle / Eyebrow</label>
                          <input
                            type="text"
                            value={w.subtitle || ""}
                            onChange={(e) => updateWidget(w.id, { subtitle: e.target.value })}
                            className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white px-3 py-1.5 text-xs font-bold focus:border-amber-400 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">Visual Style Variant</label>
                          <select
                            value={w.style_variant || meta?.variants[0]?.value || ""}
                            onChange={(e) => updateWidget(w.id, { style_variant: e.target.value })}
                            className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark] px-3 py-1.5 text-xs font-bold focus:border-amber-400 focus:outline-none"
                          >
                            {(meta?.variants || []).map((v) => (
                              <option
                                key={v.value}
                                value={v.value}
                                className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white"
                              >
                                {v.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={w.auto_fill !== false}
                          onChange={(e) => updateWidget(w.id, { auto_fill: e.target.checked })}
                        />
                        Auto-Pilot Live Fill (automatically fills from real Supabase products if manual items are empty)
                      </label>

                      {/* Widget-Specific Smart Controls */}
                      {w.widget_type === "BUDGET_DISCOUNT_TILES" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="block text-[11px] font-bold text-zinc-500 mb-1">
                              Price Slabs (comma-separated ₹, e.g. 199, 299, 399)
                            </label>
                            <input
                              type="text"
                              value={(w.config?.price_slabs || [199, 299, 399]).join(", ")}
                              onChange={(e) =>
                                updateWidgetConfig(w.id, {
                                  price_slabs: e.target.value
                                    .split(",")
                                    .map((n) => parseInt(n.trim(), 10))
                                    .filter((n) => !isNaN(n) && n > 0),
                                })
                              }
                              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white px-3 py-1.5 text-xs font-bold"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-zinc-500 mb-1">
                              Min. Discount Slabs (comma-separated %, e.g. 30, 50, 70)
                            </label>
                            <input
                              type="text"
                              value={(w.config?.discount_slabs || [30, 50, 70]).join(", ")}
                              onChange={(e) =>
                                updateWidgetConfig(w.id, {
                                  discount_slabs: e.target.value
                                    .split(",")
                                    .map((n) => parseInt(n.trim(), 10))
                                    .filter((n) => !isNaN(n) && n > 0),
                                })
                              }
                              className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white px-3 py-1.5 text-xs font-bold"
                            />
                          </div>
                        </div>
                      )}

                      {w.widget_type === "HERO_CAROUSEL" && (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] font-bold text-zinc-500 mb-1">Campaign Badge</label>
                              <input
                                type="text"
                                value={w.config?.campaign_badge || ""}
                                onChange={(e) => updateWidgetConfig(w.id, { campaign_badge: e.target.value })}
                                placeholder="e.g. GLAM UP / ZEBALPHA DROP"
                                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white px-3 py-1.5 text-xs font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-zinc-500 mb-1">Footer Offer Strip</label>
                              <input
                                type="text"
                                value={w.config?.footer_offer || ""}
                                onChange={(e) => updateWidgetConfig(w.id, { footer_offer: e.target.value })}
                                className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white px-3 py-1.5 text-xs font-bold"
                              />
                            </div>
                          </div>

                          {/* Custom Slides Manager */}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-black uppercase text-zinc-500">
                                Custom Hero Slides ({(w.config?.slides || []).length})
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const nextSlides = [
                                    ...(w.config?.slides || []),
                                    {
                                      id: `slide-${Date.now()}`,
                                      title: "Featured Drop",
                                      subtitle: "Limited season offer",
                                      offer_text: "Up to 60% Off",
                                      image_url: "",
                                      destination_url: `/products?category=${encodeURIComponent(blueprint.category_id)}`,
                                    },
                                  ];
                                  updateWidgetConfig(w.id, { slides: nextSlides });
                                }}
                                className="inline-flex items-center gap-1 rounded-lg bg-zinc-900 text-white px-2.5 py-1 text-[11px] font-black cursor-pointer"
                              >
                                <Plus className="h-3 w-3" /> Add Custom Slide
                              </button>
                            </div>
                            {(w.config?.slides || []).map((sl: any, sIdx: number) => (
                              <div key={sl.id || sIdx} className="grid grid-cols-1 md:grid-cols-5 gap-2 p-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                                <input
                                  type="text"
                                  value={sl.title || ""}
                                  onChange={(e) => {
                                    const copy = [...(w.config?.slides || [])];
                                    copy[sIdx] = { ...copy[sIdx], title: e.target.value };
                                    updateWidgetConfig(w.id, { slides: copy });
                                  }}
                                  placeholder="Title / Brand"
                                  className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white px-2 py-1 text-xs"
                                />
                                <input
                                  type="text"
                                  value={sl.offer_text || ""}
                                  onChange={(e) => {
                                    const copy = [...(w.config?.slides || [])];
                                    copy[sIdx] = { ...copy[sIdx], offer_text: e.target.value };
                                    updateWidgetConfig(w.id, { slides: copy });
                                  }}
                                  placeholder="Up to 60% Off"
                                  className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white px-2 py-1 text-xs"
                                />
                                <input
                                  type="text"
                                  value={sl.image_url || ""}
                                  onChange={(e) => {
                                    const copy = [...(w.config?.slides || [])];
                                    copy[sIdx] = { ...copy[sIdx], image_url: e.target.value };
                                    updateWidgetConfig(w.id, { slides: copy });
                                  }}
                                  placeholder="Image URL"
                                  className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white px-2 py-1 text-xs"
                                />
                                <input
                                  type="text"
                                  value={sl.destination_url || ""}
                                  onChange={(e) => {
                                    const copy = [...(w.config?.slides || [])];
                                    copy[sIdx] = { ...copy[sIdx], destination_url: e.target.value };
                                    updateWidgetConfig(w.id, { slides: copy });
                                  }}
                                  placeholder="/products?..."
                                  className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white px-2 py-1 text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const copy = (w.config?.slides || []).filter((_: any, i: number) => i !== sIdx);
                                    updateWidgetConfig(w.id, { slides: copy });
                                  }}
                                  className="rounded-lg bg-red-500/10 text-red-600 text-xs font-bold px-2 py-1 cursor-pointer"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {w.widget_type === "FULL_SPOTLIGHT_BANNER" && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <input
                            type="text"
                            value={w.config?.cta_label || "Explore now"}
                            onChange={(e) => updateWidgetConfig(w.id, { cta_label: e.target.value })}
                            placeholder="CTA Label"
                            className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white px-3 py-1.5 text-xs font-bold"
                          />
                          <input
                            type="text"
                            value={w.config?.banner_image_url || ""}
                            onChange={(e) => updateWidgetConfig(w.id, { banner_image_url: e.target.value })}
                            placeholder="Spotlight Image URL"
                            className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white px-3 py-1.5 text-xs font-bold"
                          />
                          <input
                            type="text"
                            value={w.config?.destination_url || ""}
                            onChange={(e) => updateWidgetConfig(w.id, { destination_url: e.target.value })}
                            placeholder="/products?..."
                            className="rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white px-3 py-1.5 text-xs font-bold"
                          />
                        </div>
                      )}

                      {w.widget_type === "COMBO_KITS_MARQUEE" && (
                        <div>
                          <label className="block text-[11px] font-bold text-zinc-500 mb-1">Diagonal Marquee Ribbon Text</label>
                          <input
                            type="text"
                            value={w.config?.marquee_text || ""}
                            onChange={(e) => updateWidgetConfig(w.id, { marquee_text: e.target.value })}
                            className="w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white px-3 py-1.5 text-xs font-bold"
                          />
                        </div>
                      )}

                      {w.widget_type === "EXPLORE_STORES_3X3" && (
                        <div className="space-y-2">
                          <span className="text-[11px] font-black uppercase text-zinc-500">Micro-Stores (3×3 Tiles)</span>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            {(w.config?.stores || []).map((st: any, stIdx: number) => (
                              <div key={st.id || stIdx} className="p-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1.5">
                                <input
                                  type="text"
                                  value={st.title || ""}
                                  onChange={(e) => {
                                    const copy = [...(w.config?.stores || [])];
                                    copy[stIdx] = { ...copy[stIdx], title: e.target.value };
                                    updateWidgetConfig(w.id, { stores: copy });
                                  }}
                                  placeholder="Store Title"
                                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white px-2 py-1 text-xs font-bold"
                                />
                                <input
                                  type="text"
                                  value={st.tag_filter || ""}
                                  onChange={(e) => {
                                    const copy = [...(w.config?.stores || [])];
                                    copy[stIdx] = { ...copy[stIdx], tag_filter: e.target.value };
                                    updateWidgetConfig(w.id, { stores: copy });
                                  }}
                                  placeholder="Tag filter (e.g. korean)"
                                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white px-2 py-1 text-xs"
                                />
                                <input
                                  type="text"
                                  value={st.image_url || ""}
                                  onChange={(e) => {
                                    const copy = [...(w.config?.stores || [])];
                                    copy[stIdx] = { ...copy[stIdx], image_url: e.target.value };
                                    updateWidgetConfig(w.id, { stores: copy });
                                  }}
                                  placeholder="Optional Image URL"
                                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white px-2 py-1 text-xs"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : subTab === "subcategories" ? (
        <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 space-y-4">
          <div>
            <h2 className="text-sm font-black">Subcategory Portrait Images — {blueprint.category_name}</h2>
            <p className="text-xs text-zinc-500">
              Set crisp photos for the 2-Row Fashion Grid or 1-Row Beauty Portrait Strip. Leave blank to auto-use live product photos.
            </p>
          </div>
          {subcategories.length === 0 ? (
            <p className="text-xs text-zinc-500 py-8 text-center">
              No child subcategories found under {blueprint.category_name}. Add subcategories from Categories & Taxonomy.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subcategories.map((sc) => (
                <div key={sc.id} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-3.5 space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-xl bg-zinc-100 dark:bg-zinc-900 overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center">
                      {subcatEdits[sc.id] ? (
                        <img src={subcatEdits[sc.id]} alt={sc.name} className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-zinc-400" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black truncate">{sc.name}</p>
                      <p className="text-[11px] text-zinc-500 truncate">/{sc.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={subcatEdits[sc.id] || ""}
                      onChange={(e) => setSubcatEdits((prev) => ({ ...prev, [sc.id]: e.target.value }))}
                      placeholder="Paste portrait image URL..."
                      className="flex-1 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 px-2.5 py-1.5 text-xs focus:border-amber-400 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveSubcatImage(sc.id)}
                      className="rounded-xl bg-zinc-950 dark:bg-white text-white dark:text-black px-3 py-1.5 text-xs font-black cursor-pointer"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-5 space-y-4">
          <div>
            <h2 className="text-sm font-black">Seller Category Spotlight Requests</h2>
            <p className="text-xs text-zinc-500">
              Approve seller brand/offer requests to feature them automatically in Hero Sliders, Spotlight Brands, or Fresh Finds.
            </p>
          </div>
          {spotlights.length === 0 ? (
            <p className="text-xs text-zinc-500 py-10 text-center">No seller spotlight requests submitted yet.</p>
          ) : (
            <div className="space-y-3">
              {spotlights.map((req) => (
                <div
                  key={req.id}
                  className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3">
                    {req.banner_image_url && (
                      <img
                        src={req.banner_image_url}
                        alt={req.brand_name}
                        className="h-16 w-20 rounded-xl object-cover border border-zinc-200 dark:border-zinc-800 shrink-0"
                      />
                    )}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black">{req.brand_name}</span>
                        <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5 text-[10px] font-black">
                          {req.category_name} • {req.target_widget}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                            req.status === "APPROVED"
                              ? "bg-emerald-500/15 text-emerald-600"
                              : req.status === "REJECTED"
                                ? "bg-red-500/15 text-red-600"
                                : "bg-amber-500/15 text-amber-600"
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                        {req.headline} — <span className="text-emerald-600">{req.offer_badge}</span>
                      </p>
                      <p className="text-[11px] text-zinc-500">
                        Seller: {req.seller_name || req.seller_id}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {req.status !== "APPROVED" && (
                      <button
                        type="button"
                        onClick={() => handleReviewSpotlight(req.id, "APPROVED")}
                        className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 text-xs font-black cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve & Live
                      </button>
                    )}
                    {req.status !== "REJECTED" && (
                      <button
                        type="button"
                        onClick={() => handleReviewSpotlight(req.id, "REJECTED")}
                        className="inline-flex items-center gap-1 rounded-xl bg-red-600/15 hover:bg-red-600/25 text-red-600 px-3.5 py-2 text-xs font-black cursor-pointer"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
