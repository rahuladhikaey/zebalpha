export const ZEB_QUICK_SLA_HOURS = 6;
export const ZEB_QUICK_SLA_LABEL = "5–6 Hours";
export const ZEB_QUICK_DEFAULT_CORRIDOR = "Sealdah-Krishnanagar";
export const ZEB_QUICK_DELIVERY_FEE = 29;
export const ZEB_QUICK_FREE_DELIVERY_MIN = 399;

export interface ZebQuickSubcategoryDef {
  slug: string;
  name: string;
  categoryGroup:
    | "Women's Innerwear"
    | "Men's Innerwear"
    | "Men's Dailywear"
    | "Fashion Accessories"
    | "Everyday Essentials";
  keywords: string[];
}

export const ZEB_QUICK_ALLOWED_SUBCATEGORIES: ZebQuickSubcategoryDef[] = [
  // 1. Women's Innerwear
  { slug: "bras", name: "Bras", categoryGroup: "Women's Innerwear", keywords: ["bra", "bras", "sports bra", "padded bra", "t-shirt bra"] },
  { slug: "panties", name: "Panties", categoryGroup: "Women's Innerwear", keywords: ["panty", "panties", "briefs women", "hipster"] },
  { slug: "camisoles", name: "Camisoles", categoryGroup: "Women's Innerwear", keywords: ["camisole", "camisoles", "spaghetti"] },
  { slug: "slips", name: "Slips", categoryGroup: "Women's Innerwear", keywords: ["slips", "inner slip", "petticoat", "underskirt", "saree slip"] },
  { slug: "womens-shorts", name: "Women's Shorts", categoryGroup: "Women's Innerwear", keywords: ["women shorts", "women's shorts", "cycling shorts", "boyshorts"] },
  { slug: "shapewear", name: "Shapewear", categoryGroup: "Women's Innerwear", keywords: ["shapewear", "tummy tucker", "body shaper"] },

  // 2. Men's Innerwear
  { slug: "mens-underwear", name: "Men's Underwear", categoryGroup: "Men's Innerwear", keywords: ["men's underwear", "mens underwear", "underwear"] },
  { slug: "vest-sando-ganji", name: "Vest / Sando Ganji", categoryGroup: "Men's Innerwear", keywords: ["vest", "sando", "ganji", "baniyan", "gym vest"] },
  { slug: "boxer-shorts", name: "Boxer Shorts", categoryGroup: "Men's Innerwear", keywords: ["boxer", "boxers", "boxer shorts"] },
  { slug: "trunks", name: "Trunks", categoryGroup: "Men's Innerwear", keywords: ["trunk", "trunks"] },
  { slug: "briefs", name: "Briefs", categoryGroup: "Men's Innerwear", keywords: ["brief", "briefs"] },

  // 3. Men's Dailywear
  { slug: "bermudas", name: "Bermudas", categoryGroup: "Men's Dailywear", keywords: ["bermuda", "bermudas"] },
  { slug: "sports-pants", name: "Sports Pants", categoryGroup: "Men's Dailywear", keywords: ["sports pant", "sports pants", "jogger", "joggers"] },
  { slug: "track-pants", name: "Track Pants", categoryGroup: "Men's Dailywear", keywords: ["track pant", "track pants", "trackpant"] },
  { slug: "lounge-pants", name: "Lounge Pants", categoryGroup: "Men's Dailywear", keywords: ["lounge pant", "lounge pants", "pyjama", "pajama"] },
  { slug: "mens-shorts", name: "Shorts", categoryGroup: "Men's Dailywear", keywords: ["shorts", "cotton shorts", "chino shorts"] },

  // 4. Fashion Accessories
  { slug: "belts", name: "Belts", categoryGroup: "Fashion Accessories", keywords: ["belt", "belts", "leather belt"] },
  { slug: "money-purses", name: "Money Purses", categoryGroup: "Fashion Accessories", keywords: ["money purse", "purse", "coin purse"] },
  { slug: "wallets", name: "Wallets", categoryGroup: "Fashion Accessories", keywords: ["wallet", "wallets", "bifold"] },
  { slug: "card-holders", name: "Card Holders", categoryGroup: "Fashion Accessories", keywords: ["card holder", "card holders", "card case"] },
  { slug: "keychains", name: "Keychains", categoryGroup: "Fashion Accessories", keywords: ["keychain", "keychains", "key ring"] },

  // 5. Everyday Essentials
  { slug: "socks", name: "Socks", categoryGroup: "Everyday Essentials", keywords: ["sock", "socks", "ankle socks", "crew socks"] },
  { slug: "handkerchief", name: "Handkerchief", categoryGroup: "Everyday Essentials", keywords: ["handkerchief", "hanky", "rumal", "handkerchiefs"] },
  { slug: "nightwear", name: "Nightwear", categoryGroup: "Everyday Essentials", keywords: ["nightwear", "nighty", "night suit", "sleepwear", "nightdress"] },
];

