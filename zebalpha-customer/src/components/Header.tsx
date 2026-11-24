"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useId } from "react";
import UserMenu from "./UserMenu";
import NotificationBell from "./NotificationBell";
import AnimatedSearchBar from "./AnimatedSearchBar";
import { useCart } from "@/context/CartContext";
import { useWishlist } from "@/context/WishlistContext";
import { ShoppingBag, Menu, Heart } from "lucide-react";
import { useIsNativeApp } from "@/lib/platform";
import dynamicImport from "next/dynamic";
const MobileDrawer = dynamicImport(() => import("./MobileDrawer").then((mod) => mod.MobileDrawer), {
  ssr: false,
});

type HeaderProps = {
  title?: string;
  subtitle?: string;
};

const GOLD_ICON_BTN_CLASS =
  "flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-b from-[#1c160d] to-[#0c0905] border border-amber-500/40 text-amber-400 hover:text-amber-300 hover:border-amber-400/70 active:scale-95 transition-all shadow-[0_4px_14px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(253,230,138,0.22)] cursor-pointer";

const GOLD_WEB_BTN_CLASS =
  "relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-b from-[#1c160d] to-[#0c0905] border border-amber-500/40 text-amber-400 hover:text-amber-300 hover:border-amber-400/70 transition-all active:scale-95 cursor-pointer shadow-[0_4px_14px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(253,230,138,0.2)]";

const CREAM_GOLD_ICON_BTN_CLASS =
  "flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-b from-[#FFFDF7] to-[#F5E4B7] border border-[#DFBC5E]/75 text-[#14120F] hover:border-[#C28D12] active:scale-95 transition-all shadow-[0_3px_10px_rgba(160,115,20,0.14),inset_0_1px_0_rgba(255,255,255,0.95)] cursor-pointer";

function AndroidFestiveHeaderBackdrop({ responsiveDesktop = false }: { responsiveDesktop?: boolean }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden select-none">
      {/* Dynamic DEMS primary header background color (defaults to Official Bright Coral #f03a46) */}
      <div
        className="absolute inset-0 transition-colors duration-300"
        style={{ backgroundColor: "var(--dems-primary, #f03a46)" }}
      />
      {/* Festive traditional ornamental pattern image anchored to top center */}
      <div
        className={`absolute inset-0 ${
          responsiveDesktop
            ? "bg-no-repeat md:bg-repeat-x bg-[length:100%_auto] md:bg-[length:560px_auto]"
            : "bg-no-repeat bg-[length:100%_auto]"
        }`}
        style={{
          backgroundImage: "var(--dems-header-artwork, url('/festive-header-bg.jpg'))",
          backgroundPosition: "center 0px",
        }}
      />
    </div>
  );
}

function WatermarkHangerTee({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      {/* Hanger hook & shoulders */}
      <path d="M40 7a5 5 0 0 0-5 5h3a2 2 0 1 1 2 2c-1.1 0-2 .9-2 2v3.2L22.5 27.5a2 2 0 0 0-.5 1.3V30h36v-1.2a2 2 0 0 0-.5-1.3L42 19.2V16a4 4 0 0 0 3-3.9A5 5 0 0 0 40 7z" opacity="0.7" />
      {/* T-shirt silhouette */}
      <path d="M23 28l-11 7 5 11 7-3v28h32V43l7 3 5-11-11-7h-7.5a8.5 8.5 0 0 1-17 0H23z" />
    </svg>
  );
}

