"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { CartHeaderLink } from "@/components/CartHeaderLink";
import UserMenu from "@/components/UserMenu";

const normalizeCardApplication = (app: any) => ({
  id: app.id,
  user_email: app.user_email || app.email,
  name: app.name || "",
  email: app.user_email || app.email || "",
  phone: app.phone || "",
  cardType: app.card_type || app.cardType || "Silver",
  status: app.status || "PENDING",
  appliedAt: app.applied_at || app.appliedAt || new Date().toISOString(),
  updatedAt: app.updated_at || app.updatedAt,
  cardNumber: app.card_number || app.cardNumber,
  expiresAt: app.expires_at || app.expiresAt,
});

function LowPolyBackground({ type }: { type: "Silver" | "Gold" | "Bronze" | "VIP" }) {
  let gradient = "";
  if (type === "Gold") {
    gradient = "from-amber-400 via-yellow-600 to-amber-800";
  } else if (type === "Silver") {
    gradient = "from-slate-400 via-slate-500 to-slate-700";
  } else if (type === "Bronze") {
    gradient = "from-[#8c502b] via-[#66381c] to-[#401f0c]";
  } else { // VIP
    gradient = "from-[#4b79a1] via-[#283e51] to-[#15202b]";
  }

  return (
    <div className={`absolute inset-0 z-0 bg-gradient-to-br ${gradient}`}>
      <svg className="w-full h-full object-cover opacity-[0.16]" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 250">
        <g fill="#ffffff">
          <polygon points="0,0 80,0 40,40" />
          <polygon points="80,0 160,0 120,50" />
          <polygon points="40,40 120,50 80,90" />
          <polygon points="0,0 40,40 0,80" />

          <polygon points="160,0 240,0 200,45" />
          <polygon points="240,0 320,0 280,55" />
          <polygon points="320,0 400,0 360,40" />

          <polygon points="120,50 200,45 160,100" />
          <polygon points="200,45 280,55 240,110" />
          <polygon points="280,55 360,40 320,105" />
          <polygon points="360,40 400,0 400,60" />

          <polygon points="80,90 160,100 120,150" />
          <polygon points="160,100 240,110 200,165" />
          <polygon points="240,110 320,105 280,160" />
          <polygon points="320,105 400,60 360,140" />
          <polygon points="400,60 400,150 360,140" />

          <polygon points="120,150 200,165 165,220" />
          <polygon points="200,165 280,160 245,215" />
          <polygon points="280,160 360,140 320,210" />
          <polygon points="360,140 400,150 400,220" />

          <polygon points="0,80 80,90 40,140" />
          <polygon points="0,80 40,140 0,160" />
          <polygon points="40,140 120,150 80,200" />
          <polygon points="0,160 40,140 0,220" />
          <polygon points="80,200 165,220 120,250" />
          <polygon points="0,220 80,200 0,250" />

          <polygon points="165,220 245,215 200,250" />
          <polygon points="245,215 320,210 280,250" />
          <polygon points="320,210 400,220 360,250" />
          <polygon points="400,220 400,250 360,250" />
        </g>
        <g fill="#000000" opacity="0.25">
          <polygon points="40,40 80,0 120,50" />
          <polygon points="120,50 160,0 200,45" />
          <polygon points="200,45 240,0 280,55" />
          <polygon points="280,55 320,0 360,40" />

          <polygon points="80,90 120,50 160,100" />
          <polygon points="160,100 200,45 240,110" />
          <polygon points="240,110 280,55 320,105" />
          <polygon points="320,105 360,40 400,60" />

          <polygon points="120,150 160,100 200,165" />
          <polygon points="200,165 240,110 280,160" />
          <polygon points="280,160 320,105 360,140" />

          <polygon points="165,220 200,165 245,215" />
          <polygon points="245,215 280,160 320,210" />
          <polygon points="320,210 360,140 400,150" />
        </g>
      </svg>
    </div>
  );
}

