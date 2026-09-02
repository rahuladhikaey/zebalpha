"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import UserMenu from "./UserMenu";
import NotificationBell from "./NotificationBell";
import AnimatedSearchBar from "./AnimatedSearchBar";
import dynamicImport from "next/dynamic";
const MobileDrawer = dynamicImport(() => import("./MobileDrawer").then((mod) => mod.MobileDrawer), {
  ssr: false,
});

type HeaderProps = {
  title?: string;
  subtitle?: string;
};

export function Header({ 
  title = "ZEBALPHA", 
  subtitle = "CLOTHING FOR THE CULTURE ✦" 
}: HeaderProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const isHome = pathname === "/";

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
                  src="/official-logo.png"
                  alt="ZEBALPHA Official Logo"
                  width={44}
                  height={44}
                  className="h-full w-full object-cover rounded-full"
                  priority
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xs md:text-sm font-black tracking-[0.25em] uppercase text-white group-hover:text-neutral-200 transition-colors">
                  ZEBALPHA
                </span>
                <span className="text-[9px] font-bold text-neutral-400 tracking-wider uppercase -mt-0.5 hidden sm:inline-block">
                  Apparel • 2026
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-8">
            {[
              { name: "Home", href: "/" },
              { name: "New Drops", href: "/new-drops" },
              { name: "Polos & Tees", href: "/products?category=Polos" },
              { name: "Collection", href: "/collections" },
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
