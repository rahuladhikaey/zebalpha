"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { CartHeaderLink } from "@/components/CartHeaderLink";
import UserMenu from "@/components/UserMenu";

export default function EditProfilePage() {
  const { user, loading } = useAuth();
  const [fullName, setFullName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    if (user?.user_metadata?.full_name) {
      setFullName(user.user_metadata.full_name);
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setMessage({ text: "Name cannot be empty.", type: "error" });
      return;
    }

    setIsSubmitting(true);
    setMessage({ text: "", type: "" });

    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim() }
      });

      if (error) {
        setMessage({ text: error.message, type: "error" });
      } else {
        setMessage({ text: "Profile updated successfully!", type: "success" });
      }
    } catch (err) {
      setMessage({ text: "An unexpected error occurred.", type: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center p-8 bg-zinc-950 rounded-3xl shadow-2xl border border-zinc-800 text-white">
          <h1 className="text-2xl font-bold mb-4">Please log in</h1>
          <Link href="/login" className="px-6 py-3 bg-white text-black rounded-xl font-bold hover:bg-zinc-200">Go to Login</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white overflow-x-hidden relative">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-zinc-800 bg-black/80 px-4 py-3 backdrop-blur-xl md:px-8">
        <div className="flex items-center gap-4">
          <Link href="/profile" className="flex items-center justify-center p-2 rounded-full hover:bg-zinc-900 transition-colors">
            <svg className="w-5 h-5 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white">Edit Profile</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <UserMenu />
          <CartHeaderLink />
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-4 py-6 md:py-10 md:px-8">
        <div className="rounded-[2.5rem] bg-zinc-950 border border-zinc-800 p-6 md:p-8 animate-in fade-in slide-in-from-top-4 duration-300 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-xl">👤</span>
            <div className="text-left">
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400 block mb-0.5">Personal Info</span>
              <h3 className="text-md font-black text-white">Update Profile Details</h3>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-2">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full bg-zinc-900 border border-zinc-800 text-white rounded-xl px-4 py-3 text-sm font-bold focus:border-white transition outline-none"
              />
            </div>
            
            <div>
              <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block mb-2">Email Address</label>
              <input
                type="email"
                value={user.email || ""}
                disabled
                className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold text-zinc-500 cursor-not-allowed"
              />
              <span className="text-[9px] font-bold text-zinc-500 mt-1 block">Email address cannot be changed</span>
            </div>

            {message.text && (
              <div className={`p-4 rounded-xl text-xs font-bold ${message.type === 'error' ? 'bg-rose-950/60 text-rose-400 border border-rose-800/80' : 'bg-zinc-900 text-white border border-zinc-700'}`}>
                {message.text}
              </div>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-white text-black font-black text-xs uppercase tracking-wider px-5 py-3.5 transition hover:bg-zinc-200 active:scale-95 shadow-xl shadow-white/10 cursor-pointer disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent shrink-0" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Changes</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
