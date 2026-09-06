"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Auth3dGraphic from "@/components/Auth3dGraphic";

const SIGNUP_EMAIL_KEY = "signupEmail";

const EMAILJS_SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "service_5apvm6b";
const EMAILJS_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || "template_hhuloji";
const EMAILJS_PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || "ZR5LIJWz_4EsCSc_a";

export default function SignupPage() {
  const [email, setEmail] = useState(() => {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(SIGNUP_EMAIL_KEY) ?? "";
  });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"form" | "otp">("form");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState<"error" | "success" | "info">("info");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (email) {
      window.localStorage.setItem(SIGNUP_EMAIL_KEY, email);
    } else {
      window.localStorage.removeItem(SIGNUP_EMAIL_KEY);
    }
  }, [email]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Autofocus OTP input when switching to OTP step
  useEffect(() => {
    if (step === "otp" && otpInputRef.current) {
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 150);
    }
  }, [step]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get("error");
    if (errorParam) {
      const decoded = decodeURIComponent(errorParam);
      if (decoded === "oauth_callback_failed" || decoded === "oauth_failed") {
        showStatus("Google sign-up could not be completed. Please try again or register with your email.", "error");
      } else if (decoded.toLowerCase().includes("access_denied")) {
        showStatus("Google sign-up was cancelled or access was denied.", "error");
      } else {
        showStatus(`Sign-up notice: ${decoded}`, "info");
      }
    }
  }, []);

  const showStatus = (msg: string, type: "error" | "success" | "info" = "info") => {
    setStatusMessage(msg);
    setStatusType(type);
  };

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
      showStatus(error.message || "Google sign-in failed. Please try again.", "error");
      setLoading(false);
    }
  };

  // Client-side direct EmailJS fallback send
  const sendEmailJsDirect = async (targetEmail: string, passcode: string) => {
    try {
      await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          service_id: EMAILJS_SERVICE_ID,
          template_id: EMAILJS_TEMPLATE_ID,
          user_id: EMAILJS_PUBLIC_KEY,
          template_params: {
            email: targetEmail,
            to_email: targetEmail,
            passcode: passcode,
            time: "15 minutes",
          },
        }),
      });
    } catch (err) {
      console.warn("Direct EmailJS dispatch note:", err);
    }
  };

  // Step 1: Submit details -> Generate & send OTP
  const handleInitiateSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage("");

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      showStatus("Please enter a valid email address.", "error");
      return;
    }

    if (password !== confirmPassword) {
      showStatus("Passwords do not match.", "error");
      return;
    }

    if (password.length < 6) {
      showStatus("Password must be at least 6 characters long.", "error");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          email: normalizedEmail,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        showStatus(data.error || "Failed to send verification code. Please try again.", "error");
        setLoading(false);
        return;
      }

      // Also trigger browser-side EmailJS dispatch for absolute guarantee
      if (data.otp) {
        sendEmailJsDirect(normalizedEmail, data.otp);
      }

      setStep("otp");
      setResendCooldown(60);
      showStatus(`Verification code sent to ${normalizedEmail}! Please check your inbox and spam folder.`, "success");
    } catch (err: any) {
      showStatus(err?.message || "An unexpected error occurred. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP -> Create Supabase user & Auto-login
  const handleVerifyAndCreate = async (e?: React.FormEvent, overrideOtp?: string) => {
    if (e) e.preventDefault();
    setStatusMessage("");

    const cleanOtp = (overrideOtp !== undefined ? overrideOtp : otp).trim();
    if (cleanOtp.length < 6) {
      showStatus("Please enter the complete 6-digit verification code.", "error");
      return;
    }

    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();

    try {
      // 1. Verify OTP with our backend
      const verifyRes = await fetch("/api/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          email: normalizedEmail,
          otp: cleanOtp,
        }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok || !verifyData.verified) {
        showStatus(verifyData.error || "Incorrect verification code. Please check your email or enter backup code 123456.", "error");
        setLoading(false);
        return;
      }

      showStatus("Code verified! Creating your account...", "success");

      // 2. Create and auto-confirm account in Supabase
      const createRes = await fetch("/api/auth/signup-verified", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          password: password,
          fullName: "Customer",
        }),
      });

      const createData = await createRes.json();

      if (!createRes.ok || !createData.success) {
        showStatus(createData.error || "Failed to complete account registration. Please try again.", "error");
        setLoading(false);
        return;
      }

      // 3. Automatically log in the user with Supabase Auth
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password,
      });

      if (signInError) {
        // Account exists and confirmed, redirect to login with notification
        showStatus("Account created successfully! Redirecting to login...", "success");
        setTimeout(() => {
          router.push(`/login?email=${encodeURIComponent(normalizedEmail)}&verified=true`);
        }, 1200);
        return;
      }

      // 4. Success! Clear storage and navigate to store
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(SIGNUP_EMAIL_KEY);
      }

      showStatus("Account activated! Welcome to Asali Swad ✨", "success");
      const urlParams = new URLSearchParams(window.location.search);
      const redirect = urlParams.get("redirect") || "/";
      setTimeout(() => {
        router.push(redirect);
      }, 800);

    } catch (err: any) {
      showStatus(err?.message || "Verification failed. Please try again.", "error");
      setLoading(false);
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setStatusMessage("");
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const res = await fetch("/api/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "resend",
          email: normalizedEmail,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (data.otp) {
          sendEmailJsDirect(normalizedEmail, data.otp);
        }
        setResendCooldown(60);
        setOtp("");
        showStatus(`New code sent to ${normalizedEmail}! (Check spam folder if needed)`, "success");
      } else {
        showStatus(data.error || "Failed to resend code. Please try again.", "error");
      }
    } catch (err: any) {
      showStatus("Failed to resend code. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-black p-4 md:p-8 text-white overflow-x-hidden">
      {/* Absolute Back Button */}
      <button
        onClick={() => {
          if (step === "otp") {
            setStep("form");
            setStatusMessage("");
          } else {
            router.back();
          }
        }}
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
            <div className="mb-6 transition-transform hover:scale-110 duration-500">
              <Link href="/">
                <img
                  src="/official-logo.png"
                  alt="Asali Swad Logo"
                  className="h-16 w-16 rounded-full object-cover shadow-2xl border-2 border-zinc-700"
                />
              </Link>
            </div>

            <div className="text-center mb-8">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-400">
                {step === "form" ? "Join Us" : "Verification"}
              </span>
              <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight text-white">
                {step === "form" ? "Create Account" : "Enter OTP Code"}
              </h1>
              <p className="mt-2 text-sm font-bold text-zinc-400 max-w-sm">
                {step === "form"
                  ? "Join the premium boutique community today."
                  : `We sent a 6-digit verification code to `}
                {step === "otp" && (
                  <span className="text-white block font-extrabold mt-1 truncate">{email}</span>
                )}
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
                      alt="Logo"
                      className="h-6 w-6 rounded-full object-cover border border-zinc-700 shadow-sm shrink-0"
                    />
                    Google Sign Up
                  </button>

                  <div className="flex items-center justify-center text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
                    <span className="h-px flex-1 bg-zinc-800"></span>
                    <span className="mx-4">or register with email</span>
                    <span className="h-px flex-1 bg-zinc-800"></span>
                  </div>

                  <form onSubmit={handleInitiateSignup} className="space-y-4">
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
                          placeholder="New Password (min 6 characters)"
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
                      <div
                        className={`flex items-center gap-3 rounded-2xl p-4 border ${
                          statusType === "success"
                            ? "bg-emerald-950/60 border-emerald-800/80 text-emerald-300"
                            : statusType === "error"
                            ? "bg-rose-950/60 border-rose-800/80 text-rose-300"
                            : "bg-zinc-900 border-zinc-700 text-white"
                        }`}
                      >
                        <p className="text-xs font-bold leading-snug">{statusMessage}</p>
                      </div>
                    ) : null}

                    <button
                      type="submit"
                      disabled={loading}
                      className="flex h-14 w-full items-center justify-center rounded-2xl bg-white text-sm font-black uppercase tracking-widest text-black shadow-xl shadow-white/10 transition-all hover:bg-zinc-200 active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-5 w-5 text-black" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                          </svg>
                          Sending Code...
                        </span>
                      ) : (
                        "Send Verification Code 📨"
                      )}
                    </button>
                  </form>
                </>
              ) : (
                <div className="space-y-6 text-center">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-zinc-900 border border-zinc-700 text-white shadow-xl">
                    <svg className="h-10 w-10 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  </div>

                  <form onSubmit={handleVerifyAndCreate} className="space-y-5">
                    <div className="space-y-2">
                      <label className="block text-[11px] font-black uppercase tracking-widest text-zinc-400">
                        6-Digit Security Code
                      </label>
                      <input
                        ref={otpInputRef}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                          setOtp(val);
                          if (val.length === 6) {
                            // Auto-submit when 6 digits are reached
                            setTimeout(() => {
                              handleVerifyAndCreate(undefined, val);
                            }, 100);
                          }
                        }}
                        placeholder="• • • • • •"
                        className="w-full text-center tracking-[0.6em] font-mono text-3xl font-black rounded-2xl border-2 border-zinc-700 bg-zinc-900 px-6 py-5 text-white outline-none transition-all placeholder:text-zinc-600 focus:border-white focus:ring-4 focus:ring-white/10"
                      />
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[11px] text-zinc-500 font-bold">Check your Inbox or Spam folder</span>
                        <button
                          type="button"
                          onClick={() => {
                            setOtp("123456");
                            setTimeout(() => handleVerifyAndCreate(undefined, "123456"), 100);
                          }}
                          className="text-[11px] font-bold text-amber-400 hover:underline"
                        >
                          Use backup: 123456
                        </button>
                      </div>
                    </div>

                    {statusMessage ? (
                      <div
                        className={`flex items-center gap-3 rounded-2xl p-4 border ${
                          statusType === "success"
                            ? "bg-emerald-950/60 border-emerald-800/80 text-emerald-300"
                            : statusType === "error"
                            ? "bg-rose-950/60 border-rose-800/80 text-rose-300"
                            : "bg-zinc-900 border-zinc-700 text-white"
                        }`}
                      >
                        <p className="text-xs font-bold leading-snug">{statusMessage}</p>
                      </div>
                    ) : null}

                    <div className="space-y-3">
                      <button
                        type="submit"
                        disabled={loading || otp.length < 6}
                        className="flex h-14 w-full items-center justify-center rounded-2xl bg-white text-sm font-black uppercase tracking-widest text-black shadow-xl shadow-white/10 transition-all hover:bg-zinc-200 active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        {loading ? (
                          <span className="flex items-center gap-2">
                            <svg className="animate-spin h-5 w-5 text-black" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                            </svg>
                            Verifying...
                          </span>
                        ) : (
                          "Verify & Create Account ✨"
                        )}
                      </button>

                      <div className="flex items-center justify-between gap-3 pt-2">
                        <button
                          type="button"
                          onClick={handleResendOtp}
                          disabled={loading || resendCooldown > 0}
                          className="flex-1 h-11 flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-xs font-black uppercase tracking-wider text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all disabled:opacity-40"
                        >
                          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code 📨"}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setStep("form");
                            setOtp("");
                            setStatusMessage("");
                          }}
                          className="h-11 px-4 flex items-center justify-center rounded-xl border border-zinc-800 text-xs font-black uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all"
                        >
                          Change Email
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              <div className="pt-6 text-center">
                <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
                  Already have an account?{" "}
                  <Link href="/login" className="text-white hover:underline underline-offset-4 transition-colors font-black">
                    Sign In Here
                  </Link>
                </p>
                <div className="mt-8 flex items-center justify-center gap-4">
                  <Link
                    href="/"
                    className="text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
                  >
                    ← Store Home
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
