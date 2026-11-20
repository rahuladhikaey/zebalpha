"use client";

import { useIsNativeApp } from "@/lib/platform";

interface EditorialHeadingProps {
  eyebrow?: string;
  titleLine1?: string;
  titleLine2?: string;
  subtitle?: string;
}

export function EditorialHeading({
  eyebrow = "THE ZEBALPHA EDIT",
  titleLine1 = "Woven to Be",
  titleLine2 = "Remembered",
  subtitle = "Pieces made for the moments that stay with you.",
}: EditorialHeadingProps) {
  const isNativeApp = useIsNativeApp();

  return (
    <header className="flex flex-col space-y-1.5 w-full pb-2 pt-1">
      {/* Eyebrow */}
      <span
        className={`text-[10px] sm:text-xs font-black uppercase tracking-[0.26em] ${
          isNativeApp ? "text-[#9A6503]" : "text-rose-500"
        }`}
      >
        {eyebrow}
      </span>

      {/* Headline: Single-line responsive typography across phone, tablet & desktop */}
      <h2
        className={`whitespace-nowrap text-[clamp(1.2rem,5.5vw,3.15rem)] font-serif tracking-tight leading-[1.12] ${
          isNativeApp ? "text-[#111111]" : "text-white"
        }`}
      >
        <span>{titleLine1} </span>
        <span
          className={`font-serif italic font-normal drop-shadow-sm pl-0.5 sm:pl-1.5 ${
            isNativeApp ? "text-[#9E7416]" : "text-amber-300"
          }`}
        >
          {titleLine2}
        </span>
      </h2>

      {/* Subtitle */}
      {subtitle && (
        <p
          className={`text-[11px] sm:text-sm font-medium max-w-lg pt-0.5 leading-relaxed ${
            isNativeApp ? "text-[#4A3F2B]" : "text-neutral-400"
          }`}
        >
          {subtitle}
        </p>
      )}
    </header>
  );
}
