/**
 * ZEBALPHA AUTOMATIC CATEGORY ICON SYSTEM & LOCALIZATION
 * Centralized registry mapping category semantics to stable icon keys
 * and multi-language support (English & Hindi).
 */

export type CategoryIconKey =
  | 'shirt'
  | 'dress'
  | 'smartphone'
  | 'laptop'
  | 'sparkles'
  | 'house'
  | 'handbag'
  | 'footwear'
  | 'watch'
  | 'dumbbell'
  | 'book'
  | 'baby'
  | 'shopping-basket'
  | 'tag'
  | 'package';

export interface CategoryIconMeta {
  key: CategoryIconKey;
  label: string;
  keywords: string[];
  lucideIconName: string;
  defaultHindiLabel: string;
}

export const CATEGORY_ICON_REGISTRY: Record<CategoryIconKey, CategoryIconMeta> = {
  shirt: {
    key: 'shirt',
    label: "Men's Fashion",
    keywords: [
      'men', "men's", 'shirt', 't-shirt', 'tee', 'polo', 'hoodie', 'jacket',
      'topwear', 'kurta', 'streetwear', 'apparel', 'clothing', 'oversized',
      'jeans', 'trouser', 'bottomwear', 'cargo'
    ],
    lucideIconName: 'Shirt',
    defaultHindiLabel: 'पुरुषों का फैशन',
  },
  dress: {
    key: 'dress',
    label: "Women's Fashion",
    keywords: [
      'women', "women's", 'woman', 'ladies', 'dress', 'kurti', 'saree',
      'sari', 'lehenga', 'gown', 'ethnic', 'blouse', 'top', 'tops', 'skirt',
      'frock', 'suit', 'anarkali'
    ],
    lucideIconName: 'Sparkles', // Lucide standard for stylish women apparel / or Dress equivalent
    defaultHindiLabel: 'महिलाओं का फैशन',
  },
  smartphone: {
    key: 'smartphone',
    label: 'Mobiles & Accessories',
    keywords: [
      'mobile', 'mobiles', 'phone', 'smartphone', 'cell', 'case', 'charger',
      'tempered', 'cover', 'screen guard'
    ],
    lucideIconName: 'Smartphone',
    defaultHindiLabel: 'मोबाइल और एक्सेसरीज',
  },
  laptop: {
    key: 'laptop',
    label: 'Electronics',
    keywords: [
      'electronic', 'electronics', 'laptop', 'computer', 'audio', 'headphone',
      'earphone', 'bluetooth', 'speaker', 'gadget', 'tws', 'cable'
    ],
    lucideIconName: 'Laptop',
    defaultHindiLabel: 'इलेक्ट्रॉनिक्स',
  },
  sparkles: {
    key: 'sparkles',
    label: 'Beauty & Care',
    keywords: [
      'beauty', 'care', 'cosmetic', 'cosmetics', 'makeup', 'skincare',
      'haircare', 'lipstick', 'serum', 'lotion', 'cream', 'perfume',
      'fragrance', 'grooming'
    ],
    lucideIconName: 'Sparkles',
    defaultHindiLabel: 'सौंदर्य और देखभाल',
  },
  house: {
    key: 'house',
    label: 'Home & Kitchen',
    keywords: [
      'home', 'kitchen', 'decor', 'furnishing', 'bedsheet', 'curtain',
      'pillow', 'cookware', 'utensil', 'bottle', 'furniture', 'appliance',
      'living', 'room'
    ],
    lucideIconName: 'Home',
    defaultHindiLabel: 'घर और रसोई',
  },
  handbag: {
    key: 'handbag',
    label: 'Jewellery & Bags',
    keywords: [
      'bag', 'bags', 'handbag', 'purse', 'wallet', 'clutch', 'backpack',
      'sling', 'jewel', 'jewellery', 'jewelry', 'necklace', 'earring',
      'bangle', 'bracelet', 'ring'
    ],
    lucideIconName: 'ShoppingBag',
    defaultHindiLabel: 'आभूषण और बैग',
  },
  footwear: {
    key: 'footwear',
    label: 'Footwear',
    keywords: [
      'shoe', 'shoes', 'footwear', 'sneaker', 'sneakers', 'sandal', 'sandals',
      'slipper', 'slippers', 'boot', 'boots', 'loafer', 'heels', 'flats'
    ],
    lucideIconName: 'Footprints',
    defaultHindiLabel: 'जूते और चप्पल',
  },
  watch: {
    key: 'watch',
    label: 'Watches',
    keywords: [
      'watch', 'watches', 'smartwatch', 'clock', 'timepiece', 'chronograph'
    ],
    lucideIconName: 'Watch',
    defaultHindiLabel: 'घड़ियां',
  },
  dumbbell: {
    key: 'dumbbell',
    label: 'Sports & Fitness',
    keywords: [
      'sport', 'sports', 'fitness', 'gym', 'activewear', 'workout',
      'exercise', 'yoga'
    ],
    lucideIconName: 'Dumbbell',
    defaultHindiLabel: 'खेल और फिटनेस',
  },
  book: {
    key: 'book',
    label: 'Books & Stationery',
    keywords: [
      'book', 'books', 'stationery', 'novel', 'notebook', 'pen', 'office'
    ],
    lucideIconName: 'BookOpen',
    defaultHindiLabel: 'किताबें और स्टेशनरी',
  },
  baby: {
    key: 'baby',
    label: 'Kids & Toys',
    keywords: [
      'kid', 'kids', 'baby', 'toy', 'toys', 'child', 'children', 'infant',
      'boy', 'girl'
    ],
    lucideIconName: 'Baby',
    defaultHindiLabel: 'बच्चे और खिलौने',
  },
  'shopping-basket': {
    key: 'shopping-basket',
    label: 'Grocery & Gourmet',
    keywords: [
      'grocery', 'food', 'snack', 'tea', 'coffee', 'spice', 'organic',
      'beverage', 'gourmet'
    ],
    lucideIconName: 'ShoppingBasket',
    defaultHindiLabel: 'किराना और खाद्य',
  },
  tag: {
    key: 'tag',
    label: 'New Drops & Offers',
    keywords: [
      'drop', 'drops', 'offer', 'offers', 'deal', 'deals', 'sale', 'clearance',
      'trending', 'collection'
    ],
    lucideIconName: 'Tag',
    defaultHindiLabel: 'ऑफ़र और नई ड्रॉप्स',
  },
  package: {
    key: 'package',
    label: 'General Category',
    keywords: ['general', 'other', 'custom', 'miscellaneous'],
    lucideIconName: 'Package',
    defaultHindiLabel: 'अन्य श्रेणी',
  },
};

