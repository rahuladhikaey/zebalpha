"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[SuperAdmin App Error]:", error);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("admin_active_tab");
      } catch (_) {}
    }
  }, [error]);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="max-w-md w-full bg-zinc-950 border border-zinc-800/80 rounded-3xl p-8 shadow-2xl flex flex-col items-center">
        <div className="h-14 w-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 text-2xl font-black">
          ⚠️
        </div>
        <h1 className="text-xl font-black tracking-tight text-white mb-2">
          Platform Interruption
        </h1>
        <p className="text-xs text-zinc-400 font-medium mb-6 leading-relaxed">
          The portal experienced a brief connection interruption. Click below to reload and continue.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full">
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                localStorage.removeItem("admin_active_tab");
                window.location.href = "/dashboard";
              } else {
                reset();
              }
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-white hover:bg-zinc-200 text-black font-black text-xs uppercase tracking-wider transition active:scale-95 cursor-pointer shadow-lg shadow-white/10"
          >
            Go to Dashboard
          </button>
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                window.location.href = "/";
              }
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs uppercase tracking-wider transition border border-zinc-800 cursor-pointer"
          >
            Admin Login
          </button>
        </div>
      </div>
    </div>
  );
}
