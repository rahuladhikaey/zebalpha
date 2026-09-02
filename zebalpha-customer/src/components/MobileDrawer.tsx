"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

type MobileDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const { user, signOut } = useAuth();
  const router = useRouter();

  // Prevent scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleLogout = async () => {
    onClose();
    await signOut();
    router.refresh();
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md transition-opacity duration-300 opacity-100"
          onClick={onClose}
        />
      )}

      {/* Drawer Panel */}
      <div
        className={`fixed right-0 top-0 z-[70] h-full w-[85%] max-w-[320px] bg-neutral-950 border-l border-neutral-800 text-white shadow-2xl transition-transform duration-500 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-neutral-800 p-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full overflow-hidden bg-black flex items-center justify-center p-0.5 border border-zinc-800">
                <img
                  src="/official-logo.png"
                  alt="ZEBALPHA Logo"
                  className="h-full w-full object-cover rounded-full"
                />
              </div>
              <span className="text-base font-black uppercase tracking-[0.2em] text-white">ZEBALPHA</span>
            </div>
            <button
              onClick={onClose}
              aria-label="Close menu"
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-hide space-y-8">
            {/* User Account Section */}
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-neutral-400 mb-4">Account</h3>
              {user ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-neutral-900 border border-neutral-800">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-black font-black text-sm uppercase" aria-hidden="true">
                      {user.email?.[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-white truncate">
                        {user.user_metadata?.full_name || user.email?.split("@")[0]}
                      </p>
                      <p className="text-xs text-neutral-400 truncate">{user.email}</p>
                    </div>
                  </div>
                  <nav className="space-y-1">
                    <Link href="/profile" onClick={onClose} className="flex items-center py-2.5 text-sm font-bold text-neutral-300 hover:text-white border-b border-neutral-900">
                      View Profile
                    </Link>
                    <Link href="/profile/orders" onClick={onClose} className="flex items-center py-2.5 text-sm font-bold text-neutral-300 hover:text-white border-b border-neutral-900">
                      My Orders
                    </Link>
                    <Link href="/wishlist" onClick={onClose} className="flex items-center py-2.5 text-sm font-bold text-neutral-300 hover:text-white border-b border-neutral-900">
                      My Wishlist
                    </Link>
                    <button onClick={handleLogout} className="flex w-full items-center py-2.5 text-sm font-bold text-neutral-400 hover:text-white">
                      Sign Out
                    </button>
                  </nav>
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 text-center">
                  <p className="text-xs font-medium text-neutral-400 mb-4">Log in to track orders and save your wishlist.</p>
                  <Link
                    href="/login"
                    onClick={onClose}
                    className="inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-2.5 text-xs font-black uppercase tracking-wider text-black transition hover:bg-neutral-200"
                  >
                    Sign In
                  </Link>
                </div>
              )}
            </div>

            {/* Quick Access Section */}
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-neutral-400 mb-4">Collections</h3>
              <nav className="space-y-1">
                {[
                  { name: "Store Home", href: "/" },
                  { name: "New Drops & Hype", href: "/new-drops" },
                  { name: "Curated Collections", href: "/collections" },
                  { name: "Polos & Tees", href: "/products?category=Polos" },
                  { name: "All Apparel", href: "/products" },
                  { name: "Your Cart", href: "/cart" },
                  { name: "Track Order", href: "/profile/orders" },
                ].map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onClose}
                    className="flex items-center py-2.5 text-sm font-bold text-neutral-300 hover:text-white transition-colors border-b border-neutral-900"
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>

            {/* Customer Care Section */}
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-neutral-400 mb-4">Brand & Help</h3>
              <nav className="space-y-1">
                {[
                  { name: "About Zebalpha", href: "/about" },
                  { name: "Contact & Support", href: "/contact" },
                  { name: "Privacy Policy", href: "/privacy-policy" },
                  { name: "Terms & Conditions", href: "/terms-and-conditions" },
                ].map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onClose}
                    className="flex items-center py-2.5 text-sm font-bold text-neutral-300 hover:text-white transition-colors border-b border-neutral-900 last:border-0"
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
          </div>

          {/* Footer inside Drawer */}
          <div className="border-t border-neutral-800 p-5 bg-black">
            <p className="text-[9px] font-black text-neutral-500 uppercase tracking-[0.25em] text-center">
              © 2026 ZEBALPHA • APPAREL
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

