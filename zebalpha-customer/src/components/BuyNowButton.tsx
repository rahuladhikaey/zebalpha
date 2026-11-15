"use client";

import { useCart } from "@/context/CartContext";
import { Product } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { isProductNewDrop, isDropLive } from "@/lib/dropUtils";
import { useIsNativeApp } from "@/lib/platform";
import { Zap } from "lucide-react";

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
  const isNativeApp = useIsNativeApp();
  
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

    const prodAny = product as any;
    const targetKey = prodAny.cart_item_key;
    const targetPkg = prodAny.package_name;
    const targetVariantId = prodAny.variant_id;
    const targetSize = prodAny.selected_size;
    const targetColor = prodAny.selected_color;

    const cartItem = cart.find((item) => {
      if (targetKey && item.cart_item_key === targetKey) return true;
      if (targetVariantId && item.variant_id && String(item.variant_id) === String(targetVariantId)) return true;
      if (targetPkg && String(item.id) === String(product.id) && item.package_name === targetPkg) return true;
      if (targetSize && String(item.id) === String(product.id)) {
        const matchSize = (item.selected_size || "").toLowerCase() === targetSize.toLowerCase();
        const matchColor = !targetColor || !item.selected_color || item.selected_color.toLowerCase() === targetColor.toLowerCase();
        if (matchSize && matchColor) return true;
      }
      if (!targetKey && !targetVariantId && !targetSize && !item.variant_id && !item.selected_size) {
        return String(item.id) === String(product.id);
      }
      return false;
    });
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
      router.push(`/pre-order?productId=${product.id}&quantity=1`);
    } else {
      router.push('/checkout');
    }
  };

  const defaultClasses = isNativeApp
    ? "flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-b from-[#FCE89C] via-[#F2C34B] to-[#DDA216] text-[10px] font-black uppercase tracking-[0.2em] text-[#111111] shadow-[0_6px_18px_rgba(202,138,4,0.28),inset_0_1px_0_rgba(255,255,255,0.75)] hover:brightness-105 border border-[#D49A18]/55 transition-all active:scale-95 cursor-pointer"
    : "flex h-11 w-full items-center justify-center rounded-xl bg-white text-[10px] font-black uppercase tracking-[0.2em] text-black shadow-xl shadow-white/10 transition-all hover:bg-zinc-200 active:scale-95 cursor-pointer";

  const resolvedClass = className
    ? (isNativeApp
        ? `${className} !bg-gradient-to-b !from-[#FCE89C] !via-[#F5B922] !to-[#D49014] !text-[#111111] !border !border-[#B4780C]/55 shadow-[0_6px_18px_rgba(202,138,4,0.26)]`
        : className)
    : defaultClasses;

  return (
    <button
      type="button"
      onClick={handleBuyNow}
      className={resolvedClass}
    >
      {isPreOrder ? (
        "Pre-Order 📦"
      ) : isNativeApp ? (
        <>
          <span>Buy Now</span>
          <Zap className="h-3.5 w-3.5 fill-current ml-1 shrink-0" />
        </>
      ) : (
        "Buy Now ⚡"
      )}
    </button>
  );
}
