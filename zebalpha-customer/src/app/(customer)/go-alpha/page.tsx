import Link from "next/link";
import { Zap, ArrowLeft } from "lucide-react";

export default function GoAlphaQuickCommercePage() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-amber-500/30 bg-white/95 p-8 text-center shadow-[0_12px_36px_rgba(0,0,0,0.08)]">
        <div className="mx-auto mb-5 flex h-20 w-28 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 p-3 border border-orange-200/70">
          <img
            src="/go-alpha-icon.png"
            alt="GOα Quick Commerce"
            className="h-full w-full object-contain"
          />
        </div>

        <div className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-orange-600">
          <Zap className="h-3.5 w-3.5 fill-orange-500 text-orange-500" />
          Quick Commerce
        </div>

        <h1 className="mt-3 text-2xl font-black tracking-tight text-neutral-900">
          GOα Express Delivery
        </h1>
        <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
          3–4 hour ultra-fast fashion & essentials delivery is launching soon in your area.
        </p>

        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-neutral-900 px-5 py-3 text-sm font-bold text-white transition-all hover:bg-neutral-800 active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>
      </div>
    </div>
  );
}
