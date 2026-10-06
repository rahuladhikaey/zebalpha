"use client";

import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";

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
    <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 py-8 sm:py-12 border-b border-neutral-900/80">
      {/* Left Column: Eyebrow + Main Title */}
      <div className="flex flex-col space-y-3 max-w-2xl">
        {/* Eyebrow badge */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900/90 border border-neutral-800 text-[10px] sm:text-xs font-black tracking-[0.25em] text-neutral-300 uppercase shadow-sm">
            <Sparkles className="w-3 h-3 text-rose-400" />
            <span>{eyebrow}</span>
          </span>
          <span className="h-[1px] w-12 bg-gradient-to-r from-rose-500/50 to-transparent hidden sm:block" />
        </div>

        {/* Large Editorial Headline */}
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black uppercase tracking-tight text-white leading-[0.95] font-sans">
          <span className="block text-neutral-100">{titleLine1}</span>
          <span className="block text-transparent bg-clip-text bg-gradient-to-r from-white via-neutral-200 to-neutral-400 italic font-serif">
            {titleLine2}
          </span>
        </h2>

        {/* Supporting Line */}
        <p className="text-xs sm:text-sm text-neutral-400 font-medium max-w-md tracking-wide leading-relaxed">
          {subtitle}
        </p>
      </div>

      {/* Right Column: CTA */}
      <div className="flex items-center md:items-end">
        <Link
          href={ctaHref}
          className="group inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full bg-white text-black font-black text-xs uppercase tracking-[0.2em] shadow-[0_0_25px_rgba(255,255,255,0.15)] hover:bg-neutral-100 hover:shadow-[0_0_35px_rgba(255,255,255,0.35)] transition-all duration-300 active:scale-95 cursor-pointer"
        >
          <span>{ctaText}</span>
          <ArrowUpRight className="w-4 h-4 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </Link>
      </div>
    </header>
  );
}
