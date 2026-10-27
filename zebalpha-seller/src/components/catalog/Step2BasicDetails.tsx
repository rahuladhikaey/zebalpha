import React, { useMemo, useState, useEffect } from "react";
import { Info, Calculator, Building2, Package, Tag, ShieldCheck, Sparkles, MapPin, RotateCw, CheckCircle2, Box, Scale, Truck, ArrowRight, AlertCircle, HelpCircle } from "lucide-react";
import { resolveProductTypeConfig } from "@shared/constants/productAttributeEngine";
import { supabase } from "@shared/utils/supabaseClient";

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

    // Flipkart & Shiprocket Package Dimensions & Volumetric Engine
    package_length?: string;
    package_width?: string;
    package_height?: string;
    volumetric_weight?: string;
    billable_weight?: string;
    estimated_shipping_fee?: number;

    // Dynamic attributes bag
    custom_attributes?: Record<string, string>;

    country_of_origin: string;
    manufacturer_same_as_pickup?: boolean;
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
    style_code?: string;
    single_stock?: string;
    single_sku?: string;
    selected_sizes?: string[];
    size_details?: any[];
  };
  onChange: (updates: Partial<Step2Props["formData"]>) => void;
  sellerOriginInfo?: {
    name: string;
    address: string;
    pincode: string;
    city?: string;
    state?: string;
  } | null;
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

