import React, { useState } from "react";
import { ProductPackage } from "@/lib/types";
import { Check, Ruler, X } from "lucide-react";

interface PackageSelectionProps {
  packages: ProductPackage[];
  selectedPackage: ProductPackage | null;
  onSelect: (pkg: ProductPackage) => void;
  sizeChart?: {
    unit?: "inches" | "cm";
    rows?: Array<{
      size: string;
      bust_chest?: string;
      waist?: string;
      shoulder?: string;
      length?: string;
      hip?: string;
      sleeve_length?: string;
      inseam?: string;
      thigh?: string;
    }>;
  };
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
};

export function PackageSelection({ packages, selectedPackage, onSelect, sizeChart }: PackageSelectionProps) {
  const [showChartModal, setShowChartModal] = useState(false);

  if (!packages || packages.length === 0) return null;

  // Extract distinct colors
  const colorMap = new Map<string, ProductPackage[]>();
  packages.forEach((pkg) => {
    let colorName = pkg.color || "";
    if (!colorName && pkg.name.includes(" / ")) {
      colorName = pkg.name.split(" / ")[0];
    } else if (!colorName && pkg.name.includes(" - ")) {
      colorName = pkg.name.split(" - ")[0];
    }
    colorName = colorName.trim() || "Default";

    if (!colorMap.has(colorName)) {
      colorMap.set(colorName, []);
    }
    colorMap.get(colorName)!.push(pkg);
  });

  const availableColors = Array.from(colorMap.keys());
  const hasMultipleColors = availableColors.length > 1 && !(availableColors.length === 1 && (availableColors[0] === "Default" || availableColors[0] === "Standard"));

  // Current selected color
  let activeColor = selectedPackage?.color || "";
  if (!activeColor && selectedPackage?.name) {
    if (selectedPackage.name.includes(" / ")) activeColor = selectedPackage.name.split(" / ")[0];
    else if (selectedPackage.name.includes(" - ")) activeColor = selectedPackage.name.split(" - ")[0];
  }
  activeColor = activeColor.trim() || availableColors[0] || "Default";

  // If color not in map, fallback
  if (!colorMap.has(activeColor)) {
    activeColor = availableColors[0];
  }

  const packagesForActiveColor = colorMap.get(activeColor) || packages;

  const handleColorChange = (newColor: string) => {
    const list = colorMap.get(newColor);
    if (!list || list.length === 0) return;

    // Try matching same size under new color
    const currentSize = selectedPackage?.size || "";
    const matched = list.find((p) => p.size === currentSize) || list[0];
    onSelect(matched);
  };

  const chartRows = Array.isArray(sizeChart?.rows) ? sizeChart.rows : [];
  const hasValidChart = chartRows.length > 0;
  const unit = sizeChart?.unit || "inches";

  // Check which columns have values
  const hasChest = chartRows.some((r) => r.bust_chest);
  const hasWaist = chartRows.some((r) => r.waist);
  const hasShoulder = chartRows.some((r) => r.shoulder);
  const hasLength = chartRows.some((r) => r.length);
  const hasHip = chartRows.some((r) => r.hip);
  const hasSleeve = chartRows.some((r) => r.sleeve_length);
  const hasInseam = chartRows.some((r) => r.inseam);
  const hasThigh = chartRows.some((r) => r.thigh);

  return (
    <div className="space-y-4 pt-3 border-t border-zinc-800">
      {/* 1. Multi-Color Picker */}
      {hasMultipleColors && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-extrabold uppercase tracking-wider text-zinc-400">
              Garment Color: <span className="text-white font-black">{activeColor}</span>
            </span>
            <span className="text-[10px] text-zinc-500 font-bold">{availableColors.length} Colors Available</span>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {availableColors.map((col) => {
              const isSelected = activeColor === col;
              const hex = COLOR_HEX_MAP[col.toLowerCase()] || "#3f3f46";
              const samplePkg = colorMap.get(col)?.[0];

              return (
                <button
                  key={col}
                  type="button"
                  onClick={() => handleColorChange(col)}
                  className={`group relative flex items-center gap-2 rounded-xl px-3 py-2 border transition-all cursor-pointer ${
                    isSelected
                      ? "border-white bg-zinc-900 shadow-lg text-white"
                      : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  {/* Swatch color dot or thumb */}
                  {samplePkg?.image_url ? (
                    <div className="h-5 w-5 rounded-md overflow-hidden border border-zinc-700 shrink-0">
                      <img src={samplePkg.image_url} alt={col} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <span
                      className="h-4 w-4 rounded-full border border-white/20 shrink-0 shadow-sm"
                      style={{ backgroundColor: hex }}
                    />
                  )}
                  <span className="text-xs font-black">{col}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 ml-0.5" />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Size / Variant Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-extrabold uppercase tracking-wider text-zinc-400">
              {hasMultipleColors ? "Select Size:" : "Select Option / Size:"}
            </span>
            {hasValidChart && (
              <button
                type="button"
                onClick={() => setShowChartModal(true)}
                className="flex items-center gap-1 text-[11px] font-bold text-violet-400 hover:text-violet-300 underline cursor-pointer"
              >
                <Ruler className="w-3 h-3" />
                <span>Size Guide</span>
              </button>
            )}
          </div>

          {selectedPackage && (
            <span className="text-[10px] font-mono text-emerald-400 font-bold">
              In Stock • ₹{selectedPackage.price}
            </span>
          )}
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-1 no-scrollbar flex-wrap">
          {packagesForActiveColor.map((pkg) => {
            const isSelected = selectedPackage?.id === pkg.id;
            const saveAmount = pkg.mrp && pkg.mrp > pkg.price ? pkg.mrp - pkg.price : 0;
            const label = pkg.size || pkg.name;

            return (
              <button
                key={pkg.id}
                type="button"
                onClick={() => onSelect(pkg)}
                className={`relative flex min-w-[70px] flex-col items-center justify-center rounded-xl border py-2.5 px-3.5 text-center transition-all cursor-pointer ${
                  isSelected
                    ? "border-white bg-white text-black shadow-xl"
                    : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900"
                }`}
              >
                {pkg.isBestSeller && !isSelected && (
                  <div className="absolute -top-2 -right-1 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[8px] font-black text-black">
                    Best
                  </div>
                )}

                <span className={`text-xs font-black uppercase tracking-wider ${isSelected ? "text-black" : "text-white"}`}>
                  {label}
                </span>

                <span className={`text-[10px] font-bold mt-0.5 ${isSelected ? "text-zinc-700" : "text-zinc-400"}`}>
                  ₹{pkg.price}
                </span>

                {saveAmount > 0 && !isSelected && (
                  <span className="text-[8px] font-black text-emerald-400 mt-0.5">
                    Save ₹{saveAmount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Size Guide / Measurements Modal */}
      {showChartModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-zinc-950 border border-zinc-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-violet-500/10 text-violet-400">
                  <Ruler className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-black uppercase text-white tracking-wide">
                    Garment Size Guide & Measurements
                  </h3>
                  <span className="text-[10px] font-mono text-zinc-400">
                    All measurements in <strong className="text-violet-300 uppercase">{unit}</strong>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowChartModal(false)}
                className="p-1.5 rounded-full bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-zinc-800">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-900/80 uppercase font-black text-[10px] text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="py-3 px-3.5">Size</th>
                    {hasChest && <th className="py-3 px-3">Chest / Bust</th>}
                    {hasWaist && <th className="py-3 px-3">Waist</th>}
                    {hasShoulder && <th className="py-3 px-3">Shoulder</th>}
                    {hasLength && <th className="py-3 px-3">Length</th>}
                    {hasHip && <th className="py-3 px-3">Hip</th>}
                    {hasSleeve && <th className="py-3 px-3">Sleeve</th>}
                    {hasInseam && <th className="py-3 px-3">Inseam</th>}
                    {hasThigh && <th className="py-3 px-3">Thigh</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850 bg-zinc-950 font-mono text-xs">
                  {chartRows.map((r, i) => (
                    <tr key={i} className="hover:bg-zinc-900/50">
                      <td className="py-2.5 px-3.5 font-sans font-black text-white">
                        <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                          {r.size}
                        </span>
                      </td>
                      {hasChest && <td className="py-2.5 px-3 text-zinc-200">{r.bust_chest || "—"}</td>}
                      {hasWaist && <td className="py-2.5 px-3 text-zinc-200">{r.waist || "—"}</td>}
                      {hasShoulder && <td className="py-2.5 px-3 text-zinc-200">{r.shoulder || "—"}</td>}
                      {hasLength && <td className="py-2.5 px-3 text-zinc-200">{r.length || "—"}</td>}
                      {hasHip && <td className="py-2.5 px-3 text-zinc-200">{r.hip || "—"}</td>}
                      {hasSleeve && <td className="py-2.5 px-3 text-zinc-200">{r.sleeve_length || "—"}</td>}
                      {hasInseam && <td className="py-2.5 px-3 text-zinc-200">{r.inseam || "—"}</td>}
                      {hasThigh && <td className="py-2.5 px-3 text-zinc-200">{r.thigh || "—"}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-[11px] text-zinc-500 text-center pt-1">
              💡 Tip: Measure a garment that fits you well and compare it with the size chart above.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
