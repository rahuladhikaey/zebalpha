"use client";

import React, { useState } from "react";
import {
  AvatarConfig,
  AvatarGender,
  AvatarHairStyle,
  AvatarBodyBuild,
  AvatarEyewear,
  AvatarAccessories,
  SKIN_TONE_OPTIONS,
  HAIR_COLOR_OPTIONS,
  DEFAULT_MALE_AVATAR,
  DEFAULT_FEMALE_AVATAR,
} from "./GenZAvatarModel";
import {
  Sparkles,
  RotateCcw,
  Check,
  Dices,
  Flame,
  User,
  Palette,
  Scissors,
  Activity,
  Glasses,
} from "lucide-react";

interface AvatarCustomizerTabsProps {
  config: AvatarConfig;
  onChange: (updated: AvatarConfig) => void;
  onSave?: () => void;
}

type TabType = "vibe" | "skin" | "hair" | "body" | "drip";

export function AvatarCustomizerTabs({
  config,
  onChange,
  onSave,
}: AvatarCustomizerTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>("vibe");
  const [saveToast, setSaveToast] = useState(false);

  const isFemale = config.gender === "female";

  const handleGenderChange = (gender: AvatarGender) => {
    if (gender === config.gender) return;
    onChange(gender === "male" ? { ...DEFAULT_MALE_AVATAR } : { ...DEFAULT_FEMALE_AVATAR });
  };

  const handleRandomize = () => {
    const genders: AvatarGender[] = ["male", "female"];
    const randomGender = genders[Math.floor(Math.random() * genders.length)];
    const randomSkin = SKIN_TONE_OPTIONS[Math.floor(Math.random() * SKIN_TONE_OPTIONS.length)].hex;
    const randomHairColor = HAIR_COLOR_OPTIONS[Math.floor(Math.random() * HAIR_COLOR_OPTIONS.length)].hex;

    const maleHairs: AvatarHairStyle[] = ["textured_crop", "middle_part", "messy_curls", "buzz_cut", "fade"];
    const femaleHairs: AvatarHairStyle[] = ["wolf_cut", "high_ponytail", "bob_cut", "messy_curls"];
    const randomHair = randomGender === "male"
      ? maleHairs[Math.floor(Math.random() * maleHairs.length)]
      : femaleHairs[Math.floor(Math.random() * femaleHairs.length)];

    const builds: AvatarBodyBuild[] = ["boxy_oversized", "athletic", "slim", "regular"];
    const randomBuild = builds[Math.floor(Math.random() * builds.length)];

    const eyewear: AvatarEyewear[] = ["cyber_shades", "retro_black", "none"];
    const randomEyewear = eyewear[Math.floor(Math.random() * eyewear.length)];

    const accessories: AvatarAccessories[] = randomGender === "female"
      ? ["pearl_choker", "none"]
      : ["silver_chain", "none"];
    const randomAccessory = accessories[Math.floor(Math.random() * accessories.length)];

    onChange({
      gender: randomGender,
      skinTone: randomSkin,
      hairStyle: randomHair,
      hairColor: randomHairColor,
      facialHair: randomGender === "male" ? (Math.random() > 0.5 ? "stubble" : "none") : "none",
      bodyBuild: randomBuild,
      eyewear: randomEyewear,
      accessories: randomAccessory,
    });
  };

  const handleSave = () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("zebalpha_vto_avatar", JSON.stringify(config));
        setSaveToast(true);
        setTimeout(() => setSaveToast(false), 2200);
      } catch (_) {}
    }
    if (onSave) onSave();
  };

  const handleReset = () => {
    onChange(isFemale ? { ...DEFAULT_FEMALE_AVATAR } : { ...DEFAULT_MALE_AVATAR });
  };

  return (
    <div className="w-full space-y-4">
      {/* Toast Feedback */}
      {saveToast && (
        <div className="p-2.5 rounded-xl bg-emerald-950/90 border border-emerald-700 text-emerald-300 text-xs font-bold text-center shadow-xl animate-in fade-in flex items-center justify-center gap-1.5">
          <Check size={14} className="text-emerald-400 stroke-[3]" />
          <span>Drip Avatar saved to your device!</span>
        </div>
      )}

      {/* Top Header & Fast Actions */}
      <div className="flex items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Flame size={14} />
          </span>
          <span className="text-xs font-black tracking-wider uppercase text-white">
            Customize Drip Avatar
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleRandomize}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white text-[11px] font-bold transition active:scale-95 cursor-pointer"
            title="Randomize Drip"
          >
            <Dices size={13} className="text-emerald-400" />
            <span className="hidden sm:inline">Random</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white text-[11px] font-bold transition active:scale-95 cursor-pointer"
            title="Reset to default"
          >
            <RotateCcw size={12} />
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-[11px] font-black uppercase tracking-wider transition shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-95 cursor-pointer"
          >
            <Check size={13} className="stroke-[3]" />
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Category Tab Pills */}
      <div className="grid grid-cols-5 gap-1 p-1 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs font-bold">
        {[
          { id: "vibe", label: "Vibe", icon: User },
          { id: "skin", label: "Skin", icon: Palette },
          { id: "hair", label: "Hair", icon: Scissors },
          { id: "body", label: "Body", icon: Activity },
          { id: "drip", label: "Drip", icon: Glasses },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg transition-all cursor-pointer ${
                isActive
                  ? "bg-white text-black font-black shadow-md"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
              }`}
            >
              <Icon size={13} />
              <span className="text-[11px] hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className="p-3.5 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 min-h-[140px]">
        {/* TAB 1: VIBE & GENDER */}
        {activeTab === "vibe" && (
          <div className="space-y-3 animate-in fade-in">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Choose Avatar Identity
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleGenderChange("male")}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                  config.gender === "male"
                    ? "bg-emerald-500/10 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white"
                }`}
              >
                <span className="text-base">👦</span>
                <span>Drip Guy (Male)</span>
              </button>

              <button
                type="button"
                onClick={() => handleGenderChange("female")}
                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-black transition-all cursor-pointer ${
                  config.gender === "female"
                    ? "bg-emerald-500/10 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white"
                }`}
              >
                <span className="text-base">👧</span>
                <span>Drip Girl (Female)</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: SKIN TONE PALETTE */}
        {activeTab === "skin" && (
          <div className="space-y-3 animate-in fade-in">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Select Skin Tone
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {SKIN_TONE_OPTIONS.map((st) => {
                const isSelected = config.skinTone === st.hex;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => onChange({ ...config, skinTone: st.hex })}
                    className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-zinc-800 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)] scale-102"
                        : "bg-zinc-900/80 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <span
                      className="w-7 h-7 rounded-full shadow-inner border border-white/20"
                      style={{ backgroundColor: st.hex }}
                    />
                    <span className="text-[10px] font-bold text-zinc-300 truncate w-full text-center">
                      {st.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: HAIR STYLE & DYE */}
        {activeTab === "hair" && (
          <div className="space-y-3.5 animate-in fade-in">
            {/* Hairstyle */}
            <div>
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                Hairstyle & Cut
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(isFemale
                  ? [
                      { id: "wolf_cut", label: "Wolf Cut / Shag" },
                      { id: "high_ponytail", label: "High Ponytail" },
                      { id: "bob_cut", label: "Bob Cut" },
                      { id: "messy_curls", label: "Messy Curls" },
                    ]
                  : [
                      { id: "textured_crop", label: "Textured Crop" },
                      { id: "middle_part", label: "Middle Part" },
                      { id: "messy_curls", label: "Messy Curls" },
                      { id: "buzz_cut", label: "Buzz Cut" },
                      { id: "fade", label: "Skin Fade" },
                    ]
                ).map((hs) => {
                  const isSelected = config.hairStyle === hs.id;
                  return (
                    <button
                      key={hs.id}
                      type="button"
                      onClick={() => onChange({ ...config, hairStyle: hs.id as AvatarHairStyle })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-white text-black font-black shadow-md"
                          : "bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800"
                      }`}
                    >
                      {hs.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hair Dye Color */}
            <div>
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                Hair Dye & Highlights
              </label>
              <div className="flex flex-wrap gap-2 items-center">
                {HAIR_COLOR_OPTIONS.map((hc) => {
                  const isSelected = config.hairColor === hc.hex;
                  return (
                    <button
                      key={hc.id}
                      type="button"
                      onClick={() => onChange({ ...config, hairColor: hc.hex })}
                      className={`h-7 w-7 rounded-full transition-transform cursor-pointer border ${
                        isSelected
                          ? "ring-2 ring-emerald-400 scale-110 border-white"
                          : "border-zinc-700 hover:scale-105"
                      }`}
                      style={{ backgroundColor: hc.hex }}
                      title={hc.name}
                    />
                  );
                })}
              </div>
            </div>

            {/* Facial Hair for Male */}
            {!isFemale && (
              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                  Beard & Stubble
                </label>
                <div className="flex gap-2">
                  {[
                    { id: "none", label: "Clean Shaved" },
                    { id: "stubble", label: "Stubble" },
                    { id: "goatee", label: "Goatee" },
                  ].map((fh) => {
                    const isSelected = (config.facialHair || "none") === fh.id;
                    return (
                      <button
                        key={fh.id}
                        type="button"
                        onClick={() => onChange({ ...config, facialHair: fh.id as any })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500"
                            : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
                        }`}
                      >
                        {fh.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: BODY BUILD */}
        {activeTab === "body" && (
          <div className="space-y-3 animate-in fade-in">
            <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
              Streetwear Silhouette & Proportions
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "boxy_oversized", label: "Boxy Oversized", sub: "Loose streetwear fit" },
                { id: "athletic", label: "Athletic Fit", sub: "Tapered shoulders" },
                { id: "slim", label: "Slim Drip", sub: "Lean contemporary" },
                { id: "regular", label: "Standard Regular", sub: "Everyday balance" },
              ].map((bb) => {
                const isSelected = config.bodyBuild === bb.id;
                return (
                  <button
                    key={bb.id}
                    type="button"
                    onClick={() => onChange({ ...config, bodyBuild: bb.id as AvatarBodyBuild })}
                    className={`flex flex-col text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-emerald-500/10 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                        : "bg-zinc-900 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <span className="text-xs font-black text-white">{bb.label}</span>
                    <span className="text-[10px] text-zinc-400 mt-0.5">{bb.sub}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: STREETWEAR ACCESSORIES / DRIP */}
        {activeTab === "drip" && (
          <div className="space-y-3.5 animate-in fade-in">
            {/* Shades */}
            <div>
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                Shades & Eyewear
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "none", label: "No Shades" },
                  { id: "cyber_shades", label: "Cyber Y2K Shades ⚡" },
                  { id: "retro_black", label: "Retro Dark Wayfarer" },
                ].map((ew) => {
                  const isSelected = (config.eyewear || "none") === ew.id;
                  return (
                    <button
                      key={ew.id}
                      type="button"
                      onClick={() => onChange({ ...config, eyewear: ew.id as AvatarEyewear })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500 font-black"
                          : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
                      }`}
                    >
                      {ew.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chains & Necklaces */}
            <div>
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                Chains & Jewelry
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: "none", label: "None" },
                  { id: "silver_chain", label: "Silver Cuban Link ⛓️" },
                  { id: "pearl_choker", label: "Pearl Strand" },
                ].map((ac) => {
                  const isSelected = (config.accessories || "none") === ac.id;
                  return (
                    <button
                      key={ac.id}
                      type="button"
                      onClick={() => onChange({ ...config, accessories: ac.id as AvatarAccessories })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500 font-black"
                          : "bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800"
                      }`}
                    >
                      {ac.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
