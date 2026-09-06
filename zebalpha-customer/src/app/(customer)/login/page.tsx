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

  if (message.includes("email not confirmed") || message.includes("not confirmed")) {
    return "Your email address has not been confirmed yet. Please check your inbox and click the verification link sent to your email.";
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get("error");
    if (errorParam) {
      const decoded = decodeURIComponent(errorParam);
      if (decoded === "oauth_callback_failed" || decoded === "oauth_failed") {
        setStatusMessage("Google sign-in could not be completed. Please try again or log in with your email.");
      } else if (decoded.toLowerCase().includes("access_denied")) {
        setStatusMessage("Google sign-in was cancelled or access was denied.");
      } else {
        setStatusMessage(`Sign-in notice: ${decoded}`);
      }
    }
  }, []);

  const handleGoogleAuth = async () => {
    if (typeof window === "undefined") return;
    setStatusMessage("");
    setLoading(true);

    const urlParams = new URLSearchParams(window.location.search);
    const redirectParam = urlParams.get("redirect") || "/";

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectParam)}`,
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

    try {
      const normalizedEmail = email.trim().toLowerCase();
      let { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      // If user is stuck in unconfirmed email state (due to missing Supabase email link), auto-confirm and retry
      if (error && (error.message.toLowerCase().includes("not confirmed") || error.message.toLowerCase().includes("email not confirmed"))) {
        try {
          const verifyRes = await fetch("/api/auth/signup-verified", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email: normalizedEmail,
              password,
              fullName: "Customer",
            }),
          });
          const verifyData = await verifyRes.json();
          if (verifyRes.ok && verifyData.success) {
            const retry = await supabase.auth.signInWithPassword({
              email: normalizedEmail,
              password,
            });
            error = retry.error;
          }
        } catch (autoErr) {
          console.warn("Auto-confirm on login notice:", autoErr);
        }
      }

      if (error) {
        setStatusMessage(getFriendlyLoginMessage(error));
        setLoading(false);
        return;
      }
    } catch (fetchErr: any) {
      console.warn("Customer auth fetch exception:", fetchErr);
      setStatusMessage("Network error: Failed to connect to server. Please check your internet connection.");
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
    <main className="relative flex min-h-screen items-center justify-center bg-black p-4 md:p-8 text-white overflow-x-hidden">
      {/* Absolute Back Button */}
      <button
        onClick={() => router.back()}
        className="fixed left-6 top-6 z-50 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all active:scale-95 md:left-10 md:top-10"
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
          
          <div className="rounded-[3rem] bg-zinc-950 p-8 md:p-12 border border-zinc-800 shadow-2xl flex flex-col items-center">
            <div className="mb-10 transition-transform hover:scale-110 duration-500">
              <Link href="/">
                <img src="/official-logo.png" alt="Asali Swad Logo" className="h-20 w-20 rounded-full object-cover shadow-2xl border-2 border-zinc-700" />
              </Link>
            </div>
            
            <div className="text-center mb-10">
               <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Premium Access</span>
               <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight text-white">Welcome Back</h1>
               <p className="mt-3 text-sm font-bold text-zinc-400">Sign in to access your boutique collection & account.</p>
            </div>

            <div className="w-full space-y-6">
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading}
                className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 px-6 text-sm font-black uppercase tracking-widest text-white transition-all hover:bg-zinc-800 hover:border-zinc-700 disabled:opacity-50"
              >
                <img
                  src="/official-logo.png"
                  alt="ZEBALPHA Logo"
                  className="h-6 w-6 rounded-full object-cover border border-zinc-700 shadow-sm shrink-0"
                />
                Google Sign In
              </button>

              <div className="flex items-center justify-center text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
                <span className="h-px flex-1 bg-zinc-800"></span>
                <span className="mx-4">or use email</span>
                <span className="h-px flex-1 bg-zinc-800"></span>
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
                      className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-4 text-sm font-bold text-white outline-none transition-all placeholder:text-zinc-500 focus:border-white"
                    />
                  </div>
                  <div className="group relative">
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-4 text-sm font-bold text-white outline-none transition-all placeholder:text-zinc-500 focus:border-white"
                    />
                  </div>
                </div>

                {statusMessage ? (
                   <div className="flex items-center gap-3 rounded-2xl bg-rose-950/60 p-4 border border-rose-800/80">
                      <p className="text-xs font-bold text-rose-400 leading-snug">{statusMessage}</p>
                   </div>
                ) : null}

                <button
                  disabled={loading}
                  className="flex h-14 w-full items-center justify-center rounded-2xl bg-white text-sm font-black uppercase tracking-widest text-black shadow-xl shadow-white/10 transition-all hover:bg-zinc-200 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? "Verifying..." : "Sign In ✨"}
                </button>
              </form>

              <div className="pt-6 space-y-4 text-center">
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                  New here? <Link href="/signup" className="text-white hover:underline underline-offset-4 transition-colors font-black">Create Account</Link>
                </p>
                <div className="flex items-center justify-center gap-4">
                  <Link href="/" className="text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">Public Store</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
