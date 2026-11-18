"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Truck, MapPin, Check, AlertCircle, RotateCcw } from "lucide-react";
import { useIsNativeApp } from "@/lib/platform";
import {
  computeStandardDeliveryWindow,
  isValidIndianPincode,
  normalizeIndianPincode,
} from "@/lib/deliveryWindow";

export interface DeliveryEstimateWidgetProps {
  productId?: string | number;
  sellerId?: string | number | null;
  weight?: number;
  compact?: boolean;
  variant?: "standard" | "pink";
  className?: string;
  isOutOfStock?: boolean;
}

interface EstimateResult {
  serviceable: boolean;
  has_estimate: boolean;
  in_stock: boolean;
  pincode?: string;
  cod_available?: boolean;
  courier_name?: string | null;
  formatted_date?: string | null;
  display_text?: string | null;
  message?: string | null;
}

const PINCODE_STORAGE_KEY = "zebalpha_delivery_pincode";
const PINCODE_EVENT_NAME = "zebalpha_pincode_updated";
const CACHE_TTL_MS = 5 * 60 * 1000;

interface CacheEntry {
  expiresAt: number;
  data: EstimateResult;
}

// Shared module-level cache + in-flight request deduplication across widgets
const estimateCache = new Map<string, CacheEntry>();
const inFlightRequests = new Map<string, Promise<EstimateResult>>();

async function fetchDeduplicatedEstimate(
  pincode: string,
  productId?: string | number,
  sellerId?: string | number | null,
  weight: number = 0.5
): Promise<EstimateResult> {
  const prodKey = productId !== undefined && productId !== null ? String(productId) : "";
  const sellerKey = sellerId !== undefined && sellerId !== null ? String(sellerId) : "";
  const key = `${pincode}::${prodKey}::${sellerKey}::${weight}`;
  const now = Date.now();
  const cached = estimateCache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const existingPromise = inFlightRequests.get(key);
  if (existingPromise) {
    return existingPromise;
  }

  const params = new URLSearchParams({ pincode, weight: String(weight) });
  if (prodKey) params.set("product_id", prodKey);
  if (sellerKey) params.set("seller_id", sellerKey);

  const reqPromise = (async (): Promise<EstimateResult> => {
    try {
      const res = await fetch(`/api/shipping/edd?${params.toString()}`, {
        method: "GET",
      });

      if (!res.ok) {
        throw new Error(`HTTP_${res.status}`);
      }

      const json = await res.json();
      const standard = computeStandardDeliveryWindow();
      const result: EstimateResult = {
        serviceable: json.serviceable !== false,
        has_estimate: json.in_stock === false ? false : true,
        in_stock: json.in_stock !== false,
        pincode,
        cod_available: json.cod_available ?? true,
        courier_name: json.courier_name || "Standard Express Delivery",
        formatted_date: json.formatted_date || standard.formatted_date,
        display_text: json.display_text || standard.display_text,
        message: json.message || null,
      };

      estimateCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, data: result });
      return result;
    } catch {
      // Never surface transient API/rate-limit errors for a valid 6-digit PIN
      const standard = computeStandardDeliveryWindow();
      const fallback: EstimateResult = {
        serviceable: true,
        has_estimate: true,
        in_stock: true,
        pincode,
        cod_available: true,
        courier_name: "Standard Express Delivery",
        formatted_date: standard.formatted_date,
        display_text: standard.display_text,
        message: null,
      };
      return fallback;
    } finally {
      inFlightRequests.delete(key);
    }
  })();

  inFlightRequests.set(key, reqPromise);
  return reqPromise;
}

