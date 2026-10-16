/**
 * ZEBALPHA — VIRTUAL TRY-ON (VTO) PRODUCT ELIGIBILITY POLICY
 * Express Backend ES Module implementation.
 * 
 * ENFORCEMENT RULES:
 * 1. Hard Restricted Intimate Apparel: NEVER eligible for Virtual Try-On.
 *    (Bras, bralettes, panties, underwear, thongs, g-strings, lingerie, innerwear).
 *    Admin flags CANNOT override this restriction.
 * 2. Non-Apparel Categories: Only fashion apparel items can be tried on.
 *    (Electronics, beauty, kitchenware, bedding, etc. are not eligible).
 * 3. Indeterminate / Missing Category: If a product's category cannot be
 *    determined, Try-On is disabled by default until reviewed.
 * 4. Admin Override: Admin can disable Try-On per-product (`is_vto_enabled: false`).
 * 5. Variant Inheritance: Variants inherit their parent product's eligibility
 *    unless an authorized admin explicitly configures a stricter restriction.
 */

export const RESTRICTED_INTIMATE_TERMS = [
  'bra',
  'bras',
  'bralette',
  'bralettes',
  'sports bra',
  'sports-bra',
  'panty',
  'panties',
  'underwear',
  'under-wear',
  'thong',
  'thongs',
  'g-string',
  'g string',
  'gstring',
  'lingerie',
  'lingerie set',
  'innerwear',
  'undergarment',
  'undergarments',
  'briefs',
  'boxer briefs',
  'bikini bottom',
  'swimwear bottom',
  'babydoll',
  'chemise',
  'intimates',
  'intimate apparel'
];

export const RESTRICTED_CATEGORY_SLUGS = [
  'lingerie',
  'innerwear',
  'underwear',
  'bras-panties',
  'intimate-wear',
  'sleepwear-intimate'
];

export const SUPPORTED_UPPER_BODY_TERMS = [
  't-shirt',
  'tshirt',
  't shirt',
  'tee',
  'tees',
  'shirt',
  'shirts',
  'polo',
  'top',
  'tops',
  'tunic',
  'tunics',
  'blouse',
  'blouses',
  'kurta',
  'kurtas',
  'hoodie',
  'hoodies',
  'sweatshirt',
  'sweatshirts',
  'jacket',
  'jackets',
  'coat',
  'coats',
  'blazer',
  'blazers',
  'sweater',
  'sweaters',
  'cardigan',
  'cardigans',
  'shrug',
  'shrugs',
  'waistcoat',
  'vest'
];

export const SUPPORTED_LOWER_BODY_TERMS = [
  'jeans',
  'jean',
  'denim',
  'trouser',
  'trousers',
  'pant',
  'pants',
  'chino',
  'chinos',
  'shorts',
  'short',
  'skirt',
  'skirts',
  'jogger',
  'joggers',
  'track pant',
  'track pants',
  'sweatpants',
  'cargo',
  'cargos',
  'cargo pants',
  'palazzo',
  'palazzos',
  'leggings',
  'bottomwear'
];

export const SUPPORTED_DRESSES_TERMS = [
  'dress',
  'dresses',
  'gown',
  'gowns',
  'maxi',
  'midi',
  'mini dress',
  'bodycon',
  'jumpsuit',
  'jumpsuits',
  'romper',
  'rompers',
  'kurti',
  'kurtis',
  'suit set',
  'salwar suit',
  'anarkali',
  'saree',
  'sarees',
  'lehenga',
  'ethnic set',
  'co-ord',
  'coord',
  'traditional outfit'
];

export const NON_APPAREL_TERMS = [
  'bottle',
  'flask',
  'tumbler',
  'container',
  'box',
  'pan',
  'kadhai',
  'cookware',
  'bedsheet',
  'pillow',
  'curtain',
  'earphone',
  'headphone',
  'earbud',
  'case',
  'cover',
  'charger',
  'cable',
  'smartwatch',
  'watch',
  'lipstick',
  'makeup',
  'cosmetic',
  'serum',
  'cream',
  'lotion',
  'perfume',
  'deodorant',
  'ring',
  'necklace',
  'earring',
  'bangle',
  'handbag',
  'wallet',
  'backpack',
  'shoes',
  'sneakers',
  'sandals',
  'slippers',
  'footwear'
];

function containsKeyword(text, keywords) {
  if (!text) return false;
  const lower = text.toLowerCase().trim();
  return keywords.some((kw) => {
    const pattern = new RegExp(`(^|[^a-z0-9])${kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}([^a-z0-9]|$)`, 'i');
    return pattern.test(lower);
  });
}

/**
 * Evaluates Virtual Try-On Eligibility for a Product or Variant
 */
