"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutGrid, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useIsNativeApp } from "@/lib/platform";
import { useLanguage } from "@/context/LanguageContext";
import { useExperienceTheme } from "@/context/ExperienceThemeContext";

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
  const router = useRouter();

  // Background-prefetch core bottom nav routes so tab switching is instant
  useEffect(() => {
    if (!isNativeApp) return;
    const timer = window.setTimeout(() => {
      ["/", "/categories", "/assistant", "/go-alpha", "/profile"].forEach((route) => {
        try {
          router.prefetch(route);
        } catch {}
      });
    }, 800);
    return () => window.clearTimeout(timer);
  }, [isNativeApp, router]);
  const { user } = useAuth();
  const { t } = useLanguage();
  const { experience, isFestivalOverride } = useExperienceTheme();
  const theme = experience.themeTokens;
  const activeTabBg = theme.accentColor || theme.primaryColor;
  const isLightActiveTab =
    activeTabBg.toUpperCase() === "#F2C34B" ||
    activeTabBg.toUpperCase() === "#F5B922" ||
    activeTabBg.toUpperCase() === "#FBBF24" ||
    activeTabBg.toUpperCase() === "#EAB308";

  // Only render on native Capacitor Android app shell or preview mode
  if (!isNativeApp) return null;

  // Isolate ZebQuick Quick Commerce sub-app from ZebAlpha's bottom nav
  if (pathname?.startsWith("/go-alpha")) return null;

  // Hide global bottom bar on product detail routes where the sticky Cart / Buy Now bar owns the bottom dock
  if (pathname && /^\/products\/[^/]+/.test(pathname)) return null;

  // Active route checking
  const isHomeActive = pathname === "/";
  const isCategoriesActive = pathname.startsWith("/categories") || pathname.startsWith("/category");
  const isAlphaAiActive = pathname.startsWith("/assistant");
  const isGoAlphaActive = pathname.startsWith("/go-alpha");
  const isAccountActive =
    pathname.startsWith("/profile") || pathname === "/login" || pathname === "/signup" || pathname.startsWith("/orders");

  const navItems: Array<{
    id: string;
    label: string;
    href: string;
    icon: typeof LayoutGrid | typeof HomeStoreIcon;
    isActive: boolean;
    isCenterAi?: boolean;
    imageSrc?: string;
  }> = [
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
      id: "alpha_ai",
      label: t("nav_alpha_ai"),
      href: "/assistant",
      icon: LayoutGrid,
      isActive: isAlphaAiActive,
      isCenterAi: true,
    },
    {
      id: "go_alpha",
      label: "ZebQuick",
      href: "/go-alpha",
      icon: LayoutGrid,
      imageSrc: "/go-alpha-icon.png",
      isActive: isGoAlphaActive,
    },
    {
      id: "account",
      label: t("nav_account"),
      href: user ? "/profile" : "/profile",
      icon: User,
      isActive: isAccountActive,
    },
  ];

  return (
    <>
      {/* Safe bottom spacer so page content is never hidden behind fixed navigation */}
      <div className="h-[78px] w-full shrink-0 pointer-events-none" aria-hidden="true" />

      <nav
        aria-label="Android Bottom Navigation"
        style={
          isFestivalOverride
            ? {
                backgroundColor: theme.navBarBg || "#FFFFFF",
                borderColor: theme.borderColor,
              }
            : undefined
        }
        className="fixed bottom-0 left-0 right-0 z-50 overflow-visible bg-[#FFFDF8]/[0.97] backdrop-blur-2xl select-none border-t border-[#E6CA7D]/55 shadow-[0_-10px_28px_rgba(166,124,28,0.12)] pb-[env(safe-area-inset-bottom,0px)]"
      >
        {/* Top metallic champagne gold hairline accent */}
        <div
          style={
            isFestivalOverride
              ? {
                  background: `linear-gradient(90deg, transparent, ${theme.primaryColor}, transparent)`,
                }
              : undefined
          }
          className="pointer-events-none absolute inset-x-0 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#EAB308]/80 to-transparent"
          aria-hidden="true"
        />

        <div className="relative mx-auto grid h-[68px] max-w-lg grid-cols-5 items-center gap-1 px-2">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const active = item.isActive;

            if (item.isCenterAi) {
              const aiRingBg = theme.accentColor || theme.primaryButtonBg || "#F2C34B";
              const aiRingBorder = active ? (theme.primaryColor || "#D97706") : (theme.borderColor || "#EAB308");
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  aria-label="Open Alpha AI Shopping Assistant"
                  className="group relative flex h-full flex-col items-center justify-end pb-1.5 transition-transform duration-150 active:scale-95"
                >
                  <span
                    style={{
                      borderColor: aiRingBorder,
                      background: `linear-gradient(135deg, ${theme.surfaceColor || "#FFFDF8"} 0%, ${aiRingBg} 60%, ${theme.primaryButtonBg || aiRingBg} 100%)`,
                      boxShadow: active
                        ? `0 6px 22px ${aiRingBorder}66, 0 0 0 3px ${aiRingBg}44`
                        : `0 6px 18px ${aiRingBg}44`,
                    }}
                    className={`relative -mt-5 flex h-[50px] w-[50px] items-center justify-center rounded-full border-2 p-[2.5px] transition-all duration-300 ${
                      active ? "scale-105" : "group-hover:scale-105"
                    }`}
                  >
                    <span
                      className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white border border-[#111111]/15 p-0.5"
                    >
                      <img
                        src={experience.assets?.festivalLogoUrl || "/official-logo-sm.png"}
                        alt="Alpha AI"
                        className="h-full w-full object-cover rounded-full"
                      />
                    </span>

                    {/* Live AI status dot */}
                    <span className="pointer-events-none absolute -top-0.5 -right-0.5 z-10 flex h-3.5 w-3.5">
                      <span
                        className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                        style={{ backgroundColor: theme.successColor || "#10B981" }}
                      />
                      <span
                        className="relative inline-flex h-3.5 w-3.5 rounded-full border-2"
                        style={{
                          backgroundColor: theme.successColor || "#10B981",
                          borderColor: theme.navBarBg || "#FFFDF8",
                        }}
                      />
                    </span>
                  </span>

                  <span
                    style={{
                      color: active
                        ? theme.primaryColor || "#9A6503"
                        : theme.primaryText || "#111111",
                    }}
                    className={`mt-1 text-[10.5px] leading-none tracking-tight transition-colors ${
                      active ? "font-black" : "font-extrabold"
                    }`}
                  >
                    {item.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={item.id}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className="group relative flex h-full flex-col items-center justify-center py-1.5 transition-transform duration-150 active:scale-95"
              >
                {/* Active rounded Champagne Gold pill capsule */}
                <span
                  aria-hidden="true"
                  style={
                    active && isFestivalOverride
                      ? {
                          background: `linear-gradient(180deg, ${activeTabBg}, ${theme.primaryButtonBg || activeTabBg})`,
                        }
                      : undefined
                  }
                  className={`pointer-events-none absolute inset-x-0.5 top-1.5 bottom-1.5 rounded-2xl transition-all duration-300 ${
                    active
                      ? "opacity-100 bg-gradient-to-b from-[#FCE89C] via-[#F4C954] to-[#E2AA23] shadow-[0_4px_14px_rgba(217,155,22,0.28),inset_0_1px_0_rgba(255,255,255,0.75)]"
                      : "opacity-0 scale-95"
                  }`}
                />

                {/* Icon Container */}
                <div
                  data-photo-overlay={active && isFestivalOverride && !isLightActiveTab ? "true" : undefined}
                  className="relative z-10 flex items-center justify-center"
                >
                  {item.imageSrc ? (
                    <img
                      src={item.imageSrc}
                      alt={item.label}
                      className="h-[23px] w-[34px] object-contain transition-transform duration-200 group-hover:scale-105"
                    />
                  ) : (
                    <IconComponent
                      strokeWidth={active ? 2.2 : 1.85}
                      className={`h-[21px] w-[21px] transition-all duration-200 ${
                        active
                          ? isFestivalOverride && !isLightActiveTab
                            ? "text-white"
                            : "text-[#14120F]"
                          : "text-[#292319] group-hover:text-[#000000]"
                      }`}
                    />
                  )}
                </div>

                {/* Label */}
                <span
                  data-photo-overlay={active && isFestivalOverride && !isLightActiveTab ? "true" : undefined}
                  className={`relative z-10 mt-1 text-[10.5px] leading-none tracking-tight transition-all duration-200 ${
                    active
                      ? isFestivalOverride && !isLightActiveTab
                        ? "font-extrabold text-white"
                        : "font-extrabold text-[#14120F]"
                      : "font-semibold text-[#3B3326] group-hover:text-[#14120F]"
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
