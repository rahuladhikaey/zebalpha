"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  X,
  Check,
  Copy,
  MessageCircle,
  Send,
  Mail,
  MessageSquare,
  Share2,
  ExternalLink,
} from "lucide-react";
import {
  SharePayload,
  subscribeToShareSheet,
  buildFormattedShareMessage,
  copyTextSilently,
} from "@/lib/shareService";
import { useOfficialTheme } from "@/lib/platform";
import { IMAGE_VARIANTS } from "@/services/imageOptimizationService";

export function ShareBottomSheet() {
  const isNativeApp = useOfficialTheme();
  const [payload, setPayload] = useState<SharePayload | null>(null);
  const [copiedMode, setCopiedMode] = useState<"none" | "link" | "message">("none");

  const closeSheet = useCallback(() => {
    setPayload(null);
    setCopiedMode("none");
  }, []);

  useEffect(() => {
    return subscribeToShareSheet((nextPayload) => {
      setCopiedMode("none");
      setPayload(nextPayload);
    });
  }, []);

  useEffect(() => {
    if (!payload) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSheet();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [payload, closeSheet]);

  if (!payload) return null;

  const fullMessage = buildFormattedShareMessage(payload);
  const encodedMsg = encodeURIComponent(fullMessage);
  const encodedUrl = encodeURIComponent(payload.url);
  const encodedTitle = encodeURIComponent(payload.title);
  const encodedText = encodeURIComponent(payload.text);

  const launchExternal = (targetUrl: string, fallbackUrl?: string) => {
    try {
      if (targetUrl.startsWith("whatsapp://") || targetUrl.startsWith("sms:") || targetUrl.startsWith("mailto:")) {
        window.location.href = targetUrl;
        if (fallbackUrl) {
          window.setTimeout(() => {
            if (!document.hidden) {
              window.open(fallbackUrl, "_blank", "noopener,noreferrer");
            }
          }, 900);
        }
        return;
      }
      window.open(targetUrl, "_blank", "noopener,noreferrer");
    } catch {
      if (fallbackUrl) {
        window.open(fallbackUrl, "_blank", "noopener,noreferrer");
      }
    }
  };

  const handleCopy = async (mode: "link" | "message") => {
    const ok = await copyTextSilently(mode === "link" ? payload.url : fullMessage);
    if (ok) {
      setCopiedMode(mode);
      window.setTimeout(() => setCopiedMode("none"), 2200);
    }
  };

  const previewSrc = payload.imageUrl
    ? payload.imageUrl.startsWith("http")
      ? IMAGE_VARIANTS.productDetailThumb(payload.imageUrl)
      : payload.imageUrl
    : "/official-logo.png";

  const shareChannels = [
    {
      id: "whatsapp",
      label: "WhatsApp",
      icon: MessageCircle,
      iconBg: "bg-[#25D366] text-white shadow-[#25D366]/30",
      onClick: () =>
        isNativeApp
          ? launchExternal(
              `whatsapp://send?text=${encodedMsg}`,
              `https://api.whatsapp.com/send?text=${encodedMsg}`
            )
          : launchExternal(`https://api.whatsapp.com/send?text=${encodedMsg}`),
    },
    {
      id: "telegram",
      label: "Telegram",
      icon: Send,
      iconBg: "bg-[#229ED9] text-white shadow-[#229ED9]/30",
      onClick: () =>
        launchExternal(
          `https://t.me/share/url?url=${encodedUrl}&text=${encodedText}`
        ),
    },
    {
      id: "sms",
      label: "SMS",
      icon: MessageSquare,
      iconBg: "bg-indigo-500 text-white shadow-indigo-500/30",
      onClick: () => launchExternal(`sms:?body=${encodedMsg}`),
    },
    {
      id: "facebook",
      label: "Facebook",
      icon: ExternalLink,
      iconBg: "bg-[#1877F2] text-white shadow-[#1877F2]/30",
      onClick: () =>
        launchExternal(
          `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`
        ),
    },
    {
      id: "x",
      label: "X / Twitter",
      icon: Share2,
      iconBg: "bg-neutral-900 text-white border border-neutral-700 shadow-black/30",
      onClick: () =>
        launchExternal(
          `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`
        ),
    },
    {
      id: "email",
      label: "Email",
      icon: Mail,
      iconBg: "bg-amber-500 text-white shadow-amber-500/30",
      onClick: () =>
        launchExternal(`mailto:?subject=${encodedTitle}&body=${encodedMsg}`),
    },
  ];

  return (
    <div
      className="fixed inset-0 z-[10050] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={closeSheet}
      role="dialog"
      aria-modal="true"
      aria-label="Share with friends"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full sm:max-w-md rounded-t-[28px] sm:rounded-[28px] border p-5 pb-7 sm:p-6 shadow-2xl animate-in slide-in-from-bottom-6 duration-300 ${
          isNativeApp
            ? "bg-[#FFFDF8] border-[#E4C988] text-[#14120F]"
            : "bg-zinc-950 border-zinc-800 text-white"
        }`}
      >
        {/* Drag Handle (Mobile) */}
        <div className="mx-auto mb-4 h-1.5 w-11 rounded-full bg-current opacity-15 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                isNativeApp
                  ? "bg-amber-100 text-amber-800 border border-amber-300/70"
                  : "bg-zinc-900 text-amber-400 border border-zinc-800"
              }`}
            >
              <Share2 className="h-4 w-4" strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight">
                Share with Friends
              </h3>
              <p
                className={`text-[11px] font-medium ${
                  isNativeApp ? "text-[#6D5B3E]" : "text-zinc-400"
                }`}
              >
                Choose an app or copy invite link
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeSheet}
            aria-label="Close share sheet"
            className={`flex h-8 w-8 items-center justify-center rounded-full transition active:scale-90 cursor-pointer ${
              isNativeApp
                ? "bg-[#F5EBD0] text-[#3D3528] hover:bg-[#ECDCAE]"
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white"
            }`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Rich Preview Card */}
        <div
          className={`mb-5 flex items-center gap-3.5 rounded-2xl border p-3 ${
            isNativeApp
              ? "bg-[#FAF3E1]/70 border-[#E8D29B]"
              : "bg-zinc-900/80 border-zinc-800"
          }`}
        >
          <div
            className={`h-12 w-12 shrink-0 overflow-hidden rounded-xl border ${
              isNativeApp
                ? "bg-white border-[#DFBE6F]"
                : "bg-white border-zinc-700"
            }`}
          >
            <img
              src={previewSrc}
              alt={payload.title}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            {payload.badge && (
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider mb-1 ${
                  isNativeApp
                    ? "bg-amber-200/80 text-amber-950"
                    : "bg-amber-500/20 text-amber-300"
                }`}
              >
                {payload.badge}
              </span>
            )}
            <p className="truncate text-xs font-extrabold">{payload.title}</p>
            <p
              className={`truncate text-[11px] font-medium ${
                isNativeApp ? "text-[#6D5B3E]" : "text-zinc-400"
              }`}
            >
              {payload.subtitle || payload.url}
            </p>
          </div>
        </div>

        {/* App Targets Grid */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {shareChannels.map((ch) => {
            const Icon = ch.icon;
            return (
              <button
                key={ch.id}
                type="button"
                onClick={ch.onClick}
                className={`group flex flex-col items-center gap-2 rounded-2xl border py-3 px-2 transition-all active:scale-95 cursor-pointer ${
                  isNativeApp
                    ? "bg-white border-[#ECE0BE] hover:border-[#C28D12]"
                    : "bg-zinc-900/70 border-zinc-800 hover:border-zinc-700"
                }`}
              >
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-full shadow-md transition-transform group-hover:scale-105 ${ch.iconBg}`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-[11px] font-bold">{ch.label}</span>
              </button>
            );
          })}
        </div>

        {/* Copy Link Bar + Copy Full Invite Message */}
        <div className="space-y-2.5">
          <div
            className={`flex items-center gap-2 rounded-2xl border p-1.5 pl-3.5 ${
              isNativeApp
                ? "bg-white border-[#E4C988]"
                : "bg-zinc-900 border-zinc-800"
            }`}
          >
            <span
              className={`flex-1 truncate text-xs font-semibold ${
                isNativeApp ? "text-[#4A3E2A]" : "text-zinc-300"
              }`}
            >
              {payload.url}
            </span>
            <button
              type="button"
              onClick={() => handleCopy("link")}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-[11px] font-black uppercase tracking-wider transition active:scale-95 cursor-pointer ${
                copiedMode === "link"
                  ? "bg-emerald-600 text-white"
                  : isNativeApp
                  ? "bg-gradient-to-r from-[#FCE89C] via-[#F2C34B] to-[#DDA216] text-[#111111]"
                  : "bg-white text-black hover:bg-zinc-200"
              }`}
            >
              {copiedMode === "link" ? (
                <>
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copy Link
                </>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={() => handleCopy("message")}
            className={`w-full rounded-xl border py-2.5 text-[11px] font-bold transition active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 ${
              copiedMode === "message"
                ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-500"
                : isNativeApp
                ? "border-[#E4C988]/80 bg-[#FAF3E1]/60 text-[#59482C] hover:bg-[#F5E8C7]"
                : "border-zinc-800 bg-zinc-900/50 text-zinc-300 hover:bg-zinc-900"
            }`}
          >
            {copiedMode === "message" ? (
              <>
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
                Full Invite Message Copied (Paste on Instagram / DM)
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                Copy Full Invite Message for Instagram / DM
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
