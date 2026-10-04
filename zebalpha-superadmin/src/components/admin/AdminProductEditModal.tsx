"use client";

import React, { useState, useEffect } from "react";
import { X, Save, Edit3, Image as ImageIcon, Upload, CheckCircle2, AlertCircle, Building2, Tag, Calculator } from "lucide-react";
import { supabaseA as supabase } from "@shared/utils/supabaseClient";

export interface AdminProductEditModalProps {
  isOpen: boolean;
  product: any | null;
  onClose: () => void;
  onSuccess: () => void;
}

const FABRIC_OPTIONS = ["100% Pure Cotton", "Cotton Blend", "Denim", "Polyester", "Linen", "Silk", "Rayon", "Fleece", "Knit"];
const PATTERN_OPTIONS = ["Solid / Plain", "Printed", "Graphic", "Striped", "Checked", "Embroidered", "Color Block", "Tie-Dye"];
const FIT_OPTIONS = ["Regular Fit", "Oversized Fit", "Slim Fit", "Relaxed Fit", "Loose Fit"];
const SLEEVE_OPTIONS = ["Short Sleeve", "Long Sleeve", "Sleeveless", "3/4th Sleeve", "Half Sleeve"];
const NECK_OPTIONS = ["Round Neck", "Hoodie with Drawstring", "Polo Collar", "V-Neck", "Turtleneck", "Spread Collar"];
const CARE_OPTIONS = ["Machine Wash Cold", "Hand Wash", "Dry Clean Only", "Do Not Bleach"];
const GENDER_OPTIONS = ["Men", "Women", "Unisex", "Boys", "Girls"];

