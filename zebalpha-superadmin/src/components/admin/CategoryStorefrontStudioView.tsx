"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Monitor,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Tablet,
  Undo2,
  XCircle,
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
import {
  type DeviceMode,
  type StudioPreviewBrand,
  type StudioPreviewProduct,
  type StudioSelection,
  type StudioSubcategoryRow,
  SectionFrameWrapper,
  reorderArray,
} from "./visual-studio/VisualStudioShared";
import { VisualCanvasWidgetRenderer } from "./visual-studio/VisualCanvasWidgets";
import { VisualInspectorSidebar, type InspectorTab } from "./visual-studio/VisualInspectorSidebar";

interface MainCategoryItem {
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
  const [studioMode, setStudioMode] = useState<"visual" | "spotlights">("visual");
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("mobile");
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("selected");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [migrationRequired, setMigrationRequired] = useState(false);

  const [mainCategories, setMainCategories] = useState<MainCategoryItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [blueprint, setBlueprint] = useState<CategoryStorefrontBlueprint | null>(null);
  const [undoStack, setUndoStack] = useState<CategoryStorefrontBlueprint[]>([]);

  const [subcategories, setSubcategories] = useState<StudioSubcategoryRow[]>([]);
  const [subcatImages, setSubcatImages] = useState<Record<string, string>>({});
  const [previewProducts, setPreviewProducts] = useState<StudioPreviewProduct[]>([]);
  const [previewBrands, setPreviewBrands] = useState<StudioPreviewBrand[]>([]);
  const [spotlights, setSpotlights] = useState<SpotlightRequestRow[]>([]);

