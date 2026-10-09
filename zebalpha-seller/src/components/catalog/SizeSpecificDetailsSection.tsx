"use client";

import React, { useState } from "react";
import { Copy, Ruler, Layers, Sparkles, Check, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";

export interface SizeVariantDetail {
  id: string;
  size: string;
  mrp: string;
  selling_price: string;
  inventory: string;
  sku: string;
  return_price: string;
}

export interface SizeMeasurementDetail {
  size: string;
  bust_chest?: string;
  waist?: string;
  shoulder?: string;
  length?: string;
  hip?: string;
  sleeve_length?: string;
  inseam?: string;
  thigh?: string;
}

export type MeasurementUnit = "inches" | "cm";

export interface SizeSpecificDetailsSectionProps {
  selectedSizes: string[];
  sizeDetails: SizeVariantDetail[];
  sizeMeasurements: SizeMeasurementDetail[];
  measurementUnit: MeasurementUnit;
  isMeasurementsEnabled: boolean;
  styleCode?: string;
  subcategoryName?: string;
  defaultPrice?: string;
  defaultMrp?: string;
  categoryName?: string;
  onSizesChange: (newSizes: string[]) => void;
  onSizeDetailsChange: (newDetails: SizeVariantDetail[]) => void;
  onSizeMeasurementsChange: (newMeasurements: SizeMeasurementDetail[]) => void;
  onMeasurementUnitChange: (unit: MeasurementUnit) => void;
  onToggleMeasurements: (enabled: boolean) => void;
}

const STANDARD_GARMENT_SIZES = ["Free Size", "XS", "S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL"];
const WAIST_NUMERIC_SIZES = ["26", "28", "30", "32", "34", "36", "38", "40", "42", "44"];
const KIDS_SIZES = ["0-6M", "6-12M", "1-2Y", "2-3Y", "3-4Y", "4-5Y", "5-6Y", "6-7Y", "7-8Y", "9-10Y", "11-12Y", "13-14Y"];

export default function SizeSpecificDetailsSection({
  selectedSizes = [],
  sizeDetails = [],
  sizeMeasurements = [],
  measurementUnit = "inches",
  isMeasurementsEnabled = true,
  styleCode = "",
  subcategoryName = "",
  categoryName = "",
  defaultPrice = "",
  defaultMrp = "",
  onSizesChange,
  onSizeDetailsChange,
  onSizeMeasurementsChange,
  onMeasurementUnitChange,
  onToggleMeasurements,
}: SizeSpecificDetailsSectionProps) {
  const [sizeGroupTab, setSizeGroupTab] = useState<"standard" | "waist" | "kids">("standard");
  const [copyFeedback, setCopyFeedback] = useState<string>("");

  // Determine measurement category type based on subcategory name
  const subLower = (subcategoryName || "").toLowerCase();
  const catLower = (categoryName || "").toLowerCase();
  const isLowerBody = subLower.includes("jean") || subLower.includes("trouser") || subLower.includes("pant") || subLower.includes("cargo") || subLower.includes("short") || subLower.includes("jogger") || subLower.includes("legging");
  const isDress = subLower.includes("dress") || subLower.includes("jumpsuit") || subLower.includes("gown") || subLower.includes("saree");

  // Auto-switch size tab when Kids category is selected
  React.useEffect(() => {
    const isKids =
      subLower.includes("kid") ||
      subLower.includes("boy") ||
      subLower.includes("girl") ||
      subLower.includes("baby") ||
      subLower.includes("infant") ||
      subLower.includes("child") ||
      catLower.includes("kid") ||
      catLower.includes("boy") ||
      catLower.includes("girl") ||
      catLower.includes("baby") ||
      catLower === "kids";

    if (isKids) {
      setSizeGroupTab("kids");
    } else if (isLowerBody) {
      setSizeGroupTab("waist");
    }
  }, [subcategoryName, categoryName, subLower, catLower, isLowerBody]);

  const showFeedback = (msg: string) => {
    setCopyFeedback(msg);
    setTimeout(() => setCopyFeedback(""), 2200);
  };

  // Toggle a single size
  const toggleSize = (size: string) => {
    const isSelected = selectedSizes.includes(size);

    if (isSelected) {
      // Remove size
      const newSizes = selectedSizes.filter((s) => s !== size);
      const newDetails = sizeDetails.filter((d) => d.size !== size);
      const newMeasurements = sizeMeasurements.filter((m) => m.size !== size);

      onSizesChange(newSizes);
      onSizeDetailsChange(newDetails);
      onSizeMeasurementsChange(newMeasurements);
    } else {
      // Add size
      const newSizes = [...selectedSizes, size];

      // Generate initial clean detail row
      const cleanPrefix = styleCode ? styleCode.trim().toUpperCase() : "SKU";
      const cleanSizeStr = size.toUpperCase().replace(/\s+/g, "");

      const newDetailRow: SizeVariantDetail = {
        id: `size_${cleanSizeStr.toLowerCase()}_${Date.now()}`,
        size,
        mrp: defaultMrp || (sizeDetails[0]?.mrp ?? ""),
        selling_price: defaultPrice || (sizeDetails[0]?.selling_price ?? ""),
        inventory: sizeDetails[0]?.inventory || "50",
        sku: `${cleanPrefix}-${cleanSizeStr}`,
        return_price: defaultPrice
          ? String(Math.max(0, parseFloat(defaultPrice) - 5))
          : sizeDetails[0]?.return_price || "",
      };

      const newMeasurementRow: SizeMeasurementDetail = {
        size,
        bust_chest: "",
        waist: "",
        shoulder: "",
        length: "",
        hip: "",
        sleeve_length: "",
        inseam: "",
        thigh: "",
      };

      onSizesChange(newSizes);
      onSizeDetailsChange([...sizeDetails, newDetailRow]);
      onSizeMeasurementsChange([...sizeMeasurements, newMeasurementRow]);
    }
  };

  // Select all common standard sizes (S, M, L, XL)
  const selectCommonSizes = () => {
    const common = ["S", "M", "L", "XL"];
    const merged = Array.from(new Set([...selectedSizes, ...common]));
    const cleanPrefix = styleCode ? styleCode.trim().toUpperCase() : "SKU";

    const updatedDetails = [...sizeDetails];
    const updatedMeasurements = [...sizeMeasurements];

    common.forEach((sz) => {
      if (!updatedDetails.some((d) => d.size === sz)) {
        updatedDetails.push({
          id: `size_${sz.toLowerCase()}_${Date.now()}`,
          size: sz,
          mrp: defaultMrp || (sizeDetails[0]?.mrp ?? ""),
          selling_price: defaultPrice || (sizeDetails[0]?.selling_price ?? ""),
          inventory: sizeDetails[0]?.inventory || "50",
          sku: `${cleanPrefix}-${sz}`,
          return_price: defaultPrice
            ? String(Math.max(0, parseFloat(defaultPrice) - 5))
            : sizeDetails[0]?.return_price || "",
        });
      }
      if (!updatedMeasurements.some((m) => m.size === sz)) {
        updatedMeasurements.push({
          size: sz,
          bust_chest: "",
          waist: "",
          shoulder: "",
          length: "",
          hip: "",
          sleeve_length: "",
          inseam: "",
          thigh: "",
        });
      }
    });

    onSizesChange(merged);
    onSizeDetailsChange(updatedDetails);
    onSizeMeasurementsChange(updatedMeasurements);
    showFeedback("✓ Added S, M, L, XL sizes");
  };

  // Update a single field in Size-Specific Details
  const handleDetailChange = (size: string, field: keyof SizeVariantDetail, value: string) => {
    const updated = sizeDetails.map((item) => {
      if (item.size === size) {
        return { ...item, [field]: value };
      }
      return item;
    });
    onSizeDetailsChange(updated);
  };

  // Bulk copy a column value from row 0 to all rows in Size-Specific Details (Meesho Style)
  const copyDetailColumnToAll = (field: "mrp" | "selling_price" | "inventory" | "return_price") => {
    if (!sizeDetails.length) return;
    const sourceVal = sizeDetails[0][field];
    if (sourceVal === undefined || sourceVal === "") {
      showFeedback(`Enter a value in Row 1 (${field}) first.`);
      return;
    }

    const updated = sizeDetails.map((item) => ({
      ...item,
      [field]: sourceVal,
    }));

    onSizeDetailsChange(updated);
    showFeedback(`✓ Copied "${sourceVal}" to all size rows`);
  };

  // Copy all row 1 values to all sizes in Table 1
  const copyAllRow1Values = () => {
    if (!sizeDetails.length) return;
    const row0 = sizeDetails[0];
    if (!row0.selling_price && !row0.mrp && !row0.inventory) {
      showFeedback("Fill Row 1 values first to copy.");
      return;
    }

    const updated = sizeDetails.map((item, idx) => {
      if (idx === 0) return item;
      return {
        ...item,
        mrp: row0.mrp || item.mrp,
        selling_price: row0.selling_price || item.selling_price,
        inventory: row0.inventory || item.inventory,
        return_price: row0.return_price || item.return_price,
      };
    });

    onSizeDetailsChange(updated);
    showFeedback("✓ Copied Row 1 pricing & stock across all sizes");
  };

  // Update a single field in Size Measurements
  const handleMeasurementChange = (size: string, field: keyof SizeMeasurementDetail, value: string) => {
    const updated = sizeMeasurements.map((item) => {
      if (item.size === size) {
        return { ...item, [field]: value };
      }
      return item;
    });
    onSizeMeasurementsChange(updated);
  };

  // Bulk copy a measurement column value from row 0 to all rows
  const copyMeasurementColumnToAll = (field: keyof SizeMeasurementDetail) => {
    if (!sizeMeasurements.length) return;
    const sourceVal = sizeMeasurements[0][field];
    if (!sourceVal) {
      showFeedback("Enter a value in Row 1 first to copy.");
      return;
    }

    const updated = sizeMeasurements.map((item) => ({
      ...item,
      [field]: sourceVal,
    }));

    onSizeMeasurementsChange(updated);
    showFeedback(`✓ Copied ${String(field)} to all sizes`);
  };

  // Auto-fill measurement step (+2 inches per size for upper body)
  const autoFillUpperBodyStep = () => {
    if (!sizeMeasurements.length) return;
    const baseRow = sizeMeasurements[0];
    const baseChest = parseFloat(baseRow.bust_chest || "36") || 36;
    const baseWaist = parseFloat(baseRow.waist || "34") || 34;
    const baseShoulder = parseFloat(baseRow.shoulder || "15") || 15;
    const baseLength = parseFloat(baseRow.length || "30") || 30;
    const baseHip = parseFloat(baseRow.hip || "38") || 38;

    const stepInc = measurementUnit === "inches" ? 2 : 5;
    const shoulderStep = measurementUnit === "inches" ? 0.5 : 1.25;

    const updated = sizeMeasurements.map((m, idx) => ({
      ...m,
      bust_chest: String(baseChest + idx * stepInc),
      waist: String(baseWaist + idx * stepInc),
      shoulder: String(baseShoulder + idx * shoulderStep),
      length: String(baseLength),
      hip: String(baseHip + idx * stepInc),
    }));

    onSizeMeasurementsChange(updated);
    showFeedback(`✓ Auto-filled sizes with +${stepInc}${measurementUnit === "inches" ? '"' : 'cm'} increments`);
  };

  return (
    <div className="space-y-6 pt-2">
      {/* 1. Size Selection Header & Pills */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#141418] border border-[#27272a] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#27272a] pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Layers className="w-4 h-4" />
              </span>
              <label className="text-sm font-bold text-white tracking-wide">
                Available Sizes & Garment Variants <span className="text-red-400">*</span>
              </label>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Select the sizes available for this design. Dynamic pricing and measurement tables will generate automatically.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectCommonSizes}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Select S, M, L, XL</span>
            </button>
          </div>
        </div>

        {/* Size Group Tabs */}
        <div className="flex gap-2 text-xs font-bold border-b border-zinc-800/80 pb-2">
          <button
            type="button"
            onClick={() => setSizeGroupTab("standard")}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              sizeGroupTab === "standard"
                ? "bg-white text-black font-extrabold shadow-sm"
                : "text-zinc-400 hover:text-white hover:bg-zinc-850"
            }`}
          >
            Standard Apparel (XS–5XL)
          </button>
          <button
            type="button"
            onClick={() => setSizeGroupTab("waist")}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              sizeGroupTab === "waist"
                ? "bg-white text-black font-extrabold shadow-sm"
                : "text-zinc-400 hover:text-white hover:bg-zinc-850"
            }`}
          >
            Waist Sizes (26–44)
          </button>
          <button
            type="button"
            onClick={() => setSizeGroupTab("kids")}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              sizeGroupTab === "kids"
                ? "bg-white text-black font-extrabold shadow-sm"
                : "text-zinc-400 hover:text-white hover:bg-zinc-850"
            }`}
          >
            Kids & Infants
          </button>
        </div>

        {/* Size Pills Multi-Select */}
        <div className="flex flex-wrap gap-2 pt-1">
          {(sizeGroupTab === "standard"
            ? STANDARD_GARMENT_SIZES
            : sizeGroupTab === "waist"
            ? WAIST_NUMERIC_SIZES
            : KIDS_SIZES
          ).map((sz) => {
            const isSelected = selectedSizes.includes(sz);
            return (
              <button
                key={sz}
                type="button"
                onClick={() => toggleSize(sz)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? "bg-emerald-500 text-black border border-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)] font-black scale-102"
                    : "bg-[#0d0d11] text-zinc-300 border border-[#27272a] hover:border-zinc-500 hover:bg-zinc-900"
                }`}
              >
                {isSelected && <Check className="w-3.5 h-3.5 text-black stroke-[3]" />}
                <span>{sz}</span>
              </button>
            );
          })}
        </div>

        {selectedSizes.length === 0 && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Please select at least one size above to configure stock and pricing.</span>
          </div>
        )}
      </div>

      {/* Copy Feedback Toast Notification */}
      {copyFeedback && (
        <div className="sticky top-4 z-30 p-2.5 rounded-xl bg-emerald-950/90 border border-emerald-700 text-emerald-300 text-xs font-bold text-center shadow-2xl backdrop-blur-md animate-fade-in">
          {copyFeedback}
        </div>
      )}

      {/* 2. SIZE-SPECIFIC DETAILS TABLE (Pricing & Inventory Matrix) */}
      {selectedSizes.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-[#141418] border border-[#27272a] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#27272a] pb-3">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wide flex items-center gap-2">
                <span>2. Size-Specific Details</span>
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                  {selectedSizes.length} sizes active
                </span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Set individual MRP, selling price, stock, and SKU for each size. Click 📋 on any column header to copy Row 1 values across all sizes.
              </p>
            </div>

            <button
              type="button"
              onClick={copyAllRow1Values}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Row 1 to All</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#27272a]">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-[#0d0d11] uppercase font-bold text-[11px] text-zinc-400 border-b border-[#27272a]">
                <tr>
                  <th className="py-3 px-3.5 w-16">Size</th>
                  <th className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      <span>MRP (₹)</span>
                      <button
                        type="button"
                        onClick={() => copyDetailColumnToAll("mrp")}
                        title="Copy Row 1 MRP to all sizes"
                        className="p-1 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                      >
                        <Copy className="w-3 h-3 text-zinc-400 hover:text-emerald-400" />
                      </button>
                    </div>
                  </th>
                  <th className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-emerald-400 font-extrabold">Selling Price (₹)</span>
                      <button
                        type="button"
                        onClick={() => copyDetailColumnToAll("selling_price")}
                        title="Copy Row 1 Selling Price to all sizes"
                        className="p-1 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                      >
                        <Copy className="w-3 h-3 text-zinc-400 hover:text-emerald-400" />
                      </button>
                    </div>
                  </th>
                  <th className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      <span>Inventory</span>
                      <button
                        type="button"
                        onClick={() => copyDetailColumnToAll("inventory")}
                        title="Copy Row 1 Inventory to all sizes"
                        className="p-1 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                      >
                        <Copy className="w-3 h-3 text-zinc-400 hover:text-emerald-400" />
                      </button>
                    </div>
                  </th>
                  <th className="py-3 px-3">SKU</th>
                  <th className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      <span>Return Price (₹)</span>
                      <button
                        type="button"
                        onClick={() => copyDetailColumnToAll("return_price")}
                        title="Copy Row 1 Return Price to all sizes"
                        className="p-1 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                      >
                        <Copy className="w-3 h-3 text-zinc-400 hover:text-emerald-400" />
                      </button>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272a] bg-[#141418]">
                {sizeDetails.map((row) => (
                  <tr key={row.size} className="hover:bg-zinc-900/60 transition-colors">
                    {/* Size Badge */}
                    <td className="py-2.5 px-3.5 font-bold text-white">
                      <span className="inline-block px-2.5 py-1 rounded-md bg-zinc-800 text-white font-mono text-xs border border-zinc-700">
                        {row.size}
                      </span>
                    </td>

                    {/* MRP */}
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        min="0"
                        value={row.mrp}
                        onChange={(e) => handleDetailChange(row.size, "mrp", e.target.value)}
                        placeholder="399"
                        className="w-24 p-2 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs focus:border-white transition-colors"
                      />
                    </td>

                    {/* Selling Price */}
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        min="0"
                        value={row.selling_price}
                        onChange={(e) => handleDetailChange(row.size, "selling_price", e.target.value)}
                        placeholder="245"
                        className="w-28 p-2 rounded-lg bg-[#0d0d11] border border-emerald-500/50 text-emerald-300 font-bold text-xs focus:border-emerald-400 transition-colors"
                      />
                    </td>

                    {/* Inventory */}
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        min="0"
                        value={row.inventory}
                        onChange={(e) => handleDetailChange(row.size, "inventory", e.target.value)}
                        placeholder="50"
                        className="w-24 p-2 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs focus:border-white transition-colors"
                      />
                    </td>

                    {/* SKU */}
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={row.sku}
                        onChange={(e) => handleDetailChange(row.size, "sku", e.target.value)}
                        placeholder={`SKU-${row.size}`}
                        className="w-32 p-2 rounded-lg bg-[#0d0d11] border border-[#27272a] text-zinc-300 font-mono text-xs focus:border-white transition-colors"
                      />
                    </td>

                    {/* Return Price */}
                    <td className="py-2.5 px-3">
                      <input
                        type="number"
                        min="0"
                        value={row.return_price}
                        onChange={(e) => handleDetailChange(row.size, "return_price", e.target.value)}
                        placeholder="240"
                        className="w-28 p-2 rounded-lg bg-[#0d0d11] border border-[#27272a] text-zinc-300 text-xs focus:border-white transition-colors"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. SIZE MEASUREMENTS TABLE (Garment Dimensional Specs) */}
      {selectedSizes.length > 0 && (
        <div className="p-4 sm:p-5 rounded-2xl bg-[#141418] border border-[#27272a] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#27272a] pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-violet-500/10 text-violet-400">
                  <Ruler className="w-4 h-4" />
                </span>
                <h3 className="text-sm font-bold text-white uppercase tracking-wide">
                  3. Size Measurements & Fit Guide
                </h3>
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                Provide accurate garment dimensions for the customer storefront size guide modal. Helps reduce returns by up to 40%.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Unit Toggle: Inches vs CM */}
              <div className="flex items-center bg-[#0d0d11] p-1 rounded-xl border border-[#27272a]">
                <button
                  type="button"
                  onClick={() => onMeasurementUnitChange("inches")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    measurementUnit === "inches"
                      ? "bg-violet-600 text-white shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Inches
                </button>
                <button
                  type="button"
                  onClick={() => onMeasurementUnitChange("cm")}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    measurementUnit === "cm"
                      ? "bg-violet-600 text-white shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  CM
                </button>
              </div>

              {!isLowerBody && (
                <button
                  type="button"
                  onClick={autoFillUpperBodyStep}
                  title="Auto calculate +2 inches increment per size based on Row 1"
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                  <span>Auto-Fill Step</span>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#27272a]">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-[#0d0d11] uppercase font-bold text-[11px] text-zinc-400 border-b border-[#27272a]">
                <tr>
                  <th className="py-3 px-3.5 w-16">Size</th>

                  {/* Adaptive Columns */}
                  {!isLowerBody && (
                    <th className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span>Chest / Bust ({measurementUnit})</span>
                        <button
                          type="button"
                          onClick={() => copyMeasurementColumnToAll("bust_chest")}
                          title="Copy Row 1 to all sizes"
                          className="p-1 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                        >
                          <Copy className="w-3 h-3 text-zinc-400 hover:text-violet-400" />
                        </button>
                      </div>
                    </th>
                  )}

                  <th className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      <span>Waist ({measurementUnit})</span>
                      <button
                        type="button"
                        onClick={() => copyMeasurementColumnToAll("waist")}
                        title="Copy Row 1 to all sizes"
                        className="p-1 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                      >
                        <Copy className="w-3 h-3 text-zinc-400 hover:text-violet-400" />
                      </button>
                    </div>
                  </th>

                  {!isLowerBody && (
                    <th className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span>Shoulder ({measurementUnit})</span>
                        <button
                          type="button"
                          onClick={() => copyMeasurementColumnToAll("shoulder")}
                          title="Copy Row 1 to all sizes"
                          className="p-1 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                        >
                          <Copy className="w-3 h-3 text-zinc-400 hover:text-violet-400" />
                        </button>
                      </div>
                    </th>
                  )}

                  <th className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      <span>Length ({measurementUnit})</span>
                      <button
                        type="button"
                        onClick={() => copyMeasurementColumnToAll("length")}
                        title="Copy Row 1 to all sizes"
                        className="p-1 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                      >
                        <Copy className="w-3 h-3 text-zinc-400 hover:text-violet-400" />
                      </button>
                    </div>
                  </th>

                  <th className="py-3 px-3">
                    <div className="flex items-center gap-1.5">
                      <span>Hip ({measurementUnit})</span>
                      <button
                        type="button"
                        onClick={() => copyMeasurementColumnToAll("hip")}
                        title="Copy Row 1 to all sizes"
                        className="p-1 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                      >
                        <Copy className="w-3 h-3 text-zinc-400 hover:text-violet-400" />
                      </button>
                    </div>
                  </th>

                  {isLowerBody && (
                    <>
                      <th className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span>Inseam ({measurementUnit})</span>
                          <button
                            type="button"
                            onClick={() => copyMeasurementColumnToAll("inseam")}
                            className="p-1 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                          >
                            <Copy className="w-3 h-3 text-zinc-400 hover:text-violet-400" />
                          </button>
                        </div>
                      </th>
                      <th className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          <span>Thigh ({measurementUnit})</span>
                          <button
                            type="button"
                            onClick={() => copyMeasurementColumnToAll("thigh")}
                            className="p-1 hover:text-white hover:bg-zinc-800 rounded transition-colors cursor-pointer"
                          >
                            <Copy className="w-3 h-3 text-zinc-400 hover:text-violet-400" />
                          </button>
                        </div>
                      </th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#27272a] bg-[#141418]">
                {sizeMeasurements.map((mRow) => (
                  <tr key={mRow.size} className="hover:bg-zinc-900/60 transition-colors">
                    {/* Size Label */}
                    <td className="py-2.5 px-3.5 font-bold text-white">
                      <span className="inline-block px-2.5 py-1 rounded-md bg-zinc-800 text-white font-mono text-xs border border-zinc-700">
                        {mRow.size}
                      </span>
                    </td>

                    {/* Chest / Bust */}
                    {!isLowerBody && (
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={mRow.bust_chest || ""}
                          onChange={(e) => handleMeasurementChange(mRow.size, "bust_chest", e.target.value)}
                          placeholder="38"
                          className="w-24 p-2 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs focus:border-violet-400 transition-colors"
                        />
                      </td>
                    )}

                    {/* Waist */}
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={mRow.waist || ""}
                        onChange={(e) => handleMeasurementChange(mRow.size, "waist", e.target.value)}
                        placeholder="36"
                        className="w-24 p-2 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs focus:border-violet-400 transition-colors"
                      />
                    </td>

                    {/* Shoulder */}
                    {!isLowerBody && (
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={mRow.shoulder || ""}
                          onChange={(e) => handleMeasurementChange(mRow.size, "shoulder", e.target.value)}
                          placeholder="15.5"
                          className="w-24 p-2 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs focus:border-violet-400 transition-colors"
                        />
                      </td>
                    )}

                    {/* Length */}
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={mRow.length || ""}
                        onChange={(e) => handleMeasurementChange(mRow.size, "length", e.target.value)}
                        placeholder="30"
                        className="w-24 p-2 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs focus:border-violet-400 transition-colors"
                      />
                    </td>

                    {/* Hip */}
                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={mRow.hip || ""}
                        onChange={(e) => handleMeasurementChange(mRow.size, "hip", e.target.value)}
                        placeholder="40"
                        className="w-24 p-2 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs focus:border-violet-400 transition-colors"
                      />
                    </td>

                    {/* Inseam & Thigh for lower body */}
                    {isLowerBody && (
                      <>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={mRow.inseam || ""}
                            onChange={(e) => handleMeasurementChange(mRow.size, "inseam", e.target.value)}
                            placeholder="32"
                            className="w-24 p-2 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs focus:border-violet-400 transition-colors"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <input
                            type="text"
                            value={mRow.thigh || ""}
                            onChange={(e) => handleMeasurementChange(mRow.size, "thigh", e.target.value)}
                            placeholder="22"
                            className="w-24 p-2 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs focus:border-violet-400 transition-colors"
                          />
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
