"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useIsNativeApp } from "@/lib/platform";
import {
  GarmentMockupPreview,
  GARMENT_COLORS,
  GarmentType,
  GarmentColorOption,
  PlacementPosition,
  PrintTransform,
} from "@/components/customize/GarmentMockupPreview";
import {
  DEFAULT_APPAREL_BASES,
  PresetDesign,
  ApparelBaseConfig,
} from "@/lib/customDesignPresets";
import { IMAGE_VARIANTS } from "@/services/imageOptimizationService";
import {
  Upload,
  ArrowLeft,
  CheckCircle2,
  X,
  Palette,
  Shirt,
  Send,
  AlertCircle,
  Phone,
  User,
  Mail,
  Clock,
  ShieldCheck,
} from "lucide-react";

export default function CustomizePage() {
  const isNativeApp = useIsNativeApp();

  // Mode selection: 'upload' (customer file) | 'vault' (admin presets)
  const [designMode, setDesignMode] = useState<"upload" | "vault">("upload");

  // Dynamic Catalog Configs (Admin Controlled)
  const [apparelBases, setApparelBases] = useState<ApparelBaseConfig[]>(DEFAULT_APPAREL_BASES);
  const [selectedBase, setSelectedBase] = useState<ApparelBaseConfig>(DEFAULT_APPAREL_BASES[0]);
  const [presetVault, setPresetVault] = useState<PresetDesign[]>([]);

  // Garment base settings
  const [selectedGarment, setSelectedGarment] = useState<GarmentType>("oversized_tee");
  const [selectedColor, setSelectedColor] = useState<GarmentColorOption>(GARMENT_COLORS[0]);
  const [selectedPlacement, setSelectedPlacement] = useState<PlacementPosition>("front_chest");
  const [removeBackground, setRemoveBackground] = useState<boolean>(false);
  const [cutoutBlob, setCutoutBlob] = useState<Blob | null>(null);
  const [printTransform, setPrintTransform] = useState<PrintTransform>({
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  });
  const [selectedSize, setSelectedSize] = useState<string>("L");
  const [quantity, setQuantity] = useState<number>(1);

  const handleSelectApparelBase = (base: ApparelBaseConfig) => {
    setSelectedGarment(base.id);
    setSelectedBase(base);
    if (base.availableSizes && base.availableSizes.length > 0) {
      if (!base.availableSizes.includes(selectedSize)) {
        setSelectedSize(base.availableSizes.includes("L") ? "L" : base.availableSizes[0]);
      }
    }
  };

  // Vault preset selection
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activePreset, setActivePreset] = useState<PresetDesign | null>(null);
  const [linkedFromHomepage, setLinkedFromHomepage] = useState<boolean>(false);

  const applyPresetDefaults = (preset: PresetDesign, availableBases: ApparelBaseConfig[]) => {
    setActivePreset(preset);
    setDesignMode("vault");
    setSelectedCategory("all");
    setPrintTransform({ scale: 1, offsetX: 0, offsetY: 0 });

    // Auto-select recommended garment color when matched
    if (preset.recommendedGarmentColor) {
      const targetColor = preset.recommendedGarmentColor.trim().toLowerCase();
      const matchedColor = GARMENT_COLORS.find(
        (c) =>
          c.name.toLowerCase() === targetColor ||
          c.name.toLowerCase().includes(targetColor) ||
          targetColor.includes(c.name.toLowerCase())
      );
      if (matchedColor) setSelectedColor(matchedColor);
    }

    // Auto-select recommended print placement when valid
    const rawPlacement = String(preset.placement || "").toLowerCase();
    if (rawPlacement === "back_large" || rawPlacement === "back") {
      setSelectedPlacement("back");
    } else if (rawPlacement === "pocket_left" || rawPlacement === "pocket") {
      setSelectedPlacement("pocket");
    } else if (rawPlacement === "full_front") {
      setSelectedPlacement("full_front");
    } else if (rawPlacement === "front_chest") {
      setSelectedPlacement("front_chest");
    }

    // Smartly match apparel base from title/category (e.g. Tote Bag -> tote_bag, Hoodie -> hoodie)
    const hintText = `${preset.title || ""} ${preset.category || ""}`.toLowerCase();
    if (hintText.includes("tote") || hintText.includes("bag")) {
      const toteBase = availableBases.find((b) => b.id === "tote_bag" || b.name.toLowerCase().includes("tote"));
      if (toteBase) {
        setSelectedBase(toteBase);
        setSelectedGarment(toteBase.id as GarmentType);
        if (toteBase.availableSizes?.length) setSelectedSize(toteBase.availableSizes[0]);
      }
    } else if (hintText.includes("hoodie") || hintText.includes("fleece")) {
      const hoodieBase = availableBases.find((b) => b.id === "hoodie" || b.name.toLowerCase().includes("hoodie"));
      if (hoodieBase) {
        setSelectedBase(hoodieBase);
        setSelectedGarment(hoodieBase.id as GarmentType);
        if (hoodieBase.availableSizes?.length) {
          setSelectedSize(hoodieBase.availableSizes.includes("L") ? "L" : hoodieBase.availableSizes[0]);
        }
      }
    }
  };

  // Load Admin configurations (GSM, Pricing, Unified Cloudinary CDN Artwork Vault) & honor ?design=<id> deep-link
  useEffect(() => {
    const searchParams =
      typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const requestedDesignId = (
      searchParams?.get("design") ||
      searchParams?.get("preset") ||
      searchParams?.get("template") ||
      ""
    ).trim();

    fetch("/api/custom-design/config")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          let loadedBases = DEFAULT_APPAREL_BASES;
          if (Array.isArray(json.data.apparelBases) && json.data.apparelBases.length > 0) {
            loadedBases = json.data.apparelBases;
            setApparelBases(loadedBases);
            setSelectedBase(loadedBases[0]);
            setSelectedGarment(loadedBases[0].id);
          }

          if (Array.isArray(json.data.presets) && json.data.presets.length > 0) {
            const loadedPresets: PresetDesign[] = json.data.presets;
            setPresetVault(loadedPresets);

            if (requestedDesignId) {
              const matched = loadedPresets.find(
                (p) =>
                  String(p.id).toLowerCase() === requestedDesignId.toLowerCase() ||
                  encodeURIComponent(String(p.id)).toLowerCase() === requestedDesignId.toLowerCase()
              );
              if (matched) {
                applyPresetDefaults(matched, loadedBases);
                setLinkedFromHomepage(true);
                return;
              }
            }

            setActivePreset(loadedPresets[0]);
            setDesignMode("vault");
          } else {
            setPresetVault([]);
            setActivePreset(null);
            setDesignMode("upload");
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
      ["bengali", "🎨 Bengali Folk"],
      ["streetwear", "🔥 Streetwear"],
      ["minimal", "✦ Minimalist"],
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
    return ["S", "M", "L", "XL", "XXL"];
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

  // Form submission
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
      formData.append("removeBackground", removeBackground ? "true" : "false");

      const hasCustomOffset =
        printTransform.scale !== 1 || printTransform.offsetX !== 0 || printTransform.offsetY !== 0;
      const positioningSummary = hasCustomOffset
        ? `[Print Layout: Scale ${Math.round(printTransform.scale * 100)}%, X ${Math.round(printTransform.offsetX * 100)}, Y ${Math.round(printTransform.offsetY * 100)}]`
        : "";
      const combinedNotes = [notes.trim(), positioningSummary].filter(Boolean).join(" | ");
      formData.append("notes", combinedNotes);

      if (removeBackground && cutoutBlob) {
        formData.append("cutoutArtworkFile", cutoutBlob, `cutout_${Date.now()}.png`);
      }

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

  // Cohesive Theme Tokens (Warm Luxury Ivory + Champagne Gold on Android App; Obsidian + Metallic Gold on Web)
  const cardSurface = isNativeApp
    ? "bg-white border border-[#E6CA82]/80 shadow-[0_8px_24px_rgba(166,124,28,0.08)]"
    : "bg-zinc-900 border border-zinc-800/90 shadow-xl";

  const subSurface = isNativeApp
    ? "bg-[#FFFBF0] border border-[#E6CA82]/70"
    : "bg-black/80 border border-zinc-800";

  const headingText = isNativeApp ? "text-[#14120F]" : "text-white";
  const bodyMuted = isNativeApp ? "text-[#5C4E35]" : "text-zinc-400";
  const accentText = isNativeApp ? "text-[#9A6503]" : "text-amber-300";
  const priceText = isNativeApp ? "text-[#0F766E]" : "text-emerald-400";
  const inputSurface = isNativeApp
    ? "bg-[#FFFDF8] border border-[#DEC278] text-[#14120F] placeholder:text-[#8A7856] focus:border-[#B88214]"
    : "bg-black border border-zinc-800 text-white placeholder:text-zinc-600 focus:border-amber-400";

  return (
    <div
      className={`min-h-screen selection:bg-amber-400 selection:text-black ${
        isNativeApp
          ? "bg-gradient-to-b from-[#FFFFFF] via-[#FFFDF6] to-[#FCF3D8] text-[#14120F]"
          : "bg-[#070708] text-white"
      }`}
    >
      <Header title="Custom Studio" subtitle="LIVE TRY-VIEW STUDIO ✦" />

      {/* Main Studio Container */}
      <main className="mx-auto w-full max-w-[1400px] px-4 md:px-8 py-5 sm:py-8 pb-24 sm:pb-12">
        {/* Top Single-Line Navigation Bar */}
        <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6">
          <Link
            href="/"
            className={`inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-bold transition-colors cursor-pointer group whitespace-nowrap shrink-0 ${
              isNativeApp ? "text-[#4A3C22] hover:text-[#9A6503]" : "text-zinc-400 hover:text-amber-300"
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to Store</span>
          </Link>

          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider whitespace-nowrap shrink-0 border ${
              isNativeApp
                ? "bg-[#FFF6D6] border-[#DFB953] text-[#8A5800]"
                : "bg-amber-400/15 border-amber-400/35 text-amber-300"
            }`}
          >
            <span>Print On Demand</span>
          </div>
        </div>

        {/* Single-Line Luxury Studio Header */}
        <div className="mb-5 sm:mb-8">
          <h1 className="whitespace-nowrap text-[clamp(1.3rem,5.7vw,2.65rem)] font-black uppercase tracking-tight leading-tight">
            <span className={headingText}>Custom </span>
            <span
              className={
                isNativeApp
                  ? "bg-gradient-to-r from-[#8C5800] via-[#C98B0E] to-[#9A6503] bg-clip-text text-transparent"
                  : "bg-gradient-to-r from-[#FEF08A] via-[#F5C542] to-[#D97706] bg-clip-text text-transparent"
              }
            >
              Design Studio
            </span>
          </h1>
          <p className={`text-[11px] sm:text-sm font-medium mt-1.5 max-w-2xl leading-relaxed ${bodyMuted}`}>
            Pick an artwork or upload your own — preview real size-wise tees, hoodies &amp; totes live in every color before we print across India.
          </p>
        </div>

        {/* 2-Column Responsive Studio Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 lg:gap-10 items-start">
          {/* Left Column: Real Studio Garment Try-View Canvas (Sticky on Desktop) */}
          <div className="lg:col-span-5 xl:col-span-5 lg:sticky lg:top-24 space-y-3.5">
            {linkedFromHomepage && activePreset && (
              <div
                className={`flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold border ${
                  isNativeApp
                    ? "bg-[#FFF6D6] border-[#DFB953] text-[#7A4E00]"
                    : "bg-amber-400/15 border-amber-400/35 text-amber-200"
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="truncate">Loaded &ldquo;{activePreset.title}&rdquo; — ready to preview</span>
                </span>
                <button
                  type="button"
                  onClick={() => setLinkedFromHomepage(false)}
                  aria-label="Dismiss notice"
                  className="opacity-70 hover:opacity-100 cursor-pointer shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <GarmentMockupPreview
              garmentType={selectedGarment}
              garmentLabel={selectedBase?.name}
              apparelBases={apparelBases}
              onSelectApparelBase={handleSelectApparelBase}
              selectedColor={selectedColor}
              selectedSize={selectedSize}
              designImageSrc={activeArtworkUrl}
              designTitle={activeArtworkTitle}
              placement={selectedPlacement}
              removeBackground={removeBackground}
              onRemoveBackgroundChange={setRemoveBackground}
              onCutoutBlobReady={setCutoutBlob}
              printTransform={printTransform}
              onPrintTransformChange={setPrintTransform}
              isSubmitting={isSubmitting}
            />

            {/* Live Pricing & Spec Bar */}
            <div className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl ${cardSurface}`}>
              <div className="min-w-0">
                <span className={`text-[10px] font-bold uppercase tracking-wider block ${bodyMuted}`}>
                  Selected Apparel
                </span>
                <span className={`text-xs font-black truncate block ${headingText}`}>
                  {selectedBase?.name}{" "}
                  <span className={`font-mono ${accentText}`}>({selectedBase?.gsm})</span>
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className={`text-[10px] font-bold uppercase tracking-wider block ${bodyMuted}`}>
                  Estimated Price
                </span>
                <span className={`text-base font-black font-mono ${priceText}`}>
                  ₹{estimatedTotal}
                </span>
              </div>
            </div>

            {/* Quality & Production Guarantees */}
            <div className={`grid grid-cols-3 gap-2 p-3 rounded-2xl text-center ${cardSurface}`}>
              <div className="flex flex-col items-center">
                <Shirt className={`w-4 h-4 mb-1 ${accentText}`} />
                <span className={`text-[10px] font-extrabold whitespace-nowrap ${headingText}`}>100% Combed</span>
                <span className={`text-[9px] font-medium ${bodyMuted}`}>Pure Cotton</span>
              </div>
              <div className="flex flex-col items-center">
                <Clock className={`w-4 h-4 mb-1 ${priceText}`} />
                <span className={`text-[10px] font-extrabold whitespace-nowrap ${headingText}`}>30-Min Proof</span>
                <span className={`text-[9px] font-medium ${bodyMuted}`}>On WhatsApp</span>
              </div>
              <div className="flex flex-col items-center">
                <ShieldCheck className={`w-4 h-4 mb-1 ${accentText}`} />
                <span className={`text-[10px] font-extrabold whitespace-nowrap ${headingText}`}>Fade-Proof</span>
                <span className={`text-[9px] font-medium ${bodyMuted}`}>HD DTF Print</span>
              </div>
            </div>
          </div>

          {/* Right Column: Customization Controls & Contact Deck */}
          <div className="lg:col-span-7 xl:col-span-7 space-y-5">
            {/* Step 1: Design Source Mode Switcher */}
            <div className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl space-y-4 ${cardSurface}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-5 w-1 bg-gradient-to-b from-[#EAB308] to-[#9A6503] rounded-full shrink-0" />
                  <h3 className={`text-xs sm:text-base font-black uppercase tracking-wider whitespace-nowrap truncate ${headingText}`}>
                    Step 1: Choose Artwork
                  </h3>
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider whitespace-nowrap shrink-0 ${accentText}`}>
                  Vault or Upload
                </span>
              </div>

              {/* Mode Switch Tabs */}
              <div className={`grid grid-cols-2 gap-2 p-1.5 rounded-2xl ${subSurface}`}>
                <button
                  type="button"
                  onClick={() => setDesignMode("vault")}
                  className={`py-2.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    designMode === "vault"
                      ? "bg-gradient-to-r from-[#FCE48C] via-[#F2BE38] to-[#D49212] text-[#14120F] shadow-md"
                      : `${bodyMuted} hover:opacity-100`
                  }`}
                >
                  <Palette className="w-3.5 h-3.5 shrink-0" />
                  <span>ZebAlpha Vault</span>
                </button>

                <button
                  type="button"
                  onClick={() => setDesignMode("upload")}
                  className={`py-2.5 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    designMode === "upload"
                      ? "bg-gradient-to-r from-[#FCE48C] via-[#F2BE38] to-[#D49212] text-[#14120F] shadow-md"
                      : `${bodyMuted} hover:opacity-100`
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 shrink-0" />
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
                    <div className={`p-3 rounded-2xl flex items-center justify-between gap-3 ${subSurface}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-12 h-12 rounded-xl overflow-hidden shrink-0 flex items-center justify-center p-1 border ${isNativeApp ? "bg-white border-[#E6CA82]" : "bg-zinc-900 border-zinc-700"}`}>
                          <img
                            src={uploadedPreviewUrl}
                            alt="Uploaded artwork"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className={`text-xs font-bold truncate ${headingText}`}>
                            {uploadedFile?.name}
                          </p>
                          <p className={`text-[10px] font-semibold ${priceText}`}>
                            {uploadedFile ? `${(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready for print` : ""}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer ${
                          isNativeApp
                            ? "bg-[#14120F] text-white"
                            : "bg-zinc-800 hover:bg-zinc-700 text-white"
                        }`}
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all group ${
                        isNativeApp
                          ? "border-[#DEC278] hover:border-[#B88214] bg-[#FFFBF0]"
                          : "border-zinc-700 hover:border-amber-400/80 bg-black/40 hover:bg-zinc-900/50"
                      }`}
                    >
                      <Upload className={`w-8 h-8 mx-auto mb-2 transition-colors ${accentText}`} />
                      <p className={`text-xs font-bold ${headingText}`}>
                        Tap to choose or drop your artwork here
                      </p>
                      <p className={`text-[10px] mt-1 ${bodyMuted}`}>
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
                        className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all cursor-pointer border ${
                          selectedCategory === cat.id
                            ? "bg-gradient-to-r from-[#FCE48C] via-[#F2BE38] to-[#D49212] text-[#14120F] border-[#C68A12] shadow-sm"
                            : isNativeApp
                            ? "bg-[#FFFBF0] text-[#4A3C22] border-[#E6CA82]/80 hover:border-[#C68A12]"
                            : "bg-zinc-900 text-zinc-300 border-zinc-800 hover:text-white"
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>

                  {/* Preset Graphics Grid */}
                  {filteredPresets.length === 0 ? (
                    <div className={`p-8 rounded-2xl border border-dashed text-center space-y-2 ${subSurface}`}>
                      <p className={`text-xs font-bold ${headingText}`}>No artwork presets in this category</p>
                      <p className={`text-[10px] ${bodyMuted}`}>
                        Switch to &quot;Upload My Own&quot; to preview &amp; print your custom graphics.
                      </p>
                      <button
                        type="button"
                        onClick={() => setDesignMode("upload")}
                        className="mt-1 px-4 py-1.5 rounded-full bg-gradient-to-r from-[#FCE48C] via-[#F2BE38] to-[#D49212] text-[#14120F] text-[10px] font-black uppercase tracking-wider cursor-pointer"
                      >
                        Upload Custom Graphic
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-[260px] overflow-y-auto pr-1 no-scrollbar">
                      {filteredPresets.map((preset) => {
                        const isSelected = activePreset?.id === preset.id;
                        return (
                          <div
                            key={preset.id}
                            onClick={() => {
                              applyPresetDefaults(preset, apparelBases);
                              setLinkedFromHomepage(false);
                            }}
                            className={`group relative rounded-xl border p-2 flex flex-col items-center cursor-pointer transition-all ${
                              isSelected
                                ? isNativeApp
                                  ? "border-[#C68A12] ring-2 ring-[#EAB308]/30 bg-[#FFF8E1]"
                                  : "border-amber-400 ring-2 ring-amber-400/25 bg-zinc-900"
                                : isNativeApp
                                ? "border-[#E6CA82]/70 bg-[#FFFDF8] hover:border-[#C68A12]"
                                : "border-zinc-800 bg-zinc-950 hover:border-zinc-600"
                            }`}
                          >
                            <div
                              className={`w-full aspect-square rounded-lg overflow-hidden mb-1.5 flex items-center justify-center p-1.5 ${
                                isNativeApp ? "bg-[#F6EFE0]" : "bg-zinc-900"
                              }`}
                            >
                              <img
                                src={IMAGE_VARIANTS.productGridCard(preset.imageUrl)}
                                alt={preset.title}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                            <span className={`text-[10px] font-bold truncate max-w-full text-center ${headingText}`}>
                              {preset.title}
                            </span>
                            {isSelected && (
                              <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-gradient-to-br from-[#FDE047] to-[#CA8A04] flex items-center justify-center text-[#14120F] text-[9px] font-black shadow">
                                ✓
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Step 2: Garment Base Selection */}
            <div className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl space-y-3 ${cardSurface}`}>
              <div className="flex items-center gap-2">
                <span className="h-5 w-1 bg-gradient-to-b from-[#EAB308] to-[#9A6503] rounded-full shrink-0" />
                <h3 className={`text-xs sm:text-base font-black uppercase tracking-wider whitespace-nowrap ${headingText}`}>
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
                      onClick={() => handleSelectApparelBase(base)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelected
                          ? isNativeApp
                            ? "border-[#C68A12] bg-[#FFF6D6] ring-1 ring-[#EAB308]/50 shadow-sm"
                            : "border-amber-400 bg-amber-400/10 ring-1 ring-amber-400/40"
                          : isNativeApp
                          ? "border-[#E6CA82]/75 bg-[#FFFDF8] hover:border-[#C68A12]"
                          : "border-zinc-800 bg-black/80 hover:border-zinc-600"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-[9px] font-black px-1.5 py-0.5 rounded-full font-mono uppercase whitespace-nowrap ${
                            isNativeApp
                              ? "bg-[#F5E6BE] text-[#5C4410]"
                              : "bg-zinc-800 text-emerald-300"
                          }`}
                        >
                          {base.gsm}
                        </span>
                        {base.badge && (
                          <span
                            className={`text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase whitespace-nowrap border ${
                              isNativeApp
                                ? "bg-white text-[#9A6503] border-[#DFB953]"
                                : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                            }`}
                          >
                            {base.badge}
                          </span>
                        )}
                      </div>
                      <div className="mt-2">
                        <p className={`text-xs font-black leading-tight ${headingText}`}>{base.name}</p>
                        <p className={`text-xs font-black mt-1 font-mono ${priceText}`}>
                          ₹{base.basePrice}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 3: Color, Placement & Sizing */}
            <div className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl space-y-5 ${cardSurface}`}>
              <div className="flex items-center gap-2">
                <span className="h-5 w-1 bg-gradient-to-b from-[#EAB308] to-[#9A6503] rounded-full shrink-0" />
                <h3 className={`text-xs sm:text-base font-black uppercase tracking-wider whitespace-nowrap ${headingText}`}>
                  Step 3: Color, Placement &amp; Size
                </h3>
              </div>

              {/* Garment Color Swatches */}
              <div>
                <label className={`text-[11px] font-extrabold block mb-2.5 uppercase tracking-wider ${bodyMuted}`}>
                  Garment Color:{" "}
                  <strong className={accentText}>{selectedColor.name}</strong>
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
                        aria-label={`Select color ${col.name}`}
                        className={`h-9 w-9 rounded-full border-2 transition-all cursor-pointer flex items-center justify-center ${
                          isSelected
                            ? "border-[#D49212] scale-110 ring-2 ring-[#EAB308]/40 shadow-md"
                            : isNativeApp
                            ? "border-[#CBB682] hover:border-[#8A5800]"
                            : "border-zinc-600 hover:border-zinc-300"
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
                <label className={`text-[11px] font-extrabold block mb-2 uppercase tracking-wider ${bodyMuted}`}>
                  Print Placement <span className={`font-semibold normal-case ${accentText}`}>(Auto-Flips Front / Back)</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "front_chest", label: "Front Chest" },
                    { id: "full_front", label: "Full Front" },
                    { id: "pocket", label: "Left Pocket" },
                    { id: "back", label: "Full Back" },
                  ].map((p) => {
                    const active = selectedPlacement === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPlacement(p.id as PlacementPosition)}
                        className={`py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all text-center cursor-pointer border whitespace-nowrap ${
                          active
                            ? "bg-gradient-to-r from-[#FCE48C] via-[#F2BE38] to-[#D49212] text-[#14120F] border-[#C68A12] shadow-sm"
                            : isNativeApp
                            ? "bg-[#FFFBF0] border-[#E6CA82]/80 text-[#3F3626] hover:border-[#C68A12]"
                            : "bg-black/80 border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:text-white"
                        }`}
                      >
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Size & Quantity Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Size Selector */}
                <div>
                  <label className={`text-[11px] font-extrabold block mb-2 uppercase tracking-wider ${bodyMuted}`}>
                    Target Size <span className={`font-semibold normal-case ${accentText}`}>(Updates Try View)</span>
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {currentAvailableSizes.map((sz) => {
                      const active = selectedSize === sz;
                      return (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setSelectedSize(sz)}
                          className={`min-w-[40px] px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                            active
                              ? "bg-gradient-to-r from-[#FCE48C] via-[#F2BE38] to-[#D49212] text-[#14120F] border-[#C68A12] shadow-sm scale-105"
                              : isNativeApp
                              ? "bg-[#FFFBF0] border-[#E6CA82]/80 text-[#2A241A] hover:border-[#C68A12]"
                              : "bg-black border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:text-white"
                          }`}
                        >
                          {sz}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <label className={`text-[11px] font-extrabold block mb-2 uppercase tracking-wider ${bodyMuted}`}>
                    Quantity
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className={`h-9 w-9 rounded-xl font-black flex items-center justify-center text-sm border cursor-pointer ${
                        isNativeApp
                          ? "bg-[#FFF6D6] border-[#DFB953] text-[#14120F] hover:bg-[#FBEBA8]"
                          : "bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white"
                      }`}
                    >
                      −
                    </button>
                    <span className={`text-base font-black w-8 text-center ${headingText}`}>
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => q + 1)}
                      className={`h-9 w-9 rounded-xl font-black flex items-center justify-center text-sm border cursor-pointer ${
                        isNativeApp
                          ? "bg-[#FFF6D6] border-[#DFB953] text-[#14120F] hover:bg-[#FBEBA8]"
                          : "bg-zinc-800 border-zinc-700 hover:bg-zinc-700 text-white"
                      }`}
                    >
                      +
                    </button>
                    <span className={`text-[10px] font-bold ml-1 ${priceText}`}>
                      {quantity >= 5 ? "Bulk Pricing Applied" : "Single Print Supported"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4: Contact & Submission Form */}
            <form
              onSubmit={handleSubmit}
              className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl space-y-4 ${cardSurface}`}
            >
              <div className="flex items-center gap-2">
                <span className="h-5 w-1 bg-gradient-to-b from-[#EAB308] to-[#9A6503] rounded-full shrink-0" />
                <h3 className={`text-xs sm:text-base font-black uppercase tracking-wider whitespace-nowrap ${headingText}`}>
                  Step 4: Contact &amp; Order
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className={`text-[11px] font-bold block mb-1 ${headingText}`}>
                    Your Full Name <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <User className={`absolute left-3 top-3 w-4 h-4 ${bodyMuted}`} />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Adhikary"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-xs focus:outline-none ${inputSurface}`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`text-[11px] font-bold block mb-1 ${headingText}`}>
                    WhatsApp / Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className={`absolute left-3 top-3 w-4 h-4 ${bodyMuted}`} />
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 9876543210"
                      value={whatsappPhone}
                      onChange={(e) => setWhatsappPhone(e.target.value)}
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-xs focus:outline-none ${inputSurface}`}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className={`text-[11px] font-bold block mb-1 ${headingText}`}>
                  Email Address <span className={`font-normal ${bodyMuted}`}>(Optional)</span>
                </label>
                <div className="relative">
                  <Mail className={`absolute left-3 top-3 w-4 h-4 ${bodyMuted}`} />
                  <input
                    type="email"
                    placeholder="e.g. yourname@gmail.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-xs focus:outline-none ${inputSurface}`}
                  />
                </div>
              </div>

              <div>
                <label className={`text-[11px] font-bold block mb-1 ${headingText}`}>
                  Special Instructions / Print Notes <span className={`font-normal ${bodyMuted}`}>(Optional)</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Please keep front print vibrant with high color saturation..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className={`w-full p-3 rounded-xl text-xs focus:outline-none resize-none ${inputSurface}`}
                />
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/35 flex items-center gap-2 text-rose-500 text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Order Summary & Pricing Breakdown */}
              <div className={`p-4 rounded-2xl space-y-2 ${subSurface}`}>
                <div className="flex items-center justify-between text-xs">
                  <span className={bodyMuted}>Garment Base:</span>
                  <span className={`font-bold ${headingText}`}>
                    {selectedBase?.name} ({selectedBase?.gsm})
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className={bodyMuted}>Color &amp; Size:</span>
                  <span className={`font-bold ${headingText}`}>
                    {selectedColor.name} • {selectedSize}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className={bodyMuted}>Design Background:</span>
                  <span className={`font-bold ${removeBackground ? priceText : headingText}`}>
                    {removeBackground ? "Removed (Transparent Cutout)" : "Original (With BG)"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className={bodyMuted}>Unit Price × Qty:</span>
                  <span className={`font-mono font-bold ${headingText}`}>
                    ₹{unitPrice} × {quantity} Pc(s)
                  </span>
                </div>
                <div
                  className={`pt-2 border-t flex items-center justify-between ${
                    isNativeApp ? "border-[#E6CA82]" : "border-zinc-800"
                  }`}
                >
                  <span className={`text-xs font-black uppercase tracking-wider ${headingText}`}>
                    Estimated Total:
                  </span>
                  <span className={`text-base font-black font-mono ${priceText}`}>
                    ₹{estimatedTotal}
                  </span>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-full bg-gradient-to-r from-[#FCE48C] via-[#F2BE38] to-[#D49212] hover:brightness-105 active:scale-[0.98] text-[#14120F] font-black uppercase tracking-wider text-xs sm:text-sm transition-all shadow-[0_10px_28px_rgba(212,146,18,0.32)] border border-[#C68A12]/40 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-[#14120F] border-t-transparent animate-spin" />
                    <span>Submitting Custom Design...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Custom Design Order</span>
                  </>
                )}
              </button>

              <p className={`text-[10px] text-center ${bodyMuted}`}>
                🔒 Direct Production Pipeline • Free proof mockup shared on your WhatsApp within 30 minutes.
              </p>
            </form>
          </div>
        </div>
      </main>

      {/* Success Confirmation Modal */}
      {submittedToken && (
        <div
          data-keep-dark="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div className="w-full max-w-md rounded-3xl bg-zinc-950 border border-amber-400/50 p-6 sm:p-8 text-center space-y-4 shadow-2xl relative text-white">
            <div className="h-16 w-16 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 mx-auto flex items-center justify-center shadow-[0_0_30px_rgba(251,191,36,0.35)]">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 bg-amber-400/15 px-3 py-1 rounded-full border border-amber-400/30">
                Order Received
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-tight pt-2">
                Design Submitted!
              </h2>
              <p className="text-xs text-zinc-300 font-medium">
                Your custom design proof has been received by our production team under reference{" "}
                <strong className="text-amber-300 font-mono">#{submittedToken}</strong>.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-left text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-zinc-400">Garment Base:</span>
                <span className="font-bold text-white">{selectedBase?.name} ({selectedBase?.gsm})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Est. Total:</span>
                <span className="font-bold text-emerald-400 font-mono">₹{estimatedTotal} ({quantity} Pc)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Color &amp; Size:</span>
                <span className="font-bold text-white">{selectedColor.name} • {selectedSize}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Design Background:</span>
                <span className="font-bold text-emerald-400">
                  {removeBackground ? "Removed (Cutout PNG)" : "Original (With BG)"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Target Contact:</span>
                <span className="font-bold text-amber-300">+{whatsappPhone}</span>
              </div>
            </div>

            <p className="text-[11px] text-zinc-400">
              Our print specialist will reach out on your WhatsApp within 30 minutes with your final digital mockup and confirmation.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <Link
                href="/"
                className="flex-1 py-3 rounded-full bg-gradient-to-r from-[#FCE48C] via-[#F2BE38] to-[#D49212] text-[#14120F] font-black text-xs uppercase tracking-wider text-center"
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
                className="flex-1 py-3 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white font-black text-xs uppercase tracking-wider transition-colors text-center cursor-pointer"
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
