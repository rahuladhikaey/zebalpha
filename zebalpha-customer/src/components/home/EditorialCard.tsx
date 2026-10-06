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
        className="group relative block w-[230px] sm:w-[270px] md:w-[300px] aspect-[3/4] rounded-xl overflow-hidden bg-neutral-900 border border-white/10 shadow-xl transition-all duration-300 hover:border-amber-400/40"
      >
        {/* Loading Skeleton */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-neutral-900 animate-pulse flex items-center justify-center">
            <span className="text-[10px] font-mono tracking-widest text-neutral-600 uppercase">
              ZEBALPHA EDIT
            </span>
          </div>
        )}

        {/* High-Fashion Editorial Photograph */}
        <Image
          src={item.image}
          alt={item.title}
          fill
          sizes="(max-width: 640px) 230px, (max-width: 768px) 270px, 300px"
          className={`object-cover transition-transform duration-700 ease-out group-hover:scale-105 ${
            imageLoaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setImageLoaded(true)}
          unoptimized
        />

        {/* Minimal Bottom Dark Shadow Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none opacity-85 group-hover:opacity-95 transition-opacity" />

        {/* Minimal Bottom Left Text Overlay matching Reference Photo */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-10 flex flex-col text-left space-y-0.5">
          {/* Subtitle / Category Tag */}
          <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-300/90 group-hover:text-amber-300 transition-colors">
            {item.category}
          </span>

          {/* Product Title */}
          <h3 className="text-sm font-bold text-white tracking-tight leading-snug line-clamp-1 drop-shadow-md">
            {item.title}
          </h3>

          {/* Subtle Price if present */}
          {item.price !== undefined && (
            <span className="text-[11px] font-semibold text-neutral-300/90 pt-0.5 font-mono">
              ₹{item.price.toLocaleString("en-IN")}
            </span>
          )}
        </div>
      </Link>
    </div>
  );
}
