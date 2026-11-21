"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  DEFAULT_FIRST_ORDER_OFFER,
  FirstOrderOfferConfig,
  normalizeFirstOrderConfig,
  normalizeIndianPhone,
} from "@/lib/firstOrderOffer";

interface UseFirstOrderOfferOptions {
  phone?: string | null;
  paymentMethod?: "COD" | "ONLINE";
}

interface UseFirstOrderOfferReturn {
  config: FirstOrderOfferConfig;
  eligible: boolean;
  alreadyOrdered: boolean;
  reason: string | null;
  loading: boolean;
}

const MEMORY_CACHE = new Map<
  string,
  {
    config: FirstOrderOfferConfig;
    eligible: boolean;
    alreadyOrdered: boolean;
    reason: string | null;
    ts: number;
  }
>();

const CACHE_TTL_MS = 45_000;

export function clearFirstOrderOfferCache() {
  MEMORY_CACHE.clear();
}

export function useFirstOrderOffer(
  options: UseFirstOrderOfferOptions = {}
): UseFirstOrderOfferReturn {
  const { user, profile, loading: authLoading } = useAuth();
  const explicitPhone = normalizeIndianPhone(options.phone);
  const profilePhone = normalizeIndianPhone(
    profile?.phone_no || (user?.user_metadata?.phone as string | undefined)
  );
  const effectivePhone = explicitPhone || profilePhone;
  const userId = user?.id || "";
  const paymentMethod = options.paymentMethod || "";

  const cacheKey = `${userId}|${effectivePhone}|${paymentMethod}`;
  const cachedEntry = MEMORY_CACHE.get(cacheKey);
  const isCacheFresh =
    Boolean(cachedEntry) && Date.now() - (cachedEntry?.ts || 0) < CACHE_TTL_MS;

  const [state, setState] = useState<UseFirstOrderOfferReturn>(() => {
    if (isCacheFresh && cachedEntry) {
      return {
        config: cachedEntry.config,
        eligible: cachedEntry.eligible,
        alreadyOrdered: cachedEntry.alreadyOrdered,
        reason: cachedEntry.reason,
        loading: false,
      };
    }
    return {
      config: DEFAULT_FIRST_ORDER_OFFER,
      eligible: false,
      alreadyOrdered: false,
      reason: null,
      loading: true,
    };
  });

  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (authLoading) return;

    const currentCached = MEMORY_CACHE.get(cacheKey);
    if (currentCached && Date.now() - currentCached.ts < CACHE_TTL_MS) {
      setState({
        config: currentCached.config,
        eligible: currentCached.eligible,
        alreadyOrdered: currentCached.alreadyOrdered,
        reason: currentCached.reason,
        loading: false,
      });
      return;
    }

    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    const params = new URLSearchParams();
    if (userId) params.set("userId", userId);
    if (effectivePhone) params.set("phone", effectivePhone);
    if (paymentMethod) params.set("paymentMethod", paymentMethod);

    fetch(`/api/first-order-offer?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!json?.success) return;
        const normalizedConfig = normalizeFirstOrderConfig(json.config);
        const nextPayload = {
          config: normalizedConfig,
          eligible: Boolean(json.eligible),
          alreadyOrdered: Boolean(json.alreadyOrdered),
          reason: typeof json.reason === "string" ? json.reason : null,
          ts: Date.now(),
        };
        MEMORY_CACHE.set(cacheKey, nextPayload);
        setState({
          config: nextPayload.config,
          eligible: nextPayload.eligible,
          alreadyOrdered: nextPayload.alreadyOrdered,
          reason: nextPayload.reason,
          loading: false,
        });
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setState((prev) => ({ ...prev, loading: false }));
      });

    return () => {
      controller.abort();
    };
  }, [authLoading, cacheKey, userId, effectivePhone, paymentMethod]);

  return state;
}
