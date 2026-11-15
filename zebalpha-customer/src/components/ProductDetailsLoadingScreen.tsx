"use client";

import React, { useCallback, useContext, useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import { QueryClientContext } from "@tanstack/react-query";
import { RefreshCw, WifiOff, AlertCircle } from "lucide-react";
import {
  cancelProductNavigation,
  completeProductNavigation,
  extractProductIdFromHref,
  failProductNavigation,
  findPreloadImageUrlFromQueryClient,
  getProductNavigationState,
  hasFreshCachedProductDetail,
  preloadProductImage,
  PRODUCT_NAVIGATION_TIMEOUT_MS,
  startProductNavigation,
  subscribeProductNavigation,
  toRelativeHref,
  type ProductNavErrorReason,
  type ProductNavigationState,
} from "@/lib/productDetailCache";

const SERVER_IDLE_SNAPSHOT: ProductNavigationState = {
  status: "idle",
  isFadingOut: false,
  productId: null,
  targetHref: null,
  errorReason: null,
  startedAt: 0,
  requestSeq: 0,
};

function getServerNavigationSnapshot(): ProductNavigationState {
  return SERVER_IDLE_SNAPSHOT;
}

export interface ProductDetailsLoadingScreenProps {
  status?: "loading" | "error";
  errorReason?: ProductNavErrorReason;
  onRetry?: () => void;
  onBack?: () => void;
  fadingOut?: boolean;
}

/**
 * Full-screen Flipkart-inspired Product Details loading & error recovery surface.
 * Preserves pure white (#FFFFFF) canvas across Web & Android themes, respects edge-to-edge
 * system safe areas, and renders only a centered ZebAlpha brand green (#059669) circular spinner
 * while loading.
 */
export function ProductDetailsLoadingScreen({
  status = "loading",
  errorReason = null,
  onRetry,
  onBack,
  fadingOut = false,
}: ProductDetailsLoadingScreenProps) {
  const safeAreaStyle: React.CSSProperties = {
    backgroundColor: "#FFFFFF",
    backgroundImage: "none",
    paddingTop: "env(safe-area-inset-top, 0px)",
    paddingBottom: "env(safe-area-inset-bottom, 0px)",
    paddingLeft: "env(safe-area-inset-left, 0px)",
    paddingRight: "env(safe-area-inset-right, 0px)",
    overscrollBehavior: "contain",
  };

  if (status === "error") {
    const isOffline = errorReason === "offline";
    const isTimeout = errorReason === "timeout";
    const headline = isOffline
      ? "You're offline"
      : isTimeout
      ? "Taking longer than expected"
      : "Couldn't load product";
    const description = isOffline
      ? "Check your internet connection and tap retry to open this product."
      : isTimeout
      ? "Your connection seems slow right now. Please tap retry to try again."
      : "Something went wrong while fetching product details. Please try again.";

    return (
      <div
        data-pure-white-loading="true"
        role="alertdialog"
        aria-live="assertive"
        aria-label={headline}
        style={safeAreaStyle}
        className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-[#FFFFFF] px-6 text-center text-[#111111]"
      >
        <div className="w-full max-w-xs flex flex-col items-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-[#059669]">
            {isOffline ? <WifiOff className="h-6 w-6" /> : <AlertCircle className="h-6 w-6" />}
          </div>

          <h2 className="text-lg font-bold tracking-tight text-zinc-900">{headline}</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-500">{description}</p>

          <div className="mt-6 flex w-full flex-col gap-2.5">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#059669] px-5 py-3 text-sm font-semibold text-white shadow-sm transition active:scale-[0.98] hover:bg-[#047857]"
              >
                <RefreshCw className="h-4 w-4" />
                Retry
              </button>
            )}
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="inline-flex w-full items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 transition active:scale-[0.98] hover:bg-zinc-50"
              >
                Go Back
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-pure-white-loading="true"
      role="progressbar"
      aria-busy="true"
      aria-label="Loading product details"
      style={{
        ...safeAreaStyle,
        touchAction: "none",
      }}
      className={`fixed inset-0 z-[90] flex items-center justify-center bg-[#FFFFFF] transition-opacity duration-150 ease-out ${
        fadingOut ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"
      }`}
    >
      <svg
        viewBox="0 0 48 48"
        fill="none"
        aria-hidden="true"
        className="zebalpha-pdp-spinner-svg h-11 w-11"
      >
        <circle
          cx="24"
          cy="24"
          r="19"
          stroke="#059669"
          strokeWidth="3.75"
          strokeLinecap="round"
          className="zebalpha-pdp-spinner-circle"
        />
      </svg>
    </div>
  );
}

/**
 * Coordinates global instant-tap loading across every `/products/[productId]` link and
 * programmatic navigation entrypoint, cache-hit bypass, hero image preloading, offline
 * detection, and slow-network timeout recovery.
 */
export function ProductNavigationOverlay() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useContext(QueryClientContext);

  const navState = useSyncExternalStore(
    subscribeProductNavigation,
    getProductNavigationState,
    getServerNavigationSnapshot
  );

  const prevPathnameRef = useRef<string | null>(pathname);

  // Dismiss overlay cleanly if route navigates away to a non-product page
  useEffect(() => {
    const previousPath = prevPathnameRef.current;
    prevPathnameRef.current = pathname;

    if (
      previousPath !== pathname &&
      navState.status !== "idle" &&
      pathname &&
      !pathname.startsWith("/products/")
    ) {
      cancelProductNavigation();
    }
  }, [pathname, navState.status]);

  // Listen for every `/products/[productId]` link click across cards, search, banners, etc.
  useEffect(() => {
    const resolveProductTarget = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return null;
      }

      const rawTarget = event.target as HTMLElement | null;
      const anchor = rawTarget?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return null;

      const rawHref = anchor.getAttribute("href");
      if (!rawHref) return null;

      const targetProductId = extractProductIdFromHref(rawHref, window.location.origin);
      if (!targetProductId) return null;

      const currentProductId = extractProductIdFromHref(window.location.pathname);
      if (currentProductId && currentProductId.toLowerCase() === targetProductId.toLowerCase()) {
        return null;
      }

      return { anchor, rawHref, rawTarget, targetProductId };
    };

    // Intercept doomed offline hard navigations before Next.js triggers a WebView reload
    const handleCaptureOffline = (event: MouseEvent) => {
      if (typeof navigator === "undefined" || navigator.onLine !== false) return;
      const resolved = resolveProductTarget(event);
      if (!resolved) return;

      const { anchor, rawHref, rawTarget, targetProductId } = resolved;
      if (hasFreshCachedProductDetail(targetProductId)) return;

      const nestedInteractive = rawTarget?.closest(
        'button, [role="button"], input, select, textarea'
      );
      if (nestedInteractive && anchor.contains(nestedInteractive)) return;

      event.preventDefault();
      event.stopPropagation();
      startProductNavigation(targetProductId, {
        targetHref: toRelativeHref(anchor.href || rawHref),
        isOffline: true,
      });
    };

    // Show full-screen white + ZebAlpha green spinner cleanly when online links are tapped
    const handleBubbleClick = (event: MouseEvent) => {
      const resolved = resolveProductTarget(event);
      if (!resolved) return;

      const { anchor, rawHref, targetProductId } = resolved;
      const preloadImageUrl = findPreloadImageUrlFromQueryClient(queryClient, targetProductId);
      if (preloadImageUrl) {
        void preloadProductImage(preloadImageUrl);
      }

      if (hasFreshCachedProductDetail(targetProductId)) {
        return;
      }

      const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;
      startProductNavigation(targetProductId, {
        targetHref: toRelativeHref(anchor.href || rawHref),
        isOffline,
      });
    };

    window.addEventListener("click", handleCaptureOffline, true);
    window.addEventListener("click", handleBubbleClick, false);
    return () => {
      window.removeEventListener("click", handleCaptureOffline, true);
      window.removeEventListener("click", handleBubbleClick, false);
    };
  }, [queryClient]);

  // Watchdog timeout & live connectivity checks while loading is in flight
  useEffect(() => {
    if (navState.status !== "loading") return;

    const activeSeq = navState.requestSeq;
    const timeoutId = window.setTimeout(() => {
      const reason =
        typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "timeout";
      failProductNavigation(reason, activeSeq);
    }, PRODUCT_NAVIGATION_TIMEOUT_MS);

    const handleOffline = () => {
      failProductNavigation("offline", activeSeq);
    };

    window.addEventListener("offline", handleOffline);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("offline", handleOffline);
    };
  }, [navState.status, navState.requestSeq]);

  // Immediately clear any loader / retry overlay when user navigates back via hardware/browser Back
  useEffect(() => {
    const handlePopState = () => {
      cancelProductNavigation();
    };
    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const handleRetry = useCallback(() => {
    const productId = navState.productId;
    const targetHref =
      navState.targetHref || (productId ? `/products/${encodeURIComponent(productId)}` : null);
    if (!productId || !targetHref) {
      cancelProductNavigation();
      return;
    }

    const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;
    startProductNavigation(productId, { targetHref, isOffline });
    if (isOffline) return;

    const activeRouteProductId = pathname ? extractProductIdFromHref(pathname) : null;
    if (activeRouteProductId && activeRouteProductId.toLowerCase() === productId.toLowerCase()) {
      router.refresh();
    } else {
      router.push(targetHref);
    }
  }, [navState.productId, navState.targetHref, pathname, router]);

  const handleBack = useCallback(() => {
    cancelProductNavigation();
    if (pathname && pathname.startsWith("/products/")) {
      if (window.history.length > 1) {
        router.back();
      } else {
        router.push("/");
      }
    }
  }, [pathname, router]);

  if (navState.status === "idle" && !navState.isFadingOut) {
    return null;
  }

  if (navState.status === "error") {
    return (
      <ProductDetailsLoadingScreen
        status="error"
        errorReason={navState.errorReason}
        onRetry={handleRetry}
        onBack={handleBack}
      />
    );
  }

  return <ProductDetailsLoadingScreen status="loading" fadingOut={navState.isFadingOut} />;
}

/**
 * Dismisses the active Product Details loading overlay when the server resolves `!product`
 * so deleted or unavailable products render cleanly instead of hanging on a spinner.
 */
export function ProductNotFoundSignal({ productId }: { productId?: string }) {
  useEffect(() => {
    completeProductNavigation(productId);
  }, [productId]);

  return null;
}
