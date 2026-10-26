"use client";

import React, { useState, useEffect } from "react";
import { Upload, X, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { optimizeEditorialImage, OptimizedImageResult } from "./imageOptimization";
import type { SpotlightEditorialCard } from "@/types/spotlight";

interface CreateEditorialCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newCard: SpotlightEditorialCard) => void;
  categories: any[];
}

export function CreateEditorialCardModal({
  isOpen,
  onClose,
  onSuccess,
  categories,
}: CreateEditorialCardModalProps) {
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");

  // Form Fields
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [mainCategoryId, setMainCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [destinationType, setDestinationType] = useState<"category" | "subcategory" | "product" | "custom">("category");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [priceMode, setPriceMode] = useState<"auto" | "manual">("auto");
  const [manualFromPrice, setManualFromPrice] = useState("");
  const [calculatedFromPrice, setCalculatedFromPrice] = useState<number | null>(null);
  const [priceValidationState, setPriceValidationState] = useState<{
    valid: boolean;
    message: string;
    checking: boolean;
  }>({ valid: true, message: "", checking: false });

  // Image Upload State
  const [optimizedImage, setOptimizedImage] = useState<OptimizedImageResult | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  // Derived subcategories
  const mainCategoriesList = categories.filter((c) => !c.parent_id);
  const subcategoriesList = categories.filter((c) => c.parent_id === mainCategoryId);

  // When main category changes
  useEffect(() => {
    if (mainCategoryId) {
      const selectedCat = categories.find((c) => c.id === mainCategoryId);
      if (destinationType === "category") {
        setDestinationUrl(`/categories/${selectedCat?.slug || mainCategoryId}`);
      }
      setSubcategoryId("");
    }
  }, [mainCategoryId, destinationType]);

  // When subcategory changes
  useEffect(() => {
    if (subcategoryId) {
      const selectedSub = categories.find((c) => c.id === subcategoryId);
      if (destinationType === "subcategory") {
        setDestinationUrl(`/categories/${selectedSub?.slug || subcategoryId}`);
      }
    }
  }, [subcategoryId, destinationType]);

  // Live From Price Validation whenever destination or price mode changes
  const checkPriceValidity = async () => {
    const destId = destinationType === "subcategory" && subcategoryId ? subcategoryId : mainCategoryId;
    if (!destId) return;

    setPriceValidationState((prev) => ({ ...prev, checking: true, message: "" }));
    try {
      const res = await fetch("/api/admin/spotlight/validate-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinationType,
          destinationId: destId,
          manualPrice: priceMode === "manual" ? manualFromPrice : null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCalculatedFromPrice(data.lowestPrice || 0);
        setPriceValidationState({
          valid: data.isValid,
          message: data.reason,
          checking: false,
        });
      }
    } catch (_) {
      setPriceValidationState((prev) => ({ ...prev, checking: false }));
    }
  };

  useEffect(() => {
    if (mainCategoryId || subcategoryId) {
      checkPriceValidity();
    }
  }, [mainCategoryId, subcategoryId, destinationType, priceMode, manualFromPrice]);

  if (!isOpen) return null;

  // File picker handler with strict 50 KB canvas compressor
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage("");
    setStatusMessage("");
    setIsCompressing(true);

    try {
      const result = await optimizeEditorialImage(file);
      setOptimizedImage(result);
      setStatusMessage(`✓ Image optimized to ${result.sizeKbFormatted} (≤ 50 KB limit satisfied).`);
    } catch (err: any) {
      setOptimizedImage(null);
      setErrorMessage(err.message || "Failed to process image.");
    } finally {
      setIsCompressing(false);
      e.target.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setStatusMessage("");

    if (!optimizedImage) {
      setErrorMessage("A verified editorial image (≤ 50 KB) is strictly required.");
      return;
    }

    if (!title.trim()) {
      setErrorMessage("Card Title is required.");
      return;
    }

    if (!destinationUrl.trim()) {
      setErrorMessage("Destination URL is required.");
      return;
    }

    if (priceMode === "manual" && !priceValidationState.valid) {
      setErrorMessage(`Invalid From Price: ${priceValidationState.message}`);
      return;
    }

    setSaving(true);
    setStatusMessage("Uploading verified image (≤ 50 KB) to Supabase editorial storage...");

    try {
      // 1. Upload image to Storage Bucket 'editorial'
      const uploadFormData = new FormData();
      uploadFormData.append("file", optimizedImage.blob, "editorial.webp");
      uploadFormData.append("campaignId", "editorial_cards");
      uploadFormData.append("cardId", `card_${Date.now()}`);

      const uploadRes = await fetch("/api/admin/spotlight/upload-image", {
        method: "POST",
        body: uploadFormData,
      });

      const uploadJson = await uploadRes.json();
      if (!uploadJson.success || !uploadJson.publicUrl) {
        throw new Error(uploadJson.message || "Server upload validation failed.");
      }

      setStatusMessage("Saving editorial card metadata to database...");

      // 2. Persist in spotlight_editorial_cards table
      const destId = destinationType === "subcategory" && subcategoryId 
        ? subcategoryId 
        : (mainCategoryId || destinationUrl);

      const cardPayload = {
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        image_bucket: uploadJson.bucket || "editorial",
        image_object_path: uploadJson.objectKey,
        image_url: uploadJson.publicUrl,
        category_id: mainCategoryId || null,
        subcategory_id: subcategoryId || null,
        destination_type: destinationType,
        destination_id: destId,
        destination_url: destinationUrl.trim(),
        price_mode: priceMode,
        manual_from_price: priceMode === "manual" && manualFromPrice ? Number(manualFromPrice) : null,
        calculated_from_price: calculatedFromPrice,
        is_active: true,
      };

      const cardRes = await fetch("/api/admin/spotlight/editorial-cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cardPayload),
      });

      const cardJson = await cardRes.json();
      if (!cardJson.success || !cardJson.data) {
        throw new Error(cardJson.message || "Failed to persist editorial card in database.");
      }

      onSuccess(cardJson.data);
      onClose();
    } catch (err: any) {
      console.error("[Create Editorial Card Error]:", err);
      setErrorMessage(err.message || "Failed to create editorial card.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 space-y-6 shadow-2xl relative text-white">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-[10px] font-black uppercase text-rose-300">
                ADMIN EDITORIAL
              </span>
              <span className="text-[10px] font-mono text-zinc-500">MAX 50 KB IMAGE</span>
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight text-white mt-1">
              Create Editorial Card
            </h2>
            <p className="text-xs text-zinc-400">
              Create promotional editorial cards with verified From Prices linking to categories or products.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-800/80 text-xs font-medium text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {statusMessage && (
          <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-800/80 text-xs font-medium text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{statusMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Image Upload (Strict 50 KB) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-300">
                Card Image <span className="text-rose-400">*</span>
              </label>
              <span className="text-[10px] font-mono text-zinc-400">
                Final Size: <strong className="text-amber-300">≤ 50 KB (51,200 bytes)</strong>
              </span>
            </div>

            <div className="border-2 border-dashed border-zinc-800 hover:border-zinc-700 rounded-2xl p-4 bg-zinc-900/60 flex flex-col items-center justify-center min-h-[140px] text-center">
              {optimizedImage ? (
                <div className="flex items-center gap-4 w-full">
                  <div className="relative w-24 h-32 rounded-xl overflow-hidden border border-zinc-700 shrink-0 bg-black">
                    <img
                      src={optimizedImage.dataUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 text-left space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[10px] font-mono font-bold">
                        ✓ {optimizedImage.sizeKbFormatted}
                      </span>
                      <span className="text-[10px] text-zinc-400">
                        {optimizedImage.width}×{optimizedImage.height}px
                      </span>
                    </div>
                    <p className="text-xs font-bold text-white">Image Ready for Supabase Storage</p>
                    <p className="text-[11px] text-zinc-400">
                      Bucket: <span className="font-mono text-zinc-300">editorial</span>
                    </p>
                    <label className="inline-block mt-2 text-[11px] font-bold text-rose-400 hover:text-rose-300 cursor-pointer underline">
                      Choose Different Image
                      <input
                        type="file"
                        accept=".webp,.jpg,.jpeg,.png,image/webp,image/jpeg,image/png"
                        className="hidden"
                        onChange={handleFileChange}
                        disabled={saving || isCompressing}
                      />
                    </label>
                  </div>
                </div>
              ) : (
                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer p-3">
                  <Upload className={`w-8 h-8 text-zinc-500 mb-2 ${isCompressing ? "animate-bounce" : ""}`} />
                  <span className="text-xs font-bold text-zinc-200">
                    {isCompressing ? "Optimizing & Enforcing ≤ 50 KB..." : "Select Card Image"}
                  </span>
                  <span className="text-[10px] text-zinc-400 mt-1">
                    Auto-optimized to <strong>≤ 50 KB WebP</strong> preserving aspect ratio
                  </span>
                  <input
                    type="file"
                    accept=".webp,.jpg,.jpeg,.png,image/webp,image/jpeg,image/png"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={saving || isCompressing}
                  />
                </label>
              )}
            </div>
          </div>

          {/* 2. Titles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300">
                Card Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Men's Fashion, Top Styles"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-white focus:outline-none focus:border-white"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300">Subtitle (Optional)</label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="e.g. Trending Styles, Up to 50% Off"
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-medium text-white focus:outline-none focus:border-white"
              />
            </div>
          </div>

          {/* 3. Category & Subcategory Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300">Main Category</label>
              <select
                value={mainCategoryId}
                onChange={(e) => setMainCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-white focus:outline-none focus:border-white cursor-pointer"
              >
                <option value="">Select Category...</option>
                {mainCategoriesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-300">Subcategory (Optional)</label>
              <select
                value={subcategoryId}
                onChange={(e) => setSubcategoryId(e.target.value)}
                disabled={!mainCategoryId || subcategoriesList.length === 0}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-white focus:outline-none focus:border-white cursor-pointer disabled:opacity-40"
              >
                <option value="">Select Subcategory...</option>
                {subcategoriesList.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4. Destination Configuration */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-300">
                Destination <span className="text-rose-400">*</span>
              </label>
              <div className="flex gap-2">
                {(["category", "subcategory", "custom"] as const).map((type) => (
                  <button
                    type="button"
                    key={type}
                    onClick={() => setDestinationType(type)}
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-lg border transition ${
                      destinationType === type
                        ? "bg-white text-black border-white"
                        : "text-zinc-400 border-zinc-800 hover:text-white"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <input
              type="text"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              placeholder="/categories/mens-fashion"
              className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-white focus:outline-none focus:border-white"
              required
            />
          </div>

          {/* 5. From Price Configuration (Mandatory Validation) */}
          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black uppercase text-white block">From Price Configuration</span>
                <span className="text-[10px] text-zinc-400">
                  Every price claim must be supported by real eligible products.
                </span>
              </div>
              <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setPriceMode("auto")}
                  className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg transition ${
                    priceMode === "auto" ? "bg-white text-black" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Auto From Price
                </button>
                <button
                  type="button"
                  onClick={() => setPriceMode("manual")}
                  className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg transition ${
                    priceMode === "manual" ? "bg-white text-black" : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Manual From Price
                </button>
              </div>
            </div>

            {priceMode === "auto" ? (
              <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-950 border border-zinc-800/80">
                <div>
                  <span className="text-[11px] text-zinc-400 block">Lowest Eligible Catalog Price:</span>
                  <span className="text-base font-black text-white">
                    {calculatedFromPrice ? `From ₹${calculatedFromPrice}` : "Analyzing catalog..."}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={checkPriceValidity}
                  className="p-1.5 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white transition"
                  title="Recalculate"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${priceValidationState.checking ? "animate-spin" : ""}`} />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3.5 top-2.5 text-zinc-500 font-bold text-xs">₹</span>
                    <input
                      type="number"
                      value={manualFromPrice}
                      onChange={(e) => setManualFromPrice(e.target.value)}
                      placeholder="e.g. 199"
                      className="w-full pl-8 pr-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-bold text-white focus:outline-none focus:border-white"
                      required
                    />
                  </div>
                  <div className="px-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 flex items-center">
                    Lowest in Cat: <strong className="text-white ml-1">₹{calculatedFromPrice ?? 0}</strong>
                  </div>
                </div>

                {priceValidationState.message && (
                  <p
                    className={`text-[11px] font-medium flex items-center gap-1.5 ${
                      priceValidationState.valid ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    <span>{priceValidationState.valid ? "✓" : "✗"}</span>
                    <span>{priceValidationState.message}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-900 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || isCompressing || !optimizedImage || (priceMode === "manual" && !priceValidationState.valid)}
              className="px-6 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-black text-xs uppercase tracking-wider transition shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {saving ? "Saving Editorial Card..." : "Save Editorial Card"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
