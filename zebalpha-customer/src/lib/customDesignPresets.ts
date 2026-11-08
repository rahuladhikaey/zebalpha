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

export const ADMIN_PRESET_DESIGNS: PresetDesign[] = [
  {
    id: "genz-01",
    title: "NEO TOKYO 2099",
    category: "genz",
    imageUrl: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80",
    fileSizeKb: 18.5,
    recommendedGarmentColor: "Jet Black",
    placement: "front_chest",
    description: "Cyberpunk dystopian glowing aesthetic typography with glitch accents.",
    tags: ["Cyberpunk", "Neon", "Glitch", "Streetwear"],
    isActive: true,
  },
  {
    id: "bengali-01",
    title: "কলকাতা মেলোডি (Kolkata Melody)",
    category: "bengali",
    imageUrl: "https://images.unsplash.com/photo-1582560475093-ba66accbc424?w=800&auto=format&fit=crop&q=80",
    fileSizeKb: 19.2,
    recommendedGarmentColor: "Vintage Beige",
    placement: "front_chest",
    description: "Traditional Bengali calligraphy blended with vintage yellow taxi and street art.",
    tags: ["Bangla", "Kolkata", "Art", "Culture", "Handmade"],
    isActive: true,
  },
  {
    id: "anime-01",
    title: "DEMON SLAYER BLADE",
    category: "anime",
    imageUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80",
    fileSizeKb: 17.8,
    recommendedGarmentColor: "Jet Black",
    placement: "front_chest",
    description: "High-contrast Japanese manga flame warrior katana illustration.",
    tags: ["Anime", "Manga", "Japanese", "Warrior"],
    isActive: true,
  },
  {
    id: "streetwear-01",
    title: "OVERTHINKING CLUB",
    category: "streetwear",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
    fileSizeKb: 16.4,
    recommendedGarmentColor: "Off-White",
    placement: "front_chest",
    description: "Modern raw acid-wash typography design with distressed grunge texturing.",
    tags: ["Streetwear", "Minimal", "Acid Wash", "Heavyweight"],
    isActive: true,
  },
  {
    id: "bengali-02",
    title: "একলা চলো রে (Ekla Cholo Re)",
    category: "bengali",
    imageUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80",
    fileSizeKb: 18.9,
    recommendedGarmentColor: "Forest Green",
    placement: "front_chest",
    description: "Iconic Rabindranath Tagore inspired lyrical calligraphy in gold & white.",
    tags: ["Bangla", "Poetry", "Tagore", "Calligraphy"],
    isActive: true,
  },
  {
    id: "anime-02",
    title: "CYBER MECHA EVANGELION",
    category: "anime",
    imageUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80",
    fileSizeKb: 19.5,
    recommendedGarmentColor: "Royal Navy",
    placement: "full_front",
    description: "Futuristic mecha robot portrait with purple & green neon vector accents.",
    tags: ["Mecha", "Anime", "Sci-Fi", "Vector"],
    isActive: true,
  },
  {
    id: "genz-02",
    title: "NO SIGNAL // 404 REALITY",
    category: "genz",
    imageUrl: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&auto=format&fit=crop&q=80",
    fileSizeKb: 19.1,
    recommendedGarmentColor: "Jet Black",
    placement: "front_chest",
    description: "Retro CRT television static noise with bold vaporwave aesthetic lettering.",
    tags: ["Glitch", "Retro", "Vaporwave", "GenZ"],
    isActive: true,
  },
  {
    id: "minimal-01",
    title: "ZEBALPHA ARCHIVE ✦ 01",
    category: "minimal",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
    fileSizeKb: 14.8,
    recommendedGarmentColor: "Maroon Crimson",
    placement: "pocket",
    description: "Subtle architectural luxury badge suitable for front pocket or chest placement.",
    tags: ["Minimal", "Badge", "Luxury", "Clean"],
    isActive: true,
  },
];
