"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
 * Portal-Mounted, Strictly Sandboxed, Privacy-First In-App Video Player.
 * - Mounted directly into document.body via createPortal at z-[10060] so sticky PDP columns,
 *   size pills, VTO banners, PIN inputs, or floating widgets can NEVER overlap it on desktop/laptop.
 * - Uses sandbox="allow-scripts allow-same-origin allow-presentation" (NO allow-popups,
 *   NO allow-top-navigation) so buyers stay 100% inside ZebAlpha.
 * - Auto-sizes the video frame proportionally to the exact video viewport and cleanly crops/masks
 *   creator handles, profile avatars, likes, comments, hover cards, and "View more on ..." footers
 *   to protect creator privacy and prevent off-platform order leakage.
 * - Zero server/Supabase video egress (streams directly from CDN only when opened).
 */
export function RealVideoProofModal({
  isOpen,
  onClose,
  videoInfo,
  productName,
  isNativeApp = false,
}: RealVideoProofModalProps) {
  const [reloadNonce, setReloadNonce] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!mounted || !isOpen || !videoInfo?.embedUrl) return null;

  const isInstagram = videoInfo.platform === "instagram";
  const isInstagramSquarePost = isInstagram && videoInfo.normalizedUrl.includes("/p/");
  const isYoutube = videoInfo.platform === "youtube";
  const isYoutubeShort = isYoutube && videoInfo.normalizedUrl.includes("/shorts/");
  const isFacebook = videoInfo.platform === "facebook";

  // Auto-size the modal card + video frame tightly to the video's native aspect ratio:
  // - Keeps Instagram >= 332px wide (above Instagram's internal 326px min-width) so it never shifts or clips horizontally.
  // - Eliminates excess outer black side bars while fitting comfortably inside short laptop screens (600px+).
  // - Clips cleanly inside Instagram's 1.242 H/W media box (at 1.21 H/W) so 0px of Heart/Comment/
  //   "View more on Instagram"/creator hover profile cards ever appear or can be hovered, while preserving Mute/Unmute.
  const cardWidthStyle: React.CSSProperties = isInstagram
    ? isInstagramSquarePost
      ? { width: "min(94vw, 376px, max(332px, calc(65vh * 0.98)))" }
      : { width: "min(94vw, 376px, max(332px, calc(65vh * 0.82)))" }
    : isYoutube
      ? isYoutubeShort
        ? { width: "min(94vw, 356px)" }
        : { width: "min(94vw, 520px)" }
      : { width: "min(94vw, 360px, max(324px, calc(65vh * 0.82)))" };

  const stageStyle: React.CSSProperties = isInstagram
    ? isInstagramSquarePost
      ? { width: "100%", aspectRatio: "100 / 98" }
      : { width: "100%", aspectRatio: "100 / 121" }
    : isYoutube
      ? isYoutubeShort
        ? { width: "min(100%, max(260px, calc(64vh * 0.6)))", aspectRatio: "9 / 15" }
        : { width: "100%", aspectRatio: "16 / 9" }
      : { width: "100%", aspectRatio: "100 / 118" };

  const modalNode = (
    <div
      className="fixed inset-0 z-[10060] flex items-center justify-center overflow-y-auto bg-black/85 backdrop-blur-md p-3 sm:p-5 animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Real Product Video for ${productName}`}
    >
      <div
        style={cardWidthStyle}
        className={`relative my-auto flex flex-col rounded-[1.75rem] overflow-hidden shadow-2xl border ${isNativeApp
            ? "bg-[#FFFDF8] border-[#DFBE6F] text-[#14120F]"
            : "bg-zinc-950 border-zinc-800 text-white"
          }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Trust Header — Creator Account & Platform Names Intentionally Hidden */}
        <div
          className={`flex items-center justify-between gap-3 px-4 py-2.5 border-b shrink-0 ${isNativeApp ? "border-[#EFE1BC] bg-[#FFF8E4]" : "border-zinc-800 bg-zinc-900/95"
            }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-500">
              <ShieldCheck size={17} />
            </span>
            <div className="min-w-0">
              <p
                className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${isNativeApp ? "text-emerald-700" : "text-emerald-400"
                  }`}
              >
                <CheckCircle2 size={11} />
                <span>ZebAlpha Verified Video</span>
              </p>
              <p
                className={`text-[11px] font-bold truncate ${isNativeApp ? "text-[#5C4E35]" : "text-zinc-300"
                  }`}
              >
                Real Product &amp; Intact Packaging Proof
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Video Proof"
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition cursor-pointer ${isNativeApp
                ? "border-[#DFBE6F] bg-white text-[#14120F] hover:bg-[#F03A46] hover:text-white"
                : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-white hover:text-black"
              }`}
          >
            <X size={16} />
          </button>
        </div>

        {/* Pure Auto-Sized Video Frame (Black Cinema Surround, ZERO Creator Handle / Likes / Comments) */}
        <div className="w-full bg-black flex items-center justify-center overflow-hidden">
          <div
            style={stageStyle}
            className="relative bg-black overflow-hidden select-none shrink-0"
          >
            <iframe
              key={`${videoInfo.embedUrl}-${reloadNonce}`}
              src={videoInfo.embedUrl}
              title={`Verified real product video for ${productName}`}
              sandbox="allow-scripts allow-same-origin allow-presentation"
              className={
                isInstagram
                  ? "absolute left-0 right-0 -top-[58px] w-full h-[calc(100%+280px)] border-0 bg-black"
                  : isFacebook
                    ? "absolute left-0 right-0 -top-[54px] w-full h-[calc(100%+140px)] border-0 bg-black"
                    : "absolute inset-0 w-full h-full border-0 bg-black"
              }
              allow="autoplay; encrypted-media; picture-in-picture"
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />

            {/* Solid Top Privacy Mask for YouTube (Hides Creator Channel Avatar, Name, Title & Share) */}
            {isYoutube && (
              <div
                aria-hidden="true"
                className="absolute top-0 inset-x-0 h-14 z-20 bg-black pointer-events-auto flex items-center px-3"
              >
                <span className="inline-flex items-center gap-1 rounded-full bg-zinc-900 border border-white/15 px-2.5 py-0.5 text-[9.5px] font-black uppercase tracking-wider text-emerald-300">
                  <Lock size={9} />
                  ZebAlpha Verified Proof
                </span>
              </div>
            )}

            {/* Solid YouTube Logo / External Watermark Shield (Bottom-Right Corner Only — Play/Mute Preserved) */}
            {isYoutube && (
              <div
                aria-hidden="true"
                className="absolute bottom-0 right-0 h-12 w-28 z-20 bg-black/95 pointer-events-auto"
              />
            )}

            {/* Instagram & Facebook Edge Privacy Shields (Blocks Any Residual Edge Hover While Keeping Mute/Unmute Accessible) */}
            {(isInstagram || isFacebook) && (
              <>
                <div
                  aria-hidden="true"
                  className="absolute top-0 inset-x-0 h-2 z-20 bg-black pointer-events-auto"
                />
                <div
                  aria-hidden="true"
                  className="absolute bottom-0 inset-x-0 h-1.5 z-20 bg-black pointer-events-auto"
                />
              </>
            )}
          </div>
        </div>

        {/* Sticky Bottom Bar — Keeps Buyer 100% Inside ZebAlpha */}
        <div
          className={`px-4 py-3 border-t space-y-2 shrink-0 ${isNativeApp ? "border-[#EFE1BC] bg-[#FFFDF8]" : "border-zinc-800 bg-zinc-950"
            }`}
        >
          <p
            className={`text-[11px] font-semibold line-clamp-1 ${isNativeApp ? "text-[#5C4E35]" : "text-zinc-400"
              }`}
          >
            {productName}
          </p>

          <button
            type="button"
            onClick={onClose}
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer ${isNativeApp
                ? "bg-gradient-to-r from-[#F03A46] to-[#FF5757] text-white shadow-md"
                : "bg-white text-black hover:bg-zinc-200"
              }`}
          >
            <PlayCircle size={15} />
            <span>Looks Good — Continue to Buy</span>
          </button>

          <div className="flex items-center justify-between text-[10px] pt-0.5">
            <span
              className={`inline-flex items-center gap-1 font-semibold ${isNativeApp ? "text-[#7A6847]" : "text-zinc-500"
                }`}
            >
              <Lock size={10} />
              Playing securely inside ZebAlpha
            </span>
            <button
              type="button"
              onClick={() => setReloadNonce((n) => n + 1)}
              className={`inline-flex items-center gap-1 font-bold underline underline-offset-2 cursor-pointer ${isNativeApp ? "text-[#9A6503] hover:text-[#F03A46]" : "text-zinc-400 hover:text-white"
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

  return createPortal(modalNode, document.body);
}
