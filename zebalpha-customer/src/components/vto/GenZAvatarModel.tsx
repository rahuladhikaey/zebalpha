"use client";

import React from "react";
import Image from "next/image";

export type AvatarGender = "male" | "female";
export type AvatarSkinTone = "#fce0d2" | "#e8b898" | "#c68652" | "#9e5c32" | "#66391d" | "#2b170c";
export type AvatarHairStyle =
  | "textured_crop"
  | "middle_part"
  | "messy_curls"
  | "buzz_cut"
  | "wolf_cut"
  | "high_ponytail"
  | "bob_cut"
  | "fade";
export type AvatarBodyBuild = "slim" | "athletic" | "boxy_oversized" | "regular";
export type AvatarEyewear = "none" | "cyber_shades" | "y2k_wire" | "retro_black";
export type AvatarAccessories = "none" | "silver_chain" | "pearl_choker" | "ear_cuff";

export interface AvatarConfig {
  gender: AvatarGender;
  skinTone: string;
  hairStyle: AvatarHairStyle;
  hairColor: string;
  facialHair?: "none" | "stubble" | "goatee";
  bodyBuild: AvatarBodyBuild;
  eyewear?: AvatarEyewear;
  accessories?: AvatarAccessories;
}

export const DEFAULT_MALE_AVATAR: AvatarConfig = {
  gender: "male",
  skinTone: "#c68652",
  hairStyle: "textured_crop",
  hairColor: "#18181b",
  facialHair: "stubble",
  bodyBuild: "boxy_oversized",
  eyewear: "cyber_shades",
  accessories: "silver_chain",
};

export const DEFAULT_FEMALE_AVATAR: AvatarConfig = {
  gender: "female",
  skinTone: "#e8b898",
  hairStyle: "wolf_cut",
  hairColor: "#18181b",
  bodyBuild: "athletic",
  eyewear: "retro_black",
  accessories: "pearl_choker",
};

export const SKIN_TONE_OPTIONS: { id: string; name: string; hex: string }[] = [
  { id: "fair_ivory", name: "Ivory", hex: "#fce0d2" },
  { id: "warm_wheat", name: "Warm Wheat", hex: "#e8b898" },
  { id: "honey_dusk", name: "Honey Dusky", hex: "#c68652" },
  { id: "rich_bronze", name: "Rich Bronze", hex: "#9e5c32" },
  { id: "deep_mocha", name: "Deep Mocha", hex: "#66391d" },
  { id: "obsidian", name: "Obsidian", hex: "#2b170c" },
];

export const HAIR_COLOR_OPTIONS: { id: string; name: string; hex: string }[] = [
  { id: "jet_black", name: "Jet Black", hex: "#18181b" },
  { id: "ash_brown", name: "Ash Brown", hex: "#451a03" },
  { id: "platinum_blonde", name: "Platinum", hex: "#e0e7ff" },
  { id: "cyber_mint", name: "Cyber Mint", hex: "#10b981" },
  { id: "hot_pink", name: "Neon Pink", hex: "#ec4899" },
  { id: "midnight_blue", name: "Cobalt Blue", hex: "#2563eb" },
];

interface GenZAvatarModelProps {
  config: AvatarConfig;
  garmentImageUrl?: string;
  garmentCategory?: string;
  garmentColorHex?: string;
  garmentName?: string;
  activeSize?: string;
  pose?: "street_front" | "fit_check_swag" | "side_profile";
  className?: string;
}

