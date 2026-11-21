"use client";

import React, { createContext, useContext, useEffect, useSyncExternalStore } from "react";
import { Capacitor } from "@capacitor/core";
import { isNativeUserAgent } from "@/lib/platformShared";

const NativePlatformContext = createContext<boolean | null>(null);

const subscribeNoop = () => () => {};

/**
 * Checks whether the current environment is the native ZEBALPHA Android App
 * versus a standard web browser (Chrome, Safari, Firefox, etc.).
 */
export function checkIsNativeApp(): boolean {
  if (typeof window === "undefined") return false;

  try {
    // 1. Direct Capacitor Native platform check
    if (Capacitor.isNativePlatform()) {
      return true;
    }

    // 2. Window Capacitor Bridge fallback
    const win = window as { Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string } };
    if (win.Capacitor?.isNativePlatform?.() || win.Capacitor?.getPlatform?.() === "android") {
      return true;
    }

    // 3. Custom Android User-Agent / WebView signature
    const ua = window.navigator?.userAgent || "";
    if (isNativeUserAgent(ua)) {
      return true;
    }

    // 4. URL query parameter override for mobile app testing (?view=app)
    if (window.location?.search?.includes("view=app")) {
      return true;
    }
  } catch (err) {
    console.error("[Platform Detection Notice]:", err);
  }

  return false;
}

/**
 * Direct non-hook function alias for checking native platform in helper functions / utilities.
 */
export const isNativeApp = checkIsNativeApp;

/**
 * Unified Official ZebAlpha Visual Theme (Festive Coral + Warm White + Champagne Gold).
 * Active across BOTH the official Android App and the Website so brand colors match 100%.
 * Use `useIsNativeApp()` strictly for native-shell behaviors (bottom dock, onboarding, splash, QR).
 */
export function useOfficialTheme(): boolean {
  return true;
}

/**
 * Propagates server-detected Android WebView state down the React tree so SSR HTML
 * and initial client hydration match without flashing Web UI first.
 */
export function NativePlatformProvider({
  initialIsNativeApp,
  children,
}: {
  initialIsNativeApp: boolean;
  children: React.ReactNode;
}) {
  return React.createElement(
    NativePlatformContext.Provider,
    { value: initialIsNativeApp },
    children
  );
}

/**
 * React hook to reactively determine if the user is in the native Android App shell.
 * Uses server-provided context when available to eliminate SSR-to-client UI flicker.
 */
export function useIsNativeApp(): boolean {
  const serverNative = useContext(NativePlatformContext);

  const isNative = useSyncExternalStore(
    subscribeNoop,
    checkIsNativeApp,
    () => serverNative ?? false
  );

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("is-official-theme");
    document.body.classList.add("is-official-theme");

    if (isNative) {
      document.documentElement.classList.add("is-android-app");
      document.body.classList.add("is-android-app");
    } else {
      document.documentElement.classList.remove("is-android-app");
      document.body.classList.remove("is-android-app");
    }
  }, [isNative]);

  return isNative;
}