export default function Step2BasicDetails({ formData, onChange, sellerOriginInfo }: Step2Props) {
  const sellerPriceNum = parseFloat(formData.price) || 0;
  const defectivePriceNum = parseFloat(formData.defective_returns_price) || 0;
  const mrpNum = parseFloat(formData.mrp) || 0;

  const [platformRules, setPlatformRules] = useState<{
    commissionPct: number;
    collectionPct: number;
    shippingFee: number;
  }>({
    commissionPct: 0,
    collectionPct: 0,
    shippingFee: 0,
  });

  const [internalSellerInfo, setInternalSellerInfo] = useState<{
    name: string;
    address: string;
    pincode: string;
    city?: string;
    state?: string;
  } | null>(sellerOriginInfo || null);

  // Sync internal seller info if prop updates
  useEffect(() => {
    if (sellerOriginInfo) {
      setInternalSellerInfo(sellerOriginInfo);
    }
  }, [sellerOriginInfo]);

  // Fallback fetch from sellers or seller_pickup_locations if sellerOriginInfo was not provided
  useEffect(() => {
    if (sellerOriginInfo) return;
    let isMounted = true;
    async function loadFallbackSeller() {
      try {
        let sName = "";
        let sAddr = "";
        let sPin = "";
        let sCity = "";
        let sState = "";

        // 1. Try server-side API route /api/shipping/pickup-location
        try {
          const res = await fetch("/api/shipping/pickup-location");
          if (res.ok) {
            const json = await res.json();
            if (json.locations && json.locations.length > 0) {
              const loc = json.locations[0];
              if (loc.address_line1) sAddr = loc.address_line1.trim();
              if (loc.pincode) sPin = String(loc.pincode).trim();
              if (loc.name) sName = loc.name.trim();
              if (loc.city) sCity = loc.city.trim();
              if (loc.state) sState = loc.state.trim();
            }
          }
        } catch (apiErr) {
          console.warn("Pickup location API route notice in Step2:", apiErr);
        }

        // 2. Fallback to Supabase
        if (!sAddr || !sPin || !sName) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user && isMounted) {
            let sellerQuery = supabase
              .from("sellers")
              .select("id, user_id, business_name, store_name, shop_name, owner_name, full_name, pickup_address, warehouse_address, address, pickup_location, city, state, pincode");

            if (user.email && user.email.trim()) {
              sellerQuery = sellerQuery.or(`user_id.eq.${user.id},email.eq.${user.email.toLowerCase().trim()}`);
            } else {
              sellerQuery = sellerQuery.eq("user_id", user.id);
            }

            const { data: s } = await sellerQuery.maybeSingle();

            if (s) {
              if (!sName) sName = (s.business_name || s.store_name || s.shop_name || s.owner_name || s.full_name || user.user_metadata?.store_name || "").trim();
              if (!sAddr) sAddr = (s.pickup_address || s.warehouse_address || s.address || s.pickup_location || "").trim();
              if (!sPin) sPin = (s.pincode || "").trim();
              if (!sCity) sCity = s.city || "";
              if (!sState) sState = s.state || "";
            }

            if (!sAddr || !sPin) {
              const ids = [s?.id, user.id].filter(Boolean);
              const { data: loc } = await supabase
                .from("seller_pickup_locations")
                .select("*")
                .in("seller_id", ids)
                .order("is_default", { ascending: false })
                .limit(1)
                .maybeSingle();

              if (loc) {
                if (!sAddr) sAddr = (loc.address_line1 || loc.address || "").trim();
                if (!sPin) sPin = (loc.pincode || "").trim();
                if (!sName) sName = (loc.name || loc.location_name || "").trim();
              }
            }
          }
        }

        if (isMounted && (sAddr || sPin || sName)) {
          setInternalSellerInfo({
            name: sName,
            address: sAddr,
            pincode: sPin,
            city: sCity,
            state: sState,
          });
        }
      } catch (err) {
        console.warn("Notice loading seller pickup in Step2:", err);
      }
    }
    loadFallbackSeller();
    return () => { isMounted = false; };
  }, [sellerOriginInfo]);

  const activeSellerInfo = sellerOriginInfo || internalSellerInfo;
  const isSameAsPickup = formData.manufacturer_same_as_pickup ?? true;

  // Automatically pre-fill manufacturer & packer details from activeSellerInfo if fields are empty
  useEffect(() => {
    if (!activeSellerInfo) return;
    const isMfrEmpty = !formData.manufacturer_address || !formData.manufacturer_pincode || !formData.manufacturer_name;
    if (isSameAsPickup && isMfrEmpty) {
      const updates: Partial<Step2Props["formData"]> = {};
      if (!formData.manufacturer_name && activeSellerInfo.name) {
        updates.manufacturer_name = activeSellerInfo.name;
      }
      if (!formData.manufacturer_address && activeSellerInfo.address) {
        updates.manufacturer_address = activeSellerInfo.address;
      }
      if (!formData.manufacturer_pincode && activeSellerInfo.pincode) {
        updates.manufacturer_pincode = activeSellerInfo.pincode;
      }
      if (formData.packer_same_as_manufacturer) {
        if (updates.manufacturer_name) updates.packer_name = updates.manufacturer_name;
        if (updates.manufacturer_address) updates.packer_address = updates.manufacturer_address;
        if (updates.manufacturer_pincode) updates.packer_pincode = updates.manufacturer_pincode;
      }
      if (Object.keys(updates).length > 0) {
        onChange(updates);
      }
    }
  }, [activeSellerInfo, isSameAsPickup]);

  const handleSameAsPickupToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    if (isChecked) {
      const mName = activeSellerInfo?.name || formData.manufacturer_name;
      const mAddr = activeSellerInfo?.address || formData.manufacturer_address;
      const mPin = activeSellerInfo?.pincode || formData.manufacturer_pincode;
      const updates: Partial<Step2Props["formData"]> = {
        manufacturer_same_as_pickup: true,
        manufacturer_name: mName,
        manufacturer_address: mAddr,
        manufacturer_pincode: mPin,
      };
      if (formData.packer_same_as_manufacturer) {
        updates.packer_name = mName;
        updates.packer_address = mAddr;
        updates.packer_pincode = mPin;
      }
      onChange(updates);
    } else {
      onChange({ manufacturer_same_as_pickup: false });
    }
  };

  const handleSyncFromPickup = () => {
    if (!activeSellerInfo) return;
    const mName = activeSellerInfo.name || formData.manufacturer_name;
    const mAddr = activeSellerInfo.address || formData.manufacturer_address;
    const mPin = activeSellerInfo.pincode || formData.manufacturer_pincode;
    const updates: Partial<Step2Props["formData"]> = {
      manufacturer_same_as_pickup: true,
      manufacturer_name: mName,
      manufacturer_address: mAddr,
      manufacturer_pincode: mPin,
    };
    if (formData.packer_same_as_manufacturer) {
      updates.packer_name = mName;
      updates.packer_address = mAddr;
      updates.packer_pincode = mPin;
    }
    onChange(updates);
  };

  useEffect(() => {
    async function loadRules() {
      try {
        const { data } = await supabase
          .from("store_settings")
          .select("value")
          .eq("key", "marketplace_rules")
          .maybeSingle();

        if (data?.value) {
          const val = data.value;
          setPlatformRules({
            commissionPct: parseFloat(val.globalCommissionPct ?? "0") || 0,
            collectionPct: parseFloat(val.collectionFeePct ?? "0") || 0,
            shippingFee: parseFloat(val.defaultShippingCost ?? "0") || 0,
          });
        }
      } catch {
        // Fallback to 0 commission (Meesho zero-commission standard)
      }
    }
    loadRules();
  }, []);

  // Smart package presets based on category
  const defaultDimensions = useMemo(() => {
    const sub = (formData.subcategory_name || "").toLowerCase();
    if (sub.includes("saree") || sub.includes("sari")) {
      return { l: "34", w: "26", h: "3.5", wt: "450" };
    }
    if (sub.includes("jewel") || sub.includes("ring") || sub.includes("bangle") || sub.includes("necklace")) {
      return { l: "16", w: "12", h: "4", wt: "120" };
    }
    if (sub.includes("hoodie") || sub.includes("sweatshirt") || sub.includes("jacket")) {
      return { l: "35", w: "28", h: "6", wt: "650" };
    }
    if (sub.includes("footwear") || sub.includes("shoe")) {
      return { l: "32", w: "20", h: "12", wt: "800" };
    }
    if (sub.includes("bedsheet") || sub.includes("curtain")) {
      return { l: "38", w: "28", h: "5", wt: "900" };
    }
    return { l: "30", w: "24", h: "2.5", wt: "300" };
  }, [formData.subcategory_name]);

  const pkgLength = parseFloat(formData.package_length || defaultDimensions.l) || 30;
  const pkgWidth = parseFloat(formData.package_width || defaultDimensions.w) || 24;
  const pkgHeight = parseFloat(formData.package_height || defaultDimensions.h) || 2.5;
  const deadWeightGrams = parseFloat(formData.weight_grams || defaultDimensions.wt) || 300;

  // IATA / Shiprocket formula: Volumetric Weight (g) = (L * W * H) / 5
  const volumetricGrams = Math.round((pkgLength * pkgWidth * pkgHeight) / 5);
  const billableWeightGrams = Math.max(deadWeightGrams, volumetricGrams);

  // Shiprocket Courier Slabs: Base 500g slab = ₹62, additional 500g = ₹35
  const additionalSlabs = Math.max(0, Math.ceil((billableWeightGrams - 500) / 500));
  const estimatedShippingFee = 62 + additionalSlabs * 35;
  const courierSlabLabel = billableWeightGrams <= 500 ? "0.5 kg (Base Slab)" : `${(0.5 + additionalSlabs * 0.5).toFixed(1)} kg Slab`;

  // Auto-sync calculated dimensions & weights if not yet recorded
  useEffect(() => {
    if (!formData.package_length || !formData.package_width || !formData.package_height) {
      onChange({
        package_length: String(pkgLength),
        package_width: String(pkgWidth),
        package_height: String(pkgHeight),
        weight_grams: String(deadWeightGrams),
        volumetric_weight: String(volumetricGrams),
        billable_weight: String(billableWeightGrams),
        estimated_shipping_fee: estimatedShippingFee,
      });
    }
  }, [pkgLength, pkgWidth, pkgHeight, deadWeightGrams, volumetricGrams, billableWeightGrams, estimatedShippingFee]);

  // Flipkart / Meesho model: Customer listing price is the seller base price!
  const customerPrice = sellerPriceNum;
  const platformCommission = (sellerPriceNum * platformRules.commissionPct) / 100;
  const paymentGatewayFee = (sellerPriceNum * (platformRules.collectionPct || 2)) / 100;
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

        {/* Flipkart / Shiprocket Packaging Dimensions & Volumetric Calculator */}
        <div className="pt-2 border-t border-[#222228] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-white font-semibold text-xs">
              <Box className="w-4 h-4 text-emerald-400" />
              <span>Package Dimensions & Volumetric Weight (Shiprocket Standard)</span>
            </div>
            <span className="text-[10px] text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-md font-mono self-start sm:self-auto">
              Volumetric: (L × W × H) ÷ 5000 kg
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-medium text-zinc-300 mb-1 block">Length (L in cm) *</label>
              <input
                type="number"
                min="1"
                step="0.5"
                value={formData.package_length || defaultDimensions.l}
                onChange={(e) => {
                  const val = e.target.value;
                  const newL = parseFloat(val) || 0;
                  const newVol = Math.round((newL * pkgWidth * pkgHeight) / 5);
                  const newBill = Math.max(deadWeightGrams, newVol);
                  const newSlabs = Math.max(0, Math.ceil((newBill - 500) / 500));
                  const newShip = 62 + newSlabs * 35;
                  onChange({
                    package_length: val,
                    volumetric_weight: String(newVol),
                    billable_weight: String(newBill),
                    estimated_shipping_fee: newShip,
                  });
                }}
                className="w-full p-2.5 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs focus:border-white"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-zinc-300 mb-1 block">Width / Breadth (W in cm) *</label>
              <input
                type="number"
                min="1"
                step="0.5"
                value={formData.package_width || defaultDimensions.w}
                onChange={(e) => {
                  const val = e.target.value;
                  const newW = parseFloat(val) || 0;
                  const newVol = Math.round((pkgLength * newW * pkgHeight) / 5);
                  const newBill = Math.max(deadWeightGrams, newVol);
                  const newSlabs = Math.max(0, Math.ceil((newBill - 500) / 500));
                  const newShip = 62 + newSlabs * 35;
                  onChange({
                    package_width: val,
                    volumetric_weight: String(newVol),
                    billable_weight: String(newBill),
                    estimated_shipping_fee: newShip,
                  });
                }}
                className="w-full p-2.5 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs focus:border-white"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-zinc-300 mb-1 block">Height (H in cm) *</label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={formData.package_height || defaultDimensions.h}
                onChange={(e) => {
                  const val = e.target.value;
                  const newH = parseFloat(val) || 0;
                  const newVol = Math.round((pkgLength * pkgWidth * newH) / 5);
                  const newBill = Math.max(deadWeightGrams, newVol);
                  const newSlabs = Math.max(0, Math.ceil((newBill - 500) / 500));
                  const newShip = 62 + newSlabs * 35;
                  onChange({
                    package_height: val,
                    volumetric_weight: String(newVol),
                    billable_weight: String(newBill),
                    estimated_shipping_fee: newShip,
                  });
                }}
                className="w-full p-2.5 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs focus:border-white"
              />
            </div>

            <div>
              <label className="text-[11px] font-medium text-zinc-300 mb-1 block">Dead Weight (Grams) *</label>
              <input
                type="number"
                min="10"
                step="10"
                value={formData.weight_grams || defaultDimensions.wt}
                onChange={(e) => {
                  const val = e.target.value;
                  const newWt = parseFloat(val) || 0;
                  const newBill = Math.max(newWt, volumetricGrams);
                  const newSlabs = Math.max(0, Math.ceil((newBill - 500) / 500));
                  const newShip = 62 + newSlabs * 35;
                  onChange({
                    weight_grams: val,
                    billable_weight: String(newBill),
                    estimated_shipping_fee: newShip,
                  });
                }}
                className="w-full p-2.5 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs focus:border-white"
              />
            </div>
          </div>

          {/* Real-Time Volumetric Weight Comparison Banner */}
          <div className="p-3 rounded-xl bg-[#09090c] border border-[#202026] flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 text-zinc-300">
                <Scale className="w-3.5 h-3.5 text-zinc-400" />
                <span>Dead Wt: <strong className="text-white font-mono">{deadWeightGrams}g</strong></span>
              </div>
              <span className="text-zinc-600">vs</span>
              <div className="flex items-center gap-1.5 text-zinc-300">
                <Box className="w-3.5 h-3.5 text-violet-400" />
                <span>Volumetric Wt: <strong className="text-violet-300 font-mono">{volumetricGrams}g</strong></span>
              </div>
              <ArrowRight className="w-3 h-3 text-zinc-500 hidden sm:block" />
              <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-md text-emerald-400 font-semibold text-[11px]">
                <CheckCircle2 className="w-3 h-3" />
                <span>Billable Weight: <strong className="font-mono">{billableWeightGrams}g</strong> ({courierSlabLabel})</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Truck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-zinc-400 text-[11px]">Est. Courier Cost:</span>
              <span className="text-white font-bold font-mono">₹{estimatedShippingFee.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing & Tax Details */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#27272a] pb-2">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Calculator className="w-4 h-4 text-emerald-400" />
            Pricing Details & Bank Settlement Calculator
          </div>
          <span className="text-[10px] text-zinc-400">
            {activeProductTypeConfig.sizingSystem === "none" ? "Single SKU Mode" : "Size Matrix Mode"}
          </span>
        </div>

        {/* Pricing Inputs / Summary Cards */}
        {activeProductTypeConfig.sizingSystem === "none" ? (
          /* Editable pricing for non-sized products (Saree, Jewellery, Home, Electronics) */
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-3.5 rounded-xl bg-[#0d0d11] border border-[#27272a]">
              <label className="text-[11px] font-semibold text-zinc-300 mb-1.5 block">
                Selling Price (₹) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-bold">₹</span>
                <input
                  type="number"
                  min="1"
                  value={formData.price || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    const pNum = parseFloat(val) || 0;
                    const curMrp = parseFloat(formData.mrp || "") || 0;
                    const autoMrp = curMrp >= pNum ? formData.mrp : String(Math.round(pNum * 1.4));
                    const autoReturn = formData.defective_returns_price || (pNum > 30 ? String(Math.max(0, pNum - 30)) : "");
                    onChange({
                      price: val,
                      mrp: autoMrp,
                      selected_sizes: ["Free Size"],
                      size_details: [
                        {
                          id: "pkg_free_size",
                          size: "Free Size",
                          selling_price: val,
                          mrp: autoMrp || val,
                          return_price: autoReturn,
                          inventory: formData.single_stock || "20",
                          sku: formData.single_sku || formData.style_code || "",
                        },
                      ],
                    });
                  }}
                  placeholder="e.g. 1299"
                  className="w-full pl-7 pr-3 py-2 rounded-lg bg-[#050508] border border-[#27272a] text-white text-xs font-semibold focus:border-white"
                />
              </div>
              <span className="text-[10px] text-zinc-500 mt-1 block">Customer listing price</span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0d0d11] border border-[#27272a]">
              <label className="text-[11px] font-semibold text-zinc-300 mb-1.5 block">
                Maximum MRP (₹) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-bold">₹</span>
                <input
                  type="number"
                  min="1"
                  value={formData.mrp || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    onChange({
                      mrp: val,
                      selected_sizes: ["Free Size"],
                      size_details: [
                        {
                          id: "pkg_free_size",
                          size: "Free Size",
                          selling_price: formData.price || "",
                          mrp: val,
                          return_price: formData.defective_returns_price || "",
                          inventory: formData.single_stock || "20",
                          sku: formData.single_sku || formData.style_code || "",
                        },
                      ],
                    });
                  }}
                  placeholder="e.g. 1999"
                  className="w-full pl-7 pr-3 py-2 rounded-lg bg-[#050508] border border-[#27272a] text-white text-xs font-semibold focus:border-white"
                />
              </div>
              <span className="text-[10px] text-zinc-500 mt-1 block">Retail tag price</span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0d0d11] border border-[#27272a]">
              <label className="text-[11px] font-semibold text-zinc-300 mb-1.5 block">
                Wrong / Defective Return (₹)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs font-bold">₹</span>
                <input
                  type="number"
                  min="1"
                  value={formData.defective_returns_price || ""}
                  onChange={(e) => onChange({ defective_returns_price: e.target.value })}
                  placeholder={sellerPriceNum > 30 ? String(sellerPriceNum - 30) : "e.g. 1249"}
                  className="w-full pl-7 pr-3 py-2 rounded-lg bg-[#050508] border border-[#27272a] text-white text-xs focus:border-white"
                />
              </div>
              <span className="text-[10px] text-zinc-500 mt-1 block">Discounted return rate</span>
            </div>
          </div>
        ) : (
          /* Sized product: Dynamic summary cards computed from Step 1 */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3.5 rounded-xl bg-[#0d0d11] border border-[#27272a]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-zinc-400">
                  Base Listing Price (₹) <span className="text-zinc-500 font-normal">(All returns)</span>
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
                  <span className="text-[10px] text-zinc-400">(Min size price)</span>
                )}
              </div>
              <span className="text-[10px] text-zinc-500 mt-1 block">Configured in Step 1 size matrix</span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#0d0d11] border border-[#27272a]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-medium text-zinc-400">
                  Defective Return Price (₹)
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
              <span className="text-[10px] text-zinc-500 mt-1 block">Discounted return tier</span>
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
              <span className="text-[10px] text-zinc-500 mt-1 block">Max MRP in Step 1</span>
            </div>
          </div>
        )}

        {/* Live Bank Settlement & Profitability Calculator (Flipkart Standard) */}
        <div className="p-4 rounded-2xl bg-[#121217] border border-[#27272a] grid grid-cols-1 md:grid-cols-2 gap-4 shadow-xl">
          <div className="p-3.5 rounded-xl bg-[#0a0a0d] border border-[#202026] space-y-2.5">
            <div className="flex justify-between items-center text-xs font-semibold text-zinc-200 border-b border-[#202026] pb-2">
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-zinc-400" />
                Customer Listing Price
              </span>
              <span className="text-white font-bold text-sm">₹{customerPrice.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Truck className="w-3 h-3 text-zinc-400" />
                Estimated Courier Shipping (National)
              </span>
              <span className="text-zinc-300 font-mono">₹{estimatedShippingFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Scale className="w-3 h-3 text-zinc-400" />
                Applicable Logistics Weight
              </span>
              <span className="text-zinc-300 font-mono">{billableWeightGrams}g ({courierSlabLabel})</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0a0a0d] border border-emerald-500/30 space-y-2.5">
            <div className="flex justify-between items-center text-xs font-bold text-emerald-400 border-b border-[#202026] pb-2">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Net Bank Settlement (In-Hand Payout)
              </span>
              <span className="text-emerald-400 font-bold text-base">₹{estimatedBankSettlement.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-zinc-400">
              <span>Platform Commission ({platformRules.commissionPct}%)</span>
              <span className={platformCommission === 0 ? "text-emerald-400 font-semibold" : ""}>
                {platformCommission === 0 ? "₹0.00 (Zero Commission)" : `-₹${platformCommission.toFixed(2)}`}
              </span>
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
        <div className="flex items-center justify-between border-b border-[#27272a] pb-2">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Building2 className="w-4 h-4 text-emerald-400" />
            Manufacturing & Logistics Origin Details
          </div>
          {activeSellerInfo?.address && (
            <span className="text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Pickup Hub Linked
            </span>
          )}
        </div>

        {/* Same as Seller Pickup Address Checkbox & Auto-fill Notice */}
        <div className="p-3 rounded-xl bg-[#121217] border border-[#27272a] space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="inline-flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-white select-none">
              <input
                type="checkbox"
                checked={isSameAsPickup}
                onChange={handleSameAsPickupToggle}
                className="w-4 h-4 rounded border-[#27272a] accent-emerald-500 cursor-pointer"
              />
              <span>Manufacturer details are same as Seller Pickup / Account Address</span>
            </label>

            {activeSellerInfo && (
              <button
                type="button"
                onClick={handleSyncFromPickup}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1 transition-colors self-start sm:self-auto cursor-pointer"
                title="Re-populate using your registered store address"
              >
                <RotateCw className="w-3 h-3 text-emerald-400" />
                <span>Re-fill from Account</span>
              </button>
            )}
          </div>

          {activeSellerInfo?.address ? (
            <div className="text-[11px] text-zinc-400 flex items-start gap-1.5 pt-0.5 pl-6.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                <strong className="text-zinc-200">{activeSellerInfo.name || "Your Store"}</strong> — {activeSellerInfo.address} {activeSellerInfo.pincode ? `(PIN: ${activeSellerInfo.pincode})` : ""}
              </span>
            </div>
          ) : (
            <p className="text-[11px] text-zinc-500 pl-6.5">
              💡 Tip: Address set in your account profile/settings will automatically be filled here.
            </p>
          )}
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
