"use client";

import React from "react";
import { X, ShieldCheck, ExternalLink } from "lucide-react";
import type { ProductVideoValidationResult } from "@/shared/utils/socialVideoUtils";

interface VideoProofPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoInfo: ProductVideoValidationResult | null;
  title?: string;
}

export function VideoProofPreviewModal({
  isOpen,
  onClose,
  videoInfo,
  title = "Real Product & Packaging Video Preview",
}: VideoProofPreviewModalProps) {
  if (!isOpen || !videoInfo?.embedUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/75 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[390px] rounded-3xl bg-[#FFFDF8] border border-[#DFBE6F] overflow-hidden shadow-2xl text-[#14120F]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[#EAD296] bg-[#FFF8DB]">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="w-4 h-4 text-[#047857] shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#047857]">
                {videoInfo.platformLabel} • Zero Egress Embed
              </p>
              <p className="text-xs font-extrabold text-[#14120F] truncate">{title}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white border border-[#EAD296] text-[#5C4E35] hover:text-[#F03A46] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div data-keep-dark="true" className="relative w-full aspect-[9/15] max-h-[65vh] bg-black">
          <iframe
            src={videoInfo.embedUrl}
            title={title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>

        <div className="px-4 py-3 border-t border-[#EAD296] bg-[#FFF9EB] flex items-center justify-between gap-2 text-xs">
          <a
            href={videoInfo.normalizedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[#047857] hover:text-[#065F46] font-extrabold underline"
          >
            <span>Open Original Link</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            type="button"
            onClick={onClose}
            data-photo-overlay="true"
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#F03A46] to-[#FF5757] text-white font-black text-xs cursor-pointer hover:brightness-105 shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
