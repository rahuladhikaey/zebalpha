"use client";

import React, { useState } from "react";
import { X, CheckCircle2, ChevronRight, ChevronLeft, UploadCloud, AlertTriangle } from "lucide-react";
import Step1AddProduct from "./Step1AddProduct";
import Step2BasicDetails from "./Step2BasicDetails";
import Step3AdditionalDetails from "./Step3AdditionalDetails";
import Step4AddVariants, { type CatalogVariant } from "./Step4AddVariants";
import {
  type SizeVariantDetail,
  type SizeMeasurementDetail,
  type MeasurementUnit,
} from "./SizeSpecificDetailsSection";
import type { Category } from "@shared/types";
import { supabase } from "@shared/utils/supabaseClient";
import { uploadToCloudinary } from "@shared/services";

export interface CatalogUploadWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellerId: string;
  categories: Category[];
  editingProduct?: any | null;
  onSuccess: () => void;
}

export interface MasterCatalogFormState {
  // Step 1
  category_id: string;
  subcategory_id: string;
  subcategory_name: string;
  images: string[];
  front_image_index: number;
  name: string;
  description: string;

  // Step 1: Meesho-Style Dynamic Size & Measurements
  selected_sizes: string[];
  size_details: SizeVariantDetail[];
  measurement_unit: MeasurementUnit;
  size_measurements: SizeMeasurementDetail[];
  is_measurements_enabled: boolean;

  // Step 2
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

  // Step 3
  style_code: string;
  volumetric_weight: string;
  brand: string;
  is_premium: boolean;
  is_new_drop: boolean;
  collection: string;
  target_drop_date: string;
  tier: string;

  // Step 4: Variants & Size Chart
  has_variants: boolean;
  variants: CatalogVariant[];
  single_stock: string;
  single_sku: string;
  size_chart_columns?: string[];
  size_chart_notes?: string;
  size_chart_image?: string;
}

const INITIAL_FORM_STATE: MasterCatalogFormState = {
  category_id: "",
  subcategory_id: "",
  subcategory_name: "",
  images: [],
  front_image_index: 0,
  name: "",
  description: "",

  selected_sizes: [],
  size_details: [],
  measurement_unit: "inches",
  size_measurements: [],
  is_measurements_enabled: true,
  size_chart_columns: ["Chest", "Length", "Shoulder", "Sleeve"],
  size_chart_notes: "All measurements are garment dimensions in inches. Measure flat across chest from armhole to armhole.",
  size_chart_image: "",

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
  packer_same_as_manufacturer: true,
  packer_name: "",
  packer_address: "",
  packer_pincode: "",

  price: "",
  defective_returns_price: "",
  mrp: "",

  style_code: "",
  volumetric_weight: "",
  brand: "zebalpha",
  is_premium: false,
  is_new_drop: false,
  collection: "",
  target_drop_date: "",
  tier: "STANDARD",

  has_variants: false,
  variants: [],
  single_stock: "20",
  single_sku: "",
};

const STEPS = [
  { id: 1, title: "Add Product", desc: "Category & Media" },
  { id: 2, title: "Basic Details", desc: "Specs & Pricing" },
  { id: 3, title: "Additional Details", desc: "Logistics & Brand" },
  { id: 4, title: "Add Variant(s)", desc: "Inventory & Sizes" },
];

