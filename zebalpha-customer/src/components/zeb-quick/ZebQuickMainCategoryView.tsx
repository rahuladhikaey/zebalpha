"use client";

import { useEffect, useState } from "react";
import { ChevronRight, Minus, Plus, Clock, Zap } from "lucide-react";
import { useZebQuick } from "@/context/ZebQuickContext";
import type { ZebQuickProductRecord } from "@/components/zeb-quick/ZebQuickProductCard";

export function ZebQuickMainCategoryView({
  mainCategory,
  onOpenSplit,
}: {
  mainCategory: string;
  onOpenSplit: (subSlug: string) => void;
}) {
  const { pincode, subcategories, cart, addToCart, updateQty, openProductDetail } = useZebQuick();
  const [products, setProducts] = useState<ZebQuickProductRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const groupSubs = subcategories.filter((s) => s.category_group === mainCategory);
  const featuredSubs = groupSubs.some((s) => s.is_featured)
    ? groupSubs.filter((s) => s.is_featured)
    : groupSubs.slice(0, 6);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams();
    params.set("pincode", pincode);
    params.set("category_group", mainCategory);

    fetch(`/api/zeb-quick/products?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        const list: ZebQuickProductRecord[] = Array.isArray(data.products) ? data.products : [];
        // Sort Top Deals by highest discount % first
        list.sort((a, b) => {
          const discA = a.mrp && a.mrp > a.zeb_quick_price ? (a.mrp - a.zeb_quick_price) / a.mrp : 0;
          const discB = b.mrp && b.mrp > b.zeb_quick_price ? (b.mrp - b.zeb_quick_price) / b.mrp : 0;
          return discB - discA;
        });
        setProducts(list);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [pincode, mainCategory]);

  const handleQuickAdd = (p: ZebQuickProductRecord) => {
    const img = p.image_url || (Array.isArray(p.images) && p.images[0]) || "/official-logo-sm.png";
    addToCart({
      id: p.id,
      source_product_id: p.source_product_id || p.id,
      seller_id: p.seller_id,
      title: p.title,
      image_url: img,
      price: Number(p.zeb_quick_price || 0),
      mrp: p.mrp ? Number(p.mrp) : null,
      size: Array.isArray(p.sizes) && p.sizes.length > 0 ? String(p.sizes[0]) : undefined,
      pickup_pincode: p.pickup_pincode,
    });
  };

  return (
    <div className="mx-auto max-w-5xl px-3.5 py-4 space-y-5">
      {/* Blinkit Featured Subcategory Cards Horizontal Strip */}
      {featuredSubs.length > 0 && (
        <section>
          <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
            {featuredSubs.map((sub) => (
              <button
                key={sub.slug}
                type="button"
                onClick={() => onOpenSplit(sub.slug)}
                className="relative flex w-28 shrink-0 flex-col items-center justify-between overflow-hidden rounded-2xl border-2 border-sky-400/70 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 p-2 text-center shadow-sm transition active:scale-95 cursor-pointer"
              >
                <span className="rounded-b-lg bg-white px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-rose-600 shadow-xs">
                  Featured
                </span>
                <p className="mt-1.5 line-clamp-2 text-[11px] font-extrabold text-white leading-tight">
                  {sub.name}
                </p>
                <div className="mt-2 h-16 w-16 overflow-hidden rounded-xl bg-white/95 p-1">
                  {sub.image_url ? (
                    <img src={sub.image_url} alt={sub.name} className="h-full w-full object-cover rounded-lg" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs font-black text-slate-700">
                      {sub.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Top Deals 3-Column Compact Grid */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black tracking-tight text-neutral-950">Top Deals</h2>
          <button
            type="button"
            onClick={() => onOpenSplit("__ALL__")}
            className="text-xs font-extrabold text-emerald-700 cursor-pointer"
          >
            View all →
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-3 gap-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 animate-pulse rounded-2xl bg-neutral-100" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50/60 p-6 text-center">
            <Zap className="mx-auto h-6 w-6 text-amber-500" />
            <p className="mt-2 text-sm font-black text-neutral-900">
              No live items in {mainCategory} for {pincode} yet
            </p>
            <p className="mt-1 text-xs text-neutral-600">
              Check back soon or browse all subcategories below.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2.5">
            {products.slice(0, 9).map((p) => {
              const img = p.image_url || (Array.isArray(p.images) && p.images[0]) || "/official-logo-sm.png";
              const price = Number(p.zeb_quick_price || 0);
              const mrp = Number(p.mrp || 0);
              const saveAmt = mrp > price ? Math.round(mrp - price) : 0;
              const sizeLabel = Array.isArray(p.sizes) && p.sizes.length > 0 ? String(p.sizes[0]) : "1 unit";
              const defaultSize = Array.isArray(p.sizes) && p.sizes.length > 0 ? String(p.sizes[0]) : undefined;
              const qty = cart.find((c) => c.id === p.id && (c.size || "") === (defaultSize || ""))?.quantity || 0;

              return (
                <div
                  key={p.id}
                  onClick={() => openProductDetail(p)}
                  className="flex flex-col justify-between rounded-2xl border border-neutral-200/80 bg-white p-1.5 shadow-[0_1px_6px_rgba(0,0,0,0.03)] cursor-pointer"
                >
                  <div>
                    <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-neutral-50">
                      <img src={img} alt={p.title} loading="lazy" className="h-full w-full object-cover" />
                    </div>

                    <div className="mt-1.5 flex items-center justify-between gap-1" onClick={(e) => e.stopPropagation()}>
                      <span className="truncate rounded-md bg-neutral-100 px-1.5 py-0.5 text-[9.5px] font-bold text-neutral-700">
                        {sizeLabel}
                      </span>
                      {qty === 0 ? (
                        <button
                          type="button"
                          onClick={() => handleQuickAdd(p)}
                          className="inline-flex h-6 items-center gap-0.5 rounded-lg border border-emerald-600 bg-white px-2 text-[10px] font-black text-emerald-700 transition hover:bg-emerald-600 hover:text-white cursor-pointer"
                        >
                          <Plus className="h-2.5 w-2.5" />
                          ADD
                        </button>
                      ) : (
                        <div className="inline-flex h-6 items-center gap-1.5 rounded-lg bg-[#0C831F] px-1.5 text-[10px] font-black text-white">
                          <button
                            type="button"
                            onClick={() => updateQty(p.id, defaultSize, undefined, qty - 1)}
                            className="cursor-pointer"
                          >
                            <Minus className="h-2.5 w-2.5 stroke-[2.5]" />
                          </button>
                          <span>{qty}</span>
                          <button
                            type="button"
                            onClick={() => updateQty(p.id, defaultSize, undefined, qty + 1)}
                            className="cursor-pointer"
                          >
                            <Plus className="h-2.5 w-2.5 stroke-[2.5]" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="mt-1 flex items-baseline gap-1">
                      <span className="text-xs font-black text-neutral-950">₹{price}</span>
                      {mrp > price && (
                        <span className="text-[10px] text-neutral-400 line-through">₹{mrp}</span>
                      )}
                    </div>
                    {saveAmt > 0 && (
                      <p className="text-[9.5px] font-extrabold text-sky-600 leading-tight">
                        ₹{saveAmt} OFF
                      </p>
                    )}

                    <h3 className="mt-0.5 line-clamp-2 text-[11px] font-bold text-neutral-900 leading-snug">
                      {p.title}
                    </h3>
                  </div>

                  <div className="mt-1.5 space-y-1">
                    <div className="flex items-center gap-1 text-[9.5px] font-bold text-neutral-500">
                      <Clock className="h-2.5 w-2.5 text-emerald-600" />
                      <span>5–6 hrs</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onOpenSplit(p.subcategory_slug || "__ALL__")}
                      className="flex w-full items-center justify-center gap-0.5 rounded-lg bg-emerald-50 py-1 text-[9.5px] font-extrabold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                    >
                      <span>See more like this</span>
                      <ChevronRight className="h-2.5 w-2.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Bottom Blinkit "See all products >" Pill */}
      <button
        type="button"
        onClick={() => onOpenSplit("__ALL__")}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 py-3 text-xs font-extrabold text-neutral-900 shadow-xs hover:bg-neutral-100 active:scale-[0.99] cursor-pointer"
      >
        <span>See all products in {mainCategory}</span>
        <ChevronRight className="h-4 w-4 text-neutral-700" />
      </button>
    </div>
  );
}
