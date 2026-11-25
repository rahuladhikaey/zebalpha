"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Mail, MapPin, Package, Heart, ShoppingCart, Home, LogOut, LogIn, Zap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useGoAlpha } from "@/context/GoAlphaContext";
import { supabase } from "@/lib/supabaseClient";

export default function GoAlphaAccountPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { pincode, serviceability, setLocationModalOpen, cartCount, wishlistIds } = useGoAlpha();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
  };

  return (
    <div id="profile" className="mx-auto max-w-2xl px-3.5 py-4 space-y-4">
      {/* Account Profile Card */}
      <div className="rounded-3xl border border-orange-200 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF5100] to-[#EE2B00] text-white shadow-sm shrink-0">
            <User className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-black text-[#EE2B00]">
              <Zap className="h-2.5 w-2.5 fill-[#EE2B00]" />
              GOα Express Account
            </div>
            <h1 className="mt-1 text-base font-black text-neutral-900 truncate">
              {user ? user.user_metadata?.full_name || "ZebAlpha Member" : "Guest Shopper"}
            </h1>
            {user?.email && (
              <p className="flex items-center gap-1 text-xs text-neutral-500 truncate">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">{user.email}</span>
              </p>
            )}
          </div>
        </div>

        {!user && (
          <div className="mt-4 rounded-2xl bg-orange-50/80 p-3.5 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-neutral-700">
              Sign in once—works across both GOα and ZebAlpha.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#EE2B00] px-4 py-2 text-xs font-black text-white shrink-0"
            >
              <LogIn className="h-3.5 w-3.5" />
              Sign In
            </Link>
          </div>
        )}
      </div>

      {/* Saved Delivery Location */}
      <div className="rounded-3xl border border-orange-200 bg-white p-4 shadow-xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-[#EE2B00] shrink-0">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">
              Delivery Location
            </p>
            <p className="text-xs font-black text-neutral-900 truncate">
              {serviceability.serviceable
                ? `${serviceability.areaName}, ${serviceability.city} (${pincode})`
                : `Pincode ${pincode} (Coming Soon)`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setLocationModalOpen(true)}
          className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-extrabold text-[#EE2B00] shrink-0 cursor-pointer"
        >
          Change
        </button>
      </div>

      {/* GOα Quick Actions */}
      <div className="rounded-3xl border border-orange-200 bg-white divide-y divide-neutral-100 overflow-hidden shadow-xs">
        <Link
          href="/go-alpha/orders"
          className="flex items-center justify-between px-4 py-3.5 hover:bg-orange-50/50 transition"
        >
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-[#EE2B00]" />
            <div>
              <p className="text-sm font-bold text-neutral-900">My GOα Orders</p>
              <p className="text-[11px] text-neutral-500">5–6 Hr express order history & tracking</p>
            </div>
          </div>
          <span className="text-xs font-bold text-neutral-400">→</span>
        </Link>

        <Link
          href="/go-alpha/wishlist"
          className="flex items-center justify-between px-4 py-3.5 hover:bg-orange-50/50 transition"
        >
          <div className="flex items-center gap-3">
            <Heart className="h-5 w-5 text-[#EE2B00]" />
            <div>
              <p className="text-sm font-bold text-neutral-900">My GOα Wishlist</p>
              <p className="text-[11px] text-neutral-500">{wishlistIds.length} saved items</p>
            </div>
          </div>
          <span className="text-xs font-bold text-neutral-400">→</span>
        </Link>

        <Link
          href="/go-alpha/cart"
          className="flex items-center justify-between px-4 py-3.5 hover:bg-orange-50/50 transition"
        >
          <div className="flex items-center gap-3">
            <ShoppingCart className="h-5 w-5 text-[#EE2B00]" />
            <div>
              <p className="text-sm font-bold text-neutral-900">My GOα Cart</p>
              <p className="text-[11px] text-neutral-500">{cartCount} items ready for express checkout</p>
            </div>
          </div>
          <span className="text-xs font-bold text-neutral-400">→</span>
        </Link>

        <Link
          href="/"
          className="flex items-center justify-between px-4 py-3.5 hover:bg-neutral-50 transition"
        >
          <div className="flex items-center gap-3">
            <Home className="h-5 w-5 text-neutral-700" />
            <div>
              <p className="text-sm font-bold text-neutral-900">Switch to ZebAlpha Home</p>
              <p className="text-[11px] text-neutral-500">Return to Pan-India ZebAlpha marketplace</p>
            </div>
          </div>
          <span className="text-xs font-bold text-neutral-400">→</span>
        </Link>
      </div>

      {user && (
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-200 bg-white py-3 text-xs font-extrabold text-rose-600 hover:bg-rose-50 cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      )}
    </div>
  );
}
