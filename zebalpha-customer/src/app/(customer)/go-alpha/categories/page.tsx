"use client";

import Link from "next/link";
import { useState } from "react";
import { GO_ALPHA_ALLOWED_SUBCATEGORIES, GO_ALPHA_CATEGORY_GROUPS } from "@shared/constants/goAlpha";
import { GoAlphaProductCard, type GoAlphaProductRecord } from "@/components/go-alpha/GoAlphaProductCard";
import { useGoAlpha } from "@/context/GoAlphaContext";
import { Zap } from "lucide-react";

export default function GoAlphaCategoriesPage() {
  const { pincode } = useGoAlpha();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [products, setProducts] = useState<GoAlphaProductRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const loadSubcategory = async (slug: string) => {
    setSelectedSlug(slug);
    setLoading(true);
    try {
      const res = await fetch(`/api/go-alpha/products?pincode=${pincode}&subcategory=${encodeURIComponent(slug)}`);
      const data = await res.json();
      setProducts(Array.isArray(data.products) ? data.products : []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-3.5 py-4 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-neutral-900">GOα Express Categories</h1>
          <p className="text-xs text-neutral-500">All essentials delivered within 5–6 hours</p>
        </div>
        <Link href="/go-alpha" className="text-xs font-extrabold text-[#EE2B00]">
          View All
        </Link>
      </div>

      {GO_ALPHA_CATEGORY_GROUPS.map((group) => {
        const subs = GO_ALPHA_ALLOWED_SUBCATEGORIES.filter((s) => s.categoryGroup === group);
        return (
          <section key={group} className="space-y-2.5">
            <h2 className="text-sm font-black text-neutral-900 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-[#EE2B00] fill-[#EE2B00]" />
              {group}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {subs.map((sub) => {
                const active = selectedSlug === sub.slug;
                return (
                  <button
                    key={sub.slug}
                    type="button"
                    onClick={() => loadSubcategory(sub.slug)}
                    className={`rounded-2xl border px-3 py-2.5 text-left text-xs font-bold transition cursor-pointer ${
                      active
                        ? "border-[#EE2B00] bg-[#EE2B00] text-white shadow-xs"
                        : "border-orange-200/80 bg-white text-neutral-800 hover:border-orange-400"
                    }`}
                  >
                    {sub.name}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}

      {selectedSlug && (
        <div className="pt-2 space-y-3">
          <h3 className="text-sm font-black text-neutral-900">
            Results for {GO_ALPHA_ALLOWED_SUBCATEGORIES.find((s) => s.slug === selectedSlug)?.name}
          </h3>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-56 animate-pulse rounded-2xl bg-orange-100/50" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <p className="rounded-2xl border border-orange-200 bg-white p-6 text-center text-xs font-semibold text-neutral-500">
              No active products in this subcategory for pincode {pincode} yet.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {products.map((p) => (
                <GoAlphaProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
