"use client";

import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { WishlistProvider } from "@/context/WishlistContext";
import { VariantSelectorProvider } from "@/context/VariantSelectorContext";
import { MeeshoVariantBottomSheet } from "@/components/MeeshoVariantBottomSheet";
import FloatingCartBanner from "@/components/FloatingCartBanner";
import DesktopSideCart from "@/components/DesktopSideCart";

import { ThemeProvider } from "@/context/ThemeContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <WishlistProvider>
            <CartProvider>
              <VariantSelectorProvider>
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
    </ThemeProvider>
  );
}

