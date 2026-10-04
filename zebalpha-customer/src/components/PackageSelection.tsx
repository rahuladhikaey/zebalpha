import React from "react";
import { ProductPackage } from "@/lib/types";
import { Check } from "lucide-react";

interface PackageSelectionProps {
  packages: ProductPackage[];
  selectedPackage: ProductPackage | null;
  onSelect: (pkg: ProductPackage) => void;
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

export function PackageSelection({ packages, selectedPackage, onSelect }: PackageSelectionProps) {
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
          <span className="font-extrabold uppercase tracking-wider text-zinc-400">
            {hasMultipleColors ? "Select Size:" : "Select Option / Size:"}
          </span>
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
    </div>
  );
}
