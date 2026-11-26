"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { useZebQuick } from "@/context/ZebQuickContext";

export function ZebQuickFloatingCartPill() {
  const pathname = usePathname();
  const { cart, cartCount, activeProduct } = useZebQuick();

  if (cartCount <= 0 || activeProduct) return null;
  if (
    pathname?.startsWith("/zeb-quick/cart") ||
    pathname?.startsWith("/zeb-quick/orders") ||
    pathname?.startsWith("/zeb-quick/account")
  ) {
    return null;
  }

  const latestThumb = cart[cart.length - 1]?.image_url || "/zeb-quick-icon.png";

  return (
    <div className="fixed bottom-[78px] left-1/2 z-40 -translate-x-1/2 pointer-events-none">
      <Link
        href="/zeb-quick/cart"
        className="pointer-events-auto flex items-center gap-2.5 rounded-full bg-[#0C831F] py-1.5 pl-1.5 pr-3 text-white shadow-[0_8px_24px_rgba(12,131,31,0.38)] ring-2 ring-white transition hover:bg-[#096b18] active:scale-95"
      >
        <div className="h-8 w-8 overflow-hidden rounded-full bg-white p-0.5 shrink-0">
          <img src={latestThumb} alt="Cart item" className="h-full w-full object-cover rounded-full" />
        </div>
        <div className="leading-tight pr-1">
          <p className="text-xs font-black tracking-tight">View cart</p>
          <p className="text-[10px] font-semibold text-emerald-100">
            {cartCount} {cartCount === 1 ? "item" : "items"}
          </p>
        </div>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20">
          <ChevronRight className="h-4 w-4 text-white" />
        </div>
      </Link>
    </div>
  );
}
