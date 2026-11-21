"use client";

import React from "react";
import Link from "next/link";
import { Gift, ArrowRight, CheckCircle2 } from "lucide-react";
import { useFirstOrderOffer } from "@/hooks/useFirstOrderOffer";
import { useCart } from "@/context/CartContext";
import { useIsNativeApp } from "@/lib/platform";

export function FirstOrderOfferBanner() {
  const { config, eligible, loading } = useFirstOrderOffer();
  const { cart } = useCart();
  const isNativeApp = useIsNativeApp();

  if (loading || !config.isActive || !eligible || config.discountAmount <= 0) {
    return null;
  }

  const hasCartItems = cart.length > 0;
  const targetHref = hasCartItems ? "/cart" : "/products";
  const ctaLabel = hasCartItems ? "Claim in Cart" : "Shop Now";

  return (
    <section
      aria-label="First Order Welcome Offer"
      className="mx-auto w-full max-w-[1400px] px-4 md:px-8 mt-4 mb-2"
    >
      <Link
        href={targetHref}
        className={`group relative flex flex-col sm:flex-row sm:items-center justify-between gap-3 overflow-hidden rounded-2xl border px-4 py-3.5 sm:px-6 sm:py-4 transition-all active:scale-[0.99] ${
          isNativeApp
            ? "border-[#D4A017]/65 bg-gradient-to-r from-[#FFF9E3] via-[#FFF2C2] to-[#FCE694]/90 shadow-[0_8px_24px_rgba(180,120,12,0.14)]"
            : "border-amber-400/35 bg-gradient-to-r from-[#17130A] via-[#12100B] to-[#1A1407] shadow-[0_10px_30px_rgba(245,185,34,0.12)] hover:border-amber-400/60"
        }`}
      >
        {/* Left: Emblem + Headline */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            data-photo-overlay="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#F5B922] via-[#EAB308] to-[#B45309] text-white shadow-md"
          >
            <Gift size={20} strokeWidth={2.4} />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                data-keep-dark={isNativeApp ? "true" : undefined}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border ${
                  isNativeApp
                    ? "bg-[#14120F] text-[#FCE89C] border-[#14120F]"
                    : "bg-amber-400/15 text-amber-300 border-amber-400/35"
                }`}
              >
                {config.badgeText}
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                  isNativeApp ? "text-[#047857]" : "text-emerald-400"
                }`}
              >
                <CheckCircle2 size={11} />
                Auto-Applied
              </span>
            </div>

            <h2
              className={`mt-1 text-sm sm:text-base font-black tracking-tight truncate ${
                isNativeApp ? "text-[#14120F]" : "text-white"
              }`}
            >
              {config.bannerTitle}
            </h2>

            <p
              className={`text-[11px] sm:text-xs font-semibold ${
                isNativeApp ? "text-[#5C4924]" : "text-zinc-400"
              }`}
            >
              {config.minOrderAmount > 0
                ? `Valid on orders ₹${config.minOrderAmount}+`
                : "Valid on all orders"}{" "}
              •{" "}
              {config.allowCod && config.allowOnline
                ? "COD & Online UPI/Card"
                : config.allowOnline
                ? "Online Payments"
                : "Cash on Delivery"}{" "}
              • Code{" "}
              <span
                className={`font-mono font-black ${
                  isNativeApp ? "text-[#8A5A00]" : "text-amber-300"
                }`}
              >
                {config.code}
              </span>
            </p>
          </div>
        </div>

        {/* Right: CTA Pill */}
        <div className="flex items-center justify-end shrink-0">
          <span
            data-keep-dark={isNativeApp ? "true" : undefined}
            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-wider transition-all ${
              isNativeApp
                ? "bg-[#14120F] text-[#FFF8DF] shadow-sm"
                : "bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 text-black group-hover:brightness-105"
            }`}
          >
            <span>{ctaLabel}</span>
            <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </Link>
    </section>
  );
}
