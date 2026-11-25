"use client";

import Link from "next/link";
import { X, Home, User, UserCheck, Package, Heart, Zap, MapPin } from "lucide-react";
import { useGoAlpha } from "@/context/GoAlphaContext";

export function GoAlphaDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { pincode, serviceability } = useGoAlpha();

  if (!isOpen) return null;

  const menuItems = [
    { label: "ZebAlpha Home", href: "/", icon: Home, badge: "Main App" },
    { label: "Account", href: "/go-alpha/account", icon: User },
    { label: "View Profile", href: "/go-alpha/account#profile", icon: UserCheck },
    { label: "My Orders", href: "/go-alpha/orders", icon: Package },
    { label: "My Wishlist", href: "/go-alpha/wishlist", icon: Heart },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <aside className="relative z-10 flex h-full w-72 max-w-[82vw] flex-col bg-white shadow-2xl">
        {/* Top Brand Header */}
        <div className="bg-gradient-to-r from-[#FF5100] via-[#FF6A00] to-[#EE2B00] px-4 py-4 text-white pt-[max(env(safe-area-inset-top),1rem)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-xs font-black text-[#EE2B00]">
                <Zap className="h-3.5 w-3.5 fill-[#EE2B00]" />
                ZebQuick
              </span>
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-100">
                5–6 Hr Express
              </span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Menu"
              className="rounded-full bg-white/15 p-1.5 text-white hover:bg-white/25 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-1.5 text-[11px] font-bold">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-amber-200" />
            <span className="truncate">
              {serviceability.serviceable
                ? `${serviceability.areaName} (${pincode})`
                : `Pincode ${pincode} • Coming Soon`}
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onClose}
                className="flex items-center justify-between rounded-2xl px-3.5 py-3 text-sm font-bold text-neutral-800 transition hover:bg-orange-50 hover:text-[#EE2B00]"
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4.5 w-4.5 text-[#EE2B00]" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-extrabold text-white">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-neutral-100 p-4 text-center text-[11px] font-semibold text-neutral-400">
          ZebQuick Quick Commerce • Powered by ZebAlpha
        </div>
      </aside>
    </div>
  );
}
