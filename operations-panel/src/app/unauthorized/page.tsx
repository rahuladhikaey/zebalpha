"use client";

import Link from "next/link";
import { ShieldAlert, LogOut, Database, Shield } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function UnauthorizedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const getReasonDetails = () => {
    switch (reason) {
      case "query_error":
        return {
          title: "Service Verification Error",
          desc: "A secure communication error occurred while verifying your organizational membership. Please try signing in again.",
          icon: <Database className="w-7 h-7 text-amber-400" />
        };
      case "role_restricted":
        return {
          title: "Elevated Privilege Required",
          desc: "Your authenticated account possesses operations access, but this specific section requires HR Manager or OWNER privileges.",
          icon: <Shield className="w-7 h-7 text-amber-400" />
        };
      case "no_membership":
      default:
        return {
          title: "Access Restricted",
          desc: "Your authenticated account does not possess active membership privileges for the Internal Operations Panel.",
          icon: <ShieldAlert className="w-7 h-7 text-amber-400" />
        };
    }
  };

  const details = getReasonDetails();

  return (
    <div className="w-full max-w-md bg-dark-900 border border-dark-800 rounded-2xl p-8 shadow-2xl">
      <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 mx-auto flex items-center justify-center mb-4">
        {details.icon}
      </div>
      <h1 className="text-lg font-bold text-white mb-1">{details.title}</h1>
      <p className="text-xs text-zinc-400 mb-6">{details.desc}</p>

      <div className="space-y-3">
        <button
          onClick={handleSignOut}
          className="w-full py-2.5 px-4 bg-dark-800 hover:bg-dark-700 text-zinc-200 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign In with a Different Account</span>
        </button>
        
        <Link
          href="/login"
          className="block text-xs text-ops-500 hover:underline pt-2"
        >
          Return to Login
        </Link>
      </div>
    </div>
  );
}

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-dark-950 flex flex-col justify-center items-center px-4 text-center">
      <Suspense fallback={
        <div className="w-full max-w-md bg-dark-900 border border-dark-800 rounded-2xl p-8 shadow-2xl text-zinc-400 text-xs">
          Loading access details...
        </div>
      }>
        <UnauthorizedContent />
      </Suspense>
    </div>
  );
}

