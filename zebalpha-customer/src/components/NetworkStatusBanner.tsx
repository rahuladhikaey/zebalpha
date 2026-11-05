"use client";

import React, { useState, useEffect } from "react";
import { useNetworkAdaptive } from "@/hooks/useNetworkAdaptive";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";

export function NetworkStatusBanner() {
  const { isOnline, isSlowConnection } = useNetworkAdaptive();
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true);
      setShowReconnected(false);
    } else if (wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
        setWasOffline(false);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (isOnline && !showReconnected && !isSlowConnection) {
    return null;
  }

  return (
    <div className="fixed top-1 left-1/2 -translate-x-1/2 z-50 pointer-events-auto transition-all duration-300">
      {!isOnline && (
        <div className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-zinc-900/95 border border-red-500/50 text-red-400 text-xs font-bold shadow-2xl backdrop-blur-md">
          <WifiOff className="w-3.5 h-3.5 animate-pulse text-red-400" />
          <span>You are offline. Showing cached products</span>
          <button
            onClick={() => window.location.reload()}
            className="ml-1 px-2 py-0.5 rounded-full bg-red-500/20 hover:bg-red-500/30 text-white text-[10px] font-black uppercase flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-2.5 h-2.5" /> Retry
          </button>
        </div>
      )}

      {isOnline && showReconnected && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/95 border border-emerald-500/50 text-emerald-400 text-xs font-bold shadow-2xl backdrop-blur-md">
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          <span>Back online. Live inventory reconnected</span>
        </div>
      )}
    </div>
  );
}
