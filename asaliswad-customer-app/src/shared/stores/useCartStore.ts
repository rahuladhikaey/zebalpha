import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../../config/supabaseClient";
import type { CartItem, Product } from "../types";

interface CartState {
  items: CartItem[];
  loading: boolean;
  loadCart: (userId?: string) => Promise<void>;
  addItem: (product: Product, quantity?: number, userId?: string) => Promise<void>;
  removeItem: (productId: string | number, userId?: string) => Promise<void>;
  updateQuantity: (productId: string | number, quantity: number, userId?: string) => Promise<void>;
  clearCart: (userId?: string) => Promise<void>;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  loading: false,

  loadCart: async (userId) => {
    set({ loading: true });
    try {
      if (userId) {
        // Sync local storage with DB first
        const localData = await AsyncStorage.getItem("asali_swad_cart");
        const localItems: CartItem[] = localData ? JSON.parse(localData) : [];

        if (localItems.length > 0) {
          for (const item of localItems) {
            await supabase.from("cart_items").upsert({
              user_id: userId,
              product_id: item.id,
              quantity: item.quantity,
            });
          }
          await AsyncStorage.removeItem("asali_swad_cart");
        }

        // Load cart items from DB
        const { data, error } = await supabase
          .from("cart_items")
          .select("*, product:products(*)")
          .eq("user_id", userId);

        if (data) {
          const fetchedItems: CartItem[] = data
            .filter((item: any) => item.product) // Filter out deleted products
            .map((item: any) => ({
              ...item.product,
              quantity: item.quantity,
            }));
          set({ items: fetchedItems, loading: false });
        } else {
          set({ items: [], loading: false });
        }
      } else {
        // Load cart items from local storage
        const localData = await AsyncStorage.getItem("asali_swad_cart");
        const localItems = localData ? JSON.parse(localData) : [];
        set({ items: localItems, loading: false });
      }
    } catch (e) {
      console.warn("Load cart error:", e);
      set({ loading: false });
    }
  },

  addItem: async (product, quantity = 1, userId) => {
    const currentItems = [...get().items];
    const existingIndex = currentItems.findIndex((item) => String(item.id) === String(product.id));

    if (existingIndex > -1) {
      currentItems[existingIndex].quantity += quantity;
    } else {
      currentItems.push({ ...product, quantity });
    }

    set({ items: currentItems });

    try {
      if (userId) {
        const itemQuantity = currentItems.find((item) => String(item.id) === String(product.id))?.quantity || 1;
        await supabase.from("cart_items").upsert({
          user_id: userId,
          product_id: product.id,
          quantity: itemQuantity,
        });
      } else {
        await AsyncStorage.setItem("asali_swad_cart", JSON.stringify(currentItems));
      }
    } catch (e) {
      console.warn("Add item to cart error:", e);
    }
  },

  removeItem: async (productId, userId) => {
    const updatedItems = get().items.filter((item) => String(item.id) !== String(productId));
    set({ items: updatedItems });

    try {
      if (userId) {
        await supabase
          .from("cart_items")
          .delete()
          .match({ user_id: userId, product_id: productId });
      } else {
        await AsyncStorage.setItem("asali_swad_cart", JSON.stringify(updatedItems));
      }
    } catch (e) {
      console.warn("Remove item from cart error:", e);
    }
  },

  updateQuantity: async (productId, quantity, userId) => {
    if (quantity <= 0) {
      await get().removeItem(productId, userId);
      return;
    }

    const currentItems = [...get().items];
    const index = currentItems.findIndex((item) => String(item.id) === String(productId));

    if (index > -1) {
      currentItems[index].quantity = quantity;
      set({ items: currentItems });

      try {
        if (userId) {
          await supabase.from("cart_items").upsert({
            user_id: userId,
            product_id: productId,
            quantity,
          });
        } else {
          await AsyncStorage.setItem("asali_swad_cart", JSON.stringify(currentItems));
        }
      } catch (e) {
        console.warn("Update cart quantity error:", e);
      }
    }
  },

  clearCart: async (userId) => {
    set({ items: [] });
    try {
      if (userId) {
        await supabase.from("cart_items").delete().eq("user_id", userId);
      } else {
        await AsyncStorage.removeItem("asali_swad_cart");
      }
    } catch (e) {
      console.warn("Clear cart error:", e);
    }
  },
}));
