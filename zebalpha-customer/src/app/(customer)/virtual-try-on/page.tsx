"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Calendar,
  Clock,
  Shirt,
  ArrowRight,
  Layers,
} from "lucide-react";
import { useIsNativeApp } from "@/lib/platform";
import {
  hasFreshCachedProductDetail,
  startProductNavigation,
} from "@/lib/productDetailCache";

const LAUNCH_DATE_DISPLAY = "07/07/2027";
const LAUNCH_TIMESTAMP_MS = new Date("2027-07-07T00:00:00+05:30").getTime();

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function computeTimeRemaining(): TimeRemaining {
  const diff = Math.max(0, LAUNCH_TIMESTAMP_MS - Date.now());
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds };
}

function padTwo(value: number): string {
  return String(value).padStart(2, "0");
}

function VirtualTryOnComingSoonContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNativeApp = useIsNativeApp();
  const productIdParam = searchParams.get("productId");

  const [countdown, setCountdown] = useState<TimeRemaining | null>(null);

  useEffect(() => {
    setCountdown(computeTimeRemaining());
    const interval = window.setInterval(() => {
      setCountdown(computeTimeRemaining());
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const handleBack = useCallback(() => {
    if (productIdParam) {
      if (!hasFreshCachedProductDetail(productIdParam)) {
        startProductNavigation(productIdParam, {
          targetHref: `/products/${productIdParam}`,
          isOffline: typeof navigator !== "undefined" && navigator.onLine === false,
        });
      }
      router.push(`/products/${productIdParam}`);
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }, [productIdParam, router]);

  const countdownCells = [
    { label: "Days", value: countdown ? String(countdown.days) : "---" },
    { label: "Hours", value: countdown ? padTwo(countdown.hours) : "--" },
    { label: "Mins", value: countdown ? padTwo(countdown.minutes) : "--" },
    { label: "Secs", value: countdown ? padTwo(countdown.seconds) : "--" },
  ];

  return (
    <div
      className={`min-h-screen flex flex-col transition-colors ${
        isNativeApp
          ? "bg-gradient-to-b from-[#FFFFFF] via-[#FFFDF4] to-[#FCF3D2] text-[#14120F]"
          : "bg-[#070709] text-white"
      }`}
    >
      {/* Top Bar */}
      <header
        className={`sticky top-0 z-40 border-b backdrop-blur-xl px-4 py-3 md:px-8 ${
          isNativeApp
            ? "bg-[#FFFDF8]/92 border-[#E4C988]/55"
            : "bg-[#09090C]/90 border-zinc-800/80"
        }`}
      >
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all active:scale-95 cursor-pointer ${
              isNativeApp
                ? "border-[#D4A017]/50 bg-[#FFF8DF] text-[#14120F] hover:bg-[#FCEFC2]"
                : "border-zinc-800 bg-zinc-900/90 text-zinc-200 hover:border-zinc-600 hover:text-white"
            }`}
          >
            <ChevronLeft size={16} />
            <span>{productIdParam ? "Back to Product" : "Back"}</span>
          </button>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${
              isNativeApp
                ? "border-[#C68A12]/50 bg-[#FFF4CC] text-[#8A5A00]"
                : "border-amber-400/35 bg-amber-400/10 text-amber-300"
            }`}
          >
            <Clock size={11} />
            <span>Coming Soon</span>
          </span>
        </div>
      </header>

      {/* Main Centered Launch Card */}
      <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-10 sm:py-16">
        {/* Ambient Radial Halo */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute top-1/2 left-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[110px] ${
            isNativeApp
              ? "bg-[#F5C542]/28"
              : "bg-amber-400/12"
          }`}
        />

        <div
          className={`relative z-10 w-full max-w-lg rounded-[28px] border p-6 sm:p-9 text-center shadow-2xl ${
            isNativeApp
              ? "border-[#DFBE6F]/80 bg-[#FFFDF8]/96 shadow-[0_20px_50px_rgba(166,124,28,0.16)]"
              : "border-amber-400/25 bg-gradient-to-b from-[#131217] via-[#0E0D11] to-[#0A0A0D] shadow-[0_24px_70px_rgba(0,0,0,0.7)]"
          }`}
        >
          {/* Official Brand Emblem */}
          <div className="mx-auto mb-5 flex items-center justify-center">
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full p-[2.5px] bg-gradient-to-br from-[#FDE68A] via-[#D4A017] to-[#9A6503] shadow-[0_10px_28px_rgba(212,160,23,0.32)]">
              <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white p-2">
                <img
                  src="/official-logo-sm.png"
                  alt="ZEBALPHA"
                  className="h-full w-full object-contain"
                />
              </div>
              <span
                data-photo-overlay="true"
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#EAB308] to-[#9A6503] text-white ring-2 ring-white shadow-md"
              >
                <Shirt size={14} strokeWidth={2.4} />
              </span>
            </div>
          </div>

          {/* Kicker Badge */}
          <div
            className={`mb-3 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] ${
              isNativeApp
                ? "border-[#C68A12]/50 bg-[#FFF4CC] text-[#8A5A00]"
                : "border-amber-400/35 bg-amber-400/10 text-amber-300"
            }`}
          >
            <span>ZEBALPHA VIRTUAL TRY-ON</span>
          </div>

          {/* Heading */}
          <h1
            className={`text-2xl sm:text-4xl font-black tracking-tight ${
              isNativeApp ? "text-[#14120F]" : "text-white"
            }`}
          >
            Coming Soon
          </h1>

          <p
            className={`mx-auto mt-2.5 max-w-sm text-xs sm:text-sm font-medium leading-relaxed ${
              isNativeApp ? "text-[#4D4332]" : "text-zinc-400"
            }`}
          >
            Our next-gen Virtual Try-On experience is currently under active development for realistic fit, fabric drape, and instant styling.
          </p>

          {/* Official Launch Date Showcase */}
          <div
            className={`mt-6 rounded-2xl border px-5 py-5 ${
              isNativeApp
                ? "border-[#D4A017]/65 bg-gradient-to-br from-[#FFF9E3] via-[#FFF3C4] to-[#FCE89C]/75"
                : "border-amber-400/35 bg-gradient-to-br from-amber-500/12 via-zinc-900/90 to-zinc-950"
            }`}
          >
            <div
              className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.22em] ${
                isNativeApp ? "text-[#8A5A00]" : "text-amber-300"
              }`}
            >
              <Calendar size={12} />
              <span>Try-On Launch Date</span>
            </div>

            <div
              className={`mt-1.5 text-3xl sm:text-4xl font-black tracking-[0.12em] tabular-nums ${
                isNativeApp ? "text-[#14120F]" : "text-amber-200"
              }`}
            >
              {LAUNCH_DATE_DISPLAY}
            </div>
          </div>

          {/* Live Countdown Timer */}
          <div className="mt-5 grid grid-cols-4 gap-2 sm:gap-3">
            {countdownCells.map((cell) => (
              <div
                key={cell.label}
                className={`rounded-xl border px-2 py-3 ${
                  isNativeApp
                    ? "border-[#E4C988]/70 bg-[#FFFDF7]"
                    : "border-zinc-800 bg-zinc-900/80"
                }`}
              >
                <div
                  className={`text-lg sm:text-2xl font-black tabular-nums leading-none ${
                    isNativeApp ? "text-[#14120F]" : "text-white"
                  }`}
                >
                  {cell.value}
                </div>
                <div
                  className={`mt-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest ${
                    isNativeApp ? "text-[#7A6338]" : "text-zinc-400"
                  }`}
                >
                  {cell.label}
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="mt-7 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={handleBack}
              className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-xs font-black uppercase tracking-wider transition-all active:scale-[0.98] cursor-pointer shadow-md ${
                isNativeApp
                  ? "bg-gradient-to-b from-[#FCE89C] via-[#F5B922] to-[#D49014] text-[#111111] border border-[#C68A12]/60"
                  : "bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 text-black hover:brightness-105"
              }`}
            >
              <span>{productIdParam ? "Back to Product" : "Continue Shopping"}</span>
              <ArrowRight size={14} />
            </button>

            <Link
              href="/customize"
              className={`flex-1 inline-flex items-center justify-center gap-2 rounded-xl border px-5 py-3 text-xs font-black uppercase tracking-wider transition-all active:scale-[0.98] ${
                isNativeApp
                  ? "border-[#D4A017]/60 bg-[#FFF8DF] text-[#14120F] hover:bg-[#FCEFC2]"
                  : "border-zinc-700 bg-zinc-900 text-zinc-100 hover:border-amber-400/50 hover:text-white"
              }`}
            >
              <Layers size={14} />
              <span>Custom Studio</span>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function VirtualTryOnPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#070709] text-amber-300 text-xs font-bold uppercase tracking-widest">
          Loading...
        </div>
      }
    >
      <VirtualTryOnComingSoonContent />
    </Suspense>
  );
}
