"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { CartItem, Product } from "@/lib/types";

type CartContextValue = {
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  removeFromCart: (productId: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalValue: number;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

const STORAGE_KEY = "ecommerce_cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSynced, setIsSynced] = useState(false);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored) {
      try {
        setCart(JSON.parse(stored));
      } catch {
        setCart([]);
      }
    }
  }, []);

  useEffect(() => {
    if (isSynced || cart.length === 0) return;
    const syncCartWithLiveDB = async () => {
      const { supabase } = await import("@/lib/supabaseClient");
      const productIds = cart.map(item => item.id);
      const { data, error } = await supabase.from('products').select('*').in('id', productIds);
      
      if (data && !error) {
        setCart(prev => prev.map(item => {
          const live = data.find(p => p.id === item.id);
          if (live) {
            let livePrice = live.price;
            let liveMrp = live.mrp;
            
            if (item.name.includes(' - ') && live.packages) {
              const pkgName = item.name.split(' - ')[1];
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
              stock: live.stock || 0
            };
          }
          return { ...item, stock: 0 };
        }));
      }
      setIsSynced(true);
    };
    
    syncCartWithLiveDB();
  }, [cart, isSynced]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    }
  }, [cart]);

  const addToCart = (product: Product, quantity = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        const newQuantity = existing.quantity + quantity;
        const maxStock = product.stock ?? Infinity;
        if (newQuantity > maxStock) {
          alert(`Only ${maxStock} items left in stock!`);
        }
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: Math.min(newQuantity, maxStock) }
            : item
        );
      }
      const maxStock = product.stock ?? Infinity;
      if (quantity > maxStock) {
        alert(`Only ${maxStock} items left in stock!`);
      }
      return [...prev, { ...product, quantity: Math.min(quantity, maxStock) }];
    });
  };

  const updateQuantity = (productId: number, quantity: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === productId) {
            const maxStock = item.stock ?? Infinity;
            if (quantity > maxStock) {
              alert(`Only ${maxStock} items left in stock!`);
            }
            return { ...item, quantity: Math.min(Math.max(1, quantity), maxStock) };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const clearCart = () => setCart([]);

  const totalItems = useMemo(
    () => cart.filter(item => (item.stock ?? Infinity) > 0).reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const totalValue = useMemo(
    () => cart.filter(item => (item.stock ?? Infinity) > 0).reduce((sum, item) => sum + item.quantity * item.price, 0),
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
