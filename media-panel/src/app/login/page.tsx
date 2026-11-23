"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, ArrowRight, AlertCircle, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      if (data.session) {
        router.push("/");
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-sm">
        {/* Brand Banner */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-white mx-auto flex items-center justify-center overflow-hidden border border-dark-700 shadow-xl shadow-brand-500/20 mb-3">
            <img
              src="/official-logo.png"
              alt="ZebAlpha Official Logo"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">ZEBALPHA</h1>
          <p className="text-xs text-brand-500 font-semibold tracking-wider uppercase mt-0.5">
            Alpha Media &amp; Creator Panel
          </p>
          <p className="text-xs text-zinc-400 mt-2">
            Sign in as Media Leader, Alpha Media Team Member, or Verified Creator
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-dark-900 border border-dark-800 rounded-xl p-6 shadow-2xl">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="creator@zebalpha.shop"
                  className="w-full pl-9 pr-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-dark-950 border border-dark-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-brand-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                "Authenticating..."
              ) : (
                <>
                  <span>Sign In to Alpha Media Panel</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-dark-800 text-center space-y-3">
            <Link
              href="/apply"
              className="w-full py-2.5 px-4 bg-dark-800 hover:bg-dark-700 text-zinc-200 rounded-lg text-xs font-semibold border border-dark-700 transition-colors flex items-center justify-center gap-2"
            >
              <UserPlus className="w-4 h-4 text-brand-400" />
              <span>New Creator / Influencer? Apply to Join</span>
            </Link>
            <p className="text-[11px] text-zinc-400">
              In-house Alpha Media staff are provisioned directly by SuperAdmin. External creators require Media Leader approval.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
