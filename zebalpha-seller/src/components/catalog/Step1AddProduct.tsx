import React, { useState, useMemo, useEffect } from "react";
import { Upload, X, CheckCircle2, AlertCircle, Layers, Plus, Loader2, Tag, Flame, Calendar, Sparkles } from "lucide-react";
import type { Category } from "@shared/types";
import {
  DYNAMIC_CATEGORY_CATALOG,
  resolveProductTypeConfig,
} from "@shared/constants/productAttributeEngine";
import {
  compressToTargetWebP,
  STRICT_PRODUCT_IMAGE_MAX_BYTES,
} from "@shared/services";
import { CategoryIconRenderer } from "@/lib/categoryIcons";
import SizeSpecificDetailsSection, {
  SizeVariantDetail,
  SizeMeasurementDetail,
  MeasurementUnit,
} from "./SizeSpecificDetailsSection";


export interface Step1Props {
  formData: {
    category_id: string;
    subcategory_id: string;
    subcategory_name: string;
    images: string[];
    front_image_index: number;
    name: string;
    description: string;
    is_premium?: boolean;
    is_new_drop?: boolean;
    target_drop_date?: string;

    // Meesho-style size & measurements fields
    selected_sizes?: string[];
    size_details?: SizeVariantDetail[];
    measurement_unit?: MeasurementUnit;
    size_measurements?: SizeMeasurementDetail[];
    is_measurements_enabled?: boolean;
    style_code?: string;
    price?: string;
    mrp?: string;
    defective_returns_price?: string;
    single_stock?: string;
    single_sku?: string;
  };
  categories: Category[];
  onChange: (updates: Partial<Step1Props["formData"]>) => void;
}

