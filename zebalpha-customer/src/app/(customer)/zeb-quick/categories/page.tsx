"use client";

import { useState } from "react";
import { useZebQuick } from "@/context/ZebQuickContext";
import { ZebQuickSplitCategoryView } from "@/components/zeb-quick/ZebQuickSplitCategoryView";

export default function ZebQuickCategoriesPage() {
  const { mainCategories, subcategories, searchQuery } = useZebQuick();
  const [selectedSplit, setSelectedSplit] = useState<{
    mainCategory: string;
    subSlug: string;
  } | null>(null);

  if (selectedSplit) {
    return (
      <ZebQuickSplitCategoryView
        mainCategory={selectedSplit.mainCategory}
        initialSubSlug={selectedSplit.subSlug}
        onClose={() => setSelectedSplit(null)}
      />
    );
  }

  const q = searchQuery.trim().toLowerCase();

  return (
    <div className="mx-auto max-w-5xl px-3.5 py-4 space-y-6">
      {mainCategories.map((mc) => {
        const subs = subcategories.filter(
          (s) =>
            s.category_group === mc.name &&
            (!q || s.name.toLowerCase().includes(q) || mc.name.toLowerCase().includes(q))
        );
        if (subs.length === 0) return null;

        return (
          <section key={mc.id || mc.name} className="space-y-3">
            <h2 className="text-base font-black tracking-tight text-neutral-950">{mc.name}</h2>
            <div className="grid grid-cols-4 gap-2.5 sm:gap-3.5">
              {subs.map((sub) => (
                <button
                  key={sub.slug}
                  type="button"
                  onClick={() =>
                    setSelectedSplit({
                      mainCategory: mc.name,
                      subSlug: sub.slug,
                    })
                  }
                  className="flex flex-col items-center text-center group cursor-pointer active:scale-95 transition"
                >
                  <div className="aspect-square w-full overflow-hidden rounded-2xl bg-[#EEF6F6] p-2 flex items-center justify-center border border-neutral-200/50 group-hover:border-emerald-400 transition">
                    {sub.image_url ? (
                      <img
                        src={sub.image_url}
                        alt={sub.name}
                        loading="lazy"
                        className="h-full w-full object-contain rounded-xl"
                      />
                    ) : (
                      <span className="text-sm font-black text-emerald-800">
                        {sub.name.slice(0, 2).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="mt-1.5 line-clamp-2 text-[11px] font-bold text-neutral-900 leading-tight">
                    {sub.name}
                  </span>
                </button>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