export default function AdminProductEditModal({
  isOpen,
  product,
  onClose,
  onSuccess,
}: AdminProductEditModalProps) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    defective_returns_price: "",
    mrp: "",
    brand: "",
    stock: "",
    sku: "",
    
    // Specifications
    fabric: "100% Pure Cotton",
    pattern: "Solid / Plain",
    fit_type: "Regular Fit",
    sleeve_type: "Short Sleeve",
    neck_type: "Round Neck",
    care_instructions: "Machine Wash Cold",
    target_gender: "Unisex",
    weight_grams: "300",
    
    country_of_origin: "India",
    manufacturer_name: "",
    manufacturer_address: "",
    manufacturer_pincode: "",
    packer_name: "",
    packer_address: "",
    packer_pincode: "",
    
    style_code: "",
    volumetric_weight: "",
    
    is_premium: false,
    is_new_drop: false,
    collection: "",
    target_drop_date: "",
    
    images: [] as string[],
    front_image_index: 0,
  });

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (product) {
      const specs = product.specifications || {};
      const imgList = Array.isArray(product.images) && product.images.length > 0 
        ? product.images 
        : product.image_url 
        ? [product.image_url] 
        : [];

      setForm({
        name: product.name || "",
        description: product.description || "",
        price: String(product.price || ""),
        defective_returns_price: String(specs.defective_returns_price || ""),
        mrp: String(product.mrp || product.price || ""),
        brand: product.brand || "zebalpha",
        stock: String(product.stock ?? 20),
        sku: product.sku || "",
        
        fabric: specs.fabric || "100% Pure Cotton",
        pattern: specs.pattern || "Solid / Plain",
        fit_type: specs.fit_type || "Regular Fit",
        sleeve_type: specs.sleeve_type || "Short Sleeve",
        neck_type: specs.neck_type || "Round Neck",
        care_instructions: specs.care_instructions || "Machine Wash Cold",
        target_gender: specs.target_gender || "Unisex",
        weight_grams: String(specs.weight_grams || "300"),
        
        country_of_origin: specs.country_of_origin || "India",
        manufacturer_name: specs.manufacturer_name || "",
        manufacturer_address: specs.manufacturer_address || "",
        manufacturer_pincode: specs.manufacturer_pincode || "",
        packer_name: specs.packer_name || "",
        packer_address: specs.packer_address || "",
        packer_pincode: specs.packer_pincode || "",
        
        style_code: specs.style_code || "",
        volumetric_weight: specs.volumetric_weight || "",
        
        is_premium: product.is_premium === true || product.tier === "PREMIUM",
        is_new_drop: product.is_new_drop === true || product.status === "COMING_SOON",
        collection: product.collection || "",
        target_drop_date: product.target_drop_date || "",
        
        images: imgList,
        front_image_index: 0,
      });
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (form.images.length + files.length > 4) {
      setErrorMsg("Maximum 4 images allowed.");
      return;
    }

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          const b64 = evt.target.result as string;
          setForm((prev) => ({
            ...prev,
            images: [...prev.images, b64].slice(0, 4),
          }));
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (idx: number) => {
    setForm((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== idx),
      front_image_index: 0,
    }));
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setErrorMsg("Product title is required.");
      return;
    }
    if (!form.price || parseFloat(form.price) <= 0) {
      setErrorMsg("Valid listing price is required.");
      return;
    }

    setSaving(true);
    setErrorMsg("");

    try {
      const orderedImages = [...form.images];
      if (form.front_image_index > 0 && form.front_image_index < orderedImages.length) {
        const cover = orderedImages.splice(form.front_image_index, 1)[0];
        orderedImages.unshift(cover);
      }

      const coverImageUrl = orderedImages[0] || product.image_url || "";

      const updatedSpecifications = {
        ...(product.specifications || {}),
        fabric: form.fabric,
        pattern: form.pattern,
        fit_type: form.fit_type,
        sleeve_type: form.sleeve_type,
        neck_type: form.neck_type,
        care_instructions: form.care_instructions,
        target_gender: form.target_gender,
        weight_grams: form.weight_grams,
        country_of_origin: form.country_of_origin,
        manufacturer_name: form.manufacturer_name,
        manufacturer_address: form.manufacturer_address,
        manufacturer_pincode: form.manufacturer_pincode,
        packer_name: form.packer_name,
        packer_address: form.packer_address,
        packer_pincode: form.packer_pincode,
        defective_returns_price: form.defective_returns_price,
        style_code: form.style_code,
        volumetric_weight: form.volumetric_weight,
      };

      const updatedPackages = Array.isArray(product.packages) && product.packages.length > 0
        ? product.packages.map((pkg: any, idx: number) => {
            if (idx === 0) {
              return {
                ...pkg,
                price: parseFloat(form.price) || pkg.price,
                mrp: parseFloat(form.mrp) || pkg.mrp,
                stock: parseInt(form.stock) || pkg.stock,
              };
            }
            return pkg;
          })
        : undefined;

      const payload: any = {
        name: form.name,
        description: form.description,
        price: parseFloat(form.price) || 0,
        mrp: parseFloat(form.mrp) || parseFloat(form.price) || 0,
        brand: form.brand || "zebalpha",
        stock: parseInt(form.stock) || 0,
        sku: form.sku || product.sku,
        image_url: coverImageUrl,
        images: orderedImages,
        specifications: updatedSpecifications,
        is_premium: form.is_premium,
        is_new_drop: form.is_new_drop,
        collection: form.collection.trim() || null,
        target_drop_date: form.target_drop_date.trim() || null,
        tier: form.is_premium ? "PREMIUM" : form.is_new_drop ? "DROP" : "STANDARD",
      };

      if (updatedPackages) {
        payload.packages = updatedPackages;
      }

      let currentPayload = { ...payload };
      let updateRes = await supabase
        .from("products")
        .update(currentPayload)
        .eq("id", product.id);

      if (updateRes.error && updateRes.error.message.includes("column")) {
        const match = updateRes.error.message.match(/column '([^']+)'|'([^']+)' column/);
        const colToStrip = match ? (match[1] || match[2]) : null;
        if (colToStrip && colToStrip in currentPayload) {
          delete currentPayload[colToStrip];
          updateRes = await supabase.from("products").update(currentPayload).eq("id", product.id);
        }
      }

      if (updateRes.error) throw updateRes.error;

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("SuperAdmin update error:", err);
      setErrorMsg(err.message || "Failed to update product details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#0d0d10] border border-[#27272a] rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-[#27272a] flex items-center justify-between bg-[#141418]">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-base md:text-lg font-bold text-white">SuperAdmin Catalog Editor</h2>
              <p className="text-xs text-zinc-400">Editing Product ID: <span className="font-mono text-amber-400">{product.id}</span></p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-[#18181b] text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <div className="p-4 md:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-6">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Core Info & Images */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white font-semibold text-sm border-b border-[#27272a] pb-2">
              <Tag className="w-4 h-4 text-emerald-400" />
              Core Information & Media
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-zinc-300 mb-1 block">Product Title / Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs focus:border-white"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 mb-1 block">Brand Name</label>
                <input
                  type="text"
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  className="w-full p-2.5 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs focus:border-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-300 mb-1 block">Description</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full p-2.5 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs focus:border-white"
              />
            </div>

            {/* Images Grid */}
            <div>
              <label className="text-xs font-medium text-zinc-300 mb-2 block">Product Images ({form.images.length}/4)</label>
              <div className="grid grid-cols-4 gap-3">
                {form.images.map((img, idx) => (
                  <div key={idx} className="relative aspect-3/4 rounded-xl border border-[#27272a] overflow-hidden group">
                    <img src={img} alt="Product image" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/80 text-red-400 hover:bg-red-500 hover:text-white text-xs"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                {form.images.length < 4 && (
                  <label className="aspect-3/4 rounded-xl border-2 border-dashed border-[#27272a] hover:border-zinc-400 bg-[#0d0d11] cursor-pointer flex flex-col items-center justify-center text-center p-2">
                    <Upload className="w-4 h-4 text-zinc-400 mb-1" />
                    <span className="text-[10px] text-zinc-400">Add Photo</span>
                    <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Clothing Specifications */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white font-semibold text-sm border-b border-[#27272a] pb-2">
              <Tag className="w-4 h-4 text-emerald-400" />
              Clothing Specifications
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-300 mb-1 block">Fabric / Material</label>
                <select
                  value={form.fabric}
                  onChange={(e) => setForm({ ...form, fabric: e.target.value })}
                  className="w-full p-2 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs"
                >
                  {FABRIC_OPTIONS.map((f, i) => (
                    <option key={i} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 mb-1 block">Fit Type</label>
                <select
                  value={form.fit_type}
                  onChange={(e) => setForm({ ...form, fit_type: e.target.value })}
                  className="w-full p-2 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs"
                >
                  {FIT_OPTIONS.map((f, i) => (
                    <option key={i} value={f}>{f}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 mb-1 block">Pattern</label>
                <select
                  value={form.pattern}
                  onChange={(e) => setForm({ ...form, pattern: e.target.value })}
                  className="w-full p-2 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs"
                >
                  {PATTERN_OPTIONS.map((p, i) => (
                    <option key={i} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 mb-1 block">Sleeve Length</label>
                <select
                  value={form.sleeve_type}
                  onChange={(e) => setForm({ ...form, sleeve_type: e.target.value })}
                  className="w-full p-2 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs"
                >
                  {SLEEVE_OPTIONS.map((s, i) => (
                    <option key={i} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 mb-1 block">Neck / Collar</label>
                <select
                  value={form.neck_type}
                  onChange={(e) => setForm({ ...form, neck_type: e.target.value })}
                  className="w-full p-2 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs"
                >
                  {NECK_OPTIONS.map((n, i) => (
                    <option key={i} value={n}>{n}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 mb-1 block">Target Gender</label>
                <select
                  value={form.target_gender}
                  onChange={(e) => setForm({ ...form, target_gender: e.target.value })}
                  className="w-full p-2 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs"
                >
                  {GENDER_OPTIONS.map((g, i) => (
                    <option key={i} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Pricing & Stock */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white font-semibold text-sm border-b border-[#27272a] pb-2">
              <Calculator className="w-4 h-4 text-emerald-400" />
              Pricing & Stock Inventory
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-300 mb-1 block">Listing Price (₹) *</label>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="w-full p-2 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 mb-1 block">Defective Return Price (₹)</label>
                <input
                  type="number"
                  value={form.defective_returns_price}
                  onChange={(e) => setForm({ ...form, defective_returns_price: e.target.value })}
                  className="w-full p-2 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 mb-1 block">MRP (₹)</label>
                <input
                  type="number"
                  value={form.mrp}
                  onChange={(e) => setForm({ ...form, mrp: e.target.value })}
                  className="w-full p-2 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 mb-1 block">Stock Count</label>
                <input
                  type="number"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  className="w-full p-2 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs"
                />
              </div>
            </div>
          </div>

          {/* Manufacturing Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white font-semibold text-sm border-b border-[#27272a] pb-2">
              <Building2 className="w-4 h-4 text-emerald-400" />
              Manufacturer & Packer Info
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-300 mb-1 block">Manufacturer Name</label>
                <input
                  type="text"
                  value={form.manufacturer_name}
                  onChange={(e) => setForm({ ...form, manufacturer_name: e.target.value })}
                  className="w-full p-2 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 mb-1 block">Address</label>
                <input
                  type="text"
                  value={form.manufacturer_address}
                  onChange={(e) => setForm({ ...form, manufacturer_address: e.target.value })}
                  className="w-full p-2 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 mb-1 block">Pincode</label>
                <input
                  type="text"
                  value={form.manufacturer_pincode}
                  onChange={(e) => setForm({ ...form, manufacturer_pincode: e.target.value })}
                  className="w-full p-2 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-xs"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#27272a] bg-[#141418] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-4 rounded-xl bg-[#18181b] border border-[#27272a] text-xs font-semibold text-zinc-300 hover:text-white"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="py-2 px-6 rounded-xl bg-amber-400 text-black hover:bg-amber-300 text-xs font-bold shadow-lg flex items-center gap-1.5"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving Changes..." : "Save Product Details"}
          </button>
        </div>
      </div>
    </div>
  );
}
