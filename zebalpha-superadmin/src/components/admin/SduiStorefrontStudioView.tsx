"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Smartphone,
  Globe,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Layers,
  ShieldCheck,
  Sparkles,
  Plus,
  Trash2,
  ExternalLink,
  RotateCcw,
  Clock,
} from "lucide-react";
import PromotionsStudioView from "./PromotionsStudioView";

export interface SduiTrustBadgeItem {
  icon: string;
  title: string;
  subtitle: string;
}

export interface SduiMarqueeItem {
  icon: string;
  text: string;
}

export interface SduiWidgetConfig {
  id: string;
  widget_type: string;
  title: string;
  subtitle?: string;
  enabled: boolean;
  web_enabled: boolean;
  app_enabled: boolean;
  display_order: number;
  config?: Record<string, any>;
}

export interface SduiHomepageBlueprint {
  version: number;
  updated_at: string;
  global_theme: {
    header_backdrop?: string;
    announcement_bar_enabled?: boolean;
    trust_bar_enabled?: boolean;
    free_shipping_threshold?: number;
    trust_badges: SduiTrustBadgeItem[];
    marquee_items: SduiMarqueeItem[];
  };
  widgets: SduiWidgetConfig[];
}

interface ProductSummary {
  id: string;
  name: string;
  price: number;
  mrp?: number;
  image_url?: string;
  is_active?: boolean;
}

const DEFAULT_BLUEPRINT: SduiHomepageBlueprint = {
  version: 1,
  updated_at: new Date().toISOString(),
  global_theme: {
    header_backdrop: "festive_coral_gold",
    announcement_bar_enabled: true,
    trust_bar_enabled: true,
    free_shipping_threshold: 499,
    trust_badges: [
      { icon: "truck", title: "Free Delivery", subtitle: "on ₹499+" },
      { icon: "shield", title: "Easy Returns", subtitle: "5-Day Policy" },
      { icon: "badge", title: "Secure Shopping", subtitle: "100% Safe" },
    ],
    marquee_items: [
      { icon: "crown", text: "ZEBALPHA • CLOTHING FOR THE CULTURE" },
      { icon: "flame", text: "NEW SEASON DROP • AUTHENTIC STREETWEAR" },
      { icon: "shield", text: "100% PREMIUM COMBED COTTON" },
      { icon: "truck", text: "FREE EXPRESS SHIPPING ON ORDERS OVER ₹499" },
      { icon: "tag", text: "FLAT ₹100 OFF ON 1ST ORDER (CODE: FIRST100)" },
    ],
  },
  widgets: [
    {
      id: "hero_carousel",
      widget_type: "HERO_CAROUSEL",
      title: "Main Hero Banners",
      subtitle: "Top sliding promotional banners",
      enabled: true,
      web_enabled: true,
      app_enabled: true,
      display_order: 1,
      config: {},
    },
    {
      id: "trust_badge_strip",
      widget_type: "TRUST_BADGE_STRIP",
      title: "3-Column Trust & Delivery Strip",
      subtitle: "Free Delivery, Easy Returns, Secure Shopping",
      enabled: true,
      web_enabled: true,
      app_enabled: true,
      display_order: 2,
      config: {},
    },
    {
      id: "marquee_ticker",
      widget_type: "MARQUEE_TICKER",
      title: "Scrolling Champagne-Gold Offer Marquee",
      subtitle: "Continuous promotional announcement ticker",
      enabled: true,
      web_enabled: true,
      app_enabled: true,
      display_order: 3,
      config: {},
    },
    {
      id: "curated_collections",
      widget_type: "CURATED_COLLECTIONS",
      title: "Curated Collections",
      subtitle: "Handpicked styles for the culture",
      enabled: true,
      web_enabled: true,
      app_enabled: true,
      display_order: 4,
      config: {},
    },
    {
      id: "promo_drop_carousel",
      widget_type: "PROMO_DROP_CAROUSEL",
      title: "1st Order ₹100 OFF & New Season Drop Slider",
      subtitle: "Auto-sliding conversion cards",
      enabled: true,
      web_enabled: true,
      app_enabled: true,
      display_order: 5,
      config: { show_first_order_slide: true, show_new_drop_slide: true },
    },
    {
      id: "flash_deal_strip",
      widget_type: "FLASH_DEAL_STRIP",
      title: "Flash Culture Deals",
      subtitle: "Limited-time price drops — grab before timer ends",
      enabled: false,
      web_enabled: true,
      app_enabled: true,
      display_order: 6,
      config: {
        badge_text: "LIVE FLASH SALE",
        ends_at: "",
        product_ids: [],
        max_items: 8,
        cta_label: "View All Deals",
        cta_href: "/products",
      },
    },
    {
      id: "festive_16_slot_grid",
      widget_type: "FESTIVE_16_SLOT_GRID",
      title: "TOP DEALS",
      subtitle: "Festive Picks • Unbeatable Prices • Shop More, Celebrate Bigger",
      enabled: true,
      web_enabled: true,
      app_enabled: true,
      display_order: 7,
      config: { campaign_slug: "top-deals" },
    },
    {
      id: "custom_studio_editorial",
      widget_type: "CUSTOM_STUDIO_EDITORIAL",
      title: "Customize & Wear Your Art",
      subtitle:
        "Tap any artwork below to open Custom Studio with that exact design ready on tees, hoodies & totes.",
      enabled: true,
      web_enabled: true,
      app_enabled: true,
      display_order: 8,
      config: {
        eyebrow: "ZEBALPHA CUSTOM STUDIO",
        title_line_1: "Customize &",
        title_line_2: "Wear Your Art",
      },
    },
    {
      id: "seller_brand_spotlight",
      widget_type: "SELLER_BRAND_SPOTLIGHT",
      title: "Featured Brand Showcase",
      subtitle: "Spotlight • Emerging Indian Brands",
      enabled: true,
      web_enabled: true,
      app_enabled: true,
      display_order: 9,
      config: {},
    },
    {
      id: "featured_product_feed",
      widget_type: "FEATURED_PRODUCT_FEED",
      title: "Our Products",
      subtitle: "Streetwear, polos, hoodies & curated culture drops",
      enabled: true,
      web_enabled: true,
      app_enabled: true,
      display_order: 10,
      config: { cta_label: "Create", cta_href: "/customize" },
    },
    {
      id: "recently_viewed",
      widget_type: "RECENTLY_VIEWED",
      title: "Recently Viewed",
      subtitle: "Pick up right where you left off",
      enabled: true,
      web_enabled: true,
      app_enabled: true,
      display_order: 11,
      config: {},
    },
  ],
};

