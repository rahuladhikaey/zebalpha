"use client";

import React from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Link2,
  Maximize2,
  Move,
  Palette,
  Plus,
  RotateCcw,
  Sliders,
  Sparkles,
  Trash2,
  Type,
} from "lucide-react";
import {
  CATEGORY_THEME_PRESETS,
  WIDGET_CATALOG_META,
  getWidgetStyle,
  type CardImageTransform,
  type CategoryStorefrontBlueprint,
  type CategoryThemePresetKey,
  type CategoryWidgetConfig,
  type CategoryWidgetType,
  type WidgetLayoutStyle,
} from "@/lib/categoryStorefrontTypes";
import { AdminImageUploadField } from "../CategoryWidgetInlineEditor";
import type { StudioSelection, StudioSubcategoryRow } from "./VisualStudioShared";

export type InspectorTab = "selected" | "theme" | "add";

const INPUT_CLS =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder:text-zinc-400 px-3 py-1.5 text-xs font-semibold focus:border-amber-400 focus:outline-none";

const SELECT_CLS =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark] px-3 py-1.5 text-xs font-bold focus:border-amber-400 focus:outline-none";

const BANNER_GRADIENTS = [
  { label: "Cosmic Purple (Beauty)", value: "linear-gradient(135deg, #1b0d26 0%, #3b124d 55%, #16091f 100%)" },
  { label: "Streetwear Noir (Fashion)", value: "linear-gradient(135deg, #0d0f10 0%, #23272a 55%, #090a0b 100%)" },
  { label: "Midnight Navy (Tech)", value: "linear-gradient(135deg, #0e1726 0%, #1d3557 55%, #0a101d 100%)" },
  { label: "Rose Berry (Women)", value: "linear-gradient(135deg, #4a0e2e 0%, #9d174d 55%, #2b081b 100%)" },
  { label: "Champagne Gold Noir", value: "linear-gradient(135deg, #16120b 0%, #4a3514 55%, #0e0b06 100%)" },
  { label: "Emerald Forest", value: "linear-gradient(135deg, #062119 0%, #065f46 55%, #041510 100%)" },
];

