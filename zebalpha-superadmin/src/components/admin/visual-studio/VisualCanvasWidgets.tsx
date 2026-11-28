"use client";

import React, { useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  ChevronRight,
  Flame,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  Trash2,
} from "lucide-react";
import type { CategoryThemeTokens, CategoryWidgetConfig } from "@/lib/categoryStorefrontTypes";
import {
  type DeviceMode,
  type StudioPreviewBrand,
  type StudioPreviewProduct,
  type StudioSelection,
  type StudioSubcategoryRow,
  DirectUploadOverlay,
  InlineEditableText,
  StudioSmartFitImage,
} from "./VisualStudioShared";

interface CanvasWidgetProps {
  widget: CategoryWidgetConfig;
  deviceMode: DeviceMode;
  categoryId: string;
  categoryName: string;
  tokens: CategoryThemeTokens;
  subcategories: StudioSubcategoryRow[];
  subcatImages: Record<string, string>;
  products: StudioPreviewProduct[];
  brands: StudioPreviewBrand[];
  selection: StudioSelection | null;
  onSelect: (sel: StudioSelection) => void;
  onUpdateWidget: (patch: Partial<CategoryWidgetConfig>) => void;
  onUpdateConfig: (configPatch: Record<string, any>) => void;
  onUploadSubcatImage: (subId: string, url: string, summary: string) => void;
  onNotify: (text: string, type?: "success" | "error") => void;
}

const DARK_GRADIENTS = [
  "linear-gradient(135deg, #1b0d26 0%, #3b124d 55%, #16091f 100%)",
  "linear-gradient(135deg, #0e1726 0%, #1d3557 55%, #0a101d 100%)",
  "linear-gradient(135deg, #1e1612 0%, #4a2d1d 55%, #120d0a 100%)",
  "linear-gradient(135deg, #0d1f1a 0%, #194538 55%, #081410 100%)",
];

const BEAUTY_GRADIENTS = [
  "linear-gradient(180deg, #ff7eb3 0%, #ff4d8d 100%)",
  "linear-gradient(180deg, #ffa07a 0%, #ff5e62 100%)",
  "linear-gradient(180deg, #f472b6 0%, #db2777 100%)",
  "linear-gradient(180deg, #fb7185 0%, #e11d48 100%)",
  "linear-gradient(180deg, #c084fc 0%, #9333ea 100%)",
];

