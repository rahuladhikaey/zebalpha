"use client";

import React, { useState } from "react";
import { Check, ChevronDown, ChevronUp, Star, RotateCcw } from "lucide-react";
import { useIsNativeApp } from "@/lib/platform";

export interface FilterState {
  genders: string[];
  sizes: string[];
  colors: string[];
  brands: string[];
  fashionTiers: string[];
  minRating: number;
  minDiscount: number;
  materials: string[];
  sleeves: string[];
  priceRange: string | null;
  customMinPrice: string;
  customMaxPrice: string;
  sellers: string[];
}

export const INITIAL_FILTER_STATE: FilterState = {
  genders: [],
  sizes: [],
  colors: [],
  brands: [],
  fashionTiers: [],
  minRating: 0,
  minDiscount: 0,
  materials: [],
  sleeves: [],
  priceRange: null,
  customMinPrice: "",
  customMaxPrice: "",
  sellers: [],
};

// Known Standard Colors for visual swatch matching
const COLOR_PALETTE: Record<string, { hex: string; border: string }> = {
  black: { hex: "#000000", border: "#333333" },
  white: { hex: "#FFFFFF", border: "#CCCCCC" },
  red: { hex: "#EF4444", border: "#EF4444" },
  blue: { hex: "#3B82F6", border: "#3B82F6" },
  green: { hex: "#10B981", border: "#10B981" },
  yellow: { hex: "#F59E0B", border: "#F59E0B" },
  pink: { hex: "#EC4899", border: "#EC4899" },
  beige: { hex: "#D4B996", border: "#D4B996" },
  maroon: { hex: "#800000", border: "#800000" },
  grey: { hex: "#6B7280", border: "#6B7280" },
  gray: { hex: "#6B7280", border: "#6B7280" },
  navy: { hex: "#1E3A8A", border: "#1E3A8A" },
  gold: { hex: "#D97706", border: "#F59E0B" },
  golden: { hex: "#D97706", border: "#F59E0B" },
  orange: { hex: "#F97316", border: "#F97316" },
  purple: { hex: "#8B5CF6", border: "#8B5CF6" },
  multi: {
    hex: "linear-gradient(135deg, #EF4444 0%, #3B82F6 50%, #10B981 100%)",
    border: "#666666",
  },
};

export const DISCOUNT_OPTIONS = [
  { label: "10% Off or more", value: 10 },
  { label: "25% Off or more", value: 25 },
  { label: "35% Off or more", value: 35 },
  { label: "50% Off or more", value: 50 },
  { label: "60% Off or more", value: 60 },
  { label: "70% Off or more", value: 70 },
];

export const FASHION_TIER_OPTIONS = [
  "Top Verified Sellers",
  "Premium Collection",
  "Handcrafted & Ethnic",
];

export interface PriceRangeData {
  minPrice: number;
  maxPrice: number;
  brackets: Array<{ label: string; value: string; min: number; max: number }>;
}

interface ProductFiltersProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  availableBrands?: string[];
  availableSellers?: string[];
  availableSizes?: string[];
  availableColors?: string[];
  availableMaterials?: string[];
  availableSleeves?: string[];
  priceRangeData?: PriceRangeData;
  totalFilteredCount?: number;
}

