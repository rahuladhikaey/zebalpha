"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, ShoppingCart, ArrowLeft, Zap, Navigation, ChevronDown, X } from "lucide-react";
import { useGoAlpha } from "@/context/GoAlphaContext";

export function GoAlphaHeader() {
  const { pincode, serviceability, setPincode, detectGpsPincode, cartCount } = useGoAlpha();
  const [modalOpen, setModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState(pincode);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = pinInput.replace(/\D/g, "").slice(0, 6);
    if (clean.length !== 6) {
      setGpsStatus("Please enter a valid 6-digit pincode");
      return;
    }
    await setPincode(clean);
    setModalOpen(false);
  };

  const handleGps = async () => {
    setDetecting(true);
    setGpsStatus(null);
    const res = await detectGpsPincode();
    setDetecting(false);
    if (res.ok && res.pincode) {
      setPinInput(res.pincode);
      setModalOpen(false);
    } else {
      setGpsStatus(res.error || "Unable to detect location");
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full bg-gradient-to-r from-[#FF5100] via-[#FF6A00] to-[#EE2B00] text-white shadow-md pt-[max(env(safe-area-inset-top),0.5rem)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-3.5 py-2.5">
          {/* Left: Switch back to ZebAlpha + GOα Branding + Pincode */}
          <div className="flex items-center gap-2 min-w-0">
            <Link
              href="/"
              title="Back to ZebAlpha"
              className="flex h-9 items-center gap-1 rounded-xl bg-white/15 px-2.5 text-xs font-bold text-white backdrop-blur-sm transition hover:bg-white/25 active:scale-95 shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">ZebAlpha</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                setPinInput(pincode);
                setGpsStatus(null);
                setModalOpen(true);
              }}
              className="flex flex-col text-left min-w-0 group cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-0.5 rounded-md bg-white px-1.5 py-0.5 text-[10px] font-black tracking-tight text-[#EE2B00]">
                  <Zap className="h-2.5 w-2.5 fill-[#EE2B00]" />
                  GOα
                </span>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-100">
                  5–6 Hr Express
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-1 text-xs font-bold text-white truncate">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-200" />
                <span className="truncate">
                  {serviceability.serviceable
                    ? `${serviceability.areaName} (${pincode})`
                    : `Pincode ${pincode} • Not Serviceable`}
                </span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-80" />
              </div>
            </button>
          </div>

          {/* Right: GOα Cart */}
          <Link
            href="/go-alpha/cart"
            aria-label={`GOα Cart (${cartCount})`}
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

      {/* Pincode / Live Location Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-neutral-900">Select GOα Delivery Location</h2>
                <p className="text-xs text-neutral-500">
                  Currently live on Sealdah → Krishnanagar corridor (5–6 Hr Delivery)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleGps}
              disabled={detecting}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-700 transition hover:bg-orange-100 disabled:opacity-60 cursor-pointer"
            >
              <Navigation className="h-4 w-4" />
              {detecting ? "Detecting GPS Pincode..." : "Use Current Live Location"}
            </button>

            <form onSubmit={handleApply} className="mt-4 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
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
                  className="flex-1 rounded-2xl border border-neutral-300 px-3.5 py-2.5 text-sm font-bold text-neutral-900 focus:border-orange-500 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-2xl bg-[#EE2B00] px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-[#d62600] active:scale-95 cursor-pointer"
                >
                  Apply
                </button>
              </div>
              {gpsStatus && <p className="text-xs font-semibold text-red-600">{gpsStatus}</p>}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
