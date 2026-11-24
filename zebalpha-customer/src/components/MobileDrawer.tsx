"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { Store, ArrowUpRight, Globe } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useIsNativeApp, useOfficialTheme } from "@/lib/platform";
import { useExperienceTheme } from "@/context/ExperienceThemeContext";

type MobileDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { language, openLanguageModal, t } = useLanguage();
  const isNativeApp = useIsNativeApp();
  const isOfficialTheme = useOfficialTheme();
  const { experience, isFestivalOverride } = useExperienceTheme();
  const theme = experience.themeTokens;

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
          className={`fixed inset-0 z-[60] transition-opacity duration-300 opacity-100 ${
            isOfficialTheme ? "bg-black/45 backdrop-blur-sm" : "bg-black/70 backdrop-blur-md"
          }`}
          onClick={onClose}
        />
      )}

      {/* Drawer Panel (Slides in from Left for native Android pattern) */}
      <div
        style={
          isOfficialTheme && isFestivalOverride
            ? {
                backgroundColor: theme.backgroundColor,
                borderColor: theme.borderColor,
                color: theme.primaryText,
              }
            : undefined
        }
        className={`fixed left-0 top-0 z-[70] h-full w-[85%] max-w-[320px] shadow-2xl transition-transform duration-300 ease-out ${
          isOfficialTheme
            ? "bg-[#FCF9F2] border-r border-[#E6CF96]/80 text-[#14120F]"
            : "bg-neutral-950 border-r border-neutral-800 text-white"
        } ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div
            style={
              isOfficialTheme && isFestivalOverride
                ? { backgroundColor: theme.surfaceColor, borderColor: theme.borderColor }
                : undefined
            }
            className={`flex items-center justify-between p-6 border-b ${
              isOfficialTheme ? "border-[#E9D7A9]/75 bg-[#FAF3E1]/80" : "border-neutral-800"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`h-8 w-8 rounded-full overflow-hidden bg-black flex items-center justify-center p-0.5 ${
                  isOfficialTheme ? "border border-[#D4AF37]" : "border border-zinc-800"
                }`}
              >
                <img
                  src="/official-logo-sm.png"
                  alt="ZebAlpha Logo"
                  className="h-full w-full object-cover rounded-full"
                />
              </div>
              <span className={`text-base font-black tracking-[0.2em] uppercase ${isOfficialTheme ? "text-[#14120F]" : "text-white"}`}>
                ZEB<span className={isOfficialTheme ? "text-[#B8820E]" : "text-amber-400"}>ALPHA</span>
              </span>
            </div>
            <button
              onClick={onClose}
              aria-label="Close menu"
              className={`flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${
                isOfficialTheme
                  ? "bg-[#FFFDF8] border-[#DFC16E]/70 text-[#4B402D] hover:text-[#14120F]"
                  : "bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-white"
              }`}
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
              <h3 className={`text-[10px] font-black uppercase tracking-[0.25em] mb-4 ${isOfficialTheme ? "text-[#8A7548]" : "text-neutral-400"}`}>Account</h3>
              {user ? (
                <div className="space-y-4">
                  <div
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border ${
                      isOfficialTheme
                        ? "bg-[#FFFDF8] border-[#E7CF94]/80 shadow-sm"
                        : "bg-neutral-900 border-neutral-800"
                    }`}
                  >
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-black text-sm uppercase ${
                        isOfficialTheme
                          ? "bg-gradient-to-br from-[#FBE28A] to-[#D49B1A] text-[#111111]"
                          : "bg-white text-black"
                      }`}
                      aria-hidden="true"
                    >
                      {user.email?.[0]}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-black truncate ${isOfficialTheme ? "text-[#14120F]" : "text-white"}`}>
                        {user.user_metadata?.full_name || user.email?.split("@")[0]}
                      </p>
                      <p className={`text-xs truncate ${isOfficialTheme ? "text-[#6B5D44]" : "text-neutral-400"}`}>{user.email}</p>
                    </div>
                  </div>
                  <nav className="space-y-1">
                    <Link href="/profile" onClick={onClose} className={`flex items-center py-2.5 text-sm font-bold border-b ${isOfficialTheme ? "text-[#292319] hover:text-[#14120F] border-[#EFE1BE]" : "text-neutral-300 hover:text-white border-neutral-900"}`}>
                      View Profile
                    </Link>
                    <Link href="/profile/orders" onClick={onClose} className={`flex items-center py-2.5 text-sm font-bold border-b ${isOfficialTheme ? "text-[#292319] hover:text-[#14120F] border-[#EFE1BE]" : "text-neutral-300 hover:text-white border-neutral-900"}`}>
                      My Orders
                    </Link>
                    <Link href="/wishlist" onClick={onClose} className={`flex items-center py-2.5 text-sm font-bold border-b ${isOfficialTheme ? "text-[#292319] hover:text-[#14120F] border-[#EFE1BE]" : "text-neutral-300 hover:text-white border-neutral-900"}`}>
                      My Wishlist
                    </Link>
                    <button onClick={handleLogout} className={`flex w-full items-center py-2.5 text-sm font-bold ${isOfficialTheme ? "text-[#7A6B52] hover:text-[#14120F]" : "text-neutral-400 hover:text-white"}`}>
                      Sign Out
                    </button>
                  </nav>
                </div>
              ) : (
                <div
                  className={`p-5 rounded-2xl border text-center ${
                    isOfficialTheme
                      ? "bg-[#FFFDF8] border-[#E7CF94]/80 shadow-sm"
                      : "bg-neutral-900 border-neutral-800"
                  }`}
                >
                  <p className={`text-xs font-medium mb-4 ${isOfficialTheme ? "text-[#5C503C]" : "text-neutral-400"}`}>Log in to track orders and save your wishlist.</p>
                  <Link
                    href="/login"
                    onClick={onClose}
                    className={`inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition ${
                      isOfficialTheme
                        ? "bg-gradient-to-r from-[#FBE28A] via-[#EAB308] to-[#C68A12] text-[#111111] shadow-sm"
                        : "bg-white text-black hover:bg-neutral-200"
                    }`}
                  >
                    Sign In
                  </Link>
                </div>
              )}
              {isNativeApp && (
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      openLanguageModal();
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-[#FFFDF8] border border-[#E5C983]/80 text-left hover:border-[#C28D12] transition-all active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FAF0D1] text-[#8E6208]">
                        <Globe size={16} />
                      </span>
                      <div>
                        <span className="text-xs font-bold text-[#14120F] block">
                          {t("language_settings")}
                        </span>
                        <span className="text-[10px] text-[#6B5D44] font-medium">
                          {language === "hi" ? "🇮🇳 हिंदी" : language === "bn" ? "🇧🇩 বাংলা" : "🇬🇧 English"}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#8E6208] border border-[#E2BF68] rounded-lg px-2 py-1 bg-[#FFF9E6]">
                      {language === "hi" ? "बदलें" : language === "bn" ? "বদলান" : "Change"}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Access Section */}
            <div>
              <h3 className={`text-[10px] font-black uppercase tracking-[0.25em] mb-4 ${isOfficialTheme ? "text-[#8A7548]" : "text-neutral-400"}`}>Collections</h3>
              <nav className="space-y-1">
                {[
                  { name: "Store Home", href: "/" },
                  { name: "Browse Categories", href: "/categories" },
                  { name: "New Drops & Hype", href: "/new-drops" },
                  { name: "💎 Premium Store", href: "/premium-store" },
                  { name: "All Apparel", href: "/products" },
                  { name: "Track Order", href: "/profile/orders" },
                ].map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center py-2.5 text-sm font-bold transition-colors border-b ${
                      isOfficialTheme
                        ? "text-[#292319] hover:text-[#14120F] border-[#EFE1BE]"
                        : "text-neutral-300 hover:text-white border-neutral-900"
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}

                {/* Sell on ZebAlpha Link */}
                <div className="pt-2">
                  <Link
                    href="/seller"
                    onClick={onClose}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all shadow-md group active:scale-95 ${
                      isOfficialTheme
                        ? "bg-gradient-to-r from-[#FFF7DF] to-[#F7E8BD]/70 border-[#DFB953]/70 text-[#14120F]"
                        : "bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-transparent border-emerald-500/35 text-white hover:border-emerald-400"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-lg ${
                          isOfficialTheme ? "bg-gradient-to-br from-[#EAB308] to-[#B45309] text-[#111111]" : "bg-emerald-500 text-black"
                        }`}
                      >
                        <Store className="h-3.5 w-3.5 stroke-[2.5]" />
                      </span>
                      <div>
                        <p
                          className={`text-xs font-black uppercase tracking-wider ${
                            isOfficialTheme ? "text-[#8E6208]" : "text-emerald-300 group-hover:text-emerald-200"
                          }`}
                        >
                          Sell on ZebAlpha
                        </p>
                        <p className={`text-[10px] font-medium ${isOfficialTheme ? "text-[#5C503C]" : "text-neutral-400"}`}>Small Business & Seller Hub</p>
                      </div>
                    </div>
                    <ArrowUpRight className={`h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform ${isOfficialTheme ? "text-[#8E6208]" : "text-emerald-400"}`} />
                  </Link>
                </div>
              </nav>
            </div>

            {/* Customer Care Section */}
            <div>
              <h3 className={`text-[10px] font-black uppercase tracking-[0.25em] mb-4 ${isOfficialTheme ? "text-[#8A7548]" : "text-neutral-400"}`}>Brand & Help</h3>
              <nav className="space-y-1">
                {[
                  { name: "About ZebAlpha", href: "/about" },
                  { name: "Sell on ZebAlpha", href: "/seller" },
                  { name: "Contact & Support", href: "/contact" },
                  { name: "Privacy Policy", href: "/privacy-policy" },
                  { name: "Terms & Conditions", href: "/terms-and-conditions" },
                  { name: "Blogs & Stories", href: "/blogs" },
                ].map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center py-2.5 text-sm font-bold transition-colors border-b last:border-0 ${
                      isOfficialTheme
                        ? "text-[#292319] hover:text-[#14120F] border-[#EFE1BE]"
                        : "text-neutral-300 hover:text-white border-neutral-900"
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
          </div>

          {/* Footer inside Drawer */}
          <div className={`border-t p-5 ${isOfficialTheme ? "border-[#E9D7A9] bg-[#F7EED7]" : "border-neutral-800 bg-black"}`}>
            <p className={`text-[9px] font-black uppercase tracking-[0.25em] text-center ${isOfficialTheme ? "text-[#7A673E]" : "text-neutral-500"}`}>
              © 2026 ZEBALPHA • APPAREL
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