export function GenZAvatarModel({
  config,
  garmentImageUrl = "",
  garmentCategory = "upper_body",
  garmentColorHex = "",
  garmentName = "",
  activeSize = "M",
  className = "",
}: GenZAvatarModelProps) {
  const isFemale = config.gender === "female";
  const skin = config.skinTone || (isFemale ? "#e8b898" : "#c68652");
  const hair = config.hairColor || "#18181b";

  // Build multiplier for streetwear silhouette
  const isBoxy = config.bodyBuild === "boxy_oversized";
  const isAthletic = config.bodyBuild === "athletic";
  const isSlim = config.bodyBuild === "slim";

  const shoulderWidth = isBoxy ? 154 : isAthletic ? 144 : isSlim ? 124 : 134;
  const torsoWidth = isBoxy ? 138 : isAthletic ? 126 : isSlim ? 108 : 118;
  const sizeScale = activeSize === "XS" ? 0.94 : activeSize === "S" ? 0.97 : activeSize === "XL" || activeSize === "XXL" ? 1.07 : 1.0;

  // Determine if active product is Footwear vs Apparel
  const isFootwear =
    garmentCategory.includes("footwear") ||
    garmentCategory.includes("shoe") ||
    garmentName.toLowerCase().includes("crocs") ||
    garmentName.toLowerCase().includes("shoe") ||
    garmentName.toLowerCase().includes("sandal");

  const isDresses = garmentCategory.includes("dress") || garmentName.toLowerCase().includes("dress");
  const isBottomwear =
    garmentCategory.includes("lower") ||
    garmentCategory.includes("pant") ||
    garmentName.toLowerCase().includes("jean") ||
    garmentName.toLowerCase().includes("pant") ||
    garmentName.toLowerCase().includes("cargo");

  return (
    <div className={`relative w-full h-full flex flex-col items-center justify-center select-none overflow-hidden ${className}`}>
      {/* Background Cyber Ambient Glow */}
      <div className="absolute inset-0 bg-radial from-emerald-500/10 via-black to-black pointer-events-none" />

      {/* Cyber Grid Base Line */}
      <div className="absolute bottom-6 w-52 h-10 rounded-[100%] bg-emerald-500/15 blur-xl pointer-events-none" />
      <div className="absolute bottom-5 w-44 h-4 rounded-[100%] border border-emerald-500/30 bg-zinc-950/80 shadow-[0_0_20px_rgba(16,185,129,0.3)] pointer-events-none" />

      {/* SVG Streetwear Avatar Character Vector */}
      <svg
        viewBox="0 0 320 520"
        className="w-full h-full max-h-[58vh] sm:max-h-[64vh] object-contain drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)] z-10"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Streetwear Shadow Gradient */}
          <linearGradient id="bodyShade" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.25" />
          </linearGradient>

          {/* Garment Fallback Tint */}
          <linearGradient id="garmentTint" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={garmentColorHex || "#18181b"} />
            <stop offset="100%" stopColor="#09090b" />
          </linearGradient>

          {/* Cyber Shades Glass */}
          <linearGradient id="shadesGlass" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.85" />
          </linearGradient>

          {/* Silver Chain Gradient */}
          <linearGradient id="silverChain" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="50%" stopColor="#94a3b8" />
            <stop offset="100%" stopColor="#f8fafc" />
          </linearGradient>
        </defs>

        {/* 1. LOWER BODY: Legs / Streetwear Cargo / Baggy Pants */}
        <g id="legs-and-pants">
          {/* Upper Thighs Shadow Base */}
          <rect x={160 - torsoWidth * 0.42} y="280" width={torsoWidth * 0.84} height="40" rx="8" fill="#18181b" />

          {/* Left Leg (Baggy Streetwear Denim/Cargo) */}
          <path
            d={`M ${160 - torsoWidth * 0.42} 295 L ${160 - torsoWidth * 0.48} 440 L ${160 - torsoWidth * 0.12} 440 L ${160 - 8} 310 Z`}
            fill={isBottomwear && garmentColorHex ? garmentColorHex : "#1a1a22"}
            stroke="#27272a"
            strokeWidth="1.5"
          />
          {/* Right Leg */}
          <path
            d={`M ${160 + 8} 310 L ${160 + torsoWidth * 0.12} 440 L ${160 + torsoWidth * 0.48} 440 L ${160 + torsoWidth * 0.42} 295 Z`}
            fill={isBottomwear && garmentColorHex ? garmentColorHex : "#1e1e28"}
            stroke="#27272a"
            strokeWidth="1.5"
          />

          {/* Cargo Pocket Accents */}
          <rect x={160 - torsoWidth * 0.46} y="345" width="22" height="28" rx="4" fill="#121216" stroke="#2c2c34" strokeWidth="1" />
          <rect x={160 + torsoWidth * 0.46 - 22} y="345" width="22" height="28" rx="4" fill="#121216" stroke="#2c2c34" strokeWidth="1" />
        </g>

        {/* 2. FOOTWEAR (Crocs / High-Top Kicks) */}
        <g id="footwear">
          {/* Left Shoe */}
          <g transform="translate(102, 436)">
            {isFootwear ? (
              // Crocs / Streetwear Clogs Silhouette
              <path
                d="M 5 18 C 5 8, 22 4, 38 4 C 48 4, 55 12, 53 24 L 2 24 C 0 24, 2 20, 5 18 Z"
                fill={garmentColorHex || "#10b981"}
                stroke="#059669"
                strokeWidth="1.5"
              />
            ) : (
              // Chunky Sneaker
              <path
                d="M 4 20 C 4 10, 18 6, 36 6 C 46 6, 52 14, 50 24 L 0 24 Z"
                fill="#ffffff"
                stroke="#3f3f46"
                strokeWidth="1.5"
              />
            )}
            <rect x="0" y="22" width="54" height="6" rx="3" fill="#09090b" />
          </g>

          {/* Right Shoe */}
          <g transform="translate(164, 436)">
            {isFootwear ? (
              <path
                d="M 2 24 C 0 12, 7 4, 17 4 C 33 4, 50 8, 50 18 C 53 20, 55 24, 53 24 Z"
                fill={garmentColorHex || "#10b981"}
                stroke="#059669"
                strokeWidth="1.5"
              />
            ) : (
              <path
                d="M 2 24 C 0 14, 6 6, 16 6 C 34 6, 48 10, 48 20 L 52 24 Z"
                fill="#ffffff"
                stroke="#3f3f46"
                strokeWidth="1.5"
              />
            )}
            <rect x="0" y="22" width="54" height="6" rx="3" fill="#09090b" />
          </g>
        </g>

        {/* 3. ARMS & HANDS (Behind or Alongside Garment) */}
        <g id="arms">
          {/* Left Arm */}
          <path
            d={`M ${160 - shoulderWidth * 0.5} 150 L ${160 - shoulderWidth * 0.65} 250 L ${160 - shoulderWidth * 0.52} 280 L ${160 - shoulderWidth * 0.4} 200 Z`}
            fill={skin}
          />
          {/* Left Hand */}
          <circle cx={160 - shoulderWidth * 0.54} cy="290" r="10" fill={skin} />

          {/* Right Arm */}
          <path
            d={`M ${160 + shoulderWidth * 0.5} 150 L ${160 + shoulderWidth * 0.65} 250 L ${160 + shoulderWidth * 0.52} 280 L ${160 + shoulderWidth * 0.4} 200 Z`}
            fill={skin}
          />
          {/* Right Hand */}
          <circle cx={160 + shoulderWidth * 0.54} cy="290" r="10" fill={skin} />
        </g>

        {/* 4. TORSO & UPPER BODY GARMENT DRAPE */}
        <g id="torso-garment">
          {/* Base Torso Silhouette */}
          <path
            d={`M ${160 - shoulderWidth * 0.5 * sizeScale} 145 
                Q 160 155 ${160 + shoulderWidth * 0.5 * sizeScale} 145 
                L ${160 + torsoWidth * 0.5 * sizeScale} ${isDresses ? 360 : 285} 
                L ${160 - torsoWidth * 0.5 * sizeScale} ${isDresses ? 360 : 285} Z`}
            fill="url(#garmentTint)"
            stroke="#27272a"
            strokeWidth="1.5"
          />

          {/* Garment Sleeves */}
          <path
            d={`M ${160 - shoulderWidth * 0.5 * sizeScale} 145 
                L ${160 - shoulderWidth * 0.68 * sizeScale} 210 
                L ${160 - shoulderWidth * 0.46 * sizeScale} 218 
                L ${160 - shoulderWidth * 0.38 * sizeScale} 165 Z`}
            fill={garmentColorHex || "#18181b"}
            stroke="#27272a"
            strokeWidth="1"
          />
          <path
            d={`M ${160 + shoulderWidth * 0.5 * sizeScale} 145 
                L ${160 + shoulderWidth * 0.68 * sizeScale} 210 
                L ${160 + shoulderWidth * 0.46 * sizeScale} 218 
                L ${160 + shoulderWidth * 0.38 * sizeScale} 165 Z`}
            fill={garmentColorHex || "#18181b"}
            stroke="#27272a"
            strokeWidth="1"
          />

          {/* Real Garment Graphic Texture Overlay */}
          {garmentImageUrl && !isFootwear && (
            <g clipPath="url(#garmentClip)">
              <foreignObject
                x={160 - torsoWidth * 0.42 * sizeScale}
                y={170}
                width={torsoWidth * 0.84 * sizeScale}
                height={100 * sizeScale}
              >
                <div className="w-full h-full flex items-center justify-center p-1">
                  <div className="relative w-full h-full rounded-lg overflow-hidden opacity-90 mix-blend-screen">
                    <Image
                      src={garmentImageUrl}
                      alt={garmentName || "Product Drape"}
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                </div>
              </foreignObject>
            </g>
          )}

          {/* Neck Ribbing / Collar */}
          <path
            d="M 144 146 Q 160 162 176 146 Q 160 152 144 146 Z"
            fill="#0d0d11"
            stroke="#27272a"
            strokeWidth="1.5"
          />
        </g>

        {/* 5. NECK & HEAD */}
        <g id="neck-and-head">
          {/* Neck */}
          <rect x="148" y="118" width="24" height="32" rx="4" fill={skin} />

          {/* Jaw / Head Shape */}
          <path
            d={
              isFemale
                ? "M 136 78 C 136 50, 184 50, 184 78 C 184 105, 172 126, 160 126 C 148 126, 136 105, 136 78 Z"
                : "M 134 76 C 134 48, 186 48, 186 76 C 186 105, 175 128, 160 128 C 145 128, 134 105, 134 76 Z"
            }
            fill={skin}
            stroke="#1a1a1a"
            strokeWidth="1"
          />

          {/* Facial Shadow & Contour */}
          <path d="M 158 92 L 156 102 L 164 102 Z" fill="#000000" opacity="0.12" />

          {/* Lips */}
          <path
            d="M 152 110 Q 160 114 168 110"
            stroke={isFemale ? "#e11d48" : "#991b1b"}
            strokeWidth={isFemale ? "2" : "1.5"}
            strokeLinecap="round"
            fill="none"
          />

          {/* Stubble / Facial Hair for Male */}
          {!isFemale && config.facialHair === "stubble" && (
            <path
              d="M 142 98 C 142 122, 178 122, 178 98 C 174 125, 146 125, 142 98 Z"
              fill="#18181b"
              opacity="0.35"
            />
          )}
          {!isFemale && config.facialHair === "goatee" && (
            <path d="M 154 106 Q 160 118 166 106 Q 160 126 154 106 Z" fill="#18181b" opacity="0.8" />
          )}

          {/* Eyes & Eyebrows */}
          <ellipse cx="148" cy="88" rx="4" ry="2.5" fill="#18181b" />
          <ellipse cx="172" cy="88" rx="4" ry="2.5" fill="#18181b" />
          <circle cx="149" cy="87.5" r="1" fill="#ffffff" />
          <circle cx="173" cy="87.5" r="1" fill="#ffffff" />
          <path d="M 143 82 Q 148 79 154 82" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M 166 82 Q 172 79 177 82" stroke="#18181b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </g>

        {/* 6. GEN-Z HAIRSTYLE */}
        <g id="hair">
          {config.hairStyle === "textured_crop" && (
            <path
              d="M 132 72 C 130 38, 190 38, 188 72 C 180 58, 140 58, 132 72 Z 
                 M 134 62 Q 160 48 186 62 Q 160 55 134 62 Z"
              fill={hair}
            />
          )}

          {config.hairStyle === "middle_part" && (
            <g fill={hair}>
              <path d="M 130 76 C 128 42, 158 40, 160 58 C 156 50, 136 50, 134 76 Z" />
              <path d="M 190 76 C 192 42, 162 40, 160 58 C 164 50, 184 50, 186 76 Z" />
            </g>
          )}

          {config.hairStyle === "messy_curls" && (
            <g fill={hair}>
              <circle cx="145" cy="54" r="14" />
              <circle cx="160" cy="48" r="15" />
              <circle cx="175" cy="54" r="14" />
              <circle cx="135" cy="65" r="10" />
              <circle cx="185" cy="65" r="10" />
            </g>
          )}

          {config.hairStyle === "buzz_cut" && (
            <path
              d="M 134 74 C 132 46, 188 46, 186 74 C 180 62, 140 62, 134 74 Z"
              fill={hair}
              opacity="0.85"
            />
          )}

          {config.hairStyle === "wolf_cut" && (
            <g fill={hair}>
              <path d="M 128 78 C 124 38, 196 38, 192 78 C 185 60, 135 60, 128 78 Z" />
              <path d="M 126 78 L 122 130 L 134 105 Z" />
              <path d="M 194 78 L 198 130 L 186 105 Z" />
            </g>
          )}

          {config.hairStyle === "high_ponytail" && (
            <g fill={hair}>
              <path d="M 132 74 C 130 42, 190 42, 188 74 C 180 60, 140 60, 132 74 Z" />
              {/* Top Bun / Ponytail */}
              <circle cx="160" cy="36" r="14" />
              <path d="M 160 36 C 185 36, 195 65, 192 105 L 182 105 C 184 75, 175 48, 160 36 Z" />
            </g>
          )}

          {config.hairStyle === "bob_cut" && (
            <path
              d="M 126 80 C 122 40, 198 40, 194 80 L 196 115 L 182 110 L 184 75 C 175 62, 145 62, 136 75 L 138 110 L 124 115 Z"
              fill={hair}
            />
          )}

          {config.hairStyle === "fade" && (
            <path
              d="M 135 72 C 134 46, 186 46, 185 72 C 180 60, 140 60, 135 72 Z"
              fill={hair}
            />
          )}
        </g>

        {/* 7. STREETWEAR ACCESSORIES (Chains & Shades) */}
        <g id="accessories">
          {/* Silver Cuban Chain */}
          {config.accessories === "silver_chain" && (
            <path
              d="M 144 148 Q 160 178 176 148"
              fill="none"
              stroke="url(#silverChain)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray="4 2"
            />
          )}
          {config.accessories === "pearl_choker" && (
            <path
              d="M 146 142 Q 160 158 174 142"
              fill="none"
              stroke="#f8fafc"
              strokeWidth="3"
              strokeDasharray="3 3"
            />
          )}

          {/* Cyber Y2K Shades */}
          {config.eyewear === "cyber_shades" && (
            <g transform="translate(132, 79)">
              <rect x="0" y="2" width="56" height="15" rx="7" fill="url(#shadesGlass)" stroke="#18181b" strokeWidth="1.5" />
              <line x1="26" y1="9" x2="30" y2="9" stroke="#18181b" strokeWidth="2" />
              <line x1="6" y1="5" x2="22" y2="5" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.7" />
              <line x1="34" y1="5" x2="50" y2="5" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.7" />
            </g>
          )}

          {config.eyewear === "retro_black" && (
            <g transform="translate(133, 79)">
              <rect x="0" y="2" width="24" height="14" rx="3" fill="#09090b" stroke="#ffffff" strokeWidth="1" />
              <rect x="30" y="2" width="24" height="14" rx="3" fill="#09090b" stroke="#ffffff" strokeWidth="1" />
              <line x1="24" y1="7" x2="30" y2="7" stroke="#ffffff" strokeWidth="1.5" />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
}

