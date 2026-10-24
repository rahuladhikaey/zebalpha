"use client";

import React, { useState } from "react";
import { X, CheckCircle2, ChevronRight, ChevronLeft, UploadCloud, AlertTriangle } from "lucide-react";
import Step1AddProduct from "./Step1AddProduct";
import Step2BasicDetails from "./Step2BasicDetails";
import Step3AdditionalDetails from "./Step3AdditionalDetails";
import Step4AddVariants, { type CatalogVariant, PRESET_COLORS } from "./Step4AddVariants";
import {
  type SizeVariantDetail,
  type SizeMeasurementDetail,
  type MeasurementUnit,
} from "./SizeSpecificDetailsSection";
import type { Category } from "@shared/types";
import { resolveProductTypeConfig } from "@shared/constants/productAttributeEngine";
import { supabase } from "@shared/utils/supabaseClient";
import { uploadToCloudinary } from "@shared/services";

export interface CatalogUploadWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  sellerId: string;
  sellerProfile?: any;
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

  // Dynamic category attributes
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
  default_color?: string;
  main_color?: string;
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
  manufacturer_same_as_pickup: true,
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
  default_color: "",
  main_color: "",
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
  sellerProfile,
  categories,
  editingProduct,
  onSuccess,
}: CatalogUploadWizardModalProps): React.JSX.Element | null {
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<MasterCatalogFormState>(INITIAL_FORM_STATE);

  const initialSellerOrigin = React.useMemo(() => {
    if (!sellerProfile) return null;
    const name = (sellerProfile.business_name || sellerProfile.store_name || sellerProfile.shop_name || sellerProfile.owner_name || sellerProfile.full_name || "").trim();
    const address = (sellerProfile.pickup_address || sellerProfile.warehouse_address || sellerProfile.address || sellerProfile.pickup_location || "").trim();
    const pincode = (sellerProfile.pincode || "").trim();
    if (name || address || pincode) {
      return { name, address, pincode, city: sellerProfile.city || "", state: sellerProfile.state || "" };
    }
    return null;
  }, [sellerProfile]);

  const [sellerPickupInfo, setSellerPickupInfo] = useState<{
    name: string;
    address: string;
    pincode: string;
    city?: string;
    state?: string;
  } | null>(initialSellerOrigin);

  React.useEffect(() => {
    if (initialSellerOrigin) {
      setSellerPickupInfo(initialSellerOrigin);
    }
  }, [initialSellerOrigin]);

  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const modalBodyRef = React.useRef<HTMLDivElement>(null);

  // Fetch seller's registered pickup address and store information for auto-populating origin
  React.useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadSellerOrigin() {
      try {
        let sName = initialSellerOrigin?.name || (sellerProfile?.business_name || sellerProfile?.store_name || sellerProfile?.shop_name || sellerProfile?.owner_name || sellerProfile?.full_name || "").trim();
        let sAddr = initialSellerOrigin?.address || (sellerProfile?.pickup_address || sellerProfile?.warehouse_address || sellerProfile?.address || sellerProfile?.pickup_location || "").trim();
        let sPin = initialSellerOrigin?.pincode || (sellerProfile?.pincode || "").trim();

        // 1. Query server-side API route /api/shipping/pickup-location (bypasses RLS safely)
        try {
          const res = await fetch("/api/shipping/pickup-location");
          if (res.ok) {
            const json = await res.json();
            if (json.locations && json.locations.length > 0) {
              const loc = json.locations[0];
              if (!sAddr && loc.address_line1) sAddr = loc.address_line1.trim();
              if (!sPin && loc.pincode) sPin = String(loc.pincode).trim();
              if (!sName && loc.name) sName = loc.name.trim();
            }
          }
        } catch (apiErr) {
          console.warn("Pickup location API route notice:", apiErr);
        }

        // 2. Fallback to Supabase sellers table if still missing
        if (!sAddr || !sPin || !sName) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
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
            }

            // 3. Fallback to seller_pickup_locations
            if (!sAddr || !sPin) {
              const ids = [s?.id, user.id, sellerId, sellerProfile?.id].filter(Boolean);
              if (ids.length > 0) {
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
        }

        if (isMounted && (sAddr || sPin || sName)) {
          const origin = {
            name: sName,
            address: sAddr,
            pincode: sPin,
            city: sellerProfile?.city || "",
            state: sellerProfile?.state || "",
          };
          setSellerPickupInfo(origin);

          // Auto-fill form manufacturer details if empty or if creating a new product
          setForm((prev) => {
            const hasCustomAddress = prev.manufacturer_address && prev.manufacturer_address.trim() !== "";
            const hasCustomPincode = prev.manufacturer_pincode && prev.manufacturer_pincode.trim() !== "";
            if (!editingProduct || (!hasCustomAddress && !hasCustomPincode)) {
              const nameToSet = prev.manufacturer_name || origin.name;
              const addrToSet = prev.manufacturer_address || origin.address;
              const pinToSet = prev.manufacturer_pincode || origin.pincode;
              return {
                ...prev,
                manufacturer_same_as_pickup: prev.manufacturer_same_as_pickup ?? true,
                manufacturer_name: nameToSet,
                manufacturer_address: addrToSet,
                manufacturer_pincode: pinToSet,
                packer_same_as_manufacturer: prev.packer_same_as_manufacturer ?? true,
                packer_name: prev.packer_same_as_manufacturer ? nameToSet : prev.packer_name,
                packer_address: prev.packer_same_as_manufacturer ? addrToSet : prev.packer_address,
                packer_pincode: prev.packer_same_as_manufacturer ? pinToSet : prev.packer_pincode,
              };
            }
            return prev;
          });
        }
      } catch (err) {
        console.warn("Notice loading seller pickup origin:", err);
      }
    }

    loadSellerOrigin();
    return () => { isMounted = false; };
  }, [isOpen, sellerId, sellerProfile, editingProduct]);

  const scrollModalToTop = () => {
    setTimeout(() => {
      modalBodyRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }, 40);
  };

  React.useEffect(() => {
    if (editingProduct) {
      let specs = editingProduct.specifications;
      if (typeof specs === "string") {
        try {
          specs = JSON.parse(specs);
        } catch (_) {
          specs = {};
        }
      }
      specs = specs || {};

      let rawImages = editingProduct.images;
      if (typeof rawImages === "string") {
        try {
          rawImages = JSON.parse(rawImages);
        } catch (_) {
          rawImages = [rawImages];
        }
      }
      const imgList: string[] = Array.isArray(rawImages) && rawImages.length > 0
        ? rawImages.filter(Boolean)
        : [];
      if (editingProduct.image_url && !imgList.includes(editingProduct.image_url)) {
        imgList.unshift(editingProduct.image_url);
      }

      // Parse existing packages if editing
      let rawPackages = editingProduct.packages;
      if (typeof rawPackages === "string") {
        try {
          rawPackages = JSON.parse(rawPackages);
        } catch (_) {
          rawPackages = [];
        }
      }
      const existingPackages = Array.isArray(rawPackages) ? rawPackages : [];
      const hasVars = existingPackages.length > 0 && !(existingPackages.length === 1 && (existingPackages[0].name === "Standard" || existingPackages[0].name === "Standard Package"));

      const defaultCol = (
        specs?.default_color ||
        specs?.main_color ||
        existingPackages[0]?.color ||
        (existingPackages[0]?.name?.includes(" / ") ? existingPackages[0]?.name.split(" / ")[0] : "") ||
        "Black"
      ).trim().toLowerCase();

      const loadedVariants: CatalogVariant[] = existingPackages.map((pkg: any, pkgIdx: number) => {
        let pkgGallery = pkg.gallery;
        if (typeof pkgGallery === "string") {
          try {
            pkgGallery = JSON.parse(pkgGallery);
          } catch (_) {
            pkgGallery = [pkgGallery];
          }
        }

        const pkgCol = (
          pkg.color ||
          (pkg.name?.includes(" / ") ? pkg.name.split(" / ")[0] : pkg.name?.includes(" - ") ? pkg.name.split(" - ")[0] : "") ||
          ""
        ).trim().toLowerCase();
        const isStandard = pkgCol === "standard" || pkgCol === "default";
        const isMainPkg = pkgIdx === 0 || pkgCol === defaultCol || pkgCol === "main color" || isStandard;

        let rawGallery = Array.isArray(pkgGallery) && pkgGallery.length > 0
          ? pkgGallery.filter(Boolean)
          : pkg.image_url
          ? [pkg.image_url]
          : [];

        // For other custom non-main colors (e.g. Red, Blue), strip accidental inheritance of the main product photos
        if (!isMainPkg && !isStandard && imgList.length > 0) {
          rawGallery = rawGallery.filter((img: string) => !imgList.includes(img));
        }

        const galleryList = rawGallery.length > 0
          ? rawGallery
          : (isMainPkg || isStandard) && imgList.length > 0
          ? [...imgList]
          : [];

        const mainImgUrl = galleryList[0] || ((isMainPkg || isStandard) ? (pkg.image_url || imgList[0] || undefined) : undefined);

        return {
          id: String(pkg.id || Math.random().toString(36).substring(2, 9)),
          size: pkg.size || (pkg.name?.includes(" / ") ? pkg.name.split(" / ")[1] : pkg.name?.includes(" - ") ? pkg.name.split(" - ")[1] : pkg.name || "Free Size"),
          color: pkg.color || (pkg.name?.includes(" / ") ? pkg.name.split(" / ")[0] : pkg.name?.includes(" - ") ? pkg.name.split(" - ")[0] : "Black"),
          color_hex: pkg.color_hex || undefined,
          sku: pkg.sku || "",
          stock: String(pkg.stock ?? 20),
          price: String(pkg.price ?? editingProduct.price ?? ""),
          defective_returns_price: String((editingProduct.specifications as any)?.defective_returns_price || ""),
          mrp: String(pkg.mrp ?? editingProduct.mrp ?? ""),
          image_url: mainImgUrl,
          gallery: galleryList,
          is_active: pkg.stock === undefined || Number(pkg.stock) > 0,
        };
      });

      // Parse existing sizes and measurements for Step 1 Meesho-style tables
      const loadedSizes: string[] = Array.from(
        new Set(
          existingPackages
            .map((p: any) => p.size || (p.name?.includes(" / ") ? p.name.split(" / ")[1] : p.name?.includes(" - ") ? p.name.split(" - ")[1] : p.name))
            .filter((s: any) => s && s !== "Standard" && s !== "Standard Package")
        )
      );

      // Fallback: If packages had no size names but size_chart has rows or editingProduct has size
      if (loadedSizes.length === 0 && Array.isArray(specs?.size_chart?.rows)) {
        specs.size_chart.rows.forEach((r: any) => {
          if (r.size && !loadedSizes.includes(r.size)) {
            loadedSizes.push(r.size);
          }
        });
      }
      if (loadedSizes.length === 0 && editingProduct.size) {
        loadedSizes.push(editingProduct.size);
      }

      // Deduplicate sizeDetails to ensure one row per unique size in Step 1
      const seenSizeSet = new Set<string>();
      const loadedSizeDetails: SizeVariantDetail[] = [];
      for (const pkg of existingPackages) {
        if (pkg.name === "Standard" && loadedSizes.length === 0) continue;
        const sz = pkg.size || (pkg.name?.includes(" / ") ? pkg.name.split(" / ")[1] : pkg.name?.includes(" - ") ? pkg.name.split(" - ")[1] : pkg.name || "Free Size");
        if (seenSizeSet.has(sz)) continue;
        seenSizeSet.add(sz);
        loadedSizeDetails.push({
          id: String(pkg.id || Math.random().toString(36).substring(2, 9)),
          size: sz,
          mrp: String(pkg.mrp ?? editingProduct.mrp ?? ""),
          selling_price: String(pkg.price ?? editingProduct.price ?? ""),
          inventory: String(pkg.stock ?? 20),
          sku: pkg.sku || "",
          return_price: String(pkg.return_price ?? (editingProduct.specifications as any)?.defective_returns_price ?? ""),
        });
      }

      // If loadedSizes has sizes that were not yet in loadedSizeDetails, backfill them
      for (const sz of loadedSizes) {
        if (!seenSizeSet.has(sz)) {
          seenSizeSet.add(sz);
          loadedSizeDetails.push({
            id: Math.random().toString(36).substring(2, 9),
            size: sz,
            mrp: String(editingProduct.mrp || editingProduct.price || ""),
            selling_price: String(editingProduct.price || ""),
            inventory: String(editingProduct.stock ?? 20),
            sku: `${specs?.style_code || 'SKU'}-${sz.toUpperCase()}`,
            return_price: String(specs?.defective_returns_price || ""),
          });
        }
      }

      const existingSizeChart = specs.size_chart;
      const loadedUnit: MeasurementUnit = existingSizeChart?.unit === "cm" ? "cm" : "inches";
      const loadedColumns: string[] = Array.isArray(existingSizeChart?.columns)
        ? existingSizeChart.columns
        : ["Chest", "Length", "Shoulder", "Sleeve"];
      const loadedNotes: string = existingSizeChart?.notes || "";
      const loadedChartImage: string = existingSizeChart?.chart_image || "";
      const loadedMeasurements: SizeMeasurementDetail[] = Array.isArray(existingSizeChart?.rows)
        ? existingSizeChart.rows.map((r: any) => ({
            size: r.size || r.Size || "",
            bust_chest: r.bust_chest || r.chest || r.bust || r.Chest || r.Bust || "",
            waist: r.waist || r.Waist || "",
            shoulder: r.shoulder || r.Shoulder || "",
            length: r.length || r.Length || "",
            hip: r.hip || r.Hip || "",
            sleeve_length: r.sleeve_length || r.sleeve || r.Sleeve || "",
            inseam: r.inseam || r.Inseam || "",
            thigh: r.thigh || r.Thigh || "",
            ...r,
          }))
        : [];

      let subcatCandidate = (
        specs?.subcategory_name ||
        specs?.subcategory ||
        editingProduct.category ||
        (Array.isArray(editingProduct.categories) ? editingProduct.categories[0]?.name : editingProduct.categories?.name) ||
        ""
      );
      if (!subcatCandidate && editingProduct.name) {
        const inferredPt = resolveProductTypeConfig("", editingProduct.name);
        if (inferredPt && inferredPt.name && inferredPt.name !== "General Product") {
          subcatCandidate = inferredPt.name;
        }
      }

      let finalCatId = String(editingProduct.category_id || "");
      if (!finalCatId && categories && categories.length > 0) {
        const matched = categories.find((c: any) =>
          subcatCandidate && c.name?.toLowerCase().includes(subcatCandidate.toLowerCase())
        );
        if (matched?.id) finalCatId = String(matched.id);
      }

      setForm({
        category_id: finalCatId,
        subcategory_id: "",
        subcategory_name: subcatCandidate,
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
        manufacturer_same_as_pickup: specs.manufacturer_same_as_pickup !== undefined
          ? Boolean(specs.manufacturer_same_as_pickup)
          : (!specs.manufacturer_address || specs.manufacturer_address === sellerPickupInfo?.address),
        manufacturer_name: specs.manufacturer_name || sellerPickupInfo?.name || "",
        manufacturer_address: specs.manufacturer_address || sellerPickupInfo?.address || "",
        manufacturer_pincode: specs.manufacturer_pincode || sellerPickupInfo?.pincode || "",
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
        default_color: (editingProduct as any).default_color || (editingProduct.specifications as any)?.default_color || editingProduct.packages?.[0]?.color || loadedVariants[0]?.color || "",
        main_color: (editingProduct as any).main_color || (editingProduct as any).default_color || (editingProduct.specifications as any)?.main_color || loadedVariants[0]?.color || "",
        single_stock: String(editingProduct.stock ?? 20),
        single_sku: editingProduct.sku || "",
      });
    } else {
      setForm({
        ...INITIAL_FORM_STATE,
        manufacturer_same_as_pickup: true,
        manufacturer_name: initialSellerOrigin?.name || sellerProfile?.business_name || sellerProfile?.store_name || "",
        manufacturer_address: initialSellerOrigin?.address || sellerProfile?.pickup_address || sellerProfile?.warehouse_address || "",
        manufacturer_pincode: initialSellerOrigin?.pincode || sellerProfile?.pincode || "",
        packer_same_as_manufacturer: true,
        packer_name: initialSellerOrigin?.name || sellerProfile?.business_name || sellerProfile?.store_name || "",
        packer_address: initialSellerOrigin?.address || sellerProfile?.pickup_address || sellerProfile?.warehouse_address || "",
        packer_pincode: initialSellerOrigin?.pincode || sellerProfile?.pincode || "",
      });
    }
  }, [editingProduct, isOpen]);

  // Keep manufacturer details synchronized with seller origin info whenever it loads or seller navigates to Step 2
  React.useEffect(() => {
    const origin = sellerPickupInfo || initialSellerOrigin;
    if (!origin) return;

    setForm((prev) => {
      // If user hasn't typed a custom address yet or if it's set to same_as_pickup
      const needsName = !prev.manufacturer_name && origin.name;
      const needsAddress = !prev.manufacturer_address && origin.address;
      const needsPin = !prev.manufacturer_pincode && origin.pincode;

      if (prev.manufacturer_same_as_pickup !== false && (needsName || needsAddress || needsPin)) {
        const mName = prev.manufacturer_name || origin.name;
        const mAddr = prev.manufacturer_address || origin.address;
        const mPin = prev.manufacturer_pincode || origin.pincode;
        return {
          ...prev,
          manufacturer_same_as_pickup: true,
          manufacturer_name: mName,
          manufacturer_address: mAddr,
          manufacturer_pincode: mPin,
          packer_name: prev.packer_same_as_manufacturer ? mName : prev.packer_name,
          packer_address: prev.packer_same_as_manufacturer ? mAddr : prev.packer_address,
          packer_pincode: prev.packer_same_as_manufacturer ? mPin : prev.packer_pincode,
        };
      }
      return prev;
    });
  }, [sellerPickupInfo, initialSellerOrigin, currentStep]);

  if (!isOpen) return null;

  const updateForm = (updates: Partial<MasterCatalogFormState>) => {
    setForm((prev) => {
      const merged = { ...prev, ...updates };
      if (updates.size_details && updates.size_details.length > 0) {
        const validPrices = updates.size_details
          .map((d) => parseFloat(d.selling_price))
          .filter((p) => !isNaN(p) && p > 0);
        const validMrps = updates.size_details
          .map((d) => parseFloat(d.mrp))
          .filter((m) => !isNaN(m) && m > 0);
        const validReturns = updates.size_details
          .map((d) => parseFloat(d.return_price))
          .filter((r) => !isNaN(r) && r > 0);
        const totalStock = updates.size_details.reduce(
          (acc, d) => acc + (parseInt(d.inventory) || 0),
          0
        );

        const primaryRow = updates.size_details[0];
        const primaryPrice = primaryRow && parseFloat(primaryRow.selling_price) > 0
          ? parseFloat(primaryRow.selling_price)
          : (validPrices[0] || 0);
        const primaryMrp = primaryRow && parseFloat(primaryRow.mrp) > 0
          ? parseFloat(primaryRow.mrp)
          : (validMrps[0] || primaryPrice);

        if (primaryPrice > 0) {
          merged.price = String(primaryPrice);
          merged.mrp = String(primaryMrp >= primaryPrice ? primaryMrp : primaryPrice);
        } else if (validPrices.length > 0) {
          merged.price = String(validPrices[0]);
          merged.mrp = String(validMrps[0] || validPrices[0]);
        }
        if (validReturns.length > 0) {
          merged.defective_returns_price = String(validReturns[0]);
        }
        if (totalStock > 0) {
          merged.single_stock = String(totalStock);
        }
      }
      return merged;
    });
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
      const activePt = resolveProductTypeConfig(form.category_id, form.subcategory_name);
      const hasSizing = activePt.sizingSystem !== "none";

      // Require at least one size ONLY for apparel / sized products
      if (!form.is_new_drop && hasSizing && form.selected_sizes.length === 0) {
        setErrorMsg(`Please select at least 1 size for ${activePt.name} in Step 1 to configure pricing and inventory.`);
        scrollModalToTop();
        return false;
      }
      // If sizes were selected, validate selling price on those rows
      if (hasSizing && form.selected_sizes.length > 0 && form.size_details.length > 0) {
        for (const sd of form.size_details) {
          if (!sd.selling_price || parseFloat(sd.selling_price) <= 0) {
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
      const activePt = resolveProductTypeConfig(form.category_id, form.subcategory_name);
      const hasSizing = activePt.sizingSystem !== "none";
      const hasSizeDetails = form.size_details && form.size_details.length > 0;
      const hasVariants = form.has_variants && form.variants.length > 0;
      const effectivePrice = form.price || 
        (hasSizeDetails ? form.size_details[0]?.selling_price : "") ||
        (hasVariants ? form.variants[0]?.price : "");
      const effectiveMrp = form.mrp || 
        (hasSizeDetails ? form.size_details[0]?.mrp || effectivePrice : "") ||
        (hasVariants ? form.variants[0]?.mrp || effectivePrice : "");

      if (!hasVariants && (!effectivePrice || parseFloat(effectivePrice) <= 0)) {
        setErrorMsg("Please configure a valid listing price (greater than ₹0).");
        scrollModalToTop();
        return false;
      }
      if (!hasVariants && (!effectiveMrp || parseFloat(effectiveMrp) <= 0)) {
        setErrorMsg("Please configure a valid MRP.");
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
      const nextStep = Math.min(4, currentStep + 1);
      if (nextStep === 4 && (!form.variants || form.variants.length === 0)) {
        const mainColor = (form.default_color || form.main_color || "Main Color").trim();
        const mainHex = PRESET_COLORS.find((c) => c.name.toLowerCase() === mainColor.toLowerCase())?.hex || "#18181b";
        const targetSizes = (form.selected_sizes && form.selected_sizes.length > 0)
          ? form.selected_sizes
          : ["S", "M", "L", "XL"];
        const basePrice = form.price || "499";
        const baseMrp = form.mrp || String(Math.round(parseFloat(basePrice || "499") * 1.5));
        const cleanPrefix = form.style_code ? form.style_code.trim().toUpperCase() : "ZB";
        const cleanColTag = mainColor.toUpperCase().replace(/[^A-Z0-9]/g, "");

        const mainGallery = form.images && form.images.length > 0 ? form.images : [];
        const mainCoverImg = mainGallery[0] || undefined;

        const initialMainVariants: CatalogVariant[] = targetSizes.map((sz) => {
          const matchedSizeDetail = form.size_details?.find(
            (sd) => sd.size?.trim().toLowerCase() === sz.trim().toLowerCase()
          );
          const vPrice = matchedSizeDetail?.selling_price || basePrice;
          const vMrp = matchedSizeDetail?.mrp || baseMrp;
          const vStock = matchedSizeDetail?.inventory || "20";
          const vReturnPrice = matchedSizeDetail?.return_price || form.defective_returns_price || "";
          const vSku = matchedSizeDetail?.sku || `${cleanPrefix}_${cleanColTag}_${sz.toUpperCase()}`;

          return {
            id: `${cleanPrefix}_${cleanColTag}_${sz.toUpperCase()}_${Date.now().toString(36).slice(-4)}_${Math.random().toString(36).slice(-3)}`,
            color: mainColor,
            color_hex: mainHex,
            size: sz,
            stock: vStock,
            price: vPrice,
            mrp: vMrp,
            defective_returns_price: vReturnPrice,
            sku: vSku,
            is_active: true,
            image_url: mainCoverImg,
            gallery: mainGallery,
          };
        });

        setForm((prev) => ({
          ...prev,
          has_variants: true,
          default_color: prev.default_color || mainColor,
          main_color: prev.main_color || mainColor,
          variants: initialMainVariants,
        }));
      }
      setCurrentStep(nextStep);
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
      // Use an in-flight cache so identical base64 images are only uploaded ONCE
      const uploadCache = new Map<string, string>();
      const uploadCached = async (img: string): Promise<string> => {
        if (!img || typeof img !== "string" || !img.startsWith("data:image/")) {
          return img;
        }
        if (uploadCache.has(img)) {
          return uploadCache.get(img)!;
        }
        try {
          const cloudUrl = await uploadToCloudinary(img);
          uploadCache.set(img, cloudUrl);
          return cloudUrl;
        } catch (err) {
          console.warn("Notice compressing catalog image:", err);
          return img;
        }
      };

      setUploadStatus("Uploading & optimizing product images...");
      const uploadedImagesList = await Promise.all(
        orderedImages.map((img) => uploadCached(img))
      );

      const coverImageUrl = uploadedImagesList[0] || "";

      // 2. Upload variant images & color galleries with unified color-level synchronization
      let processedVariants = [...form.variants];
      if (form.has_variants && form.variants.length > 0) {
        setUploadStatus("Processing color variant photos & galleries...");

        const activeDefaultCol = (
          form.default_color ||
          form.main_color ||
          form.variants[0]?.color ||
          "Main Color"
        ).trim().toLowerCase();

        // Distinct colors present in variants
        const distinctColors = Array.from(
          new Set(form.variants.map((v) => (v.color || "Default").trim()))
        );

        // Upload and synchronize color galleries at the COLOR level
        const colorGalleriesMap = new Map<string, string[]>();
        const colorPrimaryMap = new Map<string, string>();

        for (const col of distinctColors) {
          const colKey = col.toLowerCase();
          const colVariants = form.variants.filter(
            (v) => (v.color || "Default").trim().toLowerCase() === colKey
          );

          const isMainCol =
            colKey === activeDefaultCol ||
            colKey === "main color" ||
            distinctColors[0]?.toLowerCase() === colKey;

          // Find the best existing gallery for this color
          let rawColGallery: string[] = [];
          for (const v of colVariants) {
            if (Array.isArray(v.gallery) && v.gallery.length > 0) {
              rawColGallery = v.gallery;
              break;
            }
          }

          // For non-main colors, strip any accidental main product images
          if (!isMainCol && (uploadedImagesList.length > 0 || coverImageUrl)) {
            const forbiddenImages = [...uploadedImagesList, coverImageUrl].filter(Boolean);
            rawColGallery = rawColGallery.filter((img) => !forbiddenImages.includes(img));
          }

          if (rawColGallery.length === 0) {
            if (isMainCol && uploadedImagesList.length > 0) {
              rawColGallery = uploadedImagesList;
            } else if (!isMainCol) {
              const forbiddenImages = [...uploadedImagesList, coverImageUrl].filter(Boolean);
              const firstWithImg = colVariants.find((v) => v.image_url && !forbiddenImages.includes(v.image_url));
              if (firstWithImg?.image_url) {
                rawColGallery = [firstWithImg.image_url];
              }
            }
          }

          // Upload and deduplicate images in this color gallery
          const uploadedColGallery: string[] = [];
          for (const gImg of rawColGallery) {
            if (gImg) {
              const uploaded = await uploadCached(gImg);
              if (uploaded && !uploadedColGallery.includes(uploaded)) {
                uploadedColGallery.push(uploaded);
              }
            }
          }

          const primaryImg =
            uploadedColGallery[0] ||
            (isMainCol ? coverImageUrl : "");

          colorGalleriesMap.set(colKey, uploadedColGallery);
          colorPrimaryMap.set(colKey, primaryImg);
        }

        // Apply unified gallery and cover to all variants of each color
        processedVariants = form.variants.map((v) => {
          const colKey = (v.color || "Default").trim().toLowerCase();
          const isMainCol =
            colKey === activeDefaultCol ||
            colKey === "main color" ||
            distinctColors[0]?.toLowerCase() === colKey;
          const colGallery = colorGalleriesMap.get(colKey) || [];
          const colCover = colorPrimaryMap.get(colKey);

          const finalCover = colCover || (isMainCol ? coverImageUrl : undefined);
          const finalGallery = colGallery.length > 0
            ? colGallery
            : (isMainCol && coverImageUrl ? [coverImageUrl] : []);

          return {
            ...v,
            image_url: finalCover,
            gallery: finalGallery,
          };
        });
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
        ...(form.custom_attributes || {}),
        fabric: form.fabric,
        pattern: form.pattern,
        fit_type: form.fit_type,
        sleeve_type: form.sleeve_type,
        neck_type: form.neck_type,
        care_instructions: form.care_instructions,
        target_gender: form.target_gender,
        weight_grams: form.weight_grams,
        country_of_origin: form.country_of_origin || "India",
        manufacturer_same_as_pickup: form.manufacturer_same_as_pickup ?? true,
        manufacturer_name: form.manufacturer_name || sellerPickupInfo?.name || "",
        manufacturer_address: form.manufacturer_address || sellerPickupInfo?.address || "",
        manufacturer_pincode: form.manufacturer_pincode || sellerPickupInfo?.pincode || "",
        packer_name: form.packer_same_as_manufacturer ? (form.manufacturer_name || sellerPickupInfo?.name || "") : form.packer_name,
        packer_address: form.packer_same_as_manufacturer ? (form.manufacturer_address || sellerPickupInfo?.address || "") : form.packer_address,
        packer_pincode: form.packer_same_as_manufacturer ? (form.manufacturer_pincode || sellerPickupInfo?.pincode || "") : form.packer_pincode,
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
        // Dynamically compute which measurement columns were actually filled
        const candidateFieldConfigs = [
          { key: "bust_chest", aliases: ["chest", "bust", "Chest", "Bust"], label: "Chest" },
          { key: "waist", aliases: ["Waist"], label: "Waist" },
          { key: "shoulder", aliases: ["Shoulder"], label: "Shoulder" },
          { key: "length", aliases: ["Length"], label: "Length" },
          { key: "hip", aliases: ["Hip"], label: "Hip" },
          { key: "sleeve_length", aliases: ["sleeve", "Sleeve"], label: "Sleeve" },
          { key: "inseam", aliases: ["Inseam"], label: "Inseam" },
          { key: "thigh", aliases: ["Thigh"], label: "Thigh" },
        ];

        const detectedCols: string[] = [];
        candidateFieldConfigs.forEach(({ key, aliases, label }) => {
          const hasVal = form.size_measurements.some((r: any) => {
            const v = r[key] ?? aliases.map((a) => r[a]).find((val) => val !== undefined);
            return v !== undefined && String(v).trim() !== "" && String(v).trim() !== "—";
          });
          if (hasVal) {
            detectedCols.push(label);
          }
        });

        // Also check any extra custom keys
        const knownKeys = new Set([
          "size", "Size", "id", "ID",
          ...candidateFieldConfigs.map((c) => c.key.toLowerCase()),
          ...candidateFieldConfigs.flatMap((c) => c.aliases.map((a) => a.toLowerCase())),
        ]);
        form.size_measurements.forEach((r: any) => {
          Object.keys(r).forEach((k) => {
            if (!knownKeys.has(k.toLowerCase()) && r[k] !== undefined && String(r[k]).trim() !== "" && String(r[k]).trim() !== "—") {
              const formatted = k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, " ");
              if (!detectedCols.includes(formatted)) {
                detectedCols.push(formatted);
              }
            }
          });
        });

        const resolvedColumns = detectedCols.length > 0
          ? detectedCols
          : (form.size_chart_columns && form.size_chart_columns.length > 0
              ? form.size_chart_columns
              : ["Chest", "Length", "Shoulder", "Sleeve"]);

        // Normalize each row with alias coverage so customer storefront, quick view, etc. read seamlessly
        const normalizedRows = form.size_measurements.map((r: any) => {
          const chestVal = r.bust_chest || r.chest || r.bust || r.Chest || r.Bust || "";
          const sleeveVal = r.sleeve_length || r.sleeve || r.Sleeve || "";
          const waistVal = r.waist || r.Waist || "";
          const shoulderVal = r.shoulder || r.Shoulder || "";
          const lengthVal = r.length || r.Length || "";
          const hipVal = r.hip || r.Hip || "";
          const inseamVal = r.inseam || r.Inseam || "";
          const thighVal = r.thigh || r.Thigh || "";

          return {
            ...r,
            size: r.size || r.Size || "",
            bust_chest: chestVal,
            chest: chestVal,
            bust: chestVal,
            Chest: chestVal,
            waist: waistVal,
            Waist: waistVal,
            shoulder: shoulderVal,
            Shoulder: shoulderVal,
            length: lengthVal,
            Length: lengthVal,
            hip: hipVal,
            Hip: hipVal,
            sleeve: sleeveVal,
            sleeve_length: sleeveVal,
            Sleeve: sleeveVal,
            inseam: inseamVal,
            Inseam: inseamVal,
            thigh: thighVal,
            Thigh: thighVal,
          };
        });

        (specificationsData as any).size_chart = {
          unit: form.measurement_unit || "inches",
          columns: resolvedColumns,
          rows: normalizedRows,
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

      // Resolve Main / Default Product Color (Req #1)
      const activeDefaultCol = (
        form.default_color ||
        form.main_color ||
        processedVariants[0]?.color ||
        "Black"
      ).trim();

      // Sort variants so variants of the Main / Default Color are ALWAYS FIRST (Index 0)
      const sortedVariants = [...processedVariants].sort((a, b) => {
        const aIsDef = (a.color || "").trim().toLowerCase() === activeDefaultCol.toLowerCase();
        const bIsDef = (b.color || "").trim().toLowerCase() === activeDefaultCol.toLowerCase();
        if (aIsDef && !bIsDef) return -1;
        if (!aIsDef && bIsDef) return 1;
        return 0;
      });

      // Synchronize parent product cover image & gallery with the Main / Default Color
      const defaultVariant = sortedVariants.find(
        (v) => (v.color || "").trim().toLowerCase() === activeDefaultCol.toLowerCase()
      ) || sortedVariants[0];

      // Synchronize parent product price and MRP strictly with the primary default variant
      // to ensure 100% mathematical consistency with the storefront catalog cards & PDP
      let effectivePrice = 0;
      let effectiveMrp = 0;

      if (defaultVariant && parseFloat(defaultVariant.price) > 0) {
        effectivePrice = parseFloat(defaultVariant.price);
        effectiveMrp = parseFloat(defaultVariant.mrp) || effectivePrice;
      } else if (hasSizeDetails && form.size_details[0] && parseFloat(form.size_details[0].selling_price) > 0) {
        effectivePrice = parseFloat(form.size_details[0].selling_price);
        effectiveMrp = parseFloat(form.size_details[0].mrp) || effectivePrice;
      } else {
        effectivePrice = parseFloat(form.price) || 0;
        effectiveMrp = parseFloat(form.mrp) || effectivePrice;
      }

      if (effectiveMrp < effectivePrice) {
        effectiveMrp = effectivePrice;
      }
      const defaultColorCover = defaultVariant?.image_url || defaultVariant?.gallery?.[0] || coverImageUrl;
      const defaultColorGallery = defaultVariant?.gallery && defaultVariant.gallery.length > 0
        ? defaultVariant.gallery
        : uploadedImagesList;

      const finalProductCover = defaultColorCover || coverImageUrl;

      // Build packages JSON array for multi-color and multi-size matrix
      const computedPackages = hasVariants
        ? sortedVariants.map((v, idx) => {
            const isMain = (v.color || "").trim().toLowerCase() === activeDefaultCol.toLowerCase();
            const isStandard = (v.color || "").trim().toLowerCase() === "standard" || (v.color || "").trim().toLowerCase() === "default";
            const pkgImg = v.image_url || ((isMain || isStandard) ? finalProductCover : undefined);
            const pkgGallery = Array.isArray(v.gallery) && v.gallery.length > 0
              ? v.gallery
              : (pkgImg ? [pkgImg] : ((isMain || isStandard) ? (finalProductCover ? [finalProductCover] : (uploadedImagesList.length > 0 ? uploadedImagesList : [])) : []));

            return {
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
              image_url: pkgImg,
              gallery: pkgGallery,
              isBestSeller: idx === 0,
            };
          })
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
            gallery: uploadedImagesList,
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
              gallery: uploadedImagesList,
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
        image_url: finalProductCover,
        images: defaultColorGallery.length > 0 ? defaultColorGallery : uploadedImagesList,
        default_color: activeDefaultCol,
        main_color: activeDefaultCol,
        mainColorId: activeDefaultCol,
        defaultColorId: activeDefaultCol,
        specifications: {
          ...specificationsData,
          default_color: activeDefaultCol,
          main_color: activeDefaultCol,
          mainColorId: activeDefaultCol,
          defaultColorId: activeDefaultCol,
        },
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
            <Step2BasicDetails formData={form} onChange={updateForm} sellerOriginInfo={sellerPickupInfo} />
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
