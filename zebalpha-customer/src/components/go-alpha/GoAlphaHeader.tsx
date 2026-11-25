"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MapPin, ShoppingCart, ArrowLeft, Menu, Zap, Navigation, ChevronDown, X } from "lucide-react";
import { useGoAlpha } from "@/context/GoAlphaContext";
import { GoAlphaDrawer } from "@/components/go-alpha/GoAlphaDrawer";

const QUICK_PINCODES = [
  { label: "Sealdah", pin: "700014" },
  { label: "Dum Dum", pin: "700028" },
  { label: "Barrackpore", pin: "700120" },
  { label: "Kalyani", pin: "741235" },
  { label: "Ranaghat", pin: "741201" },
  { label: "Krishnanagar", pin: "741101" },
];

export function GoAlphaHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { pincode, serviceability, setPincode, detectGpsPincode, cartCount, locationModalOpen, setLocationModalOpen } =
    useGoAlpha();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pinInput, setPinInput] = useState(pincode);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);

  const isGoHome = pathname === "/go-alpha";

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/go-alpha");
    }
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = pinInput.replace(/\D/g, "").slice(0, 6);
    if (clean.length !== 6) {
      setGpsStatus("Please enter a valid 6-digit pincode");
      return;
    }
    await setPincode(clean);
    setLocationModalOpen(false);
  };

  const handleGps = async () => {
    setDetecting(true);
    setGpsStatus(null);
    const res = await detectGpsPincode();
    setDetecting(false);
    if (res.ok && res.pincode) {
      setPinInput(res.pincode);
      setLocationModalOpen(false);
    } else {
      setGpsStatus(res.error || "Unable to detect location");
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-gradient-to-r from-[#FF5100] via-[#FF6A00] to-[#EE2B00] text-white shadow-md pt-[max(env(safe-area-inset-top),0.5rem)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2.5 px-3.5 py-2.5">
          {/* Left: 3-bar Menu on ZebQuick Home, Back Arrow on all sub-pages */}
          <div className="flex items-center gap-2.5 min-w-0">
            {isGoHome ? (
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                aria-label="Open ZebQuick Menu"
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur-xs transition hover:bg-white/25 active:scale-95 shrink-0 cursor-pointer"
              >
                <Menu className="h-5 w-5 stroke-[2.3]" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleBack}
                aria-label="Go Back"
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15 text-white backdrop-blur-xs transition hover:bg-white/25 active:scale-95 shrink-0 cursor-pointer"
              >
                <ArrowLeft className="h-5 w-5 stroke-[2.3]" />
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setPinInput(pincode);
                setGpsStatus(null);
                setLocationModalOpen(true);
              }}
              className="flex flex-col text-left min-w-0 group cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-0.5 rounded-md bg-white px-1.5 py-0.5 text-[10px] font-black tracking-tight text-[#EE2B00]">
                  <Zap className="h-2.5 w-2.5 fill-[#EE2B00]" />
                  ZebQuick
                </span>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-100">
                  5–6 Hr Express
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-xs font-bold text-white truncate">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-200" />
                <span className="truncate">
                  {serviceability.loading
                    ? "Detecting location..."
                    : serviceability.serviceable
                      ? `${serviceability.areaName} (${pincode})`
                      : `Pincode ${pincode} • Coming Soon`}
                </span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-80" />
              </div>
            </button>
          </div>

          {/* Right: ZebQuick Cart */}
          <Link
            href="/go-alpha/cart"
            aria-label={`ZebQuick Cart (${cartCount})`}
            className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-[#EE2B00] shadow-sm transition active:scale-95 shrink-0"
          >
            <ShoppingCart className="h-5 w-5 stroke-[2.2]" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-neutral-950 px-1 text-[10px] font-black text-white ring-2 ring-white">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* 3-Bar Mobile Drawer */}
      <GoAlphaDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Blinkit-style GPS + Pincode Bottom Sheet */}
      {locationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-neutral-900">Select Delivery Location</h2>
                <p className="text-xs text-neutral-500">
                  Use live GPS or enter pincode for 5–6 Hr delivery check
                </p>
              </div>
              <button
                type="button"
                onClick={() => setLocationModalOpen(false)}
                className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleGps}
              disabled={detecting}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-extrabold text-[#EE2B00] transition hover:bg-orange-100 disabled:opacity-60 cursor-pointer"
            >
              <Navigation className="h-4 w-4" />
              {detecting ? "Detecting Real GPS Location..." : "Use Current GPS Location"}
            </button>

            <form onSubmit={handleApply} className="mt-4 space-y-2.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                Or Enter 6-Digit Pincode
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="e.g. 741101 or 700014"
                  className="flex-1 rounded-2xl border border-neutral-300 px-3.5 py-2.5 text-sm font-bold text-neutral-900 focus:border-[#EE2B00] focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-2xl bg-[#EE2B00] px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#d62600] active:scale-95 cursor-pointer"
                >
                  Check
                </button>
              </div>
              {gpsStatus && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-red-600">{gpsStatus}</p>
                  {typeof window !== "undefined" && (window as any).ZebAlphaNative?.openAppInfoSettings && (
                    <button
                      type="button"
                      onClick={() => (window as any).ZebAlphaNative.openAppInfoSettings()}
                      className="text-xs font-extrabold text-[#EE2B00] underline cursor-pointer"
                    >
                      Open App Settings to Allow Location →
                    </button>
                  )}
                </div>
              )}
            </form>

            {/* Quick Corridor Pincodes */}
            <div className="mt-4 pt-3 border-t border-neutral-100">
              <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
                Active Corridor (Sealdah – Krishnanagar)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PINCODES.map((qp) => (
                  <button
                    key={qp.pin}
                    type="button"
                    onClick={async () => {
                      setPinInput(qp.pin);
                      await setPincode(qp.pin);
                      setLocationModalOpen(false);
                    }}
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold border transition cursor-pointer ${
                      pincode === qp.pin
                        ? "border-[#EE2B00] bg-orange-50 text-[#EE2B00]"
                        : "border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-orange-300"
                    }`}
                  >
                    {qp.label} ({qp.pin})
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
