"use client";

import React from "react";
import { Sparkles } from "lucide-react";

interface VirtualTryOnButtonProps {
  onClick: () => void;
  className?: string;
  variant?: "full" | "compact" | "badge";
}

export function VirtualTryOnButton({
  onClick,
  className = "",
  variant = "full",
}: VirtualTryOnButtonProps) {
  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`group relative flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-zinc-900 via-zinc-850 to-zinc-900 border border-zinc-700 text-white text-xs font-black uppercase tracking-wider shadow-lg hover:border-white hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all active:scale-95 cursor-pointer ${className}`}
        aria-label="Virtual Try-On"
      >
        <Sparkles size={14} className="text-white animate-pulse" />
        <span>Try-On</span>
      </button>
    );
  }

  if (variant === "badge") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-white text-[11px] font-black uppercase tracking-wider hover:bg-white hover:text-black transition-all shadow-xl active:scale-95 cursor-pointer ${className}`}
        aria-label="Virtual Try-On preview"
      >
        <Sparkles size={12} className="text-amber-400 group-hover:text-black transition-colors" />
        <span>✨ Try-On</span>
      </button>
    );
  }

  // Default "full" luxury button with title and subtitle
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-black to-zinc-950 p-[1.5px] shadow-2xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] active:scale-[0.98] cursor-pointer ${className}`}
      aria-label="Virtual Try-On - See how this looks on you"
    >
      {/* Animated Glowing Gradient Border */}
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-700 via-white/40 to-zinc-700 opacity-60 group-hover:opacity-100 transition-opacity" />

      <div className="relative flex items-center justify-between px-5 py-3.5 rounded-[calc(1rem-1px)] bg-zinc-950/95 backdrop-blur-md border border-zinc-800/80 group-hover:border-zinc-700 transition-all">
        <div className="flex items-center gap-3.5">
          {/* Glowing Icon Badge */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-700/80 text-white shadow-inner group-hover:scale-110 group-hover:bg-white group-hover:text-black transition-all">
            <Sparkles size={18} className="animate-pulse" />
          </div>

          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black uppercase tracking-wider text-white">
                ✨ Virtual Try-On
              </span>
              <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-zinc-300 border border-white/10">
                AI Live
              </span>
            </div>
            <p className="text-[11px] font-bold text-zinc-400 mt-0.5 group-hover:text-zinc-300 transition-colors">
              See how this looks on you
            </p>
          </div>
        </div>

        {/* Action arrow indicator */}
        <div className="h-8 w-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white group-hover:border-zinc-600 transition-all">
          <span className="text-xs font-black">→</span>
        </div>
      </div>
    </button>
  );
}
