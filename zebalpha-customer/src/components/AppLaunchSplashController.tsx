"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";

/**
 * Single-Splash Native Handoff Controller (Android App Only — Zero Splash on Website).
 * Keeps Android's single native launch splash visible until React has painted the first
 * live frame underneath, then smoothly fades it out directly into the app (eliminates
 * back-to-back double splash screens).
 */
export function AppLaunchSplashController() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    // Never run any splash logic on standard web browsers
    let isNative = false;
    try {
      isNative = Capacitor.isNativePlatform();
    } catch {
      isNative = false;
    }
    if (!isNative) return;

    let raf1: number | undefined;
    let raf2: number | undefined;
    let hidden = false;

    const hideNativeSplash = () => {
      if (hidden) return;
      hidden = true;
      try {
        SplashScreen.hide({ fadeOutDuration: 260 }).catch(() => {});
      } catch {
        // Ignore if native splash already dismissed
      }
    };

    // Wait two vsync frames so the hydrated Android UI is already painted before native splash fades out
    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(hideNativeSplash);
    });

    // Safety fallback so native splash can never hang
    const fallbackTimer = window.setTimeout(hideNativeSplash, 1200);

    return () => {
      if (raf1 !== undefined) window.cancelAnimationFrame(raf1);
      if (raf2 !== undefined) window.cancelAnimationFrame(raf2);
      window.clearTimeout(fallbackTimer);
    };
  }, []);

  return null;
}
