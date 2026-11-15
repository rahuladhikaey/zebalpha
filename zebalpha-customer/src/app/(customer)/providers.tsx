"use client";

import { useEffect } from "react";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { VariantSelectorProvider } from "@/context/VariantSelectorContext";
import { MeeshoVariantBottomSheet } from "@/components/MeeshoVariantBottomSheet";
import FloatingCartBanner from "@/components/FloatingCartBanner";
import DesktopSideCart from "@/components/DesktopSideCart";
import { ActiveSessionTracker } from "@/components/ActiveSessionTracker";
import { ProductNavigationOverlay } from "@/components/ProductDetailsLoadingScreen";
import { checkIsNativeApp } from "@/lib/platform";

export function Providers({ children }: { children: React.ReactNode }) {
  // Dismiss pre-hydration native shield once client UI commits
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (checkIsNativeApp()) {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("is-android-app");
      document.documentElement.style.backgroundColor = "";
      document.body.classList.add("is-android-app");
    }
    const frame = window.requestAnimationFrame(() => {
      document.documentElement.classList.remove("zebalpha-app-hydrating");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <LanguageProvider>
      <AuthProvider>
        <ActiveSessionTracker />
        <WishlistProvider>
          <CartProvider>
            <VariantSelectorProvider>
              <ProductNavigationOverlay />
              <div className="flex w-full min-h-screen">
                <div className="flex-1 min-w-0 flex flex-col">
                  {children}
                </div>
                <DesktopSideCart />
              </div>
              <FloatingCartBanner />
              <MeeshoVariantBottomSheet />
            </VariantSelectorProvider>
          </CartProvider>
        </WishlistProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}

