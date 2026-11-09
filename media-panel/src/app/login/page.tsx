"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Lock, Mail, ArrowRight, AlertCircle } from "lucide-react";
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
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col justify-center items-center px-4">
      <div className="w-full max-w-sm">
        {/* Brand Banner */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-500 mx-auto flex items-center justify-center text-white shadow-xl shadow-brand-500/20 mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">ZEBALPHA</h1>
          <p className="text-xs text-brand-500 font-semibold tracking-wider uppercase mt-0.5">Media & Marketing Panel</p>
          <p className="text-xs text-zinc-400 mt-2">Sign in with your authorized marketing employee credentials</p>
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
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Employee Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-zinc-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@zebalpha.shop"
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
              className="w-full py-2.5 px-4 bg-brand-600 hover:bg-brand-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-brand-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                "Authenticating..."
              ) : (
                <>
                  <span>Sign In to Media Panel</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-dark-800 text-center">
            <p className="text-[11px] text-zinc-400">
              Access is restricted to authorized marketing personnel. Employee accounts are provisioned via HR invitations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

