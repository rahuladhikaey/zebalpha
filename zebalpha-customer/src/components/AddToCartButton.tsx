"use client";

import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { Product } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";
import { isProductNewDrop, isDropLive, getDropDisplayStatus } from "@/lib/dropUtils";

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
  const { session } = useAuth();
  const router = useRouter();
  
  const isUpcomingDrop = isProductNewDrop(product) && !isDropLive(product);
  const isOutOfStock = !isUpcomingDrop && ((product.stock !== undefined && product.stock !== null && Number(product.stock) <= 0) || product.status === "OUT_OF_STOCK");

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
    if (!session) {
      router.push("/login");
      return;
    }
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

  const targetKey = (product as any).cart_item_key;
  const cartItem = cart.find((item) =>
    targetKey ? item.cart_item_key === targetKey : item.id === product.id
  );
  const effectiveKey = cartItem?.cart_item_key || targetKey || product.id;
  const quantity = cartItem?.quantity || 0;

  if (quantity > 0) {
    if (compact) {
      return (
        <div 
          className="flex h-8 w-20 items-center justify-between rounded-full bg-white text-xs font-black text-black shadow-lg overflow-hidden transition-all active:scale-95 sm:h-10 sm:w-24 sm:rounded-xl border border-neutral-200"
        >
          <button
            onClick={() => quantity === 1 ? removeFromCart(effectiveKey) : updateQuantity(effectiveKey, quantity - 1)}
            className="flex h-full flex-1 items-center justify-center bg-white hover:bg-neutral-200 text-black transition-colors"
          >
            <span className="text-sm sm:text-base font-black">-</span>
          </button>
          <span className="flex h-full flex-1 items-center justify-center bg-black text-white text-xs font-black">
            {quantity}
          </span>
          <button
            onClick={() => updateQuantity(effectiveKey, quantity + 1)}
            className="flex h-full flex-1 items-center justify-center bg-white hover:bg-neutral-200 text-black transition-colors"
          >
            <span className="text-sm sm:text-base font-black">+</span>
          </button>
        </div>
      );
    }

    return (
      <div 
        className={className || "flex h-10 w-24 items-center justify-between rounded-xl border border-neutral-700 bg-neutral-900 text-sm font-black text-white shadow-lg overflow-hidden transition-all active:scale-95"}
      >
        <button
          onClick={() => quantity === 1 ? removeFromCart(effectiveKey) : updateQuantity(effectiveKey, quantity - 1)}
          className="flex h-full flex-1 items-center justify-center bg-neutral-900 hover:bg-neutral-800 text-white transition-colors"
        >
          <span className="text-base font-black">-</span>
        </button>
        <span className="flex h-full flex-1 items-center justify-center bg-white text-black text-sm font-black animate-in zoom-in-50 duration-200">
          {quantity}
        </span>
        <button
          onClick={() => updateQuantity(effectiveKey, quantity + 1)}
          className="flex h-full flex-1 items-center justify-center bg-neutral-900 hover:bg-neutral-800 text-white transition-colors"
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
        className="flex h-8 w-8 sm:h-10 sm:w-24 items-center justify-center rounded-full sm:rounded-xl border border-white/20 bg-white text-black font-black text-sm shadow-md hover:bg-neutral-200 transition-all active:scale-95 cursor-pointer"
        aria-label="Add to cart"
      >
        <span className="hidden sm:inline text-xs tracking-wider">ADD</span>
        <span className="sm:hidden text-base leading-none">+</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      className={className || "flex h-10 w-24 items-center justify-center rounded-xl bg-white text-black font-black text-xs uppercase tracking-widest shadow-md hover:bg-neutral-200 hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-all active:scale-95"}
    >
      ADD +
    </button>
  );
}

