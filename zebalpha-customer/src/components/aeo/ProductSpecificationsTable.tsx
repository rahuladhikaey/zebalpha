import React from "react";
import { Sliders, ShieldCheck } from "lucide-react";
import { ProductAeoData } from "@/lib/aeo-geo/types";

interface ProductSpecificationsTableProps {
  productAeo: ProductAeoData;
  className?: string;
}

/**
 * Factual Product Specifications & Attribute Table.
 * Renders in clean, semantic HTML directly crawlable by search engines & AI answer engines.
 */
export function ProductSpecificationsTable({
  productAeo,
  className = "",
}: ProductSpecificationsTableProps) {
  const specs = [
    { label: "Fabric / Material", value: productAeo.material },
    { label: "Fit Type", value: productAeo.fitType },
    { label: "Neckline / Collar", value: productAeo.neckType },
    { label: "Sleeve Length", value: productAeo.sleeveType },
    { label: "Pattern / Design", value: productAeo.pattern },
    { label: "Care Instructions", value: productAeo.careInstructions },
    { label: "Country of Origin", value: productAeo.countryOfOrigin },
    { label: "Dispatch Guarantee", value: productAeo.shippingInfo },
    { label: "Return & Exchange", value: productAeo.returnInfo },
    { label: "Fulfilled & Shipped By", value: "ZebAlpha Verified Logistics" },
  ].filter((item) => Boolean(item.value));

  return (
    <section
      aria-label="Product Technical Specifications"
      className={`rounded-2xl border border-neutral-800 bg-neutral-950 p-5 sm:p-6 shadow-xl ${className}`}
    >
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-900">
        <div className="flex items-center gap-2">
          <Sliders className="h-4 w-4 text-white" />
          <h3 className="text-sm font-black text-white uppercase tracking-wider">
            Technical Specifications & Details
          </h3>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-neutral-400 bg-neutral-900 px-2 py-0.5 rounded border border-neutral-800">
          <ShieldCheck className="h-3 w-3 text-emerald-400" />
          Authentic Quality
        </span>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5 text-xs sm:text-sm">
        {specs.map((item, i) => (
          <div
            key={i}
            className="flex flex-col py-1.5 border-b border-neutral-900/80 last:border-0"
          >
            <dt className="text-[10px] font-extrabold uppercase tracking-widest text-neutral-400">
              {item.label}
            </dt>
            <dd className="mt-0.5 font-bold text-neutral-200 text-xs sm:text-sm">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
