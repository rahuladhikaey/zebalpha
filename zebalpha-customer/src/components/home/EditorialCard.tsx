"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Product } from "@/lib/types";
import { ArrowRight, Tag } from "lucide-react";

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
  isActive: boolean;
  offset: number; // distance from active index (-2, -1, 0, 1, 2)
  totalItems: number;
  isReducedMotion?: boolean;
}

export function EditorialCard({
  item,
  isActive,
  offset,
  isReducedMotion = false,
}: EditorialCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  // Parabolic Curve Math for high-end arc layout:
  // Center (offset 0): translateY = 0, scale = 1.05, rotate = 0
  // Offsets (+/- 1, 2): translateY increases with square of distance, creating an arc curve!
  const absOffset = Math.abs(offset);
  const translateY = isReducedMotion ? 0 : Math.pow(absOffset, 1.5) * 18; // 0px, 18px, 50px...
  const rotateDeg = isReducedMotion ? 0 : offset * 3.5; // -7deg, -3.5deg, 0deg, +3.5deg, +7deg
  const scale = isReducedMotion ? 1 : isActive ? 1.06 : Math.max(0.86, 1 - absOffset * 0.08);
  const opacity = Math.max(0.45, 1 - absOffset * 0.22);
  const zIndex = 20 - absOffset;

  return (
    <div
      className="relative transition-all duration-700 cubic-bezier(0.22, 1, 0.36, 1) flex-shrink-0 select-none"
      style={{
        transform: `translateY(${translateY}px) rotate(${rotateDeg}deg) scale(${scale})`,
        opacity,
        zIndex,
      }}
    >
      <Link
        href={item.href}
        className={`group relative block w-[240px] sm:w-[290px] md:w-[320px] aspect-[3/4] rounded-3xl overflow-hidden bg-neutral-900 border transition-all duration-500 cursor-pointer ${
          isActive
            ? "border-neutral-500/80 shadow-[0_20px_50px_rgba(0,0,0,0.9)] ring-1 ring-white/30"
            : "border-neutral-800/80 shadow-2xl hover:border-neutral-600"
        }`}
      >
        {/* Skeleton shimmer while loading image */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-neutral-900 animate-pulse flex items-center justify-center">
            <span className="text-neutral-700 font-mono text-[10px] tracking-widest uppercase">
              ZEBALPHA EDIT
            </span>
          </div>
        )}

        {/* Fashion Image */}
        <Image
          src={item.image}
          alt={item.title}
          fill
          sizes="(max-width: 640px) 240px, (max-width: 768px) 290px, 320px"
          className={`object-cover transition-transform duration-700 ease-out group-hover:scale-106 ${
            imageLoaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setImageLoaded(true)}
          unoptimized
        />

        {/* Gradient Overlay for Editorial Depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-85 group-hover:opacity-95 transition-opacity duration-300 pointer-events-none" />

        {/* Top Badge Tag if present */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
          <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[9px] font-black uppercase tracking-[0.2em] text-neutral-300">
            {item.badge || item.category}
          </span>
          {item.price !== undefined && (
            <span className="px-2.5 py-1 rounded-full bg-white/90 text-black font-black text-[10px] tracking-wider shadow-sm">
              ₹{item.price.toLocaleString("en-IN")}
            </span>
          )}
        </div>

        {/* Bottom Content Info Block */}
        <div className="absolute bottom-0 left-0 right-0 p-5 z-10 flex flex-col space-y-1.5 transform group-hover:-translate-y-1 transition-transform duration-300">
          {/* Eyebrow / Tag */}
          <div className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-widest text-neutral-400 group-hover:text-rose-400 transition-colors">
            <Tag className="w-2.5 h-2.5" />
            <span>{item.category}</span>
          </div>

          {/* Product Title */}
          <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-tight leading-snug line-clamp-2">
            {item.title}
          </h3>

          {/* Hover Arrow Prompt */}
          <div className="flex items-center gap-2 pt-1 text-[10px] font-black uppercase tracking-widest text-white/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <span>VIEW ITEM</span>
            <ArrowRight className="w-3 h-3 text-white transform group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Delicate Glass Shimmer Border */}
        <div className="absolute inset-0 rounded-3xl border border-white/0 group-hover:border-white/20 pointer-events-none transition-colors duration-300" />
      </Link>
    </div>
  );
}
