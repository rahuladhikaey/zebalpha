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

export interface StoredZebQuickAddress {
  label: "Home" | "Work" | "Hotel" | "Other";
  name: string;
  phone: string;
  city: string;
  areaStreet: string;
  houseLine: string;
  buildingName?: string;
  landmark?: string;
  pincode: string;
}

export type LocationGateMode = "closed" | "permission" | "manual";
export type GpsPermissionState = "unknown" | "granted" | "denied";

interface ZebQuickContextValue {
  pincode: string;
  hasLocation: boolean;
  locationLabel: string;
  gpsPermissionState: GpsPermissionState;
  locationGateMode: LocationGateMode;
  setLocationGateMode: (mode: LocationGateMode) => void;
  serviceability: ZebQuickServiceability;
  setPincode: (pin: string, customLabel?: string) => Promise<void>;
  detectGpsPincode: () => Promise<{ ok: boolean; pincode?: string; label?: string; error?: string }>;
  locationModalOpen: boolean;
  setLocationModalOpen: (open: boolean) => void;
  savedAddresses: StoredZebQuickAddress[];
  activeAddress: StoredZebQuickAddress | null;
  saveZebQuickAddress: (addr: StoredZebQuickAddress) => Promise<void>;
  selectSavedAddress: (addr: StoredZebQuickAddress) => Promise<void>;
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
const PINCODE_STORAGE_KEY = "zeb_quick_pincode_v2";
const LOCATION_LABEL_STORAGE_KEY = "zeb_quick_location_label_v1";
const ADDRESS_STORAGE_KEY = "zeb_quick_saved_address_v1";
const ADDRESSES_LIST_STORAGE_KEY = "zeb_quick_saved_addresses_v1";
const WISHLIST_STORAGE_KEY = "zeb_quick_wishlist_v1";

function formatAddressDisplayLabel(addr: StoredZebQuickAddress): string {
  const shortPlace = [addr.areaStreet, addr.houseLine].filter(Boolean).join(", ");
  return `${addr.label.toUpperCase()} - ${shortPlace || addr.city || addr.pincode}`;
}

export function ZebQuickProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  // ZERO hardcoded default pincode — user must confirm live GPS or select manually like Blinkit
  const [pincode, setPincodeState] = useState<string>("");
  const [locationLabel, setLocationLabel] = useState<string>("");
  const [gpsPermissionState, setGpsPermissionState] = useState<GpsPermissionState>("unknown");
  const [locationGateMode, setLocationGateMode] = useState<LocationGateMode>("closed");
  const [serviceability, setServiceability] = useState<ZebQuickServiceability>({
    serviceable: false,
    pincode: "",
    areaName: "",
    city: "",
    corridorName: "",
    loading: false,
    checked: false,
  });
  const [savedAddresses, setSavedAddresses] = useState<StoredZebQuickAddress[]>([]);
  const [activeAddress, setActiveAddress] = useState<StoredZebQuickAddress | null>(null);
  const [cart, setCart] = useState<ZebQuickCartItem[]>([]);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);
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
    if (clean.length !== 6) return null;
    setServiceability((prev) => ({ ...prev, pincode: clean, loading: true }));
    try {
      const res = await fetch(`/api/zeb-quick/pincode-check?pincode=${clean}`);
      const data = await res.json();
      const next: ZebQuickServiceability = {
        serviceable: Boolean(data.serviceable),
        pincode: clean,
        areaName: data.area_name || "",
        city: data.city || "",
        corridorName: data.corridor_name || "",
        loading: false,
        checked: true,
      };
      setServiceability(next);
      return next;
    } catch {
      setServiceability((prev) => ({ ...prev, loading: false, checked: true }));
      return null;
    }
  }, []);

  const setPincode = useCallback(
    async (pin: string, customLabel?: string) => {
      const clean = pin.replace(/\D/g, "").slice(0, 6);
      if (clean.length !== 6) return;
      setPincodeState(clean);
      try {
        localStorage.setItem(PINCODE_STORAGE_KEY, clean);
      } catch {}

      const result = await checkPincode(clean);
      const resolvedLabel =
        (customLabel || "").trim() ||
        (result?.areaName
          ? `${result.areaName}${result.city ? `, ${result.city}` : ""}`
          : `Pincode ${clean}`);
      setLocationLabel(resolvedLabel);
      try {
        localStorage.setItem(LOCATION_LABEL_STORAGE_KEY, resolvedLabel);
      } catch {}
      setLocationGateMode("closed");
    },
    [checkPincode]
  );

  const reverseLookupAndApply = useCallback(
    async (lat: number, lng: number): Promise<{ ok: boolean; pincode?: string; label?: string; error?: string }> => {
      let pin = "";
      let streetLabel = "";

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
          { signal: AbortSignal.timeout(6000) }
        );
        if (res.ok) {
          const data = await res.json();
          const addr = data?.address || {};
          pin = String(addr.postcode || "").replace(/\D/g, "").slice(0, 6);
          const placeParts = [
            addr.road || addr.neighbourhood || addr.suburb || addr.hamlet || addr.village,
            addr.city || addr.town || addr.county || addr.state_district,
          ]
            .map((x) => String(x || "").trim())
            .filter(Boolean);
          streetLabel = Array.from(new Set(placeParts)).slice(0, 2).join(", ");
        }
      } catch {
        // Fallback to server nearest-pincode lookup below
      }

      if (pin.length !== 6) {
        try {
          const nearRes = await fetch(`/api/zeb-quick/pincode-check?lat=${lat}&lng=${lng}`);
          const nearData = await nearRes.json();
          const nearPin = String(nearData?.pincode || "").replace(/\D/g, "").slice(0, 6);
          if (nearPin.length === 6) {
            pin = nearPin;
            if (!streetLabel && nearData.area_name) {
              streetLabel = `${nearData.area_name}${nearData.city ? `, ${nearData.city}` : ""}`;
            }
          }
        } catch {}
      }

      if (pin.length === 6) {
        setGpsPermissionState("granted");
        await setPincode(pin, streetLabel || undefined);
        return { ok: true, pincode: pin, label: streetLabel || undefined };
      }

      return { ok: false, error: "Could not detect pincode from your GPS. Please select location manually." };
    },
    [setPincode]
  );

  const detectGpsPincode = useCallback(async () => {
    const nativeBridge = typeof window !== "undefined" ? (window as any).ZebAlphaNative : null;
    if (nativeBridge?.requestLocationAndFetch) {
      return new Promise<{ ok: boolean; pincode?: string; label?: string; error?: string }>((resolve) => {
        let done = false;
        const timer = window.setTimeout(() => {
          if (done) return;
          done = true;
          window.removeEventListener("zebalpha:native-location", handler);
          setGpsPermissionState("denied");
          resolve({ ok: false, error: "Please turn ON phone GPS & allow Location permission" });
        }, 10000);

        const handler = async (ev: any) => {
          if (done) return;
          done = true;
          window.clearTimeout(timer);
          window.removeEventListener("zebalpha:native-location", handler);
          const detail = ev?.detail || {};
          if (detail.granted === false) {
            setGpsPermissionState("denied");
            resolve({ ok: false, error: "Location permission denied. Enable Location or select manually." });
            return;
          }
          if (typeof detail.lat === "number" && typeof detail.lng === "number") {
            try {
              resolve(await reverseLookupAndApply(detail.lat, detail.lng));
            } catch {
              resolve({ ok: false, error: "Failed to resolve address from GPS" });
            }
          } else {
            setGpsPermissionState("denied");
            resolve({ ok: false, error: detail.error || "Please turn ON phone GPS / Location" });
          }
        };

        window.addEventListener("zebalpha:native-location", handler);
        try {
          nativeBridge.requestLocationAndFetch();
        } catch {
          window.clearTimeout(timer);
          window.removeEventListener("zebalpha:native-location", handler);
          setGpsPermissionState("denied");
          resolve({ ok: false, error: "Unable to open location prompt" });
        }
      });
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGpsPermissionState("denied");
      return { ok: false, error: "Device location is not supported. Please select manually." };
    }

    return new Promise<{ ok: boolean; pincode?: string; label?: string; error?: string }>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            resolve(await reverseLookupAndApply(pos.coords.latitude, pos.coords.longitude));
          } catch {
            resolve({ ok: false, error: "Failed to resolve address from GPS" });
          }
        },
        () => {
          setGpsPermissionState("denied");
          resolve({ ok: false, error: "Location permission not enabled. Tap Enable or select manually." });
        },
        { enableHighAccuracy: true, timeout: 9000 }
      );
    });
  }, [reverseLookupAndApply]);

  // Hydrate isolated ZebQuick cart, saved addresses & confirmed location from localStorage
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) setCart(JSON.parse(savedCart));

      // Load saved address list (migrating legacy single address if present)
      const listRaw = localStorage.getItem(ADDRESSES_LIST_STORAGE_KEY);
      const singleRaw = localStorage.getItem(ADDRESS_STORAGE_KEY);
      let loadedList: StoredZebQuickAddress[] = [];
      let loadedSingle: StoredZebQuickAddress | null = null;
      if (listRaw) {
        const parsed = JSON.parse(listRaw);
        if (Array.isArray(parsed)) loadedList = parsed.filter((a) => a?.pincode);
      }
      if (singleRaw) {
        const parsed = JSON.parse(singleRaw) as StoredZebQuickAddress;
        if (parsed?.houseLine && parsed?.pincode) {
          loadedSingle = parsed;
          const exists = loadedList.some(
            (a) => a.pincode === parsed.pincode && a.houseLine === parsed.houseLine && a.label === parsed.label
          );
          if (!exists) loadedList = [parsed, ...loadedList];
        }
      }
      setSavedAddresses(loadedList);
      setActiveAddress(loadedSingle || loadedList[0] || null);

      const savedPin = localStorage.getItem(PINCODE_STORAGE_KEY);
      const savedLbl = localStorage.getItem(LOCATION_LABEL_STORAGE_KEY) || "";
      if (savedPin && /^\d{6}$/.test(savedPin)) {
        setPincodeState(savedPin);
        if (savedLbl) setLocationLabel(savedLbl);
        void checkPincode(savedPin);
        setLocationGateMode("closed");
      } else {
        // First visit (no user-confirmed location yet): NEVER show a hardcoded default pincode!
        // Open Blinkit-style Location Permission modal immediately.
        setLocationGateMode("permission");

        // If browser geolocation permission is already granted silently, auto-detect live location
        if (typeof navigator !== "undefined" && (navigator as any).permissions?.query) {
          (navigator as any).permissions
            .query({ name: "geolocation" })
            .then((permStatus: any) => {
              if (permStatus?.state === "granted") {
                setGpsPermissionState("granted");
                void detectGpsPincode();
              } else if (permStatus?.state === "denied") {
                setGpsPermissionState("denied");
              }
            })
            .catch(() => {});
        }
      }

      const savedW = localStorage.getItem(WISHLIST_STORAGE_KEY);
      if (savedW) setWishlistIds(JSON.parse(savedW));
    } catch {
      setLocationGateMode("permission");
    }
    setHydrated(true);
  }, [checkPincode, detectGpsPincode]);

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

  const saveZebQuickAddress = useCallback(
    async (addr: StoredZebQuickAddress) => {
      setActiveAddress(addr);
      setSavedAddresses((prev) => {
        const filtered = prev.filter(
          (a) => !(a.label === addr.label && a.houseLine === addr.houseLine && a.pincode === addr.pincode)
        );
        const next = [addr, ...filtered].slice(0, 8);
        try {
          localStorage.setItem(ADDRESSES_LIST_STORAGE_KEY, JSON.stringify(next));
          localStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(addr));
        } catch {}
        return next;
      });
      await setPincode(addr.pincode, formatAddressDisplayLabel(addr));
    },
    [setPincode]
  );

  const selectSavedAddress = useCallback(
    async (addr: StoredZebQuickAddress) => {
      setActiveAddress(addr);
      try {
        localStorage.setItem(ADDRESS_STORAGE_KEY, JSON.stringify(addr));
      } catch {}
      await setPincode(addr.pincode, formatAddressDisplayLabel(addr));
    },
    [setPincode]
  );

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

  const locationModalOpen = locationGateMode !== "closed";
  const setLocationModalOpen = useCallback((open: boolean) => {
    setLocationGateMode(open ? "manual" : "closed");
  }, []);

  return (
    <ZebQuickContext.Provider
      value={{
        pincode,
        hasLocation: pincode.length === 6,
        locationLabel,
        gpsPermissionState,
        locationGateMode,
        setLocationGateMode,
        serviceability,
        setPincode,
        detectGpsPincode,
        locationModalOpen,
        setLocationModalOpen,
        savedAddresses,
        activeAddress,
        saveZebQuickAddress,
        selectSavedAddress,
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
