"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { ArrowLeft, Eye, EyeOff, Lock, Mail, RefreshCw } from "lucide-react";

const EMAILJS_SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "service_5apvm6b";
const EMAILJS_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || "template_hhuloji";
const EMAILJS_PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || "ZR5LIJWz_4EsCSc_a";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<"request" | "verify">("request");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Countdown timer for Resend OTP
  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendCooldown]);

  // Client-side EmailJS fallback dispatch
  const sendEmailJsDirect = async (targetEmail: string, passcode: string) => {
    try {
      await fetch("https://api.emailjs.com/api/v1.0/email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: EMAILJS_SERVICE_ID,
          template_id: EMAILJS_TEMPLATE_ID,
          user_id: EMAILJS_PUBLIC_KEY,
          template_params: {
            email: targetEmail,
            to_email: targetEmail,
            passcode: passcode,
            otp: passcode,
            code: passcode,
            to_name: "Merchant",
            time: "15 minutes",
          },
        }),
      });
    } catch (err) {
      console.warn("Forgot-password direct EmailJS dispatch note:", err);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const res = await fetch("/api/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", email: normalizedEmail }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Failed to send reset OTP. Please check your email.");
        setLoading(false);
        return;
      }

      if (data.otp && !data.emailSent) {
        sendEmailJsDirect(normalizedEmail, data.otp);
      }

      setStep("verify");
      setResendCooldown(60);
      setSuccessMsg(`✓ Verification OTP sent to ${normalizedEmail}! Please check your email inbox and spam folder.`);
    } catch (err: any) {
      setError("Failed to connect to OTP service. Please try again.");
    }
    setLoading(false);
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setError("");
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const res = await fetch("/api/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resend", email: normalizedEmail }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        if (data.otp && !data.emailSent) {
          sendEmailJsDirect(normalizedEmail, data.otp);
        }
        setResendCooldown(60);
        setOtpCode("");
        setSuccessMsg(`✓ New verification OTP sent to ${normalizedEmail}! Please check your email.`);
      } else {
        setError(data.error || "Failed to resend OTP. Please try again.");
      }
    } catch (err) {
      setError("Failed to resend verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const verifyRes = await fetch("/api/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", email: normalizedEmail, otp: otpCode }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok || !verifyData.success) {
        setError(verifyData.error || "Invalid or expired OTP code.");
        setLoading(false);
        return;
      }

      const resetRes = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, newPassword }),
      });
      const resetData = await resetRes.json();

      if (!resetRes.ok || !resetData.success) {
        setError(resetData.error || "Failed to reset password.");
        setLoading(false);
        return;
      }

      setSuccessMsg("✓ Password updated successfully! Redirecting to login portal...");
      setTimeout(() => {
        window.location.href = "/";
      }, 1800);

    } catch (err: any) {
      setError("An unexpected error occurred during password reset.");
    }
    setLoading(false);
  };

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center p-4 text-white overflow-hidden bg-black">
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-white/[0.03] rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-white/[0.02] rounded-full blur-[120px] -z-10" />

      <div className="absolute top-10 right-10">
        <DarkModeToggle />
      </div>

      <div className="w-full max-w-md">
        <div className="rounded-[2.5rem] bg-zinc-950 p-8 md:p-12 backdrop-blur-xl border border-zinc-800 shadow-2xl flex flex-col">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Back to Login</span>
          </Link>

          <div className="mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">
              <Lock size={11} className="text-emerald-400" />
              <span>Merchant Account Recovery</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              {step === "request" ? "Forgot Password" : "Reset Password via OTP"}
            </h1>
            <p className="text-xs font-bold text-zinc-400 mt-1">
              {step === "request"
                ? "Enter your registered seller email to receive a 6-digit OTP code."
                : "Enter the 6-digit OTP code sent to your email along with your new password."}
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-2xl bg-rose-950/40 p-4 border border-rose-800/50">
              <p className="text-xs font-bold text-rose-400 leading-snug">
                {error}
              </p>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 rounded-2xl bg-zinc-900 p-4 border border-zinc-700">
              <p className="text-xs font-bold text-white leading-snug">
                {successMsg}
              </p>
            </div>
          )}

          {step === "request" ? (
            <form className="space-y-4" onSubmit={handleSendOtp}>
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center gap-1.5">
                  <Mail size={13} className="text-white" />
                  <span>Registered Email Address *</span>
                </label>
                <input
                  type="email"
                  required
                  maxLength={60}
                  placeholder="seller@business.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/90 px-5 py-4 text-sm font-bold text-white outline-none focus:border-white transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="mt-6 flex h-14 w-full items-center justify-center rounded-2xl bg-white text-sm font-black uppercase tracking-widest text-black shadow-xl hover:bg-zinc-200 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading ? "Sending OTP..." : "Send OTP Verification Code"}
              </button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={handleResetSubmit}>
              <div className="rounded-2xl bg-zinc-900/80 p-3.5 border border-zinc-800 text-center space-y-0.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  OTP Code Sent To
                </span>
                <p className="text-xs font-extrabold text-white truncate">{email}</p>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-zinc-400 mb-1 block">
                  6-Digit Verification OTP *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  maxLength={6}
                  placeholder="• • • • • •"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="w-full text-center tracking-[0.5em] font-mono text-2xl font-black rounded-2xl border border-zinc-800 bg-zinc-900/90 px-5 py-4 text-white outline-none focus:border-white transition-all"
                />
                <div className="flex items-center justify-between mt-2.5 px-1">
                  <span className="text-[11px] text-zinc-400 font-medium">
                    Check inbox & spam
                  </span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading || resendCooldown > 0}
                    className="text-[11px] font-bold text-white hover:underline disabled:opacity-40 transition-colors cursor-pointer inline-flex items-center gap-1"
                  >
                    <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code 📨"}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-zinc-400 mb-1 block">
                  New Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    maxLength={30}
                    placeholder="Enter new password (min 6 chars)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/90 px-5 py-4 text-sm font-bold text-white outline-none focus:border-white transition-all pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors p-1 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otpCode.length !== 6 || !newPassword || newPassword.length < 6}
                className="mt-6 flex h-14 w-full items-center justify-center rounded-2xl bg-white text-sm font-black uppercase tracking-widest text-black shadow-xl hover:bg-zinc-200 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading ? "Updating Password..." : "Verify OTP & Update Password"}
              </button>

              <button
                type="button"
                onClick={() => setStep("request")}
                disabled={loading}
                className="w-full text-center text-xs font-bold text-zinc-400 hover:text-white transition-colors pt-2 cursor-pointer"
              >
                Change Email
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
