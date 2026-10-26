"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type ZebalphaTheme = "default" | "diwali_premium";

interface ThemeContextType {
  theme: ZebalphaTheme;
  isDiwali: boolean;
  setTheme: (theme: ZebalphaTheme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "default",
  isDiwali: false,
  setTheme: () => {},
  toggleTheme: () => {},
});

const THEME_STORAGE_KEY = "zebalpha_active_theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Always default to 'default' (original production UI/UX)
  const [theme, setThemeState] = useState<ZebalphaTheme>("default");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // 1. Check environment variable override
    const envTheme = process.env.NEXT_PUBLIC_ACTIVE_THEME as ZebalphaTheme;
    // 2. Check local storage
    const storedTheme = typeof window !== "undefined" ? (localStorage.getItem(THEME_STORAGE_KEY) as ZebalphaTheme) : null;
    
    // Priority: Local storage -> Env variable -> Default ('default')
    const initialTheme: ZebalphaTheme = storedTheme || envTheme || "default";
    applyThemeClass(initialTheme);
    setThemeState(initialTheme);
  }, []);

  const applyThemeClass = (targetTheme: ZebalphaTheme) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    const body = document.body;

    if (targetTheme === "diwali_premium") {
      root.classList.remove("theme-default");
      body.classList.remove("theme-default");
      root.classList.add("theme-diwali-premium");
      body.classList.add("theme-diwali-premium");
    } else {
      root.classList.remove("theme-diwali-premium");
      body.classList.remove("theme-diwali-premium");
      root.classList.add("theme-default");
      body.classList.add("theme-default");
    }
  };

  const setTheme = (newTheme: ZebalphaTheme) => {
    setThemeState(newTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    }
    applyThemeClass(newTheme);
  };

  const toggleTheme = () => {
    const next = theme === "default" ? "diwali_premium" : "default";
    setTheme(next);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDiwali: theme === "diwali_premium",
        setTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
