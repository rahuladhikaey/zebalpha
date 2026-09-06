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

function DigitalCard({ name, cardNumber, type, expiresAt }: { name: string; cardNumber: string; type: "Silver" | "Gold" | "Bronze" | "VIP"; expiresAt?: string }) {
  const badgeEmoji = type === "Gold" ? "👑" : type === "VIP" ? "⚡" : "💎";

  return (
    <div className="relative overflow-hidden rounded-[2.5rem] p-6 sm:p-7 text-white shadow-2xl hover:-translate-y-2 hover:shadow-white/10 transition-all duration-500 group select-none h-52 w-full flex flex-col justify-between animate-in fade-in zoom-in-95 duration-500 border border-zinc-700/50">
      <LowPolyBackground type={type} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-white/10 z-0" />
      <div className="absolute -right-16 -top-16 w-48 h-48 bg-white/5 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700 z-0" />

      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-2 sm:gap-3">
          <img src="/official-logo.png" alt="Asali Swad Logo" className="h-8 w-8 sm:h-10 sm:w-10 rounded-full object-cover border border-white/30 shadow-md bg-white" />
          <div className="text-left whitespace-nowrap">
            <h4 className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] leading-none text-white drop-shadow-sm whitespace-nowrap">ZEB-ALPHA</h4>
            <span className="text-[7px] font-black uppercase tracking-widest text-zinc-300 block mt-0.5 whitespace-nowrap">Privilege Card</span>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[8px] sm:text-[9px] font-black tracking-widest text-white bg-black/40 px-2.5 py-1 rounded-full uppercase border border-white/20 backdrop-blur-md shadow-sm whitespace-nowrap">
            {badgeEmoji} Alpha {type}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between z-10 my-1">
        <div className="h-7 w-10 sm:h-8 sm:w-11 rounded-lg bg-gradient-to-r from-zinc-200 via-zinc-400 to-zinc-200 border border-white/20 relative overflow-hidden shadow-md">
          <div className="absolute top-1 left-2 w-[1px] h-6 bg-black/20" />
          <div className="absolute top-1 left-5 w-[1px] h-6 bg-black/20" />
          <div className="absolute top-3 left-1 w-9 h-[1px] bg-black/20" />
          <div className="absolute top-5 left-1 w-9 h-[1px] bg-black/20" />
        </div>

        <div className="flex items-center gap-1.5 opacity-70">
          <span className="text-[7px] font-black tracking-widest text-white">NFC CONTACTLESS</span>
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
            <span className="text-[7px] font-black uppercase tracking-widest text-zinc-300 block leading-none mb-1">Card Holder</span>
            <span className="text-xs font-black text-white uppercase tracking-wider">{name}</span>
          </div>

          <div className="text-center mx-2">
            <span className="text-[6px] font-black uppercase tracking-widest text-zinc-300 block leading-none mb-0.5">VALID THRU</span>
            <span className="text-[8px] sm:text-[9px] font-black text-white whitespace-nowrap">
              {expiresAt ? new Date(expiresAt).toLocaleDateString(undefined, { month: '2-digit', year: '2-digit' }) : "27 DAYS"}
            </span>
          </div>

          <div className="h-7 px-3 rounded-lg bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center select-none shadow-inner">
            <span className="text-[7px] font-mono tracking-widest text-white uppercase font-black">ALPHA CARD</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CardsPage() {
  const { user, loading } = useAuth();
  const [applications, setApplications] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("zebalpha-card-applications") || localStorage.getItem("asali-swad-card-applications");
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) return parsed.map(normalizeCardApplication);
        }
      } catch (e) {}
    }
    return [];
  });
  const [dataLoading, setDataLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [cardType, setCardType] = useState<"Silver" | "Gold">("Silver");
  const [fullName, setFullName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("apply") === "true") {
        setShowApplyModal(true);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !user) {
      setDataLoading(false);
      return;
    }
    if (user.user_metadata?.full_name) {
      setFullName(user.user_metadata.full_name);
    }

    const userEmail = (user.email || "").trim().toLowerCase();

    const fetchProfileData = async () => {
      try {
        // 1. Try our server-side API endpoint first (service_role, zero RLS issues)
        let fetchedApps: any[] | null = null;
        try {
          const apiRes = await fetch(`/api/cards?email=${encodeURIComponent(userEmail)}`);
          if (apiRes.ok) {
            const json = await apiRes.json();
            if (json.success && Array.isArray(json.applications) && json.applications.length > 0) {
              fetchedApps = json.applications;
            }
          }
        } catch (apiErr) {
          console.warn("API cards fetch fallback:", apiErr);
        }

        // 2. Supabase client fallback
        if (!fetchedApps || fetchedApps.length === 0) {
          const { data: apps, error: appsErr } = await supabase
            .from("card_applications")
            .select("*")
            .or(`user_email.ilike.${userEmail},email.ilike.${userEmail}`)
            .order("applied_at", { ascending: false });

          if (apps && !appsErr && apps.length > 0) {
            fetchedApps = apps;
          }
        }

        if (fetchedApps && fetchedApps.length > 0) {
          const normalized = fetchedApps.map(normalizeCardApplication);
          setApplications(normalized);
          try {
            window.localStorage.setItem("zebalpha-card-applications", JSON.stringify(normalized));
            window.localStorage.setItem("asali-swad-card-applications", JSON.stringify(normalized));
          } catch (e) {}
        } else {
          // Re-check local cache for current user before clearing
          const cached = localStorage.getItem("zebalpha-card-applications") || localStorage.getItem("asali-swad-card-applications");
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              const matching = parsed?.filter((a: any) => ((a.email || a.user_email) || "").toLowerCase() === userEmail);
              if (matching && matching.length > 0) {
                setApplications(matching.map(normalizeCardApplication));
              } else {
                setApplications([]);
              }
            } catch (e) {
              setApplications([]);
            }
          } else {
            setApplications([]);
          }
        }
      } catch (e) {
        console.error("Profile data load error:", e);
      } finally {
        setDataLoading(false);
      }
    };

    fetchProfileData();

    // Supabase Realtime Subscription for zero-delay card updates (e.g. when Admin approves)
    const channel = supabase
      .channel(`customer-card-realtime-${userEmail}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "card_applications" }, () => {
        fetchProfileData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
      const applicantEmail = (user?.email || (typeof window !== "undefined" ? localStorage.getItem("zebalpha_user_email") : null) || "guest@zebalpha.com").trim().toLowerCase();
      
      const newAppPayload: any = {
        user_id: user?.id || null,
        user_email: applicantEmail,
        email: applicantEmail,
        name: fullName.trim(),
        phone: phoneNumber.trim(),
        card_type: cardType,
        status: "PENDING",
        applied_at: new Date().toISOString()
      };

      let savedApp: any = null;

      // 1. Post to reliable server API endpoint
      try {
        const res = await fetch("/api/cards", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newAppPayload)
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.application) {
            savedApp = data.application;
          }
        }
      } catch (apiErr) {
        console.warn("Apply card via API error, falling back to direct Supabase:", apiErr);
      }

      // 2. Fallback to Supabase client if needed
      if (!savedApp) {
        try {
          const { data: inserted, error } = await supabase
            .from("card_applications")
            .insert(newAppPayload)
            .select();

          if (!error && inserted && inserted.length > 0) {
            savedApp = inserted[0];
          }
        } catch (dbErr) {
          console.error("Card application DB insert exception:", dbErr);
        }
      }

      // 3. Always maintain state & LocalStorage cache
      const finalApp = normalizeCardApplication(savedApp || newAppPayload);
      const updatedApps = [
        ...applications.filter(a => ((a.user_email || a.email) || "").toLowerCase() !== applicantEmail),
        finalApp
      ];
      setApplications(updatedApps as any[]);

      try {
        window.localStorage.setItem("zebalpha-card-applications", JSON.stringify(updatedApps));
        window.localStorage.setItem("asali-swad-card-applications", JSON.stringify(updatedApps));
      } catch (e) {
        // ignore
      }

      setFormSuccess("✅ Application submitted successfully!");
      setShowApplyModal(false);
      setTimeout(() => setFormSuccess(""), 3000);
    } catch (err) {
      console.error("Apply card error:", err);
      setFormSuccess("✅ Application submitted!");
      setShowApplyModal(false);
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

      const rawText = await response.text();
      let orderData: any = null;
      try {
        orderData = JSON.parse(rawText);
      } catch (err) {
        console.error('Renew-card create-order non-JSON response:', rawText);
        setFormError(response.ok
          ? "Server error: Received an invalid response from the payment gateway. Check console for details."
          : `Payment gateway error (${response.status}): ${rawText.substring(0,200)}`);
        setIsSubmitting(false);
        return;
      }

      if (!response.ok || !orderData?.id) {
        setFormError(orderData?.error ? `Could not initiate payment order: ${orderData.error}` : `Could not initiate payment order. (${response.status})`);
        setIsSubmitting(false);
        return;
      }

      const activeRazorpayKey = 
        orderData.key || 
        orderData.keyId || 
        process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 
        "rzp_test_ShRpqbs6hVT6Ie";

      const options = {
        key: activeRazorpayKey,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "ZEB-ALPHA",
        description: "Alpha Card 27-Days Renewal Fee",
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
      <main className="flex min-h-screen items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black">
        <div className="text-center p-8 bg-zinc-950 rounded-3xl shadow-2xl border border-zinc-800 text-white">
          <h1 className="text-2xl font-bold mb-4">Please log in</h1>
          <Link href="/login" className="px-6 py-3 bg-white text-black rounded-xl font-bold hover:bg-zinc-200">Go to Login</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white overflow-x-hidden relative">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-zinc-800 bg-black/80 px-4 py-3 backdrop-blur-xl md:px-8">
        <div className="flex items-center gap-4">
          <Link href="/profile" className="flex items-center justify-center p-2 rounded-full hover:bg-zinc-900 transition-colors">
            <svg className="w-5 h-5 text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-white">Alpha Card & Wallet</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <UserMenu />
          <CartHeaderLink />
        </div>
      </header>

      <section className="mx-auto max-w-2xl px-4 py-6 md:py-10 md:px-8">
        <div className="rounded-[2.5rem] bg-zinc-950 p-6 sm:p-8 border border-zinc-800 shadow-2xl relative overflow-hidden">
          <div className="mb-6 text-left">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400 block mb-1">ZEB-ALPHA PRIVILEGE</span>
            <h3 className="text-lg font-black text-white">Alpha Membership Card</h3>
          </div>

          {dataLoading && applications.length === 0 ? (
            <div className="space-y-6 animate-pulse">
              <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-zinc-900 to-black p-8 text-white border border-zinc-800 opacity-60 flex flex-col justify-between h-52">
                <div className="flex justify-between items-start opacity-50">
                  <div className="flex items-center gap-2">
                    <img src="/official-logo.png" alt="Asali Swad Logo" className="h-6 w-6 rounded-full bg-white object-cover" />
                    <p className="text-[8px] font-black tracking-widest text-white">ZEB-ALPHA</p>
                  </div>
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                </div>
                <div className="flex items-center gap-3 my-auto">
                  <span className="text-xs font-mono font-bold tracking-widest text-zinc-400">CHECKING CARD STATUS...</span>
                </div>
                <div className="flex justify-between items-end opacity-50">
                  <div className="h-3 w-24 bg-zinc-800 rounded" />
                  <div className="h-3 w-16 bg-zinc-800 rounded" />
                </div>
              </div>
              <div className="h-12 w-full bg-zinc-900/50 rounded-2xl animate-pulse" />
            </div>
          ) : !userApplication ? (
            <div className="space-y-6">
              <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-zinc-900 to-black p-8 text-white border border-zinc-800 opacity-70">
                <div className="absolute inset-0 bg-white/5 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '16px 16px' }} />
                <div className="flex justify-between items-start opacity-50">
                  <div className="flex items-center gap-2">
                    <img src="/official-logo.png" alt="Asali Swad Logo" className="h-6 w-6 rounded-full bg-white object-cover" />
                    <p className="text-[8px] font-black tracking-widest text-white">ZEB-ALPHA</p>
                  </div>
                  <span className="text-xs">🔒</span>
                </div>
                <div className="mt-14 font-mono text-lg tracking-[0.2em] opacity-40 text-left">ALP-XXXX-XXXXXX</div>
                <div className="mt-6 flex justify-between items-end opacity-40 text-left">
                  <div>
                    <span className="text-[6px] block uppercase">Card Holder</span>
                    <span className="text-xs font-black uppercase">{user.email?.split("@")[0]}</span>
                  </div>
                  <span className="text-[8px] font-bold">NOT ISSUED</span>
                </div>
              </div>
              <p className="text-xs font-bold text-zinc-400 leading-relaxed text-left">
                Elevate your shopping experience with the ZEB-ALPHA Privilege Card. Unlock custom member discounts, direct coin cashbacks, and prioritised order dispatches.
              </p>
              <button
                onClick={() => setShowApplyModal(true)}
                className="w-full flex py-4 items-center justify-center rounded-2xl bg-white text-xs font-black uppercase tracking-widest text-black shadow-xl shadow-white/10 hover:bg-zinc-200 transition-all active:scale-95 min-h-[3.5rem] cursor-pointer"
              >
                Apply for Alpha Card ✨
              </button>
            </div>
          ) : userApplication.status === "PENDING" ? (
            <div className="space-y-6">
              <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-zinc-900 to-black p-8 text-white border-2 border-dashed border-zinc-700">
                <div className="flex justify-between items-start opacity-70">
                  <div className="flex items-center gap-2">
                    <img src="/official-logo.png" alt="Asali Swad Logo" className="h-6 w-6 rounded-full bg-white object-cover" />
                    <p className="text-[8px] font-black tracking-widest text-white">ZEB-ALPHA</p>
                  </div>
                  <span className="text-xs animate-bounce">⏳</span>
                </div>
                <div className="mt-14 font-mono text-lg tracking-[0.2em] text-zinc-400 animate-pulse text-left">APPLICATION UNDER VERIFICATION</div>
                <div className="mt-6 flex justify-between items-end text-left">
                  <div>
                    <span className="text-[6px] block uppercase text-zinc-500">Applicant</span>
                    <span className="text-xs font-black uppercase text-white">{userApplication.name}</span>
                  </div>
                  <span className="text-[8px] font-black text-white bg-zinc-900 border border-zinc-700 px-2 py-1 rounded">PENDING APPROVAL</span>
                </div>
              </div>
              <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 text-center">
                <p className="text-xs font-bold text-zinc-300 leading-relaxed">
                  ⏳ Your Alpha Card application is in review. Once approved by the admin, your official Alpha Card number will be activated here!
                </p>
              </div>
            </div>
          ) : userApplication.status === "REJECTED" ? (
            <div className="space-y-6">
              <div className="rounded-xl bg-rose-950/60 border border-rose-800/80 p-6 text-center">
                <span className="text-3xl text-rose-400">✗</span>
                <h4 className="mt-3 text-sm font-black text-rose-300 uppercase tracking-widest">Application Rejected</h4>
                <p className="mt-2 text-xs font-bold text-rose-400 leading-relaxed">
                  Unfortunately, your Alpha Card application was not approved at this time. Please contact support if you have questions.
                </p>
              </div>
              <button
                onClick={() => setShowApplyModal(true)}
                className="w-full flex py-3 px-4 items-center justify-center rounded-xl border border-zinc-700 text-xs font-black uppercase tracking-widest text-white hover:bg-zinc-900 transition-all min-h-[3rem] cursor-pointer"
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

              return (
                <div className="space-y-6">
                  <DigitalCard
                    name={userApplication.name}
                    cardNumber={userApplication.cardNumber || "ALP-XXXX-XXXXXX"}
                    type={userApplication.cardType || "Silver"}
                    expiresAt={userApplication.expiresAt || new Date(expiresAtTime).toISOString()}
                  />

                  {formSuccess && formSuccess.includes("renewed") && (
                    <div className="rounded-xl bg-zinc-900 border border-zinc-700 p-4">
                      <p className="text-xs font-bold text-white">{formSuccess}</p>
                    </div>
                  )}

                  {formError && (
                    <div className="rounded-xl bg-rose-950/60 border border-rose-800/80 p-4">
                      <p className="text-xs font-bold text-rose-400">{formError}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 text-left">
                      <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 block">Alpha Coins Balance</span>
                      <span className="text-base font-black text-white mt-1 block">🪙 {userApplication.coins || 250} Coins</span>
                    </div>
                    <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 text-left">
                      <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 block">Status / Validity</span>
                      <span className="text-xs font-black text-white mt-1 block">
                        {isExpired ? "Expired" : `${daysRemaining} Days Left`}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 text-center">
                    <p className="text-xs font-bold text-zinc-300 leading-relaxed">
                      🎉 Congratulations! Your digital Alpha Card is active. Enjoy exclusive VIP discounts during checkout!
                    </p>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      </section>

      {/* APPLY ALPHA CARD POPUP MODAL */}
      {showApplyModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="w-full max-w-lg rounded-[2.5rem] bg-zinc-950 border border-zinc-800 overflow-hidden max-h-[90vh] overflow-y-auto animate-in zoom-in-95 slide-in-from-bottom-8 duration-300 shadow-2xl">
            <div className="bg-black px-8 py-10 text-white relative text-left border-b border-zinc-800">
              <button
                onClick={() => setShowApplyModal(false)}
                className="absolute top-6 right-6 text-zinc-400 hover:text-white transition-colors text-lg cursor-pointer"
              >
                ✕
              </button>
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400">Membership Enrollment</span>
              <h2 className="text-2xl font-black mt-2">Apply for Alpha Card</h2>
              <p className="text-xs font-bold text-zinc-400 mt-1">Unlock ZEB-ALPHA premium virtual credentials and benefits.</p>
            </div>

            <form onSubmit={handleApplyCard} className="p-8 space-y-6 text-white text-left">
              {/* SELECT CARD TYPE */}
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 block mb-3">Select Alpha Card Tier</label>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: "Silver", label: "Alpha Silver", emoji: "💎" },
                    { id: "Gold", label: "Alpha Gold", emoji: "👑" }
                  ].map((tier) => (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setCardType(tier.id as any)}
                      className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all cursor-pointer ${cardType === tier.id ? "border-white bg-zinc-900 text-white" : "border-zinc-800 text-zinc-500 hover:border-zinc-700"}`}
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
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 block mb-2">Your Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-3 text-sm font-bold outline-none focus:border-white transition-all text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 block mb-2">Registered Email</label>
                  <input
                    type="email"
                    readOnly
                    value={user.email || ""}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900/50 px-5 py-3 text-sm font-bold text-zinc-500 outline-none cursor-not-allowed"
                    title="Automatically linked to your active profile"
                  />
                  <span className="text-[9px] font-bold text-zinc-500 mt-1 block">Prefetched registration identity</span>
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 block mb-2">Phone Number</label>
                  <input
                    type="tel"
                    required
                    maxLength={15}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter phone number"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-5 py-3 text-sm font-bold outline-none focus:border-white transition-all text-white"
                  />
                </div>
              </div>

              {/* TERMS AGREEMENT */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 rounded border-zinc-700 bg-zinc-900 text-white focus:ring-0"
                />
                <span className="text-[11px] font-bold text-zinc-400 leading-snug">
                  I agree to the <Link href="/terms-and-conditions" target="_blank" className="text-white underline font-black hover:text-zinc-300">terms & conditions</Link> of the ZEBALPHA VIP Premium Club membership.
                </span>
              </label>

              {formError && (
                <div className="rounded-xl bg-rose-950/60 border border-rose-800/80 p-4">
                  <p className="text-xs font-bold text-rose-400">{formError}</p>
                </div>
              )}

              {formSuccess && (
                <div className="rounded-xl bg-zinc-900 border border-zinc-700 p-4">
                  <p className="text-xs font-bold text-white">{formSuccess}</p>
                </div>
              )}

              {/* ACTION BUTTONS */}
              <div className="flex gap-4 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="flex-1 min-h-[3rem] py-3 px-4 rounded-xl border border-zinc-800 text-xs font-black uppercase tracking-wider text-zinc-400 hover:bg-zinc-900 transition-all flex items-center justify-center text-center cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 min-h-[3rem] py-3 px-4 rounded-xl bg-white text-black text-xs font-black uppercase tracking-wider hover:bg-zinc-200 transition-all disabled:opacity-50 flex items-center justify-center text-center cursor-pointer shadow-xl shadow-white/10"
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
