"use client";

import Link from "next/link";

export default function ZebQuickError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center bg-[#FFFDF9]">
      <h2 className="text-base font-black text-neutral-900">Something went wrong loading ZebQuick</h2>
      <p className="mt-1 text-xs text-neutral-500">Tap retry to reload this screen.</p>
      <div className="mt-4 flex gap-2.5">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-extrabold text-white cursor-pointer"
        >
          Retry
        </button>
        <Link
          href="/zeb-quick"
          className="rounded-xl border border-neutral-200 bg-white px-4 py-2 text-xs font-extrabold text-neutral-800"
        >
          ZebQuick Home
        </Link>
      </div>
    </div>
  );
}
