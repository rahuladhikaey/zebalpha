import React from "react";
import { Layers, CheckCircle2, XCircle } from "lucide-react";
import { ColorVariantSummary } from "@/lib/aeo-geo/types";

interface VariantAeoMatrixProps {
  colorVariants: ColorVariantSummary[];
  className?: string;
}

/**
 * Factual Variant Availability Matrix.
 * Accurately shows which exact sizes are available per color, preventing search engine misrepresentation.
 */
export function VariantAeoMatrix({ colorVariants, className = "" }: VariantAeoMatrixProps) {
  if (!colorVariants || colorVariants.length === 0) return null;

  return (
    <section
      aria-label="Color and Size Availability Matrix"
      className={`rounded-2xl border border-neutral-800 bg-neutral-950 p-5 sm:p-6 shadow-xl ${className}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <Layers className="h-4 w-4 text-white" />
        <h3 className="text-sm font-black text-white uppercase tracking-wider">
          Color & Size Availability Matrix
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-neutral-800 text-[10px] font-black uppercase tracking-widest text-neutral-400">
              <th className="py-2.5 pr-4">Color Shade</th>
              <th className="py-2.5 px-4">In-Stock Sizes</th>
              <th className="py-2.5 px-4">Out-of-Stock Sizes</th>
              <th className="py-2.5 pl-4 text-right">Price</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-900 font-medium">
            {colorVariants.map((cv, i) => (
              <tr key={i} className="hover:bg-neutral-900/50 transition-colors">
                <td className="py-3 pr-4 font-bold text-white flex items-center gap-2">
                  {cv.colorHex && (
                    <span
                      className="h-3 w-3 rounded-full border border-neutral-700 shrink-0 shadow-sm"
                      style={{ backgroundColor: cv.colorHex }}
                      aria-hidden="true"
                    />
                  )}
                  <span>{cv.color}</span>
                </td>
                <td className="py-3 px-4">
                  {cv.availableSizes.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {cv.availableSizes.map((sz) => (
                        <span
                          key={sz}
                          className="inline-flex items-center gap-1 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800/80 px-2 py-0.5 text-[10px] font-extrabold"
                        >
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          {sz}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-neutral-500 text-xs italic">Sold out</span>
                  )}
                </td>
                <td className="py-3 px-4">
                  {cv.outOfStockSizes.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {cv.outOfStockSizes.map((sz) => (
                        <span
                          key={sz}
                          className="inline-flex items-center gap-1 rounded bg-neutral-900 text-neutral-500 border border-neutral-800 px-2 py-0.5 text-[10px] line-through"
                        >
                          <XCircle className="h-2.5 w-2.5" />
                          {sz}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-neutral-500 text-xs">—</span>
                  )}
                </td>
                <td className="py-3 pl-4 text-right font-black text-white">
                  ₹{cv.minPrice}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
