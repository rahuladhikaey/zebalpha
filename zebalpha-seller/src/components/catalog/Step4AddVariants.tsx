"use client";

import React from "react";
import { Plus, Trash2, Layers, AlertCircle, Upload, CheckCircle2 } from "lucide-react";

export interface CatalogVariant {
  id: string;
  size: string;
  color?: string;
  sku: string;
  stock: string;
  price: string;
  defective_returns_price: string;
  mrp: string;
  image_url?: string;
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
  };
  onChange: (updates: Partial<Step4Props["formData"]>) => void;
}

const CLOTHING_SIZES = ["Free Size", "XS", "S", "M", "L", "XL", "XXL", "3XL"];

export default function Step4AddVariants({ formData, onChange }: Step4Props) {
  const addVariant = (sizeName: string = "Free Size") => {
    const newVariant: CatalogVariant = {
      id: Math.random().toString(36).substring(2, 9),
      size: sizeName,
      sku: formData.style_code ? `${formData.style_code}_${sizeName}` : `SKU_${sizeName}`,
      stock: "20",
      price: formData.price || "0",
      defective_returns_price: formData.defective_returns_price || "0",
      mrp: formData.mrp || "0",
    };
    onChange({ variants: [...formData.variants, newVariant] });
  };

  const removeVariant = (id: string) => {
    onChange({ variants: formData.variants.filter((v) => v.id !== id) });
  };

  const updateVariant = (id: string, updates: Partial<CatalogVariant>) => {
    const updated = formData.variants.map((v) => (v.id === id ? { ...v, ...updates } : v));
    onChange({ variants: updated });
  };

  const handleVariantImageUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      if (evt.target?.result) {
        updateVariant(id, { image_url: evt.target.result as string });
      }
    };
    reader.readAsDataURL(file);
  };

  const addCommonStandardSizes = () => {
    const defaultSizes = ["S", "M", "L", "XL"];
    const existingSizes = formData.variants.map((v) => v.size);
    const toAdd = defaultSizes.filter((s) => !existingSizes.includes(s));
    
    const newVariants: CatalogVariant[] = toAdd.map((s) => ({
      id: Math.random().toString(36).substring(2, 9),
      size: s,
      sku: formData.style_code ? `${formData.style_code}_${s}` : `SKU_${s}`,
      stock: "20",
      price: formData.price || "0",
      defective_returns_price: formData.defective_returns_price || "0",
      mrp: formData.mrp || "0",
    }));

    onChange({ variants: [...formData.variants, ...newVariants] });
  };

  return (
    <div className="space-y-6">
      {/* Toggle: Single Product vs Multi-Variant Product */}
      <div className="p-4 rounded-xl bg-[#141418] border border-[#27272a] flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold text-white block">Multi-Variant Clothing Product</span>
          <span className="text-xs text-zinc-400">
            Enable if this garment is sold in multiple sizes (S, M, L, XL) or colors.
          </span>
        </div>
        <input
          type="checkbox"
          checked={formData.has_variants}
          onChange={(e) => {
            const hasVar = e.target.checked;
            onChange({
              has_variants: hasVar,
              variants: hasVar && formData.variants.length === 0 ? [] : formData.variants,
            });
          }}
          className="w-5 h-5 rounded border-[#27272a] accent-white cursor-pointer"
        />
      </div>

      {!formData.has_variants ? (
        /* Single Item Inventory Form */
        <div className="p-5 rounded-xl bg-[#0d0d11] border border-[#27272a] space-y-4">
          <div className="flex items-center gap-2 text-white font-semibold text-sm border-b border-[#27272a] pb-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            Single Item Inventory & Stock
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-zinc-300 mb-1 block">Total Inventory Stock *</label>
              <input
                type="number"
                value={formData.single_stock}
                onChange={(e) => onChange({ single_stock: e.target.value })}
                placeholder="e.g. 50"
                className="w-full p-2.5 rounded-lg bg-[#141418] border border-[#27272a] text-white text-sm"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-300 mb-1 block">SKU ID *</label>
              <input
                type="text"
                value={formData.single_sku}
                onChange={(e) => onChange({ single_sku: e.target.value })}
                placeholder="e.g. ZBA-HD-FS-01"
                className="w-full p-2.5 rounded-lg bg-[#141418] border border-[#27272a] text-white text-sm"
              />
            </div>
          </div>
        </div>
      ) : (
        /* Multi-Variant Manager */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#27272a] pb-3">
            <div>
              <span className="text-sm font-semibold text-white block">Clothing Size Matrix ({formData.variants.length} Variants)</span>
              <span className="text-xs text-zinc-400">Specify inventory and custom prices per size</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={addCommonStandardSizes}
                className="py-1.5 px-3 rounded-lg bg-[#18181b] border border-[#27272a] hover:border-zinc-400 text-xs text-zinc-200 font-medium transition-all"
              >
                + Quick Add S, M, L, XL
              </button>
              <button
                type="button"
                onClick={() => addVariant("Free Size")}
                className="py-1.5 px-3 rounded-lg bg-white text-black hover:bg-zinc-200 text-xs font-bold transition-all flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Size Variant
              </button>
            </div>
          </div>

          {formData.variants.length === 0 ? (
            <div className="p-8 rounded-xl border-2 border-dashed border-[#27272a] bg-[#0d0d11] text-center space-y-3">
              <p className="text-xs text-zinc-400">No size variants added yet.</p>
              <button
                type="button"
                onClick={addCommonStandardSizes}
                className="py-2 px-4 rounded-lg bg-white text-black text-xs font-bold"
              >
                Add Standard Sizes (S, M, L, XL)
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {formData.variants.map((v, idx) => (
                <div
                  key={v.id}
                  className="p-4 rounded-xl bg-[#0d0d11] border border-[#27272a] space-y-3 relative group"
                >
                  <div className="flex items-center justify-between border-b border-[#222228] pb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white bg-[#18181b] px-2.5 py-1 rounded-md border border-[#27272a]">
                        Variant #{idx + 1}
                      </span>
                      <span className="text-xs text-zinc-400">Size: <strong className="text-white">{v.size}</strong></span>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeVariant(v.id)}
                      className="text-red-400 hover:text-red-300 p-1 rounded-md hover:bg-red-500/10 transition-colors"
                      title="Remove variant"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[11px] font-medium text-zinc-400 mb-1 block">Size *</label>
                      <select
                        value={v.size}
                        onChange={(e) => updateVariant(v.id, { size: e.target.value })}
                        className="w-full p-2 rounded-lg bg-[#141418] border border-[#27272a] text-white text-xs"
                      >
                        {CLOTHING_SIZES.map((sz, i) => (
                          <option key={i} value={sz}>{sz}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-zinc-400 mb-1 block">Stock Inventory *</label>
                      <input
                        type="number"
                        value={v.stock}
                        onChange={(e) => updateVariant(v.id, { stock: e.target.value })}
                        placeholder="20"
                        className="w-full p-2 rounded-lg bg-[#141418] border border-[#27272a] text-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-zinc-400 mb-1 block">Variant SKU ID *</label>
                      <input
                        type="text"
                        value={v.sku}
                        onChange={(e) => updateVariant(v.id, { sku: e.target.value })}
                        placeholder="SKU_ID"
                        className="w-full p-2 rounded-lg bg-[#141418] border border-[#27272a] text-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-medium text-zinc-400 mb-1 block">Listing Price (₹) *</label>
                      <input
                        type="number"
                        value={v.price}
                        onChange={(e) => updateVariant(v.id, { price: e.target.value })}
                        placeholder="799"
                        className="w-full p-2 rounded-lg bg-[#141418] border border-[#27272a] text-white text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
