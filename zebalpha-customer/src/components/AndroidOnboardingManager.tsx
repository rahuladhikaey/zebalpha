"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useLanguage, LanguageCode } from "@/context/LanguageContext";
import { useIsNativeApp } from "@/lib/platform";
import { supabase } from "@/lib/supabaseClient";
import { Check, ChevronRight, Eye, EyeOff, Sparkles, ArrowLeft, ShieldCheck, ShoppingBag } from "lucide-react";

type OnboardingStep = "language" | "login" | "signup" | "otp" | "welcome";

export function AndroidOnboardingManager() {
  const isNativeApp = useIsNativeApp();
  const { user, profile } = useAuth();
  const {
    language,
    setLanguage,
    t,
    onboardingLanguageCompleted,
    setOnboardingLanguageCompleted,
    onboardingCompleted,
    setOnboardingCompleted,
    isGuestMode,
    setGuestMode,
  } = useLanguage();

  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<OnboardingStep>("language");

  // Auth form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Selected language buffer during step 1
  const [selectedLang, setSelectedLang] = useState<LanguageCode>(language || "en");

  // Cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Determine initial onboarding state
  useEffect(() => {
    setMounted(true);
    if (!isNativeApp) return;

    // 1. If language onboarding has never been completed: Show Language Screen (Step 1)
    if (!onboardingLanguageCompleted) {
      setStep("language");
      setIsOpen(true);
      return;
    }

    // 2. If user is authenticated: Home directly
    if (user) {
      setIsOpen(false);
      return;
    }

    // 3. If user previously chose Skip: Allow guest home browsing
    if (isGuestMode) {
      setIsOpen(false);
      return;
    }

    // 4. If logged-out user (not guest, language was completed): Show Login Screen directly (Step 2)
    setStep("login");
    setIsOpen(true);
  }, [isNativeApp, onboardingLanguageCompleted, user, isGuestMode]);

  // Sync selected language when language in context changes
  useEffect(() => {
    if (language) {
      setSelectedLang(language);
    }
  }, [language]);

  // Android hardware back navigation listener (popstate)
  useEffect(() => {
    if (!isNativeApp || !isOpen) return;

    const handlePopState = () => {
      if (step === "otp") {
        setStep("signup");
        setStatusMessage("");
      } else if (step === "signup") {
        setStep("login");
        setStatusMessage("");
      } else if (step === "login") {
        if (onboardingLanguageCompleted) {
          setStep("language");
          setStatusMessage("");
        }
      } else if (step === "welcome") {
        // Prevent returning into completed auth flow
        setOnboardingCompleted(true);
        setGuestMode(false);
        setIsOpen(false);
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [isNativeApp, isOpen, step, onboardingLanguageCompleted, setOnboardingCompleted, setGuestMode]);

  if (!isNativeApp || !mounted || !isOpen) {
    return null;
  }

  // Helper to transition steps and push history for Android back navigation
  const navigateToStep = (nextStep: OnboardingStep) => {
    if (typeof window !== "undefined") {
      try {
        window.history.pushState({ zebalphaOnboardingStep: nextStep }, "");
      } catch (err) {
        console.warn("[History Push Notice]:", err);
      }
    }
    setStatusMessage("");
    setStep(nextStep);
  };

  // --- HANDLERS ---

  // Top-Right Skip Button
  const handleSkip = () => {
    // If skipping from Language screen, default to English and mark language as completed
    if (!onboardingLanguageCompleted) {
      setLanguage("en");
      setOnboardingLanguageCompleted(true);
    }
    // Set guest browsing mode so home is accessible without account
    setGuestMode(true);
    setStatusMessage("");
    setIsOpen(false);
  };

  // Step 1: Language Continue
  const handleLanguageContinue = () => {
    setLanguage(selectedLang);
    setOnboardingLanguageCompleted(true);
    navigateToStep("login");
  };

  // Step 2: Login Existing Account
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage("");
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail || !normalizedEmail.includes("@")) {
        setStatusMessage(language === "hi" ? "कृपया एक मान्य ईमेल दर्ज करें।" : "Please enter a valid email address.");
        setLoading(false);
        return;
      }

      if (normalizedEmail.length > 35) {
        setStatusMessage(language === "hi" ? "ईमेल 35 अक्षरों से अधिक नहीं हो सकता।" : "Email address cannot exceed 35 characters.");
        setLoading(false);
        return;
      }

      let { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      // If user unconfirmed, auto-confirm and retry
      if (error && (error.message.toLowerCase().includes("not confirmed") || error.message.toLowerCase().includes("email not confirmed"))) {
        try {
          const verifyRes = await fetch("/api/auth/signup-verified", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: normalizedEmail, password, fullName: "Customer" }),
          });
          if (verifyRes.ok) {
            const retry = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });
            data = retry.data;
            error = retry.error;
          }
        } catch (autoErr) {
          console.warn("[Auto-confirm notice]:", autoErr);
        }
      }

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("invalid login credentials") || msg.includes("invalid password")) {
          setStatusMessage(language === "hi" ? "गलत ईमेल या पासवर्ड। कृपया पुनः प्रयास करें।" : "Invalid email or password. Please try again.");
        } else if (msg.includes("user not found")) {
          setStatusMessage(language === "hi" ? "इस ईमेल के लिए कोई खाता नहीं मिला। कृपया खाता बनाएं।" : "No account found for this email. Please create an account.");
        } else {
          setStatusMessage(error.message);
        }
        setLoading(false);
        return;
      }

      // Success -> Transition to Welcome Screen (Step 3)
      setGuestMode(false);
      navigateToStep("welcome");
    } catch (err: any) {
      setStatusMessage(err?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2 (Alt): Signup - Initiate OTP
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage("");

    if (!fullName.trim()) {
      setStatusMessage(language === "hi" ? "कृपया अपना पूरा नाम दर्ज करें।" : "Please enter your full name.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes("@")) {
      setStatusMessage(language === "hi" ? "कृपया एक मान्य ईमेल पता दर्ज करें।" : "Please enter a valid email address.");
      return;
    }

    if (normalizedEmail.length > 35) {
      setStatusMessage(language === "hi" ? "ईमेल 35 अक्षरों से अधिक नहीं हो सकता।" : "Email address cannot exceed 35 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setStatusMessage(language === "hi" ? "पासवर्ड मेल नहीं खाते।" : "Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setStatusMessage(language === "hi" ? "पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।" : "Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", email: normalizedEmail }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setStatusMessage(data.error || (language === "hi" ? "ओटीपी भेजने में विफल। कृपया पुनः प्रयास करें।" : "Failed to send verification code."));
        setLoading(false);
        return;
      }

      navigateToStep("otp");
      setResendCooldown(60);
    } catch (err: any) {
      setStatusMessage(err?.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // Step 2 (Alt): Verify OTP & Create Account
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage("");

    const cleanOtp = otp.trim().replace(/\D/g, "");
    if (cleanOtp.length !== 6) {
      setStatusMessage(language === "hi" ? "कृपया 6 अंकों का ओटीपी कोड दर्ज करें।" : "Please enter the 6-digit OTP code.");
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      // 1. Verify OTP with server
      const verifyRes = await fetch("/api/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", email: normalizedEmail, otp: cleanOtp }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        setStatusMessage(verifyData.error || (language === "hi" ? "अमान्य या समाप्त ओटीपी कोड।" : "Invalid or expired OTP code."));
        setLoading(false);
        return;
      }

      // 2. Create customer account with auto-confirmation
      const signupRes = await fetch("/api/auth/signup-verified", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password, fullName: fullName.trim() }),
      });

      const signupData = await signupRes.json();
      if (!signupRes.ok || !signupData.success) {
        setStatusMessage(signupData.error || "Failed to finalize account creation.");
        setLoading(false);
        return;
      }

      // 3. Authenticate Supabase session
      await supabase.auth.signInWithPassword({ email: normalizedEmail, password });

      // Success -> Move to Welcome Screen (Step 3)
      setGuestMode(false);
      navigateToStep("welcome");
    } catch (err: any) {
      setStatusMessage(err?.message || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (resendCooldown > 0 || loading) return;
    setStatusMessage("");
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
        setResendCooldown(60);
        setStatusMessage(language === "hi" ? "नया कोड आपके ईमेल पर भेजा गया है!" : "New verification code sent to your email!");
      } else {
        setStatusMessage(data.error || "Failed to resend code.");
      }
    } catch (err: any) {
      setStatusMessage(err?.message || "Failed to resend code.");
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Complete Welcome & Enter Home
  const handleCompleteWelcome = () => {
    setOnboardingCompleted(true);
    setGuestMode(false);
    setIsOpen(false);
  };

  // --- PROGRESS BAR HELPER ---
  const isStepDone = (target: "language" | "login" | "welcome") => {
    if (target === "language") return step !== "language";
    if (target === "login") return step === "welcome";
    return false;
  };

  const isStepActive = (target: "language" | "login" | "welcome") => {
    if (target === "language") return step === "language";
    if (target === "login") return step === "login" || step === "signup" || step === "otp";
    if (target === "welcome") return step === "welcome";
    return false;
  };

  const displayName = profile?.full_name || fullName || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Customer";

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-between bg-black text-white select-none overflow-hidden animate-in fade-in duration-300">
      {/* =========================================================================
          TOP HEADER: LOGO, SKIP BUTTON & PROGRESS BAR (Matching Reference 1)
          ========================================================================= */}
      <header className="w-full pt-[max(env(safe-area-inset-top),0.75rem)] px-5 pb-4 bg-black border-b border-neutral-900/80 shrink-0">
        <div className="flex items-center justify-between h-10 mb-4">
          {/* Back button (Only visible in inner steps) */}
          <div className="w-12 flex items-center">
            {step === "otp" && (
              <button
                onClick={() => {
                  if (typeof window !== "undefined" && window.history.length > 1) {
                    window.history.back();
                  } else {
                    setStep("signup");
                    setStatusMessage("");
                  }
                }}
                className="p-1.5 -ml-1.5 text-neutral-400 hover:text-white transition-colors"
                aria-label="Back to Sign Up"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            {step === "signup" && (
              <button
                onClick={() => {
                  if (typeof window !== "undefined" && window.history.length > 1) {
                    window.history.back();
                  } else {
                    setStep("login");
                    setStatusMessage("");
                  }
                }}
                className="p-1.5 -ml-1.5 text-neutral-400 hover:text-white transition-colors"
                aria-label="Back to Login"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            {step === "login" && onboardingLanguageCompleted && (
              <button
                onClick={() => {
                  if (typeof window !== "undefined" && window.history.length > 1) {
                    window.history.back();
                  } else {
                    setStep("language");
                    setStatusMessage("");
                  }
                }}
                className="p-1.5 -ml-1.5 text-neutral-400 hover:text-white transition-colors"
                aria-label="Back to Language Selection"
              >
                <ArrowLeft size={20} />
              </button>
            )}
          </div>

          {/* Center Brand: Logo + ZebAlpha */}
          <div className="flex items-center gap-2">
            <div className="relative h-8 w-8 rounded-full overflow-hidden bg-black flex items-center justify-center p-0.5 border border-zinc-700/80">
              <Image
                src="/official-logo-sm.png"
                alt="ZebAlpha Logo"
                width={32}
                height={32}
                className="h-full w-full object-cover rounded-full"
                priority
              />
            </div>
            <span className="text-base font-black tracking-[0.2em] text-white uppercase">
              Zebalpha
            </span>
          </div>

          {/* Top-Right: SKIP BUTTON */}
          <div className="w-12 flex justify-end">
            {step !== "welcome" ? (
              <button
                onClick={handleSkip}
                type="button"
                className="text-xs font-bold text-neutral-300 hover:text-white active:scale-95 transition-all px-2 py-1"
              >
                {t("skip")}
              </button>
            ) : null}
          </div>
        </div>

        {/* 3-Step Progress Indicator: 1. Language → 2. Login → 3. Welcome */}
        <div className="max-w-xs mx-auto px-4 flex items-center justify-between relative mt-2 mb-1">
          {/* Connector Line 1-2 */}
          <div
            className={`absolute top-3.5 left-[22%] right-[52%] h-[1.5px] -translate-y-1/2 transition-colors duration-300 ${
              isStepDone("language") ? "bg-white" : "bg-neutral-800"
            }`}
          />
          {/* Connector Line 2-3 */}
          <div
            className={`absolute top-3.5 left-[52%] right-[22%] h-[1.5px] -translate-y-1/2 transition-colors duration-300 ${
              isStepDone("login") ? "bg-white" : "bg-neutral-800"
            }`}
          />

          {/* Step 1: Language */}
          <div className="flex flex-col items-center gap-1.5 z-10">
            <div
              className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                isStepActive("language")
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/40 scale-105"
                  : isStepDone("language")
                  ? "bg-emerald-600 text-white"
                  : "bg-neutral-900 border border-neutral-700 text-neutral-400"
              }`}
            >
              {isStepDone("language") ? <Check size={14} strokeWidth={3} /> : "1"}
            </div>
            <span
              className={`text-[10px] font-bold tracking-wider uppercase ${
                isStepActive("language") ? "text-emerald-400" : "text-neutral-500"
              }`}
            >
              {t("step_language")}
            </span>
          </div>

          {/* Step 2: Login */}
          <div className="flex flex-col items-center gap-1.5 z-10">
            <div
              className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                isStepActive("login")
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/40 scale-105"
                  : isStepDone("login")
                  ? "bg-emerald-600 text-white"
                  : "bg-neutral-900 border border-neutral-700 text-neutral-400"
              }`}
            >
              {isStepDone("login") ? <Check size={14} strokeWidth={3} /> : "2"}
            </div>
            <span
              className={`text-[10px] font-bold tracking-wider uppercase ${
                isStepActive("login") ? "text-emerald-400" : "text-neutral-500"
              }`}
            >
              {t("step_login")}
            </span>
          </div>

          {/* Step 3: Welcome */}
          <div className="flex flex-col items-center gap-1.5 z-10">
            <div
              className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                isStepActive("welcome")
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/40 scale-105"
                  : "bg-neutral-900 border border-neutral-700 text-neutral-400"
              }`}
            >
              3
            </div>
            <span
              className={`text-[10px] font-bold tracking-wider uppercase ${
                isStepActive("welcome") ? "text-white" : "text-neutral-500"
              }`}
            >
              {t("step_welcome")}
            </span>
          </div>
        </div>
      </header>

      {/* =========================================================================
          MAIN BOTTOM SHEET CARD: WHITE CONTAINER WITH ROUNDED TOP (Ref 1)
          ========================================================================= */}
      <div className="relative flex-1 w-full rounded-t-[2.25rem] bg-white text-black flex flex-col justify-between p-6 shadow-2xl overflow-y-auto">
        {/* =====================================================================
            STEP 1: LANGUAGE SELECTION (ENGLISH & HINDI ONLY)
            ===================================================================== */}
        {step === "language" && (
          <div className="flex-1 flex flex-col justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 mb-6 leading-snug">
                {selectedLang === "hi"
                  ? "आप ज़ेबअल्फा किस भाषा में देखना चाहते हैं?"
                  : "Which language do you want to see Zebalpha in?"}
              </h1>

              {/* Language Cards: ONLY English and Hindi */}
              <div className="space-y-3.5">
                {/* 1. Hindi Card */}
                <button
                  type="button"
                  onClick={() => setSelectedLang("hi")}
                  className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between cursor-pointer active:scale-[0.99] ${
                    selectedLang === "hi"
                      ? "border-2 border-black bg-neutral-50 shadow-sm"
                      : "border-neutral-200 bg-white hover:border-neutral-400"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-2xl font-black text-black font-serif">
                      ह
                    </span>
                    <span className="text-base font-bold text-neutral-900">हिंदी</span>
                  </div>
                  <ChevronRight size={18} className="text-neutral-400" />
                </button>

                {/* 2. English Card */}
                <button
                  type="button"
                  onClick={() => setSelectedLang("en")}
                  className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between cursor-pointer active:scale-[0.99] ${
                    selectedLang === "en"
                      ? "border-2 border-black bg-neutral-50 shadow-sm"
                      : "border-neutral-200 bg-white hover:border-neutral-400"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-2xl font-black text-black font-sans">
                      A
                    </span>
                    <span className="text-base font-bold text-neutral-900">English</span>
                  </div>
                  <ChevronRight size={18} className="text-neutral-400" />
                </button>
              </div>
            </div>

            {/* Bottom Action: Continue Button with Sparkle (✦) */}
            <div className="pt-6 pb-2">
              <button
                type="button"
                onClick={handleLanguageContinue}
                className="w-full h-14 rounded-2xl bg-emerald-600 text-white font-extrabold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/25 hover:bg-emerald-500 active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>{selectedLang === "hi" ? "आगे बढ़ें" : "Continue"}</span>
                <span className="text-base">✦</span>
              </button>
            </div>
          </div>
        )}

        {/* =====================================================================
            STEP 2A: LOGIN (EXISTING ACCOUNT)
            ===================================================================== */}
        {step === "login" && (
          <div className="flex-1 flex flex-col justify-between">
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-neutral-900">
                  {t("welcome_back")}
                </h1>
                <p className="mt-1 text-xs font-semibold text-neutral-500">
                  {t("login_subtitle")}
                </p>
              </div>

              <div className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                    {t("email_label")}
                  </label>
                  <input
                    type="email"
                    required
                    maxLength={35}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("email_placeholder")}
                    className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 text-sm font-semibold text-neutral-900 outline-none transition-all placeholder:text-neutral-400 focus:border-black focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                    {t("password_label")}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      maxLength={20}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t("password_placeholder")}
                      className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 text-sm font-semibold text-neutral-900 outline-none transition-all placeholder:text-neutral-400 focus:border-black focus:bg-white pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-900 transition-colors p-1"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              </div>

              {statusMessage && (
                <div className="rounded-xl bg-rose-50 p-3.5 border border-rose-200">
                  <p className="text-xs font-bold text-rose-600 leading-snug">{statusMessage}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 rounded-2xl bg-emerald-600 text-white font-extrabold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/25 hover:bg-emerald-500 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? t("signing_in") : t("sign_in_button")}
              </button>
            </form>

            {/* Switch to Create Account */}
            <div className="pt-6 text-center">
              <p className="text-xs font-semibold text-neutral-500">
                {t("new_here")}{" "}
                <button
                  type="button"
                  onClick={() => navigateToStep("signup")}
                  className="font-black text-black hover:underline underline-offset-4"
                >
                  {t("create_account")}
                </button>
              </p>
            </div>
          </div>
        )}

        {/* =====================================================================
            STEP 2B: SIGNUP (NEW ACCOUNT REGISTRATION)
            ===================================================================== */}
        {step === "signup" && (
          <div className="flex-1 flex flex-col justify-between">
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-neutral-900">
                  {t("create_account_title")}
                </h1>
                <p className="mt-1 text-xs font-semibold text-neutral-500">
                  {t("signup_subtitle")}
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                    {t("full_name_label")}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={50}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t("full_name_placeholder")}
                    className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-semibold text-neutral-900 outline-none transition-all placeholder:text-neutral-400 focus:border-black focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                    {t("email_label")}
                  </label>
                  <input
                    type="email"
                    required
                    maxLength={35}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("email_placeholder")}
                    className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-semibold text-neutral-900 outline-none transition-all placeholder:text-neutral-400 focus:border-black focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                    {t("new_password_label")}
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    maxLength={20}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("new_password_placeholder")}
                    className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-semibold text-neutral-900 outline-none transition-all placeholder:text-neutral-400 focus:border-black focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1">
                    {t("confirm_password_label")}
                  </label>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    maxLength={20}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t("confirm_password_placeholder")}
                    className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-semibold text-neutral-900 outline-none transition-all placeholder:text-neutral-400 focus:border-black focus:bg-white"
                  />
                </div>
              </div>

              {statusMessage && (
                <div className="rounded-xl bg-rose-50 p-3.5 border border-rose-200">
                  <p className="text-xs font-bold text-rose-600 leading-snug">{statusMessage}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-14 rounded-2xl bg-emerald-600 text-white font-extrabold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/25 hover:bg-emerald-500 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? t("sending_otp") : t("send_otp_button")}
              </button>
            </form>

            {/* Switch to Sign In */}
            <div className="pt-4 text-center">
              <p className="text-xs font-semibold text-neutral-500">
                {t("already_have_account")}{" "}
                <button
                  type="button"
                  onClick={() => navigateToStep("login")}
                  className="font-black text-black hover:underline underline-offset-4"
                >
                  {t("sign_in_here")}
                </button>
              </p>
            </div>
          </div>
        )}

        {/* =====================================================================
            STEP 2C: OTP VERIFICATION
            ===================================================================== */}
        {step === "otp" && (
          <div className="flex-1 flex flex-col justify-between">
            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-neutral-900">
                  {t("verify_email_title")}
                </h1>
                <p className="mt-1 text-xs font-semibold text-neutral-500">
                  {t("otp_subtitle")} <span className="font-bold text-black">{email}</span>
                </p>
              </div>

              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••"
                  className="w-full tracking-[0.5em] text-center text-3xl font-mono font-black py-4 rounded-2xl border-2 border-neutral-300 bg-neutral-50 text-black focus:border-black focus:bg-white outline-none transition-all"
                  autoFocus
                />
              </div>

              {statusMessage && (
                <div className="rounded-xl bg-amber-50 p-3.5 border border-amber-200">
                  <p className="text-xs font-bold text-amber-800 leading-snug">{statusMessage}</p>
                </div>
              )}

              <div className="space-y-3">
                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full h-14 rounded-2xl bg-black text-white font-extrabold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl hover:bg-neutral-900 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
                >
                  {loading ? t("verifying_otp") : t("verify_button")}
                </button>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={resendCooldown > 0 || loading}
                    className="text-xs font-bold text-neutral-600 hover:text-black disabled:opacity-50"
                  >
                    {resendCooldown > 0 ? `${t("resend_in")} ${resendCooldown}s` : t("resend_code")}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setStep("signup"); setOtp(""); setStatusMessage(""); }}
                    className="text-xs font-bold text-neutral-500 hover:text-black"
                  >
                    {t("change_email")}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* =====================================================================
            STEP 3: WELCOME SCREEN (CELEBRATORY GREETING & ENTRANCE TO HOME)
            ===================================================================== */}
        {step === "welcome" && (
          <div className="flex-1 flex flex-col justify-between py-2 text-center animate-in zoom-in-95 duration-300">
            <div>
              {/* Sparkle Badge */}
              <div className="mx-auto h-20 w-20 rounded-3xl bg-neutral-950 text-white flex items-center justify-center mb-5 shadow-2xl border border-neutral-800">
                <Sparkles size={36} className="text-amber-400" />
              </div>

              <h1 className="text-2xl font-black tracking-tight text-neutral-900">
                {t("welcome_title")}
              </h1>
              <p className="mt-1 text-xs font-bold uppercase tracking-widest text-neutral-400">
                {t("welcome_subtitle")}
              </p>

              <p className="mt-4 text-sm font-semibold text-neutral-700 max-w-xs mx-auto">
                {t("welcome_greeting", { name: displayName })}
              </p>

              {/* Value Badges */}
              <div className="mt-6 space-y-2.5 text-left max-w-sm mx-auto">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shrink-0">
                    <Check size={14} strokeWidth={3} />
                  </span>
                  <span className="text-xs font-bold text-neutral-800">
                    {t("welcome_benefit_1")}
                  </span>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shrink-0">
                    <Check size={14} strokeWidth={3} />
                  </span>
                  <span className="text-xs font-bold text-neutral-800">
                    {t("welcome_benefit_2")}
                  </span>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shrink-0">
                    <Check size={14} strokeWidth={3} />
                  </span>
                  <span className="text-xs font-bold text-neutral-800">
                    {t("welcome_benefit_3")}
                  </span>
                </div>
              </div>
            </div>

            {/* Start Shopping Button */}
            <div className="pt-6 pb-2">
              <button
                type="button"
                onClick={handleCompleteWelcome}
                className="w-full h-14 rounded-2xl bg-emerald-600 text-white font-extrabold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/25 hover:bg-emerald-500 active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>{t("start_shopping")}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
