"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { checkIsNativeApp } from "@/lib/platform";

export type LanguageCode = "en" | "hi";

const LANGUAGE_STORAGE_KEY = "zebalpha_selected_language";
const ONBOARDING_LANG_KEY = "zebalpha_onboarding_language_completed";
const ONBOARDING_COMPLETED_KEY = "zebalpha_onboarding_completed";
const ONBOARDING_GUEST_KEY = "zebalpha_onboarding_guest_mode";

export const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  en: {
    // Progress
    step_language: "Language",
    step_login: "Login",
    step_welcome: "Welcome",
    skip: "Skip",
    continue: "Continue",

    // Language Screen
    select_language_title: "Which language do you want to see Zebalpha in?",
    english: "English",
    hindi: "Hindi",

    // Login Screen
    welcome_back: "Welcome Back",
    login_subtitle: "Sign in to access your boutique collection & account.",
    email_label: "Email Address",
    email_placeholder: "Email Address",
    password_label: "Password",
    password_placeholder: "Password",
    sign_in_button: "Sign In ✨",
    signing_in: "Verifying...",
    new_here: "New here?",
    create_account: "Create Account",

    // Signup Screen
    create_account_title: "Create Account",
    signup_subtitle: "Join the culture. Create your ZebAlpha account in seconds.",
    full_name_label: "Full Name",
    full_name_placeholder: "Your Full Name",
    new_password_label: "Password",
    new_password_placeholder: "Password (min 6 characters)",
    confirm_password_label: "Confirm Password",
    confirm_password_placeholder: "Confirm your password",
    send_otp_button: "Send Verification Code 📨",
    sending_otp: "Sending Code...",
    already_have_account: "Already have an account?",
    sign_in_here: "Sign In Here",

    // OTP Screen
    verify_email_title: "Enter OTP Code",
    otp_subtitle: "Please enter the 6-digit code sent to your email.",
    verify_button: "Verify & Create Account ✨",
    verifying_otp: "Verifying Code...",
    resend_code: "Resend Code 📨",
    resend_in: "Resend in",
    change_email: "Change Email",

    // Welcome Screen
    welcome_title: "Welcome to ZebAlpha!",
    welcome_subtitle: "Clothing For The Culture ✦",
    welcome_greeting: "Hey, {name}! Your account is active and verified.",
    welcome_benefit_1: "100% Authentic Indian Streetwear & Drops",
    welcome_benefit_2: "Exclusive Member Rewards & Early Access",
    welcome_benefit_3: "Free Express Shipping on Orders ₹999+",
    start_shopping: "Explore Boutique Collection ✦",

    // Navigation & Bottom Nav
    nav_home: "Home",
    nav_categories: "Categories",
    nav_account: "Account",
    nav_cart: "Cart",
    nav_wishlist: "Wishlist",

    // Drawer & Profile
    language_settings: "Language Settings",
    choose_language: "Choose Language",
    my_orders: "My Orders",
    saved_addresses: "Saved Addresses",
    sign_out: "Sign Out",
    public_store: "Store Home",
    close: "Close",
    done: "Done",
  },
  hi: {
    // Progress
    step_language: "भाषा",
    step_login: "लॉग इन",
    step_welcome: "स्वागत",
    skip: "छोड़ें",
    continue: "आगे बढ़ें",

    // Language Screen
    select_language_title: "आप ज़ेबअल्फा किस भाषा में देखना चाहते हैं?",
    english: "English",
    hindi: "हिंदी",

    // Login Screen
    welcome_back: "वापसी पर स्वागत है",
    login_subtitle: "अपने बुटीक कलेक्शन और खाते को एक्सेस करने के लिए साइन इन करें।",
    email_label: "ईमेल पता",
    email_placeholder: "ईमेल पता",
    password_label: "पासवर्ड",
    password_placeholder: "पासवर्ड",
    sign_in_button: "साइन इन करें ✨",
    signing_in: "सत्यापित हो रहा है...",
    new_here: "नए ग्राहक हैं?",
    create_account: "खाता बनाएं",

    // Signup Screen
    create_account_title: "खाता बनाएं",
    signup_subtitle: "कल्चर से जुड़ें। कुछ ही सेकंड में अपना ज़ेबअल्फा खाता बनाएं।",
    full_name_label: "पूरा नाम",
    full_name_placeholder: "आपका पूरा नाम",
    new_password_label: "पासवर्ड",
    new_password_placeholder: "पासवर्ड (कम से कम 6 अक्षर)",
    confirm_password_label: "पासवर्ड की पुष्टि करें",
    confirm_password_placeholder: "अपने पासवर्ड की पुष्टि करें",
    send_otp_button: "सत्यापन कोड भेजें 📨",
    sending_otp: "कोड भेजा जा रहा है...",
    already_have_account: "पहले से खाता है?",
    sign_in_here: "यहाँ साइन इन करें",

    // OTP Screen
    verify_email_title: "ओटीपी कोड दर्ज करें",
    otp_subtitle: "कृपया अपने ईमेल पर भेजा गया 6-अंकों का कोड दर्ज करें।",
    verify_button: "सत्यापित करें और खाता बनाएं ✨",
    verifying_otp: "सत्यापित किया जा रहा है...",
    resend_code: "कोड दोबारा भेजें 📨",
    resend_in: "दोबारा भेजें",
    change_email: "ईमेल बदलें",

    // Welcome Screen
    welcome_title: "ज़ेबअल्फा में आपका स्वागत है!",
    welcome_subtitle: "क्लॉथिंग फॉर द कल्चर ✦",
    welcome_greeting: "नमस्ते, {name}! आपका खाता सक्रिय और सत्यापित हो गया है।",
    welcome_benefit_1: "100% प्रामाणिक भारतीय स्ट्रीटवियर और ड्रॉप्स",
    welcome_benefit_2: "सदस्यों के लिए विशेष रिवार्ड्स और अर्ली एक्सेस",
    welcome_benefit_3: "₹999+ के ऑर्डर पर मुफ्त एक्सप्रेस डिलीवरी",
    start_shopping: "कलेक्शन देखें और खरीदारी शुरू करें ✦",

    // Navigation & Bottom Nav
    nav_home: "होम",
    nav_categories: "श्रेणियाँ",
    nav_account: "खाता",
    nav_cart: "कार्ट",
    nav_wishlist: "इच्छा सूची",

    // Drawer & Profile
    language_settings: "भाषा सेटिंग",
    choose_language: "भाषा चुनें",
    my_orders: "मेरे ऑर्डर",
    saved_addresses: "सहेजे गए पते",
    sign_out: "साइन आउट",
    public_store: "स्टोर होम",
    close: "बंद करें",
    done: "पूर्ण",
  },
};

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: string, replacements?: Record<string, string>) => string;
  isLanguageModalOpen: boolean;
  openLanguageModal: () => void;
  closeLanguageModal: () => void;
  onboardingLanguageCompleted: boolean;
  setOnboardingLanguageCompleted: (val: boolean) => void;
  onboardingCompleted: boolean;
  setOnboardingCompleted: (val: boolean) => void;
  isGuestMode: boolean;
  setGuestMode: (val: boolean) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>("en");
  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [onboardingLanguageCompleted, setOnboardingLanguageCompletedState] = useState(false);
  const [onboardingCompleted, setOnboardingCompletedState] = useState(false);
  const [isGuestMode, setIsGuestModeState] = useState(false);

  // Initialize from localStorage on client mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const savedLang = window.localStorage.getItem(LANGUAGE_STORAGE_KEY) as LanguageCode | null;
      if (savedLang === "hi" || savedLang === "en") {
        setLanguageState(savedLang);
      } else {
        setLanguageState("en");
      }

      const langCompleted = window.localStorage.getItem(ONBOARDING_LANG_KEY) === "true";
      setOnboardingLanguageCompletedState(langCompleted);

      const fullCompleted = window.localStorage.getItem(ONBOARDING_COMPLETED_KEY) === "true";
      setOnboardingCompletedState(fullCompleted);

      const guestMode = window.localStorage.getItem(ONBOARDING_GUEST_KEY) === "true";
      setIsGuestModeState(guestMode);
    } catch (err) {
      console.warn("[Language Context Storage Notice]:", err);
    }
  }, []);

  const setLanguage = useCallback((lang: LanguageCode) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      } catch (err) {
        console.warn("[Language Save Notice]:", err);
      }
    }
  }, []);

  const setOnboardingLanguageCompleted = useCallback((val: boolean) => {
    setOnboardingLanguageCompletedState(val);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(ONBOARDING_LANG_KEY, val ? "true" : "false");
      } catch (err) {
        console.warn("[Onboarding Lang Completed Save Notice]:", err);
      }
    }
  }, []);

  const setOnboardingCompleted = useCallback((val: boolean) => {
    setOnboardingCompletedState(val);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(ONBOARDING_COMPLETED_KEY, val ? "true" : "false");
      } catch (err) {
        console.warn("[Onboarding Completed Save Notice]:", err);
      }
    }
  }, []);

  const setGuestMode = useCallback((val: boolean) => {
    setIsGuestModeState(val);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(ONBOARDING_GUEST_KEY, val ? "true" : "false");
      } catch (err) {
        console.warn("[Guest Mode Save Notice]:", err);
      }
    }
  }, []);

  const t = useCallback(
    (key: string, replacements?: Record<string, string>): string => {
      const langDict = TRANSLATIONS[language] || TRANSLATIONS.en;
      let text = langDict[key] || TRANSLATIONS.en[key] || key;

      if (replacements) {
        for (const [k, v] of Object.entries(replacements)) {
          text = text.replace(new RegExp(`\\{${k}\\}`, "g"), v);
        }
      }

      return text;
    },
    [language]
  );

  const openLanguageModal = useCallback(() => setIsLanguageModalOpen(true), []);
  const closeLanguageModal = useCallback(() => setIsLanguageModalOpen(false), []);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        isLanguageModalOpen,
        openLanguageModal,
        closeLanguageModal,
        onboardingLanguageCompleted,
        setOnboardingLanguageCompleted,
        onboardingCompleted,
        setOnboardingCompleted,
        isGuestMode,
        setGuestMode,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
