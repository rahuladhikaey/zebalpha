"use client";

import Link from "next/link";
import { ShieldAlert, ArrowLeft, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function UnauthorizedPage() {
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col justify-center items-center px-4 text-center">
      <div className="w-full max-w-md bg-dark-900 border border-dark-800 rounded-2xl p-8 shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mx-auto flex items-center justify-center mb-4">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h1 className="text-lg font-bold text-white mb-1">Access Restricted</h1>
        <p className="text-xs text-zinc-400 mb-6">
          Your authenticated account does not have active membership privileges for the <strong>Media & Marketing Panel</strong>.
        </p>

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
            className="block text-xs text-brand-500 hover:underline pt-2"
          >
            Return to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

