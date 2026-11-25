"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, ShieldCheck, Zap, MapPinOff, ArrowRight } from "lucide-react";
import { useZebQuick } from "@/context/ZebQuickContext";
import { ZebQuickProductCard, type ZebQuickProductRecord } from "@/components/zeb-quick/ZebQuickProductCard";
import { ZEB_QUICK_CATEGORY_GROUPS, ZEB_QUICK_FREE_DELIVERY_MIN } from "@shared/constants/zebQuick";

export default function ZebQuickHomePage() {
  const { pincode, serviceability, setLocationModalOpen } = useZebQuick();
  const [selectedGroup, setSelectedGroup] = useState<string>("All");
  const [mainCategories, setMainCategories] = useState<string[]>([...ZEB_QUICK_CATEGORY_GROUPS]);
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<ZebQuickProductRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/zeb-quick/categories")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.mainCategories) && d.mainCategories.length > 0) {
          setMainCategories(d.mainCategories.map((m: any) => m.name));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams();
    params.set("pincode", pincode);
    if (selectedGroup !== "All") params.set("category_group", selectedGroup);
    if (search.trim()) params.set("q", search.trim());

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
  }, [pincode, selectedGroup, search]);

  return (
    <div className="mx-auto max-w-5xl px-3.5 py-4 space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search innerwear, track pants, socks, belts..."
          className="w-full rounded-2xl border border-orange-200 bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-neutral-900 shadow-xs focus:border-[#EE2B00] focus:outline-none"
        />
      </div>

      {/* Express Hero Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-[#FF5100] via-[#FF6A00] to-[#EE2B00] p-4 sm:p-5 text-white shadow-md">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider">
              <Zap className="h-3 w-3 fill-amber-300 text-amber-300" />
              5–6 Hour Delivery
            </div>
            <h1 className="mt-2 text-lg sm:text-xl font-black leading-tight">
              Daily Essentials & Innerwear at Express Speed
            </h1>
            <p className="mt-1 text-xs text-orange-100">
              Free delivery above ₹{ZEB_QUICK_FREE_DELIVERY_MIN} • Discreet sealed hygiene packaging
            </p>
          </div>
          <img
            src="/zeb-quick-icon.png"
            alt="ZebQuick"
            className="h-14 w-20 object-contain shrink-0 rounded-xl bg-white/95 p-1.5"
          />
        </div>
      </div>

      {/* Serviceability Warning if outside active delivery corridor */}
      {serviceability.checked && !serviceability.serviceable ? (
        <div className="rounded-3xl border border-orange-200 bg-gradient-to-b from-orange-50 to-white p-6 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-[#EE2B00]">
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
              className="inline-flex items-center gap-1.5 rounded-2xl bg-[#EE2B00] px-4 py-2.5 text-xs font-extrabold text-white cursor-pointer"
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
      ) : (
        <>
          {/* Category Group Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {["All", ...mainCategories].map((group) => {
              const active = selectedGroup === group;
              return (
                <button
                  key={group}
                  type="button"
                  onClick={() => setSelectedGroup(group)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-extrabold transition cursor-pointer ${
                    active
                      ? "bg-[#EE2B00] text-white shadow-xs"
                      : "border border-orange-200 bg-white text-neutral-700 hover:border-orange-400"
                  }`}
                >
                  {group}
                </button>
              );
            })}
          </div>

          {/* Hygiene & Discreet Trust Strip */}
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200/80 bg-emerald-50/70 px-3.5 py-2 text-[11px] font-bold text-emerald-900">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>100% Discreet Opaque Packaging • Local Verified Stores • Delivered within 5–6 Hours</span>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-60 animate-pulse rounded-2xl bg-orange-100/50" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-3xl border border-orange-200 bg-gradient-to-b from-orange-50/70 to-white p-8 text-center shadow-xs">
              <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#EE2B00]">
                <Zap className="h-3 w-3 fill-[#EE2B00]" />
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
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-[#EE2B00] px-4 py-2.5 text-xs font-extrabold text-white"
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
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {products.map((p) => (
                <ZebQuickProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
