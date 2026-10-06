"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

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
}

export function EditorialCard({
  item,
  translateY = 0,
  rotateDeg = 0,
  scale = 1,
}: EditorialCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

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
        className="group relative block w-[170px] sm:w-[220px] md:w-[260px] lg:w-[280px] aspect-[3/4] rounded-2xl overflow-hidden bg-neutral-900 border border-white/10 shadow-2xl transition-all duration-300 hover:border-amber-400/40"
      >
        {/* Loading Skeleton */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-neutral-900 animate-pulse flex items-center justify-center">
            <span className="text-[9px] font-mono tracking-widest text-neutral-600 uppercase">
              ZEBALPHA EDIT
            </span>
          </div>
        )}

        {/* Fashion Image */}
        <Image
          src={item.image}
          alt={item.title}
          fill
          sizes="(max-width: 640px) 170px, (max-width: 768px) 220px, (max-width: 1024px) 260px, 280px"
          className={`object-cover transition-transform duration-700 ease-out group-hover:scale-105 ${
            imageLoaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setImageLoaded(true)}
          unoptimized
        />

        {/* Minimal Bottom Dark Shadow Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none opacity-90 group-hover:opacity-100 transition-opacity" />

        {/* Minimal Bottom Left Text Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 z-10 flex flex-col text-left space-y-0.5">
          <span className="text-[8px] sm:text-[9px] font-extrabold uppercase tracking-widest text-amber-400/90 group-hover:text-amber-300 transition-colors">
            {item.category}
          </span>
          <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight leading-snug line-clamp-2 drop-shadow-md">
            {item.title}
          </h3>
          {item.price !== undefined && (
            <span className="text-[10px] sm:text-[11px] font-semibold text-neutral-200 pt-0.5 font-mono">
              ₹{item.price.toLocaleString("en-IN")}
            </span>
          )}
        </div>
      </Link>
    </div>
  );
}
