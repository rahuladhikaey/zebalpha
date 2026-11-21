"use client";

import { useEffect, useState, Suspense } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  ShieldCheck,
  Lock,
  ArrowLeft,
  ArrowRight,
  Percent,
  Truck,
  Wallet,
  CheckCircle2,
} from "lucide-react";

function getSafeDashboardRedirect(raw: string | null): string {
  if (!raw) return "/dashboard";
  if ((raw === "/dashboard" || raw.startsWith("/dashboard/")) && !raw.startsWith("//")) {
    return raw;
  }
  return "/dashboard";
}

function LoginContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    const reasonParam = searchParams.get("reason");
    const loggedOutParam = searchParams.get("logged_out");
    const registeredParam = searchParams.get("registered");

    if (errorParam === "unauthorized") {
      setError("Protected Access: Please sign in with your verified seller account to open the Seller Dashboard.");
    } else if (errorParam === "pending") {
      setStatusMessage("Your seller registration is currently pending Admin verification. You will be notified once approved.");
    } else if (errorParam === "rejected") {
      setError(`Your seller registration was rejected${reasonParam ? `: ${reasonParam}` : "."}`);
    } else if (errorParam === "session_expired") {
      setError("Your login session expired for security. Please sign in again.");
    } else if (loggedOutParam === "1") {
      setStatusMessage("You have been safely signed out of your Seller Dashboard.");
    } else if (registeredParam === "1") {
      setStatusMessage("Account created! Sign in with your registered email and password.");
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStatusMessage("");
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      let authRes: any = null;
      try {
        authRes = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
      } catch (fetchErr: any) {
        console.error("Supabase auth exception:", fetchErr);
        setError("Network error connecting to authentication service. Please try again.");
        setLoading(false);
        return;
      }

      const data = authRes?.data;
      const authError = authRes?.error;

      if (authError || !data?.user) {
        setError(authError?.message || "Invalid merchant email or password.");
        setLoading(false);
        return;
      }

      const user = data.user;

      try {
        await supabase
          .from("sellers")
          .update({ user_id: user.id })
          .eq("email", normalizedEmail)
          .is("user_id", null);
      } catch (linkErr) {
        console.warn("Notice linking user_id:", linkErr);
      }

      const { data: sellerData } = await supabase
        .from("sellers")
        .select("status, account_status, rejection_reason")
        .or(`user_id.eq.${user.id},email.eq.${normalizedEmail}`)
        .maybeSingle();

      let activeSellerData = sellerData;

      if (!activeSellerData) {
        const generatedSellerCode = `SEL-${Math.floor(100000 + Math.random() * 900000)}`;
        const sellerPayload = {
          id: user.id,
          user_id: user.id,
          seller_id: generatedSellerCode,
          full_name: user.user_metadata?.full_name || "Seller",
          owner_name: user.user_metadata?.full_name || "Seller",
          business_name: "ZebAlpha Apparel Store",
          mobile_number: user.phone || "",
          phone_number: user.phone || "",
          email: normalizedEmail,
          category: "Apparel & Streetwear",
          business_category: "Apparel & Streetwear",
          status: "approved",
          account_status: "Active",
          email_verified: true,
          delete_requested: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data: newSellerData, error: insertErr } = await supabase
          .from("sellers")
          .insert([sellerPayload])
          .select("status, account_status, rejection_reason")
          .maybeSingle();

        if (insertErr) {
          console.warn("Auto-creation of seller record failed:", insertErr);
          setError("Access Denied. No active seller profile was found for this email.");
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        activeSellerData = newSellerData || {
          status: "approved",
          account_status: "Active",
          rejection_reason: null,
        };

        try {
          await supabase.from("profiles").upsert({
            id: user.id,
            email: normalizedEmail,
            full_name: user.user_metadata?.full_name || "Seller",
            role: "seller",
            status: "active",
            updated_at: new Date().toISOString(),
          });
        } catch (profErr) {
          console.warn("Auto-update profile role failed:", profErr);
        }
      }

      if (activeSellerData) {
        const accStatus = (activeSellerData.account_status || activeSellerData.status || "Active").toLowerCase();
        if (accStatus === "pending") {
          setStatusMessage(
            "Your seller account registration is currently pending Admin verification. You will be notified once approved."
          );
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }
        if (accStatus === "rejected") {
          setError(
            `Your seller registration was rejected. Reason: ${activeSellerData.rejection_reason || "Not specified"}`
          );
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }
        if (accStatus === "suspended") {
          setError("Your seller account has been suspended by Administration. Please contact support@zebalpha.shop.");
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }
      }

      const safeTarget = getSafeDashboardRedirect(searchParams.get("redirect"));
      window.location.href = safeTarget;
    } catch {
      setError("An unexpected error occurred. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#FFF7F5] via-[#FFFDF8] to-[#FFF8E6] text-[#14120F]">
      {/* Official Top Bar */}
      <header className="sticky top-0 z-40 border-b border-[#EAD296]/70 bg-white/95 backdrop-blur-md">
        <div className="h-1 w-full bg-gradient-to-r from-[#F03A46] via-[#F5B922] to-[#F03A46]" />
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6 py-3.5">
          <Link href="/" className="flex items-center gap-2.5 group">
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

          <div className="flex items-center gap-2.5">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#EAD296] bg-[#FFFDF8] px-3.5 py-2 text-xs font-bold text-[#4A3F2B] hover:border-[#C68A12] hover:text-[#14120F] transition"
            >
              <ArrowLeft size={14} />
              <span className="hidden sm:inline">Seller Home</span>
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#F03A46] to-[#FF5757] px-4 py-2 text-xs font-extrabold text-white shadow-[0_6px_16px_rgba(240,58,70,0.28)] hover:brightness-105 transition"
            >
              <span>Start Selling</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Split Body */}
      <main className="flex-1 flex items-center justify-center px-4 py-10 sm:py-14">
        <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          {/* Left Value Panel */}
          <div className="hidden lg:flex flex-col justify-between rounded-[2rem] border border-[#EAD296] bg-gradient-to-br from-[#FFF4F2] via-[#FFFDF8] to-[#FFF3C4]/70 p-10 shadow-[0_18px_45px_rgba(166,124,28,0.12)] relative overflow-hidden">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-14 -top-14 h-48 w-48 rounded-full bg-[#F03A46]/10 blur-3xl"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-16 -left-12 h-52 w-52 rounded-full bg-[#F5B922]/20 blur-3xl"
            />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#F03A46]/25 bg-white px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider text-[#F03A46] shadow-sm">
                <ShieldCheck size={14} />
                <span>Verified Merchant Access</span>
              </div>

              <h2 className="mt-5 text-3xl font-black tracking-tight text-[#000000] leading-[1.15]">
                Welcome back to ZebAlpha Seller Panel
              </h2>
              <p className="mt-3 text-sm font-medium text-[#5C4E35] leading-relaxed">
                Manage your live catalogs, accept Pan-India customer orders, print shipping labels, and receive fast 5-day UPI payouts safely—without sharing Bank Account No., PAN, or Aadhaar.
              </p>

              <div className="mt-7 space-y-3.5">
                {[
                  {
                    icon: Percent,
                    title: "0% Marketplace Commission",
                    desc: "Keep 100% of your product margin with zero hidden cuts.",
                  },
                  {
                    icon: Truck,
                    title: "28,000+ Serviceable Pincodes",
                    desc: "Automated doorstep pickup and nationwide ZebAlpha courier tracking.",
                  },
                  {
                    icon: Wallet,
                    title: "Fast 5-Day Safe UPI Payouts",
                    desc: "No Bank Account No., PAN, or Aadhaar needed — direct UPI ID / UPI Number payouts within 5 days.",
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.title}
                      className="flex items-start gap-3.5 rounded-2xl border border-[#EAD296]/80 bg-white/90 p-3.5 shadow-sm"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#FFF3C4] to-[#FCE08A] text-[#9A6503] border border-[#DFBE6F]">
                        <Icon size={18} />
                      </span>
                      <div>
                        <p className="text-sm font-extrabold text-[#14120F]">{item.title}</p>
                        <p className="text-xs font-medium text-[#5C4E35] mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="relative z-10 mt-8 pt-5 border-t border-[#EAD296]/70 flex items-center justify-between text-xs font-bold text-[#6E5C3D]">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-600" />
                256-bit Encrypted Session
              </span>
              <a
                href="https://zebalpha.shop"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#F03A46] hover:underline font-extrabold"
              >
                Visit ZebAlpha Store →
              </a>
            </div>
          </div>

          {/* Right Login Card */}
          <div className="w-full max-w-md mx-auto">
            <div className="rounded-[2rem] bg-white border-[1.5px] border-[#EAD296] p-7 sm:p-9 shadow-[0_20px_50px_rgba(166,124,28,0.14)]">
              <div className="flex flex-col items-center text-center mb-7">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#FFF9EB] border-2 border-[#DFBE6F] p-1 shadow-md">
                  <img
                    src="/official-logo.png"
                    alt="ZEBALPHA Logo"
                    className="h-full w-full rounded-full object-cover"
                  />
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF4F2] border border-[#F03A46]/25 text-[10px] font-black uppercase tracking-widest text-[#F03A46] mb-2">
                  <Lock size={11} />
                  <span>Secure Seller Login</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#14120F]">
                  Login to Seller Panel
                </h1>
                <p className="mt-1.5 text-xs text-[#5C4E35] font-medium">
                  Sign in with your registered ZebAlpha merchant email.
                </p>
              </div>

              <form className="space-y-4" onSubmit={handleLogin}>
                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-[#4A3F2B]">
                    Merchant Email Address
                  </label>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    maxLength={80}
                    placeholder="seller@yourbusiness.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border-[1.5px] border-[#EAD296] bg-[#FFFDF8] px-4 py-3.5 text-sm font-semibold text-[#14120F] outline-none placeholder:text-[#9C8B6B] focus:border-[#F03A46] focus:bg-white focus:ring-4 focus:ring-[#F03A46]/10 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-[#4A3F2B]">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete="current-password"
                      maxLength={64}
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-2xl border-[1.5px] border-[#EAD296] bg-[#FFFDF8] px-4 py-3.5 pr-11 text-sm font-semibold text-[#14120F] outline-none placeholder:text-[#9C8B6B] focus:border-[#F03A46] focus:bg-white focus:ring-4 focus:ring-[#F03A46]/10 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#7A6847] hover:text-[#14120F] transition-colors p-1 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Link
                    href="/forgot-password"
                    className="text-xs font-extrabold text-[#9A6503] hover:text-[#F03A46] underline transition-colors"
                  >
                    Forgot Password?
                  </Link>
                </div>

                {error && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 leading-relaxed">
                    {error}
                  </div>
                )}

                {statusMessage && (
                  <div className="p-3.5 rounded-2xl bg-[#FFF8DB] border border-[#E4C988] text-xs font-bold text-[#6E4900] leading-relaxed">
                    {statusMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-[#F03A46] via-[#FF5757] to-[#E63946] hover:brightness-105 text-white text-sm font-black uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-[0_10px_24px_rgba(240,58,70,0.3)]"
                >
                  {loading ? "Authenticating..." : "Sign In to Seller Dashboard"}
                </button>
              </form>

              <div className="mt-6 border-t border-[#F0E2BE] pt-5 text-center space-y-2.5">
                <p className="text-xs font-semibold text-[#5C4E35]">
                  New to ZebAlpha Seller Hub?{" "}
                  <Link
                    href="/register"
                    className="text-[#F03A46] font-black underline hover:text-[#C82333]"
                  >
                    Create Seller Account
                  </Link>
                </p>
                <div className="flex items-center justify-center gap-4 text-[11px] font-bold text-[#7A6847]">
                  <Link href="/" className="hover:text-[#14120F] transition-colors">
                    ← Seller Landing Page
                  </Link>
                  <span>•</span>
                  <a
                    href="https://zebalpha.shop"
                    className="hover:text-[#14120F] transition-colors"
                  >
                    Shop on ZebAlpha
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SellerLoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#FFFDF8] text-[#14120F]">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-9 w-9 border-2 border-[#EAD296] border-t-[#F03A46]" />
            <span className="text-xs font-bold text-[#6E5C3D]">Loading Seller Login...</span>
          </div>
        </main>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
