"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, User, ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useIsNativeApp } from "@/lib/platform";
import { useLanguage } from "@/context/LanguageContext";

function HomeStoreIcon({
  className = "",
  strokeWidth = 1.9,
}: {
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Roof + house outer walls matching luxury storefront icon */}
      <path d="M3 10.5L12 3.5L21 10.5" />
      <path d="M5.5 9V19.5C5.5 20.05 5.95 20.5 6.5 20.5H17.5C18.05 20.5 18.5 20.05 18.5 19.5V9" />
      {/* Inner doorway / boutique arch */}
      <path d="M9.5 20.5V14.2C9.5 13.65 9.95 13.2 10.5 13.2H13.5C14.05 13.2 14.5 13.65 14.5 14.2V20.5" />
      <path d="M8.75 11.25L12 9.5L15.25 11.25" />
    </svg>
  );
}

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
      icon: HomeStoreIcon,
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
        className="fixed bottom-0 left-0 right-0 z-50 overflow-hidden bg-[#040301]/[0.96] backdrop-blur-2xl select-none shadow-[0_-12px_36px_rgba(0,0,0,0.92)] pb-[env(safe-area-inset-bottom,0px)]"
      >
        {/* Top metallic gold hairline + subtle ambient glow */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-[#eab308]/50 via-[#fde68a]/35 to-[#eab308]/50"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-3 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f59e0b]/25 blur-md"
          aria-hidden="true"
        />

        <div className="relative mx-auto grid h-[66px] max-w-lg grid-cols-4 items-center gap-1 px-2">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const active = item.isActive;

            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="group relative flex h-full flex-col items-center justify-center py-1 transition-transform duration-150 active:scale-95"
              >
                {/* Active rounded gold capsule backdrop + fading top-lit rim */}
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-x-0.5 top-1 bottom-1.5 rounded-[18px] transition-all duration-300 ${
                    active
                      ? "opacity-100 bg-[radial-gradient(ellipse_at_50%_20%,rgba(234,179,8,0.28),rgba(146,64,14,0.12)_58%,transparent_100%)] shadow-[inset_0_1px_0_rgba(254,240,138,0.45),0_0_22px_rgba(234,179,8,0.14)]"
                      : "opacity-0 scale-95"
                  }`}
                >
                  <span
                    className={`absolute inset-0 rounded-[18px] border border-[#facc15]/40 [mask-image:linear-gradient(to_bottom,black_38%,transparent_96%)] transition-opacity duration-300 ${
                      active ? "opacity-100" : "opacity-0"
                    }`}
                  />
                </span>

                {/* Icon Container with Metallic Gold Cart Badge */}
                <div className="relative z-10 flex items-center justify-center">
                  <IconComponent
                    strokeWidth={active ? 2.15 : 1.85}
                    className={`h-[22px] w-[22px] transition-all duration-200 ${
                      active
                        ? "text-[#fde047] drop-shadow-[0_0_10px_rgba(250,204,21,0.75)]"
                        : "text-zinc-200 group-hover:text-white"
                    }`}
                  />

                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-gradient-to-br from-[#fef08a] via-[#eab308] to-[#b45309] px-1 text-[9px] font-black leading-none text-black ring-1 ring-black/80 shadow-[0_0_10px_rgba(234,179,8,0.7)]">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </div>

                {/* Label */}
                <span
                  className={`relative z-10 mt-1 text-[11px] leading-none tracking-wide transition-all duration-200 ${
                    active
                      ? "font-bold text-[#fde047] [text-shadow:0_0_10px_rgba(250,204,21,0.45)]"
                      : "font-medium text-zinc-200 group-hover:text-white"
                  }`}
                >
                  {item.label}
                </span>

                {/* Glowing metallic gold bottom indicator pill */}
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 h-[3.5px] rounded-full transition-all duration-300 ${
                    active
                      ? "w-11 opacity-100 bg-gradient-to-r from-[#facc15] via-[#fef9c3] to-[#eab308] shadow-[0_0_12px_rgba(250,204,21,0.95),0_-2px_8px_rgba(254,240,138,0.75)]"
                      : "w-4 opacity-0 bg-transparent"
                  }`}
                />
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
