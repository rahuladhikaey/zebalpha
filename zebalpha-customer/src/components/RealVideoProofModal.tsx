"use client";

import { useEffect, useState } from "react";
import { X, ShieldCheck, PlayCircle, CheckCircle2, RotateCw, Lock } from "lucide-react";
import type { ProductVideoValidationResult } from "@/lib/socialVideoUtils";

interface RealVideoProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoInfo: ProductVideoValidationResult | null;
  productName: string;
  sellerName?: string;
  isNativeApp?: boolean;
}

/**
 * Strictly Sandboxed, Zero-Egress In-App 9:16 Popup Video Player.
 * - Uses sandbox="allow-scripts allow-same-origin allow-presentation" (NO allow-popups,
 *   NO allow-top-navigation) so tapping logos, handles, or CTAs inside Instagram / YouTube /
 *   Facebook embeds CANNOT redirect or open external social media apps or new tabs.
 * - Crops/shields external header & footer chrome bars so buyers watch purely inside ZebAlpha.
 * - Streams directly from Meta/Google CDNs (0 MB Supabase/Vercel video egress).
 */
export function RealVideoProofModal({
  isOpen,
  onClose,
  videoInfo,
  productName,
  sellerName,
  isNativeApp = false,
}: RealVideoProofModalProps) {
  const [reloadNonce, setReloadNonce] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !videoInfo?.embedUrl) return null;

  const isInstagram = videoInfo.platform === "instagram";
  const isYoutube = videoInfo.platform === "youtube";
  const isFacebook = videoInfo.platform === "facebook";

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Real Product & Packaging Video for ${productName}`}
    >
      <div
        className={`relative w-full max-w-[400px] max-h-[92vh] flex flex-col rounded-[1.75rem] overflow-hidden shadow-2xl border ${
          isNativeApp
            ? "bg-[#FFFDF8] border-[#DFBE6F] text-[#14120F]"
            : "bg-zinc-950 border-zinc-800 text-white"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Trust Header */}
        <div
          className={`flex items-center justify-between gap-3 px-4 py-3 border-b ${
            isNativeApp ? "border-[#EFE1BC] bg-[#FFF8E4]" : "border-zinc-800 bg-zinc-900/90"
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-500">
              <ShieldCheck size={17} />
            </span>
            <div className="min-w-0">
              <p
                className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                  isNativeApp ? "text-emerald-700" : "text-emerald-400"
                }`}
              >
                <CheckCircle2 size={11} />
                <span>ZebAlpha Real Video Proof</span>
              </p>
              <p
                className={`text-xs font-extrabold truncate ${
                  isNativeApp ? "text-[#14120F]" : "text-white"
                }`}
              >
                {sellerName ? `${sellerName} • ` : ""}
                In-App Verified Player
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Video Proof"
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition cursor-pointer ${
              isNativeApp
                ? "border-[#DFBE6F] bg-white text-[#14120F] hover:bg-[#F03A46] hover:text-white"
                : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-white hover:text-black"
            }`}
          >
            <X size={16} />
          </button>
        </div>

        {/* Sandboxed 9:16 Vertical Stage — Strictly Stays Inside ZebAlpha (Zero External App Redirects!) */}
        <div className="relative w-full aspect-[9/15] max-h-[66vh] bg-black overflow-hidden select-none">
          <iframe
            key={`${videoInfo.embedUrl}-${reloadNonce}`}
            src={videoInfo.embedUrl}
            title={`Real product video proof for ${productName}`}
            sandbox="allow-scripts allow-same-origin allow-presentation"
            className={
              isInstagram
                ? "absolute left-0 right-0 -top-[56px] w-full h-[calc(100%+162px)] border-0"
                : "h-full w-full border-0"
            }
            allow="autoplay; encrypted-media; picture-in-picture"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />

          {/* Top Click-Shield Over External Channel / Profile Header Chrome (Keeps Center Video Playable) */}
          {(isYoutube || isFacebook) && (
            <div
              aria-hidden="true"
              className="absolute top-0 inset-x-0 h-14 z-20 bg-gradient-to-b from-black/85 via-black/45 to-transparent pointer-events-auto flex items-start justify-between px-3 pt-2.5"
            >
              <span className="inline-flex items-center gap-1 rounded-full bg-black/75 border border-white/15 px-2.5 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-emerald-300 backdrop-blur-sm">
                <Lock size={9} />
                ZebAlpha Verified Proof
              </span>
            </div>
          )}

          {/* For Instagram: Subtle ZebAlpha Pill + Bottom Click-Shield Over Any Residual Footer Bar */}
          {isInstagram && (
            <>
              <div
                aria-hidden="true"
                className="absolute top-2.5 left-3 z-20 pointer-events-none"
              >
                <span className="inline-flex items-center gap-1 rounded-full bg-black/70 border border-white/15 px-2.5 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-emerald-300 backdrop-blur-sm">
                  <Lock size={9} />
                  ZebAlpha Verified Proof
                </span>
              </div>
              <div
                aria-hidden="true"
                className="absolute bottom-0 inset-x-0 h-8 z-20 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-auto"
              />
            </>
          )}

          {/* YouTube Bottom-Right YouTube Logo Click-Shield (Keeps Play/Mute/Seek Left & Center Usable) */}
          {isYoutube && (
            <div
              aria-hidden="true"
              className="absolute bottom-0 right-0 h-12 w-28 z-20 pointer-events-auto"
            />
          )}
        </div>

        {/* Sticky Bottom Bar — 100% Stays Inside ZebAlpha (ZERO External Social Redirect Links!) */}
        <div
          className={`px-4 py-3 border-t space-y-2 ${
            isNativeApp ? "border-[#EFE1BC] bg-[#FFFDF8]" : "border-zinc-800 bg-zinc-950"
          }`}
        >
          <p
            className={`text-[11px] font-semibold line-clamp-1 ${
              isNativeApp ? "text-[#5C4E35]" : "text-zinc-400"
            }`}
          >
            {productName}
          </p>

          <button
            type="button"
            onClick={onClose}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer ${
              isNativeApp
                ? "bg-gradient-to-r from-[#F03A46] to-[#FF5757] text-white shadow-md"
                : "bg-white text-black hover:bg-zinc-200"
            }`}
          >
            <PlayCircle size={15} />
            <span>Looks Good — Continue to Buy</span>
          </button>

          <div className="flex items-center justify-between text-[10px] pt-0.5">
            <span
              className={`inline-flex items-center gap-1 font-semibold ${
                isNativeApp ? "text-[#7A6847]" : "text-zinc-500"
              }`}
            >
              <Lock size={10} />
              Playing securely inside ZebAlpha
            </span>
            <button
              type="button"
              onClick={() => setReloadNonce((n) => n + 1)}
              className={`inline-flex items-center gap-1 font-bold underline underline-offset-2 cursor-pointer ${
                isNativeApp ? "text-[#9A6503] hover:text-[#F03A46]" : "text-zinc-400 hover:text-white"
              }`}
            >
              <RotateCw size={10} />
              <span>Reload Player</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
