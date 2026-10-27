"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Edit3,
  X,
  Layers,
  Save,
  Eye,
  EyeOff,
  Flame,
  Check
} from "lucide-react";

interface SlotData {
  id?: string;
  campaign_id?: string;
  slot_number: number;
  title: string;
  price_label: string;
  image_url: string;
  destination_type: string;
  destination_url: string;
  is_active: boolean;
}

interface CampaignData {
  id: string;
  title: string;
  subtitle: string;
  slug: string;
  theme_preset: string;
  status: "draft" | "published" | "paused";
  total_slots: number;
  grid_columns: number;
  website_enabled: boolean;
  android_enabled: boolean;
}

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
  image_url?: string;
}

const PRICE_PRESETS = ["From ₹49", "From ₹69", "From ₹79", "From ₹99", "From ₹199", "From ₹299", "Up to 70% OFF", "Up to 80% OFF"];

export default function PromotionsStudioView() {
  const [loading, setLoading] = useState(true);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [savingSlot, setSavingSlot] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [slots, setSlots] = useState<SlotData[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);

  // Editing state for campaign meta
  const [title, setTitle] = useState("TOP DEALS");
  const [subtitle, setSubtitle] = useState("");
  const [themePreset, setThemePreset] = useState("diwali_silver_ornate");
  const [status, setStatus] = useState<"draft" | "published" | "paused">("draft");

  // Editing state for active slot drawer
  const [activeSlotNumber, setActiveSlotNumber] = useState<number | null>(null);
  const [slotTitle, setSlotTitle] = useState("");
  const [slotPriceLabel, setSlotPriceLabel] = useState("");
  const [slotImageUrl, setSlotImageUrl] = useState("");
  const [slotDestinationUrl, setSlotDestinationUrl] = useState("");

  // Storefront URL calculation
  const getStorefrontUrl = () => {
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      if (host === "localhost" || host === "127.0.0.1") {
        return process.env.NEXT_PUBLIC_STOREFRONT_URL || "http://localhost:3000";
      }
    }
    return process.env.NEXT_PUBLIC_STOREFRONT_URL || "https://zebalpha.shop";
  };

  const showStatus = (msg: string) => {
    setStatusMessage(msg);
    setErrorMessage("");
    setTimeout(() => {
      setStatusMessage((prev) => (prev === msg ? "" : prev));
    }, 4500);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setStatusMessage("");
  };

  const fetchCampaignData = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/admin/promotions?slug=top-deals", { cache: "no-store" });
      const json = await res.json();
      if (json.success && json.data) {
        const c = json.data.campaign;
        setCampaign(c);
        setTitle(c.title || "TOP DEALS");
        setSubtitle(c.subtitle || "");
        setThemePreset(c.theme_preset || "diwali_silver_ornate");
        setStatus(c.status || "draft");

        // Normalize slots to ensure exactly 16 slots exist in UI array
        const rawSlots: SlotData[] = json.data.slots || [];
        const full16: SlotData[] = [];
        for (let i = 1; i <= 16; i++) {
          const found = rawSlots.find((s) => s.slot_number === i);
          if (found) {
            full16.push(found);
          } else {
            full16.push({
              slot_number: i,
              title: "",
              price_label: "",
              image_url: "",
              destination_type: "category",
              destination_url: "/categories",
              is_active: true
            });
          }
        }
        setSlots(full16);
        setCategories(json.data.categories || []);
      } else {
        showError(json.message || "Failed to load campaign data");
      }
    } catch (e: any) {
      showError(e.message || "Network error loading promotions studio");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaignData();
  }, [fetchCampaignData]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && activeSlotNumber !== null) {
        setActiveSlotNumber(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeSlotNumber]);

  // Open slot editor drawer
  const handleOpenSlot = (slotNumber: number) => {
    const s = slots.find((item) => item.slot_number === slotNumber);
    setActiveSlotNumber(slotNumber);
    if (s) {
      setSlotTitle(s.title || "");
      setSlotPriceLabel(s.price_label || "");
      setSlotImageUrl(s.image_url || "");
      setSlotDestinationUrl(s.destination_url || "/categories");
    } else {
      setSlotTitle("");
      setSlotPriceLabel("");
      setSlotImageUrl("");
      setSlotDestinationUrl("/categories");
    }
    setStatusMessage("");
    setErrorMessage("");
  };

  // Quick apply category to slot
  const handleSelectCategory = (catSlug: string) => {
    const cat = categories.find((c) => c.slug === catSlug);
    if (cat) {
      if (!slotTitle || categories.some((c) => c.name === slotTitle)) {
        setSlotTitle(cat.name);
      }
      setSlotDestinationUrl(`/categories/${cat.slug}`);
      if (!slotImageUrl && cat.image_url) {
        setSlotImageUrl(cat.image_url);
      }
    } else if (catSlug === "all") {
      setSlotDestinationUrl("/categories");
    }
  };

  // Save current slot
  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaign?.id || activeSlotNumber === null) return;

    if (!slotTitle.trim()) {
      showError("Slot Title is required (e.g. Festive Lights, Kurtis)");
      return;
    }
    if (!slotPriceLabel.trim()) {
      showError("Price label is required (e.g. 'From ₹69' or 'Up to 80% OFF')");
      return;
    }
    if (!slotImageUrl.trim()) {
      showError("Image URL is required");
      return;
    }
    if (!slotDestinationUrl.trim()) {
      showError("Destination URL is required (e.g. /categories/mens-fashion)");
      return;
    }

    setSavingSlot(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/admin/promotions/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_id: campaign.id,
          slot_number: activeSlotNumber,
          title: slotTitle.trim(),
          price_label: slotPriceLabel.trim(),
          image_url: slotImageUrl.trim(),
          destination_type: "category",
          destination_url: slotDestinationUrl.trim()
        })
      });

      const json = await res.json();
      if (json.success && json.data) {
        // Update local state
        setSlots((prev) =>
          prev.map((s) => (s.slot_number === activeSlotNumber ? { ...s, ...json.data } : s))
        );
        showStatus(`✅ Slot #${activeSlotNumber} saved & updated successfully!`);
        setActiveSlotNumber(null);
      } else {
        showError(json.message || "Failed to save slot");
      }
    } catch (err: any) {
      showError(err.message || "Error saving slot");
    } finally {
      setSavingSlot(false);
    }
  };

  // Save campaign meta and publish status
  const handleSaveCampaign = async (explicitStatus?: "draft" | "published" | "paused") => {
    if (!campaign?.id) return;
    const targetStatus = explicitStatus !== undefined ? explicitStatus : status;

    // Client-side pre-validation for publishing
    if (targetStatus === "published") {
      const incompleteSlots = slots.filter(
        (s) => !s.title?.trim() || !s.price_label?.trim() || !s.image_url?.trim() || !s.destination_url?.trim()
      );
      if (incompleteSlots.length > 0) {
        const slotNums = incompleteSlots.map((s) => `#${s.slot_number}`).join(", ");
        showError(
          `Cannot publish: All 16 slots must be configured. Missing data in slot(s): ${slotNums}`
        );
        return;
      }
    }

    setSavingCampaign(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/admin/promotions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: campaign.id,
          title: title.trim(),
          subtitle: subtitle.trim(),
          theme_preset: themePreset,
          status: targetStatus,
          website_enabled: true,
          android_enabled: true
        })
      });

      const json = await res.json();
      if (json.success && json.data) {
        setCampaign(json.data);
        setStatus(json.data.status);
        showStatus(
          targetStatus === "published"
            ? "🚀 Showcase successfully published live to Storefront & Mobile App!"
            : targetStatus === "paused"
            ? "👁️‍🗨️ Showcase is now HIDDEN from Storefront & Mobile App."
            : targetStatus === "draft"
            ? "📝 Saved as Draft (Hidden from store)."
            : "✅ Campaign settings saved successfully!"
        );
      } else {
        showError(json.message || "Failed to update campaign");
      }
    } catch (err: any) {
      showError(err.message || "Network error updating campaign");
    } finally {
      setSavingCampaign(false);
    }
  };

  const completedSlotCount = slots.filter(
    (s) => s.title?.trim() && s.price_label?.trim() && s.image_url?.trim()
  ).length;

  if (loading) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-10 w-72 bg-zinc-800 rounded-xl" />
        <div className="h-32 bg-zinc-900 rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="h-44 bg-zinc-900 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 select-none">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Flipkart / Meesho Engine
            </span>
            <span className="text-xs text-zinc-500">•</span>
            <span className="text-xs font-semibold text-zinc-400">Strict 16-Slot Server-Driven UI</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase flex items-center gap-2.5">
            Festive Deals Merchandising Studio
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Configure the 16 curated category drops, price floors, and silver ornate frame showcase in real-time.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => {
              fetchCampaignData();
              showStatus("Showcase reloaded from server!");
            }}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:scale-95 border border-zinc-700 text-xs font-bold text-zinc-300 flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <a
            href={getStorefrontUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:scale-95 border border-zinc-700 text-xs font-bold text-white flex items-center gap-1.5 transition cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-zinc-400" />
            <span>View Storefront</span>
            <ExternalLink className="w-3 h-3 text-zinc-500" />
          </a>
        </div>
      </div>

      {/* Notifications */}
      {statusMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 shadow-lg animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{statusMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center gap-2 shadow-lg animate-in fade-in">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Campaign Settings Control Bar */}
      <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-zinc-800/80">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 flex-1">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                Campaign Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-sm font-bold text-white focus:outline-none focus:border-amber-500"
                placeholder="e.g. TOP DEALS"
              />
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                Theme Preset
              </label>
              <select
                value={themePreset}
                onChange={(e) => setThemePreset(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-sm font-bold text-white focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="diwali_silver_ornate">Diwali Silver Ornate (Black & Silver)</option>
                <option value="brand_spotlight">Brand Spotlight (Golden Glow)</option>
                <option value="default_clean">Clean Modern Luxury</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                Current Status
              </label>
              <div className="flex items-center gap-2">
                <span
                  className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 border flex-1 justify-center ${
                    status === "published"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : status === "paused"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      : "bg-zinc-800 text-zinc-400 border-zinc-700"
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      status === "published"
                        ? "bg-emerald-400 animate-pulse"
                        : status === "paused"
                        ? "bg-amber-400"
                        : "bg-zinc-500"
                    }`}
                  />
                  {status === "published"
                    ? "LIVE ON STORE"
                    : status === "paused"
                    ? "HIDDEN"
                    : "DRAFT"}
                </span>

                {/* Quick Toggle Button */}
                <button
                  type="button"
                  onClick={() => handleSaveCampaign(status === "published" ? "paused" : "published")}
                  disabled={savingCampaign || (status !== "published" && completedSlotCount < 16)}
                  title={status === "published" ? "Click to Hide from Storefront" : "Click to Make Live on Storefront"}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer active:scale-95 ${
                    status === "published"
                      ? "bg-zinc-900 hover:bg-zinc-800 text-amber-400 border-zinc-700"
                      : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  }`}
                >
                  {status === "published" ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5 text-amber-400" />
                      <span>Hide</span>
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Show</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 self-end lg:self-center flex-wrap">
            {/* 1. Explicit Save Changes (Preserves status) */}
            <button
              type="button"
              onClick={() => handleSaveCampaign(status)}
              disabled={savingCampaign}
              className="px-4 py-2.5 rounded-xl bg-white text-black hover:bg-zinc-200 active:scale-95 text-xs font-black uppercase tracking-wider flex items-center gap-2 transition cursor-pointer shadow-lg"
            >
              <Save className="w-4 h-4" />
              <span>{savingCampaign ? "Saving..." : "Save Settings"}</span>
            </button>

            {/* 2. Toggle Live / Hide Status */}
            {status === "published" ? (
              <button
                type="button"
                onClick={() => handleSaveCampaign("paused")}
                disabled={savingCampaign}
                className="px-4 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 active:scale-95 border border-amber-500/30 text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2 transition cursor-pointer shadow-sm shadow-amber-500/10"
              >
                <EyeOff className="w-4 h-4" />
                <span>Hide from Store</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSaveCampaign("published")}
                disabled={savingCampaign || completedSlotCount < 16}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg transition active:scale-95 ${
                  completedSlotCount === 16
                    ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black shadow-emerald-500/20 cursor-pointer"
                    : "bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed"
                }`}
              >
                <Flame className="w-4 h-4 fill-current" />
                <span>Make Live on Store (16/16)</span>
              </button>
            )}

            {/* 3. Save as Draft */}
            <button
              type="button"
              onClick={() => handleSaveCampaign("draft")}
              disabled={savingCampaign}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:scale-95 border border-zinc-700 text-xs font-black uppercase tracking-wider text-zinc-300 transition cursor-pointer"
            >
              <span>Save Draft</span>
            </button>
          </div>
        </div>

        {/* Informational Banner when Hidden */}
        {status !== "published" && (
          <div className="px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-semibold flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <EyeOff className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Showcase is currently <strong>HIDDEN</strong> from customer website and mobile app.</span>
            </div>
            {completedSlotCount === 16 && (
              <button
                type="button"
                onClick={() => handleSaveCampaign("published")}
                className="text-xs font-black text-amber-400 underline hover:text-amber-300 cursor-pointer flex items-center gap-1"
              >
                <span>Make Live Now →</span>
              </button>
            )}
          </div>
        )}

        {/* Subtitle & Slot Progress Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
          <div className="flex-1">
            <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-1">
              Subtitle / Hook
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs text-zinc-300 focus:outline-none focus:border-amber-500"
              placeholder="e.g. Festive Picks • Unbeatable Prices • Shop More, Celebrate Bigger"
            />
          </div>
          <div className="flex items-center gap-3 bg-zinc-900/80 px-4 py-2.5 rounded-xl border border-zinc-800 self-start sm:self-end">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-zinc-400 block">Slots Configured</span>
              <span
                className={`text-sm font-black ${
                  completedSlotCount === 16 ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {completedSlotCount} / 16 Slots Ready
              </span>
            </div>
            <div className="w-10 h-10 rounded-full border-2 border-zinc-700 flex items-center justify-center font-black text-xs text-white">
              {Math.round((completedSlotCount / 16) * 100)}%
            </div>
          </div>
        </div>
      </div>

      {/* Visual 4x4 Grid Representation (The 16 Slots) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black uppercase tracking-wider text-zinc-300 flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>16-Slot Interactive Merchandising Grid (Click any card to edit)</span>
          </h2>
          <span className="text-xs text-zinc-500">4 Columns × 4 Rows</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {slots.map((slot) => {
            const isFilled = Boolean(slot.title && slot.price_label && slot.image_url);
            return (
              <div
                key={slot.slot_number}
                onClick={() => handleOpenSlot(slot.slot_number)}
                className={`group relative p-3 rounded-2xl bg-zinc-950 border transition-all cursor-pointer hover:border-amber-500 hover:shadow-xl hover:shadow-amber-500/10 active:scale-[0.98] ${
                  isFilled ? "border-zinc-800" : "border-dashed border-zinc-800 bg-zinc-950/40"
                }`}
              >
                {/* Slot Number Badge */}
                <div className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 rounded-md bg-black/85 backdrop-blur-md border border-zinc-700 text-[10px] font-black text-amber-400 shadow">
                  SLOT #{slot.slot_number}
                </div>

                {/* Edit Icon Overlay on Hover */}
                <div className="absolute top-2.5 right-2.5 z-10 opacity-0 group-hover:opacity-100 transition p-1.5 rounded-lg bg-amber-500 text-black shadow-lg">
                  <Edit3 className="w-3.5 h-3.5" />
                </div>

                {/* Image Container with native img for 100% reliability */}
                <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-zinc-900 relative mb-3 border border-zinc-800 flex items-center justify-center">
                  {slot.image_url ? (
                    <img
                      src={slot.image_url}
                      alt={slot.title || `Slot ${slot.slot_number}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 gap-1">
                      <Sparkles className="w-6 h-6 opacity-40" />
                      <span className="text-[10px] font-bold uppercase">Empty Slot</span>
                    </div>
                  )}
                </div>

                {/* Card Metadata */}
                <div className="space-y-1">
                  <div className="font-bold text-xs text-white truncate">
                    {slot.title || <span className="text-zinc-600 italic">No Title Configured</span>}
                  </div>
                  <div className="text-xs font-black text-amber-400 truncate">
                    {slot.price_label || <span className="text-zinc-600 italic">No Price Label</span>}
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate pt-1 border-t border-zinc-900">
                    🔗 {slot.destination_url || "/categories"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Slide-over / Modal for Slot Editing */}
      {activeSlotNumber !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveSlotNumber(null);
          }}
        >
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="px-2.5 py-1 rounded-lg bg-amber-500 text-black font-black text-xs">
                  SLOT #{activeSlotNumber}
                </div>
                <h3 className="text-base font-black text-white uppercase">Configure Merchandising Card</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveSlotNumber(null)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Category Autofill Helper */}
            <div className="p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block">
                ⚡ Quick Fill from Store Categories
              </span>
              <select
                onChange={(e) => handleSelectCategory(e.target.value)}
                defaultValue=""
                className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-bold text-white focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="" disabled>-- Select a category to auto-fill --</option>
                <option value="all">All Categories (/categories)</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>
                    {cat.name} (/categories/{cat.slug})
                  </option>
                ))}
              </select>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveSlot} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                  Card Category / Hook Title <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={slotTitle}
                  onChange={(e) => setSlotTitle(e.target.value)}
                  maxLength={40}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-sm font-bold text-white focus:outline-none focus:border-amber-500"
                  placeholder="e.g. Festive Lights, Silk Sarees, Diwali Decor"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-black uppercase tracking-wider text-zinc-400">
                    Price Floor / Discount Label <span className="text-rose-400">*</span>
                  </label>
                  <span className="text-[10px] text-zinc-500">Quick presets below</span>
                </div>
                <input
                  type="text"
                  value={slotPriceLabel}
                  onChange={(e) => setSlotPriceLabel(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-sm font-bold text-white focus:outline-none focus:border-amber-500 mb-2"
                  placeholder="e.g. From ₹69, Up to 80% OFF, From ₹199"
                  required
                />
                {/* Price Presets */}
                <div className="flex flex-wrap gap-1.5">
                  {PRICE_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSlotPriceLabel(p)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                        slotPriceLabel === p
                          ? "bg-amber-500 text-black border-amber-400"
                          : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                  Card Image URL <span className="text-rose-400">*</span>
                </label>
                <input
                  type="url"
                  value={slotImageUrl}
                  onChange={(e) => setSlotImageUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-mono text-zinc-300 focus:outline-none focus:border-amber-500 mb-2"
                  placeholder="https://images.unsplash.com/... or Supabase storage URL"
                  required
                />
                {/* Image Live Preview */}
                {slotImageUrl && (
                  <div className="flex items-center gap-3 p-2 bg-zinc-900/50 rounded-2xl border border-zinc-800">
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-700 shrink-0">
                      <img
                        src={slotImageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="text-[11px] text-zinc-400 min-w-0">
                      <span className="font-bold text-emerald-400 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Image URL Live
                      </span>
                      <span className="truncate block font-mono text-[10px] text-zinc-500">{slotImageUrl}</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                  Target Destination URL <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={slotDestinationUrl}
                  onChange={(e) => setSlotDestinationUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-mono text-zinc-300 focus:outline-none focus:border-amber-500"
                  placeholder="/categories/mens-fashion"
                  required
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setActiveSlotNumber(null)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-400 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSlot}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingSlot ? "Saving Card..." : "Save Card"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
