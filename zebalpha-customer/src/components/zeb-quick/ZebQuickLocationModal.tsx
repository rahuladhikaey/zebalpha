"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  ChevronRight,
  Home,
  Hotel,
  Loader2,
  LocateFixed,
  MapPin,
  Plus,
  Search,
  X,
} from "lucide-react";
import { useZebQuick, type StoredZebQuickAddress } from "@/context/ZebQuickContext";
import { ZebQuickAddressSheet } from "@/components/zeb-quick/ZebQuickAddressSheet";

interface LocationSuggestion {
  title: string;
  subtitle: string;
  area_name: string;
  city: string;
  pincode: string;
  serviceable: boolean;
  source: "admin" | "osm";
}

function SlashedLocationPinIcon({ className = "h-16 w-16" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} aria-hidden="true">
      <path
        d="M32 10C22.0589 10 14 18.0589 14 28C14 40.5 32 54 32 54C32 54 50 40.5 50 28C50 18.0589 41.9411 10 32 10Z"
        stroke="#27272A"
        strokeWidth="3.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="32" cy="28" r="6.5" stroke="#27272A" strokeWidth="3.8" />
      <line
        x1="15"
        y1="49"
        x2="49"
        y2="13"
        stroke="#FFFFFF"
        strokeWidth="7.5"
        strokeLinecap="round"
      />
      <line
        x1="15"
        y1="49"
        x2="49"
        y2="13"
        stroke="#DC2626"
        strokeWidth="4.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function getLabelIcon(label: StoredZebQuickAddress["label"]) {
  if (label === "Home") return Home;
  if (label === "Work") return Building2;
  if (label === "Hotel") return Hotel;
  return MapPin;
}

