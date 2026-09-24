"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Product } from "@/lib/types";
import { useAuth } from "./AuthContext";
import { supabase } from "@/lib/supabaseClient";

type WishlistContextType = {
  wishlist: Product[];
  addToWishlist: (product: Product) => void;
  removeFromWishlist: (productId: number | string) => void;
  isInWishlist: (productId: number | string) => boolean;
  toggleWishlist: (product: Product) => void;
  loading: boolean;
};

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

const STORAGE_KEY = "zebalpha_wishlist";
const LEGACY_STORAGE_KEY = "asali_swad_wishlist";

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper for guest wishlist storage
  const getGuestWishlist = (): Product[] => {
    if (typeof window === "undefined") return [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const saveGuestWishlist = (items: Product[]) => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn("[Guest Wishlist Save Error]:", e);
    }
  };

  // Load and merge wishlist
  const loadAndMergeWishlist = useCallback(async () => {
    setLoading(true);
    const guestItems = getGuestWishlist();

    if (!user) {
      setWishlist(guestItems);
      setLoading(false);
      return;
    }

    try {
      // Fetch authenticated user's wishlist from Supabase
      const { data: dbRows, error } = await supabase
        .from("wishlists")
        .select(`
          id,
          user_id,
          product_id,
          products (
            id,
            name,
            slug,
            description,
            price,
            mrp,
            stock,
            image_url,
            images,
            category_id,
            brand,
            packages
          )
        `)
        .eq("user_id", user.id);

      let currentDbItems: Product[] = [];
      if (dbRows && !error) {
        currentDbItems = dbRows
          .filter((row: any) => row.products)
          .map((row: any) => row.products as Product);
      }

      // Merge guest items if any
      if (guestItems.length > 0) {
        const mergedMap = new Map<string, Product>();
        currentDbItems.forEach((p) => mergedMap.set(String(p.id), p));

        for (const gProduct of guestItems) {
          const key = String(gProduct.id);
          if (!mergedMap.has(key)) {
            mergedMap.set(key, gProduct);
            // Insert into Supabase
            await supabase.from("wishlists").upsert(
              {
                user_id: user.id,
                product_id: gProduct.id,
                created_at: new Date().toISOString(),
              },
              { onConflict: "user_id,product_id" }
            );
          }
        }

        currentDbItems = Array.from(mergedMap.values());
        if (typeof window !== "undefined") {
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(LEGACY_STORAGE_KEY);
        }
      }

      setWishlist(currentDbItems);
    } catch (err) {
      console.warn("[Wishlist Sync Error]:", err);
      setWishlist(guestItems);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAndMergeWishlist();
  }, [loadAndMergeWishlist]);

  const addToWishlist = async (product: Product) => {
    setWishlist((prev) => {
      if (prev.find((p) => p.id === product.id)) return prev;
      return [...prev, product];
    });

    if (user) {
      try {
        await supabase.from("wishlists").upsert(
          {
            user_id: user.id,
            product_id: product.id,
            created_at: new Date().toISOString(),
          },
          { onConflict: "user_id,product_id" }
        );
      } catch (err) {
        console.warn("[Wishlist DB Upsert Error]:", err);
      }
    } else {
      const nextList = wishlist.find((p) => p.id === product.id) ? wishlist : [...wishlist, product];
      saveGuestWishlist(nextList);
    }
  };

  const removeFromWishlist = async (productId: number | string) => {
    setWishlist((prev) => prev.filter((p) => p.id !== productId));

    if (user) {
      try {
        await supabase
          .from("wishlists")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", productId);
      } catch (err) {
        console.warn("[Wishlist DB Delete Error]:", err);
      }
    } else {
      const nextList = wishlist.filter((p) => p.id !== productId);
      saveGuestWishlist(nextList);
    }
  };

  const isInWishlist = (productId: number | string) => {
    return wishlist.some((p) => p.id === productId);
  };

  const toggleWishlist = (product: Product) => {
    if (isInWishlist(product.id)) {
      removeFromWishlist(product.id);
    } else {
      addToWishlist(product);
    }
  };

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        addToWishlist,
        removeFromWishlist,
        isInWishlist,
        toggleWishlist,
        loading,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const context = useContext(WishlistContext);
  if (context === undefined) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
}
