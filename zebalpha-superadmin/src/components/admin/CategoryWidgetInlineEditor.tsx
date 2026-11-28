"use client";

import React, { useRef, useState } from "react";
import { Plus, Trash2, Upload, Loader2, Link2, Tag } from "lucide-react";
import type { CategoryWidgetConfig } from "@/lib/categoryStorefrontTypes";

interface SubcatOption {
  id: string;
  name: string;
  slug: string;
}

const INPUT_CLS =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 px-3 py-1.5 text-xs font-semibold focus:border-amber-400 focus:outline-none";

const SELECT_CLS =
  "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white [color-scheme:light] dark:[color-scheme:dark] px-2.5 py-1.5 text-xs font-bold focus:border-amber-400 focus:outline-none";

const BANNER_GRADIENT_OPTIONS = [
  { label: "Cosmic Purple (Beauty / Glam)", value: "linear-gradient(135deg, #1b0d26 0%, #3b124d 55%, #16091f 100%)" },
  { label: "Streetwear Noir (Fashion)", value: "linear-gradient(135deg, #0d0f10 0%, #23272a 55%, #090a0b 100%)" },
  { label: "Midnight Navy (Tech / Luxe)", value: "linear-gradient(135deg, #0e1726 0%, #1d3557 55%, #0a101d 100%)" },
  { label: "Rose Berry (Women / Festive)", value: "linear-gradient(135deg, #4a0e2e 0%, #9d174d 55%, #2b081b 100%)" },
  { label: "Champagne Gold Noir", value: "linear-gradient(135deg, #16120b 0%, #4a3514 55%, #0e0b06 100%)" },
  { label: "Emerald Forest", value: "linear-gradient(135deg, #062119 0%, #065f46 55%, #041510 100%)" },
];

export function AdminImageUploadField({
  value,
  onChange,
  placeholder = "Image URL or click Upload",
  folder = "category-storefront",
}: {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  folder?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", folder);
      const res = await fetch("/api/admin/category-storefront/upload", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (json?.success && json.publicUrl) {
        onChange(json.publicUrl);
      } else {
        alert(json?.message || "Image upload failed");
      }
    } catch (err: any) {
      alert(err?.message || "Upload error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {value && (
        <img
          src={value}
          alt="Preview"
          className="h-8 w-8 rounded-lg object-cover border border-zinc-300 dark:border-zinc-700 shrink-0"
        />
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={INPUT_CLS}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/webp,image/jpeg,image/png"
        onChange={handleFile}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="shrink-0 inline-flex items-center gap-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-black px-2.5 py-1.5 text-[11px] font-black cursor-pointer disabled:opacity-50"
        title="Upload photo directly to Cloudinary CDN"
      >
        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">{uploading ? "..." : "Upload"}</span>
      </button>
    </div>
  );
}

function QuickAutoLinkBar({
  categoryId,
  subcategories,
  onBuildUrl,
}: {
  categoryId: string;
  subcategories: SubcatOption[];
  onBuildUrl: (url: string, suggestedOffer?: string) => void;
}) {
  const catParam = encodeURIComponent(categoryId);
  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-1">
      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-zinc-500">
        <Link2 className="h-3 w-3" /> Auto-Link:
      </span>
      {[199, 299, 499, 799, 999].map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onBuildUrl(`/products?category=${catParam}&maxPrice=${p}&sort=price_asc`, `Under ₹${p}`)}
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-2 py-0.5 text-[10px] font-bold hover:border-amber-400 cursor-pointer"
        >
          Under ₹{p}
        </button>
      ))}
      {[30, 50, 70].map((d) => (
        <button
          key={d}
          type="button"
          onClick={() => onBuildUrl(`/products?category=${catParam}&minDiscount=${d}&sort=discount_desc`, `Min. ${d}% Off`)}
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-2 py-0.5 text-[10px] font-bold hover:border-emerald-400 cursor-pointer"
        >
          {d}%+ Off
        </button>
      ))}
      {subcategories.slice(0, 5).map((sc) => (
        <button
          key={sc.id}
          type="button"
          onClick={() => onBuildUrl(`/products?category=${catParam}&subcategory=${encodeURIComponent(sc.id)}`)}
          className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-2 py-0.5 text-[10px] font-bold hover:border-blue-400 cursor-pointer"
        >
          {sc.name}
        </button>
      ))}
    </div>
  );
}

