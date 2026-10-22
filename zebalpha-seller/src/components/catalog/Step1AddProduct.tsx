import React, { useState, useMemo } from "react";
import { Upload, X, CheckCircle2, AlertCircle, Layers } from "lucide-react";
import type { Category } from "@shared/types";
import {
  DYNAMIC_CATEGORY_CATALOG,
  resolveProductTypeConfig,
} from "@shared/constants/productAttributeEngine";
import { compressImageTo100KB } from "@shared/services";
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
  };
  categories: Category[];
  onChange: (updates: Partial<Step1Props["formData"]>) => void;
}

export default function Step1AddProduct({ formData, categories, onChange }: Step1Props) {
  const [selectedMainCat, setSelectedMainCat] = useState<string>("men");
  const [imageError, setImageError] = useState<string>("");
  const [isCustomSubcategory, setIsCustomSubcategory] = useState<boolean>(false);
  const [customCategoryName, setCustomCategoryName] = useState<string>("");

  // Resolve current active product type configuration dynamically
  const activeProductTypeConfig = useMemo(() => {
    return resolveProductTypeConfig(selectedMainCat, formData.subcategory_name);
  }, [selectedMainCat, formData.subcategory_name]);

  const hasSizingSystem = activeProductTypeConfig.sizingSystem !== "none";

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError("");
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (formData.images.length + files.length > 4) {
      setImageError("Maximum 4 images allowed for catalog listing.");
      return;
    }

    const MAX_ALLOWED_BYTES = 150 * 1024; // Strictly 150 KB (153,600 bytes)

    // 1. Strict raw file size check: completely reject any file over 150 KB
    for (const file of files) {
      if (file.size > MAX_ALLOWED_BYTES) {
        setImageError(
          `❌ File "${file.name}" is ${(file.size / 1024).toFixed(1)} KB. Maximum allowed size is 150 KB. Please select an image under 150 KB.`
        );
        e.target.value = "";
        return;
      }
    }

    const processedImages: string[] = [];

    for (const file of files) {
      try {
        const { blob } = await compressImageTo100KB(file, MAX_ALLOWED_BYTES);
        if (blob.size > MAX_ALLOWED_BYTES) {
          setImageError(`❌ Image "${file.name}" exceeds 150 KB (${(blob.size / 1024).toFixed(1)} KB). Please choose a smaller image.`);
          e.target.value = "";
          return;
        }

        const b64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (evt) => resolve((evt.target?.result as string) || "");
          reader.readAsDataURL(blob);
        });

        if (b64) processedImages.push(b64);
      } catch (err) {
        console.warn("Image compression notice:", err);
      }
    }


    if (processedImages.length > 0) {
      onChange({
        images: [...formData.images, ...processedImages].slice(0, 4),
      });
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

      {/* Meesho-Style Comprehensive Category & Subcategory Selection */}
      <div className="space-y-3 p-4 rounded-xl bg-[#141418] border border-[#27272a]">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-zinc-200 flex items-center gap-1">
            Product Main Category & Subcategory <span className="text-red-400">*</span>
          </label>
          <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <span>✨</span> ZEBALPHA Smart Engine
          </span>
        </div>

        {/* Main Category Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
          {DYNAMIC_CATEGORY_CATALOG.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedMainCat(cat.id);
                if (cat.id === "custom") {
                  setIsCustomSubcategory(true);
                } else {
                  setIsCustomSubcategory(false);
                }
              }}
              className={`py-2 px-2.5 rounded-lg border text-xs font-bold transition-all text-center truncate flex items-center justify-center gap-1.5 ${
                selectedMainCat === cat.id
                  ? "bg-white text-black border-white shadow-md shadow-white/10"
                  : "bg-[#0d0d11] text-zinc-300 border-[#27272a] hover:border-zinc-500"
              }`}
            >
              <span>{cat.icon || "📦"}</span>
              <span className="truncate">{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Custom Category Input if Custom Tab selected */}
        {selectedMainCat === "custom" && (
          <div className="pt-2">
            <label className="text-xs font-semibold text-zinc-400 block mb-1">
              Enter Custom Category Name (e.g. Handicrafts, Organic Food, Pet Supplies)
            </label>
            <input
              type="text"
              value={customCategoryName}
              onChange={(e) => {
                setCustomCategoryName(e.target.value);
                const foundCat = categories.find((c) => c.name.toLowerCase().includes(e.target.value.toLowerCase())) || categories[0];
                onChange({
                  category_id: foundCat ? String(foundCat.id) : formData.category_id,
                });
              }}
              placeholder="e.g. Handicrafts & Decor"
              className="w-full p-2.5 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-sm focus:border-white transition-colors"
            />
          </div>
        )}

        {/* Subcategory Selector & Custom Input Option */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">
              {isCustomSubcategory ? "Type Custom Product Type / Subcategory Name:" : "Select Apparel Type / Subcategory:"}
            </span>
            <button
              type="button"
              onClick={() => setIsCustomSubcategory(!isCustomSubcategory)}
              className="text-xs text-indigo-400 hover:underline font-medium"
            >
              {isCustomSubcategory ? "← Pick from Preset Subcategories" : "+ Add Custom Subcategory Name"}
            </button>
          </div>

          {!isCustomSubcategory ? (
            <select
              value={formData.subcategory_name || ""}
              onChange={(e) => {
                const subName = e.target.value;
                if (subName === "__OTHER__") {
                  setIsCustomSubcategory(true);
                  return;
                }
                const foundCat = categories.find((c) => c.name.toLowerCase().includes(subName.toLowerCase())) || categories[0];
                onChange({
                  subcategory_name: subName,
                  category_id: foundCat ? String(foundCat.id) : formData.category_id,
                });
              }}
              className="w-full p-3 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-sm focus:border-white transition-colors"
            >
              <option value="">-- Select Product Type / Category Specifics --</option>
              {activeProductTypesList.map((pt, idx) => (
                <option key={idx} value={pt.name}>
                  {pt.group}: {pt.name}
                </option>
              ))}
              <option value="__OTHER__">+ Write Custom Product Type...</option>
            </select>
          ) : (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={formData.subcategory_name || ""}
                onChange={(e) => {
                  const subName = e.target.value;
                  const foundCat = categories.find((c) => c.name.toLowerCase().includes(subName.toLowerCase())) || categories[0];
                  onChange({
                    subcategory_name: subName,
                    category_id: foundCat ? String(foundCat.id) : formData.category_id,
                  });
                }}
                placeholder="e.g. Designer Chaniya Choli, Wireless Earbuds, Ceramic Vases..."
                className="w-full p-3 rounded-lg bg-[#0d0d11] border border-emerald-500/50 text-white text-sm focus:border-emerald-400 transition-colors"
              />
            </div>
          )}
        </div>
      </div>

      {/* Multi-Image Upload */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-zinc-200 flex items-center gap-1">
            Product Images <span className="text-red-400">*</span>
          </label>
          <span className="text-xs text-zinc-400">
            {formData.images.length}/4 Images Uploaded
          </span>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs text-zinc-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            Upload product photos (Front, Back, Detail, Model) — <strong className="text-emerald-400">Strict Max 150 KB per photo</strong>.
          </p>
          <a
            href="https://imagecompressor.11zon.com/en/compress-webp/compress-webp-to-100kb"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-bold text-violet-400 hover:text-violet-300 underline inline-flex items-center gap-1"
          >
            Resize / Compress Photo (100KB) ↗
          </a>
        </div>

        {imageError && (
          <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center justify-between gap-2 flex-wrap">
            <span>{imageError}</span>
            <a
              href="https://imagecompressor.11zon.com/en/compress-webp/compress-webp-to-100kb"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-bold text-white bg-red-600/80 hover:bg-red-600 px-2.5 py-1 rounded-md transition shrink-0"
            >
              Resize to 100KB ↗
            </a>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          {formData.images.map((imgUrl, index) => {
            const isFront = formData.front_image_index === index;
            return (
              <div
                key={index}
                className={`relative aspect-3/4 rounded-xl border overflow-hidden group transition-all ${
                  isFront ? "border-emerald-500 ring-2 ring-emerald-500/30" : "border-[#27272a]"
                }`}
              >
                <img src={imgUrl} alt={`Product preview ${index + 1}`} className="w-full h-full object-cover" />
                
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

          {formData.images.length < 4 && (
            <label className="aspect-3/4 rounded-xl border-2 border-dashed border-[#27272a] hover:border-zinc-400 bg-[#0d0d11] hover:bg-[#141418] cursor-pointer flex flex-col items-center justify-center gap-2 transition-all p-3 text-center group">
              <div className="p-3 rounded-full bg-[#18181b] group-hover:bg-zinc-800 text-zinc-300 transition-colors">
                <Upload className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-medium text-zinc-300">Upload Image</span>
              <span className="text-[10px] text-emerald-400 font-semibold">WebP, PNG, JPG (Max 150KB)</span>
              <input
                type="file"
                accept="image/*"
                multiple
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

      {/* Target Launch Date for New Drops */}
      {formData.is_new_drop && (
        <div className="space-y-2 p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
          <label className="text-sm font-semibold text-orange-300 flex items-center gap-1">
            ⚡ Target Launch / Drop Date <span className="text-red-400">*</span>
          </label>
          <input
            type="datetime-local"
            value={formData.target_drop_date || ""}
            onChange={(e) => onChange({ target_drop_date: e.target.value })}
            className="w-full p-3 rounded-lg bg-[#0d0d11] border border-orange-500/40 text-white text-sm"
          />
          <p className="text-[11px] text-zinc-400">
            💡 Displayed on the customer <code>/new-drops</code> hype countdown with voting and launch alerts.
          </p>
        </div>
      )}

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

            const autoPrice = validSellingPrices.length > 0 ? Math.min(...validSellingPrices) : 0;
            const autoMrp = validMrps.length > 0 ? Math.max(...validMrps) : autoPrice;
            const autoReturn = validReturns.length > 0 ? Math.min(...validReturns) : 0;

            onChange({
              size_details: newDetails,
              price: autoPrice > 0 ? String(autoPrice) : formData.price,
              mrp: autoMrp > 0 ? String(autoMrp) : (autoPrice > 0 ? String(autoPrice) : formData.mrp),
              defective_returns_price: autoReturn > 0 ? String(autoReturn) : formData.defective_returns_price,
              single_stock: String(totalStock || 20),
            });
          }}
          onSizeMeasurementsChange={(newMeasurements) => onChange({ size_measurements: newMeasurements })}
          onMeasurementUnitChange={(unit) => onChange({ measurement_unit: unit })}
          onToggleMeasurements={(enabled) => onChange({ is_measurements_enabled: enabled })}
        />
      ) : (
        <div className="p-4 rounded-xl bg-[#141418] border border-[#27272a] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Layers className="w-4 h-4" />
            </span>
            <div>
              <span className="text-xs font-bold text-white block">
                Standard / Single Configuration Item
              </span>
              <span className="text-[11px] text-zinc-400">
                {activeProductTypeConfig.name} does not require apparel sizing. You will configure product specifications in Step 2.
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold text-zinc-400 bg-zinc-800 px-2.5 py-1 rounded-full uppercase tracking-wider">
            No Sizes Needed
          </span>
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
  );
}
