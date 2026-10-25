/**
 * ZEBALPHA AUTOMATIC CATEGORY ICON SYSTEM (Backend Node.js ES Module)
 */

export const CATEGORY_ICON_REGISTRY = {
  shirt: {
    key: 'shirt',
    label: "Men's Fashion",
    keywords: [
      'men', "men's", 'shirt', 't-shirt', 'tee', 'polo', 'hoodie', 'jacket',
      'topwear', 'kurta', 'streetwear', 'apparel', 'clothing', 'oversized',
      'jeans', 'trouser', 'bottomwear', 'cargo'
    ],
  },
  dress: {
    key: 'dress',
    label: "Women's Fashion",
    keywords: [
      'women', "women's", 'woman', 'ladies', 'dress', 'kurti', 'saree',
      'sari', 'lehenga', 'gown', 'ethnic', 'blouse', 'top', 'tops', 'skirt',
      'frock', 'suit', 'anarkali'
    ],
  },
  smartphone: {
    key: 'smartphone',
    label: 'Mobiles & Accessories',
    keywords: [
      'mobile', 'mobiles', 'phone', 'smartphone', 'cell', 'case', 'charger',
      'tempered', 'cover', 'screen guard'
    ],
  },
  laptop: {
    key: 'laptop',
    label: 'Electronics',
    keywords: [
      'electronic', 'electronics', 'laptop', 'computer', 'audio', 'headphone',
      'earphone', 'bluetooth', 'speaker', 'gadget', 'tws', 'cable'
    ],
  },
  sparkles: {
    key: 'sparkles',
    label: 'Beauty & Care',
    keywords: [
      'beauty', 'care', 'cosmetic', 'cosmetics', 'makeup', 'skincare',
      'haircare', 'lipstick', 'serum', 'lotion', 'cream', 'perfume',
      'fragrance', 'grooming'
    ],
  },
  house: {
    key: 'house',
    label: 'Home & Kitchen',
    keywords: [
      'home', 'kitchen', 'decor', 'furnishing', 'bedsheet', 'curtain',
      'pillow', 'cookware', 'utensil', 'bottle', 'furniture', 'appliance',
      'living', 'room'
    ],
  },
  handbag: {
    key: 'handbag',
    label: 'Jewellery & Bags',
    keywords: [
      'bag', 'bags', 'handbag', 'purse', 'wallet', 'clutch', 'backpack',
      'sling', 'jewel', 'jewellery', 'jewelry', 'necklace', 'earring',
      'bangle', 'bracelet', 'ring'
    ],
  },
  footwear: {
    key: 'footwear',
    label: 'Footwear',
    keywords: [
      'shoe', 'shoes', 'footwear', 'sneaker', 'sneakers', 'sandal', 'sandals',
      'slipper', 'slippers', 'boot', 'boots', 'loafer', 'heels', 'flats'
    ],
  },
  watch: {
    key: 'watch',
    label: 'Watches',
    keywords: [
      'watch', 'watches', 'smartwatch', 'clock', 'timepiece', 'chronograph'
    ],
  },
  dumbbell: {
    key: 'dumbbell',
    label: 'Sports & Fitness',
    keywords: [
      'sport', 'sports', 'fitness', 'gym', 'activewear', 'workout',
      'exercise', 'yoga'
    ],
  },
  book: {
    key: 'book',
    label: 'Books & Stationery',
    keywords: [
      'book', 'books', 'stationery', 'novel', 'notebook', 'pen', 'office'
    ],
  },
  baby: {
    key: 'baby',
    label: 'Kids & Toys',
    keywords: [
      'kid', 'kids', 'baby', 'toy', 'toys', 'child', 'children', 'infant',
      'boy', 'girl'
    ],
  },
  'shopping-basket': {
    key: 'shopping-basket',
    label: 'Grocery & Gourmet',
    keywords: [
      'grocery', 'food', 'snack', 'tea', 'coffee', 'spice', 'organic',
      'beverage', 'gourmet'
    ],
  },
  tag: {
    key: 'tag',
    label: 'New Drops & Offers',
    keywords: [
      'drop', 'drops', 'offer', 'offers', 'deal', 'deals', 'sale', 'clearance',
      'trending', 'collection'
    ],
  },
  package: {
    key: 'package',
    label: 'General Category',
    keywords: ['general', 'other', 'custom', 'miscellaneous'],
  },
};

export function resolveCategoryIcon(categoryName, existingIconKey, existingIconSource) {
  if (existingIconSource === 'ADMIN' && existingIconKey && existingIconKey in CATEGORY_ICON_REGISTRY) {
    return {
      icon_key: existingIconKey,
      icon_source: 'ADMIN',
    };
  }

  if (!categoryName || typeof categoryName !== 'string') {
    return { icon_key: 'package', icon_source: 'FALLBACK' };
  }

  const clean = categoryName.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
  const tokens = clean.split(/\s+/).filter(Boolean);

  for (const [key, meta] of Object.entries(CATEGORY_ICON_REGISTRY)) {
    if (meta.key === 'package') continue;
    if (clean === key || clean.includes(meta.label.toLowerCase())) {
      return { icon_key: key, icon_source: 'AUTO' };
    }
  }

  let bestMatch = 'package';
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
      bestMatch = key;
    }
  }

  if (highestScore > 0) {
    return { icon_key: bestMatch, icon_source: 'AUTO' };
  }

  return { icon_key: 'package', icon_source: 'FALLBACK' };
}
