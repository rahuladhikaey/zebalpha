"use client";

import { useLanguage } from "@/context/LanguageContext";
import { useIsNativeApp } from "@/lib/platform";
import { Check, X } from "lucide-react";

export function AndroidLanguageModal() {
  const isNativeApp = useIsNativeApp();
  const { language, setLanguage, isLanguageModalOpen, closeLanguageModal, t } = useLanguage();

  if (!isNativeApp || !isLanguageModalOpen) return null;

  const languages = [
    {
      code: "en" as const,
      symbol: "A",
      name: "English",
      nativeName: "English",
      fontClass: "font-sans",
    },
    {
      code: "hi" as const,
      symbol: "ह",
      name: "Hindi",
      nativeName: "हिंदी",
      fontClass: "font-serif",
    },
  ];

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      {/* Background touch dismiss */}
      <div className="absolute inset-0" onClick={closeLanguageModal} />

      {/* Modal Card */}
      <div className="relative w-full max-w-md rounded-t-[2.25rem] bg-white p-6 text-black shadow-2xl animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100 mb-5">
          <div>
            <h3 className="text-lg font-black tracking-tight text-neutral-900">
              {t("choose_language")}
            </h3>
            <p className="text-xs font-semibold text-neutral-500">
              {language === "hi" ? "ऐप की भाषा चुनें" : "Select your app language"}
            </p>
          </div>
          <button
            onClick={closeLanguageModal}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-600 hover:bg-neutral-200 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Language Options */}
        <div className="space-y-3 mb-6">
          {languages.map((item) => {
            const isSelected = language === item.code;
            return (
              <button
                key={item.code}
                onClick={() => setLanguage(item.code)}
                type="button"
                className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between cursor-pointer active:scale-[0.99] ${
                  isSelected
                    ? "border-2 border-black bg-neutral-50 shadow-sm"
                    : "border-neutral-200 bg-white hover:border-neutral-400"
                }`}
              >
                <div className="flex items-center gap-4">
                  <span
                    className={`flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100 text-2xl font-black text-black ${item.fontClass}`}
                  >
                    {item.symbol}
                  </span>
                  <div className="text-left">
                    <p className="text-base font-bold text-neutral-900">{item.nativeName}</p>
                    <p className="text-xs font-medium text-neutral-500">{item.name}</p>
                  </div>
                </div>

                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full border transition-all ${
                    isSelected ? "border-emerald-600 bg-emerald-600 text-white" : "border-neutral-300 bg-white"
                  }`}
                >
                  {isSelected && <Check size={14} strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>

        {/* Done Button */}
        <button
          onClick={closeLanguageModal}
          type="button"
          className="w-full h-13 rounded-2xl bg-emerald-600 text-white font-extrabold text-sm uppercase tracking-wider flex items-center justify-center shadow-lg shadow-emerald-600/25 hover:bg-emerald-500 active:scale-[0.98] transition-all"
        >
          {t("done")} ✦
        </button>
      </div>
    </div>
  );
}
