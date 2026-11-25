"use client";

import { useEffect } from "react";
import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { VariantSelectorProvider } from "@/context/VariantSelectorContext";
import { MeeshoVariantBottomSheet } from "@/components/MeeshoVariantBottomSheet";
import { ShareBottomSheet } from "@/components/ShareBottomSheet";
import FloatingCartBanner from "@/components/FloatingCartBanner";
import DesktopSideCart from "@/components/DesktopSideCart";
import { ActiveSessionTracker } from "@/components/ActiveSessionTracker";
import { ProductNavigationOverlay } from "@/components/ProductDetailsLoadingScreen";
import { checkIsNativeApp } from "@/lib/platform";
import { ExperienceThemeProvider } from "@/context/ExperienceThemeContext";
import { ExperienceOverlayManager } from "@/components/experience/ExperienceOverlayManager";
import type { CustomerActiveExperiencePayload } from "@/lib/experienceThemes";
import { ZebQuickProvider } from "@/context/ZebQuickContext";

export function Providers({
  children,
  initialExperience,
}: {
  children: React.ReactNode;
  initialExperience?: CustomerActiveExperiencePayload | null;
}) {
  // Dismiss pre-hydration native shield once client UI commits & enforce official theme
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("is-official-theme");
    document.body.classList.add("is-official-theme");

    if (checkIsNativeApp()) {
      document.documentElement.classList.add("is-android-app");
      document.documentElement.style.backgroundColor = "";
      document.body.classList.add("is-android-app");
    }
    // Register universal Service Worker for offline Cloudinary CDN media caching & push support
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const frame = window.requestAnimationFrame(() => {
      document.documentElement.classList.remove("zebalpha-app-hydrating");
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <ExperienceThemeProvider initialExperience={initialExperience}>
      <LanguageProvider>
        <AuthProvider>
          <ActiveSessionTracker />
          <WishlistProvider>
            <CartProvider>
              <ZebQuickProvider>
                <VariantSelectorProvider>
                  <ProductNavigationOverlay />
                  <ExperienceOverlayManager />
                  <div className="flex w-full min-h-screen">
                    <div className="flex-1 min-w-0 flex flex-col">
                      {children}
                    </div>
                    <DesktopSideCart />
                  </div>
                  <FloatingCartBanner />
                  <MeeshoVariantBottomSheet />
                  <ShareBottomSheet />
                </VariantSelectorProvider>
              </ZebQuickProvider>
            </CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </LanguageProvider>
    </ExperienceThemeProvider>
  );
}

