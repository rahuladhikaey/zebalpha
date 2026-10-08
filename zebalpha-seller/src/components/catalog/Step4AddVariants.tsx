"use client";

import React, { useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Layers,
  Upload,
  Copy,
  Sparkles,
  Image as ImageIcon,
  X,
  Ruler,
  Grid,
  List,
  Eye,
  Check,
  Palette,
  RefreshCw,
  AlertCircle,
  HelpCircle,
} from "lucide-react";

export interface CatalogVariant {
  id: string;
  size: string;
  color?: string;
  color_hex?: string;
  sku: string;
  stock: string;
  price: string;
  defective_returns_price?: string;
  mrp: string;
  image_url?: string;
  gallery?: string[];
  is_active?: boolean;
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
    name?: string;
    images?: string[];
    description?: string;
    measurement_unit?: "inches" | "cm";
    size_measurements?: any[];
    is_measurements_enabled?: boolean;
    size_chart_columns?: string[];
    size_chart_notes?: string;
    size_chart_image?: string;
  };
  onChange: (updates: Partial<Step4Props["formData"]>) => void;
}

const PRESET_COLORS = [
  { name: "Black", hex: "#000000" },
  { name: "White", hex: "#ffffff" },
  { name: "Maroon", hex: "#800000" },
  { name: "Yellow", hex: "#eab308" },
  { name: "Navy Blue", hex: "#1e3a8a" },
  { name: "Olive Green", hex: "#556b2f" },
  { name: "Red", hex: "#dc2626" },
  { name: "Beige", hex: "#f5f5dc" },
  { name: "Grey", hex: "#6b7280" },
  { name: "Pink", hex: "#ec4899" },
  { name: "Purple", hex: "#9333ea" },
  { name: "Orange", hex: "#ea580c" },
  { name: "Brown", hex: "#78350f" },
  { name: "Charcoal", hex: "#333333" },
  { name: "Mustard", hex: "#e1ad01" },
  { name: "Teal", hex: "#0d9488" },
];

const PRESET_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "Free Size"];
const PRESET_WAIST_SIZES = ["28", "30", "32", "34", "36", "38", "40", "42"];

const SIZE_CHART_TEMPLATES: Record<string, { columns: string[]; notes: string }> = {
  "Shirts & T-Shirts": {
    columns: ["Chest", "Length", "Shoulder", "Sleeve"],
    notes: "All measurements are garment dimensions. Measure flat across chest from armhole to armhole.",
  },
  "Hoodies & Sweatshirts": {
    columns: ["Chest", "Length", "Shoulder", "Sleeve"],
    notes: "Relaxed street fit. Pre-shrunk cotton fleece fabric.",
  },
  "Jeans & Trousers": {
    columns: ["Waist", "Length", "Hip", "Inseam", "Thigh"],
    notes: "Measure waistband flat. For comfort stretch, order true to size.",
  },
  "Dresses & Tops": {
    columns: ["Bust", "Waist", "Hip", "Length", "Shoulder"],
    notes: "Contemporary tailored fit. Measure around the fullest part of bust and hips.",
  },
};

