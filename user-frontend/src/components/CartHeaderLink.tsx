"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

export function CartHeaderLink() {
  const { totalItems } = useCart();

  return (
    <Link href="/cart" aria-label="Shopping Cart" className="flex h-10 w-10 md:h-auto md:w-auto items-center md:gap-2 rounded-xl bg-emerald-600 md:px-4 md:py-2.5 text-sm font-black justify-center text-white transition hover:bg-emerald-700 relative shadow-lg shadow-emerald-600/20">
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 11-8 0m-3 9v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3a2 2 0 012-2h10a2 2 0 012 2z" />
      </svg>
      <span className="hidden md:inline uppercase tracking-widest text-[10px]">Cart</span>
      {totalItems > 0 && (
        <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-black text-white shadow-md ring-2 ring-white">
          {totalItems}
        </span>
      )}
    </Link>

  );
}