export function VisualCanvasWidgetRenderer(props: CanvasWidgetProps) {
  const {
    widget,
    deviceMode,
    categoryId,
    categoryName,
    tokens,
    subcategories,
    subcatImages,
    products,
    brands,
    selection,
    onSelect,
    onUpdateWidget,
    onUpdateConfig,
    onUploadSubcatImage,
    onNotify,
  } = props;

  const isMobile = deviceMode === "mobile";
  const isTablet = deviceMode === "tablet";
  const cfg = widget.config || {};
  const catParam = encodeURIComponent(categoryId);

  const [activeHeroIdx, setActiveHeroIdx] = useState(0);
  const [addingPrice, setAddingPrice] = useState(false);
  const [newPriceVal, setNewPriceVal] = useState("");
  const [addingDisc, setAddingDisc] = useState(false);
  const [newDiscVal, setNewDiscVal] = useState("");

  // =========================================================================
  // 1. HERO_CAROUSEL — Exact Uploaded Aspect Ratio + Direct Upload + Inline Text
  // =========================================================================
  if (widget.widget_type === "HERO_CAROUSEL") {
    const manualSlides: any[] = Array.isArray(cfg.slides) ? cfg.slides : [];
    const autoSlides =
      manualSlides.length === 0 && widget.auto_fill !== false
        ? products.slice(0, Math.min(3, Number(cfg.max_slides || 3))).map((p) => ({
            id: `auto-${p.id}`,
            title: p.brand !== "Zebalpha" ? p.brand : p.name.split(" ").slice(0, 3).join(" "),
            subtitle: p.name,
            offer_text: p.discountPercent >= 10 ? `Up to ${p.discountPercent}% Off` : `Starting ₹${p.price}`,
            image_url: p.image_url,
            full_banner_mode: false,
            _isAuto: true,
          }))
        : [];

    const displaySlides = manualSlides.length > 0 ? manualSlides : autoSlides;

    const addHeroSlide = () => {
      const nextSlides = [
        ...manualSlides,
        {
          id: `slide-${Date.now()}`,
          title: "Season Mega Offer",
          subtitle: "Curated drops for you",
          offer_text: "Under ₹499",
          image_url: "",
          bg_gradient: DARK_GRADIENTS[manualSlides.length % DARK_GRADIENTS.length],
          full_banner_mode: true,
          destination_url: `/products?category=${catParam}&maxPrice=499&sort=price_asc`,
        },
      ];
      onUpdateConfig({ slides: nextSlides });
      setActiveHeroIdx(nextSlides.length - 1);
      onSelect({ widgetId: widget.id, itemKind: "slide", itemIndex: nextSlides.length - 1 });
    };

    const updateSlide = (idx: number, patch: Record<string, any>) => {
      const base = manualSlides.length > 0 ? [...manualSlides] : displaySlides.map(({ _isAuto, ...rest }) => rest);
      base[idx] = { ...base[idx], ...patch };
      onUpdateConfig({ slides: base });
    };

    const deleteSlide = (idx: number) => {
      const next = manualSlides.filter((_, i) => i !== idx);
      onUpdateConfig({ slides: next });
      setActiveHeroIdx(Math.max(0, Math.min(activeHeroIdx, next.length - 1)));
      onSelect({ widgetId: widget.id });
    };

    const renderSlideContent = (slide: any, idx: number, mobileMode: boolean) => {
      const isSelectedSlide =
        selection?.widgetId === widget.id && selection?.itemKind === "slide" && selection?.itemIndex === idx;
      const fullArt = Boolean(slide.full_banner_mode && slide.image_url);

      return (
        <div
          key={slide.id || idx}
          onClick={(e) => {
            e.stopPropagation();
            onSelect({ widgetId: widget.id, itemKind: "slide", itemIndex: idx });
          }}
          className={`group relative overflow-hidden rounded-[20px] shadow-md transition-all cursor-pointer ${
            isSelectedSlide ? "ring-3 ring-amber-400" : "hover:ring-2 hover:ring-amber-400/70"
          } ${
            mobileMode
              ? fullArt
                ? "w-full bg-zinc-950"
                : "w-full min-h-[210px]"
              : fullArt
                ? "shrink-0 h-[250px] w-auto bg-zinc-950 flex items-center justify-center"
                : "shrink-0 w-[380px] h-[250px] flex flex-col justify-between"
          }`}
          style={{
            background: fullArt ? "#0B0D0E" : slide.bg_gradient || DARK_GRADIENTS[idx % DARK_GRADIENTS.length],
          }}
        >
          <DirectUploadOverlay
            sizeHint={fullArt ? "1200×600 (2:1) or 1:1 • ≤150KB" : "Banner Photo • ≤150KB"}
            folder="category-banners"
            alwaysVisible={!slide.image_url || isSelectedSlide}
            onUploaded={(url, summary) => {
              updateSlide(idx, { image_url: url });
              onNotify(summary);
            }}
            onError={(m) => onNotify(m, "error")}
            onDelete={manualSlides.length > 0 ? () => deleteSlide(idx) : undefined}
          />

          {fullArt ? (
            <img
              src={slide.image_url}
              alt={slide.title || "Banner"}
              className={
                mobileMode
                  ? "block w-full h-auto max-h-[380px] object-contain mx-auto"
                  : "block h-full w-auto max-w-[540px] object-contain"
              }
            />
          ) : (
            <>
              <div className="relative z-10 flex flex-1 items-center justify-between p-4 gap-3 min-h-[180px]">
                <div className="flex flex-col justify-between flex-1 min-w-0 space-y-2 text-white">
                  <span
                    className="inline-flex items-center gap-1 self-start rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase"
                    style={{ backgroundColor: tokens.accentBg, color: tokens.accentText }}
                  >
                    <Sparkles className="h-2.5 w-2.5" />
                    <InlineEditableText
                      value={cfg.campaign_badge || "FEATURED"}
                      onChange={(v) => onUpdateConfig({ campaign_badge: v })}
                      inputClassName="text-[10px] font-black uppercase w-28"
                    />
                  </span>

                  <div className="space-y-1">
                    <div className="text-lg font-black uppercase leading-tight text-white">
                      <InlineEditableText
                        value={slide.title || "Banner Headline"}
                        onChange={(v) => updateSlide(idx, { title: v })}
                        inputClassName="text-sm font-black w-full"
                      />
                    </div>
                    <div className="text-xs font-extrabold" style={{ color: tokens.accentBg }}>
                      <InlineEditableText
                        value={slide.offer_text || "Under ₹499"}
                        onChange={(v) => updateSlide(idx, { offer_text: v })}
                        inputClassName="text-xs font-black w-32"
                      />
                    </div>
                    <div className="text-[11px] text-white/80">
                      <InlineEditableText
                        value={slide.subtitle || "Tap to edit subtitle"}
                        onChange={(v) => updateSlide(idx, { subtitle: v })}
                        inputClassName="text-[11px] w-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="w-[108px] h-[132px] shrink-0 rounded-2xl overflow-hidden bg-white/10 border border-white/15 flex items-center justify-center">
                  {slide.image_url ? (
                    <StudioSmartFitImage src={slide.image_url} alt={slide.title || "Slide"} />
                  ) : (
                    <span className="text-[10px] font-bold text-white/60 text-center px-2">
                      Click Photo ↑ to upload
                    </span>
                  )}
                </div>
              </div>

              <div className="relative z-10 h-[28px] bg-white/95 px-3.5 flex items-center justify-between text-[10.5px] font-bold text-zinc-800">
                <InlineEditableText
                  value={cfg.footer_offer || "Flat ₹100 OFF on 1st Order • Code FIRST100"}
                  onChange={(v) => onUpdateConfig({ footer_offer: v })}
                  inputClassName="text-[10.5px] w-60"
                />
                <ArrowRight className="h-3 w-3 text-zinc-900 shrink-0" />
              </div>
            </>
          )}
        </div>
      );
    };

    if (isMobile) {
      const safeIdx = displaySlides.length > 0 ? activeHeroIdx % displaySlides.length : 0;
      const currentSlide = displaySlides[safeIdx];
      return (
        <section className="px-3 pt-2.5 pb-2 space-y-2">
          {currentSlide ? (
            renderSlideContent(currentSlide, safeIdx, true)
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                addHeroSlide();
              }}
              className="w-full h-[180px] rounded-2xl border-2 border-dashed border-amber-400 bg-amber-50/70 flex flex-col items-center justify-center gap-1.5 text-amber-800 cursor-pointer hover:bg-amber-100/70"
            >
              <Plus className="h-6 w-6" />
              <span className="text-xs font-black">Add Your First Hero Banner</span>
              <span className="text-[10px] font-semibold">Recommended: 1200×600 (2:1) or 1:1 • Auto ≤150KB</span>
            </button>
          )}

          {/* Slide switcher dots + Quick + Add Banner button */}
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-1.5">
              {displaySlides.map((s, idx) => (
                <button
                  key={s.id || idx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveHeroIdx(idx);
                    onSelect({ widgetId: widget.id, itemKind: "slide", itemIndex: idx });
                  }}
                  className="h-2 rounded-full transition-all cursor-pointer"
                  style={{
                    width: idx === safeIdx ? "22px" : "8px",
                    backgroundColor: idx === safeIdx ? "#111111" : "#D1D5DB",
                  }}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                addHeroSlide();
              }}
              className="inline-flex items-center gap-1 rounded-full bg-amber-400 hover:bg-amber-300 text-black px-2.5 py-1 text-[10px] font-black cursor-pointer shadow-xs"
            >
              <Plus className="h-3 w-3" /> Add Banner ({manualSlides.length})
            </button>
          </div>
        </section>
      );
    }

    return (
      <section className="px-4 pt-3.5 pb-2">
        <div className="flex items-stretch gap-3 overflow-x-auto pb-1.5">
          {displaySlides.map((slide, idx) => renderSlideContent(slide, idx, false))}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              addHeroSlide();
            }}
            className="shrink-0 w-[160px] min-h-[250px] rounded-[20px] border-2 border-dashed border-amber-400/80 bg-amber-50/50 hover:bg-amber-100/60 flex flex-col items-center justify-center gap-1.5 text-amber-800 p-3 text-center cursor-pointer transition"
          >
            <span className="h-9 w-9 rounded-full bg-amber-400 text-black flex items-center justify-center shadow">
              <Plus className="h-5 w-5" />
            </span>
            <span className="text-xs font-black">Add Banner</span>
            <span className="text-[10px] font-semibold opacity-75">Any ratio • Auto ≤150KB</span>
          </button>
        </div>
      </section>
    );
  }

  // =========================================================================
  // 2. SUBCATEGORY_NAV — Direct Subcategory Portrait Upload Right on Canvas!
  // =========================================================================
  if (widget.widget_type === "SUBCATEGORY_NAV") {
    const variant = widget.style_variant || "grid_2row_tiles";
    const items = subcategories.map((sc) => ({
      id: sc.id,
      name: sc.name,
      image_url: subcatImages[sc.id] || sc.image_url || "",
    }));

    if (items.length === 0) {
      return (
        <section className="px-4 py-3">
          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-3 text-center text-xs font-semibold text-zinc-500">
            Sub-Category Strip — No subcategories created under {categoryName} yet.
          </div>
        </section>
      );
    }

    if (variant === "portrait_1row_cards") {
      return (
        <section className="px-3 py-3">
          <div className="flex gap-2.5 overflow-x-auto pb-1">
            {items.map((item, idx) => (
              <div
                key={item.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect({ widgetId: widget.id, itemKind: "subcategory", subcategoryId: item.id });
                }}
                className={`group relative shrink-0 ${isMobile ? "w-[106px]" : "w-[144px]"} flex flex-col items-center`}
              >
                <div
                  className="relative w-full aspect-[4/4.3] rounded-[18px] overflow-hidden p-1.5 shadow-sm"
                  style={{ background: BEAUTY_GRADIENTS[idx % BEAUTY_GRADIENTS.length] }}
                >
                  <DirectUploadOverlay
                    sizeHint="400×430"
                    folder="category-subcategories"
                    compact
                    alwaysVisible={!item.image_url}
                    onUploaded={(url, summary) => onUploadSubcatImage(item.id, url, summary)}
                    onError={(m) => onNotify(m, "error")}
                  />
                  {item.image_url ? (
                    <StudioSmartFitImage src={item.image_url} alt={item.name} roundedClass="rounded-[13px]" />
                  ) : (
                    <div className="w-full h-full rounded-[13px] bg-white/25 flex items-center justify-center text-white text-[10px] font-black text-center px-1">
                      {item.name}
                    </div>
                  )}
                  <span className="absolute bottom-2 inset-x-2 z-20 rounded-full bg-white/95 text-zinc-900 text-[10px] font-extrabold text-center py-0.5 px-1.5 truncate shadow">
                    {item.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      );
    }

    return (
      <section className="px-3 py-3">
        <div className="flex flex-wrap items-start gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelect({ widgetId: widget.id, itemKind: "subcategory", subcategoryId: item.id });
              }}
              className={`group relative flex flex-col items-center gap-1.5 text-center ${
                isMobile ? "w-[74px]" : "w-[92px]"
              }`}
            >
              <div
                className="relative w-full aspect-square rounded-2xl overflow-hidden border flex items-center justify-center"
                style={{ backgroundColor: tokens.softTintBg, borderColor: tokens.borderColor }}
              >
                <DirectUploadOverlay
                  sizeHint="400×400"
                  folder="category-subcategories"
                  compact
                  alwaysVisible={!item.image_url}
                  onUploaded={(url, summary) => onUploadSubcatImage(item.id, url, summary)}
                  onError={(m) => onNotify(m, "error")}
                />
                {item.image_url ? (
                  <StudioSmartFitImage src={item.image_url} alt={item.name} />
                ) : (
                  <Sparkles className="h-5 w-5 text-zinc-400" />
                )}
              </div>
              <span className="text-[11px] font-bold text-zinc-800 leading-tight line-clamp-2 w-full">
                {item.name}
              </span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // =========================================================================
  // 3. AUDIENCE_SPLIT_3COL ("Shop for someone") — SmartFit + Inline + Add Card
  // =========================================================================
  if (widget.widget_type === "AUDIENCE_SPLIT_3COL") {
    const cards: any[] = Array.isArray(cfg.cards) ? cfg.cards : [];
    const variant = widget.style_variant || "mint_framed";
    const frameColor =
      variant === "blush_framed" ? "#F472B6" : variant === "gold_framed" ? "#D97706" : "#34D399";
    const softBg =
      variant === "blush_framed" ? "#FFF1F5" : variant === "gold_framed" ? "#FEF9E7" : "#ECFDF5";

    const updateCard = (idx: number, patch: Record<string, any>) => {
      const next = [...cards];
      next[idx] = { ...next[idx], ...patch };
      onUpdateConfig({ cards: next });
    };

    const addCard = () => {
      const next = [
        ...cards,
        {
          id: `aud-${Date.now()}`,
          title: "New Style",
          tag_filter: "trending",
          image_url: "",
          destination_url: `/products?category=${catParam}`,
        },
      ];
      onUpdateConfig({ cards: next });
      onSelect({ widgetId: widget.id, itemKind: "card", itemIndex: next.length - 1 });
    };

    return (
      <section className="px-3 md:px-4 py-3">
        <div className="mb-2.5 text-base font-black text-zinc-900">
          <InlineEditableText
            value={widget.title}
            onChange={(v) => onUpdateWidget({ title: v })}
          />
        </div>

        <div className={`grid gap-2.5 ${isMobile ? "grid-cols-3" : isTablet ? "grid-cols-4" : "grid-cols-6"}`}>
          {cards.map((card, idx) => {
            const isSel = selection?.widgetId === widget.id && selection?.itemKind === "card" && selection?.itemIndex === idx;
            const imgUrl = card.image_url || products[idx * 2]?.image_url || "";
            return (
              <div
                key={card.id || idx}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect({ widgetId: widget.id, itemKind: "card", itemIndex: idx });
                }}
                className="group flex flex-col items-center cursor-pointer"
              >
                <div
                  className={`relative w-full aspect-[4/4.3] rounded-2xl overflow-hidden border-[2.5px] shadow-xs transition ${
                    isSel ? "ring-3 ring-amber-400" : ""
                  }`}
                  style={{ borderColor: frameColor, backgroundColor: softBg }}
                >
                  <DirectUploadOverlay
                    sizeHint="400×430 • ≤150KB"
                    folder="category-cards"
                    compact={isMobile}
                    alwaysVisible={!card.image_url || isSel}
                    onUploaded={(url, summary) => {
                      updateCard(idx, { image_url: url });
                      onNotify(summary);
                    }}
                    onError={(m) => onNotify(m, "error")}
                    onDelete={() => {
                      onUpdateConfig({ cards: cards.filter((_, i) => i !== idx) });
                      onSelect({ widgetId: widget.id });
                    }}
                  />
                  {imgUrl ? (
                    <StudioSmartFitImage src={imgUrl} alt={card.title} />
                  ) : (
                    <div
                      className="w-full h-full flex flex-col items-center justify-center gap-1 p-2 text-center"
                      style={{ background: `radial-gradient(circle at 50% 35%, ${frameColor}28 0%, ${softBg} 85%)` }}
                    >
                      <Sparkles className="h-5 w-5 opacity-70" style={{ color: frameColor }} />
                      <span className="text-[9px] font-black text-zinc-600">{card.title}</span>
                    </div>
                  )}
                </div>
                <div className="mt-1.5 text-xs font-extrabold text-zinc-900 text-center">
                  <InlineEditableText
                    value={card.title}
                    onChange={(v) => updateCard(idx, { title: v })}
                    inputClassName="text-xs font-bold w-24 text-center"
                  />
                </div>
              </div>
            );
          })}

          {/* Inline + Add Card Tile */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              addCard();
            }}
            className="flex flex-col items-center cursor-pointer"
          >
            <div className="w-full aspect-[4/4.3] rounded-2xl border-2 border-dashed border-amber-400/80 bg-amber-50/50 hover:bg-amber-100/60 flex flex-col items-center justify-center gap-1 text-amber-800 p-2">
              <Plus className="h-5 w-5" />
              <span className="text-[10px] font-black">Add Card</span>
            </div>
          </button>
        </div>
      </section>
    );
  }

  // =========================================================================
  // 4. BUDGET_DISCOUNT_TILES — Interactive Price & Discount Ticket Builder
  // =========================================================================
  if (widget.widget_type === "BUDGET_DISCOUNT_TILES") {
    const variant = widget.style_variant || "ticket_3col";
    const priceSlabs: number[] =
      Array.isArray(cfg.price_slabs) && cfg.price_slabs.length > 0 ? cfg.price_slabs.map(Number) : [299, 499, 799];
    const discountSlabs: number[] =
      Array.isArray(cfg.discount_slabs) && cfg.discount_slabs.length > 0 ? cfg.discount_slabs.map(Number) : [30, 50, 70];

    const countUnder = (p: number) => products.filter((x) => x.price > 0 && x.price <= p).length;
    const countDisc = (d: number) => products.filter((x) => x.discountPercent >= d).length;

    const handleAddPrice = () => {
      const n = parseInt(newPriceVal.trim(), 10);
      if (n > 0) {
        onUpdateConfig({ price_slabs: Array.from(new Set([...priceSlabs, n])).sort((a, b) => a - b) });
      }
      setNewPriceVal("");
      setAddingPrice(false);
    };

    const handleAddDisc = () => {
      const n = parseInt(newDiscVal.trim(), 10);
      if (n > 0 && n <= 95) {
        onUpdateConfig({ discount_slabs: Array.from(new Set([...discountSlabs, n])).sort((a, b) => a - b) });
      }
      setNewDiscVal("");
      setAddingDisc(false);
    };

    const isNeon = variant === "neon_grid_3x2";

    return (
      <section className="px-3 md:px-4 py-4">
        <div className={isNeon ? "mb-3" : "text-center mb-3.5"}>
          <div className="text-lg font-black text-zinc-950">
            <InlineEditableText value={widget.title} onChange={(v) => onUpdateWidget({ title: v })} />
          </div>
          <div className="mt-0.5">
            <span
              className="inline-block rounded-full px-3 py-0.5 text-[11px] font-black"
              style={{ backgroundColor: tokens.accentBg, color: tokens.accentText }}
            >
              <InlineEditableText
                value={widget.subtitle || "Best fits at best prices!"}
                onChange={(v) => onUpdateWidget({ subtitle: v })}
                inputClassName="text-[11px] w-44"
              />
            </span>
          </div>
        </div>

        {/* Price Tickets Row */}
        <div className={`grid gap-2.5 ${isMobile ? "grid-cols-3" : "grid-cols-4"} max-w-4xl mx-auto`}>
          {priceSlabs.map((price) => {
            const cnt = countUnder(price);
            return (
              <div
                key={`p-${price}`}
                className={`group relative rounded-2xl p-3 text-center overflow-hidden ${
                  isNeon
                    ? "bg-[#161B1A] text-emerald-400 border border-emerald-500/30"
                    : "border-2 border-dashed border-zinc-900"
                }`}
                style={!isNeon ? { backgroundColor: tokens.accentBg, color: tokens.accentText } : undefined}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateConfig({ price_slabs: priceSlabs.filter((x) => x !== price) });
                  }}
                  className="opacity-0 group-hover:opacity-100 absolute top-1 right-1 rounded-full bg-red-600 text-white p-1 cursor-pointer transition"
                  title="Remove price card"
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </button>
                <p className="text-[10px] font-black uppercase opacity-80">UNDER</p>
                <p className="text-xl font-black tracking-tight mt-0.5">₹{price}</p>
                <p className="text-[9.5px] font-bold opacity-80 mt-0.5">
                  {cnt > 0 ? `${cnt} live picks` : "Auto-closest"}
                </p>
              </div>
            );
          })}

          {/* Inline + Add Price Tile */}
          {addingPrice ? (
            <div
              onClick={(e) => e.stopPropagation()}
              className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-2 flex flex-col items-center justify-center gap-1.5"
            >
              <input
                type="number"
                autoFocus
                value={newPriceVal}
                onChange={(e) => setNewPriceVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddPrice()}
                placeholder="₹ 399"
                className="w-full rounded-lg border border-zinc-300 bg-white px-2 py-1 text-xs font-black text-center text-zinc-900"
              />
              <button
                type="button"
                onClick={handleAddPrice}
                className="w-full rounded-lg bg-zinc-950 text-white py-1 text-[10px] font-black cursor-pointer"
              >
                Add ₹
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setAddingPrice(true);
              }}
              className="rounded-2xl border-2 border-dashed border-amber-400/80 bg-amber-50/50 hover:bg-amber-100/60 p-3 flex flex-col items-center justify-center gap-1 text-amber-800 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span className="text-[10px] font-black">Add ₹ Price</span>
            </button>
          )}
        </div>

        {/* Discount Pills Row */}
        <div className={`grid gap-2 mt-2.5 ${isMobile ? "grid-cols-3" : "grid-cols-4"} max-w-4xl mx-auto`}>
          {discountSlabs.map((disc) => (
            <div
              key={`d-${disc}`}
              className="group relative rounded-xl bg-zinc-950 text-white py-2 px-2.5 flex items-center justify-between text-xs font-black"
            >
              <div>
                <span>Min. {disc}% Off</span>
                <span className="block text-[9px] text-emerald-300 font-bold">{countDisc(disc)} items</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateConfig({ discount_slabs: discountSlabs.filter((x) => x !== disc) });
                }}
                className="opacity-0 group-hover:opacity-100 rounded-md bg-red-600 p-1 text-white cursor-pointer"
              >
                <Trash2 className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}

          {addingDisc ? (
            <div
              onClick={(e) => e.stopPropagation()}
              className="rounded-xl border-2 border-emerald-400 bg-emerald-50 p-1.5 flex items-center gap-1"
            >
              <input
                type="number"
                autoFocus
                value={newDiscVal}
                onChange={(e) => setNewDiscVal(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddDisc()}
                placeholder="40%"
                className="w-full rounded bg-white border border-zinc-300 px-1.5 py-0.5 text-xs font-black text-zinc-900"
              />
              <button
                type="button"
                onClick={handleAddDisc}
                className="rounded bg-emerald-600 text-white px-2 py-1 text-[10px] font-black cursor-pointer"
              >
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setAddingDisc(true);
              }}
              className="rounded-xl border-2 border-dashed border-emerald-400/80 bg-emerald-50/40 hover:bg-emerald-100/50 py-2 px-2 flex items-center justify-center gap-1 text-emerald-800 text-[10px] font-black cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Add % Off
            </button>
          )}
        </div>
      </section>
    );
  }

  // =========================================================================
  // 5. THEMED_DEAL_RAIL — Neon Lime / Noir Black / Pastel Edit / Clean White
  // =========================================================================
  if (widget.widget_type === "THEMED_DEAL_RAIL") {
    const variant = widget.style_variant || "clean_white";
    const manualCards: any[] = Array.isArray(cfg.cards) ? cfg.cards : [];
    const cards =
      manualCards.length > 0
        ? manualCards
        : products.slice(0, Number(cfg.max_items || 6)).map((p) => ({
            id: `ap-${p.id}`,
            title: p.brand !== "Zebalpha" ? p.brand : p.name,
            offer_pill: p.discountPercent >= 15 ? `Min. ${p.discountPercent}% Off` : `₹${p.price}`,
            image_url: p.image_url,
            _isAuto: true,
          }));

    const isLime = variant === "neon_lime_box";
    const isBlack = variant === "noir_black_box";
    const isPastel = variant === "pastel_seasonal_edit";

    const boxBg = isLime ? tokens.accentBg : isBlack ? tokens.secondaryBoxBg : isPastel ? tokens.softTintBg : "#FFFFFF";
    const boxText = isLime ? tokens.accentText : isBlack ? tokens.secondaryBoxText : "#111111";
    const pillBg = isLime ? "#111111" : isBlack ? tokens.accentBg : tokens.pillBg;
    const pillText = isLime ? "#FFFFFF" : isBlack ? tokens.accentText : tokens.pillText;

    const addDealCard = () => {
      const next = [
        ...manualCards,
        {
          id: `deal-${Date.now()}`,
          title: "Special Offer",
          offer_pill: "Under ₹499",
          image_url: "",
          destination_url: `/products?category=${catParam}&maxPrice=499&sort=price_asc`,
        },
      ];
      onUpdateConfig({ cards: next });
      onSelect({ widgetId: widget.id, itemKind: "card", itemIndex: next.length - 1 });
    };

    const updateDealCard = (idx: number, patch: Record<string, any>) => {
      const base = manualCards.length > 0 ? [...manualCards] : cards.map(({ _isAuto, ...rest }) => rest);
      base[idx] = { ...base[idx], ...patch };
      onUpdateConfig({ cards: base });
    };

    return (
      <section className="px-3 md:px-4 py-2.5">
        <div
          className={`rounded-[22px] p-3.5 ${isPastel || isLime || isBlack ? "shadow-sm" : "border border-zinc-200"}`}
          style={{ backgroundColor: boxBg, color: boxText }}
        >
          <div className="flex items-start justify-between gap-2 mb-3">
            <div>
              <div className="text-base font-black leading-tight">
                <InlineEditableText value={widget.title} onChange={(v) => onUpdateWidget({ title: v })} />
              </div>
              <div className="text-[11px] font-bold opacity-75">
                <InlineEditableText
                  value={widget.subtitle || "Top curated offers"}
                  onChange={(v) => onUpdateWidget({ subtitle: v })}
                  inputClassName="text-[11px] w-48"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                addDealCard();
              }}
              className="shrink-0 inline-flex items-center gap-1 rounded-full bg-amber-400 text-black px-2.5 py-1 text-[10px] font-black cursor-pointer"
            >
              <Plus className="h-3 w-3" /> Add Card
            </button>
          </div>

          <div className="flex gap-2.5 overflow-x-auto pb-1">
            {cards.map((card, idx) => (
              <div
                key={card.id || idx}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect({ widgetId: widget.id, itemKind: "card", itemIndex: idx });
                }}
                className={`group shrink-0 ${isMobile ? "w-[126px]" : "w-[158px]"} flex flex-col cursor-pointer`}
              >
                <div className="relative aspect-[4/4.6] w-full rounded-2xl overflow-hidden bg-white shadow-xs">
                  <DirectUploadOverlay
                    sizeHint="400×460 • ≤150KB"
                    folder="category-deals"
                    compact
                    alwaysVisible={!card.image_url}
                    onUploaded={(url, summary) => {
                      updateDealCard(idx, { image_url: url });
                      onNotify(summary);
                    }}
                    onError={(m) => onNotify(m, "error")}
                    onDelete={
                      manualCards.length > 0
                        ? () => onUpdateConfig({ cards: manualCards.filter((_, i) => i !== idx) })
                        : undefined
                    }
                  />
                  {card.image_url ? (
                    <StudioSmartFitImage src={card.image_url} alt={card.title} />
                  ) : (
                    <div className="w-full h-full bg-zinc-100 flex items-center justify-center text-[10px] font-bold text-zinc-400">
                      Upload Photo
                    </div>
                  )}
                  <div
                    className="absolute bottom-1.5 inset-x-1.5 z-20 rounded-lg py-0.5 px-1.5 text-center text-[10px] font-black shadow"
                    style={{ backgroundColor: pillBg, color: pillText }}
                  >
                    <InlineEditableText
                      value={card.offer_pill || "Hot Deal"}
                      onChange={(v) => updateDealCard(idx, { offer_pill: v })}
                      inputClassName="text-[10px] w-24 text-center"
                    />
                  </div>
                </div>
                <div className="mt-1 text-[11px] font-bold truncate px-0.5">
                  <InlineEditableText
                    value={card.title}
                    onChange={(v) => updateDealCard(idx, { title: v })}
                    inputClassName="text-[11px] w-28"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // =========================================================================
  // 6. TREND_LOOKBOOK ("trendy")
  // =========================================================================
  if (widget.widget_type === "TREND_LOOKBOOK") {
    const manualItems: any[] = Array.isArray(cfg.items) ? cfg.items : [];
    const items =
      manualItems.length > 0
        ? manualItems
        : products.slice(0, 4).map((p) => ({
            id: `tr-${p.id}`,
            title: p.name.split(" ").slice(0, 2).join(" "),
            offer: p.discountPercent >= 20 ? `Min. ${p.discountPercent}% Off` : `Under ₹${Math.ceil(p.price / 50) * 50}`,
            image_url: p.image_url,
            _isAuto: true,
          }));

    const updateItem = (idx: number, patch: Record<string, any>) => {
      const base = manualItems.length > 0 ? [...manualItems] : items.map(({ _isAuto, ...rest }) => rest);
      base[idx] = { ...base[idx], ...patch };
      onUpdateConfig({ items: base });
    };

    const addItem = () => {
      const next = [
        ...manualItems,
        { title: "Street Drop", offer: "Under ₹499", image_url: "", destination_url: `/products?category=${catParam}` },
      ];
      onUpdateConfig({ items: next });
      onSelect({ widgetId: widget.id, itemKind: "card", itemIndex: next.length - 1 });
    };

    return (
      <section className="px-3 md:px-4 py-3 space-y-2.5">
        <div className="text-center">
          <div className="inline-flex items-center gap-1 text-lg font-black text-zinc-950">
            <InlineEditableText
              value={cfg.badge_brand || "trendy"}
              onChange={(v) => onUpdateConfig({ badge_brand: v })}
              inputClassName="text-base font-black w-28 text-center"
            />
            <Flame className="h-4 w-4 text-orange-500 fill-orange-500" />
          </div>
          <div>
            <span
              className="inline-block rounded-full px-3.5 py-0.5 text-[10px] font-black uppercase"
              style={{ backgroundColor: tokens.accentBg, color: tokens.accentText }}
            >
              <InlineEditableText value={widget.title} onChange={(v) => onUpdateWidget({ title: v })} />
            </span>
          </div>
        </div>

        <div className={`grid gap-2.5 ${isMobile ? "grid-cols-2" : isTablet ? "grid-cols-4" : "grid-cols-5"}`}>
          {items.map((it, idx) => (
            <div
              key={it.id || idx}
              onClick={(e) => {
                e.stopPropagation();
                onSelect({ widgetId: widget.id, itemKind: "card", itemIndex: idx });
              }}
              className="group relative aspect-[4/5] rounded-[18px] overflow-hidden bg-zinc-950 shadow-sm cursor-pointer"
            >
              <DirectUploadOverlay
                sizeHint="400×500 • ≤150KB"
                folder="category-lookbook"
                compact
                alwaysVisible={!it.image_url}
                onUploaded={(url, summary) => {
                  updateItem(idx, { image_url: url });
                  onNotify(summary);
                }}
                onError={(m) => onNotify(m, "error")}
                onDelete={
                  manualItems.length > 0
                    ? () => onUpdateConfig({ items: manualItems.filter((_, i) => i !== idx) })
                    : undefined
                }
              />
              {it.image_url && <StudioSmartFitImage src={it.image_url} alt={it.title} />}
              <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
              <div className="absolute bottom-2 inset-x-2 z-20 text-center space-y-1">
                <div className="text-xs font-black uppercase text-white">
                  <InlineEditableText
                    value={it.title}
                    onChange={(v) => updateItem(idx, { title: v })}
                    inputClassName="text-xs w-28 text-center"
                  />
                </div>
                <span
                  className="inline-block rounded-md px-2 py-0.5 text-[10px] font-black"
                  style={{ backgroundColor: tokens.accentBg, color: tokens.accentText }}
                >
                  <InlineEditableText
                    value={it.offer || "Explore"}
                    onChange={(v) => updateItem(idx, { offer: v })}
                    inputClassName="text-[10px] w-24 text-center"
                  />
                </span>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              addItem();
            }}
            className="aspect-[4/5] rounded-[18px] border-2 border-dashed border-amber-400/80 bg-amber-50/50 hover:bg-amber-100/60 flex flex-col items-center justify-center gap-1 text-amber-800 cursor-pointer"
          >
            <Plus className="h-5 w-5" />
            <span className="text-[10px] font-black">Add Look</span>
          </button>
        </div>
      </section>
    );
  }

  // =========================================================================
  // 7. OCCASION_2COL
  // =========================================================================
  if (widget.widget_type === "OCCASION_2COL") {
    const cards: any[] = Array.isArray(cfg.cards) ? cfg.cards : [];
    const updateCard = (idx: number, patch: Record<string, any>) => {
      const next = [...cards];
      next[idx] = { ...next[idx], ...patch };
      onUpdateConfig({ cards: next });
    };

    return (
      <section className="px-3 md:px-4 py-3">
        <div className="text-center mb-3">
          <div className="text-lg font-black text-zinc-950">
            <InlineEditableText value={widget.title} onChange={(v) => onUpdateWidget({ title: v })} />
          </div>
          {widget.subtitle && (
            <span
              className="inline-block mt-0.5 rounded-full px-3 py-0.5 text-[10px] font-extrabold"
              style={{ backgroundColor: tokens.accentBg, color: tokens.accentText }}
            >
              <InlineEditableText value={widget.subtitle} onChange={(v) => onUpdateWidget({ subtitle: v })} />
            </span>
          )}
        </div>

        <div className={`grid gap-2.5 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`}>
          {cards.map((card, idx) => (
            <div
              key={card.id || idx}
              onClick={(e) => {
                e.stopPropagation();
                onSelect({ widgetId: widget.id, itemKind: "card", itemIndex: idx });
              }}
              className="group relative aspect-[4/4.5] rounded-2xl overflow-hidden bg-zinc-900 shadow-sm cursor-pointer"
            >
              <DirectUploadOverlay
                sizeHint="400×450 • ≤150KB"
                folder="category-occasions"
                compact
                alwaysVisible={!card.image_url}
                onUploaded={(url, summary) => {
                  updateCard(idx, { image_url: url });
                  onNotify(summary);
                }}
                onError={(m) => onNotify(m, "error")}
                onDelete={() => onUpdateConfig({ cards: cards.filter((_, i) => i !== idx) })}
              />
              {card.image_url ? (
                <StudioSmartFitImage src={card.image_url} alt={card.title} />
              ) : (
                <div className="w-full h-full flex items-center justify-center pb-6">
                  <Sparkles className="h-7 w-7 opacity-40" style={{ color: tokens.accentBg }} />
                </div>
              )}
              <div
                className="absolute bottom-2.5 inset-x-2.5 z-20 rounded-lg py-1 px-2 text-center text-xs font-black uppercase shadow"
                style={{ backgroundColor: tokens.accentBg, color: tokens.accentText }}
              >
                <InlineEditableText
                  value={card.title}
                  onChange={(v) => updateCard(idx, { title: v })}
                  inputClassName="text-xs w-28 text-center"
                />
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUpdateConfig({
                cards: [
                  ...cards,
                  { id: `occ-${Date.now()}`, title: "Party Night", tag_filter: "party", image_url: "" },
                ],
              });
            }}
            className="aspect-[4/4.5] rounded-2xl border-2 border-dashed border-amber-400/80 bg-amber-50/50 hover:bg-amber-100/60 flex flex-col items-center justify-center gap-1 text-amber-800 cursor-pointer"
          >
            <Plus className="h-5 w-5" />
            <span className="text-[10px] font-black">Add Occasion</span>
          </button>
        </div>
      </section>
    );
  }

  // =========================================================================
  // 8. FULL_SPOTLIGHT_BANNER
  // =========================================================================
  if (widget.widget_type === "FULL_SPOTLIGHT_BANNER") {
    const isLuxe = widget.style_variant === "luxe_noir_gold";
    const bannerImg = cfg.banner_image_url || products[0]?.image_url || "";
    return (
      <section className="px-3 md:px-4 py-3">
        <div
          className="group relative rounded-[22px] overflow-hidden shadow-md p-5"
          style={{
            background: isLuxe
              ? "linear-gradient(125deg, #0b0907 0%, #3a2711 50%, #120d08 100%)"
              : "linear-gradient(125deg, #111315 0%, #23272b 55%, #0c0e10 100%)",
          }}
        >
          <DirectUploadOverlay
            sizeHint="1200×420 • ≤150KB"
            folder="category-spotlight"
            alwaysVisible={!cfg.banner_image_url}
            onUploaded={(url, summary) => {
              onUpdateConfig({ banner_image_url: url });
              onNotify(summary);
            }}
            onError={(m) => onNotify(m, "error")}
          />
          <div className={`relative z-10 flex ${isMobile ? "flex-col text-center" : "flex-row text-left"} items-center justify-between gap-4`}>
            <div className="space-y-1.5">
              <div className="text-xl font-black" style={{ color: isLuxe ? "#FDE68A" : "#FFFFFF" }}>
                <InlineEditableText value={widget.title} onChange={(v) => onUpdateWidget({ title: v })} />
              </div>
              <div className="text-xs text-white/80">
                <InlineEditableText
                  value={widget.subtitle || "Explore top curated brands"}
                  onChange={(v) => onUpdateWidget({ subtitle: v })}
                />
              </div>
              <span
                className="inline-flex items-center gap-1.5 mt-1 rounded-full px-4 py-1.5 text-xs font-black"
                style={{
                  backgroundColor: isLuxe ? "#FDE68A" : tokens.accentBg,
                  color: isLuxe ? "#140E05" : tokens.accentText,
                }}
              >
                <InlineEditableText
                  value={cfg.cta_label || "Explore now"}
                  onChange={(v) => onUpdateConfig({ cta_label: v })}
                  inputClassName="text-xs w-28"
                />
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>

            {bannerImg && (
              <div className="w-28 h-28 rounded-2xl overflow-hidden border border-white/20 shrink-0">
                <StudioSmartFitImage src={bannerImg} alt={widget.title} />
              </div>
            )}
          </div>
        </div>
      </section>
    );
  }

  // =========================================================================
  // 9. EXPLORE_STORES_3X3 — Micro-Stores with Direct Photo Upload + Add Store
  // =========================================================================
  if (widget.widget_type === "EXPLORE_STORES_3X3") {
    const stores: any[] = Array.isArray(cfg.stores) ? cfg.stores : [];
    const frameBg = widget.style_variant === "blush_frame_arrow" ? "#4A0E2E" : "#111214";

    const updateStore = (idx: number, patch: Record<string, any>) => {
      const next = [...stores];
      next[idx] = { ...next[idx], ...patch };
      onUpdateConfig({ stores: next });
    };

    return (
      <section className="px-3 md:px-4 py-3">
        <div className="text-center mb-3">
          <div className="text-lg font-black text-zinc-950">
            <InlineEditableText value={widget.title} onChange={(v) => onUpdateWidget({ title: v })} />
          </div>
          {widget.subtitle && (
            <div className="text-xs text-zinc-500 font-semibold">
              <InlineEditableText value={widget.subtitle} onChange={(v) => onUpdateWidget({ subtitle: v })} />
            </div>
          )}
        </div>

        <div className={`grid gap-2.5 ${isMobile ? "grid-cols-3" : isTablet ? "grid-cols-4" : "grid-cols-6"}`}>
          {stores.map((st, idx) => {
            const imgUrl = st.image_url || products[idx]?.image_url || "";
            return (
              <div
                key={st.id || idx}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect({ widgetId: widget.id, itemKind: "store", itemIndex: idx });
                }}
                className="group relative rounded-2xl overflow-hidden p-2 flex flex-col justify-between aspect-[4/4.4] shadow-sm cursor-pointer"
                style={{ backgroundColor: frameBg }}
              >
                <DirectUploadOverlay
                  sizeHint="400×440"
                  folder="category-stores"
                  compact
                  alwaysVisible={!st.image_url}
                  onUploaded={(url, summary) => {
                    updateStore(idx, { image_url: url });
                    onNotify(summary);
                  }}
                  onError={(m) => onNotify(m, "error")}
                  onDelete={() => onUpdateConfig({ stores: stores.filter((_, i) => i !== idx) })}
                />
                <div className="relative z-10 text-[10px] font-black uppercase leading-tight text-white pr-1">
                  <InlineEditableText
                    value={st.title}
                    onChange={(v) => updateStore(idx, { title: v })}
                    inputClassName="text-[10px] w-20"
                  />
                </div>
                <div className="relative mt-1.5 flex-1 w-full rounded-xl overflow-hidden bg-white/10">
                  {imgUrl ? (
                    <StudioSmartFitImage src={imgUrl} alt={st.title} />
                  ) : (
                    <div
                      className="w-full h-full flex flex-col items-center justify-center gap-0.5"
                      style={{
                        background: `radial-gradient(circle at 30% 25%, ${tokens.accentBg}30 0%, rgba(255,255,255,0.04) 75%)`,
                      }}
                    >
                      <Sparkles className="h-4 w-4 opacity-75" style={{ color: tokens.accentBg }} />
                      <span className="text-[8px] font-extrabold uppercase text-white/60">Shop Edit</span>
                    </div>
                  )}
                  <span className="absolute bottom-1 right-1 z-20 h-5 w-5 rounded-full bg-white text-zinc-950 flex items-center justify-center shadow">
                    <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onUpdateConfig({
                stores: [
                  ...stores,
                  { id: `st-${Date.now()}`, title: "NEW STORE", tag_filter: "new", image_url: "" },
                ],
              });
            }}
            className="aspect-[4/4.4] rounded-2xl border-2 border-dashed border-amber-400/80 bg-amber-50/50 hover:bg-amber-100/60 flex flex-col items-center justify-center gap-1 text-amber-800 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span className="text-[10px] font-black">Add Store</span>
          </button>
        </div>
      </section>
    );
  }

  // =========================================================================
  // 10. COMBO_KITS_MARQUEE
  // =========================================================================
  if (widget.widget_type === "COMBO_KITS_MARQUEE") {
    const manualKits: any[] = Array.isArray(cfg.kits) ? cfg.kits : [];
    const kits =
      manualKits.length > 0
        ? manualKits
        : products.slice(0, 3).map((p) => ({
            id: `kit-${p.id}`,
            title: p.name,
            offer_pill: p.discountPercent >= 15 ? `Up to ${p.discountPercent}% Off` : `₹${p.price}`,
            image_url: p.image_url,
            _isAuto: true,
          }));

    const updateKit = (idx: number, patch: Record<string, any>) => {
      const base = manualKits.length > 0 ? [...manualKits] : kits.map(({ _isAuto, ...rest }) => rest);
      base[idx] = { ...base[idx], ...patch };
      onUpdateConfig({ kits: base });
    };

    return (
      <section className="px-3 md:px-4 py-3">
        <div
          className="relative rounded-[24px] overflow-hidden pt-4 pb-12 px-3.5 shadow-md"
          style={{ backgroundColor: tokens.secondaryBoxBg, color: tokens.secondaryBoxText }}
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <div className="text-base font-black">
                <InlineEditableText value={widget.title} onChange={(v) => onUpdateWidget({ title: v })} />
              </div>
              {widget.subtitle && (
                <div className="text-[11px] opacity-75">
                  <InlineEditableText value={widget.subtitle} onChange={(v) => onUpdateWidget({ subtitle: v })} />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateConfig({
                  kits: [
                    ...manualKits,
                    { id: `kit-${Date.now()}`, title: "Value Combo", offer_pill: "Save 40%", image_url: "" },
                  ],
                });
              }}
              className="rounded-full bg-amber-400 text-black px-2.5 py-1 text-[10px] font-black cursor-pointer inline-flex items-center gap-1"
            >
              <Plus className="h-3 w-3" /> Add Combo
            </button>
          </div>

          <div className={`grid gap-2.5 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`}>
            {kits.map((kit, idx) => (
              <div
                key={kit.id || idx}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect({ widgetId: widget.id, itemKind: "kit", itemIndex: idx });
                }}
                className="group flex flex-col items-center text-center cursor-pointer"
              >
                <div className="relative w-full aspect-[4/4.3] rounded-2xl overflow-hidden bg-white p-1 shadow">
                  <DirectUploadOverlay
                    sizeHint="400×430"
                    folder="category-combos"
                    compact
                    alwaysVisible={!kit.image_url}
                    onUploaded={(url, summary) => {
                      updateKit(idx, { image_url: url });
                      onNotify(summary);
                    }}
                    onError={(m) => onNotify(m, "error")}
                    onDelete={
                      manualKits.length > 0
                        ? () => onUpdateConfig({ kits: manualKits.filter((_, i) => i !== idx) })
                        : undefined
                    }
                  />
                  {kit.image_url ? (
                    <StudioSmartFitImage src={kit.image_url} alt={kit.title} roundedClass="rounded-xl" />
                  ) : (
                    <div className="w-full h-full rounded-xl bg-zinc-100 flex items-center justify-center text-[10px] text-zinc-400">
                      Upload
                    </div>
                  )}
                </div>
                <div className="mt-1.5 text-xs font-black text-white">
                  <InlineEditableText
                    value={kit.offer_pill}
                    onChange={(v) => updateKit(idx, { offer_pill: v })}
                    inputClassName="text-xs w-24 text-center"
                  />
                </div>
                <div className="text-[10.5px] text-white/75 truncate w-full">
                  <InlineEditableText
                    value={kit.title}
                    onChange={(v) => updateKit(idx, { title: v })}
                    inputClassName="text-[10.5px] w-28 text-center"
                  />
                </div>
              </div>
            ))}
          </div>

          <div
            className="pointer-events-none absolute -bottom-1 -inset-x-6 -rotate-1 py-1 overflow-hidden whitespace-nowrap"
            style={{ backgroundColor: tokens.marqueeBg, color: tokens.marqueeText }}
          >
            <div className="text-[10px] font-black uppercase tracking-[0.2em]">
              {(cfg.marquee_text || "ZEBALPHA SPECIALS • VALUE COMBOS • UP TO 80% OFF • ").repeat(4)}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // =========================================================================
  // 11. BRAND_SPOTLIGHT_GRID & CURATED_SHELF
  // =========================================================================
  if (widget.widget_type === "BRAND_SPOTLIGHT_GRID" || widget.widget_type === "CURATED_SHELF") {
    const manualBrands: any[] = Array.isArray(cfg.brands) ? cfg.brands : [];
    const list =
      manualBrands.length > 0
        ? manualBrands
        : brands.slice(0, Number(cfg.max_items || 6)).map((b) => ({
            id: `ab-${b.brand_name}`,
            brand_name: b.brand_name,
            offer_text: b.max_discount >= 15 ? `Up to ${b.max_discount}% Off` : `From ₹${b.min_price}`,
            product_image_url: b.primary_image,
          }));

    return (
      <section className="px-3 md:px-4 py-3">
        <div className="mb-2.5 flex items-center justify-between">
          <div>
            <div className="text-base font-black text-zinc-950">
              <InlineEditableText value={widget.title} onChange={(v) => onUpdateWidget({ title: v })} />
            </div>
            {widget.subtitle && (
              <div className="text-[11px] text-zinc-500 font-semibold">
                <InlineEditableText value={widget.subtitle} onChange={(v) => onUpdateWidget({ subtitle: v })} />
              </div>
            )}
          </div>
          {widget.widget_type === "BRAND_SPOTLIGHT_GRID" && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onUpdateConfig({
                  brands: [
                    ...manualBrands,
                    { id: `br-${Date.now()}`, brand_name: "Featured Brand", offer_text: "Up to 50% Off", product_image_url: "" },
                  ],
                });
              }}
              className="rounded-full bg-amber-400 text-black px-2.5 py-1 text-[10px] font-black cursor-pointer inline-flex items-center gap-1"
            >
              <Plus className="h-3 w-3" /> Add Brand
            </button>
          )}
        </div>

        <div className={`grid gap-2.5 ${isMobile ? "grid-cols-3" : "grid-cols-5"}`}>
          {list.map((b, idx) => (
            <div
              key={b.id || idx}
              onClick={(e) => {
                e.stopPropagation();
                onSelect({ widgetId: widget.id, itemKind: "brand", itemIndex: idx });
              }}
              className="group relative bg-white rounded-2xl border border-zinc-200 overflow-hidden flex flex-col justify-between pt-3 cursor-pointer"
            >
              {widget.widget_type === "BRAND_SPOTLIGHT_GRID" && (
                <DirectUploadOverlay
                  sizeHint="300×300"
                  folder="category-brands"
                  compact
                  alwaysVisible={!b.product_image_url}
                  onUploaded={(url, summary) => {
                    const base = manualBrands.length > 0 ? [...manualBrands] : [...list];
                    base[idx] = { ...base[idx], product_image_url: url };
                    onUpdateConfig({ brands: base });
                    onNotify(summary);
                  }}
                  onError={(m) => onNotify(m, "error")}
                  onDelete={
                    manualBrands.length > 0
                      ? () => onUpdateConfig({ brands: manualBrands.filter((_, i) => i !== idx) })
                      : undefined
                  }
                />
              )}
              <div className="px-2 pb-2 flex flex-col items-center text-center gap-1">
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-50 border border-zinc-100">
                  {b.product_image_url && <StudioSmartFitImage src={b.product_image_url} alt={b.brand_name} />}
                </div>
                <span className="text-[10.5px] font-black uppercase text-zinc-900 truncate w-full">{b.brand_name}</span>
              </div>
              <div
                className="w-full py-1 px-1 text-center text-[10px] font-black border-t-2"
                style={{ backgroundColor: "#111111", color: "#FFFFFF", borderTopColor: tokens.accentBg }}
              >
                {b.offer_text}
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // =========================================================================
  // 12. OFFER_PAYMENT_STRIP
  // =========================================================================
  if (widget.widget_type === "OFFER_PAYMENT_STRIP") {
    return (
      <section className="px-3 md:px-4 py-2.5">
        <div className={`grid gap-2.5 ${isMobile ? "grid-cols-1" : "grid-cols-2"}`}>
          <div className="flex items-center justify-between gap-2.5 rounded-2xl bg-[#ECFDF5] border border-emerald-200 px-3.5 py-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <ShieldCheck className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="text-xs font-black text-zinc-950">
                  <InlineEditableText
                    value={cfg.left_title || "Flat ₹100 OFF on 1st Order"}
                    onChange={(v) => onUpdateConfig({ left_title: v })}
                  />
                </div>
                <div className="text-[10.5px] font-semibold text-zinc-600">
                  <InlineEditableText
                    value={cfg.left_subtitle || "Use code FIRST100 on orders ₹399+"}
                    onChange={(v) => onUpdateConfig({ left_subtitle: v })}
                  />
                </div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-zinc-600 shrink-0" />
          </div>

          <div className="flex items-center justify-between gap-2.5 rounded-2xl bg-[#EFF6FF] border border-blue-200 px-3.5 py-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                <Truck className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="text-xs font-black text-zinc-950">
                  <InlineEditableText
                    value={cfg.right_title || "Free Delivery & Easy Exchange"}
                    onChange={(v) => onUpdateConfig({ right_title: v })}
                  />
                </div>
                <div className="text-[10.5px] font-semibold text-zinc-600">
                  <InlineEditableText
                    value={cfg.right_subtitle || "COD & UPI ready • Free shipping above ₹499"}
                    onChange={(v) => onUpdateConfig({ right_subtitle: v })}
                  />
                </div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-zinc-600 shrink-0" />
          </div>
        </div>
      </section>
    );
  }

  // =========================================================================
  // 13. INFINITE_PRODUCT_FEED — Live Real Category Products Preview
  // =========================================================================
  return (
    <section className="px-3 md:px-4 pt-3 pb-6">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-200">
        <div>
          <div className="text-base font-black text-zinc-950">
            <InlineEditableText
              value={widget.title || `All ${categoryName}`}
              onChange={(v) => onUpdateWidget({ title: v })}
            />
          </div>
          <p className="text-[11px] text-zinc-500 font-medium">
            {products.length} live products in {categoryName} (auto-synced from Supabase)
          </p>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-xs font-bold text-zinc-500">
          No live products in {categoryName} yet — products added by sellers appear here automatically.
        </div>
      ) : (
        <div className={`grid gap-2.5 ${isMobile ? "grid-cols-2" : isTablet ? "grid-cols-3" : "grid-cols-5"}`}>
          {products.slice(0, isMobile ? 4 : 10).map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-zinc-200 overflow-hidden flex flex-col"
            >
              <div className="relative aspect-[4/5] w-full bg-zinc-50 overflow-hidden">
                {p.image_url && (
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover object-top" />
                )}
                {p.rating > 0 && (
                  <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-0.5 rounded bg-white/95 px-1.5 py-0.5 text-[9.5px] font-extrabold text-zinc-900 shadow">
                    {p.rating.toFixed(1)}
                    <Star className="h-2.5 w-2.5 fill-emerald-600 text-emerald-600" />
                  </span>
                )}
              </div>
              <div className="p-2">
                <p className="text-[10px] font-black uppercase text-zinc-900 truncate">{p.brand}</p>
                <p className="text-[11px] text-zinc-600 truncate">{p.name}</p>
                <div className="flex items-baseline gap-1 mt-0.5">
                  {p.discountPercent > 0 && (
                    <span className="inline-flex items-center text-[10px] font-black text-emerald-700">
                      <ArrowDown className="h-2.5 w-2.5" />
                      {p.discountPercent}%
                    </span>
                  )}
                  <span className="text-xs font-black text-zinc-950">₹{p.price}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
