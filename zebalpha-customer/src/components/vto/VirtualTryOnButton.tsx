"use client";

import React from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import Link from "next/link";

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
  label = "TRY IT ON ✨",
  subtitle = "Instant AI fitting room preview on your photo",
}: VirtualTryOnButtonProps) {
  // Compact button for list views or mobile quick actions
  if (variant === "compact") {
    const content = (
      <>
        <Sparkles size={14} className="text-white animate-pulse" />
        <span>{label}</span>
      </>
    );

    const buttonClasses = `group relative inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-zinc-900 via-zinc-850 to-zinc-900 border border-zinc-700 text-white text-xs font-black uppercase tracking-wider shadow-lg hover:border-white hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all active:scale-95 cursor-pointer ${className}`;

    if (href) {
      return (
        <Link href={href} className={buttonClasses} aria-label="Virtual Try-On">
          {content}
        </Link>
      );
    }

    return (
      <button
        type="button"
        onClick={onClick}
        className={buttonClasses}
        aria-label="Virtual Try-On"
      >
        {content}
      </button>
    );
  }

  // Floating badge variant
  if (variant === "badge") {
    const content = (
      <>
        <Sparkles size={12} className="text-amber-400 group-hover:text-black transition-colors" />
        <span>{label}</span>
      </>
    );

    const badgeClasses = `group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-white text-[11px] font-black uppercase tracking-wider hover:bg-white hover:text-black transition-all shadow-xl active:scale-95 cursor-pointer ${className}`;

    if (href) {
      return (
        <Link href={href} className={badgeClasses} aria-label="Virtual Try-On preview">
          {content}
        </Link>
      );
    }

    return (
      <button
        type="button"
        onClick={onClick}
        className={badgeClasses}
        aria-label="Virtual Try-On preview"
      >
        {content}
      </button>
    );
  }

  // Premium PDP & Full Luxury Button
  const innerContent = (
    <>
      {/* Animated Subtle Shimmer Border */}
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-800 via-white/20 to-zinc-800 opacity-60 group-hover:opacity-100 transition-opacity" />

      <div className="relative flex items-center justify-between px-4 sm:px-5 py-3 sm:py-3.5 rounded-[calc(1rem-1px)] bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 backdrop-blur-md border border-zinc-800/90 group-hover:border-zinc-700 transition-all">
        <div className="flex items-center gap-3 sm:gap-3.5">
          {/* Glowing Icon Badge */}
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-700/80 text-white shadow-inner group-hover:scale-105 group-hover:bg-white group-hover:text-black transition-all">
            <Sparkles size={18} className="animate-pulse" />
          </div>

          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-white">
                {label}
              </span>
              <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-zinc-300 border border-white/10">
                AI Fitting Room
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] font-bold text-zinc-400 mt-0.5 group-hover:text-zinc-300 transition-colors">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Action arrow indicator */}
        <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white group-hover:border-zinc-600 transition-all shrink-0">
          <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </>
  );

  const containerClasses = `group relative block w-full overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-black to-zinc-950 p-[1px] shadow-xl transition-all duration-300 hover:shadow-[0_0_25px_rgba(255,255,255,0.12)] active:scale-[0.99] cursor-pointer ${className}`;

  if (href) {
    return (
      <Link href={href} className={containerClasses} aria-label={label}>
        {innerContent}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={containerClasses}
      aria-label={label}
    >
      {innerContent}
    </button>
  );
}
