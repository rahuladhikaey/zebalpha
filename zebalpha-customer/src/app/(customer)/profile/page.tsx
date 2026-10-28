"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { 
  Package, 
  Heart, 
  MapPin, 
  CreditCard, 
  User as UserIcon, 
  HelpCircle, 
  LogOut, 
  Share2, 
  ChevronRight, 
  Sparkles, 
  Coins,
  Globe,
  Trash2
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useIsNativeApp } from "@/lib/platform";

export default function ProfileDashboard() {
  const { user, profile, loading, signOut } = useAuth();
  const [hasApprovedCard, setHasApprovedCard] = useState(false);
  const { language, openLanguageModal } = useLanguage();
  const isNativeApp = useIsNativeApp();
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined" || !user) return;

    const checkCardStatus = async () => {
      try {
        const userEmail = (user.email || "").trim().toLowerCase();
        const { data } = await supabase
          .from("card_applications")
          .select("status")
          .or(`user_email.ilike.${userEmail},email.ilike.${userEmail}`)
          .order("applied_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data && data.status === "APPROVED") {
          setHasApprovedCard(true);
        }
      } catch (e) {
        console.error("Error checking card status:", e);
      }
    };

    checkCardStatus();
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
          <p className="text-xs font-black uppercase tracking-widest text-white">Loading Account...</p>
        </div>
      </main>
    );
  }

  // Logged-out State
  if (!user) {
    return (
      <main className="min-h-screen bg-black text-white pb-24 selection:bg-white selection:text-black">
        <Header title="My Account" subtitle="Profile Dashboard" />
        <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
          <div className="max-w-md w-full rounded-[2.5rem] bg-zinc-950 p-8 md:p-10 border border-zinc-800/90 shadow-2xl">
            <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-full bg-zinc-900 text-3xl mb-6 border border-zinc-800 shadow-inner">
              👤
            </div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-white">Welcome to ZebAlpha</h1>
            <p className="mt-2 text-xs font-semibold text-zinc-400">
              Sign in to track orders, manage saved addresses, view your boutique wishlist, and access exclusive drops.
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <Link
                href="/login"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-white px-8 py-3.5 text-xs font-black uppercase tracking-widest text-black shadow-xl shadow-white/10 transition hover:bg-zinc-200 active:scale-95"
              >
                Sign In With Email
              </Link>
              <Link
                href="/signup"
                className="inline-flex w-full items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 px-8 py-3.5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-zinc-800 active:scale-95"
              >
                Create Free Account
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const displayName =
    profile?.full_name ||
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email?.split("@")[0] ||
    "Customer";
  const avatarUrl =
    profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture;

  return (
    <main className="min-h-screen bg-black text-white overflow-x-hidden relative pb-24 selection:bg-white selection:text-black">
      {/* Universal Responsive Header */}
      <Header title="My Account" subtitle="Profile Dashboard" />

      <section className="mx-auto max-w-2xl px-4 py-6 md:py-8 md:px-8">
        {/* Profile Card */}
        <div className="rounded-[2.5rem] bg-zinc-950 shadow-2xl border border-zinc-800/90 animate-in fade-in zoom-in-95 duration-300 overflow-hidden mb-6">
          <div className="h-32 sm:h-36 bg-gradient-to-r from-zinc-900 via-zinc-950 to-zinc-900 border-b border-zinc-800/80 relative">
            <div
              className="absolute inset-0 bg-white/5 opacity-20"
              style={{
                backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
                backgroundSize: "20px 20px",
              }}
            />

            {/* Gold Coins Badge */}
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2 rounded-2xl bg-zinc-950/90 backdrop-blur-md px-3.5 py-1.5 border border-zinc-700 shadow-lg select-none">
              <Coins className="h-4 w-4 text-amber-400" />
              <div className="text-left leading-none">
                <span className="text-[7px] font-black uppercase tracking-widest text-zinc-400 block">
                  Reward Coins
                </span>
                <span className="text-[11px] font-black text-white whitespace-nowrap">
                  {hasApprovedCard ? "100 Coins" : "0 Coins"}
                </span>
              </div>
            </div>
          </div>

          <div className="px-6 pb-6 md:px-8">
            <div className="relative -mt-14 flex flex-col items-center sm:flex-row sm:items-end gap-4">
              <div className="flex h-24 w-24 sm:h-28 sm:w-28 shrink-0 items-center justify-center rounded-full border-4 border-black bg-zinc-900 text-4xl font-black text-white shadow-2xl z-10 overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  displayName[0]?.toUpperCase() || "U"
                )}
              </div>
              <div className="text-center sm:text-left min-w-0 flex-1">
                <span className="inline-flex rounded-full bg-white/10 border border-white/20 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-white mb-1.5">
                  Verified Member ✦
                </span>
                <h1 className="text-xl sm:text-2xl font-black text-white leading-tight break-words">
                  {displayName}
                </h1>
                <p className="text-xs font-semibold text-zinc-400 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Account Quick Navigation List */}
        <div className="mb-6">
          <h2 className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400 mb-3 px-2">
            Account Management
          </h2>
          <ul className="space-y-2.5">
            {/* My Orders */}
            <li>
              <Link
                href="/profile/orders"
                className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-800/80 hover:border-zinc-600 transition-all group active:scale-[0.98]"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center bg-zinc-900 rounded-xl text-white border border-zinc-800 group-hover:bg-zinc-800 transition-colors">
                    <Package size={18} />
                  </div>
                  <div>
                    <span className="font-bold text-white text-sm block">My Orders</span>
                    <span className="text-[10px] text-zinc-400 font-medium">Track, view and manage past purchases</span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-zinc-500 group-hover:text-white transition-colors" />
              </Link>
            </li>

            {/* My Wishlist */}
            <li>
              <Link
                href="/wishlist"
                className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-800/80 hover:border-zinc-600 transition-all group active:scale-[0.98]"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center bg-zinc-900 rounded-xl text-rose-400 border border-zinc-800 group-hover:bg-zinc-800 transition-colors">
                    <Heart size={18} />
                  </div>
                  <div>
                    <span className="font-bold text-white text-sm block">My Wishlist</span>
                    <span className="text-[10px] text-zinc-400 font-medium">Saved drops & favorite streetwear</span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-zinc-500 group-hover:text-white transition-colors" />
              </Link>
            </li>

            {/* Saved Addresses */}
            <li>
              <Link
                href="/profile/address"
                className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-800/80 hover:border-zinc-600 transition-all group active:scale-[0.98]"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center bg-zinc-900 rounded-xl text-emerald-400 border border-zinc-800 group-hover:bg-zinc-800 transition-colors">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <span className="font-bold text-white text-sm block">Saved Addresses</span>
                    <span className="text-[10px] text-zinc-400 font-medium">Manage delivery destinations</span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-zinc-500 group-hover:text-white transition-colors" />
              </Link>
            </li>

            {/* Alpha Card & Wallet */}
            <li>
              <Link
                href="/profile/cards"
                className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-800/80 hover:border-zinc-600 transition-all group active:scale-[0.98]"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center bg-zinc-900 rounded-xl text-amber-400 border border-zinc-800 group-hover:bg-zinc-800 transition-colors">
                    <CreditCard size={18} />
                  </div>
                  <div>
                    <span className="font-bold text-white text-sm block">Alpha Card & Wallet</span>
                    <span className="text-[10px] text-zinc-400 font-medium">Rewards, membership & wallet</span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-zinc-500 group-hover:text-white transition-colors" />
              </Link>
            </li>

            {/* Edit Profile */}
            <li>
              <Link
                href="/profile/edit"
                className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-800/80 hover:border-zinc-600 transition-all group active:scale-[0.98]"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center bg-zinc-900 rounded-xl text-blue-400 border border-zinc-800 group-hover:bg-zinc-800 transition-colors">
                    <UserIcon size={18} />
                  </div>
                  <div>
                    <span className="font-bold text-white text-sm block">Edit Profile</span>
                    <span className="text-[10px] text-zinc-400 font-medium">Update your name & details</span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-zinc-500 group-hover:text-white transition-colors" />
              </Link>
            </li>

            {/* Language Settings (Android App Only) */}
            {isNativeApp && (
              <li>
                <button
                  type="button"
                  onClick={openLanguageModal}
                  className="w-full flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-800/80 hover:border-zinc-600 transition-all group active:scale-[0.98] text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-10 w-10 items-center justify-center bg-zinc-900 rounded-xl text-teal-400 border border-zinc-800 group-hover:bg-zinc-800 transition-colors">
                      <Globe size={18} />
                    </div>
                    <div>
                      <span className="font-bold text-white text-sm block">
                        {language === "hi" ? "भाषा सेटिंग" : "Language Settings"}
                      </span>
                      <span className="text-[10px] text-zinc-400 font-medium">
                        {language === "hi" ? "🇮🇳 हिंदी (Hindi)" : "🇬🇧 English"}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-zinc-500 group-hover:text-white transition-colors" />
                </button>
              </li>
            )}

            {/* Help & Support */}
            <li>
              <Link
                href="/help"
                className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-800/80 hover:border-zinc-600 transition-all group active:scale-[0.98]"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center bg-zinc-900 rounded-xl text-violet-400 border border-zinc-800 group-hover:bg-zinc-800 transition-colors">
                    <HelpCircle size={18} />
                  </div>
                  <div>
                    <span className="font-bold text-white text-sm block">Help & Support</span>
                    <span className="text-[10px] text-zinc-400 font-medium">FAQs, return policy & customer desk</span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-zinc-500 group-hover:text-white transition-colors" />
              </Link>
            </li>

            {/* Account Deletion (Google Play Compliance) */}
            <li>
              <Link
                href="/account-deletion"
                className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-800/80 hover:border-rose-900/40 hover:bg-rose-950/10 transition-all group active:scale-[0.98]"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-10 w-10 items-center justify-center bg-zinc-900 rounded-xl text-zinc-500 border border-zinc-800 group-hover:text-rose-400 group-hover:bg-rose-950/40 transition-colors">
                    <Trash2 size={18} />
                  </div>
                  <div>
                    <span className="font-bold text-zinc-400 group-hover:text-rose-400 text-sm block transition-colors">Delete Account</span>
                    <span className="text-[10px] text-zinc-500 font-medium">Request account and data removal</span>
                  </div>
                </div>
                <ChevronRight size={18} className="text-zinc-600 group-hover:text-rose-400 transition-colors" />
              </Link>
            </li>
          </ul>
        </div>

        {/* Action Buttons: Share & Logout */}
        <div className="space-y-3 px-1">
          <button
            type="button"
            onClick={async () => {
              try {
                if (navigator.share) {
                  await navigator.share({
                    title: "ZEBALPHA - Premium Streetwear & Fashion",
                    text: "Check out ZEBALPHA for exclusive premium streetwear and contemporary fashion! Discover the latest drops today.",
                    url: window.location.origin,
                  });
                } else {
                  await navigator.clipboard.writeText(window.location.origin);
                  alert("Link copied to clipboard! Share it with your friends.");
                }
              } catch (error) {
                console.log("Sharing failed or cancelled:", error);
              }
            }}
            className="w-full rounded-2xl bg-white px-6 py-3.5 text-xs font-black uppercase tracking-widest text-black shadow-xl shadow-white/10 transition-all hover:bg-zinc-200 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            <Share2 size={16} strokeWidth={2.5} />
            <span>Invite Friends</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full rounded-2xl bg-zinc-950 border border-zinc-800 px-6 py-3.5 text-xs font-black uppercase tracking-widest text-rose-400 hover:text-white hover:bg-rose-950/40 hover:border-rose-800 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            <LogOut size={16} strokeWidth={2.5} />
            <span>Sign Out</span>
          </button>
        </div>
      </section>
    </main>
  );
}
