"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Truck, ShieldCheck, BadgeCheck, ArrowRight, Crown, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

/**
 * 3-Column Android Service Trust Bar matching Luxury Cream & Gold UI:
 * Free Delivery (reads store_settings threshold), Easy Returns (5-Day Policy), Secure Shopping.
 */
export function AndroidHomeTrustBar() {
  const [freeThreshold, setFreeThreshold] = useState<number>(499);

  useEffect(() => {
    let active = true;
    const loadRules = async () => {
      try {
        const { data } = await supabase
          .from("store_settings")
          .select("key, value")
          .in("key", ["billing", "marketplace_rules"]);

        if (!active || !data) return;
        const map: Record<string, Record<string, unknown>> = {};
        data.forEach((row: { key: string; value: Record<string, unknown> }) => {
          map[row.key] = row.value;
        });
        const m = map.marketplace_rules || {};
        const b = map.billing || {};
        const raw = m.freeShippingThreshold ?? b.freeDeliveryThreshold;
        if (raw !== undefined && raw !== null && raw !== "" && !isNaN(Number(raw))) {
          setFreeThreshold(Number(raw));
        }
      } catch {
        // Keep safe default
      }
    };
    loadRules();
    return () => {
      active = false;
    };
  }, []);

  const deliverySub = freeThreshold > 0 ? `on ₹${freeThreshold}+` : "Pan-India Free";

  return (
    <div className="mx-auto w-full max-w-[1400px] px-3.5 mt-3">
      <div className="grid grid-cols-3 divide-x divide-[#EFE1BE] rounded-2xl bg-[#FFFDF8] border border-[#E5C983]/80 shadow-[0_6px_18px_rgba(166,124,28,0.08)] py-2.5 px-1">
        <div className="flex items-center justify-center gap-1.5 px-1.5 min-w-0">
          <Truck className="h-4 w-4 text-[#9A6503] shrink-0 stroke-[2.2]" />
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold text-[#14120F] leading-tight truncate">Free Delivery</p>
            <p className="text-[9px] font-semibold text-[#6B5D44] leading-tight truncate">{deliverySub}</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 px-1.5 min-w-0">
          <ShieldCheck className="h-4 w-4 text-[#B8800C] shrink-0 stroke-[2.2]" />
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold text-[#14120F] leading-tight truncate">Easy Returns</p>
            <p className="text-[9px] font-semibold text-[#6B5D44] leading-tight truncate">5-Day Policy</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 px-1.5 min-w-0">
          <BadgeCheck className="h-4 w-4 text-[#9A6503] shrink-0 stroke-[2.2]" />
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold text-[#14120F] leading-tight truncate">Secure Shopping</p>
            <p className="text-[9px] font-semibold text-[#6B5D44] leading-tight truncate">100% Safe</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Secondary Android Home Promo Banner ("NEW SEASON DROP") placed right below Curated Collections.
 */
export function AndroidNewSeasonDropBanner() {
  const [dropThumbs, setDropThumbs] = useState<string[]>([]);

  useEffect(() => {
    let active = true;
    const fetchDropThumbs = async () => {
      try {
        const { data } = await supabase
          .from("products")
          .select("image_url")
          .eq("is_active", true)
          .order("is_new_drop", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(2);

        if (!active || !data) return;
        const urls = (data as Array<{ image_url?: string | null }>)
          .map((item) => item.image_url)
          .filter((u: string | null | undefined): u is string => Boolean(u && u.trim().length > 0));
        setDropThumbs(urls);
      } catch {
        // Ignore and use crest fallback
      }
    };
    fetchDropThumbs();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="mt-6">
      <Link
        href="/new-drops"
        aria-label="Explore New Season Drop"
        className="group relative flex items-center justify-between gap-3 overflow-hidden rounded-2xl bg-gradient-to-br from-[#FFFDF7] via-[#FAF0D1] to-[#F4D98E]/80 border border-[#DFBE6F] p-4 shadow-[0_10px_26px_rgba(180,130,20,0.13)] active:scale-[0.99] transition-all"
      >
        {/* Subtle Champagne Silk Accent Wave */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full bg-gradient-to-br from-[#FDE047]/35 to-transparent blur-xl"
        />

        <div className="relative z-10 min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-black italic uppercase tracking-wider text-[#2B2419]">
              New Season
            </span>
            <Crown className="h-3.5 w-3.5 text-[#B8800C]" />
          </div>

          <p className="mt-0.5 text-3xl font-black italic tracking-tight leading-none bg-gradient-to-r from-[#D4A017] via-[#EAB308] to-[#9A6503] bg-clip-text text-transparent">
            DROP
          </p>

          <p className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-[#3F3626]">
            <span>Fresh Culture Arrivals</span>
            <Sparkles className="h-3 w-3 text-[#B8800C]" />
          </p>

          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#FBE28A] via-[#F2C34B] to-[#DDA216] border border-[#FFF3C4] px-3.5 py-1.5 text-[11px] font-black text-[#111111] shadow-[0_4px_12px_rgba(184,128,12,0.28)]">
            <span>Explore Now</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>

        {/* Right Showcase Preview Stack */}
        <div className="relative z-10 flex items-center -space-x-4 shrink-0 pr-1">
          {dropThumbs.length > 0 ? (
            dropThumbs.map((src, idx) => (
              <div
                key={`${src}-${idx}`}
                className={`h-24 w-18 sm:h-28 sm:w-20 rounded-xl overflow-hidden border-2 border-[#FFFDF8] bg-[#FFFDF8] shadow-[0_6px_16px_rgba(120,85,15,0.18)] ${
                  idx === 0 ? "-rotate-3" : "rotate-3 translate-y-1"
                }`}
              >
                <img src={src} alt="New Drop preview" className="h-full w-full object-cover" />
              </div>
            ))
          ) : (
            <div className="h-24 w-24 rounded-2xl border-2 border-[#DFBE6F] bg-[#FFFDF8] p-2 shadow-lg flex items-center justify-center">
              <img src="/official-logo-sm.png" alt="ZebAlpha Drop" className="h-full w-full object-cover rounded-xl" />
            </div>
          )}
        </div>
      </Link>
    </section>
  );
}
