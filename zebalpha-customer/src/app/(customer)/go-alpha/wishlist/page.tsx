"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useGoAlpha } from "@/context/GoAlphaContext";
import { GoAlphaProductCard, type GoAlphaProductRecord } from "@/components/go-alpha/GoAlphaProductCard";

export default function GoAlphaWishlistPage() {
  const { wishlistIds } = useGoAlpha();
  const [products, setProducts] = useState<GoAlphaProductRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (wishlistIds.length === 0) {
      setProducts([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    fetch(`/api/go-alpha/products?ids=${encodeURIComponent(wishlistIds.join(","))}`)
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
  }, [wishlistIds]);

  return (
    <div className="mx-auto max-w-5xl px-3.5 py-4 space-y-4">
      <h1 className="text-lg font-black text-neutral-900">ZebQuick Wishlist ({wishlistIds.length})</h1>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl bg-orange-100/50" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-3xl border border-orange-200/70 bg-white p-10 text-center">
          <Heart className="mx-auto h-10 w-10 text-orange-300" />
          <p className="mt-3 text-sm font-black text-neutral-900">Your ZebQuick Wishlist is empty</p>
          <p className="mt-1 text-xs text-neutral-500">
            Items saved here stay completely separate from ZebAlpha.
          </p>
          <Link
            href="/go-alpha"
            className="mt-4 inline-flex rounded-2xl bg-[#EE2B00] px-5 py-2.5 text-xs font-extrabold text-white"
          >
            Explore ZebQuick
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {products.map((p) => (
            <GoAlphaProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