/**
 * Automatically resolves the most appropriate icon key for a category name
 * using NLP-style keyword matching and tokenization.
 */
export function resolveCategoryIcon(
  categoryName: string,
  existingIconKey?: string | null,
  existingIconSource?: string | null
): { icon_key: CategoryIconKey; icon_source: 'AUTO' | 'ADMIN' | 'FALLBACK' } {
  // If Super Admin explicitly specified an icon, never overwrite it
  if (existingIconSource === 'ADMIN' && existingIconKey && existingIconKey in CATEGORY_ICON_REGISTRY) {
    return {
      icon_key: existingIconKey as CategoryIconKey,
      icon_source: 'ADMIN',
    };
  }

  if (!categoryName || typeof categoryName !== 'string') {
    return { icon_key: 'package', icon_source: 'FALLBACK' };
  }

  const clean = categoryName.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
  const tokens = clean.split(/\s+/).filter(Boolean);

  // 1. Direct key match (e.g. name is "Footwear" or "Electronics")
  for (const [key, meta] of Object.entries(CATEGORY_ICON_REGISTRY)) {
    if (meta.key === 'package') continue;
    if (clean === key || clean.includes(meta.label.toLowerCase())) {
      return { icon_key: key as CategoryIconKey, icon_source: 'AUTO' };
    }
  }

  // 2. Tokenized keyword scoring
  let bestMatch: CategoryIconKey = 'package';
  let highestScore = 0;

  for (const [key, meta] of Object.entries(CATEGORY_ICON_REGISTRY)) {
    if (meta.key === 'package') continue;

    let score = 0;
    for (const kw of meta.keywords) {
      if (clean.includes(kw)) {
        score += kw.length > 4 ? 3 : 2;
      }
      for (const token of tokens) {
        if (token === kw) {
          score += 4;
        }
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = key as CategoryIconKey;
    }
  }

  if (highestScore > 0) {
    return { icon_key: bestMatch, icon_source: 'AUTO' };
  }

  return { icon_key: 'package', icon_source: 'FALLBACK' };
}

/**
 * Localization helper for Category Names (English <-> Hindi)
 */
export const CATEGORY_TRANSLATIONS: Record<'en' | 'hi', Record<string, string>> = {
  en: {
    for_you: 'For You',
    all_categories: 'All Categories',
    mens_fashion: "Men's Fashion",
    womens_fashion: "Women's Fashion",
    home_kitchen: 'Home & Kitchen',
    electronics: 'Electronics',
    beauty_care: 'Beauty & Care',
    jewellery_bags: 'Jewellery & Bags',
    footwear: 'Footwear',
    kids_toys: 'Kids & Toys',
  },
  hi: {
    for_you: 'आपके लिए',
    all_categories: 'सभी श्रेणियां',
    mens_fashion: 'पुरुषों का फैशन',
    womens_fashion: 'महिलाओं का फैशन',
    home_kitchen: 'घर और रसोई',
    electronics: 'इलेक्ट्रॉनिक्स',
    beauty_care: 'सौंदर्य और देखभाल',
    jewellery_bags: 'आभूषण और बैग',
    footwear: 'जूते और चप्पल',
    kids_toys: 'बच्चे और खिलौने',
  },
};

export function getLocalizedCategoryName(
  categoryName: string,
  lang: 'en' | 'hi' = 'en'
): string {
  if (!categoryName) return '';
  if (lang !== 'hi') return categoryName;

  const lower = categoryName.trim().toLowerCase();

  // Match known categories
  if (lower.includes('for you')) return CATEGORY_TRANSLATIONS.hi.for_you;
  if (lower.includes('men') && (lower.includes('fashion') || lower.includes('clothing') || lower.includes('apparel'))) return CATEGORY_TRANSLATIONS.hi.mens_fashion;
  if (lower.includes('women') && (lower.includes('fashion') || lower.includes('clothing') || lower.includes('ethnic') || lower.includes('kurti'))) return CATEGORY_TRANSLATIONS.hi.womens_fashion;
  if (lower.includes('home') || lower.includes('kitchen')) return CATEGORY_TRANSLATIONS.hi.home_kitchen;
  if (lower.includes('electronic') || lower.includes('mobile')) return CATEGORY_TRANSLATIONS.hi.electronics;
  if (lower.includes('beauty') || lower.includes('care') || lower.includes('cosmetic')) return CATEGORY_TRANSLATIONS.hi.beauty_care;
  if (lower.includes('jewel') || lower.includes('bag')) return CATEGORY_TRANSLATIONS.hi.jewellery_bags;
  if (lower.includes('footwear') || lower.includes('shoe')) return CATEGORY_TRANSLATIONS.hi.footwear;
  if (lower.includes('kid') || lower.includes('baby') || lower.includes('toy')) return CATEGORY_TRANSLATIONS.hi.kids_toys;

  // Safe fallback to original name (Zero hallucinations)
  return categoryName;
}
