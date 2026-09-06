"use client";

import { useEffect, useState, Suspense } from "react";
import { supabase } from "@shared/utils/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "unauthorized") {
      setError("Access Denied. Your account does not have seller privileges.");
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setStatusMessage("");
    setLoading(true);

    try {
      let authRes: any = null;
      try {
        authRes = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password: password,
        });
      } catch (fetchErr: any) {
        console.error("Supabase auth exception:", fetchErr);
        setError("Network error connecting to authentication service. Please try again.");
        setLoading(false);
        return;
      }

      let data = authRes?.data;
      let authError = authRes?.error;

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
          .eq("email", email.trim().toLowerCase())
          .is("user_id", null);
      } catch (linkErr) {
        console.warn("Notice linking user_id:", linkErr);
      }

      const { data: sellerData } = await supabase
        .from("sellers")
        .select("status, rejection_reason")
        .eq("email", email.trim().toLowerCase())
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
          business_name: "Zebalpha Apparel Store",
          mobile_number: user.phone || "",
          phone_number: user.phone || "",
          email: email.trim().toLowerCase(),
          category: "Apparel & Streetwear",
          business_category: "Apparel & Streetwear",
          status: "approved",
          account_status: "Active",
          email_verified: true,
          delete_requested: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data: newSellerData, error: insertErr } = await supabase
          .from("sellers")
          .insert([sellerPayload])
          .select("status, rejection_reason")
          .maybeSingle();

        if (insertErr) {
          console.warn("Auto-creation of seller record failed:", insertErr);
          setError("Access Denied. Your seller account does not exist.");
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }

        activeSellerData = newSellerData || { status: "approved", rejection_reason: null };

        try {
          await supabase
            .from("profiles")
            .upsert({
              id: user.id,
              email: email.trim().toLowerCase(),
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
        if (activeSellerData.status === "pending") {
          setStatusMessage("⏳ Your seller account registration is currently pending Super Admin verification. You will be notified once approved.");
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }
        if (activeSellerData.status === "rejected") {
          setError(`❌ Your seller registration was rejected. Reason: ${activeSellerData.rejection_reason || "Not specified"}`);
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }
        if (activeSellerData.status === "suspended") {
          setError("⛔ Your seller account has been suspended by Administration. Please contact support.");
          await supabase.auth.signOut();
          setLoading(false);
          return;
        }
      }

      window.location.href = "/dashboard";
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    }
    setLoading(false);
  };

  return (
    <div className="w-full max-w-md">
      <div className="rounded-3xl bg-zinc-950 border border-zinc-800 p-8 shadow-2xl flex flex-col items-center">
        <div className="mb-6">
          <img
            src="/official-logo.png"
            alt="ZEBALPHA Logo"
            className="h-16 w-16 rounded-full object-cover border border-zinc-700 shadow-md"
          />
        </div>

        <div className="text-center mb-8">
          <span className="text-[11px] font-black uppercase tracking-widest text-zinc-400">
            Merchant Portal
          </span>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-white">
            Seller Login
          </h1>
          <p className="mt-2 text-xs text-zinc-400 font-medium">
            Manage your store, products, inventory & orders.
          </p>
        </div>

        <form className="w-full space-y-4" onSubmit={handleLogin}>
          <div className="space-y-4">
            <div className="space-y-1 text-left">
              <label className="block text-xs font-bold text-zinc-300">
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="seller@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/90 px-4 py-3 text-sm font-medium text-white outline-none placeholder:text-zinc-500 focus:border-white transition-all"
              />
            </div>

            <div className="space-y-1 text-left">
              <label className="block text-xs font-bold text-zinc-300">
                Password
              </label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/90 px-4 py-3 text-sm font-medium text-white outline-none placeholder:text-zinc-500 focus:border-white transition-all"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-xs font-bold text-zinc-300 hover:text-white underline transition-colors"
            >
              Forgot Password?
            </Link>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-xs font-semibold text-rose-300">
              {error}
            </div>
          )}

          {statusMessage && (
            <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-700 text-xs font-semibold text-zinc-200">
              {statusMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-white hover:bg-zinc-200 text-black text-sm font-black uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-50 cursor-pointer shadow-lg shadow-white/10"
          >
            {loading ? "Authenticating..." : "Sign In"}
          </button>
        </form>

        <div className="mt-6 border-t border-zinc-800/80 pt-5 text-center w-full space-y-2">
          <p className="text-xs text-zinc-400">
            New Merchant?{" "}
            <Link href="/register" className="text-white font-bold underline hover:text-zinc-300">
              Register New Seller Account
            </Link>
          </p>
          <div>
            <a
              href="http://localhost:3000"
              className="text-xs font-medium text-zinc-400 hover:text-white transition-colors"
            >
              ← Return to Storefront
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SellerLoginPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-black text-white">
      <Suspense fallback={
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white"></div>
          <span className="text-xs font-medium text-zinc-400">Loading Portal...</span>
        </div>
      }>
        <LoginContent />
      </Suspense>
    </main>
  );
}
