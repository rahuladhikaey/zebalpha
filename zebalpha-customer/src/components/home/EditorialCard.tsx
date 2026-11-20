"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useIsNativeApp } from "@/lib/platform";
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
  const isNativeApp = useIsNativeApp();
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
        className={`group relative block w-[170px] sm:w-[220px] md:w-[260px] lg:w-[280px] aspect-[3/4] rounded-2xl overflow-hidden transition-all duration-300 ${
          isNativeApp
            ? "bg-[#FAF2DE] border border-[#E4C988] shadow-[0_8px_22px_rgba(160,115,20,0.14)] hover:border-[#C28D12]"
            : "bg-neutral-900 border border-white/10 shadow-2xl hover:border-amber-400/50"
        }`}
      >
        {/* Loading Skeleton */}
        {!imageLoaded && (
          <div
            className={`absolute inset-0 animate-pulse flex items-center justify-center ${
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

        {/* Top-right Customize Pill Badge */}
        <div
          data-photo-overlay="true"
          className="absolute top-2.5 right-2.5 z-20 inline-flex items-center gap-1 rounded-full bg-black/70 backdrop-blur-md border border-amber-400/40 px-2.5 py-1 text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-amber-300 shadow-md transition-transform group-hover:scale-105"
        >
          <Sparkles className="h-2.5 w-2.5 text-amber-300" />
          <span>Customize</span>
        </div>

        {/* Custom Design Artwork (Cloudinary CDN Responsive Variant) */}
        <Image
          src={imgSrc}
          alt={item.title}
          fill
          sizes="(max-width: 640px) 170px, (max-width: 768px) 220px, (max-width: 1024px) 260px, 280px"
          draggable={false}
          className={`object-cover transition-transform duration-700 ease-out group-hover:scale-105 ${
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

        {/* Minimal Bottom Dark Shadow Overlay */}
        <div
          data-photo-overlay="true"
          className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none opacity-90 group-hover:opacity-100 transition-opacity"
        />

        {/* Minimal Bottom Left Text Overlay */}
        <div
          data-photo-overlay="true"
          className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 z-10 flex flex-col text-left space-y-0.5"
        >
          {(() => {
            const isDuplicate =
              item.category?.trim().toUpperCase() === item.title?.trim().toUpperCase();
            const displayCategory = isDuplicate
              ? item.badge?.trim().toUpperCase() || "CUSTOM STUDIO"
              : item.category?.trim().toUpperCase() || "CUSTOM STUDIO";
            return (
              <span className="text-[8px] sm:text-[9px] font-extrabold uppercase tracking-widest text-amber-400/90 group-hover:text-amber-300 transition-colors truncate">
                {displayCategory}
              </span>
            );
          })()}
          <h3
            className="text-xs sm:text-sm font-bold text-white tracking-tight leading-snug line-clamp-2 drop-shadow-md"
            title={item.title}
          >
            {item.title}
          </h3>
          <span className="text-[9px] sm:text-[10px] font-bold text-amber-300/90 pt-0.5">
            Tap to customize →
          </span>
        </div>
      </Link>
    </div>
  );
}
