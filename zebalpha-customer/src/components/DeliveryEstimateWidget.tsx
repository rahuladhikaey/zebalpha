"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Truck, Loader2, MapPin, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

interface DeliveryEstimateWidgetProps {
  productId: string | number;
  sellerId?: string | null;
  compact?: boolean;
  className?: string;
  onEstimateResolved?: (data: any) => void;
}

interface EstimateState {
  status: "idle" | "loading" | "serviceable" | "unserviceable" | "unavailable" | "out_of_stock" | "error";
  formattedDate: string | null;
  displayText: string | null;
  courierName: string | null;
  transitDays: number | null;
  rate: number | null;
  message: string | null;
  pincode: string;
}

const PINCODE_STORAGE_KEY = "zebalpha_delivery_pincode";

export function DeliveryEstimateWidget({
  productId,
  sellerId,
  compact = false,
  className = "",
  onEstimateResolved,
}: DeliveryEstimateWidgetProps) {
  const [pincode, setPincode] = useState<string>("");
  const [inputVal, setInputVal] = useState<string>("");
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [state, setState] = useState<EstimateState>({
    status: "idle",
    formattedDate: null,
    displayText: null,
    courierName: null,
    transitDays: null,
    rate: null,
    message: null,
    pincode: "",
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // 1. Fetch real delivery estimate from backend/Shiprocket
  const fetchEstimate = useCallback(
    async (targetPincode: string) => {
      const cleanPin = String(targetPincode).replace(/\D/g, "").slice(0, 6);
      if (!cleanPin || !/^[1-9][0-9]{5}$/.test(cleanPin)) {
        return;
      }

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setState((prev) => ({
        ...prev,
        status: "loading",
        pincode: cleanPin,
        message: null,
      }));

      try {
        const params = new URLSearchParams({
          delivery_pincode: cleanPin,
          product_id: String(productId),
        });
        if (sellerId) {
          params.set("seller_id", String(sellerId));
        }

        const res = await fetch(`/api/shipping/edd?${params.toString()}`, {
          method: "GET",
          signal: controller.signal,
        });

        const data = await res.json();

        if (!res.ok) {
          setState({
            status: "error",
            formattedDate: null,
            displayText: null,
            courierName: null,
            transitDays: null,
            rate: null,
            message: data?.error || "Unable to check delivery at this moment.",
            pincode: cleanPin,
          });
          return;
        }

        // Out of stock
        if (data.in_stock === false) {
          setState({
            status: "out_of_stock",
            formattedDate: null,
            displayText: null,
            courierName: null,
            transitDays: null,
            rate: null,
            message: data.message || "Product is currently out of stock.",
            pincode: cleanPin,
          });
          return;
        }

        // Location Unserviceable
        if (!data.serviceable) {
          setState({
            status: "unserviceable",
            formattedDate: null,
            displayText: null,
            courierName: null,
            transitDays: null,
            rate: null,
            message: data.message || `Delivery not available to PIN code ${cleanPin}.`,
            pincode: cleanPin,
          });
          return;
        }

        // Serviceable with verified delivery date
        if (data.has_estimate && data.formatted_date) {
          const newState: EstimateState = {
            status: "serviceable",
            formattedDate: data.formatted_date,
            displayText: data.display_text || `Delivery by ${data.formatted_date}`,
            courierName: data.courier_name || null,
            transitDays: data.transit_days || null,
            rate: data.rate || null,
            message: null,
            pincode: cleanPin,
          };
          setState(newState);
          onEstimateResolved?.(data);
          return;
        }

        // Serviceable but no reliable transit time provided by carrier
        setState({
          status: "unavailable",
          formattedDate: null,
          displayText: null,
          courierName: data.courier_name || null,
          transitDays: null,
          rate: data.rate || null,
          message: data.message || `Delivery available to ${cleanPin}, but estimated date is currently unavailable.`,
          pincode: cleanPin,
        });
      } catch (err: any) {
        if (err.name === "AbortError") return;
        setState({
          status: "error",
          formattedDate: null,
          displayText: null,
          courierName: null,
          transitDays: null,
          rate: null,
          message: "Network error checking delivery. Please try again.",
          pincode: cleanPin,
        });
      }
    },
    [productId, sellerId, onEstimateResolved]
  );

  // 2. Initialize from localStorage and sync across tabs/components
  useEffect(() => {
    let savedPin = "";
    try {
      savedPin = localStorage.getItem(PINCODE_STORAGE_KEY) || "";
    } catch (_) {}

    if (savedPin && /^[1-9][0-9]{5}$/.test(savedPin)) {
      setPincode(savedPin);
      setInputVal(savedPin);
      setIsEditing(false);
      fetchEstimate(savedPin);
    } else {
      setIsEditing(true);
    }

    const handleExternalPinUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const newPin = customEvent.detail;
      if (newPin && newPin !== pincode && /^[1-9][0-9]{5}$/.test(newPin)) {
        setPincode(newPin);
        setInputVal(newPin);
        setIsEditing(false);
        fetchEstimate(newPin);
      }
    };

    window.addEventListener("zebalpha_pincode_updated", handleExternalPinUpdate as EventListener);
    return () => {
      window.removeEventListener("zebalpha_pincode_updated", handleExternalPinUpdate as EventListener);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchEstimate]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = inputVal.replace(/\D/g, "").slice(0, 6);
    if (!clean || clean.length !== 6 || !/^[1-9][0-9]{5}$/.test(clean)) {
      setValidationError("Please enter a valid 6-digit Indian PIN code");
      return;
    }

    setValidationError(null);
    setPincode(clean);
    setIsEditing(false);

    try {
      localStorage.setItem(PINCODE_STORAGE_KEY, clean);
      window.dispatchEvent(new CustomEvent("zebalpha_pincode_updated", { detail: clean }));
    } catch (_) {}

    fetchEstimate(clean);
  };

  const handleStartEditing = () => {
    setInputVal(pincode || "");
    setIsEditing(true);
    setValidationError(null);
  };

  // Compact Mode (used in mini cards / summaries)
  if (compact) {
    if (state.status === "loading") {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-400 font-medium animate-pulse">
          <Truck className="w-3.5 h-3.5" />
          <span>Checking delivery...</span>
        </span>
      );
    }
    if (state.status === "serviceable" && state.formattedDate) {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-200">
          <Truck className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
          <span>Delivery by <strong className="text-white font-extrabold">{state.formattedDate}</strong></span>
        </span>
      );
    }
    return null;
  }

  // Standard Product Detail Page Mode
  return (
    <div className={`p-4 rounded-2xl bg-zinc-950 border border-zinc-850 shadow-md ${className}`}>
      {/* Reference UI Header: Delivery Truck Icon + Calculated Message */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white shrink-0">
            <Truck className="w-4 h-4 text-zinc-200" aria-hidden="true" />
          </div>

          <div>
            {state.status === "loading" ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                <span className="text-sm font-bold text-zinc-300">Checking delivery date...</span>
              </div>
            ) : state.status === "serviceable" && state.formattedDate ? (
              <div>
                <p className="text-sm sm:text-base font-extrabold text-white tracking-tight flex items-center gap-1.5">
                  Delivery by {state.formattedDate}
                </p>
                <p className="text-xs font-medium text-emerald-400 flex items-center gap-1 mt-0.5">
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  In Stock
                </p>
              </div>
            ) : state.status === "unserviceable" ? (
              <div>
                <p className="text-sm font-bold text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  Delivery not available
                </p>
                <p className="text-xs font-medium text-zinc-400 mt-0.5">
                  {state.message || `Delivery not serviceable to PIN code ${state.pincode}`}
                </p>
              </div>
            ) : state.status === "out_of_stock" ? (
              <div>
                <p className="text-sm font-bold text-amber-400">Out of Stock</p>
                <p className="text-xs font-medium text-zinc-400 mt-0.5">
                  Delivery date will be calculated once stock is replenished.
                </p>
              </div>
            ) : state.status === "unavailable" ? (
              <div>
                <p className="text-sm font-bold text-zinc-300">Delivery estimate unavailable</p>
                <p className="text-xs font-medium text-zinc-400 mt-0.5">
                  Location is serviceable; estimated date will update upon dispatch.
                </p>
              </div>
            ) : state.status === "error" ? (
              <div>
                <p className="text-sm font-bold text-rose-400">Could not check delivery</p>
                <p className="text-xs font-medium text-zinc-400 mt-0.5">{state.message}</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-bold text-white">Check Estimated Delivery</p>
                <p className="text-xs font-medium text-zinc-400 mt-0.5">
                  Enter your destination PIN code to get the exact verified delivery date.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Change / Edit PIN Code action button when estimate is resolved */}
        {!isEditing && pincode && (
          <button
            type="button"
            onClick={handleStartEditing}
            className="text-xs font-black uppercase tracking-wider text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 px-3 py-1.5 rounded-xl transition-all cursor-pointer shrink-0"
          >
            Change
          </button>
        )}
      </div>

      {/* Pincode Info & Entry Section */}
      <div className="mt-3 pt-3 border-t border-zinc-900">
        {!isEditing && pincode ? (
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-1.5 font-medium">
              <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              Delivering to <strong className="text-zinc-200 font-bold">{pincode}</strong>
            </span>
            {state.status === "error" && (
              <button
                type="button"
                onClick={() => fetchEstimate(pincode)}
                className="text-xs font-bold text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <MapPin className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={inputVal}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setInputVal(clean);
                    if (validationError) setValidationError(null);
                  }}
                  placeholder="Enter 6-digit delivery PIN code"
                  className="w-full h-10 pl-9 pr-3 text-xs sm:text-sm font-semibold text-white bg-zinc-900 border border-zinc-800 rounded-xl focus:outline-none focus:border-zinc-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={state.status === "loading" || inputVal.length !== 6}
                className="h-10 px-4 rounded-xl bg-white text-black text-xs font-black uppercase tracking-wider hover:bg-zinc-200 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
              >
                {state.status === "loading" ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  "Check"
                )}
              </button>

              {pincode && isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="h-10 px-3 rounded-xl bg-zinc-900 text-zinc-400 text-xs font-bold hover:text-white transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>

            {validationError && (
              <p className="text-xs font-semibold text-rose-400">{validationError}</p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
export default DeliveryEstimateWidget;
