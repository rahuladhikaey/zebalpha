"use client";

import React, { useState, useMemo } from "react";
import { ProductPackage } from "@/lib/types";
import { Check, Ruler, X, AlertTriangle, Sparkles, ShieldCheck } from "lucide-react";

interface PackageSelectionProps {
  packages: ProductPackage[];
  selectedPackage: ProductPackage | null;
  onSelect: (pkg: ProductPackage | null) => void;
  sizeChart?: {
    unit?: "inches" | "cm";
    columns?: string[];
    rows?: Array<Record<string, any>>;
    notes?: string;
    chart_image?: string;
  };
  validationError?: string;
  onColorChange?: (color: string) => void;
}

const COLOR_HEX_MAP: Record<string, string> = {
  black: "#000000",
  white: "#ffffff",
  red: "#ef4444",
  navy: "#1e3a8a",
  "navy blue": "#1e3a8a",
  blue: "#3b82f6",
  green: "#22c55e",
  "olive green": "#556b2f",
  olive: "#556b2f",
  grey: "#6b7280",
  gray: "#6b7280",
  beige: "#f5f5dc",
  maroon: "#800000",
  pink: "#ec4899",
  yellow: "#eab308",
  purple: "#a855f7",
  orange: "#f97316",
  brown: "#78350f",
  charcoal: "#333333",
  lavender: "#e6e6fa",
  mustard: "#e1ad01",
  teal: "#0d9488",
  wine: "#722f37",
};

