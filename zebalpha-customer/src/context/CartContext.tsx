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
import { isProductNewDrop, isDropLive } from "@/lib/dropUtils";

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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper to load guest cart from localStorage
  const getGuestCart = (): CartItem[] => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
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
            let selectedColor = "";
            let selectedSize = "";
            let selectedSku = "";
            let selectedImage = p.image_url || p.images?.[0] || "";
            let variantId = "";

            if (row.package_name && row.package_name !== "Standard" && p.packages) {
              const pkg = p.packages.find(
                (pkgItem: any) =>
                  pkgItem.name === row.package_name ||
                  pkgItem.id === row.package_name ||
                  (pkgItem.color && pkgItem.size && `${pkgItem.color} / ${pkgItem.size}` === row.package_name)
              );
              if (pkg) {
                price = pkg.price;
                mrp = pkg.mrp || p.mrp;
                displayName = `${p.name} (${pkg.name})`;
                selectedColor = pkg.color || "";
                selectedSize = pkg.size || "";
                selectedSku = pkg.sku || "";
                selectedImage = pkg.image_url || selectedImage;
                variantId = pkg.id;
              } else {
                displayName = `${p.name} (${row.package_name})`;
              }
            }

            const itemKey = `${p.id}_${variantId || row.package_name || "Standard"}`;

            return {
              id: p.id,
              cart_item_key: itemKey,
              package_name: row.package_name || "Standard",
              variant_id: variantId,
              selected_color: selectedColor,
              selected_size: selectedSize,
              selected_sku: selectedSku,
              selected_image: selectedImage,
              name: displayName,
              price: price,
              mrp: mrp,
              quantity: row.quantity,
              stock: p.stock ?? 100,
              image_url: selectedImage,
              images: p.images || [],
            } as CartItem;
          });
      }

      // If guest items exist, merge deterministically into database in a single batch
      if (guestItems.length > 0) {
        const mergedMap = new Map<string, CartItem>();

        // Populate with DB items first
        currentDbItems.forEach((it) => {
          const k = it.cart_item_key || `${it.id}_${it.package_name || "Standard"}`;
          mergedMap.set(k, it);
        });

        const batchUpsertMap = new Map<string, any>();
        const nowIso = new Date().toISOString();

        // Merge guest items
        for (const gItem of guestItems) {
          const pkgName =
            gItem.package_name ||
            (gItem.name.includes(" - ")
              ? gItem.name.split(" - ")[1]
              : gItem.name.includes(" (")
              ? gItem.name.split(" (")[1].replace(")", "")
              : "Standard");
          const key = gItem.cart_item_key || `${gItem.id}_${gItem.variant_id || pkgName}`;
          const maxStock = gItem.stock ?? 100;
          const conflictKey = `${user.id}_${gItem.id}_${pkgName}`;

          let finalQty = gItem.quantity;
          if (mergedMap.has(key)) {
            const existing = mergedMap.get(key)!;
            finalQty = Math.min(existing.quantity + gItem.quantity, maxStock);
            mergedMap.set(key, { ...existing, quantity: finalQty });
          } else {
            finalQty = Math.min(gItem.quantity, maxStock);
            mergedMap.set(key, { ...gItem, cart_item_key: key, package_name: pkgName, quantity: finalQty });
          }

          batchUpsertMap.set(conflictKey, {
            user_id: user.id,
            product_id: gItem.id,
            package_name: pkgName,
            quantity: finalQty,
            updated_at: nowIso,
          });
        }

        const itemsToUpsert = Array.from(batchUpsertMap.values());
        if (itemsToUpsert.length > 0) {
          const { error: batchErr } = await supabase
            .from("cart_items")
            .upsert(itemsToUpsert, { onConflict: "user_id,product_id,package_name" });

          if (batchErr) {
            console.warn("[Cart Batch Sync Error]:", batchErr);
          } else {
            // Clean up guest local storage ONLY after successful database synchronization
            if (typeof window !== "undefined") {
              localStorage.removeItem(STORAGE_KEY);
            }
          }
        }

        currentDbItems = Array.from(mergedMap.values());
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
    // Block adding unreleased upcoming drops to cart before their drop date
    if (isProductNewDrop(product) && !isDropLive(product)) {
      console.warn("[Cart Notice]: Product is an upcoming drop and cannot be added to cart until release date.");
      return;
    }

    const maxStock = product.stock ?? Infinity;
    if (maxStock <= 0) return;

    const prodAny = product as any;
    const targetPkg =
      prodAny.package_name ||
      (product.name.includes(" - ")
        ? product.name.split(" - ")[1]
        : product.name.includes(" (")
        ? product.name.split(" (")[1].replace(")", "")
        : packageName);

    const itemKey =
      prodAny.cart_item_key ||
      `${product.id}_${prodAny.variant_id || targetPkg}`;

    const colorVal = prodAny.selected_color || (targetPkg.includes(" / ") ? targetPkg.split(" / ")[0] : "");
    const sizeVal = prodAny.selected_size || (targetPkg.includes(" / ") ? targetPkg.split(" / ")[1] : "");
    const imgVal = prodAny.selected_image || product.image_url || product.images?.[0] || "";

    const itemToAdd: CartItem = {
      ...product,
      cart_item_key: itemKey,
      package_name: targetPkg,
      variant_id: prodAny.variant_id || "",
      selected_color: colorVal,
      selected_size: sizeVal,
      selected_sku: prodAny.selected_sku || prodAny.sku || "",
      selected_image: imgVal,
      image_url: imgVal,
      quantity: Math.min(quantity, maxStock),
    };

    setCart((prev) => {
      const existingIdx = prev.findIndex(
        (item) =>
          item.cart_item_key === itemKey ||
          (String(item.id) === String(product.id) && (item.package_name || "Standard") === targetPkg)
      );

      if (existingIdx >= 0) {
        const existing = prev[existingIdx];
        const newQuantity = Math.min(existing.quantity + quantity, maxStock);
        const updated = [...prev];
        updated[existingIdx] = { ...existing, ...itemToAdd, quantity: newQuantity };
        return updated;
      }
      return [...prev, itemToAdd];
    });

    if (user) {
      try {
        const existingItem = cart.find(
          (i) =>
            i.cart_item_key === itemKey ||
            (String(i.id) === String(product.id) && (i.package_name || "Standard") === targetPkg)
        );
        const finalQty = existingItem
          ? Math.min(existingItem.quantity + quantity, maxStock)
          : Math.min(quantity, maxStock);

        await supabase.from("cart_items").upsert(
          {
            user_id: user.id,
            product_id: product.id,
            package_name: targetPkg,
            quantity: finalQty,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,product_id,package_name" }
        );
      } catch (err) {
        console.warn("[Cart DB Sync Error]:", err);
      }
    } else {
      const nextCart = (() => {
        const existingIdx = cart.findIndex(
          (item) =>
            item.cart_item_key === itemKey ||
            (String(item.id) === String(product.id) && (item.package_name || "Standard") === targetPkg)
        );
        if (existingIdx >= 0) {
          const existing = cart[existingIdx];
          const updated = [...cart];
          updated[existingIdx] = {
            ...existing,
            ...itemToAdd,
            quantity: Math.min(existing.quantity + quantity, maxStock),
          };
          return updated;
        }
        return [...cart, itemToAdd];
      })();
      saveGuestCart(nextCart);
    }
  };

  // Update Quantity Handler
  const updateQuantity = async (keyOrId: number | string, quantity: number) => {
    const targetProduct = cart.find(
      (i) => i.cart_item_key === keyOrId || String(i.id) === String(keyOrId)
    );
    const maxStock = targetProduct?.stock ?? Infinity;

    if (quantity <= 0) {
      removeFromCart(keyOrId);
      return;
    }

    const safeQty = Math.min(quantity, maxStock);

    setCart((prev) =>
      prev.map((item) =>
        item.cart_item_key === keyOrId || (targetProduct && item.cart_item_key === targetProduct.cart_item_key) || String(item.id) === String(keyOrId)
          ? { ...item, quantity: safeQty }
          : item
      )
    );

    if (user && targetProduct) {
      try {
        await supabase
          .from("cart_items")
          .update({ quantity: safeQty, updated_at: new Date().toISOString() })
          .eq("user_id", user.id)
          .eq("product_id", targetProduct.id)
          .eq("package_name", targetProduct.package_name || "Standard");
      } catch (err) {
        console.warn("[Cart DB Update Error]:", err);
      }
    } else {
      const nextCart = cart.map((item) =>
        item.cart_item_key === keyOrId || (targetProduct && item.cart_item_key === targetProduct.cart_item_key) || String(item.id) === String(keyOrId)
          ? { ...item, quantity: safeQty }
          : item
      );
      saveGuestCart(nextCart);
    }
  };

  // Remove Item Handler
  const removeFromCart = async (keyOrId: number | string) => {
    const targetItem = cart.find(
      (i) => i.cart_item_key === keyOrId || String(i.id) === String(keyOrId)
    );

    setCart((prev) =>
      prev.filter(
        (item) =>
          item.cart_item_key !== keyOrId &&
          (!targetItem || item.cart_item_key !== targetItem.cart_item_key) &&
          String(item.id) !== String(keyOrId)
      )
    );

    if (user && targetItem) {
      try {
        await supabase
          .from("cart_items")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", targetItem.id)
          .eq("package_name", targetItem.package_name || "Standard");
      } catch (err) {
        console.warn("[Cart DB Delete Error]:", err);
      }
    } else {
      const nextCart = cart.filter(
        (item) =>
          item.cart_item_key !== keyOrId &&
          (!targetItem || item.cart_item_key !== targetItem.cart_item_key) &&
          String(item.id) !== String(keyOrId)
      );
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
