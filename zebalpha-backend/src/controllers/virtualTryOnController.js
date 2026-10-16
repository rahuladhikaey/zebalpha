import { HTTP_STATUS } from '../constants/index.js';
import { supabaseA } from '../lib/supabase.js';
import { virtualTryOnService } from '../services/vto/VirtualTryOnService.js';
import { evaluateProductTryOnEligibility } from '../services/vto/tryOnEligibility.js';

const MAX_IMAGE_PAYLOAD_SIZE = 12 * 1024 * 1024; // 12MB base64 string safety limit

/**
 * Executes a Virtual Try-On inference
 * POST /api/virtual-try-on
 * 
 * Enforces centralized product eligibility policy (Requirement 1 & 5).
 * Validates against restricted intimate apparel and indeterminate products.
 */
export const executeVirtualTryOn = async (req, res, next) => {
  let { personImage, productId, garmentImage, category = 'upper_body', variantId, packageName } = req.body;

  try {
    if (!personImage) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Please provide a person photo for virtual try-on.'
      });
    }

    if (personImage.length > MAX_IMAGE_PAYLOAD_SIZE) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Photo is too large. Please use a photo under 10MB.'
      });
    }

    if (!productId) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'A valid catalogue product ID is required to verify Virtual Try-On eligibility.'
      });
    }

    // 1. Fetch full product metadata for server-side eligibility verification
    const { data: product, error: prodErr } = await supabaseA
      .from('products')
      .select('id, name, description, category_id, image_url, images, specifications, packages, is_vto_enabled, virtual_tryon_category, virtual_tryon_image')
      .eq('id', productId)
      .maybeSingle();

    if (prodErr || !product) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        success: false,
        error: 'The requested product could not be found in the Zebalpha catalogue.'
      });
    }

    // 2. Resolve variant if specified
    let selectedVariant = null;
    if (product.packages && Array.isArray(product.packages)) {
      if (variantId) {
        selectedVariant = product.packages.find((p) => String(p.id) === String(variantId));
      } else if (packageName) {
        selectedVariant = product.packages.find((p) => p.name === packageName || `${p.color} / ${p.size}` === packageName);
      }
    }

    // 3. Centralized Server-Enforced Product Eligibility Policy Check
    const eligibility = evaluateProductTryOnEligibility(product, selectedVariant);

    if (!eligibility.isEligible) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        isEligible: false,
        isRestrictedIntimate: eligibility.isRestrictedIntimate,
        error: eligibility.reason,
        code: eligibility.isRestrictedIntimate ? 'INTIMATE_APPAREL_RESTRICTED' : 'PRODUCT_NOT_ELIGIBLE',
        detectedCategory: eligibility.detectedCategory
      });
    }

    // 4. Resolve garment image according to priority:
    // Priority 1: Variant specific image (if user picked a specific colour)
    // Priority 2: Dedicated clean flat-lay virtual_tryon_image
    // Priority 3: Primary product image
    // Priority 4: First item in images array
    // Priority 5: Passed garment image
    let resolvedGarmentImage = 
      selectedVariant?.image_url ||
      product.virtual_tryon_image ||
      product.image_url ||
      (Array.isArray(product.images) && product.images[0]) ||
      garmentImage;

    if (!resolvedGarmentImage) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        error: 'Unable to locate a high-resolution garment image for this clothing item.'
      });
    }

    // Use AI category mode resolved by the eligibility engine (upper_body, lower_body, dresses)
    const resolvedCategory = eligibility.categoryType || product.virtual_tryon_category || category;

    // 5. Run AI Virtual Try-On inference (Zero-Retention Ephemeral Pipeline)
    const result = await virtualTryOnService.processVirtualTryOn({
      personImage,
      garmentImage: resolvedGarmentImage,
      category: resolvedCategory,
      productId: product.id
    });

    res.status(HTTP_STATUS.OK).json({
      success: true,
      imageUrl: result.imageUrl,
      productId: product.id,
      category: resolvedCategory,
      processingTimeMs: result.processingTimeMs,
      provider: result.provider,
      notice: result.notice || undefined,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    });
  } catch (err) {
    next(err);
  } finally {
    // Zero-retention: Immediately purge in-memory references to expedite V8 garbage collection
    personImage = null;
    if (req.body) {
      req.body.personImage = null;
    }
  }
};

/**
 * Returns supported VTO capabilities and categories
 * GET /api/virtual-try-on/config
 */
export const getVTOConfig = (req, res) => {
  let activeProviderName = 'Configured AI Engine';
  try {
    const activeProvider = virtualTryOnService.getActiveProvider();
    activeProviderName = activeProvider.name;
  } catch (e) {
    activeProviderName = 'Setup Required';
  }

  res.status(HTTP_STATUS.OK).json({
    success: true,
    isAvailable: true,
    provider: activeProviderName,
    supportedCategories: [
      { id: 'upper_body', name: 'T-Shirts, Shirts & Tops' },
      { id: 'hoodies', name: 'Hoodies & Sweatshirts' },
      { id: 'outerwear', name: 'Jackets & Coats' },
      { id: 'dresses', name: 'Dresses & One-Pieces' },
      { id: 'lower_body', name: 'Pants, Jeans & Bottoms' }
    ],
    guidelines: [
      'Face the camera directly in good lighting',
      'Wear fitted clothing for best AI silhouette mapping',
      'For full-body outfits (dresses, jeans), upload a full-length photo',
      'Ensure clear visibility with only one person in the photo',
      'Your photo is processed in memory and never stored permanently'
    ]
  });
};
