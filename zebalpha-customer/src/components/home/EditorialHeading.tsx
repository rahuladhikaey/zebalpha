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
    <header className="flex flex-col space-y-2 max-w-3xl pb-4 pt-2">
      {/* Eyebrow */}
      <span
        className={`text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] ${
          isNativeApp ? "text-[#9A6503]" : "text-rose-500"
        }`}
      >
        {eyebrow}
      </span>

      {/* Headline: "Woven to Be" + golden cursive "Remembered" */}
      <h2
        className={`text-3xl sm:text-5xl lg:text-6xl font-serif tracking-tight leading-[1.05] ${
          isNativeApp ? "text-[#111111]" : "text-white"
        }`}
      >
        <span>{titleLine1} </span>
        <span
          className={`font-serif italic font-normal drop-shadow-sm pl-1 sm:pl-2 ${
            isNativeApp ? "text-[#9E7416]" : "text-amber-300"
          }`}
        >
          {titleLine2}
        </span>
      </h2>

      {/* Subtitle */}
      {subtitle && (
        <p
          className={`text-xs sm:text-sm font-medium max-w-md pt-1 ${
            isNativeApp ? "text-[#4A3F2B]" : "text-neutral-400"
          }`}
        >
          {subtitle}
        </p>
      )}
    </header>
  );
}
