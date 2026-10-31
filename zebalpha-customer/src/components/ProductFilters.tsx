"use client";

import React, { useState } from "react";
import { Check, ChevronDown, ChevronUp, Star, RotateCcw, X } from "lucide-react";

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

// Preset Amazon-standard filter options specified by User
export const GENDER_OPTIONS = ["Women", "Men", "Unisex"];

export const SIZE_OPTIONS = [
  "5XS", "4XS", "3XS", "2XS", "XS", "S", "M", "L", "XL",
  "2XL", "3XL", "4XL", "5XL", "6XL", "7XL", "8XL", "9XL", "Free Size"
];

export const COLOR_OPTIONS = [
  { name: "Black", hex: "#000000", border: "#333333" },
  { name: "White", hex: "#FFFFFF", border: "#CCCCCC" },
  { name: "Red", hex: "#EF4444", border: "#EF4444" },
  { name: "Blue", hex: "#3B82F6", border: "#3B82F6" },
  { name: "Green", hex: "#10B981", border: "#10B981" },
  { name: "Yellow", hex: "#F59E0B", border: "#F59E0B" },
  { name: "Pink", hex: "#EC4899", border: "#EC4899" },
  { name: "Beige", hex: "#D4B996", border: "#D4B996" },
  { name: "Maroon", hex: "#800000", border: "#800000" },
  { name: "Grey", hex: "#6B7280", border: "#6B7280" },
  { name: "Navy", hex: "#1E3A8A", border: "#1E3A8A" },
  { name: "Multi", hex: "linear-gradient(135deg, #EF4444 0%, #3B82F6 50%, #10B981 100%)", border: "#666666" },
];

export const DEFAULT_BRANDS = [
  "Jawdrobe",
  "rytras",
  "Shasmi",
  "Symbol Premium",
  "Amazon Brand - Symbol",
  "Leriya Fashion",
  "ANNI DESIGNER",
  "Binodini Bastra Bipani",
  "ZebAlpha",
];

export const FASHION_TIER_OPTIONS = [
  "Top Brands",
  "Made for ZebAlpha",
  "Premium Brands",
];

export const DISCOUNT_OPTIONS = [
  { label: "10% Off or more", value: 10 },
  { label: "25% Off or more", value: 25 },
  { label: "35% Off or more", value: 35 },
  { label: "50% Off or more", value: 50 },
  { label: "60% Off or more", value: 60 },
  { label: "70% Off or more", value: 70 },
];

export const MATERIAL_OPTIONS = [
  "Cotton",
  "Rayon",
  "Silk",
  "Art Silk",
  "Chiffon",
  "Corduroy",
  "Crepe",
  "Georgette",
  "Linen",
  "Polyester",
];

export const SLEEVE_OPTIONS = [
  "Cap Sleeve",
  "Raglan Sleeve",
  "Cuff Sleeve",
  "Balloon Sleeve",
  "Batwing Sleeve",
  "Bell Sleeve",
  "Bishop Sleeve",
  "Butterfly Sleeve",
  "Cape Sleeve",
  "Cold Shoulder Sleeve",
  "Flutter Sleeve",
  "Kimono Sleeve",
  "Lantern Sleeve",
  "Puff Sleeve",
  "Ruffle Sleeve",
  "Split Sleeve",
];

export const PRICE_OPTIONS = [
  { label: "Up to ₹300", value: "under300" },
  { label: "₹300 - ₹400", value: "300to400" },
  { label: "₹400 - ₹600", value: "400to600" },
  { label: "Over ₹600", value: "over600" },
];

export const DEFAULT_SELLERS = [
  "Cocoblu Retail",
  "Overseas_shop",
  "Binodini Bastra Bipani",
  "ZebAlpha Direct",
];

interface ProductFiltersProps {
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  availableBrands?: string[];
  availableSellers?: string[];
  totalFilteredCount?: number;
  onApply?: () => void;
  isMobileModal?: boolean;
}

