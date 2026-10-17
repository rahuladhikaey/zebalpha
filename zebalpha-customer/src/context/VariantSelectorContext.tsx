"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { Product } from "@/lib/types";

export interface VariantSelectorContextType {
  isOpen: boolean;
  product: Product | null;
  initialColor?: string;
  openVariantSelector: (product: Product, options?: { defaultColor?: string }) => void;
  closeVariantSelector: () => void;
}

const VariantSelectorContext = createContext<VariantSelectorContextType | undefined>(undefined);

export function VariantSelectorProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [initialColor, setInitialColor] = useState<string | undefined>(undefined);

  const openVariantSelector = useCallback((prod: Product, options?: { defaultColor?: string }) => {
    if (!prod) return;
    setProduct(prod);
    setInitialColor(options?.defaultColor);
    setIsOpen(true);
  }, []);

  const closeVariantSelector = useCallback(() => {
    setIsOpen(false);
    setProduct(null);
    setInitialColor(undefined);
  }, []);

  return (
    <VariantSelectorContext.Provider
      value={{
        isOpen,
        product,
        initialColor,
        openVariantSelector,
        closeVariantSelector,
      }}
    >
      {children}
    </VariantSelectorContext.Provider>
  );
}

export function useVariantSelector() {
  const context = useContext(VariantSelectorContext);
  if (!context) {
    throw new Error("useVariantSelector must be used within a VariantSelectorProvider");
  }
  return context;
}