export default function Step4AddVariants({ formData, onChange }: Step4Props) {
  // Navigation tabs within Step 4
  const [activeTab, setActiveTab] = useState<"matrix" | "galleries" | "size_chart" | "preview">("matrix");
  const [viewMode, setViewMode] = useState<"matrix_grid" | "detailed_table">("matrix_grid");

  // Custom Color State
  const [customColorName, setCustomColorName] = useState("");
  const [customColorHex, setCustomColorHex] = useState("#3b82f6");

  // Custom Size State
  const [customSizeInput, setCustomSizeInput] = useState("");

  // Bulk Edit Dialog States
  const [bulkStockVal, setBulkStockVal] = useState("");
  const [bulkPriceVal, setBulkPriceVal] = useState("");
  const [bulkMrpVal, setBulkMrpVal] = useState("");
  const [bulkActionSuccess, setBulkActionSuccess] = useState("");

  // Custom Measurement Column State
  const [newColumnName, setNewColumnName] = useState("");

  // Live Customer Preview States
  const [previewColor, setPreviewColor] = useState<string>("");
  const [previewSize, setPreviewSize] = useState<string>("");

  const showSuccessBanner = (msg: string) => {
    setBulkActionSuccess(msg);
    setTimeout(() => setBulkActionSuccess(""), 2600);
  };

  // Group variants by color
  const colorGroups = useMemo(() => {
    const groups: {
      color: string;
      color_hex?: string;
      image_url?: string;
      gallery?: string[];
      items: CatalogVariant[];
    }[] = [];
    const map = new Map<string, typeof groups[0]>();

    for (const v of formData.variants) {
      const col = (v.color || "Black").trim() || "Black";
      if (!map.has(col)) {
        const group = {
          color: col,
          color_hex: v.color_hex || PRESET_COLORS.find((c) => c.name.toLowerCase() === col.toLowerCase())?.hex || "#18181b",
          image_url: v.image_url,
          gallery: v.gallery || (v.image_url ? [v.image_url] : []),
          items: [],
        };
        map.set(col, group);
        groups.push(group);
      }
      const grp = map.get(col)!;
      if (v.image_url && !grp.image_url) {
        grp.image_url = v.image_url;
      }
      if (Array.isArray(v.gallery) && v.gallery.length > 0 && (!grp.gallery || grp.gallery.length === 0)) {
        grp.gallery = v.gallery;
      }
      grp.items.push(v);
    }
    return groups;
  }, [formData.variants]);

  // Extract distinct sizes active across all variants
  const activeSizes = useMemo(() => {
    const sizes = new Set<string>();
    for (const v of formData.variants) {
      if (v.size) sizes.add(v.size.trim());
    }
    if (sizes.size === 0 && formData.selected_sizes && formData.selected_sizes.length > 0) {
      return formData.selected_sizes;
    }
    return Array.from(sizes);
  }, [formData.variants, formData.selected_sizes]);

  // Active Size Chart Columns
  const chartColumns = useMemo(() => {
    if (formData.size_chart_columns && formData.size_chart_columns.length > 0) {
      return formData.size_chart_columns;
    }
    return ["Chest", "Length", "Shoulder", "Sleeve"];
  }, [formData.size_chart_columns]);

  // ----------------------------------------------------------------------
  // COLOR MANAGEMENT
  // ----------------------------------------------------------------------
  const addColorVariant = (colorName: string, colorHex?: string) => {
    if (!colorName.trim()) return;
    const cleanName = colorName.trim();

    // Prevent duplicate color
    if (formData.variants.some((v) => (v.color || "Black").trim().toLowerCase() === cleanName.toLowerCase())) {
      return;
    }

    const assignedHex =
      colorHex ||
      PRESET_COLORS.find((c) => c.name.toLowerCase() === cleanName.toLowerCase())?.hex ||
      "#3b82f6";

    // Inherit sizes from existing variants or fallback
    const targetSizes = activeSizes.length > 0 ? activeSizes : ["S", "M", "L", "XL"];
    const basePrice = formData.price || "499";
    const baseMrp = formData.mrp || String(Math.round(parseFloat(basePrice || "499") * 1.5));
    const cleanPrefix = formData.style_code ? formData.style_code.trim().toUpperCase() : "ZB";
    const cleanColTag = cleanName.toUpperCase().replace(/[^A-Z0-9]/g, "");

    const newVariants: CatalogVariant[] = targetSizes.map((sz) => ({
      id: `${cleanPrefix}_${cleanColTag}_${sz.toUpperCase()}_${Date.now().toString(36).slice(-4)}`,
      color: cleanName,
      color_hex: assignedHex,
      size: sz,
      stock: "20",
      price: basePrice,
      mrp: baseMrp,
      defective_returns_price: formData.defective_returns_price || "",
      sku: `${cleanPrefix}_${cleanColTag}_${sz.toUpperCase()}`,
      is_active: true,
      gallery: [],
    }));

    onChange({
      has_variants: true,
      variants: [...formData.variants, ...newVariants],
    });

    showSuccessBanner(`Added "${cleanName}" with ${targetSizes.length} sizes`);
  };

  const removeColorGroup = (colorName: string) => {
    const updated = formData.variants.filter(
      (v) => (v.color || "Black").trim().toLowerCase() !== colorName.trim().toLowerCase()
    );
    onChange({ variants: updated });
    showSuccessBanner(`Removed color "${colorName}"`);
  };

  const updateColorHex = (colorName: string, newHex: string) => {
    const updated = formData.variants.map((v) =>
      (v.color || "Black").trim().toLowerCase() === colorName.trim().toLowerCase()
        ? { ...v, color_hex: newHex }
        : v
    );
    onChange({ variants: updated });
  };

  // ----------------------------------------------------------------------
  // COLOR-SPECIFIC IMAGE GALLERY
  // ----------------------------------------------------------------------
  const handleUploadColorGalleryImages = (colorName: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const readers = fileList.map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve((e.target?.result as string) || "");
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then((dataUrls) => {
      const validUrls = dataUrls.filter(Boolean);
      if (validUrls.length === 0) return;

      const updated = formData.variants.map((v) => {
        if ((v.color || "Black").trim().toLowerCase() === colorName.trim().toLowerCase()) {
          const existingGallery = v.gallery || (v.image_url ? [v.image_url] : []);
          const combined = [...existingGallery, ...validUrls];
          return {
            ...v,
            image_url: combined[0] || v.image_url,
            gallery: combined,
          };
        }
        return v;
      });

      onChange({ variants: updated });
      showSuccessBanner(`Uploaded ${validUrls.length} photo(s) for ${colorName}`);
    });
  };

  const removeColorGalleryImage = (colorName: string, indexToRemove: number) => {
    const updated = formData.variants.map((v) => {
      if ((v.color || "Black").trim().toLowerCase() === colorName.trim().toLowerCase()) {
        const currentGallery = v.gallery || (v.image_url ? [v.image_url] : []);
        const nextGallery = currentGallery.filter((_, idx) => idx !== indexToRemove);
        return {
          ...v,
          image_url: nextGallery[0] || undefined,
          gallery: nextGallery,
        };
      }
      return v;
    });
    onChange({ variants: updated });
  };

  const setAsCoverImage = (colorName: string, indexToCover: number) => {
    const updated = formData.variants.map((v) => {
      if ((v.color || "Black").trim().toLowerCase() === colorName.trim().toLowerCase()) {
        const currentGallery = [...(v.gallery || (v.image_url ? [v.image_url] : []))];
        if (indexToCover < currentGallery.length) {
          const item = currentGallery.splice(indexToCover, 1)[0];
          currentGallery.unshift(item);
          return {
            ...v,
            image_url: currentGallery[0],
            gallery: currentGallery,
          };
        }
      }
      return v;
    });
    onChange({ variants: updated });
  };

  // ----------------------------------------------------------------------
  // SIZE MANAGEMENT (Add / Remove across all colors)
  // ----------------------------------------------------------------------
  const toggleGlobalSize = (sizeName: string) => {
    if (!sizeName.trim()) return;
    const cleanSize = sizeName.trim();
    const isCurrentlyPresent = activeSizes.includes(cleanSize);

    if (isCurrentlyPresent) {
      // Remove this size across all colors
      const updated = formData.variants.filter(
        (v) => (v.size || "").toLowerCase() !== cleanSize.toLowerCase()
      );
      onChange({ variants: updated });
      showSuccessBanner(`Removed size ${cleanSize}`);
    } else {
      // Add this size across all current colors
      const targetColors = colorGroups.length > 0 ? colorGroups.map((g) => g.color) : ["Black"];
      const basePrice = formData.price || "499";
      const baseMrp = formData.mrp || String(Math.round(parseFloat(basePrice || "499") * 1.5));
      const cleanPrefix = formData.style_code ? formData.style_code.trim().toUpperCase() : "ZB";

      const addedVariants: CatalogVariant[] = targetColors.map((col) => {
        const grp = colorGroups.find((g) => g.color.toLowerCase() === col.toLowerCase());
        const cleanColTag = col.toUpperCase().replace(/[^A-Z0-9]/g, "");
        return {
          id: `${cleanPrefix}_${cleanColTag}_${cleanSize.toUpperCase()}_${Date.now().toString(36).slice(-4)}`,
          color: col,
          color_hex: grp?.color_hex,
          size: cleanSize,
          stock: "20",
          price: basePrice,
          mrp: baseMrp,
          sku: `${cleanPrefix}_${cleanColTag}_${cleanSize.toUpperCase()}`,
          image_url: grp?.image_url,
          gallery: grp?.gallery,
          is_active: true,
        };
      });

      onChange({
        has_variants: true,
        variants: [...formData.variants, ...addedVariants],
      });
      showSuccessBanner(`Added size ${cleanSize} across ${targetColors.length} colors`);
    }
  };

  // ----------------------------------------------------------------------
  // MATRIX CELL UPDATES
  // ----------------------------------------------------------------------
  const updateCellStock = (colorName: string, sizeName: string, newStock: string) => {
    const updated = formData.variants.map((v) => {
      if (
        (v.color || "Black").trim().toLowerCase() === colorName.trim().toLowerCase() &&
        (v.size || "").trim().toLowerCase() === sizeName.trim().toLowerCase()
      ) {
        return { ...v, stock: newStock };
      }
      return v;
    });
    onChange({ variants: updated });
  };

  const updateCellPrice = (colorName: string, sizeName: string, newPrice: string) => {
    const updated = formData.variants.map((v) => {
      if (
        (v.color || "Black").trim().toLowerCase() === colorName.trim().toLowerCase() &&
        (v.size || "").trim().toLowerCase() === sizeName.trim().toLowerCase()
      ) {
        return { ...v, price: newPrice };
      }
      return v;
    });
    onChange({ variants: updated });
  };

  const updateCellSku = (colorName: string, sizeName: string, newSku: string) => {
    const updated = formData.variants.map((v) => {
      if (
        (v.color || "Black").trim().toLowerCase() === colorName.trim().toLowerCase() &&
        (v.size || "").trim().toLowerCase() === sizeName.trim().toLowerCase()
      ) {
        return { ...v, sku: newSku };
      }
      return v;
    });
    onChange({ variants: updated });
  };

  // ----------------------------------------------------------------------
  // BULK ACTIONS
  // ----------------------------------------------------------------------
  const applyBulkStockToAll = () => {
    if (!bulkStockVal.trim()) return;
    const qty = parseInt(bulkStockVal.trim()) || 0;
    const updated = formData.variants.map((v) => ({ ...v, stock: String(qty) }));
    onChange({ variants: updated });
    setBulkStockVal("");
    showSuccessBanner(`Updated inventory stock to ${qty} for all ${updated.length} variants`);
  };

  const applyBulkPriceToAll = () => {
    if (!bulkPriceVal.trim()) return;
    const pr = parseFloat(bulkPriceVal.trim()) || 0;
    const updated = formData.variants.map((v) => ({ ...v, price: String(pr) }));
    onChange({ variants: updated });
    setBulkPriceVal("");
    showSuccessBanner(`Updated listing price to ₹${pr} for all ${updated.length} variants`);
  };

  const applyBulkMrpToAll = () => {
    if (!bulkMrpVal.trim()) return;
    const mrpNum = parseFloat(bulkMrpVal.trim()) || 0;
    const updated = formData.variants.map((v) => ({ ...v, mrp: String(mrpNum) }));
    onChange({ variants: updated });
    setBulkMrpVal("");
    showSuccessBanner(`Updated MRP to ₹${mrpNum} for all ${updated.length} variants`);
  };

  const autoGenerateAllSKUs = () => {
    const cleanPrefix = formData.style_code ? formData.style_code.trim().toUpperCase() : "ZB";
    const updated = formData.variants.map((v) => {
      const colTag = (v.color || "COLOR").toUpperCase().replace(/[^A-Z0-9]/g, "");
      const sizeTag = (v.size || "SZ").toUpperCase().replace(/[^A-Z0-9]/g, "");
      return {
        ...v,
        sku: `${cleanPrefix}_${colTag}_${sizeTag}`,
      };
    });
    onChange({ variants: updated });
    showSuccessBanner("Auto-generated standard SKUs for all variants");
  };

  // ----------------------------------------------------------------------
  // SIZE CHART BUILDER
  // ----------------------------------------------------------------------
  const handleLoadSizeChartTemplate = (templateName: string) => {
    const tpl = SIZE_CHART_TEMPLATES[templateName];
    if (!tpl) return;

    // Generate initial rows for active sizes
    const initialRows = activeSizes.map((sz) => {
      const rowObj: Record<string, string> = { size: sz };
      tpl.columns.forEach((col) => {
        rowObj[col] = "";
      });
      return rowObj;
    });

    onChange({
      is_measurements_enabled: true,
      size_chart_columns: tpl.columns,
      size_chart_notes: tpl.notes,
      size_measurements: initialRows,
    });

    showSuccessBanner(`Loaded "${templateName}" size chart template`);
  };

  const handleAddChartColumn = () => {
    if (!newColumnName.trim()) return;
    const cleanCol = newColumnName.trim();
    if (chartColumns.includes(cleanCol)) return;

    const nextCols = [...chartColumns, cleanCol];
    const currentRows = formData.size_measurements || [];
    const updatedRows = currentRows.map((r) => ({ ...r, [cleanCol]: "" }));

    onChange({
      size_chart_columns: nextCols,
      size_measurements: updatedRows,
    });

    setNewColumnName("");
    showSuccessBanner(`Added column "${cleanCol}"`);
  };

  const handleRemoveChartColumn = (colName: string) => {
    const nextCols = chartColumns.filter((c) => c !== colName);
    onChange({ size_chart_columns: nextCols });
  };

  const updateMeasurementCell = (sizeName: string, colName: string, val: string) => {
    const currentRows = formData.size_measurements || [];
    let found = false;
    const nextRows = currentRows.map((r) => {
      if ((r.size || "").toLowerCase() === sizeName.toLowerCase()) {
        found = true;
        return { ...r, [colName]: val };
      }
      return r;
    });

    if (!found) {
      nextRows.push({ size: sizeName, [colName]: val });
    }

    onChange({ size_measurements: nextRows });
  };

  return (
    <div className="space-y-6">
      {/* Mode Selector Header: Multi-Variant Toggle */}
      <div className="p-4 rounded-xl bg-[#141418] border border-[#27272a] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            Ecommerce Multi-Color & Multi-Size Product System
          </span>
          <span className="text-xs text-zinc-400 mt-0.5 block">
            Independent variant inventory per Color × Size combination, color-specific image galleries, and interactive size chart.
          </span>
        </div>

        <label className="flex items-center gap-2.5 cursor-pointer self-start sm:self-auto bg-[#1a1a20] px-3.5 py-1.5 rounded-lg border border-[#2f2f38]">
          <span className="text-xs font-semibold text-zinc-200">
            {formData.has_variants ? "Variants Enabled" : "Single SKU Only"}
          </span>
          <input
            type="checkbox"
            checked={formData.has_variants}
            onChange={(e) => {
              const enabled = e.target.checked;
              if (enabled && formData.variants.length === 0) {
                addColorVariant("Black");
              } else {
                onChange({ has_variants: enabled });
              }
            }}
            className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
          />
        </label>
      </div>

      {bulkActionSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{bulkActionSuccess}</span>
        </div>
      )}

      {!formData.has_variants ? (
        /* Single Item Inventory Form */
        <div className="p-6 rounded-2xl bg-[#0d0d11] border border-[#27272a] space-y-4">
          <div className="flex items-center gap-2 text-white font-bold text-sm border-b border-[#27272a] pb-3">
            <Layers className="w-4 h-4 text-emerald-400" />
            Single Item Inventory & Stock
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-zinc-300 mb-1.5 block">Total Inventory Stock *</label>
              <input
                type="number"
                value={formData.single_stock}
                onChange={(e) => onChange({ single_stock: e.target.value })}
                placeholder="e.g. 50"
                className="w-full p-2.5 rounded-lg bg-[#141418] border border-[#27272a] text-white text-sm focus:border-zinc-400"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-300 mb-1.5 block">Master SKU Identifier *</label>
              <input
                type="text"
                value={formData.single_sku}
                onChange={(e) => onChange({ single_sku: e.target.value })}
                placeholder="e.g. ZBA-CAS-001"
                className="w-full p-2.5 rounded-lg bg-[#141418] border border-[#27272a] text-white text-sm focus:border-zinc-400"
              />
            </div>
          </div>
        </div>
      ) : (
        /* Multi-Variant System */
        <div className="space-y-6">
          {/* Sub Navigation Bar */}
          <div className="flex items-center gap-1.5 border-b border-[#27272a] pb-2 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab("matrix")}
              className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === "matrix"
                  ? "bg-white text-black shadow-md"
                  : "text-zinc-400 hover:text-white hover:bg-[#18181b]"
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>1. Variant Matrix & Stock ({formData.variants.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("galleries")}
              className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === "galleries"
                  ? "bg-white text-black shadow-md"
                  : "text-zinc-400 hover:text-white hover:bg-[#18181b]"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>2. Color Galleries ({colorGroups.length} Colors)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("size_chart")}
              className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === "size_chart"
                  ? "bg-white text-black shadow-md"
                  : "text-zinc-400 hover:text-white hover:bg-[#18181b]"
              }`}
            >
              <Ruler className="w-3.5 h-3.5" />
              <span>3. Size Chart Builder</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("preview")}
              className={`py-2 px-4 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                activeTab === "preview"
                  ? "bg-emerald-500 text-black shadow-md"
                  : "text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Live Customer Preview</span>
            </button>
          </div>

          {/* TAB 1: VARIANT MATRIX & STOCK */}
          {activeTab === "matrix" && (
            <div className="space-y-6">
              {/* Quick Color & Size Toolbar */}
              <div className="p-4 rounded-xl bg-[#0d0d11] border border-[#27272a] space-y-4">
                {/* 1. Add Colors Row */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-zinc-400" />
                      Add Product Colors:
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      {colorGroups.length} Active Colors
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {PRESET_COLORS.map((c) => {
                      const isAdded = colorGroups.some(
                        (g) => g.color.toLowerCase() === c.name.toLowerCase()
                      );
                      return (
                        <button
                          key={c.name}
                          type="button"
                          onClick={() => {
                            if (isAdded) removeColorGroup(c.name);
                            else addColorVariant(c.name, c.hex);
                          }}
                          className={`py-1 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all border cursor-pointer ${
                            isAdded
                              ? "bg-zinc-800 text-white border-white/60 shadow-sm"
                              : "bg-[#141418] text-zinc-400 border-[#27272a] hover:border-zinc-500 hover:text-white"
                          }`}
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0"
                            style={{ backgroundColor: c.hex }}
                          />
                          <span>{c.name}</span>
                          {isAdded && <Check className="w-3 h-3 text-emerald-400" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Color Input */}
                  <div className="flex items-center gap-2 mt-3 pt-2 border-t border-[#1e1e24]">
                    <span className="text-[11px] text-zinc-400 font-medium">Custom Color:</span>
                    <input
                      type="text"
                      value={customColorName}
                      onChange={(e) => setCustomColorName(e.target.value)}
                      placeholder="e.g. Electric Lime"
                      className="p-1.5 px-2.5 rounded-lg bg-[#141418] border border-[#27272a] text-white text-xs w-36 focus:border-zinc-400"
                    />
                    <input
                      type="color"
                      value={customColorHex}
                      onChange={(e) => setCustomColorHex(e.target.value)}
                      className="w-7 h-7 rounded-lg bg-transparent border-0 cursor-pointer p-0"
                      title="Choose Swatch Color"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (customColorName.trim()) {
                          addColorVariant(customColorName.trim(), customColorHex);
                          setCustomColorName("");
                        }
                      }}
                      disabled={!customColorName.trim()}
                      className="py-1.5 px-3 rounded-lg bg-white text-black text-xs font-bold hover:bg-zinc-200 transition-all cursor-pointer disabled:opacity-40"
                    >
                      + Add
                    </button>
                  </div>
                </div>

                {/* 2. Add Sizes Row */}
                <div className="border-t border-[#1e1e24] pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-zinc-300">
                      Standard Clothing Sizes:
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      {activeSizes.length} Active Sizes
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {PRESET_SIZES.map((sz) => {
                      const isSelected = activeSizes.includes(sz);
                      return (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => toggleGlobalSize(sz)}
                          className={`py-1 px-3 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                            isSelected
                              ? "bg-white text-black border-white shadow-sm"
                              : "bg-[#141418] text-zinc-400 border-[#27272a] hover:border-zinc-500 hover:text-white"
                          }`}
                        >
                          {sz}
                        </button>
                      );
                    })}
                  </div>

                  {/* Waist Sizes toggle */}
                  <div className="flex items-center gap-1.5 flex-wrap mt-2">
                    <span className="text-[11px] text-zinc-500 font-medium">Waist:</span>
                    {PRESET_WAIST_SIZES.map((sz) => {
                      const isSelected = activeSizes.includes(sz);
                      return (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => toggleGlobalSize(sz)}
                          className={`py-0.5 px-2 rounded-md text-[11px] font-bold transition-all border cursor-pointer ${
                            isSelected
                              ? "bg-white text-black border-white"
                              : "bg-[#141418] text-zinc-400 border-[#27272a] hover:border-zinc-500"
                          }`}
                        >
                          {sz}
                        </button>
                      );
                    })}

                    {/* Custom Size Tag Input */}
                    <div className="flex items-center gap-1 ml-auto">
                      <input
                        type="text"
                        value={customSizeInput}
                        onChange={(e) => setCustomSizeInput(e.target.value)}
                        placeholder="Custom Size"
                        className="p-1 px-2 rounded-md bg-[#141418] border border-[#27272a] text-white text-xs w-24"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (customSizeInput.trim()) {
                              toggleGlobalSize(customSizeInput.trim());
                              setCustomSizeInput("");
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customSizeInput.trim()) {
                            toggleGlobalSize(customSizeInput.trim());
                            setCustomSizeInput("");
                          }
                        }}
                        className="py-1 px-2 rounded-md bg-zinc-800 text-white text-xs font-semibold hover:bg-zinc-700 cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bulk Actions Toolbar */}
              <div className="p-3.5 rounded-xl bg-[#121216] border border-[#27272a] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-zinc-400 font-semibold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    Bulk Apply:
                  </span>

                  {/* Bulk Stock */}
                  <div className="flex items-center gap-1 bg-[#1a1a20] p-1 rounded-lg border border-[#2c2c36]">
                    <input
                      type="number"
                      value={bulkStockVal}
                      onChange={(e) => setBulkStockVal(e.target.value)}
                      placeholder="Stock"
                      className="w-16 p-1 rounded bg-[#0f0f13] border border-[#27272a] text-white text-xs text-center"
                    />
                    <button
                      type="button"
                      onClick={applyBulkStockToAll}
                      className="py-1 px-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold cursor-pointer"
                    >
                      Set All Stock
                    </button>
                  </div>

                  {/* Bulk Price */}
                  <div className="flex items-center gap-1 bg-[#1a1a20] p-1 rounded-lg border border-[#2c2c36]">
                    <span className="text-zinc-400 text-xs pl-1">₹</span>
                    <input
                      type="number"
                      value={bulkPriceVal}
                      onChange={(e) => setBulkPriceVal(e.target.value)}
                      placeholder="Price"
                      className="w-16 p-1 rounded bg-[#0f0f13] border border-[#27272a] text-white text-xs text-center"
                    />
                    <button
                      type="button"
                      onClick={applyBulkPriceToAll}
                      className="py-1 px-2 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold cursor-pointer"
                    >
                      Set All Price
                    </button>
                  </div>

                  {/* Auto SKU Generator */}
                  <button
                    type="button"
                    onClick={autoGenerateAllSKUs}
                    className="py-1.5 px-3 rounded-lg bg-[#1a1a20] border border-[#2c2c36] hover:border-zinc-400 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3 text-cyan-400" />
                    <span>Auto-Generate SKUs</span>
                  </button>
                </div>

                {/* Switch View Toggle */}
                <div className="flex items-center gap-1 bg-[#1a1a20] p-1 rounded-lg border border-[#2c2c36]">
                  <button
                    type="button"
                    onClick={() => setViewMode("matrix_grid")}
                    className={`py-1 px-2.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      viewMode === "matrix_grid"
                        ? "bg-white text-black shadow-sm"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Grid className="w-3.5 h-3.5" />
                    <span>Matrix Grid</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("detailed_table")}
                    className={`py-1 px-2.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      viewMode === "detailed_table"
                        ? "bg-white text-black shadow-sm"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Granular Table</span>
                  </button>
                </div>
              </div>

              {/* VIEW 1: MATRIX GRID VIEW (As requested in User Prompt) */}
              {viewMode === "matrix_grid" && (
                <div className="overflow-x-auto rounded-xl border border-[#27272a] bg-[#09090c] shadow-xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#222228] bg-[#121216] text-zinc-400 font-bold uppercase tracking-wider">
                        <th className="py-3 px-4 min-w-[160px] sticky left-0 bg-[#121216] z-10 border-r border-[#222228]">
                          Color Variant
                        </th>
                        {activeSizes.map((sz) => (
                          <th key={sz} className="py-3 px-3 min-w-[90px] text-center">
                            {sz}
                          </th>
                        ))}
                        <th className="py-3 px-3 w-16 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e1e24]">
                      {colorGroups.map((group) => {
                        const hasCover = Boolean(group.image_url);

                        return (
                          <tr key={group.color} className="hover:bg-[#141418]/60 transition-colors">
                            {/* Color Header Cell */}
                            <td className="py-2.5 px-4 sticky left-0 bg-[#0d0d11] z-10 border-r border-[#222228]">
                              <div className="flex items-center gap-2.5">
                                {hasCover ? (
                                  <div className="w-8 h-8 rounded-lg overflow-hidden border border-[#3f3f46] shrink-0">
                                    <img
                                      src={group.image_url}
                                      alt={group.color}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <span
                                    className="w-6 h-6 rounded-full border border-white/20 shrink-0 shadow-sm"
                                    style={{ backgroundColor: group.color_hex || "#000" }}
                                  />
                                )}
                                <div>
                                  <span className="font-bold text-white text-xs block leading-tight">
                                    {group.color}
                                  </span>
                                  <span className="text-[10px] text-zinc-500">
                                    {group.gallery?.length || 0} photo(s)
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Size Cells for this Color */}
                            {activeSizes.map((sz) => {
                              const variant = group.items.find(
                                (v) => (v.size || "").toLowerCase() === sz.toLowerCase()
                              );
                              const stockQty = variant ? parseInt(variant.stock) || 0 : 0;
                              const isOutOfStock = stockQty <= 0;

                              return (
                                <td key={sz} className="py-2 px-2 text-center">
                                  {variant ? (
                                    <div
                                      className={`rounded-lg p-1.5 border transition-all ${
                                        isOutOfStock
                                          ? "bg-rose-950/20 border-rose-900/40"
                                          : stockQty <= 5
                                          ? "bg-amber-950/20 border-amber-800/40"
                                          : "bg-[#141418] border-[#27272a]"
                                      }`}
                                    >
                                      {/* Stock Input */}
                                      <input
                                        type="number"
                                        value={variant.stock}
                                        onChange={(e) =>
                                          updateCellStock(group.color, sz, e.target.value)
                                        }
                                        className={`w-full p-1 text-center font-bold rounded text-xs focus:outline-none focus:ring-1 focus:ring-white ${
                                          isOutOfStock
                                            ? "text-rose-400 bg-transparent"
                                            : "text-white bg-transparent"
                                        }`}
                                        title={`Stock for ${group.color} - ${sz}`}
                                      />

                                      {/* Small price info */}
                                      <div className="flex items-center justify-center gap-0.5 text-[10px] font-mono text-zinc-400 mt-0.5">
                                        <span>₹</span>
                                        <input
                                          type="number"
                                          value={variant.price}
                                          onChange={(e) =>
                                            updateCellPrice(group.color, sz, e.target.value)
                                          }
                                          className="w-12 text-center bg-transparent border-0 text-zinc-400 focus:text-white p-0 text-[10px]"
                                          title={`Price for ${group.color} - ${sz}`}
                                        />
                                      </div>

                                      {isOutOfStock && (
                                        <span className="block text-[8px] font-extrabold uppercase text-rose-400 tracking-tighter mt-0.5">
                                          OOS
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-zinc-600 text-[10px]">—</span>
                                  )}
                                </td>
                              );
                            })}

                            {/* Row Action */}
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => removeColorGroup(group.color)}
                                className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                                title={`Remove ${group.color} and all its sizes`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* VIEW 2: DETAILED TABLE VIEW */}
              {viewMode === "detailed_table" && (
                <div className="overflow-x-auto rounded-xl border border-[#27272a] bg-[#09090c] shadow-xl">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#222228] bg-[#121216] text-zinc-400 font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-3">Variant (Color × Size)</th>
                        <th className="py-2.5 px-3 w-28">Stock (Qty)</th>
                        <th className="py-2.5 px-3 w-32">Listing Price (₹)</th>
                        <th className="py-2.5 px-3 w-28">MRP (₹)</th>
                        <th className="py-2.5 px-3">SKU Identifier</th>
                        <th className="py-2.5 px-3 w-16 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1e1e24]">
                      {formData.variants.map((v) => {
                        const isZeroStock = parseInt(v.stock) <= 0;
                        return (
                          <tr key={v.id} className="hover:bg-[#141418]/60 transition-colors">
                            {/* Color + Size */}
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                                  style={{ backgroundColor: v.color_hex || "#3b82f6" }}
                                />
                                <span className="font-bold text-white text-xs">{v.color}</span>
                                <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono text-[10px] font-bold">
                                  {v.size}
                                </span>
                              </div>
                            </td>

                            {/* Stock */}
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                value={v.stock}
                                onChange={(e) =>
                                  updateCellStock(v.color || "Black", v.size, e.target.value)
                                }
                                className={`w-full p-1 px-2 rounded-md bg-[#141418] border text-xs font-bold ${
                                  isZeroStock
                                    ? "border-rose-800/80 text-rose-400"
                                    : "border-[#27272a] text-white"
                                }`}
                              />
                            </td>

                            {/* Price */}
                            <td className="py-2 px-3">
                              <div className="relative">
                                <span className="absolute left-2 top-1 text-zinc-500 text-xs">₹</span>
                                <input
                                  type="number"
                                  value={v.price}
                                  onChange={(e) =>
                                    updateCellPrice(v.color || "Black", v.size, e.target.value)
                                  }
                                  className="w-full p-1 pl-5 px-2 rounded-md bg-[#141418] border border-[#27272a] text-white font-bold text-xs"
                                />
                              </div>
                            </td>

                            {/* MRP */}
                            <td className="py-2 px-3">
                              <div className="relative">
                                <span className="absolute left-2 top-1 text-zinc-500 text-xs">₹</span>
                                <input
                                  type="number"
                                  value={v.mrp}
                                  onChange={(e) => {
                                    const updated = formData.variants.map((item) =>
                                      item.id === v.id ? { ...item, mrp: e.target.value } : item
                                    );
                                    onChange({ variants: updated });
                                  }}
                                  className="w-full p-1 pl-5 px-2 rounded-md bg-[#141418] border border-[#27272a] text-zinc-400 text-xs"
                                />
                              </div>
                            </td>

                            {/* SKU */}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={v.sku}
                                onChange={(e) =>
                                  updateCellSku(v.color || "Black", v.size, e.target.value)
                                }
                                className="w-full p-1 px-2 rounded-md bg-[#141418] border border-[#27272a] text-zinc-300 font-mono text-xs"
                              />
                            </td>

                            {/* Stock Badge */}
                            <td className="py-2 px-3 text-center">
                              {isZeroStock ? (
                                <span className="text-[9px] font-black uppercase text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded">
                                  OOS
                                </span>
                              ) : (
                                <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded">
                                  Active
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: COLOR-SPECIFIC PRODUCT IMAGES & GALLERIES */}
          {activeTab === "galleries" && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-[#0d0d11] border border-[#27272a]">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-emerald-400" />
                  Color-Specific Image Galleries
                </h4>
                <p className="text-xs text-zinc-400 mt-1">
                  Upload multiple product photos for each color (Front, Back, Model shoot, Texture detail).
                  When a customer clicks that color on the storefront, the gallery instantly switches to these exact photos.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {colorGroups.map((grp) => {
                  const gallery = grp.gallery || (grp.image_url ? [grp.image_url] : []);

                  return (
                    <div
                      key={grp.color}
                      className="p-5 rounded-2xl bg-[#0d0d11] border border-[#27272a] space-y-4"
                    >
                      {/* Color Header */}
                      <div className="flex items-center justify-between border-b border-[#222228] pb-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                            style={{ backgroundColor: grp.color_hex || "#3b82f6" }}
                          />
                          <h5 className="text-sm font-bold text-white">{grp.color}</h5>
                          <span className="text-xs text-zinc-400">
                            ({gallery.length} photo{gallery.length !== 1 ? "s" : ""})
                          </span>
                        </div>

                        {/* Swatch color picker */}
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-zinc-500">Swatch:</span>
                          <input
                            type="color"
                            value={grp.color_hex || "#000000"}
                            onChange={(e) => updateColorHex(grp.color, e.target.value)}
                            className="w-5 h-5 rounded border-0 bg-transparent cursor-pointer p-0"
                            title="Adjust Swatch Color"
                          />
                        </div>
                      </div>

                      {/* Photos List Grid */}
                      <div className="grid grid-cols-4 gap-2.5">
                        {gallery.map((imgUrl, imgIdx) => (
                          <div
                            key={imgIdx}
                            className="group relative aspect-square rounded-xl overflow-hidden border border-[#3f3f46] bg-[#141418]"
                          >
                            <img
                              src={imgUrl}
                              alt={`${grp.color} photo ${imgIdx + 1}`}
                              className="w-full h-full object-cover"
                            />

                            {/* Cover Badge */}
                            {imgIdx === 0 && (
                              <span className="absolute top-1 left-1 bg-black/80 text-emerald-400 text-[8px] font-black uppercase px-1 py-0.5 rounded border border-emerald-500/40">
                                Cover
                              </span>
                            )}

                            {/* Actions Overlay */}
                            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {imgIdx > 0 && (
                                <button
                                  type="button"
                                  onClick={() => setAsCoverImage(grp.color, imgIdx)}
                                  className="text-[9px] font-bold text-zinc-200 hover:text-white underline cursor-pointer"
                                >
                                  Make Cover
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => removeColorGalleryImage(grp.color, imgIdx)}
                                className="p-1 rounded text-red-400 hover:bg-red-500/20 cursor-pointer"
                                title="Remove photo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}

                        {/* Add Photo Button */}
                        <label className="aspect-square rounded-xl border-2 border-dashed border-[#3f3f46] hover:border-emerald-400 bg-[#141418] cursor-pointer flex flex-col items-center justify-center transition-colors">
                          <Upload className="w-4 h-4 text-zinc-400 group-hover:text-white" />
                          <span className="text-[9px] text-zinc-400 mt-1 font-bold">+ Photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={(e) =>
                              handleUploadColorGalleryImages(grp.color, e.target.files)
                            }
                            className="hidden"
                          />
                        </label>
                      </div>

                      <p className="text-[10px] text-zinc-500">
                        💡 First photo is used as primary thumbnail for this color on the customer page.
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: SIZE CHART BUILDER */}
          {activeTab === "size_chart" && (
            <div className="space-y-6">
              {/* Header & Quick Templates */}
              <div className="p-5 rounded-2xl bg-[#0d0d11] border border-[#27272a] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#222228] pb-3">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <Ruler className="w-4 h-4 text-emerald-400" />
                      Size Chart & Measurement Builder
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Create an interactive size guide for your product with custom dimensions and unit conversions.
                    </p>
                  </div>

                  {/* Measurement Unit Toggle */}
                  <div className="flex items-center gap-2 bg-[#141418] p-1 rounded-xl border border-[#27272a]">
                    <span className="text-[11px] text-zinc-400 pl-2">Unit:</span>
                    <button
                      type="button"
                      onClick={() => onChange({ measurement_unit: "inches" })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        formData.measurement_unit !== "cm"
                          ? "bg-white text-black shadow"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      Inches
                    </button>
                    <button
                      type="button"
                      onClick={() => onChange({ measurement_unit: "cm" })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        formData.measurement_unit === "cm"
                          ? "bg-white text-black shadow"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      CM
                    </button>
                  </div>
                </div>

                {/* Reusable Category Templates */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-zinc-400">Load Template:</span>
                  {Object.keys(SIZE_CHART_TEMPLATES).map((tplName) => (
                    <button
                      key={tplName}
                      type="button"
                      onClick={() => handleLoadSizeChartTemplate(tplName)}
                      className="py-1 px-2.5 rounded-lg bg-[#18181b] border border-[#27272a] hover:border-zinc-400 text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer"
                    >
                      {tplName}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add Custom Column Row */}
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <span className="text-zinc-400 font-medium">Add Measurement Column:</span>
                <input
                  type="text"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="e.g. Inseam, Collar"
                  className="p-1.5 px-2.5 rounded-lg bg-[#141418] border border-[#27272a] text-white text-xs w-40"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddChartColumn();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddChartColumn}
                  disabled={!newColumnName.trim()}
                  className="py-1.5 px-3 rounded-lg bg-zinc-800 text-white font-bold hover:bg-zinc-700 cursor-pointer disabled:opacity-40"
                >
                  + Add Column
                </button>
              </div>

              {/* Size Chart Grid */}
              <div className="overflow-x-auto rounded-xl border border-[#27272a] bg-[#09090c] shadow-xl">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#222228] bg-[#121216] text-zinc-400 font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-4 w-28 sticky left-0 bg-[#121216] z-10 border-r border-[#222228]">
                        Size
                      </th>
                      {chartColumns.map((col) => (
                        <th key={col} className="py-2.5 px-3 min-w-[100px]">
                          <div className="flex items-center justify-between gap-1">
                            <span>
                              {col} ({formData.measurement_unit || "in"})
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveChartColumn(col)}
                              className="text-zinc-600 hover:text-red-400 cursor-pointer"
                              title="Delete column"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1e1e24]">
                    {activeSizes.map((sz) => {
                      const rowData = (formData.size_measurements || []).find(
                        (r) => (r.size || "").toLowerCase() === sz.toLowerCase()
                      ) || {};

                      return (
                        <tr key={sz} className="hover:bg-[#141418]/60 transition-colors">
                          <td className="py-2.5 px-4 font-bold text-white sticky left-0 bg-[#0d0d11] z-10 border-r border-[#222228]">
                            <span className="px-2 py-1 rounded bg-[#1a1a22] border border-[#2f2f3c]">
                              {sz}
                            </span>
                          </td>

                          {chartColumns.map((col) => (
                            <td key={col} className="py-2 px-3">
                              <input
                                type="text"
                                value={rowData[col] || ""}
                                onChange={(e) =>
                                  updateMeasurementCell(sz, col, e.target.value)
                                }
                                placeholder="e.g. 40"
                                className="w-full p-1.5 px-2 rounded bg-[#141418] border border-[#27272a] text-white text-xs font-mono text-center focus:border-zinc-400"
                              />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Chart Notes Textarea */}
              <div className="p-4 rounded-xl bg-[#0d0d11] border border-[#27272a] space-y-2">
                <label className="text-xs font-bold text-zinc-300 block">
                  Size Guide Notes & Fit Advice (Shown to customer):
                </label>
                <textarea
                  value={formData.size_chart_notes || ""}
                  onChange={(e) => onChange({ size_chart_notes: e.target.value })}
                  rows={2}
                  placeholder="e.g. Regular fit. For relaxed streetwear style, we recommend ordering one size larger."
                  className="w-full p-2.5 rounded-lg bg-[#141418] border border-[#27272a] text-white text-xs"
                />
              </div>
            </div>
          )}

          {/* TAB 4: LIVE CUSTOMER PREVIEW */}
          {activeTab === "preview" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#0d0d11] border border-emerald-500/30 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Eye className="w-4 h-4 text-emerald-400" />
                    Live Storefront PDP Preview
                  </h4>
                  <p className="text-xs text-zinc-400">
                    Interact with your variants exactly as your customers will experience them.
                  </p>
                </div>
              </div>

              {/* Live Preview Card */}
              {(() => {
                const currentPreviewCol = previewColor || colorGroups[0]?.color || "Black";
                const currentPreviewGrp = colorGroups.find(
                  (g) => g.color.toLowerCase() === currentPreviewCol.toLowerCase()
                );
                const currentPreviewSz = previewSize || activeSizes[0] || "M";
                const currentPreviewVariant = currentPreviewGrp?.items.find(
                  (v) => (v.size || "").toLowerCase() === currentPreviewSz.toLowerCase()
                );

                const previewGallery =
                  currentPreviewGrp?.gallery && currentPreviewGrp.gallery.length > 0
                    ? currentPreviewGrp.gallery
                    : formData.images || [];

                const isOOS =
                  currentPreviewVariant?.stock !== undefined &&
                  parseInt(currentPreviewVariant.stock) <= 0;

                return (
                  <div className="p-6 rounded-3xl bg-black border border-zinc-800 max-w-xl mx-auto space-y-6 shadow-2xl">
                    {/* Preview Images */}
                    <div className="aspect-[4/5] rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 relative flex items-center justify-center">
                      {previewGallery.length > 0 ? (
                        <img
                          src={previewGallery[0]}
                          alt="Preview gallery photo"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-zinc-600 text-xs">No Photo for {currentPreviewCol}</div>
                      )}

                      <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-[10px] text-white font-bold">
                        {currentPreviewCol} • {previewGallery.length} Image(s)
                      </div>
                    </div>

                    {/* Product Title & Price */}
                    <div className="space-y-1">
                      <h3 className="text-lg font-black text-white">
                        {formData.name || "Men's Premium Streetwear Garment"}
                      </h3>
                      <div className="flex items-center gap-2.5">
                        <span className="text-2xl font-black text-white">
                          ₹{currentPreviewVariant?.price || formData.price || "499"}
                        </span>
                        {formData.mrp && (
                          <span className="text-xs text-zinc-500 line-through">
                            ₹{formData.mrp}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Preview Color Selector */}
                    <div className="space-y-2">
                      <span className="text-xs font-bold text-zinc-400">
                        Selected Color:{" "}
                        <strong className="text-white capitalize">{currentPreviewCol}</strong>
                      </span>
                      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar">
                        {colorGroups.map((g) => (
                          <button
                            key={g.color}
                            type="button"
                            onClick={() => setPreviewColor(g.color)}
                            className={`p-1 rounded-xl border transition-all cursor-pointer ${
                              currentPreviewCol.toLowerCase() === g.color.toLowerCase()
                                ? "border-white ring-2 ring-white scale-105"
                                : "border-zinc-800 opacity-70"
                            }`}
                          >
                            <div className="w-12 h-14 rounded-lg bg-zinc-900 overflow-hidden flex items-center justify-center">
                              {g.image_url ? (
                                <img
                                  src={g.image_url}
                                  alt={g.color}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span
                                  className="w-4 h-4 rounded-full"
                                  style={{ backgroundColor: g.color_hex || "#3b82f6" }}
                                />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Preview Size Selector */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-zinc-400">Select Size:</span>
                        <span className="text-white font-bold underline cursor-pointer">
                          Size Chart
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {activeSizes.map((sz) => {
                          const v = currentPreviewGrp?.items.find(
                            (it) => (it.size || "").toLowerCase() === sz.toLowerCase()
                          );
                          const szStock = v ? parseInt(v.stock) || 0 : 0;
                          const szOOS = szStock <= 0;
                          const isSzSelected =
                            currentPreviewSz.toLowerCase() === sz.toLowerCase();

                          return (
                            <button
                              key={sz}
                              type="button"
                              onClick={() => !szOOS && setPreviewSize(sz)}
                              disabled={szOOS}
                              className={`py-2 px-3.5 rounded-xl border text-xs font-bold transition-all ${
                                szOOS
                                  ? "border-zinc-850 text-zinc-600 line-through opacity-40 cursor-not-allowed"
                                  : isSzSelected
                                  ? "bg-white text-black border-white scale-105 shadow-md"
                                  : "border-zinc-800 text-zinc-300 hover:border-zinc-600 cursor-pointer"
                              }`}
                            >
                              {sz}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Preview Selected Summary */}
                    <div className="rounded-xl bg-zinc-950 border border-zinc-850 p-3 flex items-center justify-between text-xs">
                      <span className="text-zinc-400 font-semibold">
                        {currentPreviewCol} • {currentPreviewSz}
                      </span>
                      {isOOS ? (
                        <span className="text-rose-400 font-bold uppercase text-[10px]">
                          Out of Stock
                        </span>
                      ) : (
                        <span className="text-emerald-400 font-bold uppercase text-[10px]">
                          ✓ In Stock ({currentPreviewVariant?.stock || 20} left)
                        </span>
                      )}
                    </div>

                    {/* Preview Add to Cart / Buy Now buttons */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        disabled={isOOS}
                        className={`py-3 rounded-xl text-xs font-black uppercase tracking-wider ${
                          isOOS
                            ? "bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800"
                            : "bg-zinc-900 text-white border border-zinc-700"
                        }`}
                      >
                        {isOOS ? "Out of Stock" : "Add to Cart"}
                      </button>
                      <button
                        disabled={isOOS}
                        className={`py-3 rounded-xl text-xs font-black uppercase tracking-wider ${
                          isOOS
                            ? "bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800"
                            : "bg-white text-black"
                        }`}
                      >
                        {isOOS ? "Unavailable" : "Buy Now"}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