export function ProductFilters({
  filters,
  setFilters,
  availableBrands = [],
  availableSellers = [],
  totalFilteredCount,
  onApply,
  isMobileModal = false,
}: ProductFiltersProps) {
  // Expansion toggles for long lists
  const [showAllBrands, setShowAllBrands] = useState(false);
  const [showAllMaterials, setShowAllMaterials] = useState(false);
  const [showAllSleeves, setShowAllSleeves] = useState(false);
  const [showAllSellers, setShowAllSellers] = useState(false);

  // Temporary local min/max price input
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

  // Combine default and dynamic brands/sellers
  const allBrands = Array.from(new Set([...DEFAULT_BRANDS, ...availableBrands]));
  const displayedBrands = showAllBrands ? allBrands : allBrands.slice(0, 7);

  const displayedMaterials = showAllMaterials ? MATERIAL_OPTIONS : MATERIAL_OPTIONS.slice(0, 7);
  const displayedSleeves = showAllSleeves ? SLEEVE_OPTIONS : SLEEVE_OPTIONS.slice(0, 6);

  const allSellers = Array.from(new Set([...DEFAULT_SELLERS, ...availableSellers]));
  const displayedSellers = showAllSellers ? allSellers : allSellers.slice(0, 4);

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

  return (
    <div className="flex flex-col gap-6 text-zinc-300 select-none pb-6">
      {/* Header with Clear All */}
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black uppercase tracking-wider text-white">
            Filters
          </span>
          {activeCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400 text-[10px] font-black text-black">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
          >
            <RotateCcw size={12} />
            <span>Clear All</span>
          </button>
        )}
      </div>

      {/* 1. GENDER */}
      <div className="border-b border-zinc-800/60 pb-4">
        <h4 className="text-xs font-black uppercase tracking-wider text-white mb-2.5">
          Gender
        </h4>
        <div className="flex flex-col gap-1.5">
          {GENDER_OPTIONS.map((gender) => {
            const isChecked = filters.genders.includes(gender);
            return (
              <label
                key={gender}
                onClick={() => toggleItem("genders", gender)}
                className="flex items-center gap-2.5 text-xs font-semibold py-1 cursor-pointer hover:text-white transition-colors group"
              >
                <div
                  className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${
                    isChecked
                      ? "border-emerald-500 bg-emerald-500 text-black shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                      : "border-zinc-700 bg-zinc-900 group-hover:border-zinc-500"
                  }`}
                >
                  {isChecked && <Check size={12} strokeWidth={3.5} />}
                </div>
                <span className={isChecked ? "text-white font-bold" : "text-zinc-300"}>
                  {gender}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* 2. WOMEN'S GENERAL SIZE */}
      <div className="border-b border-zinc-800/60 pb-4">
        <div className="flex items-center justify-between mb-2.5">
          <h4 className="text-xs font-black uppercase tracking-wider text-white">
            Women&apos;s General Size
          </h4>
          {filters.sizes.length > 0 && (
            <button
              onClick={() => setFilters((p) => ({ ...p, sizes: [] }))}
              className="text-[10px] text-zinc-400 hover:text-white"
            >
              Reset
            </button>
          )}
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {SIZE_OPTIONS.map((size) => {
            const isSelected = filters.sizes.includes(size);
            return (
              <button
                key={size}
                type="button"
                onClick={() => toggleItem("sizes", size)}
                className={`py-1.5 px-1 text-[10px] font-black uppercase tracking-wider rounded-lg border transition-all text-center cursor-pointer ${
                  isSelected
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

      {/* 3. COLOUR */}
      <div className="border-b border-zinc-800/60 pb-4">
        <div className="flex items-center justify-between mb-2.5">
          <h4 className="text-xs font-black uppercase tracking-wider text-white">
            Colour
          </h4>
          {filters.colors.length > 0 && (
            <button
              onClick={() => setFilters((p) => ({ ...p, colors: [] }))}
              className="text-[10px] text-zinc-400 hover:text-white"
            >
              Reset
            </button>
          )}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {COLOR_OPTIONS.map((c) => {
            const isSelected = filters.colors.includes(c.name);
            return (
              <button
                key={c.name}
                type="button"
                onClick={() => toggleItem("colors", c.name)}
                title={c.name}
                className="flex flex-col items-center gap-1 group cursor-pointer focus:outline-none"
              >
                <div
                  style={{
                    background: c.hex,
                    borderColor: c.border,
                  }}
                  className={`h-7 w-7 rounded-full border transition-all flex items-center justify-center ${
                    isSelected
                      ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-black scale-110 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                      : "opacity-80 group-hover:opacity-100 group-hover:scale-105"
                  }`}
                >
                  {isSelected && (
                    <Check
                      size={14}
                      strokeWidth={3}
                      className={c.name === "White" || c.name === "Yellow" ? "text-black" : "text-white"}
                    />
                  )}
                </div>
                <span
                  className={`text-[9px] font-bold truncate max-w-[50px] transition-colors ${
                    isSelected ? "text-emerald-400 font-extrabold" : "text-zinc-400 group-hover:text-zinc-200"
                  }`}
                >
                  {c.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. BRANDS */}
      <div className="border-b border-zinc-800/60 pb-4">
        <h4 className="text-xs font-black uppercase tracking-wider text-white mb-2.5">
          Brands
        </h4>
        <div className="flex flex-col gap-1.5">
          {displayedBrands.map((brand) => {
            const isChecked = filters.brands.includes(brand);
            return (
              <label
                key={brand}
                onClick={() => toggleItem("brands", brand)}
                className="flex items-center gap-2.5 text-xs font-semibold py-0.5 cursor-pointer hover:text-white transition-colors group"
              >
                <div
                  className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${
                    isChecked
                      ? "border-emerald-500 bg-emerald-500 text-black shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                      : "border-zinc-700 bg-zinc-900 group-hover:border-zinc-500"
                  }`}
                >
                  {isChecked && <Check size={12} strokeWidth={3.5} />}
                </div>
                <span className={`truncate ${isChecked ? "text-white font-bold" : "text-zinc-300"}`}>
                  {brand}
                </span>
              </label>
            );
          })}
        </div>
        {allBrands.length > 7 && (
          <button
            type="button"
            onClick={() => setShowAllBrands(!showAllBrands)}
            className="flex items-center gap-1 mt-2 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
          >
            {showAllBrands ? (
              <>
                <span>See less</span>
                <ChevronUp size={14} />
              </>
            ) : (
              <>
                <span>See more ({allBrands.length - 7})</span>
                <ChevronDown size={14} />
              </>
            )}
          </button>
        )}
      </div>

      {/* 5. AMAZON / ZEBALPHA FASHION */}
      <div className="border-b border-zinc-800/60 pb-4">
        <h4 className="text-xs font-black uppercase tracking-wider text-white mb-2.5">
          ZebAlpha Fashion
        </h4>
        <div className="flex flex-col gap-1.5">
          {FASHION_TIER_OPTIONS.map((tier) => {
            const isChecked = filters.fashionTiers.includes(tier);
            return (
              <label
                key={tier}
                onClick={() => toggleItem("fashionTiers", tier)}
                className="flex items-center gap-2.5 text-xs font-semibold py-0.5 cursor-pointer hover:text-white transition-colors group"
              >
                <div
                  className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${
                    isChecked
                      ? "border-emerald-500 bg-emerald-500 text-black shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                      : "border-zinc-700 bg-zinc-900 group-hover:border-zinc-500"
                  }`}
                >
                  {isChecked && <Check size={12} strokeWidth={3.5} />}
                </div>
                <span className={isChecked ? "text-white font-bold" : "text-zinc-300"}>
                  {tier}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* 6. CUSTOMER REVIEWS */}
      <div className="border-b border-zinc-800/60 pb-4">
        <h4 className="text-xs font-black uppercase tracking-wider text-white mb-2.5">
          Customer Reviews
        </h4>
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
              ? "bg-amber-500/10 border border-amber-500/40 text-amber-300"
              : "hover:bg-zinc-900 text-zinc-300 hover:text-white"
          }`}
        >
          <div className="flex items-center text-amber-400">
            <Star size={14} className="fill-amber-400 text-amber-400" />
            <Star size={14} className="fill-amber-400 text-amber-400" />
            <Star size={14} className="fill-amber-400 text-amber-400" />
            <Star size={14} className="fill-amber-400 text-amber-400" />
            <Star size={14} className="text-zinc-600" />
          </div>
          <span className="text-xs font-semibold">& Up</span>
        </button>
      </div>

      {/* 7. DISCOUNT */}
      <div className="border-b border-zinc-800/60 pb-4">
        <h4 className="text-xs font-black uppercase tracking-wider text-white mb-2.5">
          Discount
        </h4>
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
                className={`text-left text-xs font-semibold py-0.5 transition-colors cursor-pointer hover:text-white ${
                  isSelected ? "text-emerald-400 font-extrabold flex items-center gap-1.5" : "text-zinc-400"
                }`}
              >
                {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                <span>{disc.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 8. APPAREL MATERIAL */}
      <div className="border-b border-zinc-800/60 pb-4">
        <h4 className="text-xs font-black uppercase tracking-wider text-white mb-2.5">
          Apparel Material
        </h4>
        <div className="flex flex-col gap-1.5">
          {displayedMaterials.map((mat) => {
            const isChecked = filters.materials.includes(mat);
            return (
              <label
                key={mat}
                onClick={() => toggleItem("materials", mat)}
                className="flex items-center gap-2.5 text-xs font-semibold py-0.5 cursor-pointer hover:text-white transition-colors group"
              >
                <div
                  className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${
                    isChecked
                      ? "border-emerald-500 bg-emerald-500 text-black shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                      : "border-zinc-700 bg-zinc-900 group-hover:border-zinc-500"
                  }`}
                >
                  {isChecked && <Check size={12} strokeWidth={3.5} />}
                </div>
                <span className={isChecked ? "text-white font-bold" : "text-zinc-300"}>
                  {mat}
                </span>
              </label>
            );
          })}
        </div>
        {MATERIAL_OPTIONS.length > 7 && (
          <button
            type="button"
            onClick={() => setShowAllMaterials(!showAllMaterials)}
            className="flex items-center gap-1 mt-2 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
          >
            {showAllMaterials ? (
              <>
                <span>See less</span>
                <ChevronUp size={14} />
              </>
            ) : (
              <>
                <span>See more ({MATERIAL_OPTIONS.length - 7})</span>
                <ChevronDown size={14} />
              </>
            )}
          </button>
        )}
      </div>

      {/* 9. SLEEVE TYPE */}
      <div className="border-b border-zinc-800/60 pb-4">
        <h4 className="text-xs font-black uppercase tracking-wider text-white mb-2.5">
          Sleeve Type
        </h4>
        <div className="flex flex-col gap-1.5">
          {displayedSleeves.map((sleeve) => {
            const isChecked = filters.sleeves.includes(sleeve);
            return (
              <label
                key={sleeve}
                onClick={() => toggleItem("sleeves", sleeve)}
                className="flex items-center gap-2.5 text-xs font-semibold py-0.5 cursor-pointer hover:text-white transition-colors group"
              >
                <div
                  className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${
                    isChecked
                      ? "border-emerald-500 bg-emerald-500 text-black shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                      : "border-zinc-700 bg-zinc-900 group-hover:border-zinc-500"
                  }`}
                >
                  {isChecked && <Check size={12} strokeWidth={3.5} />}
                </div>
                <span className={isChecked ? "text-white font-bold" : "text-zinc-300"}>
                  {sleeve}
                </span>
              </label>
            );
          })}
        </div>
        {SLEEVE_OPTIONS.length > 6 && (
          <button
            type="button"
            onClick={() => setShowAllSleeves(!showAllSleeves)}
            className="flex items-center gap-1 mt-2 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
          >
            {showAllSleeves ? (
              <>
                <span>See less</span>
                <ChevronUp size={14} />
              </>
            ) : (
              <>
                <span>See more ({SLEEVE_OPTIONS.length - 6})</span>
                <ChevronDown size={14} />
              </>
            )}
          </button>
        )}
      </div>

      {/* 10. PRICE */}
      <div className="border-b border-zinc-800/60 pb-4">
        <h4 className="text-xs font-black uppercase tracking-wider text-white mb-1">
          Price
        </h4>
        <p className="text-[10px] text-zinc-500 mb-2 font-mono">₹88–₹48,300+</p>
        <div className="flex flex-col gap-1.5">
          {PRICE_OPTIONS.map((opt) => {
            const isSelected = filters.priceRange === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handlePriceRange(opt.value)}
                className={`text-left text-xs font-semibold py-0.5 transition-colors cursor-pointer hover:text-white ${
                  isSelected ? "text-emerald-400 font-extrabold flex items-center gap-1.5" : "text-zinc-400"
                }`}
              >
                {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />}
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Custom Price Inputs */}
        <form onSubmit={handleApplyCustomPrice} className="mt-3 flex items-center gap-2">
          <input
            type="number"
            placeholder="₹ Min"
            value={tempMin}
            onChange={(e) => setTempMin(e.target.value)}
            className="w-16 rounded-lg border border-zinc-800 bg-zinc-900/80 px-2 py-1 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500"
          />
          <span className="text-zinc-600 text-xs">-</span>
          <input
            type="number"
            placeholder="₹ Max"
            value={tempMax}
            onChange={(e) => setTempMax(e.target.value)}
            className="w-16 rounded-lg border border-zinc-800 bg-zinc-900/80 px-2 py-1 text-xs text-white placeholder:text-zinc-600 outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-zinc-800 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-500 hover:text-black transition-colors cursor-pointer"
          >
            Go
          </button>
        </form>
      </div>

      {/* 11. SELLER */}
      <div className="pb-2">
        <h4 className="text-xs font-black uppercase tracking-wider text-white mb-2.5">
          Seller
        </h4>
        <div className="flex flex-col gap-1.5">
          {displayedSellers.map((seller) => {
            const isChecked = filters.sellers.includes(seller);
            return (
              <label
                key={seller}
                onClick={() => toggleItem("sellers", seller)}
                className="flex items-center gap-2.5 text-xs font-semibold py-0.5 cursor-pointer hover:text-white transition-colors group"
              >
                <div
                  className={`flex h-4 w-4 items-center justify-center rounded border transition-all ${
                    isChecked
                      ? "border-emerald-500 bg-emerald-500 text-black shadow-[0_0_8px_rgba(16,185,129,0.4)]"
                      : "border-zinc-700 bg-zinc-900 group-hover:border-zinc-500"
                  }`}
                >
                  {isChecked && <Check size={12} strokeWidth={3.5} />}
                </div>
                <span className={`truncate ${isChecked ? "text-white font-bold" : "text-zinc-300"}`}>
                  {seller}
                </span>
              </label>
            );
          })}
        </div>
        {allSellers.length > 4 && (
          <button
            type="button"
            onClick={() => setShowAllSellers(!showAllSellers)}
            className="flex items-center gap-1 mt-2 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
          >
            {showAllSellers ? (
              <>
                <span>See less</span>
                <ChevronUp size={14} />
              </>
            ) : (
              <>
                <span>See more ({allSellers.length - 4})</span>
                <ChevronDown size={14} />
              </>
            )}
          </button>
        )}
      </div>

      {/* Mobile Drawer Apply Action Button */}
      {isMobileModal && onApply && (
        <div className="sticky bottom-0 left-0 right-0 pt-4 bg-gradient-to-t from-black via-black/95 to-transparent mt-4">
          <button
            type="button"
            onClick={onApply}
            className="w-full rounded-2xl bg-emerald-400 py-3.5 text-center text-sm font-black uppercase tracking-wider text-black shadow-lg hover:bg-emerald-300 transition-all active:scale-[0.99] cursor-pointer"
          >
            {totalFilteredCount !== undefined
              ? `Show ${totalFilteredCount} Products`
              : "Apply Filters"}
          </button>
        </div>
      )}
    </div>
  );
}
