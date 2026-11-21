"use client";

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { Mic, MicOff, X, Loader2, Volume2, RotateCcw } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import {
  VOICE_LANGUAGES,
  VOICE_LANG_STORAGE_KEY,
  getVoiceLanguageMeta,
  mapAppLanguageToVoiceLang,
  parseMultilingualSearchQuery,
} from "@/lib/multilingualSearch";

export type VoiceStatus = "idle" | "starting" | "listening" | "processing" | "error";

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal?: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex?: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
}

interface SpeechRecognitionErrorEventLike {
  error?: string;
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous?: boolean;
  maxAlternatives: number;
  onstart?: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop?: () => void;
  abort?: () => void;
}

interface ZebAlphaNativeVoiceBridge {
  hasVoiceSearchSupport?: () => boolean;
  hasMicPermission?: () => boolean;
  requestMicPermission?: () => void;
  startVoiceSearch?: (langTag: string) => void;
  stopVoiceSearch?: () => void;
  cancelVoiceSearch?: () => void;
}

function getNativeVoiceBridge(): ZebAlphaNativeVoiceBridge | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as { ZebAlphaNative?: ZebAlphaNativeVoiceBridge };
  const bridge = win.ZebAlphaNative;
  if (bridge && typeof bridge.startVoiceSearch === "function") {
    return bridge;
  }
  return null;
}

