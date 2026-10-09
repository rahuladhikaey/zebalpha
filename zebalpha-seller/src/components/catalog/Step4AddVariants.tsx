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
  Star,
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
    default_color?: string;
    main_color?: string;
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

export const PRESET_COLORS = [
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
  // Default to per_color_cards for easy visual per-color size management (Req #2 & #5)
  const [viewMode, setViewMode] = useState<"per_color_cards" | "matrix_grid" | "detailed_table">("per_color_cards");

  // Reusable Size Master (Req #12)
  const [sizeMaster, setSizeMaster] = useState<string[]>(() => {
    const base = ["XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "Free Size", "28", "30", "32", "34", "36", "38", "40", "42"];
    const existing = new Set<string>(base);
    (formData.variants || []).forEach((v) => {
      if (v.size) existing.add(v.size.trim());
    });
    return Array.from(existing);
  });

  // Custom Color State
  const [customColorName, setCustomColorName] = useState("");
  const [customColorHex, setCustomColorHex] = useState("#3b82f6");

  // Custom Size Input for Size Master
  const [customSizeInput, setCustomSizeInput] = useState("");

  // Bulk Variant Modal States (Req #14)
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkSelectedColors, setBulkSelectedColors] = useState<string[]>([]);
  const [bulkSelectedSizes, setBulkSelectedSizes] = useState<string[]>(["S", "M", "L", "XL"]);

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

  // Auto-synchronize main product image and details from Step 1 as 1st Primary Variant (Index 0)
  React.useEffect(() => {
    const mainColor = (formData.default_color || formData.main_color || "Main Color").trim();
    const mainHex = PRESET_COLORS.find((c) => c.name.toLowerCase() === mainColor.toLowerCase())?.hex || "#18181b";
    const targetSizes = (formData.selected_sizes && formData.selected_sizes.length > 0)
      ? formData.selected_sizes
      : ["S", "M", "L", "XL"];
    const basePrice = formData.price || "499";
    const baseMrp = formData.mrp || String(Math.round(parseFloat(basePrice || "499") * 1.5));
    const cleanPrefix = formData.style_code ? formData.style_code.trim().toUpperCase() : "ZB";
    const cleanColTag = mainColor.toUpperCase().replace(/[^A-Z0-9]/g, "");

    const mainGallery = formData.images && formData.images.length > 0 ? formData.images : [];
    const mainCoverImg = mainGallery[0] || undefined;

    if (!formData.variants || formData.variants.length === 0) {
      const initialMainVariants: CatalogVariant[] = targetSizes.map((sz) => ({
        id: `${cleanPrefix}_${cleanColTag}_${sz.toUpperCase()}_${Date.now().toString(36).slice(-4)}_${Math.random().toString(36).slice(-3)}`,
        color: mainColor,
        color_hex: mainHex,
        size: sz,
        stock: "20",
        price: basePrice,
        mrp: baseMrp,
        defective_returns_price: formData.defective_returns_price || "",
        sku: `${cleanPrefix}_${cleanColTag}_${sz.toUpperCase()}`,
        is_active: true,
        image_url: mainCoverImg,
        gallery: mainGallery,
      }));

      onChange({
        has_variants: true,
        default_color: mainColor,
        main_color: mainColor,
        variants: initialMainVariants,
      });
    } else if (mainGallery.length > 0) {
      let needsUpdate = false;
      const updated = formData.variants.map((v) => {
        const isMainCol = (v.color || "").trim().toLowerCase() === mainColor.toLowerCase();
        if (isMainCol && (!v.image_url || !v.gallery || v.gallery.length === 0) && mainCoverImg) {
          needsUpdate = true;
          return {
            ...v,
            image_url: mainCoverImg,
            gallery: v.gallery && v.gallery.length > 0 ? v.gallery : mainGallery,
          };
        }
        return v;
      });

      if (needsUpdate) {
        onChange({ variants: updated });
      }
    }
  }, [formData.images?.length, formData.variants?.length, formData.default_color, formData.main_color, formData.price, formData.mrp, formData.selected_sizes?.length]);

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
        const vGallery = Array.isArray(v.gallery) && v.gallery.length > 0
          ? v.gallery
          : v.image_url
          ? [v.image_url]
          : formData.images && formData.images.length > 0
          ? formData.images
          : [];

        const group = {
          color: col,
          color_hex: v.color_hex || PRESET_COLORS.find((c) => c.name.toLowerCase() === col.toLowerCase())?.hex || "#18181b",
          image_url: v.image_url || vGallery[0],
          gallery: vGallery,
          items: [],
        };
        map.set(col, group);
        groups.push(group);
      }
      const grp = map.get(col)!;
      if (v.image_url && !grp.image_url) {
        grp.image_url = v.image_url;
      }
      if (Array.isArray(v.gallery) && v.gallery.length > 0) {
        if (!grp.gallery || grp.gallery.length === 0 || (formData.images && grp.gallery === formData.images)) {
          grp.gallery = v.gallery;
          if (v.image_url) grp.image_url = v.image_url;
        }
      }
      grp.items.push(v);
    }

    // Rearrange so default_color / main_color is ALWAYS FIRST (Index 0) (Req #1)
    const activeDef = (formData.default_color || formData.main_color || groups[0]?.color || "").trim().toLowerCase();
    if (activeDef) {
      const defIdx = groups.findIndex((g) => g.color.toLowerCase() === activeDef);
      if (defIdx > 0) {
        const [defGrp] = groups.splice(defIdx, 1);
        groups.unshift(defGrp);
      }
    }

    return groups;
  }, [formData.variants, formData.default_color, formData.main_color]);

  const activeDefaultColor =
    formData.default_color ||
    formData.main_color ||
    colorGroups[0]?.color ||
    "Black";

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
  // ----------------------------------------------------------------------
  // COLOR MANAGEMENT
  // ----------------------------------------------------------------------
  const addColorVariant = (colorName: string, colorHex?: string, initialSizes?: string[]) => {
    if (!colorName.trim()) return;
    const cleanName = colorName.trim();

    // Prevent duplicate color
    if (colorGroups.some((g) => g.color.toLowerCase() === cleanName.toLowerCase())) {
      return;
    }

    const assignedHex =
      colorHex ||
      PRESET_COLORS.find((c) => c.name.toLowerCase() === cleanName.toLowerCase())?.hex ||
      "#3b82f6";

    // Start with specified sizes or standard baseline (Req #2)
    const targetSizes = initialSizes || ["S", "M", "L", "XL"];
    const basePrice = formData.price || "499";
    const baseMrp = formData.mrp || String(Math.round(parseFloat(basePrice || "499") * 1.5));
    const cleanPrefix = formData.style_code ? formData.style_code.trim().toUpperCase() : "ZB";
    const cleanColTag = cleanName.toUpperCase().replace(/[^A-Z0-9]/g, "");

    const newVariants: CatalogVariant[] = targetSizes.map((sz) => ({
      id: `${cleanPrefix}_${cleanColTag}_${sz.toUpperCase()}_${Date.now().toString(36).slice(-4)}_${Math.random().toString(36).slice(-3)}`,
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

    const updates: Partial<Step4Props["formData"]> = {
      has_variants: true,
      variants: [...formData.variants, ...newVariants],
    };

    if (!formData.default_color && !formData.main_color) {
      updates.default_color = cleanName;
      updates.main_color = cleanName;
    }

    onChange(updates);
    showSuccessBanner(`Added "${cleanName}" with ${targetSizes.length} sizes`);
  };

  const removeColorGroup = (colorName: string) => {
    const updated = formData.variants.filter(
      (v) => (v.color || "Black").trim().toLowerCase() !== colorName.trim().toLowerCase()
    );
    const updates: Partial<Step4Props["formData"]> = { variants: updated };
    if (
      formData.default_color?.toLowerCase() === colorName.toLowerCase() ||
      formData.main_color?.toLowerCase() === colorName.toLowerCase()
    ) {
      const remainingColor = updated[0]?.color || "";
      updates.default_color = remainingColor;
      updates.main_color = remainingColor;
    }
    onChange(updates);
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
  // INDEPENDENT PER-COLOR SIZE MANAGEMENT (Req #1, #2, #3, #6, #12)
  // ----------------------------------------------------------------------
  const toggleSizeForColor = (colorName: string, sizeName: string) => {
    if (!colorName || !sizeName) return;
    const cleanCol = colorName.trim();
    const cleanSz = sizeName.trim();

    const existingIndex = formData.variants.findIndex(
      (v) =>
        (v.color || "Black").trim().toLowerCase() === cleanCol.toLowerCase() &&
        (v.size || "").trim().toLowerCase() === cleanSz.toLowerCase()
    );

    if (existingIndex !== -1) {
      // Remove this size from this color ONLY (Req #3: Do NOT keep non-existent variants)
      const updated = formData.variants.filter((_, idx) => idx !== existingIndex);
      onChange({ variants: updated });
      showSuccessBanner(`Removed size ${cleanSz} from ${cleanCol}`);
    } else {
      // Add this size to this color ONLY
      const grp = colorGroups.find((g) => g.color.toLowerCase() === cleanCol.toLowerCase());
      const basePrice = formData.price || "499";
      const baseMrp = formData.mrp || String(Math.round(parseFloat(basePrice || "499") * 1.5));
      const cleanPrefix = formData.style_code ? formData.style_code.trim().toUpperCase() : "ZB";
      const cleanColTag = cleanCol.toUpperCase().replace(/[^A-Z0-9]/g, "");

      const newVar: CatalogVariant = {
        id: `${cleanPrefix}_${cleanColTag}_${cleanSz.toUpperCase()}_${Date.now().toString(36).slice(-4)}_${Math.random().toString(36).slice(-3)}`,
        color: cleanCol,
        color_hex: grp?.color_hex,
        size: cleanSz,
        stock: "20",
        price: basePrice,
        mrp: baseMrp,
        defective_returns_price: formData.defective_returns_price || "",
        sku: `${cleanPrefix}_${cleanColTag}_${cleanSz.toUpperCase()}`,
        image_url: grp?.image_url,
        gallery: grp?.gallery || [],
        is_active: true,
      };

      onChange({
        has_variants: true,
        variants: [...formData.variants, newVar],
      });
      showSuccessBanner(`Added size ${cleanSz} to ${cleanCol}`);
    }
  };

  // Add custom size to the Size Master (Req #12)
  const addCustomSizeToMaster = (sizeName: string) => {
    const clean = sizeName.trim();
    if (!clean) return;
    if (!sizeMaster.some((s) => s.toLowerCase() === clean.toLowerCase())) {
      setSizeMaster((prev) => [...prev, clean]);
      showSuccessBanner(`Added size "${clean}" to Size Master`);
    }
    setCustomSizeInput("");
  };

  // Bulk Variant Creation: "Apply these sizes to selected colors" (Req #14)
  const applySizesToSelectedColors = (targetColors: string[], targetSizes: string[]) => {
    if (!targetColors.length || !targetSizes.length) return;

    let updated = [...formData.variants];
    const cleanPrefix = formData.style_code ? formData.style_code.trim().toUpperCase() : "ZB";
    const basePrice = formData.price || "499";
    const baseMrp = formData.mrp || String(Math.round(parseFloat(basePrice || "499") * 1.5));

    targetColors.forEach((col) => {
      const grp = colorGroups.find((g) => g.color.toLowerCase() === col.toLowerCase());
      const cleanColTag = col.toUpperCase().replace(/[^A-Z0-9]/g, "");

      targetSizes.forEach((sz) => {
        const alreadyExists = updated.some(
          (v) =>
            (v.color || "Black").trim().toLowerCase() === col.toLowerCase() &&
            (v.size || "").trim().toLowerCase() === sz.toLowerCase()
        );

        if (!alreadyExists) {
          updated.push({
            id: `${cleanPrefix}_${cleanColTag}_${sz.toUpperCase()}_${Date.now().toString(36).slice(-4)}_${Math.random().toString(36).slice(-3)}`,
            color: col,
            color_hex: grp?.color_hex,
            size: sz,
            stock: "20",
            price: basePrice,
            mrp: baseMrp,
            defective_returns_price: formData.defective_returns_price || "",
            sku: `${cleanPrefix}_${cleanColTag}_${sz.toUpperCase()}`,
            image_url: grp?.image_url,
            gallery: grp?.gallery || [],
            is_active: true,
          });
        }
      });
    });

    onChange({ has_variants: true, variants: updated });
    showSuccessBanner(`Applied ${targetSizes.length} sizes to ${targetColors.length} colors`);
    setShowBulkModal(false);
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

  const updateCellMrp = (colorName: string, sizeName: string, newMrp: string) => {
    const updated = formData.variants.map((v) => {
      if (
        (v.color || "Black").trim().toLowerCase() === colorName.trim().toLowerCase() &&
        (v.size || "").trim().toLowerCase() === sizeName.trim().toLowerCase()
      ) {
        return { ...v, mrp: newMrp };
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

                {/* 1.5 MAIN / DEFAULT PRODUCT COLOR (Req #1) */}
                {colorGroups.length > 0 && (
                  <div className="border-t border-[#1e1e24] pt-3.5 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <div>
                        <span className="text-xs font-black text-amber-400 flex items-center gap-1.5 uppercase tracking-wide">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          MAIN / DEFAULT PRODUCT COLOR (Always 1st for Customers):
                        </span>
                        <p className="text-[10px] text-zinc-400 mt-0.5">
                          Select which color is the primary display variant. This color will be placed at index 0 and loaded first on the customer storefront.
                        </p>
                      </div>
                      <span className="text-[10px] font-black text-black bg-amber-400 px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 self-start sm:self-auto shadow-sm">
                        ★ 1st: {activeDefaultColor}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap pt-0.5">
                      {colorGroups.map((g) => {
                        const isMain = activeDefaultColor.toLowerCase() === g.color.toLowerCase();
                        return (
                          <button
                            key={g.color}
                            type="button"
                            onClick={() => {
                              onChange({
                                default_color: g.color,
                                main_color: g.color,
                              });
                              showSuccessBanner(`"${g.color}" set as Main / Default Product Color (Index 0)`);
                            }}
                            className={`py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-2 transition-all border cursor-pointer ${
                              isMain
                                ? "bg-amber-500 text-black border-amber-300 ring-2 ring-amber-400/50 shadow-md font-black"
                                : "bg-[#141418] text-zinc-300 border-[#27272a] hover:border-zinc-500 hover:text-white"
                            }`}
                          >
                            <span
                              className="w-3 h-3 rounded-full border border-black/30 shrink-0"
                              style={{ backgroundColor: g.color_hex || "#3b82f6" }}
                            />
                            <span>{g.color}</span>
                            {isMain ? (
                              <span className="text-[8px] bg-black text-amber-300 px-1.5 py-0.5 rounded font-black uppercase tracking-tight">
                                ★ Main (1st)
                              </span>
                            ) : (
                              <span className="text-[9px] text-zinc-500">
                                Make Main
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. Reusable Size Master (Req #12) */}
                <div className="border-t border-[#1e1e24] pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-zinc-300">
                      Reusable Size Master Library:
                    </span>
                    <span className="text-[11px] text-zinc-500">
                      {sizeMaster.length} Master Sizes Available
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {sizeMaster.map((sz) => (
                      <span
                        key={sz}
                        className="py-1 px-2.5 rounded-lg text-xs font-bold bg-[#141418] text-zinc-300 border border-[#27272a]"
                      >
                        {sz}
                      </span>
                    ))}

                    {/* Add Custom Size to Master */}
                    <div className="flex items-center gap-1 ml-auto">
                      <input
                        type="text"
                        value={customSizeInput}
                        onChange={(e) => setCustomSizeInput(e.target.value)}
                        placeholder="New Size"
                        className="p-1 px-2 rounded-md bg-[#141418] border border-[#27272a] text-white text-xs w-24"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addCustomSizeToMaster(customSizeInput);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => addCustomSizeToMaster(customSizeInput)}
                        className="py-1 px-2.5 rounded-md bg-zinc-800 text-white text-xs font-semibold hover:bg-zinc-700 cursor-pointer"
                      >
                        + Master Size
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-zinc-500 mt-1.5">
                    💡 Assign these sizes to each color below independently. A color only has the sizes you explicitly select.
                  </p>
                </div>
              </div>

              {/* Bulk Actions & View Modes Toolbar */}
              <div className="p-3.5 rounded-xl bg-[#121216] border border-[#27272a] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {/* Bulk Assign Tool Button (Req #14) */}
                  <button
                    type="button"
                    onClick={() => {
                      setBulkSelectedColors(colorGroups.map((g) => g.color));
                      setShowBulkModal(true);
                    }}
                    className="py-1.5 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Apply Sizes to Multiple Colors</span>
                  </button>

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
                      Set Stock
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
                      Set Price
                    </button>
                  </div>

                  {/* Auto SKU Generator */}
                  <button
                    type="button"
                    onClick={autoGenerateAllSKUs}
                    className="py-1.5 px-3 rounded-lg bg-[#1a1a20] border border-[#2c2c36] hover:border-zinc-400 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3 text-cyan-400" />
                    <span>Auto-SKUs</span>
                  </button>
                </div>

                {/* 3 View Modes Switcher */}
                <div className="flex items-center gap-1 bg-[#1a1a20] p-1 rounded-lg border border-[#2c2c36]">
                  <button
                    type="button"
                    onClick={() => setViewMode("per_color_cards")}
                    className={`py-1 px-2.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      viewMode === "per_color_cards"
                        ? "bg-white text-black shadow-sm"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Per-Color Cards</span>
                  </button>
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
                    <span>Table</span>
                  </button>
                </div>
              </div>

              {/* VIEW 0: PER-COLOR CARDS (Default & Primary View - Req #2, #5, #6) */}
              {viewMode === "per_color_cards" && (
                <div className="space-y-5">
                  {colorGroups.map((group) => {
                    const colorSizes = group.items.map((v) => (v.size || "").trim());

                    return (
                      <div
                        key={group.color}
                        className="p-5 rounded-2xl bg-[#0d0d11] border border-[#27272a] space-y-4 shadow-lg"
                      >
                        {/* Header: Color Swatch + Name + Hex + Photo count + Remove */}
                        <div className="flex items-center justify-between border-b border-[#222228] pb-3">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              {group.image_url ? (
                                <img
                                  src={group.image_url}
                                  alt={group.color}
                                  className="w-10 h-10 rounded-xl object-cover border border-[#3f3f46]"
                                />
                              ) : (
                                <span
                                  className="w-8 h-8 rounded-full border border-white/20 block"
                                  style={{ backgroundColor: group.color_hex || "#000" }}
                                />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-base font-black text-white capitalize">
                                  {group.color}
                                </span>
                                <input
                                  type="color"
                                  value={group.color_hex || "#000000"}
                                  onChange={(e) => updateColorHex(group.color, e.target.value)}
                                  className="w-5 h-5 rounded border-0 bg-transparent cursor-pointer p-0"
                                  title="Change Swatch Color"
                                />
                              </div>
                              <span className="text-xs text-zinc-400 font-medium">
                                {colorSizes.length} {colorSizes.length === 1 ? "size configured" : "sizes configured"}
                              </span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeColorGroup(group.color)}
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                            title={`Delete ${group.color} and all its sizes`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Available Sizes for this specific Color */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-zinc-300">
                              Available Sizes for <strong className="text-white capitalize">{group.color}</strong>:
                            </span>
                            <div className="flex items-center gap-2 text-[11px]">
                              <button
                                type="button"
                                onClick={() => {
                                  const standard = ["S", "M", "L", "XL"];
                                  standard.forEach((sz) => {
                                    if (!colorSizes.includes(sz)) toggleSizeForColor(group.color, sz);
                                  });
                                }}
                                className="text-zinc-400 hover:text-white underline cursor-pointer"
                              >
                                + Standard (S-XL)
                              </button>
                              <span className="text-zinc-600">•</span>
                              <button
                                type="button"
                                onClick={() => {
                                  colorSizes.forEach((sz) => toggleSizeForColor(group.color, sz));
                                }}
                                className="text-zinc-500 hover:text-red-400 underline cursor-pointer"
                              >
                                Clear Sizes
                              </button>
                            </div>
                          </div>

                          {/* Interactive Size Pills for this Color */}
                          <div className="flex items-center gap-2 flex-wrap">
                            {sizeMaster.map((sz) => {
                              const isSelected = colorSizes.includes(sz);
                              return (
                                <button
                                  key={sz}
                                  type="button"
                                  onClick={() => toggleSizeForColor(group.color, sz)}
                                  className={`py-1.5 px-3.5 rounded-xl text-xs font-black transition-all border cursor-pointer flex items-center gap-1.5 ${
                                    isSelected
                                      ? "bg-white text-black border-white shadow-lg ring-1 ring-white/60 scale-105"
                                      : "bg-[#141418] text-zinc-400 border-[#27272a] hover:border-zinc-500 hover:text-white"
                                  }`}
                                  title={isSelected ? `Remove ${sz} from ${group.color}` : `Add ${sz} to ${group.color}`}
                                >
                                  <span>{sz}</span>
                                  {isSelected && <Check className="w-3 h-3 text-black stroke-[3]" />}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Variants Table for this specific Color */}
                        {group.items.length > 0 ? (
                          <div className="overflow-x-auto rounded-xl border border-[#222228] bg-[#09090c] pt-1">
                            <table className="w-full text-left text-xs">
                              <thead>
                                <tr className="border-b border-[#222228] bg-[#121216] text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                                  <th className="py-2.5 px-3">Size</th>
                                  <th className="py-2.5 px-3 w-28">Stock Qty</th>
                                  <th className="py-2.5 px-3 w-32">Listing Price (₹)</th>
                                  <th className="py-2.5 px-3 w-28">MRP (₹)</th>
                                  <th className="py-2.5 px-3">SKU Identifier</th>
                                  <th className="py-2.5 px-3 w-12 text-center">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#1e1e24]">
                                {group.items.map((v) => {
                                  const stockQty = parseInt(v.stock) || 0;
                                  const isOutOfStock = stockQty <= 0;
                                  return (
                                    <tr key={v.id} className="hover:bg-[#141418]/60 transition-colors">
                                      <td className="py-2 px-3">
                                        <span className="px-2 py-1 rounded bg-zinc-800 text-white font-mono text-xs font-black">
                                          {v.size}
                                        </span>
                                      </td>
                                      <td className="py-2 px-3">
                                        <input
                                          type="number"
                                          value={v.stock}
                                          onChange={(e) => updateCellStock(group.color, v.size, e.target.value)}
                                          className={`w-full p-1.5 px-2 rounded-lg bg-[#141418] border text-xs font-bold ${
                                            isOutOfStock ? "border-rose-900 text-rose-400" : "border-[#27272a] text-white"
                                          }`}
                                        />
                                      </td>
                                      <td className="py-2 px-3">
                                        <div className="relative">
                                          <span className="absolute left-2 top-1.5 text-zinc-500 text-xs">₹</span>
                                          <input
                                            type="number"
                                            value={v.price}
                                            onChange={(e) => updateCellPrice(group.color, v.size, e.target.value)}
                                            className="w-full p-1.5 pl-5 rounded-lg bg-[#141418] border border-[#27272a] text-white text-xs font-bold"
                                          />
                                        </div>
                                      </td>
                                      <td className="py-2 px-3">
                                        <div className="relative">
                                          <span className="absolute left-2 top-1.5 text-zinc-500 text-xs">₹</span>
                                          <input
                                            type="number"
                                            value={v.mrp}
                                            onChange={(e) => updateCellMrp(group.color, v.size, e.target.value)}
                                            className="w-full p-1.5 pl-5 rounded-lg bg-[#141418] border border-[#27272a] text-zinc-400 text-xs"
                                          />
                                        </div>
                                      </td>
                                      <td className="py-2 px-3">
                                        <input
                                          type="text"
                                          value={v.sku}
                                          onChange={(e) => updateCellSku(group.color, v.size, e.target.value)}
                                          className="w-full p-1.5 px-2 rounded-lg bg-[#141418] border border-[#27272a] text-zinc-300 font-mono text-xs"
                                        />
                                      </td>
                                      <td className="py-2 px-3 text-center">
                                        <button
                                          type="button"
                                          onClick={() => toggleSizeForColor(group.color, v.size)}
                                          className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 cursor-pointer"
                                          title={`Remove ${v.size} from ${group.color}`}
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
                        ) : (
                          <div className="p-4 rounded-xl border border-dashed border-[#27272a] text-center text-xs text-zinc-500">
                            No sizes selected for {group.color} yet. Click size pills above to add available sizes.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

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
                                    <button
                                      type="button"
                                      onClick={() => toggleSizeForColor(group.color, sz)}
                                      className="py-1 px-2 rounded border border-dashed border-[#27272a] hover:border-zinc-500 text-zinc-500 hover:text-white text-[10px] transition-colors cursor-pointer"
                                      title={`Add ${sz} for ${group.color}`}
                                    >
                                      + Add
                                    </button>
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
                // CRITICAL: Available sizes strictly for this specific preview color (Req #7, #8, #15)
                const availableSizesForPreview = currentPreviewGrp?.items.map((it) => it.size) || [];
                const currentPreviewSz = availableSizesForPreview.includes(previewSize)
                  ? previewSize
                  : availableSizesForPreview[0] || "";
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
                            onClick={() => {
                              setPreviewColor(g.color);
                              const gSizes = g.items.map((it) => it.size);
                              if (!gSizes.includes(previewSize)) {
                                setPreviewSize(gSizes[0] || "");
                              }
                            }}
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

                    {/* Preview Size Selector - strictly shows sizes existing for currentPreviewCol */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-zinc-400">
                          Available Sizes for {currentPreviewCol} ({availableSizesForPreview.length}):
                        </span>
                        <span className="text-white font-bold underline cursor-pointer">
                          Size Chart
                        </span>
                      </div>
                      {availableSizesForPreview.length > 0 ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          {availableSizesForPreview.map((sz) => {
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
                                    ? "border-zinc-850 bg-zinc-950/40 text-zinc-600 line-through opacity-45 cursor-not-allowed"
                                    : isSzSelected
                                    ? "bg-white text-black border-white scale-105 shadow-md"
                                    : "border-zinc-800 text-zinc-300 hover:border-zinc-600 cursor-pointer"
                                }`}
                              >
                                {sz}
                                {szOOS && (
                                  <span className="text-[8px] font-bold text-rose-400 block uppercase tracking-tighter">
                                    OOS
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl border border-dashed border-zinc-800 text-center text-xs text-zinc-500">
                          No sizes selected for {currentPreviewCol}. Go to &quot;Variant Matrix &amp; Stock&quot; to pick sizes.
                        </div>
                      )}
                    </div>

                    {/* Preview Selected Summary */}
                    <div className="rounded-xl bg-zinc-950 border border-zinc-850 p-3 flex items-center justify-between text-xs">
                      <span className="text-zinc-400 font-semibold">
                        {currentPreviewCol} • {currentPreviewSz || "No Size Selected"}
                      </span>
                      {isOOS ? (
                        <span className="text-rose-400 font-bold uppercase text-[10px]">
                          Out of Stock
                        </span>
                      ) : currentPreviewVariant ? (
                        <span className="text-emerald-400 font-bold uppercase text-[10px]">
                          ✓ In Stock ({currentPreviewVariant.stock || 20} left)
                        </span>
                      ) : (
                        <span className="text-zinc-500 uppercase text-[10px]">
                          Select a size
                        </span>
                      )}
                    </div>

                    {/* Preview Add to Cart / Buy Now buttons */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        disabled={isOOS || !currentPreviewVariant}
                        className={`py-3 rounded-xl text-xs font-black uppercase tracking-wider ${
                          isOOS || !currentPreviewVariant
                            ? "bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800"
                            : "bg-zinc-900 text-white border border-zinc-700"
                        }`}
                      >
                        {isOOS ? "Out of Stock" : "Add to Cart"}
                      </button>
                      <button
                        disabled={isOOS || !currentPreviewVariant}
                        className={`py-3 rounded-xl text-xs font-black uppercase tracking-wider ${
                          isOOS || !currentPreviewVariant
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

      {/* BULK SIZE ASSIGNMENT MODAL (Req #14) */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121216] border border-[#27272a] rounded-2xl max-w-lg w-full p-5 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#222228] pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  Apply Sizes to Multiple Colors
                </h3>
                <p className="text-xs text-zinc-400">
                  Quickly bulk-assign sizes to chosen colors. You can still customize each color independently afterward.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step 1: Select Target Colors */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-300">
                  1. Select Colors to Apply To:
                </label>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setBulkSelectedColors(colorGroups.map((g) => g.color))}
                    className="text-emerald-400 hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-zinc-600">•</span>
                  <button
                    type="button"
                    onClick={() => setBulkSelectedColors([])}
                    className="text-zinc-500 hover:underline cursor-pointer"
                  >
                    Deselect All
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {colorGroups.map((g) => {
                  const isChecked = bulkSelectedColors.some(
                    (c) => c.toLowerCase() === g.color.toLowerCase()
                  );
                  return (
                    <button
                      key={g.color}
                      type="button"
                      onClick={() => {
                        if (isChecked) {
                          setBulkSelectedColors(
                            bulkSelectedColors.filter(
                              (c) => c.toLowerCase() !== g.color.toLowerCase()
                            )
                          );
                        } else {
                          setBulkSelectedColors([...bulkSelectedColors, g.color]);
                        }
                      }}
                      className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer ${
                        isChecked
                          ? "bg-zinc-800 text-white border-white/80"
                          : "bg-[#18181c] text-zinc-400 border-[#27272a] hover:border-zinc-500"
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-white/20"
                        style={{ backgroundColor: g.color_hex || "#3b82f6" }}
                      />
                      <span>{g.color}</span>
                      {isChecked && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Select Sizes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-zinc-300">
                  2. Choose Sizes from Size Master:
                </label>
                <div className="flex items-center gap-2 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setBulkSelectedSizes([...sizeMaster])}
                    className="text-emerald-400 hover:underline cursor-pointer"
                  >
                    Select All
                  </button>
                  <span className="text-zinc-600">•</span>
                  <button
                    type="button"
                    onClick={() => setBulkSelectedSizes([])}
                    className="text-zinc-500 hover:underline cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap max-h-48 overflow-y-auto p-1">
                {sizeMaster.map((sz) => {
                  const isChecked = bulkSelectedSizes.includes(sz);
                  return (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => {
                        if (isChecked) {
                          setBulkSelectedSizes(bulkSelectedSizes.filter((s) => s !== sz));
                        } else {
                          setBulkSelectedSizes([...bulkSelectedSizes, sz]);
                        }
                      }}
                      className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        isChecked
                          ? "bg-white text-black border-white shadow-sm"
                          : "bg-[#18181c] text-zinc-400 border-[#27272a] hover:border-zinc-600"
                      }`}
                    >
                      {sz}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#222228]">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="py-2 px-4 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => applySizesToSelectedColors(bulkSelectedColors, bulkSelectedSizes)}
                disabled={bulkSelectedColors.length === 0 || bulkSelectedSizes.length === 0}
                className="py-2 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
              >
                Apply to {bulkSelectedColors.length} Colors
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
