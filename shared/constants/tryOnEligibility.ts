/**
 * ZEBALPHA — VIRTUAL TRY-ON (VTO) PRODUCT ELIGIBILITY POLICY
 * Centralized, server-enforced eligibility matrix and evaluation rules.
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

export type TryOnCategoryMode = 'upper_body' | 'lower_body' | 'dresses';

export interface TryOnEligibilityResult {
  isEligible: boolean;
  reason: string;
  categoryType: TryOnCategoryMode | null;
  isRestrictedIntimate: boolean;
  adminOverrideApplied: boolean;
  detectedCategory: string;
}

// ---------------------------------------------------------------------------
// 1. EXPLICIT RESTRICTED INTIMATE KEYWORDS & CATEGORY SLUGS
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// 2. SUPPORTED APPAREL PRODUCT TYPES & KEYWORDS
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// 3. NON-APPAREL CATEGORIES / KEYWORDS (EXCLUDED FROM CLOTHING TRY-ON)
// ---------------------------------------------------------------------------
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

/**
 * Checks if a string contains any of the target keywords (whole word or boundary-safe)
 */
function containsKeyword(text: string, keywords: string[]): boolean {
  if (!text) return false;
  const lower = text.toLowerCase().trim();
  return keywords.some((kw) => {
    // Exact match or token match with boundaries
    const pattern = new RegExp(`(^|[^a-z0-9])${kw.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}([^a-z0-9]|$)`, 'i');
    return pattern.test(lower);
  });
}

/**
 * Evaluates Virtual Try-On Eligibility for a Product or Variant
 * 
 * @param product Product entity (with specifications, packages, category_id, etc.)
 * @param selectedVariant Optional selected variant/package
 * @returns Comprehensive eligibility evaluation result
 */
export function evaluateProductTryOnEligibility(
  product: any,
  selectedVariant?: any
): TryOnEligibilityResult {
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

  // Aggregate searchable metadata fields
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

  // -------------------------------------------------------------------------
  // RULE 1: STRICT INTIMATE APPAREL RESTRICTION (HARD BLOCK - NO OVERRIDES)
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // RULE 2: NON-APPAREL / HARDWARE / HOME EXCLUSION
  // -------------------------------------------------------------------------
  const mainCat = String(product.main_category || specs.main_category || '').toLowerCase();
  const isExplicitNonFashion = 
    mainCat.includes('home') || 
    mainCat.includes('kitchen') || 
    mainCat.includes('electronic') || 
    mainCat.includes('beauty') ||
    mainCat.includes('cosmetic');

  if (isExplicitNonFashion || containsKeyword(combinedSearchText, NON_APPAREL_TERMS)) {
    // Unless explicitly marked as an apparel item
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

  // -------------------------------------------------------------------------
  // RULE 3: ADMIN-MANAGED PRODUCT OVERRIDE
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // RULE 4: VARIANT-LEVEL RESTRICTION / INHERITANCE
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // RULE 5: RESOLVE AI TRY-ON CATEGORY MODE (UPPER, LOWER, DRESSES)
  // -------------------------------------------------------------------------
  let resolvedCategoryType: TryOnCategoryMode | null = null;
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
    // Check Dresses & Full Body first (kurtis, gowns, sarees, anarkalis)
    if (containsKeyword(combinedSearchText, SUPPORTED_DRESSES_TERMS)) {
      resolvedCategoryType = 'dresses';
      detectedCategory = 'dresses';
    } 
    // Check Lower Body (jeans, pants, shorts, skirts)
    else if (containsKeyword(combinedSearchText, SUPPORTED_LOWER_BODY_TERMS)) {
      resolvedCategoryType = 'lower_body';
      detectedCategory = 'lower_body';
    } 
    // Check Upper Body (t-shirts, shirts, hoodies, jackets)
    else if (containsKeyword(combinedSearchText, SUPPORTED_UPPER_BODY_TERMS)) {
      resolvedCategoryType = 'upper_body';
      detectedCategory = 'upper_body';
    }
  }

  // -------------------------------------------------------------------------
  // RULE 6: MISSING CATEGORY / INDETERMINATE PRODUCT HANDLING
  // -------------------------------------------------------------------------
  if (!resolvedCategoryType) {
    // Product has no category determination or fashion keywords
    return {
      isEligible: false,
      reason: "This product's category is pending review for Virtual Try-On eligibility.",
      categoryType: null,
      isRestrictedIntimate: false,
      adminOverrideApplied: false,
      detectedCategory: 'indeterminate'
    };
  }

  // -------------------------------------------------------------------------
  // PRODUCT IS FULLY ELIGIBLE
  // -------------------------------------------------------------------------
  return {
    isEligible: true,
    reason: 'Product is eligible for Virtual Try-On.',
    categoryType: resolvedCategoryType,
    isRestrictedIntimate: false,
    adminOverrideApplied: product.is_vto_enabled === true || specs.is_vto_enabled === true,
    detectedCategory
  };
}
