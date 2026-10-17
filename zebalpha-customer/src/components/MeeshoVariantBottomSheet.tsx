"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Image from "next/image";
import { X, Check, ShoppingBag, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { useVariantSelector } from "@/context/VariantSelectorContext";
import { useCart } from "@/context/CartContext";
import { Product, ProductPackage } from "@/lib/types";
import { supabase } from "@/lib/supabaseClient";

// In-memory cache for loaded variant products to avoid repeated network requests
const productVariantsCache = new Map<string, Product>();

export function MeeshoVariantBottomSheet() {
  const { isOpen, product, initialColor, closeVariantSelector } = useVariantSelector();
  const { cart, addToCart } = useCart();

  // Full product with packages (may be fetched asynchronously if card had slim data)
  const [fullProduct, setFullProduct] = useState<Product | null>(null);
  const [isLoadingVariants, setIsLoadingVariants] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Selected state
  const [selectedColor, setSelectedColor] = useState<string>("");
  const [selectedSize, setSelectedSize] = useState<string>("");

  const modalRef = useRef<HTMLDivElement>(null);

  // Sync / Load Product & Variant Details when Sheet Opens
  useEffect(() => {
    if (!isOpen || !product) {
      setFullProduct(null);
      setSelectedColor("");
      setSelectedSize("");
      setValidationError(null);
      setSuccessToast(null);
      return;
    }

    let isMounted = true;

    // Check if we already have full product with packages in cache or on product itself
    if (product.packages && Array.isArray(product.packages) && product.packages.length > 0) {
      setFullProduct(product);
      setIsLoadingVariants(false);
    } else if (productVariantsCache.has(String(product.id))) {
      setFullProduct(productVariantsCache.get(String(product.id))!);
      setIsLoadingVariants(false);
    } else {
      setIsLoadingVariants(true);
      // Fetch authoritative variant data from dedicated API or Supabase
      (async () => {
        try {
          const res = await fetch(`/api/products/${product.id}/variants`);
          if (res.ok) {
            const data = await res.json();
            if (data?.success && data?.product && isMounted) {
              const merged = { ...product, ...data.product };
              productVariantsCache.set(String(product.id), merged);
              setFullProduct(merged);
              setIsLoadingVariants(false);
              return;
            }
          }
        } catch (e) {
          console.warn("[MeeshoVariantBottomSheet] API fetch fallback to Supabase:", e);
        }

        // Direct Supabase fallback
        try {
          const { data: dbProd } = await supabase
            .from("products")
            .select("id, name, brand, price, mrp, stock, packages, specifications, status, is_active")
            .eq("id", product.id)
            .maybeSingle();

          if (dbProd && isMounted) {
            const merged = { ...product, ...dbProd };
            productVariantsCache.set(String(product.id), merged);
            setFullProduct(merged);
          }
        } catch (dbErr) {
          console.error("[MeeshoVariantBottomSheet] Supabase error:", dbErr);
        } finally {
          if (isMounted) setIsLoadingVariants(false);
        }
      })();
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, product]);

  // Lock body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closeVariantSelector();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeVariantSelector]);

  // Active product source (either fullProduct if loaded, or basic product)
  const activeProduct = fullProduct || product;
  const packages: ProductPackage[] = useMemo(() => {
    return Array.isArray(activeProduct?.packages) ? activeProduct.packages : [];
  }, [activeProduct]);

  // Group packages by color
  const { colorMap, availableColors, hasMultipleColors, defaultColorName } = useMemo(() => {
    const cMap = new Map<string, ProductPackage[]>();

    packages.forEach((pkg) => {
      let colorName = (pkg.color || "").trim();
      if (!colorName && pkg.name?.includes(" / ")) {
        colorName = pkg.name.split(" / ")[0].trim();
      } else if (!colorName && pkg.name?.includes(" - ")) {
        colorName = pkg.name.split(" - ")[0].trim();
      }
      colorName = colorName || "Default";

      if (!cMap.has(colorName)) {
        cMap.set(colorName, []);
      }
      cMap.get(colorName)!.push(pkg);
    });

    const colors = Array.from(cMap.keys());
    const specs = (activeProduct?.specifications as any) || {};
    const defaultColor =
      initialColor ||
      specs.default_color ||
      specs.main_color ||
      activeProduct?.default_color ||
      activeProduct?.main_color ||
      colors[0] ||
      "Default";

    // Place default color at index 0
    const defIdx = colors.findIndex((c) => c.toLowerCase() === defaultColor.toLowerCase());
    if (defIdx > 0) {
      const [def] = colors.splice(defIdx, 1);
      colors.unshift(def);
    }

    const multi = colors.length > 1 && !(colors.length === 1 && (colors[0] === "Default" || colors[0] === "Standard"));

    return {
      colorMap: cMap,
      availableColors: colors,
      hasMultipleColors: multi,
      defaultColorName: defaultColor,
    };
  }, [packages, activeProduct, initialColor]);

  // Items currently in cart for this product
  const inCartVariants = useMemo(() => {
    if (!product) return [];
    return cart.filter(
      (item) =>
        String(item.id) === String(product.id) ||
        (item.cart_item_key && item.cart_item_key.startsWith(`${product.id}_`))
    );
  }, [cart, product]);

  // Initialize and auto-select color and size
  useEffect(() => {
    if (!isOpen || packages.length === 0) return;

    // 1. Color Selection
    let activeColor = selectedColor;
    if (!activeColor) {
      // Check if user has an item in cart for this product
      if (inCartVariants.length > 0 && inCartVariants[0].selected_color) {
        activeColor = inCartVariants[0].selected_color;
      } else {
        activeColor = defaultColorName || availableColors[0] || "Default";
      }
      setSelectedColor(activeColor);
    }

    // 2. Size Selection
    if (!selectedSize) {
      const colorPkgs = colorMap.get(activeColor) || packages;

      // Prioritize in-cart size if matching color
      const inCartMatch = inCartVariants.find(
        (it) =>
          (it.selected_color || "").toLowerCase() === activeColor.toLowerCase() &&
          it.selected_size
      );

      if (inCartMatch?.selected_size) {
        setSelectedSize(inCartMatch.selected_size);
      } else {
        // Find first in-stock variant
        const firstInStock = colorPkgs.find(
          (p) => p.stock === undefined || Number(p.stock) > 0
        ) || colorPkgs[0];

        if (firstInStock?.size) {
          setSelectedSize(firstInStock.size);
        }
      }
    }
  }, [
    isOpen,
    packages,
    selectedColor,
    selectedSize,
    defaultColorName,
    availableColors,
    colorMap,
    inCartVariants,
  ]);

  // Packages in currently selected color
  const packagesInActiveColor = useMemo(() => {
    if (!selectedColor) return packages;
    return colorMap.get(selectedColor) || packages;
  }, [colorMap, selectedColor, packages]);

  // Distinct sizes available for the active color
  const distinctSizes = useMemo(() => {
    const sizeOrder = [
      "Free Size",
      "XS",
      "S",
      "M",
      "L",
      "XL",
      "XXL",
      "2XL",
      "3XL",
      "4XL",
      "5XL",
      "26",
      "28",
      "30",
      "32",
      "34",
      "36",
      "38",
      "40",
      "42",
      "44",
      "UK 6",
      "UK 7",
      "UK 8",
      "UK 9",
      "UK 10",
      "UK 11",
      "UK 12",
    ];

    const sizeSet = new Set<string>();
    packagesInActiveColor.forEach((p) => {
      let sz = (p.size || "").trim();
      if (!sz && p.name?.includes(" / ")) {
        sz = p.name.split(" / ")[1].trim();
      }
      if (sz) sizeSet.add(sz);
    });

    return Array.from(sizeSet).sort((a, b) => {
      const idxA = sizeOrder.indexOf(a.toUpperCase());
      const idxB = sizeOrder.indexOf(b.toUpperCase());
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b, undefined, { numeric: true });
    });
  }, [packagesInActiveColor]);

  // Matched variant package for current color and size
  const matchedVariant: ProductPackage | null = useMemo(() => {
    if (!packages.length) return null;
    return (
      packagesInActiveColor.find(
        (p) => (p.size || "").toLowerCase() === selectedSize.toLowerCase()
      ) || null
    );
  }, [packagesInActiveColor, selectedSize, packages]);

  // Current display price and MRP
  const displayPrice = matchedVariant ? matchedVariant.price : activeProduct?.price || 0;
  const displayMrp = matchedVariant?.mrp || activeProduct?.mrp || 0;
  const hasDiscount = displayMrp > displayPrice;
  const discountPercent = hasDiscount
    ? Math.round(((displayMrp - displayPrice) / displayMrp) * 100)
    : 0;

  // Selected variant image thumbnail
  const displayImage =
    matchedVariant?.image_url ||
    packagesInActiveColor[0]?.image_url ||
    activeProduct?.image_url ||
    (Array.isArray(activeProduct?.images) && activeProduct.images[0]) ||
    "/placeholder.jpg";

  // Stock status of currently selected variant
  const currentStock = matchedVariant?.stock !== undefined ? Number(matchedVariant.stock) : 20;
  const isOutOfStock = currentStock <= 0;

  // Size chart measurements extraction for the selected size
  const sizeChart = (activeProduct?.specifications as any)?.size_chart;
  const measurementDetails = useMemo(() => {
    if (!sizeChart || !Array.isArray(sizeChart.rows) || sizeChart.rows.length === 0 || !selectedSize) {
      return null;
    }

    const matchedRow = sizeChart.rows.find((r: any) => {
      const rowSize = String(r.size || r.Size || "").toLowerCase().trim();
      return rowSize === selectedSize.toLowerCase().trim();
    });

    if (!matchedRow) return null;

    const unit = sizeChart.unit || "in";
    const pairs: Array<{ label: string; value: string }> = [];

    // Check common fashion columns: Chest, Bust, Waist, Length, Inseam, Shoulder, Hip
    const prioritizedKeys = [
      { key: "length", label: "Length" },
      { key: "waist", label: "Waist" },
      { key: "inseam", label: "Inseam length" },
      { key: "Chest", label: "Chest" },
      { key: "chest", label: "Chest" },
      { key: "bust_chest", label: "Chest" },
      { key: "shoulder", label: "Shoulder" },
      { key: "hip", label: "Hip" },
      { key: "thigh", label: "Thigh" },
    ];

    const seenLabels = new Set<string>();

    prioritizedKeys.forEach(({ key, label }) => {
      if (seenLabels.has(label)) return;
      const val = matchedRow[key];
      if (val && String(val).trim() !== "" && String(val).trim() !== "—") {
        seenLabels.add(label);
        pairs.push({ label, value: `${String(val).trim()} ${unit}` });
      }
    });

    // If prioritized keys didn't find anything, inspect remaining row keys
    if (pairs.length === 0) {
      Object.entries(matchedRow).forEach(([k, v]) => {
        if (k.toLowerCase() === "size" || !v || String(v).trim() === "") return;
        const formattedLabel = k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, " ");
        pairs.push({ label: formattedLabel, value: `${String(v).trim()} ${unit}` });
      });
    }

    return pairs.slice(0, 4); // Limit to top 3-4 clean specs to match screenshot
  }, [sizeChart, selectedSize]);

  // Quantity already in cart for currently selected variant
  const currentVariantCartQty = useMemo(() => {
    if (!selectedSize) return 0;
    const item = inCartVariants.find((it) => {
      const matchSize = (it.selected_size || (it as any).size || "").toLowerCase().trim() === selectedSize.toLowerCase().trim();
      const matchColor = !selectedColor || !it.selected_color || it.selected_color.toLowerCase().trim() === selectedColor.toLowerCase().trim();
      return matchSize && matchColor;
    });
    return item?.quantity || 0;
  }, [inCartVariants, selectedSize, selectedColor]);

  // Handle Add to Cart submission
  const handleAddToCart = async () => {
    if (!activeProduct) return;

    // Check if variant selection is required
    if (distinctSizes.length > 0 && !selectedSize) {
      setValidationError("Please select a size to continue");
      return;
    }

    if (isOutOfStock) {
      setValidationError("This option is currently out of stock");
      return;
    }

    setIsAdding(true);
    setValidationError(null);

    try {
      const pkgName = matchedVariant
        ? selectedColor
          ? `${selectedColor} / ${selectedSize}`
          : selectedSize
        : selectedColor || "Standard";

      const cartProductPayload: any = {
        ...activeProduct,
        price: displayPrice,
        mrp: displayMrp,
        stock: currentStock,
        package_name: pkgName,
        variant_id: matchedVariant?.id || "",
        selected_color: selectedColor,
        selected_size: selectedSize,
        selected_sku: matchedVariant?.sku || activeProduct.sku || "",
        selected_image: displayImage,
        image_url: displayImage,
        cart_item_key: `${activeProduct.id}_${matchedVariant?.id || pkgName}`,
      };

      // Add to cart using established CartContext
      await addToCart(cartProductPayload, 1, pkgName);

      setSuccessToast(`Added ${selectedSize ? `Size (${selectedSize})` : activeProduct.name} to Cart!`);

      // Close bottom sheet smoothly after short confirmation
      setTimeout(() => {
        closeVariantSelector();
        setIsAdding(false);
      }, 500);
    } catch (err: any) {
      console.error("[MeeshoVariantBottomSheet] Add to Cart Error:", err);
      setValidationError(err?.message || "Failed to add item to cart. Please try again.");
      setIsAdding(false);
    }
  };

  // Switch color handler
  const handleColorChange = (newColor: string) => {
    setSelectedColor(newColor);
    setValidationError(null);

    // Filter available sizes for this new color
    const pkgs = colorMap.get(newColor) || [];
    const sizesForNewColor = pkgs.map((p) => (p.size || "").trim()).filter(Boolean);

    // If current selected size exists for new color, keep it; otherwise switch to first available
    if (!sizesForNewColor.some((s) => s.toLowerCase() === selectedSize.toLowerCase())) {
      const firstInStock = pkgs.find((p) => p.stock === undefined || Number(p.stock) > 0) || pkgs[0];
      setSelectedSize(firstInStock?.size || "");
    }
  };

  if (!isOpen || !product) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="meesho-variant-sheet-title"
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
    >
      {/* 1. Dark Translucent Backdrop Overlay */}
      <div
        onClick={closeVariantSelector}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        aria-hidden="true"
      />

      {/* 2. White Bottom Sheet Modal (Recreating Reference Screenshot Exactly) */}
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 w-full max-w-lg bg-white text-neutral-900 rounded-t-[1.75rem] sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in slide-in-from-bottom duration-300 transition-all border border-neutral-200"
      >
        {/* Top Header: "Select Size" + Close Icon */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-neutral-100">
          <h2
            id="meesho-variant-sheet-title"
            className="text-lg font-black text-neutral-900 tracking-tight"
          >
            {distinctSizes.length > 0 ? "Select Size" : "Select Option"}
          </h2>
          <button
            type="button"
            onClick={closeVariantSelector}
            className="flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:text-black hover:bg-neutral-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto px-5 py-4 space-y-4 no-scrollbar">
          {/* Validation Error Alert */}
          {validationError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 flex items-center gap-2 text-rose-700 text-xs font-bold animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{validationError}</span>
            </div>
          )}

          {/* Success Notification */}
          {successToast && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2 text-emerald-800 text-xs font-bold animate-in fade-in duration-150">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 stroke-[3]" />
              <span>{successToast}</span>
            </div>
          )}

          {/* Product Header Row: Thumbnail + Name + Price Display */}
          <div className="flex items-start gap-3.5 pb-3 border-b border-neutral-100">
            {/* Small Product Thumbnail */}
            <div className="relative w-16 h-20 rounded-xl overflow-hidden bg-neutral-100 border border-neutral-200 shrink-0">
              <Image
                src={displayImage}
                alt={activeProduct?.name || "Product"}
                fill
                sizes="80px"
                className="object-cover"
                loading="eager"
              />
            </div>

            {/* Name & Pricing */}
            <div className="flex-1 min-w-0 pt-0.5 space-y-1">
              <h3 className="text-xs sm:text-sm font-semibold text-neutral-800 line-clamp-2 leading-snug">
                {activeProduct?.name || "Product"}
              </h3>

              <div className="flex items-baseline gap-2 flex-wrap pt-0.5">
                <span className="text-lg sm:text-xl font-black text-neutral-950">
                  ₹{displayPrice}
                </span>

                {hasDiscount && (
                  <>
                    <span className="text-xs sm:text-sm font-semibold text-neutral-400 line-through">
                      ₹{displayMrp}
                    </span>
                    <span className="text-xs sm:text-sm font-black text-emerald-600">
                      {discountPercent}% off
                    </span>
                  </>
                )}
              </div>

              {/* Stock / In-Cart Micro Badge */}
              <div className="flex items-center gap-2 pt-0.5">
                {currentVariantCartQty > 0 && (
                  <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    ✓ {currentVariantCartQty} in cart
                  </span>
                )}
                {isOutOfStock ? (
                  <span className="text-[10px] font-black uppercase text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                    Out of Stock
                  </span>
                ) : currentStock <= 5 ? (
                  <span className="text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full animate-pulse">
                    ⚡ Only {currentStock} left!
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {/* Color Selector (if product has multiple colors) */}
          {hasMultipleColors && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold uppercase tracking-wider text-neutral-500 text-[11px]">
                  COLOR: <strong className="text-black capitalize ml-1">{selectedColor}</strong>
                </span>
                <span className="text-[11px] font-semibold text-neutral-400">
                  {availableColors.length} Colors
                </span>
              </div>

              <div className="flex items-center gap-2.5 overflow-x-auto pb-1.5 pt-0.5 no-scrollbar scroll-smooth">
                {availableColors.map((col) => {
                  const isColSelected = selectedColor.toLowerCase() === col.toLowerCase();
                  const colPkgs = colorMap.get(col) || [];
                  const colThumb = colPkgs[0]?.image_url || displayImage;
                  const isColInStock = colPkgs.some(
                    (p) => p.stock === undefined || Number(p.stock) > 0
                  );

                  return (
                    <button
                      key={col}
                      type="button"
                      disabled={!isColInStock}
                      onClick={() => handleColorChange(col)}
                      className={`group flex items-center gap-2 px-2.5 py-1.5 rounded-xl border transition-all shrink-0 cursor-pointer ${
                        isColSelected
                          ? "border-black bg-neutral-900 text-white shadow-md"
                          : isColInStock
                          ? "border-neutral-200 bg-white text-neutral-800 hover:border-neutral-400"
                          : "border-neutral-200 bg-neutral-50 text-neutral-400 opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <div className="relative w-6 h-7 rounded-md overflow-hidden bg-neutral-100 border border-neutral-300 shrink-0">
                        <img src={colThumb} alt={col} className="w-full h-full object-cover" />
                      </div>
                      <span className="text-xs font-bold capitalize pr-1">{col}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Horizontally Scrollable Size Pills (Meesho Master Reference) */}
          {isLoadingVariants ? (
            <div className="space-y-2 py-2">
              <div className="h-4 w-28 bg-neutral-100 rounded animate-pulse" />
              <div className="flex gap-2.5 overflow-hidden">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className="h-14 w-16 bg-neutral-100 rounded-xl animate-pulse shrink-0 border border-neutral-200"
                  />
                ))}
              </div>
            </div>
          ) : distinctSizes.length > 0 ? (
            <div className="space-y-2.5">
              {/* Size Buttons Grid / Horizontal Scroll */}
              <div className="flex items-center gap-2.5 overflow-x-auto pb-2 pt-1 no-scrollbar scroll-smooth">
                {distinctSizes.map((sizeName) => {
                  const matchedPkg = packagesInActiveColor.find(
                    (p) => (p.size || "").toLowerCase() === sizeName.toLowerCase()
                  );

                  const pkgStock = matchedPkg?.stock !== undefined ? Number(matchedPkg.stock) : 20;
                  const isSizeOOS = pkgStock <= 0;
                  const isSelected = selectedSize.toLowerCase() === sizeName.toLowerCase() && !isSizeOOS;
                  const sizePrice = matchedPkg?.price || displayPrice;

                  // Cart qty for this size
                  const inCartItem = inCartVariants.find(
                    (it) =>
                      (it.selected_size || (it as any).size || "").toLowerCase().trim() === sizeName.toLowerCase().trim() &&
                      (!selectedColor || !it.selected_color || it.selected_color.toLowerCase().trim() === selectedColor.toLowerCase().trim())
                  );
                  const inCartQty = inCartItem?.quantity || 0;

                  return (
                    <button
                      key={sizeName}
                      type="button"
                      disabled={isSizeOOS}
                      onClick={() => {
                        setSelectedSize(sizeName);
                        setValidationError(null);
                      }}
                      className={`relative flex min-w-[62px] sm:min-w-[68px] h-14 flex-col items-center justify-center rounded-xl border px-3 text-center transition-all cursor-pointer ${
                        isSizeOOS
                          ? "bg-neutral-100 border-neutral-200 text-neutral-400 cursor-not-allowed opacity-60"
                          : isSelected
                          ? "bg-black text-white border-black shadow-lg scale-102 ring-2 ring-black/20"
                          : "bg-white text-neutral-900 border-neutral-300 hover:border-neutral-400 hover:bg-neutral-50"
                      }`}
                      title={
                        isSizeOOS
                          ? `${sizeName} is Out of Stock`
                          : inCartQty > 0
                          ? `${inCartQty} in cart. Select size ${sizeName}`
                          : `Select size ${sizeName}`
                      }
                    >
                      {/* Out of Stock Strike */}
                      {isSizeOOS && (
                        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="w-[120%] h-[1.5px] bg-rose-500/70 rotate-[-25deg]" />
                        </span>
                      )}

                      {/* In-Cart Mini Badge */}
                      {inCartQty > 0 && !isSizeOOS && (
                        <span className="absolute -top-1.5 -right-1.5 z-10 min-w-[17px] h-[17px] px-1 bg-emerald-500 text-black text-[9px] font-black rounded-full shadow-md border border-white flex items-center justify-center">
                          {inCartQty}
                        </span>
                      )}

                      {/* Size Name */}
                      <span
                        className={`text-sm font-black tracking-tight ${
                          isSelected ? "text-white" : isSizeOOS ? "text-neutral-400 line-through" : "text-neutral-950"
                        }`}
                      >
                        {sizeName}
                      </span>

                      {/* Variant Price */}
                      <span
                        className={`text-[10px] font-semibold mt-0.5 ${
                          isSelected ? "text-neutral-300" : isSizeOOS ? "text-neutral-400" : "text-neutral-500"
                        }`}
                      >
                        {isSizeOOS ? "OOS" : `₹${sizePrice}`}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Variant Measurements Line (Under Size Pills - Matching Meesho Screenshot) */}
              {selectedSize && measurementDetails && measurementDetails.length > 0 && (
                <div className="pt-1 text-xs text-neutral-700 font-medium animate-in fade-in duration-200">
                  <span className="font-bold text-neutral-900">Size ({selectedSize}) - </span>
                  {measurementDetails.map((detail, idx) => (
                    <React.Fragment key={detail.label}>
                      <span>
                        {detail.label}: <strong className="font-black text-black">{detail.value}</strong>
                      </span>
                      {idx < measurementDetails.length - 1 && (
                        <span className="mx-2 text-neutral-300 font-light">|</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Bottom Sticky Action: Prominent Meesho/Zebalpha Yellow "Add To Cart" Button */}
        <div className="p-4 pt-3 pb-6 sm:pb-4 border-t border-neutral-100 bg-white">
          <button
            type="button"
            disabled={isAdding || isOutOfStock || (distinctSizes.length > 0 && !selectedSize)}
            onClick={handleAddToCart}
            className="w-full flex h-13 items-center justify-center gap-2 rounded-xl bg-[#FEE500] hover:bg-[#FDD800] active:scale-[0.99] text-black font-black uppercase tracking-wider text-sm shadow-md transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none"
          >
            {isAdding ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-black" />
                <span>Adding to Cart...</span>
              </>
            ) : isOutOfStock ? (
              <span>Out of Stock</span>
            ) : (
              <span>Add To Cart</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
