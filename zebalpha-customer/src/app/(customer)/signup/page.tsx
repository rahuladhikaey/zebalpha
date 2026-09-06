"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Auth3dGraphic from "@/components/Auth3dGraphic";

const SIGNUP_EMAIL_KEY = "signupEmail";

const getFriendlySignUpMessage = (error: unknown) => {
  const message = String((error as { message?: unknown })?.message ?? "").toLowerCase();

  if ((error as { status?: number })?.status === 429 || message.includes("rate limit") || message.includes("email rate limit")) {
    return "Too many signup attempts. Please wait a few minutes before trying again.";
  }

  if (message.includes("already registered") || message.includes("already exists") || message.includes("user already registered")) {
    return "An account already exists for this email. Please sign in or use password recovery if needed.";
  }

  return (error as { message?: string })?.message ?? "Signup failed. Please try again.";
};

export default function SignupPage() {
  const [email, setEmail] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(SIGNUP_EMAIL_KEY) ?? "";
  });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"form" | "sent">("form");
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (email) {
      window.localStorage.setItem(SIGNUP_EMAIL_KEY, email);
    } else {
      window.localStorage.removeItem(SIGNUP_EMAIL_KEY);
    }
  }, [email]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get("error");
    if (errorParam) {
      const decoded = decodeURIComponent(errorParam);
      if (decoded === "oauth_callback_failed" || decoded === "oauth_failed") {
        setStatusMessage("Google sign-up could not be completed. Please try again or register with your email.");
      } else if (decoded.toLowerCase().includes("access_denied")) {
        setStatusMessage("Google sign-up was cancelled or access was denied.");
      } else {
        setStatusMessage(`Sign-up notice: ${decoded}`);
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
      setStatusMessage(getFriendlySignUpMessage(error));
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage("");
    setLoading(true);

    if (password !== confirmPassword) {
      setStatusMessage("Passwords do not match.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setStatusMessage("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const origin = typeof window !== "undefined" ? window.location.origin : "";

      // Send Supabase confirmation email link to user's inbox
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: `${origin}/auth/callback`,
          data: {
            role: "customer",
          },
        },
      });

      if (error) {
        setStatusMessage(getFriendlySignUpMessage(error));
        setLoading(false);
        return;
      }

      // If identities is empty, the email already exists in Supabase auth.users
      if (data?.user && (!data.user.identities || data.user.identities.length === 0)) {
        setStatusMessage("This email is already registered in Supabase. Please check your inbox/spam for your confirmation link, or delete this user from Supabase Users to test fresh signup.");
        setLoading(false);
        return;
      }

      // If email confirmation is turned off in Supabase, user gets logged in directly
      if (data?.session) {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(SIGNUP_EMAIL_KEY);
        }
        const urlParams = new URLSearchParams(window.location.search);
        const redirect = urlParams.get("redirect") || "/";
        router.push(redirect);
        return;
      }

      // Sign out session until user verifies email via confirmation link
      await supabase.auth.signOut();

      // Switch to Check Your Email confirmation screen
      setStep("sent");
      setStatusMessage("");
    } catch (err: any) {
      setStatusMessage(err?.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleInstantActivate = async () => {
    setStatusMessage("");
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const res = await fetch("/api/auth/signup-verified", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          password: password,
          fullName: "Customer",
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password: password,
        });

        if (!signInErr) {
          if (typeof window !== "undefined") {
            window.localStorage.removeItem(SIGNUP_EMAIL_KEY);
          }
          const urlParams = new URLSearchParams(window.location.search);
          const redirect = urlParams.get("redirect") || "/";
          router.push(redirect);
          return;
        }
      }

      setStatusMessage(data.error || "Failed to instantly activate account. Please check your credentials.");
    } catch (err: any) {
      setStatusMessage("Failed to activate account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendLink = async () => {
    setStatusMessage("");
    setLoading(true);

    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${origin}/auth/callback`,
        },
      });

      if (error) {
        setStatusMessage(getFriendlySignUpMessage(error));
      } else {
        setStatusMessage("✓ Verification link resent! (Please also check your spam folder)");
      }
    } catch (err: any) {
      setStatusMessage("Failed to resend verification link. Please try again.");
    } finally {
      setLoading(false);
    }
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
            <div className="mb-8 transition-transform hover:scale-110 duration-500">
              <Link href="/">
                <img src="/official-logo.png" alt="Asali Swad Logo" className="h-16 w-16 rounded-full object-cover shadow-2xl border-2 border-zinc-700" />
              </Link>
            </div>

            <div className="text-center mb-8">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">Join Us</span>
              <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight text-white">
                {step === "form" ? "Create Account" : "Check Your Email"}
              </h1>
              <p className="mt-3 text-sm font-bold text-zinc-400">
                {step === "form" ? "Join the premium boutique community today." : "A verification link has been sent to your email."}
              </p>
            </div>

            <div className="w-full space-y-6">
              {step === "form" ? (
                <>
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
                    Google Sign Up
                  </button>

                  <div className="flex items-center justify-center text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
                    <span className="h-px flex-1 bg-zinc-800"></span>
                    <span className="mx-4">or manual registration</span>
                    <span className="h-px flex-1 bg-zinc-800"></span>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-3">
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
                          placeholder="New Password"
                          className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-4 text-sm font-bold text-white outline-none transition-all placeholder:text-zinc-500 focus:border-white"
                        />
                      </div>
                      <div className="group relative">
                        <input
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm Password"
                          className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-4 text-sm font-bold text-white outline-none transition-all placeholder:text-zinc-500 focus:border-white"
                        />
                      </div>
                    </div>

                    {statusMessage ? (
                      <div className={`flex items-center gap-3 rounded-2xl p-4 border ${statusMessage.includes('✓') || statusMessage.includes('created') || statusMessage.includes('success') || statusMessage.includes('verified') ? 'bg-zinc-900 border-zinc-700 text-white' : statusMessage.includes('⚠') ? 'bg-amber-950/60 border-amber-800/80 text-amber-400' : 'bg-rose-950/60 border-rose-800/80 text-rose-400'}`}>
                        <p className="text-xs font-bold leading-snug">{statusMessage}</p>
                      </div>
                    ) : null}

                    <button
                      disabled={loading}
                      className="flex h-14 w-full items-center justify-center rounded-2xl bg-white text-sm font-black uppercase tracking-widest text-black shadow-xl shadow-white/10 transition-all hover:bg-zinc-200 active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? "Processing..." : "Create Account ✨"}
                    </button>
                  </form>
                </>
              ) : (
                <div className="space-y-6 text-center">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-zinc-900 border border-zinc-700 text-white shadow-xl">
                    <svg className="h-10 w-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>

                  <div className="rounded-2xl bg-zinc-900 p-6 border border-zinc-800 text-center">
                    <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400">Verification Link Sent</span>
                    <p className="mt-2 text-sm font-bold leading-relaxed text-zinc-200">
                      We sent an activation link to <span className="text-white font-extrabold">{email}</span>.
                    </p>
                    <p className="mt-2 text-xs text-zinc-400 leading-relaxed">
                      Please check your inbox (and spam folder) and click the link to confirm your account and log in.
                    </p>
                  </div>

                  {statusMessage ? (
                    <div className="flex items-center gap-3 rounded-2xl p-4 border bg-zinc-900 border-zinc-700 text-white">
                      <p className="text-xs font-bold leading-snug">{statusMessage}</p>
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={handleInstantActivate}
                      disabled={loading}
                      className="flex h-14 w-full items-center justify-center rounded-2xl bg-white text-sm font-black uppercase tracking-widest text-black shadow-xl shadow-white/10 transition-all hover:bg-zinc-200 active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? "Activating..." : "Instant Activate & Enter Store ⚡"}
                    </button>

                    <button
                      type="button"
                      onClick={handleResendLink}
                      disabled={loading}
                      className="flex h-12 w-full items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-900 text-xs font-black uppercase tracking-widest text-white transition-all hover:bg-zinc-800 disabled:opacity-50"
                    >
                      {loading ? "Sending..." : "Resend Supabase Email Link"}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setStep("form");
                        setStatusMessage("");
                      }}
                      className="flex h-12 w-full items-center justify-center rounded-xl border border-zinc-800 text-xs font-black uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all"
                    >
                      Use a different email
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-6 text-center">
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                  Old friend? <Link href="/login" className="text-white hover:underline underline-offset-4 transition-colors font-black">Sign In Here</Link>
                </p>
                <div className="mt-8 flex items-center justify-center gap-4">
                  <Link href="/" className="text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors">← Store Home</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