export default function Step1AddProduct({ formData, categories, onChange }: Step1Props) {
  // Infer active main category from category_id, subcategory_name, or product title keywords
  const inferredMainCat = useMemo(() => {
    // 1. Check category_id against categories list
    if (formData.category_id && categories && categories.length > 0) {
      const matchedCat = categories.find((c) => String(c.id) === String(formData.category_id));
      if (matchedCat) {
        const catText = `${matchedCat.main_category || ""} ${matchedCat.name || ""}`.toLowerCase();
        if (catText.includes("women") || catText.includes("female") || catText.includes("ladies")) return "women";
        if (catText.includes("kid") || catText.includes("boy") || catText.includes("girl") || catText.includes("baby") || catText.includes("infant")) return "kids";
        if (catText.includes("footwear") || catText.includes("shoe")) return "men";
        if (catText.includes("home") || catText.includes("kitchen") || catText.includes("decor")) return "home";
        if (catText.includes("electronic") || catText.includes("gadget")) return "electronics";
        if (catText.includes("beauty") || catText.includes("cosmetic")) return "beauty";
        if (catText.includes("jewel")) return "jewellery";
        if (catText.includes("men")) return "men";
      }
    }

    // 2. Check subcategory_name across DYNAMIC_CATEGORY_CATALOG
    if (formData.subcategory_name) {
      const subLower = formData.subcategory_name.toLowerCase().trim();
      for (const mainCat of DYNAMIC_CATEGORY_CATALOG) {
        for (const sub of mainCat.subcategories) {
          if (sub.name.toLowerCase() === subLower) return mainCat.id;
          for (const pt of sub.productTypes) {
            if (pt.name.toLowerCase() === subLower || pt.id.toLowerCase() === subLower) {
              return mainCat.id;
            }
          }
        }
      }
    }

    // 3. Check product name or subcategory keywords
    const combinedText = `${formData.subcategory_name || ""} ${formData.name || ""}`.toLowerCase();
    if (
      combinedText.includes("women") ||
      combinedText.includes("kurti") ||
      combinedText.includes("saree") ||
      combinedText.includes("blouse") ||
      combinedText.includes("lehenga") ||
      combinedText.includes("gown") ||
      combinedText.includes("dress")
    ) {
      return "women";
    }
    if (
      combinedText.includes("kid") ||
      combinedText.includes("baby") ||
      combinedText.includes("infant") ||
      combinedText.includes("boy") ||
      combinedText.includes("girl")
    ) {
      return "kids";
    }
    if (
      combinedText.includes("bottle") ||
      combinedText.includes("bedsheet") ||
      combinedText.includes("kitchen") ||
      combinedText.includes("cookware")
    ) {
      return "home";
    }
    if (
      combinedText.includes("earphone") ||
      combinedText.includes("headphone") ||
      combinedText.includes("cable") ||
      combinedText.includes("electronic")
    ) {
      return "electronics";
    }
    if (
      combinedText.includes("serum") ||
      combinedText.includes("lipstick") ||
      combinedText.includes("makeup") ||
      combinedText.includes("skincare")
    ) {
      return "beauty";
    }
    if (
      combinedText.includes("jewel") ||
      combinedText.includes("bangle") ||
      combinedText.includes("necklace") ||
      combinedText.includes("ring")
    ) {
      return "jewellery";
    }

    return "men";
  }, [formData.category_id, formData.subcategory_name, formData.name, categories]);

  // 1. Database-driven Main Categories (parent_id IS NULL and active)
  const dbMainCategories = useMemo(() => {
    return (categories || []).filter((c: any) => !c.parent_id && c.is_active !== false && c.main_category !== "CURATED");
  }, [categories]);

  // Initial main category resolution
  const [activeMainCatId, setActiveMainCatId] = useState<string>(() => {
    if (formData.category_id) {
      const match = (categories || []).find((c: any) => String(c.id) === String(formData.category_id)) as any;
      if (match) {
        return match.parent_id ? String(match.parent_id) : String(match.id);
      }
    }
    const firstMain = (categories || []).find((c: any) => !c.parent_id && c.is_active !== false && c.main_category !== "CURATED");
    return firstMain ? String(firstMain.id) : "";
  });

  // Current active main category record
  const currentDbMainCat = useMemo(() => {
    return dbMainCategories.find((c: any) => String(c.id) === String(activeMainCatId)) || dbMainCategories[0] || null;
  }, [dbMainCategories, activeMainCatId]);

  // Canonical string key for sizing engine / subcategory fallback
  const selectedMainCat = useMemo(() => {
    const slugOrName = (currentDbMainCat?.slug || currentDbMainCat?.name || "men").toLowerCase();
    if (slugOrName.includes("women") || slugOrName.includes("ladies") || slugOrName.includes("female")) return "women";
    if (slugOrName.includes("kid") || slugOrName.includes("boy") || slugOrName.includes("girl") || slugOrName.includes("baby")) return "kids";
    if (slugOrName.includes("home") || slugOrName.includes("kitchen")) return "home";
    if (slugOrName.includes("electronic") || slugOrName.includes("mobile")) return "electronics";
    if (slugOrName.includes("beauty") || slugOrName.includes("care")) return "beauty";
    if (slugOrName.includes("jewel") || slugOrName.includes("bag")) return "jewellery";
    return "men";
  }, [currentDbMainCat]);

  // Sync active main category if parent categories change
  useEffect(() => {
    if (!activeMainCatId && dbMainCategories.length > 0) {
      setActiveMainCatId(String(dbMainCategories[0].id));
    }
  }, [dbMainCategories, activeMainCatId]);

  // Approved subcategories under current main category
  // Locally created subcategories (instantly available without full page reload)
  const [createdSubcategories, setCreatedSubcategories] = useState<any[]>([]);

  // Approved and active subcategories under current main category
  const approvedSubcategories = useMemo(() => {
    if (!currentDbMainCat) return [];
    const fromProps = (categories || []).filter(
      (c: any) => String(c.parent_id) === String(currentDbMainCat.id) && c.is_active !== false
    );
    const fromCreated = createdSubcategories.filter(
      (c: any) => String(c.parent_id) === String(currentDbMainCat.id)
    );
    const combined = [...fromProps];
    fromCreated.forEach((c) => {
      if (!combined.some((item) => String(item.id) === String(c.id) || item.name.toLowerCase() === c.name.toLowerCase())) {
        combined.push(c);
      }
    });
    return combined;
  }, [categories, currentDbMainCat, createdSubcategories]);

  // Subcategory instant creation modal state
  const [showAddSubcatModal, setShowAddSubcatModal] = useState(false);
  const [newSubcatName, setNewSubcatName] = useState("");
  const [subcatSubmitting, setSubcatSubmitting] = useState(false);
  const [subcatAlert, setSubcatAlert] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleDirectSubcategoryCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDbMainCat) return;
    const cleanName = newSubcatName.trim();
    if (!cleanName) {
      setSubcatAlert({ type: "error", text: "Please enter a valid subcategory name." });
      return;
    }
    setSubcatSubmitting(true);
    setSubcatAlert(null);
    try {
      const res = await fetch("/api/seller/category-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parent_category_id: currentDbMainCat.id,
          name: cleanName,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to create subcategory");
      }

      const createdCat = json.category || {
        id: `created-${Date.now()}`,
        name: cleanName,
        parent_id: currentDbMainCat.id,
        is_active: true,
      };

      setCreatedSubcategories((prev) => [...prev, createdCat]);

      // Automatically select the newly created subcategory right away!
      onChange({
        category_id: String(currentDbMainCat.id),
        subcategory_id: String(createdCat.id),
        subcategory_name: createdCat.name,
      });

      setNewSubcatName("");
      setShowAddSubcatModal(false);
    } catch (err: any) {
      setSubcatAlert({ type: "error", text: err.message || "Failed to create subcategory" });
    } finally {
      setSubcatSubmitting(false);
    }
  };

  const [imageError, setImageError] = useState<string>("");
  const [compressingImages, setCompressingImages] = useState<boolean>(false);
  const [compressionProgressText, setCompressionProgressText] = useState<string>("");
  const [imageStatsMap, setImageStatsMap] = useState<Record<string, { origKb: number; compKb: number; ratio: number }>>({});

  // Resolve current active product type configuration dynamically
  const activeProductTypeConfig = useMemo(() => {
    const mainSlugOrName = (currentDbMainCat as any)?.slug || currentDbMainCat?.name || "men";
    return resolveProductTypeConfig(mainSlugOrName, formData.subcategory_name);
  }, [currentDbMainCat, formData.subcategory_name]);

  const hasSizingSystem = activeProductTypeConfig.sizingSystem !== "none";

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError("");
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const maxAllowedImages = formData.is_new_drop ? 2 : 3;
    if (formData.images.length + files.length > maxAllowedImages) {
      setImageError(
        formData.is_new_drop
          ? "❌ Maximum 2 photos allowed for New Drop teaser."
          : `❌ Maximum ${maxAllowedImages} images allowed for catalog listing.`
      );
      e.target.value = "";
      return;
    }

    // Accept raw images up to 25 MB - then compress to <= 50,883 bytes
    const RAW_INPUT_LIMIT = 25 * 1024 * 1024;
    for (const file of files) {
      if (file.size > RAW_INPUT_LIMIT) {
        setImageError(`❌ File "${file.name}" is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Please choose an image under 25 MB.`);
        e.target.value = "";
        return;
      }
    }

    setCompressingImages(true);
    const processedImages: string[] = [];
    const newStats: Record<string, { origKb: number; compKb: number; ratio: number }> = { ...imageStatsMap };

    try {
      for (let idx = 0; idx < files.length; idx++) {
        const file = files[idx];
        const origSizeKb = Number((file.size / 1024).toFixed(1));
        setCompressionProgressText(`Converting & compressing "${file.name}" (${origSizeKb} KB ➔ ≤ 49.7 KB WebP)...`);

        const result = await compressToTargetWebP(file, STRICT_PRODUCT_IMAGE_MAX_BYTES);

        if (!result.isWithinLimit && result.compressedSizeBytes > STRICT_PRODUCT_IMAGE_MAX_BYTES) {
          setImageError(`⚠️ Image "${file.name}" could not be compressed under 49.7 KB without severe distortion. Please try another photo.`);
          continue;
        }

        if (result.dataUrl) {
          processedImages.push(result.dataUrl);
          newStats[result.dataUrl] = {
            origKb: Number((result.originalSizeBytes / 1024).toFixed(1)),
            compKb: Number((result.compressedSizeBytes / 1024).toFixed(1)),
            ratio: result.compressionRatioPercent,
          };
        }
      }

      if (processedImages.length > 0) {
        setImageStatsMap(newStats);
        onChange({
          images: [...formData.images, ...processedImages].slice(0, maxAllowedImages),
        });
      }
    } catch (err: any) {
      console.error("Compression pipeline error:", err);
      setImageError("❌ Error processing selected images: " + (err?.message || "Unknown error"));
    } finally {
      setCompressingImages(false);
      setCompressionProgressText("");
      e.target.value = "";
    }
  };


  const removeImage = (index: number) => {
    const updated = formData.images.filter((_, i) => i !== index);
    let newFrontIdx = formData.front_image_index;
    if (newFrontIdx >= updated.length) {
      newFrontIdx = Math.max(0, updated.length - 1);
    }
    onChange({ images: updated, front_image_index: newFrontIdx });
  };

  const setFrontImage = (index: number) => {
    onChange({ front_image_index: index });
  };

  const currentMainCatConfig = useMemo(() => {
    return DYNAMIC_CATEGORY_CATALOG.find((c) => c.id === selectedMainCat) || DYNAMIC_CATEGORY_CATALOG[0];
  }, [selectedMainCat]);

  // Flatten all product types for this main category to show in dropdown
  const activeProductTypesList = useMemo(() => {
    const list: { id: string; name: string; group: string }[] = [];
    currentMainCatConfig.subcategories.forEach((sub) => {
      sub.productTypes.forEach((pt) => {
        list.push({ id: pt.id, name: pt.name, group: sub.name });
      });
    });
    return list;
  }, [currentMainCatConfig]);

  return (
    <div className="space-y-6">
      {/* Product Type / Placement Selector */}
      <div className="p-4 rounded-xl bg-[#141418] border border-[#27272a] space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 block">
          Product Listing Tier & Placement
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onChange({ is_premium: false, is_new_drop: false })}
            className={`p-2.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              !formData.is_premium && !formData.is_new_drop
                ? "bg-white text-black border-white shadow-md"
                : "bg-[#0d0d11] text-zinc-400 border-[#27272a] hover:text-white"
            }`}
          >
            🏷️ Standard Item
          </button>

          <button
            type="button"
            onClick={() => onChange({ is_premium: true, is_new_drop: false })}
            className={`p-2.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              formData.is_premium
                ? "bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/20"
                : "bg-[#0d0d11] text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
            }`}
          >
            💎 Premium Store Item
          </button>

          <button
            type="button"
            onClick={() => onChange({ is_new_drop: true, is_premium: false })}
            className={`p-2.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              formData.is_new_drop
                ? "bg-orange-500 text-black border-orange-400 shadow-md shadow-orange-500/20"
                : "bg-[#0d0d11] text-orange-400 border-orange-500/30 hover:bg-orange-500/10"
            }`}
          >
            ⚡ New Drop
          </button>
        </div>
      </div>

      {formData.is_new_drop ? (
        /* ================= ⚡ NEW DROP TEASER MODE (ONLY 2 PICS, TITLE, LAUNCH DATE) ================= */
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Informational banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-500/15 via-amber-500/10 to-transparent border border-orange-500/30 flex items-start gap-3 shadow-lg shadow-orange-500/5">
            <div className="p-2.5 rounded-xl bg-orange-500/20 text-orange-400 shrink-0 mt-0.5">
              <Flame className="w-5 h-5 text-orange-400 fill-orange-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h4 className="text-sm font-black text-white flex items-center gap-2">
                  <span>⚡ New Drop Teaser Launch</span>
                  <span className="text-[10px] font-bold text-orange-300 bg-orange-500/20 border border-orange-500/30 px-2 py-0.5 rounded-full">
                    3-Field Fast Upload
                  </span>
                </h4>
                <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  No Sizes or Pricing Required
                </span>
              </div>
              <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                Just upload <strong>2 photos</strong> (Max <strong>80 KB</strong> each), provide the <strong>product title</strong>, and set the <strong>launch date</strong>. Everything else is automated and will feature on <code>/new-drops</code>!
              </p>
            </div>
          </div>

          {/* 1. 2 Pictures Selection */}
          <div className="space-y-3 p-5 rounded-2xl bg-[#141418] border border-[#27272a]">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <label className="text-sm font-bold text-white flex items-center gap-1.5">
                  <span>Product Photos</span>
                  <span className="text-orange-400 font-black">(Select Exactly 2 Pics &bull; Max 80 KB)</span>
                  <span className="text-red-400">*</span>
                </label>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Pic 1: Front / Cover Photo • Pic 2: Angle / Showcase Photo (Strictly under 80 KB per photo)
                </p>
              </div>
              <span className="text-xs font-black text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-full">
                {formData.images.length}/2 Photos Selected
              </span>
            </div>

            {imageError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center justify-between gap-2 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {imageError}
                </span>
                <a
                  href="https://imagecompressor.11zon.com/en/compress-webp/compress-webp-to-100kb"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold text-white bg-red-600 px-2.5 py-1 rounded-lg hover:bg-red-500 transition"
                >
                  Compress to 80KB ↗
                </a>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              {/* Slot 1: Cover Photo */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-zinc-300">Pic 1: Cover / Front Photo</span>
                  {formData.images[0] && (
                    <span className="text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Primary Cover
                    </span>
                  )}
                </div>

                {formData.images[0] ? (
                  <div className="relative aspect-3/4 rounded-2xl border-2 border-emerald-500/80 overflow-hidden bg-black group shadow-lg">
                    <img
                      src={formData.images[0]}
                      alt="Pic 1 Cover"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-emerald-500 text-black text-[10px] font-black uppercase tracking-wider shadow">
                      Cover Photo
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImage(0)}
                      className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/80 text-rose-400 hover:bg-rose-500 hover:text-white transition cursor-pointer"
                      title="Remove Cover Photo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="aspect-3/4 rounded-2xl border-2 border-dashed border-zinc-700 hover:border-orange-400 bg-zinc-950/60 hover:bg-zinc-900/60 cursor-pointer flex flex-col items-center justify-center gap-2.5 p-4 text-center transition-all group">
                    <div className="p-3 rounded-full bg-zinc-900 group-hover:bg-orange-500/20 text-zinc-400 group-hover:text-orange-400 transition">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-white">Select Pic 1 (Cover)</span>
                    <span className="text-[10px] text-zinc-400">WebP, PNG, JPG (Strictly Max 80KB)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Slot 2: Showcase Photo */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-zinc-300">Pic 2: Showcase / Angle Photo</span>
                  {formData.images[1] && (
                    <span className="text-orange-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Showcase Angle
                    </span>
                  )}
                </div>

                {formData.images[1] ? (
                  <div className="relative aspect-3/4 rounded-2xl border-2 border-orange-500/80 overflow-hidden bg-black group shadow-lg">
                    <img
                      src={formData.images[1]}
                      alt="Pic 2 Showcase"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-orange-500 text-black text-[10px] font-black uppercase tracking-wider shadow">
                      Showcase Photo
                    </div>
                    <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const swapped = [formData.images[1], formData.images[0]];
                          onChange({ images: swapped, front_image_index: 0 });
                        }}
                        className="py-1 px-2.5 rounded-lg bg-black/80 hover:bg-white hover:text-black text-[10px] font-bold text-zinc-200 transition"
                      >
                        Set as Cover
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeImage(1)}
                      className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/80 text-rose-400 hover:bg-rose-500 hover:text-white transition cursor-pointer"
                      title="Remove Showcase Photo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="aspect-3/4 rounded-2xl border-2 border-dashed border-zinc-700 hover:border-orange-400 bg-zinc-950/60 hover:bg-zinc-900/60 cursor-pointer flex flex-col items-center justify-center gap-2.5 p-4 text-center transition-all group">
                    <div className="p-3 rounded-full bg-zinc-900 group-hover:bg-orange-500/20 text-zinc-400 group-hover:text-orange-400 transition">
                      <Upload className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-bold text-white">Select Pic 2 (Showcase)</span>
                    <span className="text-[10px] text-zinc-400">WebP, PNG, JPG (Strictly Max 80KB)</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* 2. Drop Title */}
          <div className="space-y-2 p-5 rounded-2xl bg-[#141418] border border-[#27272a]">
            <label className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>Drop Title / Product Name</span>
              <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="e.g. Acid Wash Heavyweight Oversized Graphic Hoodie"
              className="w-full p-3.5 rounded-xl bg-[#0d0d11] border border-[#27272a] text-white text-sm font-semibold focus:border-orange-400 focus:outline-none transition-colors"
            />
            <p className="text-[11px] text-zinc-400">
              The headline that will be showcased on <code>/new-drops</code> hype cards and customer launch alerts.
            </p>
          </div>

          {/* 3. Launch Date */}
          <div className="space-y-2 p-5 rounded-2xl bg-[#141418] border border-[#27272a]">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-white flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-orange-400" />
                <span>Launch Date & Time</span>
                <span className="text-red-400">*</span>
              </label>
              {formData.target_drop_date && (
                <span className="text-[10px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full">
                  ⚡ Countdown Active
                </span>
              )}
            </div>
            <input
              type="datetime-local"
              required
              value={formData.target_drop_date || ""}
              onChange={(e) => onChange({ target_drop_date: e.target.value })}
              className="w-full p-3.5 rounded-xl bg-[#0d0d11] border border-[#27272a] focus:border-orange-400 text-white text-sm font-semibold focus:outline-none transition-colors"
            />
            {(() => {
              const parsedDate = formData.target_drop_date ? new Date(formData.target_drop_date) : null;
              const isDateValid = parsedDate && !isNaN(parsedDate.getTime());
              if (isDateValid) {
                return (
                  <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-xs font-semibold text-orange-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-orange-400 shrink-0" />
                    <span>
                      Launches on:{" "}
                      <strong>
                        {parsedDate.toLocaleString("en-IN", {
                          dateStyle: "full",
                          timeStyle: "short",
                        })}
                      </strong>
                    </span>
                  </div>
                );
              }
              return (
                <p className="text-[11px] text-zinc-400">
                  Pick the date & time when this drop reveals. Customers will see a real-time countdown on <code>/new-drops</code>.
                </p>
              );
            })()}
          </div>
        </div>
      ) : (
        /* ================= 🏷️ STANDARD / 💎 PREMIUM CATALOG MODE ================= */
        <div className="space-y-6">
          {/* Centralized Database-Driven Category & Subcategory Selection */}
          <div className="space-y-4 p-5 rounded-2xl bg-[#141418] border border-[#27272a]">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>Main Marketplace Category</span>
              <span className="text-red-400">*</span>
            </label>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Admin-curated marketplace hierarchy. Select the main department for your product.
            </p>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-black bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center gap-1">
            <span>✨</span> Synchronized Taxonomy
          </span>
        </div>

        {/* Real Main Categories Grid */}
        {dbMainCategories.length === 0 ? (
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center">
            <p className="text-xs text-zinc-400 font-medium">
              No active main categories found in database. Contact Super Admin to configure categories.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            {dbMainCategories.map((cat: any) => {
              const isSelected = String(activeMainCatId) === String(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setActiveMainCatId(String(cat.id));
                    onChange({
                      category_id: String(cat.id),
                      subcategory_id: "",
                      subcategory_name: "",
                    });
                  }}
                  className={`py-3 px-3 rounded-xl border text-xs font-bold transition-all text-left flex items-center gap-2.5 cursor-pointer ${
                    isSelected
                      ? "bg-white text-black border-white shadow-lg shadow-white/10"
                      : "bg-[#0d0d11] text-zinc-300 border-[#27272a] hover:border-zinc-500 hover:text-white"
                  }`}
                >
                  <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? "bg-black/10" : "bg-zinc-900 border border-zinc-800"}`}>
                    <CategoryIconRenderer
                      iconKey={cat.icon_key}
                      iconUrl={cat.icon_url}
                      className={isSelected ? "text-black" : "text-zinc-300"}
                      size={18}
                    />
                  </div>
                  <span className="truncate">{cat.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Subcategory Selection & Proposal Section */}
        {currentDbMainCat && (
          <div className="pt-2 border-t border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-zinc-300 flex items-center gap-1">
                  Subcategory under {currentDbMainCat.name} <span className="text-red-400">*</span>
                </label>
                <p className="text-[11px] text-zinc-500">
                  Select an approved subcategory, or propose a new one if not listed.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowAddSubcatModal(true);
                  setSubcatAlert(null);
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-lg border border-indigo-500/30 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Subcategory</span>
              </button>
            </div>

            {/* Approved Subcategories Dropdown */}
            <select
              value={formData.subcategory_name || ""}
              onChange={(e) => {
                const selectedName = e.target.value;
                const matchedSub = approvedSubcategories.find((s: any) => s.name === selectedName);
                onChange({
                  category_id: String(currentDbMainCat.id),
                  subcategory_id: matchedSub ? String(matchedSub.id) : "",
                  subcategory_name: selectedName,
                });
              }}
              className="w-full p-3 rounded-xl bg-[#0d0d11] border border-[#27272a] text-white text-xs font-medium focus:border-white transition-colors"
            >
              <option value="">-- Select Subcategory ({approvedSubcategories.length} available) --</option>
              {approvedSubcategories.map((sub: any) => (
                <option key={sub.id} value={sub.name}>
                  {sub.name}
                </option>
              ))}
              {formData.subcategory_name && !approvedSubcategories.some((s: any) => s.name === formData.subcategory_name) && (
                <option value={formData.subcategory_name}>
                  {formData.subcategory_name} (Custom)
                </option>
              )}
            </select>

            {approvedSubcategories.length === 0 && (
              <p className="text-[11px] text-zinc-500 italic">
                No subcategories created under {currentDbMainCat.name} yet. Click &quot;+ Add Subcategory&quot; to create one instantly.
              </p>
            )}
          </div>
        )}

        {/* Direct Add Subcategory Modal */}
        {showAddSubcatModal && currentDbMainCat && (
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                  <span>Add New Subcategory</span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Instant
                  </span>
                </h4>
                <p className="text-[11px] text-zinc-400">
                  Directly adds and selects this subcategory under <strong>{currentDbMainCat.name}</strong>.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSubcatModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {subcatAlert && (
              <div className={`p-3 rounded-lg text-xs font-semibold ${
                subcatAlert.type === "success"
                  ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                  : "bg-rose-500/10 border border-rose-500/30 text-rose-300"
              }`}>
                {subcatAlert.text}
              </div>
            )}

            <form onSubmit={handleDirectSubcategoryCreate} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-zinc-400 block mb-1">
                  Main Category
                </label>
                <input
                  type="text"
                  disabled
                  value={currentDbMainCat.name}
                  className="w-full p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 text-xs font-semibold cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                  Subcategory Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Linen Shirts, Smart Watches, Leather Wallets"
                  value={newSubcatName}
                  onChange={(e) => setNewSubcatName(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-zinc-950 border border-zinc-700 text-white text-xs focus:border-white transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddSubcatModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-bold hover:bg-zinc-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={subcatSubmitting || !newSubcatName.trim()}
                  className="px-4 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-black uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {subcatSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create & Select</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Multi-Image Upload */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-zinc-200 flex items-center gap-1">
            Product Images <span className="text-red-400">*</span>
          </label>
          <span className="text-xs text-zinc-400">
            {formData.images.length}/3 Images Uploaded
          </span>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs text-zinc-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-emerald-400" />
            Upload product photos (Front, Back, Detail) — <strong className="text-emerald-400">Auto-compressed strictly ≤ 49.7 KB WebP</strong>.
          </p>
          <span className="text-[11px] font-semibold text-zinc-400 inline-flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Flipkart-Grade Auto-Optimization
          </span>
        </div>

        {compressingImages && (
          <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs flex items-center gap-2 animate-pulse">
            <Loader2 className="w-4 h-4 animate-spin text-violet-400 shrink-0" />
            <span className="font-medium">{compressionProgressText || "Processing and optimizing images..."}</span>
          </div>
        )}

        {imageError && (
          <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center justify-between gap-2 flex-wrap">
            <span>{imageError}</span>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-2">
          {formData.images.map((imgUrl, index) => {
            const isFront = formData.front_image_index === index;
            const stats = imageStatsMap[imgUrl];
            return (
              <div
                key={index}
                className={`relative aspect-3/4 rounded-xl border overflow-hidden group transition-all ${
                  isFront ? "border-emerald-500 ring-2 ring-emerald-500/30" : "border-[#27272a]"
                }`}
              >
                <img src={imgUrl} alt={`Product preview ${index + 1}`} className="w-full h-full object-cover" />
                
                {/* Size reduction pill */}
                {stats && (
                  <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-[9px] font-mono text-emerald-400 border border-emerald-500/30 shadow-lg pointer-events-none">
                    {stats.compKb} KB ({stats.ratio}% saved)
                  </div>
                )}

                {/* Delete overlay */}
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-red-400 hover:bg-red-500 hover:text-white transition-all opacity-90 group-hover:opacity-100"
                  title="Remove image"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {/* Front Image Badge / Toggle */}
                <button
                  type="button"
                  onClick={() => setFrontImage(index)}
                  className={`absolute bottom-2 left-2 right-2 py-1 px-2 rounded-md text-[10px] font-bold tracking-wide flex items-center justify-center gap-1 transition-all ${
                    isFront
                      ? "bg-emerald-500 text-black shadow-lg"
                      : "bg-black/70 text-zinc-300 hover:bg-white hover:text-black"
                  }`}
                >
                  {isFront ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" /> Cover Image
                    </>
                  ) : (
                    "Set as Cover"
                  )}
                </button>
              </div>
            );
          })}

          {formData.images.length < 3 && (
            <label className="aspect-3/4 rounded-xl border-2 border-dashed border-[#27272a] hover:border-zinc-400 bg-[#0d0d11] hover:bg-[#141418] cursor-pointer flex flex-col items-center justify-center gap-2 transition-all p-3 text-center group">
              <div className="p-3 rounded-full bg-[#18181b] group-hover:bg-zinc-800 text-zinc-300 transition-colors">
                <Upload className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-medium text-zinc-300">Upload Image</span>
              <span className="text-[10px] text-emerald-400 font-semibold">Any Size (Auto WebP ≤ 49.7 KB)</span>
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={compressingImages}
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>

      {/* Product Name */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-zinc-200 flex items-center gap-1">
          Product Name / Title <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Premium Oversized Heavyweight Cotton Graphic Hoodie"
          className="w-full p-3 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-sm focus:border-white transition-colors"
        />
      </div>

      {/* Meesho-Style Size-Specific Details & Measurements: Render ONLY if category has a sizing system */}
      {hasSizingSystem ? (
        <SizeSpecificDetailsSection
          selectedSizes={formData.selected_sizes || []}
          sizeDetails={formData.size_details || []}
          sizeMeasurements={formData.size_measurements || []}
          measurementUnit={formData.measurement_unit || "inches"}
          isMeasurementsEnabled={formData.is_measurements_enabled ?? true}
          styleCode={formData.style_code}
          subcategoryName={formData.subcategory_name}
          categoryName={selectedMainCat}
          defaultPrice={formData.price}
          defaultMrp={formData.mrp}
          onSizesChange={(newSizes) => onChange({ selected_sizes: newSizes })}
          onSizeDetailsChange={(newDetails) => {
            const validSellingPrices = newDetails
              .map((d) => parseFloat(d.selling_price))
              .filter((p) => !isNaN(p) && p > 0);
            const validMrps = newDetails
              .map((d) => parseFloat(d.mrp))
              .filter((m) => !isNaN(m) && m > 0);
            const validReturns = newDetails
              .map((d) => parseFloat(d.return_price))
              .filter((r) => !isNaN(r) && r > 0);
            const totalStock = newDetails.reduce((sum, d) => {
              const qty = parseInt(d.inventory);
              return sum + (!isNaN(qty) && qty > 0 ? qty : 0);
            }, 0);

            const firstRow = newDetails[0];
            const autoPrice = firstRow && parseFloat(firstRow.selling_price) > 0
              ? parseFloat(firstRow.selling_price)
              : (validSellingPrices[0] || 0);
            const autoMrp = firstRow && parseFloat(firstRow.mrp) > 0
              ? parseFloat(firstRow.mrp)
              : (validMrps[0] || autoPrice);
            const autoReturn = firstRow && parseFloat(firstRow.return_price) > 0
              ? parseFloat(firstRow.return_price)
              : (validReturns[0] || 0);

            onChange({
              size_details: newDetails,
              price: autoPrice > 0 ? String(autoPrice) : formData.price,
              mrp: autoMrp > 0 ? String(autoMrp >= autoPrice ? autoMrp : autoPrice) : (autoPrice > 0 ? String(autoPrice) : formData.mrp),
              defective_returns_price: autoReturn > 0 ? String(autoReturn) : formData.defective_returns_price,
              single_stock: String(totalStock || 20),
            });
          }}
          onSizeMeasurementsChange={(newMeasurements) => onChange({ size_measurements: newMeasurements })}
          onMeasurementUnitChange={(unit) => onChange({ measurement_unit: unit })}
          onToggleMeasurements={(enabled) => onChange({ is_measurements_enabled: enabled })}
        />
      ) : (
        /* Single Configuration / Non-Sized Item Pricing & Stock Section (Saree, Jewellery, Home, Electronics) */
        <div className="p-4 md:p-5 rounded-2xl bg-[#121216] border border-[#27272a] space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#27272a] pb-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Tag className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>{activeProductTypeConfig.name} Pricing & Inventory</span>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    Free Size / Standard
                  </span>
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Configure direct selling price, retail MRP, and inventory for this standard item.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-800/80 px-2.5 py-1 rounded-full uppercase tracking-wider self-start sm:self-auto">
              Single SKU Item
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Selling / Listing Price */}
            <div>
              <label className="text-xs font-semibold text-zinc-200 mb-1 flex items-center justify-between">
                <span>Selling Price (₹) <span className="text-rose-400">*</span></span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-bold">₹</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={formData.price || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    const pNum = parseFloat(val) || 0;
                    const curMrp = parseFloat(formData.mrp || "") || 0;
                    const updatedMrp = curMrp > 0 && curMrp >= pNum ? formData.mrp : String(Math.round(pNum * 1.4));
                    const autoReturn = formData.defective_returns_price || (pNum > 30 ? String(Math.max(0, pNum - 30)) : "");
                    const currentStock = formData.single_stock || "20";
                    const currentSku = formData.single_sku || formData.style_code || `SKU_${Date.now().toString(36).slice(-4)}`;

                    onChange({
                      price: val,
                      mrp: updatedMrp,
                      defective_returns_price: autoReturn,
                      selected_sizes: ["Free Size"],
                      size_details: [
                        {
                          id: "pkg_free_size",
                          size: "Free Size",
                          selling_price: val,
                          mrp: updatedMrp || val,
                          return_price: autoReturn,
                          inventory: currentStock,
                          sku: currentSku,
                        },
                      ],
                    });
                  }}
                  placeholder="e.g. 1299"
                  className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-[#0a0a0d] border border-[#27272a] text-white text-xs font-semibold focus:border-white transition-colors"
                />
              </div>
              <span className="text-[10px] text-zinc-500 mt-1 block">Customer listing price</span>
            </div>

            {/* MRP */}
            <div>
              <label className="text-xs font-semibold text-zinc-200 mb-1 flex items-center justify-between">
                <span>Maximum MRP (₹) <span className="text-rose-400">*</span></span>
                {parseFloat(formData.mrp || "0") > parseFloat(formData.price || "0") && parseFloat(formData.price || "0") > 0 && (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded">
                    {Math.round(((parseFloat(formData.mrp!) - parseFloat(formData.price!)) / parseFloat(formData.mrp!)) * 100)}% off
                  </span>
                )}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-bold">₹</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={formData.mrp || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    const p = formData.price || "";
                    onChange({
                      mrp: val,
                      selected_sizes: ["Free Size"],
                      size_details: [
                        {
                          id: "pkg_free_size",
                          size: "Free Size",
                          selling_price: p,
                          mrp: val,
                          return_price: formData.defective_returns_price || "",
                          inventory: formData.single_stock || "20",
                          sku: formData.single_sku || formData.style_code || "",
                        },
                      ],
                    });
                  }}
                  placeholder="e.g. 1999"
                  className="w-full pl-7 pr-3 py-2.5 rounded-xl bg-[#0a0a0d] border border-[#27272a] text-white text-xs font-semibold focus:border-white transition-colors"
                />
              </div>
              <span className="text-[10px] text-zinc-500 mt-1 block">Printed tag price on product</span>
            </div>

            {/* Available Inventory / Stock */}
            <div>
              <label className="text-xs font-semibold text-zinc-200 mb-1 block">
                Available Stock <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.single_stock ?? "20"}
                onChange={(e) => {
                  const val = e.target.value;
                  onChange({
                    single_stock: val,
                    selected_sizes: ["Free Size"],
                    size_details: [
                      {
                        id: "pkg_free_size",
                        size: "Free Size",
                        selling_price: formData.price || "",
                        mrp: formData.mrp || "",
                        return_price: formData.defective_returns_price || "",
                        inventory: val,
                        sku: formData.single_sku || formData.style_code || "",
                      },
                    ],
                  });
                }}
                placeholder="20"
                className="w-full px-3 py-2.5 rounded-xl bg-[#0a0a0d] border border-[#27272a] text-white text-xs font-semibold focus:border-white transition-colors"
              />
              <span className="text-[10px] text-zinc-500 mt-1 block">Units ready in your warehouse</span>
            </div>

            {/* SKU Code */}
            <div>
              <label className="text-xs font-semibold text-zinc-200 mb-1 block">
                SKU / Product Code
              </label>
              <input
                type="text"
                value={formData.single_sku || formData.style_code || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  onChange({
                    single_sku: val,
                    style_code: val,
                    selected_sizes: ["Free Size"],
                    size_details: [
                      {
                        id: "pkg_free_size",
                        size: "Free Size",
                        selling_price: formData.price || "",
                        mrp: formData.mrp || "",
                        return_price: formData.defective_returns_price || "",
                        inventory: formData.single_stock || "20",
                        sku: val,
                      },
                    ],
                  });
                }}
                placeholder="e.g. SAR_BANARASI_01"
                className="w-full px-3 py-2.5 rounded-xl bg-[#0a0a0d] border border-[#27272a] text-white text-xs font-semibold focus:border-white transition-colors"
              />
              <span className="text-[10px] text-zinc-500 mt-1 block">Internal warehouse identifier</span>
            </div>
          </div>

          {/* Optional Defective Returns Discount (Meesho-Style) */}
          <div className="pt-2 border-t border-[#202026] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-[11px] text-zinc-400">
              <span className="font-semibold text-zinc-200">Wrong / Defective Return Price (Optional): </span>
              Discounted price if customer opts for return only on defective delivery.
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-zinc-400 font-bold">₹</span>
              <input
                type="number"
                min="1"
                value={formData.defective_returns_price || ""}
                onChange={(e) => onChange({ defective_returns_price: e.target.value })}
                placeholder={formData.price && parseFloat(formData.price) > 30 ? String(parseFloat(formData.price) - 30) : "e.g. 1249"}
                className="w-28 px-2.5 py-1.5 rounded-lg bg-[#0a0a0d] border border-[#27272a] text-white text-xs focus:border-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* Product Description */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-sm font-semibold text-zinc-200">Product Description</label>
          <span className="text-xs text-zinc-500">{formData.description.length}/1400</span>
        </div>
        <textarea
          rows={4}
          maxLength={1400}
          value={formData.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Include fabric composition, fit details (oversized/slim), model height/size worn, and styling instructions..."
          className="w-full p-3 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-sm focus:border-white transition-colors"
        />
      </div>
        </div>
      )}
    </div>
  );
}