export const ZEB_QUICK_CATEGORY_GROUPS = [
  "Women's Innerwear",
  "Men's Innerwear",
  "Men's Dailywear",
  "Fashion Accessories",
  "Everyday Essentials",
] as const;

export interface ZebQuickPincodeSeed {
  pincode: string;
  areaName: string;
  city: string;
  corridorName: string;
}

export const ZEB_QUICK_INITIAL_PINCODES: ZebQuickPincodeSeed[] = [
  { pincode: "700014", areaName: "Sealdah / Entally", city: "Kolkata", corridorName: ZEB_QUICK_DEFAULT_CORRIDOR },
  { pincode: "700009", areaName: "Sealdah / Amherst Street", city: "Kolkata", corridorName: ZEB_QUICK_DEFAULT_CORRIDOR },
  { pincode: "700004", areaName: "Shyambazar / Bidhan Sarani", city: "Kolkata", corridorName: ZEB_QUICK_DEFAULT_CORRIDOR },
  { pincode: "700028", areaName: "Dum Dum", city: "Kolkata", corridorName: ZEB_QUICK_DEFAULT_CORRIDOR },
  { pincode: "700030", areaName: "Dum Dum / Sinthi", city: "Kolkata", corridorName: ZEB_QUICK_DEFAULT_CORRIDOR },
  { pincode: "700050", areaName: "Sinthee / Baranagar", city: "Kolkata", corridorName: ZEB_QUICK_DEFAULT_CORRIDOR },
  { pincode: "700074", areaName: "Dum Dum Cantonment", city: "Kolkata", corridorName: ZEB_QUICK_DEFAULT_CORRIDOR },
  { pincode: "700056", areaName: "Belghoria / Agarpara", city: "North 24 Parganas", corridorName: ZEB_QUICK_DEFAULT_CORRIDOR },
  { pincode: "700110", areaName: "Sodepur", city: "North 24 Parganas", corridorName: ZEB_QUICK_DEFAULT_CORRIDOR },
  { pincode: "700114", areaName: "Sodepur / Panihati", city: "North 24 Parganas", corridorName: ZEB_QUICK_DEFAULT_CORRIDOR },
  { pincode: "700115", areaName: "Khardah", city: "North 24 Parganas", corridorName: ZEB_QUICK_DEFAULT_CORRIDOR },
  { pincode: "700118", areaName: "Titagarh / Barrackpore", city: "North 24 Parganas", corridorName: ZEB_QUICK_DEFAULT_CORRIDOR },
  { pincode: "700120", areaName: "Barrackpore", city: "North 24 Parganas", corridorName: ZEB_QUICK_DEFAULT_CORRIDOR },
  { pincode: "700122", areaName: "Barrackpore / Palta", city: "North 24 Parganas", corridorName: ZEB_QUICK_DEFAULT_CORRIDOR },
  { pincode: "700123", areaName: "Ichapur", city: "North 24 Parganas", corridorName: ZEB_QUICK_DEFAULT_CORRIDOR },
  { pincode: "743144", areaName: "Shyamnagar", city: "North 24 Parganas", corridorName: ZEB_QUICK_DEFAULT_CORRIDOR },
  { pincode: "743132", areaName: "Jagaddal / Kankinara", city: "North 24 Parganas", corridorName: ZEB_QUICK_DEFAULT_CORRIDOR },
  { pincode: "743165", areaName: "Naihati", city: "North 24 Parganas", corridorName: ZEB_QUICK_DEFAULT_CORRIDOR },
  { pincode: "743166", areaName: "Halisahar", city: "North 24 Parganas", corridorName: ZEB_QUICK_DEFAULT_CORRIDOR },
  { pincode: "741235", areaName: "Kalyani", city: "Nadia", corridorName: ZEB_QUICK_DEFAULT_CORRIDOR },
  { pincode: "741245", areaName: "Kalyani / Gayeshpur", city: "Nadia", corridorName: ZEB_QUICK_DEFAULT_CORRIDOR },
  { pincode: "741222", areaName: "Chakdaha", city: "Nadia", corridorName: ZEB_QUICK_DEFAULT_CORRIDOR },
  { pincode: "741201", areaName: "Ranaghat", city: "Nadia", corridorName: ZEB_QUICK_DEFAULT_CORRIDOR },
  { pincode: "741202", areaName: "Ranaghat / Habibpur", city: "Nadia", corridorName: ZEB_QUICK_DEFAULT_CORRIDOR },
  { pincode: "741404", areaName: "Shantipur / Phulia", city: "Nadia", corridorName: ZEB_QUICK_DEFAULT_CORRIDOR },
  { pincode: "741254", areaName: "Birnagar / Taherpur", city: "Nadia", corridorName: ZEB_QUICK_DEFAULT_CORRIDOR },
  { pincode: "741101", areaName: "Krishnanagar", city: "Nadia", corridorName: ZEB_QUICK_DEFAULT_CORRIDOR },
  { pincode: "741102", areaName: "Krishnanagar / Ghurni", city: "Nadia", corridorName: ZEB_QUICK_DEFAULT_CORRIDOR },
  { pincode: "741103", areaName: "Krishnanagar / Shaktinagar", city: "Nadia", corridorName: ZEB_QUICK_DEFAULT_CORRIDOR },
];

