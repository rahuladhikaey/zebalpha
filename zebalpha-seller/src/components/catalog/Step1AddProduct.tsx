import React, { useState, useMemo, useEffect } from "react";
import { Upload, X, CheckCircle2, AlertCircle, Layers, Plus, Loader2, Send } from "lucide-react";
import type { Category } from "@shared/types";
import {
  DYNAMIC_CATEGORY_CATALOG,
  resolveProductTypeConfig,
} from "@shared/constants/productAttributeEngine";
import { compressImageTo100KB } from "@shared/services";
import { CategoryIconRenderer } from "@/lib/categoryIcons";
import SizeSpecificDetailsSection, {
  SizeVariantDetail,
  SizeMeasurementDetail,
  MeasurementUnit,
} from "./SizeSpecificDetailsSection";


export interface Step1Props {
  formData: {
    category_id: string;
    subcategory_id: string;
    subcategory_name: string;
    images: string[];
    front_image_index: number;
    name: string;
    description: string;
    is_premium?: boolean;
    is_new_drop?: boolean;
    target_drop_date?: string;

    // Meesho-style size & measurements fields
    selected_sizes?: string[];
    size_details?: SizeVariantDetail[];
    measurement_unit?: MeasurementUnit;
    size_measurements?: SizeMeasurementDetail[];
    is_measurements_enabled?: boolean;
    style_code?: string;
    price?: string;
    mrp?: string;
    defective_returns_price?: string;
    single_stock?: string;
  };
  categories: Category[];
  onChange: (updates: Partial<Step1Props["formData"]>) => void;
}

