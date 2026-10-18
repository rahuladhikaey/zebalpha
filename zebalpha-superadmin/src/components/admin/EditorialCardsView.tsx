"use client";

import { useState, useEffect } from "react";
import {
  Plus,
  Trash2,
  Upload,
  Sparkles,
  RefreshCw,
  Eye,
  EyeOff,
  Edit2,
  AlertCircle
} from "lucide-react";

export interface EditorialCardRecord {
  id: string | number;
  title: string;
  category?: string;
  price?: number;
  image_url: string;
  href?: string;
  badge?: string;
  display_order: number;
  sort_order?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

const MAX_IMAGE_SIZE_BYTES = 95 * 1024; // Strictly 95 KB PER IMAGE
const ALLOWED_IMAGE_TYPES = ["image/webp", "image/jpeg", "image/png"];

export default function EditorialCardsView() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cards, setCards] = useState<EditorialCardRecord[]>([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState<string>("");
  const [badge, setBadge] = useState("EDITORIAL DROP");
  const [href, setHref] = useState("/products");
  const [imageUrl, setImageUrl] = useState("");
  const [displayOrder, setDisplayOrder] = useState(1);
  const [isActive, setIsActive] = useState(true);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadedFileInfo, setUploadedFileInfo] = useState<{
    fileSizeFormatted: string;
    filePath?: string;
    isVerified: boolean;
  } | null>(null);
  const [previousImageUrl, setPreviousImageUrl] = useState<string | null>(null);
  const [previousFilePath, setPreviousFilePath] = useState<string | null>(null);

  const fetchEditorialCards = async () => {
    setLoading(true);
    setErrorMessage("");
    try {
      const res = await fetch("/api/admin/editorial-cards");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setCards(json.data);
        if (!editingId) {
          setDisplayOrder(json.data.length + 1);
        }
      } else {
        setCards([]);
      }
    } catch (e: any) {
      console.error("Notice loading editorial cards:", e);
      setErrorMessage("Failed to fetch editorial cards from database.");
      setCards([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEditorialCards();
  }, []);

  // Strict Client-Side 120 KB & Type Validation BEFORE Upload
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatusMessage("");
    setErrorMessage("");

    // 1. Strict File Size Validation (<= 95 KB)
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      const actualKb = (file.size / 1024).toFixed(1);
      setErrorMessage(`Image must be 95 KB or smaller. (Selected: ${actualKb} KB). Upload rejected.`);
      e.target.value = "";
      return;
    }

    // 2. Strict MIME Type Validation (WebP, JPEG, PNG)
    const fileType = file.type.toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.includes(fileType)) {
      setErrorMessage(`Invalid format. Accepted: WebP / JPEG / PNG. (Provided: ${fileType || "unknown"}).`);
      e.target.value = "";
      return;
    }

    // 3. Client-Side Image Dimension Validation (Ensure valid image)
    try {
      await new Promise<void>((resolve, reject) => {
        const testImg = new Image();
        testImg.src = URL.createObjectURL(file);
        testImg.onload = () => {
          URL.revokeObjectURL(testImg.src);
          resolve();
        };
        testImg.onerror = () => {
          URL.revokeObjectURL(testImg.src);
          reject(new Error("Corrupted or invalid image file."));
        };
      });
    } catch (dimErr: any) {
      setErrorMessage(dimErr.message || "Failed to parse image.");
      e.target.value = "";
      return;
    }

    // 4. Proceed with server upload
    setUploadingImage(true);
    setStatusMessage("Uploading and verifying editorial image on server...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("section", "woven");

      const res = await fetch("/api/admin/homepage-media/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || "Server upload validation failed.");
      }

      if (imageUrl && imageUrl !== data.publicUrl) {
        setPreviousImageUrl(imageUrl);
      }

      setImageUrl(data.publicUrl);
      setUploadedFileInfo({
        fileSizeFormatted: data.formattedSize,
        filePath: data.filePath,
        isVerified: true,
      });
      setStatusMessage(`✓ Verified image uploaded (${data.formattedSize} ≤ 95 KB)`);
    } catch (err: any) {
      console.error("Upload error:", err);
      setErrorMessage(err.message || "Upload failed. Image rejected.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageUrl.trim()) {
      setErrorMessage("A verified Image (≤ 95 KB) is required. Please select and upload an image.");
      return;
    }

    setSaving(true);
    setStatusMessage("Saving editorial card...");
    setErrorMessage("");

    const parsedPrice = price !== "" ? parseFloat(price) : null;
    const effectiveTitle = title.trim() || category.trim() || "ZEBALPHA EDIT";
    const cardData = {
      title: effectiveTitle.toUpperCase(),
      category: category.trim().toUpperCase() || "ZEBALPHA EDIT",
      price: parsedPrice,
      image_url: imageUrl.trim(),
      href: href.trim() || "/products",
      badge: badge.trim().toUpperCase() || "EDITORIAL DROP",
      display_order: Number(displayOrder) || cards.length + 1,
      is_active: isActive,
    };

    try {
      if (editingId) {
        const res = await fetch("/api/admin/editorial-cards", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingId, updates: cardData }),
        });
        const resJson = await res.json();
        if (!resJson.success) throw new Error(resJson.message || "Failed to update card");

        // DELETE / REPLACE SAFETY: Clean old image from storage only AFTER DB update succeeded
        if (previousFilePath) {
          fetch("/api/admin/homepage-media/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filePath: previousFilePath }),
          }).catch(() => {});
        }
      } else {
        const res = await fetch("/api/admin/editorial-cards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cardData),
        });
        const resJson = await res.json();
        if (!resJson.success) throw new Error(resJson.message || "Failed to save card");
      }

      setStatusMessage("Editorial cards saved & customer homepage updated successfully!");
      resetForm();
      await fetchEditorialCards();
    } catch (err: any) {
      console.error("Error saving card:", err);
      setErrorMessage("Failed to save editorial card: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCard = async (id: string | number, currentImgUrl?: string) => {
    if (!confirm("Are you sure you want to delete this editorial card?")) return;

    try {
      const res = await fetch(`/api/admin/editorial-cards?id=${id}`, {
        method: "DELETE",
      });
      const resJson = await res.json();
      if (!resJson.success) throw new Error(resJson.message || "Delete failed");

      // Clean storage safely if in dedicated folder
      if (currentImgUrl && currentImgUrl.includes("homepage/woven/")) {
        const parts = currentImgUrl.split("homepage/woven/");
        if (parts[1]) {
          fetch("/api/admin/homepage-media/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filePath: `homepage/woven/${parts[1]}` }),
          }).catch(() => {});
        }
      }

      setStatusMessage("Editorial card deleted successfully.");
      await fetchEditorialCards();
    } catch (e: any) {
      console.error("Delete error:", e);
      setErrorMessage(e.message || "Failed to delete card.");
    }
  };

  const handleToggleActive = async (card: EditorialCardRecord) => {
    try {
      const newActive = !card.is_active;
      const res = await fetch("/api/admin/editorial-cards", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: card.id, updates: { is_active: newActive } }),
      });
      const resJson = await res.json();
      if (!resJson.success) throw new Error(resJson.message || "Toggle failed");

      setCards((prev) =>
        prev.map((c) => (c.id === card.id ? { ...c, is_active: newActive } : c))
      );
      setStatusMessage(`Card "${card.title}" is now ${newActive ? "Active" : "Disabled"}.`);
    } catch (e: any) {
      console.error("Status toggle error:", e);
      setErrorMessage(e.message || "Failed to toggle status.");
    }
  };

  const startEdit = (card: EditorialCardRecord) => {
    setEditingId(card.id);
    setTitle(card.title);
    setCategory(card.category || "");
    setPrice(card.price !== undefined && card.price !== null ? String(card.price) : "");
    setBadge(card.badge || "EDITORIAL DROP");
    setHref(card.href || "/products");
    setImageUrl(card.image_url);
    setDisplayOrder(card.display_order ?? card.sort_order ?? 1);
    setIsActive(card.is_active);
    setUploadedFileInfo({
      fileSizeFormatted: "Verified",
      isVerified: true,
    });
    setPreviousImageUrl(card.image_url);
    if (card.image_url.includes("homepage/woven/")) {
      const parts = card.image_url.split("homepage/woven/");
      setPreviousFilePath(parts[1] ? `homepage/woven/${parts[1]}` : null);
    }
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
    setDisplayOrder(cards.length + 1);
    setIsActive(true);
    setUploadedFileInfo(null);
    setPreviousImageUrl(null);
    setPreviousFilePath(null);
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
            <span className="text-xs font-mono text-zinc-500">WOVEN TO BE REMEMBERED (3:4 RATIO)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white mt-1">
            Woven Editorial Cards Manager
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
            Upload and configure high-fashion editorial cards for the homepage curved carousel. Enforces strict ≤ 95 KB validation, WebP/JPEG/PNG format check, and zero fake demo content.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchEditorialCards}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs font-bold text-zinc-200 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Status Notifications */}
      {statusMessage && (
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-emerald-800/60 text-xs font-medium text-emerald-400 flex items-center justify-between">
          <span>{statusMessage}</span>
          <button onClick={() => setStatusMessage("")} className="text-zinc-500 hover:text-white">✕</button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-zinc-900/90 border border-rose-800/60 text-xs font-medium text-rose-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage("")} className="text-zinc-500 hover:text-white">✕</button>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Column */}
        <div className="lg:col-span-5 bg-zinc-950 border border-zinc-800 rounded-3xl p-6 h-fit space-y-5">
          <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
            <h2 className="text-base font-black uppercase text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-rose-400" />
              <span>{editingId ? "Edit Woven Card" : "Add Woven Editorial Card"}</span>
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-xs font-bold text-zinc-400 hover:text-white cursor-pointer"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSaveCard} className="space-y-4">
            {/* Image Upload Box with Strict 95 KB Limit */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-300">
                  Image: [ Upload ]
                </label>
                <span className="text-[10px] font-mono text-zinc-400">
                  Maximum: <strong className="text-amber-300">95 KB</strong>
                </span>
              </div>

              <div className="relative border-2 border-dashed border-zinc-800 hover:border-zinc-600 rounded-2xl p-4 bg-zinc-900/60 text-center flex flex-col items-center justify-center transition-colors min-h-[160px]">
                {imageUrl ? (
                  <div className="relative w-28 h-36 rounded-xl overflow-hidden border border-zinc-700 aspect-[3/4]">
                    <img src={imageUrl} alt="Card preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setImageUrl("");
                        setUploadedFileInfo(null);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/80 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                      title="Remove / Replace Image"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {uploadedFileInfo && (
                      <div className="absolute bottom-2 left-2 right-2 bg-black/80 backdrop-blur-md rounded-md px-1.5 py-0.5 text-[9px] font-mono text-emerald-400 truncate">
                        ✓ {uploadedFileInfo.fileSizeFormatted}
                      </div>
                    )}
                  </div>
                ) : (
                  <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-4">
                    <Upload className={`w-8 h-8 text-zinc-500 mb-2 ${uploadingImage ? "animate-bounce" : ""}`} />
                    <span className="text-xs font-bold text-zinc-300">
                      {uploadingImage ? "Validating & Uploading..." : "Click to Upload Editorial Image"}
                    </span>
                    <span className="text-[10px] text-zinc-400 mt-1">
                      Maximum: <strong>95 KB</strong>
                    </span>
                    <span className="text-[10px] text-zinc-500">
                      Accepted: <strong>WebP / JPEG / PNG</strong> (3:4 Aspect Ratio)
                    </span>
                    <input
                      type="file"
                      accept=".webp,.jpg,.jpeg,.png,image/webp,image/jpeg,image/png"
                      className="hidden"
                      onChange={handleImageFileChange}
                      disabled={uploadingImage}
                    />
                  </label>
                )}
              </div>

              {imageUrl && (
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 px-1">
                  <span>Status: <strong className="text-emerald-400">Verified ≤ 95 KB</strong></span>
                  <label className="text-rose-400 hover:text-rose-300 font-bold cursor-pointer underline text-[10px]">
                    Replace Image
                    <input
                      type="file"
                      accept=".webp,.jpg,.jpeg,.png,image/webp,image/jpeg,image/png"
                      className="hidden"
                      onChange={handleImageFileChange}
                      disabled={uploadingImage}
                    />
                  </label>
                </div>
              )}
            </div>

            {/* Title */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-300">Card Title</label>
                <span className="text-[10px] text-zinc-500 font-mono">Optional (Defaults to ZEBALPHA EDIT)</span>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. OBSIDIAN OVERSIZED TEE (Optional)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-extrabold uppercase text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-600"
              />
            </div>

            {/* Category & Badge */}
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

            {/* Price & Target Link */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Price (₹, Optional)</label>
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

            {/* Display Order & Active */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-300">Display Order</label>
                <input
                  type="number"
                  min={0}
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(parseInt(e.target.value) || 0)}
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
                  <span className="text-xs font-bold text-zinc-300">Active (Visible)</span>
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving || uploadingImage}
              className="w-full py-3.5 rounded-2xl bg-white text-black font-black text-xs uppercase tracking-widest hover:bg-zinc-200 transition-colors shadow-lg active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Saving Card..." : editingId ? "Update Woven Card" : "Save Woven Card"}
            </button>
          </form>
        </div>

        {/* Gallery / List Column */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-900">
            <h2 className="text-sm font-black uppercase text-zinc-300 tracking-wider">
              Active Database Woven Editorial Cards ({cards.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-12 text-center text-zinc-500 font-mono text-xs">
              Loading editorial cards...
            </div>
          ) : cards.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-zinc-800 rounded-3xl bg-zinc-950/50">
              <p className="text-xs font-bold text-zinc-400">No Woven editorial cards in database yet.</p>
              <p className="text-[11px] text-zinc-600 mt-1">Upload an image (≤ 95 KB) to publish your first card.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {cards.map((card, idx) => (
                <div
                  key={card.id || idx}
                  className={`group relative rounded-3xl bg-zinc-950 border overflow-hidden p-3.5 space-y-2.5 transition-all ${
                    card.is_active ? "border-zinc-800 hover:border-zinc-600" : "border-zinc-900 opacity-60"
                  }`}
                >
                  {/* 3:4 Aspect Ratio Preview */}
                  <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800">
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
                        #{card.display_order ?? card.sort_order ?? idx + 1}
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-widest block">
                      {card.category}
                    </span>
                    <h3 className="text-xs font-black uppercase text-white truncate">{card.title}</h3>
                    <div className="flex items-center justify-between text-[11px] text-zinc-400 mt-1">
                      {card.price !== undefined && card.price !== null && (
                        <span>₹{Number(card.price).toLocaleString("en-IN")}</span>
                      )}
                      <span className="font-mono text-[9px] text-zinc-500 truncate max-w-[120px]">
                        {card.href}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-900">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(card)}
                      className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider cursor-pointer ${
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
                        className="p-1.5 rounded-lg bg-zinc-900 text-zinc-300 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Edit Card"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCard(card.id, card.image_url)}
                        className="p-1.5 rounded-lg bg-zinc-900 text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 transition-colors cursor-pointer"
                        title="Delete Card"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
