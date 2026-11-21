"use client";

import { useEffect } from "react";
import { X, ShieldCheck, ExternalLink, PlayCircle, CheckCircle2 } from "lucide-react";
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
 * Zero-Egress In-App 9:16 Vertical Popup Video Player.
 * Lazy-mounts the official Instagram / YouTube Shorts / Facebook iframe ONLY when opened,
 * streaming directly from Meta/Google CDNs with 0 MB server egress on ZebAlpha.
 */
export function RealVideoProofModal({
  isOpen,
  onClose,
  videoInfo,
  productName,
  sellerName,
  isNativeApp = false,
}: RealVideoProofModalProps) {
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
                <span>Real Product &amp; Packaging Proof</span>
              </p>
              <p
                className={`text-xs font-extrabold truncate ${
                  isNativeApp ? "text-[#14120F]" : "text-white"
                }`}
              >
                {sellerName ? `${sellerName} • ` : ""}
                {videoInfo.platformLabel}
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

        {/* 9:16 Vertical Embed Stage (0 MB Server Egress) */}
        <div className="relative w-full aspect-[9/15] max-h-[66vh] bg-black overflow-hidden">
          <iframe
            src={videoInfo.embedUrl}
            title={`Real product video proof for ${productName}`}
            className="h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>

        {/* Sticky Bottom Bar — Keeps Buyer on ZebAlpha for Checkout */}
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
            <span className={isNativeApp ? "text-[#7A6847]" : "text-zinc-500"}>
              Unedited quality &amp; intact packaging check
            </span>
            <a
              href={videoInfo.normalizedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1 font-bold underline underline-offset-2 ${
                isNativeApp ? "text-[#9A6503] hover:text-[#F03A46]" : "text-zinc-400 hover:text-white"
              }`}
            >
              <span>Not loading? Open Video</span>
              <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
