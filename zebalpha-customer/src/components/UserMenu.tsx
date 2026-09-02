"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";

export default function UserMenu() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);
    await signOut();
    router.refresh();
  };

  if (loading) {
    return (
      <div className="h-9 w-9 animate-pulse rounded-full bg-neutral-800" />
    );
  }

  if (user) {
    return (
      <div className="flex items-center gap-2 sm:gap-3" ref={menuRef}>
        <div className="hidden flex-col items-end md:flex">
          <span className="text-xs font-black text-white">
            {user.user_metadata?.full_name || user.email?.split("@")[0]}
          </span>
          <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-widest">VIP Member ✦</span>
        </div>
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            aria-label="User account menu"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-black text-xs font-black shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:bg-neutral-200 transition-all active:scale-95"
          >
            {user.email?.[0].toUpperCase()}
          </button>
 
          {/* Dropdown Menu */}
          <div className={`absolute right-0 top-full mt-2 w-52 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-950 text-white shadow-2xl z-[60] transition-all origin-top-right ${isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}`}>
            <div className="border-b border-neutral-800 p-4 bg-black">
              <p className="text-xs font-black text-white truncate">{user.email}</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 mt-0.5">Verified Account</p>
            </div>
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2.5 text-xs font-bold text-neutral-300 hover:text-white hover:bg-neutral-900 border-b border-neutral-900 transition-colors"
            >
              Profile Details
            </Link>
            <Link
              href="/profile/orders"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2.5 text-xs font-bold text-neutral-300 hover:text-white hover:bg-neutral-900 border-b border-neutral-900 transition-colors"
            >
              Order History
            </Link>
            <Link
              href="/wishlist"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2.5 text-xs font-bold text-neutral-300 hover:text-white hover:bg-neutral-900 border-b border-neutral-900 transition-colors"
            >
              Saved Items
            </Link>
            <button
              onClick={handleLogout}
              className="block w-full px-4 py-2.5 text-left text-xs font-bold text-neutral-400 hover:text-white hover:bg-neutral-900 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }
 
  // Show Login Link
  return (
    <Link
      href="/login"
      aria-label="Login to account"
      className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-black bg-white hover:bg-neutral-200 px-3 sm:px-4 py-2 rounded-xl transition-all shadow-md active:scale-95"
    >
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
      <span className="hidden xs:inline">Sign In</span>
    </Link>
  );
}