export function ZebQuickLocationModal() {
  const {
    hasLocation,
    gpsPermissionState,
    locationGateMode,
    setLocationGateMode,
    setPincode,
    detectGpsPincode,
    savedAddresses,
    activeAddress,
    saveZebQuickAddress,
    selectSavedAddress,
  } = useZebQuick();

  const [detecting, setDetecting] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [addSheetOpen, setAddSheetOpen] = useState(false);

  // Live area / street / pincode search when manual sheet is open
  useEffect(() => {
    if (locationGateMode !== "manual") return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setSearching(false);
      return;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const params = new URLSearchParams({ q: trimmed });
        const res = await fetch(`/api/zeb-quick/locations?${params.toString()}`);
        const data = await res.json();
        if (active && Array.isArray(data.streetSuggestions)) {
          setSuggestions(data.streetSuggestions);
        }
      } catch {
        if (active) setSuggestions([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 250);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [locationGateMode, query]);

  // All hooks declared strictly above this conditional return
  if (locationGateMode === "closed" && !addSheetOpen) return null;

  const handleEnableGps = async () => {
    setDetecting(true);
    setGpsError(null);
    const res = await detectGpsPincode();
    setDetecting(false);
    if (!res.ok) {
      setGpsError(res.error || "Unable to detect device location");
    }
  };

  const handleSelectSuggestion = async (item: LocationSuggestion) => {
    const cleanPin = String(item.pincode || "").replace(/\D/g, "").slice(0, 6);
    if (cleanPin.length !== 6) {
      setGpsError("This street didn't include a 6-digit pincode. Please add your pincode or choose an area below.");
      return;
    }
    const label = [item.area_name || item.title, item.city].filter(Boolean).join(", ");
    setQuery("");
    setGpsError(null);
    await setPincode(cleanPin, label);
  };

  const directSixDigitPin = query.replace(/\D/g, "").length === 6 ? query.replace(/\D/g, "").slice(0, 6) : "";

  const canOpenNativeSettings =
    typeof window !== "undefined" && Boolean((window as any).ZebAlphaNative?.openAppInfoSettings);

  // Step 3 overlay: Full Blinkit "Add new address" sheet
  if (addSheetOpen) {
    return (
      <ZebQuickAddressSheet
        open={addSheetOpen}
        initialAddress={activeAddress}
        onClose={() => setAddSheetOpen(false)}
        onSave={async (addr) => {
          await saveZebQuickAddress(addr);
          setAddSheetOpen(false);
        }}
      />
    );
  }

  // VIEW 1: Blinkit-style Centered Location Permission Popup (First entry / GPS not enabled)
  if (locationGateMode === "permission") {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 px-6 backdrop-blur-[1px]">
        <div className="w-full max-w-[330px] overflow-hidden rounded-3xl bg-white text-center shadow-2xl">
          <div className="px-6 pt-7 pb-6">
            <SlashedLocationPinIcon className="mx-auto h-16 w-16" />
            <h2 className="mt-4 text-[18px] font-black leading-snug text-neutral-950">
              Location permission not enabled
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">
              Please enable location permission for a better delivery experience
            </p>

            {gpsError && (
              <div className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-[11.5px] font-semibold text-rose-700 space-y-1">
                <p>{gpsError}</p>
                {canOpenNativeSettings && (
                  <button
                    type="button"
                    onClick={() => (window as any).ZebAlphaNative.openAppInfoSettings()}
                    className="font-extrabold text-[#0C831F] underline cursor-pointer"
                  >
                    Open App Settings →
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="border-t border-neutral-100">
            <button
              type="button"
              disabled={detecting}
              onClick={() => void handleEnableGps()}
              className="flex w-full items-center justify-center gap-2 py-3.5 text-[14px] font-bold text-[#0C831F] transition hover:bg-emerald-50/60 active:bg-emerald-50 disabled:opacity-60 cursor-pointer"
            >
              {detecting && <Loader2 className="h-4 w-4 animate-spin" />}
              {detecting ? "Detecting live location..." : "Enable device location"}
            </button>
          </div>

          <div className="border-t border-neutral-100">
            <button
              type="button"
              onClick={() => {
                setGpsError(null);
                setLocationGateMode("manual");
              }}
              className="w-full py-3.5 text-[14px] font-semibold text-neutral-600 transition hover:bg-neutral-50 active:bg-neutral-100 cursor-pointer"
            >
              Select location manually
            </button>
          </div>
        </div>
      </div>
    );
  }

  // VIEW 2: Blinkit-style "Select delivery location" Bottom Sheet
  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-[1px]">
      <div className="relative w-full max-w-md">
        {/* Floating Circular Dark Close Button centered above sheet (exact Blinkit style) */}
        {hasLocation && (
          <button
            type="button"
            aria-label="Close location selector"
            onClick={() => setLocationGateMode("closed")}
            className="absolute -top-12 left-1/2 -translate-x-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900/90 text-white shadow-lg transition hover:bg-neutral-950 active:scale-95 cursor-pointer"
          >
            <X className="h-4.5 w-4.5 stroke-[2.5]" />
          </button>
        )}

        <div className="flex max-h-[85vh] flex-col overflow-hidden rounded-t-[26px] sm:rounded-[26px] bg-[#F4F6FB] shadow-2xl">
          {/* Top Pink GPS Disabled Banner (exact Blinkit style) */}
          {gpsPermissionState !== "granted" && (
            <div className="flex items-center justify-between gap-3 bg-[#FFE4E8] px-4 py-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <SlashedLocationPinIcon className="h-8 w-8 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[13px] font-extrabold leading-tight text-neutral-950">
                    Device location not enabled
                  </p>
                  <p className="mt-0.5 text-[11px] font-medium text-neutral-600 truncate">
                    Enable for a better delivery experience
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={detecting}
                onClick={() => void handleEnableGps()}
                className="shrink-0 rounded-lg bg-[#0C831F] px-3.5 py-1.5 text-xs font-extrabold text-white shadow-xs transition hover:bg-[#096b18] active:scale-95 disabled:opacity-60 cursor-pointer"
              >
                {detecting ? "..." : "Enable"}
              </button>
            </div>
          )}

          {/* Main Scrollable Sheet Content */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5">
            <h2 className="text-[16px] font-black tracking-tight text-neutral-950">
              Select delivery location
            </h2>

            {/* Search Input */}
            <div className="flex items-center gap-2.5 rounded-2xl border border-neutral-200/90 bg-white px-3.5 py-2.5 shadow-[0_1px_4px_rgba(0,0,0,0.03)] focus-within:border-[#0C831F]">
              <Search className="h-4.5 w-4.5 shrink-0 text-neutral-600 stroke-[2.2]" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setGpsError(null);
                }}
                placeholder="Search for area, street name or pincode..."
                className="w-full bg-transparent text-[13.5px] font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                  className="text-neutral-400 hover:text-neutral-700 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {gpsError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700 space-y-1">
                <p>{gpsError}</p>
                {canOpenNativeSettings && (
                  <button
                    type="button"
                    onClick={() => (window as any).ZebAlphaNative.openAppInfoSettings()}
                    className="font-extrabold text-[#0C831F] underline cursor-pointer"
                  >
                    Open App Settings to Allow Location →
                  </button>
                )}
              </div>
            )}

            {/* Live Search Results (when typing area, street, or pincode) */}
            {query.trim().length >= 2 && (
              <div className="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-xs divide-y divide-neutral-100">
                {directSixDigitPin && (
                  <button
                    type="button"
                    onClick={() => void setPincode(directSixDigitPin)}
                    className="flex w-full items-center justify-between gap-3 px-3.5 py-3 text-left transition hover:bg-emerald-50/50 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-[#0C831F]">
                        <MapPin className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-extrabold text-neutral-950">
                          Use Pincode {directSixDigitPin}
                        </p>
                        <p className="text-[11px] text-neutral-500">
                          Check ZebQuick 5–6 Hr delivery availability
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />
                  </button>
                )}

                {searching ? (
                  <div className="flex items-center justify-center gap-2 py-5 text-xs font-semibold text-neutral-500">
                    <Loader2 className="h-4 w-4 animate-spin text-[#0C831F]" />
                    Searching areas &amp; streets...
                  </div>
                ) : suggestions.length > 0 ? (
                  suggestions.slice(0, 8).map((item, idx) => (
                    <button
                      key={`${item.pincode}-${item.title}-${idx}`}
                      type="button"
                      onClick={() => void handleSelectSuggestion(item)}
                      className="flex w-full items-start justify-between gap-3 px-3.5 py-3 text-left transition hover:bg-neutral-50 cursor-pointer"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-extrabold text-neutral-950 truncate">
                              {item.title}
                            </p>
                            {item.serviceable && (
                              <span className="shrink-0 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9.5px] font-black text-[#0C831F]">
                                Express
                              </span>
                            )}
                          </div>
                          <p className="mt-0.5 text-[11px] text-neutral-500 line-clamp-1">
                            {item.subtitle}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
                    </button>
                  ))
                ) : !directSixDigitPin ? (
                  <div className="px-4 py-4 text-center text-xs text-neutral-500">
                    No matching areas found. Try entering your 6-digit pincode or tap{" "}
                    <span className="font-bold text-[#0C831F]">Use current location</span>.
                  </div>
                ) : null}
              </div>
            )}

            {/* Blinkit Action Card: Use current location + Add new address */}
            <div className="overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.03)] divide-y divide-neutral-100">
              <button
                type="button"
                disabled={detecting}
                onClick={() => void handleEnableGps()}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-emerald-50/40 active:bg-emerald-50 disabled:opacity-60 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  {detecting ? (
                    <Loader2 className="h-5 w-5 animate-spin text-[#0C831F]" />
                  ) : (
                    <LocateFixed className="h-5 w-5 text-[#0C831F] stroke-[2.2]" />
                  )}
                  <span className="text-[14px] font-bold text-[#0C831F]">
                    {detecting ? "Detecting current location..." : "Use current location"}
                  </span>
                </div>
                <ChevronRight className="h-4.5 w-4.5 text-neutral-400" />
              </button>

              <button
                type="button"
                onClick={() => setAddSheetOpen(true)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition hover:bg-emerald-50/40 active:bg-emerald-50 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Plus className="h-5 w-5 text-[#0C831F] stroke-[2.5]" />
                  <span className="text-[14px] font-bold text-[#0C831F]">Add new address</span>
                </div>
                <ChevronRight className="h-4.5 w-4.5 text-neutral-400" />
              </button>
            </div>

            {/* Your Saved Addresses (exact Blinkit cards) */}
            {savedAddresses.length > 0 && (
              <div className="space-y-2.5 pt-1">
                <p className="px-1 text-xs font-bold text-neutral-500">Your saved addresses</p>
                <div className="space-y-2.5">
                  {savedAddresses.map((addr, idx) => {
                    const IconComp = getLabelIcon(addr.label);
                    const fullAddr = [
                      addr.houseLine,
                      addr.buildingName,
                      addr.landmark ? `Near ${addr.landmark}` : "",
                      addr.areaStreet,
                      addr.city,
                      addr.pincode,
                    ]
                      .filter(Boolean)
                      .join(", ");

                    return (
                      <button
                        key={`${addr.label}-${addr.pincode}-${idx}`}
                        type="button"
                        onClick={() => void selectSavedAddress(addr)}
                        className="flex w-full items-start gap-3 rounded-2xl border border-neutral-200/70 bg-white p-3.5 text-left shadow-[0_1px_4px_rgba(0,0,0,0.03)] transition hover:border-[#0C831F] active:scale-[0.99] cursor-pointer"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F4F6FB] text-amber-600">
                          <IconComp className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[14px] font-extrabold text-neutral-950 leading-tight">
                            {addr.label}
                          </p>
                          <p className="mt-1 text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                            {fullAddr}
                          </p>
                          {addr.phone && (
                            <p className="mt-1 text-xs text-neutral-500">
                              Phone number:{" "}
                              <span className="font-bold text-neutral-800">{addr.phone}</span>
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
