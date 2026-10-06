"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

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
  isHovered?: boolean;
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
        className="group relative block w-[230px] sm:w-[270px] md:w-[300px] aspect-[3/4] rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800 shadow-xl hover:shadow-2xl transition-all duration-300 hover:border-amber-500/50"
      >
        {/* Loading Skeleton */}
        {!imageLoaded && (
          <div className="absolute inset-0 bg-neutral-900 animate-pulse flex items-center justify-center">
            <span className="text-[10px] font-mono tracking-widest text-neutral-600 uppercase">
              ZEBALPHA EDIT
            </span>
          </div>
        )}

        {/* Fashion Image */}
        <Image
          src={item.image}
          alt={item.title}
          fill
          sizes="(max-width: 640px) 230px, (max-width: 768px) 270px, 300px"
          className={`object-cover transition-transform duration-700 ease-out group-hover:scale-106 ${
            imageLoaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setImageLoaded(true)}
          unoptimized
        />

        {/* Bottom Dark Gradient Shadow */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent pointer-events-none opacity-90 group-hover:opacity-95 transition-opacity" />

        {/* Top Tag Badge */}
        {item.badge && (
          <div className="absolute top-3 left-3 z-10">
            <span className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-[9px] font-extrabold uppercase tracking-widest text-neutral-200">
              {item.badge}
            </span>
          </div>
        )}

        {/* Bottom Text Details matching Reference Photo */}
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 z-10 flex flex-col space-y-1 text-left">
          {/* Category / Subtitle line */}
          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-neutral-300 group-hover:text-amber-300 transition-colors">
            {item.category}
          </span>

          {/* Product Name */}
          <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-tight leading-snug line-clamp-2 drop-shadow-md">
            {item.title}
          </h3>

          {/* Price */}
          {item.price !== undefined && (
            <div className="pt-1 flex items-center justify-between">
              <span className="text-xs sm:text-sm font-black text-amber-300 tracking-wider">
                ₹{item.price.toLocaleString("en-IN")}
              </span>
              <span className="p-1 rounded-full bg-white/10 group-hover:bg-white text-white group-hover:text-black transition-colors">
                <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>
          )}
        </div>

        {/* High-end Hover Border */}
        <div className="absolute inset-0 rounded-2xl border border-white/0 group-hover:border-amber-400/40 pointer-events-none transition-colors" />
      </Link>
    </div>
  );
}
