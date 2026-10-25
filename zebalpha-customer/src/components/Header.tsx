"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, Suspense, useEffect } from "react";
import UserMenu from "./UserMenu";
import NotificationBell from "./NotificationBell";
import AnimatedSearchBar from "./AnimatedSearchBar";
import { useCart } from "@/context/CartContext";
import { ShoppingBag, Menu } from "lucide-react";
import { useIsNativeApp } from "@/lib/platform";
import dynamicImport from "next/dynamic";
const MobileDrawer = dynamicImport(() => import("./MobileDrawer").then((mod) => mod.MobileDrawer), {
  ssr: false,
});

type HeaderProps = {
  title?: string;
  subtitle?: string;
};

export function Header({ 
  title = "ZebAlpha", 
  subtitle = "Indian E-Commerce Marketplace ✦" 
}: HeaderProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { totalItems } = useCart();
  const isNativeApp = useIsNativeApp();
  const isAdmin = pathname.startsWith("/admin");
  const isHome = pathname === "/";

  // Native Android App
  if (isNativeApp) {
    if (isHome) {
      return (
        <>
          {/* Status bar background filler to ensure no scrolling content shows behind system icons */}
          <div
            className="fixed top-0 left-0 right-0 z-50 bg-black pointer-events-none"
            style={{ height: "env(safe-area-inset-top, 0px)" }}
            aria-hidden="true"
          />

          {/* =================================================================== */}
          {/* ANDROID ZEBALPHA HEADER (NORMAL SCROLL - NOT STICKY)                */}
          {/* Scrolls away naturally when scrolling down; returns at top         */}
          {/* Contains: Hamburger Menu, Logo, Brand Name, Notification Icon       */}
          {/* =================================================================== */}
          <header className="relative z-20 w-full border-b border-zinc-800/80 bg-zinc-950 px-3.5 py-2.5 text-white select-none pt-[max(env(safe-area-inset-top),0.625rem)]">
            <div className="flex w-full items-center justify-between">
              {/* Left: Hamburger Menu Icon */}
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-neutral-300 hover:text-white active:bg-zinc-800 active:scale-95 transition-all shadow-sm cursor-pointer"
                aria-label="Open Navigation Menu"
              >
                <Menu className="h-5 w-5 stroke-[2.2]" />
              </button>

              {/* Center / Left: Existing Zebalpha Logo & Brand Name */}
              <Link href="/" className="flex items-center gap-2.5 active:scale-95 transition-transform group">
                <div className="relative h-9 w-9 rounded-full overflow-hidden bg-black flex items-center justify-center p-0.5 border border-zinc-700/80 shadow-[0_0_12px_rgba(255,255,255,0.12)] group-hover:shadow-[0_0_18px_rgba(255,255,255,0.25)] transition-all">
                  <Image
                    src="/official-logo-sm.png"
                    alt="ZebAlpha Official Logo"
                    width={36}
                    height={36}
                    className="h-full w-full object-cover rounded-full"
                    priority
                  />
                </div>
                <div className="flex flex-col">
                  <span className="text-xs md:text-sm font-black tracking-[0.25em] text-white uppercase group-hover:text-neutral-200 transition-colors">
                    ZebAlpha
                  </span>
                  <span className="text-[8px] font-bold text-neutral-400 tracking-wider uppercase -mt-0.5">
                    Clothing For The Culture
                  </span>
                </div>
              </Link>

              {/* Right: Notification Bell */}
              <div className="flex items-center justify-end">
                <NotificationBell />
              </div>
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
        <header className="sticky top-0 z-40 border-b border-zinc-800/80 bg-zinc-950/95 px-3.5 py-2.5 backdrop-blur-xl text-white transition-all select-none pt-[max(env(safe-area-inset-top),0.625rem)]">
          <div className="flex w-full items-center justify-between">
            {/* Left: Back button if not home, or Hamburger */}
            <button
              type="button"
              onClick={() => router.back()}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-neutral-300 hover:text-white active:bg-zinc-800 active:scale-95 transition-all shadow-sm cursor-pointer"
              aria-label="Go Back"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Center / Left: Existing Zebalpha Logo & Brand Name */}
            <Link href="/" className="flex items-center gap-2.5 active:scale-95 transition-transform group">
              <div className="relative h-9 w-9 rounded-full overflow-hidden bg-black flex items-center justify-center p-0.5 border border-zinc-700/80 shadow-[0_0_12px_rgba(255,255,255,0.12)] group-hover:shadow-[0_0_18px_rgba(255,255,255,0.25)] transition-all">
                <Image
                  src="/official-logo-sm.png"
                  alt="ZebAlpha Official Logo"
                  width={36}
                  height={36}
                  className="h-full w-full object-cover rounded-full"
                  priority
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xs md:text-sm font-black tracking-[0.25em] text-white uppercase group-hover:text-neutral-200 transition-colors">
                  ZebAlpha
                </span>
                <span className="text-[8px] font-bold text-neutral-400 tracking-wider uppercase -mt-0.5">
                  Clothing For The Culture
                </span>
              </div>
            </Link>

            {/* Right: Notification Bell */}
            <div className="flex items-center justify-end">
              <NotificationBell />
            </div>
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

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-neutral-800/80 bg-black/85 px-4 py-3 backdrop-blur-xl md:px-8 text-white transition-all">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between">
          {/* Left Side: Back Button, Logo & Brand Name */}
          <div className="flex items-center gap-3 md:gap-4">
            {!isHome && (
              <button
                onClick={() => router.back()}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 text-neutral-300 hover:bg-neutral-800 hover:text-white border border-neutral-800 transition-all active:scale-90"
                aria-label="Go Back"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            
            <Link href="/" className="flex items-center gap-3 transition-transform hover:scale-105 group">
              <div className="relative h-10 w-10 md:h-11 md:w-11 rounded-full overflow-hidden bg-black flex items-center justify-center p-0.5 border border-zinc-800 shadow-[0_0_15px_rgba(255,255,255,0.15)] group-hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all">
                <Image
                  src="/official-logo-sm.png"
                  alt="ZebAlpha Official Logo"
                  width={44}
                  height={44}
                  className="h-full w-full object-cover rounded-full"
                  priority
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xs md:text-sm font-black tracking-[0.25em] text-white group-hover:text-neutral-200 transition-colors">
                  ZebAlpha
                </span>
                <span className="text-[9px] font-bold text-neutral-400 tracking-wider uppercase -mt-0.5 hidden sm:inline-block">
                  Indian Marketplace
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-7">
            {[
              { name: "Shop", href: "/products" },
              { name: "About", href: "/about" },
              { name: "Sell", href: "/seller" },
              { name: "Blogs", href: "/blogs" },
              { name: "Contact", href: "/contact" },
            ].map((link) => (
              <Link 
                key={link.name} 
                href={link.href}
                className="relative text-[11px] font-black uppercase tracking-[0.22em] text-neutral-300 hover:text-white transition-all hover:-translate-y-0.5 active:scale-95 group"
              >
                {link.name}
                <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-white transition-all duration-300 group-hover:w-full" />
              </Link>
            ))}
          </nav>

          {/* Global Search Bar (Desktop) */}
          <div className="hidden lg:flex flex-1 max-w-md mx-6">
            <AnimatedSearchBar />
          </div>

          {/* Right Side: Actions & Drawer Trigger */}
          <div className="flex items-center gap-2 md:gap-3.5 shrink-0">
            {/* Shopping Cart Button */}
            <Link
              href="/cart"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 border border-neutral-800 text-white hover:bg-neutral-800 transition-all active:scale-95 cursor-pointer shadow-md"
              aria-label="View Shopping Cart"
            >
              <ShoppingBag className="h-4 w-4 sm:h-5 sm:w-5" />
              {totalItems > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-4.5 min-w-[18px] px-1 items-center justify-center rounded-full bg-white text-black text-[9px] font-black shadow-md">
                  {totalItems}
                </span>
              )}
            </Link>

            {/* Mobile / Tablet Menu Trigger */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="flex lg:hidden h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 border border-neutral-800 text-white active:bg-neutral-800 transition-all"
              aria-label="Toggle Menu"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <UserMenu />
            <NotificationBell />
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
