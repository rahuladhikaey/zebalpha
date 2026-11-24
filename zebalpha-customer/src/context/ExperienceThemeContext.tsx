"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
  PREBUILT_EXPERIENCE_PRESETS,
  DEFAULT_HOME_SECTIONS,
  DEFAULT_ASSETS,
  DEFAULT_TYPOGRAPHY,
  CustomerActiveExperiencePayload,
  isValidHexColor,
} from "@/lib/experienceThemes";

const DEMS_CACHE_STORAGE_KEY = "zebalpha_dems_active_cache_v3";

export const DEFAULT_FALLBACK_EXPERIENCE: CustomerActiveExperiencePayload = {
  version: 1,
  schemaVersion: 1,
  activeExperienceId: PREBUILT_EXPERIENCE_PRESETS[0].id,
  name: PREBUILT_EXPERIENCE_PRESETS[0].name,
  slug: PREBUILT_EXPERIENCE_PRESETS[0].slug,
  festivalName: PREBUILT_EXPERIENCE_PRESETS[0].festival_name,
  experienceType: PREBUILT_EXPERIENCE_PRESETS[0].experience_type,
  isDefault: true,
  timezone: "Asia/Kolkata",
  effectiveStartAt: null,
  effectiveEndAt: null,
  lastUpdatedAt: "2026-11-24T00:00:00.000Z",
  lastPublishedBy: "Super Admin",
  themeTokens: PREBUILT_EXPERIENCE_PRESETS[0].theme_tokens,
  typography: DEFAULT_TYPOGRAPHY,
  assets: DEFAULT_ASSETS,
  homeSections: DEFAULT_HOME_SECTIONS,
  banners: [],
  campaigns: [],
  popups: [],
  announcements: [],
};

interface ExperienceThemeContextValue {
  experience: CustomerActiveExperiencePayload;
  isFestivalOverride: boolean;
  refreshExperience: () => Promise<void>;
}

const ExperienceThemeContext = createContext<ExperienceThemeContextValue>({
  experience: DEFAULT_FALLBACK_EXPERIENCE,
  isFestivalOverride: false,
  refreshExperience: async () => {},
});

function validateExperiencePayload(raw: any): raw is CustomerActiveExperiencePayload {
  if (!raw || typeof raw !== "object") return false;
  if (typeof raw.version !== "number" || !raw.activeExperienceId) return false;
  if (!raw.themeTokens || typeof raw.themeTokens !== "object") return false;
  if (!isValidHexColor(raw.themeTokens.primaryColor)) return false;
  return true;
}

export function applyThemeCssVariables(exp: CustomerActiveExperiencePayload) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const t = exp.themeTokens || DEFAULT_FALLBACK_EXPERIENCE.themeTokens;
  const art = exp.assets || DEFAULT_ASSETS;
  const defTokens = DEFAULT_FALLBACK_EXPERIENCE.themeTokens;

  // Determine whether any visual token or festival identity differs from default everyday coral
  const isCustomOrFestival =
    !exp.isDefault ||
    exp.activeExperienceId !== "exp_default_zebalpha" ||
    t.primaryColor.toLowerCase() !== defTokens.primaryColor.toLowerCase() ||
    t.secondaryColor.toLowerCase() !== defTokens.secondaryColor.toLowerCase() ||
    t.backgroundColor.toLowerCase() !== defTokens.backgroundColor.toLowerCase();

  root.style.setProperty("--dems-primary", t.primaryColor);
  root.style.setProperty("--dems-primary-dark", t.primaryDark);
  root.style.setProperty("--dems-primary-light", t.primaryLight);
  root.style.setProperty("--dems-secondary", t.secondaryColor);
  root.style.setProperty("--dems-accent", t.accentColor);
  root.style.setProperty("--dems-bg", t.backgroundColor);
  root.style.setProperty("--dems-surface", t.surfaceColor);
  root.style.setProperty("--dems-card-bg", t.cardBackground);
  root.style.setProperty("--dems-text-primary", t.primaryText);
  root.style.setProperty("--dems-text-secondary", t.secondaryText);
  root.style.setProperty("--dems-border", t.borderColor);
  root.style.setProperty("--dems-btn-primary-bg", t.primaryButtonBg);
  root.style.setProperty("--dems-btn-primary-text", t.primaryButtonText);
  root.style.setProperty("--dems-btn-secondary-bg", t.secondaryButtonBg);
  root.style.setProperty("--dems-btn-secondary-text", t.secondaryButtonText);
  root.style.setProperty("--dems-nav-bg", t.navBarBg);
  root.style.setProperty("--dems-nav-icon", t.navBarIcon);
  root.style.setProperty("--dems-search-bg", t.searchBarBg);
  root.style.setProperty("--dems-cat-bg", t.categoryBarBg);
  root.style.setProperty("--dems-price-color", t.priceColor);
  root.style.setProperty("--dems-discount-badge", t.discountBadgeColor);
  root.style.setProperty("--dems-promo-badge", t.promoBadgeColor);

  // Also bridge to existing --za-* global variables so legacy surfaces match seamlessly
  root.style.setProperty("--za-bg", t.backgroundColor);
  root.style.setProperty("--za-surface", t.surfaceColor);
  root.style.setProperty("--za-ink", t.primaryText);
  root.style.setProperty("--za-ink-muted", t.secondaryText);
  root.style.setProperty("--za-gold", t.accentColor);
  root.style.setProperty("--za-gold-deep", t.primaryColor);

  if (art.headerArtworkUrl) {
    root.style.setProperty("--dems-header-artwork", `url('${art.headerArtworkUrl}')`);
  } else {
    root.style.setProperty("--dems-header-artwork", "url('/festive-header-bg.jpg')");
  }

  root.setAttribute("data-dems-experience", exp.slug || "default-zebalpha");
  root.setAttribute("data-dems-version", String(exp.version || 1));
  root.setAttribute("data-dems-custom", isCustomOrFestival ? "true" : "false");
}

