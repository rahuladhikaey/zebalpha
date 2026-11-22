"use client";

import Link from "next/link";
import { ShieldAlert, LogOut, Database, Clock, XCircle, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

interface CreatorProfileStatus {
  full_name: string;
  approval_status: "pending" | "approved" | "rejected" | "suspended";
  rejection_reason?: string | null;
}

function UnauthorizedContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const [profile, setProfile] = useState<CreatorProfileStatus | null>(null);

  useEffect(() => {
    async function checkApplication() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.user) return;
        const { data } = await supabase
          .from("media_creator_profiles")
          .select("full_name, approval_status, rejection_reason")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (data) setProfile(data as CreatorProfileStatus);
      } catch {
        // Non-fatal
      }
    }
    checkApplication();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const isQueryError = reason === "query_error";
  const isPending = profile?.approval_status === "pending";
  const isRejected = profile?.approval_status === "rejected";
  const isSuspended = profile?.approval_status === "suspended";

  return (
    <div className="w-full max-w-md bg-dark-900 border border-dark-800 rounded-2xl p-8 shadow-2xl">
      <div
        className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4 border ${
          isPending
            ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
            : isRejected || isSuspended
            ? "bg-red-500/10 border-red-500/20 text-red-400"
            : "bg-amber-500/10 border-amber-500/20 text-amber-400"
        }`}
      >
        {isQueryError ? (
          <Database className="w-7 h-7" />
        ) : isPending ? (
          <Clock className="w-7 h-7" />
        ) : isRejected || isSuspended ? (
          <XCircle className="w-7 h-7" />
        ) : (
          <ShieldAlert className="w-7 h-7" />
        )}
      </div>

      <h1 className="text-lg font-bold text-white mb-1">
        {isQueryError
          ? "Service Verification Error"
          : isPending
          ? "Application Under Review"
          : isRejected
          ? "Application Not Approved"
          : isSuspended
          ? "Creator Access Suspended"
          : "Access Restricted"}
      </h1>

      <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
        {isQueryError
          ? "A secure communication error occurred while verifying your organizational membership. Please try signing in again."
          : isPending
          ? `Hi ${profile?.full_name || "Creator"}, your Alpha Media Network application has been received! Once our Media Leader or SuperAdmin reviews your profile and approves access, you can sign straight into your Creator Workspace.`
          : isRejected
          ? profile?.rejection_reason ||
            "Your creator application was not approved at this time. Contact Alpha Media Team for details."
          : isSuspended
          ? "Your Alpha Media access has been temporarily paused by the Media Leader or SuperAdmin. All historical reels and performance records remain safely saved."
          : "Your authenticated account does not possess active membership privileges for the Alpha Media & Marketing Panel."}
      </p>

      <div className="space-y-3">
        <button
          onClick={handleSignOut}
          className="w-full py-2.5 px-4 bg-dark-800 hover:bg-dark-700 text-zinc-200 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out / Switch Account</span>
        </button>

        {!profile && (
          <Link
            href="/apply"
            className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Apply to Join Alpha Creator Network</span>
          </Link>
        )}

        <Link href="/login" className="block text-xs text-brand-500 hover:underline pt-2">
          Return to Login
        </Link>
      </div>
    </div>
  );
}

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-dark-950 flex flex-col justify-center items-center px-4 text-center">
      <Suspense
        fallback={
          <div className="w-full max-w-md bg-dark-900 border border-dark-800 rounded-2xl p-8 shadow-2xl text-zinc-400 text-xs">
            Loading access details...
          </div>
        }
      >
        <UnauthorizedContent />
      </Suspense>
    </div>
  );
}
