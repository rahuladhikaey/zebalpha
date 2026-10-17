"use client";

import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { Product } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { isProductNewDrop, isDropLive } from "@/lib/dropUtils";
import { ShoppingCart, Check, Minus, Plus } from "lucide-react";
import { useState } from "react";

export function AddToCartButton({ 
  product, 
  className, 
  compact,
  onBeforeAdd,
  onAfterAdd,
  quantity: quantityProp = 1,
  mode = "card",
  showGoToCart = true,
}: { 
  product: Product; 
  className?: string; 
  compact?: boolean;
  onBeforeAdd?: () => boolean;
  onAfterAdd?: () => void;
  quantity?: number;
  mode?: "card" | "pdp";
  showGoToCart?: boolean;
}) {
  const { cart, addToCart, updateQuantity, removeFromCart } = useCart();
  const { session } = useAuth();
  const router = useRouter();
  const [justAdded, setJustAdded] = useState(false);
  
  const isUpcomingDrop = isProductNewDrop(product) && !isDropLive(product);
  const isOutOfStock = !isUpcomingDrop && ((product.stock !== undefined && product.stock !== null && Number(product.stock) <= 0) || product.status === "OUT_OF_STOCK");

  const targetKey = (product as any).cart_item_key;
  const cartItem = cart.find((item) =>
    targetKey ? item.cart_item_key === targetKey : item.id === product.id
  );
  const effectiveKey = cartItem?.cart_item_key || targetKey || product.id;
  const inCartQuantity = cartItem?.quantity || 0;

  const handleAdd = () => {
    if (isUpcomingDrop) {
      router.push(`/new-drops`);
      return;
    }
    // If product has variants and is clicked from feed without a variant selected, open PDP
    if (product.packages && product.packages.length > 0 && !(product as any).variant_id && !onBeforeAdd) {
      router.push(`/products/${product.id}`);
      return;
    }
    if (onBeforeAdd) {
      const allowed = onBeforeAdd();
      if (!allowed) return;
    }
    if (isOutOfStock) return;

    // Support both guest cart and authenticated cart
    addToCart(product, quantityProp);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2500);

    if (onAfterAdd) {
      onAfterAdd();
    }
  };

  // State: Upcoming Drop
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

  // State: Out of Stock
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

  // PDP MODE (Product Detail Page)
  if (mode === "pdp") {
    // If item is already in cart and showGoToCart is true
    if (inCartQuantity > 0 && showGoToCart) {
      return (
        <button
          type="button"
          onClick={() => router.push("/cart")}
          className={className || "flex h-12 sm:h-14 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 border border-emerald-500/50 text-xs sm:text-sm font-black uppercase tracking-wider text-emerald-400 shadow-xl hover:bg-zinc-850 active:scale-95 transition-all cursor-pointer"}
        >
          <Check size={16} className="text-emerald-400" />
          <span>Go to Cart ({inCartQuantity})</span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={handleAdd}
        className={className || "flex h-12 sm:h-14 w-full items-center justify-center gap-2 rounded-2xl bg-zinc-900 border border-zinc-700 text-xs sm:text-sm font-black uppercase tracking-wider text-white shadow-xl hover:bg-zinc-800 active:scale-95 transition-all cursor-pointer"}
      >
        {justAdded ? (
          <>
            <Check size={16} className="text-emerald-400" />
            <span className="text-emerald-400">Added to Cart</span>
          </>
        ) : (
          <>
            <ShoppingCart size={16} className="text-white" />
            <span>Add to Cart</span>
          </>
        )}
      </button>
    );
  }

  // CARD / FEED MODE
  if (inCartQuantity > 0) {
    if (compact) {
      return (
        <div 
          className="flex h-8 sm:h-9 items-center justify-between rounded-xl bg-zinc-900 text-xs font-black text-white shadow-md border border-zinc-700 overflow-hidden transition-all"
        >
          <button
            onClick={() => inCartQuantity === 1 ? removeFromCart(effectiveKey) : updateQuantity(effectiveKey, inCartQuantity - 1)}
            className="flex h-full px-2 items-center justify-center hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
            aria-label="Decrease quantity"
          >
            <Minus size={12} strokeWidth={2.5} />
          </button>
          <span className="flex h-full px-2 items-center justify-center bg-white text-black text-xs font-black min-w-[24px]">
            {inCartQuantity}
          </span>
          <button
            onClick={() => updateQuantity(effectiveKey, inCartQuantity + 1)}
            className="flex h-full px-2 items-center justify-center hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
            aria-label="Increase quantity"
          >
            <Plus size={12} strokeWidth={2.5} />
          </button>
        </div>
      );
    }

    return (
      <div 
        className={className || "flex h-9 sm:h-10 items-center justify-between rounded-xl border border-zinc-750 bg-zinc-900 text-xs font-black text-white shadow-md overflow-hidden transition-all"}
      >
        <button
          onClick={() => inCartQuantity === 1 ? removeFromCart(effectiveKey) : updateQuantity(effectiveKey, inCartQuantity - 1)}
          className="flex h-full px-3 items-center justify-center hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
          aria-label="Decrease quantity"
        >
          <Minus size={13} strokeWidth={2.5} />
        </button>
        <span className="flex h-full px-2.5 items-center justify-center bg-white text-black text-xs font-black gap-1 min-w-[32px]">
          <ShoppingCart size={11} className="text-black" />
          <span>{inCartQuantity}</span>
        </span>
        <button
          onClick={() => updateQuantity(effectiveKey, inCartQuantity + 1)}
          className="flex h-full px-3 items-center justify-center hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors"
          aria-label="Increase quantity"
        >
          <Plus size={13} strokeWidth={2.5} />
        </button>
      </div>
    );
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleAdd}
        className="flex h-8 sm:h-9 px-3 items-center justify-center gap-1.5 rounded-xl border border-white/20 bg-white text-black font-black text-xs shadow-md hover:bg-neutral-200 transition-all active:scale-95 cursor-pointer"
        aria-label="Add to cart"
      >
        <ShoppingCart size={13} className="text-black" />
        <span className="text-[11px] font-black uppercase tracking-wider">Add</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      className={className || "flex h-9 sm:h-10 px-4 items-center justify-center gap-1.5 rounded-xl bg-white text-black font-black text-xs uppercase tracking-wider shadow-md hover:bg-neutral-200 hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-all active:scale-95 cursor-pointer"}
    >
      <ShoppingCart size={14} className="text-black" />
      <span>Add to Cart</span>
    </button>
  );
}

