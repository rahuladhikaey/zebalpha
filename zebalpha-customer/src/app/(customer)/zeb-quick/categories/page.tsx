"use client";

import { useState, useEffect } from "react";
import { useZebQuick } from "@/context/ZebQuickContext";
import { ZebQuickSplitCategoryView } from "@/components/zeb-quick/ZebQuickSplitCategoryView";

export default function ZebQuickCategoriesPage() {
  const { mainCategories } = useZebQuick();
  const [activeMain, setActiveMain] = useState<string>("Women's Innerwear");

  useEffect(() => {
    if (mainCategories.length > 0 && !mainCategories.some((m) => m.name === activeMain)) {
      setActiveMain(mainCategories[0].name);
    }
  }, [mainCategories, activeMain]);

  return (
    <div className="mx-auto max-w-5xl">
      {/* Top Main Category Strip */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-neutral-200 bg-white px-3.5 py-2.5 no-scrollbar">
        {mainCategories.map((mc) => {
          const active = activeMain === mc.name;
          return (
            <button
              key={mc.id || mc.name}
              type="button"
              onClick={() => setActiveMain(mc.name)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-extrabold transition cursor-pointer ${
                active
                  ? "bg-neutral-950 text-[#F8CB46]"
                  : "border border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-amber-400"
              }`}
            >
              {mc.name}
            </button>
          );
        })}
      </div>

      {/* Blinkit Split Subcategory View */}
      <ZebQuickSplitCategoryView mainCategory={activeMain} />
    </div>
  );
}
