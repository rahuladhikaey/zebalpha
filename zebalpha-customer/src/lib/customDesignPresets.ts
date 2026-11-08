export interface PresetDesign {
  id: string;
  title: string;
  category: "anime" | "bengali" | "genz" | "streetwear" | "minimal";
  imageUrl: string;
  recommendedGarmentColor: string;
  description: string;
  tags: string[];
}

export const PRESET_CATEGORIES = [
  { id: "all", label: "All Artworks" },
  { id: "genz", label: "⚡ Gen-Z & Cyberpunk" },
  { id: "anime", label: "🎌 Anime & Manga" },
  { id: "bengali", label: "🎨 Bengali Typography & Folk" },
  { id: "streetwear", label: "🔥 Streetwear Graphics" },
  { id: "minimal", label: "✦ Minimalist Badges" },
] as const;

export const ADMIN_PRESET_DESIGNS: PresetDesign[] = [
  {
    id: "genz-01",
    title: "NEO TOKYO 2099",
    category: "genz",
    imageUrl: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80",
    recommendedGarmentColor: "Jet Black",
    description: "Cyberpunk dystopian glowing aesthetic typography with glitch accents.",
    tags: ["Cyberpunk", "Neon", "Glitch", "Streetwear"],
  },
  {
    id: "bengali-01",
    title: "কলকাতা মেলোডি (Kolkata Melody)",
    category: "bengali",
    imageUrl: "https://images.unsplash.com/photo-1582560475093-ba66accbc424?w=800&auto=format&fit=crop&q=80",
    recommendedGarmentColor: "Vintage Beige",
    description: "Traditional Bengali calligraphy blended with vintage yellow taxi and street art.",
    tags: ["Bangla", "Kolkata", "Art", "Culture", "Handmade"],
  },
  {
    id: "anime-01",
    title: "DEMON SLAYER BLADE",
    category: "anime",
    imageUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800&auto=format&fit=crop&q=80",
    recommendedGarmentColor: "Jet Black",
    description: "High-contrast Japanese manga flame warrior katana illustration.",
    tags: ["Anime", "Manga", "Japanese", "Warrior"],
  },
  {
    id: "streetwear-01",
    title: "OVERTHINKING CLUB",
    category: "streetwear",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
    recommendedGarmentColor: "Off-White",
    description: "Modern raw acid-wash typography design with distressed grunge texturing.",
    tags: ["Streetwear", "Minimal", "Acid Wash", "Heavyweight"],
  },
  {
    id: "bengali-02",
    title: "একলা চলো রে (Ekla Cholo Re)",
    category: "bengali",
    imageUrl: "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=800&auto=format&fit=crop&q=80",
    recommendedGarmentColor: "Forest Green",
    description: "Iconic Rabindranath Tagore inspired lyrical calligraphy in gold & white.",
    tags: ["Bangla", "Poetry", "Tagore", "Calligraphy"],
  },
  {
    id: "anime-02",
    title: "CYBER MECHA EVANGELION",
    category: "anime",
    imageUrl: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=800&auto=format&fit=crop&q=80",
    recommendedGarmentColor: "Royal Navy",
    description: "Futuristic mecha robot portrait with purple & green neon vector accents.",
    tags: ["Mecha", "Anime", "Sci-Fi", "Vector"],
  },
  {
    id: "genz-02",
    title: "NO SIGNAL // 404 REALITY",
    category: "genz",
    imageUrl: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&auto=format&fit=crop&q=80",
    recommendedGarmentColor: "Jet Black",
    description: "Retro CRT television static noise with bold vaporwave aesthetic lettering.",
    tags: ["Glitch", "Retro", "Vaporwave", "GenZ"],
  },
  {
    id: "minimal-01",
    title: "ZEBALPHA ARCHIVE ✦ 01",
    category: "minimal",
    imageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
    recommendedGarmentColor: "Maroon",
    description: "Subtle architectural luxury badge suitable for front pocket or chest placement.",
    tags: ["Minimal", "Badge", "Luxury", "Clean"],
  },
];