function getWebSpeechConstructor(): (new () => SpeechRecognitionInstance) | null {
  if (typeof window === "undefined") return null;
  const win = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

export interface UseVoiceSearchOptions {
  onResult: (spokenQuery: string, translatedHint?: string) => void;
  onUnsupportedFallback?: (message: string) => void;
}

export function useVoiceSearch({ onResult, onUnsupportedFallback }: UseVoiceSearchOptions) {
  const { language, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [customVoiceLang, setCustomVoiceLang] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = window.localStorage.getItem(VOICE_LANG_STORAGE_KEY);
      return saved && VOICE_LANGUAGES.some((l) => l.code === saved) ? saved : null;
    } catch {
      return null;
    }
  });
  const voiceLang = customVoiceLang ?? mapAppLanguageToVoiceLang(language);
  const [transcript, setTranscript] = useState("");
  const [translatedPreview, setTranslatedPreview] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [rmsLevel, setRmsLevel] = useState(0);

  const sessionSeqRef = useRef(0);
  const isMountedRef = useRef(true);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const latestInterimRef = useRef("");
  const hasFinalizedRef = useRef(false);
  const onResultRef = useRef(onResult);
  const onUnsupportedRef = useRef(onUnsupportedFallback);

  useEffect(() => {
    onResultRef.current = onResult;
    onUnsupportedRef.current = onUnsupportedFallback;
  });

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const abortActiveEngine = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort?.();
      } catch {
        // Ignore cleanup errors
      }
      recognitionRef.current = null;
    }

    const bridge = getNativeVoiceBridge();
    if (bridge?.cancelVoiceSearch) {
      try {
        bridge.cancelVoiceSearch();
      } catch {
        // Ignore bridge cleanup errors
      }
    }
  }, []);

  const finalizeTranscript = useCallback(
    async (rawText: string, langCode: string, activeSeq: number) => {
      const cleanSpoken = rawText.trim();
      if (!cleanSpoken || hasFinalizedRef.current || activeSeq !== sessionSeqRef.current) {
        return;
      }
      hasFinalizedRef.current = true;
      setStatus("processing");
      setTranscript(cleanSpoken);
      setRmsLevel(0);

      let parsed = parseMultilingualSearchQuery(cleanSpoken);
      let hintToPass =
        parsed.translatedQuery && parsed.translatedQuery.toLowerCase() !== cleanSpoken.toLowerCase()
          ? parsed.translatedQuery
          : undefined;

      if (parsed.hasUntranslatedNonAscii) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1600);
          const res = await fetch("/api/search/translate", {
            method: "POST",
            signal: controller.signal,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query: cleanSpoken, lang: langCode }),
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            if (typeof data?.translatedQuery === "string" && data.translatedQuery.trim()) {
              parsed = parseMultilingualSearchQuery(cleanSpoken, data.translatedQuery.trim());
              hintToPass = data.translatedQuery.trim();
            }
          }
        } catch {
          // Proceed immediately with local multilingual parser
        }
      }

      if (!isMountedRef.current || activeSeq !== sessionSeqRef.current) return;

      if (hintToPass) {
        setTranslatedPreview(hintToPass);
      }

      setTimeout(() => {
        if (!isMountedRef.current || activeSeq !== sessionSeqRef.current) return;
        setIsOpen(false);
        setStatus("idle");
        onResultRef.current(cleanSpoken, hintToPass);
      }, 260);
    },
    []
  );

  const startSessionWithLang = useCallback(
    (targetLang: string) => {
      abortActiveEngine();
      sessionSeqRef.current += 1;
      const mySeq = sessionSeqRef.current;

      hasFinalizedRef.current = false;
      latestInterimRef.current = "";
      setTranscript("");
      setTranslatedPreview(null);
      setErrorMsg(null);
      setRmsLevel(0);
      setStatus("starting");

      // 1. Prefer Native Android Speech Bridge when running in ZebAlpha Android APK
      const nativeBridge = getNativeVoiceBridge();
      if (nativeBridge) {
        try {
          nativeBridge.startVoiceSearch?.(targetLang);
          return;
        } catch {
          // Fall through to Web Speech API
        }
      }

      // 2. Standard Web Speech API (Chrome Android / Desktop / Safari / Edge)
      const SpeechRec = getWebSpeechConstructor();
      if (SpeechRec) {
        (async () => {
          // Proactively request mic permission via mediaDevices to trigger browser's native prompt
          if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
            try {
              const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
              // Permission granted! Immediately stop tracks to release hardware for SpeechRecognition
              stream.getTracks().forEach((track) => track.stop());
            } catch (err: unknown) {
              if (!isMountedRef.current || sessionSeqRef.current !== mySeq) return;
              const errName =
                typeof err === "object" && err !== null && "name" in err
                  ? String((err as { name?: unknown }).name || "")
                  : "";
              if (
                errName === "NotAllowedError" ||
                errName === "PermissionDeniedError" ||
                errName === "SecurityError"
              ) {
                console.warn("[VoiceSearch] Microphone permission denied or dismissed:", err);
                setStatus("error");
                setErrorMsg(t("voice_mic_permission"));
                return;
              }
              // Non-permission mediaDevices error: fall through and try SpeechRecognition directly
            }
          }

          if (!isMountedRef.current || sessionSeqRef.current !== mySeq) return;

          try {
            const recognition = new SpeechRec();
            recognitionRef.current = recognition;
            recognition.lang = targetLang;
            recognition.interimResults = true;
            recognition.continuous = false;
            recognition.maxAlternatives = 3;

            recognition.onstart = () => {
              if (!isMountedRef.current || sessionSeqRef.current !== mySeq) return;
              setStatus("listening");
            };

            recognition.onresult = (event) => {
              if (!isMountedRef.current || sessionSeqRef.current !== mySeq) return;
              let fullText = "";
              let isFinalChunk = false;

              for (let i = 0; i < event.results.length; i++) {
                const res = event.results[i];
                const alt = res?.[0]?.transcript || "";
                fullText += alt + " ";
                if (res?.isFinal) isFinalChunk = true;
              }

              const cleaned = fullText.trim();
              if (cleaned) {
                latestInterimRef.current = cleaned;
                setTranscript(cleaned);
                const quickParse = parseMultilingualSearchQuery(cleaned);
                if (quickParse.wasTranslated && quickParse.translatedQuery !== cleaned) {
                  setTranslatedPreview(quickParse.translatedQuery);
                }
              }

              if (isFinalChunk && cleaned) {
                finalizeTranscript(cleaned, targetLang, mySeq);
              }
            };

            recognition.onerror = (event) => {
              if (!isMountedRef.current || sessionSeqRef.current !== mySeq) return;
              if (hasFinalizedRef.current) return;
              const errCode = String(event?.error || "");
              if (errCode === "aborted") return;

              setStatus("error");
              if (errCode === "not-allowed" || errCode === "service-not-allowed") {
                setErrorMsg(t("voice_mic_permission"));
              } else if (errCode === "network") {
                setErrorMsg("Network unavailable for voice recognition. Check your internet.");
              } else {
                setErrorMsg(t("voice_no_speech"));
              }
            };

            recognition.onend = () => {
              if (!isMountedRef.current || sessionSeqRef.current !== mySeq) return;
              if (!hasFinalizedRef.current && latestInterimRef.current.trim()) {
                finalizeTranscript(latestInterimRef.current.trim(), targetLang, mySeq);
                return;
              }
              setStatus((prev) => (prev === "listening" || prev === "starting" ? "idle" : prev));
            };

            recognition.start();
          } catch (e) {
            console.error("[VoiceSearch] Failed starting speech recognition:", e);
            setStatus("error");
            setErrorMsg(t("voice_mic_permission"));
          }
        })();
        return;
      }

      // 3. Fallback when browser/WebView lacks both Native Bridge and WebSpeech
      setStatus("error");
      const msg = "Use ZebAlpha Android App or Chrome for voice search, or tap a language sample below.";
      setErrorMsg(msg);
      onUnsupportedRef.current?.(msg);
    },
    [abortActiveEngine, finalizeTranscript, t]
  );

  // Subscribe to native Android Voice Bridge custom events while modal is open
  useEffect(() => {
    if (!isOpen) return;

    const onNativeState = (ev: Event) => {
      const detail = (ev as CustomEvent<{ state?: string; message?: string }>).detail;
      if (!detail || !isMountedRef.current) return;
      if (detail.state === "listening") {
        setStatus("listening");
        setErrorMsg(null);
      } else if (detail.state === "starting") {
        setStatus("starting");
      } else if (detail.state === "processing") {
        setStatus("processing");
      } else if (detail.state === "idle" && !hasFinalizedRef.current) {
        setStatus("idle");
        setRmsLevel(0);
      }
    };

    const onNativeRms = (ev: Event) => {
      const detail = (ev as CustomEvent<{ rms?: number }>).detail;
      if (!isMountedRef.current) return;
      const val = Number(detail?.rms ?? 0);
      if (Number.isFinite(val)) {
        setRmsLevel(Math.max(0, Math.min(1, val)));
      }
    };

    const onNativePartial = (ev: Event) => {
      const detail = (ev as CustomEvent<{ transcript?: string }>).detail;
      const text = detail?.transcript?.trim();
      if (!text || !isMountedRef.current || hasFinalizedRef.current) return;
      latestInterimRef.current = text;
      setTranscript(text);
      const quickParse = parseMultilingualSearchQuery(text);
      if (quickParse.wasTranslated && quickParse.translatedQuery !== text) {
        setTranslatedPreview(quickParse.translatedQuery);
      }
    };

    const onNativeResult = (ev: Event) => {
      const detail = (ev as CustomEvent<{ transcript?: string; lang?: string }>).detail;
      const text = detail?.transcript?.trim();
      if (!text || !isMountedRef.current) return;
      finalizeTranscript(text, detail?.lang || voiceLang, sessionSeqRef.current);
    };

    const onNativeError = (ev: Event) => {
      const detail = (ev as CustomEvent<{ code?: string; message?: string }>).detail;
      if (!isMountedRef.current || hasFinalizedRef.current) return;
      setStatus("error");
      setRmsLevel(0);
      if (detail?.code === "permission_denied") {
        setErrorMsg(t("voice_mic_permission"));
      } else if (detail?.code === "no_speech") {
        setErrorMsg(t("voice_no_speech"));
      } else {
        setErrorMsg(detail?.message || t("voice_no_speech"));
      }
    };

    window.addEventListener("zebalpha:voice-state", onNativeState);
    window.addEventListener("zebalpha:voice-rms", onNativeRms);
    window.addEventListener("zebalpha:voice-partial", onNativePartial);
    window.addEventListener("zebalpha:voice-result", onNativeResult);
    window.addEventListener("zebalpha:voice-error", onNativeError);

    return () => {
      window.removeEventListener("zebalpha:voice-state", onNativeState);
      window.removeEventListener("zebalpha:voice-rms", onNativeRms);
      window.removeEventListener("zebalpha:voice-partial", onNativePartial);
      window.removeEventListener("zebalpha:voice-result", onNativeResult);
      window.removeEventListener("zebalpha:voice-error", onNativeError);
    };
  }, [isOpen, voiceLang, finalizeTranscript, t]);

  // Cleanup when unmounting
  useEffect(() => {
    return () => {
      sessionSeqRef.current += 1;
      abortActiveEngine();
    };
  }, [abortActiveEngine]);

  const openVoiceSearch = useCallback(() => {
    setIsOpen(true);
    startSessionWithLang(voiceLang);
  }, [startSessionWithLang, voiceLang]);

  const closeVoiceSearch = useCallback(() => {
    sessionSeqRef.current += 1;
    abortActiveEngine();
    setIsOpen(false);
    setStatus("idle");
    setErrorMsg(null);
    setRmsLevel(0);
  }, [abortActiveEngine]);

  const selectVoiceLanguage = useCallback(
    (newLangCode: string) => {
      setCustomVoiceLang(newLangCode);
      try {
        window.localStorage.setItem(VOICE_LANG_STORAGE_KEY, newLangCode);
      } catch {
        // Ignore storage restrictions
      }
      startSessionWithLang(newLangCode);
    },
    [startSessionWithLang]
  );

  const retryListening = useCallback(() => {
    const nativeBridge = getNativeVoiceBridge();
    if (nativeBridge?.requestMicPermission && nativeBridge.hasMicPermission?.() === false) {
      nativeBridge.requestMicPermission();
      return;
    }
    startSessionWithLang(voiceLang);
  }, [startSessionWithLang, voiceLang]);

  const runQuickVoiceSample = useCallback(
    (sampleText: string) => {
      finalizeTranscript(sampleText, voiceLang, sessionSeqRef.current);
    },
    [finalizeTranscript, voiceLang]
  );

  return {
    isOpen,
    status,
    voiceLang,
    transcript,
    translatedPreview,
    errorMsg,
    rmsLevel,
    openVoiceSearch,
    closeVoiceSearch,
    selectVoiceLanguage,
    retryListening,
    runQuickVoiceSample,
  };
}

