"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

interface EditorialHeadingProps {
  eyebrow?: string;
  titleLine1?: string;
  titleLine2?: string;
  subtitle?: string;
  ctaText?: string;
  ctaHref?: string;
}

export function EditorialHeading({
  eyebrow = "THE ZEBALPHA EDIT",
  titleLine1 = "Woven to Be",
  titleLine2 = "Remembered",
  subtitle = "Pieces made for the moments that stay with you.",
  ctaText = "EXPLORE THE EDIT",
  ctaHref = "/products",
}: EditorialHeadingProps) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 sm:pb-8 pt-2">
      {/* Left Column: Eyebrow + Headline */}
      <div className="flex flex-col space-y-2 max-w-2xl">
        {/* Eyebrow */}
        <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.3em] text-rose-600 dark:text-rose-400">
          {eyebrow}
        </span>

        {/* Headline matching Reference Image ("Woven to Be" + golden cursive "Remembered") */}
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-serif tracking-tight text-neutral-900 dark:text-white leading-[1.05]">
          <span>{titleLine1} </span>
          <span className="font-serif italic font-normal text-amber-600 dark:text-amber-300 drop-shadow-sm">
            {titleLine2}
          </span>
        </h2>

        {/* Subtitle */}
        {subtitle && (
          <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 font-medium max-w-md pt-1">
            {subtitle}
          </p>
        )}
      </div>

      {/* Right Link matching Reference Image */}
      <div className="flex items-center">
        <Link
          href={ctaHref}
          className="group inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.2em] text-neutral-700 dark:text-neutral-300 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
        >
          <span>{ctaText}</span>
          <ArrowUpRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </Link>
      </div>
    </header>
  );
}
