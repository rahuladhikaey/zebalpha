"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, Shirt, Loader2 } from "lucide-react";

const LOADING_STEPS = [
  "Preparing your photo...",
  "Analyzing clothing & garment structure...",
  "Fitting garment to body contours...",
  "Creating your photorealistic virtual look...",
  "Applying lighting & texture blend...",
];

export function VirtualTryOnLoading({ garmentImageUrl, productName }: { garmentImageUrl?: string; productName?: string }) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-3xl bg-black border border-zinc-800 shadow-2xl overflow-hidden min-h-[420px]">
      {/* Background Animated Gradient Mesh */}
      <div className="absolute -inset-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-zinc-800/30 via-black to-black opacity-80 animate-pulse pointer-events-none" />

      {/* Center Holographic Garment Fitting Animation */}
      <div className="relative z-10 mb-8 flex items-center justify-center">
        {/* Outer glowing pulsing ring */}
        <div className="absolute h-36 w-36 rounded-full border border-white/20 animate-ping opacity-25" />
        <div className="absolute h-32 w-32 rounded-full border-2 border-dashed border-zinc-600 animate-spin" style={{ animationDuration: "12s" }} />

        <div className="relative h-24 w-24 rounded-2xl bg-zinc-900 border border-zinc-700/80 p-3 shadow-2xl flex items-center justify-center overflow-hidden">
          {garmentImageUrl ? (
            <img
              src={garmentImageUrl}
              alt="Garment Preview"
              className="h-full w-full object-contain filter drop-shadow-md animate-pulse"
            />
          ) : (
            <Shirt className="text-white animate-bounce" size={40} />
          )}

          {/* Hologram scanline effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/20 to-transparent animate-marquee pointer-events-none" />
        </div>

        {/* Sparkle badge */}
        <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-white text-black flex items-center justify-center shadow-xl shadow-white/20 animate-bounce">
          <Sparkles size={16} />
        </div>
      </div>

      {/* Text Info & Dynamic Step Prompts */}
      <div className="relative z-10 space-y-3 max-w-sm">
        <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center justify-center gap-2">
          <span>✨ Creating Your Look</span>
        </h3>

        {productName && (
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest truncate max-w-xs mx-auto">
            {productName}
          </p>
        )}

        {/* Dynamic indeterminate status step */}
        <div className="pt-4 space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-zinc-900/90 border border-zinc-800 px-4 py-1.5 shadow-inner">
            <Loader2 className="animate-spin text-zinc-400" size={14} />
            <span className="text-xs font-bold text-zinc-200 transition-all duration-300">
              {LOADING_STEPS[currentStepIndex]}
            </span>
          </div>
          <p className="text-[11px] font-medium text-zinc-500">
            Neural synthesis in progress. Please wait a few seconds...
          </p>
        </div>
      </div>
    </div>
  );
}