function DigitalCard({ name, cardNumber, type, expiresAt }: { name: string; cardNumber: string; type: "Silver" | "Gold"; expiresAt?: string }) {
  const badgeEmoji = type === "Gold" ? "👑" : "💎";

  return (
    <div className="relative overflow-hidden rounded-[2.5rem] p-6 sm:p-7 text-white shadow-2xl hover:-translate-y-2 hover:shadow-emerald-500/10 transition-all duration-500 group select-none h-52 w-full flex flex-col justify-between animate-in fade-in zoom-in-95 duration-500">
      <LowPolyBackground type={type} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/10 z-0" />
      <div className="absolute -right-16 -top-16 w-48 h-48 bg-white/5 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700 z-0" />

      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-2 sm:gap-3">
          <img src="/official-logo.png" alt="Asali Swad Logo" className="h-8 w-8 sm:h-10 sm:w-10 rounded-full object-cover border border-white/20 shadow-md bg-white" />
          <div className="text-left whitespace-nowrap">
            <h4 className="text-[9px] sm:text-[11px] font-black uppercase tracking-[0.15em] leading-none text-white drop-shadow-sm whitespace-nowrap">Asali Swad</h4>
            <span className="text-[6px] sm:text-[7px] font-black uppercase tracking-widest text-white/80 block mt-0.5 whitespace-nowrap">Authentic Spices</span>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[8px] sm:text-[9px] font-black tracking-widest text-white/90 bg-white/20 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full uppercase border border-white/10 backdrop-blur-sm shadow-sm whitespace-nowrap">
            {badgeEmoji} {type} VIP
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between z-10 my-1">
        <div className="h-7 w-10 sm:h-8 sm:w-11 rounded-lg bg-gradient-to-r from-yellow-100/80 via-yellow-200/90 to-yellow-100/80 border border-white/10 relative overflow-hidden shadow-md">
          <div className="absolute top-1 left-2 w-[1px] h-6 bg-slate-800/10" />
          <div className="absolute top-1 left-5 w-[1px] h-6 bg-slate-800/10" />
          <div className="absolute top-3 left-1 w-9 h-[1px] bg-slate-800/10" />
          <div className="absolute top-5 left-1 w-9 h-[1px] bg-slate-800/10" />
        </div>

        <div className="flex items-center gap-1.5 opacity-60">
          <span className="text-[7px] font-black tracking-widest text-white">NFC</span>
          <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
      </div>

      <div className="z-10 mt-auto flex flex-col gap-1.5 text-left">
        <p className="font-mono text-sm sm:text-base font-bold tracking-[0.15em] text-white drop-shadow-md whitespace-nowrap overflow-hidden text-ellipsis">
          {cardNumber}
        </p>

        <div className="flex items-end justify-between">
          <div>
            <span className="text-[7px] font-black uppercase tracking-widest text-white/50 block leading-none mb-1">Card Holder</span>
            <span className="text-xs font-black text-white uppercase tracking-wider">{name}</span>
          </div>

          <div className="text-center mx-2">
            <span className="text-[6px] font-black uppercase tracking-widest text-white/50 block leading-none mb-0.5">VALID THRU</span>
            <span className="text-[8px] sm:text-[9px] font-black text-white whitespace-nowrap">
              {expiresAt ? new Date(expiresAt).toLocaleDateString(undefined, { month: '2-digit', year: '2-digit' }) : "27 DAYS"}
            </span>
          </div>

          <div className="h-7 w-20 rounded-md bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center select-none shadow-inner">
            <span className="text-[7px] font-mono tracking-widest text-white/50 uppercase">{type} CARD</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CardsPage() {
  const { user, loading } = useAuth();
  const [applications, setApplications] = useState<any[]>([]);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [cardType, setCardType] = useState<"Silver" | "Gold">("Silver");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !user) return;
    if (user.user_metadata?.full_name) {
      setFullName(user.user_metadata.full_name);
    }

    const fetchProfileData = async () => {
      try {
        const { data: apps, error: appsErr } = await supabase
          .from("card_applications")
          .select("*")
          .eq("user_email", user.email)
          .order("applied_at", { ascending: false });

        if (apps && !appsErr) {
          setApplications(apps.map(normalizeCardApplication));
        } else if (appsErr) {
          console.error("Error fetching card applications:", appsErr);
        }
      } catch (e) {
        console.error("Profile data load error:", e);
      }
    };

    fetchProfileData();
  }, [user]);

  const userApplication = user ? applications.find(
    (app) => ((app.email || app.user_email) || "")?.toLowerCase() === user.email?.toLowerCase()
  ) : null;

  const handleApplyCard = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");

    if (!fullName.trim()) {
      setFormError("Please enter your name.");
      return;
    }
    if (!phoneNumber.trim() || phoneNumber.length < 10) {
      setFormError("Please enter a valid phone number.");
      return;
    }
    if (!agreedToTerms) {
      setFormError("You must agree to the terms and conditions.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        user_email: user?.email,
        name: fullName.trim(),
        phone: phoneNumber.trim(),
        card_type: cardType,
        status: "PENDING",
      };

      const { data: inserted, error } = await supabase
        .from("card_applications")
        .insert(payload)
        .select();

      if (error) {
        console.error("Error inserting application:", error);
        setFormError("Could not submit application. Please try again.");
        setIsSubmitting(false);
        return;
      }

      const normalizedInserted = inserted ? inserted.map(normalizeCardApplication) : [];
      const updatedApps = normalizedInserted.length > 0
        ? [...applications.filter(a => (a.user_email || a.email)?.toLowerCase() !== user?.email?.toLowerCase()), ...normalizedInserted]
        : applications;
      setApplications(updatedApps as any[]);

      try {
        window.localStorage.setItem("asali-swad-card-applications", JSON.stringify(updatedApps));
      } catch (e) {
        // ignore
      }

      setFormSuccess("✅ Application submitted successfully!");
      setShowApplyModal(false);
      setTimeout(() => setFormSuccess(""), 2000);
    } catch (err) {
      console.error("Apply card error:", err);
      setFormError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      if (typeof window === "undefined") {
        resolve(false);
        return;
      }
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRenewCard = async () => {
    if (!user || !userApplication || isSubmitting) return;

    setFormError("");
    setFormSuccess("");
    setIsSubmitting(true);

    try {
      const sdkLoaded = await loadRazorpay();
      if (!sdkLoaded) {
        setFormError("Failed to load payment gateway SDK. Please check your internet connection.");
        setIsSubmitting(false);
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/checkout/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: 30 }),
      });

      let orderData;
      try {
        const text = await response.text();
        orderData = JSON.parse(text);
      } catch (err) {
        setFormError("Server error: Received an invalid response from the payment gateway.");
        setIsSubmitting(false);
        return;
      }

      if (!response.ok || !orderData.id) {
        setFormError("Could not initiate payment order: " + (orderData.error || "Please try again."));
        setIsSubmitting(false);
        return;
      }

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "Asali Swad",
        description: "AS-Card 27-Days Renewal Fee",
        order_id: orderData.id,
        handler: async function (paymentResponse: any) {
          try {
            setIsSubmitting(true);
            setFormSuccess("🔄 Verifying your payment...");

            const verifyRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/profile/verify-renew-payment`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature,
              }),
            });

            const verifyData = await verifyRes.json();
            if (verifyData.success) {
              const now = new Date();
              const approvalTime = new Date(userApplication.updatedAt || userApplication.appliedAt).getTime();
              const currentExpiresTime = userApplication.expiresAt
                ? new Date(userApplication.expiresAt).getTime()
                : approvalTime + 27 * 24 * 60 * 60 * 1000;

              const isExpired = now.getTime() > currentExpiresTime;

              const baseTime = isExpired ? now.getTime() : currentExpiresTime;
              const newExpiresAt = new Date(baseTime + 27 * 24 * 60 * 60 * 1000);

              try {
                const { error: updErr } = await supabase
                  .from('card_applications')
                  .update({ expires_at: newExpiresAt.toISOString(), updated_at: new Date().toISOString(), status: 'APPROVED' })
                  .eq('user_email', user.email);

                if (updErr) console.error('Error updating application expiry:', updErr);

                const { data: refreshed } = await supabase
                  .from('card_applications')
                  .select('*')
                  .eq('user_email', user.email)
                  .order('applied_at', { ascending: false });

                if (refreshed) {
                  const normalized = refreshed.map(normalizeCardApplication);
                  setApplications(normalized as any[]);
                  try { window.localStorage.setItem('asali-swad-card-applications', JSON.stringify(normalized)); } catch(e){}
                }
              } catch (e) {
                console.error('Error persisting renewal:', e);
              }

              const formattedDate = newExpiresAt.toLocaleDateString(undefined, {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              });
              setFormError("");
              setFormSuccess(`🔄 Card renewed successfully for 27 days! New Expiry: ${formattedDate}`);
            } else {
              setFormError("Payment verification failed. Please contact customer support.");
            }
          } catch (err) {
            console.error("Renewal Error:", err);
            setFormError("An error occurred during verification. Please contact support.");
          } finally {
            setIsSubmitting(false);
          }
        },
        prefill: {
          name: userApplication.name || user.user_metadata?.full_name || "",
          email: user.email || "",
          contact: userApplication.phone || ""
        },
        theme: { color: "#059669" },
        modal: {
          ondismiss: function () {
            setIsSubmitting(false);
            setFormError("Renewal payment was cancelled.");
          }
        }
      };

      const Razorpay = (window as any).Razorpay;
      const paymentObject = new Razorpay(options);
      paymentObject.open();

    } catch (error) {
      console.error("Razorpay Error:", error);
      setFormError("An unexpected error occurred. Please check your network and try again.");
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center p-8 bg-white rounded-3xl shadow-sm border border-slate-100">
          <h1 className="text-2xl font-bold mb-4">Please log in</h1>
          <Link href="/login" className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold">Go to Login</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#cefad0] text-slate-900 overflow-x-hidden relative">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-200/60 bg-white/80 px-4 py-3 backdrop-blur-xl md:px-8">
        <div className="flex items-center gap-4">
          <Link href="/profile" className="flex items-center justify-center p-2 rounded-full hover:bg-slate-100 transition-colors">
            <svg className="w-5 h-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-800">My Cards & Wallet</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <UserMenu />
          <CartHeaderLink />
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-4 py-6 md:py-10 md:px-8">
        <div className="rounded-[2.5rem] bg-white p-6 sm:p-8 border border-slate-100 premium-shadow relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl" />

          <div className="mb-6 text-left">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-600 block mb-1">AS-Card Membership</span>
            <h3 className="text-lg font-black text-slate-900">AsaliSwad Membership Card</h3>
          </div>

          {!userApplication ? (
            <div className="space-y-6">
              <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-800 to-slate-950 p-8 text-white border border-slate-700/30 opacity-70">
                <div className="absolute inset-0 bg-white/5 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '16px 16px' }} />
                <div className="flex justify-between items-start opacity-50">
                  <div className="flex items-center gap-2">
                    <img src="/official-logo.png" alt="Asali Swad Logo" className="h-6 w-6 rounded-full bg-white object-cover" />
                    <p className="text-[8px] font-black tracking-widest text-white">ASALI SWAD</p>
                  </div>
                  <span className="text-xs">🔒</span>
                </div>
                <div className="mt-14 font-mono text-lg tracking-[0.2em] opacity-40 text-left">XXXX-XXXX-XXXX-XXXX</div>
                <div className="mt-6 flex justify-between items-end opacity-40 text-left">
                  <div>
                    <span className="text-[6px] block uppercase">Card Holder</span>
                    <span className="text-xs font-black uppercase">{user.email?.split("@")[0]}</span>
                  </div>
                  <span className="text-[8px] font-bold">INACTIVE</span>
                </div>
              </div>
              <p className="text-xs font-bold text-slate-400 leading-relaxed text-left">
                Elevate your shopping experience. Unlock custom premium discounts, direct reward cashbacks, and prioritised dispatches with a digital membership card.
              </p>
              <button
                onClick={() => setShowApplyModal(true)}
                className="w-full flex py-4 items-center justify-center rounded-2xl bg-emerald-600 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-95 min-h-[3.5rem]"
              >
                Apply Now ✨
              </button>
            </div>
          ) : userApplication.status === "PENDING" ? (
            <div className="space-y-6">
              <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-slate-900 to-slate-950 p-8 text-white border-2 border-dashed border-amber-500/30">
                <div className="absolute inset-0 bg-amber-500/5 animate-pulse" />
                <div className="flex justify-between items-start opacity-70">
                  <div className="flex items-center gap-2">
                    <img src="/official-logo.png" alt="Asali Swad Logo" className="h-6 w-6 rounded-full bg-white object-cover" />
                    <p className="text-[8px] font-black tracking-widest text-white">ASALI SWAD</p>
                  </div>
                  <span className="text-xs animate-bounce">⏳</span>
                </div>
                <div className="mt-14 font-mono text-lg tracking-[0.2em] text-amber-500/50 animate-pulse text-left">VERIFICATION IN PROGRESS</div>
                <div className="mt-6 flex justify-between items-end text-left">
                  <div>
                    <span className="text-[6px] block uppercase text-slate-500">Applicant</span>
                    <span className="text-xs font-black uppercase">{userApplication.name}</span>
                  </div>
                  <span className="text-[8px] font-black text-amber-500 bg-amber-500/10 px-2 py-1 rounded">PENDING APPROVAL</span>
                </div>
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-center">
                <p className="text-xs font-bold text-amber-800 leading-relaxed">
                  ⏳ Your application is sent to the admin. Once verified, your premium card number will be auto-generated here!
                </p>
              </div>
            </div>
          ) : userApplication.status === "REJECTED" ? (
            <div className="space-y-6">
              <div className="rounded-xl bg-rose-50 border border-rose-100 p-6 text-center">
                <span className="text-3xl">✗</span>
                <h4 className="mt-3 text-sm font-black text-rose-800 uppercase tracking-widest">Application Rejected</h4>
                <p className="mt-2 text-xs font-bold text-rose-600 leading-relaxed">
                  Unfortunately, your premium card application was not approved at this time. Please contact our VIP care if you have questions.
                </p>
              </div>
              <button
                onClick={() => setShowApplyModal(true)}
                className="w-full flex py-3 px-4 items-center justify-center rounded-xl border-2 border-slate-200 text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all min-h-[3rem]"
              >
                Re-Apply Application
              </button>
            </div>
          ) : (
            (() => {
              const approvalTime = new Date(userApplication.updatedAt || userApplication.appliedAt).getTime();
              const expiresAtTime = userApplication.expiresAt
                ? new Date(userApplication.expiresAt).getTime()
                : approvalTime + 27 * 24 * 60 * 60 * 1000;

              const nowTime = new Date().getTime();
              const isExpired = nowTime > expiresAtTime;
              const daysRemaining = Math.max(0, Math.ceil((expiresAtTime - nowTime) / (24 * 60 * 60 * 1000)));
              const formattedDate = new Date(expiresAtTime).toLocaleDateString(undefined, {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
              });

              return (
                <div className="space-y-6">
                  <DigitalCard
                    name={userApplication.name}
                    cardNumber={userApplication.cardNumber || "ASW-XXXX-XXXXXX"}
                    type={userApplication.cardType || "Silver"}
                    expiresAt={userApplication.expiresAt || new Date(expiresAtTime).toISOString()}
                  />

                  {formSuccess && formSuccess.includes("renewed") && (
                    <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-center animate-in fade-in slide-in-from-top-4 duration-300">
                      <p className="text-xs font-black text-emerald-600 leading-relaxed uppercase tracking-wider">
                        {formSuccess}
                      </p>
                    </div>
                  )}

                  {formError && (
                    <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 text-center animate-in fade-in slide-in-from-top-4 duration-300">
                      <p className="text-xs font-black text-rose-600 leading-relaxed uppercase tracking-wider">
                        ⚠️ {formError}
                      </p>
                    </div>
                  )}

                  <div className="rounded-[2.2rem] bg-slate-50 border border-slate-100 p-6 flex flex-col sm:flex-row items-center justify-between gap-5 text-left shadow-sm">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block leading-none">Membership Validity Status</span>
                      <p className={`text-xs font-black uppercase tracking-wider ${isExpired ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {isExpired ? `⚠️ Expired on ${formattedDate}` : `✅ Active • Valid until ${formattedDate} (${daysRemaining} Days left)`}
                      </p>
                    </div>

                    <button
                      onClick={handleRenewCard}
                      disabled={isSubmitting}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 text-white font-black text-[10px] uppercase tracking-wider px-5 py-3 transition-all border-b-4 border-emerald-700 hover:bg-emerald-400 hover:border-emerald-600 active:translate-y-[2px] active:border-b-[2px] shadow-md shadow-emerald-950/20 cursor-pointer select-none disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent shrink-0" />
                          <span>Renewing (Pay ₹30)...</span>
                        </>
                      ) : (
                        <>
                          <span>🔄</span>
                          <span>Renew Card (₹30)</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4 text-center">
                    <p className="text-xs font-bold text-emerald-800 leading-relaxed">
                      🎉 Congratulations! Your digital card is active. Enjoy exclusive VIP discounts during checkout!
                    </p>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </section>

      {/* APPLY AS-CARD POPUP MODAL */}
      {showApplyModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-lg rounded-[2.5rem] bg-white premium-shadow border border-slate-100 overflow-hidden max-h-[90vh] overflow-y-auto animate-in zoom-in-95 slide-in-from-bottom-8 duration-300">
            <div className="bg-slate-950 px-8 py-10 text-white relative text-left">
              <button
                onClick={() => setShowApplyModal(false)}
                className="absolute top-6 right-6 text-slate-400 hover:text-white transition-colors text-lg"
              >
                ✕
              </button>
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-400">Membership Enrollment</span>
              <h2 className="text-2xl font-black mt-2">Apply AS-Card</h2>
              <p className="text-xs font-bold text-slate-400 mt-1">Unlock AsaliSwad premium virtual credentials.</p>
            </div>

            <form onSubmit={handleApplyCard} className="p-8 space-y-6 text-slate-900 text-left">
              {/* SELECT CARD TYPE */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-3">Select Card Type</label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: "Silver", label: "Silver", emoji: "💎" },
                    { id: "Gold", label: "Gold", emoji: "👑" }
                  ].map((tier) => (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setCardType(tier.id as any)}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${cardType === tier.id ? "border-emerald-600 bg-emerald-50 text-emerald-800" : "border-slate-100 text-slate-400 hover:border-slate-200"}`}
                    >
                      <span className="text-2xl">{tier.emoji}</span>
                      <span className="text-[10px] font-black uppercase tracking-wider mt-1">{tier.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* USER DETAILS */}
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-2">Your Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full rounded-xl border-2 border-slate-100 bg-white px-5 py-3 text-sm font-bold outline-none focus:border-emerald-500/20 focus:ring-4 focus:ring-emerald-500/5 transition-all text-slate-800"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-2">Registered Email</label>
                  <input
                    type="email"
                    readOnly
                    value={user.email || ""}
                    className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 px-5 py-3 text-sm font-bold text-slate-500 outline-none cursor-not-allowed"
                    title="Automatically linked to your active profile"
                  />
                  <span className="text-[9px] font-bold text-slate-400 mt-1 block">Prefetched registration identity</span>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-2">Phone Number</label>
                  <input
                    type="tel"
                    required
                    maxLength={15}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter phone number"
                    className="w-full rounded-xl border-2 border-slate-100 bg-white px-5 py-3 text-sm font-bold outline-none focus:border-emerald-500/20 focus:ring-4 focus:ring-emerald-500/5 transition-all text-slate-800"
                  />
                </div>
              </div>

              {/* TERMS AGREEMENT */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="text-[11px] font-bold text-slate-500 leading-snug">
                  I agree to the terms & conditions of the AsaliSwad VIP Premium Club membership.
                </span>
              </label>

              {formError && (
                <div className="rounded-xl bg-rose-50 border border-rose-100 p-4">
                  <p className="text-xs font-bold text-rose-700">{formError}</p>
                </div>
              )}

              {formSuccess && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-4">
                  <p className="text-xs font-bold text-emerald-700">{formSuccess}</p>
                </div>
              )}

              {/* ACTION BUTTONS */}
              <div className="flex gap-4 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="flex-1 min-h-[3rem] py-3 px-4 rounded-xl border-2 border-slate-100 text-xs font-black uppercase tracking-wider text-slate-400 hover:bg-slate-50 transition-all flex items-center justify-center text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 min-h-[3rem] py-3 px-4 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-wider hover:bg-emerald-600 transition-all disabled:opacity-50 flex items-center justify-center text-center"
                >
                  {isSubmitting ? "Submitting..." : "Submit Application 🚀"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
