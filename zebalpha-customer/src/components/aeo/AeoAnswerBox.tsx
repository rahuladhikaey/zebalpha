import React from "react";
import { Sparkles, CheckCircle2 } from "lucide-react";

interface AeoAnswerBoxProps {
  title?: string;
  directAnswer: string;
  highlightChips?: Array<{ label: string; value: string }>;
  sourceLabel?: string;
  className?: string;
}

/**
 * Factual Answer Box optimized for Search Engine Snippets & AI Answer Engines.
 * Rendered in semantic HTML accessible immediately on SSR.
 */
export function AeoAnswerBox({
  title,
  directAnswer,
  highlightChips = [],
  sourceLabel = "ZEBALPHA VERIFIED SPECIFICATIONS",
  className = "",
}: AeoAnswerBoxProps) {
  if (!directAnswer) return null;

  return (
    <section
      aria-label="Direct Product & Specification Summary"
      className={`rounded-2xl border border-neutral-800 bg-neutral-950/80 p-5 sm:p-6 backdrop-blur-sm shadow-xl ${className}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-black shadow-sm">
          <Sparkles className="h-3 w-3 stroke-[2.5]" />
        </span>
        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-neutral-400">
          {sourceLabel}
        </span>
      </div>

      {title && (
        <h2 className="text-base sm:text-lg font-black text-white tracking-tight mb-2">
          {title}
        </h2>
      )}

      <p className="text-sm leading-relaxed text-neutral-200 font-medium">
        {directAnswer}
      </p>

      {highlightChips.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2 pt-3 border-t border-neutral-900">
          {highlightChips.map((chip, i) => (
            <div
              key={i}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900/90 px-2.5 py-1 text-[11px] font-bold text-neutral-300"
            >
              <CheckCircle2 className="h-3 w-3 text-emerald-400 shrink-0" />
              <span className="text-neutral-400">{chip.label}:</span>
              <span className="text-white">{chip.value}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
