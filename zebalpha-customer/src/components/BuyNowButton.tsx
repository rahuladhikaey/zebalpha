"use client";

import { useCart } from "@/context/CartContext";
import { Product } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { isProductNewDrop, isDropLive } from "@/lib/dropUtils";

export function BuyNowButton({ 
  product, 
  className, 
  isPreOrder = false,
  onBeforeBuy,
}: { 
  product: Product; 
  className?: string; 
  isPreOrder?: boolean;
  onBeforeBuy?: () => boolean;
}) {
  const { cart, addToCart } = useCart();
  const { session } = useAuth();
  const router = useRouter();
  
  const isUpcomingDrop = isProductNewDrop(product) && !isDropLive(product);

  const handleBuyNow = () => {
    if (isUpcomingDrop) {
      router.push(`/new-drops`);
      return;
    }

    if (onBeforeBuy) {
      const allowed = onBeforeBuy();
      if (!allowed) return;
    }

    const targetKey = (product as any).cart_item_key;
    const cartItem = cart.find((item) =>
      targetKey ? item.cart_item_key === targetKey : item.id === product.id
    );
    const quantity = cartItem?.quantity || 1;

    // Automatically add to cart if not already present and not a pre-order
    if (!isPreOrder && !cartItem) {
      addToCart(product, 1);
    }

    if (!session) {
      const redirectUrl = encodeURIComponent(isPreOrder ? `/pre-order?productId=${product.id}&quantity=1` : '/checkout');
      router.push(`/login?redirect=${redirectUrl}`);
      return;
    }
    
    if (isPreOrder) {
      router.push(`/pre-order?productId=${product.id}&quantity=${quantity}`);
    } else {
      router.push('/checkout');
    }
  };

  return (
    <button
      type="button"
      onClick={handleBuyNow}
      className={className || "flex h-11 w-full items-center justify-center rounded-xl bg-white text-[10px] font-black uppercase tracking-[0.2em] text-black shadow-xl shadow-white/10 transition-all hover:bg-zinc-200 active:scale-95 cursor-pointer"}
    >
      {isPreOrder ? "Pre-Order 📦" : "Buy Now ⚡"}
    </button>
  );
}

