"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { CartItem, Product } from "@/lib/types";
import { useAuth } from "./AuthContext";
import { supabase } from "@/lib/supabaseClient";

type CartContextValue = {
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number, packageName?: string) => void;
  updateQuantity: (productId: number | string, quantity: number) => void;
  removeFromCart: (productId: number | string) => void;
  clearCart: () => void;
  totalItems: number;
  totalValue: number;
  loading: boolean;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

const STORAGE_KEY = "zebalpha_cart";
const LEGACY_STORAGE_KEY = "ecommerce_cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper to load guest cart from localStorage
  const getGuestCart = (): CartItem[] => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  // Helper to save guest cart to localStorage
  const saveGuestCart = (items: CartItem[]) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn("[Guest Cart Save Error]:", e);
    }
  };

  // Sync / Load Cart Function
  const loadAndMergeCart = useCallback(async () => {
    setLoading(true);
    const guestItems = getGuestCart();

    if (!user) {
      // Guest mode: validate with live products
      if (guestItems.length > 0) {
        try {
          const productIds = guestItems.map((item) => item.id);
          const { data: liveProducts } = await supabase
            .from("products")
            .select("*")
            .in("id", productIds);

          if (liveProducts && liveProducts.length > 0) {
            const validated = guestItems.map((item) => {
              const live = liveProducts.find((p) => p.id === item.id);
              if (live) {
                let livePrice = live.price;
                let liveMrp = live.mrp;
                if (item.name.includes(" - ") && live.packages) {
                  const pkgName = item.name.split(" - ")[1];
                  const pkg = live.packages.find((p: any) => p.name === pkgName);
                  if (pkg) {
                    livePrice = pkg.price;
                    liveMrp = pkg.mrp || live.mrp;
                  }
                }
                return {
                  ...item,
                  price: livePrice,
                  mrp: liveMrp,
                  stock: live.stock || 0,
                };
              }
              return item;
            });
            setCart(validated);
            saveGuestCart(validated);
            setLoading(false);
            return;
          }
        } catch (err) {
          console.warn("[Guest Cart Validation Notice]:", err);
        }
      }
      setCart(guestItems);
      setLoading(false);
      return;
    }

    // Authenticated User Mode: Fetch from Supabase public.cart_items
    try {
      const { data: dbCartRows, error: cartErr } = await supabase
        .from("cart_items")
        .select(`
          id,
          user_id,
          product_id,
          package_name,
          quantity,
          products (
            id,
            name,
            price,
            mrp,
            stock,
            image_url,
            images,
            packages
          )
        `)
        .eq("user_id", user.id);

      let currentDbItems: CartItem[] = [];

      if (dbCartRows && !cartErr) {
        currentDbItems = dbCartRows
          .filter((row: any) => row.products)
          .map((row: any) => {
            const p = row.products;
            let price = p.price;
            let mrp = p.mrp;
            let displayName = p.name;

            if (row.package_name && row.package_name !== "Standard" && p.packages) {
              const pkg = p.packages.find((pkgItem: any) => pkgItem.name === row.package_name);
              if (pkg) {
                price = pkg.price;
                mrp = pkg.mrp || p.mrp;
                displayName = `${p.name} - ${row.package_name}`;
              }
            }

            return {
              id: p.id,
              name: displayName,
              price: price,
              mrp: mrp,
              quantity: row.quantity,
              stock: p.stock ?? 100,
              image_url: p.image_url || p.images?.[0] || "",
              images: p.images || [],
            } as CartItem;
          });
      }

      // If guest items exist, merge deterministically into database
      if (guestItems.length > 0) {
        const mergedMap = new Map<string, CartItem>();

        // Populate with DB items first
        currentDbItems.forEach((it) => mergedMap.set(String(it.id), it));

        // Merge guest items
        for (const gItem of guestItems) {
          const key = String(gItem.id);
          const maxStock = gItem.stock ?? 100;
          if (mergedMap.has(key)) {
            const existing = mergedMap.get(key)!;
            const newQty = Math.min(existing.quantity + gItem.quantity, maxStock);
            mergedMap.set(key, { ...existing, quantity: newQty });

            // Update in Supabase
            await supabase
              .from("cart_items")
              .update({ quantity: newQty, updated_at: new Date().toISOString() })
              .eq("user_id", user.id)
              .eq("product_id", gItem.id);
          } else {
            mergedMap.set(key, gItem);
            // Insert in Supabase
            await supabase
              .from("cart_items")
              .upsert({
                user_id: user.id,
                product_id: gItem.id,
                package_name: gItem.name.includes(" - ") ? gItem.name.split(" - ")[1] : "Standard",
                quantity: Math.min(gItem.quantity, maxStock),
                updated_at: new Date().toISOString(),
              }, { onConflict: "user_id,product_id,package_name" });
          }
        }

        currentDbItems = Array.from(mergedMap.values());
        // Clean up guest local storage after successful merge
        if (typeof window !== "undefined") {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(LEGACY_STORAGE_KEY);
        }
      }

      setCart(currentDbItems);
    } catch (err) {
      console.warn("[Authenticated Cart Fetch Error]:", err);
      setCart(guestItems);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAndMergeCart();
  }, [loadAndMergeCart]);

  // Add To Cart Handler
  const addToCart = async (product: Product, quantity = 1, packageName = "Standard") => {
    const maxStock = product.stock ?? Infinity;
    if (maxStock <= 0) return;

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        const newQuantity = Math.min(existing.quantity + quantity, maxStock);
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: newQuantity } : item
        );
      }
      return [...prev, { ...product, quantity: Math.min(quantity, maxStock) }];
    });

    if (user) {
      try {
        const targetPkg = product.name.includes(" - ") ? product.name.split(" - ")[1] : packageName;
        const existingItem = cart.find((i) => i.id === product.id);
        const finalQty = existingItem ? Math.min(existingItem.quantity + quantity, maxStock) : Math.min(quantity, maxStock);

        await supabase.from("cart_items").upsert({
          user_id: user.id,
          product_id: product.id,
          package_name: targetPkg,
          quantity: finalQty,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,product_id,package_name" });
      } catch (err) {
        console.warn("[Cart DB Sync Error]:", err);
      }
    } else {
      const nextCart = (() => {
        const existing = cart.find((item) => item.id === product.id);
        if (existing) {
          return cart.map((item) =>
            item.id === product.id ? { ...item, quantity: Math.min(item.quantity + quantity, maxStock) } : item
          );
        }
        return [...cart, { ...product, quantity: Math.min(quantity, maxStock) }];
      })();
      saveGuestCart(nextCart);
    }
  };

  // Update Quantity Handler
  const updateQuantity = async (productId: number | string, quantity: number) => {
    const targetProduct = cart.find((i) => i.id === productId);
    const maxStock = targetProduct?.stock ?? Infinity;

    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const safeQty = Math.min(quantity, maxStock);

    setCart((prev) =>
      prev.map((item) => (item.id === productId ? { ...item, quantity: safeQty } : item))
    );

    if (user) {
      try {
        await supabase
          .from("cart_items")
          .update({ quantity: safeQty, updated_at: new Date().toISOString() })
          .eq("user_id", user.id)
          .eq("product_id", productId);
      } catch (err) {
        console.warn("[Cart DB Update Error]:", err);
      }
    } else {
      const nextCart = cart.map((item) => (item.id === productId ? { ...item, quantity: safeQty } : item));
      saveGuestCart(nextCart);
    }
  };

  // Remove Item Handler
  const removeFromCart = async (productId: number | string) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));

    if (user) {
      try {
        await supabase
          .from("cart_items")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", productId);
      } catch (err) {
        console.warn("[Cart DB Delete Error]:", err);
      }
    } else {
      const nextCart = cart.filter((item) => item.id !== productId);
      saveGuestCart(nextCart);
    }
  };

  // Clear Cart Handler
  const clearCart = async () => {
    setCart([]);

    if (user) {
      try {
        await supabase
          .from("cart_items")
          .delete()
          .eq("user_id", user.id);
      } catch (err) {
        console.warn("[Cart DB Clear Error]:", err);
      }
    } else {
      saveGuestCart([]);
    }
  };

  const totalItems = useMemo(
    () => cart.filter((item) => (item.stock ?? Infinity) > 0).reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const totalValue = useMemo(
    () => cart.filter((item) => (item.stock ?? Infinity) > 0).reduce((sum, item) => sum + item.quantity * item.price, 0),
    [cart]
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        totalItems,
        totalValue,
        loading,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
