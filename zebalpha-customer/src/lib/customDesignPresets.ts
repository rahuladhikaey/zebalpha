export interface ApparelBaseConfig {
  id: string;
  name: string;
  gsm: string;
  basePrice: number;
  badge?: string;
  description?: string;
  availableSizes?: string[];
  isActive: boolean;
}

export interface PresetDesign {
  id: string;
  title: string;
  category: "anime" | "bengali" | "genz" | "streetwear" | "minimal" | string;
  imageUrl: string;
  fileSizeKb?: number;
  recommendedGarmentColor: string;
  placement?: string;
  description: string;
  tags?: string[];
  isActive?: boolean;
}

export const PRESET_CATEGORIES = [
  { id: "all", label: "All Artworks" },
  { id: "genz", label: "⚡ Gen-Z & Cyberpunk" },
  { id: "anime", label: "🎌 Anime & Manga" },
  { id: "bengali", label: "🎨 Bengali Typography & Folk" },
  { id: "streetwear", label: "🔥 Streetwear Graphics" },
  { id: "minimal", label: "✦ Minimalist Badges" },
] as const;

export const DEFAULT_APPAREL_BASES: ApparelBaseConfig[] = [
  {
    id: "oversized_tee",
    name: "Oversized Heavy Tee",
    gsm: "240 GSM",
    basePrice: 799,
    badge: "POPULAR",
    description: "100% Combed Heavy Cotton with dense 240 GSM structured drop-shoulder drape.",
    availableSizes: ["S", "M", "L", "XL", "XXL"],
    isActive: true,
  },
  {
    id: "hoodie",
    name: "Streetwear Fleece Hoodie",
    gsm: "380 GSM",
    basePrice: 1499,
    badge: "WINTER",
    description: "380 GSM ultra-heavy brushed cotton fleece with double-lined thermal hood.",
    availableSizes: ["M", "L", "XL", "XXL"],
    isActive: true,
  },
  {
    id: "standard_tee",
    name: "Classic Combed Cotton Tee",
    gsm: "190 GSM",
    basePrice: 499,
    badge: "DAILY",
    description: "190 GSM breathable ring-spun combed cotton for lightweight daily comfort.",
    availableSizes: ["XS", "S", "M", "L", "XL", "XXL"],
    isActive: true,
  },
  {
    id: "tote_bag",
    name: "Heavy Canvas Tote Bag",
    gsm: "340 GSM",
    basePrice: 399,
    badge: "ECO",
    description: "340 GSM premium organic raw canvas with cross-stitched durable shoulder straps.",
    availableSizes: ["Standard"],
    isActive: true,
  },
];

export const ADMIN_PRESET_DESIGNS: PresetDesign[] = [];