function AutoLinkPills({
  categoryId,
  subcategories,
  onPick,
}: {
  categoryId: string;
  subcategories: StudioSubcategoryRow[];
  onPick: (url: string, suggestedLabel?: string) => void;
}) {
  const catParam = encodeURIComponent(categoryId);
  return (
    <div className="space-y-1.5 pt-1">
      <p className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-zinc-500">
        <Link2 className="h-3 w-3 text-amber-500" /> 1-Click Auto-Link Destination
      </p>
      <div className="flex flex-wrap gap-1.5">
        {[199, 299, 499, 799, 999].map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPick(`/products?category=${catParam}&maxPrice=${p}&sort=price_asc`, `Under ₹${p}`)}
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-2 py-0.5 text-[10px] font-bold hover:border-amber-400 cursor-pointer"
          >
            Under ₹{p}
          </button>
        ))}
        {[30, 50, 70].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onPick(`/products?category=${catParam}&minDiscount=${d}&sort=discount_desc`, `Min. ${d}% Off`)}
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-2 py-0.5 text-[10px] font-bold hover:border-emerald-400 cursor-pointer"
          >
            {d}%+ Off
          </button>
        ))}
        {subcategories.map((sc) => (
          <button
            key={sc.id}
            type="button"
            onClick={() => onPick(`/products?category=${catParam}&subcategory=${encodeURIComponent(sc.id)}`)}
            className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 px-2 py-0.5 text-[10px] font-bold hover:border-blue-400 cursor-pointer"
          >
            {sc.name}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Canva-style Photo Zoom, Fit Mode & Pan Position Adjuster for any banner or card!
 */
function PhotoTransformPanel({
  item,
  onChange,
}: {
  item: CardImageTransform;
  onChange: (patch: Partial<CardImageTransform>) => void;
}) {
  const fit = item.img_fit === "cover" ? "cover" : "contain";
  const zoom = Number(item.img_zoom || 100);
  const posX = typeof item.img_pos_x === "number" ? item.img_pos_x : 50;
  const posY = typeof item.img_pos_y === "number" ? item.img_pos_y : 50;

  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 p-2.5 space-y-2">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-zinc-500">
          <Move className="h-3 w-3 text-amber-500" /> Photo Zoom & Position
        </span>
        <button
          type="button"
          onClick={() => onChange({ img_fit: "contain", img_zoom: 100, img_pos_x: 50, img_pos_y: 50 })}
          className="text-[10px] font-bold text-amber-500 hover:underline cursor-pointer"
        >
          Reset
        </button>
      </div>

      {/* Fit Mode Toggle */}
      <div className="grid grid-cols-2 gap-1.5">
        <button
          type="button"
          onClick={() => onChange({ img_fit: "contain" })}
          className={`rounded-lg py-1 text-[10px] font-black border cursor-pointer ${
            fit === "contain"
              ? "bg-amber-400 text-black border-amber-400"
              : "border-zinc-300 dark:border-zinc-700 text-zinc-500"
          }`}
        >
          Full Auto-Fit
        </button>
        <button
          type="button"
          onClick={() => onChange({ img_fit: "cover" })}
          className={`rounded-lg py-1 text-[10px] font-black border cursor-pointer ${
            fit === "cover"
              ? "bg-amber-400 text-black border-amber-400"
              : "border-zinc-300 dark:border-zinc-700 text-zinc-500"
          }`}
        >
          Edge-to-Edge Fill
        </button>
      </div>

      {/* Zoom Slider */}
      <div>
        <div className="flex justify-between text-[10px] font-bold text-zinc-500">
          <span>Zoom</span>
          <span className="text-amber-500">{zoom}%</span>
        </div>
        <input
          type="range"
          min={80}
          max={180}
          step={2}
          value={zoom}
          onChange={(e) => onChange({ img_zoom: Number(e.target.value) })}
          className="w-full accent-amber-400 cursor-pointer h-1.5"
        />
      </div>

      {/* Quick Vertical Alignment + Fine Sliders */}
      <div className="grid grid-cols-3 gap-1">
        {(
          [
            ["Top", 15],
            ["Center", 50],
            ["Bottom", 85],
          ] as const
        ).map(([lbl, y]) => (
          <button
            key={lbl}
            type="button"
            onClick={() => onChange({ img_pos_y: y })}
            className={`rounded-md py-0.5 text-[10px] font-bold border cursor-pointer ${
              Math.abs(posY - y) <= 10
                ? "border-amber-400 bg-amber-400/15 text-amber-500"
                : "border-zinc-300 dark:border-zinc-700 text-zinc-500"
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <span className="text-[9.5px] font-bold text-zinc-500">Left ↔ Right ({posX}%)</span>
          <input
            type="range"
            min={0}
            max={100}
            value={posX}
            onChange={(e) => onChange({ img_pos_x: Number(e.target.value) })}
            className="w-full accent-amber-400 cursor-pointer h-1.5"
          />
        </div>
        <div>
          <span className="text-[9.5px] font-bold text-zinc-500">Up ↕ Down ({posY}%)</span>
          <input
            type="range"
            min={0}
            max={100}
            value={posY}
            onChange={(e) => onChange({ img_pos_y: Number(e.target.value) })}
            className="w-full accent-amber-400 cursor-pointer h-1.5"
          />
        </div>
      </div>
    </div>
  );
}

export function VisualInspectorSidebar({
  tab,
  onTabChange,
  blueprint,
  subcategories,
  subcatImages,
  selection,
  onSelect,
  onApplyPreset,
  onUpdateToken,
  onToggleStorefrontEnabled,
  onUpdateWidget,
  onUpdateWidgetConfig,
  onAddWidget,
  onUploadSubcatImage,
}: {
  tab: InspectorTab;
  onTabChange: (t: InspectorTab) => void;
  blueprint: CategoryStorefrontBlueprint;
  subcategories: StudioSubcategoryRow[];
  subcatImages: Record<string, string>;
  selection: StudioSelection | null;
  onSelect: (s: StudioSelection | null) => void;
  onApplyPreset: (preset: Exclude<CategoryThemePresetKey, "custom">) => void;
  onUpdateToken: (key: keyof CategoryStorefrontBlueprint["theme_tokens"], value: string) => void;
  onToggleStorefrontEnabled: (enabled: boolean) => void;
  onUpdateWidget: (widgetId: string, patch: Partial<CategoryWidgetConfig>) => void;
  onUpdateWidgetConfig: (widgetId: string, configPatch: Record<string, any>) => void;
  onAddWidget: (widgetType: CategoryWidgetType) => void;
  onUploadSubcatImage: (subId: string, url: string, summary: string) => void;
}) {
  const selectedWidget = selection
    ? blueprint.widgets.find((w) => w.id === selection.widgetId) || null
    : null;
  const meta = selectedWidget ? WIDGET_CATALOG_META[selectedWidget.widget_type] : null;
  const cfg = selectedWidget?.config || {};
  const style: WidgetLayoutStyle = getWidgetStyle(selectedWidget);

  const patchWidgetStyle = (patch: Partial<WidgetLayoutStyle>) => {
    if (!selectedWidget) return;
    onUpdateWidgetConfig(selectedWidget.id, { style: { ...style, ...patch } });
  };

  const resetWidgetStyle = () => {
    if (!selectedWidget) return;
    onUpdateWidgetConfig(selectedWidget.id, { style: {} });
  };

  const renderSelectedItemControls = () => {
    if (!selectedWidget || !selection) return null;

    // A. Clicked Hero Banner Slide
    if (selectedWidget.widget_type === "HERO_CAROUSEL" && selection.itemKind === "slide" && typeof selection.itemIndex === "number") {
      const slides: any[] = Array.isArray(cfg.slides) ? cfg.slides : [];
      const slide = slides[selection.itemIndex];
      if (!slide) return null;
      const updateSlide = (patch: Record<string, any>) => {
        const next = [...slides];
        next[selection.itemIndex!] = { ...next[selection.itemIndex!], ...patch };
        onUpdateWidgetConfig(selectedWidget.id, { slides: next });
      };

      return (
        <div className="rounded-2xl border border-amber-400/40 bg-amber-500/5 p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-amber-500">
              Banner Slide #{selection.itemIndex + 1}
            </span>
            <button
              type="button"
              onClick={() => {
                onUpdateWidgetConfig(selectedWidget.id, {
                  slides: slides.filter((_, i) => i !== selection.itemIndex),
                });
                onSelect({ widgetId: selectedWidget.id });
              }}
              className="text-red-500 hover:bg-red-500/10 rounded-lg p-1 cursor-pointer"
              title="Delete slide"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(slide.full_banner_mode)}
              onChange={(e) => updateSlide({ full_banner_mode: e.target.checked })}
            />
            Full-Bleed Artwork Photo (Zero Crop)
          </label>

          <div>
            <label className="block text-[10.5px] font-bold text-zinc-500 mb-1">
              Banner Photo (1200×600 or 1:1 • Auto ≤150KB)
            </label>
            <AdminImageUploadField
              value={slide.image_url || ""}
              onChange={(url) => updateSlide({ image_url: url })}
              folder="category-banners"
            />
          </div>

          <PhotoTransformPanel item={slide} onChange={(patch) => updateSlide(patch)} />

          {!slide.full_banner_mode && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10.5px] font-bold text-zinc-500 mb-1">Headline</label>
                  <input
                    type="text"
                    value={slide.title || ""}
                    onChange={(e) => updateSlide({ title: e.target.value })}
                    className={INPUT_CLS}
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold text-zinc-500 mb-1">Offer Pill</label>
                  <input
                    type="text"
                    value={slide.offer_text || ""}
                    onChange={(e) => updateSlide({ offer_text: e.target.value })}
                    className={INPUT_CLS}
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10.5px] font-bold text-zinc-500 mb-1">Banner Gradient Style</label>
                <select
                  value={slide.bg_gradient || BANNER_GRADIENTS[0].value}
                  onChange={(e) => updateSlide({ bg_gradient: e.target.value })}
                  className={SELECT_CLS}
                >
                  {BANNER_GRADIENTS.map((g) => (
                    <option key={g.label} value={g.value} className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white">
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-[10.5px] font-bold text-zinc-500 mb-1">Click Link URL</label>
            <input
              type="text"
              value={slide.destination_url || ""}
              onChange={(e) => updateSlide({ destination_url: e.target.value })}
              placeholder="/products?category=..."
              className={INPUT_CLS}
            />
          </div>

          <AutoLinkPills
            categoryId={blueprint.category_id}
            subcategories={subcategories}
            onPick={(url, suggested) =>
              updateSlide({ destination_url: url, ...(suggested ? { offer_text: suggested } : {}) })
            }
          />
        </div>
      );
    }

    // B. Clicked Subcategory Tile
    if (selectedWidget.widget_type === "SUBCATEGORY_NAV" && selection.subcategoryId) {
      const sc = subcategories.find((s) => s.id === selection.subcategoryId);
      if (!sc) return null;
      return (
        <div className="rounded-2xl border border-amber-400/40 bg-amber-500/5 p-3 space-y-2.5">
          <span className="text-[11px] font-black uppercase text-amber-500">
            Subcategory: {sc.name}
          </span>
          <p className="text-[11px] text-zinc-500">
            Recommended: <strong>400×400 (1:1)</strong> • Auto-compressed ≤150 KB & saved directly to DB.
          </p>
          <AdminImageUploadField
            value={subcatImages[sc.id] || sc.image_url || ""}
            onChange={(url) => onUploadSubcatImage(sc.id, url, `Saved portrait for ${sc.name}!`)}
            folder="category-subcategories"
          />
        </div>
      );
    }

    // C. Clicked Generic Card (Audience / Deal / Lookbook / Occasion / Store / Kit / Brand)
    const arrayKey =
      selectedWidget.widget_type === "EXPLORE_STORES_3X3"
        ? "stores"
        : selectedWidget.widget_type === "COMBO_KITS_MARQUEE"
          ? "kits"
          : selectedWidget.widget_type === "TREND_LOOKBOOK"
            ? "items"
            : selectedWidget.widget_type === "BRAND_SPOTLIGHT_GRID"
              ? "brands"
              : "cards";

    if (typeof selection.itemIndex === "number" && Array.isArray(cfg[arrayKey])) {
      const arr: any[] = cfg[arrayKey];
      const item = arr[selection.itemIndex];
      if (!item) return null;

      const updateItem = (patch: Record<string, any>) => {
        const next = [...arr];
        next[selection.itemIndex!] = { ...next[selection.itemIndex!], ...patch };
        onUpdateWidgetConfig(selectedWidget.id, { [arrayKey]: next });
      };

      const imgKey = selectedWidget.widget_type === "BRAND_SPOTLIGHT_GRID" ? "product_image_url" : "image_url";
      const titleKey = selectedWidget.widget_type === "BRAND_SPOTLIGHT_GRID" ? "brand_name" : "title";

      return (
        <div className="rounded-2xl border border-amber-400/40 bg-amber-500/5 p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase text-amber-500">
              Card #{selection.itemIndex + 1} Settings
            </span>
            <button
              type="button"
              onClick={() => {
                onUpdateWidgetConfig(selectedWidget.id, {
                  [arrayKey]: arr.filter((_, i) => i !== selection.itemIndex),
                });
                onSelect({ widgetId: selectedWidget.id });
              }}
              className="text-red-500 hover:bg-red-500/10 rounded-lg p-1 cursor-pointer"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <div>
            <label className="block text-[10.5px] font-bold text-zinc-500 mb-1">Card Title</label>
            <input
              type="text"
              value={item[titleKey] || ""}
              onChange={(e) => updateItem({ [titleKey]: e.target.value })}
              className={INPUT_CLS}
            />
          </div>

          <div>
            <label className="block text-[10.5px] font-bold text-zinc-500 mb-1">
              Card Photo (400×430 • Auto ≤150KB WebP)
            </label>
            <AdminImageUploadField
              value={item[imgKey] || ""}
              onChange={(url) => updateItem({ [imgKey]: url })}
              folder="category-cards"
            />
          </div>

          <PhotoTransformPanel item={item} onChange={(patch) => updateItem(patch)} />

          <div>
            <label className="block text-[10.5px] font-bold text-zinc-500 mb-1">Click Link URL</label>
            <input
              type="text"
              value={item.destination_url || ""}
              onChange={(e) => updateItem({ destination_url: e.target.value })}
              placeholder="/products?category=..."
              className={INPUT_CLS}
            />
          </div>

          <AutoLinkPills
            categoryId={blueprint.category_id}
            subcategories={subcategories}
            onPick={(url, suggested) =>
              updateItem({
                destination_url: url,
                ...(suggested && "offer_pill" in item ? { offer_pill: suggested } : {}),
                ...(suggested && "offer" in item ? { offer: suggested } : {}),
                ...(suggested && "offer_text" in item ? { offer_text: suggested } : {}),
              })
            }
          />
        </div>
      );
    }

    return null;
  };

  const isBannerWidget =
    selectedWidget?.widget_type === "HERO_CAROUSEL" || selectedWidget?.widget_type === "FULL_SPOTLIGHT_BANNER";

  return (
    <aside className="rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden flex flex-col max-h-[calc(100vh-140px)] sticky top-4">
      {/* 3 Clean Tabs */}
      <div className="grid grid-cols-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/70 p-1.5 gap-1">
        <button
          type="button"
          onClick={() => onTabChange("selected")}
          className={`flex items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-black cursor-pointer transition ${
            tab === "selected"
              ? "bg-amber-400 text-black shadow-xs"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          }`}
        >
          <Sliders className="h-3.5 w-3.5" /> Selected
        </button>
        <button
          type="button"
          onClick={() => onTabChange("theme")}
          className={`flex items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-black cursor-pointer transition ${
            tab === "theme"
              ? "bg-amber-400 text-black shadow-xs"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          }`}
        >
          <Palette className="h-3.5 w-3.5" /> Theme
        </button>
        <button
          type="button"
          onClick={() => onTabChange("add")}
          className={`flex items-center justify-center gap-1 rounded-xl py-2 text-[11px] font-black cursor-pointer transition ${
            tab === "add"
              ? "bg-amber-400 text-black shadow-xs"
              : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          }`}
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>

      {/* Scrollable Inspector Body */}
      <div className="p-4 overflow-y-auto space-y-4 flex-1">
        {tab === "selected" && (
          <>
            {!selectedWidget ? (
              <div className="rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 p-5 text-center space-y-2">
                <Sparkles className="h-6 w-6 text-amber-400 mx-auto" />
                <p className="text-xs font-black">Click Any Banner, Card, or Section</p>
                <p className="text-[11px] text-zinc-500">
                  Drag sections &amp; cards directly on the live screen, pull bottom handles to resize height, or zoom/move photos right here.
                </p>
              </div>
            ) : (
              <div className="space-y-3.5">
                <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2.5 flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-block rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-300 px-2 py-0.5 text-[10px] font-black uppercase">
                      {meta?.label || selectedWidget.widget_type}
                    </span>
                    <p className="text-xs font-black mt-1">{selectedWidget.title}</p>
                  </div>
                  <button
                    type="button"
                    onClick={resetWidgetStyle}
                    title="Reset custom size, columns, spacing & typography"
                    className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 dark:border-zinc-700 px-2 py-1 text-[10px] font-bold hover:border-amber-400 cursor-pointer shrink-0"
                  >
                    <RotateCcw className="h-3 w-3" /> Reset Size
                  </button>
                </div>

                {/* Inner clicked banner/card controls (Photo Zoom + Fit + Auto-Link) */}
                {renderSelectedItemControls()}

                {/* CANVA SIZE, GRID & SPACING PANEL */}
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 p-3 space-y-2.5">
                  <p className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-zinc-500">
                    <Maximize2 className="h-3 w-3 text-amber-500" /> Canva Size, Grid & Spacing
                  </p>

                  {/* Phone vs Desktop Columns (Card Width) */}
                  {!isBannerWidget && selectedWidget.widget_type !== "OFFER_PAYMENT_STRIP" && selectedWidget.widget_type !== "SUBCATEGORY_NAV" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="block text-[10px] font-bold text-zinc-500 mb-1">Phone Cards / Row</span>
                        <div className="grid grid-cols-4 gap-1">
                          {[1, 2, 3, 4].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => patchWidgetStyle({ mobileCols: c })}
                              className={`rounded-lg py-1 text-[10px] font-black border cursor-pointer ${
                                style.mobileCols === c
                                  ? "bg-amber-400 text-black border-amber-400"
                                  : "border-zinc-300 dark:border-zinc-700 text-zinc-500"
                              }`}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-zinc-500 mb-1">Desktop Cards / Row</span>
                        <div className="grid grid-cols-5 gap-1">
                          {[2, 3, 4, 5, 6].map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => patchWidgetStyle({ desktopCols: c })}
                              className={`rounded-lg py-1 text-[10px] font-black border cursor-pointer ${
                                style.desktopCols === c
                                  ? "bg-amber-400 text-black border-amber-400"
                                  : "border-zinc-300 dark:border-zinc-700 text-zinc-500"
                              }`}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Separate Phone & Desktop Height Sliders */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-zinc-500">
                        <span>Phone Height</span>
                        <span className="text-amber-500">
                          {(isBannerWidget ? style.bannerHeightMobile : style.cardHeightMobile) || "Auto"}
                          {(isBannerWidget ? style.bannerHeightMobile : style.cardHeightMobile) ? "px" : ""}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={isBannerWidget ? 140 : 100}
                        max={isBannerWidget ? 440 : 380}
                        step={4}
                        value={(isBannerWidget ? style.bannerHeightMobile : style.cardHeightMobile) || (isBannerWidget ? 220 : 150)}
                        onChange={(e) =>
                          patchWidgetStyle(
                            isBannerWidget
                              ? { bannerHeightMobile: Number(e.target.value) }
                              : { cardHeightMobile: Number(e.target.value) }
                          )
                        }
                        className="w-full accent-amber-400 cursor-pointer h-1.5"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-zinc-500">
                        <span>Desktop Height</span>
                        <span className="text-amber-500">
                          {(isBannerWidget ? style.bannerHeightDesktop : style.cardHeightDesktop) || "Auto"}
                          {(isBannerWidget ? style.bannerHeightDesktop : style.cardHeightDesktop) ? "px" : ""}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={isBannerWidget ? 180 : 110}
                        max={isBannerWidget ? 460 : 420}
                        step={4}
                        value={(isBannerWidget ? style.bannerHeightDesktop : style.cardHeightDesktop) || (isBannerWidget ? 260 : 190)}
                        onChange={(e) =>
                          patchWidgetStyle(
                            isBannerWidget
                              ? { bannerHeightDesktop: Number(e.target.value) }
                              : { cardHeightDesktop: Number(e.target.value) }
                          )
                        }
                        className="w-full accent-amber-400 cursor-pointer h-1.5"
                      />
                    </div>
                  </div>

                  {/* Gap, Corner Radius & Section Padding */}
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-[9.5px] font-bold text-zinc-500">Gap ({style.gapPx ?? 12}px)</span>
                      <input
                        type="range"
                        min={4}
                        max={28}
                        value={style.gapPx ?? 12}
                        onChange={(e) => patchWidgetStyle({ gapPx: Number(e.target.value) })}
                        className="w-full accent-amber-400 cursor-pointer h-1.5"
                      />
                    </div>
                    <div>
                      <span className="text-[9.5px] font-bold text-zinc-500">Corners ({style.borderRadius ?? 16}px)</span>
                      <input
                        type="range"
                        min={0}
                        max={32}
                        value={style.borderRadius ?? 16}
                        onChange={(e) => patchWidgetStyle({ borderRadius: Number(e.target.value) })}
                        className="w-full accent-amber-400 cursor-pointer h-1.5"
                      />
                    </div>
                    <div>
                      <span className="text-[9.5px] font-bold text-zinc-500">Space ({style.paddingY ?? 12}px)</span>
                      <input
                        type="range"
                        min={2}
                        max={40}
                        value={style.paddingY ?? 12}
                        onChange={(e) => patchWidgetStyle({ paddingY: Number(e.target.value) })}
                        className="w-full accent-amber-400 cursor-pointer h-1.5"
                      />
                    </div>
                  </div>
                </div>

                {/* CANVA TYPOGRAPHY & TEXT DELETE/HIDE PANEL */}
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 p-3 space-y-2.5">
                  <p className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-zinc-500">
                    <Type className="h-3 w-3 text-amber-500" /> Typography & Text Controls
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="block text-[10px] font-bold text-zinc-500 mb-1">Title Size</span>
                      <div className="grid grid-cols-4 gap-1">
                        {(["sm", "md", "lg", "xl"] as const).map((sz) => (
                          <button
                            key={sz}
                            type="button"
                            onClick={() => patchWidgetStyle({ titleSize: sz })}
                            className={`rounded-lg py-1 text-[10px] font-black uppercase border cursor-pointer ${
                              style.titleSize === sz
                                ? "bg-amber-400 text-black border-amber-400"
                                : "border-zinc-300 dark:border-zinc-700 text-zinc-500"
                            }`}
                          >
                            {sz}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <span className="block text-[10px] font-bold text-zinc-500 mb-1">Alignment</span>
                      <div className="grid grid-cols-3 gap-1">
                        {(
                          [
                            ["left", AlignLeft],
                            ["center", AlignCenter],
                            ["right", AlignRight],
                          ] as const
                        ).map(([al, Icon]) => (
                          <button
                            key={al}
                            type="button"
                            onClick={() => patchWidgetStyle({ titleAlign: al })}
                            className={`rounded-lg py-1 flex items-center justify-center border cursor-pointer ${
                              style.titleAlign === al
                                ? "bg-amber-400 text-black border-amber-400"
                                : "border-zinc-300 dark:border-zinc-700 text-zinc-500"
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(style.hideTitle)}
                        onChange={(e) => patchWidgetStyle({ hideTitle: e.target.checked })}
                      />
                      Hide Title
                    </label>
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(style.hideSubtitle)}
                        onChange={(e) => patchWidgetStyle({ hideSubtitle: e.target.checked })}
                      />
                      Hide Subtitle
                    </label>
                    <label className="inline-flex items-center gap-1.5 text-[11px] font-bold cursor-pointer">
                      <span>Color</span>
                      <input
                        type="color"
                        value={style.titleColor || "#111111"}
                        onChange={(e) => patchWidgetStyle({ titleColor: e.target.value })}
                        className="h-5 w-6 rounded cursor-pointer border-0 bg-transparent"
                      />
                    </label>
                  </div>
                </div>

                {/* Section-level Title, Style & Quick Actions */}
                <div className="space-y-2.5 pt-1">
                  <div>
                    <label className="block text-[10.5px] font-bold text-zinc-500 mb-1">Section Title</label>
                    <input
                      type="text"
                      value={selectedWidget.title}
                      onChange={(e) => onUpdateWidget(selectedWidget.id, { title: e.target.value })}
                      className={INPUT_CLS}
                    />
                  </div>

                  <div>
                    <label className="block text-[10.5px] font-bold text-zinc-500 mb-1">Subtitle / Eyebrow</label>
                    <input
                      type="text"
                      value={selectedWidget.subtitle || ""}
                      onChange={(e) => onUpdateWidget(selectedWidget.id, { subtitle: e.target.value })}
                      className={INPUT_CLS}
                    />
                  </div>

                  {meta && meta.variants.length > 0 && (
                    <div>
                      <label className="block text-[10.5px] font-bold text-zinc-500 mb-1">Visual Design Style</label>
                      <select
                        value={selectedWidget.style_variant || meta.variants[0].value}
                        onChange={(e) => onUpdateWidget(selectedWidget.id, { style_variant: e.target.value })}
                        className={SELECT_CLS}
                      >
                        {meta.variants.map((v) => (
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
                  )}

                  {selectedWidget.widget_type === "BUDGET_DISCOUNT_TILES" && (
                    <label className="flex items-center gap-2 text-xs font-bold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(cfg.smart_auto_slabs)}
                        onChange={(e) =>
                          onUpdateWidgetConfig(selectedWidget.id, { smart_auto_slabs: e.target.checked })
                        }
                      />
                      Smart Auto-Price Slabs (match real category prices)
                    </label>
                  )}

                  {selectedWidget.widget_type === "HERO_CAROUSEL" && (
                    <div className="space-y-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const existing: any[] = Array.isArray(cfg.slides) ? cfg.slides : [];
                          const next = [
                            ...existing,
                            {
                              id: `slide-${Date.now()}`,
                              title: "Season Mega Offer",
                              subtitle: "Curated drops for you",
                              offer_text: "Under ₹499",
                              image_url: "",
                              bg_gradient: BANNER_GRADIENTS[existing.length % BANNER_GRADIENTS.length].value,
                              full_banner_mode: true,
                              destination_url: `/products?category=${encodeURIComponent(blueprint.category_id)}&maxPrice=499&sort=price_asc`,
                            },
                          ];
                          onUpdateWidgetConfig(selectedWidget.id, { slides: next });
                          onSelect({ widgetId: selectedWidget.id, itemKind: "slide", itemIndex: next.length - 1 });
                        }}
                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black py-2 text-xs font-black cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add New Banner Slide
                      </button>
                      <div>
                        <label className="block text-[10.5px] font-bold text-zinc-500 mb-1">Max Auto Slides</label>
                        <input
                          type="number"
                          min={1}
                          max={12}
                          value={cfg.max_slides || 5}
                          onChange={(e) =>
                            onUpdateWidgetConfig(selectedWidget.id, {
                              max_slides: Math.max(1, Number(e.target.value) || 5),
                            })
                          }
                          className={INPUT_CLS}
                        />
                      </div>
                    </div>
                  )}

                  <label className="flex items-center gap-2 text-xs font-bold cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={selectedWidget.auto_fill !== false}
                      onChange={(e) => onUpdateWidget(selectedWidget.id, { auto_fill: e.target.checked })}
                    />
                    Auto-Pilot Fill from Live Products
                  </label>
                </div>
              </div>
            )}
          </>
        )}

        {/* TAB 2: LIVE THEME & COLORS */}
        {tab === "theme" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black">Storefront Enabled</span>
              <input
                type="checkbox"
                checked={blueprint.is_enabled}
                onChange={(e) => onToggleStorefrontEnabled(e.target.checked)}
                className="h-4 w-4 accent-amber-400 cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <p className="text-[10.5px] font-black uppercase text-zinc-500">1-Click Theme Presets</p>
              {(Object.keys(CATEGORY_THEME_PRESETS) as Array<Exclude<CategoryThemePresetKey, "custom">>).map((key) => {
                const p = CATEGORY_THEME_PRESETS[key];
                const active = blueprint.theme_preset === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => onApplyPreset(key)}
                    className={`w-full text-left rounded-2xl border p-2.5 transition cursor-pointer ${
                      active
                        ? "border-amber-400 bg-amber-500/10"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black">{p.label}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="h-3.5 w-3.5 rounded-full border border-black/15" style={{ backgroundColor: p.tokens.headerBg }} />
                        <span className="h-3.5 w-3.5 rounded-full border border-black/15" style={{ backgroundColor: p.tokens.accentBg }} />
                        <span className="h-3.5 w-3.5 rounded-full border border-black/15" style={{ backgroundColor: p.tokens.softTintBg }} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
              <p className="text-[10.5px] font-black uppercase text-zinc-500">Instant Custom Colors (0ms Preview)</p>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    ["headerBg", "Header Bar"],
                    ["accentBg", "Primary Accent"],
                    ["accentText", "Accent Text"],
                    ["secondaryBoxBg", "Dark Deal Box"],
                    ["softTintBg", "Soft Tint"],
                    ["marqueeBg", "Marquee Tape"],
                  ] as const
                ).map(([tokenKey, label]) => (
                  <label
                    key={tokenKey}
                    className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 px-2.5 py-1.5 text-[11px] font-bold cursor-pointer"
                  >
                    <span className="truncate">{label}</span>
                    <input
                      type="color"
                      value={blueprint.theme_tokens[tokenKey]}
                      onChange={(e) => onUpdateToken(tokenKey, e.target.value)}
                      className="h-5 w-7 rounded cursor-pointer border-0 bg-transparent"
                    />
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ADD ANY SECTION WIDGET */}
        {tab === "add" && (
          <div className="space-y-2">
            <p className="text-[10.5px] font-black uppercase text-zinc-500">
              Click Any Section to Add to {blueprint.category_name}
            </p>
            {(Object.keys(WIDGET_CATALOG_META) as CategoryWidgetType[]).map((wt) => {
              const info = WIDGET_CATALOG_META[wt];
              return (
                <button
                  key={wt}
                  type="button"
                  onClick={() => onAddWidget(wt)}
                  className="w-full text-left rounded-2xl border border-zinc-200 dark:border-zinc-800 hover:border-amber-400 hover:bg-amber-500/5 p-3 transition cursor-pointer flex items-start justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-black">{info.label}</p>
                    <p className="text-[10.5px] text-zinc-500 mt-0.5 leading-snug">{info.description}</p>
                  </div>
                  <span className="h-6 w-6 rounded-lg bg-amber-400 text-black flex items-center justify-center shrink-0 mt-0.5">
                    <Plus className="h-3.5 w-3.5" />
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