export function DeliveryEstimateWidget({
  productId,
  sellerId,
  weight = 0.5,
  compact = false,
  variant = "standard",
  className = "",
  isOutOfStock = false,
}: DeliveryEstimateWidgetProps) {
  const isNativeApp = useIsNativeApp();

  // Compute today's 7-day standard window purely in IST memory
  const standardWindow = useMemo(() => computeStandardDeliveryWindow(), []);

  const [pincode, setPincode] = useState<string>("");
  const [inputVal, setInputVal] = useState<string>("");
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<EstimateResult>(() => ({
    serviceable: !isOutOfStock,
    has_estimate: !isOutOfStock,
    in_stock: !isOutOfStock,
    cod_available: true,
    formatted_date: standardWindow.formatted_date,
    display_text: standardWindow.display_text,
  }));

  const runPinLookup = useCallback(
    async (pin: string) => {
      const clean = normalizeIndianPincode(pin);
      if (!isValidIndianPincode(clean)) {
        setValidationError("Enter a valid 6-digit PIN code");
        return;
      }

      setValidationError(null);
      setLoading(true);
      const data = await fetchDeduplicatedEstimate(clean, productId, sellerId, weight);
      setEstimate(data);
      setLoading(false);
    },
    [productId, sellerId, weight]
  );

  // Hydrate saved pincode asynchronously (avoids synchronous setState-in-effect) & listen for cross-widget updates
  useEffect(() => {
    let cancelled = false;

    const syncSavedPin = async () => {
      await Promise.resolve();
      if (cancelled) return;

      let saved = "";
      try {
        saved = localStorage.getItem(PINCODE_STORAGE_KEY) || "";
      } catch {
        saved = "";
      }

      if (!saved || !isValidIndianPincode(saved) || cancelled) return;

      setPincode(saved);
      setInputVal(saved);
      if (!compact && !isOutOfStock) {
        await runPinLookup(saved);
      }
    };

    void syncSavedPin();

    const handleExternalPinUpdate = (e: Event) => {
      const customEv = e as CustomEvent<string>;
      const newPin = normalizeIndianPincode(customEv.detail);
      if (isValidIndianPincode(newPin)) {
        setPincode(newPin);
        setInputVal(newPin);
        setIsEditing(false);
        setValidationError(null);
        if (!compact && !isOutOfStock) {
          void runPinLookup(newPin);
        }
      }
    };

    window.addEventListener(PINCODE_EVENT_NAME, handleExternalPinUpdate as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener(PINCODE_EVENT_NAME, handleExternalPinUpdate as EventListener);
    };
  }, [compact, isOutOfStock, runPinLookup]);

  const handleApplyPincode = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = normalizeIndianPincode(inputVal);
    if (!isValidIndianPincode(clean)) {
      setValidationError("Enter a valid 6-digit Indian PIN code");
      return;
    }

    setValidationError(null);
    setPincode(clean);
    setInputVal(clean);
    setIsEditing(false);

    try {
      localStorage.setItem(PINCODE_STORAGE_KEY, clean);
      window.dispatchEvent(new CustomEvent(PINCODE_EVENT_NAME, { detail: clean }));
    } catch {
      // Ignore storage errors
    }

    if (!isOutOfStock) {
      void runPinLookup(clean);
    }
  };

  // Compact mode (product cards & cart line items): zero API calls, instant 7-day display
  if (compact) {
    if (isOutOfStock || !estimate.in_stock) {
      if (variant === "pink") {
        return (
          <div
            className={`flex items-center gap-1.5 text-xs font-bold text-rose-600 ${className}`}
          >
            <AlertCircle size={14} className="shrink-0" />
            <span>Out of stock</span>
          </div>
        );
      }
      return (
        <div
          className={`flex items-center gap-1.5 text-[10px] font-bold ${
            isNativeApp ? "text-rose-700" : "text-rose-400"
          } ${className}`}
        >
          <AlertCircle size={11} className="shrink-0" />
          <span>Currently out of stock</span>
        </div>
      );
    }

    const compactDate = estimate.formatted_date || standardWindow.formatted_date;

    if (variant === "pink") {
      return (
        <div
          className={`flex items-center gap-1.5 sm:gap-2 text-xs sm:text-[13px] text-zinc-700 leading-tight ${className}`}
        >
          <Truck
            size={16}
            className="shrink-0 text-[#FF1E6F]"
          />
          <span className="truncate">
            Delivery by{" "}
            <strong className="font-bold text-zinc-900">
              {compactDate}
            </strong>
          </span>
        </div>
      );
    }

    return (
      <div
        className={`flex items-center gap-1.5 text-[10px] sm:text-[11px] leading-tight ${
          isNativeApp ? "text-[#4E4229]" : "text-zinc-400"
        } ${className}`}
      >
        <Truck
          size={11}
          className={`shrink-0 ${isNativeApp ? "text-[#15803D]" : "text-emerald-400"}`}
        />
        <span className="truncate">
          Delivery by{" "}
          <strong className={`font-extrabold ${isNativeApp ? "text-[#111111]" : "text-emerald-300"}`}>
            {compactDate}
          </strong>
        </span>
      </div>
    );
  }

  // Full mode (PDP / Cart summary / Checkout)
  const displayRange = estimate.formatted_date || standardWindow.formatted_date;
  const outOfStockState = isOutOfStock || !estimate.in_stock;

  return (
    <div
      className={`rounded-2xl border p-4 transition-all ${
        isNativeApp
          ? "border-[#E5C882] bg-[#FFFDF8] text-[#111111] shadow-[0_6px_18px_rgba(166,124,28,0.08)]"
          : "border-zinc-800 bg-zinc-950 text-white shadow-xl"
      } ${className}`}
    >
      {/* Top Delivery Promise Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div
            className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border ${
              outOfStockState
                ? isNativeApp
                  ? "bg-rose-50 border-rose-200 text-rose-700"
                  : "bg-rose-950/50 border-rose-500/40 text-rose-400"
                : isNativeApp
                ? "bg-[#FAF0D1] border-[#E4C988] text-[#8A5A03]"
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            }`}
          >
            {outOfStockState ? <AlertCircle size={18} /> : <Truck size={18} />}
          </div>

          <div className="min-w-0 flex-1 space-y-0.5">
            {outOfStockState ? (
              <>
                <p className={`text-sm font-black ${isNativeApp ? "text-rose-700" : "text-rose-400"}`}>
                  Currently Out of Stock
                </p>
                <p className={`text-xs font-medium ${isNativeApp ? "text-[#6D5F42]" : "text-zinc-400"}`}>
                  Delivery resumes once restocked by seller.
                </p>
              </>
            ) : (
              <>
                <p className={`text-sm sm:text-[15px] font-black leading-snug ${isNativeApp ? "text-[#111111]" : "text-white"}`}>
                  Delivery by{" "}
                  <span className={isNativeApp ? "text-[#15803D]" : "text-emerald-400"}>
                    {displayRange}
                  </span>
                </p>
                <p className={`text-xs font-semibold leading-snug ${isNativeApp ? "text-[#5E4E2E]" : "text-zinc-400"}`}>
                  {loading
                    ? "Verifying pincode availability..."
                    : `7-day doorstep delivery${estimate.cod_available !== false ? " • Cash on Delivery available" : ""}`}
                </p>
              </>
            )}
          </div>
        </div>

        {pincode && !isEditing && (
          <button
            type="button"
            onClick={() => {
              setInputVal(pincode);
              setValidationError(null);
              setIsEditing(true);
            }}
            className={`shrink-0 whitespace-nowrap rounded-xl border px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider transition cursor-pointer active:scale-95 ${
              isNativeApp
                ? "border-[#D4A017]/60 bg-[#FAF0D1] text-[#111111] hover:bg-[#F5E3AF]"
                : "border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800"
            }`}
          >
            Change
          </button>
        )}
      </div>

      {/* Divider + Pincode Controls */}
      <div
        className={`mt-3.5 pt-3 border-t ${
          isNativeApp ? "border-[#EFE3BF]" : "border-zinc-800/80"
        }`}
      >
        {pincode && !isEditing ? (
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className={`flex items-center gap-1.5 font-medium ${isNativeApp ? "text-[#5D4C2D]" : "text-zinc-400"}`}>
              <MapPin size={13} className={isNativeApp ? "text-[#8A5A03]" : "text-emerald-400"} />
              <span>
                Delivering to{" "}
                <strong className={`font-black ${isNativeApp ? "text-[#111111]" : "text-white"}`}>
                  {pincode}
                </strong>
              </span>
            </div>

            {!loading && (
              <button
                type="button"
                onClick={() => void runPinLookup(pincode)}
                className={`inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider cursor-pointer transition ${
                  isNativeApp
                    ? "text-[#8A5A03] hover:text-[#111111]"
                    : "text-emerald-400 hover:text-emerald-300"
                }`}
              >
                <RotateCcw size={11} />
                <span>Refresh</span>
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleApplyPincode} className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <MapPin
                  size={14}
                  className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${
                    isNativeApp ? "text-[#8A5A03]" : "text-zinc-400"
                  }`}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={inputVal}
                  onChange={(e) => {
                    const cleaned = normalizeIndianPincode(e.target.value);
                    setInputVal(cleaned);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder="Enter delivery PIN (e.g. 741254)"
                  aria-label="Enter delivery PIN code"
                  className={`w-full rounded-xl border pl-8 pr-3 py-2 text-xs font-bold outline-none transition ${
                    isNativeApp
                      ? "border-[#DEC88B] bg-white text-[#111111] placeholder:text-[#8B7B5B] focus:border-[#C28D12]"
                      : "border-zinc-700 bg-zinc-900 text-white placeholder:text-zinc-500 focus:border-white"
                  }`}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`shrink-0 whitespace-nowrap rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition cursor-pointer active:scale-95 inline-flex items-center gap-1 ${
                  isNativeApp
                    ? "bg-gradient-to-r from-[#F3C64F] via-[#E1AD25] to-[#C88D0F] text-[#111111] shadow-sm"
                    : "bg-white text-black hover:bg-zinc-200"
                }`}
              >
                <Check size={13} />
                <span>Check</span>
              </button>

              {pincode && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setValidationError(null);
                    setInputVal(pincode);
                  }}
                  className={`shrink-0 rounded-xl border px-3 py-2 text-xs font-bold transition cursor-pointer ${
                    isNativeApp
                      ? "border-[#DEC88B] bg-[#FAF0D1] text-[#111111]"
                      : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:text-white"
                  }`}
                >
                  Cancel
                </button>
              )}
            </div>

            {validationError && (
              <p className={`text-[11px] font-bold ${isNativeApp ? "text-rose-700" : "text-rose-400"}`}>
                {validationError}
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}

export default DeliveryEstimateWidget;
