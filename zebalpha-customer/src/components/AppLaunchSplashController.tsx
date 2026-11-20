"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";

const SPLASH_SESSION_KEY = "zebalpha_launch_splash_shown";
const MIN_SPLASH_MS = 1480;
const REDUCED_MOTION_MS = 420;
const EXIT_DURATION_MS = 540;

export function AppLaunchSplashController() {
  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    let raf1: number | undefined;
    let raf2: number | undefined;

    // 1. Hand off seamlessly from native Capacitor static splash AFTER first WebView frame paints
    const hideNativeSplashSmoothly = () => {
      try {
        if (Capacitor.isNativePlatform()) {
          SplashScreen.hide({ fadeOutDuration: 200 }).catch(() => {});
        }
      } catch {
        // Ignore on standard web browsers
      }
    };

    const splashImg = document.querySelector<HTMLImageElement>(
      "#zebalpha-instant-splash .za-splash-logo-img"
    );
    const scheduleNativeHide = () => {
      raf1 = window.requestAnimationFrame(() => {
        raf2 = window.requestAnimationFrame(hideNativeSplashSmoothly);
      });
    };

    if (splashImg && !splashImg.complete && typeof splashImg.decode === "function") {
      splashImg.decode().then(scheduleNativeHide).catch(scheduleNativeHide);
    } else {
      scheduleNativeHide();
    }

    const root = document.documentElement;
    if (!root.classList.contains("zebalpha-splash-active")) {
      return () => {
        if (raf1 !== undefined) window.cancelAnimationFrame(raf1);
        if (raf2 !== undefined) window.cancelAnimationFrame(raf2);
      };
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
    const remaining = Math.max(220, targetDuration - elapsed);

    let exitRaf: number | undefined;
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

      // Align exit transition to a clean vsync frame for 60fps/120fps silky smoothness
      exitRaf = window.requestAnimationFrame(() => {
        root.classList.add("zebalpha-splash-exiting");

        cleanupTimer = window.setTimeout(() => {
          root.classList.remove("zebalpha-splash-active", "zebalpha-splash-exiting");
        }, EXIT_DURATION_MS);
      });
    };

    const dismissTimer = window.setTimeout(beginExit, remaining);

    return () => {
      if (raf1 !== undefined) window.cancelAnimationFrame(raf1);
      if (raf2 !== undefined) window.cancelAnimationFrame(raf2);
      if (exitRaf !== undefined) window.cancelAnimationFrame(exitRaf);
      window.clearTimeout(dismissTimer);
      if (cleanupTimer !== undefined) {
        window.clearTimeout(cleanupTimer);
      }
    };
  }, []);

  return null;
}
