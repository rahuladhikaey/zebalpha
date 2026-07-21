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
  title = "Asali Swad", 
  subtitle = "Direct to your Door 📍" 
}: HeaderProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const isAdmin = pathname.startsWith("/admin");
  const isHome = pathname === "/";

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-emerald-200/60 bg-[#cefad0]/80 px-4 py-3 backdrop-blur-xl md:px-8">
        <div className="mx-auto flex w-full max-w-[1400px] items-center justify-between">
          {/* Left Side: Back Button, Logo & Labels */}
          <div className="flex items-center gap-3 md:gap-4">
          {!isHome && (
            <button
              onClick={() => router.back()}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all active:scale-90"
              aria-label="Go Back"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          
          <Link href="/" className="flex items-center justify-center transition-transform hover:scale-105">
            <Image 
              src="/official-logo.png" 
              alt="Asali Swad Logo" 
              width={48}
              height={48}
              priority
              className="h-10 w-10 md:h-12 md:w-12 rounded-full object-cover shadow-md border border-slate-100" 
            />
          </Link>
          <div className="flex flex-col overflow-hidden max-w-[150px] md:max-w-none">
            {isAdmin ? (
               <>
                <span className="text-[10px] md:text-sm font-black uppercase tracking-widest text-emerald-700">Admin</span>
                <span className="text-[10px] items-center md:flex font-bold text-slate-800">Panel控制台</span>
              </>
            ) : title ? (
              <>
                <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-emerald-700 truncate">
                  {title}
                </span>
                <span className="text-[9px] md:text-[10px] font-bold text-slate-600 -mt-0.5">
                  {subtitle}
                </span>
              </>
            ) : (
              <>
                <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-emerald-700 truncate">
                  ASALI
                </span>
                <span className="text-[9px] md:text-[10px] font-bold text-slate-600 -mt-0.5">
                  SWAD
                </span>
              </>
            )}
          </div>
        </div>

        {/* Desktop Navigation Links (Large Screens) */}
        <nav className="hidden lg:flex items-center gap-10">
          {[
            { name: "Home", href: "/" },
            { name: "Shop Spices", href: "/products" },
            { name: "Guides", href: "/guides" },
          ].map((link) => (
            <Link 
              key={link.name} 
              href={link.href}
              className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-700 hover:text-emerald-700 transition-all hover:-translate-y-0.5 active:scale-95"
            >
              {link.name}
            </Link>
          ))}
        </nav>



        {/* Global Search Bar (Desktop) */}
        <div className="hidden lg:flex flex-1 max-w-md mx-8">
           <AnimatedSearchBar />
        </div>

        {/* Right Side: Actions & Drawer Trigger */}
        <div className="flex items-center gap-1.5 md:gap-4 shrink-0">
          {/* Hamburger Menu - Tablet & Phone only (Moved to front for better index) */}
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="flex lg:hidden h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-700 active:bg-slate-100 transition-all"
            aria-label="Toggle Menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
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
