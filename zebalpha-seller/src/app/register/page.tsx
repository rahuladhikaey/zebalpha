"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { CheckCircle2, Store, User, Mail, Phone, Lock, Tag, Layers, ArrowRight, ShieldCheck, Eye, EyeOff } from "lucide-react";

const EMAILJS_SERVICE_ID = process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || "service_5apvm6b";
const EMAILJS_TEMPLATE_ID = process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || "template_hhuloji";
const EMAILJS_PUBLIC_KEY = process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || "ZR5LIJWz_4EsCSc_a";

const CATEGORY_MAP: Record<string, string[]> = {
  "Polos & T-Shirts": [
    "Premium Pique Polos",
    "Zip-Neck Luxury Polos",
    "Oversized Streetwear Tees",
    "Heavyweight Graphic Tees",
    "Supima Cotton Basics",
  ],
  "Hoodies & Sweatshirts": [
    "380 GSM Heavyweight Hoodies",
    "Plush Fleece Drop-Shoulders",
    "Streetwear Zip-Up Hoodies",
    "Minimal Crewneck Sweaters",
  ],
  "Casual Shirts": [
    "Textured Linen Shirts",
    "Resort Collar Shirts",
    "Woven Oxford Button-Downs",
    "Oversized Flannels",
  ],
  "Bottoms & Cargo": [
    "Utility Cargo Trousers",
    "Relaxed Tailored Pants",
    "Heavyweight Fleece Joggers",
    "Straight-Leg Streetwear Denim",
  ],
  "Outerwear & Jackets": [
    "Varsity Bomber Jackets",
    "Windbreaker Track Jackets",
    "Denim Overshirts",
    "Layering Streetwear Vests",
  ],
  "Accessories & Caps": [
    "Embroidered Streetwear Caps",
    "Beanie Hats",
    "Chains & Minimal Jewelry",
    "Crossbody Bags & Socks",
  ],
  "Limited Drops": [
    "Exclusive Culture Releases",
    "Collaboration Editions",
    "Archive Special Drops",
  ],
};

