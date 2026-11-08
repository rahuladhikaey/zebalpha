"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import {
  GarmentMockupPreview,
  GARMENT_COLORS,
  GARMENT_TYPES,
  GarmentType,
  GarmentColorOption,
  PlacementPosition,
} from "@/components/customize/GarmentMockupPreview";
import {
  ADMIN_PRESET_DESIGNS,
  DEFAULT_APPAREL_BASES,
  PRESET_CATEGORIES,
  PresetDesign,
  ApparelBaseConfig,
} from "@/lib/customDesignPresets";
import {
  Upload,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  X,
  Palette,
  Layers,
  Shirt,
  Info,
  Send,
  AlertCircle,
  Phone,
  User,
  Mail,
  FileText,
  Clock,
  ShieldCheck,
} from "lucide-react";

export default function CustomizePage() {
  // Mode selection: 'upload' (customer file) | 'vault' (admin presets)
  const [designMode, setDesignMode] = useState<"upload" | "vault">("vault");

  // Dynamic Catalog Configs (Admin Controlled)
  const [apparelBases, setApparelBases] = useState<ApparelBaseConfig[]>(DEFAULT_APPAREL_BASES);
  const [selectedBase, setSelectedBase] = useState<ApparelBaseConfig>(DEFAULT_APPAREL_BASES[0]);
  const [presetVault, setPresetVault] = useState<PresetDesign[]>(ADMIN_PRESET_DESIGNS);

  // Garment base settings
  const [selectedGarment, setSelectedGarment] = useState<GarmentType>("oversized_tee");
  const [selectedColor, setSelectedColor] = useState<GarmentColorOption>(GARMENT_COLORS[0]);
  const [selectedPlacement, setSelectedPlacement] = useState<PlacementPosition>("front_chest");
  const [selectedSize, setSelectedSize] = useState<string>("L");
  const [quantity, setQuantity] = useState<number>(1);

  // Vault preset selection
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activePreset, setActivePreset] = useState<PresetDesign>(ADMIN_PRESET_DESIGNS[0]);

  // Load Admin configurations (GSM, Pricing, 20KB WebP Artwork) on mount
  useEffect(() => {
    fetch("/api/custom-design/config")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          if (Array.isArray(json.data.apparelBases) && json.data.apparelBases.length > 0) {
            setApparelBases(json.data.apparelBases);
            setSelectedBase(json.data.apparelBases[0]);
            setSelectedGarment(json.data.apparelBases[0].id);
          }
          if (Array.isArray(json.data.presets) && json.data.presets.length > 0) {
            setPresetVault(json.data.presets);
            setActivePreset(json.data.presets[0]);
          }
        }
      })
      .catch((err) => {
        console.warn("Notice loading studio config, using local defaults:", err);
      });
  }, []);

  // Dynamic categories extracted automatically from all active admin vault presets
  const dynamicCategories = useMemo(() => {
    const catMap = new Map<string, string>([
      ["all", "All Artworks"],
      ["genz", "⚡ Gen-Z & Cyberpunk"],
      ["anime", "🎌 Anime & Manga"],
      ["bengali", "🎨 Bengali Typography & Folk"],
      ["streetwear", "🔥 Streetwear Graphics"],
      ["minimal", "✦ Minimalist Badges"],
    ]);

    presetVault.forEach((p) => {
      if (p.category && !catMap.has(p.category)) {
        catMap.set(p.category, p.category.charAt(0).toUpperCase() + p.category.slice(1));
      }
    });

    return Array.from(catMap.entries()).map(([id, label]) => ({ id, label }));
  }, [presetVault]);

  // Filtered preset designs
  const filteredPresets = useMemo(() => {
    if (selectedCategory === "all") return presetVault;
    return presetVault.filter((d) => d.category === selectedCategory);
  }, [selectedCategory, presetVault]);

  // Keep active preset in sync with category selection
  useEffect(() => {
    if (filteredPresets.length > 0 && !filteredPresets.some((p) => p.id === activePreset?.id)) {
      setActivePreset(filteredPresets[0]);
    }
  }, [filteredPresets, activePreset]);

  // Real-time Pricing Calculations
  const unitPrice = selectedBase?.basePrice || 799;
  const estimatedTotal = unitPrice * quantity;

  // Dynamic available sizes based on selected garment base
  const currentAvailableSizes = useMemo(() => {
    if (selectedBase?.availableSizes && selectedBase.availableSizes.length > 0) {
      return selectedBase.availableSizes;
    }
    return ["S", "M", "L", "XL", "XXL", "3XL"];
  }, [selectedBase]);

  useEffect(() => {
    if (currentAvailableSizes.length > 0 && !currentAvailableSizes.includes(selectedSize)) {
      setSelectedSize(currentAvailableSizes[0]);
    }
  }, [currentAvailableSizes, selectedSize]);

  // Custom upload state
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedPreviewUrl, setUploadedPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Customer contact form
  const [customerName, setCustomerName] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [notes, setNotes] = useState("");

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedToken, setSubmittedToken] = useState<string | null>(null);

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      setErrorMsg("File size must be under 25MB.");
      return;
    }

    setErrorMsg(null);
    setUploadedFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Active artwork preview URL
  const activeArtworkUrl =
    designMode === "upload" ? uploadedPreviewUrl : activePreset?.imageUrl || null;

  const activeArtworkTitle =
    designMode === "upload"
      ? uploadedFile?.name || "Uploaded Artwork"
      : activePreset?.title || "Preset Artwork";

  // Form submission (Stateless, Zero-Database)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!customerName.trim()) {
      setErrorMsg("Please enter your name.");
      return;
    }

    const cleanPhone = whatsappPhone.replace(/[^0-9]/g, "");
    if (cleanPhone.length < 10) {
      setErrorMsg("Please enter a valid 10-digit WhatsApp/mobile number.");
      return;
    }

    if (designMode === "upload" && !uploadedFile) {
      setErrorMsg("Please select or drop an artwork file to upload.");
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("customerName", customerName.trim());
      formData.append("whatsappPhone", cleanPhone);
      formData.append("customerEmail", customerEmail.trim());
      formData.append("garmentType", selectedGarment);
      formData.append("garmentName", selectedBase?.name || "Custom Apparel");
      formData.append("garmentGsm", selectedBase?.gsm || "");
      formData.append("unitPrice", String(unitPrice));
      formData.append("totalEstimatedPrice", String(estimatedTotal));
      formData.append("garmentColor", selectedColor.name);
      formData.append("garmentSize", selectedSize);
      formData.append("quantity", String(quantity));
      formData.append("placement", selectedPlacement);
      formData.append("designMode", designMode === "upload" ? "custom_upload" : "preset_vault");
      formData.append("notes", notes.trim());

      if (designMode === "upload" && uploadedFile) {
        formData.append("artworkFile", uploadedFile);
      } else if (designMode === "vault" && activePreset) {
        formData.append("presetTitle", activePreset.title);
        formData.append("presetImageUrl", activePreset.imageUrl);
      }

      const res = await fetch("/api/custom-design/submit", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to submit design request.");
      }

      setSubmittedToken(json.orderToken || `ZD-${Date.now().toString().slice(-6)}`);
    } catch (err: any) {
      console.error("Submission error:", err);
      setErrorMsg(err.message || "Network error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black">
      <Header title="Custom Studio" subtitle="CREATE YOUR IDENTITY ✦" />

      {/* Main Studio Container */}
      <main className="mx-auto w-full max-w-[1400px] px-4 md:px-8 py-6 sm:py-10">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-bold text-neutral-400 hover:text-white transition-colors cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Storefront</span>
          </Link>

          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Direct Production Order</span>
          </div>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white flex items-center gap-3">
            <span>Custom Design Studio</span>
            <span className="text-xs sm:text-sm font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
              Print On Demand
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 font-medium mt-1">
            Pick from our curated graphic vault or upload your own artwork. We deliver high-density DTF and screen prints across India.
          </p>
        </div>

        {/* 2-Column Responsive Studio Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-10 items-start">
          {/* Left Column: Live Mockup Canvas (Sticky on Desktop) */}
          <div className="lg:col-span-5 xl:col-span-5 lg:sticky lg:top-24 space-y-4">
            <GarmentMockupPreview
              garmentType={selectedGarment}
              garmentLabel={selectedBase?.name}
              selectedColor={selectedColor}
              designImageSrc={activeArtworkUrl}
              designTitle={activeArtworkTitle}
              placement={selectedPlacement}
              isSubmitting={isSubmitting}
            />

            {/* Live Pricing & Spec Bar */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-900/90 border border-neutral-800 shadow-xl">
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Selected Fabric</span>
                <span className="text-xs font-black text-white">{selectedBase?.name} <span className="text-emerald-400 font-mono">({selectedBase?.gsm})</span></span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Estimated Price</span>
                <span className="text-base font-black text-emerald-400 font-mono">₹{estimatedTotal}</span>
              </div>
            </div>

            {/* Quality & Production Guarantees */}
            <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-2xl bg-neutral-900/60 border border-neutral-800 text-center">
              <div className="flex flex-col items-center">
                <Shirt className="w-4 h-4 text-emerald-400 mb-1" />
                <span className="text-[10px] font-bold text-white">100% Combed</span>
                <span className="text-[9px] text-neutral-400">Pure Cotton</span>
              </div>
              <div className="flex flex-col items-center">
                <Clock className="w-4 h-4 text-emerald-400 mb-1" />
                <span className="text-[10px] font-bold text-white">30 Min Proof</span>
                <span className="text-[9px] text-neutral-400">Via WhatsApp</span>
              </div>
              <div className="flex flex-col items-center">
                <ShieldCheck className="w-4 h-4 text-emerald-400 mb-1" />
                <span className="text-[10px] font-bold text-white">Fade-Proof</span>
                <span className="text-[9px] text-neutral-400">High-Density DTF</span>
              </div>
            </div>
          </div>

          {/* Right Column: Customization Controls & Contact Deck */}
          <div className="lg:col-span-7 xl:col-span-7 space-y-6">
            {/* Step 1: Design Source Mode Switcher */}
            <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-neutral-900/90 border border-neutral-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-5 w-1 bg-emerald-400 rounded-full" />
                  <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                    Step 1: Choose Your Artwork
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  Select Source
                </span>
              </div>

              {/* Mode Switch Tabs */}
              <div className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-black border border-neutral-800">
                <button
                  type="button"
                  onClick={() => setDesignMode("vault")}
                  className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    designMode === "vault"
                      ? "bg-neutral-850 text-white shadow-lg border border-neutral-700"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  <Palette className="w-4 h-4 text-emerald-400" />
                  <span>ZebAlpha Vault</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDesignMode("upload")}
                  className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    designMode === "upload"
                      ? "bg-neutral-850 text-white shadow-lg border border-neutral-700"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  <Upload className="w-4 h-4 text-emerald-400" />
                  <span>Upload My Own</span>
                </button>
              </div>

              {/* MODE A: Customer File Upload */}
              {designMode === "upload" && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {uploadedPreviewUrl ? (
                    <div className="p-3 rounded-2xl bg-black border border-emerald-500/50 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-neutral-900 border border-neutral-700 overflow-hidden shrink-0 flex items-center justify-center p-1">
                          <img
                            src={uploadedPreviewUrl}
                            alt="Uploaded artwork"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">
                            {uploadedFile?.name}
                          </p>
                          <p className="text-[10px] text-emerald-400 font-semibold">
                            {uploadedFile ? `${(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for print` : ""}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white transition-colors shrink-0"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-neutral-700 hover:border-emerald-400/80 rounded-2xl p-6 text-center cursor-pointer transition-all bg-black/40 hover:bg-neutral-900/50 group"
                    >
                      <Upload className="w-8 h-8 text-neutral-400 group-hover:text-emerald-400 mx-auto mb-2 transition-colors" />
                      <p className="text-xs font-bold text-white">
                        Click or drag & drop artwork here
                      </p>
                      <p className="text-[10px] text-neutral-400 mt-1">
                        High-res PNG, JPG, SVG, WebP, or PDF up to 25MB
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* MODE B: ZebAlpha Preset Vault */}
              {designMode === "vault" && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  {/* Category Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                    {dynamicCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer ${
                          selectedCategory === cat.id
                            ? "bg-emerald-500 text-black font-extrabold shadow-sm scale-105"
                            : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700 hover:text-white"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Preset Graphics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-[260px] overflow-y-auto pr-1 no-scrollbar">
                    {filteredPresets.map((preset) => {
                      const isSelected = activePreset?.id === preset.id;
                      return (
                        <div
                          key={preset.id}
                          onClick={() => setActivePreset(preset)}
                          className={`group relative rounded-xl bg-neutral-950 border p-2 flex flex-col items-center cursor-pointer transition-all ${
                            isSelected
                              ? "border-emerald-400 ring-2 ring-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)] bg-neutral-900"
                              : "border-neutral-800 hover:border-neutral-700 hover:bg-neutral-900"
                          }`}
                        >
                          <div className="w-full aspect-square rounded-lg bg-neutral-900 overflow-hidden mb-1.5 flex items-center justify-center p-1.5">
                            <img
                              src={preset.imageUrl}
                              alt={preset.title}
                              className="w-full h-full object-contain group-hover:scale-108 transition-transform duration-300"
                            />
                          </div>
                          <span className="text-[10px] font-bold text-neutral-300 group-hover:text-white truncate max-w-full text-center">
                            {preset.title}
                          </span>
                          {isSelected && (
                            <div className="absolute top-1 right-1 h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center text-black text-[9px] font-black">
                              ✓
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Garment Base Selection */}
            <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-neutral-900/90 border border-neutral-800 space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-5 w-1 bg-emerald-400 rounded-full" />
                <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                  Step 2: Select Apparel Base
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {apparelBases.map((base) => {
                  const isSelected = selectedGarment === base.id;
                  return (
                    <button
                      key={base.id}
                      type="button"
                      onClick={() => {
                        setSelectedGarment(base.id);
                        setSelectedBase(base);
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelected
                          ? "border-emerald-400 bg-neutral-850 shadow-[0_0_15px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/30"
                          : "border-neutral-800 bg-black hover:border-neutral-700"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-neutral-800 text-emerald-300 font-mono uppercase">
                          {base.gsm}
                        </span>
                        {base.badge && (
                          <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase">
                            {base.badge}
                          </span>
                        )}
                      </div>
                      <div className="mt-2">
                        <p className="text-xs font-black text-white leading-tight">{base.name}</p>
                        <p className="text-xs font-black text-emerald-400 mt-1 font-mono">
                          ₹{base.basePrice}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Color, Placement & Sizing */}
            <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-neutral-900/90 border border-neutral-800 space-y-5">
              <div className="flex items-center gap-2">
                <span className="h-5 w-1 bg-emerald-400 rounded-full" />
                <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                  Step 3: Color, Placement & Size
                </h3>
              </div>

              {/* Garment Color Swatches */}
              <div>
                <label className="text-[11px] font-bold text-neutral-400 block mb-2 uppercase tracking-wider">
                  Garment Color: <strong className="text-white">{selectedColor.name}</strong>
                </label>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {GARMENT_COLORS.map((col) => {
                    const isSelected = selectedColor.name === col.name;
                    return (
                      <button
                        key={col.name}
                        type="button"
                        onClick={() => setSelectedColor(col)}
                        title={col.name}
                        className={`h-9 w-9 rounded-full border-2 transition-all cursor-pointer flex items-center justify-center ${
                          isSelected
                            ? "border-emerald-400 scale-110 shadow-[0_0_12px_rgba(16,185,129,0.5)]"
                            : "border-neutral-700 hover:border-neutral-500"
                        }`}
                        style={{ backgroundColor: col.hex }}
                      >
                        {isSelected && (
                          <div
                            className={`h-2.5 w-2.5 rounded-full ${
                              col.isDark ? "bg-white" : "bg-black"
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Print Placement */}
              <div>
                <label className="text-[11px] font-bold text-neutral-400 block mb-2 uppercase tracking-wider">
                  Print Placement:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "front_chest", label: "Front Chest" },
                    { id: "full_front", label: "Full Front" },
                    { id: "pocket", label: "Left Pocket" },
                    { id: "back", label: "Full Back" },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPlacement(p.id as PlacementPosition)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-center cursor-pointer border ${
                        selectedPlacement === p.id
                          ? "bg-neutral-800 border-emerald-400 text-emerald-400"
                          : "bg-black border-neutral-800 text-neutral-400 hover:text-white"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Size & Quantity Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Size Selector */}
                <div>
                  <label className="text-[11px] font-bold text-neutral-400 block mb-2 uppercase tracking-wider">
                    Target Size:
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {currentAvailableSizes.map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setSelectedSize(sz)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                          selectedSize === sz
                            ? "bg-emerald-500 text-black border-emerald-400 font-extrabold scale-105"
                            : "bg-black border-neutral-800 text-neutral-300 hover:border-neutral-600 hover:text-white"
                        }`}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <label className="text-[11px] font-bold text-neutral-400 block mb-2 uppercase tracking-wider">
                    Quantity:
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="h-9 w-9 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-black flex items-center justify-center text-sm"
                    >
                      -
                    </button>
                    <span className="text-base font-black text-white w-8 text-center">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => q + 1)}
                      className="h-9 w-9 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-black flex items-center justify-center text-sm"
                    >
                      +
                    </button>
                    <span className="text-[10px] text-emerald-400 font-bold ml-1">
                      {quantity >= 5 ? "Bulk Pricing Applied" : "Single Print Supported"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4: Contact & Submission Form */}
            <form
              onSubmit={handleSubmit}
              className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-neutral-900/90 border border-neutral-800 space-y-4"
            >
              <div className="flex items-center gap-2">
                <span className="h-5 w-1 bg-emerald-400 rounded-full" />
                <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-white">
                  Step 4: Contact & Finalize
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="text-[11px] font-bold text-neutral-300 block mb-1">
                    Your Full Name <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Adhikary"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-black border border-neutral-800 text-white text-xs placeholder:text-neutral-600 focus:border-emerald-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-neutral-300 block mb-1">
                    WhatsApp / Phone Number <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9876543210"
                      value={whatsappPhone}
                      onChange={(e) => setWhatsappPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-black border border-neutral-800 text-white text-xs placeholder:text-neutral-600 focus:border-emerald-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-neutral-300 block mb-1">
                  Email Address <span className="text-neutral-500 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-neutral-500" />
                  <input
                    type="email"
                    placeholder="e.g. yourname@gmail.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-black border border-neutral-800 text-white text-xs placeholder:text-neutral-600 focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-neutral-300 block mb-1">
                  Special Instructions / Print Notes <span className="text-neutral-500 font-normal">(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Please keep front print 10x12 inches with high color saturation..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-3 rounded-xl bg-black border border-neutral-800 text-white text-xs placeholder:text-neutral-600 focus:border-emerald-400 focus:outline-none resize-none"
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2 text-rose-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Order Summary & Pricing Breakdown */}
              <div className="p-4 rounded-2xl bg-black border border-neutral-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Garment Base:</span>
                  <span className="font-bold text-white">{selectedBase?.name} ({selectedBase?.gsm})</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Base Unit Price:</span>
                  <span className="font-mono font-bold text-neutral-300">₹{unitPrice}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-400">Quantity:</span>
                  <span className="font-mono font-bold text-neutral-300">{quantity} Pc(s)</span>
                </div>
                <div className="pt-2 border-t border-neutral-850 flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-white">Estimated Total:</span>
                  <span className="text-base font-black text-emerald-400 font-mono">₹{estimatedTotal}</span>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-full bg-emerald-400 hover:bg-emerald-300 active:scale-98 text-black font-black uppercase tracking-wider text-xs sm:text-sm transition-all shadow-[0_0_25px_rgba(16,185,129,0.3)] hover:shadow-[0_0_35px_rgba(16,185,129,0.5)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
                    <span>Submitting Custom Design...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Custom Design Order</span>
                  </>
                )}
              </button>

              <p className="text-[10px] text-center text-neutral-500">
                🔒 Direct Production Pipeline • No third-party spam • Our team will share a free proof mockup on your WhatsApp within 30 minutes.
              </p>
            </form>
          </div>
        </div>
      </main>

      {/* Success Confirmation Modal */}
      {submittedToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-neutral-950 border border-emerald-500/50 p-6 sm:p-8 text-center space-y-4 shadow-2xl relative">
            <div className="h-16 w-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(16,185,129,0.4)]">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
                Order Received
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight pt-2">
                Design Submitted!
              </h2>
              <p className="text-xs text-neutral-300 font-medium">
                Your custom design proof has been received by our production team under reference{" "}
                <strong className="text-emerald-400 font-mono">#{submittedToken}</strong>.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-neutral-900/80 border border-neutral-800 text-left text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-neutral-400">Garment Base:</span>
                <span className="font-bold text-white">{selectedBase?.name} ({selectedBase?.gsm})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Est. Total:</span>
                <span className="font-bold text-emerald-400 font-mono">₹{estimatedTotal} ({quantity} Pc)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Color & Size:</span>
                <span className="font-bold text-white">{selectedColor.name} • {selectedSize}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Target Contact:</span>
                <span className="font-bold text-emerald-400">+{whatsappPhone}</span>
              </div>
            </div>

            <p className="text-[11px] text-neutral-400">
              Our print specialist will reach out on your WhatsApp within 30 minutes with high-resolution digital mockups and pricing.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <Link
                href="/"
                className="flex-1 py-3 rounded-full bg-white text-black font-black text-xs uppercase tracking-wider hover:bg-neutral-200 transition-colors text-center"
              >
                Back to Store
              </Link>
              <button
                type="button"
                onClick={() => {
                  setSubmittedToken(null);
                  setUploadedFile(null);
                  setUploadedPreviewUrl(null);
                  setCustomerName("");
                  setWhatsappPhone("");
                  setNotes("");
                }}
                className="flex-1 py-3 rounded-full bg-neutral-800 hover:bg-neutral-700 text-white font-black text-xs uppercase tracking-wider transition-colors text-center"
              >
                Create Another
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}

