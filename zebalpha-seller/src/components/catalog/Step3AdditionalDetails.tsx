"use client";

import React from "react";
import { Box, Tag, Sparkles } from "lucide-react";

const STOREFRONT_TAG_OPTIONS = [
  { key: "winter", label: "Winter Store" },
  { key: "korean", label: "Korean Store" },
  { key: "festive", label: "Festive & Wedding" },
  { key: "party", label: "Party & Night Out" },
  { key: "streetwear", label: "Streetwear" },
  { key: "oversized", label: "Oversized Fit" },
  { key: "daily", label: "Daily Essentials" },
  { key: "trending", label: "Trendy Street" },
  { key: "gifting", label: "Gifting Store" },
  { key: "ethnic", label: "Ethnic Chic" },
  { key: "western", label: "Western Glam" },
  { key: "skincare", label: "Skincare" },
  { key: "makeup", label: "Makeup" },
  { key: "travel", label: "Travel Store" },
];

export interface Step3Props {
  formData: {
    style_code: string;
    volumetric_weight?: string;
    brand: string;
    collection: string;
    is_combo?: boolean;
    storefront_tags?: string[];
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
              Calculated dynamically via ZebAlpha Logistics standard in Step 2.
            </span>
          </div>
          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg self-start sm:self-auto">
            {formData.volumetric_weight ? `${formData.volumetric_weight}g Billable` : "Linked to Step 2"}
          </span>
        </div>
      </div>

      {/* Category Storefront Discovery & Micro-Store Tags */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-white font-semibold text-sm border-b border-[#27272a] pb-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          Category Storefront Discovery Tags (Optional)
        </div>

        <label className="flex items-center justify-between gap-3 p-3.5 rounded-xl bg-[#0d0d11] border border-[#27272a] cursor-pointer">
          <div>
            <span className="text-xs font-bold text-white block">Combo / Value Kit / Multi-Pack</span>
            <span className="text-[11px] text-zinc-400">
              Enable to feature automatically inside the Category Storefront &ldquo;Combo &amp; Kits&rdquo; section.
            </span>
          </div>
          <input
            type="checkbox"
            checked={Boolean(formData.is_combo)}
            onChange={(e) => onChange({ is_combo: e.target.checked })}
            className="h-4 w-4 accent-emerald-400"
          />
        </label>

        <div>
          <p className="text-xs font-medium text-zinc-300 mb-2">
            Tag Micro-Stores &amp; Occasions (helps customers discover this item in Explore Stores &amp; Lookbooks)
          </p>
          <div className="flex flex-wrap gap-2">
            {STOREFRONT_TAG_OPTIONS.map((opt) => {
              const current = formData.storefront_tags || [];
              const active = current.includes(opt.key);
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    const next = active
                      ? current.filter((t) => t !== opt.key)
                      : [...current, opt.key];
                    onChange({ storefront_tags: next });
                  }}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition cursor-pointer ${
                    active
                      ? "bg-amber-400 text-black border-amber-300"
                      : "bg-[#0d0d11] text-zinc-300 border-[#27272a] hover:border-zinc-500"
                  }`}
                >
                  {active ? "✓ " : "+ "}
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
