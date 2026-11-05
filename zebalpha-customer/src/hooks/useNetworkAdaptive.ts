"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface NetworkAdaptiveState {
  isOnline: boolean;
  effectiveType: "4g" | "3g" | "2g" | "slow-2g" | "unknown";
  saveData: boolean;
  networkTier: "fast" | "medium" | "slow" | "offline";
  isSlowConnection: boolean;
  prefetchAllowed: boolean;
  recommendedBatchSize: number;
  prefetchMargin: string;
}

export function useNetworkAdaptive(): NetworkAdaptiveState {
  const [state, setState] = useState<NetworkAdaptiveState>({
    isOnline: true,
    effectiveType: "unknown",
    saveData: false,
    networkTier: "fast",
    isSlowConnection: false,
    prefetchAllowed: true,
    recommendedBatchSize: 20,
    prefetchMargin: "600px 0px",
  });

  const isCheckingRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Active verification against backend to prevent false offline flags in mobile browsers
    const verifyConnectivity = async (): Promise<boolean> => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch("/api/ping", {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return res.ok;
      } catch {
        return false;
      }
    };

    const updateNetworkStatus = async () => {
      let isOnline = navigator.onLine;

      // If browser reports offline, verify with active ping before showing false offline alerts
      if (!isOnline && !isCheckingRef.current) {
        isCheckingRef.current = true;
        const reallyReachable = await verifyConnectivity();
        isCheckingRef.current = false;
        if (reallyReachable) {
          isOnline = true;
        }
      }

      const connection =
        (navigator as any).connection ||
        (navigator as any).mozConnection ||
        (navigator as any).webkitConnection;

      const effectiveType: "4g" | "3g" | "2g" | "slow-2g" | "unknown" =
        connection?.effectiveType || "4g";
      const saveData: boolean = Boolean(connection?.saveData);

      let networkTier: "fast" | "medium" | "slow" | "offline" = "fast";
      let recommendedBatchSize = 20;
      let prefetchMargin = "600px 0px";
      let prefetchAllowed = true;
      let isSlow = false;

      if (!isOnline) {
        networkTier = "offline";
        recommendedBatchSize = 0;
        prefetchMargin = "0px 0px";
        prefetchAllowed = false;
        isSlow = true;
      } else if (effectiveType === "2g" || effectiveType === "slow-2g" || saveData) {
        networkTier = "slow";
        recommendedBatchSize = 8; // 8 for slow networks per enterprise SLA
        prefetchMargin = "0px 0px"; // Prefetch disabled on slow connection
        prefetchAllowed = false;
        isSlow = true;
      } else if (effectiveType === "3g") {
        networkTier = "medium";
        recommendedBatchSize = 12; // 12 for medium 3G networks
        prefetchMargin = "250px 0px";
        prefetchAllowed = true;
        isSlow = true;
      } else {
        networkTier = "fast";
        recommendedBatchSize = 20; // 20 for fast 4G/Wi-Fi
        prefetchMargin = "600px 0px";
        prefetchAllowed = true;
        isSlow = false;
      }

      setState({
        isOnline,
        effectiveType,
        saveData,
        networkTier,
        isSlowConnection: isSlow,
        prefetchAllowed,
        recommendedBatchSize,
        prefetchMargin,
      });
    };

    updateNetworkStatus();

    window.addEventListener("online", updateNetworkStatus);
    window.addEventListener("offline", updateNetworkStatus);
    window.addEventListener("focus", updateNetworkStatus);

    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    if (connection) {
      connection.addEventListener("change", updateNetworkStatus);
    }

    return () => {
      window.removeEventListener("online", updateNetworkStatus);
      window.removeEventListener("offline", updateNetworkStatus);
      window.removeEventListener("focus", updateNetworkStatus);
      if (connection) {
        connection.removeEventListener("change", updateNetworkStatus);
      }
    };
  }, []);

  return state;
}

/**
 * Request Deduplication & Abort Controller Manager
 * Prevents concurrent redundant queries and cleanly cancels previous in-flight requests.
 */
export class RequestManager {
  private static inFlightRequests = new Map<string, Promise<any>>();
  private static abortControllers = new Map<string, AbortController>();

  /**
   * Deduplicates concurrent identical requests
   */
  static async deduplicate<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    if (this.inFlightRequests.has(key)) {
      return this.inFlightRequests.get(key) as Promise<T>;
    }

    const promise = fetcher().finally(() => {
      this.inFlightRequests.delete(key);
    });

    this.inFlightRequests.set(key, promise);
    return promise;
  }

  /**
   * Retrieves an AbortSignal and cancels any previous request for the given key
   */
  static getAbortSignal(key: string): AbortSignal {
    const existing = this.abortControllers.get(key);
    if (existing) {
      existing.abort();
    }

    const controller = new AbortController();
    this.abortControllers.set(key, controller);
    return controller.signal;
  }

  /**
   * Cleans up controller for completed requests
   */
  static clearAbortController(key: string): void {
    this.abortControllers.delete(key);
  }
}

