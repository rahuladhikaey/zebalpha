"use client";

import React from "react";
import { Info, Calculator, Building2, Package, Tag, ShieldCheck } from "lucide-react";

export interface Step2Props {
  formData: {
    fabric: string;
    pattern: string;
    fit_type: string;
    sleeve_type: string;
    neck_type: string;
    care_instructions: string;
    target_gender: string;
    weight_grams: string;

    country_of_origin: string;
    manufacturer_name: string;
    manufacturer_address: string;
    manufacturer_pincode: string;
    packer_same_as_manufacturer: boolean;
    packer_name: string;
    packer_address: string;
    packer_pincode: string;

    price: string;
    defective_returns_price: string;
    mrp: string;
  };
  onChange: (updates: Partial<Step2Props["formData"]>) => void;
}

const FABRIC_OPTIONS = ["100% Pure Cotton", "Cotton Blend", "Denim", "Polyester", "Linen", "Silk", "Rayon", "Fleece", "Knit"];
const PATTERN_OPTIONS = ["Solid / Plain", "Printed", "Graphic", "Striped", "Checked", "Embroidered", "Color Block", "Tie-Dye"];
const FIT_OPTIONS = ["Regular Fit", "Oversized Fit", "Slim Fit", "Relaxed Fit", "Loose Fit"];
const SLEEVE_OPTIONS = ["Short Sleeve", "Long Sleeve", "Sleeveless", "3/4th Sleeve", "Half Sleeve"];
const NECK_OPTIONS = ["Round Neck", "Hoodie with Drawstring", "Polo Collar", "V-Neck", "Turtleneck", "Spread Collar"];
const CARE_OPTIONS = ["Machine Wash Cold", "Hand Wash", "Dry Clean Only", "Do Not Bleach"];
const GENDER_OPTIONS = ["Men", "Women", "Unisex", "Boys", "Girls"];

