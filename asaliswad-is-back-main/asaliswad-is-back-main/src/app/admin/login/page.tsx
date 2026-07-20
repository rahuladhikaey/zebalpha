"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLoginPage() {
  const router = useRouter();
  const [accessKey1, setAccessKey1] = useState("");
  const [accessKey2, setAccessKey2] = useState("");
  const [authError, setAuthError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAccessSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError("");
    setLoading(true);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key1: accessKey1.trim(), key2: accessKey2 }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Use window.location.href instead of router.push to bypass Next.js client-side cache
        // which might have cached the previous redirect from /admin to /admin/login
        window.location.href = "/admin";
      } else {
        setAuthError(data.message || "Incorrect admin keys.");
      }
    } catch (error) {
      setAuthError("Server error. Please try again.");
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-[#cefad0] flex items-center justify-center p-4 text-slate-900 border-t-8 border-emerald-600">
      <section className="w-full max-w-lg">
        <div className="rounded-[3rem] bg-white p-10 md:p-14 premium-shadow border border-slate-100/50 flex flex-col items-center">
          <div className="mb-10 transition-transform hover:scale-110 duration-500">
            <a href="/">
              <img
                src="/official-logo.png"
                alt="Asali Swad Admin"
                className="h-24 w-24 rounded-[2rem] object-cover shadow-2xl border-4 border-white"
              />
            </a>
          </div>

          <div className="text-center mb-8 md:mb-10">
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.4em] text-emerald-600">
              Secure Entry
            </span>
            <h1 className="mt-2 text-2xl md:text-3xl font-black tracking-tight text-slate-900">
              Admin Portal
            </h1>
            <p className="mt-2 md:mt-3 text-[11px] md:text-sm font-bold text-slate-400">
              Exclusive access for spice masters.
            </p>
          </div>

          <form className="w-full space-y-6" onSubmit={handleAccessSubmit}>
            <div className="space-y-4">
              <div className="group relative">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-slate-300 group-focus-within:text-emerald-500 transition-colors">
                  Key 1
                </span>
                <input
                  type="text"
                  required
                  value={accessKey1}
                  onChange={(event) => setAccessKey1(event.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 pl-20 pr-6 py-4 text-sm font-bold outline-none transition-all placeholder:text-slate-100 focus:border-emerald-500/20 focus:bg-white focus:ring-4 focus:ring-emerald-500/5"
                />
              </div>
              <div className="group relative">
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-slate-300 group-focus-within:text-emerald-500 transition-colors">
                  Key 2
                </span>
                <input
                  type="password"
                  required
                  value={accessKey2}
                  onChange={(event) => setAccessKey2(event.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-2xl border-2 border-slate-50 bg-slate-50 pl-20 pr-6 py-4 text-sm font-bold outline-none transition-all placeholder:text-slate-100 focus:border-emerald-500/20 focus:bg-white focus:ring-4 focus:ring-emerald-500/5"
                />
              </div>
            </div>

            {authError ? (
              <div className="flex items-center gap-3 rounded-2xl bg-rose-50 p-4 border border-rose-100/50">
                <p className="text-xs font-bold text-rose-700 leading-snug">
                  {authError}
                </p>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="flex h-14 w-full items-center justify-center rounded-2xl bg-emerald-600 text-sm font-black uppercase tracking-widest text-white shadow-xl shadow-emerald-600/30 transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
            >
              {loading ? "Authenticating..." : "Authenticate Access ✨"}
            </button>


          </form>

          <div className="mt-8 text-center">
            <a
              href="/"
              className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 hover:text-emerald-600 transition-colors"
            >
              ← Return to Public Store
            </a>
          </div>

        </div>
      </section>
    </main>
  );
}
