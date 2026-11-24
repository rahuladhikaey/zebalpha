"use client";

import { useCart } from "@/context/CartContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Lock, ShoppingBag, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useIsNativeApp } from "@/lib/platform";
import { useExperienceTheme } from "@/context/ExperienceThemeContext";

export default function FloatingCartBanner() {
  const { cart, totalItems, totalValue } = useCart();
  const router = useRouter();
  const pathname = usePathname();
  const isNativeApp = useIsNativeApp();
  const { experience, isFestivalOverride } = useExperienceTheme();
  const t = experience.themeTokens;
  const isLightBtnText =
    (t.primaryButtonText || "").toUpperCase() === "#FFFFFF" ||
    (t.primaryButtonText || "").toUpperCase() === "#FFFDF8";
  
  const [offerThreshold, setOfferThreshold] = useState(0);
  const [offerPercentage, setOfferPercentage] = useState(0);
  const [isOfferActive, setIsOfferActive] = useState(false);

  useEffect(() => {
    // Load global cart offer from Supabase settings
    const fetchOffer = async () => {
      try {
        const { data } = await supabase.from('store_settings').select('value').eq('key', 'global_cart_offer').maybeSingle();
        if (data && data.value && data.value.isActive === true && Number(data.value.threshold) > 0 && Number(data.value.percentage) > 0) {
          setOfferThreshold(Number(data.value.threshold));
          setOfferPercentage(Number(data.value.percentage));
          setIsOfferActive(true);
        } else {
          setIsOfferActive(false);
        }
      } catch (_) {
        setIsOfferActive(false);
      }
    };
    fetchOffer();
  }, []);

  // Hide on native app (which has bottom nav cart), cart, checkout pages, or product detail pages
  const isProductDetailPage = pathname.startsWith('/products/') && pathname.length > '/products/'.length;
  if (isNativeApp || cart.length === 0 || pathname === '/cart' || pathname === '/checkout' || isProductDetailPage) return null;

  // Calculate progress for offer if active
  const hasValidOffer = isOfferActive && offerThreshold > 0;
  const progressPercent = hasValidOffer ? Math.min((totalValue / offerThreshold) * 100, 100) : 0;
  const amountRemaining = hasValidOffer ? Math.max(offerThreshold - totalValue, 0) : 0;

  return (
    <div className="fixed left-0 right-0 z-50 px-3 sm:px-6 transition-all duration-300 lg:hidden bottom-3 sm:bottom-4">
      <div
        style={
          isFestivalOverride
            ? {
                backgroundColor: t.cardBackground,
                borderColor: t.borderColor,
              }
            : undefined
        }
        className="max-w-xl mx-auto bg-[#FFFDF8]/96 backdrop-blur-xl rounded-2xl p-3 sm:p-4 shadow-[0_14px_34px_rgba(140,95,12,0.22)] border border-[#DFBE6F] flex flex-col gap-2.5"
      >
        {/* Offer Section (Only when active) */}
        {hasValidOffer && (
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[#111111] bg-gradient-to-br from-[#FCE89C] to-[#EAB308] p-1 rounded-full border border-[#C68A12]/40">
                <Lock size={13} />
              </span>
              <p className="text-[#14120F] font-black text-xs sm:text-sm tracking-tight truncate">
                {amountRemaining > 0
                  ? `Add items for ₹${amountRemaining.toFixed(0)} to unlock ${offerPercentage}% OFF`
                  : `🎉 You've unlocked ${offerPercentage}% OFF!`}
              </p>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full h-1.5 bg-[#EDE0BF] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#F5B922] to-[#C68A12] rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Cart Info & Action Button */}
        <div className={`flex items-center justify-between gap-3 ${hasValidOffer ? "pt-2 border-t border-[#EDE0BF]" : ""}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-[#FAF2DC] flex items-center justify-center text-[#9A6503] border border-[#E4C988] shrink-0">
              <ShoppingBag size={18} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[#14120F] font-black text-xs sm:text-sm tracking-tight truncate">
                {totalItems} {totalItems === 1 ? 'Item' : 'Items'} in Cart
              </span>
              <span className="text-emerald-700 font-black text-xs sm:text-sm">
                ₹{totalValue.toLocaleString("en-IN")}
              </span>
            </div>
          </div>

          <button 
            type="button"
            onClick={() => router.push('/cart')}
            data-photo-overlay={isFestivalOverride && isLightBtnText ? "true" : undefined}
            style={
              isFestivalOverride
                ? {
                    background: t.primaryButtonBg || t.primaryColor,
                    color: t.primaryButtonText || "#14120F",
                    borderColor: t.borderColor,
                  }
                : undefined
            }
            className="bg-gradient-to-r from-[#FCE89C] via-[#F2C34B] to-[#DDA216] hover:brightness-105 active:scale-95 transition-all text-[#111111] border border-[#D49A18]/65 px-4 py-2.5 sm:px-5 sm:py-2.5 rounded-xl font-black text-xs sm:text-sm tracking-wider uppercase flex items-center gap-1.5 shadow-[0_6px_16px_rgba(202,138,4,0.28)] shrink-0 cursor-pointer"
          >
            <span>View Cart</span>
            <ArrowRight size={14} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
