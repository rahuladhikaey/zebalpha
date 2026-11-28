"use client";

import React from "react";
import type { CardImageTransform } from "@/lib/categoryStorefrontTypes";

interface SmartFitImageProps {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  loading?: "eager" | "lazy";
  roundedClass?: string;
  backdropClass?: string;
  transform?: CardImageTransform;
}

/**
 * Smart Auto-Fit Image Frame (Synced with Superadmin Canva Studio):
 * - Default (`contain`): auto-fits 100% of any uploaded photo inside the card with a seamless
 *   color-matched ambient backdrop (ZERO cropped heads, sleeves, or text).
 * - Respects optional Admin Canva controls (`img_fit`, `img_zoom`, `img_pos_x`, `img_pos_y`).
 */
export function SmartFitImage({
  src,
  alt,
  className = "",
  imgClassName = "",
  loading = "lazy",
  roundedClass = "",
  backdropClass = "opacity-45 scale-110 blur-xl",
  transform,
}: SmartFitImageProps) {
  const fit = transform?.img_fit === "cover" ? "cover" : "contain";
  const zoom = Number(transform?.img_zoom || 100);
  const posX = typeof transform?.img_pos_x === "number" ? transform.img_pos_x : 50;
  const posY = typeof transform?.img_pos_y === "number" ? transform.img_pos_y : 50;

  return (
    <div className={`relative w-full h-full overflow-hidden ${roundedClass} ${className}`}>
      {fit === "contain" && (
        <img
          src={src}
          alt=""
          aria-hidden="true"
          loading={loading}
          className={`pointer-events-none select-none absolute inset-0 w-full h-full object-cover ${backdropClass}`}
        />
      )}
      <img
        src={src}
        alt={alt}
        loading={loading}
        className={`relative z-10 w-full h-full ${fit === "cover" ? "object-cover" : "object-contain"} transition-transform duration-300 ${imgClassName}`}
        style={{
          objectPosition: `${posX}% ${posY}%`,
          transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
          transformOrigin: `${posX}% ${posY}%`,
        }}
      />
    </div>
  );
}
