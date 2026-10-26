"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
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
  Sliders,
  Flame,
  ArrowRight
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

  const fetchCampaignData = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/admin/promotions?slug=top-deals");
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
        setErrorMessage(json.message || "Failed to load campaign");
      }
    } catch (e: any) {
      setErrorMessage(e.message || "Network error loading promotions studio");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaignData();
  }, []);

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

  // Save current slot
  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaign?.id || activeSlotNumber === null) return;

    if (!slotTitle.trim()) {
      setErrorMessage("Slot Title is required");
      return;
    }
    if (!slotPriceLabel.trim()) {
      setErrorMessage("Price label is required (e.g. 'From ₹69' or 'Up to 80% OFF')");
      return;
    }
    if (!slotImageUrl.trim()) {
      setErrorMessage("Image URL is required");
      return;
    }
    if (!slotDestinationUrl.trim()) {
      setErrorMessage("Destination URL is required");
      return;
    }

    setSavingSlot(true);
    setErrorMessage("");
    setStatusMessage("");

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
        setStatusMessage(`Slot #${activeSlotNumber} updated successfully!`);
        setActiveSlotNumber(null);
      } else {
        setErrorMessage(json.message || "Failed to save slot");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error saving slot");
    } finally {
      setSavingSlot(false);
    }
  };

  // Save campaign meta and publish status
  const handleSaveCampaign = async (newStatus?: "draft" | "published" | "paused") => {
    if (!campaign?.id) return;
    const targetStatus = newStatus || status;

    // Client-side pre-validation for publishing
    if (targetStatus === "published") {
      const incompleteSlots = slots.filter(
        (s) => !s.title?.trim() || !s.price_label?.trim() || !s.image_url?.trim() || !s.destination_url?.trim()
      );
      if (incompleteSlots.length > 0) {
        const slotNums = incompleteSlots.map((s) => `#${s.slot_number}`).join(", ");
        setErrorMessage(
          `Cannot publish: All 16 slots must be configured. Missing data in slot(s): ${slotNums}`
        );
        return;
      }
    }

    setSavingCampaign(true);
    setErrorMessage("");
    setStatusMessage("");

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
        setStatusMessage(
          targetStatus === "published"
            ? "🚀 Showcase successfully published live to Storefront & Mobile App!"
            : "Campaign settings saved successfully."
        );
      } else {
        setErrorMessage(json.message || "Failed to update campaign");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Network error updating campaign");
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
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="h-44 bg-zinc-900 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
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

        <div className="flex items-center gap-3">
          <button
            onClick={fetchCampaignData}
            className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-300 flex items-center gap-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <a
            href="http://localhost:3000"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-white flex items-center gap-1.5 transition"
          >
            <Eye className="w-3.5 h-3.5 text-zinc-400" />
            View Storefront
            <ExternalLink className="w-3 h-3 text-zinc-500" />
          </a>
        </div>
      </div>

      {/* Notifications */}
      {statusMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          {statusMessage}
        </div>
      )}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {errorMessage}
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
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-sm font-bold text-white focus:outline-none focus:border-amber-500"
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
                  {status.toUpperCase()}
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 self-end lg:self-center">
            <button
              onClick={() => handleSaveCampaign("draft")}
              disabled={savingCampaign}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-black uppercase tracking-wider text-zinc-300 transition"
            >
              Save Draft
            </button>
            <button
              onClick={() => handleSaveCampaign("published")}
              disabled={savingCampaign || completedSlotCount < 16}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg transition ${
                completedSlotCount === 16
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-amber-500/20 cursor-pointer"
                  : "bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed"
              }`}
            >
              <Flame className="w-4 h-4 fill-current" />
              Publish to Store (16/16)
            </button>
          </div>
        </div>

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
              className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-300 focus:outline-none focus:border-amber-500"
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
            16-Slot Interactive Merchandising Grid (Click any card to edit)
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
                className={`group relative p-3 rounded-2xl bg-zinc-950 border transition-all cursor-pointer hover:border-amber-500/80 hover:shadow-xl hover:shadow-amber-500/5 ${
                  isFilled ? "border-zinc-800" : "border-dashed border-zinc-800 bg-zinc-950/40"
                }`}
              >
                {/* Slot Number Badge */}
                <div className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-zinc-700 text-[10px] font-black text-amber-400">
                  SLOT #{slot.slot_number}
                </div>

                {/* Edit Icon Overlay on Hover */}
                <div className="absolute top-2.5 right-2.5 z-10 opacity-0 group-hover:opacity-100 transition p-1.5 rounded-lg bg-amber-500 text-black">
                  <Edit3 className="w-3.5 h-3.5" />
                </div>

                {/* Image Container */}
                <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-zinc-900 relative mb-3 border border-zinc-800">
                  {slot.image_url ? (
                    <Image
                      src={slot.image_url}
                      alt={slot.title || `Slot ${slot.slot_number}`}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 50vw, 25vw"
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="px-2.5 py-1 rounded-lg bg-amber-500 text-black font-black text-xs">
                  SLOT #{activeSlotNumber}
                </div>
                <h3 className="text-base font-black text-white uppercase">Configure Merchandising Card</h3>
              </div>
              <button
                onClick={() => setActiveSlotNumber(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveSlot} className="space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                  Card Category / Hook Title
                </label>
                <input
                  type="text"
                  value={slotTitle}
                  onChange={(e) => setSlotTitle(e.target.value)}
                  maxLength={40}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-sm font-bold text-white focus:outline-none focus:border-amber-500"
                  placeholder="e.g. Festive Lights, Silk Saree, Power Bank"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                  Price Floor / Discount Label
                </label>
                <input
                  type="text"
                  value={slotPriceLabel}
                  onChange={(e) => setSlotPriceLabel(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-sm font-bold text-white focus:outline-none focus:border-amber-500"
                  placeholder="e.g. From ₹69, Up to 80% OFF, From ₹2,499"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                  Card Image URL
                </label>
                <input
                  type="url"
                  value={slotImageUrl}
                  onChange={(e) => setSlotImageUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-mono text-zinc-300 focus:outline-none focus:border-amber-500 mb-2"
                  placeholder="https://images.unsplash.com/... or Supabase storage URL"
                />
                {/* Image Live Preview */}
                {slotImageUrl && (
                  <div className="w-24 h-24 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-700 relative">
                    <Image
                      src={slotImageUrl}
                      alt="Preview"
                      fill
                      className="object-cover"
                      sizes="96px"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                  Target Destination Link
                </label>
                {/* Category Preset Dropdown */}
                <select
                  value={slotDestinationUrl}
                  onChange={(e) => setSlotDestinationUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-xs font-bold text-white focus:outline-none focus:border-amber-500 mb-2"
                >
                  <option value="/categories">All Categories (/categories)</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={`/categories/${cat.slug}`}>
                      {cat.name} (/categories/{cat.slug})
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={slotDestinationUrl}
                  onChange={(e) => setSlotDestinationUrl(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-400"
                  placeholder="Custom destination URL"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setActiveSlotNumber(null)}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-400 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingSlot}
                  className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition shadow-lg shadow-amber-500/20"
                >
                  <Save className="w-4 h-4" />
                  {savingSlot ? "Saving..." : "Save Card"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
