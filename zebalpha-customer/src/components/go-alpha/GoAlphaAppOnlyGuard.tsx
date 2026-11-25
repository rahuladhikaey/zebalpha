"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Smartphone, ArrowLeft } from "lucide-react";
import { useIsNativeApp } from "@/lib/platform";
import { GoAlphaHeader } from "@/components/go-alpha/GoAlphaHeader";
import { GoAlphaBottomNav } from "@/components/go-alpha/GoAlphaBottomNav";

export function GoAlphaAppOnlyGuard({ children }: { children: React.ReactNode }) {
  const isNativeApp = useIsNativeApp();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="min-h-screen bg-[#FFFDF9]" />;
  }

  if (!isNativeApp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 px-4 py-12 text-neutral-900">
        <div className="w-full max-w-md rounded-3xl border border-orange-200 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-50 text-[#EE2B00]">
            <Smartphone className="h-8 w-8" />
          </div>
          <h1 className="text-xl font-black tracking-tight text-neutral-900">
            ZebQuick is Android App Exclusive
          </h1>
          <p className="mt-2 text-xs text-neutral-600 leading-relaxed">
            ZebQuick 5–6 Hour Express Delivery is only available inside the ZebAlpha Android App, not on the website.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-5 py-3 text-xs font-extrabold text-white transition hover:bg-neutral-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to ZebAlpha Website
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-neutral-900 flex flex-col">
      <GoAlphaHeader />
      <main className="flex-1 pb-24">{children}</main>
      <GoAlphaBottomNav />
    </div>
  );
}