export default function Step2BasicDetails({ formData, onChange }: Step2Props) {
  const sellerPriceNum = parseFloat(formData.price) || 0;
  const defectivePriceNum = parseFloat(formData.defective_returns_price) || 0;
  const mrpNum = parseFloat(formData.mrp) || 0;

  // Shipping & Bank Settlement calculation (no GST)
  const estimatedShippingFee = sellerPriceNum > 0 ? (sellerPriceNum > 500 ? 0 : 70) : 0;
  const customerPrice = sellerPriceNum + estimatedShippingFee;
  
  const platformCommission = sellerPriceNum * 0.05; // 5%
  const paymentGatewayFee = sellerPriceNum * 0.02; // 2%
  const estimatedBankSettlement = Math.max(0, sellerPriceNum - platformCommission - paymentGatewayFee);

  const handleSameAsManufacturerToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    if (isChecked) {
      onChange({
        packer_same_as_manufacturer: true,
        packer_name: formData.manufacturer_name,
        packer_address: formData.manufacturer_address,
        packer_pincode: formData.manufacturer_pincode,
      });
    } else {
      onChange({ packer_same_as_manufacturer: false });
    }
  };

  return (
    <div className="space-y-8">
      {/* Clothing Specifications */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-white font-semibold text-sm border-b border-[#27272a] pb-2">
          <Tag className="w-4 h-4 text-emerald-400" />
          Clothing Specifications
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-zinc-300 mb-1 block">Fabric / Material *</label>
            <select
              value={formData.fabric}
              onChange={(e) => onChange({ fabric: e.target.value })}
              className="w-full p-2.5 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs focus:border-white"
            >
              <option value="">Select Fabric</option>
              {FABRIC_OPTIONS.map((f, i) => (
                <option key={i} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-300 mb-1 block">Fit Type *</label>
            <select
              value={formData.fit_type}
              onChange={(e) => onChange({ fit_type: e.target.value })}
              className="w-full p-2.5 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs focus:border-white"
            >
              <option value="">Select Fit</option>
              {FIT_OPTIONS.map((fit, i) => (
                <option key={i} value={fit}>{fit}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-300 mb-1 block">Pattern *</label>
            <select
              value={formData.pattern}
              onChange={(e) => onChange({ pattern: e.target.value })}
              className="w-full p-2.5 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs focus:border-white"
            >
              <option value="">Select Pattern</option>
              {PATTERN_OPTIONS.map((p, i) => (
                <option key={i} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-300 mb-1 block">Sleeve Length / Type</label>
            <select
              value={formData.sleeve_type}
              onChange={(e) => onChange({ sleeve_type: e.target.value })}
              className="w-full p-2.5 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs focus:border-white"
            >
              <option value="">Select Sleeve</option>
              {SLEEVE_OPTIONS.map((s, i) => (
                <option key={i} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-300 mb-1 block">Neck / Collar Style</label>
            <select
              value={formData.neck_type}
              onChange={(e) => onChange({ neck_type: e.target.value })}
              className="w-full p-2.5 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs focus:border-white"
            >
              <option value="">Select Neck Style</option>
              {NECK_OPTIONS.map((n, i) => (
                <option key={i} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-300 mb-1 block">Target Gender / Category</label>
            <select
              value={formData.target_gender}
              onChange={(e) => onChange({ target_gender: e.target.value })}
              className="w-full p-2.5 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs focus:border-white"
            >
              <option value="">Select Gender</option>
              {GENDER_OPTIONS.map((g, i) => (
                <option key={i} value={g}>{g}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="text-xs font-medium text-zinc-300 mb-1 block">Garment Weight (Grams) *</label>
            <input
              type="number"
              value={formData.weight_grams}
              onChange={(e) => onChange({ weight_grams: e.target.value })}
              placeholder="e.g. 350"
              className="w-full p-2.5 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs focus:border-white"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-300 mb-1 block">Care Instructions</label>
            <select
              value={formData.care_instructions}
              onChange={(e) => onChange({ care_instructions: e.target.value })}
              className="w-full p-2.5 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs focus:border-white"
            >
              <option value="">Select Care Method</option>
              {CARE_OPTIONS.map((c, i) => (
                <option key={i} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Pricing & Tax Details */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-white font-semibold text-sm border-b border-[#27272a] pb-2">
          <Calculator className="w-4 h-4 text-emerald-400" />
          Pricing Details & Earnings Calculator
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-zinc-300 mb-1 block">
              Listing Price (₹) * <span className="text-zinc-500 font-normal">(All returns allowed)</span>
            </label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => onChange({ price: e.target.value })}
              placeholder="e.g. 799"
              className="w-full p-2.5 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-sm focus:border-white"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-300 mb-1 block">
              Wrong / Defective Return Price (₹)
            </label>
            <input
              type="number"
              value={formData.defective_returns_price}
              onChange={(e) => onChange({ defective_returns_price: e.target.value })}
              placeholder="e.g. 749"
              className="w-full p-2.5 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-sm focus:border-white"
            />
            <span className="text-[10px] text-zinc-400 mt-1 block">Discounted price if customer returns only wrong/defective items</span>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-300 mb-1 block">MRP (₹) *</label>
            <input
              type="number"
              value={formData.mrp}
              onChange={(e) => onChange({ mrp: e.target.value })}
              placeholder="e.g. 1499"
              className="w-full p-2.5 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-sm focus:border-white"
            />
          </div>
        </div>

        {/* Live Bank Settlement Calculator Widget */}
        <div className="p-4 rounded-xl bg-[#141418] border border-[#27272a] grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 rounded-lg bg-[#0d0d10] border border-[#222228] space-y-2">
            <div className="flex justify-between items-center text-xs font-medium text-zinc-300 border-b border-[#27272a] pb-1.5">
              <span>Customer Checkout Price</span>
              <span className="text-white font-bold text-sm">₹{customerPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-zinc-400">
              <span>Seller Base Price</span>
              <span>₹{sellerPriceNum.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-zinc-400">
              <span>Estimated Customer Shipping</span>
              <span>₹{estimatedShippingFee.toFixed(2)}</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#0d0d10] border border-emerald-500/30 space-y-2">
            <div className="flex justify-between items-center text-xs font-medium text-emerald-400 border-b border-[#27272a] pb-1.5">
              <span>Estimated Bank Settlement Amount</span>
              <span className="text-emerald-400 font-bold text-base">₹{estimatedBankSettlement.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-zinc-400">
              <span>Platform Fee (5%)</span>
              <span>-₹{platformCommission.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-zinc-400">
              <span>Payment Gateway (2%)</span>
              <span>-₹{paymentGatewayFee.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Manufacturing & Packing Details */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-white font-semibold text-sm border-b border-[#27272a] pb-2">
          <Building2 className="w-4 h-4 text-emerald-400" />
          Manufacturing & Logistics Origin Details
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-zinc-300 mb-1 block">Country of Origin *</label>
            <input
              type="text"
              value={formData.country_of_origin}
              onChange={(e) => onChange({ country_of_origin: e.target.value })}
              className="w-full p-2.5 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs focus:border-white"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-300 mb-1 block">Manufacturer Name *</label>
            <input
              type="text"
              value={formData.manufacturer_name}
              onChange={(e) => {
                const val = e.target.value;
                const update: Partial<Step2Props["formData"]> = { manufacturer_name: val };
                if (formData.packer_same_as_manufacturer) {
                  update.packer_name = val;
                }
                onChange(update);
              }}
              placeholder="e.g. Adhikary Textiles"
              className="w-full p-2.5 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs focus:border-white"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-300 mb-1 block">Manufacturer Pincode *</label>
            <input
              type="text"
              value={formData.manufacturer_pincode}
              onChange={(e) => {
                const val = e.target.value;
                const update: Partial<Step2Props["formData"]> = { manufacturer_pincode: val };
                if (formData.packer_same_as_manufacturer) {
                  update.packer_pincode = val;
                }
                onChange(update);
              }}
              placeholder="e.g. 741254"
              className="w-full p-2.5 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs focus:border-white"
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-300 mb-1 block">Manufacturer Address *</label>
          <input
            type="text"
            value={formData.manufacturer_address}
            onChange={(e) => {
              const val = e.target.value;
              const update: Partial<Step2Props["formData"]> = { manufacturer_address: val };
              if (formData.packer_same_as_manufacturer) {
                update.packer_address = val;
              }
              onChange(update);
            }}
            placeholder="Factory / Warehouse Address"
            className="w-full p-2.5 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs focus:border-white"
          />
        </div>

        {/* Packer Details Checkbox */}
        <div className="pt-2">
          <label className="inline-flex items-center gap-2 cursor-pointer text-xs text-zinc-200">
            <input
              type="checkbox"
              checked={formData.packer_same_as_manufacturer}
              onChange={handleSameAsManufacturerToggle}
              className="w-4 h-4 rounded border-[#27272a] accent-white"
            />
            Packer details are same as Manufacturer Details
          </label>
        </div>

        {!formData.packer_same_as_manufacturer && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="text-xs font-medium text-zinc-300 mb-1 block">Packer Name</label>
              <input
                type="text"
                value={formData.packer_name}
                onChange={(e) => onChange({ packer_name: e.target.value })}
                placeholder="Packer Business Name"
                className="w-full p-2.5 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-medium text-zinc-300 mb-1 block">Packer Address & Pincode</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.packer_address}
                  onChange={(e) => onChange({ packer_address: e.target.value })}
                  placeholder="Address"
                  className="flex-1 p-2.5 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs"
                />
                <input
                  type="text"
                  value={formData.packer_pincode}
                  onChange={(e) => onChange({ packer_pincode: e.target.value })}
                  placeholder="Pincode"
                  className="w-28 p-2.5 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
