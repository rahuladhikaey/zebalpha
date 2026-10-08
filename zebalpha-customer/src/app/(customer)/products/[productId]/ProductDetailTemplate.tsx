"use client";

import { useState, useEffect, useMemo } from "react";
import { Product, ProductPackage } from "@/lib/types";
import { AddToCartButton } from "@/components/AddToCartButton";
import { BuyNowButton } from "@/components/BuyNowButton";
import { WishlistButton } from "@/components/WishlistButton";
import { ShieldCheck, Truck, RefreshCcw, Tag, ChevronRight, Star, Bell, CheckCircle2, Sparkles, Flame } from "lucide-react";
import Link from "next/link";
import ProductImageCarousel from "@/components/ProductImageCarousel";
import { PackageSelection } from "@/components/PackageSelection";
import { normalizeProductImages } from "@/lib/productImageUtils";
import { VirtualTryOnButton } from "@/components/vto/VirtualTryOnButton";
import dynamic from "next/dynamic";
const VirtualTryOnModal = dynamic(
  () => import("@/components/vto/VirtualTryOnModal").then((mod) => mod.VirtualTryOnModal),
  { ssr: false, loading: () => null }
);
import { isProductNewDrop, isDropLive, getDropDisplayStatus } from "@/lib/dropUtils";
export default function ProductDetailTemplate({
  product,
  relatedProducts = [],
  relatedProductsSlot
}: {
  product: Product;
  relatedProducts?: Product[];
  relatedProductsSlot?: React.ReactNode;
}) {
  const [isVtoOpen, setIsVtoOpen] = useState(false);
  // 1. Normalize packages from product
  const normalizedPackages = useMemo(() => {
    if (!product.packages || product.packages.length === 0) return [];
    return product.packages.map((pkg, idx) => {
      let col = (pkg.color || "").trim();
      if (!col && pkg.name?.includes(" / ")) col = pkg.name.split(" / ")[0].trim();
      else if (!col && pkg.name?.includes(" - ")) col = pkg.name.split(" - ")[0].trim();
      col = col || "Default";

      let sz = (pkg.size || "").trim();
      if (!sz && pkg.name?.includes(" / ")) sz = pkg.name.split(" / ")[1].trim();
      else if (!sz && pkg.name?.includes(" - ")) sz = pkg.name.split(" - ")[1].trim();
      sz = sz || "Free Size";

      return {
        ...pkg,
        color: col,
        size: sz,
        price: idx === 0 ? product.price : (pkg.price || product.price),
        mrp: product.mrp != null ? product.mrp : (pkg.mrp || product.mrp),
        gallery: pkg.gallery || (pkg.image_url ? [pkg.image_url] : []),
      };
    });
  }, [product.packages, product.price, product.mrp]);

  // 2. Extract Color Groups & Available Colors
  const { colorGroups, defaultColorName } = useMemo(() => {
    const map = new Map<string, {
      colorName: string;
      colorHex?: string;
      thumbnail?: string;
      gallery: string[];
      variants: ProductPackage[];
      isAvailable: boolean;
      basePrice: number;
      baseMrp: number;
    }>();

    normalizedPackages.forEach((pkg) => {
      const col = pkg.color || "Default";
      if (!map.has(col)) {
        map.set(col, {
          colorName: col,
          colorHex: pkg.color_hex,
          thumbnail: pkg.image_url || pkg.gallery?.[0],
          gallery: [],
          variants: [],
          isAvailable: false,
          basePrice: pkg.price,
          baseMrp: pkg.mrp || pkg.price,
        });
      }
      const grp = map.get(col)!;
      grp.variants.push(pkg);
      if (pkg.stock === undefined || Number(pkg.stock) > 0) {
        grp.isAvailable = true;
      }
      if (pkg.price < grp.basePrice) grp.basePrice = pkg.price;
      if (pkg.mrp && pkg.mrp > grp.baseMrp) grp.baseMrp = pkg.mrp;

      if (pkg.gallery && Array.isArray(pkg.gallery)) {
        pkg.gallery.forEach((g) => {
          if (g && !grp.gallery.includes(g)) grp.gallery.push(g);
        });
      } else if (pkg.image_url && !grp.gallery.includes(pkg.image_url)) {
        grp.gallery.push(pkg.image_url);
      }
    });

    const groups = Array.from(map.values());
    const available = groups.find((g) => g.isAvailable);
    const defColor = available?.colorName || groups[0]?.colorName || "";

    return { colorGroups: groups, defaultColorName: defColor };
  }, [normalizedPackages]);

  const hasVariants = normalizedPackages.length > 0;

  // 3. Single Source of Truth State
  const [selectedColor, setSelectedColor] = useState<string>(defaultColorName);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [validationError, setValidationError] = useState<string>("");

  // Sync selectedColor if defaultColorName is resolved asynchronously
  useEffect(() => {
    if (!selectedColor && defaultColorName) {
      setSelectedColor(defaultColorName);
    }
  }, [defaultColorName, selectedColor]);

  // Active color group
  const currentColorGroup = useMemo(() => {
    return (
      colorGroups.find((g) => g.colorName.toLowerCase() === selectedColor.toLowerCase()) ||
      colorGroups[0] ||
      null
    );
  }, [colorGroups, selectedColor]);

  // Exact selected variant combination
  const selectedVariant = useMemo(() => {
    if (!currentColorGroup || !selectedSize) return null;
    return (
      currentColorGroup.variants.find(
        (v) => (v.size || "").toLowerCase() === selectedSize.toLowerCase()
      ) || null
    );
  }, [currentColorGroup, selectedSize]);

  // Handle color change:
  // Immediately switch selected color, gallery and available sizes.
  // Check if current selectedSize is available in the new color; if not, reset size selection.
  const handleColorChange = (newColor: string) => {
    setSelectedColor(newColor);
    setValidationError("");

    const newGroup = colorGroups.find((g) => g.colorName.toLowerCase() === newColor.toLowerCase());
    if (newGroup && selectedSize) {
      const matched = newGroup.variants.find(
        (v) => (v.size || "").toLowerCase() === selectedSize.toLowerCase()
      );
      if (matched && (matched.stock === undefined || Number(matched.stock) > 0)) {
        // Size preserved
      } else {
        setSelectedSize("");
      }
    }
  };

  // Handle size selection
  const handleSizeSelect = (newSize: string) => {
    setSelectedSize(newSize);
    setValidationError("");
  };

  // Color-specific gallery images for the main hero carousel
  const images = useMemo(() => {
    if (currentColorGroup && currentColorGroup.gallery.length > 0) {
      if (selectedVariant?.image_url && currentColorGroup.gallery.includes(selectedVariant.image_url)) {
        return [
          selectedVariant.image_url,
          ...currentColorGroup.gallery.filter((img) => img !== selectedVariant.image_url),
        ];
      }
      return currentColorGroup.gallery;
    }

    if (currentColorGroup?.thumbnail) {
      return [currentColorGroup.thumbnail];
    }

    return normalizeProductImages(product);
  }, [currentColorGroup, selectedVariant, product]);

  // Price & MRP
  const displayPrice = selectedVariant
    ? selectedVariant.price
    : currentColorGroup
    ? currentColorGroup.basePrice
    : product.price;

  const displayMrp = selectedVariant && selectedVariant.mrp
    ? selectedVariant.mrp
    : currentColorGroup
    ? currentColorGroup.baseMrp
    : product.mrp;

  const hasDiscount = displayMrp && displayMrp > displayPrice;
  const discountPercent = hasDiscount ? Math.round(((displayMrp! - displayPrice) / displayMrp!) * 100) : 0;

  // Stock status
  const isCurrentVariantInStock = useMemo(() => {
    if (selectedVariant) {
      return selectedVariant.stock !== undefined ? Number(selectedVariant.stock) > 0 : true;
    }
    if (hasVariants) {
      return currentColorGroup ? currentColorGroup.isAvailable : true;
    }
    return product.stock !== undefined ? Number(product.stock) > 0 : true;
  }, [selectedVariant, hasVariants, currentColorGroup, product.stock]);

  // Computed product object for Cart & Checkout
  const computedProduct = useMemo(() => {
    const pkgName = selectedVariant
      ? (selectedColor ? `${selectedColor} / ${selectedSize}` : selectedSize)
      : (selectedColor || "Standard");

    const pkgImg =
      selectedVariant?.image_url ||
      currentColorGroup?.thumbnail ||
      images[0] ||
      product.image_url;

    const skuVal = selectedVariant?.sku || product.sku || "";

    return {
      ...product,
      price: displayPrice,
      mrp: displayMrp,
      stock: selectedVariant?.stock !== undefined ? selectedVariant.stock : (currentColorGroup?.isAvailable ? 20 : 0),
      name: selectedVariant
        ? `${product.name} (${selectedColor ? `${selectedColor} - ` : ''}${selectedSize})`
        : product.name,
      package_name: pkgName,
      variant_id: selectedVariant?.id,
      selected_color: selectedColor,
      selected_size: selectedSize,
      selected_sku: skuVal,
      selected_image: pkgImg,
      image_url: pkgImg,
      cart_item_key: `${product.id}_${selectedVariant?.id || pkgName}`,
    };
  }, [
    product,
    selectedVariant,
    selectedColor,
    selectedSize,
    displayPrice,
    displayMrp,
    currentColorGroup,
    images,
  ]);

  // Validation before Add to Cart or Buy Now
  const handleValidateAndProceed = () => {
    if (hasVariants) {
      if (!selectedColor) {
        setValidationError("Please select a color");
        const el = document.getElementById("color-selection-section");
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        return false;
      }
      if (!selectedSize || !selectedVariant) {
        setValidationError("Please select a size");
        const el = document.getElementById("size-selection-section");
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
        return false;
      }
      if (selectedVariant.stock !== undefined && Number(selectedVariant.stock) <= 0) {
        setValidationError("Selected variant is out of stock");
        return false;
      }
    }
    setValidationError("");
    return true;
  };

  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("zebalpha_reviews") || localStorage.getItem("asali_swad_reviews");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const productReviews = parsed.filter((r: any) => Number(r.product_id) === Number(product.id));
          // Sort by newest first
          productReviews.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setReviews(productReviews);
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [product.id]);

  const averageRating = useMemo(() => {
    if (reviews.length === 0) return product.rating || 0;
    const sum = reviews.reduce((acc, curr) => acc + curr.rating, 0);
    return Number((sum / reviews.length).toFixed(1));
  }, [reviews, product.rating]);

  const starCounts = useMemo(() => {
    const counts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    if (reviews.length === 0) {
      return { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    }
    reviews.forEach((r) => {
      const rVal = Math.min(5, Math.max(1, Math.round(r.rating))) as 5 | 4 | 3 | 2 | 1;
      counts[rVal] = (counts[rVal] || 0) + 1;
    });
    const total = reviews.length;
    return {
      5: Math.round((counts[5] / total) * 100),
      4: Math.round((counts[4] / total) * 100),
      3: Math.round((counts[3] / total) * 100),
      2: Math.round((counts[2] / total) * 100),
      1: Math.round((counts[1] / total) * 100),
    };
  }, [reviews]);

  const [isDropNotified, setIsDropNotified] = useState(false);
  const [dropToast, setDropToast] = useState("");

  const isNewDrop = useMemo(() => isProductNewDrop(product), [product]);
  const isLive = useMemo(() => isDropLive(product), [product]);
  const isUpcomingDrop = isNewDrop && !isLive;
  const dropStatusInfo = useMemo(() => getDropDisplayStatus(product), [product]);

  const handleNotifyDrop = () => {
    setIsDropNotified(true);
    setDropToast(`🔔 VIP Launch Alert Registered! We'll notify you as soon as ${product.name} drops.`);
    setTimeout(() => setDropToast(""), 4500);
  };

  return (
    <div className="bg-black text-white">
      {dropToast && (
        <div className="sticky top-[68px] z-50 bg-emerald-950/90 border-b border-emerald-500/50 backdrop-blur-xl px-4 py-3 text-center text-xs font-black text-emerald-200 animate-in fade-in slide-in-from-top-2 duration-300">
          {dropToast}
        </div>
      )}

      <div className="mx-auto max-w-[1440px] px-4 py-8 md:px-8 lg:py-12">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-start">

          {/* LEFT COLUMN: Interactive Image Carousel */}
          <div className="lg:col-span-7 lg:sticky lg:top-24">
            <div className="flex flex-col gap-6">
              {/* Image Carousel with Slide Controls */}
              <ProductImageCarousel images={images} productName={product.name} />

              {/* Wishlist Button */}
              <div className="flex justify-end">
                <WishlistButton product={product} />
              </div>

              {/* Action Buttons - Desktop */}
              <div className="hidden lg:grid grid-cols-2 gap-4 mt-2">
                {isUpcomingDrop ? (
                  <div className="col-span-2 flex gap-3">
                    <button
                      type="button"
                      onClick={handleNotifyDrop}
                      className={`flex h-16 flex-1 items-center justify-center gap-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 cursor-pointer shadow-xl ${
                        isDropNotified
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800 cursor-default"
                          : "bg-white text-black hover:bg-neutral-200 shadow-white/10"
                      }`}
                    >
                      {isDropNotified ? (
                        <>
                          <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                          Registered for Drop
                        </>
                      ) : (
                        <>
                          <Bell className="h-5 w-5" />
                          Notify Me on Drop ⚡
                        </>
                      )}
                    </button>
                    <Link
                      href="/new-drops"
                      className="flex h-16 px-6 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 text-xs font-black uppercase tracking-wider text-white hover:bg-zinc-800 transition-all"
                    >
                      Explore All Drops
                    </Link>
                  </div>
                ) : isCurrentVariantInStock ? (
                  <>
                    <AddToCartButton
                      product={computedProduct}
                      onBeforeAdd={handleValidateAndProceed}
                      className="flex h-16 items-center justify-center gap-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-sm font-black uppercase tracking-widest text-white shadow-xl hover:bg-zinc-800 active:scale-95 cursor-pointer"
                    />
                    <div className="w-full">
                      <BuyNowButton
                        product={computedProduct}
                        onBeforeBuy={handleValidateAndProceed}
                        className="flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-white text-sm font-black uppercase tracking-widest text-black shadow-xl shadow-white/10 transition-all hover:bg-zinc-200 active:scale-95 cursor-pointer"
                      />
                    </div>
                  </>
                ) : (
                  <div className="col-span-2">
                    <button disabled className="flex h-16 w-full items-center justify-center rounded-2xl bg-zinc-900 text-sm font-black uppercase tracking-widest text-zinc-500 border border-zinc-800 cursor-not-allowed">
                      Out of Stock
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Product Info */}
          <div className="lg:col-span-5 space-y-10">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-widest">
              <span>Home</span> <ChevronRight size={12} aria-hidden="true" />
              <span>{product.category_name || "Products"}</span> <ChevronRight size={12} aria-hidden="true" />
              <span className="text-white truncate text-[10px] sm:text-xs">{product.name}</span>
            </nav>

            <div className="space-y-4">
              {isNewDrop && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider ${
                    isLive 
                      ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border border-amber-500/30 bg-amber-500/10 text-amber-400"
                  }`}>
                    {isLive ? <Flame className="h-3.5 w-3.5 text-emerald-400 fill-emerald-400" /> : <Sparkles className="h-3.5 w-3.5 text-amber-400" />}
                    {dropStatusInfo.badgeLabel}
                  </span>
                  <span className="text-xs font-bold text-zinc-400">
                    • {dropStatusInfo.dateText}
                  </span>
                </div>
              )}

              <h1 className="text-2xl font-bold text-white md:text-3xl leading-tight">
                {product.name}
              </h1>
            </div>

            {isUpcomingDrop && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-black text-xs uppercase tracking-wider">
                  <Sparkles className="h-4 w-4" />
                  ⚡ Upcoming Exclusive Drop • {dropStatusInfo.dateText}
                </div>
                <p className="text-xs text-zinc-300 font-medium leading-relaxed">
                  This product is currently in upcoming preview stage and will be available for direct orders upon launch date. Click &quot;Notify Me on Drop&quot; to receive instant VIP launch alerts!
                </p>
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="text-4xl font-black text-white">₹{displayPrice}</span>
                {hasDiscount && (
                  <>
                    <span className="text-lg font-bold text-zinc-500 line-through">₹{displayMrp}</span>
                    <span className="text-lg font-black text-white bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-lg">{discountPercent}% off</span>
                  </>
                )}
              </div>
              <p className="text-xs font-bold text-zinc-400">
                {isUpcomingDrop ? "Preview Price (Inclusive of all taxes)" : "Special Price including all taxes"}
              </p>
            </div>

            {hasVariants && (
              <PackageSelection 
                packages={normalizedPackages} 
                selectedColor={selectedColor}
                selectedSize={selectedSize}
                selectedVariant={selectedVariant}
                onColorChange={handleColorChange}
                onSizeSelect={handleSizeSelect}
                sizeChart={(product.specifications as any)?.size_chart}
                validationError={validationError}
              />
            )}


            {/* Available Offers */}
            {product.offers && product.offers.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-zinc-800">
                <h3 className="text-base font-black text-white">Available Offers</h3>
                <div className="space-y-3">
                  {product.offers.map((offer, i) => (
                    <div key={i} className="flex gap-3 text-sm font-medium text-zinc-300">
                      <Tag className="shrink-0 text-white mt-0.5" size={16} />
                      <span>{offer} <span className="text-zinc-400 underline font-black cursor-pointer ml-1 text-xs">T&C</span></span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Description & Highlights */}
            <div className="grid gap-8 md:grid-cols-2 pt-4 border-t border-zinc-800">
              <div className="space-y-4">
                <h3 className="text-base font-black text-white border-b border-zinc-800 pb-2">Product Description</h3>
                <p className="text-sm font-medium leading-relaxed text-zinc-300">{product.description}</p>
              </div>
              <div className="space-y-4">
                <h3 className="text-base font-black text-white border-b border-zinc-800 pb-2">Highlights</h3>
                <ul className="space-y-2 list-disc list-inside text-sm font-medium text-zinc-300">
                  <li>100% Genuine & Certified Quality</li>
                  <li>Exclusive Drop & Contemporary Fit</li>
                  <li>Premium Durable Stitching & Fabric</li>
                  <li>Dispatched in Tamper-Proof Packaging</li>
                </ul>
              </div>
            </div>

            {/* Seller / Retailer Info */}
            <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between shadow-xl">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800 text-white overflow-hidden" aria-hidden="true">
                  {product.seller_logo ? (
                    <img src={product.seller_logo} alt={product.seller_name || product.brand || "ZEBALPHA"} className="h-full w-full object-cover" />
                  ) : (
                    <ShieldCheck className="h-6 w-6 text-white" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">
                    {product.seller_name || product.business_name || product.brand || "ZEBALPHA Official Store"}
                  </h4>
                  <p className="text-xs font-bold text-zinc-400">
                    {product.seller_city ? `Verified Merchant • ${product.seller_city}` : 'Verified Partner • 24Hr. Return Policy'}
                  </p>
                </div>
              </div>
              <span className="text-xs font-black uppercase tracking-wider text-white bg-zinc-900 border border-zinc-700 px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                Verified
              </span>
            </div>

            {/* Features (Bottom Icons) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-12">
              <div className="flex flex-col items-center text-center p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
                <Truck className="mb-4 text-white" size={32} aria-hidden="true" />
                <span className="text-xs font-black text-white uppercase">Fast Delivery</span>
              </div>
              <div className="flex flex-col items-center text-center p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
                <ShieldCheck className="mb-4 text-white" size={32} aria-hidden="true" />
                <span className="text-xs font-black text-white uppercase">Secure Pay</span>
              </div>
              <div className="flex flex-col items-center text-center p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
                <RefreshCcw className="mb-4 text-white" size={32} aria-hidden="true" />
                <span className="text-xs font-black text-white uppercase">Easy Returns</span>
              </div>
              <div className="flex flex-col items-center text-center p-4 bg-zinc-950 border border-zinc-800 rounded-2xl">
                <Tag className="mb-4 text-white" size={32} aria-hidden="true" />
                <span className="text-xs font-black text-white uppercase">Original Item</span>
              </div>
            </div>

            {/* Premium Ratings & Reviews Section */}
            <div className="mt-8 border-t border-zinc-800 pt-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Feedback</span>
                  <h3 className="text-xl font-black text-white mt-0.5">Ratings & Reviews</h3>
                </div>
                <span className="text-xs font-black uppercase tracking-wider text-black bg-white px-3.5 py-1.5 rounded-full flex items-center gap-1 shadow-xl shadow-white/10">
                  ★ {averageRating} / 5
                </span>
              </div>

              {/* Rating Card & Breakdown Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center p-6 rounded-[2rem] bg-zinc-950 border border-zinc-800 shadow-xl">
                <div className="md:col-span-4 text-center md:border-r border-zinc-800 md:pr-6 space-y-2">
                  <p className="text-5xl font-black text-white leading-none">{averageRating}</p>
                  <div className="flex items-center justify-center gap-0.5 text-white">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} size={18} className="fill-current" fill={i < Math.round(averageRating) ? "currentColor" : "none"} />
                    ))}
                  </div>
                  <p className="text-[10px] font-extrabold text-zinc-400 uppercase tracking-wider">Based on {reviews.length} verified review{reviews.length === 1 ? "" : "s"}</p>
                </div>
 
                <div className="md:col-span-8 space-y-2 text-xs">
                  {([5, 4, 3, 2, 1] as const).map((star) => (
                    <div key={star} className="flex items-center gap-3">
                      <span className="w-3 font-extrabold text-zinc-300 text-right">{star}</span>
                      <Star size={10} className="text-white shrink-0 fill-current" aria-hidden="true" />
                      <div className="flex-1 h-2.5 rounded-full bg-zinc-900 overflow-hidden border border-zinc-800">
                        <div 
                          className="h-full bg-white rounded-full transition-all duration-500" 
                          style={{ width: `${starCounts[star]}%` }}
                        />
                      </div>
                      <span className="w-8 text-zinc-400 text-right font-extrabold">{starCounts[star]}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reviews List */}
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 no-scrollbar">
                {reviews.length > 0 ? (
                  reviews.map((r, i) => (
                    <div key={r.id || i} className="p-5 rounded-[1.75rem] bg-zinc-950 border border-zinc-800 shadow-xl space-y-2.5 transition hover:border-zinc-700">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-zinc-900 text-white flex items-center justify-center font-black text-sm border border-zinc-800">
                            {r.user_name?.[0]?.toUpperCase() || "C"}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-black text-white">{r.user_name}</h4>
                              <span className="text-[9px] font-extrabold text-white bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-700 flex items-center gap-0.5">
                                Verified Buyer ✓
                              </span>
                            </div>
                            <div className="flex items-center gap-0.5 text-white mt-1">
                              {Array.from({ length: 5 }).map((_, si) => (
                                <Star key={si} size={11} className="fill-current" fill={si < r.rating ? "currentColor" : "none"} aria-hidden="true" />
                              ))}
                            </div>
                          </div>
                        </div>
                        <span className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-500">
                          {new Date(r.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-zinc-300 leading-relaxed pl-12">
                        {r.comment}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 border-2 border-dashed border-zinc-800 rounded-[2rem] bg-zinc-950 space-y-2">
                    <p className="text-sm font-black text-zinc-400">No custom reviews yet</p>
                    <p className="text-xs font-bold text-zinc-500">Rate this product inside your Purchase History to be the first!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1440px] px-4 md:px-8">
        {relatedProductsSlot ? (
          relatedProductsSlot
        ) : relatedProducts.length > 0 ? (
          <div className="mt-20 border-t border-zinc-800 pt-16">
            <div className="flex items-center justify-between mb-8">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Suggestions</span>
                <h2 className="text-2xl font-black text-white mt-1">You Might Also Like</h2>
              </div>
              <Link href="/products" className="text-sm font-black text-white hover:underline">View All Products</Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
              {relatedProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/products/${p.id}`}
                  className="group flex flex-col rounded-3xl bg-zinc-950 p-3 transition-all hover:shadow-2xl border border-zinc-800 hover:border-zinc-700"
                >
                  <div className="aspect-square w-full overflow-hidden rounded-2xl bg-zinc-900 mb-4 flex items-center justify-center">
                    <img
                      src={p.images?.[0] || p.image_url}
                      alt={p.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="text-sm font-bold text-white line-clamp-1 group-hover:text-zinc-300 transition-colors">{p.name}</h3>
                    <div className="flex items-center gap-1.5">
                      <div className="flex h-5 items-center gap-0.5 rounded-md bg-white text-black px-1.5 text-[10px] font-bold">
                        <span>4.4</span>
                        <Star size={8} fill="currentColor" aria-hidden="true" />
                      </div>
                      <span className="text-[10px] font-bold text-zinc-400">(234)</span>
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-zinc-500 line-through">
                          ₹{p.mrp || Math.round(p.price * 1.2)}
                        </span>
                        <span className="text-[9px] font-extrabold text-white bg-zinc-900 border border-zinc-800 px-1 py-0.5 rounded">
                          {Math.round((((p.mrp || Math.round(p.price * 1.2)) - p.price) / (p.mrp || Math.round(p.price * 1.2))) * 100)}% OFF
                        </span>
                      </div>
                      <span className="text-sm font-black text-white">₹{p.price}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* STICKY BOTTOM BAR FOR MOBILE */}
      <div className="fixed bottom-0 left-0 right-0 z-[60] flex h-16 w-full items-center bg-black/95 backdrop-blur-md border-t border-zinc-800 lg:hidden shadow-2xl px-3 gap-2">
        {isUpcomingDrop ? (
          <div className="flex-1 flex gap-2 h-11">
            <button
              type="button"
              onClick={handleNotifyDrop}
              className={`flex-1 flex items-center justify-center rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                isDropNotified
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800 cursor-default"
                  : "bg-white text-black"
              }`}
            >
              {isDropNotified ? "Registered 🔔" : "Notify Me on Drop ⚡"}
            </button>
            <Link
              href="/new-drops"
              className="px-3 flex items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-[10px] font-black text-white"
            >
              Drops ⚡
            </Link>
          </div>
        ) : isCurrentVariantInStock ? (
          <div className="grid grid-cols-2 h-11 flex-1 gap-2">
            <AddToCartButton
              product={computedProduct}
              onBeforeAdd={handleValidateAndProceed}
              className="flex h-full items-center justify-center rounded-xl bg-zinc-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-colors border border-zinc-800 cursor-pointer"
            />
            <BuyNowButton
              product={computedProduct}
              onBeforeBuy={handleValidateAndProceed}
              className="flex h-full items-center justify-center rounded-xl bg-white text-black text-[10px] font-black uppercase tracking-widest hover:bg-zinc-200 transition-colors cursor-pointer"
            />
          </div>
        ) : (
          <div className="flex-1 h-11">
            <button disabled className="flex h-full w-full items-center justify-center rounded-xl bg-zinc-900 text-[10px] font-black uppercase tracking-widest text-zinc-500 border border-zinc-800 cursor-not-allowed">
              Out of Stock
            </button>
          </div>
        )}
      </div>

      {/* Padding for bottom bar on mobile */}
      <div className="h-20 lg:hidden" />

      {/* ✨ MASTER VIRTUAL TRY-ON MODAL */}
      <VirtualTryOnModal
        isOpen={isVtoOpen}
        onClose={() => setIsVtoOpen(false)}
        product={computedProduct}
      />
    </div>
  );
}
