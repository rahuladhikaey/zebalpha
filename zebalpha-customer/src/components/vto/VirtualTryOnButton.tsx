"use client";

import React from "react";
import { Shirt, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useOfficialTheme } from "@/lib/platform";

interface VirtualTryOnButtonProps {
  onClick?: () => void;
  href?: string;
  className?: string;
  variant?: "pdp" | "full" | "compact" | "badge";
  label?: string;
  subtitle?: string;
}

export function VirtualTryOnButton({
  onClick,
  href,
  className = "",
  variant = "pdp",
  label = "VIRTUAL TRY-ON",
  subtitle = "Coming Soon • Launching 07/07/2027",
}: VirtualTryOnButtonProps) {
  const isNativeApp = useOfficialTheme();

  // Compact button for list views or mobile quick actions
  if (variant === "compact") {
    const content = (
      <>
        <Shirt size={14} className={isNativeApp ? "text-[#9A6503]" : "text-amber-400"} />
        <span>{label}</span>
      </>
    );

    const buttonClasses = `group relative inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border text-xs font-black uppercase tracking-wider shadow-lg transition-all active:scale-95 cursor-pointer ${
      isNativeApp
        ? "bg-[#FFF4CC] border-[#C68A12]/70 text-[#111111] hover:bg-[#FCE89C]"
        : "bg-gradient-to-r from-zinc-900 via-zinc-850 to-zinc-900 border-zinc-700 text-white hover:border-white hover:shadow-[0_0_20px_rgba(255,255,255,0.15)]"
    } ${className}`;

    if (href) {
      return (
        <Link href={href} className={buttonClasses} aria-label="Virtual Try-On Coming Soon">
          {content}
        </Link>
      );
    }

    return (
      <button
        type="button"
        onClick={onClick}
        className={buttonClasses}
        aria-label="Virtual Try-On Coming Soon"
      >
        {content}
      </button>
    );
  }

  // Floating badge variant
  if (variant === "badge") {
    const content = (
      <>
        <Shirt size={12} className="text-amber-400 group-hover:text-black transition-colors" />
        <span>{label}</span>
      </>
    );

    const badgeClasses = `group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-white text-[11px] font-black uppercase tracking-wider hover:bg-white hover:text-black transition-all shadow-xl active:scale-95 cursor-pointer ${className}`;

    if (href) {
      return (
        <Link
          href={href}
          data-photo-overlay="true"
          className={badgeClasses}
          aria-label="Virtual Try-On Coming Soon"
        >
          {content}
        </Link>
      );
    }

    return (
      <button
        type="button"
        data-photo-overlay="true"
        onClick={onClick}
        className={badgeClasses}
        aria-label="Virtual Try-On Coming Soon"
      >
        {content}
      </button>
    );
  }

  // Premium PDP & Full Luxury Button
  const innerContent = (
    <>
      <div
        className={`absolute inset-0 transition-opacity ${
          isNativeApp
            ? "bg-gradient-to-r from-[#E4C988]/40 via-[#F5B922]/30 to-[#E4C988]/40 opacity-70"
            : "bg-gradient-to-r from-zinc-800 via-amber-400/25 to-zinc-800 opacity-60 group-hover:opacity-100"
        }`}
      />

      <div
        className={`relative flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 rounded-[calc(1rem-1px)] backdrop-blur-md border transition-all ${
          isNativeApp
            ? "bg-gradient-to-r from-[#FFFDF7] via-[#FFF6D6] to-[#FFFDF7] border-[#D4A017]/60"
            : "bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 border-zinc-800/90 group-hover:border-amber-400/40"
        }`}
      >
        <div className="flex items-center gap-3 sm:gap-3.5">
          {/* Icon Badge */}
          <div
            className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl border shadow-inner transition-all ${
              isNativeApp
                ? "bg-[#FFF0B8] border-[#D4A017]/60 text-[#8A5A00]"
                : "bg-zinc-900 border-zinc-700/80 text-amber-300 group-hover:scale-105 group-hover:bg-amber-300 group-hover:text-black"
            }`}
          >
            <Shirt size={18} />
          </div>

          <div className="text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`text-xs sm:text-sm font-black uppercase tracking-widest ${
                  isNativeApp ? "text-[#14120F]" : "text-white"
                }`}
              >
                {label}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[8px] sm:text-[9px] font-black uppercase tracking-widest border ${
                  isNativeApp
                    ? "bg-[#FCE89C] text-[#7A4F00] border-[#C68A12]/50"
                    : "bg-amber-400/15 text-amber-300 border-amber-400/35"
                }`}
              >
                Coming Soon
              </span>
            </div>
            <p
              className={`text-[10px] sm:text-[11px] font-bold mt-0.5 transition-colors ${
                isNativeApp
                  ? "text-[#5E4B26]"
                  : "text-zinc-400 group-hover:text-zinc-300"
              }`}
            >
              {subtitle}
            </p>
          </div>
        </div>

        {/* Action arrow indicator */}
        <div
          className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full border flex items-center justify-center transition-all shrink-0 ${
            isNativeApp
              ? "bg-[#FFF4CC] border-[#D4A017]/60 text-[#8A5A00]"
              : "bg-zinc-900 border-zinc-800 text-zinc-400 group-hover:text-amber-300 group-hover:border-amber-400/50"
          }`}
        >
          <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </>
  );

  const containerClasses = `group relative block w-full overflow-hidden rounded-2xl p-[1px] shadow-xl transition-all duration-300 active:scale-[0.99] cursor-pointer ${
    isNativeApp
      ? "bg-gradient-to-br from-[#E4C988] via-[#D4A017]/60 to-[#E4C988] shadow-[0_6px_20px_rgba(180,120,12,0.12)]"
      : "bg-gradient-to-br from-zinc-900 via-black to-zinc-950 hover:shadow-[0_0_25px_rgba(245,185,34,0.14)]"
  } ${className}`;

  if (href) {
    return (
      <Link href={href} className={containerClasses} aria-label={`${label} — Coming Soon 07/07/2027`}>
        {innerContent}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={containerClasses}
      aria-label={`${label} — Coming Soon 07/07/2027`}
    >
      {innerContent}
    </button>
  );
}
