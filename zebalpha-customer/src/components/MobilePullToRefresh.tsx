"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowDown, Check, RefreshCw } from "lucide-react";

interface MobilePullToRefreshProps {
  threshold?: number;
  maxPull?: number;
}

export function MobilePullToRefresh({
  threshold = 64,
  maxPull = 85,
}: MobilePullToRefreshProps) {
  const router = useRouter();
  let queryClient: ReturnType<typeof useQueryClient> | null = null;
  try {
    // Gracefully obtain query client if QueryProvider is mounted
    queryClient = useQueryClient();
  } catch (_) {
    queryClient = null;
  }

  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const isPullingRef = useRef(false);
  const hasVibratedRef = useRef(false);
  const isRefreshingRef = useRef(false);
  isRefreshingRef.current = isRefreshing;

  const triggerHaptic = useCallback((ms = 12) => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(ms);
      } catch (_) {}
    }
  }, []);

  const executeRefresh = useCallback(async () => {
    setIsRefreshing(true);
    setPullDistance(52); // Sits neatly in view while refreshing

    const startTime = Date.now();

    try {
      // 1. Next.js App Router server component revalidation
      router.refresh();

      // 2. React Query cache invalidation
      if (queryClient) {
        await queryClient.invalidateQueries();
      }

      // 3. Dispatch global custom event for any live components
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("zebalpha:pull-refresh"));
      }
    } catch (err) {
      console.warn("[PullToRefresh Notice]:", err);
    }

    // Ensure the animation has a smooth, natural minimum feel (700ms)
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, 700 - elapsed);
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }

    // Show brief success check
    setIsRefreshing(false);
    setIsSuccess(true);
    triggerHaptic(18);

    setTimeout(() => {
      setIsSuccess(false);
      setPullDistance(0);
      hasVibratedRef.current = false;
    }, 450);
  }, [router, queryClient, triggerHaptic]);

  useEffect(() => {
    // Only bind touch gestures on touch-capable environments
    if (typeof window === "undefined") return;

    const isElementScrollable = (el: HTMLElement | null): boolean => {
      let current = el;
      while (current && current !== document.body && current !== document.documentElement) {
        if (current.scrollTop > 0) return true;
        current = current.parentElement;
      }
      return false;
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (isRefreshingRef.current) return;

      // Only allow pull-to-refresh if page is at the absolute top
      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      if (scrollY > 3) {
        isPullingRef.current = false;
        return;
      }

      // Check if user is touching inside an internally-scrolled container
      if (isElementScrollable(e.target as HTMLElement)) {
        isPullingRef.current = false;
        return;
      }

      const touch = e.touches[0];
      startYRef.current = touch.clientY;
      startXRef.current = touch.clientX;
      isPullingRef.current = true;
      hasVibratedRef.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPullingRef.current || isRefreshingRef.current) return;

      const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
      if (scrollY > 3) {
        isPullingRef.current = false;
        setPullDistance(0);
        return;
      }

      const touch = e.touches[0];
      const diffY = touch.clientY - startYRef.current;
      const diffX = touch.clientX - startXRef.current;

      // If predominantly horizontal movement (e.g. carousels or tabs), abort pull
      if (Math.abs(diffX) > Math.abs(diffY)) {
        return;
      }

      // User pulling downwards from top
      if (diffY > 0) {
        // Apply smooth quadratic damping curve
        const damped = Math.min(maxPull, Math.pow(diffY, 0.78) * 1.7);

        // Cancel browser native pull-to-refresh reload
        if (e.cancelable && diffY > 8) {
          e.preventDefault();
        }

        setPullDistance(damped);

        if (damped >= threshold && !hasVibratedRef.current) {
          hasVibratedRef.current = true;
          triggerHaptic(12);
        } else if (damped < threshold && hasVibratedRef.current) {
          hasVibratedRef.current = false;
        }
      } else {
        setPullDistance(0);
      }
    };

    const handleTouchEnd = () => {
      if (!isPullingRef.current || isRefreshingRef.current) return;
      isPullingRef.current = false;

      setPullDistance((currentDistance) => {
        if (currentDistance >= threshold) {
          executeRefresh();
          return 52;
        }
        return 0;
      });
    };

    // Attach with { passive: false } to allow e.preventDefault() for native overscroll cancellation
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("touchcancel", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [threshold, maxPull, executeRefresh, triggerHaptic]);

  const isVisible = pullDistance > 0 || isRefreshing || isSuccess;
  const isPastThreshold = pullDistance >= threshold;

  if (!isVisible && pullDistance === 0) {
    return null;
  }

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-[90] pointer-events-none transition-transform ease-out"
      style={{
        top: 0,
        transform: `translate(-50%, ${pullDistance}px)`,
        transitionDuration: isPullingRef.current ? "0ms" : "280ms",
      }}
      aria-live="polite"
    >
      <div
        className={`flex items-center gap-2.5 px-4 py-2 rounded-full border shadow-2xl backdrop-blur-xl transition-all duration-200 ${
          isSuccess
            ? "bg-emerald-950/90 border-emerald-500/50 shadow-emerald-950/50 text-emerald-300"
            : isPastThreshold || isRefreshing
            ? "bg-zinc-950/95 border-emerald-500/40 shadow-emerald-900/30 text-emerald-400"
            : "bg-zinc-950/90 border-zinc-800 text-zinc-300 shadow-black/60"
        }`}
      >
        {/* Animated Icon State */}
        {isSuccess ? (
          <Check className="w-4 h-4 text-emerald-400 stroke-[2.5]" />
        ) : isRefreshing ? (
          <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
        ) : (
          <ArrowDown
            className={`w-4 h-4 transition-transform duration-200 ${
              isPastThreshold ? "rotate-180 text-emerald-400" : "text-zinc-400"
            }`}
            style={{
              transform: isPastThreshold
                ? "rotate(180deg)"
                : `rotate(${Math.min(180, (pullDistance / threshold) * 180)}deg)`,
            }}
          />
        )}

        {/* Text Status */}
        <span className="text-xs font-semibold tracking-wide select-none">
          {isSuccess
            ? "Updated"
            : isRefreshing
            ? "Refreshing ZebAlpha..."
            : isPastThreshold
            ? "Release to refresh"
            : "Pull to refresh"}
        </span>

        {/* Brand Dot */}
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isSuccess || isRefreshing || isPastThreshold
              ? "bg-emerald-400 animate-pulse"
              : "bg-zinc-500"
          }`}
        />
      </div>
    </div>
  );
}