export function ProductFilters({
  filters,
  setFilters,
  availableBrands = [],
  availableSellers = [],
  availableSizes = [],
  availableColors = [],
  availableMaterials = [],
  availableSleeves = [],
  priceRangeData,
  totalFilteredCount,
}: ProductFiltersProps) {
  const isNativeApp = useIsNativeApp();

  // Expansion toggles for long lists
  const [showAllBrands, setShowAllBrands] = useState(false);
  const [showAllSellers, setShowAllSellers] = useState(false);
  const [showAllMaterials, setShowAllMaterials] = useState(false);
  const [showAllSleeves, setShowAllSleeves] = useState(false);

  // Temporary local min/max price inputs
  const [tempMin, setTempMin] = useState(filters.customMinPrice);
  const [tempMax, setTempMax] = useState(filters.customMaxPrice);

  // Toggle multi-select array helper
  const toggleItem = (key: keyof FilterState, item: string) => {
    setFilters((prev) => {
      const arr = (prev[key] as string[]) || [];
      const exists = arr.includes(item);
      return {
        ...prev,
        [key]: exists ? arr.filter((x) => x !== item) : [...arr, item],
      };
    });
  };

  const handlePriceRange = (val: string) => {
    setFilters((prev) => ({
      ...prev,
      priceRange: prev.priceRange === val ? null : val,
      customMinPrice: "",
      customMaxPrice: "",
    }));
    setTempMin("");
    setTempMax("");
  };

  const handleApplyCustomPrice = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters((prev) => ({
      ...prev,
      priceRange: null,
      customMinPrice: tempMin,
      customMaxPrice: tempMax,
    }));
  };

  const handleClearAll = () => {
    setFilters(INITIAL_FILTER_STATE);
    setTempMin("");
    setTempMax("");
  };

  // 1. REAL SELLERS (Filtered & De-duplicated)
  const displayedSellers = showAllSellers ? availableSellers : availableSellers.slice(0, 5);

  // 2. REAL BRANDS (Filtered & De-duplicated)
  const displayedBrands = showAllBrands ? availableBrands : availableBrands.slice(0, 6);

  // 3. REAL SIZES (De-duplicated)
  const defaultSizes = ["Free Size", "XS", "S", "M", "L", "XL", "2XL", "3XL"];
  const sizesToDisplay = availableSizes.length > 0 ? availableSizes : defaultSizes;

  // 4. REAL COLORS (De-duplicated & mapped to swatches)
  const defaultColorNames = ["Red", "Yellow", "White", "Black", "Blue", "Green", "Pink", "Golden"];
  const colorNamesToDisplay = availableColors.length > 0 ? availableColors : defaultColorNames;

  // 5. REAL MATERIALS
  const displayedMaterials = showAllMaterials ? availableMaterials : availableMaterials.slice(0, 6);

  // 6. REAL SLEEVES
  const displayedSleeves = showAllSleeves ? availableSleeves : availableSleeves.slice(0, 6);

  // 7. REAL PRICE BRACKETS
  const minPriceDisplay = priceRangeData?.minPrice ? Math.floor(priceRangeData.minPrice) : 88;
  const maxPriceDisplay = priceRangeData?.maxPrice ? Math.ceil(priceRangeData.maxPrice) : 5000;
  const priceBrackets = priceRangeData?.brackets && priceRangeData.brackets.length > 0
    ? priceRangeData.brackets
    : [
        { label: "Up to ₹500", value: "bracket1", min: 0, max: 500 },
        { label: "₹500 - ₹1,000", value: "bracket2", min: 500, max: 1000 },
        { label: "₹1,000 - ₹2,000", value: "bracket3", min: 1000, max: 2000 },
        { label: "Over ₹2,000", value: "bracket4", min: 2000, max: Infinity },
      ];

  // Calculate total active filters count
  const activeCount =
    filters.genders.length +
    filters.sizes.length +
    filters.colors.length +
    filters.brands.length +
    filters.fashionTiers.length +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.minDiscount > 0 ? 1 : 0) +
    filters.materials.length +
    filters.sleeves.length +
    (filters.priceRange || filters.customMinPrice || filters.customMaxPrice ? 1 : 0) +
    filters.sellers.length;

  const dividerClass = isNativeApp ? "border-b border-[#E4C988]/70 pb-4" : "border-b border-zinc-800/60 pb-4";
  const headingClass = isNativeApp
    ? "text-xs font-black uppercase tracking-wider text-[#111111]"
    : "text-xs font-black uppercase tracking-wider text-white";
  const accentBtnClass = isNativeApp
    ? "flex items-center gap-1 mt-2 text-[11px] font-bold text-[#9A6503] hover:text-[#111111] transition-colors cursor-pointer"
    : "flex items-center gap-1 mt-2 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer";
  const rowClass = isNativeApp
    ? "flex items-center gap-2.5 text-xs font-semibold py-0.5 cursor-pointer hover:text-[#111111] transition-colors group"
    : "flex items-center gap-2.5 text-xs font-semibold py-0.5 cursor-pointer hover:text-white transition-colors group";
  const getCheckboxClass = (isChecked: boolean) =>
    isNativeApp
      ? isChecked
        ? "border-[#B4780C] bg-[#F5B922] text-[#111111] shadow-[0_2px_6px_rgba(217,155,22,0.35)]"
        : "border-[#D4A017]/55 bg-white group-hover:border-[#B4780C]"
      : isChecked
        ? "border-emerald-500 bg-emerald-500 text-black shadow-[0_0_8px_rgba(16,185,129,0.4)]"
        : "border-zinc-700 bg-zinc-900 group-hover:border-zinc-500";
  const getLabelClass = (isChecked: boolean) =>
    isNativeApp
      ? isChecked
        ? "text-[#111111] font-bold"
        : "text-[#3F3626]"
      : isChecked
        ? "text-white font-bold"
        : "text-zinc-300";
  const getRadioRowClass = (isSelected: boolean) =>
    `text-left text-xs font-semibold py-0.5 transition-colors cursor-pointer ${
      isNativeApp
        ? isSelected
          ? "text-[#111111] font-extrabold flex items-center gap-1.5"
          : "text-[#4A3F2B] hover:text-[#111111]"
        : isSelected
          ? "text-emerald-400 font-extrabold flex items-center gap-1.5 hover:text-white"
          : "text-zinc-400 hover:text-white"
    }`;
  const resetLinkClass = isNativeApp
    ? "text-[10px] font-bold text-[#9A6503] hover:text-[#111111]"
    : "text-[10px] text-zinc-400 hover:text-white";

  return (
    <div
      className={`flex flex-col gap-5 select-none pb-4 ${
        isNativeApp ? "text-[#3F3626]" : "text-zinc-300"
      }`}
    >
      {/* Header with Clear All */}
      <div
        className={`flex items-center justify-between border-b pb-3 ${
          isNativeApp ? "border-[#E4C988]" : "border-zinc-800/80"
        }`}
      >
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-black uppercase tracking-wider ${
              isNativeApp ? "text-[#111111]" : "text-white"
            }`}
          >
            Filters
          </span>
          {activeCount > 0 && (
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-black ${
                isNativeApp ? "bg-[#F5B922] text-[#111111]" : "bg-emerald-400 text-black"
              }`}
            >
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className={`flex items-center gap-1 text-[11px] font-bold transition-colors cursor-pointer ${
              isNativeApp
                ? "text-[#9A6503] hover:text-[#111111]"
                : "text-emerald-400 hover:text-emerald-300"
            }`}
          >
            <RotateCcw size={12} />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {/* 1. REAL SELLER SHOP / MERCHANT */}
      {availableSellers.length > 0 && (
        <div className={dividerClass}>
          <div className="flex items-center justify-between mb-2.5">
            <h4 className={headingClass}>Seller Shop</h4>
            <span
              className={`text-[10px] font-bold ${
                isNativeApp ? "text-[#9A6503]" : "text-emerald-400"
              }`}
            >
              Verified
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {displayedSellers.map((seller) => {
              const isChecked = filters.sellers.includes(seller);
              return (
                <label
                  key={seller}
                  onClick={() => toggleItem("sellers", seller)}
                  className={rowClass}
                >
                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${getCheckboxClass(
                      isChecked
                    )}`}
                  >
                    {isChecked && <Check size={12} strokeWidth={3.5} />}
                  </div>
                  <span className={`truncate ${getLabelClass(isChecked)}`}>{seller}</span>
                </label>
              );
            })}
          </div>
          {availableSellers.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAllSellers(!showAllSellers)}
              className={accentBtnClass}
            >
              {showAllSellers ? (
                <>
                  <span>See less</span>
                  <ChevronUp size={14} />
                </>
              ) : (
                <>
                  <span>See more ({availableSellers.length - 5})</span>
                  <ChevronDown size={14} />
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* 2. REAL BRANDS */}
      {availableBrands.length > 0 && (
        <div className={dividerClass}>
          <h4 className={`${headingClass} mb-2.5`}>Brand</h4>
          <div className="flex flex-col gap-1.5">
            {displayedBrands.map((brand) => {
              const isChecked = filters.brands.includes(brand);
              return (
                <label
                  key={brand}
                  onClick={() => toggleItem("brands", brand)}
                  className={rowClass}
                >
                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${getCheckboxClass(
                      isChecked
                    )}`}
                  >
                    {isChecked && <Check size={12} strokeWidth={3.5} />}
                  </div>
                  <span className={`truncate ${getLabelClass(isChecked)}`}>{brand}</span>
                </label>
              );
            })}
          </div>
          {availableBrands.length > 6 && (
            <button
              type="button"
              onClick={() => setShowAllBrands(!showAllBrands)}
              className={accentBtnClass}
            >
              {showAllBrands ? (
                <>
                  <span>See less</span>
                  <ChevronUp size={14} />
                </>
              ) : (
                <>
                  <span>See more ({availableBrands.length - 6})</span>
                  <ChevronDown size={14} />
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* 3. GENDER */}
      <div className={dividerClass}>
        <h4 className={`${headingClass} mb-2.5`}>Gender</h4>
        <div className="flex flex-col gap-1.5">
          {["Women", "Men", "Unisex"].map((gender) => {
            const isChecked = filters.genders.includes(gender);
            return (
              <label
                key={gender}
                onClick={() => toggleItem("genders", gender)}
                className={rowClass.replace("py-0.5", "py-1")}
              >
                <div
                  className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${getCheckboxClass(
                    isChecked
                  )}`}
                >
                  {isChecked && <Check size={12} strokeWidth={3.5} />}
                </div>
                <span className={getLabelClass(isChecked)}>{gender}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* 4. REAL SIZES */}
      <div className={dividerClass}>
        <div className="flex items-center justify-between mb-2.5">
          <h4 className={headingClass}>Size</h4>
          {filters.sizes.length > 0 && (
            <button
              onClick={() => setFilters((p) => ({ ...p, sizes: [] }))}
              className={resetLinkClass}
            >
              Reset
            </button>
          )}
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {sizesToDisplay.map((size) => {
            const isSelected = filters.sizes.includes(size);
            return (
              <button
                key={size}
                type="button"
                onClick={() => toggleItem("sizes", size)}
                className={`py-1.5 px-1 text-[10px] font-black uppercase tracking-wider rounded-lg border transition-all text-center cursor-pointer ${
                  isNativeApp
                    ? isSelected
                      ? "border-[#B4780C] bg-[#F5B922] text-[#111111] shadow-[0_2px_8px_rgba(217,155,22,0.3)]"
                      : "border-[#E4C988] bg-white text-[#4A3F2B] hover:border-[#D4A017] hover:bg-[#FFF6D6] hover:text-[#111111]"
                    : isSelected
                      ? "border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.25)]"
                      : "border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-zinc-700 hover:text-white hover:bg-zinc-800/50"
                }`}
              >
                {size}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. REAL COLOURS */}
      <div className={dividerClass}>
        <div className="flex items-center justify-between mb-2.5">
          <h4 className={headingClass}>Colour</h4>
          {filters.colors.length > 0 && (
            <button
              onClick={() => setFilters((p) => ({ ...p, colors: [] }))}
              className={resetLinkClass}
            >
              Reset
            </button>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {colorNamesToDisplay.map((cName) => {
            const lower = cName.toLowerCase();
            const palette = COLOR_PALETTE[lower] || { hex: "#6B7280", border: "#4B5563" };
            const isSelected = filters.colors.includes(cName);
            return (
              <button
                key={cName}
                type="button"
                onClick={() => toggleItem("colors", cName)}
                title={cName}
                className="flex flex-col items-center gap-1 group cursor-pointer focus:outline-none"
              >
                <div
                  style={{
                    background: palette.hex,
                    borderColor: palette.border,
                  }}
                  className={`h-7 w-7 rounded-full border transition-all flex items-center justify-center ${
                    isSelected
                      ? isNativeApp
                        ? "ring-2 ring-[#D49014] ring-offset-2 ring-offset-[#FFFDF8] scale-110 shadow-[0_2px_10px_rgba(217,155,22,0.4)]"
                        : "ring-2 ring-emerald-400 ring-offset-2 ring-offset-black scale-110 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                      : "opacity-85 group-hover:opacity-100 group-hover:scale-105"
                  }`}
                >
                  {isSelected && (
                    <Check
                      size={14}
                      strokeWidth={3}
                      className={lower === "white" || lower === "yellow" ? "text-black" : "text-white"}
                    />
                  )}
                </div>
                <span
                  className={`text-[9px] font-bold truncate max-w-[50px] transition-colors ${
                    isNativeApp
                      ? isSelected
                        ? "text-[#111111] font-extrabold"
                        : "text-[#4A3F2B] group-hover:text-[#111111]"
                      : isSelected
                        ? "text-emerald-400 font-extrabold"
                        : "text-zinc-400 group-hover:text-zinc-200"
                  }`}
                >
                  {cName}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 6. REAL PRICE RANGE */}
      <div className={dividerClass}>
        <div className="flex items-center justify-between mb-1">
          <h4 className={headingClass}>Price</h4>
          <span
            className={`text-[10px] font-bold font-mono ${
              isNativeApp ? "text-[#9A6503]" : "text-emerald-400"
            }`}
          >
            ₹{minPriceDisplay.toLocaleString("en-IN")} – ₹{maxPriceDisplay.toLocaleString("en-IN")}
          </span>
        </div>
        <div className="flex flex-col gap-1.5 mt-2">
          {priceBrackets.map((opt) => {
            const isSelected = filters.priceRange === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handlePriceRange(opt.value)}
                className={getRadioRowClass(isSelected)}
              >
                {isSelected && (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isNativeApp ? "bg-[#D97706]" : "bg-emerald-400"
                    }`}
                  />
                )}
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Custom Price Range Form */}
        <form onSubmit={handleApplyCustomPrice} className="mt-3 flex items-center gap-2">
          <input
            type="number"
            placeholder="₹ Min"
            value={tempMin}
            onChange={(e) => setTempMin(e.target.value)}
            className={
              isNativeApp
                ? "w-16 rounded-lg border border-[#D4A017]/60 bg-white px-2 py-1 text-xs text-[#111111] placeholder:text-[#6B5B3E] outline-none focus:border-[#B4780C]"
                : "w-16 rounded-lg border border-zinc-800 bg-zinc-900/80 px-2 py-1 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500"
            }
          />
          <span className={isNativeApp ? "text-[#6B5B3E] text-xs" : "text-zinc-600 text-xs"}>-</span>
          <input
            type="number"
            placeholder="₹ Max"
            value={tempMax}
            onChange={(e) => setTempMax(e.target.value)}
            className={
              isNativeApp
                ? "w-16 rounded-lg border border-[#D4A017]/60 bg-white px-2 py-1 text-xs text-[#111111] placeholder:text-[#6B5B3E] outline-none focus:border-[#B4780C]"
                : "w-16 rounded-lg border border-zinc-800 bg-zinc-900/80 px-2 py-1 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500"
            }
          />
          <button
            type="submit"
            className={
              isNativeApp
                ? "rounded-lg bg-gradient-to-r from-[#FCE38A] to-[#F5B922] border border-[#B4780C]/45 px-2.5 py-1 text-xs font-black text-[#111111] hover:brightness-105 transition-colors cursor-pointer"
                : "rounded-lg bg-zinc-800 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-500 hover:text-black transition-colors cursor-pointer"
            }
          >
            Go
          </button>
        </form>
      </div>

      {/* 7. REAL APPAREL MATERIAL / FABRIC */}
      {availableMaterials.length > 0 && (
        <div className={dividerClass}>
          <h4 className={`${headingClass} mb-2.5`}>Fabric / Material</h4>
          <div className="flex flex-col gap-1.5">
            {displayedMaterials.map((mat) => {
              const isChecked = filters.materials.includes(mat);
              return (
                <label
                  key={mat}
                  onClick={() => toggleItem("materials", mat)}
                  className={rowClass}
                >
                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${getCheckboxClass(
                      isChecked
                    )}`}
                  >
                    {isChecked && <Check size={12} strokeWidth={3.5} />}
                  </div>
                  <span className={getLabelClass(isChecked)}>{mat}</span>
                </label>
              );
            })}
          </div>
          {availableMaterials.length > 6 && (
            <button
              type="button"
              onClick={() => setShowAllMaterials(!showAllMaterials)}
              className={accentBtnClass}
            >
              {showAllMaterials ? (
                <>
                  <span>See less</span>
                  <ChevronUp size={14} />
                </>
              ) : (
                <>
                  <span>See more ({availableMaterials.length - 6})</span>
                  <ChevronDown size={14} />
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* 8. REAL SLEEVE TYPE */}
      {availableSleeves.length > 0 && (
        <div className={dividerClass}>
          <h4 className={`${headingClass} mb-2.5`}>Sleeve Type</h4>
          <div className="flex flex-col gap-1.5">
            {displayedSleeves.map((sleeve) => {
              const isChecked = filters.sleeves.includes(sleeve);
              return (
                <label
                  key={sleeve}
                  onClick={() => toggleItem("sleeves", sleeve)}
                  className={rowClass}
                >
                  <div
                    className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${getCheckboxClass(
                      isChecked
                    )}`}
                  >
                    {isChecked && <Check size={12} strokeWidth={3.5} />}
                  </div>
                  <span className={getLabelClass(isChecked)}>{sleeve}</span>
                </label>
              );
            })}
          </div>
          {availableSleeves.length > 6 && (
            <button
              type="button"
              onClick={() => setShowAllSleeves(!showAllSleeves)}
              className={accentBtnClass}
            >
              {showAllSleeves ? (
                <>
                  <span>See less</span>
                  <ChevronUp size={14} />
                </>
              ) : (
                <>
                  <span>See more ({availableSleeves.length - 6})</span>
                  <ChevronDown size={14} />
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* 9. DISCOUNT */}
      <div className={dividerClass}>
        <h4 className={`${headingClass} mb-2.5`}>Discount</h4>
        <div className="flex flex-col gap-1.5">
          {DISCOUNT_OPTIONS.map((disc) => {
            const isSelected = filters.minDiscount === disc.value;
            return (
              <button
                key={disc.value}
                type="button"
                onClick={() =>
                  setFilters((p) => ({
                    ...p,
                    minDiscount: p.minDiscount === disc.value ? 0 : disc.value,
                  }))
                }
                className={getRadioRowClass(isSelected)}
              >
                {isSelected && (
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      isNativeApp ? "bg-[#D97706]" : "bg-emerald-400"
                    }`}
                  />
                )}
                <span>{disc.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 10. CUSTOMER REVIEWS */}
      <div className={dividerClass}>
        <h4 className={`${headingClass} mb-2.5`}>Customer Reviews</h4>
        <button
          type="button"
          onClick={() =>
            setFilters((p) => ({
              ...p,
              minRating: p.minRating === 4 ? 0 : 4,
            }))
          }
          className={`flex items-center gap-2 py-1 px-2 rounded-lg text-xs font-bold transition-all w-full text-left cursor-pointer ${
            filters.minRating === 4
              ? isNativeApp
                ? "bg-[#FFF6D6] border border-[#D4A017]/60 text-[#111111]"
                : "bg-amber-500/10 border border-amber-500/40 text-amber-300"
              : isNativeApp
                ? "hover:bg-[#FFF6D6] text-[#3F3626] hover:text-[#111111]"
                : "hover:bg-zinc-900 text-zinc-300 hover:text-white"
          }`}
        >
          <div className="flex items-center text-amber-500">
            <Star size={14} className="fill-amber-400 text-amber-500" />
            <Star size={14} className="fill-amber-400 text-amber-500" />
            <Star size={14} className="fill-amber-400 text-amber-500" />
            <Star size={14} className="fill-amber-400 text-amber-500" />
            <Star size={14} className={isNativeApp ? "text-[#C5B38D]" : "text-zinc-600"} />
          </div>
          <span className="text-xs font-semibold">& Up</span>
        </button>
      </div>

      {/* 11. ZEBALPHA SELECTION */}
      <div className="pb-1">
        <h4 className={`${headingClass} mb-2.5`}>Marketplace Badges</h4>
        <div className="flex flex-col gap-1.5">
          {FASHION_TIER_OPTIONS.map((tier) => {
            const isChecked = filters.fashionTiers.includes(tier);
            return (
              <label
                key={tier}
                onClick={() => toggleItem("fashionTiers", tier)}
                className={rowClass}
              >
                <div
                  className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${getCheckboxClass(
                    isChecked
                  )}`}
                >
                  {isChecked && <Check size={12} strokeWidth={3.5} />}
                </div>
                <span className={getLabelClass(isChecked)}>{tier}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
