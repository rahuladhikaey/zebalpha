"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { CartHeaderLink } from "@/components/CartHeaderLink";
import UserMenu from "@/components/UserMenu";

export default function ProfileDashboard() {
  const { user, loading } = useAuth();
  const [hasApprovedCard, setHasApprovedCard] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !user) return;

    const checkCardStatus = async () => {
      try {
        const { data } = await supabase
          .from("card_applications")
          .select("status")
          .eq("user_email", user.email)
          .order("applied_at", { ascending: false })
          .limit(1)
          .single();
          
        if (data && data.status === "APPROVED") {
          setHasApprovedCard(true);
        }
      } catch (e) {
        console.error("Error checking card status:", e);
      }
    };

    checkCardStatus();
  }, [user]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
          <p className="text-sm font-black uppercase tracking-widest text-emerald-600">Loading Profile...</p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
        <div className="max-w-md w-full rounded-[2.5rem] bg-white p-10 premium-shadow">
          <div className="mx-auto h-20 w-20 flex items-center justify-center rounded-full bg-slate-100 text-3xl mb-6">👤</div>
          <h1 className="text-2xl font-black text-slate-900">Sign in required</h1>
          <p className="mt-3 text-slate-500 font-medium">Please login to view your premium account details.</p>
          <Link href="/login" className="mt-10 inline-flex w-full items-center justify-center rounded-2xl bg-emerald-600 px-10 py-4 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-600/20 transition hover:bg-emerald-700">
            Go to Login
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#cefad0] text-slate-900 overflow-x-hidden relative">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200/60 bg-white/80 px-4 py-3 backdrop-blur-xl md:px-8">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center justify-center transition-transform hover:scale-105">
            <img src="/official-logo.png" alt="Asali Swad Logo" className="h-10 w-10 md:h-12 md:w-12 rounded-full object-cover shadow-md border border-slate-100" />
          </Link>
          <div className="hidden flex-col md:flex">
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">User Profile</span>
            <span className="text-sm font-bold text-slate-800">Account Dashboard</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <UserMenu />
          <CartHeaderLink />
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-4 py-6 md:py-10 md:px-8">
        <div className="rounded-[2.5rem] bg-white premium-shadow border border-slate-100 animate-in fade-in zoom-in-95 duration-500 overflow-hidden mb-8">
          <div className="h-40 bg-gradient-to-br from-emerald-700 via-emerald-600 to-emerald-500 relative">
            <div className="absolute inset-0 bg-white/10 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />

            <div className="absolute top-6 right-6 z-10 flex items-center gap-2 rounded-2xl bg-white/20 backdrop-blur-md px-3.5 py-2 border border-white/25 shadow-lg select-none hover:scale-[1.03] transition-all duration-300">
              <span className="text-lg">🪙</span>
              <div className="text-left leading-none">
                <span className="text-[7px] font-black uppercase tracking-widest text-emerald-100 block">Gold Coins</span>
                <span className="text-[11px] font-black text-white whitespace-nowrap">
                  {hasApprovedCard ? "100 Earned" : "0 Coins"}
                </span>
              </div>
            </div>
          </div>

          <div className="px-6 pb-8 md:px-10">
            <div className="relative -mt-16 flex flex-col items-center sm:flex-row sm:items-end gap-5">
              <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-full border-8 border-white bg-emerald-50 text-5xl font-black text-emerald-600 shadow-xl shadow-emerald-950/10 z-10">
                {user.user_metadata?.full_name?.[0]?.toUpperCase() || user.email?.[0].toUpperCase()}
              </div>
              <div className="mb-2 text-center sm:text-left min-w-0 flex-1">
                <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700 mb-2">Verified Member 🌟</span>
                <h1 className="text-2xl md:text-3xl font-black text-slate-900 leading-tight break-words">
                  {user.user_metadata?.full_name || user.email?.split("@")[0]}
                </h1>
                <p className="mt-1 text-sm font-bold text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4 px-2">Account Settings</h2>
          <ul className="space-y-3">
            <li>
              <Link href="/profile/cards" className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-100 hover:border-emerald-200 hover:shadow-md transition-all group">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-orange-50 rounded-xl text-orange-600 group-hover:bg-orange-100 transition-colors">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </div>
                  <span className="font-semibold text-slate-800 text-lg">My Cards and Wallet</span>
                </div>
                <svg className="w-5 h-5 text-orange-600 opacity-70 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </li>
            
            <li>
              <Link href="/profile/address" className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-100 hover:border-emerald-200 hover:shadow-md transition-all group">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-orange-50 rounded-xl text-orange-600 group-hover:bg-orange-100 transition-colors">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <span className="font-semibold text-slate-800 text-lg">Saved Addresses</span>
                </div>
                <svg className="w-5 h-5 text-orange-600 opacity-70 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </li>

            <li>
              <Link href="/profile/orders" className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-100 hover:border-emerald-200 hover:shadow-md transition-all group">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-orange-50 rounded-xl text-orange-600 group-hover:bg-orange-100 transition-colors">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <span className="font-semibold text-slate-800 text-lg">My Orders</span>
                </div>
                <svg className="w-5 h-5 text-orange-600 opacity-70 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </li>

            <li>
              <Link href="/profile/edit" className="flex items-center justify-between p-5 bg-white rounded-2xl border border-slate-100 hover:border-emerald-200 hover:shadow-md transition-all group">
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-orange-50 rounded-xl text-orange-600 group-hover:bg-orange-100 transition-colors">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <span className="font-semibold text-slate-800 text-lg">Edit Profile</span>
                </div>
                <svg className="w-5 h-5 text-orange-600 opacity-70 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </li>
          </ul>
        </div>

        <div className="mt-8 flex flex-col px-2">
          <button
            onClick={async () => {
              try {
                if (navigator.share) {
                  await navigator.share({
                    title: 'Asali Swad - Premium Quality Spices',
                    text: 'Check out Asali Swad for premium quality authentic spices and groceries! Get amazing discounts on your first order.',
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
            className="w-full rounded-2xl bg-emerald-600 px-6 py-4 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-600/20 transition-all hover:bg-emerald-700 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            Invite Friends
          </button>
        </div>
      </section>
    </main>
  );
}