export default function SellerRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<"info" | "otp" | "submitted">("info");

  // Required Fields
  const [sellerName, setSellerName] = useState("");
  const [shopName, setShopName] = useState("");
  const [category, setCategory] = useState("Polos & T-Shirts");
  const [subcategory, setSubcategory] = useState("Premium Pique Polos");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
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

  // Direct client-side EmailJS dispatch fallback
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
            time: "15 minutes",
          },
        }),
      });
    } catch (err) {
      console.warn("Seller direct EmailJS dispatch note:", err);
    }
  };

  // Available Subcategories based on selected Category
  const subcategoryOptions = useMemo(() => {
    return CATEGORY_MAP[category] || CATEGORY_MAP["Polos & T-Shirts"];
  }, [category]);

  // Password Strength Calculation
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: "Empty", color: "bg-slate-300 dark:bg-slate-700" };
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { score: 33, label: "Weak", color: "bg-rose-500" };
    if (score <= 4) return { score: 66, label: "Medium", color: "bg-amber-500" };
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

    if (!sellerName.trim() || !shopName.trim() || !mobileNumber.trim() || !email.trim() || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

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
        setError(data.error || "Failed to send OTP to email. Please try again.");
        setLoading(false);
        return;
      }

      if (!data.emailSent && data.otp) {
        sendEmailJsDirect(normalizedEmail, data.otp);
      }

      setStep("otp");
      setResendCooldown(60);
      setInfoMessage(`✓ Verification OTP sent to ${normalizedEmail}! Please check your email inbox and spam folder.`);
    } catch (err: any) {
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
        body: JSON.stringify({ action: "resend", email: normalizedEmail }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (!data.emailSent && data.otp) {
          sendEmailJsDirect(normalizedEmail, data.otp);
        }
        setResendCooldown(60);
        setOtpInput("");
        setInfoMessage(`✓ New verification OTP sent to ${normalizedEmail}! Please check your email inbox.`);
      } else {
        setError(data.error || "Failed to resend OTP. Please try again.");
      }
    } catch (err) {
      setError("Failed to resend code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e?: React.FormEvent, overrideOtp?: string) => {
    if (e) e.preventDefault();
    setError("");

    const cleanOtp = (overrideOtp !== undefined ? overrideOtp : otpInput).trim();

    if (!cleanOtp) {
      setError("Please enter the 6-digit OTP code sent to your email.");
      return;
    }

    setLoading(true);
    const normalizedEmail = email.trim().toLowerCase();

    // 1. Verify OTP Code
    try {
      const verifyRes = await fetch("/api/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", email: normalizedEmail, otp: cleanOtp }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        setError(verifyData.error || "❌ Invalid OTP. Please check your email and try again.");
        setLoading(false);
        return;
      }
    } catch (err) {
      setError("Failed to verify OTP. Please try again.");
      setLoading(false);
      return;
    }

    // 2. Register Merchant Credentials & Create Seller Record
    try {
      let userId: string | undefined = undefined;

      try {
        const signupRes = await fetch("/api/auth/signup-verified", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: normalizedEmail,
            password: password,
            fullName: sellerName.trim(),
            phone: mobileNumber.trim(),
          }),
        });
        const signupData = await signupRes.json();
        if (signupRes.ok && signupData.success && signupData.user?.id) {
          userId = signupData.user.id;
        } else {
          const apiError = signupData.error;
          // Client-side fallback to supabase.auth.signUp
          const { data: clientSignUpData, error: clientSignUpError } = await supabase.auth.signUp({
            email: normalizedEmail,
            password: password,
            options: {
              data: {
                full_name: sellerName.trim(),
                role: "seller",
                phone: mobileNumber.trim(),
              },
            },
          });
          if (clientSignUpData?.user?.id) {
            userId = clientSignUpData.user.id;
          } else {
            const { data: signInData, error: clientSignInError } = await supabase.auth.signInWithPassword({
              email: normalizedEmail,
              password: password,
            });
            if (signInData?.user?.id) {
              userId = signInData.user.id;
            } else {
              const finalError = apiError || clientSignUpError?.message || clientSignInError?.message || "Failed to register seller in Supabase Authentication.";
              throw new Error(finalError);
            }
          }
        }
      } catch (authCatchErr: any) {
        console.warn("Auth signup notice:", authCatchErr);
        setError(authCatchErr?.message || "Could not verify your authentication account with Supabase Auth. Please try again.");
        setLoading(false);
        return;
      }

      const isValidUuid = (val: any) => typeof val === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
      const validUserId = isValidUuid(userId) ? userId : null;

      if (!validUserId) {
        setError("Could not verify your authentication account with Supabase Auth. Please try again.");
        setLoading(false);
        return;
      }

      const generatedSellerCode = `SEL-${Math.floor(100000 + Math.random() * 900000)}`;

      const sellerPayload: any = {
        id: validUserId,
        user_id: validUserId,
        seller_id: generatedSellerCode,
        full_name: sellerName.trim(),
        owner_name: sellerName.trim(),
        business_name: shopName.trim(),
        mobile_number: mobileNumber.trim(),
        phone_number: mobileNumber.trim(),
        email: normalizedEmail,
        category: category,
        business_category: `${category} - ${subcategory}`,
        status: "approved",
        account_status: "Active",
        email_verified: true,
        delete_requested: false,
        created_at: new Date().toISOString(),
      };

      // Check if seller already exists by email
      const { data: existingSeller } = await supabase
        .from("sellers")
        .select("id")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (existingSeller) {
        // Update existing seller row
        await supabase
          .from("sellers")
          .update(sellerPayload)
          .eq("email", normalizedEmail);
      } else {
        // Insert new seller row
        const { error: sellerError } = await supabase
          .from("sellers")
          .insert([sellerPayload]);

        if (sellerError && sellerPayload.id) {
          // If insert with primary key id failed, retry without id column but keep user_id
          delete sellerPayload.id;
          await supabase.from("sellers").insert([sellerPayload]);
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
    <main className="relative min-h-screen flex flex-col items-center justify-center p-4 text-foreground overflow-hidden bg-black">
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-white/[0.03] rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-white/[0.02] rounded-full blur-[120px] -z-10" />

      <div className="absolute top-8 right-8">
        <DarkModeToggle />
      </div>

      <div className="w-full max-w-xl">
        <div className="rounded-[2.5rem] bg-zinc-950 p-8 md:p-12 backdrop-blur-xl border border-zinc-800 shadow-2xl flex flex-col">
          {/* HEADER */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs font-black uppercase tracking-[0.3em] text-zinc-400">
              ZEBALPHA MERCHANT PORTAL
            </span>
            <div className="flex gap-2">
              <span className={`h-2 w-8 rounded-full transition-all ${step === "info" ? "bg-white" : "bg-zinc-800"}`} />
              <span className={`h-2 w-8 rounded-full transition-all ${step === "otp" ? "bg-white" : "bg-zinc-800"}`} />
            </div>
          </div>

          {step !== "submitted" && (
            <div className="mb-6">
              <h1 className="text-2xl font-black text-white tracking-tight">
                {step === "info" && "Seller Account Registration"}
                {step === "otp" && "Email OTP Verification"}
              </h1>
              <p className="text-xs font-semibold text-zinc-400 mt-1">
                {step === "info" && "Register your merchant details & apparel clothing category."}
                {step === "otp" && `Enter 6-digit verification code sent to ${email}`}
              </p>
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-2xl bg-rose-950/40 p-4 border border-rose-800/50">
              <p className="text-xs font-bold text-rose-400">
                {error}
              </p>
            </div>
          )}

          {/* STEP 1: REGISTRATION FORM */}
          {step === "info" && (
            <form className="space-y-4" onSubmit={handleSendOtp}>
              {/* Seller Name */}
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center gap-1.5">
                  <User size={14} className="text-white" />
                  <span>Seller Name *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter your full name"
                  value={sellerName}
                  onChange={(e) => setSellerName(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/90 px-5 py-3.5 text-sm font-bold text-white outline-none focus:border-white"
                />
              </div>

              {/* Shop Name */}
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center gap-1.5">
                  <Store size={14} className="text-white" />
                  <span>Shop Name *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Zebalpha Streetwear & Studio"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/90 px-5 py-3.5 text-sm font-bold text-white outline-none focus:border-white"
                />
              </div>

              {/* Category & Subcategory Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center gap-1.5">
                    <Tag size={14} className="text-white" />
                    <span>Sell by Category *</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => {
                      const newCat = e.target.value;
                      setCategory(newCat);
                      setSubcategory(CATEGORY_MAP[newCat]?.[0] || "");
                    }}
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-3.5 text-sm font-bold text-white outline-none focus:border-white cursor-pointer"
                  >
                    {Object.keys(CATEGORY_MAP).map((catName) => (
                      <option key={catName} value={catName}>
                        {catName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center gap-1.5">
                    <Layers size={14} className="text-white" />
                    <span>Subcategory *</span>
                  </label>
                  <select
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-3.5 text-sm font-bold text-white outline-none focus:border-white cursor-pointer"
                  >
                    {subcategoryOptions.map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Phone & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center gap-1.5">
                    <Phone size={14} className="text-white" />
                    <span>Phone Number *</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 9876543210"
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/90 px-5 py-3.5 text-sm font-bold text-white outline-none focus:border-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center gap-1.5">
                    <Mail size={14} className="text-white" />
                    <span>Email (Verified) *</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="seller@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/90 px-5 py-3.5 text-sm font-bold text-white outline-none focus:border-white"
                  />
                </div>
              </div>

              {/* Strong Password Input */}
              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock size={14} className="text-white" />
                    <span>Strong Password *</span>
                  </span>
                  {password && (
                    <span className={`text-[10px] font-bold uppercase ${passwordStrength.label === "Strong" ? "text-white" : passwordStrength.label === "Medium" ? "text-zinc-300" : "text-rose-400"}`}>
                      {passwordStrength.label} Password
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    placeholder="Min 6 characters (Letters, Numbers, Symbols)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/90 px-5 py-3.5 text-sm font-bold text-white outline-none focus:border-white pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors p-1"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {password && (
                  <div className="mt-2 h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-white transition-all duration-300" style={{ width: `${passwordStrength.score}%` }} />
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white text-sm font-black uppercase tracking-wider text-black shadow-xl hover:bg-zinc-200 active:scale-95 disabled:opacity-50 transition-all"
              >
                <span>{loading ? "Sending OTP..." : "Send Verification OTP & Continue"}</span>
                <ArrowRight size={18} />
              </button>
            </form>
          )}

          {/* STEP 2: OTP VERIFICATION */}
          {step === "otp" && (
            <form className="space-y-5" onSubmit={handleRegisterSubmit}>
              {infoMessage && (
                <div className="rounded-2xl bg-zinc-900 p-4 border border-zinc-700">
                  <p className="text-xs font-bold text-white flex items-center gap-2">
                    <ShieldCheck size={16} className="text-emerald-400" />
                    <span>{infoMessage}</span>
                  </p>
                </div>
              )}

              <div className="rounded-2xl bg-zinc-900/80 p-4 border border-zinc-800 text-center space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  Security Code Sent To
                </span>
                <p className="text-sm font-extrabold text-white truncate">{email}</p>
                <button
                  type="button"
                  onClick={() => setStep("info")}
                  className="text-[11px] font-bold text-zinc-400 hover:text-white underline transition-colors"
                >
                  Change Email / Edit Details
                </button>
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-2 block text-center">
                  Enter 6-Digit Verification Code
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
                      }, 100);
                    }
                  }}
                  className="w-full text-center tracking-[0.6em] font-mono text-3xl font-black rounded-2xl border-2 border-zinc-700 bg-zinc-900 px-5 py-4 text-white outline-none transition-all placeholder:text-zinc-600 focus:border-white focus:ring-4 focus:ring-white/10"
                />
                <div className="flex items-center justify-between mt-3 px-1">
                  <span className="text-[11px] text-zinc-400 font-medium">
                    Please enter the latest 6-digit code received
                  </span>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={loading || resendCooldown > 0}
                    className="text-[11px] font-bold text-white hover:underline disabled:opacity-40 transition-colors"
                  >
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code 📨"}
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep("info")}
                  className="h-14 px-6 rounded-2xl border border-zinc-800 text-zinc-300 font-bold text-xs uppercase tracking-wider hover:bg-zinc-800 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || otpInput.length < 6}
                  className="flex-1 h-14 flex items-center justify-center rounded-2xl bg-white text-xs font-black uppercase tracking-wider text-black shadow-xl hover:bg-zinc-200 active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-black" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      Verifying...
                    </span>
                  ) : (
                    "Verify OTP & Complete Registration ✨"
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: SUCCESS */}
          {step === "submitted" && (
            <div className="text-center py-6 space-y-4">
              <div className="mx-auto h-20 w-20 rounded-full bg-zinc-900 text-white border border-zinc-700 flex items-center justify-center shadow-lg">
                <CheckCircle2 size={42} />
              </div>
              <h2 className="text-2xl font-black text-white tracking-tight">
                Seller Account Active & Approved!
              </h2>
              <p className="text-xs font-bold text-zinc-400 max-w-md mx-auto leading-relaxed">
                Welcome to Asali Swad! <span className="text-white font-bold">{shopName}</span> is registered under category <span className="text-white font-black">{category} ({subcategory})</span>.
              </p>
              <div className="pt-4">
                <Link
                  href="/dashboard"
                  className="inline-flex h-12 items-center justify-center px-8 rounded-2xl bg-white text-black text-xs font-black uppercase tracking-wider shadow-lg hover:bg-zinc-200 transition-all"
                >
                  Go to Seller Dashboard
                </Link>
              </div>
            </div>
          )}

          <div className="mt-8 border-t border-zinc-800/80 pt-6 text-center">
            <p className="text-xs font-bold text-zinc-400">
              Already registered?{" "}
              <Link href="/" className="text-white font-black underline hover:text-zinc-300">
                Sign In to Seller Portal
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}


