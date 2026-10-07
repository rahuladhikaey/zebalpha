"use client";

import React, { useMemo, useState } from "react";
import { Plus, Trash2, Layers, Upload, Copy, Sparkles, Image as ImageIcon, X } from "lucide-react";

export interface CatalogVariant {
  id: string;
  size: string;
  color?: string;
  sku: string;
  stock: string;
  price: string;
  defective_returns_price: string;
  mrp: string;
  image_url?: string;
}

export interface Step4Props {
  formData: {
    has_variants: boolean;
    variants: CatalogVariant[];
    single_stock: string;
    single_sku: string;
    price: string;
    defective_returns_price: string;
    mrp: string;
    style_code: string;
    selected_sizes?: string[];
    size_details?: any[];
  };
  onChange: (updates: Partial<Step4Props["formData"]>) => void;
}

const POPULAR_SIZES = ["Free Size", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "28", "30", "32", "34", "36", "38", "40", "42"];
const POPULAR_COLORS = ["Black", "White", "Red", "Navy Blue", "Beige", "Olive Green", "Grey", "Maroon", "Pink", "Yellow", "Purple", "Custom Color"];

export default function Step4AddVariants({ formData, onChange }: Step4Props) {
  const [selectedAddSizeMap, setSelectedAddSizeMap] = useState<Record<string, string>>({});
  const [customSizeMap, setCustomSizeMap] = useState<Record<string, string>>({});

  // Group flattened variants by color
  const colorGroups = useMemo(() => {
    const groups: { color: string; image_url?: string; items: CatalogVariant[] }[] = [];
    const map = new Map<string, { color: string; image_url?: string; items: CatalogVariant[] }>();

    for (const v of formData.variants) {
      const col = (v.color || "Black").trim() || "Black";
      if (!map.has(col)) {
        const group = { color: col, image_url: v.image_url, items: [] };
        map.set(col, group);
        groups.push(group);
      }
      const group = map.get(col)!;
      if (v.image_url && !group.image_url) {
        group.image_url = v.image_url;
      }
      group.items.push(v);
    }
    return groups;
  }, [formData.variants]);

  // Handle image upload for a specific color (Shared across all sizes of this color)
  const handleColorImageUpload = (colorName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) {
        const dataUrl = evt.target.result as string;
        const updated = formData.variants.map((v) =>
          (v.color || "Black").trim().toLowerCase() === colorName.trim().toLowerCase()
            ? { ...v, image_url: dataUrl }
            : v
        );
        onChange({ variants: updated });
      }
    };
    reader.readAsDataURL(file);
  };

  const removeColorImage = (colorName: string) => {
    const updated = formData.variants.map((v) =>
      (v.color || "Black").trim().toLowerCase() === colorName.trim().toLowerCase()
        ? { ...v, image_url: undefined }
        : v
    );
    onChange({ variants: updated });
  };

  // Add a new color variant group with default or Step 1 sizes
  const addColorVariant = (initialColor: string = "Black") => {
    let targetColor = initialColor;
    let counter = 1;
    while (
      formData.variants.some(
        (v) => (v.color || "Black").trim().toLowerCase() === targetColor.trim().toLowerCase()
      )
    ) {
      counter++;
      targetColor = `${initialColor} ${counter}`;
    }

    const activeSizes =
      formData.selected_sizes && formData.selected_sizes.length > 0
        ? formData.selected_sizes
        : ["S", "M", "L", "XL"];

    const newVariants: CatalogVariant[] = activeSizes.map((sz) => {
      const step1Detail = formData.size_details?.find((d) => d.size === sz);
      const cleanColor = targetColor.toUpperCase().replace(/[^A-Z0-9]/g, "");
      return {
        id: Math.random().toString(36).substring(2, 9),
        color: targetColor,
        size: sz,
        stock: step1Detail?.inventory || "20",
        price: step1Detail?.selling_price || formData.price || "0",
        mrp: step1Detail?.mrp || formData.mrp || "0",
        defective_returns_price:
          step1Detail?.return_price || formData.defective_returns_price || "0",
        sku: formData.style_code
          ? `${formData.style_code}_${cleanColor}_${sz}`
          : `SKU_${cleanColor}_${sz}`,
      };
    });

    onChange({ variants: [...formData.variants, ...newVariants] });
  };

  // Remove an entire color group
  const removeColorGroup = (colorName: string) => {
    const updated = formData.variants.filter(
      (v) => (v.color || "Black").trim().toLowerCase() !== colorName.trim().toLowerCase()
    );
    onChange({ variants: updated });
  };

  // Rename color across all its sizes
  const renameColor = (oldColor: string, newColor: string) => {
    if (!newColor.trim()) return;
    const cleanNew = newColor.trim();
    const updated = formData.variants.map((v) => {
      if ((v.color || "Black").trim().toLowerCase() === oldColor.trim().toLowerCase()) {
        const cleanCol = cleanNew.toUpperCase().replace(/[^A-Z0-9]/g, "");
        return {
          ...v,
          color: cleanNew,
          sku: formData.style_code
            ? `${formData.style_code}_${cleanCol}_${v.size}`
            : `SKU_${cleanCol}_${v.size}`,
        };
      }
      return v;
    });
    onChange({ variants: updated });
  };

  // Add a size to an existing color
  const addSizeToColor = (colorName: string, sizeName: string) => {
    if (!sizeName || !sizeName.trim()) return;
    const cleanSize = sizeName.trim();

    // Prevent duplicate size in the same color
    const exists = formData.variants.some(
      (v) =>
        (v.color || "Black").trim().toLowerCase() === colorName.trim().toLowerCase() &&
        v.size.toLowerCase() === cleanSize.toLowerCase()
    );
    if (exists) return;

    const groupItems = formData.variants.filter(
      (v) => (v.color || "Black").trim().toLowerCase() === colorName.trim().toLowerCase()
    );
    const sample = groupItems[0];
    const step1Detail = formData.size_details?.find((d) => d.size === cleanSize);
    const cleanColor = colorName.toUpperCase().replace(/[^A-Z0-9]/g, "");

    const newVariant: CatalogVariant = {
      id: Math.random().toString(36).substring(2, 9),
      color: colorName,
      size: cleanSize,
      stock: sample?.stock || step1Detail?.inventory || "20",
      price: sample?.price || step1Detail?.selling_price || formData.price || "0",
      mrp: sample?.mrp || step1Detail?.mrp || formData.mrp || "0",
      defective_returns_price:
        sample?.defective_returns_price ||
        step1Detail?.return_price ||
        formData.defective_returns_price ||
        "0",
      sku: formData.style_code
        ? `${formData.style_code}_${cleanColor}_${cleanSize}`
        : `SKU_${cleanColor}_${cleanSize}`,
      image_url: sample?.image_url,
    };

    onChange({ variants: [...formData.variants, newVariant] });
  };

  // Remove a specific size row
  const removeSizeRow = (id: string) => {
    const updated = formData.variants.filter((v) => v.id !== id);
    onChange({ variants: updated });
  };

  // Update a single variant field
  const updateVariant = (id: string, updates: Partial<CatalogVariant>) => {
    const updated = formData.variants.map((v) => (v.id === id ? { ...v, ...updates } : v));
    onChange({ variants: updated });
  };

  // Copy row 1 price & stock across all sizes of this color
  const copyRow1ToAllSizes = (colorName: string) => {
    const groupItems = formData.variants.filter(
      (v) => (v.color || "Black").trim().toLowerCase() === colorName.trim().toLowerCase()
    );
    if (groupItems.length === 0) return;
    const first = groupItems[0];

    const updated = formData.variants.map((v) => {
      if ((v.color || "Black").trim().toLowerCase() === colorName.trim().toLowerCase()) {
        return {
          ...v,
          stock: first.stock || v.stock,
          price: first.price || v.price,
          mrp: first.mrp || v.mrp,
          defective_returns_price: first.defective_returns_price || v.defective_returns_price,
        };
      }
      return v;
    });

    onChange({ variants: updated });
  };

  return (
    <div className="space-y-6">
      {/* Toggle: Single Product vs Multi-Variant Product */}
      <div className="p-4 rounded-xl bg-[#141418] border border-[#27272a] flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold text-white block">Multi-Color & Size Variant Product</span>
          <span className="text-xs text-zinc-400">
            Enable if this garment design is available in multiple colors (Black, Red, White) or sizes (S, M, L, XL).
          </span>
        </div>
        <input
          type="checkbox"
          checked={formData.has_variants}
          onChange={(e) => {
            const hasVar = e.target.checked;
            onChange({
              has_variants: hasVar,
              variants: hasVar && formData.variants.length === 0 ? [] : formData.variants,
            });
          }}
          className="w-5 h-5 rounded border-[#27272a] accent-white cursor-pointer"
        />
      </div>

      {!formData.has_variants ? (
        /* Single Item Inventory Form */
        <div className="p-5 rounded-xl bg-[#0d0d11] border border-[#27272a] space-y-4">
          <div className="flex items-center gap-2 text-white font-semibold text-sm border-b border-[#27272a] pb-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            Single Item Inventory & Stock
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-zinc-300 mb-1 block">Total Inventory Stock *</label>
              <input
                type="number"
                value={formData.single_stock}
                onChange={(e) => onChange({ single_stock: e.target.value })}
                placeholder="e.g. 50"
                className="w-full p-2.5 rounded-lg bg-[#141418] border border-[#27272a] text-white text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-300 mb-1 block">SKU ID *</label>
              <input
                type="text"
                value={formData.single_sku}
                onChange={(e) => onChange({ single_sku: e.target.value })}
                placeholder="e.g. ZBA-HD-FS-01"
                className="w-full p-2.5 rounded-lg bg-[#141418] border border-[#27272a] text-white text-sm"
              />
            </div>
          </div>
        </div>
      ) : (
        /* Meesho-Style Color-First Variant Manager */
        <div className="space-y-5">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#27272a] pb-3">
            <div>
              <span className="text-sm font-semibold text-white block">
                Clothing Color & Size Matrix ({colorGroups.length} Color{colorGroups.length !== 1 ? "s" : ""},{" "}
                {formData.variants.length} Total SKUs)
              </span>
              <span className="text-xs text-zinc-400">
                1 Color = 1 Photo = Multiple Sizes (XS, S, M, L, XL) with stock and pricing
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => addColorVariant("Black")}
                className="py-1.5 px-3 rounded-lg bg-[#18181b] border border-[#27272a] hover:border-zinc-400 text-xs text-zinc-200 font-medium transition-all"
              >
                + Add Black
              </button>
              <button
                type="button"
                onClick={() => addColorVariant("Red")}
                className="py-1.5 px-3 rounded-lg bg-[#18181b] border border-[#27272a] hover:border-zinc-400 text-xs text-rose-400 font-medium transition-all"
              >
                + Add Red
              </button>
              <button
                type="button"
                onClick={() => addColorVariant("Navy Blue")}
                className="py-1.5 px-3 rounded-lg bg-[#18181b] border border-[#27272a] hover:border-zinc-400 text-xs text-blue-400 font-medium transition-all"
              >
                + Add Navy Blue
              </button>
              <button
                type="button"
                onClick={() => addColorVariant("White")}
                className="py-1.5 px-3 rounded-lg bg-white text-black hover:bg-zinc-200 text-xs font-bold transition-all flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> + Add Color Variant
              </button>
            </div>
          </div>

          {colorGroups.length === 0 ? (
            <div className="p-8 rounded-xl border-2 border-dashed border-[#27272a] bg-[#0d0d11] text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-[#18181b] flex items-center justify-center mx-auto text-zinc-400">
                <ImageIcon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">No Color Variants Added Yet</p>
                <p className="text-xs text-zinc-400 mt-1">
                  Add a color variant (e.g. Black). You only need to upload 1 photo per color, then specify its sizes.
                </p>
              </div>
              <div className="flex justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => addColorVariant("Black")}
                  className="py-2 px-4 rounded-lg bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-all"
                >
                  + Add Black Variant (S, M, L, XL)
                </button>
                <button
                  type="button"
                  onClick={() => addColorVariant("Red")}
                  className="py-2 px-4 rounded-lg bg-[#1c1c22] border border-[#27272a] text-white text-xs font-bold hover:bg-[#25252d] transition-all"
                >
                  + Add Red Variant
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {colorGroups.map((group, groupIdx) => {
                const addSizeVal = selectedAddSizeMap[group.color] || "";
                const customVal = customSizeMap[group.color] || "";
                const existingSizes = new Set(group.items.map((it) => it.size.toLowerCase()));
                const availablePopularSizes = POPULAR_SIZES.filter(
                  (sz) => !existingSizes.has(sz.toLowerCase())
                );

                return (
                  <div
                    key={group.color}
                    className="p-5 rounded-xl bg-[#0d0d11] border border-[#27272a] space-y-4 relative group"
                  >
                    {/* Top Row: Color Title, Single Photo Upload & Remove Color */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#222228] pb-4">
                      {/* Left: Color Title & Single Photo */}
                      <div className="flex items-center gap-4">
                        {/* 1 Photo for this entire color */}
                        <div className="flex items-center gap-2.5">
                          {group.image_url ? (
                            <div className="relative w-14 h-14 rounded-lg border border-[#3f3f46] overflow-hidden shrink-0 group/img">
                              <img
                                src={group.image_url}
                                alt={`${group.color} variant photo`}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => removeColorImage(group.color)}
                                className="absolute inset-0 bg-black/75 text-red-400 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity"
                                title="Remove photo"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <label
                              className="w-14 h-14 rounded-lg border-2 border-dashed border-[#3f3f46] hover:border-emerald-400 bg-[#141418] cursor-pointer flex flex-col items-center justify-center shrink-0 transition-colors"
                              title="Upload 1 Photo for this Color"
                            >
                              <Upload className="w-4 h-4 text-zinc-400 group-hover:text-white" />
                              <span className="text-[9px] text-zinc-400 mt-0.5">Upload</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleColorImageUpload(group.color, e)}
                                className="hidden"
                              />
                            </label>
                          )}

                          <div>
                            <span className="text-[10px] text-emerald-400 font-semibold block uppercase tracking-wider">
                              1 Photo for all sizes
                            </span>
                            <span className="text-xs text-zinc-400">
                              {group.image_url ? "Photo uploaded" : "Upload color photo"}
                            </span>
                          </div>
                        </div>

                        {/* Garment Color Field */}
                        <div className="border-l border-[#27272a] pl-4">
                          <label className="text-[11px] font-medium text-zinc-400 block mb-1">
                            Garment Color *
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={group.color}
                              onChange={(e) => renameColor(group.color, e.target.value)}
                              className="p-1.5 px-2.5 rounded-lg bg-[#141418] border border-[#27272a] text-white text-xs font-bold w-36 focus:border-zinc-400"
                              placeholder="e.g. Black"
                            />
                            <span className="text-[11px] text-zinc-400">
                              ({group.items.length} size{group.items.length !== 1 ? "s" : ""})
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Copy Row 1 & Delete Color */}
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => copyRow1ToAllSizes(group.color)}
                          className="py-1.5 px-2.5 rounded-lg bg-[#18181b] border border-[#27272a] hover:border-zinc-400 text-zinc-300 hover:text-white text-xs font-medium transition-all flex items-center gap-1.5"
                          title="Copy Row 1 Price and Stock to all sizes in this color"
                        >
                          <Copy className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copy Top Row to All</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => removeColorGroup(group.color)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete this entire color variant"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Sizes Table for this Color */}
                    <div className="overflow-x-auto rounded-lg border border-[#222228] bg-[#09090c]">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-[#222228] bg-[#121216] text-zinc-400 font-medium">
                            <th className="py-2.5 px-3 w-24">Size</th>
                            <th className="py-2.5 px-3 w-32">Stock (Qty) *</th>
                            <th className="py-2.5 px-3 w-36">Listing Price (₹) *</th>
                            <th className="py-2.5 px-3 w-32">MRP (₹)</th>
                            <th className="py-2.5 px-3">SKU Identifier</th>
                            <th className="py-2.5 px-3 w-12 text-center">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1e1e24]">
                          {group.items.map((row, rowIdx) => (
                            <tr key={row.id} className="hover:bg-[#141418]/60 transition-colors">
                              {/* Size Badge */}
                              <td className="py-2 px-3">
                                <span className="inline-block py-1 px-2.5 rounded-md bg-[#1a1a22] border border-[#2c2c36] text-white font-bold text-xs">
                                  {row.size}
                                </span>
                              </td>

                              {/* Stock Input */}
                              <td className="py-2 px-3">
                                <input
                                  type="number"
                                  value={row.stock}
                                  onChange={(e) => updateVariant(row.id, { stock: e.target.value })}
                                  placeholder="50"
                                  className="w-full p-1.5 px-2 rounded-md bg-[#141418] border border-[#27272a] text-white text-xs focus:border-emerald-400"
                                />
                              </td>

                              {/* Listing Price Input */}
                              <td className="py-2 px-3">
                                <div className="relative">
                                  <span className="absolute left-2 top-1.5 text-zinc-400 text-xs">₹</span>
                                  <input
                                    type="number"
                                    value={row.price}
                                    onChange={(e) => updateVariant(row.id, { price: e.target.value })}
                                    placeholder="265"
                                    className="w-full p-1.5 pl-5 px-2 rounded-md bg-[#141418] border border-[#27272a] text-white text-xs font-semibold focus:border-emerald-400"
                                  />
                                </div>
                              </td>

                              {/* MRP Input */}
                              <td className="py-2 px-3">
                                <div className="relative">
                                  <span className="absolute left-2 top-1.5 text-zinc-400 text-xs">₹</span>
                                  <input
                                    type="number"
                                    value={row.mrp}
                                    onChange={(e) => updateVariant(row.id, { mrp: e.target.value })}
                                    placeholder="499"
                                    className="w-full p-1.5 pl-5 px-2 rounded-md bg-[#141418] border border-[#27272a] text-zinc-300 text-xs focus:border-zinc-400"
                                  />
                                </div>
                              </td>

                              {/* SKU Input */}
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={row.sku}
                                  onChange={(e) => updateVariant(row.id, { sku: e.target.value })}
                                  placeholder={`SKU_${group.color}_${row.size}`}
                                  className="w-full p-1.5 px-2 rounded-md bg-[#141418] border border-[#27272a] text-zinc-300 text-xs"
                                />
                              </td>

                              {/* Delete Size Row Button */}
                              <td className="py-2 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => removeSizeRow(row.id)}
                                  className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                  title="Remove this size"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Add Size Controls for this Color */}
                    <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                      <span className="text-zinc-400 font-medium">+ Add Size to {group.color}:</span>

                      {/* Dropdown for common popular sizes */}
                      {availablePopularSizes.length > 0 && (
                        <select
                          value={addSizeVal}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              addSizeToColor(group.color, val);
                              setSelectedAddSizeMap((prev) => ({ ...prev, [group.color]: "" }));
                            }
                          }}
                          className="p-1.5 px-2.5 rounded-lg bg-[#141418] border border-[#27272a] text-white text-xs cursor-pointer focus:border-zinc-400"
                        >
                          <option value="">Select standard size...</option>
                          {availablePopularSizes.map((sz) => (
                            <option key={sz} value={sz}>
                              {sz}
                            </option>
                          ))}
                        </select>
                      )}

                      {/* Quick popular size buttons */}
                      <div className="flex items-center gap-1 flex-wrap">
                        {["S", "M", "L", "XL", "XXL"]
                          .filter((s) => !existingSizes.has(s.toLowerCase()))
                          .map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => addSizeToColor(group.color, s)}
                              className="py-1 px-2 rounded-md bg-[#18181b] border border-[#27272a] hover:border-zinc-400 text-[11px] text-zinc-300 font-bold hover:text-white transition-all"
                            >
                              +{s}
                            </button>
                          ))}
                      </div>

                      {/* Custom Size input */}
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={customVal}
                          onChange={(e) =>
                            setCustomSizeMap((prev) => ({ ...prev, [group.color]: e.target.value }))
                          }
                          placeholder="Custom Size"
                          className="p-1 px-2 rounded-md bg-[#141418] border border-[#27272a] text-white text-xs w-24"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (customVal.trim()) {
                                addSizeToColor(group.color, customVal.trim());
                                setCustomSizeMap((prev) => ({ ...prev, [group.color]: "" }));
                              }
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (customVal.trim()) {
                              addSizeToColor(group.color, customVal.trim());
                              setCustomSizeMap((prev) => ({ ...prev, [group.color]: "" }));
                            }
                          }}
                          className="py-1 px-2 rounded-md bg-zinc-800 text-white text-xs font-semibold hover:bg-zinc-700 transition-all"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Bottom Add Color Variant Button */}
              <div className="pt-2 flex justify-start">
                <button
                  type="button"
                  onClick={() => addColorVariant("Custom Color")}
                  className="py-2.5 px-4 rounded-xl border border-dashed border-[#3f3f46] hover:border-white bg-[#0d0d11] text-xs font-bold text-zinc-300 hover:text-white transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4 text-emerald-400" />
                  <span>+ Add Another Color Variant</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

