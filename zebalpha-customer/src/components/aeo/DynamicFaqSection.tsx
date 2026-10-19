import React from "react";
import { HelpCircle, ChevronDown } from "lucide-react";
import { FaqItem } from "@/lib/aeo-geo/types";

interface DynamicFaqSectionProps {
  title?: string;
  subtitle?: string;
  faqs: FaqItem[];
  className?: string;
}

/**
 * Crawlable FAQ Component using native semantic HTML (<details>/<summary>).
 * Googlebot and AI crawlers can index all questions and answers directly from the initial HTML.
 */
export function DynamicFaqSection({
  title = "Frequently Asked Questions",
  subtitle = "Direct answers to common questions about materials, sizing, delivery & care",
  faqs,
  className = "",
}: DynamicFaqSectionProps) {
  if (!faqs || faqs.length === 0) return null;

  return (
    <section
      aria-label="Frequently Asked Questions"
      className={`rounded-3xl border border-neutral-800 bg-neutral-950 p-6 sm:p-8 shadow-2xl ${className}`}
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-black shadow-md">
          <HelpCircle className="h-4 w-4 stroke-[2.5]" />
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs text-neutral-400 font-medium mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, index) => (
          <details
            key={index}
            className="group rounded-2xl border border-neutral-900 bg-neutral-900/60 p-4 transition-all hover:border-neutral-700 open:border-neutral-700 open:bg-neutral-900"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-4 font-bold text-white text-sm sm:text-base select-none list-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-center gap-2.5">
                <span className="text-xs font-black text-neutral-300 group-open:text-white transition-colors">
                  Q{index + 1}.
                </span>
                <span>{faq.question}</span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400 transition-transform duration-300 group-open:rotate-180" />
            </summary>
            <div className="mt-3.5 pl-6 pr-2 text-xs sm:text-sm leading-relaxed text-neutral-300 font-normal border-t border-neutral-800/80 pt-3">
              {faq.answer}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
