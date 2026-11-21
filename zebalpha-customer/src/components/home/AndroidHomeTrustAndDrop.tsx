"use client";

import Link from "next/link";
import { useEffect, useState, useRef, useCallback } from "react";
import {
  Truck,
  ShieldCheck,
  BadgeCheck,
  ArrowRight,
  Crown,
  Gift,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useFirstOrderOffer } from "@/hooks/useFirstOrderOffer";
import { useCart } from "@/context/CartContext";
import { useOfficialTheme } from "@/lib/platform";

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

const AUTO_SLIDE_INTERVAL_MS = 4200;

/**
 * Auto-scrolling Promo Banner Carousel placed right below Curated Collections:
 * - Slide 1 (when eligible & active): New User 1st Order Flat ₹100 OFF Offer
 * - Slide 2: New Season Drop ("Fresh Culture Arrivals")
 * Supports smooth GPU transform transitions, touch swipe, hover pause, and indicator pills.
 */
export function AndroidNewSeasonDropBanner() {
  const isNativeApp = useOfficialTheme();
  const { config: firstOrderConfig, eligible: isFirstOrderEligible, loading: firstOrderLoading } =
    useFirstOrderOffer();
  const { cart } = useCart();

  const [dropThumbs, setDropThumbs] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const touchStartXRef = useRef<number | null>(null);
  const touchDeltaXRef = useRef<number>(0);
  const didSwipeRef = useRef<boolean>(false);

  const showFirstOrderSlide =
    !firstOrderLoading &&
    firstOrderConfig.isActive &&
    isFirstOrderEligible &&
    firstOrderConfig.discountAmount > 0;

  const slideKeys: Array<"first-order" | "new-drop"> = showFirstOrderSlide
    ? ["first-order", "new-drop"]
    : ["new-drop"];

  const totalSlides = slideKeys.length;
  const safeActiveIndex = activeIndex >= totalSlides ? 0 : activeIndex;

  // Keep index in bounds when eligibility resolves
  useEffect(() => {
    setActiveIndex(0);
  }, [showFirstOrderSlide]);

  // Fetch latest drop thumbnails for Slide 2
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

  // Auto-advance timer when multiple slides are active
  useEffect(() => {
    if (totalSlides <= 1 || isPaused) return;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % totalSlides);
    }, AUTO_SLIDE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [totalSlides, isPaused]);

  const goToSlide = useCallback(
    (idx: number) => {
      if (totalSlides <= 1) return;
      setActiveIndex(((idx % totalSlides) + totalSlides) % totalSlides);
    },
    [totalSlides]
  );

  const handleTouchStart = (e: React.TouchEvent) => {
    if (totalSlides <= 1) return;
    touchStartXRef.current = e.touches[0].clientX;
    touchDeltaXRef.current = 0;
    didSwipeRef.current = false;
    setIsPaused(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartXRef.current === null) return;
    touchDeltaXRef.current = e.touches[0].clientX - touchStartXRef.current;
    if (Math.abs(touchDeltaXRef.current) > 12) {
      didSwipeRef.current = true;
    }
  };

  const handleTouchEnd = () => {
    if (touchStartXRef.current !== null && totalSlides > 1) {
      if (touchDeltaXRef.current <= -36) {
        goToSlide(safeActiveIndex + 1);
      } else if (touchDeltaXRef.current >= 36) {
        goToSlide(safeActiveIndex - 1);
      }
    }
    touchStartXRef.current = null;
    touchDeltaXRef.current = 0;
    setIsPaused(false);
  };

  const handleSlideLinkClick = (e: React.MouseEvent) => {
    if (didSwipeRef.current) {
      e.preventDefault();
      didSwipeRef.current = false;
    }
  };

  const hasCartItems = cart.length > 0;
  const offerHref = hasCartItems ? "/cart" : "/products";
  const offerCtaLabel = hasCartItems ? "Claim in Cart" : "Shop Now";

  const paymentSummary =
    firstOrderConfig.allowCod && firstOrderConfig.allowOnline
      ? "COD & Online UPI/Card"
      : firstOrderConfig.allowOnline
      ? "Online UPI/Card"
      : "Cash on Delivery";

  return (
    <section
      className="mt-6"
      aria-label="Featured Offers & Drops"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Carousel Viewport */}
      <div className="relative overflow-hidden rounded-2xl">
        <div
          className="flex transition-transform duration-700 ease-out will-change-transform"
          style={{ transform: `translate3d(-${safeActiveIndex * 100}%, 0, 0)` }}
        >
          {/* SLIDE 1: NEW USER 1ST ORDER OFFER (Shown first when eligible) */}
          {showFirstOrderSlide && (
            <div className="w-full shrink-0">
              <Link
                href={offerHref}
                onClick={handleSlideLinkClick}
                aria-label={firstOrderConfig.bannerTitle}
                className={`group relative flex min-h-[152px] sm:min-h-[164px] items-center justify-between gap-3 overflow-hidden rounded-2xl border p-4 sm:px-6 sm:py-5 active:scale-[0.99] transition-all ${
                  isNativeApp
                    ? "bg-gradient-to-br from-[#FFFDF7] via-[#FFF3C4] to-[#F7D774]/85 border-[#DFBE6F] shadow-[0_10px_26px_rgba(180,130,20,0.14)]"
                    : "bg-gradient-to-br from-[#191409] via-[#12100B] to-[#1D1608] border-amber-400/35 shadow-[0_12px_32px_rgba(245,185,34,0.12)] hover:border-amber-400/60"
                }`}
              >
                {/* Ambient radial glow */}
                <div
                  aria-hidden="true"
                  className={`pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full blur-xl ${
                    isNativeApp
                      ? "bg-gradient-to-br from-[#FDE047]/45 to-transparent"
                      : "bg-gradient-to-br from-amber-400/20 to-transparent"
                  }`}
                />

                <div className="relative z-10 flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  <div
                    data-photo-overlay="true"
                    className="flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F5B922] via-[#EAB308] to-[#B45309] text-white shadow-[0_6px_16px_rgba(180,120,12,0.32)]"
                  >
                    <Gift className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2.3} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        data-keep-dark={isNativeApp ? "true" : undefined}
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider border ${
                          isNativeApp
                            ? "bg-[#14120F] text-[#FCE89C] border-[#14120F]"
                            : "bg-amber-400/15 text-amber-300 border-amber-400/35"
                        }`}
                      >
                        {firstOrderConfig.badgeText}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-extrabold ${
                          isNativeApp ? "text-[#047857]" : "text-emerald-400"
                        }`}
                      >
                        <CheckCircle2 size={11} />
                        Auto-Applied
                      </span>
                    </div>

                    <p
                      className={`mt-1 text-base sm:text-xl font-black tracking-tight leading-snug ${
                        isNativeApp ? "text-[#14120F]" : "text-white"
                      }`}
                    >
                      {firstOrderConfig.bannerTitle}
                    </p>

                    <p
                      className={`mt-0.5 text-[11px] sm:text-xs font-semibold leading-snug ${
                        isNativeApp ? "text-[#5C4924]" : "text-zinc-400"
                      }`}
                    >
                      {firstOrderConfig.minOrderAmount > 0
                        ? `Orders ₹${firstOrderConfig.minOrderAmount}+`
                        : "All orders"}{" "}
                      • {paymentSummary} • Code{" "}
                      <span
                        className={`font-mono font-black ${
                          isNativeApp ? "text-[#8A5A00]" : "text-amber-300"
                        }`}
                      >
                        {firstOrderConfig.code}
                      </span>
                    </p>

                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <span
                        data-keep-dark={isNativeApp ? "true" : undefined}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider shadow-sm transition-all ${
                          isNativeApp
                            ? "bg-[#14120F] text-[#FFF8DF]"
                            : "bg-gradient-to-r from-[#FBE28A] via-[#F2C34B] to-[#DDA216] text-[#111111]"
                        }`}
                      >
                        <span>{offerCtaLabel}</span>
                        <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* SLIDE 2: NEW SEASON DROP */}
          <div className="w-full shrink-0">
            <Link
              href="/new-drops"
              onClick={handleSlideLinkClick}
              aria-label="Explore New Season Drop"
              className={`group relative flex min-h-[152px] sm:min-h-[164px] items-center justify-between gap-3 overflow-hidden rounded-2xl border p-4 sm:px-6 sm:py-5 active:scale-[0.99] transition-all ${
                isNativeApp
                  ? "bg-gradient-to-br from-[#FFFDF7] via-[#FAF0D1] to-[#F4D98E]/80 border-[#DFBE6F] shadow-[0_10px_26px_rgba(180,130,20,0.13)]"
                  : "bg-gradient-to-br from-[#141318] via-[#0F0E12] to-[#1A150A] border-amber-400/30 shadow-[0_12px_32px_rgba(0,0,0,0.5)] hover:border-amber-400/55"
              }`}
            >
              {/* Subtle Champagne Silk Accent Wave */}
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute -right-10 -top-12 h-44 w-44 rounded-full blur-xl ${
                  isNativeApp
                    ? "bg-gradient-to-br from-[#FDE047]/35 to-transparent"
                    : "bg-gradient-to-br from-amber-400/15 to-transparent"
                }`}
              />

              <div className="relative z-10 min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[11px] font-black italic uppercase tracking-wider ${
                      isNativeApp ? "text-[#2B2419]" : "text-zinc-200"
                    }`}
                  >
                    New Season
                  </span>
                  <Crown className={`h-3.5 w-3.5 ${isNativeApp ? "text-[#B8800C]" : "text-amber-400"}`} />
                </div>

                <p className="mt-0.5 text-3xl sm:text-4xl font-black italic tracking-tight leading-none bg-gradient-to-r from-[#D4A017] via-[#EAB308] to-[#9A6503] bg-clip-text text-transparent">
                  DROP
                </p>

                <p
                  className={`mt-1.5 flex items-center gap-1 text-[11px] sm:text-xs font-bold ${
                    isNativeApp ? "text-[#3F3626]" : "text-zinc-400"
                  }`}
                >
                  <span>Fresh Culture Arrivals</span>
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
                      className={`h-24 w-18 sm:h-28 sm:w-20 rounded-xl overflow-hidden border-2 shadow-[0_6px_16px_rgba(120,85,15,0.18)] ${
                        isNativeApp
                          ? "border-[#FFFDF8] bg-[#FFFDF8]"
                          : "border-zinc-800 bg-zinc-900"
                      } ${idx === 0 ? "-rotate-3" : "rotate-3 translate-y-1"}`}
                    >
                      <img src={src} alt="New Drop preview" className="h-full w-full object-cover" />
                    </div>
                  ))
                ) : (
                  <div
                    className={`h-24 w-24 rounded-2xl border-2 p-2 shadow-lg flex items-center justify-center ${
                      isNativeApp
                        ? "border-[#DFBE6F] bg-[#FFFDF8]"
                        : "border-amber-400/40 bg-zinc-900"
                    }`}
                  >
                    <img
                      src="/official-logo-sm.png"
                      alt="ZebAlpha Drop"
                      className="h-full w-full object-cover rounded-xl"
                    />
                  </div>
                )}
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Animated Slide Indicator Pills */}
      {totalSlides > 1 && (
        <div
          className="mt-2.5 flex items-center justify-center gap-1.5"
          role="tablist"
          aria-label="Promo Banner Slides"
        >
          {slideKeys.map((key, idx) => {
            const isActive = idx === safeActiveIndex;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-label={key === "first-order" ? "1st Order Offer Slide" : "New Season Drop Slide"}
                onClick={() => goToSlide(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                  isActive
                    ? isNativeApp
                      ? "w-6 bg-gradient-to-r from-[#D4A017] to-[#9A6503]"
                      : "w-6 bg-gradient-to-r from-amber-300 to-amber-500"
                    : isNativeApp
                    ? "w-1.5 bg-[#DFBE6F]/70 hover:bg-[#C68A12]"
                    : "w-1.5 bg-zinc-700 hover:bg-zinc-500"
                }`}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