  const [selection, setSelection] = useState<StudioSelection | null>(null);
  const [draggedSectionIdx, setDraggedSectionIdx] = useState<number | null>(null);
  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const notify = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4200);
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
      setUndoStack([]);
      setDirty(false);
      setSelection(d.blueprint?.widgets?.[0] ? { widgetId: d.blueprint.widgets[0].id } : null);

      const subs: StudioSubcategoryRow[] = d.subcategories || [];
      setSubcategories(subs);
      const imgMap: Record<string, string> = {};
      subs.forEach((s) => {
        imgMap[s.id] = s.image_url || "";
      });
      setSubcatImages(imgMap);
      setPreviewProducts(d.previewProducts || []);
      setPreviewBrands(d.previewBrands || []);
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

  // Blueprint updater with automatic 1-click Undo history
  const mutateBlueprint = (updater: (prev: CategoryStorefrontBlueprint) => CategoryStorefrontBlueprint) => {
    setBlueprint((prev) => {
      if (!prev) return prev;
      setUndoStack((stack) => [...stack.slice(-14), prev]);
      setDirty(true);
      return updater(prev);
    });
  };

  const handleUndo = () => {
    setUndoStack((stack) => {
      if (stack.length === 0) return stack;
      const previous = stack[stack.length - 1];
      setBlueprint(previous);
      setDirty(true);
      return stack.slice(0, -1);
    });
  };

  const handleSelectCategory = (catId: string) => {
    setSelectedCategoryId(catId);
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
      setDirty(false);
      notify(`Published ${blueprint.category_name} live for Web & Android App!`);
    } catch (err: any) {
      notify(err?.message || "Failed to save", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadSubcatImage = async (subId: string, url: string, summary: string) => {
    setSubcatImages((prev) => ({ ...prev, [subId]: url }));
    try {
      const res = await fetch("/api/admin/category-storefront", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_subcategory_image",
          subcategory_id: subId,
          image_url: url,
        }),
      });
      const json = await res.json();
      if (json.success) {
        notify(`${summary} • Saved to DB`);
      } else {
        notify(json.message || "Subcategory save failed", "error");
      }
    } catch (err: any) {
      notify(err?.message || "Subcategory update error", "error");
    }
  };

  const handleAddWidget = (wt: CategoryWidgetType) => {
    if (!blueprint) return;
    const meta = WIDGET_CATALOG_META[wt];
    const newId = `${wt.toLowerCase()}_${Date.now()}`;
    const newWidget: CategoryWidgetConfig = {
      id: newId,
      widget_type: wt,
      title: meta.label,
      subtitle: "Curated picks for this category",
      style_variant: meta.variants[0]?.value,
      enabled: true,
      web_enabled: true,
      app_enabled: true,
      auto_fill: true,
      display_order: blueprint.widgets.length + 1,
      config:
        wt === "BUDGET_DISCOUNT_TILES"
          ? { price_slabs: [299, 499, 799], discount_slabs: [30, 50, 70] }
          : wt === "HERO_CAROUSEL"
            ? { campaign_badge: "FEATURED", slides: [] }
            : {},
    };
    mutateBlueprint((prev) => ({ ...prev, widgets: [...prev.widgets, newWidget] }));
    setSelection({ widgetId: newId });
    setInspectorTab("selected");
    notify(`Added "${meta.label}" to live preview!`);
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
      setSpotlights((prev) => prev.map((s) => (s.id === requestId ? { ...s, status } : s)));
      notify(status === "APPROVED" ? "Spotlight approved & live!" : "Spotlight rejected.");
    } catch (err: any) {
      notify(err?.message || "Network error", "error");
    }
  };

  const pendingCount = spotlights.filter((s) => s.status === "PENDING").length;

  return (
    <div className="space-y-4 pb-12">
      {/* Live Floating Toast */}
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

      {/* TOP VISUAL STUDIO COMMAND BAR */}
      <div className="rounded-3xl bg-gradient-to-br from-zinc-950 via-zinc-900 to-black border border-zinc-800 p-4 md:p-5 text-white shadow-xl space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-amber-300">
              <Sparkles className="h-3 w-3" /> Live Interactive Visual Studio
            </div>
            <h1 className="text-lg md:text-xl font-black tracking-tight mt-1">
              Click Directly on Screen to Edit Banners, Photos, Text & Colors
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Device Frame Switcher */}
            <div className="inline-flex items-center rounded-xl bg-zinc-900 border border-zinc-800 p-1">
              {(
                [
                  ["mobile", "Phone", Smartphone],
                  ["tablet", "Tablet", Tablet],
                  ["desktop", "Desktop", Monitor],
                ] as const
              ).map(([mode, label, Icon]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDeviceMode(mode)}
                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-black cursor-pointer transition ${
                    deviceMode === mode ? "bg-amber-400 text-black shadow-xs" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>

            {undoStack.length > 0 && (
              <button
                type="button"
                onClick={handleUndo}
                className="inline-flex items-center gap-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-200 cursor-pointer"
                title="Undo last edit"
              >
                <Undo2 className="h-3.5 w-3.5" /> Undo
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (!blueprint) return;
                const fresh = buildDefaultCategoryBlueprint(
                  { id: blueprint.category_id, name: blueprint.category_name, slug: blueprint.category_slug },
                  subcategories
                );
                mutateBlueprint(() => fresh);
                notify("Loaded Smart Default Preset (click Save & Publish to apply live).");
              }}
              disabled={!blueprint}
              className="inline-flex items-center gap-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-200 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Preset
            </button>

            {blueprint && (
              <a
                href={`${getStorefrontBase()}/category/${encodeURIComponent(blueprint.category_slug)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-3 py-2 text-xs font-bold text-white"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Live
              </a>
            )}

            <button
              type="button"
              onClick={handleSaveBlueprint}
              disabled={saving || !blueprint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black px-4 py-2 text-xs font-black shadow-lg shadow-amber-400/20 cursor-pointer disabled:opacity-50"
            >
              {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              <span>{saving ? "Publishing..." : dirty ? "Save & Publish Live •" : "Save & Publish Live"}</span>
            </button>
          </div>
        </div>

        {/* Category Switcher Pills + Mode Switch */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800/80">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {mainCategories.map((cat) => {
              const active = String(cat.id) === String(selectedCategoryId);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleSelectCategory(cat.id)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-black transition cursor-pointer ${
                    active
                      ? "bg-white text-black shadow-sm"
                      : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white hover:border-zinc-600"
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setStudioMode("visual")}
              className={`rounded-lg px-3 py-1 text-[11px] font-black cursor-pointer ${
                studioMode === "visual" ? "bg-amber-400/20 text-amber-300 border border-amber-400/40" : "text-zinc-400 hover:text-white"
              }`}
            >
              Visual Canvas
            </button>
            <button
              type="button"
              onClick={() => setStudioMode("spotlights")}
              className={`rounded-lg px-3 py-1 text-[11px] font-black cursor-pointer inline-flex items-center gap-1.5 ${
                studioMode === "spotlights" ? "bg-amber-400/20 text-amber-300 border border-amber-400/40" : "text-zinc-400 hover:text-white"
              }`}
            >
              Seller Spotlights
              {pendingCount > 0 && (
                <span className="rounded-full bg-amber-400 text-black px-1.5 text-[9.5px] font-black">
                  {pendingCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {migrationRequired && (
          <div className="rounded-2xl bg-amber-500/15 border border-amber-400/40 p-3 flex items-start gap-2.5 text-xs text-amber-200">
            <AlertTriangle className="h-4 w-4 text-amber-300 shrink-0 mt-0.5" />
            <span>
              Run <code className="px-1.5 py-0.5 rounded bg-black/40 text-amber-100">supabase/add_category_storefront_sdui_engine.sql</code> in Supabase SQL Editor once to persist custom layouts.
            </span>
          </div>
        )}
      </div>

      {/* MAIN BODY */}
      {loading || !blueprint ? (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-16 text-center text-sm font-bold text-zinc-400">
          Loading Live Visual Canvas...
        </div>
      ) : studioMode === "spotlights" ? (
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
      ) : (
        /* LIVE INTERACTIVE VISUAL CANVAS + RIGHT SMART INSPECTOR */
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* LEFT / CENTER: REALISTIC DEVICE LIVE EDITABLE SCREEN (8 COLS) */}
          <div className="xl:col-span-8 flex flex-col items-center rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100/80 dark:bg-zinc-900/50 p-3 sm:p-5 overflow-x-auto">
            {/* Helper hint bar */}
            <div className="w-full flex flex-wrap items-center justify-between gap-2 mb-3 text-[11px] font-bold text-zinc-600 dark:text-zinc-400">
              <span>
                ✨ Canva Mode: <strong>Drag ⋮⋮</strong> sections &amp; cards to reorder • <strong>Drag Bottom Handle</strong> to resize • Click <strong>Text</strong> to type • Click <strong>Photo</strong> (≤150KB)
              </span>
              <span className="rounded-full bg-zinc-200 dark:bg-zinc-800 px-2.5 py-0.5 text-[10px] font-black uppercase text-zinc-800 dark:text-zinc-200">
                {deviceMode === "mobile"
                  ? "Phone Preview • 390px"
                  : deviceMode === "tablet"
                    ? "Tablet Preview • 768px"
                    : "Desktop Preview • Full"}
              </span>
            </div>

            {/* Realistic Device Frame */}
            <div
              className={`w-full transition-all duration-300 shadow-2xl overflow-hidden border ${
                deviceMode === "mobile"
                  ? "max-w-[398px] rounded-[34px] border-[6px] border-zinc-900"
                  : deviceMode === "tablet"
                    ? "max-w-[768px] rounded-[26px] border-[5px] border-zinc-800"
                    : "max-w-full rounded-2xl border-zinc-300 dark:border-zinc-700"
              }`}
              style={{ backgroundColor: blueprint.theme_tokens.pageBg, color: "#111111" }}
            >
              {/* Authentic Mirror of Customer Category Sticky Header */}
              <div
                className="w-full shadow-xs"
                style={{
                  backgroundColor: blueprint.theme_tokens.headerBg,
                  color: blueprint.theme_tokens.headerText,
                }}
              >
                <div className="px-3 pt-2.5 pb-2 flex items-center gap-2">
                  <span className="h-9 w-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white shrink-0">
                    <ArrowLeft className="h-4 w-4" />
                  </span>
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                    <div className="w-full h-9 rounded-xl bg-white pl-8 pr-3 flex items-center text-xs font-semibold text-zinc-400 truncate">
                      Search {blueprint.category_name}...
                    </div>
                  </div>
                  <span className="h-9 px-2.5 rounded-xl bg-white/10 border border-white/15 flex items-center gap-1 text-white shrink-0">
                    <ShoppingCart className="h-4 w-4" />
                  </span>
                </div>

                {/* Live Category Switcher Tabs Mirror */}
                <div className="border-t border-white/10 px-3 py-1.5 flex items-center gap-4 overflow-x-auto no-scrollbar">
                  <span className="shrink-0 text-[11px] font-bold text-white/65">For You</span>
                  {mainCategories.slice(0, 7).map((c) => {
                    const isAct = String(c.id) === String(blueprint.category_id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectCategory(c.id)}
                        className={`shrink-0 pb-1 text-[11px] font-extrabold border-b-2 transition cursor-pointer ${
                          isAct ? "text-white" : "text-white/65 border-transparent hover:text-white"
                        }`}
                        style={{ borderBottomColor: isAct ? blueprint.theme_tokens.accentBg : "transparent" }}
                      >
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* LIVE EDITABLE WIDGET STACK */}
              <div className="pb-6 divide-y divide-transparent">
                {blueprint.widgets.map((w, idx) => (
                  <SectionFrameWrapper
                    key={w.id}
                    widget={w}
                    index={idx}
                    total={blueprint.widgets.length}
                    isSelected={selection?.widgetId === w.id}
                    isDropTarget={dropTargetIdx === idx && draggedSectionIdx !== null && draggedSectionIdx !== idx}
                    onDragStart={(from) => setDraggedSectionIdx(from)}
                    onDragOver={(over) => setDropTargetIdx(over)}
                    onDragLeave={() => setDropTargetIdx(null)}
                    onDrop={(toIdx) => {
                      if (draggedSectionIdx !== null && draggedSectionIdx !== toIdx) {
                        mutateBlueprint((prev) => ({
                          ...prev,
                          widgets: reorderArray(prev.widgets, draggedSectionIdx, toIdx).map((x, i) => ({
                            ...x,
                            display_order: i + 1,
                          })),
                        }));
                      }
                      setDraggedSectionIdx(null);
                      setDropTargetIdx(null);
                    }}
                    onSelect={() => {
                      setSelection({ widgetId: w.id });
                      setInspectorTab("selected");
                    }}
                    onMove={(delta) => {
                      const target = idx + delta;
                      if (target < 0 || target >= blueprint.widgets.length) return;
                      mutateBlueprint((prev) => {
                        const next = [...prev.widgets];
                        const [moved] = next.splice(idx, 1);
                        next.splice(target, 0, moved);
                        return { ...prev, widgets: next.map((x, i) => ({ ...x, display_order: i + 1 })) };
                      });
                    }}
                    onToggleEnabled={() =>
                      mutateBlueprint((prev) => ({
                        ...prev,
                        widgets: prev.widgets.map((x) => (x.id === w.id ? { ...x, enabled: !x.enabled } : x)),
                      }))
                    }
                    onToggleWeb={() =>
                      mutateBlueprint((prev) => ({
                        ...prev,
                        widgets: prev.widgets.map((x) => (x.id === w.id ? { ...x, web_enabled: !x.web_enabled } : x)),
                      }))
                    }
                    onToggleApp={() =>
                      mutateBlueprint((prev) => ({
                        ...prev,
                        widgets: prev.widgets.map((x) => (x.id === w.id ? { ...x, app_enabled: !x.app_enabled } : x)),
                      }))
                    }
                    onDelete={() => {
                      mutateBlueprint((prev) => ({
                        ...prev,
                        widgets: prev.widgets
                          .filter((x) => x.id !== w.id)
                          .map((x, i) => ({ ...x, display_order: i + 1 })),
                      }));
                      setSelection(null);
                    }}
                  >
                    <VisualCanvasWidgetRenderer
                      widget={w}
                      deviceMode={deviceMode}
                      categoryId={blueprint.category_id}
                      categoryName={blueprint.category_name}
                      tokens={blueprint.theme_tokens}
                      subcategories={subcategories}
                      subcatImages={subcatImages}
                      products={previewProducts}
                      brands={previewBrands}
                      selection={selection}
                      onSelect={(sel) => {
                        setSelection(sel);
                        setInspectorTab("selected");
                      }}
                      onUpdateWidget={(patch) =>
                        mutateBlueprint((prev) => ({
                          ...prev,
                          widgets: prev.widgets.map((x) => (x.id === w.id ? { ...x, ...patch } : x)),
                        }))
                      }
                      onUpdateConfig={(configPatch) =>
                        mutateBlueprint((prev) => ({
                          ...prev,
                          widgets: prev.widgets.map((x) =>
                            x.id === w.id ? { ...x, config: { ...(x.config || {}), ...configPatch } } : x
                          ),
                        }))
                      }
                      onUploadSubcatImage={handleUploadSubcatImage}
                      onNotify={notify}
                    />
                  </SectionFrameWrapper>
                ))}

                {/* Bottom Quick "+ Add Section" CTA right on canvas */}
                <div className="px-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setInspectorTab("add")}
                    className="w-full rounded-2xl border-2 border-dashed border-amber-400/80 bg-amber-50/70 hover:bg-amber-100/70 py-3 text-xs font-black text-amber-900 flex items-center justify-center gap-1.5 cursor-pointer transition"
                  >
                    <Plus className="h-4 w-4" /> Add Another Section to {blueprint.category_name}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: STICKY SMART CONTEXT INSPECTOR (4 COLS) */}
          <div className="xl:col-span-4">
            <VisualInspectorSidebar
              tab={inspectorTab}
              onTabChange={setInspectorTab}
              blueprint={blueprint}
              subcategories={subcategories}
              subcatImages={subcatImages}
              selection={selection}
              onSelect={setSelection}
              onApplyPreset={(preset) =>
                mutateBlueprint((prev) => ({
                  ...prev,
                  theme_preset: preset,
                  theme_tokens: { ...CATEGORY_THEME_PRESETS[preset].tokens },
                }))
              }
              onUpdateToken={(tokenKey, val) =>
                mutateBlueprint((prev) => ({
                  ...prev,
                  theme_preset: "custom",
                  theme_tokens: { ...prev.theme_tokens, [tokenKey]: val },
                }))
              }
              onToggleStorefrontEnabled={(enabled) =>
                mutateBlueprint((prev) => ({ ...prev, is_enabled: enabled }))
              }
              onUpdateWidget={(widgetId, patch) =>
                mutateBlueprint((prev) => ({
                  ...prev,
                  widgets: prev.widgets.map((x) => (x.id === widgetId ? { ...x, ...patch } : x)),
                }))
              }
              onUpdateWidgetConfig={(widgetId, configPatch) =>
                mutateBlueprint((prev) => ({
                  ...prev,
                  widgets: prev.widgets.map((x) =>
                    x.id === widgetId ? { ...x, config: { ...(x.config || {}), ...configPatch } } : x
                  ),
                }))
              }
              onAddWidget={handleAddWidget}
              onUploadSubcatImage={handleUploadSubcatImage}
            />
          </div>
        </div>
      )}
    </div>
  );
}
