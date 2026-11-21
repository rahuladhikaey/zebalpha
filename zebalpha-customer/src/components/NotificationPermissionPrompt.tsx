"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { isNativeApp } from "@/lib/platform";
import {
  getCapacitorPushNotifications,
  getNativeNotificationStatus,
  getZebAlphaNative,
  initPushNotifications,
  saveDeviceToken,
  type NativeNotificationStatus,
} from "@/lib/pushNotifications";
import { Bell, X, ShieldAlert, CheckCircle2, Truck, Zap, Settings, LockOpen } from "lucide-react";

const DISMISSED_KEY = "zebalpha_notif_prompt_dismissed_until";
const DISMISS_COUNT_KEY = "zebalpha_notif_prompt_dismiss_count";
const GRANTED_KEY = "zebalpha_notif_granted";

function isOnboardingComplete(): boolean {
  if (typeof window === "undefined") return true;
  if (!isNativeApp()) return true;
  const langDone = localStorage.getItem("zebalpha_onboarding_language_completed") === "true";
  const guest = localStorage.getItem("zebalpha_onboarding_guest_mode") === "true";
  const fullDone = localStorage.getItem("zebalpha_onboarding_completed") === "true";
  return langDone && (fullDone || guest);
}

export function NotificationPermissionPrompt() {
  const pathname = usePathname();
  const [showPrompt, setShowPrompt] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showDeniedGuide, setShowDeniedGuide] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [nativeStatus, setNativeStatus] = useState<NativeNotificationStatus | null>(null);
  const [onboardingTick, setOnboardingTick] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const awaitingNativeResultRef = useRef(false);
  const isShowingUiRef = useRef(false);

  useEffect(() => {
    isShowingUiRef.current = showPrompt || showDeniedGuide;
  }, [showPrompt, showDeniedGuide]);

  const registerServiceWorker = useCallback(async () => {
    if ("serviceWorker" in navigator) {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch (err) {
        console.warn("ServiceWorker registration notice:", err);
      }
    }
  }, []);

  const markGranted = useCallback((showToast = true) => {
    awaitingNativeResultRef.current = false;
    setIsRequesting(false);
    setShowDeniedGuide(false);
    localStorage.setItem(GRANTED_KEY, "true");
    if (showToast) {
      setShowSuccess(true);
      window.setTimeout(() => {
        setShowSuccess(false);
        setShowPrompt(false);
      }, 2200);
    } else {
      setShowPrompt(false);
    }
  }, []);

  // Re-evaluate prompt visibility when onboarding opens or finishes
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onOnboardingState = (e: Event) => {
      const detail = (e as CustomEvent<{ isOpen?: boolean }>).detail;
      if (!detail?.isOpen) {
        setOnboardingTick((n) => n + 1);
      }
    };
    window.addEventListener("zebalpha:onboarding-state", onOnboardingState);
    return () => {
      window.removeEventListener("zebalpha:onboarding-state", onOnboardingState);
    };
  }, []);

  // Keep FCM tokens synced automatically whenever Android dispatches a new or refreshed token
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onFcmToken = (e: Event) => {
      const token = (e as CustomEvent<{ token?: string }>).detail?.token;
      if (!token) return;
      const previous = localStorage.getItem("zebalpha_fcm_token");
      if (token !== previous) {
        void saveDeviceToken({
          token,
          platform: "android",
          topics: ["all", "new_drops", "orders"],
        });
      }
    };
    window.addEventListener("zebalpha:fcm-token", onFcmToken);
    return () => {
      window.removeEventListener("zebalpha:fcm-token", onFcmToken);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isExcluded =
      pathname === "/login" ||
      pathname === "/signup" ||
      pathname === "/checkout" ||
      pathname === "/auth/callback";
    if (isExcluded) return;

    if (!isOnboardingComplete()) {
      return;
    }

    const syncPermissions = async () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      const native = getZebAlphaNative();
      if (native) {
        const status = getNativeNotificationStatus();
        setNativeStatus(status);

        if (status?.enabled) {
          markGranted(isShowingUiRef.current);
          void initPushNotifications();
          return;
        }

        // OS notifications are disabled; never trust stale GRANTED_KEY
        localStorage.removeItem(GRANTED_KEY);
        const dismissedUntil = localStorage.getItem(DISMISSED_KEY);
        if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
          return;
        }

        timerRef.current = setTimeout(() => {
          setShowPrompt(true);
        }, 3500);
        return;
      }

      // Check dismissal cooldown for Capacitor / Web
      const dismissedUntil = localStorage.getItem(DISMISSED_KEY);
      const inCooldown = Boolean(dismissedUntil && Date.now() < parseInt(dismissedUntil, 10));

      if (isNativeApp()) {
        const PushNotifications = getCapacitorPushNotifications();

        if (PushNotifications) {
          try {
            const status = await PushNotifications.checkPermissions();
            if (status.receive === "granted") {
              markGranted(false);
              return;
            } else if (status.receive === "denied") {
              localStorage.removeItem(GRANTED_KEY);
              return;
            }
          } catch {}
        }

        if (localStorage.getItem(GRANTED_KEY) === "true" || inCooldown) {
          return;
        }

        timerRef.current = setTimeout(() => {
          setShowPrompt(true);
        }, 3500);
        return;
      }

      if ("Notification" in window) {
        const current = Notification.permission;

        if (current === "granted") {
          markGranted(false);
          void registerServiceWorker();
          return;
        }

        if (current === "denied" || inCooldown) {
          return;
        }

        timerRef.current = setTimeout(() => {
          setShowPrompt(true);
        }, 3500);
      }
    };

    void syncPermissions();

    const handleNativePermission = (e: Event) => {
      const detail = (e as CustomEvent<NativeNotificationStatus>).detail;
      if (!detail) return;

      setNativeStatus(detail);
      setIsRequesting(false);

      if (detail.enabled || detail.granted) {
        markGranted(true);
        void initPushNotifications();
      } else if (awaitingNativeResultRef.current) {
        awaitingNativeResultRef.current = false;
        setShowPrompt(false);
        setShowDeniedGuide(true);
      }
    };

    const handleNativeStatus = (e: Event) => {
      const detail = (e as CustomEvent<NativeNotificationStatus>).detail;
      if (!detail) return;
      setNativeStatus(detail);
      if (detail.enabled || detail.granted) {
        markGranted(isShowingUiRef.current);
        void initPushNotifications();
      } else {
        localStorage.removeItem(GRANTED_KEY);
      }
    };

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === "visible") {
        const status = getNativeNotificationStatus();
        if (status) {
          setNativeStatus(status);
          if (status.enabled) {
            markGranted(isShowingUiRef.current);
            void initPushNotifications();
          }
        }
      }
    };

    window.addEventListener("zebalpha:notification-permission", handleNativePermission);
    window.addEventListener("zebalpha:notification-status", handleNativeStatus);
    document.addEventListener("visibilitychange", handleVisibilityOrFocus);
    window.addEventListener("focus", handleVisibilityOrFocus);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener("zebalpha:notification-permission", handleNativePermission);
      window.removeEventListener("zebalpha:notification-status", handleNativeStatus);
      document.removeEventListener("visibilitychange", handleVisibilityOrFocus);
      window.removeEventListener("focus", handleVisibilityOrFocus);
    };
  }, [pathname, onboardingTick, markGranted, registerServiceWorker]);

  const handleRequestPermission = async () => {
    if (typeof window === "undefined" || isRequesting) return;

    try {
      const native = getZebAlphaNative();
      if (native) {
        const current = getNativeNotificationStatus();
        if (current?.enabled) {
          markGranted(true);
          void initPushNotifications();
          return;
        }

        if (typeof native.requestPermission === "function") {
          setIsRequesting(true);
          awaitingNativeResultRef.current = true;
          native.requestPermission();
          return;
        }
      }

      if (isNativeApp()) {
        const PushNotifications = getCapacitorPushNotifications();
        if (PushNotifications) {
          setIsRequesting(true);
          const res = await PushNotifications.requestPermissions();
          setIsRequesting(false);
          if (res.receive === "granted") {
            markGranted(true);
            await PushNotifications.register();
            return;
          }
          setShowPrompt(false);
          setShowDeniedGuide(true);
          return;
        }

        // Web preview (?view=app) without native bridge: fall through to browser Notifications if supported
        if (!("Notification" in window)) {
          setShowPrompt(false);
          setShowDeniedGuide(true);
          return;
        }
      }

      if ("Notification" in window) {
        setIsRequesting(true);
        const permission = await Notification.requestPermission();
        setIsRequesting(false);

        if (permission === "granted") {
          markGranted(true);
          await registerServiceWorker();

          try {
            await initPushNotifications();
          } catch {}

          try {
            if ("serviceWorker" in navigator) {
              const reg = await navigator.serviceWorker.ready;
              await reg.showNotification("ZebAlpha Alerts Activated ✦", {
                body: "You're all set! You'll receive instant updates for order tracking, flash drops, and exclusive discounts.",
                icon: "/official-logo-sm.png",
                badge: "/official-logo-sm.png",
                vibrate: [150, 70, 150],
              } as NotificationOptions & { vibrate?: number[] });
            } else {
              new Notification("ZebAlpha Alerts Activated ✦", {
                body: "You're all set! You'll receive instant updates for order tracking, flash drops, and exclusive discounts.",
                icon: "/official-logo-sm.png",
              });
            }
          } catch {}
        } else if (permission === "denied") {
          setShowPrompt(false);
          setShowDeniedGuide(true);
        }
      }
    } catch (err) {
      console.warn("Notification permission error:", err);
      awaitingNativeResultRef.current = false;
      setIsRequesting(false);
      setShowPrompt(false);
      setShowDeniedGuide(true);
    }
  };

  const handleDismiss = () => {
    awaitingNativeResultRef.current = false;
    setIsRequesting(false);
    setShowPrompt(false);
    setShowDeniedGuide(false);

    // Calculate intelligent cooldown: 7 days on 1st dismiss, 30 days on repeat dismiss
    const count = parseInt(localStorage.getItem(DISMISS_COUNT_KEY) || "0", 10) + 1;
    localStorage.setItem(DISMISS_COUNT_KEY, String(count));

    const cooldownDays = count >= 2 ? 30 : 7;
    const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;
    localStorage.setItem(DISMISSED_KEY, String(Date.now() + cooldownMs));
  };

  if (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/checkout" ||
    pathname === "/auth/callback" ||
    (!showPrompt && !showDeniedGuide && !showSuccess)
  ) {
    return null;
  }

  const nativeBridge = getZebAlphaNative();
  const isAndroidUi = Boolean(nativeBridge || isNativeApp());

  return (
    <div className="fixed bottom-20 md:bottom-6 right-3 left-3 sm:right-4 sm:left-4 md:left-auto md:max-w-md z-[80] animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-auto">
      <div className="bg-zinc-950/95 border border-emerald-500/40 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-[0_16px_40px_rgba(0,0,0,0.85)] backdrop-blur-2xl text-white">
        
        {/* Success Confirmation Toast */}
        {showSuccess ? (
          <div className="flex items-center gap-3 py-1">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>Alerts Activated</span>
              </h4>
              <p className="text-xs text-zinc-400 mt-0.5">
                You will receive real-time updates for order tracking and exclusive drops.
              </p>
            </div>
          </div>
        ) : showDeniedGuide ? (
          // Guide when notifications were previously blocked or greyed out (Restricted Settings) in phone settings
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center shrink-0 text-amber-400">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-extrabold text-white tracking-tight">
                  {isAndroidUi ? "Unlock & Enable Notifications" : "Enable Browser Notifications"}
                </h4>
                {isAndroidUi ? (
                  <>
                    <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                      If <b className="text-white">Show notifications</b> is greyed out / locked on your phone:
                    </p>
                    <ol className="text-[11px] text-zinc-400 mt-1.5 list-decimal list-inside space-y-1.5 leading-relaxed">
                      <li>Tap <b className="text-white">Unlock in App Info</b> below</li>
                      <li>Tap top-right <b className="text-white">⋮ (3 dots)</b> or scroll to the bottom ➔ tap <b className="text-amber-300">&quot;Allow restricted settings&quot;</b> &amp; enter phone PIN</li>
                      <li>Then open <b className="text-white">Notification Settings</b> ➔ turn <b className="text-emerald-400">ON</b></li>
                    </ol>
                  </>
                ) : (
                  <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                    Notifications are blocked in your browser. Tap the lock/tune icon beside the address bar, set Notifications to <b>Allow</b>, and reload.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-zinc-500 hover:text-zinc-300 p-1 cursor-pointer transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {isAndroidUi && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (nativeBridge?.openAppInfoSettings) {
                        nativeBridge.openAppInfoSettings();
                      } else if (nativeBridge?.openNotificationSettings) {
                        nativeBridge.openNotificationSettings();
                      } else {
                        handleDismiss();
                      }
                    }}
                    className="flex-1 min-w-[140px] py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-[11px] font-black uppercase tracking-wider text-black transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                  >
                    <LockOpen className="w-3.5 h-3.5" />
                    1. Unlock in App Info
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (nativeBridge?.openNotificationSettings) {
                        nativeBridge.openNotificationSettings();
                      } else if (nativeBridge?.openAppInfoSettings) {
                        nativeBridge.openAppInfoSettings();
                      } else {
                        handleDismiss();
                      }
                    }}
                    className="flex-1 min-w-[140px] py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-[11px] font-black uppercase tracking-wider text-black transition-all cursor-pointer shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    2. Notification Settings
                  </button>
                </>
              )}
              {nativeStatus?.shouldShowRationale && (
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  className="py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-xs font-bold text-emerald-400 transition-all cursor-pointer"
                >
                  Try Popup
                </button>
              )}
              <button
                type="button"
                onClick={handleDismiss}
                className="py-2 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-xs font-bold text-white transition-all cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        ) : (
          // Official ZebAlpha Notification Prompt (Clean, Professional eCommerce Styling)
          <div className="flex items-start gap-3 sm:gap-3.5">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Bell className="w-5 h-5 animate-pulse" />
            </div>

            <div className="flex-1 min-w-0 pr-1">
              {/* Official Header Badge */}
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  Official App Updates
                </span>
              </div>

              {/* Title */}
              <h4 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
                Turn on ZebAlpha Alerts
              </h4>

              {/* Description */}
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Get real-time alerts on your phone for delivery tracking, flash discounts, and custom print releases.
              </p>

              {/* Feature Chips */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] font-semibold text-zinc-300">
                  <Truck className="w-3 h-3 text-emerald-400" /> Order Tracking
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] font-semibold text-zinc-300">
                  <Zap className="w-3 h-3 text-emerald-400" /> Flash Deals
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] font-semibold text-zinc-300">
                  ✦ New Drops
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2.5 mt-4">
                <button
                  type="button"
                  onClick={handleRequestPermission}
                  disabled={isRequesting}
                  className="px-4 py-2 sm:py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 active:scale-95 text-black font-black text-xs uppercase tracking-wider transition-all shadow-[0_2px_14px_rgba(16,185,129,0.35)] cursor-pointer"
                >
                  {isRequesting ? "Checking..." : "Allow Notifications"}
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="px-3 py-2 rounded-xl text-zinc-400 hover:text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  Maybe Later
                </button>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={handleDismiss}
              className="text-zinc-500 hover:text-zinc-300 p-1 -mr-1 -mt-1 transition-colors cursor-pointer"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
