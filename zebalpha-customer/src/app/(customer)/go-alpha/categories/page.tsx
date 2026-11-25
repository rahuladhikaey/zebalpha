"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GO_ALPHA_ALLOWED_SUBCATEGORIES, GO_ALPHA_CATEGORY_GROUPS } from "@shared/constants/goAlpha";
import { GoAlphaProductCard, type GoAlphaProductRecord } from "@/components/go-alpha/GoAlphaProductCard";
import { useGoAlpha } from "@/context/GoAlphaContext";
import { Zap } from "lucide-react";

export default function GoAlphaCategoriesPage() {
  const { pincode } = useGoAlpha();
  const [mainCategories, setMainCategories] = useState<Array<{ name: string }>>(
    GO_ALPHA_CATEGORY_GROUPS.map((name) => ({ name }))
  );
  const [subcategories, setSubcategories] = useState<Array<{ slug: string; name: string; category_group: string }>>(
    GO_ALPHA_ALLOWED_SUBCATEGORIES.map((s) => ({ slug: s.slug, name: s.name, category_group: s.categoryGroup }))
  );
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [products, setProducts] = useState<GoAlphaProductRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/go-alpha/categories")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.mainCategories) && d.mainCategories.length > 0) {
          setMainCategories(d.mainCategories);
        }
        if (Array.isArray(d.subcategories) && d.subcategories.length > 0) {
          setSubcategories(d.subcategories);
        }
      })
      .catch(() => {});
  }, []);

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
          <h1 className="text-lg font-black text-neutral-900">ZebQuick Express Categories</h1>
          <p className="text-xs text-neutral-500">All essentials delivered within 5–6 hours</p>
        </div>
        <Link href="/go-alpha" className="text-xs font-extrabold text-[#EE2B00]">
          View All
        </Link>
      </div>

      {mainCategories.map((group) => {
        const subs = subcategories.filter((s) => s.category_group === group.name);
        if (subs.length === 0) return null;
        return (
          <section key={group.name} className="space-y-2.5">
            <h2 className="text-sm font-black text-neutral-900 flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-[#EE2B00] fill-[#EE2B00]" />
              {group.name}
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
            Results for {subcategories.find((s) => s.slug === selectedSlug)?.name}
          </h3>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-56 animate-pulse rounded-2xl bg-orange-100/50" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <p className="rounded-2xl border border-orange-200 bg-white p-6 text-center text-xs font-semibold text-neutral-500">
              Products coming soon in this subcategory for pincode {pincode}.
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