export function CategoryWidgetInlineEditor({
  widget,
  categoryId,
  subcategories,
  onUpdateConfig,
}: {
  widget: CategoryWidgetConfig;
  categoryId: string;
  subcategories: SubcatOption[];
  onUpdateConfig: (patch: Record<string, any>) => void;
}) {
  const cfg = widget.config || {};
  const catParam = encodeURIComponent(categoryId);
  const [newPriceInput, setNewPriceInput] = useState("");
  const [newDiscInput, setNewDiscInput] = useState("");

  // 1. HERO CAROUSEL — Unlimited Slides + Upload + Design Gradient + Full Artwork Mode + Auto-Link
  if (widget.widget_type === "HERO_CAROUSEL") {
    const slides: any[] = Array.isArray(cfg.slides) ? cfg.slides : [];
    const updateSlide = (idx: number, patch: Record<string, any>) => {
      const next = [...slides];
      next[idx] = { ...next[idx], ...patch };
      onUpdateConfig({ slides: next });
    };

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">Campaign Badge</label>
            <input
              type="text"
              value={cfg.campaign_badge || ""}
              onChange={(e) => onUpdateConfig({ campaign_badge: e.target.value })}
              placeholder="GLAM UP / MEGA DROP"
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">Footer Offer Bar</label>
            <input
              type="text"
              value={cfg.footer_offer || ""}
              onChange={(e) => onUpdateConfig({ footer_offer: e.target.value })}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">Max Auto Slides</label>
            <input
              type="number"
              min={1}
              max={12}
              value={cfg.max_slides || 5}
              onChange={(e) => onUpdateConfig({ max_slides: Math.max(1, Number(e.target.value) || 5) })}
              className={INPUT_CLS}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] font-black uppercase text-zinc-500">
            Banner Slides ({slides.length} custom — add as many as you want)
          </span>
          <button
            type="button"
            onClick={() =>
              onUpdateConfig({
                slides: [
                  ...slides,
                  {
                    id: `slide-${Date.now()}`,
                    title: "Season Mega Offer",
                    subtitle: "Limited time curated picks",
                    offer_text: "Under ₹499",
                    image_url: "",
                    bg_gradient: BANNER_GRADIENT_OPTIONS[0].value,
                    full_banner_mode: false,
                    destination_url: `/products?category=${catParam}&maxPrice=499&sort=price_asc`,
                  },
                ],
              })
            }
            className="inline-flex items-center gap-1 rounded-xl bg-amber-400 hover:bg-amber-300 text-black px-3 py-1.5 text-[11px] font-black cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Add Banner Slide
          </button>
        </div>

        <div className="space-y-2.5">
          {slides.map((sl, idx) => (
            <div
              key={sl.id || idx}
              className="p-3 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black text-amber-500">Banner Slide #{idx + 1}</span>
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-1.5 text-[11px] font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(sl.full_banner_mode)}
                      onChange={(e) => updateSlide(idx, { full_banner_mode: e.target.checked })}
                    />
                    Full-Bleed Artwork Photo
                  </label>
                  <button
                    type="button"
                    onClick={() => onUpdateConfig({ slides: slides.filter((_, i) => i !== idx) })}
                    className="text-red-500 hover:bg-red-500/10 rounded-lg p-1 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={sl.title || ""}
                  onChange={(e) => updateSlide(idx, { title: e.target.value })}
                  placeholder="Headline / Brand"
                  className={INPUT_CLS}
                />
                <input
                  type="text"
                  value={sl.offer_text || ""}
                  onChange={(e) => updateSlide(idx, { offer_text: e.target.value })}
                  placeholder="Offer Pill (e.g. Under ₹299)"
                  className={INPUT_CLS}
                />
                <select
                  value={sl.bg_gradient || BANNER_GRADIENT_OPTIONS[0].value}
                  onChange={(e) => updateSlide(idx, { bg_gradient: e.target.value })}
                  className={SELECT_CLS}
                >
                  {BANNER_GRADIENT_OPTIONS.map((g) => (
                    <option key={g.label} value={g.value} className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white">
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <AdminImageUploadField
                  value={sl.image_url || ""}
                  onChange={(url) => updateSlide(idx, { image_url: url })}
                  placeholder="Upload or paste banner/product image URL"
                />
                <input
                  type="text"
                  value={sl.destination_url || ""}
                  onChange={(e) => updateSlide(idx, { destination_url: e.target.value })}
                  placeholder="Click Destination URL (/products?...)"
                  className={INPUT_CLS}
                />
              </div>

              <QuickAutoLinkBar
                categoryId={categoryId}
                subcategories={subcategories}
                onBuildUrl={(url, suggested) =>
                  updateSlide(idx, {
                    destination_url: url,
                    ...(suggested ? { offer_text: suggested } : {}),
                  })
                }
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 2. BUDGET & DISCOUNT PRICE CARDS — Unlimited Price Slabs + Discount Slabs + Smart Auto-Price Mode
  if (widget.widget_type === "BUDGET_DISCOUNT_TILES") {
    const priceSlabs: number[] = Array.isArray(cfg.price_slabs) ? cfg.price_slabs : [299, 499, 799];
    const discountSlabs: number[] = Array.isArray(cfg.discount_slabs) ? cfg.discount_slabs : [30, 50, 70];

    const addPrice = () => {
      const n = parseInt(newPriceInput.trim(), 10);
      if (!n || n <= 0) return;
      onUpdateConfig({ price_slabs: Array.from(new Set([...priceSlabs, n])).sort((a, b) => a - b) });
      setNewPriceInput("");
    };

    const addDiscount = () => {
      const n = parseInt(newDiscInput.trim(), 10);
      if (!n || n <= 0 || n > 95) return;
      onUpdateConfig({ discount_slabs: Array.from(new Set([...discountSlabs, n])).sort((a, b) => a - b) });
      setNewDiscInput("");
    };

    return (
      <div className="space-y-4">
        <label className="inline-flex items-center gap-2 text-xs font-bold cursor-pointer">
          <input
            type="checkbox"
            checked={Boolean(cfg.smart_auto_slabs)}
            onChange={(e) => onUpdateConfig({ smart_auto_slabs: e.target.checked })}
          />
          Smart Auto-Price Slabs (automatically adapts price cards to the category&apos;s real lowest–highest product prices)
        </label>

        {/* Dynamic Price Offer Cards */}
        <div className="space-y-2">
          <p className="text-[11px] font-black uppercase text-zinc-500">
            Price Offer Cards ({priceSlabs.length} cards — automatically linked to this category&apos;s products ≤ ₹Price)
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {priceSlabs.map((p) => (
              <span
                key={p}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400/20 border border-amber-400/50 text-amber-900 dark:text-amber-200 px-3 py-1 text-xs font-black"
              >
                <Tag className="h-3 w-3" /> Under ₹{p}
                <button
                  type="button"
                  onClick={() => onUpdateConfig({ price_slabs: priceSlabs.filter((x) => x !== p) })}
                  className="ml-1 text-red-500 hover:text-red-400 cursor-pointer"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 max-w-xs">
            <input
              type="number"
              value={newPriceInput}
              onChange={(e) => setNewPriceInput(e.target.value)}
              placeholder="Add price e.g. 299"
              className={INPUT_CLS}
            />
            <button
              type="button"
              onClick={addPrice}
              className="shrink-0 inline-flex items-center gap-1 rounded-xl bg-zinc-900 dark:bg-amber-400 text-white dark:text-black px-3 py-1.5 text-xs font-black cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
        </div>

        {/* Dynamic Discount Offer Cards */}
        <div className="space-y-2">
          <p className="text-[11px] font-black uppercase text-zinc-500">
            Discount Offer Cards ({discountSlabs.length} cards — auto-linked to Min. % Off)
          </p>
          <div className="flex flex-wrap items-center gap-2">
            {discountSlabs.map((d) => (
              <span
                key={d}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-800 dark:text-emerald-200 px-3 py-1 text-xs font-black"
              >
                Min. {d}% Off
                <button
                  type="button"
                  onClick={() => onUpdateConfig({ discount_slabs: discountSlabs.filter((x) => x !== d) })}
                  className="ml-1 text-red-500 hover:text-red-400 cursor-pointer"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2 max-w-xs">
            <input
              type="number"
              value={newDiscInput}
              onChange={(e) => setNewDiscInput(e.target.value)}
              placeholder="Add % e.g. 40"
              className={INPUT_CLS}
            />
            <button
              type="button"
              onClick={addDiscount}
              className="shrink-0 inline-flex items-center gap-1 rounded-xl bg-zinc-900 dark:bg-amber-400 text-white dark:text-black px-3 py-1.5 text-xs font-black cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. THEMED DEAL RAIL — Card Count + Auto Price/Discount/Subcategory Filter + Unlimited Custom Offer Cards
  if (widget.widget_type === "THEMED_DEAL_RAIL") {
    const cards: any[] = Array.isArray(cfg.cards) ? cfg.cards : [];
    const updateCard = (idx: number, patch: Record<string, any>) => {
      const next = [...cards];
      next[idx] = { ...next[idx], ...patch };
      onUpdateConfig({ cards: next });
    };

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <div>
            <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">Number of Cards</label>
            <input
              type="number"
              min={2}
              max={16}
              value={cfg.max_items || 8}
              onChange={(e) => onUpdateConfig({ max_items: Math.max(2, Number(e.target.value) || 8) })}
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">Auto Max Price (₹)</label>
            <input
              type="number"
              value={cfg.max_price || ""}
              onChange={(e) => onUpdateConfig({ max_price: e.target.value ? Number(e.target.value) : "" })}
              placeholder="e.g. 499"
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">Auto Min Discount (%)</label>
            <input
              type="number"
              value={cfg.min_discount || ""}
              onChange={(e) => onUpdateConfig({ min_discount: e.target.value ? Number(e.target.value) : "" })}
              placeholder="e.g. 30"
              className={INPUT_CLS}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">Color / Keyword Filter</label>
            <input
              type="text"
              value={cfg.color_filter || ""}
              onChange={(e) => onUpdateConfig({ color_filter: e.target.value })}
              placeholder="e.g. black"
              className={INPUT_CLS}
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] font-black uppercase text-zinc-500">
            Custom Offer Cards ({cards.length} — leave empty for Auto-Pilot products)
          </span>
          <button
            type="button"
            onClick={() =>
              onUpdateConfig({
                cards: [
                  ...cards,
                  {
                    id: `deal-${Date.now()}`,
                    title: "Offer Pick",
                    offer_pill: "Under ₹299",
                    image_url: "",
                    destination_url: `/products?category=${catParam}&maxPrice=299&sort=price_asc`,
                  },
                ],
              })
            }
            className="inline-flex items-center gap-1 rounded-xl bg-amber-400 text-black px-3 py-1 text-[11px] font-black cursor-pointer"
          >
            <Plus className="h-3 w-3" /> Add Offer Card
          </button>
        </div>

        {cards.map((c, idx) => (
          <div key={c.id || idx} className="p-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input type="text" value={c.title || ""} onChange={(e) => updateCard(idx, { title: e.target.value })} placeholder="Card Title" className={INPUT_CLS} />
              <input type="text" value={c.offer_pill || ""} onChange={(e) => updateCard(idx, { offer_pill: e.target.value })} placeholder="Min. 50% Off / Under ₹299" className={INPUT_CLS} />
              <div className="flex items-center gap-1.5">
                <input type="text" value={c.destination_url || ""} onChange={(e) => updateCard(idx, { destination_url: e.target.value })} placeholder="Destination URL" className={INPUT_CLS} />
                <button type="button" onClick={() => onUpdateConfig({ cards: cards.filter((_, i) => i !== idx) })} className="p-1.5 text-red-500 cursor-pointer">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <AdminImageUploadField value={c.image_url || ""} onChange={(url) => updateCard(idx, { image_url: url })} />
            <QuickAutoLinkBar
              categoryId={categoryId}
              subcategories={subcategories}
              onBuildUrl={(url, suggested) => updateCard(idx, { destination_url: url, ...(suggested ? { offer_pill: suggested } : {}) })}
            />
          </div>
        ))}
      </div>
    );
  }

  // 4. AUDIENCE SPLIT / OCCASION / TREND LOOKBOOK — Unlimited Cards with Image Upload
  if (
    widget.widget_type === "AUDIENCE_SPLIT_3COL" ||
    widget.widget_type === "OCCASION_2COL" ||
    widget.widget_type === "TREND_LOOKBOOK"
  ) {
    const fieldKey = widget.widget_type === "TREND_LOOKBOOK" ? "items" : "cards";
    const list: any[] = Array.isArray(cfg[fieldKey]) ? cfg[fieldKey] : [];
    const updateItem = (idx: number, patch: Record<string, any>) => {
      const next = [...list];
      next[idx] = { ...next[idx], ...patch };
      onUpdateConfig({ [fieldKey]: next });
    };

    return (
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase text-zinc-500">
            Section Cards ({list.length} cards)
          </span>
          <button
            type="button"
            onClick={() =>
              onUpdateConfig({
                [fieldKey]: [
                  ...list,
                  {
                    id: `card-${Date.now()}`,
                    title: "New Collection",
                    offer: "Up to 50% Off",
                    tag_filter: "trending",
                    image_url: "",
                    destination_url: `/products?category=${catParam}`,
                  },
                ],
              })
            }
            className="inline-flex items-center gap-1 rounded-xl bg-amber-400 text-black px-3 py-1 text-[11px] font-black cursor-pointer"
          >
            <Plus className="h-3 w-3" /> Add Card
          </button>
        </div>

        {list.map((it, idx) => (
          <div key={it.id || idx} className="p-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <input type="text" value={it.title || ""} onChange={(e) => updateItem(idx, { title: e.target.value })} placeholder="Title" className={INPUT_CLS} />
              <input type="text" value={it.offer || ""} onChange={(e) => updateItem(idx, { offer: e.target.value })} placeholder="Offer Badge (optional)" className={INPUT_CLS} />
              <input type="text" value={it.tag_filter || it.tag || ""} onChange={(e) => updateItem(idx, { tag_filter: e.target.value, tag: e.target.value })} placeholder="Tag (e.g. korean, party)" className={INPUT_CLS} />
              <div className="flex items-center gap-1.5">
                <input type="text" value={it.destination_url || ""} onChange={(e) => updateItem(idx, { destination_url: e.target.value })} placeholder="/products?..." className={INPUT_CLS} />
                <button type="button" onClick={() => onUpdateConfig({ [fieldKey]: list.filter((_, i) => i !== idx) })} className="p-1.5 text-red-500 cursor-pointer">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <AdminImageUploadField value={it.image_url || ""} onChange={(url) => updateItem(idx, { image_url: url })} />
            <QuickAutoLinkBar categoryId={categoryId} subcategories={subcategories} onBuildUrl={(url) => updateItem(idx, { destination_url: url })} />
          </div>
        ))}
      </div>
    );
  }

  // 5. BRAND SPOTLIGHT GRID & CURATED SHELF — Max Cards + Unlimited Custom Brand Cards
  if (widget.widget_type === "BRAND_SPOTLIGHT_GRID" || widget.widget_type === "CURATED_SHELF") {
    const brands: any[] = Array.isArray(cfg.brands) ? cfg.brands : [];
    const updateBrand = (idx: number, patch: Record<string, any>) => {
      const next = [...brands];
      next[idx] = { ...next[idx], ...patch };
      onUpdateConfig({ brands: next });
    };

    return (
      <div className="space-y-3">
        <div className="max-w-xs">
          <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">
            Total Brand Cards Shown
          </label>
          <input
            type="number"
            min={2}
            max={18}
            value={cfg.max_items || 9}
            onChange={(e) => onUpdateConfig({ max_items: Math.max(2, Number(e.target.value) || 9) })}
            className={INPUT_CLS}
          />
        </div>

        {widget.widget_type === "BRAND_SPOTLIGHT_GRID" && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-zinc-500">
                Custom Brand Cards ({brands.length})
              </span>
              <button
                type="button"
                onClick={() =>
                  onUpdateConfig({
                    brands: [
                      ...brands,
                      {
                        id: `br-${Date.now()}`,
                        brand_name: "ZEBALPHA",
                        offer_text: "Up to 50% Off",
                        product_image_url: "",
                        destination_url: `/products?category=${catParam}&brand=ZEBALPHA`,
                      },
                    ],
                  })
                }
                className="inline-flex items-center gap-1 rounded-xl bg-amber-400 text-black px-3 py-1 text-[11px] font-black cursor-pointer"
              >
                <Plus className="h-3 w-3" /> Add Brand Card
              </button>
            </div>
            {brands.map((b, idx) => (
              <div key={b.id || idx} className="p-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={b.brand_name || ""}
                    onChange={(e) =>
                      updateBrand(idx, {
                        brand_name: e.target.value,
                        destination_url: `/products?category=${catParam}&brand=${encodeURIComponent(e.target.value)}`,
                      })
                    }
                    placeholder="Brand Name"
                    className={INPUT_CLS}
                  />
                  <input type="text" value={b.offer_text || ""} onChange={(e) => updateBrand(idx, { offer_text: e.target.value })} placeholder="Min. 50% Off" className={INPUT_CLS} />
                  <div className="flex items-center gap-1.5">
                    <input type="text" value={b.destination_url || ""} onChange={(e) => updateBrand(idx, { destination_url: e.target.value })} placeholder="/products?..." className={INPUT_CLS} />
                    <button type="button" onClick={() => onUpdateConfig({ brands: brands.filter((_, i) => i !== idx) })} className="p-1.5 text-red-500 cursor-pointer">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <AdminImageUploadField value={b.product_image_url || ""} onChange={(url) => updateBrand(idx, { product_image_url: url })} />
              </div>
            ))}
          </>
        )}
      </div>
    );
  }

  // 6. FULL SPOTLIGHT BANNER
  if (widget.widget_type === "FULL_SPOTLIGHT_BANNER") {
    return (
      <div className="space-y-2.5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <input type="text" value={cfg.cta_label || "Explore now"} onChange={(e) => onUpdateConfig({ cta_label: e.target.value })} placeholder="CTA Button Label" className={INPUT_CLS} />
          <input type="text" value={cfg.destination_url || ""} onChange={(e) => onUpdateConfig({ destination_url: e.target.value })} placeholder="Destination URL" className={INPUT_CLS} />
        </div>
        <AdminImageUploadField value={cfg.banner_image_url || ""} onChange={(url) => onUpdateConfig({ banner_image_url: url })} placeholder="Upload Spotlight Photo" />
        <QuickAutoLinkBar categoryId={categoryId} subcategories={subcategories} onBuildUrl={(url) => onUpdateConfig({ destination_url: url })} />
      </div>
    );
  }

  // 7. COMBO KITS + MARQUEE
  if (widget.widget_type === "COMBO_KITS_MARQUEE") {
    const kits: any[] = Array.isArray(cfg.kits) ? cfg.kits : [];
    const updateKit = (idx: number, patch: Record<string, any>) => {
      const next = [...kits];
      next[idx] = { ...next[idx], ...patch };
      onUpdateConfig({ kits: next });
    };

    return (
      <div className="space-y-3">
        <div>
          <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">Tilted Marquee Ribbon Text</label>
          <input type="text" value={cfg.marquee_text || ""} onChange={(e) => onUpdateConfig({ marquee_text: e.target.value })} className={INPUT_CLS} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase text-zinc-500">Combo / Kit Cards ({kits.length})</span>
          <button
            type="button"
            onClick={() =>
              onUpdateConfig({
                kits: [...kits, { id: `kit-${Date.now()}`, title: "Value Combo", offer_pill: "Up to 60% Off", image_url: "", destination_url: `/products?category=${catParam}&tag=combo` }],
              })
            }
            className="inline-flex items-center gap-1 rounded-xl bg-amber-400 text-black px-3 py-1 text-[11px] font-black cursor-pointer"
          >
            <Plus className="h-3 w-3" /> Add Kit Card
          </button>
        </div>
        {kits.map((k, idx) => (
          <div key={k.id || idx} className="p-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input type="text" value={k.title || ""} onChange={(e) => updateKit(idx, { title: e.target.value })} placeholder="Kit Title" className={INPUT_CLS} />
              <input type="text" value={k.offer_pill || ""} onChange={(e) => updateKit(idx, { offer_pill: e.target.value })} placeholder="Up to 70% Off" className={INPUT_CLS} />
              <div className="flex items-center gap-1.5">
                <input type="text" value={k.destination_url || ""} onChange={(e) => updateKit(idx, { destination_url: e.target.value })} placeholder="Destination URL" className={INPUT_CLS} />
                <button type="button" onClick={() => onUpdateConfig({ kits: kits.filter((_, i) => i !== idx) })} className="p-1.5 text-red-500 cursor-pointer">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <AdminImageUploadField value={k.image_url || ""} onChange={(url) => updateKit(idx, { image_url: url })} />
          </div>
        ))}
      </div>
    );
  }

  // 8. EXPLORE OUR STORES — Unlimited Micro-Store Cards + Image Upload
  if (widget.widget_type === "EXPLORE_STORES_3X3") {
    const stores: any[] = Array.isArray(cfg.stores) ? cfg.stores : [];
    const updateStore = (idx: number, patch: Record<string, any>) => {
      const next = [...stores];
      next[idx] = { ...next[idx], ...patch };
      onUpdateConfig({ stores: next });
    };

    return (
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase text-zinc-500">Micro-Store Tiles ({stores.length} cards)</span>
          <button
            type="button"
            onClick={() =>
              onUpdateConfig({
                stores: [
                  ...stores,
                  { id: `st-${Date.now()}`, title: "NEW STORE", tag_filter: "trending", image_url: "", destination_url: `/products?category=${catParam}` },
                ],
              })
            }
            className="inline-flex items-center gap-1 rounded-xl bg-amber-400 text-black px-3 py-1 text-[11px] font-black cursor-pointer"
          >
            <Plus className="h-3 w-3" /> Add Store Card
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {stores.map((st, idx) => (
            <div key={st.id || idx} className="p-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <div className="flex items-center gap-1.5">
                <input type="text" value={st.title || ""} onChange={(e) => updateStore(idx, { title: e.target.value })} placeholder="Store Title" className={INPUT_CLS} />
                <input type="text" value={st.tag_filter || ""} onChange={(e) => updateStore(idx, { tag_filter: e.target.value, destination_url: `/products?category=${catParam}&tag=${encodeURIComponent(e.target.value)}` })} placeholder="Tag (korean)" className={INPUT_CLS} />
                <button type="button" onClick={() => onUpdateConfig({ stores: stores.filter((_, i) => i !== idx) })} className="p-1.5 text-red-500 cursor-pointer shrink-0">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <AdminImageUploadField value={st.image_url || ""} onChange={(url) => updateStore(idx, { image_url: url })} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 9. OFFER PAYMENT STRIP
  if (widget.widget_type === "OFFER_PAYMENT_STRIP") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-zinc-500">Left Offer Card</label>
          <input type="text" value={cfg.left_title || ""} onChange={(e) => onUpdateConfig({ left_title: e.target.value })} placeholder="Title" className={INPUT_CLS} />
          <input type="text" value={cfg.left_subtitle || ""} onChange={(e) => onUpdateConfig({ left_subtitle: e.target.value })} placeholder="Subtitle" className={INPUT_CLS} />
        </div>
        <div className="space-y-1.5">
          <label className="block text-[11px] font-bold text-zinc-500">Right Offer Card</label>
          <input type="text" value={cfg.right_title || ""} onChange={(e) => onUpdateConfig({ right_title: e.target.value })} placeholder="Title" className={INPUT_CLS} />
          <input type="text" value={cfg.right_subtitle || ""} onChange={(e) => onUpdateConfig({ right_subtitle: e.target.value })} placeholder="Subtitle" className={INPUT_CLS} />
        </div>
      </div>
    );
  }

  // 10. INFINITE PRODUCT FEED
  if (widget.widget_type === "INFINITE_PRODUCT_FEED") {
    return (
      <div className="max-w-xs">
        <label className="block text-[11px] font-bold text-zinc-600 dark:text-zinc-400 mb-1">Products Loaded Per Page</label>
        <select
          value={cfg.page_size || 24}
          onChange={(e) => onUpdateConfig({ page_size: Number(e.target.value) || 24 })}
          className={SELECT_CLS}
        >
          {[12, 24, 36, 48].map((n) => (
            <option key={n} value={n} className="bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white">
              {n} products per batch
            </option>
          ))}
        </select>
      </div>
    );
  }

  return null;
}
