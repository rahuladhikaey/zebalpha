"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";

export interface ZebQuickCartItem {
  id: string; // zeb_quick.products.id
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

export interface ZebQuickServiceability {
  serviceable: boolean;
  pincode: string;
  areaName: string;
  city: string;
  corridorName: string;
  loading: boolean;
  checked: boolean;
}

export interface ZebQuickMainCategory {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  image_url?: string | null;
  theme_color?: string | null;
}

export interface ZebQuickSubcategory {
  id: string;
  slug: string;
  name: string;
  category_group: string;
  image_url?: string | null;
  is_featured?: boolean | null;
}

interface ZebQuickContextValue {
  pincode: string;
  serviceability: ZebQuickServiceability;
  setPincode: (pin: string) => Promise<void>;
  detectGpsPincode: () => Promise<{ ok: boolean; pincode?: string; error?: string }>;
  locationModalOpen: boolean;
  setLocationModalOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedMainCategory: string;
  setSelectedMainCategory: (cat: string) => void;
  mainCategories: ZebQuickMainCategory[];
  subcategories: ZebQuickSubcategory[];
  cart: ZebQuickCartItem[];
  cartCount: number;
  cartSubtotal: number;
  addToCart: (item: Omit<ZebQuickCartItem, "quantity">, qty?: number) => void;
  updateQty: (id: string, size: string | undefined, color: string | undefined, qty: number) => void;
  removeFromCart: (id: string, size?: string, color?: string) => void;
  clearCart: () => void;
  wishlistIds: string[];
  toggleWishlist: (zebQuickProductId: string) => Promise<void>;
  isWishlisted: (zebQuickProductId: string) => boolean;
  activeProduct: any | null;
  openProductDetail: (product: any) => void;
  closeProductDetail: () => void;
  returnWindowDays: number;
}

const ZebQuickContext = createContext<ZebQuickContextValue | null>(null);

const CART_STORAGE_KEY = "zeb_quick_cart_v1";
const PINCODE_STORAGE_KEY = "zeb_quick_pincode_v1";
const WISHLIST_STORAGE_KEY = "zeb_quick_wishlist_v1";

export function ZebQuickProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [pincode, setPincodeState] = useState<string>("700014");
  const [serviceability, setServiceability] = useState<ZebQuickServiceability>({
    serviceable: true,
    pincode: "700014",
    areaName: "Sealdah / Entally",
    city: "Kolkata",
    corridorName: "Sealdah-Krishnanagar",
    loading: false,
    checked: false,
  });
  const [cart, setCart] = useState<ZebQuickCartItem[]>([]);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMainCategory, setSelectedMainCategory] = useState<string>("All");
  const [mainCategories, setMainCategories] = useState<ZebQuickMainCategory[]>([]);
  const [subcategories, setSubcategories] = useState<ZebQuickSubcategory[]>([]);
  const [activeProduct, setActiveProduct] = useState<any | null>(null);
  const [returnWindowDays, setReturnWindowDays] = useState<number>(5);

  useEffect(() => {
    fetch("/api/zeb-quick/categories")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.mainCategories)) setMainCategories(d.mainCategories);
        if (Array.isArray(d.subcategories)) setSubcategories(d.subcategories);
        if (typeof d.returnWindowDays === "number") setReturnWindowDays(d.returnWindowDays);
      })
      .catch(() => {});
  }, []);

  const checkPincode = useCallback(async (pin: string) => {
    const clean = pin.replace(/\D/g, "").slice(0, 6);
    if (clean.length !== 6) return;
    setServiceability((prev) => ({ ...prev, pincode: clean, loading: true }));
    try {
      const res = await fetch(`/api/zeb-quick/pincode-check?pincode=${clean}`);
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

  // Sync ZebQuick wishlist from zeb_quick.wishlists when signed in (SSO shared auth)
  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    (async () => {
      try {
        const { data } = await supabase
          .schema("zeb_quick")
          .from("wishlists")
          .select("zeb_quick_product_id")
          .eq("user_id", user.id);
        if (active && Array.isArray(data)) {
          const ids = data.map((r: any) => String(r.zeb_quick_product_id));
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

  const addToCart = useCallback((item: Omit<ZebQuickCartItem, "quantity">, qty = 1) => {
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
    async (zebQuickProductId: string) => {
      const exists = wishlistIds.includes(zebQuickProductId);
      const next = exists
        ? wishlistIds.filter((x) => x !== zebQuickProductId)
        : [...wishlistIds, zebQuickProductId];
      setWishlistIds(next);
      try {
        localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(next));
      } catch {}

      if (user?.id) {
        try {
          if (exists) {
            await supabase
              .schema("zeb_quick")
              .from("wishlists")
              .delete()
              .eq("user_id", user.id)
              .eq("zeb_quick_product_id", zebQuickProductId);
          } else {
            await supabase
              .schema("zeb_quick")
              .from("wishlists")
              .insert({ user_id: user.id, zeb_quick_product_id: zebQuickProductId });
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
    <ZebQuickContext.Provider
      value={{
        pincode,
        serviceability,
        setPincode,
        detectGpsPincode,
        locationModalOpen,
        setLocationModalOpen,
        searchQuery,
        setSearchQuery,
        selectedMainCategory,
        setSelectedMainCategory,
        mainCategories,
        subcategories,
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
        activeProduct,
        openProductDetail: (product: any) => setActiveProduct(product),
        closeProductDetail: () => setActiveProduct(null),
        returnWindowDays,
      }}
    >
      {children}
    </ZebQuickContext.Provider>
  );
}

export function useZebQuick() {
  const ctx = useContext(ZebQuickContext);
  if (!ctx) {
    throw new Error("useZebQuick must be used inside ZebQuickProvider");
  }
  return ctx;
}
