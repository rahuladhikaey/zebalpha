"use client";

import { Capacitor } from "@capacitor/core";
import { supabase } from "@/lib/supabaseClient";
import { isNativeApp } from "@/lib/platform";

export interface PushTokenPayload {
  token: string;
  platform: "android" | "web" | "ios";
  user_id?: string | null;
  topics?: string[];
  device_info?: string;
}

export interface NativeNotificationStatus {
  enabled: boolean;
  granted: boolean;
  postNotificationsGranted: boolean;
  areNotificationsEnabled: boolean;
  channelBlocked: boolean;
  shouldShowRationale: boolean;
  blockedBySystem: boolean;
  sdkInt?: number;
}

export interface ZebAlphaNativeBridge {
  showNotification?: (title: string, message: string, url: string) => void;
  requestPermission?: () => void;
  isNotificationEnabled?: () => boolean;
  getNotificationStatus?: () => string;
  getFcmToken?: () => string;
  openAppInfoSettings?: () => void;
  openNotificationSettings?: () => void;
}

export interface CapacitorPushPlugin {
  checkPermissions: () => Promise<{ receive: "prompt" | "prompt-with-rationale" | "granted" | "denied" }>;
  requestPermissions: () => Promise<{ receive: "prompt" | "prompt-with-rationale" | "granted" | "denied" }>;
  register: () => Promise<void>;
  addListener: (event: string, cb: (payload: unknown) => void) => void;
}

/**
 * Safely returns Capacitor PushNotifications plugin if installed on native runtime.
 */
export function getCapacitorPushNotifications(): CapacitorPushPlugin | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as {
    Capacitor?: { Plugins?: { PushNotifications?: CapacitorPushPlugin } };
  };
  return win.Capacitor?.Plugins?.PushNotifications ?? null;
}

/**
 * Safely returns the injected Android WebView JS bridge when running inside the ZEBALPHA APK.
 */
export function getZebAlphaNative(): ZebAlphaNativeBridge | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as { ZebAlphaNative?: ZebAlphaNativeBridge };
  return win.ZebAlphaNative ?? null;
}

/**
 * Reads structured notification permission, channel, and OS lock status from the native Android bridge.
 */
export function getNativeNotificationStatus(): NativeNotificationStatus | null {
  const native = getZebAlphaNative();
  if (!native) return null;

  try {
    if (typeof native.getNotificationStatus === "function") {
      const raw = native.getNotificationStatus();
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<NativeNotificationStatus>;
        const enabled = Boolean(parsed.enabled ?? parsed.granted);
        return {
          enabled,
          granted: enabled,
          postNotificationsGranted: Boolean(parsed.postNotificationsGranted),
          areNotificationsEnabled: Boolean(parsed.areNotificationsEnabled),
          channelBlocked: Boolean(parsed.channelBlocked),
          shouldShowRationale: Boolean(parsed.shouldShowRationale),
          blockedBySystem: Boolean(parsed.blockedBySystem),
          sdkInt: typeof parsed.sdkInt === "number" ? parsed.sdkInt : undefined,
        };
      }
    }
  } catch (err) {
    console.warn("Notice parsing native notification status:", err);
  }

  if (typeof native.isNotificationEnabled === "function") {
    const enabled = Boolean(native.isNotificationEnabled());
    return {
      enabled,
      granted: enabled,
      postNotificationsGranted: enabled,
      areNotificationsEnabled: enabled,
      channelBlocked: false,
      shouldShowRationale: false,
      blockedBySystem: false,
    };
  }

  return null;
}

function requestNativePermissionViaBridge(
  native: ZebAlphaNativeBridge,
  timeoutMs = 15000
): Promise<NativeNotificationStatus | null> {
  if (typeof native.requestPermission !== "function") {
    return Promise.resolve(getNativeNotificationStatus());
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (status: NativeNotificationStatus | null) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("zebalpha:notification-permission", onResult as EventListener);
      window.clearTimeout(timer);
      resolve(status);
    };

    const onResult = (e: CustomEvent<NativeNotificationStatus>) => {
      finish(e.detail ?? getNativeNotificationStatus());
    };

    const timer = window.setTimeout(() => {
      finish(getNativeNotificationStatus());
    }, timeoutMs);

    window.addEventListener("zebalpha:notification-permission", onResult as EventListener);
    try {
      native.requestPermission?.();
    } catch (err) {
      console.warn("Notice calling native.requestPermission:", err);
      finish(getNativeNotificationStatus());
    }
  });
}

function waitForNativeFcmToken(native: ZebAlphaNativeBridge, timeoutMs = 5000): Promise<string> {
  try {
    const immediate = native.getFcmToken?.() || "";
    if (immediate) return Promise.resolve(immediate);
  } catch (err) {
    console.warn("Notice reading cached FCM token:", err);
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (token: string) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("zebalpha:fcm-token", onToken as EventListener);
      window.clearTimeout(timer);
      resolve(token);
    };

    const onToken = (e: CustomEvent<{ token?: string }>) => {
      const token = e.detail?.token || "";
      if (token) finish(token);
    };

    const timer = window.setTimeout(() => {
      finish(localStorage.getItem("zebalpha_fcm_token") || "");
    }, timeoutMs);

    window.addEventListener("zebalpha:fcm-token", onToken as EventListener);
  });
}

/**
 * Checks whether push notifications are supported on current platform
 */
export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (isNativeApp()) return true;
  return "Notification" in window && "serviceWorker" in navigator;
}

/**
 * Saves or updates device push token in Supabase
 */
