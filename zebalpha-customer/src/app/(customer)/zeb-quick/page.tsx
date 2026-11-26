"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, Zap, MapPinOff, ArrowRight } from "lucide-react";
import { useZebQuick } from "@/context/ZebQuickContext";
import { ZebQuickProductCard, type ZebQuickProductRecord } from "@/components/zeb-quick/ZebQuickProductCard";
import { ZebQuickSplitCategoryView } from "@/components/zeb-quick/ZebQuickSplitCategoryView";
import { ZebQuickMainCategoryView } from "@/components/zeb-quick/ZebQuickMainCategoryView";
import { ZEB_QUICK_FREE_DELIVERY_MIN } from "../../../../../shared/constants/zebQuick";

export default function ZebQuickHomePage() {
  const {
    pincode,
    serviceability,
    setLocationModalOpen,
    searchQuery,
    selectedMainCategory,
    setSelectedMainCategory,
    mainCategories,
    subcategories,
  } = useZebQuick();
  const [products, setProducts] = useState<ZebQuickProductRecord[]>([]);
  const [bestsellerGroups, setBestsellerGroups] = useState<
    Array<{
      category_group: string;
      subcategory_slug: string;
      title: string;
      totalCount: number;
      moreCount: number;
      previewImages: string[];
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [splitSubSlug, setSplitSubSlug] = useState<string | null>(null);

  useEffect(() => {
    setSplitSubSlug(null);
  }, [selectedMainCategory]);

  useEffect(() => {
    if (selectedMainCategory !== "All" && !searchQuery.trim()) return;
    let active = true;
    setLoading(true);
    const params = new URLSearchParams();
    params.set("pincode", pincode);
    if (selectedMainCategory !== "All") params.set("category_group", selectedMainCategory);
    if (searchQuery.trim()) params.set("q", searchQuery.trim());

    fetch(`/api/zeb-quick/products?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        setProducts(Array.isArray(data.products) ? data.products : []);
        if (Array.isArray(data.bestsellerGroups)) {
          setBestsellerGroups(data.bestsellerGroups);
        }
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [pincode, selectedMainCategory, searchQuery]);

  // Serviceability Warning if outside active delivery corridor
  if (serviceability.checked && !serviceability.serviceable) {
    return (
      <div className="mx-auto max-w-5xl px-3.5 py-6">
        <div className="rounded-3xl border border-amber-200 bg-gradient-to-b from-amber-50 to-white p-6 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <MapPinOff className="h-7 w-7" />
          </div>
          <span className="mt-3 inline-block rounded-full bg-amber-100 px-3 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-800">
            Services Coming Soon
          </span>
          <h2 className="mt-2 text-lg font-black text-neutral-900">
            ZebQuick is Coming Soon to {pincode}!
          </h2>
          <p className="mt-1.5 text-xs text-neutral-600 max-w-md mx-auto leading-relaxed">
            Our 5–6 Hour Express Delivery is currently live on the <strong>Sealdah → Krishnanagar</strong> corridor.
            We&apos;re expanding rapidly to your area!
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => setLocationModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white cursor-pointer"
            >
              Change Location / Pincode
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-2xl bg-neutral-900 px-4 py-2.5 text-xs font-extrabold text-white"
            >
              Switch to ZebAlpha <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Blinkit-Style Main Category Tab View (Featured + Top Deals) OR Split Subcategory View
  if (selectedMainCategory !== "All" && !searchQuery.trim()) {
    if (splitSubSlug !== null) {
      return (
        <ZebQuickSplitCategoryView
          mainCategory={selectedMainCategory}
          initialSubSlug={splitSubSlug}
          onClose={() => {
            setSplitSubSlug(null);
            setSelectedMainCategory("All");
          }}
        />
      );
    }
    return (
      <ZebQuickMainCategoryView
        mainCategory={selectedMainCategory}
        onOpenSplit={(subSlug) => setSplitSubSlug(subSlug)}
      />
    );
  }

  const liveSubSlugs = new Set(products.map((p) => p.subcategory_slug).filter(Boolean));

  return (
    <div className="mx-auto max-w-5xl px-3.5 py-4 space-y-5">
      {/* Blinkit-style Bestsellers 2x2 Collage Grid right at the top when live products exist */}
      {!searchQuery.trim() && bestsellerGroups.length > 0 && (
        <section className="space-y-2.5">
          <h2 className="text-base font-black tracking-tight text-neutral-950">Bestsellers</h2>
          <div className="grid grid-cols-3 gap-2.5">
            {bestsellerGroups.map((grp) => (
              <button
                key={grp.subcategory_slug || grp.title}
                type="button"
                onClick={() => {
                  setSelectedMainCategory(grp.category_group);
                  setSplitSubSlug(grp.subcategory_slug || "__ALL__");
                }}
                className="flex flex-col items-center rounded-2xl bg-neutral-100/90 p-2 pb-2.5 text-center transition hover:bg-neutral-200/70 active:scale-95 cursor-pointer"
              >
                <div className="relative w-full">
                  <div className="grid grid-cols-2 gap-1">
                    {Array.from({ length: 4 }).map((_, idx) => {
                      const img = grp.previewImages[idx];
                      return (
                        <div
                          key={idx}
                          className="aspect-square w-full overflow-hidden rounded-lg bg-white flex items-center justify-center p-0.5"
                        >
                          {img ? (
                            <img src={img} alt={grp.title} className="h-full w-full object-cover rounded-md" />
                          ) : (
                            <div className="h-full w-full rounded-md bg-neutral-50" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-[9.5px] font-extrabold text-neutral-700 shadow-xs">
                    {grp.moreCount > 0 ? `+${grp.moreCount} more` : `${grp.totalCount} items`}
                  </span>
                </div>
                <span className="mt-3.5 line-clamp-2 text-[11px] font-extrabold text-neutral-900 leading-tight">
                  {grp.title}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Blinkit-style Main Category Headings + 4-Column Subcategory Cards (only live in this pincode when products exist) */}
      {!searchQuery.trim() && products.length > 0 && mainCategories.length > 0 && (
        <div className="space-y-5">
          {mainCategories.map((mc) => {
            const allGroupSubs = subcategories.filter((s) => s.category_group === mc.name);
            const liveGroupSubs = allGroupSubs.filter((s) => liveSubSlugs.has(s.slug));
            const subsToShow = liveGroupSubs.length > 0 ? liveGroupSubs : [];
            if (subsToShow.length === 0) return null;

            return (
              <section key={mc.id || mc.name} className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-black tracking-tight text-neutral-950">{mc.name}</h2>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMainCategory(mc.name);
                      setSplitSubSlug("__ALL__");
                    }}
                    className="text-xs font-extrabold text-emerald-700 cursor-pointer"
                  >
                    See all →
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2.5 sm:gap-3.5">
                  {subsToShow.map((sub) => (
                    <button
                      key={sub.slug}
                      type="button"
                      onClick={() => {
                        setSelectedMainCategory(mc.name);
                        setSplitSubSlug(sub.slug);
                      }}
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
                          <span className="text-xs font-black text-emerald-800">
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
      )}

      {/* Product Grid (only shown while searching, or Coming Soon when empty; Home stays pure Blinkit Bestsellers + 4-col Categories) */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl bg-neutral-100" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-3xl border border-amber-200 bg-gradient-to-b from-amber-50/60 to-white p-8 text-center shadow-xs">
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-800">
            <Zap className="h-3 w-3 fill-amber-600" />
            Products Coming Soon
          </span>
          <h2 className="mt-3 text-base font-black text-neutral-900">
            Products Coming Soon in {pincode}!
          </h2>
          <p className="mt-1.5 text-xs text-neutral-600 max-w-md mx-auto leading-relaxed">
            ZebQuick 5–6 Hr delivery service is active in your area. Local verified sellers are listing fresh innerwear &amp; dailywear inventory soon!
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            <Link
              href="/zeb-quick/categories"
              className="inline-flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white"
            >
              Browse Categories
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-2xl bg-neutral-900 px-4 py-2.5 text-xs font-extrabold text-white"
            >
              Shop on ZebAlpha <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      ) : searchQuery.trim() ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {products.map((p) => (
            <ZebQuickProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