export type VoiceSearchController = ReturnType<typeof useVoiceSearch>;

interface VoiceSearchSheetProps {
  controller: VoiceSearchController;
  isNativeApp: boolean;
}

const subscribeNoop = () => () => {};

export function VoiceSearchSheet({ controller, isNativeApp }: VoiceSearchSheetProps) {
  const {
    isOpen,
    status,
    voiceLang,
    transcript,
    translatedPreview,
    errorMsg,
    rmsLevel,
    closeVoiceSearch: onClose,
    selectVoiceLanguage: onSelectLanguage,
    retryListening: onRetry,
    runQuickVoiceSample: onSampleSearch,
  } = controller;
  const { t } = useLanguage();
  const mounted = useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false
  );

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const activeLangMeta = getVoiceLanguageMeta(voiceLang);
  const isActivelyListening = status === "listening" || status === "starting";
  const ringScale = isActivelyListening ? 1 + rmsLevel * 0.35 : 1;

  const content = (
    <div
      className="fixed inset-0 z-[140] flex items-end sm:items-center justify-center bg-black/55 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t("voice_search_title")}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full sm:max-w-md rounded-t-[28px] sm:rounded-3xl border shadow-2xl overflow-hidden transition-all pb-[max(env(safe-area-inset-bottom),1.25rem)] ${
          isNativeApp
            ? "bg-[#FCF9F2] border-[#DFBE6F] text-[#14120F]"
            : "bg-[#0D0B08] border-amber-500/45 text-white"
        }`}
      >
        {/* Header Bar */}
        <div
          className={`flex items-center justify-between px-5 pt-4 pb-3 border-b ${
            isNativeApp ? "border-[#EAD9AE]/80 bg-[#FAF3E1]/70" : "border-amber-500/20 bg-black/40"
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full ${
                isNativeApp
                  ? "bg-gradient-to-br from-[#FDE68A] to-[#D99B16] text-[#111111]"
                  : "bg-amber-400 text-black"
              }`}
            >
              <Volume2 className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="text-xs font-black uppercase tracking-wider leading-none">
                {t("voice_search_title")}
              </p>
              <p
                className={`mt-0.5 text-[10px] font-semibold ${
                  isNativeApp ? "text-[#7A673E]" : "text-amber-300/80"
                }`}
              >
                {t("voice_listening_in")} {activeLangMeta.nativeLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("close")}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors cursor-pointer ${
              isNativeApp
                ? "bg-[#F3E4BB] text-[#14120F] hover:bg-[#EAD196]"
                : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
            }`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Interactive Mic Orb & Live Transcript */}
        <div className="flex flex-col items-center px-6 pt-6 pb-4 text-center">
          <div className="relative flex items-center justify-center mb-4">
            {isActivelyListening && (
              <>
                <span
                  className={`absolute h-24 w-24 rounded-full opacity-25 animate-ping ${
                    isNativeApp ? "bg-[#EAB308]" : "bg-amber-400"
                  }`}
                />
                <span
                  style={{ transform: `scale(${ringScale})` }}
                  className={`absolute h-24 w-24 rounded-full transition-transform duration-75 ${
                    isNativeApp ? "bg-[#F5D57A]/45" : "bg-amber-400/25"
                  }`}
                />
              </>
            )}

            <button
              type="button"
              onClick={isActivelyListening ? onClose : onRetry}
              aria-label={isActivelyListening ? t("close") : t("voice_try_again")}
              className={`relative z-10 flex h-[76px] w-[76px] items-center justify-center rounded-full shadow-lg transition-transform active:scale-95 cursor-pointer ${
                status === "error"
                  ? isNativeApp
                    ? "bg-[#FDE68A] text-[#14120F] border-2 border-[#C68A12]"
                    : "bg-zinc-800 text-amber-400 border border-amber-500/50"
                  : isNativeApp
                    ? "bg-gradient-to-b from-[#FCE89C] via-[#F2BF43] to-[#C88D0F] text-[#111111] border-2 border-[#FFF8DF]"
                    : "bg-gradient-to-b from-[#fde68a] via-[#eab308] to-[#ca8a04] text-black border border-amber-200"
              }`}
            >
              {status === "error" ? (
                <MicOff className="h-7 w-7" />
              ) : (
                <Mic className={`h-8 w-8 ${isActivelyListening ? "animate-pulse" : ""}`} />
              )}
            </button>
          </div>

          {status === "processing" ? (
            <p className="text-sm font-extrabold tracking-tight flex items-center gap-1.5">
              <Loader2 className="h-4 w-4 text-[#D49014] animate-spin" />
              {t("voice_searching_for")} &ldquo;{transcript}&rdquo;
            </p>
          ) : transcript ? (
            <div className="space-y-1">
              <p className="text-lg font-black leading-snug">&ldquo;{transcript}&rdquo;</p>
              {translatedPreview && (
                <p
                  className={`text-[11px] font-bold ${
                    isNativeApp ? "text-[#8E6208]" : "text-amber-300"
                  }`}
                >
                  Matching: {translatedPreview}
                </p>
              )}
            </div>
          ) : errorMsg ? (
            <div className="space-y-2.5">
              <p
                className={`text-xs font-semibold leading-relaxed ${
                  isNativeApp ? "text-[#7A500B]" : "text-amber-200"
                }`}
              >
                {errorMsg}
              </p>
              <button
                type="button"
                onClick={onRetry}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-black shadow-sm active:scale-95 cursor-pointer ${
                  isNativeApp
                    ? "bg-gradient-to-r from-[#FBE28A] to-[#D99B16] text-[#111111]"
                    : "bg-amber-400 text-black"
                }`}
              >
                {errorMsg === t("voice_mic_permission") ? (
                  <>
                    <Mic className="h-3.5 w-3.5" />
                    Allow Microphone & Speak
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-3.5 w-3.5" />
                    {t("voice_try_again")}
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-sm font-extrabold">
                {isActivelyListening ? `${t("voice_listening_in")} ${activeLangMeta.nativeLabel}...` : t("voice_speak_now")}
              </p>
              <p
                className={`text-xs font-medium ${
                  isNativeApp ? "text-[#6E624D]" : "text-zinc-400"
                }`}
              >
                Try: &ldquo;{activeLangMeta.samplePrompt}&rdquo;
              </p>
            </div>
          )}
        </div>

        {/* Language Picker Pills */}
        <div
          className={`px-5 pt-3 border-t ${
            isNativeApp ? "border-[#EAD9AE]/70" : "border-zinc-800"
          }`}
        >
          <p
            className={`mb-2 text-[10px] font-extrabold uppercase tracking-wider ${
              isNativeApp ? "text-[#6E624D]" : "text-zinc-400"
            }`}
          >
            {t("voice_choose_lang")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {VOICE_LANGUAGES.map((opt) => {
              const selected = opt.code === voiceLang;
              return (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => onSelectLanguage(opt.code)}
                  className={`rounded-full px-3 py-1 text-[11px] font-bold transition-all active:scale-95 cursor-pointer ${
                    selected
                      ? isNativeApp
                        ? "bg-[#14120F] text-[#FCF9F2] shadow-sm"
                        : "bg-amber-400 text-black"
                      : isNativeApp
                        ? "bg-[#FFFDF8] border border-[#DFBE6F] text-[#3A301F] hover:bg-[#F7EBC7]"
                        : "bg-zinc-900 border border-zinc-700 text-zinc-300 hover:border-amber-400/50"
                  }`}
                >
                  {opt.nativeLabel}
                </button>
              );
            })}
          </div>

          {status === "error" && (
            <button
              type="button"
              onClick={() => onSampleSearch(activeLangMeta.samplePrompt)}
              className={`mt-3 w-full rounded-xl py-2 text-[11px] font-bold border transition-colors cursor-pointer ${
                isNativeApp
                  ? "bg-[#FFFDF8] border-[#DFBE6F] text-[#5C4E35] hover:bg-[#FAF0D1]"
                  : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              Try sample: &ldquo;{activeLangMeta.samplePrompt}&rdquo; →
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
