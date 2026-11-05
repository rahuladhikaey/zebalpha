"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface NetworkAdaptiveState {
  isOnline: boolean;
  effectiveType: "4g" | "3g" | "2g" | "slow-2g" | "unknown";
  saveData: boolean;
  isSlowConnection: boolean;
  prefetchAllowed: boolean;
  recommendedBatchSize: number;
}

export function useNetworkAdaptive(): NetworkAdaptiveState {
  const [state, setState] = useState<NetworkAdaptiveState>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    effectiveType: "unknown",
    saveData: false,
    isSlowConnection: false,
    prefetchAllowed: true,
    recommendedBatchSize: 20,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateNetworkStatus = () => {
      const isOnline = navigator.onLine;
      const connection =
        (navigator as any).connection ||
        (navigator as any).mozConnection ||
        (navigator as any).webkitConnection;

      const effectiveType: "4g" | "3g" | "2g" | "slow-2g" | "unknown" =
        connection?.effectiveType || "4g";
      const saveData: boolean = Boolean(connection?.saveData);

      const isSlow =
        !isOnline ||
        effectiveType === "2g" ||
        effectiveType === "slow-2g" ||
        effectiveType === "3g" ||
        saveData;

      const prefetchAllowed = isOnline && !isSlow && !saveData;
      const recommendedBatchSize = isSlow ? 10 : 20;

      setState({
        isOnline,
        effectiveType,
        saveData,
        isSlowConnection: isSlow,
        prefetchAllowed,
        recommendedBatchSize,
      });
    };

    updateNetworkStatus();

    window.addEventListener("online", updateNetworkStatus);
    window.addEventListener("offline", updateNetworkStatus);

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
