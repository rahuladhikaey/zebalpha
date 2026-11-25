"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";

export interface GoAlphaCartItem {
  id: string; // go_alpha.products.id
  source_product_id: string;
  seller_id: string;
  title: string;
  image_url: string;
  price: number;
  mrp?: number | null;
  size?: string;
  color?: string;
  quantity: number;
  pickup_pincode: string;
}

export interface GoAlphaServiceability {
  serviceable: boolean;
  pincode: string;
  areaName: string;
  city: string;
  corridorName: string;
  loading: boolean;
  checked: boolean;
}

interface GoAlphaContextValue {
  pincode: string;
  serviceability: GoAlphaServiceability;
  setPincode: (pin: string) => Promise<void>;
  detectGpsPincode: () => Promise<{ ok: boolean; pincode?: string; error?: string }>;
  locationModalOpen: boolean;
  setLocationModalOpen: (open: boolean) => void;
  cart: GoAlphaCartItem[];
  cartCount: number;
  cartSubtotal: number;
  addToCart: (item: Omit<GoAlphaCartItem, "quantity">, qty?: number) => void;
  updateQty: (id: string, size: string | undefined, color: string | undefined, qty: number) => void;
  removeFromCart: (id: string, size?: string, color?: string) => void;
  clearCart: () => void;
  wishlistIds: string[];
  toggleWishlist: (goAlphaProductId: string) => Promise<void>;
  isWishlisted: (goAlphaProductId: string) => boolean;
}

const GoAlphaContext = createContext<GoAlphaContextValue | null>(null);

const CART_STORAGE_KEY = "go_alpha_cart_v1";
const PINCODE_STORAGE_KEY = "go_alpha_pincode_v1";
const WISHLIST_STORAGE_KEY = "go_alpha_wishlist_v1";

