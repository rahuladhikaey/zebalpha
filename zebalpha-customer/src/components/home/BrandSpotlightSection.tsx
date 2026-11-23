"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Store } from "lucide-react";
import { recordBrandingClickLocal } from "@/components/marketing/InfluencerRefTracker";

interface SpotlightProduct {
  id: string;
  name: string;
  price: number;
  mrp?: number;
  image_url: string;
}

interface SpotlightCampaign {
  id: string;
  store_name: string;
  headline: string;
  tagline?: string | null;
  offer_badge?: string | null;
  active_store_slug?: string | null;
  banner_image_url?: string | null;
  cta_url?: string | null;
  products: SpotlightProduct[];
}

export function BrandSpotlightSection() {
  const [spotlights, setSpotlights] = useState<SpotlightCampaign[]>([]);

  useEffect(() => {
    let active = true;
    fetch("/api/marketing/active")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!active || !json?.success || !Array.isArray(json.spotlights)) return;
        const list = json.spotlights as SpotlightCampaign[];
        setSpotlights(list);

        // Log 1 impression per session per campaign
        for (const sp of list) {
          const impKey = `zeb_brand_imp_${sp.id}`;
          if (!sessionStorage.getItem(impKey)) {
            sessionStorage.setItem(impKey, "1");
            fetch("/api/marketing/track", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                eventType: "branding_impression",
                campaignId: sp.id,
                sessionId: impKey,
              }),
              keepalive: true,
            }).catch(() => {});
          }
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, []);

  if (spotlights.length === 0) return null;

  const handleProductClick = (campaignId: string, productId: string) => {
    recordBrandingClickLocal(campaignId);
    fetch("/api/marketing/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "branding_click",
        campaignId,
        productId,
      }),
      keepalive: true,
    }).catch(() => {});
  };

  return (
    <section className="my-10 space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <span className="text-[11px] font-black uppercase tracking-[0.22em] text-[#9A6503]">
            Spotlight • Emerging Indian Brands
          </span>
          <h2 className="mt-1 text-xl sm:text-2xl font-black tracking-tight text-[#14120F]">
            Featured Brand Showcase
          </h2>
        </div>
        <span className="rounded-full border border-[#DFBE6F] bg-[#FFF8DB] px-3 py-1 text-[10px] font-black uppercase tracking-wider text-[#9A6503]">
          Sponsored
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {spotlights.slice(0, 2).map((camp) => (
          <div
            key={camp.id}
            className="overflow-hidden rounded-[1.75rem] border border-[#EAD296] bg-gradient-to-br from-[#FFFDF8] via-white to-[#FFF8EB] p-5 sm:p-6 shadow-[0_12px_32px_rgba(166,124,28,0.1)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {camp.active_store_slug ? (
                    <Link
                      href={`/store/${camp.active_store_slug}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF4F2] border border-[#F03A46]/30 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#F03A46] hover:bg-[#F03A46] hover:text-white transition-colors"
                    >
                      <Store size={11} />
                      <span>{camp.store_name}</span>
                      <ArrowRight size={10} />
                    </Link>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF4F2] border border-[#F03A46]/25 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#F03A46]">
                      <Store size={11} />
                      <span>{camp.store_name}</span>
                    </div>
                  )}
                  {camp.offer_badge && (
                    <span className="inline-flex rounded-full bg-[#FFF8DB] border border-[#DFBE6F] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-[#9A6503]">
                      {camp.offer_badge}
                    </span>
                  )}
                </div>
                <h3 className="mt-2 text-lg font-black text-[#14120F] leading-snug">
                  {camp.headline}
                </h3>
                {camp.tagline && (
                  <p className="mt-0.5 text-xs font-medium text-[#5C4E35]">{camp.tagline}</p>
                )}
              </div>

              {camp.products[0] && (
                <Link
                  href={
                    camp.active_store_slug
                      ? `/store/${camp.active_store_slug}`
                      : `/products/${camp.products[0].id}?brand_campaign=${camp.id}`
                  }
                  onClick={() => handleProductClick(camp.id, camp.products[0].id)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#14120F] px-3.5 py-2 text-[11px] font-black text-white hover:bg-[#F03A46] transition-colors"
                >
                  <span>{camp.active_store_slug ? "Visit Store" : "Shop"}</span>
                  <ArrowRight size={12} />
                </Link>
              )}
            </div>

            <div className="mt-4 grid grid-cols-3 sm:grid-cols-4 gap-3">
              {camp.products.map((prod) => (
                <Link
                  key={prod.id}
                  href={`/products/${prod.id}?brand_campaign=${camp.id}`}
                  onClick={() => handleProductClick(camp.id, prod.id)}
                  className="group rounded-2xl border border-[#F0E2BE] bg-white p-2 hover:border-[#F03A46]/50 transition-all"
                >
                  <div className="aspect-[4/5] overflow-hidden rounded-xl bg-[#FFF9EB]">
                    {prod.image_url ? (
                      <img
                        src={prod.image_url}
                        alt={prod.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : null}
                  </div>
                  <p className="mt-2 text-[11px] font-bold text-[#14120F] line-clamp-1">
                    {prod.name}
                  </p>
                  <p className="text-xs font-black text-[#14120F]">
                    ₹{prod.price.toLocaleString("en-IN")}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
