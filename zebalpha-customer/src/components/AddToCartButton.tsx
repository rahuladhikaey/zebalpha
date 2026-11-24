"use client";

import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useVariantSelector } from "@/context/VariantSelectorContext";
import { Product } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { isProductNewDrop, isDropLive } from "@/lib/dropUtils";
import { useOfficialTheme } from "@/lib/platform";
import { useExperienceTheme } from "@/context/ExperienceThemeContext";

export function AddToCartButton({ 
  product, 
  className, 
  compact,
  variant = "primary",
  onBeforeAdd,
}: { 
  product: Product; 
  className?: string; 
  compact?: boolean;
  variant?: "primary" | "outline";
  onBeforeAdd?: () => boolean;
}) {
  const { cart, addToCart, updateQuantity, removeFromCart } = useCart();
  const { openVariantSelector } = useVariantSelector();
  const { session } = useAuth();
  const router = useRouter();
  const isNativeApp = useOfficialTheme();
  const { experience, isFestivalOverride } = useExperienceTheme();
  const t = experience.themeTokens;
  const isLightBtnText =
    (t.primaryButtonText || "").toUpperCase() === "#FFFFFF" ||
    (t.primaryButtonText || "").toUpperCase() === "#FFFDF8";
  
  const isUpcomingDrop = isProductNewDrop(product) && !isDropLive(product);
  const isOutOfStock = !isUpcomingDrop && ((product.stock !== undefined && product.stock !== null && Number(product.stock) <= 0) || product.status === "OUT_OF_STOCK");

  const handleAdd = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isUpcomingDrop) {
      router.push(`/new-drops`);
      return;
    }

    // If clicked on feed/card without onBeforeAdd (which is only present on PDP):
    if (!onBeforeAdd) {
      const pkgs = product.packages;
      const hasMultiplePkgs = Array.isArray(pkgs) && pkgs.length > 1;
      const hasUnselectedPkg = Array.isArray(pkgs) && pkgs.length > 0 && !(product as any).variant_id;
      const mightHaveVariants = !pkgs && (product.category_id || (product as any).specifications?.size_chart);

      // Intelligently open Meesho variant selection bottom sheet!
      if (hasMultiplePkgs || hasUnselectedPkg || mightHaveVariants) {
        openVariantSelector(product);
        return;
      }
    }

    if (onBeforeAdd) {
      const allowed = onBeforeAdd();
      if (!allowed) return;
    }
    if (isOutOfStock) return;
    addToCart(product, 1);
  };

  if (isUpcomingDrop) {
    if (compact) {
      return (
        <span 
          onClick={() => router.push('/new-drops')}
          className="flex h-8 sm:h-10 px-2.5 sm:px-3 items-center justify-center rounded-full sm:rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 font-bold text-[9px] sm:text-xs uppercase tracking-wider cursor-pointer select-none"
          title="Upcoming New Drop"
        >
          ⚡ Drop
        </span>
      );
    }
    return (
      <span 
        onClick={() => router.push('/new-drops')}
        className={className || "flex h-10 px-4 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 font-bold text-xs uppercase tracking-widest cursor-pointer select-none"}
        title="Upcoming New Drop"
      >
        ⚡ Dropping Soon
      </span>
    );
  }

  if (isOutOfStock) {
    if (compact) {
      return (
        <span 
          className="flex h-8 sm:h-10 px-2.5 sm:px-3 items-center justify-center rounded-full sm:rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-500 font-bold text-[9px] sm:text-xs uppercase tracking-wider cursor-not-allowed select-none"
          title="Out of stock"
        >
          Sold Out
        </span>
      );
    }
    return (
      <span 
        className={className || "flex h-10 px-4 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-500 font-bold text-xs uppercase tracking-widest cursor-not-allowed select-none"}
        title="Out of stock"
      >
        Out of Stock
      </span>
    );
  }

  const prodAny = product as any;
  const targetKey = prodAny.cart_item_key;
  const targetPkg = prodAny.package_name;
  const targetVariantId = prodAny.variant_id;
  const targetSize = prodAny.selected_size;
  const targetColor = prodAny.selected_color;

  // 1. All matching items for this product in cart
  const matchingCartItems = cart.filter((item) => String(item.id) === String(product.id));

  // 2. Determine if caller requested a specific variant (e.g. PDP size button or bottom sheet)
  const isSpecificVariant = Boolean(targetKey || targetVariantId || targetSize || targetPkg);

  const exactCartItem = matchingCartItems.find((item) => {
    if (targetKey && item.cart_item_key === targetKey) return true;
    if (targetVariantId && item.variant_id && String(item.variant_id) === String(targetVariantId)) return true;
    if (targetPkg && item.package_name === targetPkg) return true;
    if (targetSize) {
      const matchSize = (item.selected_size || "").toLowerCase() === targetSize.toLowerCase();
      const matchColor = !targetColor || !item.selected_color || item.selected_color.toLowerCase() === targetColor.toLowerCase();
      if (matchSize && matchColor) return true;
    }
    return false;
  });

  // 3. Resolve active item, quantity, and effective key
  const activeCartItem = isSpecificVariant ? exactCartItem : (matchingCartItems[0] || null);
  const totalProductQuantity = matchingCartItems.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0);
  const quantity = isSpecificVariant ? (exactCartItem?.quantity || 0) : totalProductQuantity;
  const effectiveKey = activeCartItem?.cart_item_key || activeCartItem?.id || targetKey || product.id;

  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isSpecificVariant && matchingCartItems.length > 1) {
      openVariantSelector(product);
      return;
    }

    if (activeCartItem) {
      const currentQty = activeCartItem.quantity || 1;
      const key = activeCartItem.cart_item_key || activeCartItem.id;
      if (currentQty <= 1) {
        removeFromCart(key);
      } else {
        updateQuantity(key, currentQty - 1);
      }
    }
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const pkgs = product.packages;
    const hasMultiplePkgs = Array.isArray(pkgs) && pkgs.length > 1;
    const hasUnselectedPkg = Array.isArray(pkgs) && pkgs.length > 0 && !(product as any).variant_id;
    const mightHaveVariants = !pkgs && (product.category_id || (product as any).specifications?.size_chart);

    if (!onBeforeAdd && (hasMultiplePkgs || hasUnselectedPkg || mightHaveVariants)) {
      openVariantSelector(product);
      return;
    }

    if (activeCartItem) {
      const key = activeCartItem.cart_item_key || activeCartItem.id;
      updateQuantity(key, (activeCartItem.quantity || 1) + 1);
    } else {
      addToCart(product, 1);
    }
  };

  const handleCenterClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const pkgs = product.packages;
    const hasMultiplePkgs = Array.isArray(pkgs) && pkgs.length > 1;
    const mightHaveVariants = !pkgs && (product.category_id || (product as any).specifications?.size_chart);

    if (!onBeforeAdd && (hasMultiplePkgs || mightHaveVariants)) {
      openVariantSelector(product);
    } else {
      router.push('/cart');
    }
  };

  if (quantity > 0) {
    const singleSize = !isSpecificVariant && matchingCartItems.length === 1 ? matchingCartItems[0].selected_size : "";
    const badgeText = singleSize ? `${quantity} (${singleSize})` : (matchingCartItems.length > 1 && !isSpecificVariant ? `${quantity} in cart` : quantity);

    if (compact) {
      return (
        <div 
          className={`flex h-8 w-20 items-center justify-between rounded-full text-xs font-black shadow-lg overflow-hidden transition-all active:scale-95 sm:h-10 sm:w-24 sm:rounded-xl border ${
            isNativeApp
              ? "bg-[#FFFDF8] text-[#14120F] border-[#DFBE6F]"
              : "bg-white text-black border-neutral-200"
          }`}
        >
          <button
            type="button"
            onClick={handleDecrement}
            className={`flex h-full flex-1 items-center justify-center transition-colors cursor-pointer select-none ${
              isNativeApp ? "bg-[#FAF2DE] hover:bg-[#F5E4B8] text-[#14120F]" : "bg-white hover:bg-neutral-200 text-black"
            }`}
            aria-label="Decrease quantity"
          >
            <span className="text-sm sm:text-base font-black">-</span>
          </button>
          <span 
            onClick={handleCenterClick}
            title="Click to view cart or change size"
            className={`flex h-full flex-1 items-center justify-center text-[11px] sm:text-xs font-black cursor-pointer transition-colors select-none px-1 ${
              isNativeApp
                ? "bg-gradient-to-b from-[#FCE89C] to-[#EAB308] text-[#111111]"
                : "bg-black text-white hover:bg-neutral-800"
            }`}
          >
            {quantity}
          </span>
          <button
            type="button"
            onClick={handleIncrement}
            className={`flex h-full flex-1 items-center justify-center transition-colors cursor-pointer select-none ${
              isNativeApp ? "bg-[#FAF2DE] hover:bg-[#F5E4B8] text-[#14120F]" : "bg-white hover:bg-neutral-200 text-black"
            }`}
            aria-label="Increase quantity"
          >
            <span className="text-sm sm:text-base font-black">+</span>
          </button>
        </div>
      );
    }

    return (
      <div 
        style={
          isNativeApp && isFestivalOverride
            ? {
                backgroundColor: t.cardBackground,
                borderColor: t.borderColor,
                color: t.primaryText,
              }
            : undefined
        }
        className={
          className
            ? `${className} !justify-between !px-1 !py-1 gap-1 overflow-hidden`
            : isNativeApp
              ? "flex h-10 min-w-[6.5rem] px-1 py-1 gap-1 items-center justify-between rounded-xl border border-[#DFBE6F] bg-[#FFFDF8] text-sm font-black text-[#14120F] shadow-sm overflow-hidden transition-all active:scale-95"
              : "flex h-10 min-w-[6.5rem] px-1 py-1 gap-1 items-center justify-between rounded-xl border border-neutral-700 bg-neutral-900 text-sm font-black text-white shadow-lg overflow-hidden transition-all active:scale-95"
        }
      >
        <button
          type="button"
          onClick={handleDecrement}
          style={
            isNativeApp && isFestivalOverride
              ? { backgroundColor: t.surfaceColor, color: t.primaryText }
              : undefined
          }
          className={`flex h-full w-8 sm:w-9 shrink-0 items-center justify-center rounded-lg transition-colors cursor-pointer select-none ${
            isNativeApp
              ? "bg-[#FAF2DE] hover:bg-[#F5E4B8] text-[#14120F]"
              : "bg-neutral-900 hover:bg-neutral-800 text-white"
          }`}
          aria-label="Decrease quantity"
        >
          <span className="text-base font-black">-</span>
        </button>
        <span 
          onClick={handleCenterClick}
          title="Click to view cart or change size"
          style={
            isNativeApp && isFestivalOverride
              ? {
                  background: t.primaryButtonBg || t.primaryColor,
                  color: t.primaryButtonText || "#14120F",
                }
              : undefined
          }
          className={`flex h-full flex-1 min-w-0 items-center justify-center text-xs sm:text-sm font-black px-2 rounded-lg animate-in zoom-in-50 duration-200 cursor-pointer transition-colors select-none whitespace-nowrap ${
            isNativeApp
              ? "bg-gradient-to-r from-[#FCE89C] via-[#F2C34B] to-[#DDA216] text-[#111111] shadow-sm"
              : "bg-white text-black hover:bg-neutral-200"
          }`}
        >
          {badgeText}
        </span>
        <button
          type="button"
          onClick={handleIncrement}
          style={
            isNativeApp && isFestivalOverride
              ? { backgroundColor: t.surfaceColor, color: t.primaryText }
              : undefined
          }
          className={`flex h-full w-8 sm:w-9 shrink-0 items-center justify-center rounded-lg transition-colors cursor-pointer select-none ${
            isNativeApp
              ? "bg-[#FAF2DE] hover:bg-[#F5E4B8] text-[#14120F]"
              : "bg-neutral-900 hover:bg-neutral-800 text-white"
          }`}
          aria-label="Increase quantity"
        >
          <span className="text-base font-black">+</span>
        </button>
      </div>
    );
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleAdd}
        data-photo-overlay={isNativeApp && isFestivalOverride && isLightBtnText ? "true" : undefined}
        style={
          isNativeApp && isFestivalOverride
            ? {
                background: t.primaryButtonBg || t.primaryColor,
                color: t.primaryButtonText || "#14120F",
                borderColor: t.borderColor || t.primaryDark,
              }
            : undefined
        }
        className={`flex h-8 w-8 sm:h-10 sm:w-24 items-center justify-center rounded-full sm:rounded-xl font-black text-sm shadow-md transition-all active:scale-95 cursor-pointer ${
          isNativeApp
            ? "border border-[#D49A18]/60 bg-gradient-to-b from-[#FCE89C] via-[#F2C34B] to-[#DDA216] text-[#111111]"
            : "border border-white/20 bg-white text-black hover:bg-neutral-200"
        }`}
        aria-label="Add to cart"
      >
        <span className="hidden sm:inline text-xs tracking-wider">ADD</span>
        <span className="sm:hidden text-base leading-none">+</span>
      </button>
    );
  }

  const defaultClasses = isNativeApp
    ? "flex h-10 w-full sm:w-28 items-center justify-center rounded-xl bg-gradient-to-b from-[#FCE89C] via-[#F2C34B] to-[#DDA216] text-[#111111] font-black text-xs uppercase tracking-widest shadow-[0_4px_14px_rgba(202,138,4,0.28),inset_0_1px_0_rgba(255,255,255,0.75)] hover:brightness-105 border border-[#D49A18]/55 transition-all active:scale-95 cursor-pointer"
    : "flex h-10 w-24 items-center justify-center rounded-xl bg-white text-black font-black text-xs uppercase tracking-widest shadow-md hover:bg-neutral-200 hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-all active:scale-95 cursor-pointer";

  const resolvedClass = className
    ? (isNativeApp
        ? variant === "outline"
          ? `${className} !bg-[#FFF4CC] !text-[#111111] !border-[#C68A12]/80 shadow-sm hover:!bg-[#FCE89C]`
          : `${className} !bg-gradient-to-b !from-[#FCE89C] !via-[#F2C34B] !to-[#DDA216] !text-[#111111] !border-[#D49A18]/55 shadow-[0_4px_14px_rgba(202,138,4,0.25)]`
        : className)
    : defaultClasses;

  return (
    <button
      type="button"
      onClick={handleAdd}
      data-photo-overlay={
        isNativeApp && isFestivalOverride && variant !== "outline" && isLightBtnText
          ? "true"
          : undefined
      }
      style={
        isNativeApp && isFestivalOverride
          ? variant === "outline"
            ? {
                backgroundColor: t.secondaryButtonBg || "#FFFFFF",
                color: t.secondaryButtonText || t.primaryColor,
                borderColor: t.borderColor || t.primaryColor,
              }
            : {
                background: t.primaryButtonBg || t.primaryColor,
                color: t.primaryButtonText || "#14120F",
                borderColor: t.borderColor || t.primaryDark,
              }
          : undefined
      }
      className={resolvedClass}
    >
      ADD +
    </button>
  );
}
