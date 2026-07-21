"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Auth3dGraphic from "@/components/Auth3dGraphic";

const LOGIN_EMAIL_KEY = "loginEmail";

const getFriendlyLoginMessage = (error: unknown) => {
  const message = String((error as { message?: unknown })?.message ?? "").toLowerCase();

  if (message.includes("invalid login credentials") || message.includes("invalid password") || message.includes("email or password")) {
    return "Invalid email or password. Please check your credentials and try again.";
  }

  if (message.includes("user not found") || message.includes("user does not exist")) {
    return "No account found for this email. Please sign up first.";
  }

  return (error as { message?: string })?.message ?? "Login failed. Please try again.";
};

export default function LoginPage() {
  const [email, setEmail] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(LOGIN_EMAIL_KEY) ?? "";
  });
  const [password, setPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (email) {
      window.localStorage.setItem(LOGIN_EMAIL_KEY, email);
    } else {
      window.localStorage.removeItem(LOGIN_EMAIL_KEY);
    }
  }, [email]);

  const handleGoogleAuth = async () => {
    if (typeof window === "undefined") return;
    setStatusMessage("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      setStatusMessage(getFriendlyLoginMessage(error));
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setStatusMessage(getFriendlyLoginMessage(error));
      setLoading(false);
      return;
    }

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(LOGIN_EMAIL_KEY);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get("redirect") || "/";
    router.push(redirect);
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-slate-50 p-4 md:p-8 text-slate-900 overflow-x-hidden">
      {/* Absolute Back Button */}
      <button
        onClick={() => router.back()}
        className="fixed left-6 top-6 z-50 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-xl shadow-slate-200/50 hover:bg-emerald-50 hover:text-emerald-600 transition-all active:scale-95 md:left-10 md:top-10"
        aria-label="Go Back"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="w-full max-w-6xl">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr] xl:gap-16 items-center">
          <div className="hidden lg:block transition-all hover:scale-105 duration-700">
             <Auth3dGraphic />
          </div>
          
          <div className="rounded-[3rem] bg-white p-8 md:p-12 premium-shadow border border-slate-100 flex flex-col items-center">
            <div className="mb-10 transition-transform hover:scale-110 duration-500">
              <Link href="/">
                <img src="/official-logo.png" alt="Asali Swad Logo" className="h-20 w-20 rounded-full object-cover shadow-2xl border-4 border-white" />
              </Link>
            </div>
            
            <div className="text-center mb-10">
               <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600">Premium Access</span>
               <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight text-slate-900">Welcome Back</h1>
               <p className="mt-3 text-sm font-bold text-slate-400">Sign in to access your boutique spice pantry.</p>
            </div>

            <div className="w-full space-y-6">
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border-2 border-slate-50 bg-white px-6 text-sm font-black uppercase tracking-widest text-slate-700 transition-all hover:border-emerald-500/20 hover:bg-slate-50 hover:shadow-xl hover:shadow-emerald-900/5 disabled:opacity-50"
              >
                <svg viewBox="0 0 533.5 544.3" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#4285F4" d="M533.5 278.4c0-17.4-1.6-34.1-4.6-50.4H272.1v95.5h146.9c-6.4 34.5-25.7 63.7-54.7 83.3v68.9h88.3c51.6-47.5 81.9-117.8 81.9-197.3z"/>
                  <path fill="#34A853" d="M272.1 544.3c73.7 0 135.6-24.4 180.8-66.1l-88.3-68.9c-24.5 16.4-55.8 26-92.4 26-71 0-131-47.9-152.4-112.4H32.8v70.7c45.5 90.1 140 150.7 239.3 150.7z"/>
                  <path fill="#FBBC05" d="M119.7 322.9c-10.9-32.7-10.9-67.9 0-100.6V151.6H32.8c-38.5 76.9-38.5 168.8 0 245.7l86.9-74.4z"/>
                  <path fill="#EA4335" d="M272.1 107.7c39.9 0 75.8 13.7 104.1 40.7l78.1-78.1C402 24.5 339.5 0 272.1 0 173.8 0 79.4 60.6 33.9 150.7l86 70.8C141.1 155.6 201.1 107.7 272.1 107.7z"/>
                </svg>
                Google Sign In
              </button>

              <div className="flex items-center justify-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">
                <span className="h-px flex-1 bg-slate-100"></span>
                <span className="mx-4">or use email</span>
                <span className="h-px flex-1 bg-slate-100"></span>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-4">
                  <div className="group relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email Address"
                      className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-6 py-4 text-sm font-bold outline-none transition-all placeholder:text-slate-300 focus:border-emerald-500/20 focus:bg-white focus:ring-4 focus:ring-emerald-500/5"
                    />
                  </div>
                  <div className="group relative">
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-6 py-4 text-sm font-bold outline-none transition-all placeholder:text-slate-300 focus:border-emerald-500/20 focus:bg-white focus:ring-4 focus:ring-emerald-500/5"
                    />
                  </div>
                </div>

                {statusMessage ? (
                   <div className="flex items-center gap-3 rounded-2xl bg-rose-50 p-4 border border-rose-100/50">
                      <p className="text-xs font-bold text-rose-700 leading-snug">{statusMessage}</p>
                   </div>
                ) : null}

                <button
                  disabled={loading}
                  className="flex h-14 w-full items-center justify-center rounded-2xl bg-emerald-600 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-600/30 transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
                >
                  {loading ? "Verifying..." : "Sign In ✨"}
                </button>
              </form>

              <div className="pt-6 space-y-4 text-center">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  New here? <Link href="/signup" className="text-emerald-600 hover:text-emerald-700 transition-colors">Create Account</Link>
                </p>
                <div className="flex items-center justify-center gap-4">
                  <Link href="/" className="text-[9px] font-black uppercase tracking-widest text-slate-300 hover:text-slate-900 transition-colors">Public Store</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}


