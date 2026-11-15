"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useParams, useRouter } from "next/navigation";
import { ProductDetailsLoadingScreen } from "@/components/ProductDetailsLoadingScreen";
import {
  cancelProductNavigation,
  completeProductNavigation,
  startProductNavigation,
} from "@/lib/productDetailCache";

function subscribeConnectivity(onChange: () => void) {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function getOnlineSnapshot() {
  return typeof navigator === "undefined" ? true : navigator.onLine !== false;
}

function getOnlineServerSnapshot() {
  return true;
}

export default function ProductDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  const params = useParams<{ productId?: string | string[] }>();
  const rawId = Array.isArray(params?.productId) ? params.productId[0] : params?.productId;
  const productId = rawId ? decodeURIComponent(String(rawId)) : "";
  const isOnline = useSyncExternalStore(
    subscribeConnectivity,
    getOnlineSnapshot,
    getOnlineServerSnapshot
  );

  useEffect(() => {
    // Clear any underlying click transition overlay so a single crisp Retry surface appears
    completeProductNavigation(productId || undefined);
  }, [error, productId]);

  const handleRetry = () => {
    if (!isOnline) return;

    if (productId) {
      startProductNavigation(productId, {
        targetHref: `/products/${encodeURIComponent(productId)}`,
      });
    }
    reset();
    router.refresh();
  };

  const handleBack = () => {
    cancelProductNavigation();
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <ProductDetailsLoadingScreen
      status="error"
      errorReason={!isOnline ? "offline" : "failed"}
      onRetry={handleRetry}
      onBack={handleBack}
    />
  );
}
