import React, { useMemo } from "react";
import { Info, Calculator, Building2, Package, Tag, ShieldCheck, Sparkles } from "lucide-react";
import { resolveProductTypeConfig } from "@shared/constants/productAttributeEngine";

export interface Step2Props {
  formData: {
    category_id?: string;
    subcategory_name?: string;
    fabric: string;
    pattern: string;
    fit_type: string;
    sleeve_type: string;
    neck_type: string;
    care_instructions: string;
    target_gender: string;
    weight_grams: string;

    // Dynamic attributes bag
    custom_attributes?: Record<string, string>;

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

interface CustomizableSelectProps {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
  required?: boolean;
}

function CustomizableSelect({
  label,
  value,
  options,
  onChange,
  required = false,
}: CustomizableSelectProps) {
  const [isCustom, setIsCustom] = React.useState<boolean>(() => {
    return Boolean(value && !options.includes(value));
  });

  React.useEffect(() => {
    if (value && !options.includes(value)) {
      setIsCustom(true);
    }
  }, [value, options]);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-zinc-300 block">
          {label} {required && <span className="text-rose-400">*</span>}
        </label>
        <button
          type="button"
          onClick={() => {
            setIsCustom(!isCustom);
          }}
          className="text-[10px] font-semibold text-emerald-400 hover:underline cursor-pointer"
        >
          {isCustom ? "← Select from List" : "+ Add Custom"}
        </button>
      </div>

      {isCustom ? (
        <div className="relative">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`Type custom ${label.toLowerCase()}...`}
            className="w-full p-2.5 rounded-lg bg-[#0d0d11] border border-emerald-500/60 text-white text-xs focus:border-emerald-400"
          />
        </div>
      ) : (
        <select
          value={options.includes(value) ? value : value ? "__CUSTOM__" : ""}
          onChange={(e) => {
            const val = e.target.value;
            if (val === "__CUSTOM__") {
              setIsCustom(true);
            } else {
              onChange(val);
            }
          }}
          className="w-full p-2.5 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs focus:border-white cursor-pointer"
        >
          <option value="">Select {label.replace(/ \*$/, "")}</option>
          {options.map((opt, i) => (
            <option key={i} value={opt}>
              {opt}
            </option>
          ))}
          {!options.includes(value) && value && (
            <option value={value}>Custom: {value}</option>
          )}
          <option value="__CUSTOM__" className="text-emerald-400 font-bold">
            ✍️ Add Custom Option...
          </option>
        </select>
      )}
    </div>
  );
}

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

  // Resolve active product type config from subcategory / category
  const activeProductTypeConfig = useMemo(() => {
    return resolveProductTypeConfig(formData.category_id, formData.subcategory_name);
  }, [formData.category_id, formData.subcategory_name]);

  const dynamicAttributes = activeProductTypeConfig.attributes || [];
  const customAttrs = formData.custom_attributes || {};

  const handleCustomAttrChange = (attrId: string, val: string) => {
    const updated = { ...customAttrs, [attrId]: val };
    const updates: any = { custom_attributes: updated };
    // Also mirror common legacy fields for backward compatibility
    if (attrId === "fabric") updates.fabric = val;
    if (attrId === "pattern") updates.pattern = val;
    if (attrId === "fit_type") updates.fit_type = val;
    if (attrId === "sleeve_type") updates.sleeve_type = val;
    if (attrId === "neck_type") updates.neck_type = val;
    if (attrId === "care_instructions") updates.care_instructions = val;
    onChange(updates);
  };

  return (
    <div className="space-y-8">
      {/* Dynamic Category Specifications (Meesho-Style) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#27272a] pb-2">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Tag className="w-4 h-4 text-emerald-400" />
            <span>{activeProductTypeConfig.name} Specifications</span>
          </div>
          <span className="text-[11px] text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            Category-Specific Fields Only
          </span>
        </div>

        {/* Dynamic Attributes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {dynamicAttributes.map((attr) => {
            const currentVal = customAttrs[attr.id] || (formData as any)[attr.id] || "";
            return (
              <div key={attr.id}>
                {attr.type === "select" && attr.options && attr.options.length > 0 ? (
                  <CustomizableSelect
                    label={attr.label}
                    required={attr.required}
                    value={currentVal}
                    options={attr.options}
                    onChange={(val) => handleCustomAttrChange(attr.id, val)}
                  />
                ) : (
                  <div>
                    <label className="text-xs font-medium text-zinc-300 mb-1 block">
                      {attr.label} {attr.required && <span className="text-rose-400">*</span>}
                    </label>
                    <input
                      type="text"
                      value={currentVal}
                      onChange={(e) => handleCustomAttrChange(attr.id, e.target.value)}
                      placeholder={attr.placeholder || `Enter ${attr.label.toLowerCase()}...`}
                      className="w-full p-2.5 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs focus:border-white transition-colors"
                    />
                    {attr.helpText && (
                      <span className="text-[10px] text-zinc-500 mt-1 block">{attr.helpText}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Item Weight / Net Package Weight */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="text-xs font-medium text-zinc-300 mb-1 block">Package Net Weight (Grams) *</label>
            <input
              type="number"
              value={formData.weight_grams}
              onChange={(e) => onChange({ weight_grams: e.target.value })}
              placeholder="e.g. 350"
              className="w-full p-2.5 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs focus:border-white"
            />
            <span className="text-[10px] text-zinc-500 mt-1 block">Accurate dead weight for courier label generation</span>
          </div>
        </div>
      </div>

      {/* Pricing & Tax Details */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-white font-semibold text-sm border-b border-[#27272a] pb-2">
          <Calculator className="w-4 h-4 text-emerald-400" />
          Pricing Details & Earnings Calculator
        </div>

        {/* Dynamic Size-Based Price Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-xl bg-[#0d0d11] border border-[#27272a]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-zinc-400">
                Base Listing Price (₹) <span className="text-zinc-500 font-normal">(All returns allowed)</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                Auto
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-white">
                {sellerPriceNum > 0 ? `₹${sellerPriceNum.toFixed(2)}` : "—"}
              </span>
              {sellerPriceNum > 0 && (
                <span className="text-[10px] text-zinc-400">
                  (Min size price)
                </span>
              )}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">
              Calculated from size pricing in Step 1
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0d0d11] border border-[#27272a]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-zinc-400">
                Wrong / Defective Return Price (₹)
              </span>
              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                Auto
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-white">
                {defectivePriceNum > 0
                  ? `₹${defectivePriceNum.toFixed(2)}`
                  : sellerPriceNum > 0
                  ? `₹${Math.max(0, sellerPriceNum - 20).toFixed(2)}`
                  : "—"}
              </span>
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">
              Discounted defective return rate
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0d0d11] border border-[#27272a]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-medium text-zinc-400">MRP (₹)</span>
              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                Auto
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-white">
                {mrpNum > 0 ? `₹${mrpNum.toFixed(2)}` : "—"}
              </span>
              {mrpNum > sellerPriceNum && sellerPriceNum > 0 && (
                <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  {Math.round(((mrpNum - sellerPriceNum) / mrpNum) * 100)}% off
                </span>
              )}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">
              Max MRP configured in Step 1
            </span>
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
