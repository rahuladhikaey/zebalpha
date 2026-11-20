"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";

const SPLASH_SESSION_KEY = "zebalpha_launch_splash_shown";
const MIN_SPLASH_MS = 1350;
const REDUCED_MOTION_MS = 450;
const EXIT_DURATION_MS = 440;

export function AppLaunchSplashController() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    // 1. Hand off seamlessly from native Capacitor static splash to animated web logo splash
    try {
      if (Capacitor.isNativePlatform()) {
        SplashScreen.hide({ fadeOutDuration: 220 }).catch(() => {});
      }
    } catch {
      // Ignore on standard web browsers
    }

    const root = document.documentElement;
    if (!root.classList.contains("zebalpha-splash-active")) {
      return;
    }

    const win = window as unknown as {
      __zebalphaSplashStart?: number;
      __zebalphaSplashFallbackTimer?: number;
    };

    // Cancel inline <head> safety timer now that React lifecycle controls exit timing
    if (win.__zebalphaSplashFallbackTimer) {
      window.clearTimeout(win.__zebalphaSplashFallbackTimer);
      win.__zebalphaSplashFallbackTimer = undefined;
    }

    const prefersReducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const targetDuration = prefersReducedMotion ? REDUCED_MOTION_MS : MIN_SPLASH_MS;
    const startedAt =
      typeof win.__zebalphaSplashStart === "number" ? win.__zebalphaSplashStart : Date.now();
    const elapsed = Math.max(0, Date.now() - startedAt);
    const remaining = Math.max(180, targetDuration - elapsed);

    let cleanupTimer: number | undefined;
    let dismissed = false;

    const beginExit = () => {
      if (dismissed) return;
      dismissed = true;

      try {
        window.sessionStorage.setItem(SPLASH_SESSION_KEY, "1");
      } catch {
        // Ignore storage restrictions in private browsing
      }

      root.classList.add("zebalpha-splash-exiting");

      cleanupTimer = window.setTimeout(() => {
        root.classList.remove("zebalpha-splash-active", "zebalpha-splash-exiting");
      }, EXIT_DURATION_MS);
    };

    const dismissTimer = window.setTimeout(beginExit, remaining);

    return () => {
      window.clearTimeout(dismissTimer);
      if (cleanupTimer !== undefined) {
        window.clearTimeout(cleanupTimer);
      }
    };
  }, []);

  return null;
}
