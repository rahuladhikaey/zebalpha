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
  const [tempOtp, setTempOtp] = useState("");
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
      // Step 1: Generate temporary OTP
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

      // Save the generated OTP and switch step
      setTempOtp(data.otp);
      setStep("otp");
      setStatusMessage("✅ Temporary OTP generated! Please enter it to verify.");
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
      // Step 2: Verify the OTP code
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

      // Step 3: Register the user with auto-confirmation
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

      setStatusMessage("✅ Account created and verified successfully!");
      
      // Clear form
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

      setTempOtp(data.otp);
      setStatusMessage("✅ A new temporary OTP has been generated!");
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
            <div className="mb-8 transition-transform hover:scale-110 duration-500">
              <Link href="/">
                <img src="/official-logo.png" alt="Asali Swad Logo" className="h-16 w-16 rounded-full object-cover shadow-2xl border-4 border-white" />
              </Link>
            </div>

            <div className="text-center mb-8">
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600">Join Us</span>
              <h1 className="mt-2 text-3xl md:text-4xl font-black tracking-tight text-slate-900">
                {step === "form" ? "Create Account" : "Verify Email"}
              </h1>
              <p className="mt-3 text-sm font-bold text-slate-400">
                {step === "form" ? "Join the premium spice community today." : "Enter the temporary code below."}
              </p>
            </div>

            <div className="w-full space-y-6">
              {step === "form" && (
                <>
                  <button
                    type="button"
                    onClick={handleGoogleAuth}
                    disabled={loading}
                    className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border-2 border-slate-50 bg-white px-6 text-sm font-black uppercase tracking-widest text-slate-700 transition-all hover:border-emerald-500/20 hover:bg-slate-50 hover:shadow-xl hover:shadow-emerald-900/5 disabled:opacity-50"
                  >
                    <svg viewBox="0 0 533.5 544.3" className="h-5 w-5" xmlns="http://www.w3.org/2000/svg">
                      <path fill="#4285F4" d="M533.5 278.4c0-17.4-1.6-34.1-4.6-50.4H272.1v95.5h146.9c-6.4 34.5-25.7 63.7-54.7 83.3v68.9h88.3c51.6-47.5 81.9-117.8 81.9-197.3z" />
                      <path fill="#34A853" d="M272.1 544.3c73.7 0 135.6-24.4 180.8-66.1l-88.3-68.9c-24.5 16.4-55.8 26-92.4 26-71 0-131-47.9-152.4-112.4H32.8v70.7c45.5 90.1 140 150.7 239.3 150.7z" />
                      <path fill="#FBBC05" d="M119.7 322.9c-10.9-32.7-10.9-67.9 0-100.6V151.6H32.8c-38.5 76.9-38.5 168.8 0 245.7l86.9-74.4z" />
                      <path fill="#EA4335" d="M272.1 107.7c39.9 0 75.8 13.7 104.1 40.7l78.1-78.1C402 24.5 339.5 0 272.1 0 173.8 0 79.4 60.6 33.9 150.7l86 70.8C141.1 155.6 201.1 107.7 272.1 107.7z" />
                    </svg>
                    Google Sign Up
                  </button>

                  <div className="flex items-center justify-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">
                    <span className="h-px flex-1 bg-slate-100"></span>
                    <span className="mx-4">or manual registration</span>
                    <span className="h-px flex-1 bg-slate-100"></span>
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
                        className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-6 py-4 text-sm font-bold outline-none transition-all placeholder:text-slate-300 focus:border-emerald-500/20 focus:bg-white focus:ring-4 focus:ring-emerald-500/5"
                      />
                    </div>
                    <div className="group relative">
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="New Password"
                        className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-6 py-4 text-sm font-bold outline-none transition-all placeholder:text-slate-300 focus:border-emerald-500/20 focus:bg-white focus:ring-4 focus:ring-emerald-500/5"
                      />
                    </div>
                    <div className="group relative">
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm Password"
                        className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 px-6 py-4 text-sm font-bold outline-none transition-all placeholder:text-slate-300 focus:border-emerald-500/20 focus:bg-white focus:ring-4 focus:ring-emerald-500/5"
                      />
                    </div>
                  </div>

                  {statusMessage ? (
                    <div className={`flex items-center gap-3 rounded-2xl p-4 border ${statusMessage.includes('created') || statusMessage.includes('check your email') || statusMessage.includes('generated') ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                      <p className="text-xs font-bold leading-snug">{statusMessage}</p>
                    </div>
                  ) : null}

                  <button
                    disabled={loading}
                    className="flex h-14 w-full items-center justify-center rounded-2xl bg-emerald-600 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-600/30 transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
                  >
                    {loading ? "Processing..." : "Create Account ✨"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleOtpSubmit} className="space-y-6">
                  <div className="rounded-2xl bg-emerald-50/50 p-6 border-2 border-emerald-100/50 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 mb-3">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-[11px] font-black uppercase tracking-widest text-emerald-800">Verification Code Sent</span>
                    <p className="mt-2 text-xs font-bold leading-relaxed text-slate-600">
                      We sent a 6-digit verification code to <span className="text-emerald-700 font-extrabold">{email}</span>. Please check your email inbox.
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
                      className="w-full text-center tracking-[0.5em] rounded-2xl border-2 border-slate-50 bg-slate-50 px-6 py-4 text-lg font-black outline-none transition-all placeholder:text-slate-300 placeholder:tracking-normal focus:border-emerald-500/20 focus:bg-white focus:ring-4 focus:ring-emerald-500/5"
                    />
                  </div>

                  {statusMessage ? (
                    <div className={`flex items-center gap-3 rounded-2xl p-4 border ${statusMessage.includes('success') || statusMessage.includes('verified') || statusMessage.includes('generated') ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                      <p className="text-xs font-bold leading-snug">{statusMessage}</p>
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    <button
                      disabled={loading || otpCode.length !== 6}
                      className="flex h-14 w-full items-center justify-center rounded-2xl bg-emerald-600 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-600/30 transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
                    >
                      {loading ? "Verifying..." : "Verify & Register ✨"}
                    </button>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={handleBackToForm}
                        disabled={loading}
                        className="flex-1 flex h-12 items-center justify-center rounded-xl border-2 border-slate-100 text-xs font-black uppercase tracking-wider text-slate-500 hover:bg-slate-50 transition-all disabled:opacity-50"
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={loading}
                        className="flex-1 flex h-12 items-center justify-center rounded-xl border-2 border-slate-100 text-xs font-black uppercase tracking-wider text-slate-500 hover:bg-slate-50 transition-all disabled:opacity-50"
                      >
                        Resend OTP
                      </button>
                    </div>
                  </div>
                </form>
              )}

              <div className="pt-6 text-center">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  Old friend? <Link href="/login" className="text-emerald-600 hover:text-emerald-700 transition-colors">Sign In Here</Link>
                </p>
                <div className="mt-8 flex items-center justify-center gap-4">
                  <Link href="/" className="text-[9px] font-black uppercase tracking-widest text-slate-300 hover:text-slate-900 transition-colors">← Store Home</Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}