export function PackageSelection({
  packages,
  selectedPackage,
  onSelect,
  sizeChart,
  validationError,
  onColorChange,
}: PackageSelectionProps) {
  const [showChartModal, setShowChartModal] = useState(false);
  const [activeUnit, setActiveUnit] = useState<"inches" | "cm">(
    sizeChart?.unit === "cm" ? "cm" : "inches"
  );

  // Group packages by color
  const { colorMap, availableColors, allDistinctSizes, hasMultipleColors } = useMemo(() => {
    const cMap = new Map<string, ProductPackage[]>();
    const sizeSet = new Set<string>();

    (packages || []).forEach((pkg) => {
      let colorName = (pkg.color || "").trim();
      if (!colorName && pkg.name?.includes(" / ")) {
        colorName = pkg.name.split(" / ")[0].trim();
      } else if (!colorName && pkg.name?.includes(" - ")) {
        colorName = pkg.name.split(" - ")[0].trim();
      }
      colorName = colorName || "Default";

      let sizeName = (pkg.size || "").trim();
      if (!sizeName && pkg.name?.includes(" / ")) {
        sizeName = pkg.name.split(" / ")[1].trim();
      } else if (!sizeName && pkg.name?.includes(" - ")) {
        sizeName = pkg.name.split(" - ")[1].trim();
      }
      sizeName = sizeName || "Free Size";

      if (!cMap.has(colorName)) {
        cMap.set(colorName, []);
      }
      cMap.get(colorName)!.push({ ...pkg, color: colorName, size: sizeName });
      sizeSet.add(sizeName);
    });

    const colors = Array.from(cMap.keys());
    const isMultiColor =
      colors.length > 1 &&
      !(colors.length === 1 && (colors[0] === "Default" || colors[0] === "Standard"));

    // Sort popular sizes logically (XS, S, M, L, XL, XXL, 3XL...)
    const sizeOrder = [
      "Free Size",
      "XS",
      "S",
      "M",
      "L",
      "XL",
      "XXL",
      "2XL",
      "3XL",
      "4XL",
      "5XL",
      "26",
      "28",
      "30",
      "32",
      "34",
      "36",
      "38",
      "40",
      "42",
      "44",
    ];

    const sortedSizes = Array.from(sizeSet).sort((a, b) => {
      const idxA = sizeOrder.indexOf(a.toUpperCase());
      const idxB = sizeOrder.indexOf(b.toUpperCase());
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b, undefined, { numeric: true });
    });

    return {
      colorMap: cMap,
      availableColors: colors,
      allDistinctSizes: sortedSizes,
      hasMultipleColors: isMultiColor,
    };
  }, [packages]);

  // Current selected color
  const activeColor = useMemo(() => {
    let col = (selectedPackage?.color || "").trim();
    if (!col && selectedPackage?.name) {
      if (selectedPackage.name.includes(" / ")) col = selectedPackage.name.split(" / ")[0].trim();
      else if (selectedPackage.name.includes(" - ")) col = selectedPackage.name.split(" - ")[0].trim();
    }
    col = col || availableColors[0] || "Default";
    return colorMap.has(col) ? col : availableColors[0] || "Default";
  }, [selectedPackage, availableColors, colorMap]);

  // Current selected size
  const activeSize = useMemo(() => {
    if (!selectedPackage) return "";
    let sz = (selectedPackage.size || "").trim();
    if (!sz && selectedPackage.name) {
      if (selectedPackage.name.includes(" / ")) sz = selectedPackage.name.split(" / ")[1].trim();
      else if (selectedPackage.name.includes(" - ")) sz = selectedPackage.name.split(" - ")[1].trim();
    }
    return sz;
  }, [selectedPackage]);

  // Packages under the currently active color
  const packagesInActiveColor = useMemo(() => {
    return colorMap.get(activeColor) || packages || [];
  }, [colorMap, activeColor, packages]);

  // Handle color change: auto-match same size in new color or first available
  const handleColorChange = (newColor: string) => {
    const list = colorMap.get(newColor);
    if (!list || list.length === 0) return;

    if (onColorChange) {
      onColorChange(newColor);
    }

    // Attempt to preserve currently selected size in new color
    const matchedSize = list.find(
      (p) => (p.size || "").toLowerCase() === (activeSize || "").toLowerCase()
    );

    if (matchedSize && (matchedSize.stock === undefined || matchedSize.stock > 0)) {
      onSelect(matchedSize);
    } else {
      // Find first in-stock variant under this color
      const inStockItem = list.find((p) => p.stock === undefined || p.stock > 0) || list[0];
      onSelect(inStockItem);
    }
  };

  // Handle size selection
  const handleSizeSelect = (sizeName: string) => {
    const matched = packagesInActiveColor.find(
      (p) => (p.size || "").toLowerCase() === sizeName.toLowerCase()
    );
    if (matched) {
      onSelect(matched);
    }
  };

  // Size chart extraction
  const chartRows = Array.isArray(sizeChart?.rows) ? sizeChart.rows : [];
  const hasValidChart = chartRows.length > 0;
  const baseChartUnit = sizeChart?.unit || "inches";

  // Dynamic columns: prioritize user-defined columns, or inspect row keys
  const dynamicColumns = useMemo(() => {
    if (Array.isArray(sizeChart?.columns) && sizeChart.columns.length > 0) {
      return sizeChart.columns.filter((c) => c && c.toLowerCase() !== "size");
    }
    if (chartRows.length > 0) {
      const detected = new Set<string>();
      chartRows.forEach((r) => {
        Object.keys(r).forEach((k) => {
          if (k.toLowerCase() !== "size" && r[k]) {
            detected.add(k);
          }
        });
      });
      return Array.from(detected);
    }
    return ["Chest", "Length", "Shoulder", "Sleeve"];
  }, [sizeChart, chartRows]);

  // Helper to convert measurements if user toggles inches/cm
  const formatMeasurement = (val: any) => {
    if (!val || val === "—") return "—";
    const num = parseFloat(String(val).replace(/[^0-9.]/g, ""));
    if (isNaN(num)) return String(val);

    if (baseChartUnit === "inches" && activeUnit === "cm") {
      return (num * 2.54).toFixed(1);
    }
    if (baseChartUnit === "cm" && activeUnit === "inches") {
      return (num / 2.54).toFixed(1);
    }
    return String(num);
  };

  return (
    <div className="space-y-5 pt-4 border-t border-zinc-800/80">
      {/* Validation Banner if error */}
      {validationError && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 flex items-center gap-2.5 text-rose-300 text-xs font-bold animate-in fade-in slide-in-from-top-1 duration-200">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* 1. COLOR SELECTION (Hierarchy matching Meesho/Flipkart UX reference) */}
      {hasMultipleColors && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold uppercase tracking-wider text-zinc-400">
              Selected Color:{" "}
              <strong className="text-white text-sm font-black tracking-normal capitalize ml-1">
                {activeColor}
              </strong>
            </span>
            <span className="text-[11px] font-bold text-zinc-500">
              {availableColors.length} Colors
            </span>
          </div>

          {/* Horizontal Scrolling Color Thumbnails Strip */}
          <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
            {availableColors.map((col) => {
              const isSelected = activeColor.toLowerCase() === col.toLowerCase();
              const hex = COLOR_HEX_MAP[col.toLowerCase()] || "#27272a";
              const colorPackages = colorMap.get(col) || [];
              const firstPkg = colorPackages[0];
              const colorThumbnail = firstPkg?.image_url || firstPkg?.gallery?.[0];
              const isAnyInStock = colorPackages.some(
                (p) => p.stock === undefined || Number(p.stock) > 0
              );

              return (
                <button
                  key={col}
                  type="button"
                  onClick={() => handleColorChange(col)}
                  className={`group relative flex flex-col items-center rounded-2xl p-1 transition-all duration-200 shrink-0 cursor-pointer ${
                    isSelected
                      ? "ring-2 ring-white ring-offset-2 ring-offset-black scale-[1.03]"
                      : "opacity-80 hover:opacity-100 hover:scale-[1.01]"
                  }`}
                  title={`${col} ${!isAnyInStock ? "(Out of Stock)" : ""}`}
                >
                  {/* Thumbnail Container */}
                  <div className="relative w-16 h-20 sm:w-18 sm:h-22 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-md">
                    {colorThumbnail ? (
                      <img
                        src={colorThumbnail}
                        alt={`${col} variant preview`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ backgroundColor: hex }}
                      >
                        <span className="text-[10px] font-black uppercase text-white mix-blend-difference">
                          {col.slice(0, 3)}
                        </span>
                      </div>
                    )}

                    {/* Color Swatch Dot Pill */}
                    <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded-full border border-white/10">
                      <span
                        className="w-2.5 h-2.5 rounded-full border border-white/30 shrink-0 shadow-sm"
                        style={{ backgroundColor: hex }}
                      />
                      <span className="text-[9px] font-bold text-white max-w-[42px] truncate capitalize">
                        {col}
                      </span>
                    </div>

                    {/* Out of Stock Overlay */}
                    {!isAnyInStock && (
                      <div className="absolute inset-0 bg-black/75 flex items-center justify-center">
                        <span className="text-[8px] font-black uppercase text-rose-300 bg-rose-950/90 px-1 py-0.5 rounded">
                          OOS
                        </span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. SIZE SELECTION & SIZE CHART LINK */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold uppercase tracking-wider text-zinc-400">
              Select Size
            </span>
            {activeSize && (
              <span className="text-zinc-500 font-bold">: {activeSize}</span>
            )}
          </div>

          {hasValidChart && (
            <button
              type="button"
              onClick={() => setShowChartModal(true)}
              className="flex items-center gap-1.5 text-xs font-black text-white hover:text-zinc-300 transition-colors cursor-pointer group underline underline-offset-4 decoration-zinc-600 hover:decoration-white"
            >
              <Ruler className="w-3.5 h-3.5 text-zinc-400 group-hover:text-white transition-colors" />
              <span>Size Chart</span>
            </button>
          )}
        </div>

        {/* Size Pills Row */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {allDistinctSizes.map((sizeName) => {
            const matchedPkg = packagesInActiveColor.find(
              (p) => (p.size || "").toLowerCase() === sizeName.toLowerCase()
            );

            const isAvailableForColor = Boolean(matchedPkg);
            const stockQty = matchedPkg?.stock !== undefined ? Number(matchedPkg.stock) : 20;
            const isOutOfStock = !isAvailableForColor || stockQty <= 0;
            const isSelected =
              activeSize.toLowerCase() === sizeName.toLowerCase() && !isOutOfStock;

            return (
              <button
                key={sizeName}
                type="button"
                disabled={isOutOfStock}
                onClick={() => handleSizeSelect(sizeName)}
                className={`relative flex min-w-[58px] sm:min-w-[66px] h-12 flex-col items-center justify-center rounded-xl border px-3 text-center transition-all ${
                  isOutOfStock
                    ? "border-zinc-800/60 bg-zinc-950/40 text-zinc-600 cursor-not-allowed overflow-hidden opacity-45"
                    : isSelected
                    ? "border-white bg-white text-black shadow-xl font-black scale-105"
                    : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 cursor-pointer"
                }`}
                title={
                  isOutOfStock
                    ? `${sizeName} is Out of Stock for ${activeColor}`
                    : `Select size ${sizeName}`
                }
              >
                {/* Out of Stock Diagonal Slash */}
                {isOutOfStock && (
                  <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="w-[120%] h-[1.5px] bg-rose-500/70 rotate-[-25deg]" />
                  </span>
                )}

                <span
                  className={`text-xs font-black uppercase tracking-wider ${
                    isOutOfStock
                      ? "text-zinc-600 line-through"
                      : isSelected
                      ? "text-black"
                      : "text-white"
                  }`}
                >
                  {sizeName}
                </span>

                {isOutOfStock ? (
                  <span className="text-[8px] font-bold text-rose-400 mt-0.5 uppercase tracking-tighter">
                    OOS
                  </span>
                ) : matchedPkg?.price ? (
                  <span
                    className={`text-[9px] font-bold ${
                      isSelected ? "text-zinc-700" : "text-zinc-400"
                    }`}
                  >
                    ₹{matchedPkg.price}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. SELECTED VARIANT SUMMARY & STOCK STATUS BADGE */}
      {selectedPackage && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3.5 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 font-bold">Selected:</span>
              <span className="font-extrabold text-white bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md">
                Color: {activeColor}
              </span>
              <span className="font-extrabold text-white bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-md">
                Size: {activeSize || "Standard"}
              </span>
            </div>

            {/* Dynamic Stock Indicator */}
            <div>
              {selectedPackage.stock !== undefined && Number(selectedPackage.stock) <= 0 ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2.5 py-0.5 rounded-full">
                  ✕ Out of Stock
                </span>
              ) : selectedPackage.stock !== undefined && Number(selectedPackage.stock) <= 5 ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full animate-pulse">
                  ⚡ Only {selectedPackage.stock} left in stock!
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                  ✓ In Stock
                </span>
              )}
            </div>
          </div>

          {selectedPackage.sku && (
            <p className="text-[10px] font-mono text-zinc-500">
              Variant SKU: <span className="text-zinc-400">{selectedPackage.sku}</span>
            </p>
          )}
        </div>
      )}

      {/* 4. SIZE CHART MODAL & RESPONSIVE BOTTOM SHEET */}
      {showChartModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          {/* Backdrop dismiss */}
          <div
            className="fixed inset-0"
            onClick={() => setShowChartModal(false)}
          />

          {/* Modal / Sheet Content */}
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-zinc-950 border border-zinc-800 p-5 sm:p-7 shadow-2xl space-y-5 z-10 animate-in slide-in-from-bottom-6 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-white">
                  <Ruler className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black uppercase text-white tracking-wide">
                    Garment Size & Measurement Guide
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Find your accurate fit across sizes
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowChartModal(false)}
                className="p-2 rounded-full bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Measurement Unit Toggle */}
            <div className="flex items-center justify-between bg-zinc-900/60 p-2 rounded-xl border border-zinc-800/80">
              <span className="text-xs font-bold text-zinc-400 pl-2">
                Measurement Unit:
              </span>
              <div className="flex items-center gap-1 bg-black p-1 rounded-lg border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setActiveUnit("inches")}
                  className={`px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider transition-all ${
                    activeUnit === "inches"
                      ? "bg-white text-black shadow-md"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Inches (in)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveUnit("cm")}
                  className={`px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider transition-all ${
                    activeUnit === "cm"
                      ? "bg-white text-black shadow-md"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  Centimeters (cm)
                </button>
              </div>
            </div>

            {/* Measurements Table */}
            <div className="overflow-x-auto rounded-2xl border border-zinc-800 shadow-inner">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-900 uppercase font-black text-[10px] text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-4 sticky left-0 bg-zinc-900 z-10">Size</th>
                    {dynamicColumns.map((col) => (
                      <th key={col} className="py-3 px-3.5 capitalize font-black">
                        {col} ({activeUnit})
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850 bg-zinc-950 font-mono text-xs">
                  {chartRows.map((row, i) => {
                    const rowSize = row.size || row.Size || `Size ${i + 1}`;
                    const isRowSelected =
                      activeSize.toLowerCase() === String(rowSize).toLowerCase();

                    return (
                      <tr
                        key={i}
                        className={`transition-colors ${
                          isRowSelected
                            ? "bg-white/5 font-bold"
                            : "hover:bg-zinc-900/40"
                        }`}
                      >
                        <td className="py-2.5 px-4 font-sans font-black text-white sticky left-0 bg-zinc-950 z-10 border-r border-zinc-850">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-md border ${
                              isRowSelected
                                ? "bg-white text-black border-white"
                                : "bg-zinc-900 text-zinc-200 border-zinc-800"
                            }`}
                          >
                            {rowSize}
                          </span>
                        </td>

                        {dynamicColumns.map((col) => {
                          // Match column key case-insensitively
                          const matchedKey = Object.keys(row).find(
                            (k) => k.toLowerCase() === col.toLowerCase()
                          );
                          const rawVal = matchedKey ? row[matchedKey] : row[col];
                          const formatted = formatMeasurement(rawVal);

                          return (
                            <td key={col} className="py-2.5 px-3.5 text-zinc-200">
                              {formatted}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Optional Chart Infographic Image */}
            {sizeChart?.chart_image && (
              <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-900 max-h-56 flex items-center justify-center">
                <img
                  src={sizeChart.chart_image}
                  alt="Size measurement guide diagram"
                  className="max-h-56 object-contain"
                />
              </div>
            )}

            {/* Notes / Tips Footer */}
            <div className="rounded-xl bg-zinc-900/60 border border-zinc-800/80 p-3.5 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 text-white font-extrabold">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>How to Measure</span>
              </div>
              <p className="text-zinc-400 leading-relaxed text-[11px]">
                {sizeChart?.notes ||
                  "All measurements are garment dimensions. For the best fit, measure a similar garment that fits you well and compare it with the size chart above."}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