const WIDGET_BADGE_LABELS: Record<string, string> = {
  HERO_CAROUSEL: "Hero Banner Slider",
  TRUST_BADGE_STRIP: "3-Badge Trust Bar",
  MARQUEE_TICKER: "Gold Ticker Strip",
  CURATED_COLLECTIONS: "Category Grid",
  PROMO_DROP_CAROUSEL: "Offer & Drop Slider",
  FLASH_DEAL_STRIP: "Live Countdown Rail",
  FESTIVE_16_SLOT_GRID: "16-Slot Flipkart/Meesho Grid",
  CUSTOM_STUDIO_EDITORIAL: "Custom Print Carousel",
  SELLER_BRAND_SPOTLIGHT: "Sponsored Seller Ads",
  FEATURED_PRODUCT_FEED: "Infinite Product Catalog",
  RECENTLY_VIEWED: "Personalized History",
};

export default function SduiStorefrontStudioView() {
  const [subTab, setSubTab] = useState<"layout" | "flash_deals" | "festive_grid" | "trust_marquee">(
    "layout"
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [blueprint, setBlueprint] = useState<SduiHomepageBlueprint>(DEFAULT_BLUEPRINT);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [newMarqueeText, setNewMarqueeText] = useState("");
  const [newMarqueeIcon, setNewMarqueeIcon] = useState("flame");

  const getStorefrontUrl = () => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      if (host === "localhost" || host === "127.0.0.1") {
        return process.env.NEXT_PUBLIC_STOREFRONT_URL || "http://localhost:3000";
      }
    }
    return process.env.NEXT_PUBLIC_STOREFRONT_URL || "https://zebalpha.shop";
  };

  const notify = (text: string, type: "success" | "error" = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4500);
  };

  const loadBlueprint = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/settings", { cache: "no-store" });
      const json = await res.json();
      if (json.success && json.settings) {
        const raw = json.settings.sdui_homepage_layout_v1;
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;

        if (parsed && typeof parsed === "object") {
          const savedWidgets: SduiWidgetConfig[] = Array.isArray(parsed.widgets)
            ? parsed.widgets
            : [];
          const byType = new Map<string, SduiWidgetConfig>();
          savedWidgets.forEach((w) => {
            if (w && w.widget_type) byType.set(w.widget_type, w);
          });

          const merged = DEFAULT_BLUEPRINT.widgets.map((defW) => {
            const found = byType.get(defW.widget_type);
            if (!found) return defW;
            return {
              ...defW,
              ...found,
              config: { ...(defW.config || {}), ...(found.config || {}) },
            };
          });
          merged.sort((a, b) => (a.display_order ?? 99) - (b.display_order ?? 99));

          setBlueprint({
            version: 1,
            updated_at: parsed.updated_at || new Date().toISOString(),
            global_theme: {
              ...DEFAULT_BLUEPRINT.global_theme,
              ...(parsed.global_theme || {}),
              trust_badges:
                Array.isArray(parsed.global_theme?.trust_badges) &&
                parsed.global_theme.trust_badges.length >= 3
                  ? parsed.global_theme.trust_badges
                  : DEFAULT_BLUEPRINT.global_theme.trust_badges,
              marquee_items:
                Array.isArray(parsed.global_theme?.marquee_items) &&
                parsed.global_theme.marquee_items.length > 0
                  ? parsed.global_theme.marquee_items
                  : Array.isArray(json.settings.marquee_banner) &&
                    json.settings.marquee_banner.length > 0
                  ? json.settings.marquee_banner
                  : DEFAULT_BLUEPRINT.global_theme.marquee_items,
            },
            widgets: merged,
          });
        }
        if (Array.isArray(json.products)) {
          setProducts(json.products);
        }
      }
    } catch (e: any) {
      notify(e?.message || "Failed to load SDUI blueprint", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBlueprint();
  }, [loadBlueprint]);

  const publishBlueprint = async (nextBp?: SduiHomepageBlueprint) => {
    const payload: SduiHomepageBlueprint = {
      ...(nextBp || blueprint),
      updated_at: new Date().toISOString(),
      widgets: (nextBp || blueprint).widgets.map((w, idx) => ({
        ...w,
        display_order: idx + 1,
      })),
    };

    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "sdui_homepage_layout_v1",
          value: payload,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message || "Failed to save SDUI layout");
      }

      // Trigger instant Customer Storefront L1 RAM + Redis cache purge (<1s)
      const storefrontBase = getStorefrontUrl();
      fetch(`${storefrontBase}/api/cache/revalidate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: "sdui" }),
      }).catch(() => {});

      setBlueprint(payload);
      notify("🚀 SDUI Layout Published! Live on Customer Website & Android App (<2s cache sync).");
    } catch (e: any) {
      notify(e?.message || "Error publishing SDUI layout", "error");
    } finally {
      setSaving(false);
    }
  };

  const moveWidget = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= blueprint.widgets.length) return;
    const copy = [...blueprint.widgets];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;
    const reindexed = copy.map((w, i) => ({ ...w, display_order: i + 1 }));
    setBlueprint((prev) => ({ ...prev, widgets: reindexed }));
  };

  const updateWidgetField = (
    widgetId: string,
    patch: Partial<SduiWidgetConfig>
  ) => {
    setBlueprint((prev) => ({
      ...prev,
      widgets: prev.widgets.map((w) => (w.id === widgetId ? { ...w, ...patch } : w)),
    }));
  };

  const updateWidgetConfig = (widgetId: string, cfgPatch: Record<string, any>) => {
    setBlueprint((prev) => ({
      ...prev,
      widgets: prev.widgets.map((w) =>
        w.id === widgetId ? { ...w, config: { ...(w.config || {}), ...cfgPatch } } : w
      ),
    }));
  };

  const flashWidget = blueprint.widgets.find((w) => w.widget_type === "FLASH_DEAL_STRIP");
  const selectedFlashProductIds: string[] = Array.isArray(flashWidget?.config?.product_ids)
    ? flashWidget!.config!.product_ids.map(String)
    : [];

  const toggleFlashProduct = (prodId: string) => {
    if (!flashWidget) return;
    const strId = String(prodId);
    const exists = selectedFlashProductIds.includes(strId);
    const nextIds = exists
      ? selectedFlashProductIds.filter((id) => id !== strId)
      : [...selectedFlashProductIds, strId];
    updateWidgetConfig(flashWidget.id, { product_ids: nextIds });
  };

  return (
    <div className="space-y-6 select-none">
      {/* Top Studio Header */}
      <div className="rounded-3xl bg-zinc-950 border border-zinc-800 p-5 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-2xl">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
              Flipkart / Meesho SDUI Engine
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              ~1.8 KB Single-Key Cache • Zero Extra Egress
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
            Storefront SDUI &amp; Dynamic Layout Studio
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Reorder homepage sections, toggle Web/App visibility, run live Flash Countdown Sales, and manage the 16-Slot Deal Grid without app updates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={loadBlueprint}
            disabled={loading || saving}
            className="px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-200 flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Reload</span>
          </button>

          <a
            href={getStorefrontUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-white flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span>Live Storefront</span>
            <ExternalLink className="w-3 h-3 text-zinc-400" />
          </a>

          {subTab !== "festive_grid" && (
            <button
              type="button"
              onClick={() => publishBlueprint()}
              disabled={saving || loading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:brightness-110 text-black text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer active:scale-95 transition"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? "Publishing..." : "Publish Layout to Storefront"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center gap-2.5 shadow-xl ${
            toast.type === "error"
              ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
          }`}
        >
          {toast.type === "error" ? (
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          )}
          <span>{toast.text}</span>
        </div>
      )}

      {/* 4 Studio Sub-Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-zinc-800 pb-3">
        {[
          {
            id: "layout",
            label: "1. Homepage Widget Order & Visibility (11 Slots)",
            icon: Layers,
          },
          {
            id: "flash_deals",
            label: "2. Flash Sale & Countdown Timer Rail",
            icon: Flame,
          },
          {
            id: "festive_grid",
            label: "3. 16-Slot Festive Deals Grid (Flipkart/Meesho)",
            icon: Sparkles,
          },
          {
            id: "trust_marquee",
            label: "4. Trust Badges & Scrolling Gold Marquee",
            icon: ShieldCheck,
          },
        ].map((t) => {
          const Icon = t.icon;
          const active = subTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition cursor-pointer ${
                active
                  ? "bg-white text-black shadow-lg"
                  : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white"
              }`}
            >
              <Icon className={`w-4 h-4 ${active ? "text-black" : "text-amber-400"}`} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* =================================================================== */}
      {/* SUB-TAB 1: HOMEPAGE WIDGET ORDER & VISIBILITY                       */}
      {/* =================================================================== */}
      {subTab === "layout" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <p className="text-xs text-zinc-400">
              Use <strong className="text-white">↑ / ↓</strong> to reorder sections on the Customer Homepage, toggle <strong className="text-emerald-400">LIVE / HIDDEN</strong>, or customize headings inline.
            </p>
            <button
              type="button"
              onClick={() => {
                setBlueprint(DEFAULT_BLUEPRINT);
                notify("Reset to default ZebAlpha widget order. Click 'Publish Layout' to apply.");
              }}
              className="text-xs font-bold text-zinc-400 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Default Order</span>
            </button>
          </div>

          <div className="space-y-3">
            {blueprint.widgets.map((widget, idx) => (
              <div
                key={widget.id}
                className={`rounded-2xl border p-4 sm:p-5 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                  widget.enabled
                    ? "bg-zinc-950 border-zinc-800 hover:border-zinc-700"
                    : "bg-zinc-950/40 border-zinc-900 opacity-65"
                }`}
              >
                {/* Left: Position Controls + Widget Title & Subtitle Inputs */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveWidget(idx, -1)}
                      title="Move Section Up"
                      className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-amber-500 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[10px] font-black">
                      #{idx + 1}
                    </span>
                    <button
                      type="button"
                      disabled={idx === blueprint.widgets.length - 1}
                      onClick={() => moveWidget(idx, 1)}
                      title="Move Section Down"
                      className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:border-amber-500 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex-1 min-w-0 space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-md bg-zinc-900 border border-zinc-700 text-[10px] font-black uppercase tracking-wider text-amber-400">
                        {WIDGET_BADGE_LABELS[widget.widget_type] || widget.widget_type}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-500">
                        {widget.widget_type}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                          Section Heading
                        </label>
                        <input
                          type="text"
                          value={widget.title}
                          onChange={(e) =>
                            updateWidgetField(widget.id, { title: e.target.value })
                          }
                          className="w-full px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                          Section Subtitle / Hook
                        </label>
                        <input
                          type="text"
                          value={widget.subtitle || ""}
                          onChange={(e) =>
                            updateWidgetField(widget.id, { subtitle: e.target.value })
                          }
                          className="w-full px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Platform Toggles (Web / App) + Master Enable Switch */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 self-end lg:self-center">
                  <button
                    type="button"
                    onClick={() =>
                      updateWidgetField(widget.id, { web_enabled: !widget.web_enabled })
                    }
                    className={`px-3 py-2 rounded-xl text-[11px] font-bold border flex items-center gap-1.5 cursor-pointer transition ${
                      widget.web_enabled
                        ? "bg-blue-500/15 border-blue-500/40 text-blue-300"
                        : "bg-zinc-900 border-zinc-800 text-zinc-500"
                    }`}
                  >
                    <Globe className="w-3.5 h-3.5" />
                    <span>Web: {widget.web_enabled ? "ON" : "OFF"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      updateWidgetField(widget.id, { app_enabled: !widget.app_enabled })
                    }
                    className={`px-3 py-2 rounded-xl text-[11px] font-bold border flex items-center gap-1.5 cursor-pointer transition ${
                      widget.app_enabled
                        ? "bg-purple-500/15 border-purple-500/40 text-purple-300"
                        : "bg-zinc-900 border-zinc-800 text-zinc-500"
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>App: {widget.app_enabled ? "ON" : "OFF"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      updateWidgetField(widget.id, { enabled: !widget.enabled })
                    }
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border flex items-center gap-1.5 cursor-pointer transition ${
                      widget.enabled
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                        : "bg-zinc-900 border-zinc-700 text-zinc-400"
                    }`}
                  >
                    {widget.enabled ? (
                      <>
                        <Eye className="w-3.5 h-3.5 text-emerald-400" />
                        <span>LIVE</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-zinc-500" />
                        <span>HIDDEN</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-TAB 2: FLASH SALE & COUNTDOWN TIMER RAIL                        */}
      {/* =================================================================== */}
      {subTab === "flash_deals" && flashWidget && (
        <div className="rounded-3xl bg-zinc-950 border border-zinc-800 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-800">
            <div>
              <h2 className="text-lg font-black text-white uppercase flex items-center gap-2">
                <Flame className="w-5 h-5 text-rose-500 fill-current" />
                <span>Live Flash Sale &amp; Countdown Timer Controller</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Configure a Flipkart/Meesho-style horizontal Flash Deal rail with a real-time HH:MM:SS countdown timer.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                updateWidgetField(flashWidget.id, { enabled: !flashWidget.enabled })
              }
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border flex items-center gap-2 cursor-pointer ${
                flashWidget.enabled
                  ? "bg-emerald-500 text-black border-emerald-400"
                  : "bg-zinc-900 text-zinc-300 border-zinc-700"
              }`}
            >
              {flashWidget.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              <span>
                Flash Sale Rail: {flashWidget.enabled ? "ACTIVE ON HOMEPAGE" : "CURRENTLY OFF"}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-black uppercase text-zinc-400 mb-1.5">
                Flash Sale Heading
              </label>
              <input
                type="text"
                value={flashWidget.title}
                onChange={(e) =>
                  updateWidgetField(flashWidget.id, { title: e.target.value })
                }
                placeholder="e.g. Midnight Culture Flash Drop"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-bold text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-zinc-400 mb-1.5">
                Red Pill Badge Text
              </label>
              <input
                type="text"
                value={flashWidget.config?.badge_text || "LIVE FLASH SALE"}
                onChange={(e) =>
                  updateWidgetConfig(flashWidget.id, { badge_text: e.target.value })
                }
                placeholder="LIVE FLASH SALE"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-bold text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-zinc-400 mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Countdown End Date &amp; Time</span>
              </label>
              <input
                type="datetime-local"
                value={
                  flashWidget.config?.ends_at
                    ? String(flashWidget.config.ends_at).slice(0, 16)
                    : ""
                }
                onChange={(e) =>
                  updateWidgetConfig(flashWidget.id, {
                    ends_at: e.target.value ? new Date(e.target.value).toISOString() : "",
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-bold text-white [color-scheme:dark]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase text-zinc-400 mb-1.5">
                Quick Timer Presets
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "+6 Hours", hrs: 6 },
                  { label: "+12 Hours", hrs: 12 },
                  { label: "+24 Hours", hrs: 24 },
                  { label: "+3 Days", hrs: 72 },
                ].map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      const iso = new Date(Date.now() + p.hrs * 3600_000).toISOString();
                      updateWidgetConfig(flashWidget.id, { ends_at: iso });
                    }}
                    className="px-2.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[11px] font-bold text-amber-400 cursor-pointer"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Product Picker for Flash Deal Rail */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-zinc-300">
                Select Products for Flash Deal Rail ({selectedFlashProductIds.length} selected — leave empty to auto-pick top discounted items)
              </label>
              {selectedFlashProductIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => updateWidgetConfig(flashWidget.id, { product_ids: [] })}
                  className="text-xs font-bold text-rose-400 hover:underline cursor-pointer"
                >
                  Clear Selection (Use Auto Top-Discounted)
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 max-h-80 overflow-y-auto p-1">
              {products.slice(0, 48).map((prod) => {
                const isSelected = selectedFlashProductIds.includes(String(prod.id));
                return (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => toggleFlashProduct(String(prod.id))}
                    className={`p-2 rounded-xl border text-left transition flex flex-col gap-1.5 cursor-pointer ${
                      isSelected
                        ? "bg-amber-500/15 border-amber-400 ring-1 ring-amber-400"
                        : "bg-zinc-900/70 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <div className="aspect-square w-full rounded-lg bg-zinc-950 overflow-hidden">
                      {prod.image_url ? (
                        <img
                          src={prod.image_url}
                          alt={prod.name}
                          className="w-full h-full object-cover"
                        />
                      ) : null}
                    </div>
                    <p className="text-[11px] font-bold text-white line-clamp-1">{prod.name}</p>
                    <p className="text-[11px] font-black text-amber-400">
                      ₹{Number(prod.price || 0).toLocaleString("en-IN")}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-TAB 3: 16-SLOT FESTIVE DEALS GRID (PromotionsStudioView)        */}
      {/* =================================================================== */}
      {subTab === "festive_grid" && (
        <div className="rounded-3xl bg-zinc-950 border border-zinc-800 overflow-hidden">
          <PromotionsStudioView />
        </div>
      )}

      {/* =================================================================== */}
      {/* SUB-TAB 4: TRUST BADGES & SCROLLING GOLD MARQUEE EDITOR             */}
      {/* =================================================================== */}
      {subTab === "trust_marquee" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 3-Column Trust Strip Editor */}
          <div className="rounded-3xl bg-zinc-950 border border-zinc-800 p-6 space-y-4">
            <h2 className="text-base font-black text-white uppercase flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <span>3-Column Trust &amp; Delivery Strip</span>
            </h2>
            <p className="text-xs text-zinc-400">
              Edit the 3 trust badges shown directly below the Hero Banner on Website &amp; Android App.
            </p>

            <div className="space-y-3">
              {blueprint.global_theme.trust_badges.map((badge, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 grid grid-cols-1 sm:grid-cols-3 gap-3"
                >
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                      Icon
                    </label>
                    <select
                      value={badge.icon}
                      onChange={(e) => {
                        const next = [...blueprint.global_theme.trust_badges];
                        next[idx] = { ...next[idx], icon: e.target.value };
                        setBlueprint((prev) => ({
                          ...prev,
                          global_theme: { ...prev.global_theme, trust_badges: next },
                        }));
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-bold text-white"
                    >
                      <option value="truck">Truck (Delivery)</option>
                      <option value="shield">Shield (Returns)</option>
                      <option value="badge">Badge (Verified Safe)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                      Badge Title
                    </label>
                    <input
                      type="text"
                      value={badge.title}
                      onChange={(e) => {
                        const next = [...blueprint.global_theme.trust_badges];
                        next[idx] = { ...next[idx], title: e.target.value };
                        setBlueprint((prev) => ({
                          ...prev,
                          global_theme: { ...prev.global_theme, trust_badges: next },
                        }));
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-bold text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                      Subtitle
                    </label>
                    <input
                      type="text"
                      value={badge.subtitle}
                      onChange={(e) => {
                        const next = [...blueprint.global_theme.trust_badges];
                        next[idx] = { ...next[idx], subtitle: e.target.value };
                        setBlueprint((prev) => ({
                          ...prev,
                          global_theme: { ...prev.global_theme, trust_badges: next },
                        }));
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Scrolling Champagne-Gold Marquee Ticker Editor */}
          <div className="rounded-3xl bg-zinc-950 border border-zinc-800 p-6 space-y-4">
            <h2 className="text-base font-black text-white uppercase flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Scrolling Champagne-Gold Marquee Ticker</span>
            </h2>
            <p className="text-xs text-zinc-400">
              Add, edit, or remove announcement lines scrolling across the homepage marquee bar.
            </p>

            {/* Add New Line */}
            <div className="flex gap-2">
              <select
                value={newMarqueeIcon}
                onChange={(e) => setNewMarqueeIcon(e.target.value)}
                className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-bold text-white"
              >
                <option value="crown">Crown</option>
                <option value="flame">Flame</option>
                <option value="tag">Offer Tag</option>
                <option value="truck">Truck</option>
                <option value="shield">Shield</option>
              </select>
              <input
                type="text"
                value={newMarqueeText}
                onChange={(e) => setNewMarqueeText(e.target.value)}
                placeholder="e.g. WINTER FESTIVE SALE • FLAT ₹100 OFF ON FIRST ORDER"
                className="flex-1 px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-bold text-white"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newMarqueeText.trim()) return;
                  const next = [
                    ...blueprint.global_theme.marquee_items,
                    { icon: newMarqueeIcon, text: newMarqueeText.trim().toUpperCase() },
                  ];
                  setBlueprint((prev) => ({
                    ...prev,
                    global_theme: { ...prev.global_theme, marquee_items: next },
                  }));
                  setNewMarqueeText("");
                }}
                className="px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-black uppercase flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>

            <div className="space-y-2">
              {blueprint.global_theme.marquee_items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-2"
                >
                  <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-[10px] font-black uppercase text-amber-400">
                    {item.icon}
                  </span>
                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) => {
                      const next = [...blueprint.global_theme.marquee_items];
                      next[idx] = { ...next[idx], text: e.target.value };
                      setBlueprint((prev) => ({
                        ...prev,
                        global_theme: { ...prev.global_theme, marquee_items: next },
                      }));
                    }}
                    className="flex-1 bg-transparent text-xs font-bold text-white focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (blueprint.global_theme.marquee_items.length <= 1) return;
                      const next = blueprint.global_theme.marquee_items.filter((_, i) => i !== idx);
                      setBlueprint((prev) => ({
                        ...prev,
                        global_theme: { ...prev.global_theme, marquee_items: next },
                      }));
                    }}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
