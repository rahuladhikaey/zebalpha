import { supabaseServer } from "@/lib/supabaseServer";
import { getCachedOrFetch } from "@/lib/cacheHelper";
import {
  normalizeLocalizedDigits,
  parseMultilingualSearchQuery,
} from "@/lib/multilingualSearch";
import { Product } from "@/lib/types";

export type AssistantLanguage = "bn" | "bn_latin" | "hi" | "hi_latin" | "en";

export type AssistantQuickLink = {
  label: string;
  href: string;
};

export interface AssistantRecommendedProduct extends Product {
  rating?: number;
  review_count?: number;
  order_count?: number;
  match_reason?: string;
}

export type AssistantMatchMode =
  | "exact"
  | "color_relaxed"
  | "budget_relaxed"
  | "general_top"
  | "none";

export interface AssistantAnalysis {
  language: AssistantLanguage;
  voiceLang: "bn-IN" | "hi-IN" | "en-IN";
  isSupportOnly: boolean;
  isCompanyInfoQuery: boolean;
  isGreeting: boolean;
  isShoppingIntent: boolean;
  itemTypes: string[];
  colors: string[];
  styles: string[];
  gender: "men" | "women" | "kids" | null;
  maxPrice: number | null;
  minPrice: number | null;
  sortPreference: "rating" | "orders" | "budget" | "balanced";
  rawTokens: string[];
}

interface IndexedCatalogItem {
  product: Product;
  effectivePrice: number;
  titleText: string;
  categoryText: string;
  descText: string;
  colorText: string;
  fullText: string;
  rating: number;
  reviewCount: number;
  orderCount: number;
  eventScore: number;
  hasVideoProof: boolean;
  bayesianRating: number;
  popularityScore: number;
}

interface AssistantCatalogSnapshot {
  products: Product[];
  ratings: Record<string, { avg: number; count: number }>;
  orders: Record<string, number>;
  events: Record<string, number>;
}

const ASSISTANT_CATALOG_SELECT =
  "id, seller_id, category_id, name, description, price, mrp, image_url, images, brand, stock, stock_count, is_active, status, is_approved, approval_status, is_new_drop, collection, tier, specifications, packages, video_proof_url, created_at";

const INACTIVE_STATUSES = new Set([
  "BLOCKED",
  "DELETED",
  "ARCHIVED",
  "OUT_OF_STOCK",
  "COMING_SOON",
  "INACTIVE",
  "SUSPENDED",
  "DRAFT",
  "REJECTED",
]);

const ITEM_TYPE_KEYWORDS: Record<
  string,
  { requiredPatterns: RegExp[]; negativePatterns?: RegExp[]; labelEn: string; labelBn: string; labelHi: string }
> = {
  "t-shirt": {
    requiredPatterns: [/\bt[\s-]?shirts?\b/i, /\btees?\b/i, /\bgraphic\s+tee\b/i, /\boversized\s+tee\b/i, /\bpolo\b/i],
    negativePatterns: [/\bsaree\b/i, /\bkurti\b/i, /\bshoe\b/i, /\bsneaker\b/i, /\bclog\b/i, /\bjeans\b/i, /\bshort\s+kurti\b/i],
    labelEn: "T-Shirts",
    labelBn: "টি-শার্ট",
    labelHi: "टी-शर्ट",
  },
  polo: {
    requiredPatterns: [/\bpolos?\b/i, /\bzip\s+polo\b/i, /\bcollar\s+tee\b/i],
    labelEn: "Polos",
    labelBn: "পোলো",
    labelHi: "पोलो",
  },
  shirt: {
    requiredPatterns: [/\bshirts?\b/i, /\bovershirts?\b/i, /\bshackets?\b/i],
    negativePatterns: [/\bt[\s-]?shirts?\b/i, /\bsweatshirts?\b/i],
    labelEn: "Shirts",
    labelBn: "শার্ট",
    labelHi: "शर्ट",
  },
  hoodie: {
    requiredPatterns: [/\bhoodies?\b/i, /\bhoody\b/i, /\bsweatshirts?\b/i, /\bfleece\b/i, /\bpullover\b/i],
    labelEn: "Hoodies & Sweatshirts",
    labelBn: "হুডি ও সোয়েটশার্ট",
    labelHi: "हुडी और स्वेटशर्ट",
  },
  jacket: {
    requiredPatterns: [/\bjackets?\b/i, /\bovershirts?\b/i, /\bshackets?\b/i, /\bwindcheater\b/i, /\bbomber\b/i],
    labelEn: "Jackets",
    labelBn: "জ্যাকেট",
    labelHi: "जैकेट",
  },
  jeans: {
    requiredPatterns: [/\bjeans?\b/i, /\bdenims?\b/i],
    labelEn: "Jeans",
    labelBn: "জিন্স",
    labelHi: "जींस",
  },
  pants: {
    requiredPatterns: [/\bpants?\b/i, /\btrousers?\b/i, /\bchinos?\b/i, /\bcargos?\b/i, /\bjoggers?\b/i],
    labelEn: "Pants & Trousers",
    labelBn: "প্যান্ট",
    labelHi: "पैंट",
  },
  cargo: {
    requiredPatterns: [/\bcargos?\b/i],
    labelEn: "Cargo Pants",
    labelBn: "কার্গো প্যান্ট",
    labelHi: "कार्गो पैंट",
  },
  joggers: {
    requiredPatterns: [/\bjoggers?\b/i, /\btrack\s*pants?\b/i, /\blowers?\b/i],
    labelEn: "Joggers",
    labelBn: "জগার্স",
    labelHi: "जॉगर्स",
  },
  shorts: {
    requiredPatterns: [/\bshorts?\b/i, /\bhalf\s*pants?\b/i],
    negativePatterns: [/\bshort\s+kurti\b/i, /\bshort\s+sleeve\b/i],
    labelEn: "Shorts",
    labelBn: "শর্টস",
    labelHi: "शॉर्ट्स",
  },
  shoes: {
    requiredPatterns: [/\bshoes?\b/i, /\bsneakers?\b/i, /\bfootwear\b/i, /\bclogs?\b/i, /\bcrocs?\b/i, /\bboots?\b/i, /\bloafers?\b/i, /\bsandals?\b/i, /\bsliders?\b/i, /\bslippers?\b/i],
    labelEn: "Shoes & Footwear",
    labelBn: "জুতো ও ফুটওয়্যার",
    labelHi: "जूते और फुटवियर",
  },
  clogs: {
    requiredPatterns: [/\bclogs?\b/i, /\bcrocs?\b/i],
    labelEn: "Clogs",
    labelBn: "ক্লগস",
    labelHi: "क्लॉग्स",
  },
  sandals: {
    requiredPatterns: [/\bsandals?\b/i, /\bslippers?\b/i, /\bsliders?\b/i, /\bslides?\b/i, /\bchappal\b/i, /\bflip[\s-]?flops?\b/i],
    labelEn: "Sandals & Slippers",
    labelBn: "স্যান্ডেল",
    labelHi: "सैंडल और चप्पल",
  },
  saree: {
    requiredPatterns: [/\bsarees?\b/i, /\bsaris?\b/i],
    labelEn: "Sarees",
    labelBn: "শাড়ি",
    labelHi: "साड़ी",
  },
  kurti: {
    requiredPatterns: [/\bkurtis?\b/i, /\banarkali\b/i, /\bkurta\s*set\b/i, /\bkurti\s*top\b/i],
    labelEn: "Kurtis",
    labelBn: "কুর্তি",
    labelHi: "कुर्ती",
  },
  kurta: {
    requiredPatterns: [/\bkurtas?\b/i, /\bpanjabi\b/i, /\bpunjabi\b/i, /\bkurtis?\b/i],
    labelEn: "Kurtas",
    labelBn: "কুর্তা / পাঞ্জাবি",
    labelHi: "कुर्ता",
  },
  dress: {
    requiredPatterns: [/\bdress(?:es)?\b/i, /\bgowns?\b/i, /\bfrocks?\b/i, /\bone[\s-]?piece\b/i, /\bmidi\b/i, /\bmaxi\b/i],
    labelEn: "Dresses",
    labelBn: "ড্রেস",
    labelHi: "ड्रेस",
  },
  top: {
    requiredPatterns: [/\btops?\b/i, /\bcrop\s*tops?\b/i, /\btunics?\b/i, /\bkurti\s*top\b/i, /\bblouse\b/i],
    negativePatterns: [/\btop\s+rated\b/i, /\btop\s+selling\b/i],
    labelEn: "Tops",
    labelBn: "টপস",
    labelHi: "टॉप्स",
  },
  bag: {
    requiredPatterns: [/\bbags?\b/i, /\btotes?\b/i, /\bhandbags?\b/i, /\bbackpacks?\b/i, /\bslings?\b/i, /\bpurses?\b/i],
    labelEn: "Bags & Totes",
    labelBn: "ব্যাগ ও টোট",
    labelHi: "बैग",
  },
  cap: {
    requiredPatterns: [/\bcaps?\b/i, /\bhats?\b/i, /\bbeanies?\b/i],
    labelEn: "Caps & Hats",
    labelBn: "ক্যাপ ও টুপি",
    labelHi: "कैप",
  },
  jewellery: {
    requiredPatterns: [/\bjewell?ery\b/i, /\bearrings?\b/i, /\bnecklaces?\b/i, /\bbracelets?\b/i, /\bbangles?\b/i, /\bpendants?\b/i, /\bjhumkas?\b/i, /\brings?\b/i],
    labelEn: "Jewellery",
    labelBn: "গয়না ও জুয়েলারি",
    labelHi: "ज्वेलरी",
  },
  watch: {
    requiredPatterns: [/\bwatch(?:es)?\b/i, /\bwristwatch\b/i, /\btimepiece\b/i],
    labelEn: "Watches",
    labelBn: "ঘড়ি",
    labelHi: "घड़ी",
  },
  socks: {
    requiredPatterns: [/\bsocks?\b/i],
    labelEn: "Socks",
    labelBn: "মোজা",
    labelHi: "मोजे",
  },
  decor: {
    requiredPatterns: [/\bdecor\b/i, /\bwall\s*art\b/i, /\blamps?\b/i, /\bcandles?\b/i, /\bvase\b/i, /\bshowpiece\b/i, /\bcushion\b/i],
    labelEn: "Home Decor",
    labelBn: "হোম ডেকর",
    labelHi: "होम डेकोर",
  },
  gift: {
    requiredPatterns: [/\bgifts?\b/i, /\bhamper\b/i, /\bcustom\b/i, /\bpersonali[sz]ed\b/i, /\bcombo\b/i],
    labelEn: "Custom & Gift Picks",
    labelBn: "গিফট ও কাস্টম আইটেম",
    labelHi: "गिफ्ट और कस्टम आइटम",
  },
  ethnic: {
    requiredPatterns: [/\bethnic\b/i, /\bsarees?\b/i, /\bkurtis?\b/i, /\bkurtas?\b/i, /\blehenga\b/i, /\banarkali\b/i, /\bsalwar\b/i, /\bfestive\b/i],
    labelEn: "Ethnic Wear",
    labelBn: "এথনিক ওয়্যার",
    labelHi: "एथनिक वियर",
  },
};

