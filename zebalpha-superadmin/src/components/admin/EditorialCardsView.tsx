"use client";

import { useState, useEffect } from "react";
import { supabaseB as supabase } from "@shared/utils/supabaseClient";
import {
  Plus,
  Trash2,
  Check,
  Upload,
  Sparkles,
  RefreshCw,
  Eye,
  EyeOff,
  Image as ImageIcon,
  ArrowUp,
  ArrowDown,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Link as LinkIcon,
  Tag,
  DollarSign
} from "lucide-react";
import { compressAndValidateWebPImage, uploadToSupabaseBucket } from "@shared/services/uploadService";

export interface EditorialCardRecord {
  id: string | number;
  title: string;
  category: string;
  price?: number;
  image_url: string;
  href: string;
  badge?: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
}

const DEFAULT_INITIAL_CARDS: EditorialCardRecord[] = [
  {
    id: "default-1",
    title: "OBSIDIAN OVERSIZED HEAVY TEE",
    category: "ZEBALPHA ESSENTIALS",
    price: 2499,
    image_url: "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=800&auto=format&fit=crop&q=80",
    href: "/products?category=oversized",
    badge: "EDITORIAL DROP",
    sort_order: 1,
    is_active: true,
  },
  {
    id: "default-2",
    title: "VINTAGE WASH ARCHIVAL FLEECE",
    category: "STREET EDIT",
    price: 4999,
    image_url: "https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=800&auto=format&fit=crop&q=80",
    href: "/products?category=hoodies",
    badge: "LIMITED EDITION",
    sort_order: 2,
    is_active: true,
  },
  {
    id: "default-3",
    title: "STRUCTURED MONOCHROME POLO",
    category: "PREMIUM ESSENTIALS",
    price: 3299,
    image_url: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800&auto=format&fit=crop&q=80",
    href: "/products?category=polos",
    badge: "CORE CAPSULE",
    sort_order: 3,
    is_active: true,
  },
  {
    id: "default-4",
    title: "UTILITY CARGO TROUSERS",
    category: "BOTTOMS & PANTS",
    price: 4499,
    image_url: "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=800&auto=format&fit=crop&q=80",
    href: "/products?category=bottoms",
    badge: "BESTSELLER",
    sort_order: 4,
    is_active: true,
  },
  {
    id: "default-5",
    title: "RAW DENIM OVERSIZED SHIRT",
    category: "LIMITED CAPSULE",
    price: 3899,
    image_url: "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&auto=format&fit=crop&q=80",
    href: "/products?category=shirts",
    badge: "DROP 02",
    sort_order: 5,
    is_active: true,
  },
];

