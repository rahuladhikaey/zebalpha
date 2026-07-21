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
      <div className="h-10 w-10 animate-pulse rounded-full bg-slate-100" />
    );
  }

  if (user) {
    // Show Profile and Logout
    return (
      <div className="flex items-center gap-3" ref={menuRef}>
        <div className="hidden flex-col items-end md:flex">
          <span className="text-xs font-bold text-slate-900">
            {user.user_metadata?.full_name || user.email?.split("@")[0]}
          </span>
          <span className="text-[10px] text-gray-500">Member 🌟</span>
        </div>
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            aria-label="User account menu"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-sm font-bold text-green-700 shadow-sm transition hover:bg-green-200"
          >
            {user.email?.[0].toUpperCase()}
          </button>
 
          {/* Dropdown Menu */}
          <div className={`absolute right-0 top-full mt-2 w-48 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-xl z-[60] transition-all origin-top-right ${isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}`}>
            <div className="border-b border-slate-50 p-4">
              <p className="text-sm font-bold text-slate-900 truncate">{user.email}</p>
              <p className="text-[10px] text-slate-600">Verified Customer</p>
            </div>
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 border-b border-slate-50"
            >
              View Profile
            </Link>
            <Link
              href="/profile/orders"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 border-b border-slate-50"
            >
              My Orders
            </Link>
            <Link
              href="/wishlist"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 border-b border-slate-50"
            >
              My Wishlist
            </Link>
            <button
              onClick={handleLogout}
              className="block w-full px-4 py-3 text-left text-sm font-semibold text-rose-700 hover:bg-rose-50"
            >
              Sign out
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
      className="flex items-center gap-2 text-[10px] md:text-sm font-black uppercase tracking-widest text-emerald-700 hover:bg-emerald-50 px-2 sm:px-4 py-2.5 rounded-xl transition-all border border-slate-100 bg-white shadow-sm"
    >
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
      <span className="hidden xs:inline">Login</span>
    </Link>
  );

}