const COLOR_CONCEPTS = new Set([
  "black", "white", "red", "blue", "navy", "green", "yellow", "pink",
  "purple", "grey", "brown", "beige", "orange", "maroon",
]);

const STYLE_CONCEPTS = new Set([
  "oversized", "printed", "plain", "casual", "formal", "winter", "summer",
  "cotton", "silk", "college", "party",
]);

const BANGLISH_MARKERS =
  /\b(taka|takar|moddhe|modhe|niche|vitore|bhitore|dekhao|dakhao|dekhau|dekhun|dekhabe|valo|bhalo|sundor|kom\s+dam|damer|kalo|sada|shada|lal|nil|sobuj|holud|golapi|juto|genji|shari|panjabi|cheleder|meyeder|amar|jonno|jonyo|ekta|kichu|ache|achhe|chai|lagbe|dorkar|kinbo|kinte|order\s+korbo|return\s+korbo|kothay|kobe|asbe|bujhlam|dhonnobad|nomoshkar)\b/i;

const HINGLISH_MARKERS =
  /\b(dikhao|dikhaiye|dikha|andar|rupaye|rupees\s+ke|ke\s+andar|ke\s+niche|k\s+andar|mein|chahiye|chahie|batao|sasta|saste|accha|achha|achhe|achhi|badiya|badhiya|kala|kaala|safed|laal|neela|peela|gulabi|joota|juta|sadi|ladkon|ladkiyon|mere|liye|wala|wali|wale|kitne|kahan|kab|aayega|wapas|namaste|shukriya|dhanyawad)\b/i;

const PURE_SUPPORT_REGEX =
  /(refund|money\s*back|cancel|cancellation|payment\s*fail|debited|double\s*charged|deducted|track\s*(my\s*)?order|where\s+is\s+my\s+order|order\s*status|return\s*policy|how\s+to\s+return|replace|exchange|customer\s*care|support\s*(team|agent|number)|account\s*deletion|invoice|অর্ডার\s*ট্র্যাক|রিটার্ন|রিফান্ড|ক্যান্সেল|ডেলিভারি\s*কবে|পেমেন্ট\s*ফেল|কাস্টমার\s*কেয়ার|ऑर्डर\s*ट्रैक|रिटर्न|रिफंड|कैंसल|पेमेंट\s*फेल|कस्टमर\s*केयर|order\s*kothay|order\s*kahan|return\s*korbo|return\s*kaise)/i;

const COMPANY_INFO_REGEX =
  /(who\s+is\s+(the\s+)?(ceo|coo|founder|co[\s-]?founder|owner|leader|head)|name\s+of\s+(the\s+)?(ceo|coo|founder|owner)|(ceo|coo|founder|co[\s-]?founder|owner|leadership)\s+(of\s+)?zebalpha|zebalpha\s*(ceo|coo|founder|co[\s-]?founder|owner|leadership|vision|philosophy|about|mission|target|vs|versus|business\s*model|hybrid|revenue|d2c)|why\s+(choose\s+|accept\s+|use\s+|buy\s+from\s+|sell\s+on\s+)?zebalpha|how\s+is\s+zebalpha\s+different|zebalpha\s+(vs|versus|compared\s+to)\s+(flipkart|meesho|amazon|myntra)|who\s+can\s+sell\s+on\s+zebalpha|emerging\s+brands?\s+(on\s+)?zebalpha|alpha\s+media(\s+team)?|alpha\s+seller\s+support(\s+team)?|business\s+model\s+(of\s+)?zebalpha|rahul\s+adhikary|alakesh\s+biswas|malik\s*ke|ke\s*(baniyeche|banieche|founder|ceo|coo|owner)|কে\s*(বানিয়েছে|বানিয়েছে|প্রতিষ্ঠাতা|মালিক|সিইও)|সিইও\s*কে|কেন\s*জেবআলফা|কেন\s*zebalpha|किसने\s*बनाया|मालिक\s*कौन|फाउंडर\s*कौन|सीईओ\s*कौन|क्यों\s*zebalpha)/i;

const GREETING_REGEX =
  /^(hi|hii+|hello|hey+|good\s*(morning|afternoon|evening)|namaste|namaskar|nomoshkar|নমস্কার|হ্যালো|হাই|नमस्ते|हेलो|हाय)[\s!.,?]*$/i;

const GENERAL_SHOPPING_REGEX =
  /(suggest|recommend|best|top|popular|trending|bestseller|bestselling|high\s*order|top\s*rated|highest\s*rated|good|show|shop|buy|outfit|style|styling|college|office|party|wedding|festive|gift|summer|winter|budget|under|below|দেখাও|দেখান|ভালো|সেরা|সাজেস্ট|কিনব|কিনতে|दिखाओ|दिखाइए|अच्छा|बढ़िया|बेस्ट|सजेस्ट|खरीदना|dekhao|dikhao|valo|bhalo|achha|badiya|takar|ke\s+andar)/i;

export function detectUserLanguage(rawText: string): {
  language: AssistantLanguage;
  voiceLang: "bn-IN" | "hi-IN" | "en-IN";
} {
  const text = String(rawText || "").trim();
  if (/[\u0980-\u09FF]/.test(text)) {
    return { language: "bn", voiceLang: "bn-IN" };
  }
  if (/[\u0900-\u097F]/.test(text)) {
    return { language: "hi", voiceLang: "hi-IN" };
  }
  const bnHits = (text.match(new RegExp(BANGLISH_MARKERS.source, "gi")) || []).length;
  const hiHits = (text.match(new RegExp(HINGLISH_MARKERS.source, "gi")) || []).length;

  if (bnHits > 0 && bnHits >= hiHits) {
    return { language: "bn_latin", voiceLang: "bn-IN" };
  }
  if (hiHits > 0) {
    return { language: "hi_latin", voiceLang: "hi-IN" };
  }
  return { language: "en", voiceLang: "en-IN" };
}

