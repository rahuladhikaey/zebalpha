"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Plus,
  Edit,
  Trash2,
  Eye,
  Play,
  Pause,
  Calendar,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
  Smartphone,
  Monitor,
  ArrowUpDown,
  Search,
  Check
} from "lucide-react";
import { SelectProductsComponent } from "./spotlight/SelectProductsComponent";
import { SpotlightPreviewModal } from "./spotlight/SpotlightPreviewModal";
import type {
  SpotlightCampaign,
  SpotlightEditorialCard,
  SpotlightSelectedItem
} from "@/types/spotlight";

export default function SpotlightManagerView() {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<SpotlightCampaign[]>([]);
  const [activeCampaign, setActiveCampaign] = useState<SpotlightCampaign | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Data for Select Products Picker
  const [sellerProducts, setSellerProducts] = useState<any[]>([]);
  const [editorialCards, setEditorialCards] = useState<SpotlightEditorialCard[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Selected cards for the currently editing campaign
  const [selectedCards, setSelectedCards] = useState<SpotlightSelectedItem[]>([]);
  const [isPickerActive, setIsPickerActive] = useState(false);
  const [savingCards, setSavingCards] = useState(false);

  // Campaign Settings Modal
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [campaignForm, setCampaignForm] = useState<{
    id?: string;
    name: string;
    description: string;
    theme: string;
    category_scope: string;
    max_cards: number;
    required_cards: number;
    default_sort: "popular" | "newest" | "price_asc" | "price_desc";
    starts_at: string;
    ends_at: string;
    display_order: number;
    website_enabled: boolean;
    android_enabled: boolean;
  }>({
    name: "",
    description: "",
    theme: "default",
    category_scope: "all",
    max_cards: 16,
    required_cards: 16,
    default_sort: "popular",
    starts_at: "",
    ends_at: "",
    display_order: 0,
    website_enabled: true,
    android_enabled: true,
  });

  // Preview Modal State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Fetch all initial data
  const loadData = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const [campRes, prodRes, editRes, catRes] = await Promise.all([
        fetch("/api/admin/spotlight/campaigns").then((r) => r.json()).catch(() => ({ data: [] })),
        fetch("/api/admin/products").then((r) => r.json()).catch(() => ({ data: [] })),
        fetch("/api/admin/spotlight/editorial-cards").then((r) => r.json()).catch(() => ({ data: [] })),
        fetch("/api/admin/categories").then((r) => r.json()).catch(() => ({ data: [] })),
      ]);

      if (campRes.success && Array.isArray(campRes.data)) {
        setCampaigns(campRes.data);
      }
      if (prodRes.success && Array.isArray(prodRes.data)) {
        setSellerProducts(prodRes.data);
      }
      if (editRes.success && Array.isArray(editRes.data)) {
        setEditorialCards(editRes.data);
      }
      if (catRes.success && Array.isArray(catRes.data)) {
        setCategories(catRes.data);
      }
    } catch (err: any) {
      console.error("[Spotlight Data Load Error]:", err);
      setErrorMessage("Failed to load Spotlight Manager data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const refreshEditorialCards = async () => {
    try {
      const res = await fetch("/api/admin/spotlight/editorial-cards");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setEditorialCards(json.data);
      }
    } catch (_) {}
  };

  // Open Campaign Picker to edit its 16 items
  const handleEditItems = async (campaign: SpotlightCampaign) => {
    setActiveCampaign(campaign);
    setStatusMessage(`Loading items for "${campaign.name}"...`);
    try {
      const res = await fetch(`/api/admin/spotlight/campaigns/${campaign.id}`);
      const json = await res.json();
      if (json.success && json.data) {
        const fullCamp = json.data;
        const mappedItems: SpotlightSelectedItem[] = (fullCamp.items || []).map((it: any) => {
          if (it.card_type === "seller_product") {
            const p = it.product;
            return {
              uniqueKey: `seller_product:${it.product_id}`,
              cardType: "seller_product",
              productId: it.product_id,
              title: p?.name || "Product",
              subtitle: p?.seller_name || p?.brand || "Seller",
              image: p?.image || "/official-logo.png",
              price: p?.price,
              destinationUrl: `/products/${it.product_id}`,
              badge: "SELLER PRODUCT",
            };
          } else {
            const e = it.editorial_card;
            return {
              uniqueKey: `editorial:${it.editorial_card_id}`,
              cardType: "editorial",
              editorialCardId: it.editorial_card_id,
              title: e?.title || "Editorial Card",
              subtitle: e?.subtitle || undefined,
              image: e?.image_url || "/official-logo.png",
              fromPrice: (e?.price_mode === "manual" ? e?.manual_from_price : e?.calculated_from_price) || undefined,
              destinationUrl: e?.destination_url || "/categories",
              badge: "ADMIN EDITORIAL",
            };
          }
        });
        setSelectedCards(mappedItems);
        setIsPickerActive(true);
        setStatusMessage("");
      }
    } catch (err: any) {
      setErrorMessage("Failed to fetch campaign items: " + err.message);
    }
  };

  // Save selected cards for the active campaign
  const handleSaveSelectedCards = async () => {
    if (!activeCampaign) return;
    setSavingCards(true);
    setStatusMessage("Persisting card selection & display order...");
    setErrorMessage("");

    try {
      const payloadItems = selectedCards.map((card, idx) => ({
        card_type: card.cardType,
        product_id: card.cardType === "seller_product" ? card.productId : null,
        editorial_card_id: card.cardType === "editorial" ? card.editorialCardId : null,
        display_order: idx,
      }));

      const res = await fetch(`/api/admin/spotlight/campaigns/${activeCampaign.id}/items`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: payloadItems }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.message || "Failed to save campaign cards");

      setStatusMessage(`✓ Successfully saved ${selectedCards.length} cards for "${activeCampaign.name}".`);
      await loadData();
    } catch (err: any) {
      setErrorMessage("Failed to save selection: " + err.message);
    } finally {
      setSavingCards(false);
    }
  };

  // Publish Campaign
  const handlePublishCampaign = async (campaignId: string) => {
    setStatusMessage("Validating and publishing campaign...");
    setErrorMessage("");
    try {
      // First save items if current active
      if (activeCampaign?.id === campaignId && selectedCards.length > 0) {
        await handleSaveSelectedCards();
      }

      const res = await fetch(`/api/admin/spotlight/campaigns/${campaignId}/publish`, {
        method: "POST",
      });
      const json = await res.json();
      if (!json.success) {
        throw new Error(json.message || "Publish validation failed");
      }

      setStatusMessage(`✓ Campaign published! Live on Web & Android immediately.`);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to publish campaign.");
    }
  };

  // Pause / Resume Campaign
  const handleToggleStatus = async (campaign: SpotlightCampaign) => {
    const nextStatus = campaign.status === "published" ? "paused" : "published";
    try {
      const res = await fetch(`/api/admin/spotlight/campaigns/${campaign.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      setStatusMessage(`✓ Campaign "${campaign.name}" is now ${nextStatus.toUpperCase()}.`);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update campaign status.");
    }
  };

  // Delete / Archive Campaign
  const handleDeleteCampaign = async (campaign: SpotlightCampaign) => {
    if (!confirm(`Are you sure you want to delete campaign "${campaign.name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/spotlight/campaigns/${campaign.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.message);

      setStatusMessage(`Campaign "${campaign.name}" deleted.`);
      if (activeCampaign?.id === campaign.id) {
        setIsPickerActive(false);
        setActiveCampaign(null);
      }
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to delete campaign.");
    }
  };

  // Open Campaign Form (Create or Edit)
  const openCampaignModal = (camp?: SpotlightCampaign) => {
    if (camp) {
      setCampaignForm({
        id: camp.id,
        name: camp.name,
        description: camp.description || "",
        theme: camp.theme || "default",
        category_scope: camp.category_scope || "all",
        max_cards: camp.max_cards || 16,
        required_cards: camp.required_cards || 16,
        default_sort: camp.default_sort || "popular",
        starts_at: camp.starts_at ? camp.starts_at.slice(0, 16) : "",
        ends_at: camp.ends_at ? camp.ends_at.slice(0, 16) : "",
        display_order: camp.display_order || 0,
        website_enabled: camp.website_enabled ?? true,
        android_enabled: camp.android_enabled ?? true,
      });
    } else {
      setCampaignForm({
        name: "",
        description: "",
        theme: "default",
        category_scope: "all",
        max_cards: 16,
        required_cards: 16,
        default_sort: "popular",
        starts_at: "",
        ends_at: "",
        display_order: campaigns.length,
        website_enabled: true,
        android_enabled: true,
      });
    }
    setIsCampaignModalOpen(true);
  };

  // Submit Campaign Form
  const handleCampaignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignForm.name.trim()) {
      setErrorMessage("Campaign name is required.");
      return;
    }

    try {
      if (campaignForm.id) {
        // Update
        const res = await fetch(`/api/admin/spotlight/campaigns/${campaignForm.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(campaignForm),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        setStatusMessage(`Campaign "${campaignForm.name}" updated successfully.`);
      } else {
        // Create
        const res = await fetch("/api/admin/spotlight/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(campaignForm),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.message);
        setStatusMessage(`Campaign "${campaignForm.name}" created.`);
      }
      setIsCampaignModalOpen(false);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to save campaign.");
    }
  };

  return (
    <div className="space-y-8 p-4 sm:p-6 bg-black text-white min-h-screen">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] font-black uppercase tracking-[0.25em] text-white">
              SPOTLIGHT MANAGER
            </span>
            <span className="text-xs font-mono text-zinc-500">HOMEPAGE PLACEMENT: AFTER WOVEN TO BE REMEMBERED</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mt-1">
            Spotlight Campaigns Dashboard
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
            Create, manage, preview, schedule, and publish promotional campaigns (Top Deals, Brand Spotlight, Festive Specials). Features unified 16-card selection across Seller Products and Admin Editorial Cards with verified From Prices.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs font-bold text-zinc-300 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => openCampaignModal()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white hover:bg-zinc-200 text-black text-xs font-black uppercase tracking-wider transition shadow-lg shadow-white/10 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Campaign</span>
          </button>
        </div>
      </div>

      {/* 2. Notifications */}
      {statusMessage && (
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-emerald-800/80 text-xs font-medium text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage("")} className="text-zinc-500 hover:text-white">✕</button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-rose-800/80 text-xs font-medium text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage("")} className="text-zinc-500 hover:text-white">✕</button>
        </div>
      )}

      {/* 3. CAMPAIGNS OVERVIEW TABLE */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-black uppercase tracking-wider text-white">
              All Spotlight Campaigns ({campaigns.length})
            </h2>
            <span className="text-[10px] text-zinc-500 font-mono">
              Displayed on Website & Android in configured order
            </span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-zinc-500 font-mono text-xs">
            Loading campaigns...
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/40">
            <p className="text-xs font-bold text-zinc-400">No Spotlight campaigns found.</p>
            <button
              onClick={() => openCampaignModal()}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-black text-xs font-black uppercase tracking-wider"
            >
              <Plus className="w-4 h-4" />
              <span>Create Top Deals Campaign</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map((camp) => {
              const isSelectedForEdit = activeCampaign?.id === camp.id && isPickerActive;
              const hasCards = (camp.itemCount || 0) > 0;
              const isReady = (camp.itemCount || 0) === (camp.required_cards || 16);

              return (
                <div
                  key={camp.id}
                  className={`rounded-3xl border p-5 space-y-4 transition-all relative ${
                    isSelectedForEdit
                      ? "border-white bg-white/5 ring-2 ring-white/20 shadow-2xl"
                      : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"
                  }`}
                >
                  {/* Status & Order Bar */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                        camp.status === "published"
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : camp.status === "paused"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                      }`}
                    >
                      ● {camp.status}
                    </span>

                    <div className="flex items-center gap-2 text-[10px] font-mono text-zinc-400">
                      <span>Order #{camp.display_order}</span>
                      <span className="text-zinc-600">|</span>
                      <span>
                        Cards: <strong className={isReady ? "text-emerald-400" : "text-white"}>{camp.itemCount ?? 0}/{camp.required_cards ?? 16}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Campaign Name & Description */}
                  <div>
                    <h3 className="text-base font-black uppercase text-white truncate">{camp.name}</h3>
                    <p className="text-xs text-zinc-400 line-clamp-2 mt-1">
                      {camp.description || "Curated showcase for homepage placement"}
                    </p>
                  </div>

                  {/* Platform Visibility */}
                  <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-400">
                    <span className={camp.website_enabled ? "text-emerald-400" : "text-zinc-600 line-through"}>
                      ✓ Website
                    </span>
                    <span className={camp.android_enabled ? "text-emerald-400" : "text-zinc-600 line-through"}>
                      ✓ Android App
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80 gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditItems(camp)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                        isSelectedForEdit
                          ? "bg-white text-black font-extrabold"
                          : "bg-zinc-800 hover:bg-zinc-700 text-white"
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>{isSelectedForEdit ? "Editing Cards" : "Select Cards"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleStatus(camp)}
                      className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                      title={camp.status === "published" ? "Pause Campaign" : "Resume / Publish Campaign"}
                    >
                      {camp.status === "published" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => openCampaignModal(camp)}
                      className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
                      title="Edit Campaign Settings"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteCampaign(camp)}
                      className="p-2 rounded-xl bg-zinc-800 hover:bg-rose-950 text-rose-400 transition"
                      title="Delete Campaign"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Ready to Publish Action Bar if Draft / Incomplete */}
                  {camp.status !== "published" && (
                    <button
                      type="button"
                      onClick={() => handlePublishCampaign(camp.id)}
                      className="w-full py-2.5 rounded-xl bg-white text-black font-black text-xs uppercase tracking-wider hover:bg-zinc-200 transition shadow-md"
                    >
                      Publish Campaign
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. ACTIVE CAMPAIGN WORKSPACE (SELECT PRODUCTS COMPONENT) */}
      {isPickerActive && activeCampaign && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-white text-black text-[10px] font-black uppercase">
                  ACTIVE EDITOR
                </span>
                <span className="text-xs font-mono text-zinc-400">
                  CAMPAIGN: <strong className="text-white">{activeCampaign.name}</strong>
                </span>
              </div>
              <h2 className="text-xl font-black uppercase tracking-tight text-white mt-1">
                Unified Card Selection & Ordering
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPreviewOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs font-bold text-white transition"
              >
                <Eye className="w-4 h-4" />
                <span>Preview (Web / App)</span>
              </button>

              <button
                type="button"
                onClick={handleSaveSelectedCards}
                disabled={savingCards}
                className="px-5 py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-black uppercase tracking-wider transition"
              >
                {savingCards ? "Saving..." : "Save Draft"}
              </button>

              <button
                type="button"
                onClick={() => handlePublishCampaign(activeCampaign.id)}
                className="px-6 py-2.5 rounded-2xl bg-white hover:bg-zinc-200 text-black text-xs font-black uppercase tracking-wider transition shadow-lg shadow-white/10"
              >
                Publish Now
              </button>
            </div>
          </div>

          {/* Upgraded Select Products Component with Three Tabs */}
          <SelectProductsComponent
            maxCards={activeCampaign.max_cards || 16}
            selectedCards={selectedCards}
            onChangeSelected={setSelectedCards}
            sellerProducts={sellerProducts}
            editorialCards={editorialCards}
            categories={categories}
            onRefreshEditorialCards={refreshEditorialCards}
          />
        </div>
      )}

      {/* 5. CAMPAIGN SETTINGS MODAL */}
      {isCampaignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-lg p-6 space-y-5 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-black uppercase text-white">
                {campaignForm.id ? "Edit Campaign Settings" : "Create Spotlight Campaign"}
              </h3>
              <button
                onClick={() => setIsCampaignModalOpen(false)}
                className="text-zinc-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCampaignSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Campaign Name</label>
                <input
                  type="text"
                  value={campaignForm.name}
                  onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                  placeholder="e.g. Top Deals, Festive Specials"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-white focus:outline-none focus:border-white"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Description</label>
                <textarea
                  value={campaignForm.description}
                  onChange={(e) => setCampaignForm({ ...campaignForm, description: e.target.value })}
                  placeholder="Brief description for customer view..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-medium text-white focus:outline-none focus:border-white"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">Max Cards</label>
                  <input
                    type="number"
                    min={1}
                    max={32}
                    value={campaignForm.max_cards}
                    onChange={(e) =>
                      setCampaignForm({ ...campaignForm, max_cards: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">Required to Publish</label>
                  <input
                    type="number"
                    min={0}
                    max={32}
                    value={campaignForm.required_cards}
                    onChange={(e) =>
                      setCampaignForm({ ...campaignForm, required_cards: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">Start Date (Optional)</label>
                  <input
                    type="datetime-local"
                    value={campaignForm.starts_at}
                    onChange={(e) => setCampaignForm({ ...campaignForm, starts_at: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-300">End Date (Optional)</label>
                  <input
                    type="datetime-local"
                    value={campaignForm.ends_at}
                    onChange={(e) => setCampaignForm({ ...campaignForm, ends_at: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={campaignForm.website_enabled}
                    onChange={(e) =>
                      setCampaignForm({ ...campaignForm, website_enabled: e.target.checked })
                    }
                    className="w-4 h-4 rounded accent-white"
                  />
                  <span className="text-xs font-bold text-zinc-300">Website Visible</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={campaignForm.android_enabled}
                    onChange={(e) =>
                      setCampaignForm({ ...campaignForm, android_enabled: e.target.checked })
                    }
                    className="w-4 h-4 rounded accent-white"
                  />
                  <span className="text-xs font-bold text-zinc-300">Android App Visible</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsCampaignModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-white text-black font-black text-xs uppercase tracking-wider hover:bg-zinc-200"
                >
                  Save Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. PREVIEW MODAL */}
      <SpotlightPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        campaignName={activeCampaign?.name || "Top Deals"}
        theme={activeCampaign?.theme || "default"}
        selectedCards={selectedCards}
      />
    </div>
  );
}