export default function CatalogUploadWizardModal({
  isOpen,
  onClose,
  sellerId,
  categories,
  editingProduct,
  onSuccess,
}: CatalogUploadWizardModalProps): React.JSX.Element | null {
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<MasterCatalogFormState>(INITIAL_FORM_STATE);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const modalBodyRef = React.useRef<HTMLDivElement>(null);

  const scrollModalToTop = () => {
    setTimeout(() => {
      modalBodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }, 40);
  };

  React.useEffect(() => {
    if (editingProduct) {
      const specs = (editingProduct.specifications as any) || {};
      const imgList = Array.isArray(editingProduct.images) && editingProduct.images.length > 0
        ? editingProduct.images
        : editingProduct.image_url
        ? [editingProduct.image_url]
        : [];

      // Parse existing packages if editing
      const existingPackages = Array.isArray(editingProduct.packages) ? editingProduct.packages : [];
      const hasVars = existingPackages.length > 0 && !(existingPackages.length === 1 && (existingPackages[0].name === "Standard" || existingPackages[0].name === "Standard Package"));

      const loadedVariants: CatalogVariant[] = existingPackages.map((pkg: any) => ({
        id: String(pkg.id || Math.random().toString(36).substring(2, 9)),
        size: pkg.size || (pkg.name?.includes(" / ") ? pkg.name.split(" / ")[1] : pkg.name?.includes(" - ") ? pkg.name.split(" - ")[1] : pkg.name || "Free Size"),
        color: pkg.color || (pkg.name?.includes(" / ") ? pkg.name.split(" / ")[0] : pkg.name?.includes(" - ") ? pkg.name.split(" - ")[0] : "Black"),
        color_hex: pkg.color_hex || undefined,
        sku: pkg.sku || "",
        stock: String(pkg.stock ?? 20),
        price: String(pkg.price ?? editingProduct.price ?? ""),
        defective_returns_price: String((editingProduct.specifications as any)?.defective_returns_price || ""),
        mrp: String(pkg.mrp ?? editingProduct.mrp ?? ""),
        image_url: pkg.image_url || undefined,
        gallery: Array.isArray(pkg.gallery) ? pkg.gallery : pkg.image_url ? [pkg.image_url] : [],
        is_active: pkg.stock === undefined || Number(pkg.stock) > 0,
      }));

      // Parse existing sizes and measurements for Step 1 Meesho-style tables
      const loadedSizes: string[] = Array.from(
        new Set(
          existingPackages
            .map((p: any) => p.size || (p.name?.includes(" / ") ? p.name.split(" / ")[1] : p.name?.includes(" - ") ? p.name.split(" - ")[1] : p.name))
            .filter((s: any) => s && s !== "Standard" && s !== "Standard Package")
        )
      );

      const loadedSizeDetails: SizeVariantDetail[] = existingPackages
        .filter((pkg: any) => pkg.name !== "Standard" || loadedSizes.length > 0)
        .map((pkg: any) => {
          const sz = pkg.size || (pkg.name?.includes(" / ") ? pkg.name.split(" / ")[1] : pkg.name?.includes(" - ") ? pkg.name.split(" - ")[1] : pkg.name || "Free Size");
          return {
            id: String(pkg.id || Math.random().toString(36).substring(2, 9)),
            size: sz,
            mrp: String(pkg.mrp ?? editingProduct.mrp ?? ""),
            selling_price: String(pkg.price ?? editingProduct.price ?? ""),
            inventory: String(pkg.stock ?? 20),
            sku: pkg.sku || "",
            return_price: String(pkg.return_price ?? (editingProduct.specifications as any)?.defective_returns_price ?? ""),
          };
        });

      const existingSizeChart = specs.size_chart;
      const loadedUnit: MeasurementUnit = existingSizeChart?.unit === "cm" ? "cm" : "inches";
      const loadedColumns: string[] = Array.isArray(existingSizeChart?.columns)
        ? existingSizeChart.columns
        : ["Chest", "Length", "Shoulder", "Sleeve"];
      const loadedNotes: string = existingSizeChart?.notes || "";
      const loadedChartImage: string = existingSizeChart?.chart_image || "";
      const loadedMeasurements: SizeMeasurementDetail[] = Array.isArray(existingSizeChart?.rows)
        ? existingSizeChart.rows.map((r: any) => ({
            size: r.size,
            bust_chest: r.bust_chest || r.chest || r.bust || "",
            waist: r.waist || "",
            shoulder: r.shoulder || "",
            length: r.length || "",
            hip: r.hip || "",
            sleeve_length: r.sleeve_length || r.sleeve || "",
            inseam: r.inseam || "",
            thigh: r.thigh || "",
            ...r,
          }))
        : [];

      setForm({
        category_id: String(editingProduct.category_id || ""),
        subcategory_id: "",
        subcategory_name: editingProduct.category || "",
        images: imgList,
        front_image_index: 0,
        name: editingProduct.name || "",
        description: editingProduct.description || "",

        selected_sizes: loadedSizes,
        size_details: loadedSizeDetails,
        measurement_unit: loadedUnit,
        size_measurements: loadedMeasurements,
        is_measurements_enabled: Boolean(existingSizeChart && loadedMeasurements.length > 0),
        size_chart_columns: loadedColumns,
        size_chart_notes: loadedNotes,
        size_chart_image: loadedChartImage,

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
        packer_same_as_manufacturer: !specs.packer_name || specs.packer_name === specs.manufacturer_name,
        packer_name: specs.packer_name || "",
        packer_address: specs.packer_address || "",
        packer_pincode: specs.packer_pincode || "",

        price: String(editingProduct.price || ""),
        defective_returns_price: String(specs.defective_returns_price || ""),
        mrp: String(editingProduct.mrp || editingProduct.price || ""),

        style_code: specs.style_code || "",
        volumetric_weight: specs.volumetric_weight || "",
        brand: editingProduct.brand || "zebalpha",
        is_premium: editingProduct.is_premium === true || editingProduct.tier === "PREMIUM",
        is_new_drop: editingProduct.is_new_drop === true || editingProduct.status === "COMING_SOON",
        collection: editingProduct.collection || "",
        target_drop_date: editingProduct.target_drop_date || "",
        tier: editingProduct.tier || "STANDARD",

        has_variants: hasVars,
        variants: loadedVariants,
        single_stock: String(editingProduct.stock ?? 20),
        single_sku: editingProduct.sku || "",
      });
    } else {
      setForm(INITIAL_FORM_STATE);
    }
  }, [editingProduct, isOpen]);

  if (!isOpen) return null;

  const updateForm = (updates: Partial<MasterCatalogFormState>) => {
    setForm((prev) => ({ ...prev, ...updates }));
  };

  const validateStep = (step: number): boolean => {
    setErrorMsg("");
    if (step === 1) {
      if (!form.name.trim()) {
        setErrorMsg("Please enter a product title/name.");
        scrollModalToTop();
        return false;
      }
      if (form.images.length === 0) {
        setErrorMsg("Please upload at least 1 product image.");
        scrollModalToTop();
        return false;
      }
      // If sizes were selected, validate selling price on those rows
      if (form.selected_sizes.length > 0 && form.size_details.length > 0) {
        for (const sd of form.size_details) {
          if (sd.selling_price && parseFloat(sd.selling_price) <= 0) {
            setErrorMsg(`Selling price for size ${sd.size} must be greater than 0.`);
            scrollModalToTop();
            return false;
          }
          if (sd.mrp && sd.selling_price && parseFloat(sd.mrp) < parseFloat(sd.selling_price)) {
            setErrorMsg(`MRP cannot be less than selling price for size ${sd.size}.`);
            scrollModalToTop();
            return false;
          }
        }
      }
    } else if (step === 2 && !form.is_new_drop) {
      const hasSizeDetails = form.size_details && form.size_details.length > 0;
      const hasVariants = form.has_variants && form.variants.length > 0;
      const effectivePrice = form.price || 
        (hasSizeDetails ? form.size_details[0]?.selling_price : "") ||
        (hasVariants ? form.variants[0]?.price : "");
      const effectiveMrp = form.mrp || 
        (hasSizeDetails ? form.size_details[0]?.mrp || effectivePrice : "") ||
        (hasVariants ? form.variants[0]?.mrp || effectivePrice : "");

      if (!hasVariants && (!effectivePrice || parseFloat(effectivePrice) <= 0)) {
        setErrorMsg("Please enter a valid listing price.");
        scrollModalToTop();
        return false;
      }
      if (!hasVariants && (!effectiveMrp || parseFloat(effectiveMrp) <= 0)) {
        setErrorMsg("Please enter a valid MRP.");
        scrollModalToTop();
        return false;
      }
      if (!form.fabric) {
        setErrorMsg("Please select fabric/material.");
        scrollModalToTop();
        return false;
      }
    } else if (step === 4 && !form.is_new_drop) {
      if (!form.has_variants) {
        if (!form.single_stock || parseInt(form.single_stock) < 0) {
          setErrorMsg("Please enter a valid stock quantity.");
          scrollModalToTop();
          return false;
        }
      } else {
        if (form.variants.length === 0) {
          setErrorMsg("Please add at least 1 color/size variant or disable multi-variants.");
          scrollModalToTop();
          return false;
        }
        for (const v of form.variants) {
          const vPrice = parseFloat(v.price);
          if (isNaN(vPrice) || vPrice <= 0) {
            setErrorMsg(`Please enter a valid price greater than 0 for variant ${v.color || ''} - ${v.size}.`);
            scrollModalToTop();
            return false;
          }
        }
      }
    }
    return true;
  };

  const validateAllSteps = (): boolean => {
    setErrorMsg("");

    // Step 1 check
    if (!form.name.trim()) {
      setErrorMsg("Please enter a product title/name.");
      setCurrentStep(1);
      scrollModalToTop();
      return false;
    }
    if (form.images.length === 0) {
      setErrorMsg("Please upload at least 1 product image.");
      setCurrentStep(1);
      scrollModalToTop();
      return false;
    }

    // Step 2 & 4 price check
    const hasVariants = form.has_variants && form.variants.length > 0;
    const hasSizeDetails = form.size_details && form.size_details.length > 0;

    const variantPrices = hasVariants
      ? form.variants.map((v) => parseFloat(v.price) || 0).filter((p) => p > 0)
      : [];
    const sizePrices = hasSizeDetails
      ? form.size_details.map((sd) => parseFloat(sd.selling_price) || 0).filter((p) => p > 0)
      : [];

    const effectivePrice =
      parseFloat(form.price) ||
      (variantPrices.length > 0 ? Math.min(...variantPrices) : 0) ||
      (sizePrices.length > 0 ? Math.min(...sizePrices) : 0);

    if (!form.is_new_drop && (!effectivePrice || effectivePrice <= 0)) {
      setErrorMsg("Please provide a valid listing price (greater than ₹0).");
      if (hasVariants) setCurrentStep(4);
      else setCurrentStep(2);
      scrollModalToTop();
      return false;
    }

    // Step 4 variants check
    if (!form.is_new_drop && form.has_variants) {
      if (form.variants.length === 0) {
        setErrorMsg("Multi-variants are enabled. Please add at least 1 color variant with sizes, or disable multi-variants.");
        setCurrentStep(4);
        scrollModalToTop();
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(4, prev + 1));
    }
  };

  const handleBack = () => {
    setErrorMsg("");
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmitCatalog = async () => {
    if (!validateAllSteps()) return;

    setSubmitting(true);
    setErrorMsg("");
    setUploadStatus("Preparing product catalog...");

    try {
      // Rearrange images so cover image is at index 0
      const orderedImages = [...form.images];
      if (form.front_image_index > 0 && form.front_image_index < orderedImages.length) {
        const coverImg = orderedImages.splice(form.front_image_index, 1)[0];
        orderedImages.unshift(coverImg);
      }

      // 1. Upload & optimize images to Supabase Storage if they are base64 strings
      setUploadStatus("Uploading & optimizing product images...");
      const uploadedImagesList = await Promise.all(
        orderedImages.map(async (img) => {
          if (typeof img === "string" && img.startsWith("data:image/")) {
            try {
              return await uploadToCloudinary(img);
            } catch (err) {
              console.warn("Notice compressing catalog image:", err);
              return img;
            }
          }
          return img;
        })
      );

      const coverImageUrl = uploadedImagesList[0] || "";

      // 2. Upload variant images & color galleries if any are base64 strings
      let processedVariants = [...form.variants];
      if (form.has_variants && form.variants.length > 0) {
        setUploadStatus("Processing color variant photos & galleries...");
        processedVariants = await Promise.all(
          form.variants.map(async (v) => {
            let updatedV = { ...v };
            if (v.image_url && typeof v.image_url === "string" && v.image_url.startsWith("data:image/")) {
              try {
                const cloudUrl = await uploadToCloudinary(v.image_url);
                updatedV.image_url = cloudUrl;
              } catch (_) {}
            }
            if (Array.isArray(v.gallery) && v.gallery.length > 0) {
              const uploadedGallery = await Promise.all(
                v.gallery.map(async (gImg) => {
                  if (typeof gImg === "string" && gImg.startsWith("data:image/")) {
                    try {
                      return await uploadToCloudinary(gImg);
                    } catch (_) {
                      return gImg;
                    }
                  }
                  return gImg;
                })
              );
              updatedV.gallery = uploadedGallery;
              if (!updatedV.image_url && uploadedGallery.length > 0) {
                updatedV.image_url = uploadedGallery[0];
              }
            }
            return updatedV;
          })
        );
      }

      // 3. Resolve seller ID & ensure seller profile exists to satisfy foreign key & RLS
      setUploadStatus("Verifying seller profile...");
      let finalSellerId = sellerId;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: s } = await supabase
            .from("sellers")
            .select("id")
            .or(`user_id.eq.${user.id},id.eq.${user.id},email.eq.${user.email?.toLowerCase().trim()}`)
            .maybeSingle();

          if (s?.id) {
            finalSellerId = s.id;
          } else if (!finalSellerId) {
            // Auto-provision seller row so foreign key and RLS pass
            const provisionPayload = {
              id: user.id,
              user_id: user.id,
              email: user.email || "",
              store_name: user.user_metadata?.store_name || user.email?.split("@")[0] || "Seller Store",
              seller_id: `SEL-${Math.floor(100000 + Math.random() * 900000)}`,
              status: "approved",
              account_status: "Active",
              settings_completion_pct: 100,
              created_at: new Date().toISOString()
            };
            const { data: created } = await supabase
              .from("sellers")
              .insert([provisionPayload])
              .select("id")
              .maybeSingle();
            finalSellerId = created?.id || user.id;
          }
        }
      } catch (sellerErr) {
        console.warn("Notice verifying seller record:", sellerErr);
      }

      // Specifications JSON payload
      const specificationsData = {
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
        packer_name: form.packer_same_as_manufacturer ? form.manufacturer_name : form.packer_name,
        packer_address: form.packer_same_as_manufacturer ? form.manufacturer_address : form.packer_address,
        packer_pincode: form.packer_same_as_manufacturer ? form.manufacturer_pincode : form.packer_pincode,
        defective_returns_price: form.defective_returns_price,
        style_code: form.style_code,
        volumetric_weight: form.volumetric_weight,
        is_premium: form.is_premium,
        is_new_drop: form.is_new_drop,
        collection: form.collection,
        target_drop_date: form.target_drop_date,
        tier: form.is_premium ? "PREMIUM" : form.is_new_drop ? "DROP" : "STANDARD",
      };

      // Save size measurements if enabled
      if (form.is_measurements_enabled && form.size_measurements && form.size_measurements.length > 0) {
        (specificationsData as any).size_chart = {
          unit: form.measurement_unit || "inches",
          columns: form.size_chart_columns || ["Chest", "Length", "Shoulder", "Sleeve"],
          rows: form.size_measurements,
          notes: form.size_chart_notes || "",
          chart_image: form.size_chart_image || "",
        };
      }

      // Category ID must be a valid UUID string and match an existing category, else null
      const isValidUuid = (id: any) =>
        Boolean(id) &&
        typeof id === "string" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id).trim());

      let primaryCatId: string | null = null;
      if (isValidUuid(form.category_id)) {
        primaryCatId = String(form.category_id).trim();
      } else if (categories && categories.length > 0 && isValidUuid(String(categories[0]?.id))) {
        primaryCatId = String(categories[0].id).trim();
      }

      const hasSizeDetails = form.size_details && form.size_details.length > 0;
      const hasVariants = form.has_variants && processedVariants.length > 0;

      // Price and MRP resolution (prioritize variants or size details if global price empty)
      let effectivePrice = parseFloat(form.price) || 0;
      if (!effectivePrice && hasVariants) {
        const prices = processedVariants.map((v) => parseFloat(v.price) || 0).filter((p) => p > 0);
        if (prices.length > 0) effectivePrice = Math.min(...prices);
      }
      if (!effectivePrice && hasSizeDetails) {
        const prices = form.size_details.map((sd) => parseFloat(sd.selling_price) || 0).filter((p) => p > 0);
        if (prices.length > 0) effectivePrice = Math.min(...prices);
      }

      let effectiveMrp = parseFloat(form.mrp) || 0;
      if (!effectiveMrp && hasVariants) {
        const mrps = processedVariants.map((v) => parseFloat(v.mrp) || 0).filter((m) => m > 0);
        if (mrps.length > 0) effectiveMrp = Math.max(...mrps);
      }
      if (!effectiveMrp && hasSizeDetails) {
        const mrps = form.size_details.map((sd) => parseFloat(sd.mrp) || 0).filter((m) => m > 0);
        if (mrps.length > 0) effectiveMrp = Math.max(...mrps);
      }
      if (!effectiveMrp) effectiveMrp = effectivePrice;

      // Build packages JSON array for multi-color and multi-size matrix
      const computedPackages = hasVariants
        ? processedVariants.map((v, idx) => ({
            id: v.id || `pkg_${idx}_${Date.now()}`,
            name: v.color && v.color !== "Default" && v.color !== "Standard"
              ? `${v.color} / ${v.size}`
              : v.size || "Standard",
            color: v.color || "Default",
            color_hex: v.color_hex || undefined,
            size: v.size || "Free Size",
            price: parseFloat(v.price) || effectivePrice || 0,
            mrp: parseFloat(v.mrp) || effectiveMrp || parseFloat(v.price) || 0,
            stock: parseInt(v.stock) || 0,
            sku: v.sku || `${form.style_code || 'SKU'}_${v.color || 'COLOR'}_${v.size}`,
            image_url: v.image_url || coverImageUrl,
            gallery: Array.isArray(v.gallery) && v.gallery.length > 0 ? v.gallery : (v.image_url ? [v.image_url] : [coverImageUrl]),
            isBestSeller: idx === 0,
          }))
        : hasSizeDetails
        ? form.size_details.map((sd, idx) => ({
            id: sd.id || `pkg_${idx}_${Date.now()}`,
            name: sd.size,
            color: "Standard",
            size: sd.size,
            price: parseFloat(sd.selling_price) || effectivePrice || 0,
            mrp: parseFloat(sd.mrp) || effectiveMrp || parseFloat(sd.selling_price) || 0,
            stock: parseInt(sd.inventory) || 0,
            sku: sd.sku || `${form.style_code || 'SKU'}-${sd.size.toUpperCase()}`,
            return_price: parseFloat(sd.return_price) || 0,
            image_url: coverImageUrl,
            isBestSeller: idx === 0,
          }))
        : [
            {
              id: `pkg_std_${Date.now()}`,
              name: "Standard",
              color: "Standard",
              size: "Free Size",
              price: effectivePrice || 0,
              mrp: effectiveMrp || effectivePrice || 0,
              stock: parseInt(form.single_stock) || 20,
              sku: form.single_sku || form.style_code || `SKU_${Date.now()}`,
              image_url: coverImageUrl,
              isBestSeller: true,
            }
          ];

      const calculatedStock = form.has_variants
        ? processedVariants.reduce((acc, v) => acc + (parseInt(v.stock) || 0), 0)
        : hasSizeDetails
        ? form.size_details.reduce((acc, d) => acc + (parseInt(d.inventory) || 0), 0)
        : (parseInt(form.single_stock) || 20);

      const generateSlug = (text: string) => {
        const base = text ? text.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "") : "";
        return base ? `${base}-${Date.now().toString(36)}` : `prod-${Date.now().toString(36)}`;
      };

      const computedSlug = (editingProduct?.slug && typeof editingProduct.slug === "string" && editingProduct.slug.trim())
        ? editingProduct.slug.trim()
        : generateSlug(form.name);

      const productPayload: any = {
        id: editingProduct?.id,
        productId: editingProduct?.id,
        name: form.name.trim(),
        slug: computedSlug,
        description: form.description,
        price: effectivePrice,
        mrp: effectiveMrp,
        category_id: primaryCatId,
        image_url: coverImageUrl,
        images: uploadedImagesList,
        specifications: specificationsData,
        brand: form.brand || "zebalpha",
        stock: calculatedStock,
        sku: form.has_variants ? (form.style_code || "MULTI_VARIANT") : (form.single_sku || form.style_code || `SKU_${Date.now()}`),
        status: form.is_new_drop ? "COMING_SOON" : (calculatedStock > 0 ? "IN_STOCK" : "OUT_OF_STOCK"),
        is_active: true,
        is_approved: true,
        approval_status: "approved",
        low_stock_limit: 5,
        seller_id: finalSellerId || null,
        is_premium: form.is_premium,
        is_new_drop: form.is_new_drop,
        collection: form.collection || "",
        target_drop_date: form.target_drop_date || "",
        tier: form.is_premium ? "PREMIUM" : form.is_new_drop ? "DROP" : "STANDARD",
        packages: computedPackages,
      };

      setUploadStatus("Publishing product catalog...");
      let savedProduct: any = null;

      // 1. Primary: Use dedicated server-side API route (bypasses RLS restrictions safely)
      let apiFailedMsg = "";
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }

        const isEdit = Boolean(editingProduct);
        const endpoint = "/api/products";
        const res = await fetch(endpoint, {
          method: isEdit ? "PUT" : "POST",
          headers,
          body: JSON.stringify(productPayload),
        });

        const json = await res.json();
        if (res.ok && json.success && json.product) {
          savedProduct = json.product;
        } else {
          apiFailedMsg = json.message || `Server error (${res.status})`;
          console.warn("API route notice, trying client fallback:", apiFailedMsg);
        }
      } catch (apiErr: any) {
        apiFailedMsg = apiErr.message || "Failed to reach products API";
        console.warn("API route fetch error:", apiErr);
      }

      // 2. Secondary fallback: Direct Supabase client insert
      if (!savedProduct) {
        // Strip non-schema root columns so PostgREST schema cache does not reject
        const dbPayload: any = {
          name: form.name.trim(),
          slug: computedSlug,
          description: form.description || "",
          price: effectivePrice,
          mrp: effectiveMrp,
          category_id: primaryCatId,
          image_url: coverImageUrl,
          images: uploadedImagesList,
          specifications: specificationsData,
          brand: form.brand || "zebalpha",
          stock: calculatedStock,
          sku: form.has_variants ? (form.style_code || "MULTI_VARIANT") : (form.single_sku || form.style_code || `SKU_${Date.now()}`),
          status: form.is_new_drop ? "COMING_SOON" : (calculatedStock > 0 ? "IN_STOCK" : "OUT_OF_STOCK"),
          is_active: true,
          is_approved: true,
          approval_status: "approved",
          low_stock_limit: 5,
          seller_id: finalSellerId,
          packages: computedPackages,
        };

        let res: any;
        if (editingProduct?.id) {
          res = await supabase.from("products").update(dbPayload).eq("id", editingProduct.id).select();
        } else {
          res = await supabase.from("products").insert([dbPayload]).select();
        }

        if (res.error) {
          // If foreign key failed on category, set to null and retry
          if (res.error.message?.includes("category")) {
            dbPayload.category_id = null;
            if (editingProduct?.id) {
              res = await supabase.from("products").update(dbPayload).eq("id", editingProduct.id).select();
            } else {
              res = await supabase.from("products").insert([dbPayload]).select();
            }
          }
        }

        if (res.error) {
          throw new Error(apiFailedMsg || res.error.message || "Failed to publish product.");
        }

        savedProduct = res.data?.[0] || { id: editingProduct?.id || `prod_${Date.now()}`, ...dbPayload };
      }

      setUploadStatus("✅ Product catalog published successfully!");
      onSuccess();
      setTimeout(() => {
        onClose();
        setForm(INITIAL_FORM_STATE);
        setCurrentStep(1);
      }, 500);
    } catch (err: any) {
      console.error("Error creating product:", err);
      setErrorMsg(err.message || "Failed to submit product catalog.");
      scrollModalToTop();
    } finally {
      setSubmitting(false);
      setUploadStatus("");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#0d0d10] border border-[#27272a] rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 md:p-5 border-b border-[#27272a] flex items-center justify-between bg-[#141418]">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-emerald-400" />
              Upload Product Catalog
            </h2>
            <p className="text-xs text-zinc-400">Step {currentStep} of 4: {STEPS[currentStep - 1].desc}</p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-[#18181b] text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stepper Progress Indicator */}
        <div className="grid grid-cols-4 border-b border-[#27272a] bg-[#050505]">
          {STEPS.map((s) => {
            const isActive = currentStep === s.id;
            const isCompleted = currentStep > s.id;
            return (
              <div
                key={s.id}
                onClick={() => isCompleted && setCurrentStep(s.id)}
                className={`p-3 md:p-4 text-center cursor-pointer transition-all border-b-2 ${
                  isActive
                    ? "border-white bg-[#141418]"
                    : isCompleted
                    ? "border-emerald-500 bg-[#0d0d10]"
                    : "border-transparent opacity-50"
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <span
                    className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                      isCompleted
                        ? "bg-emerald-500 text-black"
                        : isActive
                        ? "bg-white text-black"
                        : "bg-[#27272a] text-zinc-400"
                    }`}
                  >
                    {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : s.id}
                  </span>
                  <span className="hidden md:inline text-xs font-bold text-zinc-200">{s.title}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Modal Body / Active Step */}
        <div ref={modalBodyRef} className="p-4 md:p-6 overflow-y-auto flex-1 custom-scrollbar space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {errorMsg}
            </div>
          )}

          {currentStep === 1 && (
            <Step1AddProduct formData={form} categories={categories} onChange={updateForm} />
          )}

          {currentStep === 2 && (
            <Step2BasicDetails formData={form} onChange={updateForm} />
          )}

          {currentStep === 3 && (
            <Step3AdditionalDetails formData={form} onChange={updateForm} />
          )}

          {currentStep === 4 && (
            <Step4AddVariants formData={form} onChange={updateForm} />
          )}
        </div>

        {/* Navigation Footer */}
        <div className="p-4 border-t border-[#27272a] bg-[#141418] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <button
              type="button"
              onClick={handleBack}
              disabled={currentStep === 1 || submitting}
              className={`py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                currentStep === 1
                  ? "opacity-30 cursor-not-allowed text-zinc-500 bg-[#18181b]"
                  : "bg-[#18181b] text-white hover:bg-zinc-800 border border-[#27272a] cursor-pointer"
              }`}
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>

            {errorMsg && (
              <div className="sm:hidden text-xs text-red-400 font-medium flex items-center gap-1 bg-red-500/10 border border-red-500/20 px-2.5 py-1.5 rounded-lg max-w-[200px] truncate">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                <span className="truncate">{errorMsg}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {errorMsg && (
              <div className="hidden sm:flex text-xs text-red-400 font-medium items-center gap-1.5 bg-red-500/10 border border-red-500/20 px-3 py-1.5 rounded-lg max-w-sm truncate">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                <span className="truncate">{errorMsg}</span>
              </div>
            )}

            {form.is_new_drop && currentStep < 4 && (
              <button
                type="button"
                onClick={handleSubmitCatalog}
                disabled={submitting}
                className="py-2.5 px-4 rounded-xl bg-orange-500 text-black hover:bg-orange-400 text-xs font-bold shadow-lg shadow-orange-500/20 flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? "Publishing..." : "⚡ Publish New Drop Now"}
              </button>
            )}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="py-2.5 px-6 rounded-xl bg-white text-black hover:bg-zinc-200 text-xs font-bold shadow-lg shadow-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmitCatalog}
                disabled={submitting}
                className="py-2.5 px-6 rounded-xl bg-emerald-500 text-black hover:bg-emerald-400 text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    {uploadStatus || "Uploading Catalog..."}
                  </>
                ) : (
                  "Submit & Publish Catalog"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