export default function Step1AddProduct({ formData, categories, onChange }: Step1Props) {
  // Infer active main category from category_id, subcategory_name, or product title keywords
  const inferredMainCat = useMemo(() => {
    // 1. Check category_id against categories list
    if (formData.category_id && categories && categories.length > 0) {
      const matchedCat = categories.find((c) => String(c.id) === String(formData.category_id));
      if (matchedCat) {
        const catText = `${matchedCat.main_category || ""} ${matchedCat.name || ""}`.toLowerCase();
        if (catText.includes("women") || catText.includes("female") || catText.includes("ladies")) return "women";
        if (catText.includes("kid") || catText.includes("boy") || catText.includes("girl") || catText.includes("baby") || catText.includes("infant")) return "kids";
        if (catText.includes("footwear") || catText.includes("shoe")) return "men";
        if (catText.includes("home") || catText.includes("kitchen") || catText.includes("decor")) return "home";
        if (catText.includes("electronic") || catText.includes("gadget")) return "electronics";
        if (catText.includes("beauty") || catText.includes("cosmetic")) return "beauty";
        if (catText.includes("jewel")) return "jewellery";
        if (catText.includes("men")) return "men";
      }
    }

    // 2. Check subcategory_name across DYNAMIC_CATEGORY_CATALOG
    if (formData.subcategory_name) {
      const subLower = formData.subcategory_name.toLowerCase().trim();
      for (const mainCat of DYNAMIC_CATEGORY_CATALOG) {
        for (const sub of mainCat.subcategories) {
          if (sub.name.toLowerCase() === subLower) return mainCat.id;
          for (const pt of sub.productTypes) {
            if (pt.name.toLowerCase() === subLower || pt.id.toLowerCase() === subLower) {
              return mainCat.id;
            }
          }
        }
      }
    }

    // 3. Check product name or subcategory keywords
    const combinedText = `${formData.subcategory_name || ""} ${formData.name || ""}`.toLowerCase();
    if (
      combinedText.includes("women") ||
      combinedText.includes("kurti") ||
      combinedText.includes("saree") ||
      combinedText.includes("blouse") ||
      combinedText.includes("lehenga") ||
      combinedText.includes("gown") ||
      combinedText.includes("dress")
    ) {
      return "women";
    }
    if (
      combinedText.includes("kid") ||
      combinedText.includes("baby") ||
      combinedText.includes("infant") ||
      combinedText.includes("boy") ||
      combinedText.includes("girl")
    ) {
      return "kids";
    }
    if (
      combinedText.includes("bottle") ||
      combinedText.includes("bedsheet") ||
      combinedText.includes("kitchen") ||
      combinedText.includes("cookware")
    ) {
      return "home";
    }
    if (
      combinedText.includes("earphone") ||
      combinedText.includes("headphone") ||
      combinedText.includes("cable") ||
      combinedText.includes("electronic")
    ) {
      return "electronics";
    }
    if (
      combinedText.includes("serum") ||
      combinedText.includes("lipstick") ||
      combinedText.includes("makeup") ||
      combinedText.includes("skincare")
    ) {
      return "beauty";
    }
    if (
      combinedText.includes("jewel") ||
      combinedText.includes("bangle") ||
      combinedText.includes("necklace") ||
      combinedText.includes("ring")
    ) {
      return "jewellery";
    }

    return "men";
  }, [formData.category_id, formData.subcategory_name, formData.name, categories]);

  // 1. Database-driven Main Categories (parent_id IS NULL and active)
  const dbMainCategories = useMemo(() => {
    return (categories || []).filter((c: any) => !c.parent_id && c.is_active !== false && c.main_category !== "CURATED");
  }, [categories]);

  // Initial main category resolution
  const [activeMainCatId, setActiveMainCatId] = useState<string>(() => {
    if (formData.category_id) {
      const match = (categories || []).find((c: any) => String(c.id) === String(formData.category_id)) as any;
      if (match) {
        return match.parent_id ? String(match.parent_id) : String(match.id);
      }
    }
    const firstMain = (categories || []).find((c: any) => !c.parent_id && c.is_active !== false && c.main_category !== "CURATED");
    return firstMain ? String(firstMain.id) : "";
  });

  // Current active main category record
  const currentDbMainCat = useMemo(() => {
    return dbMainCategories.find((c: any) => String(c.id) === String(activeMainCatId)) || dbMainCategories[0] || null;
  }, [dbMainCategories, activeMainCatId]);

  // Canonical string key for sizing engine / subcategory fallback
  const selectedMainCat = useMemo(() => {
    const slugOrName = (currentDbMainCat?.slug || currentDbMainCat?.name || "men").toLowerCase();
    if (slugOrName.includes("women") || slugOrName.includes("ladies") || slugOrName.includes("female")) return "women";
    if (slugOrName.includes("kid") || slugOrName.includes("boy") || slugOrName.includes("girl") || slugOrName.includes("baby")) return "kids";
    if (slugOrName.includes("home") || slugOrName.includes("kitchen")) return "home";
    if (slugOrName.includes("electronic") || slugOrName.includes("mobile")) return "electronics";
    if (slugOrName.includes("beauty") || slugOrName.includes("care")) return "beauty";
    if (slugOrName.includes("jewel") || slugOrName.includes("bag")) return "jewellery";
    return "men";
  }, [currentDbMainCat]);

  // Sync active main category if parent categories change
  useEffect(() => {
    if (!activeMainCatId && dbMainCategories.length > 0) {
      setActiveMainCatId(String(dbMainCategories[0].id));
    }
  }, [dbMainCategories, activeMainCatId]);

  // Approved subcategories under current main category
  const approvedSubcategories = useMemo(() => {
    if (!currentDbMainCat) return [];
    return (categories || []).filter((c: any) => String(c.parent_id) === String(currentDbMainCat.id) && c.is_active !== false);
  }, [categories, currentDbMainCat]);

  // Subcategory proposal state
  const [showProposalModal, setShowProposalModal] = useState(false);
  const [proposedName, setProposedName] = useState("");
  const [proposedDesc, setProposedDesc] = useState("");
  const [proposedReason, setProposedReason] = useState("");
  const [proposalSubmitting, setProposalSubmitting] = useState(false);
  const [proposalAlert, setProposalAlert] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [sellerProposals, setSellerProposals] = useState<any[]>([]);

  const loadSellerProposals = async () => {
    try {
      const res = await fetch("/api/seller/category-requests");
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.requests)) {
          setSellerProposals(json.requests);
        }
      }
    } catch (_) {}
  };

  useEffect(() => {
    loadSellerProposals();
  }, []);

  const handleProposalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentDbMainCat) return;
    if (!proposedName.trim()) {
      setProposalAlert({ type: "error", text: "Please enter a valid subcategory name." });
      return;
    }
    setProposalSubmitting(true);
    setProposalAlert(null);
    try {
      const res = await fetch("/api/seller/category-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parent_category_id: currentDbMainCat.id,
          proposed_name: proposedName.trim(),
          description: proposedDesc.trim() || undefined,
          reason: proposedReason.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to submit proposal");
      }
      setProposalAlert({
        type: "success",
        text: `Proposal for "${proposedName.trim()}" submitted! Super Admin will review it. You can pick an existing subcategory in the meantime.`
      });
      setProposedName("");
      setProposedDesc("");
      setProposedReason("");
      loadSellerProposals();
    } catch (err: any) {
      setProposalAlert({ type: "error", text: err.message || "Failed to submit proposal" });
    } finally {
      setProposalSubmitting(false);
    }
  };

  const [imageError, setImageError] = useState<string>("");

  // Resolve current active product type configuration dynamically
  const activeProductTypeConfig = useMemo(() => {
    const mainSlugOrName = (currentDbMainCat as any)?.slug || currentDbMainCat?.name || "men";
    return resolveProductTypeConfig(mainSlugOrName, formData.subcategory_name);
  }, [currentDbMainCat, formData.subcategory_name]);

  const hasSizingSystem = activeProductTypeConfig.sizingSystem !== "none";

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError("");
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    if (formData.images.length + files.length > 4) {
      setImageError("Maximum 4 images allowed for catalog listing.");
      return;
    }

    const MAX_ALLOWED_BYTES = 150 * 1024; // Strictly 150 KB (153,600 bytes)

    // 1. Strict raw file size check: completely reject any file over 150 KB
    for (const file of files) {
      if (file.size > MAX_ALLOWED_BYTES) {
        setImageError(
          `❌ File "${file.name}" is ${(file.size / 1024).toFixed(1)} KB. Maximum allowed size is 150 KB. Please select an image under 150 KB.`
        );
        e.target.value = "";
        return;
      }
    }

    const processedImages: string[] = [];

    for (const file of files) {
      try {
        const { blob } = await compressImageTo100KB(file, MAX_ALLOWED_BYTES);
        if (blob.size > MAX_ALLOWED_BYTES) {
          setImageError(`❌ Image "${file.name}" exceeds 150 KB (${(blob.size / 1024).toFixed(1)} KB). Please choose a smaller image.`);
          e.target.value = "";
          return;
        }

        const b64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (evt) => resolve((evt.target?.result as string) || "");
          reader.readAsDataURL(blob);
        });

        if (b64) processedImages.push(b64);
      } catch (err) {
        console.warn("Image compression notice:", err);
      }
    }


    if (processedImages.length > 0) {
      onChange({
        images: [...formData.images, ...processedImages].slice(0, 4),
      });
    }
  };


  const removeImage = (index: number) => {
    const updated = formData.images.filter((_, i) => i !== index);
    let newFrontIdx = formData.front_image_index;
    if (newFrontIdx >= updated.length) {
      newFrontIdx = Math.max(0, updated.length - 1);
    }
    onChange({ images: updated, front_image_index: newFrontIdx });
  };

  const setFrontImage = (index: number) => {
    onChange({ front_image_index: index });
  };

  const currentMainCatConfig = useMemo(() => {
    return DYNAMIC_CATEGORY_CATALOG.find((c) => c.id === selectedMainCat) || DYNAMIC_CATEGORY_CATALOG[0];
  }, [selectedMainCat]);

  // Flatten all product types for this main category to show in dropdown
  const activeProductTypesList = useMemo(() => {
    const list: { id: string; name: string; group: string }[] = [];
    currentMainCatConfig.subcategories.forEach((sub) => {
      sub.productTypes.forEach((pt) => {
        list.push({ id: pt.id, name: pt.name, group: sub.name });
      });
    });
    return list;
  }, [currentMainCatConfig]);

  return (
    <div className="space-y-6">
      {/* Product Type / Placement Selector */}
      <div className="p-4 rounded-xl bg-[#141418] border border-[#27272a] space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 block">
          Product Listing Tier & Placement
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => onChange({ is_premium: false, is_new_drop: false })}
            className={`p-2.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              !formData.is_premium && !formData.is_new_drop
                ? "bg-white text-black border-white shadow-md"
                : "bg-[#0d0d11] text-zinc-400 border-[#27272a] hover:text-white"
            }`}
          >
            🏷️ Standard Item
          </button>

          <button
            type="button"
            onClick={() => onChange({ is_premium: true, is_new_drop: false })}
            className={`p-2.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              formData.is_premium
                ? "bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/20"
                : "bg-[#0d0d11] text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
            }`}
          >
            💎 Premium Store Item
          </button>

          <button
            type="button"
            onClick={() => onChange({ is_new_drop: true, is_premium: false })}
            className={`p-2.5 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              formData.is_new_drop
                ? "bg-orange-500 text-black border-orange-400 shadow-md shadow-orange-500/20"
                : "bg-[#0d0d11] text-orange-400 border-orange-500/30 hover:bg-orange-500/10"
            }`}
          >
            ⚡ New Drop
          </button>
        </div>
      </div>

      {/* Centralized Database-Driven Category & Subcategory Selection */}
      <div className="space-y-4 p-5 rounded-2xl bg-[#141418] border border-[#27272a]">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>Main Marketplace Category</span>
              <span className="text-red-400">*</span>
            </label>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              Admin-curated marketplace hierarchy. Select the main department for your product.
            </p>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-black bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full flex items-center gap-1">
            <span>✨</span> Synchronized Taxonomy
          </span>
        </div>

        {/* Real Main Categories Grid */}
        {dbMainCategories.length === 0 ? (
          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 text-center">
            <p className="text-xs text-zinc-400 font-medium">
              No active main categories found in database. Contact Super Admin to configure categories.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
            {dbMainCategories.map((cat: any) => {
              const isSelected = String(activeMainCatId) === String(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setActiveMainCatId(String(cat.id));
                    onChange({
                      category_id: String(cat.id),
                      subcategory_id: "",
                      subcategory_name: "",
                    });
                  }}
                  className={`py-3 px-3 rounded-xl border text-xs font-bold transition-all text-left flex items-center gap-2.5 cursor-pointer ${
                    isSelected
                      ? "bg-white text-black border-white shadow-lg shadow-white/10"
                      : "bg-[#0d0d11] text-zinc-300 border-[#27272a] hover:border-zinc-500 hover:text-white"
                  }`}
                >
                  <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? "bg-black/10" : "bg-zinc-900 border border-zinc-800"}`}>
                    <CategoryIconRenderer
                      iconKey={cat.icon_key}
                      iconUrl={cat.icon_url}
                      className={isSelected ? "text-black" : "text-zinc-300"}
                      size={18}
                    />
                  </div>
                  <span className="truncate">{cat.name}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Subcategory Selection & Proposal Section */}
        {currentDbMainCat && (
          <div className="pt-2 border-t border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-zinc-300 flex items-center gap-1">
                  Subcategory under {currentDbMainCat.name} <span className="text-red-400">*</span>
                </label>
                <p className="text-[11px] text-zinc-500">
                  Select an approved subcategory, or propose a new one if not listed.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowProposalModal(true);
                  setProposalAlert(null);
                }}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-lg border border-indigo-500/30 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Propose New Subcategory</span>
              </button>
            </div>

            {/* Approved Subcategories Dropdown */}
            <select
              value={formData.subcategory_name || ""}
              onChange={(e) => {
                const selectedName = e.target.value;
                const matchedSub = approvedSubcategories.find((s: any) => s.name === selectedName);
                onChange({
                  category_id: String(currentDbMainCat.id),
                  subcategory_id: matchedSub ? String(matchedSub.id) : "",
                  subcategory_name: selectedName,
                });
              }}
              className="w-full p-3 rounded-xl bg-[#0d0d11] border border-[#27272a] text-white text-xs font-medium focus:border-white transition-colors"
            >
              <option value="">-- Select Approved Subcategory ({approvedSubcategories.length} available) --</option>
              {approvedSubcategories.map((sub: any) => (
                <option key={sub.id} value={sub.name}>
                  {sub.name}
                </option>
              ))}
              {formData.subcategory_name && !approvedSubcategories.some((s: any) => s.name === formData.subcategory_name) && (
                <option value={formData.subcategory_name}>
                  {formData.subcategory_name} (Custom / Legacy)
                </option>
              )}
            </select>

            {approvedSubcategories.length === 0 && (
              <p className="text-[11px] text-zinc-500 italic">
                No approved subcategories created under {currentDbMainCat.name} yet. Click &quot;Propose New Subcategory&quot; to submit one for Super Admin review.
              </p>
            )}

            {/* Seller Proposals list under this category */}
            {sellerProposals.filter((p: any) => String(p.parent_category_id) === String(currentDbMainCat.id)).length > 0 && (
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Your Subcategory Proposals for {currentDbMainCat.name}
                </p>
                <div className="space-y-1.5">
                  {sellerProposals
                    .filter((p: any) => String(p.parent_category_id) === String(currentDbMainCat.id))
                    .map((prop: any) => (
                      <div key={prop.id} className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                        <span className="font-semibold text-zinc-200">{prop.proposed_name}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                            prop.status === "APPROVED"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                              : prop.status === "REJECTED"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                          }`}>
                            {prop.status}
                          </span>
                          {prop.status === "REJECTED" && prop.rejection_reason && (
                            <span className="text-[11px] text-zinc-400 italic">({prop.rejection_reason})</span>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Proposal Modal / Drawer */}
        {showProposalModal && currentDbMainCat && (
          <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider">
                  Propose New Subcategory
                </h4>
                <p className="text-[11px] text-zinc-400">
                  Submitted requests will be reviewed by Super Admin.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowProposalModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {proposalAlert && (
              <div className={`p-3 rounded-lg text-xs font-semibold ${
                proposalAlert.type === "success"
                  ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-300"
                  : "bg-rose-500/10 border border-rose-500/30 text-rose-300"
              }`}>
                {proposalAlert.text}
              </div>
            )}

            <form onSubmit={handleProposalSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-zinc-400 block mb-1">
                  Parent Main Category (Locked)
                </label>
                <input
                  type="text"
                  disabled
                  value={currentDbMainCat.name}
                  className="w-full p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 text-xs font-semibold cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-300 block mb-1">
                  Proposed Subcategory Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Linen Shirts, Smart Watches, Leather Wallets"
                  value={proposedName}
                  onChange={(e) => setProposedName(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-zinc-950 border border-zinc-700 text-white text-xs focus:border-white transition-colors"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-400 block mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Brief description of products in this subcategory..."
                  value={proposedDesc}
                  onChange={(e) => setProposedDesc(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-zinc-950 border border-zinc-700 text-white text-xs focus:border-white transition-colors"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-400 block mb-1">
                  Reason / Business Context (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Why is this subcategory needed for the marketplace?"
                  value={proposedReason}
                  onChange={(e) => setProposedReason(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-zinc-950 border border-zinc-700 text-white text-xs focus:border-white transition-colors"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowProposalModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-300 text-xs font-bold hover:bg-zinc-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={proposalSubmitting || !proposedName.trim()}
                  className="px-4 py-1.5 rounded-lg bg-white hover:bg-zinc-200 text-black text-xs font-black uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {proposalSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit to Admin</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Multi-Image Upload */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold text-zinc-200 flex items-center gap-1">
            Product Images <span className="text-red-400">*</span>
          </label>
          <span className="text-xs text-zinc-400">
            {formData.images.length}/4 Images Uploaded
          </span>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs text-zinc-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
            Upload product photos (Front, Back, Detail, Model) — <strong className="text-emerald-400">Strict Max 150 KB per photo</strong>.
          </p>
          <a
            href="https://imagecompressor.11zon.com/en/compress-webp/compress-webp-to-100kb"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-bold text-violet-400 hover:text-violet-300 underline inline-flex items-center gap-1"
          >
            Resize / Compress Photo (100KB) ↗
          </a>
        </div>

        {imageError && (
          <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center justify-between gap-2 flex-wrap">
            <span>{imageError}</span>
            <a
              href="https://imagecompressor.11zon.com/en/compress-webp/compress-webp-to-100kb"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] font-bold text-white bg-red-600/80 hover:bg-red-600 px-2.5 py-1 rounded-md transition shrink-0"
            >
              Resize to 100KB ↗
            </a>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
          {formData.images.map((imgUrl, index) => {
            const isFront = formData.front_image_index === index;
            return (
              <div
                key={index}
                className={`relative aspect-3/4 rounded-xl border overflow-hidden group transition-all ${
                  isFront ? "border-emerald-500 ring-2 ring-emerald-500/30" : "border-[#27272a]"
                }`}
              >
                <img src={imgUrl} alt={`Product preview ${index + 1}`} className="w-full h-full object-cover" />
                
                {/* Delete overlay */}
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-red-400 hover:bg-red-500 hover:text-white transition-all opacity-90 group-hover:opacity-100"
                  title="Remove image"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {/* Front Image Badge / Toggle */}
                <button
                  type="button"
                  onClick={() => setFrontImage(index)}
                  className={`absolute bottom-2 left-2 right-2 py-1 px-2 rounded-md text-[10px] font-bold tracking-wide flex items-center justify-center gap-1 transition-all ${
                    isFront
                      ? "bg-emerald-500 text-black shadow-lg"
                      : "bg-black/70 text-zinc-300 hover:bg-white hover:text-black"
                  }`}
                >
                  {isFront ? (
                    <>
                      <CheckCircle2 className="w-3 h-3" /> Cover Image
                    </>
                  ) : (
                    "Set as Cover"
                  )}
                </button>
              </div>
            );
          })}

          {formData.images.length < 4 && (
            <label className="aspect-3/4 rounded-xl border-2 border-dashed border-[#27272a] hover:border-zinc-400 bg-[#0d0d11] hover:bg-[#141418] cursor-pointer flex flex-col items-center justify-center gap-2 transition-all p-3 text-center group">
              <div className="p-3 rounded-full bg-[#18181b] group-hover:bg-zinc-800 text-zinc-300 transition-colors">
                <Upload className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-medium text-zinc-300">Upload Image</span>
              <span className="text-[10px] text-emerald-400 font-semibold">WebP, PNG, JPG (Max 150KB)</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>

      {/* Product Name */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-zinc-200 flex items-center gap-1">
          Product Name / Title <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="e.g. Premium Oversized Heavyweight Cotton Graphic Hoodie"
          className="w-full p-3 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-sm focus:border-white transition-colors"
        />
      </div>

      {/* Target Launch Date for New Drops */}
      {formData.is_new_drop && (
        <div className="space-y-2 p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
          <label className="text-sm font-semibold text-orange-300 flex items-center gap-1">
            ⚡ Target Launch / Drop Date <span className="text-red-400">*</span>
          </label>
          <input
            type="datetime-local"
            value={formData.target_drop_date || ""}
            onChange={(e) => onChange({ target_drop_date: e.target.value })}
            className="w-full p-3 rounded-lg bg-[#0d0d11] border border-orange-500/40 text-white text-sm"
          />
          <p className="text-[11px] text-zinc-400">
            💡 Displayed on the customer <code>/new-drops</code> hype countdown with voting and launch alerts.
          </p>
        </div>
      )}

      {/* Meesho-Style Size-Specific Details & Measurements: Render ONLY if category has a sizing system */}
      {hasSizingSystem ? (
        <SizeSpecificDetailsSection
          selectedSizes={formData.selected_sizes || []}
          sizeDetails={formData.size_details || []}
          sizeMeasurements={formData.size_measurements || []}
          measurementUnit={formData.measurement_unit || "inches"}
          isMeasurementsEnabled={formData.is_measurements_enabled ?? true}
          styleCode={formData.style_code}
          subcategoryName={formData.subcategory_name}
          categoryName={selectedMainCat}
          defaultPrice={formData.price}
          defaultMrp={formData.mrp}
          onSizesChange={(newSizes) => onChange({ selected_sizes: newSizes })}
          onSizeDetailsChange={(newDetails) => {
            const validSellingPrices = newDetails
              .map((d) => parseFloat(d.selling_price))
              .filter((p) => !isNaN(p) && p > 0);
            const validMrps = newDetails
              .map((d) => parseFloat(d.mrp))
              .filter((m) => !isNaN(m) && m > 0);
            const validReturns = newDetails
              .map((d) => parseFloat(d.return_price))
              .filter((r) => !isNaN(r) && r > 0);
            const totalStock = newDetails.reduce((sum, d) => {
              const qty = parseInt(d.inventory);
              return sum + (!isNaN(qty) && qty > 0 ? qty : 0);
            }, 0);

            const firstRow = newDetails[0];
            const autoPrice = firstRow && parseFloat(firstRow.selling_price) > 0
              ? parseFloat(firstRow.selling_price)
              : (validSellingPrices[0] || 0);
            const autoMrp = firstRow && parseFloat(firstRow.mrp) > 0
              ? parseFloat(firstRow.mrp)
              : (validMrps[0] || autoPrice);
            const autoReturn = firstRow && parseFloat(firstRow.return_price) > 0
              ? parseFloat(firstRow.return_price)
              : (validReturns[0] || 0);

            onChange({
              size_details: newDetails,
              price: autoPrice > 0 ? String(autoPrice) : formData.price,
              mrp: autoMrp > 0 ? String(autoMrp >= autoPrice ? autoMrp : autoPrice) : (autoPrice > 0 ? String(autoPrice) : formData.mrp),
              defective_returns_price: autoReturn > 0 ? String(autoReturn) : formData.defective_returns_price,
              single_stock: String(totalStock || 20),
            });
          }}
          onSizeMeasurementsChange={(newMeasurements) => onChange({ size_measurements: newMeasurements })}
          onMeasurementUnitChange={(unit) => onChange({ measurement_unit: unit })}
          onToggleMeasurements={(enabled) => onChange({ is_measurements_enabled: enabled })}
        />
      ) : (
        <div className="p-4 rounded-xl bg-[#141418] border border-[#27272a] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Layers className="w-4 h-4" />
            </span>
            <div>
              <span className="text-xs font-bold text-white block">
                Standard / Single Configuration Item
              </span>
              <span className="text-[11px] text-zinc-400">
                {activeProductTypeConfig.name} does not require apparel sizing. You will configure product specifications in Step 2.
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold text-zinc-400 bg-zinc-800 px-2.5 py-1 rounded-full uppercase tracking-wider">
            No Sizes Needed
          </span>
        </div>
      )}

      {/* Product Description */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-sm font-semibold text-zinc-200">Product Description</label>
          <span className="text-xs text-zinc-500">{formData.description.length}/1400</span>
        </div>
        <textarea
          rows={4}
          maxLength={1400}
          value={formData.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Include fabric composition, fit details (oversized/slim), model height/size worn, and styling instructions..."
          className="w-full p-3 rounded-lg bg-[#0d0d11] border border-[#27272a] text-white text-sm focus:border-white transition-colors"
        />
      </div>
    </div>
  );
}