export function analyzeShoppingQuery(
  rawPrompt: string,
  extraEnglishHint?: string | null
): AssistantAnalysis {
  const { language, voiceLang } = detectUserLanguage(rawPrompt);
  const normalizedDigits = normalizeLocalizedDigits(rawPrompt).toLowerCase();
  const parsed = parseMultilingualSearchQuery(rawPrompt, extraEnglishHint);

  const itemTypes: string[] = [];
  const colors: string[] = [];
  const styles: string[] = [];
  let gender: "men" | "women" | "kids" | null = null;

  for (const conceptSyns of parsed.concepts) {
    const canonical = (conceptSyns[0] || "").toLowerCase();
    // Map canonical concept back to its known bucket
    const matchedItemKey = Object.keys(ITEM_TYPE_KEYWORDS).find(
      (k) => k === canonical || conceptSyns.some((s) => s.toLowerCase() === k)
    );
    if (matchedItemKey && !itemTypes.includes(matchedItemKey)) {
      itemTypes.push(matchedItemKey);
      continue;
    }
    if (COLOR_CONCEPTS.has(canonical) && !colors.includes(canonical)) {
      colors.push(canonical);
      continue;
    }
    if (STYLE_CONCEPTS.has(canonical) && !styles.includes(canonical)) {
      styles.push(canonical);
      continue;
    }
    if (canonical === "men" || canonical === "mens") gender = "men";
    else if (canonical === "women" || canonical === "womens") gender = "women";
    else if (canonical === "kids" || canonical === "kid") gender = "kids";
  }

  // Prevent "shirt" from falsely attaching when user explicitly typed "t-shirt" / "টি-শার্ট"
  if (itemTypes.includes("t-shirt") && itemTypes.includes("shirt")) {
    const idx = itemTypes.indexOf("shirt");
    if (idx !== -1) itemTypes.splice(idx, 1);
  }
  // Prevent generic "top" adjective collision ("top rated kurtis", "top 5 t-shirts", "top hoodies")
  if (
    itemTypes.includes("top") &&
    (itemTypes.length > 1 ||
      /\b(top\s+rated|top\s+selling|top\s+ordered|top\s+picks?|top\s+trending|top\s+\d+)\b/i.test(normalizedDigits)) &&
    !/\b(crop\s*top|kurti\s*top|women'?s?\s*top|girls?\s*top|টপ|টপস|टॉप|टॉप्स)\b/i.test(normalizedDigits)
  ) {
    const idx = itemTypes.indexOf("top");
    if (idx !== -1) itemTypes.splice(idx, 1);
  }

  // Extract budget range / minPrice / maxPrice
  let maxPrice = parsed.maxPrice;
  let minPrice: number | null = null;
  const rangeMatch = normalizedDigits.match(/(\d{2,5})\s*(?:-|to|theke|se|থেকে|से)\s*(\d{2,5})/i);
  if (rangeMatch) {
    const a = Number(rangeMatch[1]);
    const b = Number(rangeMatch[2]);
    if (a >= 50 && b >= a && b <= 50000) {
      minPrice = a;
      maxPrice = b;
    }
  } else if (maxPrice === null) {
    // Fallback for conversational budget like "500 budget" or "₹500 tee"
    const looseBudget = normalizedDigits.match(
      /(?:₹|rs\.?|inr)\s*(\d{2,5})\b|\b(\d{3,5})\s*(?:₹|rs\.?|inr|টাকা|টাকার|taka|takar|रुपये|रुपए|rupaye|rupees)\b/i
    );
    const val = Number(looseBudget?.[1] || looseBudget?.[2] || 0);
    if (val >= 99 && val <= 50000) {
      maxPrice = val;
    }
  }

  // Detect sort preference
  let sortPreference: AssistantAnalysis["sortPreference"] = "balanced";
  if (/(top\s*rated|best\s*rated|high\s*rating|5\s*star|4\s*star|রেটিং|ভালো\s*রেটিং|बेस्ट\s*रेटेड|अच्छी\s*रेटिंग)/i.test(normalizedDigits)) {
    sortPreference = "rating";
  } else if (/(bestseller|best\s*seller|most\s*ordered|top\s*ordered|top\s*selling|high\s*order|popular|trending|বেশি\s*অর্ডার|সবচেয়ে\s*বেশি\s*বিক্রি|सबसे\s*ज्यादा\s*बिकने|पॉपुलर)/i.test(normalizedDigits)) {
    sortPreference = "orders";
  } else if (/(cheap|cheapest|lowest|budget|low\s*price|কম\s*দাম|সস্তা|सस्ता|कम\s*दाम)/i.test(normalizedDigits)) {
    sortPreference = "budget";
  }

  const isGreeting = GREETING_REGEX.test(rawPrompt.trim());
  const isCompanyInfoQuery = COMPANY_INFO_REGEX.test(normalizedDigits);
  const hasShoppingSignal =
    itemTypes.length > 0 ||
    colors.length > 0 ||
    styles.length > 0 ||
    maxPrice !== null ||
    GENERAL_SHOPPING_REGEX.test(normalizedDigits);

  const isSupportOnly = !hasShoppingSignal && !isCompanyInfoQuery && PURE_SUPPORT_REGEX.test(normalizedDigits);
  const isShoppingIntent = !isGreeting && !isSupportOnly && !isCompanyInfoQuery && hasShoppingSignal;

  const rawTokens = parsed.flatTerms.filter((t) => t.length >= 2);

  return {
    language,
    voiceLang,
    isSupportOnly,
    isCompanyInfoQuery,
    isGreeting,
    isShoppingIntent,
    itemTypes,
    colors,
    styles,
    gender,
    maxPrice,
    minPrice,
    sortPreference,
    rawTokens,
  };
}

function isProductEligible(
  row: Record<string, unknown>,
  blockedSellerIds: Set<string>
): boolean {
  if (row.is_active === false) return false;
  if (row.is_approved === false) return false;

  const sellerId = row.seller_id ? String(row.seller_id) : "";
  if (sellerId && blockedSellerIds.has(sellerId)) return false;

  const status = String(row.status || "").toUpperCase();
  if (status && INACTIVE_STATUSES.has(status)) return false;

  const approval = String(row.approval_status || "").toLowerCase();
  if (approval === "rejected" || approval === "pending" || approval === "suspended") {
    return false;
  }

  const pkgs = Array.isArray(row.packages) ? (row.packages as Array<{ stock?: number; price?: number }>) : [];
  let hasAvailableStock = false;
  if (pkgs.length > 0) {
    hasAvailableStock = pkgs.some((p) => p.stock === undefined || Number(p.stock) > 0);
  } else {
    const stock =
      typeof row.stock === "number"
        ? row.stock
        : typeof row.stock_count === "number"
          ? row.stock_count
          : 1;
    hasAvailableStock = stock > 0;
  }
  if (!hasAvailableStock) return false;

  const primaryImg = String(
    row.image_url || (Array.isArray(row.images) ? row.images[0] : "") || ""
  ).trim();
  return Boolean(row.id && row.name && primaryImg);
}

function getEffectiveProductPrice(product: Product): number {
  const basePrice = Number(product.price || 0);
  const pkgs = Array.isArray(product.packages) ? product.packages : [];
  const activePrices = pkgs
    .filter((p) => (p.stock === undefined || Number(p.stock) > 0) && Number(p.price) > 0)
    .map((p) => Number(p.price));

  if (activePrices.length > 0) {
    const minPkg = Math.min(...activePrices);
    return basePrice > 0 ? Math.min(basePrice, minPkg) : minPkg;
  }
  return basePrice;
}

async function getAssistantCatalogSnapshot(): Promise<IndexedCatalogItem[]> {
  const snapshot = await getCachedOrFetch<AssistantCatalogSnapshot>(
    "alpha:assistant:catalog:v2",
    async () => {
      const since90d = new Date(Date.now() - 90 * 86_400_000).toISOString();

      const [prodRes, sellerRes, catRes, revRes, ordersRes, eventsRes] = await Promise.all([
        supabaseServer
          .from("products")
          .select(ASSISTANT_CATALOG_SELECT)
          .or("is_active.is.null,is_active.eq.true")
          .order("is_new_drop", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(240),
        supabaseServer
          .from("sellers")
          .select("id, status, account_status, is_suspended, is_deleted")
          .limit(250),
        supabaseServer
          .from("categories")
          .select("id, name, slug")
          .limit(150),
        supabaseServer
          .from("reviews")
          .select("product_id, rating")
          .eq("is_approved", true)
          .limit(1000),
        supabaseServer
          .from("orders")
          .select("items, product_details, order_status")
          .gte("created_at", since90d)
          .limit(300),
        supabaseServer
          .from("customer_product_events")
          .select("product_id, event_type")
          .gte("created_at", since90d)
          .in("event_type", ["product_purchased", "cart_added", "wishlist_added", "product_viewed"])
          .limit(500),
      ]);

      const blockedSellerIds = new Set<string>();
      if (Array.isArray(sellerRes.data)) {
        for (const s of sellerRes.data as Array<{
          id?: string;
          status?: string;
          account_status?: string;
          is_suspended?: boolean;
          is_deleted?: boolean;
        }>) {
          const st = String(s.status || "").toUpperCase();
          const acc = String(s.account_status || "").toUpperCase();
          if (
            s.is_suspended ||
            s.is_deleted ||
            st === "SUSPENDED" ||
            st === "BLOCKED" ||
            st === "REJECTED" ||
            acc === "SUSPENDED" ||
            acc === "BLOCKED"
          ) {
            if (s.id) blockedSellerIds.add(String(s.id));
          }
        }
      }

      const catNameMap = new Map<string, string>();
      if (Array.isArray(catRes.data)) {
        for (const c of catRes.data as Array<{ id?: string; name?: string | null }>) {
          if (c.id && c.name) catNameMap.set(String(c.id), String(c.name));
        }
      }

      const rawProducts = Array.isArray(prodRes.data)
        ? (prodRes.data as Array<Record<string, unknown>>)
        : [];

      const products: Product[] = rawProducts
        .filter((row) => isProductEligible(row, blockedSellerIds))
        .map((row) => {
          const images = Array.isArray(row.images) ? (row.images as string[]) : undefined;
          const catId = row.category_id ? String(row.category_id) : undefined;
          return {
            id: row.id as string | number,
            name: String(row.name || "ZEBALPHA Piece"),
            price: Number(row.price || 0),
            mrp: typeof row.mrp === "number" ? row.mrp : undefined,
            description: String(row.description || ""),
            image_url: String(row.image_url || images?.[0] || ""),
            images,
            brand: row.brand ? String(row.brand) : "ZEBALPHA",
            category_id: catId,
            category_name: catId ? catNameMap.get(catId) : undefined,
            stock:
              typeof row.stock === "number"
                ? row.stock
                : typeof row.stock_count === "number"
                  ? row.stock_count
                  : 10,
            status: row.status ? String(row.status) : undefined,
            is_active: row.is_active !== false,
            is_new_drop: Boolean(row.is_new_drop),
            collection: row.collection ? String(row.collection) : undefined,
            tier: row.tier ? String(row.tier) : undefined,
            video_proof_url: row.video_proof_url ? String(row.video_proof_url) : undefined,
            specifications:
              row.specifications && typeof row.specifications === "object"
                ? (row.specifications as Record<string, unknown>)
                : undefined,
            packages: Array.isArray(row.packages) ? (row.packages as Product["packages"]) : undefined,
          };
        });

      // Aggregate real approved ratings
      const revAcc = new Map<string, { sum: number; count: number }>();
      if (Array.isArray(revRes.data)) {
        for (const r of revRes.data as Array<{ product_id?: string | number | null; rating?: number | string | null }>) {
          const pid = r.product_id != null ? String(r.product_id) : "";
          const ratingVal = Number(r.rating);
          if (!pid || !Number.isFinite(ratingVal) || ratingVal < 1 || ratingVal > 5) continue;
          const prev = revAcc.get(pid) || { sum: 0, count: 0 };
          prev.sum += ratingVal;
          prev.count += 1;
          revAcc.set(pid, prev);
        }
      }
      const ratings: Record<string, { avg: number; count: number }> = {};
      for (const [pid, acc] of revAcc.entries()) {
        ratings[pid] = {
          avg: Number((acc.sum / acc.count).toFixed(1)),
          count: acc.count,
        };
      }

      // Aggregate real non-cancelled order quantities
      const orders: Record<string, number> = {};
      if (Array.isArray(ordersRes.data)) {
        type OrderLine = { product_id?: string | number; id?: string | number; quantity?: number };
        type OrderRec = {
          order_status?: string | null;
          items?: OrderLine[] | null;
          product_details?: OrderLine[] | null;
        };
        for (const ord of ordersRes.data as OrderRec[]) {
          const st = String(ord.order_status || "").toLowerCase();
          if (st === "cancelled" || st === "failed" || st === "rejected") continue;
          const lines = Array.isArray(ord.items) && ord.items.length > 0 ? ord.items : ord.product_details;
          if (!Array.isArray(lines)) continue;
          for (const line of lines) {
            const pid = line?.product_id ?? line?.id;
            if (pid == null) continue;
            const qty = Math.max(1, Number(line?.quantity || 1));
            const key = String(pid);
            orders[key] = (orders[key] || 0) + qty;
          }
        }
      }

      // Aggregate secondary shopping intent events
      const events: Record<string, number> = {};
      if (!eventsRes.error && Array.isArray(eventsRes.data)) {
        const weights: Record<string, number> = {
          product_viewed: 1,
          wishlist_added: 3,
          cart_added: 5,
          product_purchased: 8,
        };
        for (const ev of eventsRes.data as Array<{ product_id?: string | number | null; event_type?: string }>) {
          if (ev.product_id == null) continue;
          const key = String(ev.product_id);
          events[key] = (events[key] || 0) + (weights[String(ev.event_type || "")] ?? 1);
        }
      }

      return { products, ratings, orders, events };
    },
    300 // 5 min TTL
  );

  // Compute global prior rating for Bayesian smoothing (prevents 1-review 5.0 from beating 20-review 4.8)
  const ratedValues = Object.values(snapshot.ratings);
  const globalMeanRating =
    ratedValues.length > 0
      ? ratedValues.reduce((acc, r) => acc + r.avg, 0) / ratedValues.length
      : 4.2;
  const PRIOR_WEIGHT = 3;

  return snapshot.products.map((product) => {
    const pid = String(product.id);
    const rev = snapshot.ratings[pid];
    const rating = rev ? rev.avg : 0;
    const reviewCount = rev ? rev.count : 0;
    const orderCount = snapshot.orders[pid] || 0;
    const eventScore = snapshot.events[pid] || 0;

    const specs = (product.specifications || {}) as Record<string, unknown>;
    const pkgColors = (product.packages || [])
      .map((p) => [p.color, p.name].filter(Boolean).join(" "))
      .join(" ");

    const titleText = String(product.name || "").toLowerCase();
    const categoryText = [
      product.category_name,
      specs.subcategory,
      specs.category,
      specs.product_type,
      specs.kurti_type,
      specs.top_type,
      specs.dress_type,
      product.collection,
      specs.gender,
      specs.ideal_for,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const descText = [
      product.description,
      product.brand,
      specs.fabric,
      specs.material,
      specs.fit_type,
      specs.occasion,
      specs.pattern,
      specs.sleeve_type,
      specs.neck_type,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const colorText = [
      titleText,
      pkgColors.toLowerCase(),
      String(specs.color || "").toLowerCase(),
      String(specs.default_color || "").toLowerCase(),
    ].join(" ");

    const fullText = `${titleText} ${categoryText} ${colorText} ${descText}`;

    const bayesianRating =
      reviewCount > 0
        ? (reviewCount * rating + PRIOR_WEIGHT * globalMeanRating) / (reviewCount + PRIOR_WEIGHT)
        : 0;

    const hasVideoProof = Boolean(product.video_proof_url || specs.video_proof_url);

    // High-order + rating composite popularity score (0 to ~100+)
    const popularityScore =
      bayesianRating * 14 +
      Math.log1p(reviewCount) * 8 +
      Math.log1p(orderCount) * 18 +
      Math.log1p(eventScore) * 4 +
      (hasVideoProof ? 3 : 0) +
      (product.is_new_drop ? 2 : 0);

    return {
      product,
      effectivePrice: getEffectiveProductPrice(product),
      titleText,
      categoryText,
      descText,
      colorText,
      fullText,
      rating,
      reviewCount,
      orderCount,
      eventScore,
      hasVideoProof,
      bayesianRating,
      popularityScore,
    };
  });
}

function matchesItemType(item: IndexedCatalogItem, itemType: string): number {
  const def = ITEM_TYPE_KEYWORDS[itemType];
  if (!def) {
    const escaped = itemType.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(`\\b${escaped}\\b`, "i");
    if (rx.test(item.titleText)) return 40;
    if (rx.test(item.categoryText)) return 30;
    return 0;
  }

  // Negative exclusion check against title + category (prevents shirt matching t-shirt, shorts matching short kurti)
  if (def.negativePatterns?.some((neg) => neg.test(item.titleText) && !def.requiredPatterns.some((req) => req.test(item.categoryText)))) {
    // Allow only if title explicitly contains a positive match that is NOT part of the negative phrase
    if (itemType === "shirt") {
      const strippedTitle = item.titleText.replace(/\bt[\s-]?shirts?\b|\bsweatshirts?\b/gi, " ");
      if (!/\bshirts?\b|\bovershirts?\b/i.test(strippedTitle)) return 0;
    } else if (itemType === "shorts") {
      const strippedTitle = item.titleText.replace(/\bshort\s+(kurti|sleeve|dress|top)\b/gi, " ");
      if (!/\bshorts?\b|\bhalf\s*pants?\b/i.test(strippedTitle)) return 0;
    } else {
      return 0;
    }
  }

  // Strict title/category priority — description alone is NEVER allowed to cause a false product-type match
  if (def.requiredPatterns.some((rx) => rx.test(item.titleText))) return 45;
  if (def.requiredPatterns.some((rx) => rx.test(item.categoryText))) return 34;
  return 0;
}

function matchesGender(item: IndexedCatalogItem, gender: "men" | "women" | "kids"): number {
  const combined = `${item.titleText} ${item.categoryText}`;
  const isExplicitWomen = /\b(women|women's|womens|ladies|girls|kurti|saree|lehenga|blouse|anarkali)\b/i.test(combined);
  const isExplicitMen = /\b(men|men's|mens|boys|gents)\b/i.test(combined) && !isExplicitWomen;
  const isUnisex = /\bunisex\b/i.test(item.fullText);

  if (gender === "women") {
    if (isExplicitMen && !isUnisex) return -1; // Hard exclude men-only items
    return isExplicitWomen ? 14 : 4;
  }
  if (gender === "men") {
    if (isExplicitWomen && !isUnisex) return -1; // Hard exclude women-only items (saree/kurti/etc.)
    return isExplicitMen ? 14 : 4;
  }
  if (gender === "kids") {
    if (/\b(kids?|child|children|baby|junior)\b/i.test(combined)) return 16;
    return -1;
  }
  return 0;
}

function matchesColor(item: IndexedCatalogItem, color: string): boolean {
  const colorAliases: Record<string, RegExp> = {
    black: /\b(black|charcoal|jet|onyx)\b/i,
    white: /\b(white|ivory|off[\s-]?white)\b/i,
    red: /\b(red|crimson|scarlet|coral)\b/i,
    blue: /\b(blue|navy|sky\s*blue|cobalt|denim)\b/i,
    navy: /\b(navy|dark\s*blue)\b/i,
    green: /\b(green|olive|mint|emerald|sage)\b/i,
    yellow: /\b(yellow|mustard|gold|lemon)\b/i,
    pink: /\b(pink|rose|blush|magenta)\b/i,
    purple: /\b(purple|lavender|violet|lilac)\b/i,
    grey: /\b(grey|gray|charcoal|ash|silver)\b/i,
    brown: /\b(brown|tan|coffee|chocolate|khaki|camel)\b/i,
    beige: /\b(beige|cream|ivory|sand)\b/i,
    orange: /\b(orange|rust|coral|peach)\b/i,
    maroon: /\b(maroon|wine|burgundy)\b/i,
  };
  const rx = colorAliases[color] || new RegExp(`\\b${color}\\b`, "i");
  return rx.test(item.colorText);
}

function buildReasonBadge(
  item: IndexedCatalogItem,
  analysis: AssistantAnalysis
): string {
  if (item.orderCount >= 3 && item.rating >= 4.2) {
    return `★ ${item.rating.toFixed(1)} • Bestseller`;
  }
  if (item.orderCount >= 2) {
    return `🔥 ${item.orderCount}+ Orders`;
  }
  if (item.rating >= 4.0 && item.reviewCount > 0) {
    return `★ ${item.rating.toFixed(1)} Top Rated`;
  }
  if (analysis.maxPrice && item.effectivePrice <= analysis.maxPrice) {
    return `Best Under ₹${analysis.maxPrice}`;
  }
  if (item.hasVideoProof) {
    return "Verified Video Proof";
  }
  if (item.product.is_new_drop) {
    return "Fresh Drop";
  }
  return "Top Pick";
}

function computeQualityRankScore(
  item: IndexedCatalogItem,
  analysis: AssistantAnalysis
): number {
  let rank = 0;

  if (analysis.sortPreference === "rating") {
    rank += item.bayesianRating * 26 + Math.log1p(item.reviewCount) * 14 + Math.log1p(item.orderCount) * 10;
  } else if (analysis.sortPreference === "orders") {
    rank += Math.log1p(item.orderCount) * 30 + Math.log1p(item.eventScore) * 8 + item.bayesianRating * 12;
  } else if (analysis.sortPreference === "budget") {
    // Prefer best rating & orders among lowest prices
    const priceScore = item.effectivePrice > 0 ? Math.max(0, 25 - item.effectivePrice / 60) : 0;
    rank += priceScore + item.bayesianRating * 14 + Math.log1p(item.orderCount) * 14;
  } else {
    // Default Advanced Ranking: Rating + High Orders + Engagement + Discount value
    rank += item.popularityScore;
    if (typeof item.product.mrp === "number" && item.product.mrp > item.effectivePrice) {
      const discPct = ((item.product.mrp - item.effectivePrice) / item.product.mrp) * 100;
      rank += Math.min(6, discPct / 10);
    }
  }

  return rank;
}

export async function searchRankedAssistantProducts(
  analysis: AssistantAnalysis
): Promise<{
  products: AssistantRecommendedProduct[];
  matchMode: AssistantMatchMode;
  nearestPrice?: number;
}> {
  if (!analysis.isShoppingIntent) {
    return { products: [], matchMode: "none" };
  }

  const catalog = await getAssistantCatalogSnapshot();
  if (catalog.length === 0) {
    return { products: [], matchMode: "none" };
  }

  // Filter helper given toggles on color & budget strictness
  const filterAndScore = (opts: { enforceColor: boolean; enforceBudget: boolean }) => {
    const scored: Array<{ item: IndexedCatalogItem; totalScore: number }> = [];

    for (const item of catalog) {
      // 1. Hard Budget Gate
      if (opts.enforceBudget) {
        if (analysis.maxPrice !== null && item.effectivePrice > analysis.maxPrice) continue;
        if (analysis.minPrice !== null && item.effectivePrice < analysis.minPrice) continue;
      }

      // 2. Hard Gender Gate
      let relevanceScore = 0;
      if (analysis.gender) {
        const gScore = matchesGender(item, analysis.gender);
        if (gScore < 0) continue;
        relevanceScore += gScore;
      }

      // 3. Hard Product-Type Gate (NEVER show wrong category!)
      if (analysis.itemTypes.length > 0) {
        let bestTypeScore = 0;
        for (const t of analysis.itemTypes) {
          const s = matchesItemType(item, t);
          if (s > bestTypeScore) bestTypeScore = s;
        }
        if (bestTypeScore <= 0) continue; // Strict: wrong item type excluded!
        relevanceScore += bestTypeScore;
      }

      // 4. Color matching
      if (analysis.colors.length > 0) {
        const colorMatched = analysis.colors.some((c) => matchesColor(item, c));
        if (opts.enforceColor && !colorMatched) continue;
        if (colorMatched) relevanceScore += 22;
      }

      // 5. Style / occasion / fabric boost
      for (const st of analysis.styles) {
        const rx = new RegExp(`\\b${st.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
        if (rx.test(item.titleText)) relevanceScore += 14;
        else if (rx.test(item.fullText)) relevanceScore += 7;
      }

      // 6. Unrecognized extra English tokens (if no known itemType was matched)
      if (analysis.itemTypes.length === 0 && analysis.colors.length === 0 && analysis.styles.length === 0) {
        const nonNumericTokens = analysis.rawTokens.filter((t) => !/^\d+$/.test(t) && t.length >= 3);
        if (nonNumericTokens.length > 0) {
          let tokenHits = 0;
          for (const tk of nonNumericTokens) {
            const escaped = tk.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const rx = new RegExp(`\\b${escaped}`, "i");
            if (rx.test(item.titleText) || rx.test(item.categoryText)) {
              tokenHits += 1;
              relevanceScore += 22;
            } else if (rx.test(item.descText)) {
              tokenHits += 1;
              relevanceScore += 8;
            }
          }
          // If customer searched a specific unknown product word (e.g. "smartwatch" or "perfume") with 0 hits, DO NOT show random apparel!
          if (tokenHits === 0 && analysis.maxPrice === null && !/(best|top|popular|trending|suggest|recommend|shop|buy|outfit|style|ভালো|সেরা|अच्छा|बेस्ट)/i.test(analysis.rawTokens.join(" "))) {
            continue;
          }
        }
      }

      const qualityScore = computeQualityRankScore(item, analysis);
      // Relevance dominates tiering, quality (ratings + orders) ranks winners within exact matches
      const totalScore = relevanceScore * 3 + qualityScore;
      scored.push({ item, totalScore });
    }

    scored.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (b.item.orderCount !== a.item.orderCount) return b.item.orderCount - a.item.orderCount;
      if (b.item.rating !== a.item.rating) return b.item.rating - a.item.rating;
      return a.item.effectivePrice - b.item.effectivePrice;
    });

    return scored;
  };

  const formatPicks = (list: Array<{ item: IndexedCatalogItem }>): AssistantRecommendedProduct[] =>
    list.slice(0, 4).map(({ item }) => ({
      ...item.product,
      rating: item.rating,
      review_count: item.reviewCount,
      order_count: item.orderCount,
      match_reason: buildReasonBadge(item, analysis),
    }));

  // Pass 1: Strict exact match (itemType + color + budget + gender)
  const strictMatches = filterAndScore({ enforceColor: true, enforceBudget: true });
  if (strictMatches.length > 0) {
    const mode: AssistantMatchMode =
      analysis.itemTypes.length > 0 || analysis.colors.length > 0 || analysis.maxPrice !== null
        ? "exact"
        : "general_top";
    return { products: formatPicks(strictMatches), matchMode: mode };
  }

  // Pass 2: If color caused 0 results (e.g. "purple hoodie under 500"), relax ONLY color while keeping exact itemType + budget
  if (analysis.colors.length > 0) {
    const colorRelaxed = filterAndScore({ enforceColor: false, enforceBudget: true });
    if (colorRelaxed.length > 0) {
      return { products: formatPicks(colorRelaxed), matchMode: "color_relaxed" };
    }
  }

  // Pass 3: If budget caused 0 results for an exact itemType (e.g. "hoodie under 300"),
  // show closest-priced top-rated items of the EXACT SAME itemType (NEVER a different category!)
  if (analysis.maxPrice !== null && analysis.itemTypes.length > 0) {
    const sameCategoryAllPrices = filterAndScore({ enforceColor: false, enforceBudget: false });
    if (sameCategoryAllPrices.length > 0) {
      // Sort by closeness to requested budget while preserving rating/orders quality
      sameCategoryAllPrices.sort((a, b) => {
        const diffA = Math.abs(a.item.effectivePrice - analysis.maxPrice!);
        const diffB = Math.abs(b.item.effectivePrice - analysis.maxPrice!);
        if (Math.abs(diffA - diffB) > 150) return diffA - diffB;
        return b.totalScore - a.totalScore;
      });
      const picks = formatPicks(sameCategoryAllPrices);
      const nearestPrice = Math.min(...picks.map((p) => Number(p.price || 0)));
      return {
        products: picks,
        matchMode: "budget_relaxed",
        nearestPrice: Number.isFinite(nearestPrice) ? nearestPrice : undefined,
      };
    }
  }

  // Pass 4: ZERO exact category matches exist in catalog (e.g. customer asked for Sarees and 0 sarees are listed)
  // STRICT RULE: Return EMPTY products array instead of random wrong products!
  return { products: [], matchMode: "none" };
}

function getRequestedItemLabel(analysis: AssistantAnalysis): string {
  const firstType = analysis.itemTypes[0];
  if (!firstType) {
    if (analysis.language === "bn") return "প্রোডাক্ট";
    if (analysis.language === "hi") return "प्रोडक्ट्स";
    return "products";
  }
  const def = ITEM_TYPE_KEYWORDS[firstType];
  if (!def) return firstType;
  if (analysis.language === "bn") return def.labelBn;
  if (analysis.language === "hi") return def.labelHi;
  return def.labelEn;
}

export function getMultilingualQuickLinks(analysis: AssistantAnalysis): AssistantQuickLink[] {
  const lang = analysis.language;
  if (analysis.isCompanyInfoQuery) {
    if (lang === "bn" || lang === "bn_latin") {
      return [
        { label: "আমাদের ভিশন ও লিডারশিপ", href: "/about#why-zebalpha" },
        { label: "কেন ZebAlpha সেরা?", href: "/blogs/why-zebalpha-vision-target-customers-sellers-and-marketplace-difference" },
        { label: "ZebAlpha-তে সেল করুন", href: "/seller" },
      ];
    }
    if (lang === "hi" || lang === "hi_latin") {
      return [
        { label: "विज़न और लीडरशिप", href: "/about#why-zebalpha" },
        { label: "ZebAlpha क्यों चुनें?", href: "/blogs/why-zebalpha-vision-target-customers-sellers-and-marketplace-difference" },
        { label: "ZebAlpha पर सेल करें", href: "/seller" },
      ];
    }
    return [
      { label: "Vision & Leadership", href: "/about#why-zebalpha" },
      { label: "Why Choose ZebAlpha", href: "/blogs/why-zebalpha-vision-target-customers-sellers-and-marketplace-difference" },
      { label: "Sell on ZebAlpha", href: "/seller" },
    ];
  }
  if (analysis.isSupportOnly) {
    if (lang === "bn") {
      return [
        { label: "আমার অর্ডার", href: "/profile/orders" },
        { label: "রিটার্ন পলিসি", href: "/return-policy" },
        { label: "সাপোর্ট ও হেল্প", href: "/help" },
      ];
    }
    if (lang === "hi") {
      return [
        { label: "मेरे ऑर्डर", href: "/profile/orders" },
        { label: "रिटर्न पॉलिसी", href: "/return-policy" },
        { label: "हेल्प और सपोर्ट", href: "/help" },
      ];
    }
    return [
      { label: "My Orders", href: "/profile/orders" },
      { label: "Return Policy", href: "/return-policy" },
      { label: "Help & Support", href: "/help" },
    ];
  }

  if (lang === "bn") {
    return [
      { label: "সব ক্যাটাগরি", href: "/categories" },
      { label: "নতুন ড্রপস", href: "/new-drops" },
      { label: "সাইজ গাইড", href: "/size-guide" },
    ];
  }
  if (lang === "hi") {
    return [
      { label: "सभी कैटेगरी", href: "/categories" },
      { label: "नए ड्रॉप्स", href: "/new-drops" },
      { label: "साइज गाइड", href: "/size-guide" },
    ];
  }
  return [
    { label: "All Categories", href: "/categories" },
    { label: "New Drops", href: "/new-drops" },
    { label: "Size Guide", href: "/size-guide" },
  ];
}

export function buildMultilingualAssistantReply(
  prompt: string,
  analysis: AssistantAnalysis,
  products: AssistantRecommendedProduct[],
  matchMode: AssistantMatchMode,
  nearestPrice?: number
): string {
  const { language, maxPrice } = analysis;
  const itemLabel = getRequestedItemLabel(analysis);
  const normalized = prompt.toLowerCase();

  // 1. Greetings
  if (analysis.isGreeting) {
    if (language === "bn") {
      return `নমস্কার! **ZEBALPHA**-তে স্বাগতম। 👋\n\nআমি **Alpha AI** — আপনার ২৪/৭ স্মার্ট শপিং অ্যাসিস্ট্যান্ট। বাংলা, হিন্দি বা ইংরেজিতে লিখে বা মাইকে কথা বলে যেকোনো প্রোডাক্ট খুঁজতে পারেন!\n\nযেমন জিজ্ঞেস করুন:\n• *"৫০০ টাকার মধ্যে ভালো টি-শার্ট দেখাও"*\n• *"সেরা রেটিং-এর কুর্তি দেখাও"*\n• *"আমার অর্ডার ট্র্যাক করো"*`;
    }
    if (language === "bn_latin") {
      return `Nomoshkar! **ZEBALPHA**-te swagotom! 👋\n\nAmi **Alpha AI**, apnar 24/7 Smart Shopping Assistant. Bangla, Banglish, Hindi ba English-e likhe ba mic-e kotha bole jekono product khujte paren!\n\nJemon bolte paren:\n• *"500 takar moddhe valo t-shirt dekhao"*\n• *"Top rated kurti dekhao"*\n• *"Amar order track koro"*`;
    }
    if (language === "hi") {
      return `नमस्ते! **ZEBALPHA** में आपका स्वागत है। 👋\n\nमैं **Alpha AI** हूँ — आपका 24/7 स्मार्ट शॉपिंग असिस्टेंट। आप हिंदी, बंगाली या अंग्रेजी में लिखकर या माइक से बोलकर प्रोडक्ट्स ढूँढ सकते हैं!\n\nजैसे पूछें:\n• *"500 रुपये के अंदर अच्छी टी-शर्ट दिखाओ"*\n• *"बेस्ट रेटेड कुर्ती दिखाओ"*\n• *"मेरा ऑर्डर ट्रैक करो"*`;
    }
    if (language === "hi_latin") {
      return `Namaste! **ZEBALPHA** mein aapka swagat hai! 👋\n\nMain **Alpha AI** hoon, aapka 24/7 Smart Shopping Assistant. Hindi, Hinglish, Bengali ya English mein type karke ya mic se bolkar best rated & high-order products dhundh sakte hain!\n\nJaise puchein:\n• *"500 ke andar black hoodie dikhao"*\n• *"Best rated kurti dikhao"*\n• *"Mera order track karo"*`;
    }
    return `Hi! Welcome to **ZEBALPHA**. 👋\n\nI’m **Alpha AI**, your 24/7 Smart Multilingual Shopping Assistant. Ask me in **English, বাংলা, or हिन्दी** (type or tap the Mic!) to discover top-rated & high-order picks.\n\nTry asking:\n• *"College wear oversized tee under 600"*\n• *"৫০০ টাকার মধ্যে ভালো টি-শার্ট দেখাও"*\n• *"500 ke andar black hoodie dikhao"*`;
  }

  // 1.5 Company, Vision, Hybrid Business Model, In-House Teams & Leadership Queries
  if (analysis.isCompanyInfoQuery) {
    const isWhyOrStrategyQuery =
      /(why|vision|mission|target|different|flipkart|meesho|amazon|myntra|emerging\s+brand|sell\s+on|business\s*model|hybrid|revenue|d2c|alpha\s+media|alpha\s+seller\s+support|কেন|क्यों)/i.test(
        normalized
      );

    if (isWhyOrStrategyQuery) {
      if (language === "bn") {
        return `✨ **ZebAlpha — ভারতের হাইব্রিড ই-কমার্স কোম্পানি (D2C Own Brand + Multi-Vendor Marketplace):**\n\n• **Hybrid Business Model:** নিজস্ব ব্র্যান্ড D2C (~৬৫–৭০% স্ট্র্যাটেজিক ফোকাস) + থার্ড-পার্টি সেলার মার্কেটপ্লেস (~৩০–৩৫% স্ট্র্যাটেজিক ফোকাস — কৌশলগত লক্ষ্য, ভেরিফায়েড রেভিনিউ নয়)।\n• **Alpha Media Team:** আমাদের নিজস্ব ইন-হাউস মিডিয়া টিম প্রতিদিন Instagram, Facebook ও সোশ্যাল মিডিয়ায় ZebAlpha-র প্রোডাক্ট ও পার্টনার ব্র্যান্ডগুলোর ব্র্যান্ডিং ও প্রমোশন করে।\n• **Alpha Seller Support Team:** সেলারদের রেজিস্ট্রেশন, Enrolment ID, ক্যাটালগ, ডিসপ্যাচ ও গ্রোথে সম্পূর্ণ হ্যান্ডস-অন হেল্প দেয়।\n• **কাস্টমার সুবিধা:** Real Product Video Proof, Zero-MOQ Custom Print Studio, Alpha AI (বাংলা/হিন্দি/ইংরেজি), ₹১০০ ১ম অর্ডার অফার (₹৩৯৯+), UPI/COD ও ৫ দিনের সহজ রিটার্ন।`;
      }
      if (language === "bn_latin") {
        return `✨ **ZebAlpha — India-r Hybrid E-Commerce Company (D2C Own Brand + Multi-Vendor Marketplace):**\n\n• **Hybrid Model:** Nijer Brand D2C (~65–70% strategic focus) + Third-Party Seller Marketplace (~30–35% strategic focus — strategic priority, verified revenue noy).\n• **Alpha Media Team:** Amader nijoswo in-house media team protidin Instagram, Facebook & social media-te ZebAlpha-r sob product o partner brand-er branding & promotion kore!\n• **Alpha Seller Support Team:** Seller-der onboarding, Enrolment ID, catalog, dispatch & growth-e full hands-on help kore.\n• **Customer Subidha:** Real Product Video Proof, Zero-MOQ Custom Studio, Alpha AI (Bangla/Hindi/English), 0% seller commission policy, UPI/COD & 5-day easy return!`;
      }
      if (language === "hi") {
        return `✨ **ZebAlpha — भारत की हाइब्रिड ई-कॉमर्स कंपनी (D2C Own Brand + Multi-Vendor Marketplace):**\n\n• **हाइब्रिड मॉडल:** अपना D2C ब्रांड (~65–70% स्ट्रैटेजिक फोकस) + थर्ड-पार्टी सेलर मार्केटप्लेस (~30–35% स्ट्रैटेजिक फोकस — यह रणनीतिक प्राथमिकता है, वेरिफ़ाइड रेवेन्यू नहीं)।\n• **Alpha Media Team:** हमारी इन-हाउस मीडिया टीम रोज़ाना Instagram, Facebook और सोशल मीडिया पर ZebAlpha के प्रोडक्ट्स और पार्टनर ब्रांड्स की ब्रांडिंग व प्रमोशन करती है।\n• **Alpha Seller Support Team:** सेलर्स को रजिस्ट्रेशन, Enrolment ID, कैटलॉग, डिस्पैच और ग्रोथ में पूरी मदद देती है।\n• **ग्राहक फायदे:** Real Product Video Proof, Zero-MOQ Custom Print Studio, Alpha AI (हिन्दी/बांग्ला/अंग्रेजी), UPI/COD और 5-दिन आसान रिटर्न।`;
      }
      if (language === "hi_latin") {
        return `✨ **ZebAlpha — India ki Hybrid E-Commerce Company (D2C Own Brand + Multi-Vendor Marketplace):**\n\n• **Hybrid Model:** Apna D2C Brand (~65–70% strategic focus) + Third-Party Seller Marketplace (~30–35% strategic focus — strategic priority, verified revenue nahi).\n• **Alpha Media Team:** Hamari in-house media team rozana Instagram, Facebook & social media par ZebAlpha ke products aur partner brands ki branding & promotion karti hai!\n• **Alpha Seller Support Team:** Sellers ko onboarding, Enrolment ID, catalog, dispatch & growth mein full hands-on help karti hai.\n• **Customers ke liye:** Real Product Video Proof, Zero-MOQ Custom Studio, Alpha AI (Hindi/Bengali/English), UPI/COD & 5-day easy returns!`;
      }
      return `✨ **ZebAlpha — India's Technology-Driven Hybrid E-Commerce Company**\n\n• **Hybrid Business Model:** Combines **ZebAlpha's Own D2C Brand (~65–70% strategic focus)** with a **Multi-Vendor Third-Party Seller Marketplace (~30–35% strategic focus)** *(intended strategic priorities, not verified revenue figures)*.\n• **Alpha Media Team:** Our dedicated in-house social media team creates and publishes daily branding and product promotions across **Instagram, Facebook & social channels** for ZebAlpha and partner brands.\n• **Alpha Seller Support Team:** Dedicated human team assisting sellers end-to-end with onboarding, Enrolment ID setup, catalog uploads, variants, and dispatch.\n• **Customer Edge:** Real Product Video Proof, Zero-MOQ Custom Print Studio, Alpha AI multilingual voice shopping, UPI/COD & 5-day easy returns (with 0% product commission for eligible sellers).`;
    }

    if (language === "bn") {
      return `🏢 **ZebAlpha লিডারশিপ টিম (কলকাতা, ভারত):**\n\n• **Rahul Adhikary** — **Founder & Chief Executive Officer (CEO)** (ভিশন, বিজনেস স্ট্র্যাটেজি, প্রোডাক্ট ইনোভেশন ও টেকনোলজি ডিরেকশন)\n• **Alakesh Biswas** — **Co-Founder & Chief Operating Officer (COO)** (বিজনেস অপারেশনস, সেলার অনবোর্ডিং, অপারেশনাল প্ল্যানিং ও এক্সিকিউশন)\n\nআমাদের দর্শন: *"Don't just work for the company. Build the company with us."* — **ZebAlpha — Built Together. Growing Together.**`;
    }
    if (language === "bn_latin") {
      return `🏢 **ZebAlpha Leadership Team (Kolkata, India):**\n\n• **Rahul Adhikary** — **Founder & Chief Executive Officer (CEO)** (company vision, strategy, product innovation & technology direction)\n• **Alakesh Biswas** — **Co-Founder & Chief Operating Officer (COO)** (business operations, seller onboarding & operational execution)\n\nAmader philosophy: *"Don't just work for the company. Build the company with us."* — **ZebAlpha — Built Together. Growing Together.**`;
    }
    if (language === "hi") {
      return `🏢 **ZebAlpha लीडरशिप टीम (कोलकाता, भारत):**\n\n• **Rahul Adhikary** — **Founder & Chief Executive Officer (CEO)** (कंपनी का विज़न, बिज़नेस स्ट्रैटेजी, प्रोडक्ट इनोवेशन और टेक्नोलॉजी डायरेक्शन)\n• **Alakesh Biswas** — **Co-Founder & Chief Operating Officer (COO)** (बिज़नेस ऑपरेशंस, सेलर ऑनबोर्डिंग, प्लानिंग और एक्ज़ीक्यूशन)\n\nहमारा सिद्धांत: *"Don't just work for the company. Build the company with us."* — **ZebAlpha — Built Together. Growing Together.**`;
    }
    if (language === "hi_latin") {
      return `🏢 **ZebAlpha Leadership Team (Kolkata, India):**\n\n• **Rahul Adhikary** — **Founder & Chief Executive Officer (CEO)** (company vision, business strategy, product innovation aur technology direction)\n• **Alakesh Biswas** — **Co-Founder & Chief Operating Officer (COO)** (business operations, seller onboarding aur execution)\n\nHamari philosophy: *"Don't just work for the company. Build the company with us."* — **ZebAlpha — Built Together. Growing Together.**`;
    }
    return `🏢 **Leadership at ZebAlpha (Kolkata, India):**\n\n• **Rahul Adhikary** — **Founder & Chief Executive Officer (CEO)**: Leads ZebAlpha's overall vision, business strategy, product innovation, technology direction, and long-term growth.\n• **Alakesh Biswas** — **Co-Founder & Chief Operating Officer (COO)**: Leads business operations, seller onboarding & relationships, operational planning, and execution.\n\n**Our Philosophy:** *"Don't just work for the company. Build the company with us."* — **ZebAlpha — Built Together. Growing Together.**`;
  }

  // 2. Support Queries (Localized!)
  if (analysis.isSupportOnly) {
    if (/(track|order|delivery|shipping|কবে|ট্র্যাক|অর্ডার|ट्रैक|ऑर्डर|kothay|kahan)/i.test(normalized)) {
      if (language === "bn" || language === "bn_latin") {
        return `📦 **অর্ডার ট্র্যাকিং ও ডেলিভারি:**\n\nআপনার অর্ডারের লাইভ স্ট্যাটাস দেখতে **My Account → My Orders** পেজে যান। সাধারণত ২–৫ কর্মদিবসের মধ্যে ডেলিভারি হয়ে যায়। কোনো সমস্যা হলে আপনার **Order ID** এখানে শেয়ার করুন।`;
      }
      if (language === "hi" || language === "hi_latin") {
        return `📦 **ऑर्डर ट्रैकिंग और डिलीवरी:**\n\nअपने ऑर्डर का लाइव स्टेटस देखने के लिए **My Account → My Orders** पर जाएँ। डिलीवरी आमतौर पर 2–5 वर्किंग डेज़ में हो जाती है। मदद के लिए अपना **Order ID** शेयर करें।`;
      }
      return `📦 **Order Tracking & Delivery:**\n\nCheck live tracking anytime under **My Account → My Orders**. Standard Pan-India delivery takes **2–5 business days**. Share your **Order ID** if you need help with a specific order.`;
    }

    if (/(return|exchange|refund|রিটার্ন|রিফান্ড|রিসেপ্ট|रिटर्न|रिफंड|wapas)/i.test(normalized)) {
      if (language === "bn" || language === "bn_latin") {
        return `🔄 **৫ দিনের সহজ রিটার্ন ও রিফান্ড পলিসি:**\n\nডেলিভারির **৫ দিনের মধ্যে** অব্যবহৃত ও ট্যাগসহ প্রোডাক্ট **My Orders → Request Return** থেকে রিটার্ন বা সাইজ এক্সচেঞ্জ করতে পারবেন। কোয়ালিটি চেকের পর ৩–৫ কর্মদিবসে রিফান্ড হয়ে যায়।`;
      }
      if (language === "hi" || language === "hi_latin") {
        return `🔄 **5-दिन आसान रिटर्न और रिफंड पॉलिसी:**\n\nडिलीवरी के **5 दिनों के भीतर** **My Orders → Request Return** से रिटर्न या एक्सचेंज रिक्वेस्ट कर सकते हैं (प्रोडक्ट बिना इस्तेमाल और ओरिजिनल टैग के साथ होना चाहिए)। जांच के बाद 3–5 दिनों में रिफंड मिल जाता है।`;
      }
      return `🔄 **5-Day Easy Return & Refund Policy:**\n\nRequest a return or size exchange within **5 days of delivery** via **My Account → My Orders → Request Return** (unused with original tags intact). Refunds process within **3–5 business days** after quality inspection.`;
    }

    if (/(payment|cod|upi|pay|পেমেন্ট|पेमेंट)/i.test(normalized)) {
      if (language === "bn" || language === "bn_latin") {
        return `💳 **পেমেন্ট অপশন:**\n\nZEBALPHA-তে **UPI (GPay, PhonePe, Paytm), ডেবিট/ক্রেডিট কার্ড, নেট ব্যাঙ্কিং** এবং **Cash on Delivery (COD)** — সবই সাপোর্ট করে। *(মনে রাখবেন: ZEBALPHA কখনোই আপনার OTP বা UPI PIN চায় না!)*`;
      }
      if (language === "hi" || language === "hi_latin") {
        return `💳 **पेमेंट विकल्प:**\n\nZEBALPHA पर **UPI (GPay, PhonePe, Paytm), कार्ड, नेट बैंकिंग** और **Cash on Delivery (COD)** सभी उपलब्ध हैं। *(सुरक्षा: ZEBALPHA कभी भी आपका OTP या UPI PIN नहीं मांगता!)*`;
      }
      return `💳 **Accepted Payment Methods:**\n\nWe accept **UPI (GPay, PhonePe, Paytm), Credit/Debit Cards, Net Banking**, and **Cash on Delivery (COD)**. *(Safety reminder: ZEBALPHA never asks for your OTP or UPI PIN.)*`;
    }

    // General Support Escalation
    if (language === "bn" || language === "bn_latin") {
      return `👨‍💼 **ZEBALPHA কাস্টমার সাপোর্ট:**\n\nসরাসরি আমাদের সাপোর্ট টিমের সাথে কথা বলতে **Help & Support** পেজে যান অথবা ইমেইল করুন: **support@zebalpha.shop**। দ্রুত সমাধানের জন্য আপনার **Order ID** সাথে রাখুন।`;
    }
    if (language === "hi" || language === "hi_latin") {
      return `👨‍💼 **ZEBALPHA कस्टमर सपोर्ट:**\n\nहमारी सपोर्ट टीम से बात करने के लिए **Help & Support** पेज पर जाएँ या ईमेल करें: **support@zebalpha.shop**। तेज़ मदद के लिए अपना **Order ID** तैयार रखें।`;
    }
    return `👨‍💼 **ZEBALPHA Customer Support:**\n\nVisit our **Help & Support** page or email **support@zebalpha.shop** with your **Order ID** for quick assistance from our support team.`;
  }

  // 3. Product Search Results (Strict Match Feedback + Rating & High-Order Explanation!)
  if (products.length > 0) {
    const budgetTextBn = maxPrice ? `₹${maxPrice}-এর মধ্যে ` : "";
    const budgetTextHi = maxPrice ? `₹${maxPrice} के अंदर ` : "";
    const budgetTextEn = maxPrice ? ` under ₹${maxPrice}` : "";

    const hasRated = products.some((p) => (p.rating || 0) > 0);
    const hasOrders = products.some((p) => (p.order_count || 0) > 0);
    const rankBasisEn =
      hasRated && hasOrders
        ? "ranked by **customer ratings & high orders**"
        : hasOrders
          ? "ranked by **most ordered bestsellers**"
          : hasRated
            ? "ranked by **highest customer ratings**"
            : "hand-picked from our **verified live catalog**";

    if (matchMode === "budget_relaxed" && maxPrice) {
      const startPrice = nearestPrice ? `₹${nearestPrice}` : `₹${products[0].price}`;
      if (language === "bn") {
        return `এই মুহূর্তে ₹${maxPrice}-এর মধ্যে কোনো **${itemLabel}** স্টকে নেই — তবে আপনার জন্য একই ক্যাটাগরির সবচেয়ে কাছাকাছি সেরা রেটেড **${itemLabel}** (${startPrice} থেকে) নিচে দেওয়া হলো:`;
      }
      if (language === "bn_latin") {
        return `Ei muhurte ₹${maxPrice}-er moddhe kono **${itemLabel}** stock-e nei — tobe same category-r sobcheye kachakachi top-rated **${itemLabel}** (${startPrice} theke) niche dekhalo holo:`;
      }
      if (language === "hi") {
        return `अभी ₹${maxPrice} के अंदर कोई **${itemLabel}** स्टॉक में नहीं है — लेकिन इसी कैटेगरी के सबसे नज़दीकी बेस्ट-रेटेड **${itemLabel}** (${startPrice} से शुरू) नीचे दिए गए हैं:`;
      }
      if (language === "hi_latin") {
        return `Abhi ₹${maxPrice} ke andar koi **${itemLabel}** stock mein nahi hai — par same category ke sabse paas wale top-rated **${itemLabel}** (${startPrice} se shuru) niche diye gaye hain:`;
      }
      return `There are currently no **${itemLabel}** under ₹${maxPrice}, so I didn’t show unrelated items. Here are the closest top-rated **${itemLabel}** starting from **${startPrice}**:`;
    }

    if (matchMode === "color_relaxed") {
      if (language === "bn") {
        return `আপনার চাওয়া exact কালারে এখন স্টক নেই, তবে ${budgetTextBn}আমাদের সেরা রেটিং ও বেশি অর্ডার হওয়া **${itemLabel}** নিচে দেওয়া হলো:`;
      }
      if (language === "bn_latin") {
        return `Apnar chawa exact color-e ekhon stock nei, tobe ${budgetTextBn}amader top-rated & high-order **${itemLabel}** niche dekhano holo:`;
      }
      if (language === "hi") {
        return `आपके पसंदीदा रंग में अभी स्टॉक उपलब्ध नहीं है, लेकिन ${budgetTextHi}हमारे टॉप-रेटेड और सबसे ज़्यादा ऑर्डर किए गए **${itemLabel}** नीचे दिए गए हैं:`;
      }
      if (language === "hi_latin") {
        return `Exact color mein abhi stock nahi hai, par ${budgetTextHi}hamare top-rated aur high-order **${itemLabel}** niche diye gaye hain:`;
      }
      return `That exact color is currently out of stock, so here are our highest-rated & most-ordered **${itemLabel}**${budgetTextEn}:`;
    }

    // Exact or general top picks
    if (language === "bn") {
      return `আপনার জন্য ${budgetTextBn}**কাস্টমার রেটিং ও বেশি অর্ডার** অনুযায়ী সেরা **${itemLabel}** খুঁজে এনেছি 👇\nনিচের যেকোনো কার্ডে ট্যাপ করে সরাসরি ডিটেইলস দেখুন বা কার্টে যোগ করুন!`;
    }
    if (language === "bn_latin") {
      return `Apnar jonno ${budgetTextBn}**top rating & high order** onujayi sera **${itemLabel}** khuje enechi 👇\nNicher jekono card-e tap kore direct details dekhun ba Cart-e add korun!`;
    }
    if (language === "hi") {
      return `आपके लिए ${budgetTextHi}**टॉप रेटिंग और सबसे ज़्यादा ऑर्डर** के हिसाब से बेहतरीन **${itemLabel}** चुने हैं 👇\nनीचे किसी भी कार्ड पर टैप करके सीधे देखें या कार्ट में जोड़ें!`;
    }
    if (language === "hi_latin") {
      return `Aapke liye ${budgetTextHi}**top rating aur high orders** ke hisaab se best **${itemLabel}** chune hain 👇\nNiche kisi bhi card par tap karke direct dekhein ya cart mein add karein!`;
    }
    return `Here are the best **${itemLabel}**${budgetTextEn} — ${rankBasisEn} 👇\nTap any product card below to view details or add straight to your cart!`;
  }

  // 4. Zero matching products found (STRICT honesty — NEVER show wrong products!)
  if (analysis.isShoppingIntent && products.length === 0) {
    if (language === "bn") {
      return `দুঃখিত, এই মুহূর্তে আমাদের ক্যাটালগে আপনার খোঁজা **${itemLabel}**${maxPrice ? ` (₹${maxPrice}-এর মধ্যে)` : ""} স্টকে নেই — তাই ভুল বা অপ্রাসঙ্গিক কোনো প্রোডাক্ট দেখানো হলো না।\n\nআপনি অন্য কোনো ক্যাটাগরি (যেমন: **টি-শার্ট, কুর্তি, হুডি, শার্ট, জুতো**) বা বাজেট লিখে খুঁজতে পারেন!`;
    }
    if (language === "bn_latin") {
      return `Sorry, ei muhurte amader catalog-e **${itemLabel}**${maxPrice ? ` (₹${maxPrice}-er moddhe)` : ""} stock-e nei — tai vul-val ba onno kono product dekhano holo na.\n\nApni onno category (jemon: **T-Shirt, Kurti, Hoodie, Shirt, Shoes**) ba budget likhe search korte paren!`;
    }
    if (language === "hi") {
      return `माफ़ कीजिए, अभी हमारे कैटलॉग में **${itemLabel}**${maxPrice ? ` (₹${maxPrice} के अंदर)` : ""} स्टॉक में उपलब्ध नहीं है — इसलिए मैंने कोई गलत प्रोडक्ट नहीं दिखाया।\n\nआप दूसरी कैटेगरी (जैसे **टी-शर्ट, कुर्ती, हुडी, शर्ट, जूते**) या बजट पूछ सकते हैं!`;
    }
    if (language === "hi_latin") {
      return `Sorry, abhi hamare catalog mein **${itemLabel}**${maxPrice ? ` (₹${maxPrice} ke andar)` : ""} stock mein nahi hai — isliye maine koi galat product nahi dikhaya.\n\nAap dusri category (jaise **T-Shirt, Kurti, Hoodie, Shirt, Shoes**) ya budget try kar sakte hain!`;
    }
    return `Sorry, we currently don’t have matching **${itemLabel}**${maxPrice ? ` under ₹${maxPrice}` : ""} in stock — so I won’t show you irrelevant items.\n\nTry another category like **T-Shirts, Kurtis, Hoodies, Polos, or Footwear**, or adjust your budget!`;
  }

  // Default helpful multilingual prompt
  if (language === "bn") {
    return `আমি **Alpha AI**, আপনার ZEBALPHA শপিং অ্যাসিস্ট্যান্ট! বলুন আপনি কী খুঁজছেন — যেমন: *"৫০০ টাকার মধ্যে টি-শার্ট দেখাও"* বা *"সেরা রেটিং-এর কুর্তি দেখাও"*।`;
  }
  if (language === "hi") {
    return `मैं **Alpha AI** हूँ, आपका ZEBALPHA शॉपिंग असिस्टेंट! बताइए आप क्या ढूँढ रहे हैं — जैसे: *"500 रुपये के अंदर टी-शर्ट दिखाओ"* या *"बेस्ट रेटेड कुर्ती दिखाओ"*।`;
  }
  return `I’m **Alpha AI**, your 24/7 ZEBALPHA shopping assistant! Ask me in **English, বাংলা, or हिन्दी** — for example: *"Oversized tee under 500"*, *"৫০০ টাকার মধ্যে টি-শার্ট দেখাও"*, or *"500 ke andar hoodie dikhao"*.`;
}

/**
 * Optional LLM Enhancement (Gemini API or OpenAI API if configured).
 * Strictly grounded on the pre-filtered & rating/order-ranked product list so the model
 * can NEVER hallucinate fake or wrong-category products, and ALWAYS replies in the customer's language.
 */
export async function generateOptionalGroundedAiReply(params: {
  prompt: string;
  history: Array<{ role: string; content: string }>;
  analysis: AssistantAnalysis;
  products: AssistantRecommendedProduct[];
  matchMode: AssistantMatchMode;
}): Promise<{ reply: string; provider: "gemini" | "openai" } | null> {
  const { prompt, history, analysis, products, matchMode } = params;
  if (analysis.isCompanyInfoQuery || analysis.isGreeting) return null;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;
  if (!geminiKey && !openAiKey) return null;

  const langRule: Record<AssistantLanguage, string> = {
    bn: "Reply strictly in natural, warm Bengali script (বাংলা).",
    bn_latin: "Reply strictly in friendly Banglish (Bengali written in English letters, e.g. 'Apnar jonno...').",
    hi: "Reply strictly in natural, warm Hindi Devanagari script (हिन्दी).",
    hi_latin: "Reply strictly in friendly Hinglish (Hindi written in English letters, e.g. 'Aapke liye...').",
    en: "Reply strictly in concise, friendly Indian English.",
  };

  const groundedCatalog =
    products.length > 0
      ? products
          .map(
            (p, idx) =>
              `${idx + 1}. ${p.name} | Price: ₹${p.price}${p.mrp && p.mrp > p.price ? ` (MRP ₹${p.mrp})` : ""} | Rating: ${p.rating ? `${p.rating}/5 (${p.review_count} reviews)` : "New"} | Orders: ${p.order_count || 0} | Badge: ${p.match_reason || "Top Pick"}`
          )
          .join("\n")
      : "NO MATCHING PRODUCTS FOUND IN LIVE CATALOG.";

  const systemPrompt = `You are Alpha AI, ZEBALPHA's 24/7 Smart Multilingual Shopping Assistant.
LANGUAGE RULE: ${langRule[analysis.language]}
COMPANY FACTS: ZebAlpha is a technology-driven hybrid e-commerce company based in Kolkata, West Bengal, India combining D2C own-brand sales (~65-70% strategic focus) with a third-party multi-vendor marketplace (~30-35% strategic focus — strategic priorities, not verified revenue). Led by Rahul Adhikary (Founder & CEO) and Alakesh Biswas (Co-Founder & COO). Backed by in-house Alpha Media Team (daily Instagram/Facebook branding & product promotion) and Alpha Seller Support Team (full seller assistance). Philosophy: "Don't just work for the company. Build the company with us." — Built Together. Growing Together.
STORE RULES: 5-day easy returns/exchanges, 2-5 day Pan-India delivery, UPI & COD accepted, never ask for OTP/PIN.
STRICT GROUNDING RULES:
- Match Mode: ${matchMode}.
- ONLY recommend or mention products from the VERIFIED LIVE MATCHES below. NEVER invent products or mention unrelated categories.
- Highlight why these picks were chosen (customer ratings, high order volume, or great value within budget).
- Keep your reply super concise (2-4 short sentences max) because clickable product cards are rendered right below your message.
- If NO MATCHING PRODUCTS FOUND, apologize politely in the customer's language, say we don't show unrelated items, and invite them to try another category or budget.

VERIFIED LIVE MATCHES:
${groundedCatalog}`;

  // 1. Prefer Gemini Flash if GEMINI_API_KEY is configured (super fast & low cost)
  if (geminiKey) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const contents = [
        ...history.slice(-4).map((m) => ({
          role: m.role === "user" ? "user" : "model",
          parts: [{ text: m.content }],
        })),
      ];
      if (contents.length === 0 || contents[contents.length - 1].role !== "user") {
        contents.push({ role: "user", parts: [{ text: prompt }] });
      }

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(geminiKey)}`,
        {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents,
            generationConfig: {
              temperature: 0.35,
              maxOutputTokens: 260,
            },
          }),
        }
      );
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) return { reply: text, provider: "gemini" };
      }
    } catch {
      // Fall through to OpenAI or deterministic free engine
    }
  }

  // 2. Fallback to OpenAI gpt-4o-mini if OPENAI_API_KEY is configured
  if (openAiKey) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const messages = [
        { role: "system", content: systemPrompt },
        ...history.slice(-4).map((m) => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.content,
        })),
      ];
      if (messages.length === 1) {
        messages.push({ role: "user", content: prompt });
      }

      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.35,
          max_tokens: 260,
          messages,
        }),
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content?.trim();
        if (text) return { reply: text, provider: "openai" };
      }
    } catch {
      // Fall back cleanly to ₹0 deterministic multilingual engine
    }
  }

  return null;
}
