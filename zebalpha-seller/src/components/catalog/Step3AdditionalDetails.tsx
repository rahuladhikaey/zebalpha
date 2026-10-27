"use client";

import React from "react";
import { Sparkles, Layers, Box, Tag, Calendar } from "lucide-react";

export interface Step3Props {
  formData: {
    style_code: string;
    volumetric_weight?: string;
    brand: string;
    is_premium: boolean;
    is_new_drop: boolean;
    collection: string;
    target_drop_date: string;
    tier: string;
  };
  onChange: (updates: Partial<Step3Props["formData"]>) => void;
}

export default function Step3AdditionalDetails({ formData, onChange }: Step3Props) {
  return (
    <div className="space-y-6">
      {/* Brand & Product Identifiers */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-white font-semibold text-sm border-b border-[#27272a] pb-2">
          <Tag className="w-4 h-4 text-emerald-400" />
          Style & Brand Identifiers
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-zinc-300 mb-1 block">Style Code / Seller Product ID</label>
            <input
              type="text"
              value={formData.style_code}
              onChange={(e) => onChange({ style_code: e.target.value })}
              placeholder="e.g. HOODIE_BLK_01"
              className="w-full p-2.5 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs focus:border-white"
            />
            <span className="text-[10px] text-zinc-500 mt-1 block">Internal reference code for your inventory</span>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-300 mb-1 block">Brand Name</label>
            <input
              type="text"
              value={formData.brand}
              onChange={(e) => onChange({ brand: e.target.value })}
              placeholder="e.g. zebalpha"
              className="w-full p-2.5 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs focus:border-white"
            />
          </div>
        </div>
      </div>

      {/* Volumetric Weight & Packaging */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-white font-semibold text-sm border-b border-[#27272a] pb-2">
          <Box className="w-4 h-4 text-emerald-400" />
          Packaging & Logistics Dimensions
        </div>

        <div className="p-3.5 rounded-xl bg-[#0d0d11] border border-[#27272a] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-xs font-semibold text-white block">
              Automated Package Dimensions & Billable Weight
            </span>
            <span className="text-[11px] text-zinc-400">
              Calculated dynamically via Shiprocket & Flipkart standard in Step 2.
            </span>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg self-start sm:self-auto">
            {formData.volumetric_weight ? `${formData.volumetric_weight}g Billable` : "Linked to Step 2"}
          </span>
        </div>
      </div>

      {/* Collection & Drop Options */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-white font-semibold text-sm border-b border-[#27272a] pb-2">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          Collection & Premium Drop Settings
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3.5 rounded-xl bg-[#141418] border border-[#27272a] flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-white block">Mark as Premium Product</span>
              <span className="text-[10px] text-zinc-400">Featured in premium customer catalog collection</span>
            </div>
            <input
              type="checkbox"
              checked={formData.is_premium}
              onChange={(e) => onChange({ is_premium: e.target.checked })}
              className="w-4 h-4 rounded border-[#27272a] accent-white"
            />
          </div>

          <div className="p-3.5 rounded-xl bg-[#141418] border border-[#27272a] flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-white block">Exclusive Drop Feature</span>
              <span className="text-[10px] text-zinc-400">Schedule product reveal timer for drop events</span>
            </div>
            <input
              type="checkbox"
              checked={formData.is_new_drop}
              onChange={(e) => onChange({ is_new_drop: e.target.checked })}
              className="w-4 h-4 rounded border-[#27272a] accent-white"
            />
          </div>
        </div>

        {formData.is_new_drop && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="text-xs font-medium text-zinc-300 mb-1 block">Collection Name</label>
              <input
                type="text"
                value={formData.collection}
                onChange={(e) => onChange({ collection: e.target.value })}
                placeholder="e.g. Winter Drop '26"
                className="w-full p-2.5 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-300 mb-1 block">Target Drop Date & Time</label>
              <input
                type="datetime-local"
                value={formData.target_drop_date}
                onChange={(e) => onChange({ target_drop_date: e.target.value })}
                className="w-full p-2.5 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
