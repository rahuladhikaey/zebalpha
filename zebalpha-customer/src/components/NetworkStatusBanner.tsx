"use client";

import React, { useState, useEffect } from "react";
import { useNetworkAdaptive } from "@/hooks/useNetworkAdaptive";
import { WifiOff, Wifi, RefreshCw, X } from "lucide-react";

export function NetworkStatusBanner() {
  const { isOnline, isSlowConnection } = useNetworkAdaptive();
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowReconnected(false);
      setDismissed(false);
    } else if (wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
        setWasOffline(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const res = await fetch("/api/ping", { cache: "no-store" });
      if (res.ok) {
        setDismissed(true);
        window.location.reload();
      }
    } catch {
      // Still offline
    } finally {
      setRetrying(false);
    }
  };

  if (dismissed || (isOnline && !showReconnected && !isSlowConnection)) {
    return null;
  }

  return (
    <div className="fixed top-14 sm:top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-auto transition-all duration-300 px-3 max-w-[95vw]">
      {!isOnline && (
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-950/95 border border-red-500/50 text-red-400 text-[11px] font-bold shadow-2xl backdrop-blur-md whitespace-nowrap">
          <WifiOff className="w-3.5 h-3.5 animate-pulse text-red-400 shrink-0" />
          <span className="truncate">Offline mode: viewing cached catalog</span>
          <button
            onClick={handleRetry}
            disabled={retrying}
            className="ml-1 px-2 py-0.5 rounded-full bg-red-500/20 hover:bg-red-500/30 text-white text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-2.5 h-2.5 ${retrying ? "animate-spin" : ""}`} />
            <span>{retrying ? "..." : "Retry"}</span>
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-0.5 text-zinc-500 hover:text-white rounded-full cursor-pointer ml-0.5"
            aria-label="Dismiss"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {isOnline && showReconnected && (
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-950/95 border border-emerald-500/50 text-emerald-400 text-[11px] font-bold shadow-2xl backdrop-blur-md whitespace-nowrap">
          <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Connected: live inventory active</span>
        </div>
      )}
    </div>
  );
}