function LuxuryGoldHeaderBackdrop() {
  const uid = useId().replace(/:/g, "");
  const ribbonLeftId = `hdrGoldLeft-${uid}`;
  const ribbonRightId = `hdrGoldRight-${uid}`;
  const dustId = `hdrGoldDust-${uid}`;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-0" aria-hidden="true">
      {/* Subtle warm obsidian-gold radial corner aura */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 42% 95% at 0% 50%, rgba(217,119,6,0.18), transparent 70%), radial-gradient(ellipse 42% 95% at 100% 50%, rgba(217,119,6,0.18), transparent 70%)",
        }}
      />

      {/* Top horizontal golden hairline glow */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

      {/* Subtle dark watermark T-shirt silhouettes */}
      <WatermarkHangerTee className="absolute -top-2 left-[15%] h-16 w-16 -rotate-6 text-amber-100 opacity-[0.055]" />
      <WatermarkHangerTee className="hidden sm:block absolute top-1 left-[34%] h-14 w-14 rotate-6 text-amber-100 opacity-[0.045]" />
      <WatermarkHangerTee className="absolute -top-1 right-[20%] h-16 w-16 rotate-6 text-amber-100 opacity-[0.055]" />
      <WatermarkHangerTee className="hidden sm:block absolute top-2 right-[6%] h-14 w-14 -rotate-12 text-amber-100 opacity-[0.045]" />

      {/* Left & Right sweeping 3D metallic gold ribbons + stardust */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1000 120"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={ribbonLeftId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fde68a" stopOpacity="0.95" />
            <stop offset="35%" stopColor="#eab308" stopOpacity="0.85" />
            <stop offset="70%" stopColor="#b45309" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#451a03" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={ribbonRightId} x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#fde68a" stopOpacity="0.95" />
            <stop offset="35%" stopColor="#eab308" stopOpacity="0.85" />
            <stop offset="70%" stopColor="#b45309" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#451a03" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={dustId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fde68a" stopOpacity="1" />
            <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Left sweeping 3D gold ribbon */}
        <path
          d="M -10,0 C 55,48 115,96 245,118 L 200,120 C 90,100 35,58 -10,22 Z"
          fill={`url(#${ribbonLeftId})`}
          opacity="0.72"
        />
        <path
          d="M 18,0 C 92,55 165,98 285,116"
          fill="none"
          stroke="#fde68a"
          strokeOpacity="0.55"
          strokeWidth="1.4"
        />

        {/* Right sweeping 3D gold ribbon */}
        <path
          d="M 1010,0 C 945,48 885,96 755,118 L 800,120 C 910,100 965,58 1010,22 Z"
          fill={`url(#${ribbonRightId})`}
          opacity="0.72"
        />
        <path
          d="M 982,0 C 908,55 835,98 715,116"
          fill="none"
          stroke="#fde68a"
          strokeOpacity="0.55"
          strokeWidth="1.4"
        />

        {/* Subtle golden stardust sparkles at outer edges */}
        <circle cx="38" cy="88" r="1.6" fill={`url(#${dustId})`} opacity="0.85" />
        <circle cx="62" cy="96" r="1.1" fill={`url(#${dustId})`} opacity="0.7" />
        <circle cx="88" cy="102" r="1.4" fill={`url(#${dustId})`} opacity="0.6" />
        <circle cx="24" cy="64" r="1.2" fill={`url(#${dustId})`} opacity="0.65" />
        <circle cx="962" cy="88" r="1.6" fill={`url(#${dustId})`} opacity="0.85" />
        <circle cx="938" cy="96" r="1.1" fill={`url(#${dustId})`} opacity="0.7" />
        <circle cx="912" cy="102" r="1.4" fill={`url(#${dustId})`} opacity="0.6" />
        <circle cx="976" cy="64" r="1.2" fill={`url(#${dustId})`} opacity="0.65" />
      </svg>
    </div>
  );
}

function HeaderBrandLogo({ compact = false, lightTheme = false }: { compact?: boolean; lightTheme?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2 sm:gap-3 active:scale-95 transition-transform group">
      {/* Double metallic gold glowing circular logo frame */}
      <div
        className={`relative rounded-full p-[2px] transition-all shrink-0 ${
          lightTheme
            ? "bg-gradient-to-b from-[#FFF3C4] via-[#D4AF37] to-[#9A6B06] shadow-[0_3px_12px_rgba(180,130,20,0.28)]"
            : "bg-gradient-to-b from-amber-200 via-amber-400 to-amber-700 shadow-[0_0_18px_rgba(245,158,11,0.45)] group-hover:shadow-[0_0_24px_rgba(251,191,36,0.65)]"
        } ${compact ? "h-9 w-9 sm:h-10 sm:w-10" : "h-10 w-10 md:h-11 md:w-11"}`}
      >
        <div
          className={`h-full w-full rounded-full overflow-hidden p-[1.5px] ${
            lightTheme ? "bg-[#111111] ring-1 ring-[#FFE89C]" : "bg-black ring-1 ring-amber-300/60"
          }`}
        >
          <Image
            src="/official-logo-sm.png"
            alt="ZebAlpha Official Logo"
            width={44}
            height={44}
            className="h-full w-full object-cover rounded-full"
            priority
          />
        </div>
      </div>

      {/* Brand Wordmark + Gold Subtitle */}
      <div className="flex flex-col items-start">
        {lightTheme ? (
          <>
            <span
              data-photo-overlay="true"
              className="text-[15px] sm:text-base font-black tracking-[0.18em] uppercase leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]"
            >
              ZEBALPHA
            </span>
            <span className="mt-0.5 flex items-center gap-1.5 leading-none">
              <span className="h-[1px] w-3 bg-[#FFE68B]/90" />
              <span
                data-photo-overlay="true"
                className="text-[7.5px] sm:text-[8.5px] font-black text-[#FFE68B] tracking-[0.13em] uppercase drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]"
              >
                CLOTHING FOR THE CULTURE
              </span>
              <span className="h-[1px] w-3 bg-[#FFE68B]/90" />
            </span>
          </>
        ) : (
          <>
            <span className="text-sm md:text-base font-black tracking-[0.22em] text-white uppercase group-hover:text-amber-100 transition-colors leading-tight">
              ZEBALPHA
            </span>
            <span className="text-[8.5px] sm:text-[9.5px] font-bold text-amber-400 tracking-[0.14em] uppercase mt-0.5 leading-none">
              CLOTHING FOR THE CULTURE
            </span>
            <span className="mt-1 h-[1.5px] w-full bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_8px_#fbbf24]" />
          </>
        )}
      </div>
    </Link>
  );
}

