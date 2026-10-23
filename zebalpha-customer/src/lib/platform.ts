"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

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
    const win = window as any;
    if (win.Capacitor?.isNativePlatform?.() || win.Capacitor?.getPlatform?.() === "android") {
      return true;
    }

    // 3. Custom Android User-Agent / WebView signature
    const ua = window.navigator?.userAgent || "";
    if (
      ua.includes("ZEBALPHA_ANDROID_APP") ||
      ua.includes("Capacitor") ||
      ua.includes("; wv") ||
      (ua.includes("Android") && ua.includes("Version/") && !ua.includes("Chrome/"))
    ) {
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
 * React hook to reactively determine if the user is in the native Android App shell.
 * Defaults to false on SSR and initializes on client mount.
 */
export function useIsNativeApp(): boolean {
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setIsNative(checkIsNativeApp());
  }, []);

  return isNative;
}