export async function saveDeviceToken(payload: PushTokenPayload): Promise<boolean> {
  try {
    const { token, platform, user_id, topics = ["all", "new_drops"], device_info } = payload;
    if (!token) return false;

    // Check if user is logged in if user_id was not passed
    let effectiveUserId = user_id;
    if (!effectiveUserId) {
      const { data: authData } = await supabase.auth.getUser();
      effectiveUserId = authData?.user?.id || null;
    }

    // Call server register API endpoint for resilient upserting
    const res = await fetch("/api/notifications/register-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        platform,
        user_id: effectiveUserId,
        topics,
        device_info: device_info || (typeof navigator !== "undefined" ? navigator.userAgent : "Unknown"),
      }),
    });

    if (!res.ok) {
      console.warn("Notice saving push token to API:", await res.text());
    }

    // Also persist token in localStorage
    localStorage.setItem("zebalpha_fcm_token", token);
    return true;
  } catch (err) {
    console.warn("Notice in saveDeviceToken:", err);
    return false;
  }
}

/**
 * Initializes Push Notifications for Android (Capacitor) or Web Push (like Flipkart/Meesho)
 */
export async function initPushNotifications(userId?: string): Promise<{
  success: boolean;
  token?: string;
  error?: string;
}> {
  if (typeof window === "undefined") {
    return { success: false, error: "Window unavailable" };
  }

  // 1. NATIVE ANDROID APP (ZebAlphaNative FCM Bridge or Capacitor)
  if (isNativeApp()) {
    const native = getZebAlphaNative();
    if (native && (typeof native.getFcmToken === "function" || typeof native.requestPermission === "function")) {
      try {
        let status = getNativeNotificationStatus();
        if (!status?.enabled) {
          status = await requestNativePermissionViaBridge(native);
        }

        if (!status?.enabled) {
          return {
            success: false,
            error: status?.blockedBySystem
              ? "Notifications blocked in Android Settings"
              : "Notification permission not granted",
          };
        }

        const fcmToken = await waitForNativeFcmToken(native);
        if (fcmToken) {
          await saveDeviceToken({
            token: fcmToken,
            platform: "android",
            user_id: userId,
            topics: ["all", "new_drops", "orders"],
          });
        }

        return { success: true, token: fcmToken || undefined };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Native notification init failed";
        console.warn("Notice initializing ZebAlphaNative notifications:", err);
        return { success: false, error: message };
      }
    }

    try {
      const PushNotifications = getCapacitorPushNotifications();

      if (PushNotifications) {
        // Check / request permissions
        let permStatus = await PushNotifications.checkPermissions();
        if (permStatus.receive === "prompt") {
          permStatus = await PushNotifications.requestPermissions();
        }

        if (permStatus.receive !== "granted") {
          return { success: false, error: "Notification permission denied by user" };
        }

        // Register device with FCM
        await PushNotifications.register();

        // Listen for registration token
        return new Promise((resolve) => {
          PushNotifications.addListener("registration", async (payload: unknown) => {
            const token = payload as { value?: string } | null;
            if (token?.value) {
              await saveDeviceToken({
                token: token.value,
                platform: "android",
                user_id: userId,
                topics: ["all", "new_drops", "orders"],
              });
              resolve({ success: true, token: token.value });
            }
          });

          PushNotifications.addListener("registrationError", (payload: unknown) => {
            const err = payload as { error?: string } | null;
            console.error("Notice: Registration error for push notifications:", err);
            resolve({ success: false, error: err?.error || "Registration failed" });
          });

          // Handle push notification received while app is open
          PushNotifications.addListener("pushNotificationReceived", (notification: unknown) => {
            console.log("Push notification received in foreground:", notification);
          });

          // Handle tap / click on notification in phone notification tray (Deep linking like Flipkart)
          PushNotifications.addListener("pushNotificationActionPerformed", (payload: unknown) => {
            const action = payload as { notification?: { data?: { url?: string; productId?: string } } } | null;
            const data = action?.notification?.data;
            if (data?.url) {
              window.location.assign(data.url);
            } else if (data?.productId) {
              window.location.assign(`/products/${data.productId}`);
            } else {
              window.location.assign("/notifications");
            }
          });

          // Fallback resolve after 4s if listener already fired
          setTimeout(() => {
            const cached = localStorage.getItem("zebalpha_fcm_token");
            if (cached) resolve({ success: true, token: cached });
          }, 4000);
        });
      }

      if (Capacitor.isNativePlatform()) {
        console.warn("Notice: Native notification bridge not attached yet.");
        return { success: false, error: "Native notification bridge unavailable" };
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Native push init error";
      console.warn("Notice initializing native push notifications:", err);
      return { success: false, error: message };
    }
  }

  // 2. WEB BROWSER / PWA (Web Notifications)
  if ("Notification" in window) {
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        return { success: true };
      }
      return { success: false, error: "Web notification permission not granted" };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Web notification error";
      return { success: false, error: message };
    }
  }

  return { success: false, error: "Push not supported on this platform" };
}

/**
 * Subscribes user to a specific New Drop Alert
 */
export async function subscribeToDropAlert(dropId: string, _dropTitle: string): Promise<boolean> {
  try {
    const initRes = await initPushNotifications();
    const token = initRes.token || localStorage.getItem("zebalpha_fcm_token");

    if (token) {
      await saveDeviceToken({
        token,
        platform: isNativeApp() ? "android" : "web",
        topics: ["all", "new_drops", `drop_${dropId}`],
      });
    }

    // Record locally
    const existing = JSON.parse(localStorage.getItem("vip_drop_subscriptions") || "[]");
    if (!existing.includes(dropId)) {
      existing.push(dropId);
      localStorage.setItem("vip_drop_subscriptions", JSON.stringify(existing));
    }
    return true;
  } catch (err) {
    console.warn("Notice in subscribeToDropAlert:", err);
    return false;
  }
}