export default function EditorialCardsView() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cards, setCards] = useState<EditorialCardRecord[]>([]);
  const [statusMessage, setStatusMessage] = useState("");

  // Form State for Add / Edit
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState<string>("");
  const [badge, setBadge] = useState("EDITORIAL DROP");
  const [href, setHref] = useState("/products");
  const [imageUrl, setImageUrl] = useState("");
  const [sortOrder, setSortOrder] = useState(1);
  const [isActive, setIsActive] = useState(true);

  // Compression & Upload status state
  const [uploadingImage, setUploadingImage] = useState(false);
  const [compressionInfo, setCompressionInfo] = useState<{
    originalSize: string;
    compressedSize: string;
    isWithinLimit: boolean;
  } | null>(null);

  const fetchEditorialCards = async () => {
    setLoading(true);
    try {
      // 1. Try querying dedicated Supabase table 'editorial_cards'
      const { data, error } = await supabase
        .from("editorial_cards")
        .select("*")
        .order("sort_order", { ascending: true });

      if (!error && data && data.length > 0) {
        setCards(data as EditorialCardRecord[]);
        setLoading(false);
        return;
      }

      // 2. Fallback: Query 'marketplace_settings' for key 'editorial_cards'
      const { data: settingData } = await supabase
        .from("marketplace_settings")
        .select("setting_value")
        .eq("setting_key", "editorial_cards")
        .maybeSingle();

      if (settingData?.setting_value) {
        const parsed = JSON.parse(settingData.setting_value);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCards(parsed);
          setLoading(false);
          return;
        }
      }

      // 3. Fallback to initial default cards
      setCards(DEFAULT_INITIAL_CARDS);
    } catch (e) {
      console.error("Notice loading editorial cards:", e);
      setCards(DEFAULT_INITIAL_CARDS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEditorialCards();
  }, []);

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setCompressionInfo(null);
    setStatusMessage("Compressing image to WebP <= 150 KB...");

    try {
      const origKb = (file.size / 1024).toFixed(1);

      // Perform <= 150 KB WebP compression
      const comp = await compressAndValidateWebPImage(file, 150);
      setCompressionInfo({
        originalSize: `${origKb} KB`,
        compressedSize: comp.sizeFormatted,
        isWithinLimit: comp.isWithinLimit,
      });

      // Upload WebP blob directly to Supabase Storage Bucket 'editorial-images' or 'product-images'
      const publicUrl = await uploadToSupabaseBucket(
        "editorial-images",
        comp.blob,
        `editorial_${Date.now()}.webp`
      );

      setImageUrl(publicUrl);
      setStatusMessage(`Image uploaded & WebP compressed to ${comp.sizeFormatted} (<= 150 KB Verified)`);
    } catch (err: any) {
      console.error("Upload error:", err);
      setStatusMessage("Failed to process image. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !imageUrl.trim()) {
      setStatusMessage("Title and Image URL are required.");
      return;
    }

    setSaving(true);
    setStatusMessage("Saving editorial card...");

    const parsedPrice = price ? parseFloat(price) : undefined;
    const cardData: Partial<EditorialCardRecord> = {
      title: title.trim().toUpperCase(),
      category: category.trim().toUpperCase() || "ZEBALPHA EDIT",
      price: parsedPrice,
      image_url: imageUrl.trim(),
      href: href.trim() || "/products",
      badge: badge.trim().toUpperCase() || "EDITORIAL DROP",
      sort_order: sortOrder || cards.length + 1,
      is_active: isActive,
    };

    try {
      let updatedCards: EditorialCardRecord[] = [];

      if (editingId) {
        // Edit existing
        updatedCards = cards.map((c) =>
          c.id === editingId ? { ...c, ...cardData } : c
        );
      } else {
        // Add new
        const newCard: EditorialCardRecord = {
          id: `card-${Date.now()}`,
          ...(cardData as any),
        };
        updatedCards = [...cards, newCard];
      }

      // Sort by sort_order
      updatedCards.sort((a, b) => a.sort_order - b.sort_order);

      // Save to Supabase table or marketplace_settings
      const { error: dbErr } = await supabase
        .from("editorial_cards")
        .upsert(updatedCards);

      if (dbErr) {
        // Fallback save to marketplace_settings
        await supabase
          .from("marketplace_settings")
          .upsert({
            setting_key: "editorial_cards",
            setting_value: JSON.stringify(updatedCards),
            updated_at: new Date().toISOString(),
          }, { onConflict: "setting_key" });
      }

      setCards(updatedCards);
      setStatusMessage("Editorial cards saved & homepage cache updated successfully!");
      resetForm();
    } catch (err: any) {
      console.error("Error saving card:", err);
      setStatusMessage("Failed to save editorial card. " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCard = async (id: string | number) => {
    if (!confirm("Are you sure you want to delete this editorial card?")) return;
    const updated = cards.filter((c) => c.id !== id);
    setCards(updated);

    try {
      await supabase.from("editorial_cards").delete().eq("id", id);
      await supabase.from("marketplace_settings").upsert({
        setting_key: "editorial_cards",
        setting_value: JSON.stringify(updated),
        updated_at: new Date().toISOString(),
      }, { onConflict: "setting_key" });

      setStatusMessage("Card deleted successfully.");
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleActive = async (card: EditorialCardRecord) => {
    const updated = cards.map((c) =>
      c.id === card.id ? { ...c, is_active: !c.is_active } : c
    );
    setCards(updated);

    try {
      await supabase
        .from("editorial_cards")
        .update({ is_active: !card.is_active })
        .eq("id", card.id);

      await supabase.from("marketplace_settings").upsert({
        setting_key: "editorial_cards",
        setting_value: JSON.stringify(updated),
        updated_at: new Date().toISOString(),
      }, { onConflict: "setting_key" });
    } catch (e) {
      console.error(e);
    }
  };

  const startEdit = (card: EditorialCardRecord) => {
    setEditingId(card.id);
    setTitle(card.title);
    setCategory(card.category);
    setPrice(card.price ? String(card.price) : "");
    setBadge(card.badge || "EDITORIAL DROP");
    setHref(card.href);
    setImageUrl(card.image_url);
    setSortOrder(card.sort_order);
    setIsActive(card.is_active);
    setCompressionInfo(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setCategory("");
    setPrice("");
    setBadge("EDITORIAL DROP");
    setHref("/products");
    setImageUrl("");
    setSortOrder(cards.length + 1);
    setIsActive(true);
    setCompressionInfo(null);
  };

  return (
    <div className="space-y-8 p-4 sm:p-6 bg-black text-white min-h-screen">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-rose-950/80 border border-rose-800/60 text-[10px] font-black uppercase tracking-[0.25em] text-rose-300">
              EDITORIAL MANAGER
            </span>
            <span className="text-xs font-mono text-zinc-500">WOVEN TO BE REMEMBERED</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mt-1">
            Curved Fashion Cards Manager
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
            Upload and configure high-fashion editorial cards for the homepage curved carousel. Supports auto WebP compression (≤ 150 KB) and real-time customer cache update.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchEditorialCards}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs font-bold text-zinc-200 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {statusMessage && (
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-700 text-xs font-medium text-emerald-400 flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage("")} className="text-zinc-500 hover:text-white">✕</button>
        </div>
      )}

      {/* Stats overview bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">Active Cards</span>
          <span className="text-2xl font-black text-white">{cards.filter(c => c.is_active).length}</span>
        </div>
        <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">Max Image Limit</span>
          <span className="text-2xl font-black text-rose-400">≤ 150 KB</span>
        </div>
        <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">Format</span>
          <span className="text-2xl font-black text-emerald-400">WebP</span>
        </div>
        <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest block">Storage Bucket</span>
          <span className="text-xs font-bold text-zinc-300">editorial-images</span>
        </div>
      </div>

      {/* Main Grid: Add/Edit Form + Card Gallery */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-5 bg-zinc-950 border border-zinc-800 rounded-3xl p-6 h-fit space-y-5">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
            <h2 className="text-base font-black uppercase text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-rose-400" />
              <span>{editingId ? "Edit Editorial Card" : "Add New Editorial Card"}</span>
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-bold text-zinc-400 hover:text-white"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSaveCard} className="space-y-4">
            {/* Image Upload Box */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                <span>Fashion Card Image (≤ 150 KB WebP)</span>
                {compressionInfo && (
                  <span className={`text-[10px] font-mono font-bold ${compressionInfo.isWithinLimit ? "text-emerald-400" : "text-rose-400"}`}>
                    {compressionInfo.originalSize} → {compressionInfo.compressedSize} {compressionInfo.isWithinLimit ? "✓" : "⚠️"}
                  </span>
                )}
              </label>

              <div className="relative border-2 border-dashed border-zinc-800 hover:border-zinc-600 rounded-2xl p-4 bg-zinc-900/60 text-center flex flex-col items-center justify-center transition-colors cursor-pointer min-h-[140px]">
                {imageUrl ? (
                  <div className="relative w-full h-36 rounded-xl overflow-hidden border border-zinc-700">
                    {/* eslint-disable-next-html-extension */}
                    <img src={imageUrl} alt="Card preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImageUrl("")}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/80 text-white hover:bg-rose-600 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-4">
                    <Upload className={`w-8 h-8 text-zinc-500 mb-2 ${uploadingImage ? "animate-bounce" : ""}`} />
                    <span className="text-xs font-bold text-zinc-300">
                      {uploadingImage ? "Compressing & Uploading..." : "Click or Drag to Upload Fashion Image"}
                    </span>
                    <span className="text-[10px] text-zinc-500 mt-1">
                      Auto WebP compression & ≤ 150 KB validation applied
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageFileChange}
                      disabled={uploadingImage}
                    />
                  </label>
                )}
              </div>

              {/* Or Direct Image URL input */}
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Or paste image URL (https://...)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
              />
            </div>

            {/* Title */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300">Card Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. OBSIDIAN OVERSIZED TEE"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-extrabold uppercase text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
              />
            </div>

            {/* Category & Badge Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Category Tag</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. ZEBALPHA ESSENTIALS"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold uppercase text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Badge Label</label>
                <input
                  type="text"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  placeholder="e.g. EDITORIAL DROP"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold uppercase text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
                />
              </div>
            </div>

            {/* Price & Target Link Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Price (₹)</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 2499"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Target Link URL</label>
                <input
                  type="text"
                  value={href}
                  onChange={(e) => setHref(e.target.value)}
                  placeholder="/products?category=oversized"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
                />
              </div>
            </div>

            {/* Sort Order & Active */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Sort Position</label>
                <input
                  type="number"
                  min={1}
                  value={sortOrder}
                  onChange={(e) => setSortOrder(parseInt(e.target.value) || 1)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-white"
                />
              </div>

              <div className="space-y-1 flex flex-col justify-end">
                <label className="flex items-center gap-2 cursor-pointer pb-2">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded accent-rose-600"
                  />
                  <span className="text-xs font-bold text-zinc-300">Active Status</span>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={saving || uploadingImage}
              className="w-full py-3.5 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-widest hover:bg-zinc-200 transition-colors shadow-lg active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Saving Card..." : editingId ? "Update Editorial Card" : "Save Editorial Card"}
            </button>
          </form>
        </div>

        {/* Gallery / List Column */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
            <h2 className="text-sm font-black uppercase text-zinc-300 tracking-wider">
              Configured Editorial Cards ({cards.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {cards.map((card, idx) => (
              <div
                key={card.id || idx}
                className={`group relative rounded-3xl bg-zinc-950 border overflow-hidden p-4 space-y-3 transition-all ${
                  card.is_active ? "border-zinc-800 hover:border-zinc-600" : "border-zinc-900 opacity-60"
                }`}
              >
                {/* Image Cover */}
                <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800">
                  {/* eslint-disable-next-html-extension */}
                  <img
                    src={card.image_url}
                    alt={card.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md text-[9px] font-black uppercase text-zinc-300">
                      {card.badge || card.category}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-white text-black font-black text-[9px]">
                      #{card.sort_order}
                    </span>
                  </div>
                </div>

                {/* Info Block */}
                <div>
                  <span className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-widest block">
                    {card.category}
                  </span>
                  <h3 className="text-xs font-black uppercase text-white truncate">{card.title}</h3>
                  <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1">
                    {card.price !== undefined && <span>₹{card.price.toLocaleString("en-IN")}</span>}
                    <span className="font-mono text-[9px] text-zinc-500 truncate max-w-[120px]">{card.href}</span>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-900">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(card)}
                    className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider ${
                      card.is_active ? "text-emerald-400" : "text-zinc-500"
                    }`}
                  >
                    {card.is_active ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    <span>{card.is_active ? "Active" : "Disabled"}</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => startEdit(card)}
                      className="p-1.5 rounded-lg bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors"
                      title="Edit Card"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCard(card.id)}
                      className="p-1.5 rounded-lg bg-zinc-900 text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 transition-colors"
                      title="Delete Card"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
