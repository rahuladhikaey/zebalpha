"use client";

import { useEffect, useState } from "react";
import { X, Zap } from "lucide-react";
import { useZebQuick } from "@/context/ZebQuickContext";
import { ZebQuickProductCard, type ZebQuickProductRecord } from "@/components/zeb-quick/ZebQuickProductCard";

export function ZebQuickSplitCategoryView({
  mainCategory,
  initialSubSlug,
  onClose,
}: {
  mainCategory: string;
  initialSubSlug?: string;
  onClose?: () => void;
}) {
  const { pincode, subcategories } = useZebQuick();
  const groupSubs = subcategories.filter((s) => s.category_group === mainCategory);
  const [selectedSubSlug, setSelectedSubSlug] = useState<string>(initialSubSlug || "__ALL__");
  const [products, setProducts] = useState<ZebQuickProductRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setSelectedSubSlug(initialSubSlug || "__ALL__");
  }, [mainCategory, initialSubSlug]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams();
    params.set("pincode", pincode);
    params.set("category_group", mainCategory);
    if (selectedSubSlug !== "__ALL__") {
      params.set("subcategory", selectedSubSlug);
    }

    fetch(`/api/zeb-quick/products?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        setProducts(Array.isArray(data.products) ? data.products : []);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [pincode, mainCategory, selectedSubSlug]);

  return (
    <div className="mx-auto max-w-5xl bg-white min-h-[70vh] flex flex-col">
      {/* Category Header Bar with Close Pill */}
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 bg-white sticky top-0 z-10">
        <div>
          <h2 className="text-base font-black text-neutral-950">{mainCategory}</h2>
          <p className="text-[11px] font-semibold text-neutral-500">
            5–6 Hr Express • {groupSubs.length} subcategories
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close category view"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-white shadow-sm hover:bg-neutral-800 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Blinkit Split Layout: Left Vertical Subcategory Rail + Right Product Grid */}
      <div className="flex flex-1 min-h-0">
        {/* Left Subcategory Rail */}
        <aside className="w-[86px] sm:w-28 shrink-0 border-r border-neutral-200/80 bg-neutral-50/70 overflow-y-auto py-2 space-y-1">
          <button
            type="button"
            onClick={() => setSelectedSubSlug("__ALL__")}
            className={`relative flex w-full flex-col items-center gap-1 px-1.5 py-2.5 text-center transition cursor-pointer ${
              selectedSubSlug === "__ALL__" ? "bg-white text-neutral-950" : "text-neutral-600 hover:bg-white/60"
            }`}
          >
            {selectedSubSlug === "__ALL__" && (
              <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-emerald-600" />
            )}
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-neutral-900 shadow-xs">
              <Zap className="h-5 w-5 fill-amber-500 text-amber-600" />
            </div>
            <span className={`text-[10.5px] leading-tight ${selectedSubSlug === "__ALL__" ? "font-black" : "font-semibold"}`}>
              All
            </span>
          </button>

          {groupSubs.map((sub) => {
            const active = selectedSubSlug === sub.slug;
            return (
              <button
                key={sub.slug}
                type="button"
                onClick={() => setSelectedSubSlug(sub.slug)}
                className={`relative flex w-full flex-col items-center gap-1 px-1.5 py-2.5 text-center transition cursor-pointer ${
                  active ? "bg-white text-neutral-950" : "text-neutral-600 hover:bg-white/60"
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-emerald-600" />
                )}
                <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-white border border-neutral-200/80 shadow-xs">
                  {sub.image_url ? (
                    <img src={sub.image_url} alt={sub.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs font-black text-emerald-700">
                      {sub.name.slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className={`text-[10.5px] leading-tight line-clamp-2 ${active ? "font-black" : "font-semibold"}`}>
                  {sub.name}
                </span>
              </button>
            );
          })}
        </aside>

        {/* Right Product Grid */}
        <div className="flex-1 p-3 overflow-y-auto bg-white">
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-52 animate-pulse rounded-2xl bg-neutral-100" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-3xl border border-amber-200/80 bg-amber-50/40 p-6 text-center mt-4">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase text-amber-800">
                Products Coming Soon
              </span>
              <p className="mt-2.5 text-sm font-black text-neutral-900">
                No items live in {selectedSubSlug === "__ALL__" ? mainCategory : groupSubs.find((s) => s.slug === selectedSubSlug)?.name} yet
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Local sellers in pincode {pincode} are adding fresh stock soon!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {products.map((p) => (
                <ZebQuickProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
