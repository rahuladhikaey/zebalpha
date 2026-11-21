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

function SellerRegisterContent() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<"info" | "otp" | "submitted">("info");

  // Required Fields
  const [sellerName, setSellerName] = useState("");
  const [shopName, setShopName] = useState("");
  const [businessCategory, setBusinessCategory] = useState("Clothing & Apparel");
  const [taxMode, setTaxMode] = useState<"gst" | "enrolment">("enrolment");
  const [gstOrEnrolmentId, setGstOrEnrolmentId] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [upiId, setUpiId] = useState("");
  const [email, setEmail] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("West Bengal");
  const [pincode, setPincode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // OTP Verification
  const [otpInput, setOtpInput] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  // Pre-fill category or non-GST mode from landing page links
  useEffect(() => {
    const catParam = searchParams.get("category");
    const gstParam = searchParams.get("gst");
    if (catParam) {
      const matched = BUSINESS_CATEGORIES.find((c) =>
        c.toLowerCase().includes(catParam.toLowerCase())
      );
      setBusinessCategory(matched || catParam);
    }
    if (gstParam === "none") {
      setTaxMode("enrolment");
    }
  }, [searchParams]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Autofocus OTP input when switching to OTP step
  useEffect(() => {
    if (step === "otp" && otpInputRef.current) {
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 150);
    }
  }, [step]);

  // Password Strength Calculation
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

  const parseErrorMsg = (err: any): string => {
    if (!err) return "";
    if (typeof err === "string") return err;
    if (err.message && typeof err.message === "string") return err.message;
    return "Registration encountered an issue. Please verify your details.";
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (
      !sellerName.trim() ||
      !shopName.trim() ||
      !mobileNumber.trim() ||
      !email.trim() ||
      !pickupAddress.trim() ||
      !city.trim() ||
      !pincode.trim() ||
      !password
    ) {
      setError("Please fill in all required fields including your Pickup Address and 6-digit Pincode.");
      return;
    }

    if (mobileNumber.trim().length !== 10) {
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
      setInfoMessage(
        `Verification OTP sent to ${normalizedEmail}! Please check your email inbox (and spam folder).`
      );
    } catch {
      setError("Network error: Failed to connect to verification service. Please try again.");
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
        setError(data.error || "Failed to resend OTP. Please try again.");
      }
    } catch {
      setError("Failed to resend verification code. Please try again.");
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

    // 1. Verify OTP Code & Obtain Cryptographically Signed Proof Token
    let verifiedSignupToken = "";
    try {
      const verifyRes = await fetch("/api/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", email: normalizedEmail, otp: cleanOtp }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success || !verifyData.signupToken) {
        setError(verifyData.error || "Invalid or expired OTP code. Please check your email and try again.");
        setLoading(false);
        return;
      }
      verifiedSignupToken = verifyData.signupToken;
    } catch {
      setError("Failed to verify OTP. Please try again.");
      setLoading(false);
      return;
    }

    // 2. Register Merchant Credentials via Server-Verified Endpoint (with cryptographic signupToken)
    try {
      const finalUpi = upiId.trim() || `${mobileNumber.trim()}@phonepe`;
      const finalPickupAddress = pickupAddress.trim();
      const finalCity = city.trim();
      const finalState = state.trim();
      const finalPincode = pincode.trim();

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
          pickupAddress: finalPickupAddress,
          city: finalCity,
          state: finalState,
          pincode: finalPincode,
          category: businessCategory,
          signupToken: verifiedSignupToken,
        }),
      });

      const signupData = await signupRes.json();

      // Strictly respect 409 duplicate-account security protection
      if (signupRes.status === 409) {
        setError(
          signupData.error ||
            "An account with this email already exists. Please log in instead."
        );
        setLoading(false);
        return;
      }

      let userId: string | undefined = signupData?.user?.id;

      if (!signupRes.ok || !signupData.success || !userId) {
        setError(signupData.error || "Could not complete verified registration. Please try again.");
        setLoading(false);
        return;
      }

      // 3. Establish authenticated session cookies cleanly so seller can enter dashboard & sync pickup location
      try {
        await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
      } catch (loginErr) {
        console.warn("Auto sign-in after registration notice:", loginErr);
      }

      // 4. Create dedicated default pickup hub row (RLS-authorized with active session)
      try {
        await supabase.from("seller_pickup_locations").insert([
          {
            seller_id: userId,
            name: `${shopName.trim()} Warehouse`,
            location_name: `${shopName.trim()} Warehouse`,
            address: finalPickupAddress,
            address_line1: finalPickupAddress,
            city: finalCity,
            state: finalState,
            pincode: finalPincode,
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
      } catch (locErr) {
        console.warn("seller_pickup_locations insert notice:", locErr);
      }

      // Optionally store GSTIN / Enrolment ID on seller profile if provided
      if (gstOrEnrolmentId.trim()) {
        try {
          await supabase
            .from("sellers")
            .update({
              gst_number: gstOrEnrolmentId.trim().toUpperCase(),
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);
        } catch {
          // ignore if column differs
        }
      }

      setStep("submitted");
    } catch (err: any) {
      console.error("Registration error:", err);
      setError(parseErrorMsg(err));
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#FFF7F5] via-[#FFFDF8] to-[#FFF8E6] text-[#14120F]">
      {/* Official Top Header */}
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
              <span className="block text-base sm:text-lg font-black tracking-tight text-[#14120F]">
                ZEB<span className="text-[#F03A46]">ALPHA</span>
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
                <span
                  className={`h-2 w-10 rounded-full transition-all ${
                    step === "info" ? "bg-[#F03A46]" : "bg-[#F5B922]"
                  }`}
                />
                <span
                  className={`h-2 w-10 rounded-full transition-all ${
                    step === "otp"
                      ? "bg-[#F03A46]"
                      : step === "submitted"
                      ? "bg-emerald-500"
                      : "bg-[#F0E2BE]"
                  }`}
                />
              </div>
            </div>

            {step !== "submitted" && (
              <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-black text-[#14120F] tracking-tight">
                  {step === "info" && "Create Your Seller Account"}
                  {step === "otp" && "Verify Your Merchant Email"}
                </h1>
                <p className="text-xs sm:text-sm font-medium text-[#5C4E35] mt-1">
                  {step === "info" &&
                    "Start selling across 28,000+ Indian pincodes with 0% commission & direct 7-day payouts."}
                  {step === "otp" && `Enter the 6-digit security code sent to ${email}`}
                </p>
              </div>
            )}

            {error && (
              <div className="mb-6 rounded-2xl bg-rose-50 p-4 border border-rose-200">
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

                {/* Business Category & Tax Mode */}
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
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#4A3F2B] mb-1.5 flex items-center gap-1.5">
                      <FileBadge2 size={13} className="text-[#9A6503]" />
                      <span>GST / Enrolment ID (Optional)</span>
                    </label>
                    <div className="flex gap-1.5 mb-1.5">
                      <button
                        type="button"
                        onClick={() => setTaxMode("enrolment")}
                        className={`flex-1 rounded-xl py-1.5 text-[10px] font-extrabold border transition cursor-pointer ${
                          taxMode === "enrolment"
                            ? "bg-[#FFF3C4] border-[#D49A18] text-[#14120F]"
                            : "bg-[#FFFDF8] border-[#EAD296] text-[#6E5C3D]"
                        }`}
                      >
                        No GST (Enrolment ID)
                      </button>
                      <button
                        type="button"
                        onClick={() => setTaxMode("gst")}
                        className={`flex-1 rounded-xl py-1.5 text-[10px] font-extrabold border transition cursor-pointer ${
                          taxMode === "gst"
                            ? "bg-[#FFF3C4] border-[#D49A18] text-[#14120F]"
                            : "bg-[#FFFDF8] border-[#EAD296] text-[#6E5C3D]"
                        }`}
                      >
                        Have Regular GSTIN
                      </button>
                    </div>
                    <input
                      type="text"
                      maxLength={20}
                      placeholder={
                        taxMode === "gst"
                          ? "Enter 15-digit GSTIN (optional)"
                          : "Enrolment ID / UIN (optional for now)"
                      }
                      value={gstOrEnrolmentId}
                      onChange={(e) => setGstOrEnrolmentId(e.target.value.toUpperCase())}
                      className="w-full rounded-xl border-[1.5px] border-[#EAD296] bg-[#FFFDF8] px-3.5 py-2 text-xs font-mono font-bold text-[#14120F] placeholder:text-[#9C8B6B] outline-none focus:border-[#F03A46] focus:bg-white transition-all"
                    />
                  </div>
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

                {/* Payout UPI ID */}
                <div>
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-[#4A3F2B] mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-emerald-700">
                      <CreditCard size={13} />
                      <span>Payout UPI ID / Bank UPI *</span>
                    </span>
                    <span className="text-[10px] text-[#7A6847] font-semibold normal-case">
                      For 7-day direct bank transfers
                    </span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. yourshop@ybl or 9876543210@paytm"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    className="w-full rounded-2xl border-[1.5px] border-[#EAD296] bg-[#FFFDF8] px-4 py-3 text-sm font-mono font-bold text-[#14120F] placeholder:text-[#9C8B6B] outline-none focus:border-[#F03A46] focus:bg-white transition-all"
                  />
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
                      <label className="text-[10px] font-extrabold uppercase text-[#5C4E35] mb-1 block">
                        City / Hub *
                      </label>
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
                      <label className="text-[10px] font-extrabold uppercase text-[#5C4E35] mb-1 block">
                        State *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. West Bengal"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="w-full rounded-2xl border-[1.5px] border-[#EAD296] bg-[#FFFDF8] px-3.5 py-2.5 text-xs font-bold text-[#14120F] placeholder:text-[#9C8B6B] outline-none focus:border-[#F03A46] focus:bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-extrabold uppercase text-[#5C4E35] mb-1 block">
                        Pincode *
                      </label>
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
                      <span
                        className={`text-[10px] font-black uppercase ${
                          passwordStrength.label === "Strong"
                            ? "text-emerald-700"
                            : passwordStrength.label === "Medium"
                            ? "text-[#9A6503]"
                            : "text-[#F03A46]"
                        }`}
                      >
                        {passwordStrength.label}
                      </span>
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
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7A6847] hover:text-[#14120F] transition-colors p-1 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  {password && (
                    <div className="mt-2 h-1.5 w-full bg-[#F3E7C8] rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                        style={{ width: `${passwordStrength.score}%` }}
                      />
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
                    className="text-[11px] font-extrabold text-[#F03A46] hover:underline transition-colors cursor-pointer"
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
                      if (val.length === 6) {
                        setTimeout(() => {
                          handleRegisterSubmit(undefined, val);
                        }, 120);
                      }
                    }}
                    className="w-full text-center tracking-[0.55em] font-mono text-3xl font-black rounded-2xl border-2 border-[#DFBE6F] bg-[#FFFDF8] px-5 py-4 text-[#14120F] outline-none transition-all placeholder:text-[#C5B289] focus:border-[#F03A46] focus:bg-white focus:ring-4 focus:ring-[#F03A46]/10"
                  />
                  <div className="flex items-center justify-between mt-3 px-1">
                    <span className="text-[11px] text-[#6E5C3D] font-medium">
                      Check your inbox & spam folder
                    </span>
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={loading || resendCooldown > 0}
                      className="text-[11px] font-extrabold text-[#F03A46] hover:underline disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
                    </button>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep("info")}
                    className="h-14 px-6 rounded-2xl border border-[#EAD296] bg-[#FFFDF8] text-[#4A3F2B] font-bold text-xs uppercase tracking-wider hover:bg-[#FAF2DC] transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || otpInput.length < 6}
                    className="flex-1 h-14 flex items-center justify-center rounded-2xl bg-gradient-to-r from-[#F03A46] via-[#FF5757] to-[#E63946] text-xs font-black uppercase tracking-wider text-white shadow-[0_10px_24px_rgba(240,58,70,0.3)] hover:brightness-105 active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {loading ? "Verifying & Creating Store..." : "Verify OTP & Complete Signup"}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: SUCCESS */}
            {step === "submitted" && (
              <div className="text-center py-6 space-y-4">
                <div className="mx-auto h-20 w-20 rounded-full bg-emerald-50 text-emerald-600 border-2 border-emerald-200 flex items-center justify-center shadow-md">
                  <CheckCircle2 size={42} />
                </div>
                <h2 className="text-2xl font-black text-[#14120F] tracking-tight">
                  Welcome to ZebAlpha Seller Hub!
                </h2>
                <p className="text-xs sm:text-sm font-medium text-[#5C4E35] max-w-md mx-auto leading-relaxed">
                  <span className="text-[#14120F] font-extrabold">{shopName}</span> is now registered under{" "}
                  <span className="text-[#9A6503] font-extrabold">{businessCategory}</span>. Direct payouts will route to{" "}
                  <span className="text-emerald-700 font-mono font-bold">
                    {upiId || `${mobileNumber}@phonepe`}
                  </span>
                  .
                </p>
                <div className="pt-4 flex flex-wrap justify-center gap-3">
                  <Link
                    href="/dashboard"
                    className="inline-flex h-12 items-center justify-center gap-2 px-8 rounded-2xl bg-gradient-to-r from-[#F03A46] to-[#FF5757] text-white text-xs font-black uppercase tracking-wider shadow-[0_10px_24px_rgba(240,58,70,0.3)] hover:brightness-105 transition-all"
                  >
                    <span>Open Seller Dashboard</span>
                    <ArrowRight size={15} />
                  </Link>
                </div>
              </div>
            )}

            <div className="mt-8 border-t border-[#F0E2BE] pt-5 text-center">
              <p className="text-xs font-semibold text-[#5C4E35]">
                Already have a seller account?{" "}
                <Link
                  href="/login"
                  className="text-[#F03A46] font-black underline hover:text-[#C82333]"
                >
                  Login to Seller Panel
                </Link>
              </p>
            </div>
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
        <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#FFFDF8] text-[#14120F]">
          <div className="animate-spin rounded-full h-9 w-9 border-2 border-[#EAD296] border-t-[#F03A46]" />
        </main>
      }
    >
      <SellerRegisterContent />
    </Suspense>
  );
}
