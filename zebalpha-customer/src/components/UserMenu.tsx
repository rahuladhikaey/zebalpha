"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";

export default function UserMenu() {
  const { user, profile, loading, signOut } = useAuth();
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
      <div className="h-10 w-10 rounded-2xl bg-[#FFFDF7]/60 animate-pulse shrink-0" />
    );
  }

  if (user) {
    const displayName =
      profile?.full_name ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "User";
    const avatarUrl =
      profile?.avatar_url ||
      user.user_metadata?.avatar_url ||
      user.user_metadata?.picture;

    return (
      <div className="flex items-center gap-2 sm:gap-2.5" ref={menuRef}>
        <div className="hidden flex-col items-end md:flex" data-photo-overlay="true">
          <span className="text-xs font-black text-white truncate max-w-[115px] drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
            {displayName}
          </span>
          <span className="text-[9px] font-black text-[#FFE68B] uppercase tracking-widest drop-shadow-[0_1px_1px_rgba(0,0,0,0.28)]">
            VIP Member ✦
          </span>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="User account menu"
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-b from-[#FFFDF7] to-[#F5E4B7] border border-[#DFBC5E]/80 text-[#14120F] text-xs font-black shadow-[0_3px_10px_rgba(160,115,20,0.18)] hover:border-[#C28D12] transition-all active:scale-95 overflow-hidden cursor-pointer"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              (displayName[0] || user.email?.[0] || "U").toUpperCase()
            )}
          </button>

          {/* Warm Ivory & Gold Dropdown Menu */}
          <div
            className={`absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-2xl border border-[#DFBE6F] bg-[#FFFDF8] text-[#14120F] shadow-[0_16px_40px_rgba(120,85,15,0.22)] z-[70] transition-all origin-top-right ${
              isOpen ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
            }`}
          >
            <div className="border-b border-[#EFE1BE] p-4 bg-gradient-to-r from-[#FFF9E3] to-[#FFFDF8]">
              <p className="text-xs font-black text-[#14120F] truncate">{user.email}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-[#9A6503] mt-0.5">
                Verified Account
              </p>
            </div>
            <Link
              href="/profile"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2.5 text-xs font-bold text-[#2B2419] hover:text-[#14120F] hover:bg-[#FFF6D6] border-b border-[#F5E8C3]/70 transition-colors"
            >
              Profile Details
            </Link>
            <Link
              href="/profile/orders"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2.5 text-xs font-bold text-[#2B2419] hover:text-[#14120F] hover:bg-[#FFF6D6] border-b border-[#F5E8C3]/70 transition-colors"
            >
              Order History
            </Link>
            <Link
              href="/wishlist"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2.5 text-xs font-bold text-[#2B2419] hover:text-[#14120F] hover:bg-[#FFF6D6] border-b border-[#F5E8C3]/70 transition-colors"
            >
              Saved Items
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="block w-full px-4 py-2.5 text-left text-xs font-bold text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Official Cream-Gold Sign In Button
  return (
    <Link
      href="/login"
      aria-label="Login to account"
      className="flex h-10 items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-[#14120F] bg-gradient-to-b from-[#FFFDF7] to-[#F5E4B7] border border-[#DFBC5E]/80 hover:border-[#C28D12] px-3 sm:px-3.5 rounded-2xl transition-all shadow-[0_3px_10px_rgba(160,115,20,0.16)] active:scale-95"
    >
      <svg className="h-3.5 w-3.5 text-[#14120F]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
      <span className="hidden sm:inline">Sign In</span>
    </Link>
  );
}
