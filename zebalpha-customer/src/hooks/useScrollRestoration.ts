"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Enterprise Scroll Position Preservation Hook (Flipkart & Meesho UX Pattern)
 * Preserves and restores scroll position when navigating between catalog feeds and product detail pages.
 */
export function useScrollRestoration(key?: string) {
  const pathname = usePathname();
  const storageKey = `scroll_pos_${key || pathname}`;
  const isRestoringRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Restore previously saved scroll position
    const savedY = sessionStorage.getItem(storageKey);
    if (savedY !== null) {
      const scrollY = parseInt(savedY, 10);
      if (!isNaN(scrollY) && scrollY > 0) {
        isRestoringRef.current = true;
        // Allow DOM to settle before jumping
        requestAnimationFrame(() => {
          window.scrollTo({ top: scrollY, behavior: "instant" });
          setTimeout(() => {
            isRestoringRef.current = false;
          }, 100);
        });
      }
    }

    // Save scroll position on scroll (throttled)
    let timeoutId: NodeJS.Timeout | null = null;
    const handleScroll = () => {
      if (isRestoringRef.current) return;
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        sessionStorage.setItem(storageKey, String(Math.round(window.scrollY)));
      }, 150);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [storageKey]);
}
