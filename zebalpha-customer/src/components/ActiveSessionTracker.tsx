"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { getOrCreateRecommendationSessionId } from "@/lib/recommendationClient";
import { useIsNativeApp } from "@/lib/platform";

const SESSION_STORAGE_KEY = "zebalpha_client_session_id";
const HEARTBEAT_INTERVAL_MS = 300000; // 5 minutes (prevents redundant Supabase session writes at 500+ users)
const MIN_PING_GAP_MS = 120000; // Throttle rapid app/tab resume pings to at most once every 2 minutes

export function ActiveSessionTracker() {
  const { user } = useAuth();
  const isNative = useIsNativeApp();
  const sessionIdRef = useRef<string>("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPingAtRef = useRef<number>(0);
  const userRef = useRef(user);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    // 1. Initialize or restore unified cross-session visitor ID
    try {
      const storedId = getOrCreateRecommendationSessionId();
      if (storedId) {
        window.sessionStorage.setItem(SESSION_STORAGE_KEY, storedId);
        sessionIdRef.current = storedId;
      }
    } catch {
      sessionIdRef.current = `zba_mem_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
    }

    const sessionId = sessionIdRef.current;
    const platform = isNative ? "android" : "website";

    // 2. Ping function (throttled for normal pings so rapid mobile app-switching doesn't spam Supabase)
    const sendHeartbeat = async (action: "ping" | "end" = "ping", force = false) => {
      try {
        if (action === "ping" && !force) {
          const now = Date.now();
          if (now - lastPingAtRef.current < MIN_PING_GAP_MS) {
            return;
          }
          lastPingAtRef.current = now;
        }
        if (action === "end") {
          // Use sendBeacon for reliable delivery during page unload
          if (typeof navigator !== "undefined" && navigator.sendBeacon) {
            navigator.sendBeacon(`/api/analytics/heartbeat?action=end&sessionId=${encodeURIComponent(sessionId)}`);
            return;
          }
        }

        await fetch("/api/analytics/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: action === "end",
          body: JSON.stringify({
            sessionId,
            userId: userRef.current?.id || null,
            platform,
            action,
            deviceType: window.innerWidth < 768 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop"
          })
        });
      } catch {
        // Silently ignore ping network errors in client
      }
    };

    // 3. Immediate initial heartbeat
    sendHeartbeat("ping", true);

    // 4. Start recurring interval while tab is active
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      if (typeof document !== "undefined" && !document.hidden) {
        sendHeartbeat("ping");
      }
    }, HEARTBEAT_INTERVAL_MS);

    // 5. Visibility listeners: if returning to tab, send immediate heartbeat
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        sendHeartbeat("ping");
      }
    };

    // 6. Page unload listeners: send "end" only when tab is actually closing
    const handlePageHide = () => {
      sendHeartbeat("end");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handlePageHide);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handlePageHide);
    };
  }, [isNative]);

  // When user auth state resolves or changes, immediately sync session with userId
  useEffect(() => {
    if (user?.id && sessionIdRef.current) {
      const platform = isNative ? "android" : "website";
      fetch("/api/analytics/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionIdRef.current,
          userId: user.id,
          platform,
          action: "ping",
          deviceType: window.innerWidth < 768 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop"
        })
      }).catch(() => {});
    }
  }, [user?.id, isNative]);

  return null;
}