export function ExperienceThemeProvider({
  children,
  initialExperience,
}: {
  children: React.ReactNode;
  initialExperience?: CustomerActiveExperiencePayload | null;
}) {
  const [experience, setExperience] = useState<CustomerActiveExperiencePayload>(() => {
    if (initialExperience && validateExperiencePayload(initialExperience)) {
      return initialExperience;
    }
    if (typeof window !== "undefined") {
      try {
        const cachedRaw = window.localStorage.getItem(DEMS_CACHE_STORAGE_KEY);
        if (cachedRaw) {
          const parsed = JSON.parse(cachedRaw);
          if (validateExperiencePayload(parsed)) {
            const endMs = parsed.effectiveEndAt ? new Date(parsed.effectiveEndAt).getTime() : null;
            if (parsed.isDefault || !endMs || Number.isNaN(endMs) || endMs > Date.now()) {
              return parsed;
            }
          }
        }
      } catch {
        // Ignore storage read failure
      }
    }
    return DEFAULT_FALLBACK_EXPERIENCE;
  });

  // Sync if SSR prop updates
  useEffect(() => {
    if (initialExperience && validateExperiencePayload(initialExperience)) {
      setExperience((prev) => {
        if (
          Number(initialExperience.version) >= Number(prev.version) ||
          initialExperience.activeExperienceId !== prev.activeExperienceId
        ) {
          applyThemeCssVariables(initialExperience);
          try {
            window.localStorage.setItem(
              DEMS_CACHE_STORAGE_KEY,
              JSON.stringify(initialExperience)
            );
          } catch {}
          return initialExperience;
        }
        return prev;
      });
    }
  }, [initialExperience]);

  useEffect(() => {
    applyThemeCssVariables(experience);
  }, [experience]);

  const syncRemoteExperience = useCallback(
    async (forceFull = false) => {
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        return;
      }

      try {
        if (!forceFull) {
          const verRes = await fetch(`/api/v1/app/experience/version?t=${Date.now()}`, {
            cache: "no-store",
          });
          if (verRes.ok) {
            const verJson = await verRes.json();
            if (
              verJson?.success &&
              Number(verJson.version) === Number(experience.version) &&
              verJson.activeExperienceId === experience.activeExperienceId
            ) {
              return;
            }
          }
        }

        const fullRes = await fetch(`/api/v1/app/experience/current?t=${Date.now()}`, {
          cache: "no-store",
        });
        if (!fullRes.ok) return;
        const fullJson = await fullRes.json();
        if (fullJson?.success && validateExperiencePayload(fullJson.data)) {
          setExperience(fullJson.data);
          applyThemeCssVariables(fullJson.data);
          try {
            window.localStorage.setItem(
              DEMS_CACHE_STORAGE_KEY,
              JSON.stringify(fullJson.data)
            );
          } catch {
            // Ignore quota error
          }
        }
      } catch {
        // Preserve last valid cached configuration silently
      }
    },
    [experience.version, experience.activeExperienceId]
  );

  useEffect(() => {
    syncRemoteExperience(true);

    // Live poll every 15 seconds while tab/app is visible so published themes apply live without app restart
    const pollTimer = window.setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        syncRemoteExperience(false);
      }
    }, 15000);

    const handleOnline = () => syncRemoteExperience(true);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        syncRemoteExperience(false);
      }
    };

    window.addEventListener("online", handleOnline);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(pollTimer);
      window.removeEventListener("online", handleOnline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [syncRemoteExperience]);

  const defTokens = DEFAULT_FALLBACK_EXPERIENCE.themeTokens;
  const hasAnyTokenChange = (Object.keys(defTokens) as Array<keyof typeof defTokens>).some(
    (k) =>
      String(experience.themeTokens?.[k] || "").toLowerCase() !==
      String(defTokens[k] || "").toLowerCase()
  );
  const isFestivalOverride =
    !experience.isDefault ||
    experience.activeExperienceId !== "exp_default_zebalpha" ||
    hasAnyTokenChange;

  return (
    <ExperienceThemeContext.Provider
      value={{
        experience,
        isFestivalOverride,
        refreshExperience: () => syncRemoteExperience(true),
      }}
    >
      {children}
    </ExperienceThemeContext.Provider>
  );
}

export function useExperienceTheme() {
  return useContext(ExperienceThemeContext);
}