export function Header({ 
  title: _title = "ZebAlpha", 
  subtitle: _subtitle = "CLOTHING FOR THE CULTURE" 
}: HeaderProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { totalItems } = useCart();
  const { wishlist } = useWishlist();
  const isNativeApp = useIsNativeApp();
  const isHome = pathname === "/";

  // Native Android App
  if (isNativeApp) {
    const wishlistCount = wishlist.length;

    const RightActionsCreamGold = (
      <div className="flex items-center justify-end gap-1.5">
        <Link
          href="/wishlist"
          aria-label={`Wishlist (${wishlistCount})`}
          className={`relative ${CREAM_GOLD_ICON_BTN_CLASS}`}
        >
          <Heart className="h-[19px] w-[19px] stroke-[2.15] text-[#14120F]" />
          {wishlistCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-gradient-to-br from-[#FDE047] via-[#EAB308] to-[#B45309] px-1 text-[9px] font-black leading-none text-[#111111] ring-1 ring-[#FCF9F2] shadow-sm">
              {wishlistCount > 99 ? "99+" : wishlistCount}
            </span>
          )}
        </Link>
        <NotificationBell
          className={`relative ${CREAM_GOLD_ICON_BTN_CLASS}`}
          iconClassName="h-[19px] w-[19px] stroke-[2.15] text-[#14120F]"
        />
      </div>
    );

    if (isHome) {
      return (
        <>
          {/* Status bar background filler matching top of festive pattern */}
          <div
            className="fixed top-0 left-0 right-0 z-50 bg-[#f03a46] pointer-events-none"
            style={{ height: "env(safe-area-inset-top, 0px)" }}
            aria-hidden="true"
          />

          {/* =================================================================== */}
          {/* ANDROID ZEBALPHA HEADER (NORMAL SCROLL - NOT STICKY)                */}
          {/* Festive Traditional Red Floral Lattice Pattern                      */}
          {/* =================================================================== */}
          <header className="relative z-20 w-full overflow-hidden bg-[#f03a46] px-3.5 py-2.5 text-[#14120F] select-none pt-[max(env(safe-area-inset-top),0.625rem)]">
            <AndroidFestiveHeaderBackdrop />

            <div className="relative z-10 flex w-full items-center justify-between gap-2">
              {/* Left: Hamburger Menu Icon */}
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className={CREAM_GOLD_ICON_BTN_CLASS}
                aria-label="Open Navigation Menu"
              >
                <Menu className="h-5 w-5 stroke-[2.2] text-[#14120F]" />
              </button>

              {/* Center: ZebAlpha Logo & Brand Name */}
              <HeaderBrandLogo compact lightTheme />

              {/* Right: Wishlist Heart + Notification Bell */}
              {RightActionsCreamGold}
            </div>
          </header>

          {/* Secondary Navigation Drawer */}
          <MobileDrawer 
            isOpen={isDrawerOpen} 
            onClose={() => setIsDrawerOpen(false)} 
          />
        </>
      );
    }

    // On other Android pages (non-home, e.g. /products, /categories, /profile)
    return (
      <>
        <header className="sticky top-0 z-40 overflow-hidden border-b border-rose-950/20 bg-[#f03a46]/96 px-3.5 py-2.5 backdrop-blur-xl text-[#14120F] transition-all select-none pt-[max(env(safe-area-inset-top),0.625rem)]">
          <AndroidFestiveHeaderBackdrop />

          <div className="relative z-10 flex w-full items-center justify-between gap-2">
            {/* Left: Back button */}
            <button
              type="button"
              onClick={() => router.back()}
              className={CREAM_GOLD_ICON_BTN_CLASS}
              aria-label="Go Back"
            >
              <svg className="h-5 w-5 text-[#14120F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Center: ZebAlpha Logo & Brand Name */}
            <HeaderBrandLogo compact lightTheme />

            {/* Right: Wishlist Heart + Notification Bell */}
            {RightActionsCreamGold}
          </div>
        </header>

        {/* Secondary Navigation Drawer */}
        <MobileDrawer 
          isOpen={isDrawerOpen} 
          onClose={() => setIsDrawerOpen(false)} 
        />
      </>
    );
  }

  // Website Header — Uses the EXACT Official Festive Coral-Red Floral + Warm Cream-Gold Theme as the Android App
  const wishlistCount = wishlist.length;

  return (
    <>
      <header className="sticky top-0 z-50 overflow-visible border-b border-rose-950/20 bg-[#f03a46] px-3.5 py-2.5 md:px-8 text-[#14120F] transition-all shadow-[0_6px_22px_rgba(240,58,70,0.22)]">
        <AndroidFestiveHeaderBackdrop responsiveDesktop />

        <div className="relative z-10 mx-auto flex w-full max-w-[1400px] items-center justify-between gap-2 md:gap-4">
          {/* Left Side: Back Button (or Mobile Drawer), Logo & Brand Name */}
          <div className="flex items-center gap-2.5 md:gap-3.5">
            {!isHome ? (
              <button
                type="button"
                onClick={() => router.back()}
                className={CREAM_GOLD_ICON_BTN_CLASS}
                aria-label="Go Back"
              >
                <svg className="h-5 w-5 text-[#14120F]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className={`${CREAM_GOLD_ICON_BTN_CLASS} lg:hidden`}
                aria-label="Open Navigation Menu"
              >
                <Menu className="h-5 w-5 stroke-[2.2] text-[#14120F]" />
              </button>
            )}

            <HeaderBrandLogo compact lightTheme />
          </div>

          {/* Desktop Navigation Links (Crisp White & Warm Gold on Festive Red Header) */}
          <nav className="hidden xl:flex items-center gap-6" data-photo-overlay="true">
            {[
              { name: "Shop", href: "/products" },
              { name: "Custom Studio", href: "/customize" },
              { name: "New Drops", href: "/new-drops" },
              { name: "About", href: "/about" },
              { name: "Sell", href: "/seller" },
              { name: "Blogs", href: "/blogs" },
            ].map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="relative text-[11px] font-black uppercase tracking-[0.18em] text-white hover:text-[#FFE68B] transition-all hover:-translate-y-0.5 active:scale-95 group drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)] whitespace-nowrap"
              >
                {link.name}
                <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-gradient-to-r from-[#FFF3C4] via-[#FDE047] to-[#EAB308] transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </nav>

          {/* Global Search Bar (Desktop) */}
          <div className="hidden lg:flex flex-1 max-w-md mx-4">
            <AnimatedSearchBar />
          </div>

          {/* Right Side: Official Cream-Gold Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5 shrink-0">
            {/* Wishlist Button */}
            <Link
              href="/wishlist"
              aria-label={`Wishlist (${wishlistCount})`}
              className={`relative ${CREAM_GOLD_ICON_BTN_CLASS}`}
            >
              <Heart className="h-[18px] w-[18px] stroke-[2.15] text-[#14120F]" />
              {wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-gradient-to-br from-[#FDE047] via-[#EAB308] to-[#B45309] px-1 text-[9px] font-black leading-none text-[#111111] ring-1 ring-[#FCF9F2] shadow-sm">
                  {wishlistCount > 99 ? "99+" : wishlistCount}
                </span>
              )}
            </Link>

            {/* Shopping Cart Button */}
            <Link
              href="/cart"
              className={`relative ${CREAM_GOLD_ICON_BTN_CLASS}`}
              aria-label="View Shopping Cart"
            >
              <ShoppingBag className="h-[18px] w-[18px] stroke-[2.15] text-[#14120F]" />
              {totalItems > 0 && (
                <span className="absolute -top-1 -right-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-gradient-to-br from-[#FDE047] via-[#EAB308] to-[#B45309] px-1 text-[9px] font-black leading-none text-[#111111] ring-1 ring-[#FCF9F2] shadow-sm">
                  {totalItems > 99 ? "99+" : totalItems}
                </span>
              )}
            </Link>

            <NotificationBell
              className={`relative ${CREAM_GOLD_ICON_BTN_CLASS}`}
              iconClassName="h-[18px] w-[18px] stroke-[2.15] text-[#14120F]"
            />

            <UserMenu />

            {!isHome && (
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className={`${CREAM_GOLD_ICON_BTN_CLASS} lg:hidden`}
                aria-label="Toggle Menu"
              >
                <Menu className="h-5 w-5 stroke-[2.2] text-[#14120F]" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <MobileDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </>
  );
}
