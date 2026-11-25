"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Heart, Package, User } from "lucide-react";
import { useZebQuick } from "@/context/ZebQuickContext";

export function ZebQuickBottomNav() {
  const pathname = usePathname();
  const { wishlistIds } = useZebQuick();

  const tabs = [
    { label: "Home", href: "/zeb-quick", icon: Home, active: pathname === "/zeb-quick" },
    {
      label: "Categories",
      href: "/zeb-quick/categories",
      icon: LayoutGrid,
      active: pathname.startsWith("/zeb-quick/categories"),
    },
    {
      label: "Wishlist",
      href: "/zeb-quick/wishlist",
      icon: Heart,
      active: pathname.startsWith("/zeb-quick/wishlist"),
      badge: wishlistIds.length,
    },
    {
      label: "Orders",
      href: "/zeb-quick/orders",
      icon: Package,
      active: pathname.startsWith("/zeb-quick/orders"),
    },
    {
      label: "Account",
      href: "/zeb-quick/account",
      icon: User,
      active: pathname.startsWith("/zeb-quick/account"),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-orange-200/70 bg-white/95 backdrop-blur-md pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-6px_24px_rgba(0,0,0,0.06)]">
      <div className="mx-auto grid h-16 max-w-lg grid-cols-5 items-center px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex flex-col items-center justify-center gap-1 py-1.5 rounded-2xl transition ${
                tab.active ? "text-[#EE2B00]" : "text-neutral-600 hover:text-neutral-900"
              }`}
            >
              <div className="relative">
                <Icon className={`h-5 w-5 ${tab.active ? "stroke-[2.4]" : "stroke-[1.9]"}`} />
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#EE2B00] px-1 text-[9px] font-black text-white">
                    {tab.badge > 99 ? "99+" : tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10.5px] leading-none ${tab.active ? "font-extrabold" : "font-semibold"}`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
