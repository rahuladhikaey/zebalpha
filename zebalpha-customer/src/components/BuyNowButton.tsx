"use client";

import { useState, useEffect } from "react";
import { Product } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { isProductNewDrop, isDropLive } from "@/lib/dropUtils";
import { useOfficialTheme } from "@/lib/platform";
import { useExperienceTheme } from "@/context/ExperienceThemeContext";
import { Zap, Loader2 } from "lucide-react";

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
  const { session } = useAuth();
  const router = useRouter();
  const isNativeApp = useOfficialTheme();
  const { experience, isFestivalOverride } = useExperienceTheme();
  const t = experience.themeTokens;
  const [isNavigating, setIsNavigating] = useState(false);
  const isLightBtnText =
    (t.primaryButtonText || "").toUpperCase() === "#FFFFFF" ||
    (t.primaryButtonText || "").toUpperCase() === "#FFFDF8";
  
  const isUpcomingDrop = isProductNewDrop(product) && !isDropLive(product);

  // Prefetch checkout route for zero-latency Buy Now navigation
  useEffect(() => {
    try {
      router.prefetch("/checkout");
    } catch {}
  }, [router]);

  const handleBuyNow = () => {
    if (isNavigating) return;

    if (isUpcomingDrop) {
      setIsNavigating(true);
      router.push(`/new-drops`);
      return;
    }

    if (onBeforeBuy) {
      const allowed = onBeforeBuy();
      if (!allowed) return;
    }

    setIsNavigating(true);

    // Save exact selected product + variant into sessionStorage for instant, isolated Direct Buy Now checkout
    // (Never pollutes or pulls in existing items from the user's Cart!)
    const directBuyPayload = {
      ...product,
      quantity: 1,
    };

    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          "zebalpha_buy_now_item_v1",
          JSON.stringify(directBuyPayload)
        );
      }
    } catch {}

    const targetUrl = isPreOrder
      ? `/pre-order?productId=${encodeURIComponent(String(product.id))}&quantity=1`
      : `/checkout?buyNow=true&productId=${encodeURIComponent(String(product.id))}&quantity=1`;

    if (!session) {
      router.push(`/login?redirect=${encodeURIComponent(targetUrl)}`);
      return;
    }
    
    router.push(targetUrl);
  };

  const defaultClasses = isNativeApp
    ? "flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-b from-[#FCE89C] via-[#F2C34B] to-[#DDA216] text-[10px] font-black uppercase tracking-[0.2em] text-[#111111] shadow-[0_6px_18px_rgba(202,138,4,0.28),inset_0_1px_0_rgba(255,255,255,0.75)] hover:brightness-105 border border-[#D49A18]/55 transition-all active:scale-95 cursor-pointer"
    : "flex h-11 w-full items-center justify-center rounded-xl bg-white text-[10px] font-black uppercase tracking-[0.2em] text-black shadow-xl shadow-white/10 transition-all hover:bg-zinc-200 active:scale-95 cursor-pointer";

  const resolvedClass = className
    ? (isNativeApp
        ? `${className} border border-[#B4780C]/55 shadow-[0_6px_18px_rgba(202,138,4,0.26)]`
        : className)
    : defaultClasses;

  return (
    <button
      type="button"
      disabled={isNavigating}
      onClick={handleBuyNow}
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
      className={`${resolvedClass} disabled:opacity-80`}
    >
      {isNavigating ? (
        <span className="inline-flex items-center gap-1.5">
          <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
          <span>Opening...</span>
        </span>
      ) : isPreOrder ? (
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
