"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useOfficialTheme } from "@/lib/platform";
import { IMAGE_VARIANTS } from "@/services/imageOptimizationService";

export interface EditorialItemData {
  id: string | number;
  title: string;
  category: string;
  price?: number;
  image: string;
  href: string;
  badge?: string;
}

interface EditorialCardProps {
  item: EditorialItemData;
  translateY?: number;
  rotateDeg?: number;
  scale?: number;
  onCardClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export function EditorialCard({
  item,
  translateY = 0,
  rotateDeg = 0,
  scale = 1,
  onCardClick,
}: EditorialCardProps) {
  const isNativeApp = useOfficialTheme();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [useRawFallback, setUseRawFallback] = useState(false);

  const imgSrc = useRawFallback
    ? item.image
    : IMAGE_VARIANTS.editorialCard(item.image);

  return (
    <div
      className="relative transition-transform duration-300 ease-out flex-shrink-0 select-none cursor-pointer"
      style={{
        transform: `translateY(${translateY}px) rotate(${rotateDeg}deg) scale(${scale})`,
        transformOrigin: "center bottom",
      }}
    >
      <Link
        href={item.href}
        onClick={onCardClick}
        draggable={false}
        className={`group relative flex flex-col w-[168px] sm:w-[205px] md:w-[235px] lg:w-[256px] rounded-2xl overflow-hidden transition-all duration-300 ${
          isNativeApp
            ? "bg-[#FFFDF7] border border-[#E4C988] shadow-[0_8px_22px_rgba(160,115,20,0.14)] hover:border-[#C28D12]"
            : "bg-neutral-950 border border-white/10 shadow-2xl hover:border-amber-400/50"
        }`}
      >
        {/* Uniform 1:1 Artwork Showcase Stage — zero awkward cropping across square, portrait & tote artworks */}
        <div
          className={`relative w-full aspect-square overflow-hidden ${
            isNativeApp ? "bg-[#F6EED9]" : "bg-neutral-900"
          }`}
        >
          {/* Loading Skeleton */}
          {!imageLoaded && (
            <div
              className={`absolute inset-0 z-20 animate-pulse flex items-center justify-center ${
                isNativeApp ? "bg-[#FAF2DE]" : "bg-neutral-900"
              }`}
            >
              <span
                className={`text-[9px] font-mono tracking-widest uppercase ${
                  isNativeApp ? "text-[#9A6503]" : "text-neutral-600"
                }`}
              >
                CUSTOM STUDIO
              </span>
            </div>
          )}

          {/* Soft Blurred Ambient Backdrop (eliminates harsh letterbox bars for portrait/wide designs) */}
          <img
            src={imgSrc}
            alt=""
            aria-hidden="true"
            draggable={false}
            className={`absolute inset-0 z-0 w-full h-full object-cover scale-125 blur-xl pointer-events-none transition-opacity duration-500 ${
              imageLoaded ? (isNativeApp ? "opacity-25" : "opacity-35") : "opacity-0"
            }`}
          />

          {/* Top-right Compact Customize Pill */}
          <div
            data-photo-overlay="true"
            className="absolute top-2 right-2 z-30 inline-flex items-center gap-1 rounded-full bg-black/75 backdrop-blur-md border border-amber-400/40 px-2.5 py-0.5 text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-amber-300 shadow-md transition-transform group-hover:scale-105"
          >
            <span>Customize</span>
          </div>

          {/* Crisp Uncropped Custom Design Artwork */}
          <Image
            src={imgSrc}
            alt={item.title}
            fill
            sizes="(max-width: 640px) 168px, (max-width: 768px) 205px, (max-width: 1024px) 235px, 256px"
            draggable={false}
            className={`z-10 object-contain object-center p-1.5 sm:p-2 transition-transform duration-500 ease-out group-hover:scale-105 ${
              imageLoaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              if (!useRawFallback) {
                setUseRawFallback(true);
              } else {
                setImageLoaded(true);
              }
            }}
            unoptimized
          />
        </div>

        {/* Dedicated Clean Card Footer (never covers the design artwork) */}
        <div
          className={`px-2.5 py-2 sm:px-3 sm:py-2.5 h-[66px] sm:h-[74px] flex flex-col justify-center text-left border-t ${
            isNativeApp
              ? "bg-[#FFFDF7] border-[#EFE2BE]"
              : "bg-neutral-950 border-white/10"
          }`}
        >
          {(() => {
            const isDuplicate =
              item.category?.trim().toUpperCase() === item.title?.trim().toUpperCase();
            const displayCategory = isDuplicate
              ? item.badge?.trim().toUpperCase() || "CUSTOM STUDIO"
              : item.category?.trim().toUpperCase() || "CUSTOM STUDIO";
            return (
              <span
                className={`text-[8px] sm:text-[9px] font-extrabold uppercase tracking-widest truncate ${
                  isNativeApp ? "text-[#9A6503]" : "text-amber-400/90 group-hover:text-amber-300"
                }`}
              >
                {displayCategory}
              </span>
            );
          })()}
          <h3
            className={`text-[11px] sm:text-xs font-bold tracking-tight leading-snug truncate ${
              isNativeApp ? "text-[#141414]" : "text-white"
            }`}
            title={item.title}
          >
            {item.title}
          </h3>
          <span
            className={`text-[9px] sm:text-[10px] font-bold pt-0.5 truncate ${
              isNativeApp ? "text-[#B87D0B]" : "text-amber-300/90"
            }`}
          >
            Tap to customize →
          </span>
        </div>
      </Link>
    </div>
  );
}