export function GoAlphaProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [pincode, setPincodeState] = useState<string>("700014");
  const [serviceability, setServiceability] = useState<GoAlphaServiceability>({
    serviceable: true,
    pincode: "700014",
    areaName: "Sealdah / Entally",
    city: "Kolkata",
    corridorName: "Sealdah-Krishnanagar",
    loading: false,
    checked: false,
  });
  const [cart, setCart] = useState<GoAlphaCartItem[]>([]);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);

  const checkPincode = useCallback(async (pin: string) => {
    const clean = pin.replace(/\D/g, "").slice(0, 6);
    if (clean.length !== 6) return;
    setServiceability((prev) => ({ ...prev, pincode: clean, loading: true }));
    try {
      const res = await fetch(`/api/go-alpha/pincode-check?pincode=${clean}`);
      const data = await res.json();
      setServiceability({
        serviceable: Boolean(data.serviceable),
        pincode: clean,
        areaName: data.area_name || "Unknown Area",
        city: data.city || "",
        corridorName: data.corridor_name || "",
        loading: false,
        checked: true,
      });
    } catch {
      setServiceability((prev) => ({ ...prev, loading: false, checked: true }));
    }
  }, []);

  // Hydrate isolated ZebQuick cart & pincode from localStorage
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) setCart(JSON.parse(savedCart));

      const savedPin = localStorage.getItem(PINCODE_STORAGE_KEY);
      if (savedPin && /^\d{6}$/.test(savedPin)) {
        setPincodeState(savedPin);
        void checkPincode(savedPin);
      } else {
        // Auto-attempt real GPS detection on first visit; fallback to Sealdah 700014
        void checkPincode("700014");
        if (typeof navigator !== "undefined" && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              try {
                const res = await fetch(
                  `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`
                );
                const data = await res.json();
                const pin = String(data?.address?.postcode || "").replace(/\D/g, "").slice(0, 6);
                if (pin.length === 6) {
                  setPincodeState(pin);
                  try {
                    localStorage.setItem(PINCODE_STORAGE_KEY, pin);
                  } catch {}
                  await checkPincode(pin);
                }
              } catch {}
            },
            () => {},
            { enableHighAccuracy: false, timeout: 6000 }
          );
        }
      }

      const savedW = localStorage.getItem(WISHLIST_STORAGE_KEY);
      if (savedW) setWishlistIds(JSON.parse(savedW));
    } catch {}
    setHydrated(true);
  }, [checkPincode]);

  // Persist cart
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {}
  }, [cart, hydrated]);

  // Sync ZebQuick wishlist from go_alpha.wishlists when signed in (SSO shared auth)
  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    (async () => {
      try {
        const { data } = await supabase
          .schema("go_alpha")
          .from("wishlists")
          .select("go_alpha_product_id")
          .eq("user_id", user.id);
        if (active && Array.isArray(data)) {
          const ids = data.map((r: any) => String(r.go_alpha_product_id));
          setWishlistIds(ids);
          try {
            localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(ids));
          } catch {}
        }
      } catch {}
    })();
    return () => {
      active = false;
    };
  }, [user?.id]);

  const setPincode = useCallback(
    async (pin: string) => {
      const clean = pin.replace(/\D/g, "").slice(0, 6);
      if (clean.length !== 6) return;
      setPincodeState(clean);
      try {
        localStorage.setItem(PINCODE_STORAGE_KEY, clean);
      } catch {}
      await checkPincode(clean);
    },
    [checkPincode]
  );

  const detectGpsPincode = useCallback(async () => {
    const reverseLookup = async (lat: number, lng: number) => {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
      );
      const data = await res.json();
      const pin = String(data?.address?.postcode || "").replace(/\D/g, "").slice(0, 6);
      if (pin.length === 6) {
        await setPincode(pin);
        return { ok: true, pincode: pin };
      }
      return { ok: false, error: "Could not detect 6-digit pincode from GPS" };
    };

    const nativeBridge = typeof window !== "undefined" ? (window as any).ZebAlphaNative : null;
    if (nativeBridge?.requestLocationAndFetch) {
      return new Promise<{ ok: boolean; pincode?: string; error?: string }>((resolve) => {
        let done = false;
        const timer = window.setTimeout(() => {
          if (done) return;
          done = true;
          window.removeEventListener("zebalpha:native-location", handler);
          resolve({ ok: false, error: "Please turn ON phone GPS & allow Location permission" });
        }, 10000);

        const handler = async (ev: any) => {
          if (done) return;
          done = true;
          window.clearTimeout(timer);
          window.removeEventListener("zebalpha:native-location", handler);
          const detail = ev?.detail || {};
          if (detail.granted === false) {
            resolve({ ok: false, error: "Location permission denied. Allow Location in App Settings." });
            return;
          }
          if (typeof detail.lat === "number" && typeof detail.lng === "number") {
            try {
              resolve(await reverseLookup(detail.lat, detail.lng));
            } catch {
              resolve({ ok: false, error: "Failed to resolve pincode from GPS" });
            }
          } else {
            resolve({ ok: false, error: detail.error || "Please turn ON phone GPS / Location" });
          }
        };

        window.addEventListener("zebalpha:native-location", handler);
        try {
          nativeBridge.requestLocationAndFetch();
        } catch {
          window.clearTimeout(timer);
          window.removeEventListener("zebalpha:native-location", handler);
          resolve({ ok: false, error: "Unable to open location prompt" });
        }
      });
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return { ok: false, error: "Location not supported on this device" };
    }
    return new Promise<{ ok: boolean; pincode?: string; error?: string }>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            resolve(await reverseLookup(pos.coords.latitude, pos.coords.longitude));
          } catch {
            resolve({ ok: false, error: "Failed to resolve pincode from coordinates" });
          }
        },
        () => resolve({ ok: false, error: "Location permission denied" }),
        { enableHighAccuracy: false, timeout: 8000 }
      );
    });
  }, [setPincode]);

  const addToCart = useCallback((item: Omit<GoAlphaCartItem, "quantity">, qty = 1) => {
    setCart((prev) => {
      const idx = prev.findIndex(
        (c) => c.id === item.id && (c.size || "") === (item.size || "") && (c.color || "") === (item.color || "")
      );
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + qty };
        return next;
      }
      return [...prev, { ...item, quantity: qty }];
    });
  }, []);

  const updateQty = useCallback(
    (id: string, size: string | undefined, color: string | undefined, qty: number) => {
      setCart((prev) =>
        qty <= 0
          ? prev.filter((c) => !(c.id === id && (c.size || "") === (size || "") && (c.color || "") === (color || "")))
          : prev.map((c) =>
              c.id === id && (c.size || "") === (size || "") && (c.color || "") === (color || "")
                ? { ...c, quantity: qty }
                : c
            )
      );
    },
    []
  );

  const removeFromCart = useCallback((id: string, size?: string, color?: string) => {
    setCart((prev) =>
      prev.filter((c) => !(c.id === id && (c.size || "") === (size || "") && (c.color || "") === (color || "")))
    );
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const toggleWishlist = useCallback(
    async (goAlphaProductId: string) => {
      const exists = wishlistIds.includes(goAlphaProductId);
      const next = exists
        ? wishlistIds.filter((x) => x !== goAlphaProductId)
        : [...wishlistIds, goAlphaProductId];
      setWishlistIds(next);
      try {
        localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(next));
      } catch {}

      if (user?.id) {
        try {
          if (exists) {
            await supabase
              .schema("go_alpha")
              .from("wishlists")
              .delete()
              .eq("user_id", user.id)
              .eq("go_alpha_product_id", goAlphaProductId);
          } else {
            await supabase
              .schema("go_alpha")
              .from("wishlists")
              .insert({ user_id: user.id, go_alpha_product_id: goAlphaProductId });
          }
        } catch {}
      }
    },
    [wishlistIds, user?.id]
  );

  const isWishlisted = useCallback((id: string) => wishlistIds.includes(id), [wishlistIds]);

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const cartSubtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);

  return (
    <GoAlphaContext.Provider
      value={{
        pincode,
        serviceability,
        setPincode,
        detectGpsPincode,
        locationModalOpen,
        setLocationModalOpen,
        cart,
        cartCount,
        cartSubtotal,
        addToCart,
        updateQty,
        removeFromCart,
        clearCart,
        wishlistIds,
        toggleWishlist,
        isWishlisted,
      }}
    >
      {children}
    </GoAlphaContext.Provider>
  );
}

export function useGoAlpha() {
  const ctx = useContext(GoAlphaContext);
  if (!ctx) {
    throw new Error("useGoAlpha must be used inside GoAlphaProvider");
  }
  return ctx;
}
