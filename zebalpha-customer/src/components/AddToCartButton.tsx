"use client";

import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { Product } from "@/lib/types";
import { useAuth } from "@/context/AuthContext";

export function AddToCartButton({ product, className, compact }: { product: Product; className?: string; compact?: boolean }) {
  const { cart, addToCart, updateQuantity, removeFromCart } = useCart();
  const { session } = useAuth();
  const router = useRouter();
  
  const handleAdd = () => {
    if (!session) {
      router.push("/login");
      return;
    }
    addToCart(product, 1);
  };

  const cartItem = cart.find(item => item.id === product.id);
  const quantity = cartItem?.quantity || 0;

  if (quantity > 0) {
    if (compact) {
      return (
        <div 
          className="flex h-8 w-20 items-center justify-between rounded-full bg-white text-xs font-black text-black shadow-lg overflow-hidden transition-all active:scale-95 sm:h-10 sm:w-24 sm:rounded-xl border border-neutral-200"
        >
          <button
            onClick={() => quantity === 1 ? removeFromCart(product.id) : updateQuantity(product.id, quantity - 1)}
            className="flex h-full flex-1 items-center justify-center bg-white hover:bg-neutral-200 text-black transition-colors"
          >
            <span className="text-sm sm:text-base font-black">-</span>
          </button>
          <span className="flex h-full flex-1 items-center justify-center bg-black text-white text-xs font-black">
            {quantity}
          </span>
          <button
            onClick={() => updateQuantity(product.id, quantity + 1)}
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
          onClick={() => quantity === 1 ? removeFromCart(product.id) : updateQuantity(product.id, quantity - 1)}
          className="flex h-full flex-1 items-center justify-center bg-neutral-900 hover:bg-neutral-800 text-white transition-colors"
        >
          <span className="text-base font-black">-</span>
        </button>
        <span className="flex h-full flex-1 items-center justify-center bg-white text-black text-sm font-black animate-in zoom-in-50 duration-200">
          {quantity}
        </span>
        <button
          onClick={() => updateQuantity(product.id, quantity + 1)}
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

