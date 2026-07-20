"use client";

import { CartProvider } from "@/context/CartContext";
import { AuthProvider } from "@/context/AuthContext";
import { WishlistProvider } from "@/context/WishlistContext";
import FloatingCartBanner from "@/components/FloatingCartBanner";
import DesktopSideCart from "@/components/DesktopSideCart";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <WishlistProvider>
        <CartProvider>
          <div className="flex w-full min-h-screen">
            <div className="flex-1 min-w-0 flex flex-col">
              {children}
            </div>
            <DesktopSideCart />
          </div>
          <FloatingCartBanner />
        </CartProvider>
      </WishlistProvider>
    </AuthProvider>
  );
}

