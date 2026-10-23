"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, User, ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useIsNativeApp } from "@/lib/platform";

import { useLanguage } from "@/context/LanguageContext";

export function AndroidBottomNav() {
  const isNativeApp = useIsNativeApp();
  const pathname = usePathname();
  const { totalItems } = useCart();
  const { user } = useAuth();
  const { t } = useLanguage();

  // Only render on native Capacitor Android app shell or preview mode
  if (!isNativeApp) return null;

  // Active route checking
  const isHomeActive = pathname === "/";
  const isCategoriesActive = pathname.startsWith("/categories") || pathname.startsWith("/category");
  const isAccountActive =
    pathname.startsWith("/profile") || pathname === "/login" || pathname === "/signup" || pathname.startsWith("/orders");
  const isCartActive = pathname === "/cart";

  const navItems = [
    {
      id: "home",
      label: t("nav_home"),
      href: "/",
      icon: Home,
      isActive: isHomeActive,
    },
    {
      id: "categories",
      label: t("nav_categories"),
      href: "/categories",
      icon: LayoutGrid,
      isActive: isCategoriesActive,
    },
    {
      id: "account",
      label: t("nav_account"),
      href: user ? "/profile" : "/profile",
      icon: User,
      isActive: isAccountActive,
    },
    {
      id: "cart",
      label: t("nav_cart"),
      href: "/cart",
      icon: ShoppingCart,
      isActive: isCartActive,
      badge: totalItems,
    },
  ];

  return (
    <>
      {/* Safe bottom spacer so page content is never hidden behind fixed navigation */}
      <div className="h-20 w-full shrink-0 pointer-events-none" aria-hidden="true" />

      <nav
        aria-label="Android Bottom Navigation"
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800/90 bg-zinc-950/95 backdrop-blur-xl transition-all select-none shadow-[0_-8px_30px_rgba(0,0,0,0.8)] pb-[max(env(safe-area-inset-bottom),0.5rem)]"
      >
      <div className="mx-auto grid h-16 max-w-lg grid-cols-4 items-center px-2">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          const active = item.isActive;

          return (
            <Link
              key={item.id}
              href={item.href}
              className="group relative flex flex-col items-center justify-center py-1 transition-all active:scale-90"
            >
              {/* Active Indicator Pip */}
              <div
                className={`absolute top-0 h-0.5 w-6 rounded-full transition-all duration-300 ${
                  active ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.9)]" : "bg-transparent"
                }`}
              />

              {/* Icon Container with Badge */}
              <div className="relative mt-1">
                <IconComponent
                  strokeWidth={active ? 2.5 : 2}
                  className={`h-5 w-5 transition-colors duration-200 ${
                    active ? "text-blue-400" : "text-zinc-500 group-hover:text-zinc-300"
                  }`}
                />

                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-500 px-1 text-[9px] font-black leading-none text-white shadow-md">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={`mt-1 text-[10px] tracking-wide transition-colors duration-200 ${
                  active
                    ? "font-black text-blue-400"
                    : "font-semibold text-zinc-500 group-hover:text-zinc-300"
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
    </>
  );
}
