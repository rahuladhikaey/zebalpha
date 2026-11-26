"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  User,
  ArrowLeft,
  Menu,
  Search,
  Navigation,
  ChevronDown,
  X,
  ShoppingBag,
  Sparkles,
  Shirt,
  Watch,
  HeartHandshake,
  Package,
} from "lucide-react";
import { useZebQuick } from "@/context/ZebQuickContext";
import { ZebQuickDrawer } from "@/components/zeb-quick/ZebQuickDrawer";

const QUICK_PINCODES = [
  { label: "Sealdah", pin: "700014" },
  { label: "Dum Dum", pin: "700028" },
  { label: "Barrackpore", pin: "700120" },
  { label: "Kalyani", pin: "741235" },
  { label: "Ranaghat", pin: "741201" },
  { label: "Krishnanagar", pin: "741101" },
];

function getMainCategoryIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("women")) return Sparkles;
  if (n.includes("innerwear")) return HeartHandshake;
  if (n.includes("dailywear") || n.includes("men")) return Shirt;
  if (n.includes("accessor")) return Watch;
  return Package;
}

export function ZebQuickHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    pincode,
    serviceability,
    setPincode,
    detectGpsPincode,
    locationModalOpen,
    setLocationModalOpen,
    searchQuery,
    setSearchQuery,
    selectedMainCategory,
    setSelectedMainCategory,
    mainCategories,
  } = useZebQuick();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pinInput, setPinInput] = useState(pincode);
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);

  const isGoHome = pathname === "/zeb-quick";
  const isCategoriesPage = pathname === "/zeb-quick/categories";
  const activeMainObj = mainCategories.find((m) => m.name === selectedMainCategory);
  const headerThemeColor =
    isGoHome && selectedMainCategory !== "All" && activeMainObj?.theme_color
      ? activeMainObj.theme_color
      : "#F8CB46";
  const isDarkTheme = headerThemeColor.toLowerCase() === "#1e293b";

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/zeb-quick");
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
      <header
        className={`sticky top-0 z-40 w-full shadow-[0_2px_12px_rgba(0,0,0,0.06)] pt-[max(env(safe-area-inset-top),0.5rem)] transition-colors duration-300 ${
          isDarkTheme ? "text-white" : "text-neutral-950"
        }`}
        style={{
          background: `linear-gradient(to bottom, ${headerThemeColor}, ${headerThemeColor}d9 55%, #FFFDF5)`,
        }}
      >
        {/* Top Delivery ETA + Account Row */}
        <div className="mx-auto max-w-5xl px-3.5 pt-2 pb-1.5">
          <div className="flex items-start justify-between gap-2.5">
            <div className="flex items-start gap-2.5 min-w-0">
              {isGoHome ? (
                <button
                  type="button"
                  onClick={() => setDrawerOpen(true)}
                  aria-label="Open ZebQuick Menu"
                  className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-neutral-900 shadow-xs transition hover:bg-white active:scale-95 shrink-0 cursor-pointer"
                >
                  <Menu className="h-4.5 w-4.5 stroke-[2.3]" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleBack}
                  aria-label="Go Back"
                  className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-neutral-900 shadow-xs transition hover:bg-white active:scale-95 shrink-0 cursor-pointer"
                >
                  <ArrowLeft className="h-4.5 w-4.5 stroke-[2.3]" />
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setPinInput(pincode);
                  setGpsStatus(null);
                  setLocationModalOpen(true);
                }}
                className="flex flex-col text-left min-w-0 cursor-pointer"
              >
                <span className={`text-[11px] font-extrabold tracking-tight leading-none ${isDarkTheme ? "text-white/90" : "text-neutral-900"}`}>
                  ZebQuick in
                </span>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className={`text-[22px] font-black tracking-tight leading-none ${isDarkTheme ? "text-white" : "text-neutral-950"}`}>
                    5–6 hours
                  </span>
                  <span className="rounded-full bg-emerald-100/90 border border-emerald-300/80 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                    Express
                  </span>
                </div>
                <div className={`mt-1 flex items-center gap-1 text-xs font-semibold truncate ${isDarkTheme ? "text-white/85" : "text-neutral-800"}`}>
                  <span className="truncate">
                    {serviceability.loading
                      ? "Detecting location..."
                      : serviceability.serviceable
                        ? `${serviceability.areaName}, ${serviceability.city || "WB"} (${pincode})`
                        : `Pincode ${pincode} • Coming Soon`}
                  </span>
                  <ChevronDown className={`h-3.5 w-3.5 shrink-0 ${isDarkTheme ? "text-white" : "text-neutral-900"}`} />
                </div>
              </button>
            </div>

            {/* Top-Right Account Button (Blinkit Style) */}
            <Link
              href="/zeb-quick/account"
              aria-label="ZebQuick Account"
              className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-white text-neutral-900 shadow-sm ring-1 ring-black/5 transition active:scale-95 shrink-0"
            >
              <User className="h-5 w-5 stroke-[2.2]" />
            </Link>
          </div>

          {/* Search Bar inside Golden Header */}
          {(isGoHome || isCategoriesPage) && (
            <div className="mt-3 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Search "bras", "vest", "track pants"...'
                className="w-full rounded-2xl border border-black/10 bg-white py-2.5 pl-10 pr-4 text-sm font-medium text-neutral-900 placeholder:text-neutral-400 shadow-xs focus:border-neutral-900 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Blinkit Horizontal Main Category Strip */}
        {isGoHome && (
          <div className="mx-auto max-w-5xl border-t border-black/5 bg-gradient-to-b from-[#FFFDF5]/70 to-white px-2 pt-2">
            <div className="flex items-end gap-4 overflow-x-auto no-scrollbar px-2">
              <button
                type="button"
                onClick={() => setSelectedMainCategory("All")}
                className={`flex flex-col items-center gap-1 pb-2 border-b-[2.5px] transition shrink-0 cursor-pointer ${
                  selectedMainCategory === "All"
                    ? "border-neutral-950 text-neutral-950"
                    : "border-transparent text-neutral-500 hover:text-neutral-800"
                }`}
              >
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-xl transition ${
                    selectedMainCategory === "All" ? "bg-[#F8CB46]/35 text-neutral-950" : "bg-neutral-100 text-neutral-700"
                  }`}
                >
                  <ShoppingBag className="h-4.5 w-4.5 stroke-[2.2]" />
                </div>
                <span className="text-[11px] font-extrabold leading-none whitespace-nowrap">All</span>
              </button>

              {mainCategories.map((mc) => {
                const active = selectedMainCategory === mc.name;
                const IconComp = getMainCategoryIcon(mc.name);
                return (
                  <button
                    key={mc.id || mc.name}
                    type="button"
                    onClick={() => setSelectedMainCategory(mc.name)}
                    className={`flex flex-col items-center gap-1 pb-2 border-b-[2.5px] transition shrink-0 cursor-pointer ${
                      active
                        ? "border-neutral-950 text-neutral-950"
                        : "border-transparent text-neutral-600 hover:text-neutral-900"
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl transition ${
                        active ? "bg-[#F8CB46]/35 text-neutral-950" : "bg-neutral-100 text-neutral-700"
                      }`}
                    >
                      {mc.image_url ? (
                        <img src={mc.image_url} alt={mc.name} className="h-full w-full object-cover" />
                      ) : (
                        <IconComp className="h-4.5 w-4.5 stroke-[2]" />
                      )}
                    </div>
                    <span className="text-[11px] font-bold leading-none whitespace-nowrap">{mc.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* 3-Bar Mobile Drawer */}
      <ZebQuickDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

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
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-extrabold text-neutral-900 transition hover:bg-amber-100 disabled:opacity-60 cursor-pointer"
            >
              <Navigation className="h-4 w-4 text-emerald-700" />
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
                  className="flex-1 rounded-2xl border border-neutral-300 px-3.5 py-2.5 text-sm font-bold text-neutral-900 focus:border-neutral-900 focus:outline-none"
                />
                <button
                  type="submit"
                  className="rounded-2xl bg-emerald-600 px-5 py-2.5 text-sm font-extrabold text-white transition hover:bg-emerald-700 active:scale-95 cursor-pointer"
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
                      className="text-xs font-extrabold text-emerald-700 underline cursor-pointer"
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
                        ? "border-emerald-600 bg-emerald-50 text-emerald-800"
                        : "border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-amber-400"
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
