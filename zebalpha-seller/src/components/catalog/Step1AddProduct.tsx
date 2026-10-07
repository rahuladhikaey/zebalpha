"use client";

import React, { useState } from "react";
import { Upload, X, CheckCircle2, AlertCircle } from "lucide-react";
import type { Category } from "@shared/types";
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
  };
  categories: Category[];
  onChange: (updates: Partial<Step1Props["formData"]>) => void;
}

const CLOTHING_CATEGORIES = [
  { id: "men", name: "Men's Apparel", subcategories: ["T-Shirts & Polos", "Shirts", "Hoodies & Sweatshirts", "Jeans & Trousers", "Jackets", "Ethnic Wear"] },
  { id: "women", name: "Women's Apparel", subcategories: ["Dresses & Tops", "Ethnic & Sarees", "Jeans & Leggings", "Jackets & Blazers", "Innerwear"] },
  { id: "unisex", name: "Unisex & Streetwear", subcategories: ["Oversized Tees", "Hoodies & Jackets", "Cargo Pants", "Accessories"] },
  { id: "kids", name: "Kids & Boys/Girls", subcategories: ["Boy's Wear", "Girl's Wear", "Infants & Babies"] },
];

export default function Step1AddProduct({ formData, categories, onChange }: Step1Props) {
  const [selectedMainCat, setSelectedMainCat] = useState<string>("men");
  const [imageError, setImageError] = useState<string>("");

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError("");
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (formData.images.length + files.length > 4) {
      setImageError("Maximum 4 images allowed for catalog listing.");
      return;
    }

    files.forEach((file) => {
      if (file.size > 2 * 1024 * 1024) {
        setImageError(`File "${file.name}" exceeds 2 MB limit.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          const base64Str = evt.target.result as string;
          onChange({
            images: [...formData.images, base64Str].slice(0, 4),
          });
        }
      };
      reader.readAsDataURL(file);
    });
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

  const activeSubcats = CLOTHING_CATEGORIES.find((c) => c.id === selectedMainCat)?.subcategories || [];

  return (
    <div className="space-y-6">
      {/* Product Type / Placement Selector */}
      <div className="p-4 rounded-xl bg-[#141418] border border-[#27272a] space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 block">
          Product Category Type
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
            🏷️ Normal Apparel
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
      {/* Category Selection */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-zinc-200 flex items-center gap-1">
          Select Category <span className="text-red-400">*</span>
        </label>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          {CLOTHING_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedMainCat(cat.id)}
              className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all ${
                selectedMainCat === cat.id
                  ? "bg-white text-black border-white shadow-md shadow-white/10"
                  : "bg-[#141418] text-zinc-300 border-[#27272a] hover:border-zinc-500"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <select
          value={formData.subcategory_name || ""}
          onChange={(e) => {
            const subName = e.target.value;
            const foundCat = categories.find((c) => c.name.toLowerCase().includes(subName.toLowerCase())) || categories[0];
            onChange({
              subcategory_name: subName,
              category_id: foundCat ? String(foundCat.id) : formData.category_id,
            });
          }}
          className="w-full p-3 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-sm focus:border-white transition-colors"
        >
          <option value="">-- Select Apparel Type / Subcategory --</option>
          {activeSubcats.map((sub, idx) => (
            <option key={idx} value={sub}>
              {sub}
            </option>
          ))}
        </select>
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
        <p className="text-xs text-zinc-400 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
          Upload high-resolution apparel photos (Front, Back, Fabric Detail, Model).
        </p>

        {imageError && (
          <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs">
            {imageError}
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
              <span className="text-[10px] text-zinc-500">PNG, JPG up to 2MB</span>
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

      {/* Meesho-Style Size-Specific Details & Measurements */}
      <SizeSpecificDetailsSection
        selectedSizes={formData.selected_sizes || []}
        sizeDetails={formData.size_details || []}
        sizeMeasurements={formData.size_measurements || []}
        measurementUnit={formData.measurement_unit || "inches"}
        isMeasurementsEnabled={formData.is_measurements_enabled ?? true}
        styleCode={formData.style_code}
        subcategoryName={formData.subcategory_name}
        defaultPrice={formData.price}
        defaultMrp={formData.mrp}
        onSizesChange={(newSizes) => onChange({ selected_sizes: newSizes })}
        onSizeDetailsChange={(newDetails) => onChange({ size_details: newDetails })}
        onSizeMeasurementsChange={(newMeasurements) => onChange({ size_measurements: newMeasurements })}
        onMeasurementUnitChange={(unit) => onChange({ measurement_unit: unit })}
        onToggleMeasurements={(enabled) => onChange({ is_measurements_enabled: enabled })}
      />

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
