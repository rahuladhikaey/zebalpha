"use client";

import React from "react";

interface SmartFitImageProps {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  loading?: "eager" | "lazy";
  roundedClass?: string;
  backdropClass?: string;
}

/**
 * Smart Auto-Fit Image Frame:
 * - Automatically zooms in/out (`object-contain`) so 100% of the uploaded photo fits cleanly
 *   inside any card frame with ZERO cropped heads, text, sleeves, or edges.
 * - Uses a soft ambient blurred backdrop of the same photo so any aspect-ratio difference blends
 *   seamlessly into the card's own natural colors (no harsh white/empty bars).
 */
export function SmartFitImage({
  src,
  alt,
  className = "",
  imgClassName = "",
  loading = "lazy",
  roundedClass = "",
  backdropClass = "opacity-45 scale-110 blur-xl",
}: SmartFitImageProps) {
  return (
    <div className={`relative w-full h-full overflow-hidden ${roundedClass} ${className}`}>
      {/* Seamless color-matched ambient backdrop */}
      <img
        src={src}
        alt=""
        aria-hidden="true"
        loading={loading}
        className={`pointer-events-none select-none absolute inset-0 w-full h-full object-cover ${backdropClass}`}
      />
      {/* Full uncropped foreground image (auto-fits any aspect ratio) */}
      <img
        src={src}
        alt={alt}
        loading={loading}
        className={`relative z-10 w-full h-full object-contain transition-transform duration-300 ${imgClassName}`}
      />
    </div>
  );
}
