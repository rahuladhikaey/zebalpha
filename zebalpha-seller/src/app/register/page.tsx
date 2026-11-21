"use client";

import { useState, useMemo, useEffect, useRef, Suspense } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Store,
  User,
  Mail,
  Phone,
  Lock,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Eye,
  EyeOff,
  CreditCard,
  MapPin,
  FileBadge2,
  AlertCircle,
} from "lucide-react";

const BUSINESS_CATEGORIES = [
  "Clothing & Apparel",
  "Sarees & Ethnic Wear",
  "T-Shirts & Streetwear",
  "Kurtis & Women's Fashion",
  "Men's Shirts & Polos",
  "Hoodies & Winterwear",
  "Jewellery & Accessories",
  "Footwear & Socks",
  "Watches & Lifestyle",
  "Home & Kitchen",
];

const INDIAN_STATE_NAMES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

function SellerRegisterContent() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<"info" | "otp" | "submitted">("info");

  // Clean Seller Fields (Enrolment ID ONLY — NO GSTIN, NO Bank Account No., NO PAN, NO Aadhaar!)
  const [sellerName, setSellerName] = useState("");
  const [shopName, setShopName] = useState("");
  const [businessCategory, setBusinessCategory] = useState("Clothing & Apparel");
  const [enrolmentId, setEnrolmentId] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [upiId, setUpiId] = useState("");
  const [email, setEmail] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("West Bengal");
  const [pincode, setPincode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Instant Enrolment ID Format + Duplicate Check (Without PAN!)
  const [taxVerifying, setTaxVerifying] = useState(false);
  const [taxVerifyState, setTaxVerifyState] = useState<{
    status: "idle" | "verified" | "error";
    message: string;
    legalName?: string | null;
    stateName?: string | null;
  }>({ status: "idle", message: "" });

  // Email OTP Verification
  const [otpInput, setOtpInput] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  useEffect(() => {
    const catParam = searchParams.get("category");
    if (catParam) {
      const matched = BUSINESS_CATEGORIES.find((c) =>
        c.toLowerCase().includes(catParam.toLowerCase())
      );
      setBusinessCategory(matched || catParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (step === "otp" && otpInputRef.current) {
      setTimeout(() => otpInputRef.current?.focus(), 150);
    }
  }, [step]);

  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: "Empty", color: "bg-[#EAD296]" };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 2) return { score: 33, label: "Weak", color: "bg-[#F03A46]" };
    if (score <= 4) return { score: 66, label: "Medium", color: "bg-[#F5B922]" };
    return { score: 100, label: "Strong", color: "bg-emerald-500" };
  }, [password]);

  // Instant Enrolment ID format + duplicate check (NO PAN needed!)
  const verifyEnrolmentIdServer = async (cleanId: string): Promise<{ ok: boolean; error?: string }> => {
    setTaxVerifying(true);
    setTaxVerifyState({ status: "idle", message: "" });
    try {
      const res = await fetch("/api/seller/verify-tax-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enrolmentId: cleanId,
          mobile: mobileNumber.trim(),
          email: email.trim().toLowerCase(),
          businessName: shopName.trim() || sellerName.trim(),
        }),
      });
      const data = await res.json();
      if (data.verified || data.formatVerifiedOnly || data.manualReviewRequired) {
        setTaxVerifyState({
          status: "verified",
          message: data.message,
          legalName: data.legalName,
          stateName: data.stateName,
        });
        if (data.stateName && INDIAN_STATE_NAMES.includes(data.stateName)) {
          setState(data.stateName);
        }
        setTaxVerifying(false);
        return { ok: true };
      } else {
        const msg = data.error || data.message || "Could not verify Enrolment ID. Please check and try again.";
        setTaxVerifyState({
          status: "error",
          message: msg,
        });
        setTaxVerifying(false);
        return { ok: false, error: msg };
      }
    } catch {
      const msg = "Verification service unreachable right now. Please try again.";
      setTaxVerifyState({
        status: "error",
        message: msg,
      });
      setTaxVerifying(false);
      return { ok: false, error: msg };
    }
  };

  const handleVerifyEnrolmentId = async () => {
    const cleanId = enrolmentId.trim().toUpperCase();
    if (!cleanId) return;
    await verifyEnrolmentIdServer(cleanId);
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const cleanEnrolmentId = enrolmentId.trim().toUpperCase();

    if (
      !sellerName.trim() ||
      !shopName.trim() ||
      !cleanEnrolmentId ||
      !mobileNumber.trim() ||
      !email.trim() ||
      !pickupAddress.trim() ||
      !city.trim() ||
      !pincode.trim() ||
      !password
    ) {
      setError("Please fill in all required fields including your Enrolment ID, Pickup Address, and 6-digit Pincode.");
      return;
    }

    if (cleanEnrolmentId.length !== 15) {
      setError("Please enter your valid 15-character Enrolment ID (you can generate one free using the link below).");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(mobileNumber.trim())) {
      setError("Please enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (pincode.trim().length !== 6) {
      setError("Please enter a valid 6-digit pickup pincode.");
      return;
    }

    if (password.length < 8) {
      setError("For merchant security, password must be at least 8 characters long.");
      return;
    }

    setLoading(true);

    // Auto-check Enrolment ID format + uniqueness before sending Email OTP
    if (taxVerifyState.status !== "verified") {
      const checkRes = await verifyEnrolmentIdServer(cleanEnrolmentId);
      if (!checkRes.ok) {
        setError(checkRes.error || "Please enter a valid 15-character Enrolment ID.");
        setLoading(false);
        return;
      }
    }

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const res = await fetch("/api/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", email: normalizedEmail, purpose: "signup" }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to send verification OTP to email. Please try again.");
        setLoading(false);
        return;
      }

      setStep("otp");
      setResendCooldown(60);
      setInfoMessage(`Verification OTP sent to ${normalizedEmail}! Valid for 10 minutes.`);
    } catch {
      setError("Network error: Failed to connect to verification service.");
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
        body: JSON.stringify({ action: "resend", email: normalizedEmail, purpose: "signup" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResendCooldown(60);
        setOtpInput("");
        setInfoMessage(`New verification OTP sent to ${normalizedEmail}!`);
      } else {
        setError(data.error || "Failed to resend OTP.");
      }
    } catch {
      setError("Failed to resend verification code.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e?: React.FormEvent, overrideOtp?: string) => {
    if (e) e.preventDefault();
    setError("");

    const cleanOtp = (overrideOtp !== undefined ? overrideOtp : otpInput).trim();
    if (cleanOtp.length !== 6) {
      setError("Please enter the 6-digit OTP code sent to your email.");
      return;
    }

    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Server-side OTP Verification -> signed proof token
    let verifiedSignupToken = "";
    try {
      const verifyRes = await fetch("/api/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", email: normalizedEmail, otp: cleanOtp }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success || !verifyData.signupToken) {
        setError(verifyData.error || "Invalid or expired OTP code.");
        setLoading(false);
        return;
      }
      verifiedSignupToken = verifyData.signupToken;
    } catch {
      setError("Failed to verify OTP. Please try again.");
      setLoading(false);
      return;
    }

    // 2. Register via Verified Backend Endpoint (Enrolment ID ONLY — NO PAN / NO Bank Account / NO Aadhaar!)
    try {
      const finalUpi = upiId.trim() || `${mobileNumber.trim()}@upi`;
      const cleanEnrolmentId = enrolmentId.trim().toUpperCase();

      const signupRes = await fetch("/api/auth/signup-verified", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
          fullName: sellerName.trim(),
          phone: mobileNumber.trim(),
          shopName: shopName.trim(),
          upiId: finalUpi,
          pickupAddress: pickupAddress.trim(),
          city: city.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
          category: businessCategory,
          enrolmentId: cleanEnrolmentId,
          signupToken: verifiedSignupToken,
        }),
      });

      const signupData = await signupRes.json();

      if (!signupRes.ok || !signupData.success) {
        setError(signupData.error || "Could not complete verified registration. Please try again.");
        setLoading(false);
        return;
      }

      try {
        await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
      } catch {}

      // Save default pickup warehouse cleanly as before
      if (signupData?.user?.id) {
        try {
          await supabase.from("seller_pickup_locations").insert([
            {
              seller_id: signupData.user.id,
              name: `${shopName.trim()} Warehouse`,
              location_name: `${shopName.trim()} Warehouse`,
              address: pickupAddress.trim(),
              address_line1: pickupAddress.trim(),
              city: city.trim(),
              state: state.trim(),
              pincode: pincode.trim(),
              phone: mobileNumber.trim(),
              contact_phone: mobileNumber.trim(),
              contact_name: sellerName.trim(),
              contact_email: normalizedEmail,
              is_default: true,
              is_active: true,
              approval_status: "approved",
              shiprocket_sync_status: "synced",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          ]);
        } catch {}
      }

      setStep("submitted");
    } catch {
      setError("Registration encountered an unexpected network error.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#FFF7F5] via-[#FFFDF8] to-[#FFF8E6] text-[#14120F]">
      {/* Official Top Header (Yellow + Gold + White + Bright Coral) */}
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
                Seller Registration
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
              href="/login"
              className="inline-flex items-center gap-1.5 rounded-xl border-[1.5px] border-[#F03A46]/40 bg-[#FFF4F2] px-4 py-2 text-xs font-extrabold text-[#F03A46] hover:bg-[#F03A46] hover:text-white transition"
            >
              Seller Login
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-2xl">
          <div className="rounded-[2.25rem] bg-white p-6 sm:p-10 border-[1.5px] border-[#EAD296] shadow-[0_20px_50px_rgba(166,124,28,0.14)] flex flex-col">
            {/* Stepper Header */}
            <div className="flex items-center justify-between gap-4 mb-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF4F2] border border-[#F03A46]/25 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-[#F03A46]">
                <ShieldCheck size={12} />
                <span>0% Commission Onboarding</span>
              </span>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-10 rounded-full transition-all ${step === "info" ? "bg-[#F03A46]" : "bg-[#F5B922]"}`} />
                <span className={`h-2 w-10 rounded-full transition-all ${step === "otp" ? "bg-[#F03A46]" : step === "submitted" ? "bg-emerald-500" : "bg-[#F0E2BE]"}`} />
              </div>
            </div>

            {step !== "submitted" && (
              <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-black text-[#14120F] tracking-tight">
                  {step === "info" ? "Create Your Seller Account" : "Verify Your Merchant Email"}
                </h1>
                <p className="text-xs sm:text-sm font-medium text-[#5C4E35] mt-1">
                  {step === "info"
                    ? "No Bank Account No., PAN, or Aadhaar required — start selling at 0% commission with safe 5-day direct UPI payouts."
                    : `Enter the 6-digit security code sent to ${email}`}
                </p>
              </div>
            )}

            {error && (
              <div className="mb-6 rounded-2xl bg-rose-50 p-4 border border-rose-200 flex items-start gap-2">
                <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-rose-700 leading-relaxed">{error}</p>
              </div>
            )}

            {/* STEP 1: REGISTRATION FORM */}
            {step === "info" && (
              <form className="space-y-4" onSubmit={handleSendOtp}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#4A3F2B] mb-1.5 flex items-center gap-1.5">
                      <User size={13} className="text-[#F03A46]" />
                      <span>Your Full Name *</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Rahul Sharma"
                      value={sellerName}
                      onChange={(e) => setSellerName(e.target.value)}
                      className="w-full rounded-2xl border-[1.5px] border-[#EAD296] bg-[#FFFDF8] px-4 py-3 text-sm font-semibold text-[#14120F] placeholder:text-[#9C8B6B] outline-none focus:border-[#F03A46] focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#4A3F2B] mb-1.5 flex items-center gap-1.5">
                      <Store size={13} className="text-[#F03A46]" />
                      <span>Store / Brand Name *</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Urban Threads Studio"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      className="w-full rounded-2xl border-[1.5px] border-[#EAD296] bg-[#FFFDF8] px-4 py-3 text-sm font-semibold text-[#14120F] placeholder:text-[#9C8B6B] outline-none focus:border-[#F03A46] focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Business Category & Enrolment ID (Enrolment ID Only — No PAN Needed) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#4A3F2B] mb-1.5 block">
                      Primary Category *
                    </label>
                    <select
                      value={businessCategory}
                      onChange={(e) => setBusinessCategory(e.target.value)}
                      className="w-full rounded-2xl border-[1.5px] border-[#EAD296] bg-[#FFFDF8] px-4 py-3 text-sm font-semibold text-[#14120F] outline-none focus:border-[#F03A46] focus:bg-white transition-all"
                    >
                      {BUSINESS_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#4A3F2B] mb-1.5 flex items-center gap-1.5">
                      <FileBadge2 size={13} className="text-[#9A6503]" />
                      <span>Enrolment ID * (No PAN Needed)</span>
                    </label>
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        required
                        maxLength={15}
                        placeholder="15-char Enrolment ID (e.g. 19E000123456789)"
                        value={enrolmentId}
                        onChange={(e) => {
                          setEnrolmentId(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
                          setTaxVerifyState({ status: "idle", message: "" });
                        }}
                        className="flex-1 min-w-0 rounded-2xl border-[1.5px] border-[#EAD296] bg-[#FFFDF8] px-3.5 py-3 text-xs font-mono font-bold text-[#14120F] placeholder:text-[#9C8B6B] outline-none focus:border-[#F03A46] focus:bg-white transition-all"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyEnrolmentId}
                        disabled={taxVerifying || enrolmentId.trim().length !== 15}
                        className="rounded-2xl bg-[#14120F] hover:bg-[#2B251D] text-[#FCE08A] px-3.5 py-2 text-[11px] font-black uppercase tracking-wider disabled:opacity-40 cursor-pointer shrink-0 transition"
                      >
                        {taxVerifying ? "..." : "Verify"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Live Enrolment ID Verification Status Feedback */}
                {taxVerifyState.status !== "idle" && (
                  <div
                    className={`rounded-2xl p-3.5 border text-xs font-bold flex items-start gap-2 ${
                      taxVerifyState.status === "verified"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-rose-50 border-rose-200 text-rose-700"
                    }`}
                  >
                    {taxVerifyState.status === "verified" ? (
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <span>{taxVerifyState.message}</span>
                  </div>
                )}

                <div className="text-[11px] font-medium text-[#6E5C3D] bg-[#FFFBF0] border border-[#EAD296]/80 rounded-xl px-3.5 py-2.5 space-y-1.5">
                  <p>
                    Enter your 15-character <strong>Enrolment ID</strong> to create your seller account (no PAN, Bank A/C, or Aadhaar needed).
                  </p>
                  <a
                    href="https://reg.gst.gov.in/registration/generateuid"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-black text-[#F03A46] hover:text-[#C82333] underline underline-offset-2 transition-colors"
                  >
                    <span>Don&apos;t have an Enrolment ID? Generate Free on Official Portal</span>
                    <ArrowRight size={12} />
                  </a>
                </div>

                {/* Phone & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#4A3F2B] mb-1.5 flex items-center gap-1.5">
                      <Phone size={13} className="text-[#F03A46]" />
                      <span>Mobile Number *</span>
                    </label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="10-digit mobile number"
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      className="w-full rounded-2xl border-[1.5px] border-[#EAD296] bg-[#FFFDF8] px-4 py-3 text-sm font-semibold text-[#14120F] placeholder:text-[#9C8B6B] outline-none focus:border-[#F03A46] focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#4A3F2B] mb-1.5 flex items-center gap-1.5">
                      <Mail size={13} className="text-[#F03A46]" />
                      <span>Business Email (OTP Verified) *</span>
                    </label>
                    <input
                      type="email"
                      required
                      maxLength={80}
                      placeholder="seller@business.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-2xl border-[1.5px] border-[#EAD296] bg-[#FFFDF8] px-4 py-3 text-sm font-semibold text-[#14120F] placeholder:text-[#9C8B6B] outline-none focus:border-[#F03A46] focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Payout UPI ID / UPI Number (No Bank Account / PAN / Aadhaar Needed) */}
                <div>
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#4A3F2B] mb-1.5 flex items-center justify-between gap-2 flex-wrap">
                    <span className="flex items-center gap-1.5 text-emerald-700">
                      <CreditCard size={13} />
                      <span>Payout UPI ID / UPI Number *</span>
                    </span>
                    <span className="text-[10px] text-[#7A6847] font-semibold normal-case">
                      No Bank A/C, PAN or Aadhaar needed • Safe 5-day UPI payouts
                    </span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. yourshop@upi or 9876543210@upi"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full rounded-2xl border-[1.5px] border-[#EAD296] bg-[#FFFDF8] px-4 py-3 text-sm font-mono font-bold text-[#14120F] placeholder:text-[#9C8B6B] outline-none focus:border-[#F03A46] focus:bg-white transition-all"
                  />
                  <p className="mt-1.5 text-[11px] font-medium text-[#6E5C3D]">
                    100% Private &amp; Safe: Your income is transferred directly to your UPI ID / UPI Number within 5 days of delivery.
                  </p>
                </div>

                {/* Pickup / Warehouse Location */}
                <div className="space-y-3 pt-3 border-t border-[#F0E2BE]">
                  <div>
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#4A3F2B] mb-1.5 flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <MapPin size={13} className="text-[#F03A46]" />
                        <span>Pickup / Warehouse Address *</span>
                      </span>
                      <span className="text-[10px] text-[#7A6847] font-semibold normal-case">
                        Where delivery partner collects parcels
                      </span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Shop / Studio address (e.g. Shop 4, Market Complex, Main Road)"
                      value={pickupAddress}
                      onChange={(e) => setPickupAddress(e.target.value)}
                      className="w-full rounded-2xl border-[1.5px] border-[#EAD296] bg-[#FFFDF8] px-4 py-3 text-sm font-semibold text-[#14120F] placeholder:text-[#9C8B6B] outline-none focus:border-[#F03A46] focus:bg-white transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] font-extrabold uppercase text-[#5C4E35] mb-1 block">City / Hub *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Kolkata, Surat"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full rounded-2xl border-[1.5px] border-[#EAD296] bg-[#FFFDF8] px-3.5 py-2.5 text-xs font-bold text-[#14120F] placeholder:text-[#9C8B6B] outline-none focus:border-[#F03A46] focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-extrabold uppercase text-[#5C4E35] mb-1 block">State *</label>
                      <select
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full rounded-2xl border-[1.5px] border-[#EAD296] bg-[#FFFDF8] px-3.5 py-2.5 text-xs font-bold text-[#14120F] outline-none focus:border-[#F03A46] focus:bg-white"
                      >
                        {INDIAN_STATE_NAMES.map((st) => (
                          <option key={st} value={st}>{st}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-extrabold uppercase text-[#5C4E35] mb-1 block">Pincode *</label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        placeholder="700001"
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="w-full rounded-2xl border-[1.5px] border-[#EAD296] bg-[#FFFDF8] px-3.5 py-2.5 text-xs font-bold text-[#14120F] placeholder:text-[#9C8B6B] outline-none focus:border-[#F03A46] focus:bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Strong Password Input */}
                <div>
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#4A3F2B] mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Lock size={13} className="text-[#F03A46]" />
                      <span>Create Strong Password *</span>
                    </span>
                    {password && (
                      <span className="text-[10px] font-black uppercase">{passwordStrength.label}</span>
                    )}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      maxLength={64}
                      autoComplete="new-password"
                      placeholder="Minimum 8 characters (letters + numbers)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-2xl border-[1.5px] border-[#EAD296] bg-[#FFFDF8] px-4 py-3 pr-12 text-sm font-semibold text-[#14120F] placeholder:text-[#9C8B6B] outline-none focus:border-[#F03A46] focus:bg-white transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7A6847] hover:text-[#14120F] p-1 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {password && (
                    <div className="mt-2 h-1.5 w-full bg-[#F3E7C8] rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-300 ${passwordStrength.color}`} style={{ width: `${passwordStrength.score}%` }} />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#F03A46] via-[#FF5757] to-[#E63946] text-sm font-black uppercase tracking-wider text-white shadow-[0_10px_24px_rgba(240,58,70,0.3)] hover:brightness-105 active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer"
                >
                  <span>{loading ? "Sending Verification OTP..." : "Verify Email & Start Selling"}</span>
                  <ArrowRight size={18} />
                </button>
              </form>
            )}

            {/* STEP 2: OTP VERIFICATION */}
            {step === "otp" && (
              <form className="space-y-5" onSubmit={handleRegisterSubmit}>
                {infoMessage && (
                  <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-200">
                    <p className="text-xs font-bold text-emerald-800 flex items-center gap-2">
                      <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                      <span>{infoMessage}</span>
                    </p>
                  </div>
                )}

                <div className="rounded-2xl bg-[#FFF9EB] p-4 border border-[#EAD296] text-center space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[#9A6503]">
                    Security Code Sent To
                  </span>
                  <p className="text-sm font-extrabold text-[#14120F] truncate">{email}</p>
                  <button
                    type="button"
                    onClick={() => setStep("info")}
                    className="text-[11px] font-extrabold text-[#F03A46] hover:underline cursor-pointer"
                  >
                    Change Email / Edit Details
                  </button>
                </div>

                <div>
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#4A3F2B] mb-2 block text-center">
                    Enter 6-Digit Email OTP
                  </label>
                  <input
                    ref={otpInputRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    maxLength={6}
                    placeholder="• • • • • •"
                    value={otpInput}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                      setOtpInput(val);
                    }}
                    className="w-full text-center tracking-[0.55em] font-mono text-3xl font-black rounded-2xl border-2 border-[#DFBE6F] bg-[#FFFDF8] px-5 py-4 text-[#14120F] outline-none focus:border-[#F03A46] focus:bg-white"
                  />
                  <div className="flex items-center justify-between mt-3 px-1">
                    <span className="text-[11px] text-[#6E5C3D] font-medium">Valid for 10 minutes</span>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={loading || resendCooldown > 0}
                      className="text-[11px] font-extrabold text-[#F03A46] hover:underline disabled:opacity-40 cursor-pointer"
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep("info")}
                    className="h-14 px-6 rounded-2xl border border-[#EAD296] bg-[#FFFDF8] text-[#4A3F2B] font-bold text-xs uppercase cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || otpInput.length < 6}
                    className="flex-1 h-14 rounded-2xl bg-gradient-to-r from-[#F03A46] to-[#E63946] text-white font-black text-sm uppercase tracking-wider disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? "Creating Account..." : "Complete Registration"}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: SUBMITTED */}
            {step === "submitted" && (
              <div className="text-center py-6 space-y-5">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 border-2 border-emerald-300">
                  <CheckCircle2 size={34} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-[#14120F]">Seller Account Created!</h2>
                  <p className="mt-2 text-sm font-medium text-[#5C4E35] max-w-md mx-auto">
                    Your ZebAlpha seller account is ready. Log in to your Seller Dashboard to list products and start selling at 0% commission with fast 5-day UPI payouts!
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#F03A46] to-[#E63946] px-7 py-3.5 text-sm font-black uppercase tracking-wider text-white shadow-lg"
                  >
                    <span>Open Seller Dashboard</span>
                    <ArrowRight size={16} />
                  </Link>
                  <Link
                    href="/login?registered=1"
                    className="inline-flex items-center justify-center rounded-2xl border border-[#EAD296] bg-[#FFFDF8] px-6 py-3.5 text-xs font-extrabold text-[#4A3F2B]"
                  >
                    Go to Seller Login
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function SellerRegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FFFDF8]">
          <div className="animate-spin rounded-full h-9 w-9 border-2 border-[#EAD296] border-t-[#F03A46]" />
        </div>
      }
    >
      <SellerRegisterContent />
    </Suspense>
  );
}
