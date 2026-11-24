"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { X, ArrowRight } from "lucide-react";
import { useExperienceTheme } from "@/context/ExperienceThemeContext";
import {
  ExperiencePopupItem,
  validateDestinationUrl,
} from "@/lib/experienceThemes";

function shouldShowPopup(popup: ExperiencePopupItem): boolean {
  if (typeof window === "undefined") return false;
  const freq = popup.display_frequency || "once_per_session";
  const keyBase = `zebalpha_popup_seen_${popup.id}`;

  try {
    if (freq === "every_visit") return true;
    if (freq === "once_per_session") {
      return !window.sessionStorage.getItem(keyBase);
    }
    if (freq === "once_per_campaign") {
      return !window.localStorage.getItem(keyBase);
    }
    if (freq === "once_per_day") {
      const today = new Date().toISOString().slice(0, 10);
      return window.localStorage.getItem(keyBase) !== today;
    }
  } catch {
    return false;
  }
  return false;
}

function recordPopupDismissed(popup: ExperiencePopupItem) {
  if (typeof window === "undefined") return;
  const freq = popup.display_frequency || "once_per_session";
  const keyBase = `zebalpha_popup_seen_${popup.id}`;
  try {
    if (freq === "once_per_session") {
      window.sessionStorage.setItem(keyBase, "1");
    } else if (freq === "once_per_campaign") {
      window.localStorage.setItem(keyBase, "1");
    } else if (freq === "once_per_day") {
      const today = new Date().toISOString().slice(0, 10);
      window.localStorage.setItem(keyBase, today);
    }
  } catch {
    // Ignore storage errors
  }
}

export function ExperienceOverlayManager() {
  const { experience } = useExperienceTheme();
  const [activePopup, setActivePopup] = useState<ExperiencePopupItem | null>(null);

  useEffect(() => {
    const popups = experience.popups || [];
    if (popups.length === 0) {
      setActivePopup(null);
      return;
    }
    const eligible = popups.find((p) => p.status === "active" && shouldShowPopup(p));
    if (eligible) {
      const timer = window.setTimeout(() => {
        setActivePopup(eligible);
      }, 1200);
      return () => window.clearTimeout(timer);
    } else {
      setActivePopup(null);
    }
  }, [experience.popups, experience.version]);

  if (!activePopup) return null;

  const t = experience.themeTokens;
  const targetHref = validateDestinationUrl(
    activePopup.destination_type,
    activePopup.destination_value
  ).normalizedUrl;

  const handleClose = () => {
    recordPopupDismissed(activePopup);
    setActivePopup(null);
  };

  return (
    <div
      className="fixed inset-0 z-[95] bg-black/55 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={() => {
        if (activePopup.dismissal_behavior !== "close_button_only") {
          handleClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border-2 transition-all"
        style={{
          backgroundColor: t.cardBackground || "#FFFFFF",
          borderColor: t.primaryColor || "#F03A46",
          color: t.primaryText || "#14120F",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close popup"
          data-photo-overlay="true"
          className="absolute top-3 right-3 z-20 h-8 w-8 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {activePopup.image_url && (
          <div className="relative aspect-[16/9] w-full overflow-hidden bg-[#FFF5F3]">
            <img
              src={activePopup.image_url}
              alt={activePopup.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-5 text-center space-y-2.5">
          <span
            data-photo-overlay="true"
            className="inline-block px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider text-white"
            style={{ backgroundColor: t.primaryColor || "#F03A46" }}
          >
            {activePopup.popup_type} • {experience.festivalName}
          </span>

          <h3 className="text-lg font-black leading-snug" style={{ color: t.primaryText }}>
            {activePopup.title}
          </h3>

          {activePopup.description && (
            <p className="text-xs font-medium leading-relaxed" style={{ color: t.secondaryText }}>
              {activePopup.description}
            </p>
          )}

          <div className="pt-2">
            <Link
              href={targetHref}
              onClick={handleClose}
              data-photo-overlay="true"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3 px-5 text-xs font-black uppercase tracking-wider shadow-md active:scale-95 transition"
              style={{
                backgroundColor: t.primaryButtonBg || "#F03A46",
                color: t.primaryButtonText || "#FFFFFF",
              }}
            >
              <span>{activePopup.button_text || "Explore Now"}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