/**
 * Matches a ZebAlpha product against ZebQuick's allowed quick-commerce subcategories.
 * Optionally accepts a custom active subcategory list from DB.
 */
export function matchZebQuickSubcategory(
  product: {
    category?: string | null;
    subcategory?: string | null;
    sub_category?: string | null;
    name?: string | null;
    title?: string | null;
    tags?: string[] | null;
  },
  allowedList: ZebQuickSubcategoryDef[] = ZEB_QUICK_ALLOWED_SUBCATEGORIES
): ZebQuickSubcategoryDef | null {
  const haystack = [
    product.subcategory,
    product.sub_category,
    product.category,
    product.name,
    product.title,
    ...(Array.isArray(product.tags) ? product.tags : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!haystack) return null;

  // Explicitly exclude footwear (Clogs, Shoes, Slip-On, Sneakers, Sandals, Crocs, etc.)
  if (
    /\b(clog|clogs|shoe|shoes|sneaker|sneakers|slip-on|slipper|slippers|sandal|sandals|footwear|boot|boots|heel|heels|loafer|crocs)\b/i.test(
      haystack
    )
  ) {
    return null;
  }

  for (const sub of allowedList) {
    if (haystack.includes(sub.name.toLowerCase()) || haystack.includes(sub.slug.replace(/-/g, " "))) {
      return sub;
    }
    for (const kw of sub.keywords) {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`\\b${escaped}\\b`, "i").test(haystack)) {
        return sub;
      }
    }
  }
  return null;
}