export function evaluateProductTryOnEligibility(product, selectedVariant) {
  if (!product) {
    return {
      isEligible: false,
      reason: 'Product information is missing.',
      categoryType: null,
      isRestrictedIntimate: false,
      adminOverrideApplied: false,
      detectedCategory: 'unknown'
    };
  }

  const specs = (product.specifications && typeof product.specifications === 'object')
    ? product.specifications
    : {};

  const name = String(product.name || '').trim();
  const description = String(product.description || '').trim();
  const categoryName = String(product.category_name || specs.category || '').trim();
  const subcategoryName = String(specs.subcategory || '').trim();
  const productTypeId = String(specs.product_type || specs.productTypeId || '').trim();
  const categorySlug = String(product.category_slug || product.slug || '').trim();
  const virtualCategory = String(product.virtual_tryon_category || specs.virtual_tryon_category || '').trim().toLowerCase();

  const combinedSearchText = [
    name,
    categoryName,
    subcategoryName,
    productTypeId,
    categorySlug,
    description.slice(0, 300)
  ].join(' ').toLowerCase();

  // 1. Strict Intimate Restriction (Hard Rule - No Overrides Allowed)
  const isRestrictedIntimate = 
    containsKeyword(combinedSearchText, RESTRICTED_INTIMATE_TERMS) ||
    RESTRICTED_CATEGORY_SLUGS.some((slug) => categorySlug.includes(slug) || categoryName.toLowerCase().includes(slug));

  if (isRestrictedIntimate) {
    return {
      isEligible: false,
      reason: 'Virtual Try-On is strictly not available for intimate apparel and underwear for privacy and hygiene standards.',
      categoryType: null,
      isRestrictedIntimate: true,
      adminOverrideApplied: false,
      detectedCategory: 'intimate_apparel'
    };
  }

  // 2. Non-Apparel Categories Exclusion
  const mainCat = String(product.main_category || specs.main_category || '').toLowerCase();
  const isExplicitNonFashion = 
    mainCat.includes('home') || 
    mainCat.includes('kitchen') || 
    mainCat.includes('electronic') || 
    mainCat.includes('beauty') ||
    mainCat.includes('cosmetic');

  if (isExplicitNonFashion || containsKeyword(combinedSearchText, NON_APPAREL_TERMS)) {
    const hasApparelKeyword = 
      containsKeyword(name, SUPPORTED_UPPER_BODY_TERMS) ||
      containsKeyword(name, SUPPORTED_LOWER_BODY_TERMS) ||
      containsKeyword(name, SUPPORTED_DRESSES_TERMS);

    if (!hasApparelKeyword) {
      return {
        isEligible: false,
        reason: 'Virtual Try-On is only available for eligible fashion apparel products.',
        categoryType: null,
        isRestrictedIntimate: false,
        adminOverrideApplied: false,
        detectedCategory: 'non_apparel'
      };
    }
  }

  // 3. Admin-Managed Product Override
  if (product.is_vto_enabled === false || specs.is_vto_enabled === false || specs.try_on_eligible === false) {
    return {
      isEligible: false,
      reason: 'Virtual Try-On has been disabled for this product by the store administrator.',
      categoryType: null,
      isRestrictedIntimate: false,
      adminOverrideApplied: true,
      detectedCategory: 'admin_disabled'
    };
  }

  // 4. Variant-Level Restriction / Inheritance
  if (selectedVariant) {
    if (selectedVariant.is_vto_enabled === false || selectedVariant.try_on_eligible === false) {
      return {
        isEligible: false,
        reason: 'Virtual Try-On has been restricted for this specific variant.',
        categoryType: null,
        isRestrictedIntimate: false,
        adminOverrideApplied: true,
        detectedCategory: 'variant_restricted'
      };
    }
  }

  // 5. Resolve AI Category Mode (Upper, Lower, Dresses)
  let resolvedCategoryType = null;
  let detectedCategory = 'unknown';

  if (['upper_body', 'tops', 'outerwear', 'hoodies'].includes(virtualCategory)) {
    resolvedCategoryType = 'upper_body';
    detectedCategory = 'upper_body';
  } else if (['lower_body', 'bottoms'].includes(virtualCategory)) {
    resolvedCategoryType = 'lower_body';
    detectedCategory = 'lower_body';
  } else if (['dresses', 'one-pieces', 'ethnic'].includes(virtualCategory)) {
    resolvedCategoryType = 'dresses';
    detectedCategory = 'dresses';
  }

  if (!resolvedCategoryType) {
    if (containsKeyword(combinedSearchText, SUPPORTED_DRESSES_TERMS)) {
      resolvedCategoryType = 'dresses';
      detectedCategory = 'dresses';
    } else if (containsKeyword(combinedSearchText, SUPPORTED_LOWER_BODY_TERMS)) {
      resolvedCategoryType = 'lower_body';
      detectedCategory = 'lower_body';
    } else if (containsKeyword(combinedSearchText, SUPPORTED_UPPER_BODY_TERMS)) {
      resolvedCategoryType = 'upper_body';
      detectedCategory = 'upper_body';
    }
  }

  // 6. Indeterminate / Missing Category
  if (!resolvedCategoryType) {
    return {
      isEligible: false,
      reason: "This product's category is pending review for Virtual Try-On eligibility.",
      categoryType: null,
      isRestrictedIntimate: false,
      adminOverrideApplied: false,
      detectedCategory: 'indeterminate'
    };
  }

  // Eligible!
  return {
    isEligible: true,
    reason: 'Product is eligible for Virtual Try-On.',
    categoryType: resolvedCategoryType,
    isRestrictedIntimate: false,
    adminOverrideApplied: product.is_vto_enabled === true || specs.is_vto_enabled === true,
    detectedCategory
  };
}
