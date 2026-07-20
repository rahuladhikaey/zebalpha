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
          className="flex h-8 w-20 items-center justify-between rounded-full bg-emerald-600 text-xs font-bold text-white shadow-md shadow-emerald-600/10 overflow-hidden transition-all active:scale-95 sm:h-11 sm:w-24 sm:rounded-xl sm:border sm:border-emerald-600"
        >
          <button
            onClick={() => quantity === 1 ? removeFromCart(product.id) : updateQuantity(product.id, quantity - 1)}
            className="flex h-full flex-1 items-center justify-center bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white transition-colors"
          >
            <span className="text-sm sm:text-lg">-</span>
          </button>
          <span className="flex h-full flex-1 items-center justify-center bg-emerald-600 text-white text-xs sm:text-sm font-bold animate-in zoom-in-50 duration-200">
            {quantity}
          </span>
          <button
            onClick={() => updateQuantity(product.id, quantity + 1)}
            className="flex h-full flex-1 items-center justify-center bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white transition-colors"
          >
            <span className="text-sm sm:text-lg">+</span>
          </button>
        </div>
      );
    }

    return (
      <div 
        className={className ? className.replace("bg-green-600", "bg-emerald-600").replace("text-white", "text-white") + " p-0 overflow-hidden" : "flex h-11 w-24 items-center justify-between rounded-xl border border-emerald-600 bg-emerald-600 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 overflow-hidden transition-all active:scale-95"}
      >
        <button
          onClick={() => quantity === 1 ? removeFromCart(product.id) : updateQuantity(product.id, quantity - 1)}
          className="flex h-full flex-1 items-center justify-center bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white transition-colors"
        >
          <span className="text-lg">-</span>
        </button>
        <span className="flex h-full flex-1 items-center justify-center bg-emerald-600 text-white text-sm font-bold animate-in zoom-in-50 duration-200">
          {quantity}
        </span>
        <button
          onClick={() => updateQuantity(product.id, quantity + 1)}
          className="flex h-full flex-1 items-center justify-center bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white transition-colors"
        >
          <span className="text-lg">+</span>
        </button>
      </div>
    );
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={handleAdd}
        className="flex h-8 w-8 sm:h-11 sm:w-24 items-center justify-center rounded-full sm:rounded-xl border border-emerald-500 sm:border-2 sm:border-emerald-600 bg-emerald-500 sm:bg-emerald-50/50 text-white sm:text-emerald-700 shadow-sm transition-all hover:bg-emerald-600 hover:text-white active:scale-95 cursor-pointer text-xl font-bold"
      >
        +
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      className={className || "flex h-11 w-24 items-center justify-center rounded-xl border-2 border-emerald-600 bg-emerald-50/50 text-2xl font-black text-emerald-700 shadow-sm transition-all hover:bg-emerald-600 hover:text-white active:scale-95"}
    >
      +
    </button>
  );
}

