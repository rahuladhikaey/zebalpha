"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, Lock, Mail, RefreshCw, ShieldCheck } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<"request" | "verify">("request");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

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
        body: JSON.stringify({ action: "generate", email: normalizedEmail, purpose: "reset" }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Failed to send reset OTP. Please check your email.");
        setLoading(false);
        return;
      }

      setStep("verify");
      setResendCooldown(60);
      setSuccessMsg(`Verification OTP sent to ${normalizedEmail}! Please check your inbox and spam folder.`);
    } catch {
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
        body: JSON.stringify({ action: "resend", email: normalizedEmail, purpose: "reset" }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setResendCooldown(60);
        setOtpCode("");
        setSuccessMsg(`New verification OTP sent to ${normalizedEmail}!`);
      } else {
        setError(data.error || "Failed to resend OTP. Please try again.");
      }
    } catch {
      setError("Failed to resend verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const verifyRes = await fetch("/api/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", email: normalizedEmail, otp: otpCode }),
      });
      const verifyData = await verifyRes.json();

      if (!verifyRes.ok || !verifyData.success || !verifyData.resetToken) {
        setError(verifyData.error || "Invalid or expired OTP code.");
        setLoading(false);
        return;
      }

      const resetRes = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          newPassword,
          resetToken: verifyData.resetToken,
        }),
      });
      const resetData = await resetRes.json();

      if (!resetRes.ok || !resetData.success) {
        setError(resetData.error || "Failed to reset password.");
        setLoading(false);
        return;
      }

      setSuccessMsg("Password updated securely! Redirecting you to Seller Login...");
      setTimeout(() => {
        window.location.href = "/login";
      }, 1800);
    } catch {
      setError("An unexpected error occurred during password reset.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#FFF7F5] via-[#FFFDF8] to-[#FFF8E6] text-[#14120F]">
      <header className="sticky top-0 z-40 border-b border-[#EAD296]/70 bg-white/95 backdrop-blur-md">
        <div className="h-1 w-full bg-gradient-to-r from-[#F03A46] via-[#F5B922] to-[#F03A46]" />
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3.5">
          <Link href="/" className="flex items-center gap-2.5">
            <img
              src="/official-logo.png"
              alt="ZebAlpha Seller Hub"
              className="h-10 w-10 rounded-full object-cover border-2 border-[#DFBE6F] shadow-sm"
            />
            <div className="leading-tight">
              <span className="block text-base sm:text-lg font-black tracking-tight text-[#000000]">
                ZEBALPHA
              </span>
              <span className="block text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#9A6503]">
                Seller Hub
              </span>
            </div>
          </Link>

          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#EAD296] bg-[#FFFDF8] px-3.5 py-2 text-xs font-bold text-[#4A3F2B] hover:border-[#C68A12] hover:text-[#14120F] transition"
          >
            <ArrowLeft size={14} />
            <span>Back to Login</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 py-10">
        <div className="w-full max-w-md">
          <div className="rounded-[2.25rem] bg-white p-7 sm:p-10 border-[1.5px] border-[#EAD296] shadow-[0_20px_50px_rgba(166,124,28,0.14)] flex flex-col">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#7A6847] hover:text-[#F03A46] mb-5 transition-colors w-fit"
            >
              <ArrowLeft size={15} />
              <span>Back to Seller Login</span>
            </Link>

            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF4F2] border border-[#F03A46]/25 text-[10px] font-black uppercase tracking-widest text-[#F03A46] mb-2">
                <Lock size={11} />
                <span>Account Recovery</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-[#14120F]">
                {step === "request" ? "Reset Seller Password" : "Verify OTP & Set Password"}
              </h1>
              <p className="text-xs font-medium text-[#5C4E35] mt-1 leading-relaxed">
                {step === "request"
                  ? "Enter your registered seller email to receive a verified 6-digit security OTP."
                  : "Enter the 6-digit code sent to your email along with your new password."}
              </p>
            </div>

            {error && (
              <div className="mb-5 rounded-2xl bg-rose-50 p-3.5 border border-rose-200">
                <p className="text-xs font-bold text-rose-700 leading-snug">{error}</p>
              </div>
            )}

            {successMsg && (
              <div className="mb-5 rounded-2xl bg-emerald-50 p-3.5 border border-emerald-200 flex items-start gap-2">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-emerald-800 leading-snug">{successMsg}</p>
              </div>
            )}

            {step === "request" ? (
              <form className="space-y-4" onSubmit={handleSendOtp}>
                <div>
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[#4A3F2B] mb-1.5 flex items-center gap-1.5">
                    <Mail size={13} className="text-[#F03A46]" />
                    <span>Registered Email Address *</span>
                  </label>
                  <input
                    type="email"
                    required
                    maxLength={80}
                    placeholder="seller@business.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border-[1.5px] border-[#EAD296] bg-[#FFFDF8] px-4 py-3.5 text-sm font-semibold text-[#14120F] placeholder:text-[#9C8B6B] outline-none focus:border-[#F03A46] focus:bg-white transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="mt-4 flex h-13 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#F03A46] via-[#FF5757] to-[#E63946] py-3.5 text-sm font-black uppercase tracking-wider text-white shadow-[0_10px_24px_rgba(240,58,70,0.3)] hover:brightness-105 active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer"
                >
                  {loading ? "Sending OTP..." : "Send Verification OTP"}
                </button>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={handleResetSubmit}>
                <div className="rounded-2xl bg-[#FFF9EB] p-3.5 border border-[#EAD296] text-center space-y-0.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#9A6503]">
                    OTP Code Sent To
                  </span>
                  <p className="text-xs font-extrabold text-[#14120F] truncate">{email}</p>
                </div>

                <div>
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[#4A3F2B] mb-1.5 block">
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
                    className="w-full text-center tracking-[0.5em] font-mono text-2xl font-black rounded-2xl border-[1.5px] border-[#DFBE6F] bg-[#FFFDF8] px-5 py-3.5 text-[#14120F] outline-none focus:border-[#F03A46] focus:bg-white transition-all"
                  />
                  <div className="flex items-center justify-between mt-2.5 px-1">
                    <span className="text-[11px] text-[#6E5C3D] font-medium">
                      Check inbox & spam
                    </span>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={loading || resendCooldown > 0}
                      className="text-[11px] font-extrabold text-[#F03A46] hover:underline disabled:opacity-40 transition-colors cursor-pointer inline-flex items-center gap-1"
                    >
                      <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-extrabold uppercase tracking-wider text-[#4A3F2B] mb-1.5 block">
                    New Password (min 8 chars) *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      maxLength={64}
                      placeholder="Enter new strong password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full rounded-2xl border-[1.5px] border-[#EAD296] bg-[#FFFDF8] px-4 py-3.5 pr-12 text-sm font-semibold text-[#14120F] placeholder:text-[#9C8B6B] outline-none focus:border-[#F03A46] focus:bg-white transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7A6847] hover:text-[#14120F] transition-colors p-1 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6 || newPassword.length < 8}
                  className="mt-4 flex h-13 w-full items-center justify-center rounded-2xl bg-gradient-to-r from-[#F03A46] via-[#FF5757] to-[#E63946] py-3.5 text-sm font-black uppercase tracking-wider text-white shadow-[0_10px_24px_rgba(240,58,70,0.3)] hover:brightness-105 active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer"
                >
                  {loading ? "Updating Password..." : "Verify OTP & Update Password"}
                </button>

                <button
                  type="button"
                  onClick={() => setStep("request")}
                  disabled={loading}
                  className="w-full text-center text-xs font-bold text-[#7A6847] hover:text-[#14120F] transition-colors pt-1 cursor-pointer"
                >
                  Change Email
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
