"use client";

import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useVariantSelector } from "@/context/VariantSelectorContext";
import { Product } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { isProductNewDrop, isDropLive } from "@/lib/dropUtils";
import { useIsNativeApp } from "@/lib/platform";

export function AddToCartButton({ 
  product, 
  className, 
  compact,
  onBeforeAdd,
}: { 
  product: Product; 
  className?: string; 
  compact?: boolean;
  onBeforeAdd?: () => boolean;
}) {
  const { cart, addToCart, updateQuantity, removeFromCart } = useCart();
  const { openVariantSelector } = useVariantSelector();
  const { session } = useAuth();
  const router = useRouter();
  const isNativeApp = useIsNativeApp();
  
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
          className="flex h-8 w-20 items-center justify-between rounded-full bg-white text-xs font-black text-black shadow-lg overflow-hidden transition-all active:scale-95 sm:h-10 sm:w-24 sm:rounded-xl border border-neutral-200"
        >
          <button
            type="button"
            onClick={handleDecrement}
            className="flex h-full flex-1 items-center justify-center bg-white hover:bg-neutral-200 text-black transition-colors cursor-pointer select-none"
            aria-label="Decrease quantity"
          >
            <span className="text-sm sm:text-base font-black">-</span>
          </button>
          <span 
            onClick={handleCenterClick}
            title="Click to view cart or change size"
            className="flex h-full flex-1 items-center justify-center bg-black text-white text-[11px] sm:text-xs font-black cursor-pointer hover:bg-neutral-800 transition-colors select-none px-1"
          >
            {quantity}
          </span>
          <button
            type="button"
            onClick={handleIncrement}
            className="flex h-full flex-1 items-center justify-center bg-white hover:bg-neutral-200 text-black transition-colors cursor-pointer select-none"
            aria-label="Increase quantity"
          >
            <span className="text-sm sm:text-base font-black">+</span>
          </button>
        </div>
      );
    }

    return (
      <div 
        className={className || "flex h-10 min-w-[6.5rem] px-1 items-center justify-between rounded-xl border border-neutral-700 bg-neutral-900 text-sm font-black text-white shadow-lg overflow-hidden transition-all active:scale-95"}
      >
        <button
          type="button"
          onClick={handleDecrement}
          className="flex h-full w-7 sm:w-8 items-center justify-center bg-neutral-900 hover:bg-neutral-800 text-white transition-colors cursor-pointer select-none"
          aria-label="Decrease quantity"
        >
          <span className="text-base font-black">-</span>
        </button>
        <span 
          onClick={handleCenterClick}
          title="Click to view cart or change size"
          className={`flex h-full flex-1 items-center justify-center text-xs sm:text-sm font-black px-2 py-0.5 rounded-lg mx-1 animate-in zoom-in-50 duration-200 cursor-pointer transition-colors select-none whitespace-nowrap ${
            isNativeApp
              ? "bg-emerald-600 text-white hover:bg-emerald-500 shadow-md shadow-emerald-600/30"
              : "bg-white text-black hover:bg-neutral-200"
          }`}
        >
          {badgeText}
        </span>
        <button
          type="button"
          onClick={handleIncrement}
          className="flex h-full w-7 sm:w-8 items-center justify-center bg-neutral-900 hover:bg-neutral-800 text-white transition-colors cursor-pointer select-none"
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
        className={`flex h-8 w-8 sm:h-10 sm:w-24 items-center justify-center rounded-full sm:rounded-xl font-black text-sm shadow-md transition-all active:scale-95 cursor-pointer ${
          isNativeApp
            ? "border border-emerald-500/40 bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-600/30"
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
    ? "flex h-10 w-24 items-center justify-center rounded-xl bg-emerald-600 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-600/30 hover:bg-emerald-500 hover:shadow-[0_0_15px_rgba(16,185,129,0.4)] border border-emerald-500/30 transition-all active:scale-95 cursor-pointer"
    : "flex h-10 w-24 items-center justify-center rounded-xl bg-white text-black font-black text-xs uppercase tracking-widest shadow-md hover:bg-neutral-200 hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-all active:scale-95 cursor-pointer";

  const resolvedClass = className
    ? (isNativeApp
        ? `${className} !bg-emerald-600 !text-white !border-emerald-500/30 hover:!bg-emerald-500 shadow-lg shadow-emerald-600/30`
        : className)
    : defaultClasses;

  return (
    <button
      type="button"
      onClick={handleAdd}
      className={resolvedClass}
    >
      ADD +
    </button>
  );
}
