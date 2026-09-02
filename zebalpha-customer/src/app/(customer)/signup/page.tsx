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
  const [step, setStep] = useState<"form" | "otp">("form");
  const [otpCode, setOtpCode] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (email) {
      window.localStorage.setItem(SIGNUP_EMAIL_KEY, email);
    } else {
      window.localStorage.removeItem(SIGNUP_EMAIL_KEY);
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

    try {
      const response = await fetch("/api/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", email }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setStatusMessage(data.error || "Failed to generate verification OTP.");
        setLoading(false);
        return;
      }

      setStep("otp");
      setStatusMessage("Verification OTP sent to your email! Please check your inbox.");
    } catch (err) {
      setStatusMessage("Failed to connect to the verification service. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", email, otp: otpCode }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setStatusMessage(data.error || "Incorrect OTP. Please try again.");
        setLoading(false);
        return;
      }

      const registerResponse = await fetch("/api/auth/signup-verified", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const registerData = await registerResponse.json();

      if (!registerResponse.ok || !registerData.success) {
        setStatusMessage(registerData.error || "Failed to create account.");
        setLoading(false);
        return;
      }

      if (typeof window !== "undefined") {
        window.localStorage.removeItem(SIGNUP_EMAIL_KEY);
      }

      setStatusMessage("Account created and verified successfully!");

      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setOtpCode("");

      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err) {
      setStatusMessage("Verification failed. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setStatusMessage("");
    setLoading(true);

    try {
      const response = await fetch("/api/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resend", email }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        setStatusMessage(data.error || "Failed to resend OTP.");
        setLoading(false);
        return;
      }

      setStatusMessage("A new verification OTP has been sent to your email!");
    } catch (err) {
      setStatusMessage("Failed to resend OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToForm = () => {
    setStep("form");
    setOtpCode("");
    setStatusMessage("");
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
                {step === "form" ? "Create Account" : "Verify Email"}
              </h1>
              <p className="mt-3 text-sm font-bold text-zinc-400">
                {step === "form" ? "Join the premium boutique community today." : "Enter the verification code below."}
              </p>
            </div>

            <div className="w-full space-y-6">
              {step === "form" && (
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
                </>
              )}

              {step === "form" ? (
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
                    <div className={`flex items-center gap-3 rounded-2xl p-4 border ${statusMessage.includes('created') || statusMessage.includes('check your email') || statusMessage.includes('Verification OTP') ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-rose-950/60 border-rose-800/80 text-rose-400'}`}>
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
              ) : (
                <form onSubmit={handleOtpSubmit} className="space-y-6">
                  <div className="rounded-2xl bg-zinc-900 p-6 border border-zinc-800 text-center">
                    <span className="text-[11px] font-black uppercase tracking-widest text-zinc-400">Verification Code Sent</span>
                    <p className="mt-2 text-xs font-bold leading-relaxed text-zinc-300">
                      We sent a 6-digit verification code to <span className="text-white font-extrabold">{email}</span>. Please check your email inbox.
                    </p>
                  </div>

                  <div className="group relative">
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 6-Digit OTP"
                      className="w-full text-center tracking-[0.5em] rounded-2xl border border-zinc-800 bg-zinc-900 px-6 py-4 text-lg font-black text-white outline-none transition-all placeholder:text-zinc-500 placeholder:tracking-normal focus:border-white"
                    />
                  </div>

                  {statusMessage ? (
                    <div className={`flex items-center gap-3 rounded-2xl p-4 border ${statusMessage.includes('success') || statusMessage.includes('verified') ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-rose-950/60 border-rose-800/80 text-rose-400'}`}>
                      <p className="text-xs font-bold leading-snug">{statusMessage}</p>
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    <button
                      disabled={loading || otpCode.length !== 6}
                      className="flex h-14 w-full items-center justify-center rounded-2xl bg-white text-sm font-black uppercase tracking-widest text-black shadow-xl shadow-white/10 transition-all hover:bg-zinc-200 active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? "Verifying..." : "Verify & Register ✨"}
                    </button>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={handleBackToForm}
                        disabled={loading}
                        className="flex-1 flex h-12 items-center justify-center rounded-xl border border-zinc-800 text-xs font-black uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all disabled:opacity-50"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={loading}
                        className="flex-1 flex h-12 items-center justify-center rounded-xl border border-zinc-800 text-xs font-black uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all disabled:opacity-50"
                      >
                        Resend OTP
                      </button>
                    </div>
                  </div>
                </form>
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
