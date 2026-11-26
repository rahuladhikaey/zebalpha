"use client";

import { useEffect, useMemo, useState } from "react";
import { useZebQuick } from "@/context/ZebQuickContext";

const FALLBACK_TILES = [
  "/zeb-quick-icon.png",
  "/official-logo-sm.png",
];

export function ZebQuickEntrySplash() {
  const { pincode, subcategories } = useZebQuick();
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [productImages, setProductImages] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    fetch(`/api/zeb-quick/products?pincode=${encodeURIComponent(pincode)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data.products) ? data.products : [];
        const imgs = list
          .map((p: any) => p.image_url || (Array.isArray(p.images) ? p.images[0] : ""))
          .filter((u: any): u is string => typeof u === "string" && u.trim().length > 0);
        if (imgs.length > 0) setProductImages(imgs);
      })
      .catch(() => {});

    const fadeTimer = window.setTimeout(() => setFading(true), 1500);
    const hideTimer = window.setTimeout(() => setVisible(false), 1850);
    return () => {
      active = false;
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, [pincode]);

  const tilePool = useMemo(() => {
    const subImgs = subcategories
      .map((s) => s.image_url)
      .filter((u): u is string => typeof u === "string" && u.trim().length > 0);
    const merged = Array.from(new Set([...productImages, ...subImgs]));
    const base = merged.length > 0 ? merged : FALLBACK_TILES;
    const repeated: string[] = [];
    while (repeated.length < 18) {
      repeated.push(...base);
    }
    return repeated.slice(0, 18);
  }, [productImages, subcategories]);

  if (!visible) return null;

  const row1 = [...tilePool.slice(0, 6), ...tilePool.slice(0, 6)];
  const row2 = [...tilePool.slice(6, 12), ...tilePool.slice(6, 12)];
  const row3 = [...tilePool.slice(12, 18), ...tilePool.slice(12, 18)];

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col justify-between overflow-hidden bg-white transition-opacity duration-350 ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <style>{`
        @keyframes zebquickMarquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .zebquick-row-1 { animation: zebquickMarquee 16s linear infinite; }
        .zebquick-row-2 { animation: zebquickMarquee 20s linear infinite; }
        .zebquick-row-3 { animation: zebquickMarquee 14s linear infinite; }
      `}</style>

      {/* Top 3-Row Staggered Product Marquee */}
      <div className="relative pt-10 space-y-3 select-none">
        {[
          { items: row1, cls: "zebquick-row-1" },
          { items: row2, cls: "zebquick-row-2 -ml-10" },
          { items: row3, cls: "zebquick-row-3 -ml-4" },
        ].map((row, rIdx) => (
          <div key={rIdx} className="overflow-hidden">
            <div className={`flex w-max gap-3 ${row.cls}`}>
              {row.items.map((src, idx) => (
                <div
                  key={`${rIdx}-${idx}`}
                  className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-neutral-100 bg-[#F4F8FB] p-2 shadow-[0_2px_10px_rgba(0,0,0,0.03)] flex items-center justify-center"
                >
                  <img
                    src={src}
                    alt="ZebQuick product"
                    className="h-full w-full object-contain rounded-xl"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Soft White Bottom Fade */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-b from-transparent via-white/85 to-white" />
      </div>

      {/* Bottom ZebQuick Brand Splash (Shared Account - No Login Needed) */}
      <div className="relative z-10 flex flex-col items-center px-6 pb-14 pt-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F8CB46] p-2 shadow-md">
          <img
            src="/zeb-quick-icon.png"
            alt="ZebQuick"
            className="h-full w-full object-contain"
          />
        </div>
        <h1 className="mt-4 text-2xl font-black tracking-tight text-neutral-950">
          ZebQuick
        </h1>
        <p className="mt-1 text-sm font-bold text-neutral-600">
          5–6 Hour Express Essentials
        </p>

        {/* Smooth 1.5s Progress Bar */}
        <div className="mt-5 h-1.5 w-40 overflow-hidden rounded-full bg-neutral-200">
          <div className="h-full w-full origin-left animate-[pulse_1s_ease-in-out_infinite] rounded-full bg-gradient-to-r from-[#F8CB46] via-orange-500 to-emerald-600" />
        </div>
      </div>
    </div>
  );
}
